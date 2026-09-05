# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-07`

# H-U5-P5 — OLF-PHYSICAL PHASE 5 GROUP-D CONFLICT/DESTRUCTION FIXTURE MODERNIZATION

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-07`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the next bounded repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics.

You are **not** authorized to begin H-U5-P6.

You are **not** authorized to begin H-FINAL.

Your exact assignment is:

> Modernize the stale Phase 5 Group-D conflict/destruction integration-test fixture so its existing scenarios execute through the current hardened production authority/mutation seams, while preserving every existing behavioral assertion and production semantic.

This is one classified `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL` repair package.

The target file is:

`test/phase5-group-d-conflict-destruction-integration.test.ts`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The latest completed and supervisor-approved H-U5-P4 evidence-bearing branch head is:

`ab9c9c862143dbfe4cb8510c521f8e40ab733f06`

That SHA is the approved pre-task authority for H-U5-P5.

Because this tasking document itself will be committed after that approved head, the live branch head you receive may be one planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as:
   - `H_U5_P5_ENTRY_HEAD`
3. compare:
   - base: `ab9c9c862143dbfe4cb8510c521f8e40ab733f06`
   - head: `H_U5_P5_ENTRY_HEAD`
4. require that the post-approval delta consists only of this supervisor-created planning/tasking file:
   - `dev/planning-and-building/phase6-h-u5-p5-group-d-conflict-destruction-fixtures-task.md`
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

Retain all approved H-U5-P1, P2, P3, and P4 repairs already present on the branch.

Do not redo them.

Do not revert them.

### 2.3 Pull-request state

PR #45 must remain:

- OPEN
- DRAFT
- UNMERGED

Do not merge it.

---

## 3. WHY THIS PACKAGE EXISTS

Historical H-U4 verification classified the failures in this file as `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL`, not as permission to weaken production hardening.

The stale test harness predates the current explicit synchronization authority and transactional mutation boundaries. It constructs the older raw state/mutation arrangement and therefore no longer supplies all hardened production dependencies expected by the current controller/executor path.

The current target file shares a `makeController(...)` harness across seven conflict/destruction scenarios.

The known historical non-pass subset in this file was three failures, associated with the following existing scenarios:

- Scenario 10 — automatic-run local-vs-remote overlap conflict;
- Scenario 14 — local-vs-tray contender overlap;
- Scenarios 15/18 — tray-vs-tray deterministic exclusion.

The same file also contains existing scenarios for unknown delete/change overlap, audit behavior, and destructive-action suppression that must continue to pass unchanged.

The intended repair is therefore fixture modernization, not semantic redesign.

Already-approved modernized tests on this branch provide the implementation pattern. In particular, inspect and reuse the established current fixture wiring from the approved modernization work rather than inventing a new architecture.

Useful precedent includes:

- `test/phase5-controller.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-active-run-integration.test.ts`

Use those only as implementation precedent for binding old fixtures to current production interfaces. Do not copy unrelated scenario logic or assertions.

---

## 4. EXACT AUTHORIZED IMPLEMENTATION SCOPE

The only implementation/test file you are initially authorized to modify is:

`test/phase5-group-d-conflict-destruction-integration.test.ts`

Within that file, you may make only the minimum fixture/harness changes required to execute the existing scenarios through current hardened production interfaces.

### Allowed

You may:

1. add or adjust imports in the target test file;
2. use the already-approved current integrated synchronization state/authority adapter;
3. provide a minimal in-file `ReliableRemoteMutationPort` implementation suitable for the existing fake Drive behavior;
4. provide a minimal in-file `LocalTransactionalMutationPort` implementation suitable for the existing fake local-vault behavior;
5. wire explicit state/authority dependencies into the current production controller/executor path;
6. add only the minimal harness bookkeeping required to preserve the test's existing asserted physical effects and observable behavior;
7. make type-only or test-harness-only adjustments in that same file that are directly necessary because the production interfaces have hardened since the Phase 5 fixture was written.

### Not allowed

You may **not**:

- modify any `src/**` file;
- modify any `src/contracts/**` file;
- modify any other test file;
- introduce a production fallback for old fixtures;
- weaken hardened authority checks;
- weaken crash-safety or transactional mutation requirements;
- weaken, delete, skip, rename, or replace any existing scenario or behavioral assertion;
- change conflict winner/loser semantics;
- change overlap/exclusion semantics;
- change destructive-action suppression semantics;
- change audit semantics;
- change automatic-run or scheduler semantics;
- change cursor, BASE, scope, recovery, or durability semantics;
- change production behavior merely to make a legacy fixture pass.

If corrected fixture wiring exposes what appears to be a genuine production defect, do **not** repair production on your own.

Stop and report the causal path with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

The supervisor will decide whether a bounded production exception is warranted.

---

## 5. REQUIRED SEMANTIC PRESERVATION

All seven existing tests in the target file must retain their original behavioral meaning.

At minimum, preserve the existing assertions governing:

- deterministic conflict arbitration;
- local-vs-remote overlap handling;
- local-vs-tray overlap handling;
- tray-vs-tray deterministic exclusion;
- unknown remote deletion combined with local change;
- local deletion combined with unknown remote change;
- losing-overlap action audit behavior;
- suppression of losing destructive actions;
- exact physical side effects already asserted by the tests.

Do not replace strong observable assertions with generic status-only assertions.

Do not convert failures into skips or cancellations.

Do not change expected outcomes merely because current production fails closed when the old fixture omits required authority.

The fixture must be brought forward to the production contract, not the reverse.

---

## 6. CANDIDATE CONSTRUCTION

After the bounded fixture modernization is complete, commit it on:

`phase6-sync-integration-h`

Record the resulting implementation candidate SHA as:

`H_U5_P5_CANDIDATE_SHA`

Before running authoritative verification, compare:

- base: `H_U5_P5_ENTRY_HEAD`
- head: `H_U5_P5_CANDIDATE_SHA`

The implementation/test delta must contain exactly one file:

`test/phase5-group-d-conflict-destruction-integration.test.ts`

The supervisor-created tasking file belongs to the approved-head-to-entry planning delta and is not part of the implementation delta.

If the candidate changes any other implementation/test file, stop:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

## 7. EXECUTION ENVIRONMENT / PROOF PROCEDURE

Do not spend execution windows attempting to reconstruct or repeatedly debug an ad hoc local repository environment.

Use a disposable GitHub Actions proof branch for authoritative execution.

Disposable proof branch:

`h-u5-p5-group-d-conflict-destruction-proof-h07`

Disposable proof workflow:

`.github/workflows/h-u5-p5-group-d-conflict-destruction-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P5_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout` with `persist-credentials: false`;
- no source/test patching inside the workflow;
- no contract patching;
- no secret output;
- no merge of the disposable proof branch;
- no mutation of PR #45 state;
- preserve deterministic logs/artifacts.

The proof workflow may report expected known test failures, but it must preserve and expose the real exit status of the fresh whole-repository test command. Do not mask failures with a fake successful test exit.

---

## 8. REQUIRED VERIFICATION GATES

### Gate A — exact-candidate and frozen-authority preflight

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P5_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. restored contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. worktree is clean before verification;
7. `H_U5_P5_ENTRY_HEAD` → `H_U5_P5_CANDIDATE_SHA` changes exactly:
   - `test/phase5-group-d-conflict-destruction-integration.test.ts`

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

Run from the exact candidate:

- `npm ci`
- repository typecheck
- repository test compilation

All must pass.

### Gate C — focused Group-D conflict/destruction verification

Run the compiled equivalent of:

`test/phase5-group-d-conflict-destruction-integration.test.ts`

Expected result after correct fixture modernization:

- 7 tests total
- 7 pass
- 0 fail
- 0 cancelled
- 0 skipped/todo

If any of the seven existing tests remains non-pass, diagnose the exact causal boundary.

Do not weaken the test to obtain 7/7.

If a genuine production defect is exposed, stop for supervisor decision.

### Gate D — V1.3 foundation and H critical regression surface

Run the established V1.3 foundation and H synchronization critical gate used by the immediately preceding H-U5 packages.

Required foundation result:

- 17/17 PASS
- C15 PASS
- C16 PASS

Required H/V1.3 critical result, assuming this bounded fixture-only correction does not affect G:

- 82 total
- 69 pass
- 13 fail

The 13 failures must be only the same previously classified G-owned failures.

H-I1 through H-I8 must remain PASS.

Any new H/V1.3 critical regression is a blocker.

### Gate E — fresh whole-repository test run

Run the repository's full test command directly from the exact candidate and record its **real** exit status and exact totals.

The latest supervisor-approved H-U5-P4 whole-suite baseline is:

- total: 687
- pass: 633
- fail: 30
- cancelled: 24
- skipped/todo: 0

Because this file historically contributes exactly three `OLF-PHYSICAL` failures, the expected H-U5-P5 result **if and only if those three failures are the sole changed outcomes** is:

- total: 687
- pass: 636
- fail: 27
- cancelled: 24
- skipped/todo: 0

Treat that as a predictive classification check, not as permission to force the numbers.

Record the actual totals and real exit status.

If the actual delta differs, classify every changed outcome before proceeding.

No new non-G failure may be hidden or silently accepted.

### Gate F — build

Run the repository build gate.

It must pass.

### Gate G — final invariants

After verification, prove again:

- exact candidate SHA;
- frozen contracts tree unchanged;
- canonical evidence unchanged;
- restored contract-freeze document unchanged;
- required contract-freeze predecessor prefix unchanged;
- source/test worktree clean;
- implementation/test candidate delta remains exactly the one authorized target file;
- PR #45 remains OPEN / DRAFT / UNMERGED.

Preserve the proof artifact/logs needed to make the result independently reviewable.

---

## 9. EVIDENCE

Only after the candidate has passed the required bounded verification may you create/update your H-U5-P5 evidence file:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-07.md`

Record at minimum:

- agent identity;
- `H_U5_P5_ENTRY_HEAD`;
- supervisor-approved pre-task head `ab9c9c862143dbfe4cb8510c521f8e40ab733f06`;
- `H_U5_P5_CANDIDATE_SHA`;
- final H-U5-P5 evidence-bearing branch head;
- exact candidate diff manifest;
- exact target-file change summary;
- proof branch name;
- proof workflow path;
- workflow run ID and job ID;
- artifact identity/digest if produced;
- frozen-authority invariant results;
- focused 7/7 result;
- V1.3 foundation result;
- H/V1.3 critical result and classification of the 13 known G-owned failures;
- H-I1 through H-I8 status;
- fresh whole-suite actual totals and real exit status;
- build result;
- PR #45 state;
- explicit statement that no production file, contract, or additional test file was modified.

Do not alter:

- canonical `dev/evidence/_ca-output.md`;
- any H-01 through H-06 evidence file.

After evidence closure, the candidate-to-evidence delta should contain only your H-07 evidence file.

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
- the focused file does not reach 7/7 without semantic changes;
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
- begin OLF-FAKE-AUTH modernization;
- repair G-owned failures;
- perform production-structure or naming normalization;
- rename `src/product/phase6-sync-integration.ts` or other phase-named production artifacts;
- begin H-U5-P6;
- begin H-FINAL;
- merge PR #45;
- perform physical iPhone synchronization;
- change release/version state.

---

## 12. REQUIRED TERMINAL RESPONSE

If this bounded package completes and evidence is committed, stop with exactly:

`H-U5-P5 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P6 OR H-FINAL`

If blocked, stop with exactly:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not continue into the next repair package.