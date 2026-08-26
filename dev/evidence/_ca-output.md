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
