# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10`

# SESSION 1 — H-U5-P8 — REMAINING NON-FAKE-AUTHORITY COMPATIBILITY REPAIR

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the next bounded repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics.

You are **not** authorized to begin H-U5-P9, H-U5-P10, either G repair session, production-structure normalization, or H-FINAL.

Your exact assignment is:

> Repair the five remaining non-fake-authority compatibility failures assigned to H-U5-P8 by modernizing two stale OLF-PHYSICAL test harnesses onto the already-approved hardened writable-authority / reliable-mutation seams and by correcting one stale predecessor Drive test expectation to the already-approved V1.3 public failure-provenance behavior, without changing production semantics.

This is **Session 1** of the fixed post-P7 plan in:

`dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The independently supervisor-approved H-U5-P7 evidence-bearing branch head is:

`8f75956eaa0161b5d4744ba0a303f5555408d613`

The supervisor then committed the fixed remaining-session plan as a planning-only commit:

`cdfaa46947e24f210293dfc170a6319472c18370`

That commit changes only:

`dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`

This tasking document is committed after that planning head. Therefore the live branch head you receive should be one additional planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as `H_U5_P8_ENTRY_HEAD`;
3. compare:
   - base: `cdfaa46947e24f210293dfc170a6319472c18370`
   - head: `H_U5_P8_ENTRY_HEAD`
4. require that this delta contains **only**:
   - `dev/planning-and-building/phase6-h-u5-p8-remaining-non-fake-authority-compatibility-task.md`
5. also compare:
   - base: `8f75956eaa0161b5d4744ba0a303f5555408d613`
   - head: `H_U5_P8_ENTRY_HEAD`
6. require that this larger post-P7 delta contains exactly the two supervisor planning files:
   - `dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`
   - `dev/planning-and-building/phase6-h-u5-p8-remaining-non-fake-authority-compatibility-task.md`

If any unapproved `src/**`, `test/**`, contract, or evidence change exists in either post-approval planning delta, stop immediately with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not silently adopt any other branch-tip change as authority.

Before editing, read:

1. `software-products-dev-manual-agent-led.md`
2. `dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. the three owned test files
5. the already-approved hardened-fixture precedents named in Section 5 below.

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

H/UI authority remains the frozen V1.3 contract interpretation, including `executionDispositionV1_3` where applicable.

Do not restore predecessor reason-string parsing or private implementation-error interpretation where the public V1.3 provenance contract now exists.

### 2.3 Production safety rule

The hardened production implementation is allowed to fail closed when writable synchronization authority or reliable physical mutation seams are absent.

Do **not** weaken production fail-closed behavior to make a legacy fixture pass.

---

## 3. EXACT OWNED FILES

You may modify only these three test files:

1. `test/phase5-group-d-surface-lifecycle-integration.test.ts`
2. `test/phase6-alpha-plan-errors-stability.test.ts`
3. `test/workstreams/drive/phase6-remote-protocol.test.ts`

You may also create/update only your own evidence file after the implementation candidate is fixed:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10.md`

No other tracked file is authorized.

Specifically forbidden without supervisor re-authorization:

- all `src/**` production changes;
- all `src/contracts/**` changes;
- `dev/evidence/_ca-output.md`;
- any other `dev/evidence/**` file;
- any other `test/**` file;
- any planning document;
- any workflow file on the integration branch.

If correct modernization of an owned fixture exposes a genuine production defect, do **not** patch production. Stop and return:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

with the smallest reproducible evidence needed to classify the defect.

---

## 4. CURRENT CLASSIFIED BASELINE

The independently approved H-U5-P7 whole-repository proof is:

- total: `687`
- pass: `643`
- fail: `27`
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

All 13 critical failures are the already-classified G-owned adversarial-model failures. H-I1 through H-I8 are PASS.

H-U5-P8 owns exactly five of the current 27 whole-suite failures. It owns **none** of the 17 cancellations.

---

## 5. EXACT REPAIR WORK

### 5.1 File A — `test/phase5-group-d-surface-lifecycle-integration.test.ts`

Current H-U5-P8 failures:

1. `G2 scenarios 44 and 45 repeated path-local failure stays isolated while safe work commits and real activity produces bounded audit records`
2. `G2 scenario 48 allowlisted portable configuration synchronizes through reserved domain while device-local and unknown configuration stay excluded`

Current symptom at the approved P7 baseline: each reaches an `assert.ok(plan)` failure because the stale controller harness does not provide the current authoritative writable-state / physical-mutation construction required by hardened execution.

The helper currently constructs the controller around the predecessor `PersistentSynchronizationStateStore` and legacy physical mutation callbacks. Modernize only the fixture construction needed to execute the existing scenarios through the current hardened seams.

Required characteristics:

- seed writable synchronization authority using the current authority-state model;
- use the integrated synchronization authority/state adapter where required by the current controller;
- provide the current `authorityStore` seam to the controller;
- provide an in-file `ReliableRemoteMutationPort` for the remote create path exercised by Scenario 48;
- provide an in-file `LocalTransactionalMutationPort` for the local physical create path exercised by Scenarios 44/45 where the hardened controller requires it;
- attach mutation instrumentation to the hardened physical ports, not to predecessor raw mutation callbacks;
- where a predecessor raw mutation callback must remain structurally present for read/adapter compatibility, it must not remain the authoritative physical-mutation proof path;
- where practical, turn obsolete raw mutation callbacks into fail guards so the test proves the hardened seam was actually used;
- preserve the current production planner wrapper;
- preserve path-scope behavior, safe-work isolation, repeated bad-path behavior, bounded audit history, privacy assertions, and portable-config allowlist/exclusion semantics;
- preserve all existing test names and behavioral assertions unless a purely mechanical current-interface adaptation is required.

Do not change Scenario 6, Scenario 47, or Scenario 50 semantics merely because they share the file.

### 5.2 File B — `test/phase6-alpha-plan-errors-stability.test.ts`

Current H-U5-P8 failures:

1. `ordinary one-time edit race retries, uploads stable content, and creates no sync-plan error row`
2. `exhausted edit instability is isolated into the CSV while an independent safe upload commits`

Current symptom at the approved P7 baseline: `executeReviewed(...)` receives no reviewable plan and fails at `assert.ok(plan)` because the fixture still constructs upload execution through predecessor state/raw Drive mutation authority.

Modernize the shared `controllerFixture(...)` only as necessary so these two existing tests execute through the current authoritative lifecycle.

Required characteristics:

- preserve `CanonicalEvidenceLocalVault` stale-observation retry semantics exactly;
- seed current writable synchronization authority;
- use the integrated synchronization state/authority adapter required by hardened H execution;
- provide `authorityStore` to the controller;
- provide a minimal deterministic in-file `ReliableRemoteMutationPort` for upload-create execution;
- move the `uploaded` instrumentation to the hardened reserved-create physical boundary so a passing test proves the current execution path was used;
- the raw Drive `create(...)` callback must no longer act as mutation authority; convert it to a fail guard if it is no longer needed by the authoritative path;
- preserve `SyncAttentionLedger` / `sync-plan-errors.csv` behavior;
- preserve the first test's requirement that a one-time edit race retries to stable content, uploads only canonical stable bytes, and leaves no attention row;
- preserve the second test's requirement that persistent instability is path-local, the independent safe upload commits, attention is written, and a later stable retry resolves the attention record and uploads the formerly unstable path;
- preserve all other tests in this file unchanged in semantics.

### 5.3 File C — `test/workstreams/drive/phase6-remote-protocol.test.ts`

Current H-U5-P8 failure:

`workstream A coherent download: remote revision change during transfer cannot be consumed as coherent success`

Current approved behavior is already established by the V1.3 companion test:

`workstream A v1.3: post-stream remote change exposes public recovery provenance`

The public V1.3 provenance for this condition is exactly:

- `kind: recovery-required`
- `source: google-drive`
- `detail: remote-changed-during-coherent-download`

The stale predecessor test currently validates the old/private stream-error shape and therefore rejects the current `OperationalFailureErrorV1_3` even though the production behavior is correct.

Required correction:

- update only the stale legacy expectation/import surface needed to assert the approved **public V1.3 provenance**;
- prefer the frozen public extraction seam such as `operationalFailureProvenanceFromErrorV1_3(...)` rather than A-private error-shape knowledge;
- preserve the test's substantive safety assertion that a remote revision change during/after streamed transfer cannot be consumed as coherent success;
- preserve the requirement that the remote change is detected by authoritative post-stream observation;
- do not modify the V1.3 companion test merely to duplicate this correction;
- do not change Drive production semantics;
- do not reintroduce reason-string matching as authority.

---

## 6. APPROVED MODERNIZATION PRECEDENTS

Use these already-approved H-U5 test modernizations as construction references, not as permission to copy unrelated semantics:

- `test/phase5-group-d-first-sync-integration.test.ts` — approved P3
- `test/phase5-group-d-active-run-integration.test.ts` — approved P4
- `test/phase5-group-d-conflict-destruction-integration.test.ts` — approved P5; useful reference for both `LocalTransactionalMutationPort` and `ReliableRemoteMutationPort`
- `test/phase5-group-d-recovery-coordination-integration.test.ts` — approved P6
- `test/phase5-group-d-acceptance.test.ts` — approved P7; useful reference for current authority seeding and reserved remote create

Use the smallest compatible fixture adaptation. Do not transplant unrelated scenario machinery.

---

## 7. IMPLEMENTATION / COMMIT BOUNDARY

Perform the three-file repair as one bounded H-U5-P8 candidate.

Before creating the implementation candidate:

- verify only the three owned test files changed from `H_U5_P8_ENTRY_HEAD`;
- run `git diff --check`;
- confirm no `src/**`, contract, planning, canonical-evidence, or other test/evidence file changed.

Record the resulting source/test commit as:

`H_U5_P8_CANDIDATE_SHA`

After the candidate is fixed, do not amend it with evidence text. Evidence must be a later evidence-only commit.

The candidate-to-evidence-head delta must contain exactly:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10.md`

---

## 8. EXECUTION ENVIRONMENT / PROOF PROCEDURE

Use a disposable GitHub Actions proof branch for authoritative execution.

Do not spend execution windows repeatedly reconstructing an ad hoc local repository environment.

Preferred disposable proof branch:

`h-u5-p8-remaining-compatibility-proof-h10`

Preferred disposable proof workflow:

`.github/workflows/h-u5-p8-remaining-compatibility-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P8_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and sufficient history for exact diff checks;
- no source/test patching inside the workflow;
- no contract patching;
- no secret output;
- no merge of the disposable proof branch;
- no mutation of PR #45 state;
- preserve deterministic logs/artifacts.

The proof workflow may continue past expected known repository failures so later proof gates can execute, but it must record and expose the **real exit status** of every test command. Do not fabricate a successful whole-suite exit.

---

## 9. REQUIRED VERIFICATION GATES

### Gate A — exact candidate / scope / frozen authority

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P8_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. tracked worktree is clean before verification;
7. `H_U5_P8_ENTRY_HEAD` → `H_U5_P8_CANDIDATE_SHA` changes exactly the three owned test files;
8. `git diff --check H_U5_P8_ENTRY_HEAD...H_U5_P8_CANDIDATE_SHA` passes.

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

From the exact candidate run:

- `npm ci`
- repository typecheck
- repository test compilation

All must pass.

### Gate C — focused P8 compatibility verification

Run the compiled equivalents of all three owned files:

- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase6-alpha-plan-errors-stability.test.ts`
- `test/workstreams/drive/phase6-remote-protocol.test.ts`

Required result:

- every test in all three target files passes;
- `0` fail;
- `0` cancelled;
- `0` skipped/todo unless the file already contains an explicit intentional skip in the approved baseline;
- real exit code `0`.

Explicitly prove PASS for the five formerly failing tests named in Section 5.

Do not make unrelated assertions weaker to obtain a green focused gate.

### Gate D — V1.3 foundation

Run the established V1.3 foundation proof.

Required result:

- 17 total
- 17 pass
- 0 fail
- 0 cancelled
- C15 PASS
- C16 PASS
- real exit code `0`

### Gate E — H/V1.3 critical regression surface

Run the established foundation + H synchronization critical gate used by preceding H-U5 packages.

Required result, absent unrelated repository drift:

- 82 total
- 69 pass
- 13 fail
- 0 cancelled
- 0 skipped/todo
- real exit code `1`

The 13 failures must remain exactly the previously classified G-owned adversarial-model set:

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

### Gate F — fresh whole-repository run

Run the repository's full test command directly from the exact candidate and record its real exit status and exact totals.

The fixed post-P7 classification predicts that correcting exactly the five P8 failures changes the approved P7 baseline by:

- `+5 pass`
- `-5 fail`
- cancellations unchanged

Predicted post-P8 totals:

- total: `687`
- pass: `648`
- fail: `22`
- cancelled: `17`
- skipped/todo: `0`
- expected real exit: `1`

These numbers are a **classification prediction, not a target to force**. Never weaken, skip, delete, or rewrite tests merely to match them.

If the totals differ, identify the exact changed test outcomes and classify the difference before proceeding to evidence closure.

Absent unrelated drift, the remaining 22 failures after P8 must consist only of:

- the 13 already-classified G-owned failures; and
- the nine already-planned P9/P10 non-G failures:
  - `C1 automatic run executes the independently safe subset of a mixed attention plan`
  - `operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs`
  - `a later stable no-op reconciliation resolves transient stale attention without a content mutation`
  - `post-journal stale intent is safely retired before unrelated work continues`
  - `iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle`
  - `sync diagnostics preserve plan/execution semantics and never export vault path or content`
  - `pending throw is Error-level at its exact execution substage and closes the run`
  - `uncertain-journal throw is Error-level at its exact execution substage and closes the run`
  - `mixed automatic plan commits unrelated safe upload, retains attention, and preserves cursor/re-plan durability`

The 17 cancellations should remain the already-classified downstream cascade in `test/phase6-alpha-mixed-plan-isolation.test.ts`; P8 does not own that repair.

Any new or differently classified failure/cancellation is a blocker pending diagnosis.

### Gate G — build

Run the established production build.

Required:

- build PASS;
- record `main.js` byte size;
- record SHA-256.

Because H-U5-P8 is test-only, absent unrelated toolchain drift the production artifact should remain identical to the approved P7 build:

- size: `697437` bytes
- SHA-256: `3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

If artifact identity changes, stop and explain the cause; do not silently accept production drift from a test-only package.

### Gate H — final invariants / PR state

At the exact candidate prove again:

- candidate SHA exact;
- frozen contract tree exact;
- canonical evidence blob exact;
- contract-freeze blob/prefix exact;
- entry → candidate file manifest exact;
- tracked worktree clean.

Verify PR #45 remains:

- OPEN
- DRAFT
- UNMERGED
- head branch `phase6-sync-integration-h`

Do not merge or mark the PR ready for review.

---

## 10. EVIDENCE REQUIREMENTS

After all gates are classified, write:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-10.md`

The evidence must include at minimum:

1. agent identity;
2. `H_U5_P8_ENTRY_HEAD`;
3. `H_U5_P8_CANDIDATE_SHA`;
4. final evidence-bearing branch head;
5. exact entry → candidate changed-file manifest;
6. exact candidate → evidence-head manifest;
7. concise explanation of each of the three fixture/expectation corrections;
8. proof that raw predecessor mutation callbacks were not used as physical authority where hardened ports now own the mutation;
9. focused test results and real exit;
10. V1.3 foundation results and real exit;
11. H/V1.3 critical results, exact 13 G failures, H-I1 through H-I8 status, and real exit;
12. fresh whole-suite totals, exact P7 → P8 outcome delta, and real exit;
13. build result, byte size, and SHA-256;
14. proof branch name;
15. workflow path;
16. workflow run ID;
17. workflow job ID;
18. final proof-branch head;
19. proof artifact ID, size, and digest;
20. all frozen-authority invariant values;
21. PR #45 state/head/unmerged proof;
22. blockers or unexpected classification delta, if any.

Do not modify historical evidence files.

---

## 11. STOP / ESCALATION RULES

Stop for supervisor decision if any of the following occurs:

- an owned test cannot be made correct without a production change;
- correct fixture modernization exposes a genuine production defect;
- a frozen contract appears inconsistent with the authorized behavior;
- any H-I1 through H-I8 regression appears;
- the critical 13-failure G set changes unexpectedly;
- a new whole-suite failure/cancellation appears outside the fixed classification;
- build identity changes unexpectedly;
- entry/candidate/evidence diff scope is violated;
- canonical/frozen authority changes;
- PR #45 is no longer open, draft, and unmerged.

Do not self-authorize scope expansion.

Do not start P9 to compensate for an unresolved P8 problem.

---

## 12. REQUIRED FINAL RESPONSE

If H-U5-P8 completes within scope, return a compact completion package containing:

1. `H_U5_P8_ENTRY_HEAD`
2. `H_U5_P8_CANDIDATE_SHA`
3. final evidence-bearing branch head
4. exact changed-file manifest
5. concise repair summary by owned file
6. focused results
7. foundation results
8. H/V1.3 critical results
9. H-I1 through H-I8 results
10. whole-repository totals and exact delta from P7
11. build result and artifact identity
12. proof run/job/branch/workflow/artifact identifiers
13. frozen-authority invariants
14. PR #45 state
15. blockers / unexpected classification delta

End exactly with:

`H-U5-P8 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P9 OR H-FINAL`

Then stop.
