# PHASE 6 A03 FIRST-SYNC CONFLICT-RESOLUTION AUTHORITY R1 CORRECTION

## REJECTION

Correction ID: `C1-R1`.

Agent:

`agt-ca-p6-a03-first-sync-conflict-resolution-authority-r1-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Rejected repair branch:

`phase6-a03-first-sync-conflict-resolution-authority-repair`

Exact rejected repair HEAD / exact R1 input:

`R1_INPUT_SHA = 0226366cba21a1c31651891c6e7d4ba0a5b33335`

Create a new repair branch from exactly `R1_INPUT_SHA`:

`phase6-a03-first-sync-conflict-resolution-authority-repair-r1`

Do not restart from the original `f0369d342a65294e8f4b14c44009b93f4157654a` input, a branch tip, `phase6-integration`, or any later tasking/evidence commit.

Draft PR #59 remains open and unmerged. Do not merge it.

The preceding C1 implementation is retained except for one confirmed production wiring defect. Final clean-environment run `34179683361`, job `101916058888`, passed `npm ci`, `npm run typecheck`, and standalone `npx tsc -p tsconfig.test.json`, but fail-closed full `npm test` reported `724` tests / `719` pass / `5` fail. The failures are the central reviewed no-BASE resolution success cases: Keep local, Keep remote, Keep both, and manual exact-current-local resolution.

Supervisor diagnosis is complete. Do not rediscover the root cause.

The narrow no-BASE bootstrap recognizer in `src/core/execution-coordinator.ts` deliberately requires exact two-sided conflict evidence, including a REMOTE `path-observation` with `expected: "present"`. However, `ProductControllerBase.resolutionOperations()` builds all of these resolution operations through `remoteExact(version)`, and the current `remoteExact()` helper emits only the REMOTE object/revision precondition and REMOTE content evidence. It does **not** emit the required REMOTE-present path observation.

Therefore the exact controller-generated Keep local / Keep remote / manual resolution operation never matches `reviewedFirstSyncResolutionShape()`. Authority completion falls back to the ordinary post-BASE path, encounters the intentionally absent first-sync BASE/path-convergence authority, and rejects before the bounded reviewed-resolution authority path can operate. Keep both first performs its conflict-copy operation and then reaches the same failing Keep-local operation.

This is a controller-to-authority-shape mismatch, not a reason-code defect and not a need to weaken the authority detector.

## SCOPE

Correct only `C1-R1` and directly necessary consequential test/evidence edits.

Preserve the already-retained C1 implementation at `0226366cba21a1c31651891c6e7d4ba0a5b33335`, including:

- the narrow reviewed first-sync resolution bootstrap gate;
- absence of pre-resolution BASE/mapping/path convergence on the unresolved path;
- fresh evidence and duplicate-REMOTE fail-closed checks;
- immutable-candidate-preservation for Keep local;
- durable intent/effect verification and recovery;
- ordinary post-BASE authority requirements;
- the fail-closed `pipefail` workflow and standalone `npx tsc -p tsconfig.test.json` verification step.

Do not redesign synchronization contracts, conflict policy, first-sync safe-union semantics, durable recovery, Drive mutation protocol, portable-config handling, release/install flow, or live-test orchestration.

Do not alter package/release metadata.

Do not resume A03 or begin B–O.

Do not begin Stage 3.

## CORRECTIONS

### C1-R1 — make controller-generated exact REMOTE conflict evidence satisfy the retained bootstrap contract

**Primary file**

`src/product/product-controller-base.ts`

**Required production correction**

Change the local `remoteExact(version)` helper so that an exact present REMOTE version contributes all three relevant facts to the resolution operation:

1. REMOTE path is present at `version.path`;
2. exact REMOTE object identity/revision when available;
3. exact REMOTE content evidence when available.

Concretely, initialize its returned preconditions with:

```ts
{
  kind: "path-observation",
  side: "remote",
  path: version.path,
  expected: "present",
}
```

and retain the existing `remote-object` and `content-evidence` construction unchanged.

This helper is the controller's exact-REMOTE evidence constructor for conflict-resolution operations. The correction must make the existing Keep local, Keep remote, Keep both, and manual resolution operations carry the REMOTE-present fact that the retained `reviewedFirstSyncResolutionShape()` already requires.

Do **not** solve this by relaxing `reviewedFirstSyncResolutionShape()`, removing its REMOTE-present requirement, weakening `reviewedFirstSyncResolutionEvidenceCurrent()`, bypassing `base-trusted`, synthesizing BASE before mutation, or globally allowing no-BASE updates.

Do not change the established resolution reason codes. In particular, the controller and authority layers already agree on:

- `user-keep-local`;
- `user-keep-remote`;
- `user-manual-resolution`.

Do not replace or rename them.

### Consequential test work

The existing permanent C1 regression file already contains the required success and fail-closed cases:

`test/phase6-a03-first-sync-conflict-resolution-authority.test.ts`

Use those tests as the primary acceptance surface. Modify/add test code only if directly necessary to make the controller/evidence contract explicit; do not create a parallel harness or broaden the campaign.

At minimum, the repaired suite must prove:

- reviewed no-BASE Keep local is accepted and commits authoritative state only after verified mutation;
- Keep remote is accepted;
- Keep both is accepted and preserves both versions;
- manual exact-current-local resolution is accepted;
- stale LOCAL evidence still rejects before REMOTE mutation;
- changed REMOTE revision/identity still rejects;
- duplicate REMOTE identity still rejects;
- ordinary no-BASE non-conflict `upload-update` still rejects;
- post-BASE resolution still uses normal BASE/mapping authority;
- durable effect-verified retry still avoids duplicate REMOTE dispatch.

No unrelated production file should change unless the deterministic correction above exposes a directly consequential compile/test defect. If that occurs, keep the edit minimal and explain why it is required.

## VERIFICATION

Run in a clean environment from the final R1 HEAD:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- the dedicated C1 regression suite
- full `npm test`
- `npm run build`
- `npm run check`
- `git diff --check`

Use the existing fail-closed GitHub Actions workflow. If a pull request is required to obtain authoritative GitHub Actions evidence, open a new draft verification PR from the R1 branch and leave it unmerged. Do not alter or merge PR #59.

Inspect raw output rather than relying on workflow conclusion alone.

Required proof:

- dedicated C1 suite: zero failures and zero `not ok` lines;
- full `npm test`: `# fail 0`, zero `not ok` lines, and test count at least `724`; explain any count change;
- `npm run check` embedded test run: `# fail 0` and zero `not ok` lines;
- `npm run typecheck`: pass;
- standalone `npx tsc -p tsconfig.test.json`: pass;
- `npm run build`: pass;
- `git diff --check`: pass.

Record final `main.js` byte size and SHA-256 from the clean build. When GitHub Actions artifacts are produced, record run ID, job ID, artifact ID, artifact digest, and artifact size.

Also prove by final diff/metadata inspection:

- package version remains `0.1.9`;
- no release or tag was published;
- no desktop installation occurred;
- no live Drive mutation occurred;
- A03 was not resumed and B–O were not started;
- no merge into `phase6-integration` occurred;
- Stage 3 was not begun.

## CHANGE_MANIFEST

Report every file created, modified, or deleted relative to exact `R1_INPUT_SHA = 0226366cba21a1c31651891c6e7d4ba0a5b33335`.

Expected production manifest is one minimal change in:

- `src/product/product-controller-base.ts`

Any test/evidence-only consequential changes must be separately identified. Do not silently carry unrelated edits.

## COMPLETION_RESPONSE

Return:

- correction ID `C1-R1`;
- exact repair branch;
- exact `R1_INPUT_SHA` actually used;
- exact final R1 HEAD SHA;
- concise diagnosis-to-fix summary confirming the missing REMOTE-present path observation was corrected without relaxing the retained authority gate;
- complete change manifest relative to `R1_INPUT_SHA`;
- dedicated C1 command/result and raw totals;
- full `npm test` raw totals and zero-`not ok` proof;
- `npm run check` embedded raw totals and zero-`not ok` proof;
- typecheck and standalone test-TypeScript compilation results;
- build result plus final `main.js` byte size/SHA-256;
- GitHub Actions run/job/artifact IDs, digest, and size when available;
- confirmation ordinary no-BASE non-conflict update authority still rejects;
- confirmation all retained stale/ambiguous evidence gates still reject before mutation;
- confirmation package version remains `0.1.9`;
- confirmation no release/tag/install/live-test/merge/Stage-3 activity occurred;
- any remaining blocker or verification limitation.

End exactly:

`C1-R1 FIRST-SYNC CONFLICT-RESOLUTION AUTHORITY CORRECTION COMPLETE — READY FOR SUPERVISOR RE-REVIEW — LIVE VALIDATION NOT RESUMED`

## STOP

Stop after `C1-R1` and directly necessary verification/evidence work.

Do not restart the broader C1 repair.
Do not merge PR #59.
Do not merge any R1 verification PR.
Do not publish a prerelease or tag.
Do not install the repair.
Do not resume A03.
Do not begin B–O.
Do not begin Stage 3.
