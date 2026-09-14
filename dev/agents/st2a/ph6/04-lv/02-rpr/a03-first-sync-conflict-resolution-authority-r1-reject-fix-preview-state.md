# C1-R1 REJECTION FIX — FIRST-SYNC PREVIEW-STATE TEST EXPECTATION

## REJECTION

Correction `C1-R1` is not yet complete.

Rejected candidate:

`REJECT_FIX_INPUT_SHA = 977c7c29b497f25ff35b43df3d58fd6788e5d256`

Continue on the existing branch:

`phase6-a03-first-sync-conflict-resolution-authority-repair-r1`

from exactly `REJECT_FIX_INPUT_SHA`.

Do not reset, rebase, restart from an earlier C1/R1 input, or amend the rejected commit. Commit this bounded correction normally.

Draft PR #60 remains the verification PR and must remain open/unmerged. PR #59 remains untouched and unmerged.

The current C1-R1 production correction is **retained**. Do not revert the REMOTE-present evidence correction, the `reviewed-first-sync-resolution` provenance marker, or either authority recognizer's requirement for that marker.

Authoritative failed verification:

- workflow run: `34184952026`
- job: `101931314799`
- HEAD: `977c7c29b497f25ff35b43df3d58fd6788e5d256`
- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npx tsc -p tsconfig.test.json` — PASS
- full `npm test` — FAIL
- focused C1 step — SKIPPED after full-suite failure
- later focused/build/check/diff/artifact steps — SKIPPED after full-suite failure

## SUPERVISOR DIAGNOSIS

The remaining known failure is a **test-harness expectation defect**, not evidence of a remaining production defect.

At `977c7c29...`, the no-BASE first-sync fixture was correctly changed so that it no longer pre-saves a trusted authority state and instead uses:

`expectation: "new-installation"`

when no BASE fixture is supplied.

That correctly models the actual first-sync invariant: a clean `uninitialized` preview must not write trusted synchronization authority.

However, `registerAndExecuteFirstSyncConflict()` still contains the stale pre-execution assertion:

```ts
const before = await h.store.load(h.context);
assert.equal(before.status, "trusted");
```

immediately after `previewManual()`.

For a genuine clean first-sync fixture, the correct state at that point is:

`uninitialized`

The preview is intentionally read-only. Trusted authority may be created only later through authoritative execution/verified commit. The existing post-`execute-plan` checks that safe first-sync work can establish trusted authority elsewhere remain semantically valid.

Do **not** repair this by restoring a pre-saved trusted fixture, switching the context back to `existing-pairing`, weakening the first-sync provenance requirement, or changing production behavior.

## BOUNDED CORRECTION

### Authorized file

Only:

`test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`

is authorized for this correction.

No `src/**`, contract, workflow, package, release, or other test-file changes are authorized by this rejection.

If correcting the stale expectation exposes a new production failure, stop and report that new evidence instead of expanding scope.

### Required test correction

In `registerAndExecuteFirstSyncConflict()`:

1. preserve the existing `previewManual()` call;
2. preserve the no-BASE/new-installation fixture behavior introduced at `977c7c29...`;
3. assert that the persisted state immediately after preview remains `uninitialized`;
4. remove or rewrite the now-inapplicable pre-execution `trusted`-only BASE/mapping branch so the helper expresses the actual invariant rather than unreachable legacy expectations;
5. preserve the subsequent `execute-plan` behavior and all existing assertions proving safe first-sync work can establish authority only through execution.

The intended pre-execution assertion is equivalent to:

```ts
const before = await h.store.load(h.context);
assert.equal(before.status, "uninitialized");
```

Do not seed authority merely to make the test pass.

## FROZEN BEHAVIOR

Preserve all currently reviewed C1-R1 production semantics, including:

- clean `uninitialized && !reconstruction` first-sync preview remains no-write;
- the original planning assembly is the source of first-sync provenance;
- `reviewed-first-sync-resolution` is emitted only for a non-reconstruction uninitialized first-sync resolution eligible for the bounded bootstrap;
- recovery-derived conflicts do not receive that provenance;
- both authority recognizers require the provenance marker in addition to the retained shape/evidence checks;
- exact fresh LOCAL validation;
- exact complete REMOTE reconciliation and REMOTE-present evidence;
- revision/object/content matching;
- duplicate-REMOTE rejection;
- ordinary no-BASE non-conflict mutation rejection;
- post-BASE ordinary authority requirements;
- immutable predecessor preservation;
- durable intent/effect verification and retry semantics;
- fail-closed recovery behavior.

Do not modify frozen contracts under `src/contracts/**`.

## ACCEPTANCE

The correction passes only if:

1. the pre-execution first-sync preview state is asserted as `uninitialized`;
2. no trusted state is pre-seeded for the no-BASE first-sync fixture;
3. the fixture still uses `new-installation` when no BASE exists;
4. all existing C1 Keep local / Keep remote / Keep both / manual cases pass;
5. stale LOCAL and changed/ambiguous REMOTE evidence still reject;
6. ordinary no-BASE non-conflict mutation still rejects;
7. durable verified-effect retry still avoids duplicate REMOTE dispatch;
8. the two existing Phase-5 C2 recovery-conflict regressions pass unchanged;
9. no production file changes are required;
10. no unrelated edits are carried.

## VERIFICATION

Run the existing fail-closed GitHub Actions verification from the final correction HEAD.

Required steps:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- full `npm test`
- standalone focused C1 first-sync conflict-resolution authority suite
- the workflow's existing focused callback/diagnostic/OAuth/export and recovery coverage
- `npm run build`
- `npm run check`
- `git diff --check`

Inspect raw TAP/log output, not only workflow conclusion badges.

Required proof:

- full `npm test`: `# fail 0`, zero `not ok`, and no regression in the established suite count;
- the dedicated C1 step actually executes and has zero failures;
- both named Phase-5 recovery C2 regressions pass;
- `npm run check` embedded tests: `# fail 0`, zero `not ok`;
- typecheck: PASS;
- standalone test TypeScript compilation: PASS;
- build: PASS;
- diff check: PASS.

Record:

- final HEAD;
- workflow run/job IDs;
- final raw test totals;
- final `main.js` byte size and SHA-256;
- artifact ID/digest/size when produced.

## CHANGE MANIFEST

Report the complete delta from:

`REJECT_FIX_INPUT_SHA = 977c7c29b497f25ff35b43df3d58fd6788e5d256`

to the final correction HEAD.

Expected delta: the single bounded test file above only.

Also confirm the previously reviewed production C1-R1 changes remain byte-for-byte retained unless the verification exposes a genuinely new production defect, in which case stop and report instead of changing them.

## COMPLETION RESPONSE

Return:

- correction ID `C1-R1`;
- exact branch;
- exact reject-fix input SHA;
- exact final HEAD;
- complete reject-input → final manifest;
- confirmation clean first-sync preview remains persisted `uninitialized` before execution;
- confirmation no trusted state is pre-seeded in the no-BASE fixture;
- confirmation first-sync provenance production logic was unchanged;
- full TAP totals;
- dedicated C1 result;
- both Phase-5 recovery C2 regression results;
- typecheck/test-compilation/build/check/diff-check results;
- `main.js` size/SHA-256;
- workflow run/job/artifact provenance;
- confirmation package version remains `0.1.9`;
- confirmation PR #60 remains open/unmerged and PR #59 remains unmerged;
- confirmation no release/tag/install/live Drive mutation/A03 resumption/B–O/Stage-3 activity occurred;
- any remaining blocker.

End exactly:

`C1-R1 PREVIEW-STATE TEST CORRECTION COMPLETE — READY FOR SUPERVISOR RE-REVIEW — LIVE VALIDATION NOT RESUMED`

## FINAL STOP

Stop after this bounded test correction and its clean verification evidence.

Do not merge PR #60.
Do not merge PR #59.
Do not merge into `phase6-integration`.
Do not release or tag.
Do not install.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.
