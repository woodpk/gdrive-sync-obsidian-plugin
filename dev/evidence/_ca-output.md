# Cumulative Coding-Agent Evidence — Phases 1–5

This file is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Earlier phase evidence is retained rather than declared superseded. Detailed phase records remain authoritative historical evidence at their preserved paths/commits; this ledger records their identity and carries the evidence chain forward into Phase 5.

Phase 6 and Stage 3 have **not** begun.

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
