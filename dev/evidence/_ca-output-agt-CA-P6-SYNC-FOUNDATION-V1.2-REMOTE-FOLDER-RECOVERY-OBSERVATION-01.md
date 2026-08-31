# Phase 6 Foundation v1.2 Remote Folder Recovery Observation — Evidence

## Identity and temporary authority

- Agent: `agt-CA-P6-SYNC-ORCHESTRATION-01`
- Temporary role: supervisor-authorized serialized shared-foundation correction agent
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Source Workstream D blocker SHA: `bec4b64bb84fc147db39c004f959f8e09db5945e`
- Approved starting foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`
- Correction branch: `phase6-sync-foundation-v1.2-remote-folder-recovery-observation`
- Corrected candidate identifier: `phase6-sync-foundation-v1.2`
- Tested implementation checkpoint: `837c11551ce584503339f682d28ddf8be7fd533c`
- Final evidence-bearing candidate SHA: reported externally after this evidence commit; a commit cannot contain its own SHA without changing that SHA.

This task was explicitly bounded to one shared frozen-contract correction. Workstream D orchestration implementation was not resumed. Workstream A Google Drive production implementation was not performed.

## Blocker resolved

Approved v1.1 already persisted the exact REMOTE folder-create intent, intended parent Drive object ID, and reserved Drive folder object ID across restart. However, the frozen read-side contracts could not reconstruct the actual current parent Drive relationship after process death:

- generic `RemoteObservation` exposes logical path, entity kind, remote object ID, optional content, stability, and observation token, but no parent Drive object ID;
- generic `RemoteEntry` likewise exposes path, entity kind, remote object ID, optional content, and trashed state, but no parent Drive object ID;
- `verifyRemoteFolderCreate()` correctly compares the observed current parent against the persisted intended parent and therefore could not be driven truthfully after restart using the v1.1 frozen read seams alone.

Using `descriptor.parentRemoteObjectId` as though it were an observed parent would have made verification circular. Broadly adding Drive parent semantics to every generic snapshot/listing DTO was unnecessary and contrary to the supervisor's bounded design.

## Exact frozen seam added

`src/contracts/synchronization-folder-create-foundation.ts` now exports:

```ts
export interface RemoteFolderCreateRecoveryReadPort {
  observeFolderCreateRecovery(
    descriptor: RemoteFolderCreatePhysicalMutationDescriptor,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<RemoteFolderCreateObservation>;
}
```

It also exports the shared observation/verification helper:

```ts
export async function recoverRemoteFolderCreate(
  descriptor: RemoteFolderCreatePhysicalMutationDescriptor,
  reader: RemoteFolderCreateRecoveryReadPort,
  cancellation?: SynchronizationCancellationSignal,
): Promise<FolderCreateRecoveryOutcome>
```

The helper performs only:

`persisted descriptor -> read-only recovery observation -> unchanged verifyRemoteFolderCreate()`.

It performs no create, move, update, trash, or other Drive mutation.

## Frozen observation semantics

The contract documentation makes these authority rules explicit:

1. The descriptor supplies expected authority only. Its intended `parentRemoteObjectId` and path authority are not observations.
2. If the reserved object exists, a `folder` observation must carry the actual remotely observed structural path, path-comparison key, exact object ID, and actual current parent Drive object ID.
3. `authoritative-absent` is a strong two-part claim: the exact persisted reserved object ID was authoritatively proven absent AND the intended logical target was authoritatively proven free of every competing object.
4. If an independent object occupies the intended target, return `occupied`, never authoritative absence.
5. Duplicate/ambiguous structural evidence, incomplete listing/read authority, inaccessible parent evidence, network/read failure, or any other inability to establish physical reality must return `unobservable`.
6. The recovery seam is read-only.
7. The seam is suitable for `dispatch-authorized` and `outcome-unknown` restart recovery without redispatch merely because the pre-crash response was lost.

The existing `verifyRemoteFolderCreate()` was not weakened.

## Restart trace now representable

The frozen v1.2 chain is:

`REMOTE FOLDER INTENT PERSISTED`
→ `DISPATCH AUTHORIZED` or `OUTCOME UNKNOWN`
→ process death / lost response
→ authoritative state reload
→ same persisted `reservedRemoteObjectId`
→ `RemoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery()`
→ actual current object/path/parent evidence
→ unchanged `verifyRemoteFolderCreate()`
→ `verified-effect | verified-not-applied | conflict-preserved | outcome-unknown`
→ only then retry, conflict handling, convergence handling, or authoritative commit policy.

No redispatch is authorized solely because the response was lost.

## Predictive tests

Created:
`test/phase6-folder-remote-recovery-observation-foundation.test.ts`

Coverage:

- T1 — correct reserved folder / correct actual parent: `verified-effect`.
- T2 — correct reserved folder / wrong actual parent: `conflict-preserved`.
- T3 — correct reserved ID / wrong structural path: `conflict-preserved`.
- T4 — reserved ID missing / intended path occupied by another object: `conflict-preserved`, never `verified-not-applied`.
- T5 — reserved ID authoritatively absent and intended path authoritatively clear: `verified-not-applied` permitted.
- T6 — duplicate/ambiguous logical path: conservative `outcome-unknown`; no arbitrary candidate selection.
- T7 — incomplete required parent/path observation: `outcome-unknown`.
- T8 — serialized restart from `dispatch-authorized`: restart directive is `reconcile-physical-reality`; one recovery read occurs; no redispatch is part of the helper/test path.
- T9 — serialized restart from `outcome-unknown`: same read-only reconciliation behavior.
- T10 — having the intended parent in the persisted descriptor alone is insufficient; when remote parent evidence is unavailable, outcome remains `outcome-unknown`.

Existing v1.1 folder-create and authority-store tests remained unchanged and passed.

## Files changed at tested implementation checkpoint

Compared from approved foundation SHA `e6e74b6503e95219b3070044a86be2dd7e41bd5d` to tested checkpoint `837c11551ce584503339f682d28ddf8be7fd533c`:

1. `src/contracts/synchronization-folder-create-foundation.ts` — bounded frozen contract addition.
2. `test/phase6-folder-remote-recovery-observation-foundation.test.ts` — focused predictive foundation tests.
3. `dev/planning-and-building/phase6-sync-remote-folder-recovery-observation-correction.md` — candidate correction record.

This evidence file is the only additional file introduced after that tested implementation checkpoint.

No Workstream A production file changed.
No Workstream D production file changed.
No generic `RemoteObservation` or `RemoteEntry` contract changed.
No OAuth, Azure, Drive-scope, lifecycle, BASE, state-store, local transaction, merge, planner, executor, or runtime production implementation changed.

## Verification evidence — tested implementation checkpoint

GitHub Actions workflow:
- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run ID: `33402395394`
- Job ID: `99521635985`
- Tested head SHA: `837c11551ce584503339f682d28ddf8be7fd533c`
- Result: **SUCCESS**
- Node: `v20.20.1`
- npm: `10.8.2`
- package version: `0.1.7`
- `npm ci`: 24 packages added, 25 audited, 0 vulnerabilities

Commands/results:

### `npm run typecheck`

- command: `tsc --noEmit`
- result: **PASS**

### `npm test`

- command: `tsc -p tsconfig.test.json && node --test .test-build/test/*.test.js`
- result: **PASS**
- tests: **423**
- pass: **423**
- fail: **0**

The new T1–T10 cases were individually reported `ok` in the full suite.
The existing folder-create foundation tests passed.
The existing folder-authority/store foundation tests passed.
The existing synchronization architecture/foundation tests passed.

### Existing Phase 6 focused regression set

Commands:

```text
npx tsc -p tsconfig.test.json
node --test \
  .test-build/test/phase6-alpha-plan-errors-stability.test.js \
  .test-build/test/phase6-alpha-diagnostic-logging.test.js \
  .test-build/test/phase6-alpha-ios-sync-diagnostics.test.js
```

- result: **PASS**
- tests: **32**
- pass: **32**
- fail: **0**

### `npm run build`

- result: **PASS**
- output: `Built main.js (418592 bytes)`
- stable bundle verification: **PASS**
- `main.js` bytes: `418592`
- `main.js` SHA-256: `7dbc1f76e5e31a9ab13a3d9203cd1b0ff4191575ee8f15bfb10c554510521506`

### `npm run check`

- result: **PASS**
- typecheck: PASS
- full tests repeated: **423/423 PASS, 0 FAIL**
- production build: PASS

### `git diff --check`

- result: **PASS**

### Applicable mobile/package verification

All repository verification scripts executed by the workflow passed:

- `node scripts/verify-build.mjs` — PASS
- `node scripts/verify-mobile-bundle.mjs` — PASS
- `node scripts/verify-ios-package.mjs` — PASS
- `node scripts/verify-plugin-package.mjs` — PASS
- `node scripts/verify-android-package.mjs` — PASS
- `node scripts/verify-windows-package.mjs` — PASS

The runtime verification confirmed the plugin entry remains browser/mobile safe with no prohibited Node/desktop-only static dependency introduced by this contract change.

The workflow also successfully uploaded the `brain-sync-verification` artifact.

## Scope and non-actions

Confirmed:

- Workstream D orchestration implementation: **NOT RESUMED**.
- Workstream A Drive adapter implementation: **NOT PERFORMED**.
- D continuation branch `phase6-sync-orchestration-v1.1-continuation`: **NOT MODIFIED** by this correction task.
- Branch merge: **NONE**.
- PR merge: **NONE**.
- Protected/integration/master branch modification: **NONE**.
- OAuth changes: **NONE**.
- Azure changes: **NONE**.
- Drive scope broadening: **NONE**.
- Physical Windows/iPhone validation: **NOT PERFORMED**.
- Stage 3: **NOT STARTED**.
- Release/tag: **NONE**.

## Candidate status

`phase6-sync-foundation-v1.2` is a corrected candidate only.

Workstream D remains paused until an independent supervisor adversarially reviews and approves the exact evidence-bearing candidate SHA and explicitly authorizes a later D continuation against that approved v1.2 foundation.
