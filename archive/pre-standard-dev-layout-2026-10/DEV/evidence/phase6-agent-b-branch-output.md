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

## Phase 6 — agt-CA-P6-B-01 — State / Recovery / Crash Safety / Destructive Safety

### Assignment and baseline

- Phase 6 worker: `agt-CA-P6-B-01`.
- Owned production surface: `src/core/**`, `src/state/**`.
- Isolated branch: `phase6-b-state-recovery`.
- Required and verified `origin/master` baseline: `54e8eefbad8e920c8f9b7c0b01fe93c6d82e9ed1`.
- Earlier Phase 5 dynamically tested implementation/test SHA retained as historical context: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`.
- Final Phase 6 Agent-B implementation/test SHA before this evidence-only commit: `f4a864aa24bb2d781d5449c67905c7155d214c34`.
- The final pushed branch SHA necessarily changes when this evidence append itself is committed; the exact resulting branch SHA is reported in the Agent-B completion handoff so this commit does not falsely self-reference its own hash.
- Draft PR: `#11`, targeting `master`, created solely for CI/review and not merged.
- Stage 3 was **not** performed.

### Exact Agent-B change manifest before this evidence append

Created:

- `test/phase6-b-crash-state.test.ts`
- `test/phase6-b-destructive-safety.test.ts`

Modified production files:

- none.

This evidence append additionally modifies:

- `dev/evidence/_ca-output.md`

No file under the frozen/read-only surfaces (`src/contracts/**`, `src/local/**`, `src/drive/**`, `src/product/**`, `src/main.ts`, planning/specification/decision files, or `project-state.yaml`) was changed by Agent B.

### Authority and implementation inspection

Agent B re-read/inspected the current repository and the required Phase 6 authorities, including the current target-system requirements/evidence obligations, Stage-1 Phase 6 decomposition/handoff, decision register, Phase-1 frozen contracts, project state, retained Phase 2/5 evidence, current production core/state code, and relevant current tests.

The production semantic owners inspected included:

- `src/core/planner.ts` — safe-union initialization, trustworthy-base deletion authority, incomplete/unreadable blocking, conflict/move semantics, and destructive-policy application;
- `src/core/production-planner.ts` — current-stale-device destructive gate;
- `src/core/destructive-safety.ts` — count/percentage/abnormality/state-integrity circuit-breaker signals and exact-plan checkpoint approval;
- `src/core/execution-coordinator.ts` — precondition validation, pending journal, execution outcome classification, and verified-success commit sequencing;
- `src/core/commit-coordinator.ts` — pending/uncertain/completed journal transitions and authoritative state advancement only from durable integrity-verified receipts;
- `src/state/persistent-state-store.ts` — envelope/checksum integrity, explicit recovery classifications, CAS revision protection, backups, and migrations;
- `src/state/state-policy.ts` — tombstone retention, stale-device non-expiry, device identity, and device-removal semantics.

No production defect requiring an Agent-B-owned `src/core/**` or `src/state/**` repair was proven during this hardening pass. No cross-boundary `src/product/**` defect was proven.

`CROSS-BOUNDARY SUPERVISOR REPAIR REQUIRED`: **none**.

### §13.2 — Reconciliation semantic evidence mapping

The complete current suite was re-executed through production/domain owners. Relevant primary or reinforcing tests include:

- fresh local only → upload: current test 67;
- fresh remote only → download: current test 68;
- equal no-base collision → no-op/base establishment: test 69 and integrated test 156;
- divergent no-base collision → preserved conflict: test 70 and integrated test 157;
- unchanged/local-only/remote-only/concurrent trusted matrix: test 71 and integrated tests 159–160;
- timestamps/clock skew do not choose authority: test 72;
- concurrent text, clean merge, and true text conflict: tests 54–57 plus integrated tests 147–148;
- binary/opaque conflict preserves both versions: test 58 plus integrated test 149;
- attested deletion and both deletion directions: tests 73, 90, 144, 151;
- delete-vs-modify preserves modification: tests 59, 74, 152;
- both deleted/no-base absence remain non-destructive: tests 63 and 90;
- unreadable/unknown local observation and incomplete/failed remote evidence do not authorize deletion: tests 64–65, 75, 163;
- stale/offline device safety: tests 81–82, 88, 164;
- identity-preserving move and ambiguous rename/identity refusal: tests 77–80 and integrated test 150;
- first-sync safe-union flows: integrated tests 154–158;
- stale preconditions and active-run remote change defer/re-plan behavior: integrated tests 145–146;
- unknown/binary and path/scope semantics continue to be exercised by existing Phase 4/5 integration coverage in the same full suite.

These results support, among others, `PLAN-001`–`PLAN-008`, `FIRST-001`–`FIRST-005`, `CHANGE-001`–`CHANGE-007`, `CONFLICT-001`–`CONFLICT-007`, `MOVE-001`–`MOVE-005`, `DELETE-001`, `STATE-005`–`STATE-007`, and invariants `INV-001`–`INV-003`, `INV-005`–`INV-010`, `INV-016`–`INV-019`.

### §13.3 — State and crash-safety evidence mapping

Agent B added six controlled tests against production state/commit owners rather than recreating commit policy in test fakes:

1. `crash before content mutation leaves only durable pending evidence and never advances BASE`
   - `CrashSafeExecutionCoordinator` reaches durable pending journal state and then receives a simulated process termination before mutation;
   - BASE remains unchanged and journal remains `pending`.
2. `ambiguous transfer outcome is durably classified uncertain without advancing BASE`
   - production coordinator records `uncertain` and does not advance BASE.
3. `authoritative success commit rejects non-durable or non-verified receipts`
   - production `StateCommitCoordinator` refuses false-success authority and leaves pending evidence intact.
4. `crash/failure while persisting verified success cannot create false-success state`
   - controlled storage fault is injected into the authoritative success CAS after seed + pending persistence;
   - reload shows prior trusted BASE unchanged with `pending`, not completed, operation evidence.
5. `migration preserves a recoverable exact pre-migration checkpoint`
   - migration backup reloads as trusted schema v1 while migrated live state reloads as trusted schema v2.
6. `corrupt, truncated, incompatible, and missing expected state all fail into recovery`
   - malformed JSON, truncated JSON, missing expected state, and incompatible schema all produce explicit recovery-required outcomes.

Existing production tests also re-proved:

- internally inconsistent state with a valid envelope checksum still requires recovery (test 93);
- integrity failure/incompatible schema recovery (94);
- clone/restore suspicion (95);
- stale-revision/CAS protection (89, 96);
- change cursor/stale-device metadata durability (97);
- operation journal pending/uncertain lifecycle (101);
- verified success only after durable verified receipt (102);
- safe run serialization/cancellation/later reconcile (103, 166);
- invalid/lost Changes cursor routes to conservative safe reconciliation (120, 162);
- missing managed remote root blocks before planning/mutation (165);
- full-reconcile completeness/cursor authority remains gated by complete evidence (188–189).

This evidence directly supports `STATE-009`–`STATE-016`, `PLAN-005`, `PLAN-006`, `PLAN-009`, `CHANGE-005`, `CHANGE-007`, `XFER-001`, `XFER-004`, `XFER-005`, `FAIL-001`–`FAIL-003`, and especially `INV-001`–`INV-004`, `INV-016`, and `INV-019`.

### §13.5 — Destructive-safety evidence mapping

Agent B added seven focused boundary tests against the production safety owners:

1. one ordinary trusted deletion below every default threshold remains eligible;
2. absolute destructive-count boundary: 24 is below and 25 reaches the current default breaker threshold;
3. affected-percentage boundary: 19% is below and 20% reaches the current default threshold even below absolute-count limit;
4. reconstructed or untrusted state makes even one destructive operation approval/checkpoint-required;
5. approval remains scoped to the exact reviewed plan and requires a concrete recovery checkpoint;
6. production planner blocks any destructive plan from the current stale device;
7. tombstone expires only at/after the configured retention bound when all known devices are current and never expires while a known device is stale.

Existing full-suite evidence re-proved:

- first synchronization cannot authorize deletion without trustworthy prior state (73, 154–158);
- missing/corrupt/untrusted state cannot authorize deletion (76, 219);
- unreadable local and incomplete remote evidence cannot authorize deletion (64–65, 75, 163);
- ordinary legitimate deletion remains possible (83, 144);
- breaker independently detects count, percentage, abnormal divergence, and state-integrity/rebuild signals (86 plus new boundary tests 217–219);
- suspicious bulk destruction is stopped before mutation (153);
- reviewed destructive work requires exact checkpoint approval (87, 151, 220);
- stale/returning device cannot authorize destructive propagation (82, 88, 164, 221);
- tombstone retention remains bounded while refusing expiry during stale-device risk (84, 222);
- product contract/surface contains no global destructive force-sync action (existing contract test 12), and no new bypass was introduced.

The current default engineering parameters (`absoluteDestructiveLimit = 25`, `affectedFractionLimit = 0.20`, `abnormalMultiple = 3`, 90-day default tombstone retention) did not demonstrate an unsafe boundary outcome in the controlled Phase 6 tests, so Agent B made no speculative production parameter change.

This evidence supports `DELETE-001`–`DELETE-010`, `FIRST-005`, `STATE-005`–`STATE-007`, `STATE-011`–`STATE-013`, and invariants `INV-001`–`INV-003`, `INV-009`, `INV-015`, `INV-016`, and `INV-019`.

### Controlled crash/fault scenarios executed

Automated controlled fault injection executed against production state/commit owners for:

- simulated termination after durable pending journal but before content mutation;
- ambiguous transfer outcome after an operation has entered execution;
- attempted false success using a non-durable receipt;
- persistence failure during authoritative verified-success state commit;
- malformed and truncated durable state;
- incompatible durable-state schema;
- expected persisted state missing;
- migration with recoverable pre-migration backup/checkpoint.

Related existing suite coverage re-executed for stale CAS/revision, clone/restore detection, invalid change cursor, remote-root loss, cancellation, operation journal classification, and integrated stale-precondition/active-run reconciliation behavior.

### Defects and repairs

No production defect was proven.

One Phase 6 test-fixture defect was found by the first CI run:

- test fixture supplied a plain TypeScript `string` as `ContentHash` in `test/phase6-b-crash-state.test.ts`;
- strict typecheck correctly failed with `TS2322` (`string` is not assignable to branded `ContentHash`);
- repaired by deriving the fixture hash through the production canonical SHA-256 helper `sha256Text()`;
- no production/frozen contract was weakened or changed;
- subsequent full CI runs passed.

The destructive-safety test file was temporarily removed during failure isolation and then restored unchanged after the precise compiler failure was obtained. This isolation step did not constitute a validation pass and no result is claimed for it.

### Verification execution ledger

#### Intermediate CI — failure preserved

Implementation/test branch SHA:

`d6c6228143e7fa0bc1410afe99be5603172b6d40`

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32878420775`;
- job ID: `97901868742`.

Executed commands/results:

- `npm ci` — **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck` — **FAIL** — `test/phase6-b-crash-state.test.ts(41,18): TS2322: Type 'string' is not assignable to type 'ContentHash'`;
- `npm test` — **NOT EXECUTED / SKIPPED BY CI** because typecheck failed;
- `npm run build` — **NOT EXECUTED / SKIPPED BY CI** because typecheck failed.

Repair/rerun relationship: fixture hash was replaced with the branded canonical output of `sha256Text()`, destructive-safety coverage was restored after isolation, then complete CI was rerun.

#### Final implementation/test verification — successful run 1

Branch implementation/test SHA:

`f4a864aa24bb2d781d5449c67905c7155d214c34`

PR merge verification SHA checked out by GitHub Actions:

`8d6ee0d3f4dd8c868b539259ba74970761dd7c3b`

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32878781450`;
- job ID: `97903015979`.

Executed commands/results:

- `npm ci` — **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck` — **PASS**;
- `npm test` — **PASS** — 222 tests / 222 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build` — **PASS**.

#### Final implementation/test verification — successful run 2

Same branch implementation/test SHA:

`f4a864aa24bb2d781d5449c67905c7155d214c34`

Same PR merge verification SHA:

`8d6ee0d3f4dd8c868b539259ba74970761dd7c3b`

GitHub Actions:

- workflow: `Phase 1 CI`;
- run ID: `32878811611`;
- job ID: `97903111760`.

Executed commands/results:

- `npm ci` — **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck` — **PASS**;
- `npm test` — **PASS** — 222 tests / 222 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build` — **PASS**.

The repository has no `npm run check` script in `package.json`; therefore no nonexistent consolidated command is claimed. The required minimum clean-install/typecheck/test/build sequence was executed by current PR CI.

The interactive agent environment did not have a working local repository checkout/network path suitable for independently executing npm. Local execution is therefore not claimed; the GitHub Actions runs above are the observed clean-checkout verification evidence.

### Physical / live evidence not executed

Controlled deterministic fault injection proves the tested state/commit ordering but does not substitute for supported-runtime/physical evidence.

The following are explicitly **not** recorded as passes:

- real Windows Obsidian process interruption and resume — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- real iPhone/iOS Obsidian suspension/termination and resume — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- physical process crash exactly at filesystem/persistence durability boundaries — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- physical local-disk-full state/write behavior — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- live production Google Drive remote-root loss/change-feed interruption/network failure during transfer — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`;
- physical large-vault/large-file resource stress on supported runtimes — `NOT EXECUTED — REQUIRES SUPPORTED RUNTIME / PHYSICAL VALIDATION`.

The broader Phase 6 live Windows/iOS/OAuth/Drive validations remain outside what Agent B could physically execute in this environment and must not be inferred from the deterministic test harness.

### Cross-boundary findings

No hardening test proved a violation in frozen `src/product/**` orchestration requiring supervisor repair.

`CROSS-BOUNDARY SUPERVISOR REPAIR REQUIRED`: **none**.

### Agent-B completion status

`COMPLETE WITH NON-BLOCKING FINDINGS`

Agent B systematically revalidated the available §13.2, §13.3, and §13.5 evidence domain, added production-owner crash/state and destructive-safety boundary tests, found no production defect requiring an owned repair, preserved the failed intermediate CI record, obtained two complete green clean-checkout CI runs with 222/222 passing tests, pushed the isolated branch, and kept the draft PR unmerged. Remaining findings are only the explicitly unavailable supported-runtime/physical validations above. Stage 3 was not performed.