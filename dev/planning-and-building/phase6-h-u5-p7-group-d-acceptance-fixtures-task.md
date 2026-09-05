# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-09`

# H-U5-P7 — OLF-PHYSICAL PHASE 5 GROUP-D ACCEPTANCE FIXTURE MODERNIZATION

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-09`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the next bounded repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics.

You are **not** authorized to begin H-U5-P8.

You are **not** authorized to begin production-structure normalization.

You are **not** authorized to begin H-FINAL.

Your exact assignment is:

> Modernize the stale Phase 5 Group-D acceptance fixture so Scenario 26 executes through the current hardened production authority/mutation seam and the file's three existing scenarios complete normally, while preserving all existing assertions and semantics.

This is one classified `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL` repair package.

The only target file is:

`test/phase5-group-d-acceptance.test.ts`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The latest completed and supervisor-approved H-U5-P6 evidence-bearing branch head is:

`8ab3b43c8e56a8277fcb0c87d03ef3681b425878`

That SHA is the approved pre-task authority for H-U5-P7.

Because this tasking document itself is committed after that approved head, the live branch head you receive should be one planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as `H_U5_P7_ENTRY_HEAD`;
3. compare:
   - base: `8ab3b43c8e56a8277fcb0c87d03ef3681b425878`
   - head: `H_U5_P7_ENTRY_HEAD`
4. require that the post-approval delta consists only of this supervisor-created tasking file:
   - `dev/planning-and-building/phase6-h-u5-p7-group-d-acceptance-fixtures-task.md`
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

Required predecessor-prefix SHA-1:

`fe527c76137b2cd578ef7050ee3444498b21a5e0`

### 2.2 Retained H implementation authority

Retain the approved V1.3 A/B/D H integration and every supervisor-approved H-U5-P1 through H-U5-P6 correction already present on the branch.

Do not redo or revert any previously approved repair.

Do not disturb the approved H-owned production correction from H-U5-P3.

### 2.3 Pull-request state

PR #45 must remain:

- OPEN
- DRAFT
- UNMERGED

Do not merge it.

---

## 3. LIVE FAILURE CLASSIFICATION / WHY THIS PACKAGE EXISTS

The latest supervisor-approved H-U5-P6 whole-repository proof reported:

- 687 total
- 640 pass
- 27 fail
- 20 cancelled
- 0 skipped/todo
- real `npm test` exit `1`

The current target file has exactly three tests:

1. `Phase5 scenario 26 local change during an active production run is deferred into a later reconciliation pass`
2. `Phase5 scenario 47 notification policy emits only material user-actionable conditions`
3. `Phase5 scenario 49 snapshot and planning domain is confined to the paired managed BRAIN Sync root`

In the fresh H-U5-P6 whole-suite proof:

- Scenario 26 is `cancelledByParent` with:
  - `Promise resolution is still pending but the event loop has already resolved`
- Scenarios 47 and 49 are then also `cancelledByParent` at zero duration because the unresolved Scenario 26 aborts the remainder of that file.

The causal stale-fixture boundary is visible in Scenario 26 itself:

- it waits for a `createStarted` promise;
- that promise is resolved only by the legacy raw fake Drive `create(...)` callback;
- the current hardened production execution path no longer treats that legacy raw callback as sufficient physical mutation authority;
- therefore the expected physical create boundary is never reached and the test remains pending.

This is the same classified `OLF-PHYSICAL` pattern already corrected in earlier H-U5 Group-D fixtures: production is correctly fail-closed; the test fixture must be wired to the current explicit authority/reliable-mutation boundary.

The repair must **not** weaken production to make the old callback run.

Already-approved modernization precedent exists on this branch, especially:

- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`

Use those only as precedent for current fixture wiring. Do not copy unrelated scenario logic or assertions.

---

## 4. EXACT AUTHORIZED IMPLEMENTATION SCOPE

The only implementation/test file you are initially authorized to modify is:

`test/phase5-group-d-acceptance.test.ts`

Within that file, make only the minimum fixture/harness changes required for Scenario 26 to reach the current hardened physical create boundary and for all three existing tests to complete.

### Allowed

You may:

1. add or adjust imports in the target test file;
2. replace Scenario 26's raw persistent state fixture with the already-approved integrated writable synchronization state/authority adapter if required by the current controller/executor path;
3. provide a minimal in-file current `ReliableRemoteMutationPort` implementation for the file-create operation exercised by Scenario 26;
4. move the existing `createStarted` / `createRelease` synchronization instrumentation from the obsolete raw Drive callback onto the real hardened physical create boundary;
5. preserve/update the existing fake remote bookkeeping only as necessary to represent the created object and its authoritative verification state;
6. provide a minimal local transactional mutation seam only if the current path directly requires it; do not add one gratuitously;
7. wire the minimum current controller/executor authority dependencies required by Scenario 26;
8. make type-only or test-harness-only adjustments in this same file directly required by current hardened interfaces.

### Scenario 47 and Scenario 49

These are not authorization for unrelated rewriting.

- Scenario 47 is a notification-policy assertion and currently has no independent observed failure; it is cancelled only because Scenario 26 leaves the file pending.
- Scenario 49 is a managed-root/domain-confinement assertion and currently has no independent observed failure; it is cancelled only because Scenario 26 leaves the file pending.

Do not alter either scenario unless a trivial type/import adjustment is directly required by a shared in-file fixture change.

If either Scenario 47 or Scenario 49 independently fails after Scenario 26 is corrected, diagnose it and stop for supervisor review before changing its semantics.

### Not allowed

You may **not**:

- modify any `src/**` file;
- modify any `src/contracts/**` file;
- modify any other test file;
- introduce a production fallback for legacy raw Drive mutation callbacks;
- weaken hardened authority checks;
- weaken reliable REMOTE mutation verification;
- weaken crash-safety or durable mutation requirements;
- weaken, delete, skip, rename, or replace any existing test or assertion;
- change scheduler deferral/coalescing semantics;
- change active-run serialization semantics;
- change cursor advancement semantics;
- change BASE convergence semantics;
- change managed-root/domain confinement semantics;
- change notification-policy semantics;
- change production behavior merely to make the fixture pass.

If corrected fixture wiring exposes a genuine production defect, do **not** repair production on your own.

Stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

and report the exact production surface, causal state transition, and why fixture-only correction would mask the defect.

---

## 5. REQUIRED SEMANTIC PRESERVATION

All three existing tests must retain their original meaning.

### Scenario 26 — active-run local change deferral

Preserve all of the following:

- the first automatic `periodic` run begins real authorized physical create work;
- the create boundary is genuinely active before the synthetic local change is delivered;
- the local change does **not** mutate the already-executing plan into a duplicate upload;
- the local change is deferred into a later serialized reconciliation pass;
- trigger ordering remains `periodic`, then `local-change`;
- exactly one physical create occurs;
- the initial active pass uses the expected full view because no cursor exists;
- the deferred pass uses `ReliableRemoteChangePort` from the newly committed cursor;
- canonical BASE/state includes the newly created remote identity after completion;
- scheduler cleanup/lifecycle cleanup remains intact.

Do not satisfy the test by firing `createStarted` before actual hardened physical mutation begins.

Do not satisfy the test by removing the hold/release coordination.

Do not satisfy it by allowing duplicate create dispatch.

### Scenario 47 — notification policy

Preserve the exact material/user-actionable notification distinctions already asserted.

### Scenario 49 — managed-root confinement

Preserve that snapshot/planning activity is confined to the paired managed BRAIN Sync root and does not touch the external asset root or perform destructive external action.

Do not weaken any assertion merely to achieve a green focused run.

---

## 6. CANDIDATE CONSTRUCTION

After the bounded fixture modernization is complete, commit it on:

`phase6-sync-integration-h`

Record the resulting implementation candidate SHA as:

`H_U5_P7_CANDIDATE_SHA`

Before authoritative verification, compare:

- base: `H_U5_P7_ENTRY_HEAD`
- head: `H_U5_P7_CANDIDATE_SHA`

The implementation/test delta must contain exactly one file:

`test/phase5-group-d-acceptance.test.ts`

The supervisor-created tasking file belongs only to the approved-head-to-entry planning delta and is not part of the implementation delta.

If the candidate changes any other implementation/test file, stop:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

## 7. EXECUTION ENVIRONMENT / PROOF PROCEDURE

Use a disposable GitHub Actions proof branch for authoritative execution.

Do not spend execution windows repeatedly reconstructing an ad hoc local repository environment.

Preferred disposable proof branch:

`h-u5-p7-group-d-acceptance-proof-h09`

Preferred disposable proof workflow:

`.github/workflows/h-u5-p7-group-d-acceptance-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P7_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and sufficient history for exact diff checks;
- no source/test patching inside the workflow;
- no contract patching;
- no secret output;
- no merge of the disposable proof branch;
- no mutation of PR #45 state;
- preserve deterministic logs/artifacts.

The proof workflow may continue past expected known repository failures so later proof gates can execute, but it must record and expose the **real exit status** of each test command. Do not fabricate a successful whole-suite exit.

---

## 8. REQUIRED VERIFICATION GATES

### Gate A — exact-candidate and frozen-authority preflight

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P7_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. tracked worktree is clean before verification;
7. `H_U5_P7_ENTRY_HEAD` → `H_U5_P7_CANDIDATE_SHA` changes exactly:
   - `test/phase5-group-d-acceptance.test.ts`

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

Run from the exact candidate:

- `npm ci`
- repository typecheck
- repository test compilation
- `git diff --check H_U5_P7_ENTRY_HEAD...H_U5_P7_CANDIDATE_SHA`

All must pass.

### Gate C — focused Group-D acceptance verification

Run the compiled equivalent of:

`test/phase5-group-d-acceptance.test.ts`

Required result:

- 3 tests total
- 3 pass
- 0 fail
- 0 cancelled
- 0 skipped/todo
- exit code `0`

Scenario 26 must reach and hold the **real hardened physical create boundary** before the local change is injected.

If Scenario 47 or Scenario 49 independently fails once Scenario 26 no longer cancels the file, do not rewrite its semantics. Diagnose and stop for supervisor decision if the failure is not a trivial fixture/type consequence of the authorized change.

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

Run the established combined foundation + H synchronization critical gate used by preceding H-U5 packages.

Required result, absent unrelated drift:

- 82 total
- 69 pass
- 13 fail
- 0 cancelled
- 0 skipped/todo
- real exit code `1`

The 13 failures must remain exactly the previously classified G-owned adversarial-model set.

H-I1 through H-I8 must remain PASS.

Any new H/V1.3 critical regression is a blocker.

### Gate F — fresh whole-repository test run

Run the repository's full test command directly from the exact candidate and record its **real** exit status and exact totals.

Latest supervisor-approved H-U5-P6 whole-suite baseline:

- total: 687
- pass: 640
- fail: 27
- cancelled: 20
- skipped/todo: 0

The current fresh P6 proof shows exactly three cancelled outcomes in this target file: Scenario 26 plus Scenarios 47 and 49 cancelled behind it.

Therefore, if this repair has exactly the intended effect and no additional outcomes change, the predicted H-U5-P7 whole-suite result is:

- total: 687
- pass: 643
- fail: 27
- cancelled: 17
- skipped/todo: 0
- whole-suite exit remains `1`

Treat that only as a predictive classification check, never as permission to force counts.

Record actual totals and real exit status.

If the aggregate delta differs from exactly three cancellations becoming passes, classify every changed outcome before proceeding.

No new non-G failure or cancellation may be hidden or silently accepted.

### Gate G — build

Run the repository build gate.

It must pass.

Record the actual artifact size and SHA-256 rather than assuming identity.

### Gate H — final invariants

After verification, prove again:

- exact candidate SHA;
- frozen contracts tree unchanged;
- canonical evidence unchanged;
- contract-freeze whole-file blob unchanged;
- predecessor-prefix unchanged;
- tracked source/test worktree clean;
- implementation/test candidate delta remains exactly the one authorized target file;
- PR #45 remains OPEN / DRAFT / UNMERGED.

Preserve proof logs/artifacts sufficient for independent supervisor review.

---

## 9. EVIDENCE

Only after the candidate has completed the required bounded verification may you create/update:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-09.md`

Record at minimum:

- agent identity;
- supervisor-approved pre-task head `8ab3b43c8e56a8277fcb0c87d03ef3681b425878`;
- `H_U5_P7_ENTRY_HEAD`;
- `H_U5_P7_CANDIDATE_SHA`;
- final H-U5-P7 evidence-bearing branch head;
- exact candidate diff manifest;
- concise fixture modernization summary;
- exact statement of where the Scenario 26 start/hold instrumentation now sits relative to the hardened mutation boundary;
- focused 3/3 result;
- explicit Scenario 47 and Scenario 49 result;
- V1.3 foundation result including C15/C16;
- H/V1.3 critical result and 13-failure G classification;
- H-I1 through H-I8 status;
- fresh whole-suite actual totals and real exit status;
- exact comparison against P6 baseline `687 / 640 / 27 / 20`;
- build result and artifact identity;
- proof branch/workflow/run/job/artifact identifiers;
- frozen-authority invariant results;
- PR #45 state;
- explicit statement that no production file, contract, canonical evidence file, or additional test file changed.

Do not alter:

- canonical `dev/evidence/_ca-output.md`;
- any H-01 through H-08 evidence file.

After evidence closure, candidate → evidence-head delta should contain only the H-09 evidence file.

---

## 10. HARD-STOP CONDITIONS

Stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

if any of the following occurs:

- live entry contains an unapproved source/test delta;
- another test file appears necessary;
- any production file appears necessary;
- a frozen contract appears necessary to change;
- any existing assertion would need weakening;
- Scenario 26 can pass only by reverting to or enabling legacy raw Drive mutation authority;
- Scenario 26 can pass only by firing its synchronization promise before the real physical mutation boundary;
- Scenario 47 or Scenario 49 independently exposes a nontrivial defect after Scenario 26 is fixed;
- corrected fixture wiring exposes a genuine production defect;
- the focused file does not reach 3/3 without semantic changes;
- V1.3 foundation regresses;
- H/V1.3 critical surface gains any new non-G failure;
- H-I1 through H-I8 regress;
- frozen evidence/contract invariants mismatch;
- PR #45 state is not preserved.

Do not self-authorize broader repair.

---

## 11. EXPLICITLY OUT OF SCOPE

Do not:

- begin another OLF-PHYSICAL family;
- begin the OLF-FAKE-AUTH family;
- repair G-owned adversarial-model failures;
- modify `src/product/phase6-sync-integration.ts` or any other production file;
- perform production-structure/naming normalization;
- adopt or execute the separate supervisor normalization plan;
- modify frozen contracts;
- rewrite historical evidence;
- merge PR #45;
- begin H-U5-P8;
- begin H-FINAL / H-U6 closure;
- run physical iPhone synchronization.

Remaining classified H-U5 work is still supervisor-owned and must be separately tasked.

---

## 12. STOP / RETURN PACKAGE

When H-U5-P7 is complete, stop and return a compact supervisor-review package containing:

1. `H_U5_P7_ENTRY_HEAD`
2. `H_U5_P7_CANDIDATE_SHA`
3. final H-U5-P7 evidence-bearing branch head
4. exact changed-file manifest
5. concise Scenario 26 fixture-modernization summary
6. focused 3/3 result
7. V1.3 foundation result
8. H/V1.3 critical result and 13-failure G classification
9. H-I1 through H-I8 status
10. whole-repository exact totals and real exit status
11. build result and artifact identity
12. proof run/job/artifact identifiers
13. frozen-authority invariant results
14. PR #45 state
15. any blocker or unexpected classification delta

End exactly with:

`H-U5-P7 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P8 OR H-FINAL`
