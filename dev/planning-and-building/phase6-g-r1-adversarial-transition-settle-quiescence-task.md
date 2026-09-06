# AGENT NAME: `agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01`

# SESSION 4 — G-R1 — ADVERSARIAL TRANSITION / SETTLE / QUIESCENCE REPAIR

## 0. AGENT IDENTITY / BOUNDED ASSIGNMENT

You are:

`agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the bounded **G-R1 adversarial-model repair agent** in the already-running Phase 6 H synchronization integration effort.

You are **not** starting a new integration effort.

You are **not** reopening H-U5. H-U5 ended with independently supervisor-approved H-U5-P10.

You are **not** authorized to modify production synchronization semantics.

You are **not** authorized to begin combined G-R2/R3, production-structure normalization, H-FINAL, or physical iPhone validation.

Your exact assignment is:

> Repair the eleven already-classified G-W1 adversarial-model failures by correcting the G-owned executable transition, recovery, settle, and quiescence model so those modeled scenarios converge or terminate in an explicit conflict/recovery state consistent with the frozen synchronization contracts, without weakening `assertQuiescentOrExplicit()` and without changing production source.

This is **Session 4 — G-R1** of the fixed remaining-session plan in:

`dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`

Do not broaden the package.

---

## 1. SUPERVISOR-APPROVED ENTRY STATE

The independently supervisor-approved H-U5-P10 final evidence-bearing H head is:

`03c2d7d478553427f56b4e827487081328d479f2`

At that approved head:

- H-U5 is complete;
- the whole repository is `687 total / 674 pass / 13 fail / 0 cancelled / 0 skipped/todo`;
- all 13 failures are the already-classified G-owned adversarial-model family;
- H/V1.3 critical remains `82 / 69 / 13 / 0`;
- H-I1 through H-I8 PASS;
- production build PASS;
- `main.js` is `699509` bytes with SHA-256 `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`;
- frozen contract/evidence authorities remain exact;
- PR #45 remains open, draft, and unmerged.

This tasking document is committed after that approved head as one supervisor planning-only commit.

At startup:

1. resolve the live head of `phase6-sync-integration-h`;
2. record it as `G_R1_ENTRY_HEAD`;
3. compare:
   - base: `03c2d7d478553427f56b4e827487081328d479f2`
   - head: `G_R1_ENTRY_HEAD`
4. require that this delta contains **only**:
   - `dev/planning-and-building/phase6-g-r1-adversarial-transition-settle-quiescence-task.md`
5. require that no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed in that delta.

If that exact entry condition is not satisfied, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not silently substitute another branch tip or SHA as authority.

Before editing, read completely:

1. `software-products-dev-manual-agent-led.md`
2. `dev/planning-and-building/phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. `dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12.md`
5. `test/adversarial-model/support/model.ts`
6. `test/adversarial-model/adversarial-model.test.ts`
7. the frozen contracts imported by the G model, especially folder-create recovery authority used by the test surface.

You may inspect any production source read-only where needed to understand the behavior being modeled. Inspection does not grant write authority.

---

## 2. FROZEN AUTHORITIES / NON-NEGOTIABLE SEMANTICS

Preserve all approved H/V1.3 behavior.

### 2.1 Frozen foundation

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

### 2.2 G modeling rule

The adversarial model exists to predict and challenge the approved production synchronization contracts. It must not redefine them.

The model must preserve, at minimum:

- exact BASE authority before transitions that require BASE authority;
- exact remote identity authority before identity-dependent mutation;
- durable intent before physical dispatch;
- no blind redispatch after uncertain physical outcome;
- verification before logical state commitment;
- crash/restart reconstruction from durable state only;
- conflict preservation for ambiguity;
- path-local failure isolation;
- watcher loss recoverability through authoritative reconciliation;
- destructive gating under stale/incomplete authority;
- stable remote identity where the contract requires it;
- acknowledged deletion history;
- bounded settle/quiescence after mutation pressure stops;
- exact frozen folder-create recovery behavior.

Operational failure provenance and physical-effect certainty remain orthogonal.

### 2.3 Critical prohibition

Do **not** make G pass by weakening:

`AdversarialSyncModel.assertQuiescentOrExplicit()`

The method must continue to require, for a non-conflict/non-recovery path, coherent convergence among:

- durable BASE;
- local state;
- exactly one active remote candidate;
- matching remote identity;
- matching content.

Do not turn unresolved paths into `conflict` or `recovery` merely as a blanket escape hatch. Explicit states must arise from modeled contract conditions.

---

## 3. EXACT WRITE OWNERSHIP

You may modify only:

1. `test/adversarial-model/support/model.ts`
2. `test/adversarial-model/adversarial-model.test.ts`

After the implementation candidate is fixed, you may create/update only your own evidence file:

`dev/evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01.md`

No other tracked file is authorized.

Explicitly forbidden without supervisor re-authorization:

- all `src/**` production files;
- all `src/contracts/**`;
- any non-G test file;
- canonical `dev/evidence/_ca-output.md`;
- any other evidence file;
- any planning file;
- any workflow file on `phase6-sync-integration-h`.

A disposable GitHub Actions workflow may exist only on a separate proof branch.

If correct repair of the G model reveals a genuine contradiction in the frozen production contracts or a new production defect that cannot be represented faithfully without production change, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not self-authorize production changes.

---

## 4. CURRENT FAILURE CLASSIFICATION

At the approved P10 baseline, the repository has exactly 13 failures, all in:

`test/adversarial-model/adversarial-model.test.ts`

G-R1 owns exactly these **11 G-W1 failures**:

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

G-R1 does **not** own these two failures:

- G-W2: `29 concurrent same-path creates never silently select one remote winner`
- G-W3: `G-C2 generic recover routes multiple folder journals by exact journal identity`

Those two remain intentionally deferred to **combined G-R2/R3**.

Do not fix G-W2 or G-W3 in this session unless a purely mechanical change to shared G model code is inseparable from the G-R1 repair. If a G-R1 change unexpectedly resolves one of them, record that outcome but do not broaden assertions or redesign their dedicated semantics. The supervisor must classify any such delta before the next session.

---

## 5. REQUIRED PRE-EDIT DIAGNOSIS

Before editing, reproduce or inspect each G-W1 failure closely enough to identify the model-state reason for non-convergence.

For each of the 11 failures, classify the defect inside the G model into one or more of these categories:

1. **transition omission** — a durable effect cannot advance through a required modeled stage;
2. **recovery omission** — restart/recovery fails to observe or resume a recoverable durable effect;
3. **settle scheduling defect** — `settle()` chooses the wrong next transition, stops too early, or repeatedly selects a non-progressing transition;
4. **stale-plan / dirty-path defect** — later local/remote evidence is not re-queued or reconciled after an earlier durable intent commits;
5. **identity/path bookkeeping defect** — BASE/path/remote identity is not migrated or retired consistently after move/create/delete;
6. **isolation defect** — one unresolved path prevents an independent safe path from progressing;
7. **watcher/integrity bookkeeping defect** — authoritative integrity discovery does not feed the normal reconciliation path;
8. **quiescence false-negative caused by valid explicit state not being recorded** — allowed only when the actual modeled condition truly requires conflict/recovery under frozen semantics.

Do not treat all 11 failures as one generic `settle()` bug without inspecting the causal state transitions.

Record the diagnosis in evidence, but keep code changes as small and coherent as possible.

---

## 6. REPAIR OBJECTIVES BY G-W1 FAMILY

### 6.1 Crash/restart stage survival — tests 03, 04, 05, 06

For upload, download, move, and trash, the model must survive crash/restart from each modeled durable physical-effect stage used by the tests:

- `intent-persisted`
- `dispatch-authorized`
- `outcome-unknown`
- `effect-verified`

Required behavior:

- `intent-persisted` work may be safely retired/replanned if no physical dispatch was authorized/applied;
- `dispatch-authorized` and `outcome-unknown` recovery must observe physical reality before redispatch;
- `effect-verified` work must be able to advance to state commitment/finalization after restart;
- no already-applied remote/local physical mutation may be blindly duplicated;
- BASE must not advance before required physical effects are verified and committed;
- final modeled state must either converge or be explicitly conflict/recovery for a contract-valid reason.

Pay special attention to the interaction between:

- `crash()` clearing volatile state;
- `restart()` reconstructing volatile state;
- `recover()` handling durable journals;
- `settle()` deciding whether to recover, advance, dispatch, or reconcile.

### 6.2 Durable intended L1 versus later L2 — test 10

Once L1 has become durable intended work, a later local L2 must not silently substitute for L1.

Required behavior:

- L1 remains the intended payload of the already-persisted journal;
- the remote side must observe L1 if that durable work successfully completes;
- the local side may remain at L2;
- after L1 commits, L2 must remain discoverable/reconcilable as later local work rather than being erased or falsely declared converged;
- no BASE update may pretend L2 was the content durably intended by the L1 journal.

Correct G bookkeeping/scheduling rather than mutating the test to accept lost L1 or overwritten L2.

### 6.3 Repeated remote moves — test 15

Repeated moves of the same remote object must preserve stable remote identity.

Required behavior:

- a remote move should migrate the local/BASE path association to the new path while preserving the mapped remote object ID;
- the prior path must not retain stale BASE authority that blocks or conflicts with the next move;
- after successive moves, the current BASE path must reference `r0` and remote `r0` must be at the current path;
- do not synthesize a new remote object simply to satisfy the test.

### 6.4 Create-delete acknowledged history — test 16

A locally created file that successfully synchronizes and is then deleted must preserve acknowledged deletion history.

Required behavior:

- initial create converges to a real BASE mapping;
- subsequent delete executes through the modeled destructive lifecycle;
- final BASE for the deleted path is absent;
- tombstone/acknowledged deletion history remains present;
- no stale create journal or dirty-path loop may keep the path falsely non-quiescent.

### 6.5 Path isolation — test 18

An unresolved/conflicting path A must not block independent safe path B.

Required behavior:

- path A reaches/stays explicit `conflict` where duplicate/independent remote authority requires it;
- path B continues through its upload lifecycle and updates BASE to `B1`;
- `settle()` must not globally stop simply because one path has explicit unresolved state;
- already-explicit path A must not continuously regenerate non-progressing work that starves B.

### 6.6 Watcher/integrity recovery — tests 19 and 20

A lost watcher event must be recoverable through an authoritative integrity read.

Required behavior:

- `integrity-reconcile` must mark newly observed local divergence/deletion as dirty when authoritative local evidence differs from BASE/cached evidence;
- normal reconcile/settle must then process that dirty path;
- local update in test 19 must advance BASE to `X1`;
- local deletion in test 20 must ultimately remove BASE through the correct modeled deletion lifecycle;
- do not special-case the test names; repair the general integrity-to-reconcile path.

### 6.7 Bounded quiescence — test 28

When mutation pressure stops and network/lifecycle are healthy, `settle("A", 30)` must reach quiescence in fewer than 30 transitions for the ordinary single-path upload case.

Required behavior:

- no infinite/repeated plan regeneration after successful finalization;
- no stale dirty flag after BASE has incorporated the intended work;
- no completed journal left as apparent pending work;
- no settle branch may repeatedly make semantically null state changes that reset the loop;
- do not raise the transition bound as the repair;
- do not suppress the final `assertQuiescentOrExplicit()`.

---

## 7. SETTLE / RECOVERY DESIGN CONSTRAINTS

Changes to `settle()` are permitted only insofar as they model legitimate scheduling of existing durable state transitions.

Preserve these constraints:

1. **Recovery before redispatch** for durable `dispatch-authorized` / `outcome-unknown` effects after restart or when recovery is needed.
2. **No blind transport-success synthesis** for an effect whose physical reality should first be authoritatively observed.
3. **Per-path progress**: explicit conflict/recovery on one path must not prevent safe work on another.
4. **No endless retry of the same non-progressing recovery journal** inside one settle call.
5. **Dirty-path semantics** must represent unresolved/new evidence, not simply whether the path was ever touched.
6. **Completed work must retire cleanly** so settle can terminate.
7. **Local evidence that changes after a durable intent was created must survive that intent's completion** and be available for a later reconcile.
8. **Crash/restart must not restore volatile plan/cache state that was not durable.**

The existing `attemptedRecoveryJournalIds` mechanism may be revised if needed, but do not replace it with a mechanism that hides unresolved durable work or skips required recovery.

---

## 8. TEST CHANGES

`test/adversarial-model/adversarial-model.test.ts` is owned because a model correction may require:

- adding focused regression assertions for the repaired G-W1 transition mechanics;
- tightening assertions so the repaired state machine cannot regress;
- adding a small deterministic helper test if required to prove the repaired generic behavior.

However:

- do not delete, skip, rename, weaken, or broaden away any of the 11 G-W1 tests;
- do not weaken test 29 or the G-C2 multi-folder identity test;
- do not change expected contract semantics merely to accommodate the current model;
- do not reduce randomized/adversarial coverage.

A pure `model.ts` repair with no test-file modification is acceptable if the existing tests fully prove the correction. In that case the source/test candidate manifest may contain only `model.ts`; the authorized two-file boundary is a maximum, not a requirement to touch both.

---

## 9. IMPLEMENTATION / COMMIT BOUNDARY

Perform G-R1 as one bounded G-owned source/test candidate.

Before committing:

- verify changed files are a subset of exactly:
  - `test/adversarial-model/support/model.ts`
  - `test/adversarial-model/adversarial-model.test.ts`
- run `git diff --check`;
- confirm no `src/**`, contract, planning, workflow, canonical-evidence, other test, or evidence file changed.

Record the candidate as:

`G_R1_CANDIDATE_SHA`

After the candidate is fixed, do not amend it with evidence.

Evidence must be a later evidence-only commit containing exactly:

`dev/evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01.md`

Record the final evidence-bearing H head separately.

---

## 10. AUTHORITATIVE PROOF PROCEDURE

Use a disposable GitHub Actions proof branch.

Preferred proof branch:

`g-r1-adversarial-transition-quiescence-proof-g01`

Preferred workflow:

`.github/workflows/g-r1-adversarial-transition-quiescence-proof.yml`

Requirements:

- workflow-only proof branch changes;
- checkout exact `G_R1_CANDIDATE_SHA` for source/test verification;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and enough history for exact diff checks;
- no source/test patching in workflow;
- no contract patching;
- no production mutation;
- no secret output;
- no merge of proof branch;
- no PR #45 mutation;
- preserve deterministic logs/artifacts;
- record real exit status for each test command.

The proof may continue after the expected two residual G failures so all verification gates execute, but it must not fabricate a successful full-suite exit.

---

## 11. REQUIRED VERIFICATION GATES

### Gate A — exact scope / frozen authority

Prove:

1. exact candidate checkout equals `G_R1_CANDIDATE_SHA`;
2. entry → candidate changed files are a subset of the two authorized G files and contain no other path;
3. `git diff --check G_R1_ENTRY_HEAD...G_R1_CANDIDATE_SHA` PASS;
4. `src/contracts/**` tree remains:
   - `0db68ced179825f929008b502335210260ca2ce3`
5. canonical evidence blob remains:
   - `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
6. contract-freeze blob remains:
   - `b675e0fc9776d03892a4309231b91a4bf0a84b93`
7. predecessor-prefix SHA-1 remains:
   - `fe527c76137b2cd578ef7050ee3444498b21a5e0`
8. tracked candidate worktree is clean.

### Gate B — install / static

Run:

- `npm ci`
- `npm run typecheck`
- test compilation equivalent used by the repository

All must PASS.

### Gate C — focused G adversarial model

Run the compiled equivalent of:

`test/adversarial-model/adversarial-model.test.ts`

Required classification:

- all 11 G-W1 tests listed in Section 4 PASS;
- no previously passing G test regresses;
- no cancellation/skip/todo introduced;
- only the two intentionally deferred failures remain:
  - G-W2 test 29 concurrent same-path create ambiguity;
  - G-W3 exact multi-folder-journal identity recovery test.

Real focused exit is therefore expected to remain nonzero because G-R2/R3 has not yet run.

Record exact focused totals and exact two residual test names.

If either deferred failure also becomes PASS as an inseparable consequence of a correct G-R1 model repair, do not deliberately re-break it. Record the exact delta and stop for supervisor classification before claiming G-R1 closure.

### Gate D — V1.3 foundation

Run the established V1.3 foundation proof.

Required:

- `17 / 17` PASS;
- C15 PASS;
- C16 PASS;
- 0 failure/cancellation;
- real exit `0`.

### Gate E — H/V1.3 critical regression

Run the established critical surface.

The planned post-G-R1 result is:

- total: `82`
- pass: `80`
- fail: `2`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

The only two failures must be the deferred G-W2/G-W3 tests.

H-I1 through H-I8 must remain PASS.

Any H/non-G critical regression is a hard blocker.

### Gate F — fresh whole-repository verification

Approved P10 baseline:

- total: `687`
- pass: `674`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`

Planned post-G-R1 result:

- total: `687`
- pass: `685`
- fail: `2`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`

Expected exact delta:

- `+11` pass;
- `-11` fail;
- total unchanged;
- cancellations unchanged at zero.

The only residual failures must be:

1. G-W2 — concurrent same-path create ambiguity;
2. G-W3 — exact multi-folder-journal recovery routing.

No H/non-G failure may remain or appear.

These counts are a classification prediction, not permission to weaken tests to force the numbers. Record and diagnose any actual delta before closure.

### Gate G — production build

Run production build.

Because G-R1 is test-only, production artifact identity is expected to remain exactly the approved P10 build:

- `main.js`: `699509` bytes
- SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`

Required:

- build PASS;
- record actual size/hash;
- if identity differs, stop and explain why a test-only G candidate affected production output.

### Gate H — final repository / PR invariants

Verify:

- no production source changed;
- no contract changed;
- candidate delta stays inside authorized G files;
- evidence-only commit changes only the G-R1 evidence file;
- canonical evidence unchanged;
- PR #45 remains open, draft, and unmerged;
- PR #45 remains headed by `phase6-sync-integration-h`;
- proof workflow remains off the integration branch.

---

## 12. EVIDENCE REQUIREMENTS

Create/update only:

`dev/evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01.md`

Record at minimum:

1. agent identity;
2. approved pre-task authority SHA `03c2d7d478553427f56b4e827487081328d479f2`;
3. `G_R1_ENTRY_HEAD` and proof that approved-head → entry changes only this task file;
4. `G_R1_CANDIDATE_SHA`;
5. final evidence-bearing H head;
6. exact entry → candidate manifest;
7. exact candidate → evidence-head manifest;
8. per-failure G-W1 causal diagnosis grouped by model defect class;
9. concise model repair description;
10. explicit confirmation `assertQuiescentOrExplicit()` was not weakened;
11. explicit confirmation no production source changed;
12. focused adversarial-model totals and the 11 G-W1 PASS statuses;
13. exact residual G-W2/G-W3 status;
14. V1.3 foundation results including C15/C16;
15. H/V1.3 critical totals and H-I1–H-I8 status;
16. whole-suite totals and exact P10 → G-R1 delta;
17. production build size/hash and identity comparison with P10;
18. proof branch;
19. proof workflow path;
20. workflow run ID;
21. job ID;
22. workflow conclusion;
23. proof artifact ID, name, digest, and size copied from authoritative GitHub metadata;
24. frozen authority values;
25. PR #45 state/head/unmerged proof;
26. blockers/unexpected classification delta, if any.

Cross-check run/job/artifact identifiers against authoritative GitHub metadata before committing evidence.

Do not edit canonical `dev/evidence/_ca-output.md`.

---

## 13. HARD STOP / RETURN BOUNDARY

If G-R1 completes within scope, commit the evidence-only closure and stop.

Do **not** begin combined G-R2/R3.

Do **not** begin production normalization.

Do **not** begin H-FINAL.

Do **not** run physical iPhone validation.

Your final response must include:

1. `G_R1_ENTRY_HEAD`;
2. `G_R1_CANDIDATE_SHA`;
3. final evidence-bearing H head;
4. exact changed-file manifest;
5. G-W1 diagnosis and repair summary;
6. focused G results;
7. V1.3 foundation results;
8. H/V1.3 critical results;
9. H-I1 through H-I8 status;
10. whole-repository totals and exact delta from P10;
11. build result/artifact identity;
12. proof run/job/branch/workflow/artifact identifiers;
13. frozen-authority invariants;
14. PR #45 state;
15. blockers/unexpected delta.

End exactly with:

`G-R1 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START G-R2/R3, PRODUCTION NORMALIZATION, OR H-FINAL`

If blocked, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

and do not self-authorize broader changes.