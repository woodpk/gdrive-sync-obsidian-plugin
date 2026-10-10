# DEC-339 verified metadata-inventory architecture — source-grounded adversarial review

**Date:** 2026-10-10  
**Review type:** Supervisor adversarial architecture review against current repository code and external API documentation. This is **not** a claim that a separate human/Codex reviewer participated, and it is **not** Stage 3 or an implementation review.  
**Original design input:** `34d91bf694667a8a3cf18f8cd5a32d292053c858`  
**Repository grounded implementation baseline:** `ce2a7accb80f12334ae50cbb73d46fb97dbe96fa` (the reviewed branch added planning documents only).  
**Corrected design:** `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` as amended in commit `5001e82cd3a1225b8081894adf13c01ad1907c57`.  
**Authority:** `AGENTS.md`, DEC-339 locked decision and target-specification §7.9; `dev/authority/governance/locks/testing-platform-boundary.yaml`; WS-02/03/05/07 accepted planning files; the two original agent-led engineering governance documents.

## 1. Review outcome

**DESIGN REVIEW — CORRECTED / READY TO PREPARE D339-01 ONLY.** Nine review findings, including three *blocking design gaps*, were corrected in the persisted architecture. No remaining architecture-level blocker prevents the **first bounded WS-02 shared-contract work unit** from being precisely scoped and dispatched against an exact commit. This verdict **does not** certify later proof-equivalent optimization, implementation, migration, physical deployment or PHX-CI verification. Those remain explicit downstream gates.

The review evaluates the proposed design independently of the original document's confidence, using actual read/write implementations, existing reconciliation/recovery calls and external Google Drive API constraints. No PHX-CI job, local script, data migration, plugin build, live Drive operation, or test rerun was performed.

## 2. Findings, evidence, correction and disposition

| ID | Severity at discovery | Adversarial counterexample / repository evidence | Correction in architecture | Disposition |
| --- | --- | --- | --- | --- |
| A01 | **BLOCKING** | Initial design stored only `parentGeneration` on mutable `inventory-control`. After publishing >1 copy-on-write delta, the active view cannot discover its grandparent/older overlay rows, so an omitted older record could be falsely interpreted as absent. | Add immutable `inventory-generations` manifest for each generation, bound parent lineage, stage checksum and pinned-reader-aware GC. Overlay index queries logically merge reachable generations; missing ancestor/overlay is an explicit fail-closed error. | Corrected in §3–4; D339-01 freeze and D339-02 test obligation. |
| A02 | **BLOCKING** | `src/state/persistent-state-store.ts` includes both `saveTrusted` and `saveAuthority` CAS paths plus `appendLearnedRemoteBatch`. `src/product/product-controller.ts::persistLearnedRemoteBatch` and `product-controller-base.ts::commitCursor` independently advance/mirror `changeCursor`. Merely adding a new inventory-publish method leaves a bypass that can put cursor ahead of inventory after restart. | Mandatory **store-enforced** cursor fence across every existing cursor/identity-changing writer, with canonical metadata and inventory active-pointer committed in one IndexedDB transaction; invalidate coherently on recovery/identity change; no post-publish asynchronous cursor mirror. | Corrected in §4.1/§11/§13; must be proven before inventory cutover. |
| A03 | **BLOCKING** | Current `google-drive-port.ts::listForReconciliation` runs `validateManagedObjectProvenance` after listing and checks all objects marked for the managed root, including escaped objects outside the active subtree. A fresh sibling-only query at a target path cannot detect unrelated marked objects outside the domain. | Targeted proof may replace convergence read **only** while preserving this independent, appropriately fresh root-wide managed-provenance guard or a separately proven equivalent. Otherwise keep full reconciliation / block. No claiming full-tree proof equivalence from sibling occupancy alone. | Corrected in §7/§11; optimization remains gated. |
| A04 | MAJOR | Locked `drive.file` scope does not imply visibility of every arbitrary user/other-app-created Drive item, even inside an app-created folder. Therefore an app-scoped complete listing does not guarantee an *absolute Drive-wide* absence/unique-name claim. Official Google scope guidance confirms per-file access. | Define explicit app-visible/managed coverage and the separate proof of cross-app visibility; never label app-scoped observations Drive-wide; block any high-risk operation that actually requires inaccessible evidence rather than widening OAuth scope. | Corrected in §5–7. Known platform limitation preserved; no DEC-339 scope change. |
| A05 | MAJOR | `Drive v3 files.list` reports `incompleteSearch`, but existing `google-drive-port.ts` uses field masks `nextPageToken,files(...)` and a response interface without `incompleteSearch`. A nominally terminal page is not necessarily a complete search. | Baseline/targeted query contract requires requesting and validating `incompleteSearch`, exhausting all `nextPageToken`, and rejecting partial/unprovable coverage. | Corrected in §5/§11; implement in WS-03, PHX-CI negative tests. |
| A06 | MAJOR | `readChangeRaw` consumes an account-wide `changes.list`; it uses a mutable process-local `pathCache` for removals and currently fails unclassifiable events. Treating unknown events as unrelated could miss a moved-out managed object; treating all as managed would block normal unrelated changes. | Three-way classification: durably tracked managed ID, **positively proven** out-of-scope ID, and unclassifiable ID. Only the second may be ignored; unclassifiable events quarantine/invalidate/reconcile. Persist old ID→parent/path knowledge. | Corrected in §5–6; WS-03 boundary and fault cases. |
| A07 | MAJOR | `google-drive-port.ts::validateMergedListingEntries` returns a **conflict result** on same-normalized-path occupancy, sometimes before the assembler produces snapshots. The first architecture demanded identical snapshots/plans even where the legacy path throws, which could either fail a valid conservative replacement or encourage changing a hard conflict into a permissive plan. | Exact equivalence on unambiguous complete fixtures; ambiguous/partial cases may be *strictly more conservative* but never more permissive. Record comparison dispositions, not just equality of snapshot arrays. | Corrected in §11. |
| A08 | MAJOR | IndexedDB v1 `open(databaseName,1)` in old builds produces `VersionError` when a v2 database exists; blocked upgrade doesn't itself provide a working legacy path. | Explicit v1-compatible open option only where supported, versionchange close/blocked handling, version-aware rollback reader or safe stop. No silent reset/re-pair. | Corrected in §4.2/§11. |
| A09 | MAJOR | Current `ProductController` wrapper completes assembly and persisted Changes learning **before** outstanding-intent recovery and then reassembles after recovery if needed. Original new-plan prose suggested an unproven reordering of recovery and assembly. | Preserve current lifecycle and its reassembly requirement unless a future contract-preserving reorder is independently proven. A new inventory must not suppress outstanding-intent recovery. | Corrected in §8. |

## 3. External-provider verification boundaries

Official sources checked:

- [Google Drive v3 files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list): `files[]`, paginated `nextPageToken`, `incompleteSearch`, `drive.file` OAuth scope and query semantics.
- [Google Drive v3 changes.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list): account-level feed; `removed` may mean deletion **or loss of access**; intermediate `nextPageToken` versus terminal `newStartPageToken`.
- [Google Drive scope guidance](https://developers.google.com/workspace/drive/api/guides/api-specific-auth): `drive.file` is per-file access to app-created/opened/selected files, not arbitrary entire-Drive visibility.
- [MDN IndexedDB upgrade/transactions](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB): multi-store transactions, blocked `versionchange` upgrades, and `VersionError` on older-version opens.

No source demonstrates that a Changes cursor is a cross-request lock or that targeted path queries prove unrelated managed-root integrity. The architecture must not assume either. The existing repo's complete reconciliation is also bounded by the user's current OAuth grant; the redesign cannot silently elevate that guarantee.

## 4. Normative pre-dispatch requirements for D339-01

D339-01, owned by **WS-02**, is **ready to scope**, not already an executable prompt. Bind the actual then-current repository HEAD and exact writable path allowlist immediately before agent dispatch; no drift from the accepted contract. It must freeze:

1. Type-safe `InventoryGeneration`, immutable `GenerationManifest`, entity/local/coverage/overlay-mask keys and non-unique occupancy indexes; complete graph/parent/coverage validation; distinction between complete enumeration and ambiguous occupancy.
2. Identity, account/root/domain, scope and authoritative semantic-generation fences; explicit observational validity and refusal/fallback result classifications.
3. `InventoryObservationStore` query and staged-write interfaces plus one authority-owned atomic generation/cursor-publish contract. **List all existing trusted-state writers** and prohibit a cursor mismatch in active inventory mode at the persistence boundary.
4. Separate read-only observation proofs from non-persistable, purpose-specific current mutation proofs; define how global managed-provenance gate is retained.
5. Durable ID membership/classification for account-wide Changes; partial/unknown, visible/unseen scope, and ambiguous same-name/ancestor cases; no guessed global absence.
6. Scoped invalidation, pinned generation lifetime/GC, rollback/upgrade failure results, streaming query/memory-limit semantics and immutable test fixture hooks.
7. No wholesale rewrites to frozen shared Phase-1 contracts; if extending `src/contracts/**` is necessary, treat that as a bounded centrally approved additive interface with exact ownership. Tests must be PHX-CI-owned (and freshly re-read the original operating protocol immediately before authoring any verification code).
8. Precise proof-oriented acceptance checklist for D339-02/03/05/06 dependencies; tests and implementation remain separately gated.

D339-01 does **not** build schema migrations, alter product controller/Drive code, execute PHX-CI, produce physical effects, or make any performance/rollout claim as part of this review.

## 5. Review gate verdict and next action

- **Design gaps A01–A09:** addressed in the authoritative planning architecture; no open architecture blocker for creating a **bounded D339-01** dispatch contract.
- **Deferred engineering verification:** IndexedDB atomicity, per-file API visibility, Changes continuity under adverse movement/loss-of-access, root-wide provenance proof equivalence and mobile memory are **not yet empirically proven**. Each is a mandatory PHX-CI/physical gate before the corresponding feature activation; none requires reopening locked DEC-339.
- **Independent implementation review:** still required when code exists. This document is a supervisor review, not separate-reviewer attestation.
- **Next immediate step:** recheck the current planning HEAD and dispatch prerequisites; construct an **exact-SHA, writable-allowlist, size-bounded WS-02 D339-01 inventory contract/design-types work package** for the coding agent. Re-read the original operating protocol immediately before writing any verification-related code, and retain PHX-CI as sole validation authority. Owner action: **none**.

**Non-actions:** No product code or scripts modified, no earlier PHX-CI verification repeated, no S09A canary rerun, no live Drive mutation, no promotion.
