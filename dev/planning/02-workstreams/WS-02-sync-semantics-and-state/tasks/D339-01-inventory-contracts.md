# DEC-339 / D339-01 — Verified Inventory Contract and Pure Validation Foundation

## 0. Dispatch identity and maturity

- **Agent:** `agt-brain-dec339-d339-01-inventory-contracts-01`
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin` **only**.
- **Workstream:** WS-02 Core Synchronization Semantics and Durable State.
- **Unit:** `D339-01` — first new implementation dependency for DEC-339. **Classification: BOUNDED IMPLEMENTATION** (shared contract, pure validation, and deterministic product tests).
- **Task maturity:** `EXECUTABLE_AFTER_SUPERVISOR_DISPATCH_WITH_EXACT_PROMPT_REF`. The task is prepared; the act of committing it is not permission to start coding in this planning session.
- **Source base SHA (immutable):** `44368eb7bb94b751c069c09a95012b9179155f0c`.
- **Exact target implementation branch:** `dec339/d339-01-inventory-contracts-01`, precreated at the above source SHA.
- **Task text location:** this document on the separate `planning/dec339-verified-inventory-design-20261010` branch. **The supervisor must pin its exact task-document commit SHA when actually dispatching**. The task is intentionally stored separately from the already-created implementation branch; retrieve the task from the explicitly pinned planning commit, not the moving planning tip.

**Do not substitute any newer base or different branch.** Before work, inspect the remote branch ref and local starting worktree: exact `HEAD = 44368eb7bb94b751c069c09a95012b9179155f0c`, clean isolated worktree, expected origin and branch; reject drift. The control checkout stays clean. Never reset, overwrite, force-push, cherry-pick from a drifting branch, or switch repositories to make a gate pass. Use a fresh detached/isolated agent worktree for implementation; the active working branch may be checked out **inside** that isolated worktree only.

## 1. Binding authority and locked constraints

Ground immediately against these source documents **at the exact source SHA**:

1. `AGENTS.md`, including the owner-locked fresh-original-protocol gate.
2. `dev/authority/decision-register.yaml` — locked `DEC-339`, planning approval only.
3. `dev/planning/01-target-system/target-system-specification.md` §7.9, existing state/changes/remote invariants, §8–9 and §13.
4. `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` — reviewed design.
5. `dev/reviews/dec339-inventory-architecture-adversarial-review-2026-10-10.md` — A01–A09 corrections and D339-01 obligations.
6. WS-02 `00-WORKSTREAM.md` through `04-VERIFICATION-PLAN.md`; WS-03/05/07 `02-ARCHITECTURE.md` and WS-07 BVP boundary lock.
7. Actual source at `src/contracts/common.ts`, `src/contracts/state.ts`, `src/contracts/synchronization-foundation.ts`, `src/contracts/google-drive.ts`, `src/contracts/index.ts`, `src/state/persistent-state-store.ts`, `src/state/indexeddb-state-storage.ts`, existing `test/phase2-state*.test.ts` and `test/phase6-folder-authority-store-foundation.test.ts`.
8. The **original** Agent-Led Software Product Construction Manual and original Agent-Led Software Engineering Operating Protocol in connected Google Drive. Do not substitute a historical snapshot. **Immediately before authoring each test/verification-related code file, freshly retrieve and read the full original engineering operating protocol**, as mandated by `AGENTS.md`; if inaccessible, stop validation-code authoring and report BLOCKED, without using a cached substitute.

Existing Phase-1 contracts are frozen. This unit is granted a **strictly additive, supervisor-scoped contract-extension allowance** for one new inventory-specific module and a single export statement. Never revise existing common/authority/BASE semantics or the existing frozen state or Drive interfaces.

## 2. Assignment and required end state

Implement the smallest importable, production-owned **contract foundation** for a device-local, indexed, incrementally maintained inventory of LOCAL/REMOTE file and folder **metadata**, without implementing persistence or changing sync behavior.

Deliver **four concrete outcomes**:

**A. Frozen wire-neutral data contract** for `InventoryIdentityFence`, `InventoryGenerationManifest`, `InventoryRemoteEntity`, `InventoryLocalObservation`, `InventoryCoverage`, copy-on-write `InventoryOverlayRecord`, query/observation `InventoryReadResult`, optional ephemeral `TargetedRemoteProof`, and domain/status unions. The names are suggested, not authority; preserve exact semantics and publish a readable, finite type/API surface. Reuse existing branded ID types when appropriate; do not counterfeit semantic authority generation as inventory generation.

**B. Read/write *interface* boundary only:** `InventoryObservationStore`/equivalent defines bounded indexed reads (by remote ID, domain/parent/name, logical path, coverage scope, active manifest), immutable read-snapshot lifetime/pinning, candidate staging and atomic publish request with exact expected inventory generation, **existing authority persistence revision**, identity/scope fence, trusted Changes batch/token lineage, and explicit non-success outcomes. These are interfaces, not implementations: do not perform IndexedDB reads/writes or add a second persistence authority in D339-01. A prospective publish contract must specify a **single transaction spanning existing `sync-state/current-state`, active control, manifests and affected entity/coverage stores**; no asynchronous mirrored cursor commit. Existing `saveTrusted`, `saveAuthority`, `appendLearnedRemoteBatch`, `persistLearnedRemoteBatch`, `commitCursor`, recovery transitions and migrations are enumerated future paths to be fenced in D339-02/04, **not modified in this unit**.

**C. Pure, no-I/O validation/classification** that checks proposed manifest/entity/coverage *shape and consistency*, detects missing/cycled parent-generation lineage, mismatched identity/scope/cursors, duplicate stable-ID definitions in a generation, parent cycles, orphan/out-of-domain nodes, wrong app-root/domain provenance, index/overlay inconsistency, invalidated/incomplete scope and stale authority fences. It must preserve **duplicate same-name siblings** as representable data and classify their occupancy as `ambiguous`, not drop one as an impossible persistence error. A missing/partial/expired/unknown member, absent page, lost access, bad token or corrupt lineage must return an explicit fail-closed non-verified result; never infer remote absence or deletion from a cache miss. Keep the validator pure and bounded: provide small-array input for unit tests, without an all-vault eager index inside runtime interfaces.

**D. Focused deterministic tests**, imported through the actual production contract/policy modules, which prove the distinctions above; tests are *executable verification code*, so the special fresh-original-protocol gate applies **immediately before authoring the test file**.

No full Graph/Drive implementation, DB migration, remote observation, staged commit, runtime startup, planner/executor refactor, or physical proof is requested in this unit.

## 3. Exact writable path allowlist

The work package may change **only** these tracked paths:

| Path | Permission / purpose |
| --- | --- |
| `src/contracts/verified-metadata-inventory.ts` | **CREATE** — inventory-only types, discriminated results, observer/store/proof interfaces. |
| `src/contracts/index.ts` | **MODIFY** — add **one additive re-export** of the new inventory module; preserve every existing export. |
| `src/state/verified-metadata-inventory-validation.ts` | **CREATE** — pure validators and ambiguity/fail-closed classifiers; no IO, no mutation, no source authority. |
| `test/dec339-inventory-contracts.test.ts` | **CREATE** — focused Node built-in `node:test` and `node:assert/strict` tests; picked up by existing `tsconfig.test.json`. |
| `dev/_ca-output.md` | **APPEND ONLY** — full operator/agent engineering evidence, PHX-CI status, source/verification SHAs, command outcomes and actionable blockers. Preserve prior historical evidence verbatim. |
| `dev/test-results/<new-PHX-CI-run-id>/**` | **PHX-CI OUTPUT ONLY**, only if the pinned runtime actually executes a new run; never edit or fabricate its results by hand. |

No other source, test, planning, script, configuration, package, or governance path is writable. Generated build artifacts ignored by Git are allowed inside the isolated temporary worktree but must not be committed. Any newly discovered need to alter `src/state/persistent-state-store.ts`, `src/state/indexeddb-state-storage.ts`, `src/product/**`, `src/drive/**`, `src/contracts/state.ts`, `src/contracts/google-drive.ts`, `src/contracts/synchronization-foundation.ts`, `test-platform/**`, `phx-ci.json`, Taskfiles, `AGENTS.md` or a frozen BVP seam is **BLOCKED_OUT_OF_SCOPE**, not implied permission to expand the worker's file set.

**Size gate:** target no more than about **500 net substantive logical LOC** across the two new production source files and no more than **4 substantive non-test touched paths**. If the contract scope would exceed this, stop and report the concrete split; do not build a framework or general state subsystem. Tests may be comprehensive but focused on D339-01 alone.

## 4. Frozen contract details and adversarial obligations

### 4.1 Typed identity and proof fences

The stored identity fence MUST distinguish at minimum vault ID, device ID, paired Google account **opaque identity** (not credentials/email address), configured managed root ID, protocol version, content/config-domain root IDs, scope-policy fingerprint and inventory schema version. Manifest publication must bind `inventoryGeneration`, prior generation, start/terminal Changes tokens, authority persistence revision and semantic generation. Treat semantic authority generation and inventory generation as separate non-interchangeable types; timestamps are advisory, **never freshness authority**.

`sourceCompleteness = app-visible` is not `complete-global-Google-Drive`. The existing `drive.file` scope never proves arbitrary invisible same-name siblings absent. Do not add scope requests or weaken the managed-root/account gate.

### 4.2 Immutable multi-generation lineage

Persisted semantic type includes an **immutable manifest per generation**, with `generation`, `parentGeneration` (null at a full baseline), bounded `overlayDepth`, expected input cursor and output terminal cursor, identity fence, per-domain coverage receipts and validation digest. Never represent lineage exclusively as a parent pointer on the mutable singleton active-control record. Overlay rows include an explicit ID-based mask for removed/replaced predecessor entries; no need to copy every unchanged entity per poll. Descendant and sibling-occupancy indexes logically merge overlays **after applying masks**, and orphan or missing ancestor yields unknown/invalid, never absent. Reader lifetime pins every referenced ancestor until released; GC may only reclaim proven-unreachable generations. A chain that cannot be proven is not verified.

### 4.3 Stable object identity and ambiguous occupancy

Entity contract preserves Google Drive stable object ID, parent ID, exact display name, entity kind, logical path (derived and potentially invalid), root/domain, file content/revision evidence when provider supplies it, app-managed provenance, trash/access state and observation scope. Same `(domain,parentId,name)` may map to multiple IDs; occupancy index **MUST NOT** impose unique name/path constraint. A folder move can invalidate descendants; no stale derived path may prove current location. Quarantined managed IDs with unresolvable path remain distinguishable from absent.

LOCAL records are separate advisory hints; missing local bytes, unreadable paths, and stale local snapshots cannot prove deletion. BASE/history, durable intent/effect, verified receipts and deletion tombstones stay outside inventory contracts.

### 4.4 Read and publish result types

Discriminated variants distinguish `verified-observation`, `unknown`, `partial`, `ambiguous`, `stale`, `incompatible`, `invalid`, `recovery-required`; `absent` may be derived **only** in a complete scope at a stated observation horizon. Unverified results must not expose `absenceProven: true` or a mutation authorization. Define a *purpose-scoped ephemeral* remote-proof result for future WS-03/05 use: must bind current observations of expected ID/parent/name/domain, complete sibling occupancy, revision/content when required, expected authority generation, and retained **non-local managed-provenance proof**; no cached record alone becomes a reusable persisted mutation permit.

Publish request/result types must not imply a completed physical effect. Any publish success is only **atomic local observation-state durability**, not a BASE commit or mutation verification.

### 4.5 Changes and completeness vocabulary

Distinguish:
- `tracked-managed-ID` event;
- `positively-proven-outside-managed-domain` event;
- `unclassifiable-or-lost-access` event (forces quarantine/invalidation/re-observation).
The Google feed is account-wide. `removed` may mean deletion **or access loss**. `files.list.incompleteSearch`, incomplete pagination, missing change page terminal token, an expired cursor, wrong account/root/scope, orphan graph or unexplained identity all prevent declaring complete coverage. Make explicit representations for parent-scoped completeness and global managed-domain coverage. D339-01 only freezes result vocabulary and pure checks; WS-03 D339-03 implements actual provider observation.

## 5. Focused required test cases (PHX-CI owned)

Add deterministic test cases for:

1. A valid full baseline with separate content/portable-configuration root fences is structurally accepted **only** with complete explicitly scoped coverage, not from a BASE mapping.
2. Valid two- and three-level overlay manifests remain resolvable; a missing intermediate ancestor, cycle, excess overlay depth, wrong cursor predecessor or mismatched fence fails closed.
3. Two same-name siblings retain distinct stable IDs and produce explicit `ambiguous`, never first-match/last-wins; a duplicate **same ID** conflicting inside one generation fails integrity.
4. Parent cycles, orphan nodes, cross-domain ancestry, moved-folder descendant stale path, root/protocol mismatch and incompatible scope are not considered trusted.
5. Unknown/partial/invalid coverage, inaccessible objects, remote changes without reliable prior ID, `incompleteSearch` and loss-of-access observations cannot produce `absent` as trusted fact.
6. A pure modeled cursor/authority fence mismatch (including an independent mirrored cursor ahead of generation) refuses publish; do not fake database atomicity tests in D339-01 — those belong to D339-02.
7. Current-remote proof discriminator rejects stale/ambiguous sibling occupancy, unverified non-local managed-root provenance, wrong authority generation or incomplete physical observation; a cached record by itself is never a valid verified physical-effect receipt.
8. Parse/validator security: hostile/untyped records with prototype/shape anomalies, invalid numeric counters, empty IDs, incompatible schema versions, or mismatched generation graph are rejected rather than trusted.
9. Disabling/omitting an inventory yields a safe `uninitialized/unknown` observational result, not a change to the existing `TrustedSynchronizationState` or an automatic deletion gate.
10. No test may require a real Google Drive request, installed Obsidian, credential, token or live mutation.

**Testing scope distinction:** D339-01 checks contract shape and pure classifiers. It does **not** claim crash-consistent IndexedDB publication, exact provider query correctness, complete remote proof equivalence, planner behavior equivalence or measured performance; those are D339-02/03/05/06/07 acceptance duties.

## 6. Verification, evidence, and failure handling

- **PHX-CI only:** the repository is pinned to framework `0.2.0-dev.2`, SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, `node-typescript` adapter, configured `phx-ci.json`. Only the deployed, pinned PHX-CI front door may execute/source software validation; no GitHub Actions or standalone npm/test/typecheck/repository-check verification. Authoring tests is permitted after the required fresh protocol read; **executing** them belongs to PHX-CI.
- Reuse the existing focused-test command selection via `-FocusedTestCommand` / `PHX_FOCUSED_TEST_COMMAND` as supported by the pinned runtime. A nonzero focused test must be selected. Determine the correct compiler/execution sequencing from the current PHX-CI adapter and existing repository build, not a guessed `.test-build` path. The existing `tsconfig.test.json` includes `src/contracts/**`, `src/state/**` and `test/**`.
- Run PHX-CI change-set verification and repository-wide verification as the pinned operator protocol requires, including typecheck, focused tests, full test suite, build, architecture/repository checks, artifact hashes and traceable evidence. Do not invent a second validation script. Existing accepted S09A runs/canaries are not rerun. Treat a test selection of **zero actual tests** as not verified.
- Record command lines/exit codes, source SHA, expected base, run IDs, stage outcomes, artifacts and evidence locations in `dev/_ca-output.md` and the PHX-CI-controlled `dev/test-results/` output. If the coding agent lacks the deployed Windows PHX-CI runtime, it must produce implementation evidence and report **IMPLEMENTED / NOT YET VERIFIED** with a precise blocked/owner-execution handoff; no fake PASS, no direct npm fallback, no unnecessary ad hoc harness.
- If SUT test stages have already decisively PASSED and only evidence publication fails, recover administrative evidence under the freshly read protocol rather than rerun work. Retain all failure diagnostics; continue unrelated safe tasks when possible and stop at unsafe boundaries.
- The source/test code must be independently reviewed after all-green PHX-CI evidence, per active Stage-2A governance. A worker self-review is not independent acceptance.

## 7. Output and stop contract

On completion, report succinctly:

1. Exact starting SHA, implementation branch HEAD/commit(s), path-by-path changed files, any deviation (must be zero or BLOCKED) and whether changes were pushed.
2. Actual exported contract types/result discriminators/validator functions and how they prevent inventory from becoming BASE or mutation authority.
3. PHX-CI outcome: focused/full/repository and artifact stages (PASS/FAIL/NOT RUN), exact run IDs and durable evidence paths; no fabricated results.
4. Material findings, remaining D339-02/03 dependencies and independent review status.
5. **Next immediate step**, who owns it, and whether the human owner must act.

**STOP** after D339-01. Do not begin D339-02 migration, WS-03 Drive capture, WS-05 planner/executor cutover, WS-07 scenario-platform changes, live physical validation, packaging, deployment, Stage 3, or merge/promotion. Do not mark D339-01 accepted/promoted merely because contracts compile.

## 8. Dispatch readiness and supervisor rebind

- Fixed source base `44368eb7bb94b751c069c09a95012b9179155f0c` was independently verified before task preparation.
- Worker branch `dec339/d339-01-inventory-contracts-01` was precreated from that exact SHA and must still match on dispatch. The task prompt is persisted on the **separate planning branch**; cite the exact prompt-source commit when sending it.
- Any intervening source branch edit, changed decision/governance, unexpected dependency, or nonclean target branch blocks execution pending supervisor re-grounding. The worker cannot silently expand writable scope.
- The **next supervisor action** is pinning this task prompt's exact published commit SHA, checking the implementation branch head, and dispatching the bounded coding unit. No routine owner approval is required merely to make these engineering decisions.
