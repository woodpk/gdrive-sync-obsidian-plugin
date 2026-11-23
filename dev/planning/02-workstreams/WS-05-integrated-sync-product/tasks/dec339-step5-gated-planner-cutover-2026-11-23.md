# DEC-339 Step 5 — Gated Planner Cutover

**Authorized:** Owner, 2026-11-23.  
**Branch:** `build/dec339-step5-gated-planner-cutover-20261123`  
**Starting source:** `f936961a4b9dbcb8b23e887771d27bbba7e7ac55`  
**Status:** BUILDER ACTIVE.

## Objective

Wire the already-qualified inventory-backed snapshot path into `ProductRuntime` behind one persisted **default-off, explicit opt-in** setting while preserving the existing planner, controller, executor, recovery lifecycle and complete physical fallback.

This is a planner-observation cutover only. It does not activate targeted executor reads, live migration, release, physical testing or master integration.

## Required end state

When the gate is **off**:
- `ProductRuntime` constructs the existing `ProductSnapshotAssembler` exactly as before;
- inventory storage may remain present/dormant but is not consumed for planning;
- no additional inventory baseline/Changes publication is initiated merely because Step 5 code exists.

When the gate is **on**:
- `ProductRuntime` constructs exactly one `InventoryBackedSnapshotAssembler`;
- it reuses the existing Google Drive boundary, existing state database, existing state authority, existing planner, controller and executor;
- it derives a complete `InventoryIdentityFence` from the current pairing, actual managed domain roots, opaque paired-account key, effective scope policy, protocol and device identity;
- `VerifiedLocalInventoryCoordinator` is owned by the runtime, subscribed for local/lifecycle invalidation, and may refresh advisory LOCAL hints only after a verified remote inventory generation exists;
- inventory-backed assembly remains read-only planning observation; it does not authorize dispatch, deletion, BASE, recovery or effects.

## Lifecycle preservation

The existing controller lifecycle remains authoritative and unchanged:

1. assemble;
2. durably learn any observed Changes batch;
3. recover outstanding durable intents;
4. reassemble if recovery changed authority;
5. plan with the existing planner;
6. retain existing preconditions, execution, verification, BASE commit and cursor rules.

Step 5 MUST NOT add a second planner or independent Changes/cursor publication owner. If no coherent current inventory exists, or if identity/scope/cursor/provenance cannot be proven, the inventory-backed assembler must fall back to the existing physical reconciliation behavior or block according to existing fail-closed semantics.

## Runtime fence and scope

The runtime fence must bind:
- vault identity;
- device identity;
- opaque paired Google account key;
- managed root ID;
- actual content-domain root ID;
- actual portable-config-domain root ID;
- protocol version;
- deterministic fingerprint of the effective managed/exclusion/configuration policy;
- inventory schema version 1.

A scope-setting change must invalidate advisory local hints and must not permit a prior-scope inventory to establish absence or current LOCAL truth.

## Fixed decisions

- Gate name is persisted in `BrainSyncSettings`; default is `false`.
- Gate is internal/advanced capability state for this build. Step 5 does not require a new user-facing settings control.
- No automatic live inventory migration or initial baseline is performed by Step 5.
- No second OAuth client or scope expansion.
- No targeted convergence/executor read optimization.
- No changes to the authoritative planner/executor lifecycle.
- No GitHub Actions or alternate verification framework.

## Principal implementation locations

- `src/product/plugin-data.ts` — default-off persisted gate.
- `src/product/runtime.ts` — conditional composition, inventory observation store, runtime fence owner, local hint coordinator lifecycle.
- `src/drive/google-drive-port.ts` — only if needed, expose a read-only managed-domain identity observation sufficient for fence construction; no mutation semantics change.
- Existing `src/product/inventory-backed-snapshot-assembler.ts`, `src/state/indexeddb-inventory-storage.ts`, `src/state/verified-local-inventory.ts` are consumed, not redesigned.

## Mandatory test families

1. Gate off preserves legacy runtime composition and behavior.
2. Gate on selects exactly one inventory-backed assembler while retaining the existing planner/executor.
3. Missing/stale/wrong identity or absent inventory falls back safely.
4. Restart/default migration leaves gate false unless explicitly persisted true.
5. Runtime reinitialization/disposal owns and unsubscribes local inventory listeners without leaks.
6. Scope changes invalidate advisory hints; local hints never become authority.
7. Pairing/account/domain-root mismatch fails closed.
8. Existing controller Changes-learning → recovery → reassembly lifecycle is unchanged.
9. No inventory-backed result bypasses execution preconditions or targeted verification.
10. No live migration, provider mutation, physical operation or release action occurs as part of Step 5 qualification.

All executable verification runs exclusively through pinned PHX-CI.

## Acceptance boundary

Exact-source PHX-CI PASS followed by blind-first independent Reviewer acceptance. Step 5 acceptance does not authorize Step 6 operational activation, physical testing, master/PR #157 merge, installation, promotion or release.
