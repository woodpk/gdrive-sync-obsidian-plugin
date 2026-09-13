# PHASE 6 A03 — FIRST-SYNC LIFECYCLE PROVENANCE REPAIR R2

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`agt-ca-p6-a03-first-sync-lifecycle-provenance-repair-r2-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Create a repair branch from exactly:

`R2_INPUT_SHA = 7f99dead11aeefcb26c2c188c4a6785686f87ec1`

Required branch:

`phase6-a03-first-sync-lifecycle-provenance-repair-r2`

Do not substitute a branch tip or later tasking commit.

This is a **bounded production repair** for the exact live A03 failure observed in prerelease `0.1.10`.

Do not redesign synchronization architecture.
Do not change release/install behavior.
Do not perform live synchronization.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.

---

## 1. CONFIRMED ROOT CAUSE — DO NOT REDIAGNOSE FROM SCRATCH

The live failure is now causally established.

### 1.1 Live evidence

The `0.1.10` A03 run began with:

- `firstSyncCompleted=false`;
- `recoveryInProgress=false`;
- trusted persisted synchronization state (`state:42`, later `state:55`);
- 12 BASE entries / 12 remote mappings;
- no BASE or remote mapping for `__brain_sync_portable_config__/app.json`;
- one unresolved no-BASE first-sync conflict for that path.

A fresh Verify/Reconcile produced 13 noops + 1 unresolved conflict. One authorized `Keep local` attempt then failed with:

`BRAIN sync requires recovery: exact BASE authority unavailable for __brain_sync_portable_config__/app.json`

No physical mutation occurred.

Evidence package:

`dev/evidence/2026-09-07T0010-P6LIVE/A03-0.1.10-resumption-20260908-154416/`

Hard-stop report:

`A03-FAIL-HARD-STOP.md`

### 1.2 Exact production defect

Current `ProductControllerBase.refreshConflicts(...)` determines reviewed first-sync origin with:

```ts
const reviewedFirstSyncOrigin = !assembly.reconstruction && assembly.input.state.status === "uninitialized";
```

That criterion is wrong.

`ensureTrustedState(...)` deliberately persists an initial trusted synchronization state before executing a first-sync plan. Therefore a first-sync plan that safely commits/records non-conflict work but remains incomplete because of an unresolved conflict transitions the state store from `uninitialized` to `trusted` **without completing first sync**.

When that incomplete first-sync session is later freshly replanned:

- `firstSyncCompleted` is still false;
- `recoveryInProgress` is false;
- but `assembly.input.state.status` is now `trusted`.

The current code therefore records the surviving conflict with `reviewedFirstSyncOrigin=false`.

Later `resolveConflict(...)` omits the `reviewed-first-sync-resolution` marker.

Then `AuthorityCompleteExecutionCoordinator` correctly refuses the exceptional no-BASE bootstrap and falls through to ordinary BASE authority resolution.

Because the unresolved path still intentionally has no BASE/path-convergence authority, `resolveAuthorityCompleteOperation(...)` returns:

`exact BASE authority unavailable for __brain_sync_portable_config__/app.json`

That is the exact live error.

### 1.3 Why the automated suite passed

The current C1 tests proved:

- a genuinely uninitialized first-sync conflict can resolve;
- multiple conflicts retain their original provenance across synthetic resolution subplans;
- recovery-derived conflicts do not accidentally acquire first-sync authority.

But they did **not** reproduce the real lifecycle transition:

1. start first sync while state is uninitialized;
2. execute the reviewed plan enough for `ensureTrustedState(...)` to create trusted durable state;
3. leave first sync incomplete because a conflict remains;
4. create a **fresh real Verify/Reconcile plan** while persisted state is now trusted but `firstSyncCompleted=false`;
5. resolve the still-first-sync conflict.

That missing regression allowed the defect through.

---

## 2. REQUIRED SEMANTIC FIX

First-sync conflict bootstrap eligibility must follow the **durable product first-sync lifecycle**, not the transient state-store load classification.

The authoritative product lifecycle is already represented by runtime settings:

- first sync is active when `firstSyncCompleted === false` and `recoveryInProgress === false`;
- first sync is no longer active once `firstSyncCompleted === true`;
- recovery is not first sync when `recoveryInProgress === true`;
- reconstruction assemblies remain ineligible regardless.

Implement an explicit dynamic controller option, e.g.:

```ts
readonly firstSyncActive?: () => boolean;
```

or an equivalently narrow name/shape.

Wire it in `ProductRuntime` from the live settings:

```ts
firstSyncActive: () => {
  const live = this.host.settings();
  return !live.firstSyncCompleted && !live.recoveryInProgress;
},
```

Then `refreshConflicts(...)` must capture exact conflict-origin eligibility from the real plan using the dynamic lifecycle signal plus reconstruction exclusion, e.g. semantically:

```ts
const reviewedFirstSyncOrigin =
  !assembly.reconstruction
  && this.options.firstSyncActive?.() === true;
```

Do **not** use `assembly.input.state.status === "uninitialized"` as the decisive first-sync lifecycle criterion.

Do **not** use `stateContext.expectation === "new-installation"` as the sole replacement. `stateContext` is fixed for the controller lifetime and can become stale immediately after first-sync completion; the eligibility signal must reflect current durable runtime settings dynamically.

The existing per-conflict provenance map remains the correct mechanism for preserving exact origin across synthetic conflict-resolution subplans. Do not replace it with path-global or mutable current-plan inference.

---

## 3. FROZEN DOWNSTREAM AUTHORITY CONTRACT

The downstream C1-R1 authority design is not rejected.

Keep unchanged unless a new independently demonstrated contradiction makes this impossible:

- marker: `reviewed-first-sync-resolution`;
- strict operation-shape recognition in `src/core/execution-coordinator.ts`;
- exact LOCAL present/content/token evidence;
- exact REMOTE present/content/object/revision evidence;
- ordinary BASE authority for non-first-sync updates;
- unique identity authority rules;
- authoritative executor evidence revalidation;
- immutable-candidate/predecessor preservation behavior;
- durable-intent/retry safety;
- recovery fail-closed behavior.

Do not weaken `reviewedFirstSyncResolutionMayBootstrapAuthority(...)`.
Do not bypass `resolveAuthorityCompleteOperation(...)` globally.
Do not fabricate BASE entries before physical success.
Do not create a special case keyed to `app.json`.
Do not infer authority from user action alone.

---

## 4. AUTHORIZED PRODUCTION SURFACE

Production changes are authorized only in:

- `src/product/product-controller-base.ts`
- `src/product/runtime.ts`

Test changes are authorized in:

- `test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`

If a new production defect proves another file is truly required, stop and report it instead of silently widening scope.

Frozen unless that stop condition is reached:

- `src/core/execution-coordinator.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/contracts/**`
- `src/state/**`
- `src/product/snapshot-assembler.ts`
- existing Phase-5 recovery tests
- workflows
- release metadata

---

## 5. REQUIRED REGRESSION — EXACT LIVE LIFECYCLE

Add one direct regression that fails on the current R2 input and passes only with the lifecycle fix.

Required sequence:

1. Start with no trusted state and at least one LOCAL/REMOTE no-BASE conflict.
2. Model product first-sync lifecycle as active (`firstSyncCompleted=false`, `recoveryInProgress=false`).
3. Create and execute a reviewed first-sync plan.
4. Prove execution causes the persistent state store to become `trusted` via normal `ensureTrustedState(...)` behavior while the unresolved conflict keeps first sync incomplete.
5. Do **not** mark first sync complete.
6. Create a **fresh** Verify/Reconcile plan from that now-trusted state.
7. Prove the surviving exact conflict still has reviewed first-sync origin because the durable first-sync lifecycle remains active.
8. Resolve `Keep local`.
9. Require acceptance and exactly one remote update dispatch.
10. Require durable verified success and authoritative BASE/mapping establishment for the resolved path according to existing behavior.

The test must explicitly prove that the second/fresh plan's state load is `trusted`; otherwise it does not reproduce the live defect.

---

## 6. REQUIRED NEGATIVE REGRESSIONS

Add/retain proof that:

### N1 — completed first sync cannot retain bootstrap authority

Using the same controller/runtime-lifecycle mechanism, once the live first-sync lifecycle signal changes to completed, a fresh plan must not grant the no-BASE exceptional marker merely because the controller was originally constructed during first sync.

This specifically prevents a stale `stateContext`/controller-lifetime signal from broadening authority after completion.

### N2 — recovery remains ineligible

When recovery is active or `assembly.reconstruction === true`, the conflict must not receive reviewed-first-sync bootstrap authority.

The frozen Phase-5 recovery regressions must remain unchanged and pass.

### N3 — existing C1 safety gates remain

Retain all existing C1 cases, including:

- genuine first-sync Keep local;
- Keep remote;
- Keep both update leg;
- manual resolution;
- stale LOCAL rejection;
- changed REMOTE revision/identity rejection;
- duplicate REMOTE rejection;
- ordinary no-BASE update rejection outside first sync;
- post-BASE ordinary authority;
- durable verified-effect retry does not duplicate physical mutation;
- genuine multi-conflict provenance survives synthetic subplans;
- missing provenance fails closed.

---

## 7. IMPLEMENTATION CONSTRAINTS

Do not solve this by:

- changing the live evidence;
- changing the physical validation procedure;
- resetting synchronization state;
- forcing state back to `uninitialized`;
- marking first sync complete before all conflicts resolve;
- granting bootstrap whenever BASE is missing;
- granting bootstrap whenever `firstSyncCompleted=false` without also excluding recovery;
- using a fixed controller-construction snapshot that remains true after completion;
- weakening exact evidence validation;
- bypassing downstream authority checks;
- changing recovery tests to accept the behavior;
- adding fake Drive behavior to recovery fixtures.

The required repair is a lifecycle-provenance correction, not an authority relaxation.

---

## 8. VERIFICATION

Run from the exact repair head:

1. `npm ci`
2. `npm run typecheck`
3. `npx tsc -p tsconfig.test.json`
4. full `npm test`
5. dedicated C1 suite
6. existing focused recovery/callback/diagnostic/OAuth/export suites used by Phase 6 verification
7. `npm run build`
8. `npm run check`
9. `git diff --check R2_INPUT_SHA...HEAD`

Acceptance requires:

- every command exits `0`;
- raw full TAP has zero `not ok` and `# fail 0`;
- full test count is not lower than the current 727 baseline;
- dedicated C1 suite fully passes;
- both named Phase-5 recovery conflict regressions pass unchanged;
- exact-live-lifecycle regression proves fresh trusted-state replan remains eligible while first sync is incomplete;
- completed-first-sync negative proves eligibility disappears dynamically;
- build/check/typecheck/test compilation all pass;
- diff contains only authorized files;
- no release/tag/install/live-sync action occurs.

Do not rely on a green badge alone; inspect raw TAP/logs.

---

## 9. COMPLETION RESPONSE

Return:

- branch;
- exact final HEAD;
- changed-file manifest;
- concise statement of implemented lifecycle rule;
- exact new live-lifecycle regression name and result;
- completed-first-sync negative result;
- frozen recovery regression results;
- full raw test totals;
- focused C1 totals;
- build/check/typecheck/test-compile results;
- confirmation no live validation/release/install occurred;
- any blocker.

End exactly:

`A03 FIRST-SYNC LIFECYCLE PROVENANCE REPAIR R2 COMPLETE — READY FOR SUPERVISOR REVIEW — LIVE VALIDATION NOT RESUMED`

---

## 10. STOP

Stop after implementation and verification.

Do not merge.
Do not release.
Do not install.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.
