# Phase 6 H6C — Additive Diagnostic Correlation Repair

**Agent:** `agt-ca-p6-h6c-production-diagnostic-correlation-01`
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Required branch:** `phase6-h6c-production-diagnostic-correlation`
**Exact base:** `c6daa20ad287f395a99cf88943465a9ecc3159dd`

## Objective

Improve Phase 6 diagnostic correlation so validation can bind each production synchronization cycle to its **exact production diagnostic run and terminal diagnostic result**.

This task is **diagnostic instrumentation only**.

The synchronization engine itself is frozen.

No change may alter how the plugin:

* plans;
* authorizes;
* executes;
* mutates;
* resolves conflicts;
* persists synchronization authority;
* interacts with Google Drive;
* handles recovery;
* advances BASE/cursors;
* or determines synchronization outcomes.

---

# 1. MANDATORY PRE-EDIT ARCHIVE GATE

Any existing production-plugin source file that will be modified must first be preserved as an **exact pre-H6C archive copy**.

This gate occurs **before the first edit to that file**.

## 1.1 Archive location

Create:

`dev/agents/st2a/ph6/h6c/archive/`

Archive files must be stored there, **never under `src/`**.

They are evidence artifacts only.

They must:

* never be imported;
* never be referenced by production code;
* never participate in TypeScript compilation;
* never participate in the bundle;
* never affect runtime behavior.

## 1.2 Archive every production file before modifying it

For each production file you determine must change:

1. verify the working file exactly matches the required base version;
2. copy it byte-for-byte to the archive directory;
3. record its original repository path;
4. record its Git blob SHA;
5. record a SHA-256 hash of the archived bytes;
6. independently verify the archive bytes are identical to the exact base file;
7. only then begin editing the production file.

Use an unmistakable filename such as:

`product-controller-base.ts.pre-h6c-c6daa20.snapshot`

and, if needed:

`product-controller.ts.pre-h6c-c6daa20.snapshot`

Do **not** modify an archive after it has been created.

## 1.3 Base-source verification

The archive must represent the file at exactly:

`c6daa20ad287f395a99cf88943465a9ecc3159dd`

Do not merely trust the current working-tree file.

Verify the archived file against the exact Git object from that commit.

If they differ, STOP.

Do not edit production code until the discrepancy is resolved.

## 1.4 Archive manifest

Create:

`dev/agents/st2a/ph6/h6c/archive/manifest.md`

For every archived production file record:

* repository path;
* archive path;
* base commit;
* Git blob SHA;
* SHA-256;
* byte-for-byte verification result.

The manifest is immutable evidence of the original implementation.

---

# 2. AUTHORIZED CHANGE

You are authorized to add **narrow, additive production diagnostic plumbing** only where truly necessary to establish exact diagnostic correlation for:

1. manual preview → execution;
2. Verify/Reconcile preview → execution;
3. conflict resolution;
4. exact terminal production result.

New diagnostic and validation logic should be placed in separate diagnostic/validation modules wherever reasonably possible.

Prefer:

* `src/diagnostics/**`
* `src/validation/**`

over adding substantial new logic to production controller files.

Existing production controller files should contain only the **smallest explicit integration hooks necessary**.

---

# 3. PRODUCTION CODE SAFETY BOUNDARY

## 3.1 Completely frozen source families

Do NOT modify:

* `src/core/**`
* `src/drive/**`
* `src/local/**`
* `src/state/**`

Do NOT modify production executor implementation.

Do NOT modify synchronization contracts that govern planning, mutation, persistence, authority, or Drive protocol.

## 3.2 Controller files

The following are production plugin code:

* `src/product/product-controller-base.ts`
* `src/product/product-controller.ts`

They may be modified only if exact diagnostic correlation cannot otherwise be established cleanly.

Every modified production file must first pass the archive gate in Section 1.

Changes in these files must be limited to:

* establishing a diagnostic run;
* passing an existing diagnostic run ID;
* retaining diagnostic correlation metadata;
* exposing diagnostic identity through a read-only seam;
* emitting additive diagnostic evidence;
* terminating the corresponding diagnostic scope.

No other behavior may change.

---

# 4. TEN MANDATORY PRODUCTION INVARIANTS

Every production-file edit must satisfy all ten conditions:

1. no synchronization branch condition changes;
2. no planner input or output changes;
3. no plan operation selection or ordering changes;
4. no operation execution eligibility changes;
5. no local or remote mutation request changes;
6. no mutation result interpretation changes;
7. no BASE, mapping, tombstone, cursor, revision, generation, durable-intent, recovery, or first-sync authority changes;
8. no conflict-resolution behavior or user-action semantics change;
9. with diagnostics unavailable, production synchronization follows the same logical path and produces the same result as before H6C;
10. diagnostic failure remains non-authoritative and cannot alter synchronization success, failure, or physical effects.

If any required implementation violates even one invariant:

`CONTRACT CHANGE REQUEST`

and STOP.

---

# 5. ABSOLUTE PROHIBITIONS

Do NOT:

* redesign execution authority;
* introduce selective operation execution;
* execute arbitrary operation subsets;
* add `execute-safe-subset`;
* split plans to satisfy validation;
* change `executePlanned()` semantics;
* change `blocked-unsafe` semantics;
* change partial-safe-progress behavior;
* change conflict-resolution semantics;
* change planner output;
* change operation IDs;
* change plan IDs because diagnostics changed;
* introduce new synchronization mutation authority;
* change `UserAction` synchronization authority;
* change persisted synchronization-state shape;
* change plugin settings persistence shape;
* change Drive protocol/version;
* change Drive metadata;
* change OAuth behavior;
* change automatic synchronization behavior;
* fabricate production state;
* emit synthetic terminal success without a genuine production terminal outcome.

The existing product behavior allowing independent safe work to progress while path-local unsafe/conflicted work remains skipped is frozen.

---

# 6. D06 IS EXPLICITLY OUT OF SCOPE

Do NOT attempt to solve VH29/D06's mixed-plan validation-policy problem.

D06 remains a separate validation-protocol issue.

No H6C change may alter the plugin's execution-authority model to accommodate D06.

---

# 7. REQUIRED CODE INSPECTION

Before coding, inspect at minimum:

* `src/product/product-controller-base.ts`
* `src/product/product-controller.ts`
* `src/product/authority-execution-diagnostics.ts`
* `src/diagnostics/diagnostic-logger.ts`
* `src/diagnostics/sync-diagnostics.ts`
* `src/validation/production-path-driver.ts`
* `src/validation/validation-mode-runtime.ts`
* `src/validation/state-convergence-verifier.ts`

Trace exactly:

1. where manual diagnostic runs begin;
2. where `PlannedRun.diagnosticRunId` is retained;
3. how asserted execution receives/reuses it;
4. where terminal `sync-run-complete` is emitted;
5. why `previewVerifyReconcile()` lacks equivalent correlation;
6. how `resolveConflict()` currently constructs and executes its resolution plan;
7. where conflict-resolution diagnostic identity is lost;
8. how validation currently observes diagnostics.

Do not redesign these flows.

Add only the diagnostic correlation necessary to observe them accurately.

---

# 8. REQUIRED CORRELATION MODEL

Correlation must be exact and fail closed.

For each validation authority cycle retain:

`ValidationRunIdentity + authorityCycleId`

bound to:

* exact production diagnostic run ID;
* exact production plan ID where applicable;
* production request kind;
* exact terminal diagnostic result.

A later cycle must never overwrite or satisfy an earlier cycle.

Reject correlation that is:

* missing;
* stale;
* ambiguous;
* replaced;
* associated with another validation run;
* associated with another authority cycle.

Never use:

* timestamps;
* nearest-event inference;
* newest/latest event inference;
* validation-run identity as a substitute for production diagnostic identity;
* request acceptance as proof of synchronization completion.

---

# 9. REQUIRED TERMINAL PROOF

A successful production cycle must be proven by the exact diagnostic run bound to that authority cycle.

For successful execution require the appropriate exact terminal diagnostic, including:

* exact production diagnostic run ID;
* `component = sync.controller`;
* `event = sync-run-complete`;
* `stage = terminal`;
* exact expected `result`.

Failure and cancellation must remain distinguishable from successful completion.

`productionOutcomeEstablished` must remain false until exact terminal evidence independently establishes the production result.

---

# 10. REQUIRED SUPPORTED PATHS

Provide exact diagnostic correlation for at least:

### Manual

preview → assertion → execution → terminal.

### Verify/Reconcile

preview → assertion → execution → terminal.

### Conflict resolution

observed production conflict → authorized production resolution → exact production diagnostic run → exact terminal result.

### Final reconciliation

the reconciliation/stability cycles required by D02/D05.

---

# 11. REQUIRED FAILURE REGRESSIONS

Add deterministic tests proving fail-closed behavior for:

* absent production diagnostic run;
* wrong production diagnostic run;
* stale run;
* another validation run's diagnostic run;
* another authority cycle's diagnostic run;
* ambiguous correlation;
* missing terminal event;
* failed terminal event where completion is required;
* cancelled terminal event where completion is required;
* contradictory terminal evidence;
* accepted request without terminal proof;
* run A attempting to satisfy run B.

---

# 12. REQUIRED SUCCESS REGRESSIONS

Add deterministic tests proving exact correlation for:

* manual preview/execution;
* Verify/Reconcile preview/execution;
* conflict-resolution execution;
* exact terminal `sync-run-complete`;
* multiple sequential authority cycles without cross-cycle contamination.

---

# 13. MANDATORY PRODUCT NON-REGRESSION PROOF

Explicitly prove H6C did not alter existing plugin behavior for:

* mixed safe + `blocked-unsafe` plans;
* partial safe progress;
* planner output;
* semantic plan IDs;
* semantic operation IDs;
* conflict-resolution outcomes;
* automatic synchronization;
* first-sync completion;
* BASE authority;
* remote mappings;
* tombstones;
* cursors;
* durable intents/effects;
* local mutations;
* Drive mutations.

Existing synchronization regression tests must remain unchanged and pass.

Do not weaken or rewrite an existing product test merely to accommodate H6C.

---

# 14. ARCHIVE-BASED FINAL PRODUCTION REVIEW

Before committing the final implementation, compare every modified production file against its archived pre-H6C copy.

For each modified production file classify **every changed hunk** as one of:

* diagnostic run creation;
* diagnostic run propagation;
* diagnostic metadata exposure;
* diagnostic event emission;
* diagnostic lifecycle termination.

No production-file hunk may fall outside those categories.

Specifically inspect the comparison for accidental changes to:

* conditions;
* return values;
* synchronization calls;
* planner calls;
* executor calls;
* operation loops;
* error-handling authority;
* mutation calls;
* state writes;
* conflict decisions;
* recovery decisions.

If any unrelated change exists, remove it before completion.

The final evidence must include this archive-based comparison result.

---

# 15. BREAKING-CHANGE GATE

Explicitly verify before completion:

* persisted synchronization-state shape unchanged;
* settings persistence shape unchanged;
* Drive protocol unchanged;
* remote metadata unchanged;
* synchronization contracts unchanged;
* planner output unchanged;
* executor behavior unchanged;
* mutation sequence unchanged;
* plan IDs unchanged solely because diagnostics changed;
* operation IDs unchanged;
* conflict outcomes unchanged;
* ordinary desktop behavior unchanged;
* ordinary mobile behavior unchanged;
* no user action gained synchronization authority.

Any failure requires:

`CONTRACT CHANGE REQUEST`

and immediate stop.

---

# 16. VERIFICATION

Run:

* focused diagnostic/correlation tests;
* affected controller diagnostic tests;
* validation production-path-driver tests;
* validation runtime tests;
* state-convergence diagnostic tests;
* mixed-plan regression tests;
* affected conflict-resolution regressions;
* typecheck;
* complete automated test suite;
* build/check.

Do NOT run authoritative PHX-CI.

Do NOT perform physical Google Drive validation.

Do NOT use GitHub Actions.

---

# 17. EVIDENCE

Record:

1. exact base SHA;
2. exact implementation HEAD;
3. exact branch HEAD;
4. exact changed files;
5. exact production files modified;
6. archive path for every modified production file;
7. original Git blob SHA;
8. archive SHA-256;
9. archive/base byte-equivalence result;
10. every changed production hunk and its diagnostic-only classification;
11. manual diagnostic correlation path;
12. Verify/Reconcile correlation path;
13. conflict-resolution correlation path;
14. terminal-result correlation path;
15. deterministic regression results;
16. complete test/build results;
17. breaking-change audit;
18. explicit confirmation synchronization semantics are unchanged;
19. explicit confirmation D06 execution authority is unchanged.

---

# 18. STOP CONDITIONS

STOP with:

`CONTRACT CHANGE REQUEST`

if exact diagnostic correlation would require:

* planner semantic changes;
* executor semantic changes;
* plan splitting;
* selective operation execution;
* new mutation authority;
* persistence/schema migration;
* Drive protocol changes;
* changed conflict semantics;
* changed synchronization outcomes;
* weakened safety behavior.

Do not broaden the task.

Otherwise:

1. implement the additive diagnostic repair;
2. perform the archive-based production comparison;
3. run required verification;
4. commit/push the implementation and evidence;
5. stop for supervisor adversarial review.

Return:

1. result;
2. implementation HEAD;
3. branch HEAD;
4. exact changed files;
5. archived production files and hashes;
6. production files modified;
7. diagnostic correlation design;
8. archive-based diff audit;
9. proof synchronization semantics are unchanged;
10. breaking-change audit;
11. regression results;
12. verification results;
13. remaining blockers, if any.
