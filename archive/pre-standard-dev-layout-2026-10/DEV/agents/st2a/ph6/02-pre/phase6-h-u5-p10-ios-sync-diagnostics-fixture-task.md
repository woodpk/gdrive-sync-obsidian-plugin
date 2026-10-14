# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12`

# SESSION 3 — H-U5-P10 — iOS SYNCHRONIZATION DIAGNOSTICS FIXTURE MODERNIZATION

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the final bounded H-U5 repair agent in the already-running Phase 6 H serial integration effort.

You are **not** starting a new integration effort.

You are **not** restarting H-U5.

You are **not** authorized to redesign synchronization semantics or diagnostics semantics.

You are **not** authorized to begin G-R1, combined G-R2/R3, production-structure normalization, H-FINAL, or physical iPhone validation.

Your exact assignment is:

> Repair the four remaining H-U5-P10 iOS synchronization-diagnostics failures by modernizing the stale legacy fake-authority/controller fixture in `../../test/phase6-alpha-ios-sync-diagnostics.test.ts` onto the already-approved writable synchronization-authority / integrated H execution lifecycle, while preserving diagnostic stage ordering, correlation, plan/execution meaning, privacy, exact Error-level failure-stage reporting, terminal closure, and frozen V1.3 disposition/provenance semantics. Production semantics must not change.

This is **Session 3 — H-U5-P10** of the fixed remaining-session plan in:

`phase6-h-remaining-test-failure-fix-plan.md`

**P10 is the final planned H-U5-P session. There is no P11.**

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The independently supervisor-approved H-U5-P9 corrected evidence-bearing `phase6-sync-integration-h` head is exactly:

`bf7ff70082c556dd69bb1047894456c40f3ce203`

The retained P9 implementation candidate is:

`98927846c7e2db622eda38c005389d83be153bc6`

This P10 tasking document is committed after the approved P9 head as one supervisor planning-only commit. Therefore the live H branch head you receive should be exactly one planning-only commit later.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as `H_U5_P10_ENTRY_HEAD`;
3. compare:
   - base: `bf7ff70082c556dd69bb1047894456c40f3ce203`
   - head: `H_U5_P10_ENTRY_HEAD`
4. require that the delta contains **only**:
   - `phase6-h-u5-p10-ios-sync-diagnostics-fixture-task.md`
5. require that no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed in that delta.

If the live branch does not satisfy that exact entry condition, stop immediately with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not silently substitute a newer branch tip, alternate SHA, or unrelated commit as authority.

Before editing, read completely:

1. `software-products-dev-manual-agent-led.md`
2. `phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. `../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11.md`
5. the complete owned test file:
   - `../../test/phase6-alpha-ios-sync-diagnostics.test.ts`
6. the approved fixture precedents in Section 7.

You may inspect production source and frozen contracts read-only as needed to understand current interfaces. Inspection does not authorize modification.

---

## 2. FROZEN / RETAINED AUTHORITIES

Preserve all previously approved H/V1.3 work.

### 2.1 Frozen V1.3 foundation

Approved V1.3 foundation source commit:

`05600f7ca48a6726b72188005f29eddfc1191519`

Frozen `src/contracts/**` tree:

`0db68ced179825f929008b502335210260ca2ce3`

Canonical evidence file:

`../evidence/_ca-output.md`

Canonical evidence blob:

`d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`

Contract-freeze whole-file blob:

`b675e0fc9776d03892a4309231b91a4bf0a84b93`

Required immutable predecessor-prefix SHA-1:

`fe527c76137b2cd578ef7050ee3444498b21a5e0`

Do not modify any frozen contract or canonical evidence authority.

### 2.2 V1.3 semantic rule

Operational failure provenance and physical-effect certainty remain orthogonal.

H/UI interpretation must remain grounded in the frozen V1.3 contract, including `executionDispositionV1_3` where applicable.

Do not restore predecessor reason-string parsing or private implementation-error interpretation as semantic authority.

### 2.3 Production fail-closed rule

The hardened product is allowed to fail closed when writable synchronization authority or required reliable physical-mutation seams are absent.

The P10 fixture is classified as stale because it still constructs the controller around predecessor state/fake-executor assumptions without the current writable authority seam.

Do **not** weaken production fail-closed behavior to make the fixture pass.

---

## 3. EXACT OWNED FILES

You may modify only:

`../../test/phase6-alpha-ios-sync-diagnostics.test.ts`

After the source/test candidate is fixed, you may create/update only your own evidence file:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12.md`

No other tracked file is authorized.

Specifically forbidden without supervisor re-authorization:

- all `src/**` production changes;
- all `src/contracts/**` changes;
- `../evidence/_ca-output.md`;
- any other `dev/evidence/**` file;
- any other `test/**` file;
- any planning document;
- any workflow file on `phase6-sync-integration-h`.

A disposable proof workflow may exist only on a separate proof branch as specified below.

If correct modernization of the owned fixture exposes a genuine production defect, do **not** patch production. Stop and return:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

with the smallest deterministic evidence needed to classify the defect.

---

## 4. CURRENT APPROVED ACCOUNTING BASELINE

The independently approved H-U5-P9 whole-repository proof is:

- total: `687`
- pass: `670`
- fail: `17`
- cancelled: `0`
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

Of the current 17 whole-suite failures:

- P10 owns exactly **4** failures, all in the one owned iOS diagnostics file;
- G owns exactly **13** adversarial-model failures;
- no cancellations remain.

### Exact P10 failing tests

1. `iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle`
2. `sync diagnostics preserve plan/execution semantics and never export vault path or content`
3. `pending throw is Error-level at its exact execution substage and closes the run`
4. `uncertain-journal throw is Error-level at its exact execution substage and closes the run`

Historical failure symptoms from the classified pre-repair run were consistent with the missing current authority lifecycle:

- the first case lacked expected `content-mutation-complete`;
- the second expected accepted planning/execution but observed rejection;
- the third never reached the intended pending throw;
- the fourth never reached the intended uncertain-journal throw.

Do not treat those symptoms as permission to synthesize diagnostic events. The corrected fixture must reach the real hardened execution boundary that naturally emits/causes the asserted diagnostics.

---

## 5. REQUIRED PRE-EDIT CLASSIFICATION CHECK

The supervisor classification entering P10 is:

`LEGACY TEST/HARNESS INCOMPATIBILITY ONLY — NO PRODUCTION DEFECT IDENTIFIED.`

Repository inspection at the approved P9 head shows the owned harness still uses predecessor-style construction, including a `PersistentSynchronizationStateStore` and a fake executor expected to observe/throw from execution, without supplying the current writable synchronization authority seam required by hardened controller execution.

Before editing:

1. inspect the complete harness/controller construction;
2. identify exactly where the predecessor fake executor/state-store construction is being treated as sufficient authority;
3. inspect how the four failing tests inject normal success, pending failure, and uncertain-journal failure behavior;
4. identify the minimum current writable-authority / integrated-state / reliable-mutation construction needed to preserve those tests' existing semantics;
5. identify all currently passing tests that share the harness and must remain unchanged in behavior;
6. record the causal classification in your evidence.

If direct repository evidence contradicts this classification and instead exposes a genuine production defect, stop before modifying `src/**` and return the supervisor-decision blocker.

Do not manufacture a fixture-only explanation if the product is actually wrong.

---

## 6. EXACT REPAIR WORK

### 6.1 Modernize the shared iOS diagnostics harness causally

Repair the shared fixture/harness, not the four failing tests independently.

The minimum authorized modernization may include, where required by the existing controller interfaces:

- replacing predecessor-only persistent-state construction with the current integrated synchronization state/authority adapter;
- seeding a writable `SynchronizationAuthorityStateV1_1` compatible with the scenario under test;
- supplying the current writable `authorityStore` seam to `ProductionSyncController`;
- supplying a minimal deterministic `ReliableRemoteMutationPort` and/or current local transactional mutation seam **only if the owned test scenarios actually exercise those boundaries**;
- moving physical-effect instrumentation to the real hardened mutation/execution boundary rather than a predecessor raw Drive callback;
- retaining fake executor behavior only behind the current authoritative lifecycle where the diagnostics tests specifically need deterministic success/failure injection;
- turning obsolete raw physical mutation callbacks into fail guards where doing so proves the hardened seam is being used;
- preserving the current production planner wrapper and real controller orchestration.

Use the smallest compatible change. Do not construct a parallel test-only execution path that bypasses the production lifecycle.

### 6.2 Preserve lifecycle correlation semantics

The first owned failure must continue to prove the real ordered/correlated iPhone `Sync now` diagnostic lifecycle, including the existing stages/assertions in the file such as:

- sync entry;
- planning;
- preview;
- user Execute boundary;
- execution;
- physical/content mutation completion where appropriate;
- terminal closure.

Required principles:

- all correlated events for one run retain the correct run/correlation identity;
- stage ordering must arise from actual controller execution;
- `content-mutation-complete` must not be manually pushed into the logger merely to satisfy the test;
- terminal closure must occur exactly once through the real lifecycle.

### 6.3 Preserve plan/execution semantics and privacy

The second owned failure must continue to prove both semantic correctness and diagnostic privacy.

Preserve:

- accepted/rejected plan/execution meaning;
- operation/result/disposition relationships already asserted by the file;
- V1.3 execution-disposition/provenance interpretation;
- no prohibited vault path leakage;
- no prohibited file/content leakage;
- no introduction of raw credential/token/secret text;
- any existing diagnostic field allowlist/redaction assertions.

Do not make the test pass by deleting sensitive-looking fixture values or weakening leak-detection assertions. The diagnostics must remain safe with the original adversarial/sentinel inputs.

### 6.4 Preserve exact pending failure-stage behavior

The third owned failure:

`pending throw is Error-level at its exact execution substage and closes the run`

must reach the intended real execution substage after the authority modernization.

Preserve exactly:

- the intended injected pending failure point;
- Error-level severity at the exact asserted substage;
- any V1.3 provenance/disposition asserted by the file;
- terminal run closure after failure;
- no false `content-mutation-complete` if physical effect has not become certain/completed;
- no swallowed exception merely to keep the test green.

Do not move the throw earlier simply because that is easier to reach.

### 6.5 Preserve exact uncertain-journal failure-stage behavior

The fourth owned failure:

`uncertain-journal throw is Error-level at its exact execution substage and closes the run`

must likewise reach the intended authoritative execution/journal boundary.

Preserve exactly:

- the intended uncertain-journal injection point;
- Error-level severity at the asserted substage;
- physical-effect certainty versus operational-failure provenance separation;
- terminal closure;
- no fabricated acknowledgement/commit state;
- no reason-string/private-error parsing as authority.

### 6.6 Preserve all currently passing diagnostics tests

Every other test in `../../test/phase6-alpha-ios-sync-diagnostics.test.ts` is part of the focused acceptance surface.

Do not:

- skip or mark tests todo;
- rename tests to evade verification;
- weaken/delete assertions;
- introduce arbitrary sleeps, polling loops, or timeouts to hide unresolved promises;
- swallow exceptions/rejections;
- pre-resolve promises before the real execution boundary;
- manually emit production diagnostic events from the test harness to fake lifecycle progress;
- relax privacy assertions;
- make tests serial/non-concurrent solely to mask global-state contamination without first proving that concurrency—not stale authority—is the causal defect.

If correct shared-fixture modernization exposes an independent product defect in a formerly passing or newly reached path, stop and classify it.

---

## 7. APPROVED MODERNIZATION PRECEDENTS

Use the already-approved H-U5 fixture modernizations as construction references, not as permission to transplant unrelated scenario behavior.

Most relevant current-authority precedents include:

- `../../test/phase5-second-rejection.test.ts` — approved P9
- `../../test/phase6-alpha-full-sync-remediation.test.ts` — approved P9
- `../../test/phase6-alpha-mixed-plan-isolation.test.ts` — approved P9
- `../../test/phase5-group-d-surface-lifecycle-integration.test.ts` — approved P8
- `../../test/phase6-alpha-plan-errors-stability.test.ts` — approved P8
- `../../test/phase5-group-d-acceptance.test.ts` — approved P7
- `../../test/phase5-group-d-conflict-destruction-integration.test.ts` — approved P5

P9's accepted pattern is especially relevant:

- `IntegratedSynchronizationStateStore` used as the current controller state store and writable authority store;
- current `SynchronizationAuthorityStateV1_1` seeding;
- physical-effect observation behind the current `ReliableRemoteMutationPort` where the scenario executes a remote mutation;
- predecessor raw mutation hooks remaining non-authoritative.

Prefer the smallest compatible fixture adaptation. Do not copy unrelated P9 plan/attention machinery into the diagnostics file.

---

## 8. IMPLEMENTATION / COMMIT BOUNDARY

Perform the one-file repair as one bounded H-U5-P10 source/test candidate.

Before creating the implementation candidate:

- verify only `../../test/phase6-alpha-ios-sync-diagnostics.test.ts` changed from `H_U5_P10_ENTRY_HEAD`;
- run `git diff --check`;
- confirm no `src/**`, contract, planning, workflow, canonical-evidence, other test, or evidence file changed.

Record the resulting source/test commit as:

`H_U5_P10_CANDIDATE_SHA`

After the candidate is fixed, do not amend it with evidence text.

Evidence must be a later evidence-only commit.

The candidate-to-evidence-head delta must contain exactly:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12.md`

No other file may change in the evidence commit.

---

## 9. EXECUTION ENVIRONMENT / AUTHORITATIVE PROOF PROCEDURE

Use a disposable GitHub Actions proof branch for authoritative execution.

Do not spend execution windows repeatedly reconstructing an ad hoc local repository environment.

Preferred disposable proof branch:

`h-u5-p10-ios-sync-diagnostics-proof-h12`

Preferred disposable proof workflow:

`.github/workflows/h-u5-p10-ios-sync-diagnostics-proof.yml`

The proof branch/workflow is verification infrastructure only.

Requirements:

- workflow-only proof branch changes;
- checkout the exact `H_U5_P10_CANDIDATE_SHA` for source/test verification;
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

The proof workflow may continue past the expected known G-owned whole-suite failures so later proof gates can execute, but it must not fabricate a successful whole-suite exit.

---

## 10. REQUIRED VERIFICATION GATES

### Gate A — exact candidate / scope / frozen authority

Before test execution, prove:

1. checked-out source/test `HEAD` equals `H_U5_P10_CANDIDATE_SHA`;
2. `src/contracts/**` tree equals:
   - `0db68ced179825f929008b502335210260ca2ce3`
3. canonical evidence blob equals:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
4. contract-freeze whole-file blob equals:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
5. required predecessor-prefix SHA-1 equals:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
6. tracked worktree is clean before verification;
7. `H_U5_P10_ENTRY_HEAD` → `H_U5_P10_CANDIDATE_SHA` changes exactly:
   - `../../test/phase6-alpha-ios-sync-diagnostics.test.ts`
8. `git diff --check H_U5_P10_ENTRY_HEAD...H_U5_P10_CANDIDATE_SHA` passes.

Any invariant mismatch is a hard blocker.

### Gate B — install / static verification

From the exact candidate run:

- `npm ci`
- repository typecheck
- repository test compilation

All must pass.

### Gate C — focused P10 diagnostics verification

Run the compiled equivalent of the **entire** owned file:

`../../test/phase6-alpha-ios-sync-diagnostics.test.ts`

Required result:

- every test in the file executes and passes;
- the four previously failing P10 tests all PASS;
- `0` fail;
- `0` cancelled;
- `0` skipped;
- `0` todo;
- real focused exit `0`.

Explicitly record PASS for the four test names in Section 4.

Do not report only the four named tests; the full diagnostics file is the focused acceptance surface.

### Gate D — V1.3 foundation / contract verification

Run the established V1.3 foundation verification surface.

Required result:

- `17 / 17` PASS;
- `0` fail;
- `0` cancelled;
- C15 PASS;
- C16 PASS;
- real exit `0`.

### Gate E — H/V1.3 critical regression

Run the established H/V1.3 critical regression surface.

Required result remains exactly:

- total: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

H-I1 through H-I8 must remain PASS.

The 13 failures must be exactly:

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

No new H-owned or production regression may enter this surface.

### Gate F — fresh whole-repository verification

Run the complete repository test suite from the exact candidate.

Approved P9 baseline:

- `687 / 670 / 17 / 0`

Prescribed clean P10 result:

- total: `687`
- pass: `674`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

Expected P10 delta:

- `+4` passes;
- `-4` failures;
- cancellations unchanged at `0`;
- total unchanged.

The **only** residual failures after P10 must be the exact 13 G-owned adversarial failures listed in Gate E.

There must be **zero remaining non-G failures** and **zero cancellations**.

This aggregate is a prescribed classification prediction, not permission to falsify output. If the actual result differs, record the real counts and causally diagnose the delta. Do not edit out-of-scope files to force the prediction.

### Gate G — production build

Run the repository production build from the exact candidate.

Required result: PASS.

Record:

- built `../../main.js` size;
- built `../../main.js` SHA-256.

Because P10 is test-only, absent unrelated toolchain drift the production artifact is expected to remain identical to approved P9:

- size: `697437` bytes
- SHA-256: `3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

If artifact identity changes, stop and explain the cause before evidence closure. Do not silently accept production drift from a test-only package.

### Gate H — final invariants / repository state

Before evidence closure, prove:

- no `src/**` production file changed in P10;
- frozen contracts remain exact;
- canonical `_ca-output.md` remains at its frozen blob;
- contract-freeze blob/prefix remain exact;
- candidate worktree is clean;
- source/test candidate contains only the one authorized test file;
- final evidence commit contains only the agent-12 evidence file;
- PR #45 remains open, draft, and unmerged;
- PR #45 remains headed by `phase6-sync-integration-h`;
- no disposable proof workflow was merged into the integration branch.

---

## 11. EVIDENCE REQUIREMENTS

Create/update only:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12.md`

The evidence must record at minimum:

1. agent identity;
2. supervisor-approved pre-task authority SHA:
   - `bf7ff70082c556dd69bb1047894456c40f3ce203`
3. live `H_U5_P10_ENTRY_HEAD` and proof that approved-head → entry changes only this task file;
4. pre-edit causal classification;
5. exact source/test manifest;
6. exact `H_U5_P10_CANDIDATE_SHA`;
7. exact final evidence-bearing H head;
8. proof that candidate → evidence head changes only the agent-12 evidence file;
9. concise shared-harness modernization description;
10. proof that legacy fake/raw hooks are not being used to bypass writable authority;
11. focused full-file diagnostics results and explicit status of the four former failures;
12. confirmation that lifecycle ordering/correlation semantics remain intact;
13. confirmation that privacy assertions remain intact;
14. confirmation that pending/uncertain-journal Error-level substage assertions remain intact;
15. V1.3 foundation results including C15/C16;
16. H/V1.3 critical results and exact residual G ownership;
17. fresh whole-suite totals and exact P9 → P10 delta;
18. confirmation that **all residual failures are G-owned and no non-G failure/cancellation remains**;
19. build result, `../../main.js` size, and SHA-256;
20. proof workflow branch and workflow path;
21. authoritative GitHub Actions run ID and job ID;
22. workflow conclusion;
23. proof artifact ID, name, digest, and size — copied from authoritative GitHub artifact metadata, not guessed from a local archive;
24. frozen contract/evidence invariants;
25. PR #45 state/head/unmerged proof;
26. explicit confirmation that no production source was modified;
27. explicit statement:
   - `H-U5-P10 IS THE FINAL H-U5-P SESSION — NO P11 IS PLANNED OR AUTHORIZED.`

Before committing the evidence, cross-check every run/job/artifact/build identifier against the authoritative GitHub run/artifact output so the evidence does not repeat the P9 provenance mistake.

Do not edit canonical `../evidence/_ca-output.md`.

---

## 12. HARD STOP / RETURN BOUNDARY

If all gates pass, commit the evidence-only closure to `phase6-sync-integration-h` and stop.

P10 ends H-U5.

Do **not** create P11.

Do **not** begin G-R1 merely because turn capacity remains.

Do **not** begin combined G-R2/R3.

Do **not** begin production-structure normalization.

Do **not** begin H-FINAL.

Do **not** run physical iPhone synchronization.

Your final response must include:

1. `H_U5_P10_ENTRY_HEAD`;
2. `H_U5_P10_CANDIDATE_SHA`;
3. final evidence-bearing H head;
4. exact changed-file manifest;
5. concise fixture modernization summary;
6. focused diagnostics results;
7. foundation results;
8. H/V1.3 critical results;
9. H-I1 through H-I8 results;
10. whole-repository totals and exact delta from P9;
11. build result and artifact identity;
12. proof run/job/branch/workflow/artifact identifiers;
13. frozen-authority invariants;
14. PR #45 state;
15. blockers / unexpected classification delta;
16. confirmation that P10 ends H-U5 and no P11 was started.

End exactly with:

`H-U5-P10 COMPLETE — READY FOR SUPERVISOR REVIEW — H-U5 ENDS HERE — DO NOT START G-R1, G-R2/R3, PRODUCTION NORMALIZATION, OR H-FINAL`

If blocked, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

and do not self-authorize broader changes.