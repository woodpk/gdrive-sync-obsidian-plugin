# Cumulative Coding-Agent Evidence — Phases 1–5

This file is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Earlier phase evidence is retained rather than declared superseded. Detailed phase records remain authoritative historical evidence at their preserved paths/commits; this ledger records their identity and carries the evidence chain forward into Phase 5.

## Latest Phase 6 Alpha diagnostic work — iPhone `Sync now`

Agent `agt-CA-P6-IOS-SYNC-DIAG-01` created `phase6-alpha-ios-sync-diagnostic-logging` directly from immutable release `0.1.2` at `9a6b5ffa52d11f699a839214b7fdcb3c4c4701e6`. Version metadata was minimally advanced to `0.1.3` so a future independently approved physical diagnostic build can be distinguished from installed `0.1.2`; no tag or release was created. The branch now incorporates the reviewed integration target `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea` through merge commit `36bfc416851b84858e335028ccb601aeffbfc9b3`; `phase6-integration` itself was not modified.

The existing device-local structured logger now assigns one persisted monotonic `runId` across the actual `Sync now` handler, manual request, BASE/LOCAL/REMOTE planning observations, safe plan summary, preview preparation/presentation, separate Execute gesture, per-operation execution/verification/authoritative-commit stages, and explicit complete/failed/cancelled/deferred terminal outcomes. Each preview/modal carries its originating run explicitly, so identical deterministic semantic `PlanId` values cannot overwrite diagnostic ownership. Synchronization failures export only fixed metadata (`Error`/`NonErrorFailure` plus `Synchronization failure details suppressed.`), never arbitrary thrown messages. Safe ordinals, categories, counts, and statuses are recorded without paths, filenames, note/binary content, Drive IDs, OAuth credentials/state/PKCE/code, or complete URLs. Diagnostics cannot affect synchronization decisions.

Focused behavioral coverage is **13/13 PASS**. Typecheck and build pass; all five package verifiers pass. The final integrated Windows full suite is **307/309 PASS** with only the two qualified pre-existing drive-prefix portable-collision assertions. Generated `main.js`: `351475` bytes; SHA-256 `32500b28f1f8e730f3ea17a43a93a8f79bf028365c0324fa03767db035bb586f`.

After push of evidence head `24c3b08e51032d29bf13535ee06ba8a8435513d9`, GitHub reported PR #24 OPEN and UNMERGED, base `phase6-integration`, head `phase6-alpha-ios-sync-diagnostic-logging`, `mergeable=MERGEABLE`, `mergeStateStatus=UNSTABLE` rather than dirty, and compare state `behind_by=0`, `ahead_by=7`. The PR body was updated to the same current verification values.

Detailed evidence and complete manifest: `dev/evidence/_ca-output-agt-CA-P6-IOS-SYNC-DIAG-01.md`.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

Synchronization root cause: NOT YET ESTABLISHED

Historical ledger statement retained from the earlier construction stage: Phase 6 and Stage 3 had **not** begun at that point.

---

## Phase 1 — Repository Foundation and Frozen Shared Contracts

### Recovered historical evidence

The original Phase 1 `_ca-output.md` was recovered from Git history at commit:

`91f740bf3d6ad1a93524dc0a1ea77dfeba22eb9b`

That historical record identifies:

- build/session: `Stage 2A Build Session 01 / Phase 1 — Repository Foundation and Frozen Shared Contracts`;
- baseline: `0f88f8f11d10caf492237b323aec1b550fc2b052`;
- final pushed implementation SHA before the Phase 1 evidence-only commit: `40af4c2a73576f931868453f03857af25bd207d9`;
- final post-lockfile CI run: `32662829150`;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 14/14 Phase 1 tests;
- `npm run build`: PASS.

Phase 1 established the mobile-compatible Obsidian plugin foundation, reproducible build/test tooling, frozen shared contracts under `src/contracts/**`, test fakes, architecture/mobile-safety checks, and `dev/phase-1-shared-contracts.md`.

The complete recovered Phase 1 evidence remains available through the immutable historical Git object above; its prior failed intermediate CI attempts and corrective steps remain part of the record and are not rewritten here as passes.

---

## Phase 2 — Core Synchronization Semantics and Durable State

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P2.md`

That record identifies:

- session: `Stage 2A Build Session 02 / Phase 2 — Core Synchronization Semantics and Durable State`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final implementation head verified by Phase 2 CI: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.

Phase 2 established deterministic LOCAL/REMOTE/BASE planning, safe-union initialization, timestamp-independent truth, conservative deletion authority, conflict/three-way-merge semantics, identity-preserving move recognition, destructive safety policy, durable/versioned synchronization state, tombstones/stale-device protection, operation journaling, crash-safe verified commit order, run serialization, cancellation/pause/deferred reconciliation, and precondition validation.

The full Phase 2 implementation inventory and verification history are preserved in `_ca-output-CA-P2.md`.

---

## Phase 3 — Google Drive and OAuth Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P3.md`

That record identifies:

- session: `Stage 2A Build Session 03 / Phase 3 — Google Drive and OAuth Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified Phase 3 code head: `6e4621345809b30e8b4161f1e52f6344f7474c33`;
- final code verification run: `32713423290`;
- verification job: `97389515202`.

Phase 3 established the `drive.file` OAuth/Drive implementation, PKCE/state transaction integrity, device-local secret storage, same-device authorization return seams, stable managed-root identity/protocol metadata, explicit pairing and account binding, Changes API support, complete/partial reconciliation semantics, lazy bounded downloads, resumable uploads, identity-preserving Drive moves, recoverable Drive trash, and structured bounded retry/error signaling.

The full Phase 3 implementation, official-documentation basis, limitations, and verification record remain preserved in `_ca-output-CA-P3.md`.

---

## Phase 4 — Obsidian Local, Platform, and Configuration Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P4.md`

That record identifies:

- session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final corrected implementation head recorded in Phase 4 evidence: `4d06581fa91ba9643496a67296b5002925581ba2`;
- verification run for the recorded correction: `32731187369`;
- verification job: `97443556511`.

Phase 4 established the production local-vault boundary, path/exclusion/configuration policy, atomic local replacement semantics, Obsidian FileManager move/trash behavior, startup/lifecycle event handling, desktop external-reference containment checks, and mobile-safe fail-closed behavior.

### Preserved stock-iOS platform limitations

The Phase 4 evidence established two limitations that remain authoritative and were not weakened during Phase 5:

1. stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type; unsafe whole-file `readBinary()` fallback is prohibited;
2. stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee; the implementation fails closed where proof capability is unavailable.

The full Phase 4 evidence remains preserved in `_ca-output-CA-P4.md`.

---

## Phase 5 — Integrated Product, Accepted Repairs, Group D Acceptance, and G2R Closure

### Integrated history and corrective baselines

- original Group D baseline: `70b4952c82987e1de8a1455166b090b2a4f57918`;
- accepted G1 trigger-semantics checkpoint: `c12350f0ad00a117a7116d529bc04ebedce09352`;
- prior G2 evidence-only master: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R correction-pass baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`;
- G2R final dynamically tested implementation/test SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`.

Retained Group repair evidence:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-A-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-B-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-C-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`.

Phase 5-specific evidence:

`dev/evidence/_ca-output-CA-P5.md`

Current blocker/limitation record:

`dev/evidence/_ca-blocker.md`

### Historical checkpoints retained, not current

- original Group D dynamically tested checkpoint `ee431c408c64cddf3bcc8642c3015179fefb9b91`: 177/177 tests;
- accepted G1 checkpoint `c12350f0ad00a117a7116d529bc04ebedce09352`: 178/178 tests;
- prior G2 dynamically tested checkpoint `7aab9a90c885f33a371576ef602e7a5d352b1d07`: 209/209 tests, run `32811319438`, job `97691056148`.

Those are historical only. The current authoritative G2R gate is below.

### G2R corrections

**C1 — Scenario 30 production cross-instance lease evidence**

Scenario 30 now creates two distinct production `WebLocksRunLeasePort` instances over one controlled shared fake Web Locks manager. Two real `IntegratedProductController` runs prove that the first controller holds the production vault lock, the second cannot mutate while that lock is held, and the lock is released for later acquisition. `InMemoryRunLeasePort` is no longer Scenario 30 primary evidence.

**C2 — Scenario 47 runtime-owned notification delivery evidence**

Scenario 47 now initializes `Phase5ProductRuntime` with controlled external boundaries and exercises the runtime-owned controller surface subscription. Ordinary pause/resume surface transitions produce no host notification; a recovery-required transition traverses the runtime-owned `MeaningfulNotificationFilter` and reaches `ProductRuntimeHost.notify`. The primary acceptance path no longer reconstructs that listener/filter wiring in the test.

**C3 — cumulative evidence preservation**

The complete Phase 1–4 cumulative text from `c12350f0ad00a117a7116d529bc04ebedce09352:dev/evidence/_ca-output.md` is restored above without condensation or deletion. Phase 5 is updated after those preserved sections rather than replacing earlier phase evidence.

### Acceptance map

`test/phase5-acceptance-map.test.ts` retains exact scenarios 1 through 50 and source-verifies each primary executable test reference. Rows 30 and 47 now point to the corrected production-path tests described above. The acceptance-map self-check passed in the final G2R gate.

### Final G2R dynamically tested implementation/test checkpoint

Exact SHA:

`3aab3647b57baad7df0b31cc40042325fcfa0e4f`

Authoritative GitHub Actions gate:

- workflow: `Phase 1 CI`;
- run ID: `32854213913`;
- job ID: `97822114191`;
- clean checkout confirmed exact SHA `3aab3647b57baad7df0b31cc40042325fcfa0e4f`;
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 209 tests / 209 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

The actual job log was inspected. Scenario 30 passed as test 169; corrected runtime-owned Scenario 47 passed as test 173; the acceptance-map self-check passed as test 121.

No production source file changed during G2R.

### G2R exact change manifest

Correction-pass compare baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`.

### Created

- none.

### Modified

- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

### Deleted

- none.

### Remote Branches Deleted

No branches were created or deleted during G2R.

Historical Group D cleanup deleted:

- `agt-stg-2a-phase-1-01`;
- `ca-c1-verification`;
- `master-temp-should-fail`;
- `phase5-fix-group-a`;
- `phase5-fix-group-b`;
- `phase5-fix-group-c`;
- `stage-2a-integration-234`;
- `stage-2a-phase-2-core-sync-state`;
- `stage-2a-phase-3-drive-oauth`;
- `stage-2a-phase-4-obsidian-local`;
- `stage-2a-phase-5-integrated-product`.

Historical cleanup evidence:

- workflow: `Group D Branch Cleanup`;
- run ID: `32805742158`;
- job ID: `97675382231`;
- result: PASS.

Final remote branch enumeration is verified after the evidence-only commits and recorded in the agent handoff. Required state remains exactly `master`.

---

## Current Unavailable Live / Physical Validation

These are **not** recorded as passes:

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`;
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`;
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`;
- physical network interruption during transfer — `NOT AVAILABLE IN THIS SESSION`;
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`;
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`.

---

## Current Completion State

`COMPLETE WITH NON-BLOCKING FINDINGS`

G2R C1, C2, and C3 are dynamically verified at `3aab3647b57baad7df0b31cc40042325fcfa0e4f`. Phase 5 scenarios 1–50 retain primary executable evidence, including corrected Scenario 30 and Scenario 47 mappings. Remaining findings are the two explicitly preserved stock-iOS fail-closed platform limitations and the live/physical validations marked `NOT AVAILABLE IN THIS SESSION`. No supervisory approval is claimed.

---

## Phase 6 Alpha Repair — OAuth Protocol-Handler Lifecycle (Alpha Bug #3)

This record is an append-only repair record. Earlier statements above about Phase 6 not yet having begun describe the historical state at the time those records were written and are not rewritten here.

### Identity and branch control

- agent ID: `agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01`;
- repair branch: `phase6-alpha-oauth-lifecycle-fix`;
- verified integration base branch: `phase6-integration`;
- exact verified base SHA: `717c35b5fcd7a97bec110ac18f02cec3f821590c`;
- exact production/test implementation head: `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`; subsequent branch commits are evidence-only unless otherwise stated;
- draft review PR: `#16`, retargeted to `phase6-integration`, unmerged;
- `master` was not modified;
- Phase 6 integration PR `#15` was not merged;
- this repair branch was not merged into `phase6-integration`.

### Corrections completed

**C1 — plugin-lifetime protocol-handler ownership**

`src/main.ts` now registers `brain-gdrive-oauth` once from `BrainGoogleDriveSyncPlugin.onload()` through Obsidian's supported `registerObsidianProtocolHandler` lifecycle API. The stable callback dynamically dereferences the plugin's current runtime and forwards completion to that runtime. Existing success/failure Notice semantics are preserved and failure notices expose only the safe completion reason.

**C2 — runtime initialization no longer owns protocol registration**

`src/product/runtime.ts` no longer imports or calls `registerGoogleOAuthReturn(...)` from `Phase5ProductRuntime.initialize()`. Repeated runtime initialization may reconstruct mutable Google/OAuth runtime resources without attempting to register the plugin-global protocol action. A minimal `completeGoogleAuthorization(input)` seam dereferences `this.boundary?.oauth` at callback execution time.

**C3 — OAuth return helper is lifetime-safe**

`src/drive/oauth-return.ts` now accepts a `GoogleOAuthCompletionDelegate` rather than a concrete `GoogleOAuthSession` for protocol-return completion. The registered callback therefore does not inherently capture the OAuth session that existed when registration occurred. `beginGoogleAuthorization(...)` and the existing OAuth session security/token behavior are unchanged.

**C4 — Authenticate after initialization is safe**

`src/main.ts` retains the existing Authenticate path that reruns `runtime.initialize()` before `runtime.authenticate()`. Because runtime initialization no longer performs protocol registration and the stable plugin handler resolves the current runtime/session dynamically, Authenticate-triggered reinitialization no longer creates duplicate action registration or stale-session callback routing.

### Exact change manifest

#### Created

- `test/phase6-alpha-oauth-lifecycle.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01.md`

#### Modified

- `src/main.ts`
- `src/product/runtime.ts`
- `src/drive/oauth-return.ts`
- `dev/evidence/_ca-output.md`

#### Deleted

- none.

### Targeted regression coverage

`test/phase6-alpha-oauth-lifecycle.test.ts` adds six executable tests covering the required T1–T7 matrix:

- T1: repeated `Phase5ProductRuntime.initialize()` calls produce zero protocol registrations;
- T2: a capturing registrar proves one stable `brain-gdrive-oauth` registration for one plugin lifetime, with separate plugin lifetimes able to register normally;
- T3: the production Authenticate-after-initialization path retains runtime initialization/authentication while neither that path nor runtime initialization contains registration;
- T4: stable delegation after session replacement routes the callback to the current completion target, and the runtime completion seam dereferences the current `boundary.oauth` at callback time;
- T5: both routing tests explicitly assert the prior session receives zero callback invocations;
- T6: independent plugin-lifetime registrar fakes each register normally and production sources contain no manual unregister/registry manipulation seam;
- T7: changed lifecycle sources/tests contain no new console logging or secret-bearing token/verifier/client-secret diagnostics, while safe success/failure Notice text remains present.

The pre-existing OAuth security tests remain intact, including exact `drive.file` scope, PKCE S256/high-entropy state, state-mismatch rejection, secret storage, and Phase 6 C exact-scope enforcement.

### Commands and observed verification

Local shell execution against a repository checkout was not available in this agent environment. The requested command sequence was executed by GitHub Actions on the pushed repair branch through draft PR `#16`:

- `npm ci`: **PASS** — 14 packages installed; 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

Focused lifecycle tests appeared as tests 214–219 in the inspected CI job log and all passed:

- 214 — T1 repeated runtime initialization;
- 215 — T2/T4/T5 stable registration/current completion target;
- 216 — T4/T5 runtime current-session dereference;
- 217 — T3 Authenticate-after-initialization;
- 218 — T2/T6 per-plugin-lifetime registration/lifecycle cleanup;
- 219 — T7 diagnostics/security and completion notices.

GitHub Actions evidence:

- workflow: `Phase 1 CI`;
- run ID: `32925172932`;
- job ID: `98046517476`;
- workflow head SHA metadata: `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`;
- workflow conclusion: **success**;
- actual job log inspected.

CI checkout qualification: because the repository workflow is configured only for pushes to `master` and pull requests targeting `master`, the CI trigger was a draft PR and `actions/checkout` tested GitHub's generated PR merge ref `33f014e27e76c6a97f03f4a2c352470cb5dce18c`, which merged repair head `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951` into the then-current `master` base. The repair head was therefore present in the tested tree, but an Actions clean checkout of the repair head SHA itself was not performed. The PR was then retargeted to `phase6-integration` for supervisor review and remains unmerged.

A separate focused-test-only shell command was not executed; the focused lifecycle file executed successfully as part of the complete 239-test CI suite.

The current `npm run build` PASS is recorded only as the repository's existing automated compilation/build check. It is **not** real Obsidian runtime packaging acceptance and does not close Alpha Bug #1.

### Unavailable validation

- exact-head-SHA GitHub Actions clean checkout (as distinct from the successful PR merge-ref checkout containing that head) — `NOT AVAILABLE IN THIS SESSION`;
- local-shell `npm ci` / typecheck / test / build execution — `NOT AVAILABLE IN THIS SESSION`;
- separate focused-test-only command — `NOT AVAILABLE IN THIS SESSION`;
- real Windows Obsidian OAuth retry validation — `NOT AVAILABLE IN THIS SESSION`;
- real Windows Obsidian protocol-handler reload/unload validation — `NOT AVAILABLE IN THIS SESSION`;
- live Google OAuth token exchange / Alpha Bug #2 diagnosis — `NOT AVAILABLE IN THIS SESSION`;
- real-runtime packaging validation / Alpha Bug #1 repair — `NOT AVAILABLE IN THIS SESSION`.

### Remaining blockers / limitations

No automated lifecycle-repair blocker remains in the inspected branch and CI evidence. Physical Windows Obsidian confirmation of repeated Authenticate/callback behavior remains unavailable and must be performed by the supervising/user environment after review, bundling, and installation. Alpha Bug #2 (`token-exchange-failed`) and Alpha Bug #1 (production packaging/runtime loadability) remain explicitly outside this repair and were not modified or diagnosed here.

No supervisory approval is claimed.

---

## Phase 6 Alpha Integration — Approved OAuth Lifecycle Repair

This record establishes the newer integration state and does not rewrite the historical Alpha Bug #3 repair record above.

### Integration identity and ancestry

- agent ID: `agt-CA-P6-ALPHA-OAUTH-LIFECYCLE-01`;
- approved repair branch: `phase6-alpha-oauth-lifecycle-fix`;
- approved repair head: `ca245e2198f1b8311b3edc3e419379c8c982ede6`;
- production/test implementation head within that history: `b54e7dbcadc90c0c2a1d4cca14110b4e10be2951`;
- pre-integration `phase6-integration` head: `717c35b5fcd7a97bec110ac18f02cec3f821590c`;
- integration method: **fast-forward only**; no merge commit, rebase, cherry-pick, squash, conflict resolution, or force-push was used;
- after the fast-forward and before this evidence-only commit, `phase6-integration` resolved exactly to `ca245e2198f1b8311b3edc3e419379c8c982ede6`;
- the complete approved Alpha Bug #3 repair history is therefore contained in `phase6-integration`.

### Fresh combined integration verification

Draft integration PR `#15` was updated by the fast-forward and triggered the repository's normal PR verification.

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32929111162`;
- job ID: `98057781846`;
- PR head metadata: `phase6-integration` @ `ca245e2198f1b8311b3edc3e419379c8c982ede6`;
- exact generated PR merge SHA checked out by Actions: `2433141fb106d72b4a71e61c8be5d83893d37620`;
- checkout log: merge ref combined `ca245e2198f1b8311b3edc3e419379c8c982ede6` into unchanged `master` base `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: **PASS** — 14 packages added, 15 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- lifecycle repair tests 214–219 all passed in the combined integration run;
- `npm run build`: **PASS**;
- workflow/job conclusion: **SUCCESS**;
- actual job steps and complete job log were inspected.

The `npm run build` result proves only that the repository's existing automated build command completed. It does **not** establish correct real Obsidian plugin packaging and does **not** close Alpha Bug #1.

### Current boundaries after integration

- Alpha Bug #1 remains unresolved: plugin packaging/build output is not yet formally repaired for real Obsidian runtime installation.
- Alpha Bug #2 remains unresolved and outside this task: `token-exchange-failed` has not yet been diagnosed from sanitized live token-endpoint evidence.
- required live/physical Phase 6 validation remains incomplete and is not represented as PASS by this automated integration gate;
- Stage 3 has **not** begun;
- PR `#15` remains unmerged.

This integration evidence commit is evidence-only; the dynamically tested integration tree is the approved repair head `ca245e2198f1b8311b3edc3e419379c8c982ede6` as exercised through generated PR merge SHA `2433141fb106d72b4a71e61c8be5d83893d37620`.

---

## Phase 6 Alpha Repair — Obsidian Plugin Packaging / Build Output (Alpha Bug #1)

This append-only record establishes the newer packaging-repair state without rewriting the historical records above.

- agent ID: `agt-CA-P6-ALPHA-PACKAGING-01`;
- branch: `phase6-alpha-packaging-fix`;
- exact verified base: `11b7bddbe71d2dbfb6eb0d6d6b703442f0967d8c`;
- exact production/test implementation head: `9e3ee932548954a60324b06ebccc82303a1d46b2`;
- bundler: `esbuild` `0.28.2`;
- production build command: `node scripts/build.mjs && node scripts/verify-build.mjs`.

The supervisor-confirmed defect was repaired without rediagnosis: the old TypeScript CommonJS module-tree packaging was replaced by a reproducible esbuild bundle from `src/main.ts` to one CommonJS `main.js`, with `obsidian`, `electron`, and `node:*` retained as externals and the existing guarded desktop-only runtime boundary preserved. `scripts/finalize-build.mjs` and `tsconfig.build.json` were retired. No production source or test source file changed.

Mandatory manual re-ingestion used current repository files. Construction-manual verification: exact title `Agent-Led Software Product Construction Manual`; first sentence `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`; last sentence `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`; heading counts H1=1, H2=11, H3=67, H4=43, H5+=0, total=122; H2 sequence Purpose, Operating Principles, Navigation and Entry, Stage 0, Stage 1, Stage 2A, Stage 2B, Stage 3, Cross-Stage Handoff Rules, Re-Entry and Recovery, Recommended Default Workflow; embedded prompt inventory: Stage 0 Agent Prompt, Stage 1 Agent Prompt, Stage 2A Build-Prompt Expansion Template, Autonomous Build Prompt, Stage 3 Validation Prompt.

Authoritative GitHub Actions verification:

- workflow: `Phase 1 CI`;
- run ID: `32931277140`;
- job ID: `98063871872`;
- generated PR merge SHA actually checked out: `0bb7c443b75e7fca68dbdaeb11a045235b93e820`;
- merge ref contained implementation head `9e3ee932548954a60324b06ebccc82303a1d46b2` over unchanged master `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239/239 pass, 0 fail/cancelled/skipped/todo;
- `npm run build`: **PASS**;
- artifact size: 279,758 bytes;
- artifact SHA-256: `fce84d639c71375f06a03c9b600b8c1869b599e697627d28c85056d3d8eb1cf0`;
- focused artifact checks: entrypoint PASS; `node --check` syntax PASS; unresolved local runtime dependencies PASS; mobile-path evaluation without Node/Electron/Windows-only requests PASS; clean package shape/no old generated runtime tree PASS;
- existing source-level mobile-isolation tests remained PASS, including tests 32–36;
- approved OAuth lifecycle tests 214–219 remained PASS;
- actual CI job log was inspected.

Exact implementation manifest before evidence-only records:

Created: `scripts/build.mjs`, `scripts/verify-build.mjs`.
Modified: `package.json`, `package-lock.json`.
Deleted: `scripts/finalize-build.mjs`, `tsconfig.build.json`.

Evidence additions after the implementation head: `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PACKAGING-01.md` created and this canonical `dev/evidence/_ca-output.md` appended.

Local-shell npm/typecheck/test/build execution was `NOT AVAILABLE IN THIS SESSION`; no local PASS is claimed. Real Windows Obsidian installation/load of this committed repair and real iPhone/iOS validation were also `NOT AVAILABLE IN THIS SESSION` and are not represented as PASS. The two established stock-iOS fail-closed limitations remain unresolved.

Draft PR `#17` was temporarily based on `master` solely to obtain the existing PR CI, then retargeted to `phase6-integration`; it is to remain draft/open/unmerged for supervisor review. Alpha Bug #2 was not diagnosed or modified. PR `#15` was not merged. `master` was not modified. Stage 3 was not begun. No supervisory approval is claimed.

---

## Phase 6 Alpha Integration — Approved Packaging Repair (Alpha Bug #1)

This append-only record establishes the approved packaging repair integration without rewriting earlier Phase 6 or Alpha debugging evidence.

### Integration identity and ancestry

- repair agent: `agt-CA-P6-ALPHA-PACKAGING-01`;
- approved repair branch: `phase6-alpha-packaging-fix`;
- approved repair head: `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- production/build implementation head within that history: `9e3ee932548954a60324b06ebccc82303a1d46b2`;
- pre-integration `phase6-integration` head: `11b7bddbe71d2dbfb6eb0d6d6b703442f0967d8c`;
- integration method: **fast-forward only**; no merge commit, rebase, cherry-pick, squash, conflict resolution, force-push, or history rewrite was used;
- immediately after the fast-forward and before this evidence-only commit, `phase6-integration` resolved exactly to `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- dynamically tested integration tree: `b256c3c05b5f2c9536856bf32a9556066990e3b6`.

### Fresh combined integration verification

Draft integration PR `#15` was updated by the fast-forward and triggered the repository's normal PR verification.

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32932878480`;
- job ID: `98068347964`;
- PR head: `phase6-integration` @ `b256c3c05b5f2c9536856bf32a9556066990e3b6`;
- exact generated PR merge SHA checked out by Actions: `bc9b396709160dcb63d9f38a734f9c5dfa73c74e`;
- checkout log confirms the merge ref combined `b256c3c05b5f2c9536856bf32a9556066990e3b6` into unchanged `master` base `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: **PASS** — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 239 tests / 239 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js` size: `279758` bytes;
- generated `main.js` SHA-256: `fce84d639c71375f06a03c9b600b8c1869b599e697627d28c85056d3d8eb1cf0`;
- workflow/job conclusion: **SUCCESS**;
- actual job steps and complete job log were inspected.

The fresh combined build reproduced the approved artifact identity exactly. Alpha Bug #1 is now **repository/build repaired**, but real Windows Obsidian installation/load validation of the integrated packaging remains outstanding and is not represented as PASS by CI. Real iPhone/iOS validation also remains outstanding.

### Current boundaries after integration

- Alpha Bug #2 remains unresolved and untouched: `token-exchange-failed` has not yet been diagnosed from sanitized live token-endpoint evidence;
- real Windows Obsidian installation/load validation remains outstanding;
- real iPhone/iOS validation remains outstanding;
- PR `#15` remains unmerged;
- Stage 3 has not begun;
- no supervisory approval is claimed.

---

## Phase 6 Alpha Live OAuth Debugging and Repair

This append-only record supersedes the earlier statement that Alpha Bug #2 was unresolved; historical evidence above remains unchanged.

- agent: `codex-P6-ALPHA-OAUTH-LIVE-01`;
- starting integration SHA: `8a0ec575f808c610c29ee4e307deb8194ae451c9`;
- repair branch: `phase6-alpha-oauth-live-fix`;
- starting-tree exception: pre-existing user scratch/prompt and unrelated untracked files were preserved after the user explicitly directed the agent to ignore the scratch files and continue;
- false browser-launch failure repaired: a falsy/null `globalThis.open` return is no longer treated as proof of failure, while unavailable launchers and thrown errors still surface;
- diagnostic gap repaired: safe structured token-exchange phase, HTTP status, OAuth error, sanitized description, and generic transport/service classifications are retained and copyable without raw bodies or secrets;
- Obsidian bridge repaired: `requestUrl` now uses `throw: false`, preserving Google 4xx responses for safe parsing;
- conclusive pre-root-fix live result: HTTP `400`, OAuth `invalid_request`, sanitized description `client_secret is missing.`;
- confirmed root cause: the Azure HTTPS callback requires the configured Google Web application client, but production did not wire the already-supported client-secret SecretStorage key;
- root-cause repair: added a masked local-only Obsidian SecretStorage control and production runtime wiring; the user entered the value locally and the value was never exposed to the agent or persisted in plugin data;
- final clean verification: `npm ci` PASS (16 added, 17 audited, 0 vulnerabilities), typecheck PASS, 248/248 tests PASS, build PASS, and all five build-verifier checks PASS;
- verified build: 286,740-byte `main.js`, SHA-256 `ed3a0bc41236b6fb988e3018b928fca36fc6e8fcacb05507eebf10c905ab4993`;
- installed artifact: exact same size/hash; `data.json` preserved; plugin enabled and settings loaded;
- final live result: `Google authentication completed.`; presence-only checks confirmed local client-secret and OAuth-token records without reading either value;
- exact `drive.file` scope invariant remains enforced and tested;
- Alpha Bug #3 remains intact: one plugin-lifetime handler, no runtime registration, current-session dispatch, no duplicate-action error across repeated attempts, lifecycle regressions passing;
- no managed remote was created or paired, no manual verification/sync action ran, all automatic sync triggers remained disabled, and no vault synchronization occurred;
- no OAuth secret, credential, token, authorization code, PKCE verifier, cookie, or vault content was recorded;
- iOS physical validation was not performed;
- Stage 3 did not begin.

Detailed evidence: `dev/evidence/_codex-P6-ALPHA-OAUTH-LIVE-01.md`.

## Phase 6 Alpha correction — Windows first-sync portable-config collision

- agent: `agt-CA-P6-ALPHA-PORTABLE-COLLISION-01`
- construction mode: Stage 2A controlled correction
- starting repair SHA: `69e2a0053bae695655784ddedb8ae8e7c460734b`
- repair branch: `phase6-alpha-windows-bounded-read-fix`
- tested implementation SHA: `b9207fb6a7836f462386c14bfbb4018fafca9218`
- authoritative integration branch remained `phase6-integration` at `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705` during implementation
- prior Windows bounded-read repair status: retained; supervisor/user supplied runtime evidence shows the former HTTP 206/200 blockers fell from `263` to `0` and the preview became `271 upload-create` / `4 blocked-unsafe` out of `275` total

### Manual re-ingestion proof

The required current authorities were re-ingested before implementation: construction manual, target-system specification, decision register, Phase 6 supervisor handoff, project state, `_ca-output.md`, Phase 6 integration manifest, OAuth live integration evidence, and Windows bounded-read evidence. Manual blob `02adedab577f397d98fb9666166270358a581761` matched title `Agent-Led Software Product Construction Manual`; supplied first and last sentences; headings H1 `1`, H2 `11`, H3 `67`, H4 `43`, H5+ `0`, total `122`; the required 11-item H2 sequence; and embedded prompt headings `Stage 0 Agent Prompt`, `Stage 1 Agent Prompt`, `Stage 2A Build-Prompt Expansion Template`, `Autonomous Build Prompt`, and `Stage 3 Validation Prompt`. Re-entry conclusion: continue the active Stage 2A correction without restarting Stage 0/1 or beginning Stage 3.

### Isolated defect and causal chain

The four remaining blocked logical portable-config paths were false collisions. `ProductPathScope` correctly reserves `__brain_sync_portable_config__` as a synthetic namespace and maps allowlisted `.obsidian` files into it. `ScopedLocalVault.hasOrdinaryNamespaceCollision()` correctly fails closed for any underlying namespace observation other than confirmed `absent`. The Windows desktop guard, however, propagated a direct-child `ENOENT`/`ENOTDIR` during `observe`; `ObsidianLocalVaultAdapter.observe()` therefore classified a provably missing reserved root as `unknown`, which the scope correctly treated as a collision. Supervisor/user supplied `Test-Path=False` evidence established that no physical root collision existed in the real BRAIN vault.

### Files inspected

- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/config-policy.ts`
- `src/product/path-scope.ts`
- `src/product/canonical-local-vault.ts`
- `src/product/snapshot-assembler.ts` and planner behavior as exercised by focused tests
- `test/desktop-external-reference-guard.test.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/mobile-safety.test.ts`
- `test/phase5-group-b-scope-transfer.test.ts`
- `test/phase6-a-local-hardening.test.ts`
- prior bounded-read regression coverage and the mandatory authority/evidence files

### Exact semantic correction

`DesktopExternalReferenceGuard.resolveSafePath()` now treats only ordinary filesystem nonexistence (`ENOENT` or `ENOTDIR`) as a successful containment termination after the target has been proven lexically inside the canonical vault root and every existing traversed ancestor has passed `lstat` + `realpath` containment checks. This allows the ordinary adapter existence check to return truthful `status: absent`. Permission/access errors, I/O errors, symlink/junction detection, canonical resolution outside the vault, lexical escape, and all other uncertainty still propagate fail-closed. `ScopedLocalVault.hasOrdinaryNamespaceCollision()` was not weakened and still treats every non-`absent` observation as collision evidence.

### Files changed by the completed repair

- `src/local/desktop-external-reference-guard.ts` — minimal missing-path containment correction only.
- `test/phase6-alpha-portable-collision.test.ts` — seven focused regressions covering direct/nested/intermediate missing paths, permission uncertainty, lexical/external-reference blocking, production desktop `absent` observation, fail-closed unknown/inaccessible/unreadable/occupied namespace behavior, exact portable mappings, and first-sync safe-union planner uploads.
- `dev/evidence/phase6-alpha-windows-bounded-read-output.md` — corrected the physical-validation sequencing and recorded supervisor/user supplied runtime evidence separately from repository/build evidence.
- `dev/evidence/_ca-output.md` — this append-only cumulative record.
- no production synchronization architecture, OAuth code, config allowlist, planner safety rule, generic HTTP-range reader, mobile boundary, or frozen contract was changed.

### Clean-environment automated verification

Because the repository's normal `Phase 1 CI` workflow triggers only for `master` / PRs targeting `master`, it does not run for the authorized PR base `phase6-integration`. The repair was **not** retargeted. A temporary branch-scoped verification workflow was used solely to execute the required commands against a clean GitHub Actions checkout of implementation SHA `b9207fb6a7836f462386c14bfbb4018fafca9218`; it is removed from the final repair tree.

- workflow run: `33021180627`
- job: `98351653267`
- checkout HEAD: `b9207fb6a7836f462386c14bfbb4018fafca9218`
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- `npm test`: PASS — 264 tests, 264 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo
- new focused regressions: tests 238–244, all PASS
- `npm run build`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- generated `main.js` size: `291248` bytes
- generated `main.js` SHA-256: `64a5f0274fce550656a45d0ad44203c58685d888a9b62eb10fc644b6ce889711`

The same 264-test run retained the prior bounded Node filesystem reader regressions, generic HTTP `206` acceptance, HTTP `200` fail-closed behavior, mobile Node/Electron isolation, planner destructive-safety/recovery behavior, and OAuth lifecycle/security tests.

### Completion boundary

- physical installation of the **new** `291248`-byte artifact remains pending supervisor/user;
- a post-fix real Windows first-sync preview remains pending supervisor/user;
- this cloud CA did not access the real BRAIN vault or `.obsidian` directory;
- no OAuth secret, token, authorization code, PKCE material, SecretStorage content, or vault-note body was requested or accessed;
- no first synchronization was executed or authorized by this correction session;
- stock-iOS bounded local reading is not claimed solved by this Windows correction;
- Stage 3 did not begin.

---

## Phase 6 Alpha portable-collision evidence-review closure

- mandatory agent-specific evidence created: `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PORTABLE-COLLISION-01.md`;
- agent-specific evidence creation commit: `85f3e25bd83218980f0858aee5878534ed801ed9`;
- this addition is review-evidence-only and does not change production behavior or previously verified implementation semantics;
- no production source, test source, build configuration, dependency, or workflow file changed during this corrective evidence pass;
- this canonical entry is append-only and closes only the missing mandatory-source review gate;
- Stage 3 remains not begun.

---

## Phase 6 Alpha portable-collision rejection correction — canonical resolution fail-closed

- rejected head: `a1049fafef5a655dd6a32091ed2c62c3ae9cb643`;
- previously tested implementation `b9207fb6a7836f462386c14bfbb4018fafca9218` was rejected because one catch boundary covered both `lstat(current)` and `realpath(current)`, allowing `realpath` `ENOENT`/`ENOTDIR` after successful `lstat` to be misclassified as safe absence;
- corrected semantics: only `lstat(current)` `ENOENT`/`ENOTDIR` may establish a missing-path candidate; once `lstat` succeeds, symbolic-link checks and `realpath` are mandatory and every `realpath` failure propagates fail-closed;
- direct and nested genuine `lstat` absence remains supported; `ScopedLocalVault.hasOrdinaryNamespaceCollision()` and all reserved-namespace fail-closed collision behavior remain unchanged;
- source correction: `src/local/desktop-external-reference-guard.ts`;
- test correction: `test/phase6-alpha-portable-collision.test.ts`, adding explicit `realpath` `ENOENT`/`ENOTDIR` fail-closed regression;
- dynamically tested corrected SHA: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- clean GitHub Actions run/job: `33023650014` / `98359805718`;
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 265 tests / 265 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- new canonical-resolution regression: test 241 PASS; portable-collision regressions 238–245 all PASS;
- `npm run build`: PASS;
- build verifier: entrypoint PASS, syntax PASS, local runtime dependencies PASS, mobile evaluation PASS, package shape PASS;
- `main.js`: 291213 bytes; SHA-256 `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`;
- existing desktop bounded-read, valid HTTP `206`, HTTP `200` fail-closed, mobile isolation, and planner destructive-safety/recovery coverage remained PASS;
- temporary verification workflow removal commit: `e3505cedf4f4ee61639de2488bdc079eb8908d37`;
- agent-specific correction evidence commit: `685b8691c97e03744db8e9986bf97cdb0a68bb2f`;
- no production or test file changed after dynamically tested SHA `8b7f320b0a9af86a933b200245694ee9c47ee854`; post-verification changes are workflow cleanup and evidence only;
- final physical artifact installation and preview-only validation remain pending supervisor/user;
- no synchronization was executed; Stage 3 did not begin.
- temporary evidence-finalization workflow correction commit: `dc926f8f0ccac3a9e7e43d25787f03b890d934e0`;

---

## Phase 6 Alpha Integration — Approved Windows Bounded-Read + Portable-Config Collision Repair

This append-only record establishes integration of the independently approved Windows first-sync repair without rewriting earlier Phase 6 history.

### Integration identity and topology

- integration agent: `agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01`;
- approved repair branch: `phase6-alpha-windows-bounded-read-fix`;
- approved repair head: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- dynamically tested production/test tree within that history: `8b7f320b0a9af86a933b200245694ee9c47ee854`;
- pre-integration `phase6-integration` head: `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- pre-integration merge base: exactly `0a5f3a277fba2e80962dbfd27dd4cdb1e0136705`;
- topology before integration: approved repair was 14 commits ahead and 0 behind the integration head;
- integration method: **fast-forward only** through a non-forced ref update; no merge commit, rebase, cherry-pick, squash, conflict resolution, force-push, or history rewrite;
- post-fast-forward integration tree before evidence-only commits: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- independent review result for the repair before integration: `APPROVE`.

### Approved repair retained

The integrated repair preserves the Windows desktop bounded Node filesystem reader, the synthetic portable-configuration namespace, the selective portable configuration allowlist, and fail-closed reserved-namespace collision handling. Genuine `lstat` `ENOENT`/`ENOTDIR` can prove a missing path after prior existing ancestors pass containment. Once `lstat` proves a component exists, `realpath` is mandatory and every `realpath` failure, including `ENOENT`/`ENOTDIR`, propagates fail-closed. Symlink/junction/reparse escape, lexical escape, permission/access uncertainty, canonical outside-vault resolution, and actual or uncertain reserved-namespace occupancy remain blocked. Mobile-required runtime isolation and the generic HTTP reader remain unchanged.

### Supervisor/user-supplied physical Windows acceptance

The following is **supervisor/user-supplied physical supported-runtime evidence**; the cloud integration agent did not perform these physical actions.

- local repair-branch checkout: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- local `npm ci`: PASS;
- local `npm run build`: PASS;
- all five local build-verifier checks: PASS;
- locally reproduced `main.js`: `291213` bytes;
- local SHA-256: `EC8F4A572EB14ADDDAADB0D0656CED5A3761E373FC6A0A1C78F383D6CF667391`;
- installed `main.js`: `291213` bytes with the same SHA-256;
- Obsidian plugin load: PASS; status `idle-ready`;
- real `Sync now` preview: `275` planned operations;
- preview disposition: `safe-auto-eligible`;
- `274 upload-create`;
- `1 noop`;
- `0 blocked-unsafe`;
- `0` conflicts;
- `0` deletion operations;
- `0` trash operations;
- no destructive operation category;
- sole no-op: `__brain_sync_portable_config__/hotkeys.json`;
- no-op reason: `Neither side currently contains the never-established path.`;
- preview was closed without Execute;
- no first synchronization occurred;
- automatic synchronization remains disabled pending successful reviewed first synchronization.

**PHYSICAL WINDOWS REPAIR ACCEPTANCE: PASS**

This PASS is limited to repaired artifact reproduction, installation/load, and preview-only supported-runtime acceptance. First synchronization execution is not recorded as PASS.

### Fresh combined integration verification

After the fast-forward, existing Phase 6 PR `#15` against unchanged `master` generated a fresh combined clean gate.

- workflow: `Phase 1 CI`;
- run ID: `33031435312`;
- job ID: `98384624285`;
- job conclusion: SUCCESS;
- integration head contained in tested merge: `bcdcf935de0fb49b518d90d7f886b932175f0015`;
- unchanged master base: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- exact generated PR merge SHA: `44ebd6add7fe80f2233bffa2861e7f7d9be73043`;
- checkout log: `Merge bcdcf935de0fb49b518d90d7f886b932175f0015 into 54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 265 tests / 265 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: PASS;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js`: `291213` bytes;
- SHA-256: `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

The artifact identity exactly reproduced the approved repair artifact. The combined log also retained the Windows bounded-read, portable-collision/fail-closed canonical-resolution, generic HTTP-200 rejection, mobile isolation, and planner destructive-safety/recovery coverage.

### Remaining boundary

- first synchronization has not been executed;
- physical iPhone/iOS validation remains outstanding;
- the two accepted stock-iOS fail-closed limitations remain unresolved and are not represented as PASS;
- no OAuth secret/token, authorization code, PKCE material, SecretStorage value, or vault-note body was accessed by this integration agent;
- PR `#15` remains required to stay open/unmerged;
- `master` remains unchanged;
- Stage 3 has not begun.

---

## Evidence provenance correction — C1/C3 closure

This append-only correction reconciles the rejected Windows integration evidence with the complete committed repository history. Earlier sections remain historical and are not rewritten.

### Rejected-review starting state

- `phase6-integration` = `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`;
- `master` = `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`.

The approved repair head `bcdcf935de0fb49b518d90d7f886b932175f0015` is the merge base and ancestor of the rejected-review integration head. The compare is six commits ahead and zero behind.

### Complete six-commit integration-session history

1. `fb6e4f1d0d8a2932ae8c671e8891aeacf641212b` — `docs: add Windows repair integration evidence`
   - created `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.
2. `9668bead31e8cac300528319abf2322da6f2ab36` — `ci: finalize Windows repair integration evidence`
   - created an initial temporary `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.
3. `14b2fb1b7134364976b806eb7a156e9241a3e524` — `ci: remove invalid Windows integration evidence finalizer`
   - deleted that initial temporary workflow revision.
4. `3da2b67345a26d76e1c3ce8b476ef208db66b807` — `ci: stage Windows integration evidence finalizer`
   - created `.github/phase6-alpha-windows-evidence-finalize.sh`.
5. `8f85afa7aef5eb4befee671fe5f23ff7f12d8455` — `ci: run Windows integration evidence finalizer`
   - created a subsequent temporary `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml` revision.
6. `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90` — `docs: record approved Windows first-sync repair integration`
   - modified `dev/evidence/_ca-output.md`;
   - modified `dev/evidence/phase6-integration-manifest.md`;
   - deleted `.github/phase6-alpha-windows-evidence-finalize.sh`;
   - deleted `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`.

The two temporary `.github` paths were actual committed changes during the integration/evidence-finalization session and belong in the complete historical manifest even though they were removed before rejected review.

### Final net repository change from `bcdcf935...` through rejected-review head

**Created**

- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted in final net tree**

- none.

**Session-transient created/deleted paths**

- `.github/workflows/phase6-alpha-windows-integration-evidence-finalize.yml`;
- `.github/phase6-alpha-windows-evidence-finalize.sh`.

Both transient paths were directly verified absent from the rejected-review final tree.

### Resulting branch and PR state at rejected review

- `phase6-integration`: `cdbf75c2f6ca271fe58bedcdbd8c3e53e7395d90`;
- `master`: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`;
- PR #15: open, draft, unmerged; head = `phase6-integration`; base = `master`;
- PR #19: closed; GitHub merged = true; head SHA = `bcdcf935de0fb49b518d90d7f886b932175f0015`; `merge_commit_sha = bcdcf935de0fb49b518d90d7f886b932175f0015`.

Repository ancestry shows the approved repair head itself became contained in `phase6-integration`; no separate production merge commit was introduced for PR #19.

### This evidence-correction pass manifest

**Created**

- none.

**Modified**

- `dev/evidence/_ca-output.md`;
- `dev/evidence/_ca-output-agt-CA-P6-ALPHA-WINDOWS-INTEGRATE-01.md`;
- `dev/evidence/phase6-integration-manifest.md`.

**Deleted**

- none.

No `.github` workflow or helper-script path was created or modified by this evidence-correction pass. No production/test/build/package/dependency/persistent-workflow file was changed. The preserved combined gate remains run `33031435312`, job `98384624285`, with 265/265 tests PASS, typecheck PASS, build PASS, all five build-verifier checks PASS, `main.js` size `291213` bytes, and SHA-256 `ec8f4a572eb14adddaadb0d0656ced5a3761e373fc6a0a1c78f383d6cf667391`.

No synchronization was executed. Stage 3 has not begun.

---

## Phase 6 Alpha — iOS OAuth Browser-Launch Repair

Agent `codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01` started from the required clean `phase6-integration` SHA `73453011c54abdca9ff2548803c025fae9886e74` and worked on `phase6-alpha-ios-oauth-launch-fix`.

The human-provided physical reproduction was: on stock iPhone Obsidian, tapping Authenticate produced no visible browser/web-authentication handoff and no Google authorization flow. The coding agent did not operate the iPhone and does not claim a physical reproduction.

Diagnosis: the previous code called `window.open` only after async runtime initialization and PKCE/Web Crypto preparation. WebKit gates `window.open` on transient user activation and normally does not propagate that activation across asynchronous execution, allowing the host to suppress the late popup without throwing. Windows tolerated the existing timing; stock iOS did not.

Repair: on `Platform.isMobileApp`, reserve a detached blank authorization window synchronously before the Authenticate handler's first `await`; after exactly one PKCE transaction is prepared and stored, navigate that same reservation exactly once. Cancel the reservation and propagate safe preparation/launch errors. Desktop retains the existing direct `noopener,noreferrer` launcher. Callback lifecycle, token processing, device-local SecretStorage, and the exact `https://www.googleapis.com/auth/drive.file` scope remain unchanged.

Verification:

- `npm run typecheck`: PASS;
- focused iOS launch + live OAuth + lifecycle + mobile-safety gate: 25/25 PASS;
- `npm test`: 268/270 PASS, with only two Windows drive-qualified portable-collision path assertions that already failed in the clean pre-change baseline (263/265); no unrelated change was made to bypass them;
- `npm run build`: PASS;
- all five build-verifier checks: PASS;
- `main.js`: `292679` bytes;
- SHA-256: `beb7fad248761eafc97c62bbcfb65c1a1b2f31fa7e1c31e67c28daaf95fcad4b`.

Complete detailed evidence and manifest: `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`.

Physical iPhone Authenticate-button validation remains required after independent review and a later supervisor-controlled BRAT prerelease. No iPhone pairing/synchronization, release operation, integration merge, `master` change, or Stage 3 work occurred.

---

## G1 / C1–C3 Rejection Correction — Supported iOS External-Browser Handoff

This correction supersedes the rejected browser-reservation design and causal characterization in the immediately preceding iOS OAuth repair entry.

### Proven fact and corrected diagnosis

The human-provided physical fact remains: the prior stock-iPhone build produced no visible OAuth browser handoff after tapping Authenticate. Physical testing was not performed by this coding session.

The rejected repair's static defect was its use of `_blank` plus `about:blank` plus later mutation of a returned window-like object. That did not establish the required external/default-browser boundary. The evidence does not establish that asynchronous work inherently destroyed WebKit user activation, and this correction makes no such causal claim.

Obsidian 1.9.10 documents `window.open(url, "_external")` as bypassing Web Viewer and opening the URL in the user's default browser. The plugin's `minAppVersion: 1.11.4` is newer than that documented capability.

### C1–C3 completed

- C1: removed the blank reservation, mutable returned-window dependency, and cancellation wrapper; added an injectable launcher that sends the final authorization URL directly to `_external` and surfaces missing capability safely.
- C2: `Platform.isMobileApp` selects the external launcher; desktop retains its validated `_blank` plus `noopener,noreferrer` default. One OAuth transaction is created before one launch; state, PKCE, callback/current-session delegation, token exchange, SecretStorage, and exact `drive.file` scope are unchanged.
- C3: replaced reservation-confirming tests with external-browser contract, transaction-count/order, error propagation, desktop preservation, callback lifecycle, exact-scope, and mobile-dependency-isolation coverage. Corrected both evidence files to distinguish static proof from pending physical validation.

### Complete correction-pass manifest

Created:

- none.

Modified:

- `src/drive/oauth-return.ts`;
- `src/main.ts`;
- `test/phase6-alpha-ios-oauth-launch.test.ts`;
- `test/phase6-alpha-oauth-lifecycle.test.ts`;
- `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-LAUNCH-01.md`;
- `dev/evidence/_ca-output.md`.

Deleted:

- none.

`src/product/runtime.ts` required no correction-pass edit because its injected-launcher/default-desktop seam was already mechanically suitable. The ignored `main.js` was regenerated only as a verification artifact.

### Verification

- `npm run typecheck`: PASS;
- focused OAuth launch/live/lifecycle/mobile-safety gate: 25/25 PASS;
- `npm test`: 268/270 PASS, with only the same two pre-existing Windows drive-qualified portable-collision assertions;
- `npm run build`: PASS;
- `npm run check`: typecheck PASS, then 268/270 tests with the same two baseline failures; aggregate exits before its build step;
- `git diff --check`: PASS apart from informational LF-to-CRLF working-copy warnings;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js`: `291948` bytes;
- SHA-256: `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`.

### Remaining limitation

Physical iPhone OAuth launch is **NOT AVAILABLE IN THIS SESSION**. It remains a supervisor-controlled post-review test of the corrected BRAT artifact. No iPhone pairing/synchronization, release/tag operation, integration merge, `master` modification, performance work, or Stage 3 work occurred.

PR `#20` updated in place with correction source commit `11212541b663d2953fd0c1f405a60be4fd57243e`, remained open/unmerged, and retained base `phase6-integration`. Automatic Azure Static Web Apps run `33082926371`, job `98554720139`, failed because the app already had the maximum number of staging environments. That deployment-capacity failure did not provide a plugin typecheck/test/build result. No Azure configuration or staging environment was changed by this correction.

---

## Phase 6 Alpha iOS OAuth Repair Integration - `codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01`

On `2026-08-27`, the independently approved repair head `d499bb504e7b1092b4dc6d4fba5bf2523151d248` was fast-forwarded into local `phase6-integration` from base `73453011c54abdca9ff2548803c025fae9886e74` using `git merge --ff-only origin/phase6-alpha-ios-oauth-launch-fix`. The approved head was verified as an ancestor of the result. No merge commit, squash, rebase, cherry-pick, conflict resolution, force push, or `master` change occurred.

Local gates passed: typecheck; 25/25 focused OAuth/mobile tests; build; all five build-verifier checks; and `git diff --check`. The full suite produced 268/270 PASS with only the two qualified, pre-existing Windows drive-path assertions. `npm run check` reproduced the same qualified test result after its typecheck and stopped before its build stage. The independently run build was green and reproduced `main.js` at `291948` bytes with SHA-256 `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`.

Dedicated integration evidence is preserved in `dev/evidence/_ca-output-codex-P6-ALPHA-IOS-OAUTH-INTEGRATE-01.md`. This evidence pass creates that record and modifies this cumulative output plus `dev/evidence/phase6-integration-manifest.md`; it deletes nothing. Physical iPhone OAuth validation remains pending. No iPhone pairing/sync, performance work, Stage 3 work, release/version change, Google Cloud change, Azure change, PR `#15` merge, or `master` modification occurred.

---

## Phase 6 Alpha — iOS Diagnostic Logging and Export — `agt-CA-P6-IOS-DIAG-LOGGING-01`

This append-only record closes the diagnostic-logging build and the PR #21 rejection correction while preserving all historical evidence above.

### Authority and provenance

- agent ID: `agt-CA-P6-IOS-DIAG-LOGGING-01`;
- execution class: `SERIAL-SHARED-OWNER`;
- branch: `phase6-alpha-ios-diagnostic-logging`;
- PR: `#21`, base `phase6-integration`;
- starting authority/base SHA: `d799e0139c36b629769a917f2d328de6ab84f44d`;
- Git tag `0.1.1` independently re-verified to point exactly to that SHA;
- original reviewed implementation head: `233d1da26442b2ab79c8d58f334f70c3cb3cfaf5`;
- gesture-safe final production/test correction SHA: `790243209015300a5f3bb2cf7a1931577d84ec85`;
- final code/workflow verification head before evidence: `5dd64fe0514ee3a48894d937c8cc333644ebc7e9`;
- dedicated evidence creation/final dedicated-file modification commit: `185f49f5e5c7e0477e6c5161f1553f711a4c3d65`;
- detailed evidence: `dev/evidence/_ca-output-agt-CA-P6-IOS-DIAG-LOGGING-01.md`.

PR #21 was verified still exactly at reviewed head `233d1da...` before any corrective edit; no intervening unreviewed commit was present.

### Implemented scope

The branch adds a bounded device-local structured diagnostic logger with monotonic sequence ordering, configurable bounded retention, deterministic text rendering, opt-in mirroring of the same already-sanitized records, and levels exactly `Off`, `Error`, `Warn`, `Info`, `Debug`, `Trace`. Inclusion semantics retain Error/Warn at every non-Off level, Info at Info+, Debug at Debug+, and Trace at Trace+. Executable tests establish materially increasing diagnostic richness `Info < Debug < Trace` without opening new secret-bearing data categories.

OAuth/runtime/browser/callback instrumentation is present across the existing OAuth path, with independent diagnostic attempt IDs and safe presence/classification metadata. Two OAuth-independent `_external` browser probes are present: one direct from the user gesture and one after one controlled Promise microtask boundary. Existing callback lifecycle, external-browser implementation, synchronization semantics, and exact Drive scope are preserved.

Diagnostics persist through plugin data and remain device-local; they are not synchronized into the vault.

### Export behavior and rejection correction

Clipboard export remains available and is now gesture-safe. The rejected sequence that awaited `diagnostics.flush()` before `navigator.clipboard.writeText()` was removed. `copyDiagnosticLogText()` invokes the injected/real `writeText(text)` synchronously before returning its Promise. `copyDiagnosticLog()` synchronously renders the in-memory sanitized log and invokes that helper from the settings-button call stack; any persistence flush occurs only after clipboard success. No timeout/retry is used to manufacture activation.

Behavioral regression coverage proves the clipboard call happens before caller awaiting can occur, proves the exact rendered text is supplied, and proves controlled failure when clipboard is unavailable. No vault write is involved.

The separate `.txt` Web Share implementation is preserved. It constructs an in-memory `brain-sync-diagnostic-log.txt` `text/plain` `File` and hands only `{ files: [file] }` to `navigator.share()` directly from the user gesture. It does not write a diagnostic file into the synchronized vault. Feature detection gates the control and clipboard remains fallback.

Physical iPhone share-sheet/Save-to-Files behavior remains unverified.

### Security constraints

Diagnostic fields are structurally constrained and defense-in-depth sanitized. Secret/token/password/authorization/PKCE/verifier/code/challenge/state/URL/body/response-like data and paths/query-like values are excluded or redacted. Errors retain safe classifications/messages only. No OAuth secret, token, state, verifier, challenge, authorization code, or full authorization URL is recorded.

Exact OAuth scope remains:

`https://www.googleapis.com/auth/drive.file`

No `about:blank`, returned `Window`/`WindowProxy` dependency, Node/Electron mobile dependency, synchronized logs, OAuth behavior change, or synchronization behavior change was introduced.

### Correction commits

- `d8e81878382c0cda6a76c0fd756bd7db6f9151b3` — gesture-safe clipboard helper;
- `60f51c290231ebcca5619f56786547776f1dbe77` — gesture-safe `src/main.ts` clipboard wiring;
- `790243209015300a5f3bb2cf7a1931577d84ec85` — behavioral clipboard regression coverage;
- `5dd64fe0514ee3a48894d937c8cc333644ebc7e9` — focused diagnostic CI mechanically extended to include export regressions.

### Complete base-to-evidence-tree net manifest

Comparison base: `d799e0139c36b629769a917f2d328de6ab84f44d`.

#### Created

- `.github/workflows/phase6-alpha-diagnostic-ci.yml`
- `src/diagnostics/browser-probes.ts`
- `src/diagnostics/diagnostic-logger.ts`
- `src/diagnostics/oauth-diagnostics.ts`
- `src/diagnostics/share-export.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`
- `test/phase6-alpha-oauth-diagnostics.test.ts`
- `test/phase6-alpha-share-export.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-IOS-DIAG-LOGGING-01.md`

#### Modified

- `src/drive/auth.ts`
- `src/main.ts`
- `src/product/plugin-data.ts`
- `src/product/runtime.ts`
- `src/product/settings-tab.ts`
- `test/phase6-alpha-ios-oauth-launch.test.ts`
- `test/phase6-alpha-oauth-lifecycle.test.ts`
- `dev/evidence/_ca-output.md`

#### Deleted

- none.

### Verification

Code-bearing final verification workflow: `Phase 6 Alpha Diagnostic Verification`.

- run ID: `33108757692`;
- job ID: `98645636059`;
- verified head: `5dd64fe0514ee3a48894d937c8cc333644ebc7e9`;
- conclusion: **SUCCESS**;
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- full suite: **292/292 PASS**, 0 fail/cancelled/skipped/todo;
- focused diagnostic/OAuth/export suite: **33/33 PASS**, 0 fail/cancelled/skipped/todo;
- synchronous clipboard regression: PASS;
- progressive-detail `Info < Debug < Trace`: PASS;
- secret-safety/redaction tests: PASS;
- OAuth launch/lifecycle tests: PASS;
- exact `drive.file` scope tests: PASS;
- `npm run build`: PASS;
- `npm run check`: PASS;
- `git diff --check`: PASS;
- artifact upload: PASS.

Five build verifiers:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Final code-bearing artifact:

- `main.js` size: `329013` bytes;
- SHA-256: `1225e9b1798d5238d7fd0e0a2241a40080b02b8c0e7d92970828ac1fa98726c6`;
- uploaded artifact ID: `9661596129`;
- artifact ZIP size: `69259` bytes;
- artifact ZIP SHA-256: `30d1dab6fb14719c3cf82e76e7efc54294cded0803150e65354dcf656101ab18`.

A preceding post-correction gate, run `33108598399` / job `98645079257`, also passed 292/292 tests, typecheck, build, check, diff, and all five package verifiers before the focused command was mechanically expanded to include the export test file.

### Azure qualification

Azure Static Web Apps run `33108757695`, job `98645636153`, failed only at deployment capacity. The inspected log states that the Static Web App already has the maximum number of staging environments and asks that one be removed before retrying. Azure configuration/staging environments were not changed. This external preview-capacity condition is not treated as a plugin build/test failure.

### Limitations and explicit non-actions

- `Physical iPhone execution: NOT AVAILABLE IN THIS SESSION`
- `OAuth root cause: NOT YET ESTABLISHED`
- physical iPhone clipboard acceptance: NOT AVAILABLE IN THIS SESSION
- physical iPhone `.txt` share-sheet / Save-to-Files acceptance: NOT AVAILABLE IN THIS SESSION
- no release/tag `0.1.2` created or published;
- no pairing performed;
- no synchronization performed;
- no performance work performed;
- no Stage 3 work begun;
- no `master` modification;
- PR #21 must remain OPEN and UNMERGED pending independent review and physical iPhone acceptance.

---

## Phase 6 Alpha — PR #24 Manual-Sync Failure-Boundary Correction — `agt-CA-P6-IOS-SYNC-DIAG-01`

PR #24's rejected head `86f8850aeb6f56018700b489d863320f12248ae3` was verified unchanged before repair. The existing branch `phase6-alpha-ios-sync-diagnostic-logging` was corrected in place; PR #24 remains the intended review vehicle and independent rereview is still required.

### C1/C2/C3 correction

- C1: preview-presentation exceptions now emit a sanitized Error-level `sync-run-failed` event at fixed stage `preview-presentation`, close the original diagnostic run, and preserve the exception.
- C2: Execute and destructive-approval request rejections now emit Error-level `execute-request-rejected` evidence under the original manual `runId` with fixed safe classifications. Plan/run correlation survives stale-plan replacement. A returned rejection resets modal suppression, preserves the visible rejection, and permits later preview dismissal to record cancellation and close the run.
- C3: run-lease acquisition and operation precondition, pending-journal, content-mutation, uncertain-journal, and authoritative state-commit failures now emit Error evidence naming the exact stage. Returned mutation failure is no longer Trace-only; thrown errors flow only through sanitized `syncFailure` and preserve existing throws. Successful Trace ordering, including verified receipt before authoritative state commit, is unchanged. Observer failures remain isolated from synchronization.

### Correction-pass manifest

Created: none.

Modified:

- `src/core/execution-coordinator.ts`;
- `src/diagnostics/sync-diagnostics.ts`;
- `src/main.ts`;
- `src/product/plan-modal.ts`;
- `src/product/product-controller.ts`;
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`;
- `dev/evidence/_ca-output-agt-CA-P6-IOS-SYNC-DIAG-01.md`;
- `dev/evidence/_ca-output.md`.

Deleted: none.

`main.js` was regenerated only as an ignored verification artifact. No version metadata, OAuth behavior/scope, synchronization semantics, release, tag, integration branch, or `master` state was changed.

### Verification

- typecheck: PASS;
- focused iOS manual-sync diagnostics: **12/12 PASS**;
- full suite: **302/304 PASS**, with exactly the same two qualified pre-existing Windows drive-prefix portable-collision assertions and no additional failure;
- build: PASS;
- build verification: PASS;
- `git diff --check`: PASS, with informational LF-to-CRLF working-copy warnings only;
- `BUILD_VERIFY_ENTRYPOINT=PASS`;
- `BUILD_VERIFY_SYNTAX=PASS`;
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`;
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`;
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`;
- generated `main.js`: `351383` bytes;
- SHA-256: `46e8331738395e669ea7d6fb3a22f0a098129d892e7100a2e28c012c39a0ef55`.

Qualified Windows assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure` — actual `D:\vault\__brain_sync_portable_config__`, expected `\vault\__brain_sync_portable_config__`;
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates` — actual `D:\vault\notes\missing.md`, expected `\vault\notes\missing.md`.

`Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`

`Synchronization root cause: NOT YET ESTABLISHED`

PR #24 must remain OPEN and UNMERGED. No `0.1.3` tag/release, pairing, synchronization, performance work, Phase 6 closure, or Stage 3 work occurred.
---

## Phase 6 Alpha — iOS HTTPS Callback to Obsidian Handoff Repair — `agt-CODEX-P6-IOS-CALLBACK-HANDOFF-01`

### Authority and provenance

- date: `2026-08-27`;
- repair branch: `phase6-alpha-ios-callback-handoff-fix`;
- required source branch: `phase6-alpha-ios-diagnostic-logging`;
- verified starting/source SHA: `a0fc805b5d93b056d6699fc48633e11782bd0bde`;
- production/test repair commit: `4268efed443b099319dfe7f99d23e94add39765e`;
- no merge, rebase, squash, cherry-pick, force push, release, or tag operation was performed.

### Localized repair

The hosted HTTPS OAuth callback page now keeps the existing automatic `obsidian://brain-gdrive-oauth` navigation attempt and also prepares a direct, visible `Open Obsidian to finish authentication` link before that attempt. The direct link supplies a user-gesture fallback when automatic custom-scheme navigation does not open Obsidian. A thrown automatic-navigation error is caught so the already-prepared fallback remains usable.

The page reads the required callback fields before replacing browser history with the query-free pathname. It prepares or launches no handoff unless `state` and either `code` or `error` are present. Valid authorization-code and OAuth-error returns use the same exact custom-scheme boundary. Visible progress, incomplete, post-attempt, and fallback messages do not contain OAuth values.

The repair does not establish that automatic iOS custom-scheme navigation was the root cause; it adds observability and a direct user-gesture fallback at the localized boundary.

### Complete repair-pass manifest

Created:

- none.

Modified:

- `oauth-callback/index.html`;
- `test/phase3-callback.test.ts`;
- `dev/evidence/_ca-output.md`.

Deleted:

- none.

`oauth-callback/staticwebapp.config.json`, plugin OAuth/runtime source, synchronization source, version metadata, workflows, and release assets were not modified.

### Verification

- clean dependency install: PASS — 16 packages added, 17 audited, 0 vulnerabilities;
- `npm run typecheck`: PASS;
- focused hosted-callback executable tests: **5/5 PASS**;
- `npm test`: **294/296 PASS**, with only the two authorized pre-existing Windows drive-qualified assertions listed below;
- `npm run build`: PASS;
- `npm run verify:build`: PASS;
- `npm run check`: typecheck PASS, then the same qualified 294/296 Windows result; the chained command stopped before its redundant build step;
- `git diff --check`: PASS apart from informational LF-to-CRLF working-copy warnings.

The two qualified Windows-only failures were unchanged:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`;
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`.

Both remain the previously documented drive-prefix expectation difference (`D:\\vault\\...` actual versus `\\vault\\...` expected). No additional test failed.

Five build verifiers:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Build artifact:

- `main.js` size: `329013` bytes;
- SHA-256: `1225e9b1798d5238d7fd0e0a2241a40080b02b8c0e7d92970828ac1fa98726c6`;
- the bundle is byte-identical to the diagnostic source branch artifact, as expected because the repair changes only the hosted callback page and its tests.

During test development, the first focused TypeScript compile identified a nullable regular-expression capture in the test harness. The harness was corrected to fail explicitly when the inline script is absent; the final focused, typecheck, and full-suite results above include that correction.

### Security and preserved boundaries

- exact Google Drive scope remains `https://www.googleapis.com/auth/drive.file`;
- no token, authorization code, state, PKCE verifier/challenge, client secret, complete OAuth URL, callback value, or vault content is logged, persisted, rendered, or copied into evidence;
- callback query parameters are removed from browser history before validation or navigation;
- no telemetry, network request, local/session storage, token exchange, OAuth transaction, SecretStorage, plugin callback-lifecycle, mobile dependency, or synchronization behavior was added or changed;
- the callback deployment policy remains no-store, no-referrer, and CSP-restricted, and was inspected but not modified;
- no `master`, `phase6-integration`, or source-branch modification occurred;
- no Google Cloud or Azure configuration change occurred;
- no performance work or Stage 3 work occurred.

### Physical acceptance and limitation

Physical iPhone callback acceptance: NOT PERFORMED BY THIS AGENT

No physical OAuth attempt, iPhone pairing, or synchronization was performed. After independent review and deployment of this branch's callback page, one controlled iPhone authentication attempt must classify the result as: automatic handoff succeeded, manual `Open Obsidian` fallback succeeded, or neither path succeeded.

### Authorized production deployment follow-up

After the repair pass, the human supplied HS authorization to deploy the callback fix to the Azure Static Web App through GitHub. The production callback and test change from repair commit `4268efed443b099319dfe7f99d23e94add39765e` was applied alone to `phase6-integration`; none of the diagnostic branch's unrelated changes were included by that operation.

- production integration/deployment commit: `b8734bbbc571d40d23e1b9870a4b13b67136cd68`;
- Azure Static Web Apps workflow run: `33125226203`;
- Azure deployment job: `98701642078`;
- Azure workflow conclusion: **SUCCESS**;
- companion Phase 1 CI run: `33125229901` — **SUCCESS**;
- production endpoint: `https://witty-water-08743b310.7.azurestaticapps.net/`;
- parameter-free live HTTP check: `200`;
- live fallback label, automatic-attempt message, and neutral initial status: PRESENT;
- live `Cache-Control`: `no-store`;
- live `Referrer-Policy`: `no-referrer`;
- live CSP: `default-src 'none'; script-src 'unsafe-inline'; navigate-to obsidian:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`.

Before the production push, the isolated integration content was verified identical to the reviewed repair files. Typecheck passed; the focused callback suite passed 5/5; a clean full-suite compilation passed 272/274 with only the same two qualified Windows drive-prefix assertions; build and all five artifact verifiers passed; and `git diff --check` passed. The integration build remained `291948` bytes with SHA-256 `f290076abdd02e59e11f24c3cfdff5f47ad22917aac06c5a69ad7a7ff07a9106`.

The production deployment changed no release/tag, version metadata, `master`, Google Cloud configuration, Azure configuration, OAuth scope, token handling, synchronization behavior, performance work, or Stage 3 state. Physical iPhone callback acceptance remains not performed by this agent.


---

## Phase 6 OAuth Housekeeping — `agt-CA-P6-OAUTH-HOUSEKEEPING-01`

Date: `2026-08-27`

## Initial repository state

- initial `master`: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`
- initial `phase6-integration`: `b8734bbbc571d40d23e1b9870a4b13b67136cd68`
- initial `phase6-alpha-ios-diagnostic-logging`: `a0fc805b5d93b056d6699fc48633e11782bd0bde`
- initial `phase6-alpha-ios-callback-handoff-fix`: `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`
- housekeeping branch: `phase6-oauth-housekeeping`, created from `b8734bbbc571d40d23e1b9870a4b13b67136cd68`
- PR `#15`: open/draft/unmerged at initial inspection, `phase6-integration` -> `master`
- PR `#21`: open/unmerged at initial inspection, diagnostic branch -> `phase6-integration`

The validated callback repair was already present on `phase6-integration` through production integration/deployment commit `b8734bbbc571d40d23e1b9870a4b13b67136cd68`. Its callback HTML and callback regression test were verified byte-identical to the reviewed callback branch copies, so the production repair was not duplicated or redesigned.

## Housekeeping integration performed

PR `#21` was merged using a normal merge commit after the supplied physical iPhone acceptance satisfied its recorded physical-validation hold. Resulting `phase6-integration` merge commit: `315710a8458f5fc981de13065fbfffb3eb848f41`, with parents `b8734bbbc571d40d23e1b9870a4b13b67136cd68` and `a0fc805b5d93b056d6699fc48633e11782bd0bde`.

The callback-repair branch still carried unique append-only repair/deployment evidence even though its production HTML/test content was already integrated. That ancestry was preserved without rewriting by PR `#22` / merge commit `4a118d46aa3a3c4bd8901114ccbf2f163d513a9a`, with callback branch head `967f9bbfb7d3989bce1949230caf6e7b20a46d8b` as the additional parent. No OAuth production behavior was altered by that evidence-preservation merge.

The bounded diagnostic subsystem was retained. It remains device-local, structurally allow-listed, bounded-retention, and sanitizes/excludes authorization codes, OAuth state values, PKCE material, access/refresh tokens, client secrets, query-bearing authorization URLs, and vault content from diagnostic records.

The Phase 6 focused CI command was expanded to include the hosted callback regression file so the combined verification gate explicitly exercises callback + diagnostic + OAuth + export tests.

## Callback evidence wording clarification

An earlier repair entry stated categorically that OAuth values were not "rendered." That wording is clarified, not erased:

> OAuth code/state are not displayed as user-visible diagnostic text, logged, or persisted by the hosted callback page. They exist transiently only as required components of the constructed Obsidian callback URI.

The fallback anchor's `href` and the automatic navigation use the same transiently constructed callback target. This does not expose the values as visible diagnostic text.

## Supervisor-supplied physical iPhone OAuth acceptance

Platform: `mobile / iPhone / Obsidian`

Attempt: `attemptId: 7`

Authentication attempt began: `2026-08-27T23:17:34.749Z`

Observed sequence:

- authentication attempt started;
- PKCE/state transaction prepared;
- external browser authorization launched;
- plugin entered `result: "awaiting-callback"`;
- callback received at `2026-08-27T23:17:53.498Z` as `oauth.callback / callback-received`;
- `callbackRegistrationActive: true`;
- `runtimeInitialized: true`;
- `statePresent: true`;
- `codePresent: true`;
- `errorPresent: false`;
- `runtime-callback-exit` completed with `result: "completed"`;
- `callback-processing-complete` completed with `result: "completed"`;
- `authentication-attempt-completed` completed with `result: "authenticated"`.

**PHYSICAL IPHONE OAUTH ACCEPTANCE: PASS**

Demonstrated chain:

`Obsidian → Google OAuth → hosted Azure callback → Obsidian protocol callback → OAuth completion`

Evidence limitation: plugin diagnostics do not independently establish whether the successful return used the callback page's automatic `window.location.replace(...)` path or the manual `Open Obsidian to finish authentication` user-gesture fallback. No stronger causal claim is made.

Historical statements that physical iPhone acceptance had not yet been performed, callbacks had not yet arrived, or OAuth remained incomplete were correct for those earlier sessions and are retained as chronology. The supplied successful attempt above supersedes them for current OAuth acceptance status.

## Later mobile product-ready evidence

On the same mobile installation, later runtime initialization showed:

- `remoteRootPresent: true`;
- `vaultIdentityPresent: true`;
- OAuth boundary creation completed;
- mobile local-adapter creation completed;
- configuration-directory initialization completed;
- state-store initialization completed;
- audit-store initialization completed;
- scheduler startup completed;
- runtime reached `result: "product-ready"`.

The supplied runtime observation also states that plugin status showed a managed remote and completed first synchronization. No additional synchronization values, timestamps, counts, or content are inferred beyond the supplied evidence.

## Azure deployment mechanics

The inspected Azure Static Web Apps workflow deploys on pushes to `phase6-integration` and uses `./oauth-callback` as its application source. The repaired `oauth-callback/index.html` is present on that production-deploying branch.

Established production deployment evidence retained from the callback repair:

- production integration/deployment commit: `b8734bbbc571d40d23e1b9870a4b13b67136cd68`;
- Azure Static Web Apps run: `33125226203`;
- deployment job: `98701642078`;
- conclusion: `SUCCESS`;
- companion Phase 1 CI run: `33125229901` — `SUCCESS`.

That prior evidence also recorded a parameter-free live endpoint HTTP `200`, the repaired fallback label/automatic-attempt/neutral initial status, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and the restricted callback CSP.

The housekeeping PR's Azure preview runs are not used as production-deployment proof. Run `33129820326` failed specifically at the `Build And Deploy` step; the connector-visible job metadata does not expose a more specific failure message, so no unsupported cause is asserted. This does not negate the earlier successful production deployment of the unchanged callback page.

## Combined housekeeping verification

Exact verified housekeeping head: `8118707af62ec33890cf599912a880d56001e323`

Workflow: `Phase 6 Alpha Diagnostic Verification`

- run ID: `33129820333`
- job ID: `98716461301`
- conclusion: `SUCCESS`
- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npm test`: **296/296 PASS**, 0 fail, 0 cancelled, 0 skipped, 0 todo
- focused callback + diagnostic + OAuth + export suite: **38/38 PASS**, 0 fail, 0 cancelled, 0 skipped, 0 todo
- `npm run build`: PASS
- `npm run check`: PASS; repeated full suite **296/296 PASS** and all five build verifiers passed
- `git diff --check`: PASS
- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `main.js`: `329013` bytes
- SHA-256: `1225e9b1798d5238d7fd0e0a2241a40080b02b8c0e7d92970828ac1fa98726c6`
- workflow artifact ID: `9669805685`
- artifact digest: `sha256:f00d6e61bd1618b57246e937e679f9946af0a38f647f3d9d3bb4e4b3831d3954`

The previously observed two Windows drive-prefix test failures did **not** reproduce in this Ubuntu GitHub Actions environment; all 296 tests passed.

## Current boundary before master integration

- exact OAuth scope remains `https://www.googleapis.com/auth/drive.file`.
- no new plugin release was created.
- no OAuth redesign, token-exchange change, Drive pairing change, synchronization semantic change, or Stage 3 work was performed.
- `phase6-integration` is intentionally expected to remain after master integration because `dev/planning-and-building/project-state.yaml` still marks Phase 6 active and lists broader non-OAuth runtime/fault/resource validation plus the planned post-iPhone performance block.
- final master integration SHA and branch-retirement dispositions are to be appended after those operations complete.

---

## Phase 6 Alpha — iOS Adapter-Boundary Vault Access Refactor — `agt-CA-P6-IOS-ADAPTER-BOUNDARY-01`

Later explicit product authority supersedes PR #26's blanket mobile unavailable-guard architecture while retaining its correct finding that iOS does not expose Windows `lstat`/canonical-`realpath` proof. New locked decision `DEC-299` establishes the active Obsidian mobile `DataAdapter` namespace plus strict vault-relative validation and enumeration provenance as the approved iOS filesystem capability boundary; Windows retains its stronger physical guard.

Branch `phase6-alpha-ios-adapter-boundary-refactor` began exactly at `phase6-integration` SHA `523ba96cc6e975645cfd319fa7bb62b9c1399176`. Dynamically verified implementation/governance SHA: `410f252bf5fa35e4abfb12fc47df5db1e710066c`. Version metadata is consistently prepared at `0.1.4`; no tag or release was created.

Production mobile composition now explicitly installs `MobileVaultAccessBoundary`. Valid visible and non-excluded hidden paths reach only the active Obsidian adapter. All operation paths and temporary stage/backup paths are normalized and validated before I/O. Every adapter-listed child must be a valid normalized immediate descendant of its requested parent; malformed, duplicate/colliding, cyclic, escaping, or kind-mismatched entries are isolated without unsafe access, safe siblings continue, and completeness becomes truthful `partial`. Visible moves/trash retain FileManager semantics; hidden objects absent from the Vault tree use supported adapter rename/trash fallback. Desktop Node-backed external-reference protection is unchanged.

Official Obsidian API/documentation and the requested Remotely Save and Self-hosted LiveSync implementations were inspected as engineering evidence. The architecture does not claim physical iOS alias inspection and does not import Node/Electron on the mobile path.

Verification: `npm run typecheck` PASS; focused iOS adapter-boundary suite **8/8 PASS**; `npm test` **315/317 PASS** with only the two established Windows drive-prefix assertions; `npm run build` PASS; `npm run verify:build` PASS; all five package verifiers PASS; `git diff --check` PASS. `main.js`: `357076` bytes; SHA-256 `047dd456a6ed2894bbbf8bd921572d38695fbe85790ca9c7a15260900572e8d8`.

Detailed evidence and complete manifest: `dev/evidence/_ca-output-agt-CA-P6-IOS-ADAPTER-BOUNDARY-01.md`.

`Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`

PR #26 was not merged or released. No tag/release, `master`/integration modification, pairing, synchronization, performance work, Phase 6 closure, or Stage 3 work occurred.

---

## Phase 6 Alpha — iOS Canonical Content Reader Repair — `agt-CA-P6-IOS-CONTENT-READER-01`

Physical iPhone `0.1.4` testing established that the active mobile adapter boundary was working but non-empty ordinary and portable-configuration files failed canonical hashing because `ResourceFetchContentSource` required HTTP `206` while the iOS resource runtime returned a readable streamed HTTP `200`. The resulting unknown canonical evidence truthfully made LOCAL partial and produced `blocked-unsafe` planning.

On the existing PR #27 branch, starting evidence head `50ab9d4a5e112c33f0e9b070c2158c33e73a480d`, final verified implementation SHA `7fba7fbc568c4512e54740f549d44c434b7b2a79` retains exact validated `206` range reads and adds an incremental full-stream `200` path. The reader enforces observed `stat.size`, exact optional `Content-Length`, premature-EOF/excess-byte rejection, bounded yielded chunks, stale checks before/during/after reading, response cancellation on failure, and zero-byte no-fetch behavior. It does not call whole-file `readBinary()`. Desktop composition and all synchronization safety semantics remain unchanged. Version metadata is prepared consistently at `0.1.5`; no tag or release was created.

Verification: `npm run typecheck` PASS; focused iOS content-reader suite **6/6 PASS**; `npm test` **321/323 PASS** with only the two established Windows drive-prefix assertions; `npm run build` PASS; `npm run verify:build` PASS; all five package verifiers PASS; `git diff --check` PASS. The production regression follows `ObsidianLocalVaultAdapter → ScopedLocalVault → CanonicalEvidenceLocalVault`, proves canonical SHA-256 for non-empty ordinary and portable configuration content, proves `localCompleteness=complete`, and proves no HTTP-200-induced `blocked-unsafe` first-sync operations. `main.js`: `358620` bytes; SHA-256 `e467de6c96c76c1006897926a98f63e0dec0acc67354553560b00b4edf3cb478`.

Detailed evidence: `dev/evidence/_ca-output-agt-CA-P6-IOS-CONTENT-READER-01.md`.

`Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`

PR #27 and PR #26 remain open/unmerged. No `master`/integration modification, tag/release, Drive/OAuth change, synchronization redesign, performance work, Phase 6 closure, or Stage 3 work occurred.

---

## Phase 6 OAuth Housekeeping — final master integration and branch retirement

- agent: `agt-CA-P6-OAUTH-HOUSEKEEPING-01`
- pre-merge `phase6-integration`: `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea`
- master integration merge: `f02db659710e17383c17312553ec087d2d0b7d50`, normal merge commit through PR `#15`; no squash/rebase/force-push
- diagnostic head `a0fc805b5d93b056d6699fc48633e11782bd0bde`, callback branch head `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`, and housekeeping head `cd8497d61f75980cc3a949c70ff37e4cf993306a` were proven ancestors of master before retirement
- `phase6-alpha-ios-diagnostic-logging` @ `a0fc805b5d93b056d6699fc48633e11782bd0bde`: **DELETED — fully merged and obsolete**
- `phase6-alpha-ios-callback-handoff-fix` @ `967f9bbfb7d3989bce1949230caf6e7b20a46d8b`: **DELETED — fully merged and obsolete**
- `phase6-alpha-ios-oauth-diagnostic` @ `d799e0139c36b629769a917f2d328de6ab84f44d`: **DELETED — fully merged/ancestor-only after explicit rollback and obsolete**
- `phase6-oauth-housekeeping` @ `cd8497d61f75980cc3a949c70ff37e4cf993306a`: **DELETED — fully merged and obsolete**
- `phase6-integration` @ `3b2bdd550be4b9fb4dc3dcbecea1ad4ba9029dea`: **RETAINED** because broader Phase 6 work remains active and the production Azure callback workflow is branch-scoped to it
- open PRs before retirement: none
- `NEW GITHUB PLUGIN RELEASE: NOT CREATED`
- Stage 3 not begun
- remaining Phase 6 scope: broader non-OAuth runtime/fault/resource validation and planned post-iPhone performance work already recorded in project state; physical iPhone OAuth acceptance is closed as PASS

This finalization is evidence/branch housekeeping only and changes no production OAuth or synchronization behavior.

---

## Phase 6 Alpha — `0.1.5` integration and master promotion — `agt-CA-P6-IOS-015-INTEGRATE-01`

PR #26 was closed without merging as superseded by PR #27. PR #27 metadata was corrected to its approved final state and guarded-merged normally at exact evidence head `5e4b328ff31682060035ab199d95aa3712c1ee12` into `phase6-integration`; merge commit `91c0c12f06b397f25b5dad115b437c6db49bb8d3`.

Post-merge verification passed: typecheck; focused iOS canonical-content-reader **6/6**; full Windows **321/323** with only the two established drive-prefix assertions; build; all five package verifiers; diff check; consistent `0.1.5` version metadata. Artifact remained exactly `358620` bytes with SHA-256 `e467de6c96c76c1006897926a98f63e0dec0acc67354553560b00b4edf3cb478`.

Promotion PR [#28](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/28) was opened from `phase6-integration` to unchanged `master` at `4454d153980d0e80b1697c7d4a4e1dccc7cb8529`. Its sole initial conflict was the append-only cumulative evidence ledger. Both histories were preserved by evidence-only reconciliation commit `ca9436632da3039c580cfdc070ab8a1838697fbe`; the full local verification was repeated unchanged. PR #28 then became mergeable. `Phase 1 CI` run `33212472938` tested that SHA and passed **323/323**, with the same verifier and artifact identity.

PR #26/#27 close-preview runs `33211857228` and `33211929861` failed because the Azure deployment token was unavailable; integration deployment run `33212471617` passed but does not prove those previews were retired.

`AZURE STAGING HOUSEKEEPING: MANUAL AZURE-SIDE CLEANUP STILL REQUIRED`

No `0.1.5` tag or release was created. PR #28 is intentionally open/unmerged, and `master` is unchanged. Detailed evidence: `dev/evidence/_ca-output-agt-CA-P6-IOS-015-INTEGRATE-01.md`.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Phase 6 Alpha — Mixed-Plan Isolation and Sync-Attention Ledger — `agt-CA-P6-MIXED-PLAN-ISOLATION-01`

From exact released `master`/`0.1.5` SHA `34fa2e65d86878788434a6527e18d9f54ed64f3e`, branch `phase6-alpha-mixed-plan-isolation` implements locked `DEC-300` at verified implementation SHA `0efacd7ac4b579e98d2202dc2d325ad25b7f0f51`. A required plan-global execution gate now separates recovery/destructive authority from path-local attention. Mixed automatic and reviewed plans commit independently safe operations while blocked, conflicting, transiently unstable, and dependency-linked paths remain unmodified, uncommitted, and retryable. Global recovery/untrusted/stale/auth/managed-remote gates and exact checkpoint-backed suspicious-destruction approval remain fail-closed.

A bounded, deduplicated device-local attention ledger is stored through plugin-owned data rather than the vault adapter. The existing attention command/modal displays current paths and copies or shares an actual formula-safe `brain-sync-attention.csv`; resolved paths leave the current set. Partial status/notifications are distinct from global error/recovery, repeated unchanged attention is not re-notified, and all automatic triggers now have correlated run IDs with aggregate path-free diagnostics.

Verification: typecheck PASS; focused predictive suite **12/12 PASS**; Windows full suite **333/335 PASS** with only the two established drive-prefix assertions; build and all five package verifiers PASS; staged diff check PASS. GitHub/Linux verification run [33231490680](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33231490680) passed **335/335**, complete repository check, and reproduced the artifact. Prepared version `0.1.6`. `main.js`: `372981` bytes; SHA-256 `5903eb849f6ceca67caef17bcac2c6f87b7a9236ed9f6b2de960f54e4f2c1576`. The separate Azure preview run failed only on the known maximum-staging-environments capacity condition; no Azure change was made.

PR [#29](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/29) targets `phase6-integration` and remains open/unmerged. No tag/release, `master`/integration modification, OAuth/Azure change, performance work, Phase 6 closure, or Stage 3 work occurred. Detailed evidence: `dev/evidence/_ca-output-agt-CA-P6-MIXED-PLAN-ISOLATION-01.md`.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## PR #29 bounded rejection repair — `agt-CA-P6-MIXED-PLAN-ISOLATION-01`

From rejected head `479b701328385baf03a197c164d025508e70767f`, implementation repair commit `9f439bf3f0fbd44344168afdb361c82876158457` corrects all four reviewed defects without restarting the refactor: the shared plugin-data write queue recovers after an individual failure while preserving immutable per-call payloads; planned attention cannot emit a false completion notice and terminal attention reports committed safe progress truthfully; stale-device destructive operations are path-isolated while pre-existing global recovery/circuit-breaker authority remains fail-closed; and every current unresolved attention record is retained while only resolved history is bounded.

Regression verification: focused suite **16/16 PASS**; typecheck PASS; Windows full suite **337/339 PASS** with only the two unchanged established drive-prefix mismatches; build and all five package verifiers PASS; diff check PASS. Version remains `0.1.6`. `main.js`: `374188` bytes, SHA-256 `2d417f5c2a9e09669dd6b689a78c3067628dcf5a96d75eb3ffd6fed93428d7bb`. `manifest.json`: `283` bytes, SHA-256 `8f2ac175a1e6526c95436083d7fbf2df90311cd1ba5224ad689cc4709eebb4e5`.

GitHub/Linux **Phase 6 Alpha Diagnostic Verification** run [33233714856](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33233714856) passed **339/339** full tests, **38/38** existing focused workflow tests, the complete repository check, build, diff check, and all five package verifiers on repaired evidence head `da85659c71edd7fa4368cb6f17c923c061db0e63`; it reproduced the exact artifact. The separate Azure preview run failed only on the unchanged maximum-staging-environments capacity condition. PR #29 remains open/unmerged; no tag/release or protected-branch modification occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## PR #29 final pre-physical-test repair — `agt-CA-P6-MIXED-PLAN-ISOLATION-01`

From starting head `6d9d84c0b876e97d936cc207e7eafd6cc6530099`, implementation repair commit `700b3523d040379b3ab48c3e15c0a07214ee6858` completes three bounded supervisor corrections. One controller-owned drain now serializes every automatic plan-to-execute lifecycle and coalesces overlapping startup/resume, local-change, periodic, and requested-reconciliation opportunities without plan/run cross-contamination. Notification deduplication uses only a privacy-safe deterministic current-attention SHA-256 identity, so unchanged attention is quiet while changed paths/reasons notify. Fresh attention authoritatively supersedes obsolete reasons only for its own observed path; absent incremental paths remain untouched, successful reconciliation resolves the path, and bounded historical CSV evidence remains.

Verification: typecheck PASS; focused mixed-plan/attention/concurrency suite **18/18 PASS**; Windows full suite **339/341 PASS** with only the two unchanged established drive-prefix mismatches; build, diff check, and all five package verifiers PASS. Linux run [33236278937](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33236278937) passed **341/341**, complete repository verification, and reproduced `main.js` at `377230` bytes with SHA-256 `169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae`. Version remains `0.1.6`. The PR body was updated with these actual results. The separate Azure preview reproduced only the known maximum-staging-environments infrastructure failure.

PR #29 remains open/unmerged. No `master`, `phase6-integration`, tag, release, OAuth/Azure behavior, physical testing, Phase 6 completion, or Stage 3 modification occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Phase 6 Alpha — 0.1.6 integration and promotion preparation

After supervisor **APPROVE**, PR #29 was guarded at exact head `9aa425d088411ab0c95da1aa8c91275bbf4e67b2` and normally merged into `phase6-integration`. Merge commit and resulting source integration SHA: `acee2ad373b5a6c0938fa39393f286f05af1fad8`; pre-merge integration SHA: `229488ba4b7580644f70a29c4dd0ee3670447da2`. `master` remained `34fa2e65d86878788434a6527e18d9f54ed64f3e`.

Post-merge verification: consistent version `0.1.6`; typecheck PASS; focused mixed-plan/attention/concurrency **18/18 PASS**; Windows full suite **339/341 PASS** with only the two established drive-prefix mismatches; build, diff check, and all five package verifiers PASS. Final PR #29 Linux run [33236567999](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33236567999) passed **341/341** and reproduced `main.js` at `377230` bytes with SHA-256 `169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae`.

Promotion PR [#30](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/30) was opened from `phase6-integration` to `master` and left open/unmerged for supervisor review. This evidence pass changes only the detailed mixed-plan evidence, this cumulative ledger, and the Phase 6 integration manifest. No product/test/version code, tag, release, physical iPhone action, or Stage 3 work occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Phase 6 Alpha — approved 0.1.6 master promotion and prerelease preparation

After supervisor **APPROVE**, PR #30 was guarded at exact head `233573a2f0abc1a91855a8dcfcb3f091658f38c6` and normally merged into `master`. Merge commit and promoted source SHA: `251f9345488a56f1b4cfa71129b96e3f083fa916`.

Promoted verification: consistent version `0.1.6`; typecheck PASS; focused mixed-plan/attention/concurrency **18/18 PASS**; Windows full suite **339/341 qualified PASS** with only the two established drive-prefix mismatches; build, diff check, and all five package verifiers PASS. Master CI run [33238942414](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33238942414) passed **341/341** and reproduced `main.js` at `377230` bytes with SHA-256 `169f936b44ae1472ac33eb971372da790c5b4fc91c36ec779ab21e5e33a733ae`. The Windows release `manifest.json` is `284` bytes with SHA-256 `bda99947f74fbbbb072613c14056729fd09cca0eee6882e50ed5b33f7cc7b718`.

The authorized `0.1.6` GitHub prerelease will target the resulting evidence-only `master` commit and attach exactly `main.js` and `manifest.json`. This evidence pass changes only the detailed mixed-plan evidence, cumulative ledger, and integration manifest. No product/test/version code, OAuth/Azure configuration, physical testing, or Stage 3 work occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## Phase 6 Alpha — Sync Plan Error Artifact and Transient Local-Edit Repair — `agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-01`

From exact released `master` SHA `77336110893ff31e4029d962584ba25fc22ce7c8`, implementation commit `70ee18890603f478dfe19b9926d712b25376e84f` prepares version `0.1.7`. Bounded re-observation now treats an ordinary changed-during-hash race as transient while preserving exact observation-token and post-hash validation; exhaustion becomes path-local `local-file-not-stable`. Per-file canonical-content uncertainty no longer changes directory-enumeration completeness or contaminates unrelated/portable paths, while genuine listing failure remains fail-closed.

The rejected head introduced the persistent, mobile-safe `sync-plan-errors.csv`, but its relocation and staged replacement were only exception-safe within one process; they were not yet hard-termination/restart safe. The unsupported crash-safety implication in the original record is superseded by the bounded C1/C2 repair below.

Verification: typecheck PASS; focused mixed-plan/stability suite **26/26 PASS**; Windows full suite **347/349 qualified PASS** with only the same two established drive-prefix mismatches; build, diff check, and all five package verifiers PASS. GitHub/Linux run [33266594533](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33266594533) passed **349/349** and reproduced `main.js` at `395507` bytes with SHA-256 `1d0c5dd52a21cbca98584ca2a5c4ab65aef2fd1b055ab80776dd4e4bf9564496`. `manifest.json` is `283` bytes with SHA-256 `fd4cd2d3572b86ad2fea72e27c336f2ce8ee7d3c99979a1abbf220f4eaeb8279`.

PR [#31](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/31) targets `phase6-integration` and remains open/unmerged. Its separate Azure preview failed only on the known maximum-staging-environments capacity condition; no Azure change was made. No protected branch, tag/release, physical test, Phase 6 completion, or Stage 3 work occurred. Detailed evidence: `dev/evidence/_ca-output-agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-01.md`.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

---

## PR #31 crash-consistency rejection repair — `agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-01`

From rejected head `1516aef5ce93d3bb0ad95fd2dc831edbdc1f2a75`, implementation commit `ece64f993ed50de4c2bc3810639d942e597ef7e0` corrects both shared-owner persistence defects without changing the planner, executor, synchronization authority, OAuth, or unrelated configuration.

C1 now uses one plugin-data-backed relocation journal containing exact source and destination CSV paths. The journal and both visible exclusions are durable before destination work begins; runtime operational exclusions cover both canonical and deterministic stage/backup paths. Relocation is serialized with ledger writes, validates the destination before the active setting changes, preserves the source until that transition is durable, cleans the source next, and clears the journal/old protection last. Restart recovery handles all three transaction boundaries deterministically and preserves unrelated user exclusions.

C2 replaces random transaction names with deterministic `.brain-sync-stage` and `.brain-sync-backup` paths and recovers residue before initialization, load, or replacement. A valid canonical remains authoritative; a missing canonical restores a valid committed backup before discarding stage; a valid stage is promoted only when no backup exists; unrecoverable residue surfaces a sanitized persistence failure and is never replaced with blank history.

Verification: typecheck PASS; focused mixed-plan/plan-errors suite **35/35 PASS**; Windows full suite **356/358 qualified PASS** with only the same two established drive-prefix mismatches; build, diff check, and all five package verifiers PASS. GitHub/Linux run [33268697386](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33268697386) passed **358/358** and reproduced `main.js` at `404546` bytes with SHA-256 `c98eb80d9c6d7e90baa925ed8fd8e72e5ca771c0720813e9b8f2fb1e6e42ef01`. `manifest.json` remains `283` bytes with SHA-256 `fd4cd2d3572b86ad2fea72e27c336f2ce8ee7d3c99979a1abbf220f4eaeb8279`.

The repair modified `src/main.ts`, `src/product/plugin-data.ts`, `src/product/runtime.ts`, `src/product/sync-plan-errors-csv.ts`, `src/product/sync-plan-errors-path.ts`, `test/phase6-alpha-plan-errors-stability.test.ts`, and the two evidence files; it created/deleted no files. PR [#31](https://github.com/woodpk/gdrive-sync-obsidian-plugin/pull/31) remains open/unmerged. The separate Azure preview run [33268697361](https://github.com/woodpk/gdrive-sync-obsidian-plugin/actions/runs/33268697361) reproduced only the known maximum-staging-environments capacity failure. No protected branch, tag/release, physical test, or Stage 3 work occurred.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
