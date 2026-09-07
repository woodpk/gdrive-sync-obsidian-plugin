# NAME: `agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02`

# SESSION 5 — COMBINED G-R2/R3 — ADVERSARIAL AMBIGUITY + EXACT FOLDER-JOURNAL RECOVERY REPAIR

## 0. ASSIGNMENT

You are:

`agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the bounded combined **G-R2/R3 residual adversarial-model repair agent**.

G-R1 is complete and independently supervisor-approved after evidence correction.

Your exact assignment is:

> Repair the final two already-classified G-owned failures: G-W2 concurrent same-path-create ambiguity preservation and G-W3 exact multi-folder-journal recovery routing. Preserve every G-R1 repair, frozen synchronization contract, and production behavior. No production source is owned.

This is **Session 5** of the fixed remaining plan in:

`phase6-h-remaining-test-failure-fix-plan.md`

If successful, the complete repository automated test state must reach:

`687 total / 687 pass / 0 fail / 0 cancelled / 0 skipped/todo`

Do not begin H-NORM or H-FINAL.

---

## 1. EXACT ENTRY AUTHORITY

The independently supervisor-approved corrected G-R1 evidence-bearing H head is:

`117a940d82eb0352f46c7fdafa93d48dfa294cc8`

At that head:

- G-R1 candidate remains `1fedd3752a7409fd3691b18456a6fe851c80a7bb`;
- focused adversarial model is `56 / 54 pass / 2 fail / 0 cancelled`;
- V1.3 foundation is `17 / 17 PASS`;
- H/V1.3 critical is `82 / 80 pass / 2 fail / 0 cancelled`;
- whole repository is `687 / 685 pass / 2 fail / 0 cancelled`;
- the only failures are G-W2 and G-W3;
- production build is PASS, `../../main.js` size `699509`, SHA-256 `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`;
- PR #45 is open, draft, unmerged, headed by `phase6-sync-integration-h`.

This tasking document is one planning-only commit after that approved head.

At startup:

1. resolve live `phase6-sync-integration-h` head as `G_R2_R3_ENTRY_HEAD`;
2. compare `117a940d82eb0352f46c7fdafa93d48dfa294cc8...G_R2_R3_ENTRY_HEAD`;
3. require that the delta contains only:
   - `phase6-g-r2-r3-ambiguity-folder-journal-recovery-task.md`;
4. require no source, test, contract, evidence, workflow, or other planning change.

If not exact, stop:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Before editing, read completely:

1. `software-products-dev-manual-agent-led.md`
2. `phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. `../evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01.md`
5. `../../test/adversarial-model/support/model.ts`
6. `../../test/adversarial-model/adversarial-model.test.ts`
7. frozen folder-create verifier contracts used by the model.

---

## 2. WRITE OWNERSHIP

You may modify only:

1. `../../test/adversarial-model/support/model.ts`
2. `../../test/adversarial-model/adversarial-model.test.ts`

After the source/test candidate is complete, you may create/update only:

`../evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02.md`

No other tracked file is authorized.

Forbidden:

- all `src/**` production changes;
- all `src/contracts/**` changes;
- every non-G test;
- canonical `../evidence/_ca-output.md`;
- other evidence files;
- planning files;
- integration-branch workflow files.

A disposable proof workflow may exist only on a separate proof branch.

If a genuine production or frozen-contract defect is exposed, stop rather than self-authorizing broader scope.

---

## 3. FROZEN AUTHORITIES

Preserve exactly:

- V1.3 foundation source: `05600f7ca48a6726b72188005f29eddfc1191519`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical evidence blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`

Preserve all independently approved G-R1 transition/recovery/settle repairs.

Do not weaken:

`AdversarialSyncModel.assertQuiescentOrExplicit()`

Do not make ambiguous or unresolved states appear converged merely to obtain green tests.

---

## 4. EXACT RESIDUAL FAILURES

### G-W2

`29 concurrent same-path creates never silently select one remote winner`

Current scenario:

1. device A locally creates `same.md = A`;
2. device B locally creates `same.md = B`;
3. each independently persists and dispatches an upload-create;
4. both distinct remote objects exist at the same logical path;
5. after reconciliation, **both devices must preserve the duplicate-path ambiguity as conflict**.

Required semantic boundary:

- neither device may silently adopt its own created remote object as authoritative BASE while an independent active remote candidate occupies the same logical path;
- no device may mark the duplicate path `converged` without explicit authority resolving the ambiguity;
- both complete user versions/remote candidates remain preserved;
- no arbitrary winner selection by insertion order, local creator identity, candidate ID ordering, or most-recent write;
- repair must be generic for duplicate logical-path ambiguity, not special-cased to `same.md` or test 29.

Inspect the interaction among:

- upload-create physical dispatch;
- `finalizeJournal()`;
- BASE establishment;
- independent active candidates at the logical path;
- subsequent `derivePlan()` ambiguity detection;
- path-state transitions.

The likely defect surface is G-model bookkeeping/finalization ordering, but diagnose from actual state before changing code.

### G-W3

`G-C2 generic recover routes multiple folder journals by exact journal identity`

Current scenario has two simultaneous folder-create journals:

- journal/path `one` with reserved remote ID `f1` and wrong observed parent — must become/stay conflict-preserved and remain `dispatch-authorized`;
- journal/path `two` with reserved remote ID `f2` and correct parent — must become `effect-verified`;
- generic `recover` must perform exactly two recovery reads and route each verifier result to the exact corresponding journal/descriptor.

Required semantic boundary:

- recovery outcome for one folder journal must never overwrite, substitute for, or be consumed as the authoritative routing state for another journal;
- generic recovery must invoke frozen folder-create verification independently for each eligible folder journal;
- each result must update only the journal/path that produced it;
- the public/test-observable aggregate `folderRecovery` field, if retained, must not be used as the routing authority for multi-journal recovery;
- no singleton cached recovery result may cause cross-journal conflation;
- exact descriptor identity, reserved remote object identity, target path, and parent authority must remain paired;
- preserve all existing F1–F10 and other G-C2 tests.

Diagnose the current interaction among:

- `recover()`;
- `recoverFolderCreate()`;
- `recoverFolderCreateJournal()`;
- `observeFolderRecovery()`;
- `folderRecovery` storage;
- journal removal/state updates;
- iteration over multiple journals.

Do not change the frozen verifier contract to accommodate the model.

---

## 5. REPAIR CONSTRAINTS

The two classifications are distinct even though they share one session.

### G-W2 constraints

Do not:

- delete one remote candidate;
- auto-trash the independent candidate;
- select a winner by deterministic sorting and call that convergence;
- rewrite the test to accept one winner;
- bypass ambiguity detection by suppressing the second create.

A correct repair preserves both candidates and explicit conflict until a future authoritative resolution exists.

### G-W3 constraints

Do not:

- process only the first folder journal;
- reuse the first/last recovery result for all journals;
- identify journals solely by array position;
- merge folder descriptors;
- mutate descriptor authority to match observations;
- weaken wrong-parent/occupied-target/incomplete-observation behavior;
- fabricate `verified-effect` without the frozen verifier.

### Shared constraints

- preserve all 54 currently passing adversarial-model tests;
- preserve G-R1 behavior exactly;
- no skipped/todo/cancelled tests;
- no arbitrary sleeps/retries/timeouts;
- no production change;
- no contract change.

If the existing tests are sufficient, a `model.ts`-only candidate is acceptable. Modify `adversarial-model.test.ts` only for narrowly targeted regression assertions needed to prove a generic repair; never weaken existing assertions.

---

## 6. CANDIDATE / EVIDENCE BOUNDARY

Create one bounded implementation candidate.

Before committing:

- changed files must be a subset of the two authorized G files;
- `git diff --check` must PASS;
- no other tracked path may change.

Record:

`G_R2_R3_CANDIDATE_SHA`

Do not amend the candidate with evidence.

Then create one evidence-only commit containing only:

`../evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02.md`

Record the final evidence-bearing H head separately.

---

## 7. AUTHORITATIVE PROOF

Use a disposable GitHub Actions proof branch.

Preferred branch:

`g-r2-r3-ambiguity-folder-recovery-proof-g02`

Preferred workflow:

`.github/workflows/g-r2-r3-ambiguity-folder-recovery-proof.yml`

Requirements:

- workflow-only proof-branch changes;
- checkout exact `G_R2_R3_CANDIDATE_SHA`;
- Node 22;
- `actions/checkout@v4`, `persist-credentials: false`, full history;
- no source/test patching in the workflow;
- no contract patching;
- no production mutation;
- no PR mutation;
- no secret output;
- proof branch must not be merged;
- preserve real command exits and deterministic artifact logs.

Because this session is expected to eliminate the final automated failures, the focused, critical, and whole-suite commands must now exit `0`.

---

## 8. REQUIRED VERIFICATION GATES

### Gate A — exact scope / frozen authority

Prove:

- exact candidate checkout;
- entry → candidate delta is a subset of the two authorized G files only;
- `git diff --check` PASS;
- frozen contract tree exact;
- canonical evidence exact;
- contract-freeze blob/prefix exact;
- candidate worktree clean;
- no `src/**` delta.

### Gate B — install/static

Run and require PASS:

- `npm ci`
- `npm run typecheck`
- repository test compilation

### Gate C — complete focused adversarial model

Run the complete compiled equivalent of:

`../../test/adversarial-model/adversarial-model.test.ts`

Required:

- total: `56`
- pass: `56`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit: `0`

Explicitly prove PASS for:

- `29 concurrent same-path creates never silently select one remote winner`
- `G-C2 generic recover routes multiple folder journals by exact journal identity`

Also prove all 11 G-W1 tests remain PASS.

### Gate D — V1.3 foundation

Required:

- `17 / 17 PASS`
- C15 PASS
- C16 PASS
- real exit `0`

### Gate E — H/V1.3 critical

Required:

- total: `82`
- pass: `82`
- fail: `0`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `0`

H-I1 through H-I8 must all PASS.

### Gate F — complete repository

Approved G-R1 baseline:

`687 / 685 pass / 2 fail / 0 cancelled`

Required G-R2/R3 result:

- total: `687`
- pass: `687`
- fail: `0`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `0`

Exact expected delta:

`+2 pass / -2 fail`

No failure may remain.

If any other failure appears, causally classify it and stop rather than broadening scope.

### Gate G — production build

Run production build and require PASS.

Because this is test-only G repair, production artifact identity must remain exactly:

- `../../main.js` size: `699509` bytes
- SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`

If production identity changes, stop and diagnose before closure.

### Gate H — repository / PR invariants

Verify:

- no production source changed;
- no contract changed;
- candidate delta remains within authorized G files;
- evidence commit contains only the G02 evidence file;
- canonical evidence unchanged;
- PR #45 remains open, draft, unmerged;
- PR #45 head remains `phase6-sync-integration-h`;
- proof workflow remains off the integration branch.

---

## 9. EVIDENCE REQUIREMENTS

Create/update only:

`../evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02.md`

Record at minimum:

1. agent identity;
2. approved pre-task authority `117a940d82eb0352f46c7fdafa93d48dfa294cc8`;
3. `G_R2_R3_ENTRY_HEAD` and one-file planning-only entry proof;
4. `G_R2_R3_CANDIDATE_SHA`;
5. final evidence-bearing H head;
6. exact candidate manifest;
7. exact candidate → evidence manifest;
8. separate causal diagnosis for G-W2 and G-W3;
9. exact repairs and why they preserve frozen semantics;
10. confirmation `assertQuiescentOrExplicit()` was not weakened;
11. focused `56/56` result;
12. explicit PASS for G-W2 and G-W3;
13. explicit confirmation all G-W1 tests remain PASS;
14. foundation `17/17` including C15/C16;
15. critical `82/82` and H-I1–H-I8 PASS;
16. whole repository `687/687` and exact `+2/-2` delta;
17. build size/hash and identity comparison;
18. proof branch/workflow/head commit;
19. run ID / job ID / conclusion;
20. artifact ID/name/digest/size copied from authoritative GitHub metadata;
21. frozen-authority values;
22. PR #45 state/head/unmerged proof;
23. confirmation no production source changed;
24. blockers/unexpected delta, if any.

Cross-check run/job/artifact provenance against authoritative GitHub metadata before committing evidence.

---

## 10. HARD STOP

If all gates pass, commit the evidence-only closure and stop.

Do **not** begin H-NORM.

Do **not** begin H-FINAL.

Do **not** run physical iPhone validation.

Return the exact entry SHA, candidate SHA, final evidence-bearing H head, manifests, G-W2/G-W3 diagnosis and repair, focused/foundation/critical/whole/build results, proof identifiers, frozen-authority verification, and PR #45 state.

End exactly:

`G-R2/R3 COMPLETE — READY FOR SUPERVISOR REVIEW — AUTOMATED SUITE 687/687 — DO NOT START PRODUCTION NORMALIZATION OR H-FINAL`

If blocked, end:

`BLOCKED — SUPERVISOR DECISION REQUIRED`