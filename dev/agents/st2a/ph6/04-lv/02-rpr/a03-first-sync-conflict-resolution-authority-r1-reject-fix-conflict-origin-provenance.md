# C1-R1 REJECTION FIX — BIND FIRST-SYNC BOOTSTRAP AUTHORITY TO EXACT CONFLICT ORIGIN

## REJECTION

Correction `C1-R1` remains incomplete.

Continue on the existing repair branch:

`phase6-a03-first-sync-conflict-resolution-authority-repair-r1`

from exactly:

`REJECT_FIX_INPUT_SHA = 94fe6ec8154a7f1eae49bab3e72f3b7ee67714ef`

Do not reset, rebase, restart from an earlier C1/R1 input, or amend the existing commit. Commit this bounded correction normally.

Draft PR #60 remains the verification PR and must remain open/unmerged. PR #59 remains untouched and unmerged.

No release, tag, install, live Drive mutation, A03 resumption, B–O work, merge into `phase6-integration`, or Stage 3 activity is authorized.

## AUTHORITATIVE FAILURE

Authoritative verification of `REJECT_FIX_INPUT_SHA`:

- workflow run: `34229784380`
- job: `102072746790`
- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npx tsc -p tsconfig.test.json` — PASS
- full `npm test` — **724 total / 723 pass / 1 fail**
- dedicated C1/build/check/diff/hash/artifact steps — correctly SKIPPED after the full-suite failure

The C1 first-sync tests themselves pass in the full suite.

The sole failure is the frozen Phase-5 regression:

`C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority`

with:

`TypeError: Cannot read properties of undefined (reading 'listForReconciliation')`

through:

`reviewedFirstSyncResolutionEvidenceCurrent()`
→ authoritative precondition validation
→ execution coordinator
→ `ProductController.resolveConflict()`.

The companion regression:

`C2 cursorless recovery-derived conflict subplan has no recovery-completion authority`

passes.

Do not modify `test/phase5-recovery-auth.test.ts` and do not add a fake `drive.listForReconciliation()` merely to make that test pass.

## CONFIRMED SUPERVISOR DIAGNOSIS

The remaining defect is in production provenance handling, not in the frozen Phase-5 test.

The current implementation computes first-sync bootstrap eligibility inside `resolveConflict()` from the mutable current planning assembly:

```ts
const reviewedFirstSyncResolution =
  !current.assembly.reconstruction
  && current.assembly.input.state.status === "uninitialized";
```

That is insufficient because `resolveConflict()` itself constructs and stores a synthetic conflict-resolution assembly with:

- `reconstruction: false`; and
- the copied original `input.state`, which can still be `uninitialized`.

For a recovery-derived conflict, the first resolution attempt correctly begins from `reconstruction === true` and therefore does not receive the first-sync marker. But `resolveConflict()` installs the synthetic `resolutionAssembly` into `this.planned` before execution. If that resolution is rejected, a subsequent recovery conflict is evaluated against the synthetic assembly rather than the original recovery plan.

At that point the mutable current assembly can satisfy:

`!reconstruction && state.status === "uninitialized"`

and the second recovery-derived conflict can be incorrectly marked:

`reviewed-first-sync-resolution`

That lets it enter the exceptional no-BASE first-sync bootstrap path and reach `reviewedFirstSyncResolutionEvidenceCurrent()`. The frozen multi-conflict recovery regression exposes exactly this loss of origin provenance.

The authority defect therefore is:

> first-sync bootstrap eligibility is inferred from mutable/synthetic current-plan state at resolution time instead of being bound to the exact conflict's immutable origin when that conflict was registered from the real planning assembly.

A fix that merely restores `this.planned` after a rejected resolution, flips `resolutionAssembly.reconstruction` back to true, weakens the recognizers, or adds an executor fallback is insufficient and must not be used as the authority fix.

## REQUIRED CORRECTION

### Core invariant

The exceptional no-BASE first-sync authority may be available only when the **exact conflict being resolved** originated from a plan assembled as:

- `assembly.reconstruction === false`; and
- `assembly.input.state.status === "uninitialized"`.

That eligibility must be captured from the real planning assembly when the conflict is registered and must remain stable for that exact conflict across later synthetic resolution subplans.

It must not be recomputed from `this.planned.assembly` during `resolveConflict()`.

### Required producer-side provenance model

Implement an internal controller-owned provenance association keyed to the registered conflict identity, or an equivalent internal representation with the same semantics.

The expected minimal pattern is:

1. when `refreshConflicts(...)` registers conflicts for a newly created real plan, also record for each conflict whether its origin assembly is a genuine reviewed first-sync origin;
2. derive that value only from the assembly used to create/register that plan:

```ts
!assembly.reconstruction
&& assembly.input.state.status === "uninitialized"
```

3. on a later `resolveConflict(conflictId, ...)`, derive `reviewedFirstSyncResolution` from the stored provenance for that exact conflict;
4. if the provenance entry is absent, fail closed: the conflict is not eligible for first-sync bootstrap authority;
5. do not derive eligibility from the synthetic `resolutionAssembly`, current mutable planner state, reason codes, or executor state;
6. when a fresh real plan is created/replanned and conflicts are re-registered, rebuild provenance from that new real assembly so stale provenance cannot leak across plans;
7. when a conflict is removed after successful authoritative completion, remove its associated provenance without disturbing provenance retained for other unresolved conflicts from the same real plan.

A private map keyed by conflict ID is acceptable. An equivalent internal controller representation is acceptable if it demonstrably enforces the same exact-origin invariant. Do not alter public/frozen contracts merely to store this controller-internal fact.

### Preserve the downstream marker

Retain the existing operation reason marker:

`reviewed-first-sync-resolution`

but treat it only as the downstream representation of already-established exact conflict-origin provenance.

Both existing authority recognizers must continue to require that marker **plus** all existing exact shape/evidence requirements.

Do not relax either recognizer.

### Preserve intentional synthetic resolution semantics

Do not change the existing intentional behavior that the resolution subplan uses:

- `reconstruction: false`; and
- `nextCursor: undefined`.

Those semantics prevent a cursorless conflict-resolution subplan from independently claiming recovery completion. They are not the authority proof and must remain separate from first-sync-origin provenance.

### Preserve retained C1-R1 corrections

Do not regress:

- `remoteExact()` REMOTE `path-observation: present` evidence;
- exact REMOTE object/revision/content evidence;
- exact fresh LOCAL evidence validation;
- complete REMOTE reconciliation;
- duplicate-REMOTE rejection;
- changed REMOTE revision/identity rejection;
- ordinary BASE/path-convergence/mapping authority after first sync;
- ordinary no-BASE non-conflict mutation rejection;
- immutable predecessor preservation;
- durable intent/effect verification and retry behavior;
- fail-closed recovery semantics;
- no-write clean first-sync preview semantics.

## AUTHORIZED OWNERSHIP

Production file authorized for this correction:

- `src/product/product-controller-base.ts`

Test file authorized if necessary for direct regression proof:

- `test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`

Frozen acceptance test:

- `test/phase5-recovery-auth.test.ts` — **DO NOT MODIFY**

Do not modify `src/contracts/**`, `src/core/execution-coordinator.ts`, or `src/product/authoritative-production-executor-base.ts` unless a new independently demonstrated defect proves such a change is unavoidable. If that occurs, stop and report the evidence instead of silently expanding scope.

Do not change workflow/package/release metadata for this correction.

## REQUIRED REGRESSION PROOF

### R1 — multi-conflict recovery provenance cannot drift

Prove the frozen multi-conflict recovery behavior remains fail-closed across sequential resolution attempts:

- conflicts originate from a reconstruction/recovery plan;
- the first attempted resolution does not receive first-sync provenance and is rejected without bootstrap authority;
- even after that attempt installs a synthetic resolution subplan into `this.planned`, a second unresolved recovery conflict still does not receive first-sync provenance;
- it remains rejected under ordinary recovery authority rules;
- it does not enter first-sync bootstrap evidence reconciliation merely because the synthetic assembly says `reconstruction: false` and carries `uninitialized` input state;
- recovery authority is not cleared or completed by the conflict subplan.

The existing frozen Phase-5 failing test must pass unchanged.

### R2 — single recovery conflict remains fail-closed

The existing cursorless recovery-derived conflict regression must remain passing unchanged.

### R3 — genuine first-sync multi-conflict provenance survives subplans

Add or retain direct C1 regression proof that a genuine non-reconstruction `uninitialized` first-sync plan with at least two unresolved conflicts registers first-sync provenance independently for each conflict.

After resolving one conflict and thereby replacing `this.planned` with a synthetic resolution subplan, resolution of a second conflict from the same original first-sync plan must still be eligible for the bounded bootstrap **because its own stored origin provenance says so**, not because of the synthetic current assembly.

This guards against a superficial recovery fix that breaks chained genuine first-sync conflict resolution.

### R4 — fresh replan replaces provenance

Prove that when a real plan is freshly created/replanned and conflicts are re-registered, conflict-origin provenance is rebuilt from that assembly. Provenance from a prior plan/conflict must not leak by path or stale conflict identity.

### R5 — missing provenance fails closed

A conflict resolution that lacks matching registered first-sync-origin provenance must not receive `reviewed-first-sync-resolution` and must not enter the exceptional no-BASE bootstrap.

### R6 — retain all C1 evidence gates

Existing tests must continue proving:

- Keep local succeeds for genuine reviewed first sync;
- Keep remote succeeds where supported;
- Keep both succeeds where supported;
- manual resolution succeeds where supported;
- stale LOCAL evidence rejects before mutation;
- changed REMOTE revision rejects;
- changed REMOTE identity rejects;
- duplicate REMOTE identity rejects;
- ordinary no-BASE upload/update remains rejected;
- post-BASE behavior uses ordinary authority;
- durable verified-effect retry does not duplicate the REMOTE mutation.

## PROHIBITED SHORTCUTS

Do not solve the failure by:

- adding `listForReconciliation()` to the frozen recovery test double;
- weakening or bypassing `reviewedFirstSyncResolutionEvidenceCurrent()`;
- making Drive reconciliation optional for bootstrap authority;
- removing exact REMOTE evidence requirements;
- removing the `reviewed-first-sync-resolution` requirement;
- treating any `uninitialized` state as first-sync provenance;
- treating `reconstruction: false` on a synthetic resolution assembly as proof of first-sync origin;
- using user-resolution reason codes alone as provenance;
- restoring `this.planned = current` after rejection as the sole authority fix;
- setting `resolutionAssembly.reconstruction = true` as the authority fix;
- modifying frozen Phase-5 recovery tests;
- broadening no-BASE mutation authority.

A restore of planner UI/state after rejection may be implemented only if independently required for correct product behavior, but it does not substitute for exact conflict-origin provenance and is outside this repair unless directly necessary.

## VERIFICATION

Run the existing fail-closed GitHub Actions verification from the final correction HEAD.

Required:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- full `npm test`
- dedicated C1 first-sync conflict-resolution authority suite
- existing focused recovery/callback/diagnostic/OAuth/export suites required by the workflow
- `npm run build`
- `npm run check`
- `git diff --check`

Inspect raw TAP/log output. Do not infer success from workflow status alone.

Required acceptance evidence:

- full suite: zero `not ok`, `# fail 0`, and at least the existing 724-test surface;
- frozen Phase-5 multi-conflict recovery regression: PASS unchanged;
- frozen Phase-5 cursorless recovery regression: PASS unchanged;
- dedicated C1 suite: actually executed, zero failures;
- genuine multi-conflict first-sync provenance regression: PASS;
- multi-conflict recovery provenance regression: PASS;
- typecheck: PASS;
- standalone test TypeScript compile: PASS;
- build: PASS;
- `npm run check`: zero `not ok`, `# fail 0`;
- diff whitespace check: PASS.

Record:

- final HEAD;
- workflow run/job IDs;
- raw full-suite totals;
- dedicated/focused test results;
- `main.js` final byte size and SHA-256;
- workflow artifact ID/digest/size when produced.

If any required test fails after this correction, do not claim completion. Stop and report the exact failure and production/test path.

## CHANGE MANIFEST

Report the complete delta from:

`REJECT_FIX_INPUT_SHA = 94fe6ec8154a7f1eae49bab3e72f3b7ee67714ef`

Expected production ownership is confined to:

`src/product/product-controller-base.ts`

plus direct C1 regression coverage if necessary in:

`test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`

Explicitly confirm `test/phase5-recovery-auth.test.ts` is unchanged.

Also report the complete cumulative C1-R1 delta from original:

`R1_INPUT_SHA = 0226366cba21a1c31651891c6e7d4ba0a5b33335`

to final HEAD so supervisor review can detect unrelated carryover.

## COMPLETION RESPONSE

Return:

- correction ID `C1-R1`;
- exact branch;
- exact reject-fix input SHA;
- exact final HEAD;
- reject-input → final manifest;
- original R1 input → final manifest;
- exact internal mechanism used to bind provenance to the registered conflict origin;
- confirmation eligibility is never recomputed from a synthetic resolution assembly;
- confirmation recovery-derived conflicts never receive first-sync provenance merely because a prior resolution attempt changed `this.planned`;
- confirmation genuine multi-conflict first-sync resolutions retain provenance for each registered conflict;
- confirmation missing/stale provenance fails closed;
- confirmation both authority recognizers remain unchanged and still require the marker plus exact evidence;
- confirmation `remoteExact()` REMOTE-present correction remains intact;
- confirmation frozen Phase-5 recovery tests are unchanged;
- full TAP totals;
- dedicated C1 results;
- both named Phase-5 recovery regression results;
- typecheck/test-compile/build/check/diff-check results;
- `main.js` byte size/SHA-256;
- workflow run/job/artifact provenance;
- confirmation package version remains `0.1.9`;
- confirmation PR #60 remains open/unmerged and PR #59 remains untouched/unmerged;
- confirmation no release/tag/install/live Drive mutation/A03 resumption/B–O/Stage-3 activity occurred;
- any remaining blocker.

End exactly:

`C1-R1 CONFLICT-ORIGIN PROVENANCE CORRECTION COMPLETE — READY FOR SUPERVISOR RE-REVIEW — LIVE VALIDATION NOT RESUMED`

## FINAL STOP

Stop after this bounded correction and its verification evidence.

Do not merge PR #60.
Do not merge PR #59.
Do not merge into `phase6-integration`.
Do not release or tag.
Do not install.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.
