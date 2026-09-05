# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11`

# SESSION 2 — H-U5-P9 — SHARED OLF-FAKE-AUTH CONTROLLER-FIXTURE REPAIR

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the next bounded repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics.

You are **not** authorized to begin H-U5-P10, either G repair session, production-structure normalization, H-FINAL, or physical iPhone validation.

Your exact assignment is:

> Repair the five remaining H-U5-P9 OLF-FAKE-AUTH failures and the single 17-test downstream cancellation cascade by modernizing the shared legacy controller fixtures onto the already-approved writable synchronization-authority / integrated H execution lifecycle, while preserving the existing plan, execution, restart, safe-subset, gate, cursor/baseline, attention, serialization/coalescing, and diagnostic semantics. Production semantics must not change.

This is **Session 2 — H-U5-P9** of the fixed remaining-session plan in:

`dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The independently supervisor-approved H-U5-P8 final evidence-bearing `phase6-sync-integration-h` head is:

`6cf861d6a8514d65f67f1daf8cede465eab963bb`

That approved head already contains the completed P8 source/test candidate and its evidence-only closure commit.

This tasking document is committed after that approved head as one supervisor planning-only commit. Therefore the live branch head you receive should be exactly one planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as `H_U5_P9_ENTRY_HEAD`;
3. compare:
   - base: `6cf861d6a8514d65f67f1daf8cede465eab963bb`
   - head: `H_U5_P9_ENTRY_HEAD`
4. require that this delta contains **only**:
   - `dev/planning-and-building/phase6-h-u5-p9-shared-olf-fake-auth-controller-fixture-task.md`
5. require that no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed in that delta.

If the live branch does not satisfy that exact entry condition, stop immediately with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not silently substitute a newer branch tip, alternate SHA, or unrelated commit as authority.

Before editing, read completely:

1. `software-products-dev-manual-agent-led.md`
2. `dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. `dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10.md`
5. all three owned P9 test files
6. the already-approved hardened-fixture precedents named in Section 7 below.

You may inspect production source and frozen contracts read-only as needed to understand the current interfaces. Inspection does not authorize modification.

---

## 2. FROZEN / RETAINED AUTHORITIES

Preserve all previously approved H/V1.3 work.

### 2.1 Frozen V1.3 foundation

Approved V1.3 foundation source commit:

`05600f7ca48a6726b72188005f29eddfc1191519`

Frozen `src/contracts/**` tree:

`0db68ced179825f929008b502335210260ca2ce3`

Canonical evidence file:

`dev/evidence/_ca-output.md`

Canonical evidence blob:

`d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`

Contract-freeze whole-file blob:

`b675e0fc9776d03892a4309231b91a4bf0a84b93`

Required immutable predecessor-prefix SHA-1:

`fe527c76137b2cd578ef7050ee3444498b21a5e0`

Do not modify any frozen contract or canonical evidence authority.

### 2.2 V1.3 semantic rule

Operational failure provenance and physical-effect certainty remain orthogonal.

H/UI authority remains the frozen V1.3 interpretation, including `executionDispositionV1_3` where applicable.

Do not restore predecessor reason-string parsing, stale fake-executor authority, or legacy state-journal assumptions as substitutes for the current authoritative lifecycle.

### 2.3 Production fail-closed rule

The hardened product is allowed to fail closed when writable synchronization authority or required reliable physical-mutation seams are absent.

The P9 fixtures are stale because they still behave as if predecessor fake executor/raw state-store behavior itself supplies physical-effect/journal authority.

Do **not** weaken production fail-closed behavior to make these fixtures pass.

---

## 3. EXACT OWNED FILES

You may modify only these three test files:

1. `test/phase5-second-rejection.test.ts`
2. `test/phase6-alpha-full-sync-remediation.test.ts`
3. `test/phase6-alpha-mixed-plan-isolation.test.ts`

After the source/test candidate is fixed, you may create/update only your own evidence file:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11.md`

No other tracked file is authorized.

Specifically forbidden without supervisor re-authorization:

- all `src/**` production changes;
- all `src/contracts/**` changes;
- `dev/evidence/_ca-output.md`;
- any other `dev/evidence/**` file;
- any other `test/**` file;
- any planning document;
- any workflow file on `phase6-sync-integration-h`.

A disposable proof workflow may exist only on a separate proof branch as specified below.

If correct modernization of an owned fixture exposes a genuine production defect, do **not** patch production. Stop and return:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

with the smallest deterministic evidence needed to classify the defect.

---

## 4. CURRENT APPROVED ACCOUNTING BASELINE

The independently approved H-U5-P8 whole-repository proof is:

- total: `687`
- pass: `648`
- fail: `22`
- cancelled: `17`
- skipped/todo: `0`
- real `npm test` exit: `1`

The current H/V1.3 critical regression surface is:

- total: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

All 13 critical failures are the already-classified G-owned adversarial-model surface. H-I1 through H-I8 are PASS.

Of the 22 current whole-suite failures:

- P9 owns exactly **5 failures**;
- the later, separately planned P10 owns exactly **4 iOS diagnostics failures**;
- G owns exactly **13 adversarial-model failures**.

P9 also owns the **17 downstream cancellations** in `test/phase6-alpha-mixed-plan-isolation.test.ts`. Those cancellations are one cascade behind the leading stale fixture failure, not 17 independent defects.

### Exact P9 currently failing tests

`test/phase5-second-rejection.test.ts`

- `second rejection: O4 item-eligible request still executes only safe items`

`test/phase6-alpha-full-sync-remediation.test.ts`

- `full-sync durable intent: acknowledged operation is not replayed across restart`
- `crash-point matrix: pre-physical intent replays once and converges`
- `crash-point matrix: post-physical pre-ack replay verifies then suppresses duplicate`

`test/phase6-alpha-mixed-plan-isolation.test.ts`

- `mixed automatic plan commits safe subset while unsafe action remains pending`
- plus 17 downstream cancellations after that leading failure blocks normal file completion.

Do not touch the four P10 iOS diagnostics failures or the 13 G-owned failures in this package.

---

## 5. REQUIRED PRE-EDIT CLASSIFICATION CHECK

The supervisor classification entering P9 is:

`LEGACY TEST/HARNESS INCOMPATIBILITY ONLY — NO PRODUCTION DEFECT IDENTIFIED.`

The common causal defect in these fixtures is that they inject a fake `executor.execute()` and/or treat the predecessor state-store save path as if it were still authoritative physical-effect/journal authority, while omitting the current writable `SynchronizationAuthorityStoreV1_1` / integrated H authority seam.

The hardened controller correctly persists durable authority before invoking those legacy hooks and therefore fails closed when the writable authority seam is absent.

Before editing:

1. inspect each owned fixture's controller construction and restart/state wiring;
2. identify where legacy fake execution or predecessor state persistence is being treated as authoritative;
3. identify the smallest current writable-authority/integrated-state construction needed to let the existing controller semantics execute normally;
4. for the mixed-plan file, confirm that the 17 cancellations are downstream of the first unresolved/failing shared fixture path rather than 17 independent product defects;
5. record this classification in your evidence.

If direct repository evidence contradicts the supervisor classification and instead exposes a genuine production defect, stop before modifying `src/**` and return the supervisor-decision blocker.

Do not manufacture a fixture-only explanation if the product is actually wrong.

---

## 6. EXACT REPAIR WORK

### 6.1 File A — `test/phase5-second-rejection.test.ts`

Owned failure:

`second rejection: O4 item-eligible request still executes only safe items`

Modernize only the shared/controller fixture construction required for this existing O4 scenario to execute through the current authoritative lifecycle.

Required characteristics:

- provide writable in-memory/integrated synchronization authority using the current authority-state model;
- provide the current `authorityStore` / integrated state seam required by hardened controller execution;
- retain the fake executor only **behind** the current authority lifecycle where the test requires executor observation;
- do not let fake executor success bypass durable authority persistence or physical-certainty bookkeeping;
- preserve exact O4 item-eligibility semantics;
- preserve the requirement that only the safe/eligible subset is executed;
- preserve the requirement that unsafe/ineligible work is not executed as a side effect of the repair;
- preserve the existing request/plan/execution assertions and test name;
- preserve failure classification and any attention/diagnostic behavior already asserted by the file.

Do not convert the test into a direct unit test of a fake executor. It must continue to exercise the real integrated controller behavior under the hardened authority lifecycle.

### 6.2 File B — `test/phase6-alpha-full-sync-remediation.test.ts`

Owned failures:

1. `full-sync durable intent: acknowledged operation is not replayed across restart`
2. `crash-point matrix: pre-physical intent replays once and converges`
3. `crash-point matrix: post-physical pre-ack replay verifies then suppresses duplicate`

Modernize the fixture's authority/state/restart construction only as needed to preserve these existing durable-intent and recovery semantics through the current H execution lifecycle.

Required characteristics:

- use writable current synchronization authority rather than treating predecessor state-store save behavior as sufficient authority;
- use the integrated H authority/state adapter required by current controller execution;
- preserve durable authority across the simulated restart exactly where the test currently requires persistence;
- preserve the boundary between intended, physical, acknowledged, verified, and committed effects;
- keep fake executor or physical-effect instrumentation only behind the current authoritative lifecycle;
- if a current reliable mutation seam is required by the actual exercised path, instrument that real hardened boundary rather than a predecessor raw callback;
- preserve exactly-once / no-duplicate behavior rather than forcing counters after the fact;
- preserve the acknowledged-operation no-replay invariant;
- preserve pre-physical replay-once-and-converge behavior;
- preserve post-physical/pre-ack verification followed by duplicate suppression;
- preserve crash-point placement and restart ordering;
- preserve all existing test names and substantive assertions.

Forbidden shortcuts include resetting durable authority between simulated restarts, pre-marking the operation complete, bypassing recovery, or weakening call-count/convergence assertions.

### 6.3 File C — `test/phase6-alpha-mixed-plan-isolation.test.ts`

Leading owned failure:

`mixed automatic plan commits safe subset while unsafe action remains pending`

This leading stale fake-authority/controller construction is followed by 17 downstream cancellations in the same file.

Repair the **shared fixture/harness causally**, not the 18 affected outcomes one by one.

Required characteristics:

- provide writable current synchronization authority using the same approved integrated H construction pattern used by the already-modernized H-U5 fixtures;
- provide current authority/state wiring to the controller before execution;
- retain fake executor behavior only where the test suite genuinely needs deterministic execution observation, and only behind the current authority lifecycle;
- attach execution/mutation instrumentation to the actual hardened boundary used by the controller rather than treating raw predecessor hooks as physical authority;
- preserve safe-subset progress: safe work may commit while unsafe work remains pending/attention-bound as originally asserted;
- preserve global safety gates and item-eligibility gates;
- preserve cursor and BASE/baseline advancement semantics;
- preserve attention-ledger behavior and resolution semantics;
- preserve automatic/manual behavior and user-actionable stopping semantics;
- preserve serialization, coalescing, deferred-trigger, and no-duplicate-dispatch assertions;
- preserve network/readiness gating behavior;
- preserve diagnostic emission, correlation, and privacy assertions;
- preserve lifecycle cleanup and test isolation;
- preserve every existing test name and substantive assertion unless a purely mechanical current-interface adaptation is required.

The 17 cancellations must disappear because the shared fixture now completes correctly. Do **not**:

- add skips;
- add `todo` markers;
- mark tests non-concurrent merely to hide a lifecycle defect;
- swallow rejected promises;
- add arbitrary sleeps/timeouts/retries to paper over a pending promise;
- pre-resolve synchronization promises before the real hardened execution boundary is reached;
- delete or weaken assertions;
- rewrite each cancelled test independently when one shared fixture correction is causal.

If, after the shared authority repair, any formerly cancelled test now reveals an independent genuine production defect, stop and classify it rather than broadening production scope.

---

## 7. APPROVED MODERNIZATION PRECEDENTS

Use the already-approved H-U5 fixture modernizations as construction references, not as permission to transplant unrelated scenario behavior:

- `test/phase5-controller.test.ts` — approved P1 controller-fixture precedent
- `test/phase5-group-d-first-sync-integration.test.ts` — approved P3
- `test/phase5-group-d-active-run-integration.test.ts` — approved P4
- `test/phase5-group-d-conflict-destruction-integration.test.ts` — approved P5
- `test/phase5-group-d-recovery-coordination-integration.test.ts` — approved P6
- `test/phase5-group-d-acceptance.test.ts` — approved P7
- `test/phase5-group-d-surface-lifecycle-integration.test.ts` — approved P8 current-authority fixture precedent
- `test/phase6-alpha-plan-errors-stability.test.ts` — approved P8 current-authority fixture precedent

Prefer the smallest compatible fixture adaptation. Do not copy unrelated scenario machinery or create a new production fallback for legacy tests.

---

## 8. IMPLEMENTATION / COMMIT BOUNDARY

Perform the three-file repair as one bounded H-U5-P9 source/test candidate.

Before creating the implementation candidate:

- verify only the three owned test files changed from `H_U5_P9_ENTRY_HEAD`;
- run `git diff --check`;
- confirm no `src/**`, contract, planning, workflow, canonical-evidence, or other test/evidence file changed.

Record the resulting source/test commit as:

`H_U5_P9_CANDIDATE_SHA`

After the candidate is fixed, do not amend it with evidence text.

Evidence must be a later evidence-only commit.

The candidate-to-evidence-head delta must contain exactly:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11.md`

No other file may change in the evidence commit.

---

## 9. EXECUTION ENVIRONMENT / AUTHORITATIVE PROOF PROCEDURE

Use a disposable GitHub Actions proof branch for authoritative execution.

Do not spend execution windows repeatedly reconstructing an ad hoc local repository environment.

Preferred disposable proof branch:

`h-u5-p9-shared-olf-fake-auth-proof-h11`

Preferred disposable proof workflow:

`.github/workflows/h-u5-p9-shared-olf-fake-auth-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P9_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and sufficient history for exact diff checks;
- no source/test patching inside the workflow;
- no contract patching;
- no production mutation;
- no secret output;
- no merge of the disposable proof branch;
- no mutation of PR #45 state;
- preserve deterministic logs/artifacts;
- record the real exit status of every test command.

The proof workflow may continue past the expected known whole-suite failures so later proof gates can execute, but it must not fabricate a successful whole-suite exit.

---

## 10. REQUIRED VERIFICATION GATES

### Gate A — exact candidate / scope / frozen authority

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P9_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. tracked worktree is clean before verification;
7. `H_U5_P9_ENTRY_HEAD` → `H_U5_P9_CANDIDATE_SHA` changes exactly the three owned test files;
8. `git diff --check H_U5_P9_ENTRY_HEAD...H_U5_P9_CANDIDATE_SHA` passes.

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

From the exact candidate run:

- `npm ci`
- repository typecheck
- repository test compilation

All must pass.

### Gate C — focused P9 verification

Run the compiled equivalents of all three owned files together and, where useful for diagnosis, individually:

- `test/phase5-second-rejection.test.ts`
- `test/phase6-alpha-full-sync-remediation.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`

Required result:

- real focused exit: `0`;
- all five P9 failures converted to passes;
- all 17 mixed-plan downstream cancellations eliminated and those tests execute normally;
- no new failure, cancellation, skip, or todo introduced in the owned files;
- all pre-existing unaffected tests in the three files continue to pass.

Do not report only the five named tests. The entire three-file owned surface is the focused gate.

### Gate D — V1.3 foundation / contract verification

Run the established V1.3 foundation verification surface.

Required result:

- `17 / 17` PASS;
- `0` fail;
- `0` cancelled;
- C15 PASS;
- C16 PASS.

### Gate E — H/V1.3 critical regression

Run the established H/V1.3 critical regression surface.

Required result remains exactly:

- total: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

All H-I1 through H-I8 must PASS.

The 13 failures must be exactly the same previously classified G-owned adversarial-model failures present in the approved P8 evidence. No new H-owned or production regression may enter this surface.

### Gate F — fresh whole-repository verification

Run the complete repository test suite from the exact candidate.

Approved P8 baseline:

- `687 / 648 / 22 / 17`

Prescribed clean P9 result:

- total: `687`
- pass: `670`
- fail: `17`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

Expected P9 delta:

- `+22` passes;
- `-5` failures;
- `-17` cancellations;
- unchanged total.

The 17 residual failures must consist exactly of:

- the same 13 previously classified G-owned adversarial-model failures; and
- the four already-planned H-U5-P10 failures in `test/phase6-alpha-ios-sync-diagnostics.test.ts`.

No other failure or cancellation is acceptable.

This aggregate is a prescribed prediction, not permission to falsify output. If the actual result differs, record the real counts and causally diagnose the delta. Do not edit out-of-scope files to force the prediction.

### Gate G — production build

Run the repository production build from the exact candidate.

Required result: PASS.

Record:

- built `main.js` size;
- built `main.js` SHA-256.

A changed build artifact is not automatically a defect, but any change must be explained because P9 is test-only.

### Gate H — final invariants / repository state

Before evidence closure, prove:

- no `src/**` production file changed in P9;
- frozen contracts remain exact;
- canonical `_ca-output.md` remains at its frozen blob;
- contract-freeze blob/prefix remain exact;
- candidate worktree is clean;
- the source/test candidate contains only the three authorized test files;
- the final evidence commit contains only the agent-11 evidence file;
- PR #45 remains open, draft, and unmerged;
- PR #45 remains headed by `phase6-sync-integration-h`;
- no disposable proof workflow was merged into the integration branch.

---

## 11. EVIDENCE REQUIREMENTS

Create/update only:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11.md`

The evidence must record at minimum:

1. agent identity;
2. supervisor-approved pre-task authority SHA:
   - `6cf861d6a8514d65f67f1daf8cede465eab963bb`
3. live `H_U5_P9_ENTRY_HEAD` and proof that the approved-head → entry delta contains only this task file;
4. pre-edit causal classification;
5. exact source/test manifest;
6. exact `H_U5_P9_CANDIDATE_SHA`;
7. exact final evidence-bearing H head;
8. proof that candidate → evidence head changes only the agent-11 evidence file;
9. focused P9 results for the entire three-file owned surface;
10. confirmation that the five prior failures pass and the 17 cancellations are eliminated;
11. V1.3 foundation results including C15/C16;
12. H/V1.3 critical results and exact residual G ownership;
13. fresh whole-suite totals and the exact P9 delta from P8;
14. confirmation that the only non-G failures left are the four planned P10 iOS diagnostics failures;
15. build result, `main.js` size, and SHA-256;
16. proof workflow branch and workflow path;
17. authoritative GitHub Actions run ID and job ID;
18. workflow conclusion;
19. proof artifact ID, digest, and size;
20. frozen contract/evidence invariants;
21. PR #45 state;
22. explicit confirmation that no production source was modified.

Do not edit canonical `dev/evidence/_ca-output.md`.

---

## 12. HARD STOP / RETURN BOUNDARY

If all gates pass, commit the evidence-only closure to `phase6-sync-integration-h` and stop.

Do **not** begin H-U5-P10 merely because turn capacity remains.

Do **not** begin either G repair session.

Do **not** begin production-structure normalization.

Do **not** begin H-FINAL.

Do **not** run physical iPhone synchronization.

Your final response must include the exact final evidence-bearing H head, candidate SHA, proof run/job/artifact identifiers, focused/foundation/critical/whole-suite/build results, and then end with exactly:

`H-U5-P9 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P10, G-R1, PRODUCTION NORMALIZATION, OR H-FINAL`

If blocked, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

and do not self-authorize broader changes.