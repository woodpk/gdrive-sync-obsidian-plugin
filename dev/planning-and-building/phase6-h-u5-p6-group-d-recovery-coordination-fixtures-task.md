# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-08`

# H-U5-P6 — OLF-PHYSICAL PHASE 5 GROUP-D RECOVERY / COORDINATION FIXTURE MODERNIZATION

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-08`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the next bounded repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics.

You are **not** authorized to begin H-U5-P7.

You are **not** authorized to begin production-structure normalization.

You are **not** authorized to begin H-FINAL.

Your exact assignment is:

> Modernize the stale Phase 5 Group-D recovery/coordination integration-test fixture so its existing cancellation, pause, same-runtime serialization, and cross-controller Web Locks scenarios execute through the current hardened synchronization authority/mutation seams, while preserving every existing behavioral assertion and production semantic.

This is one classified `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL` repair package.

The target file is:

`test/phase5-group-d-recovery-coordination-integration.test.ts`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The latest completed and supervisor-approved H-U5-P5 evidence-bearing branch head is:

`4c2335dd2a754bbe04a8f68d2c71abc4f9977b00`

That SHA is the approved pre-task authority for H-U5-P6.

Because this tasking document itself is committed after that approved head, the live branch head you receive should be one planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as:
   - `H_U5_P6_ENTRY_HEAD`
3. compare:
   - base: `4c2335dd2a754bbe04a8f68d2c71abc4f9977b00`
   - head: `H_U5_P6_ENTRY_HEAD`
4. require that the post-approval delta consists only of this supervisor-created planning/tasking file:
   - `dev/planning-and-building/phase6-h-u5-p6-group-d-recovery-coordination-fixtures-task.md`
5. if any unapproved `src/**` or `test/**` change exists in that delta, stop immediately with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not silently adopt any other branch-tip change as authority.

---

## 2. FROZEN / RETAINED AUTHORITIES

Preserve all previously approved H/V1.3 work.

### 2.1 Frozen V1.3 foundation

Approved V1.3 foundation source commit:

`05600f7ca48a6726b72188005f29eddfc1191519`

Frozen `src/contracts/**` tree:

`0db68ced179825f929008b502335210260ca2ce3`

Canonical evidence blob:

`d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`

Restored contract-freeze whole-file blob:

`b675e0fc9776d03892a4309231b91a4bf0a84b93`

Required predecessor-prefix SHA-1 for the contract-freeze document:

`fe527c76137b2cd578ef7050ee3444498b21a5e0`

### 2.2 Retained H implementation authority

Retained V1.3 A/B/D H integration implementation:

`4fef16f498dafba15fc1da5a63124567c5f56bcc`

Retain all approved H-U5-P1 through H-U5-P5 repairs already present on the branch.

In particular, do not redo or disturb the approved H-owned production correction from H-U5-P3.

Do not revert any approved prior fixture modernization.

### 2.3 Pull-request state

PR #45 must remain:

- OPEN
- DRAFT
- UNMERGED

Do not merge it.

---

## 3. WHY THIS PACKAGE EXISTS

Historical H-U4 verification classified the stale failures in this family as `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL`, not as permission to weaken production hardening.

The current file contains eight existing Group-D recovery/coordination scenarios. Four already pass under the current branch and must continue to pass:

1. Scenario 20 — absence of `ReliableRemoteChangePort` falls back to safe full reconciliation and commits a fresh cursor;
2. Scenarios 21/22 — incomplete REMOTE or LOCAL observation cannot become deletion authority;
3. Scenario 23 — stale current device cannot authorize destructive propagation;
4. Scenario 40 — missing expected managed root blocks before planning or mutation.

The current fresh H-U5-P5 whole-repository proof shows the final four tests in this same file are still non-pass as `cancelledByParent`:

5. Scenario 27 — cancellation stops future operations and leaves cursor unadvanced;
6. Scenario 28 — pause blocks synchronization until resume;
7. Scenario 29 — same-runtime synchronization runs serialize rather than overlap;
8. Scenario 30 — two real controller runs use separate production Web Locks leases over one shared lock boundary.

These cancellations are consistent with the legacy coordination harness not reaching the physical mutation stage expected by those tests after production authority/mutation hardening. The tests wait on mutation-start coordination that the stale harness can no longer satisfy.

The intended correction is therefore to bring the fixture forward to current production interfaces so those coordination assertions execute against the real hardened path. It is **not** to bypass, weaken, or replace the current authority model.

Already-approved modernized tests on this branch provide the implementation pattern. Inspect and reuse the established fixture-wiring approach rather than inventing a new architecture. Useful precedent includes:

- `test/phase5-controller.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`

Use those only as precedent for binding old fixtures to current production interfaces. Do not copy unrelated scenario logic or assertions.

---

## 4. EXACT AUTHORIZED IMPLEMENTATION SCOPE

The only implementation/test file you are initially authorized to modify is:

`test/phase5-group-d-recovery-coordination-integration.test.ts`

Within that file, make only the minimum fixture/harness changes required to execute the eight existing scenarios through current hardened production interfaces.

### Allowed

You may:

1. add or adjust imports in the target test file;
2. use the already-approved current integrated synchronization state/authority adapter;
3. provide a minimal in-file `ReliableRemoteMutationPort` implementation suitable for the existing fake Drive behavior;
4. provide a minimal in-file `LocalTransactionalMutationPort` implementation if directly required by the current executor path exercised by these scenarios;
5. wire explicit writable state/authority dependencies into the current production controller/executor path;
6. add only the minimal fake-REMOTE bookkeeping needed to represent the immutable object/candidate facts required by current reliable mutation verification;
7. add only the minimal harness bookkeeping required so the existing cancellation/serialization coordination points observe the real physical mutation boundary;
8. make type-only or test-harness-only adjustments in this same file directly required by current hardened interfaces.

### Important preservation constraints inside this file

The existing Scenario 20 meaning is special and must remain intact:

- it intentionally verifies behavior **without** a `ReliableRemoteChangePort`;
- do not globally add a change-feed port in a way that defeats that fallback test;
- its expected safe full-reconciliation behavior and fresh cursor commit must remain observable.

The existing Scenario 30 meaning is also special:

- preserve two distinct real controller instances;
- preserve their separate `WebLocksRunLeasePort` instances;
- preserve the one shared fake lock-manager boundary;
- do not collapse the test into one controller or replace the production lease behavior with a direct test-only mutex.

### Not allowed

You may **not**:

- modify any `src/**` file;
- modify any `src/contracts/**` file;
- modify any other test file;
- introduce a production fallback for old fixtures;
- weaken hardened authority checks;
- weaken reliable REMOTE mutation verification;
- weaken crash-safety or transactional mutation requirements;
- weaken, delete, skip, rename, or replace any existing test or behavioral assertion;
- change cancellation semantics;
- change pause/resume semantics;
- change same-runtime serialization semantics;
- change Web Locks lease semantics;
- change scheduler semantics;
- change cursor, BASE, scope, recovery, deletion-authority, or durability semantics;
- change production behavior merely to make a legacy fixture pass.

If corrected fixture wiring exposes what appears to be a genuine production defect, do **not** repair production on your own.

Stop and report the causal path with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

The supervisor will decide whether any bounded production exception is warranted.

---

## 5. REQUIRED SEMANTIC PRESERVATION

All eight existing tests in the target file must retain their original behavioral meaning.

At minimum, preserve these exact semantic boundaries:

### Scenarios 20 / 21 / 22 / 23 / 40

- no `ReliableRemoteChangePort` means safe full reconciliation, not guessed incremental authority;
- incomplete LOCAL or REMOTE observation cannot authorize deletion;
- stale current-device state cannot authorize destructive propagation;
- missing managed-root authority blocks before planning or mutation;
- these currently passing scenarios must remain passing.

### Scenario 27 — cancellation

- the first authorized physical operation may begin;
- cancellation during that active operation prevents future queued operations from starting;
- the test must continue to observe exactly the asserted first-operation-only mutation call set;
- authoritative cursor advancement must not occur for the cancelled run.

Do not convert cancellation into pre-run suppression; the scenario is specifically about cancellation of an active synchronization run.

### Scenario 28 — pause / resume

- pause prevents synchronization from executing physical work;
- the surfaced product state remains paused;
- resume restores eligibility;
- the subsequent run performs the existing asserted physical work exactly once.

### Scenario 29 — same-runtime serialization

- overlapping synchronization requests against one controller/runtime must not physically overlap;
- the test's maximum-concurrency assertion must remain authoritative;
- do not satisfy the test by deleting one requested run, bypassing execution, or weakening the asserted maximum concurrency.

### Scenario 30 — production Web Locks coordination

- two distinct controller instances share one lock namespace through real `WebLocksRunLeasePort` composition;
- while controller A holds the lock, controller B must not perform physical mutation;
- after A releases, B may run;
- the shared lock must be released after each run;
- do not replace this with direct test-only serialization unrelated to production lease behavior.

Do not replace strong observable assertions with generic status-only assertions.

Do not convert failures/cancellations into skips.

The fixture must be brought forward to the production contract, not the reverse.

---

## 6. CANDIDATE CONSTRUCTION

After the bounded fixture modernization is complete, commit it on:

`phase6-sync-integration-h`

Record the resulting implementation candidate SHA as:

`H_U5_P6_CANDIDATE_SHA`

Before authoritative verification, compare:

- base: `H_U5_P6_ENTRY_HEAD`
- head: `H_U5_P6_CANDIDATE_SHA`

The implementation/test delta must contain exactly one file:

`test/phase5-group-d-recovery-coordination-integration.test.ts`

The supervisor-created tasking file belongs only to the approved-head-to-entry planning delta and is not part of the implementation delta.

If the candidate changes any other implementation/test file, stop:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

## 7. EXECUTION ENVIRONMENT / PROOF PROCEDURE

Do not spend execution windows reconstructing or repeatedly debugging an ad hoc local repository environment.

Use a disposable GitHub Actions proof branch for authoritative execution.

Disposable proof branch:

`h-u5-p6-group-d-recovery-coordination-proof-h08`

Disposable proof workflow:

`.github/workflows/h-u5-p6-group-d-recovery-coordination-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P6_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and full history sufficient for exact diff checks;
- no source/test patching inside the workflow;
- no contract patching;
- no secret output;
- no merge of the disposable proof branch;
- no mutation of PR #45 state;
- preserve deterministic logs/artifacts.

The proof workflow may continue past expected known repository failures only so later proof gates can run, but it must record and expose the **real exit status** of every test command. Do not mask failures by reporting a fabricated successful test exit.

---

## 8. REQUIRED VERIFICATION GATES

### Gate A — exact-candidate and frozen-authority preflight

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P6_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. restored contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. worktree is clean before verification;
7. `H_U5_P6_ENTRY_HEAD` → `H_U5_P6_CANDIDATE_SHA` changes exactly:
   - `test/phase5-group-d-recovery-coordination-integration.test.ts`

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

Run from the exact candidate:

- `npm ci`
- repository typecheck
- repository test compilation
- `git diff --check H_U5_P6_ENTRY_HEAD...H_U5_P6_CANDIDATE_SHA`

All must pass.

### Gate C — focused Group-D recovery/coordination verification

Run the compiled equivalent of:

`test/phase5-group-d-recovery-coordination-integration.test.ts`

Expected result after correct fixture modernization:

- 8 tests total
- 8 pass
- 0 fail
- 0 cancelled
- 0 skipped/todo
- exit code `0`

All four currently passing scenarios must remain passing, and scenarios 27-30 must execute to completion rather than be cancelled by their stale harness.

If any existing test remains non-pass, diagnose the exact causal boundary.

Do not weaken the test to obtain 8/8.

If a genuine production defect is exposed, stop for supervisor decision.

### Gate D — V1.3 foundation

Run the established V1.3 foundation proof.

Required result:

- 17 tests total
- 17 pass
- 0 fail
- 0 cancelled
- C15 PASS
- C16 PASS
- exit code `0`

### Gate E — H/V1.3 critical regression surface

Run the established combined foundation + H synchronization critical gate used by the preceding H-U5 packages.

Required result, assuming this bounded fixture-only correction does not affect G:

- 82 total
- 69 pass
- 13 fail
- 0 cancelled
- 0 skipped/todo
- real exit code `1`

The 13 failures must be only the same previously classified G-owned adversarial-model failures:

1. `03 upload survives crash/restart at every durable effect stage`
2. `04 download survives crash/restart at every durable effect stage`
3. `05 move survives crash/restart at every durable effect stage`
4. `06 trash survives crash/restart at every durable effect stage`
5. `10 durable intended L1 is not substituted by later L2`
6. `15 repeated moves preserve stable remote identity`
7. `16 create-delete sequence preserves acknowledged deletion history`
8. `18 unresolved path A does not block safe path B progress`
9. `19 missed watcher is discovered by integrity reconciliation`
10. `20 Windows watcher-event loss is recoverable through authoritative integrity read`
11. `28 bounded quiescence after mutation pressure stops`
12. `29 concurrent same-path creates never silently select one remote winner`
13. `G-C2 generic recover routes multiple folder journals by exact journal identity`

H-I1 through H-I8 must remain PASS.

Any new H/V1.3 critical regression is a blocker.

### Gate F — fresh whole-repository test run

Run the repository's full test command directly from the exact candidate and record its **real** exit status and exact totals.

The latest supervisor-approved H-U5-P5 whole-suite baseline is:

- total: 687
- pass: 636
- fail: 27
- cancelled: 24
- skipped/todo: 0

The current fresh P5 proof shows scenarios 27-30 in this target file account for exactly four `cancelledByParent` outcomes.

Therefore the predicted H-U5-P6 result, **if and only if those four cancellations are the sole changed outcomes**, is:

- total: 687
- pass: 640
- fail: 27
- cancelled: 20
- skipped/todo: 0

Treat that as a predictive classification check, not as permission to force the numbers.

Record the actual totals and the real `npm test` exit status.

If the aggregate delta differs from exactly four cancellations becoming passes, classify every changed outcome before proceeding.

No new non-G failure or cancellation may be hidden or silently accepted.

### Gate G — build

Run the repository build gate.

It must pass.

Because this package is test-fixture-only, the production build artifact is expected to remain semantically unchanged; record the actual build verifier output, artifact size, and SHA-256 rather than assuming them.

### Gate H — final invariants

After verification, prove again:

- exact candidate SHA;
- frozen contracts tree unchanged;
- canonical evidence unchanged;
- restored contract-freeze document unchanged;
- required contract-freeze predecessor prefix unchanged;
- tracked source/test worktree clean;
- implementation/test candidate delta remains exactly the one authorized target file;
- PR #45 remains OPEN / DRAFT / UNMERGED.

Preserve the proof artifact/logs needed to make the result independently reviewable.

---

## 9. EVIDENCE

Only after the candidate has completed the required bounded verification may you create/update your H-U5-P6 evidence file:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-08.md`

Record at minimum:

- agent identity;
- supervisor-approved pre-task head `4c2335dd2a754bbe04a8f68d2c71abc4f9977b00`;
- `H_U5_P6_ENTRY_HEAD`;
- `H_U5_P6_CANDIDATE_SHA`;
- final H-U5-P6 evidence-bearing branch head;
- exact candidate diff manifest;
- exact target-file modernization summary;
- explicit preservation of Scenarios 20, 21/22, 23, and 40;
- exact disposition of Scenarios 27, 28, 29, and 30;
- proof branch name;
- proof workflow path;
- workflow run ID and job ID;
- artifact identity/digest if produced;
- frozen-authority invariant results;
- focused 8/8 result;
- V1.3 foundation 17/17 result, including C15/C16;
- H/V1.3 critical result and classification of the 13 known G-owned failures;
- H-I1 through H-I8 status;
- fresh whole-suite actual totals and real exit status;
- exact comparison against the P5 baseline `687 / 636 / 27 / 24`;
- build result;
- PR #45 state;
- explicit statement that no production file, contract, or additional test file was modified.

Do not alter:

- canonical `dev/evidence/_ca-output.md`;
- any H-01 through H-07 evidence file.

After evidence closure, the candidate-to-evidence delta should contain only your H-08 evidence file.

---

## 10. HARD-STOP CONDITIONS

Stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

if any of the following occurs:

- live entry contains an unapproved source/test delta;
- another test file appears necessary;
- any production file appears necessary;
- a frozen contract appears necessary to change;
- an existing assertion would need weakening;
- corrected fixture wiring exposes a genuine production defect;
- Scenario 20 can pass only by adding a change-feed authority that destroys its intended fallback semantics;
- Scenario 27 can pass only by avoiding an actually active mutation rather than testing cancellation of active work;
- Scenario 29 can pass only by dropping/ignoring one requested run instead of preserving serialization semantics;
- Scenario 30 can pass only by replacing production Web Locks behavior with an unrelated test-only lock;
- the focused file does not reach 8/8 without semantic changes;
- V1.3 foundation regresses;
- H/V1.3 critical surface gains any new non-G failure;
- H-I1 through H-I8 regress;
- frozen evidence/contract invariants mismatch;
- PR #45 state is not preserved.

Do not self-authorize a broader repair.

---

## 11. EXPLICITLY OUT OF SCOPE

Do not:

- begin another OLF-PHYSICAL family;
- begin the OLF-FAKE-AUTH legacy family;
- repair any G-owned adversarial-model failure;
- modify `src/product/phase6-sync-integration.ts` or any other production file;
- modify production phase/workstream/integration naming;
- adopt or execute the separate supervisor production-structure-normalization plan;
- modify frozen contracts;
- rewrite historical evidence;
- merge PR #45;
- begin H-U5-P7;
- begin H-FINAL / H-U6 closure;
- run a physical iPhone synchronization.

Remaining classified work after this package is still supervisor-owned and must be separately tasked.

---

## 12. STOP / RETURN PACKAGE

When H-U5-P6 is complete, stop and return a compact supervisor-review package containing:

1. `H_U5_P6_ENTRY_HEAD`
2. `H_U5_P6_CANDIDATE_SHA`
3. final H-U5-P6 evidence-bearing branch head
4. exact changed-file manifest
5. concise fixture-modernization summary
6. focused 8/8 result
7. V1.3 foundation result
8. H/V1.3 critical result and 13-failure G classification
9. H-I1 through H-I8 status
10. whole-repository exact totals and real exit status
11. build result
12. proof run/job/artifact identifiers
13. frozen-authority invariant results
14. PR #45 state
15. any blocker or unexpected classification delta

End exactly with:

`H-U5-P6 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P7 OR H-FINAL`
