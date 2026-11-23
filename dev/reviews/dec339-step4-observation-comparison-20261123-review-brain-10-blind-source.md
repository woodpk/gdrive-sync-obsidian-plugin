# DEC-339 Step 4 — Frozen independent blind source assessment

**Reviewer:** `review-brain-10`  
**Phase:** blind-first assessment, published before opening authored Step-4 tests, adequacy narratives, earlier review findings, source history/diffs or PHX-CI result files.  
**Feature:** DEC-339 Step 4 — Observation-Only Comparison  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Branch:** `build/dec339-step4-observation-comparison-20261123`  
**Frozen source SHA:** `41653ada82c90d898c730e181290ca155ff1574f`  
**ACTUAL frozen source commit Git tree:** `315d87203ea83681f4ea75edd52d8f911c009eeb` (obtained directly from `git/commits/41653ada...` on GitHub)  
**Published state CLAIMED qualification tree:** `b59e6a64d8d1b63f72e2b327cadb8d2b7ad554bf` — **does not match source commit tree**.  
**Incoming handoff state/branch HEAD:** `00dd450cd466375af9bf9fe7b052380b57617df3`; feature-local count 1, sender BUILDER, recipient REVIEWER.  
**Normative plan:** `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step4-observation-comparison-2026-11-23.md`.

## Independent requirements and source inspection

Step 4 is an isolated, observation-only comparison between the current authoritative LOCAL/REMOTE/BASE snapshot assembly and the dormant verified-inventory-backed route, without any inventory-based executor, dispatch, physical effect, activation, or master promotion. For complete/unambiguous observations, the same existing planner should yield equivalent snapshots and plans; for stale, partial, invalid local, untrusted identity/provenance and other uncertainty, inventory observations must never become more permissive than trusted physical observations. Mandatory regression composition includes exact Step-2 account-binding/transport, baseline→Changes same-ID progression, fresh LOCAL enumeration/invalidation and restart safeguards.

The exact production source has been inspected without opening the Step-4 authored tests:

1. `src/product/inventory-backed-snapshot-assembler.ts` retains an opt-in subclass of the existing `ProductSnapshotAssembler`, **not** a second planner. It verifies trusted canonical state, current fence, managed-root identity, current active generation/cursor/revision, provider start cursor and a verified, generation-pinned inventory lease before giving the full existing assembler a one-use read-only proxy for REMOTE listing. It rechecks the authority and source fence afterward. If root-wide managed provenance is missing or fails, it invokes full physical `assembleFull`, requiring complete remote enumeration, or throws `recovery-required`. Pre-provenance uncertainty generally falls back to the legacy `super.assemble` implementation.
2. `src/product/verified-inventory-planning-projection.ts` checks two managed roots, complete coverage receipts, domain/cursor/fence, a bounded verified graph, stable-ID and normalized sibling/path uniqueness, visible nontrashed provenance and valid parent paths; invalid/ambiguous/partial results are not projected as confirmed complete REMOTE. Its `listByParent` limit of 256 is backed by a storage implementation that returns a `partial` error rather than silently truncating an overflowing index; this is a conservative capacity bound, not positive absence evidence.
3. `src/product/snapshot-assembler.ts` remains the one source of LOCAL/REMOTE/BASE snapshot semantics and carries uncertainty into `unknown`/ambiguous observations. `src/drive/runtime.ts` retains the shared OAuth/transport/Drive reader boundary; `src/state/verified-inventory-integration.ts` performs validated baseline and incremental publication with immutable stable-ID overlays and canonical cursor coupling. `src/state/verified-local-inventory.ts` treats local hints as advisory and fail-closed upon scope/lifecycle invalidation.
4. `src/product/runtime.ts` still explicitly constructs `new ProductSnapshotAssembler(...)` and the existing `ProductionSynchronizationPlanner` and `ProductSynchronizationExecutor`. No inventory-backed dispatch, second OAuth client or production cutover appears in the inspected source.

## Material identity concern I-01 — MUST resolve in evidence pass

The actual Git tree **of the advertised frozen source commit** is `315d87203ea83681f4ea75edd52d8f911c009eeb`. In the current published `dev/state/current-state.yaml` for this feature, `qualification_verified_tree` is `b59e6a64d8d1b63f72e2b327cadb8d2b7ad554bf`. Both cannot be the Git tree of the same commit. This inconsistency was discovered **without inspecting PHX-CI**. Until original `result.md`/`result.json` prove what was actually checked out, the exact-source qualification claim is unresolved. A PHX-CI PASS or a well-behaved comparison test must **not** override an inconsistent immutable source/tree identity. If evidence also claims `b59e6a...`, independent acceptance must be blocked for lack of exact-tree qualification until corrected and reverified; if it records `315d872...`, the published state tree must be reconciled through an authorized administrative process before formally representing an exact handoff.

## Source-level review uncertainties (deferred to evidence pass)

- **S-01:** The acceptance contract requires actual *comparison proof* for complete LOCAL/REMOTE/BASE snapshots and plans, and demonstrable fail-closed behavior for incomplete/wrong-fence/invalidated-local observations. No new production comparator runtime is required. Whether the authored tests truly assert these conditions, including same-ID Changes, shared production account key and non-dispatch, cannot be concluded from production source alone.
- **S-02:** `InventoryBackedSnapshotAssembler.assemble` returns the original `super.assemble` on several early uncertainty paths, which can use the legacy trusted incremental path rather than necessarily forcing a *complete physical* listing. That preserves existing planner behavior but is not literally equivalent to “full physical fallback.” Evidence review must determine whether this matches the normative conservative-fallback rule and whether negative tests assert no more permissive plan.
- **S-03:** A read-only snapshot comparator is not authorization to feed verified-inventory output to production dispatch. Code remains dormant, but test composition must not silently invoke mutation execution.

**Provisional blind verdict:** Production architectural source is **compatible with observation-only comparison**; **no source-code acceptance blocker established yet**. The frozen source/tree mismatch is a **material identity blocker pending original qualification evidence**, independently of source semantics. Final verdict must be a separate report after tests and original PHX-CI inspection.

## Blind isolation and disclosure

The neutral plan and incoming feature-local state include Builder-authored status and qualification narratives that were incidentally visible while establishing scope/handoff identity; they were **not** treated as test or evidence proof. The authored Step-4 comparison tests, original PHX-CI results/logs, historical diffs and prior review findings were **not opened** before publishing this report. Preserve this blind report unchanged.
