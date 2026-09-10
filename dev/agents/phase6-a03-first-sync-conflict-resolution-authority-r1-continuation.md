# C1-R1 BOUNDED CONTINUATION — FIRST-SYNC BOOTSTRAP PROVENANCE ISOLATION

## REJECTION

Correction `C1-R1` is not complete.

Continue on:

`phase6-a03-first-sync-conflict-resolution-authority-repair-r1`

from exactly:

`CONTINUATION_INPUT_SHA = bfe444a575e0830f48ae08e3e9334fd6f63a333d`

Do not reset, rebase, restart from `0226366cba21a1c31651891c6e7d4ba0a5b33335`, or create a replacement implementation from the original release input.

Do not amend the existing `bfe444...` commit. Commit the continuation normally.

Draft PR #60 remains the verification PR and must remain open/unmerged. PR #59 remains untouched and unmerged.

The R1 `remoteExact()` correction is **retained**. It is correct and must not be reverted.

Authoritative run:

- Run: `34181332865`
- Job: `101920879922`

proved:

- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npx tsc -p tsconfig.test.json` — PASS
- full `npm test` — **724 tests / 722 pass / 2 fail**
- all C1 first-sync authority cases executed within the full suite — PASS
- later dedicated/build/check/artifact steps — correctly SKIPPED after the full-suite failure

The two failures are:

1. `C2 recovery conflict mutation remains blocked until fresh reconstruction establishes durable authority`
2. `C2 cursorless recovery-derived conflict subplan has no recovery-completion authority`

Both throw:

`TypeError: Cannot read properties of undefined (reading 'listForReconciliation')`

from:

`reviewedFirstSyncResolutionEvidenceCurrent()`

The standalone dedicated-C1 workflow step did **not** run because the preceding full-suite step failed. Do not report it as a separately executed PASS until a clean run actually reaches that step.

### Supervisor diagnosis

This is **not merely stale test-fixture fallout** and must not be repaired by adding a fake Drive reconciliation port to `test/phase5-recovery-auth.test.ts`.

The `remoteExact()` correction now gives recovery-derived conflict-resolution operations the same complete two-sided evidence shape as a genuine first-sync conflict resolution.

The retained C1 bootstrap recognizers currently infer “reviewed first-sync resolution” from:

- no BASE authority;
- Keep-local / Keep-remote / manual reason;
- exact two-sided conflict evidence.

A recovery-derived conflict can have that same shape.

Therefore a recovery-derived resolution can now enter the exceptional no-BASE first-sync bootstrap path. In the tests this reaches `listForReconciliation()` on an intentionally minimal executor and throws. With a real production Drive port it could proceed farther and potentially receive authority that is reserved specifically for reviewed **first-sync**, violating the recovery authority boundary.

The bootstrap exception needs explicit provenance that the conflict originated from a reviewed, non-reconstruction, uninitialized first-sync plan.

Do not weaken the fresh evidence checks. Do not change the recovery tests to accommodate bootstrap authority.

## REPAIR TOPOLOGY

### G1 — first-sync bootstrap provenance isolation

- **Execution class:** `SERIAL-SHARED-OWNER`
- **Owner:** `agt-ca-p6-a03-first-sync-conflict-resolution-authority-r1-01`
- **Owns:** the controller → authority-completion → authoritative-executor provenance seam for this bounded C1 exception
- **Depends on:** retained R1 correction at `bfe444a575e0830f48ae08e3e9334fd6f63a333d`
- **May run with:** none

## FROZEN BOUNDARIES

Preserve:

- the corrected REMOTE `path-observation: present` emitted by `remoteExact()`;
- all existing Keep local / Keep remote / Keep both / manual user-resolution semantics;
- existing user-resolution reason codes:
  - `user-keep-local`
  - `user-keep-remote`
  - `user-manual-resolution`
- exact fresh LOCAL evidence validation;
- exact complete REMOTE reconciliation;
- revision/object/content matching;
- duplicate-REMOTE rejection;
- ordinary BASE/path-convergence/mapping authority after first sync;
- immutable predecessor preservation;
- durable intent/effect verification and recovery;
- fail-closed recovery semantics;
- the existing `resolutionAssembly.nextCursor = undefined` behavior that prevents a conflict-resolution subplan from completing recovery by itself.

Do not modify frozen contracts under `src/contracts/**`.

Do not create broad no-BASE mutation authority.

## GROUP WORK ORDERS

### G1 — first-sync bootstrap provenance isolation

#### Ownership

Authorized production files:

- `src/product/product-controller-base.ts`
- `src/core/execution-coordinator.ts`
- `src/product/authoritative-production-executor-base.ts`

Authorized tests:

- `test/phase6-a03-first-sync-conflict-resolution-authority.test.ts` only if directly necessary for this correction.

Treat the existing recovery regressions in:

`test/phase5-recovery-auth.test.ts`

as frozen acceptance tests. Do **not** make their fake executor supply `drive.listForReconciliation()` merely to satisfy the new code.

#### Correction C1-R1-P1 — explicitly identify genuine first-sync resolution provenance

**Defect**

`reviewedFirstSyncResolutionShape()` and `reviewedFirstSyncResolutionCandidate()` can currently classify a recovery-derived no-BASE conflict resolution as a reviewed first-sync resolution because the operation itself carries no provenance distinguishing those origins.

**Required change**

Introduce one stable internal operation-reason marker:

`reviewed-first-sync-resolution`

Retain the existing user-choice reason codes unchanged.

In `ProductControllerBase.resolveConflict()`, derive bootstrap eligibility from the **original current planning assembly**, before constructing the resolution subplan:

```ts
const reviewedFirstSyncResolution =
  !current.assembly.reconstruction
  && current.assembly.input.state.status === "uninitialized";
```

Do not derive this from the later `resolutionAssembly`, because that object intentionally forces `reconstruction: false`.

Pass this eligibility into the resolution-operation construction.

For the Keep-local, Keep-remote, and manual update operation that is eligible for the exceptional bootstrap, append an additional reason with code:

```ts
"reviewed-first-sync-resolution"
```

Keep both must obtain this marker only on its Keep-local update leg that actually consumes the no-BASE bootstrap authority. Its conflict-copy operation does not require the marker.

When the original assembly is a recovery reconstruction, or otherwise is not an uninitialized non-reconstruction first-sync assembly, the marker MUST NOT be emitted.

#### Correction C1-R1-P2 — require that provenance at both authority gates

In:

`src/core/execution-coordinator.ts`

make `reviewedFirstSyncResolutionShape()` require:

1. the existing applicable user-resolution reason; **and**
2. the new `reviewed-first-sync-resolution` provenance marker.

In:

`src/product/authoritative-production-executor-base.ts`

make `reviewedFirstSyncResolutionCandidate()` require the same marker in addition to its existing conditions.

Do not remove or weaken any existing shape/evidence check.

The controller producer, authority-completion recognizer, and authoritative executor recognizer must agree exactly on this provenance signal.

#### Required resulting behavior

A genuine reviewed first-sync conflict originating from:

- `assembly.reconstruction === false`
- `assembly.input.state.status === "uninitialized"`

may use the narrowly bounded no-BASE bootstrap when all retained exact evidence checks pass.

A recovery-derived conflict MUST NOT receive this marker and therefore MUST NOT enter the first-sync bootstrap path.

It must fall back to ordinary authority requirements and remain rejected when that authority is absent.

Critically, the recovery regression must be rejected **before** `reviewedFirstSyncResolutionEvidenceCurrent()` attempts REMOTE reconciliation under first-sync authority.

### Acceptance

The correction passes only if all of the following hold:

1. the `remoteExact()` REMOTE-present correction remains intact;
2. all existing C1 first-sync Keep-local / Keep-remote / Keep-both / manual cases pass;
3. stale LOCAL evidence still rejects;
4. changed REMOTE revision/identity still rejects;
5. duplicate REMOTE identity still rejects;
6. ordinary no-BASE non-conflict update still rejects;
7. post-BASE resolution still requires ordinary BASE/mapping authority;
8. durable verified-effect retry still avoids duplicate REMOTE dispatch;
9. both existing `phase5-recovery-auth.test.ts` C2 recovery-conflict tests pass **without modifying that file or supplying the missing Drive reconciliation fake**;
10. a recovery-derived conflict cannot be mistaken for the exceptional first-sync bootstrap merely because it has no BASE and exact two-sided evidence;
11. no contract, release metadata, or unrelated production behavior changes.

## VERIFICATION

Run the existing fail-closed GitHub Actions verification from the final continuation HEAD.

Required:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- full `npm test`
- standalone dedicated C1 suite
- existing focused callback/recovery suites required by the workflow
- `npm run build`
- `npm run check`
- `git diff --check`

Inspect raw TAP/log output.

Required proof:

- full `npm test`: `# fail 0`, zero `not ok`, test count at least `724`;
- dedicated C1 step actually executes and has zero failures;
- the two named Phase-5 recovery tests pass;
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

`R1_INPUT_SHA = 0226366cba21a1c31651891c6e7d4ba0a5b33335`

and separately identify the continuation delta from:

`CONTINUATION_INPUT_SHA = bfe444a575e0830f48ae08e3e9334fd6f63a333d`

The retained R1 production change in:

`src/product/product-controller-base.ts`

must remain present.

Do not silently carry unrelated edits.

## COMPLETION RESPONSE

Return:

- correction ID `C1-R1`;
- exact branch;
- exact original R1 input;
- exact continuation input;
- exact final HEAD;
- complete original-R1 → final manifest;
- continuation-input → final manifest;
- confirmation the first-sync provenance marker is emitted only from a non-reconstruction uninitialized first-sync assembly;
- confirmation both authority recognizers require that marker;
- confirmation recovery-derived conflicts do not enter the first-sync bootstrap;
- full TAP totals;
- dedicated C1 result;
- both Phase-5 recovery C2 test results;
- typecheck/test-compilation/build/check/diff-check results;
- `main.js` size/SHA-256;
- workflow run/job/artifact provenance;
- confirmation package version remains `0.1.9`;
- confirmation PR #60 remains open/unmerged and PR #59 remains unmerged;
- confirmation no release/tag/install/live Drive mutation/A03 resumption/B–O/Stage-3 activity occurred;
- any remaining blocker.

End exactly:

`C1-R1 FIRST-SYNC CONFLICT-RESOLUTION AUTHORITY CORRECTION COMPLETE — READY FOR SUPERVISOR RE-REVIEW — LIVE VALIDATION NOT RESUMED`

## FINAL STOP

Stop after this bounded continuation and its clean verification evidence.

Do not merge PR #60.
Do not merge PR #59.
Do not merge into `phase6-integration`.
Do not release or tag.
Do not install.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.
