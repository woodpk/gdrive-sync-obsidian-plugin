# Phase 6 Synchronization Orchestration Workstream Evidence

## Identity and branch control

- Agent: `agt-CA-P6-SYNC-ORCHESTRATION-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Assigned branch: `phase6-sync-orchestration`
- Branch starting SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`
- Branch creation result: the assigned branch did not pre-exist and was created directly from the exact approved SHA.
- Production modification status: **NONE**. A frozen-contract gap was discovered during mandatory pre-modification grounding, so the Contract Change Rule requires this workstream to stop before implementing or shadowing the missing capability.
- Final branch SHA: read externally after this evidence commit; this file cannot self-record the SHA of the commit that contains itself without changing that SHA.

## Manual re-ingestion proof

Current branch manual:
`dev/planning-and-building/agent-led-software-product-construction-manual.md`

Current blob SHA:
`02adedab577f397d98fb9666166270358a581761`

The current branch copy was inspected directly. Its blob is byte-identical to the previously measured repository manual blob, so structural measurements are invariant for this exact current copy.

- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- Last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- Heading counts: H1 `1`; H2 `11`; H3 `67`; H4 `43`; H5+ `0`; total `122`
- Complete H2 sequence:
  1. `Purpose`
  2. `Operating Principles`
  3. `Navigation and Entry`
  4. `Stage 0 — Product Discovery and Requirements Elicitation`
  5. `Stage 1 — Target-System Specification and Minimum Sound Build Decomposition`
  6. `Stage 2A — Controlled Session-Based Construction`
  7. `Stage 2B — Autonomous Product Construction`
  8. `Stage 3 — Independent Product and System Validation`
  9. `Cross-Stage Handoff Rules`
  10. `Re-Entry and Recovery`
  11. `Recommended Default Workflow`
- Embedded stage prompt headings:
  - `Stage 0 Agent Prompt`
  - `Stage 1 Agent Prompt`
  - `Stage 2A Build-Prompt Expansion Template`
  - `Autonomous Build Prompt`
  - `Stage 3 Validation Prompt`

## Authoritative/current-state materials inspected before blocker determination

The blocker was found during the required pre-modification repository-grounding pass. The following current approved-base materials were inspected directly, with the frozen contract surface controlling the determination:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/planning-and-building/target-system-specification.md`
- `dev/planning-and-building/project-state.yaml`
- `dev/planning-and-building/phase-6-supervisor-handoff.md`
- `dev/planning-and-building/phase6-sync-architecture-foundation.md`
- `dev/planning-and-building/phase6-sync-contract-freeze.md`
- `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
- `dev/planning-and-building/phase6-sync-adversarial-validation.md`
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
- frozen `src/contracts/plan.ts`
- frozen `src/contracts/execution.ts`
- frozen `src/contracts/common.ts`
- frozen `src/contracts/state.ts`
- frozen `src/contracts/snapshot.ts`
- frozen `src/contracts/local-vault.ts`
- frozen `src/contracts/google-drive.ts`
- frozen `src/contracts/synchronization-foundation.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/core/execution-coordinator.ts`
- `src/core/semantic-identifiers.ts`
- `src/product/product-controller.ts`
- `src/product/production-executor.ts`
- `src/product/snapshot-assembler.ts`
- `src/product/path-scope.ts`
- `src/state/persistent-state-store.ts` as prohibited/read-only integration context
- `test/phase6-sync-architecture-foundation.test.ts` as frozen-foundation predictive evidence
- `.github/workflows/phase1-ci.yml`
- `.github/workflows/phase6-alpha-diagnostic-ci.yml`

No production implementation edit was made after the gap was identified. Therefore the remaining mandated pre-code-reading set was not used as a pretext to continue implementation after the Contract Change Rule had already required a stop.

## Relevant current-state findings

1. The current production planner still emits compatibility `base-trusted` / `identity-unambiguous` markers for history- and identity-dependent work.
2. The legacy `ProductSynchronizationExecutor` treats `identity-unambiguous` as a no-op and uses raw `GoogleDrivePort.create/update/move/trash`.
3. The frozen authoritative execution seam correctly excludes nominal authority via `ExecutablePlannedOperation`.
4. The frozen remote mutation identity and mutation port explicitly support both:
   - `reserved-file-create`; and
   - `reserved-folder-create`.
5. The frozen recoverable physical-effect descriptor supports only:
   - local **file** create/replace;
   - remote **file** create/update;
   - move;
   - trash.
   It has no local-folder-create or remote-folder-create descriptor.
6. The frozen local transactional mutation seam is likewise file-only (`expectedEntityKind: "file"` and `LocalMutationTransaction` create/replace).
7. The authoritative target requires empty directories to be preserved (`FILE-003`), and the existing planner/executor already represent folder synchronization as create operations.
8. The architecture/handoff states that every v1 mutation must follow:
   `PLAN -> exact authority -> durable physical effect intent -> durable dispatch authority -> safe mutation port -> verification -> convergence/conflict -> BASE/state commit -> restart recovery`.
9. Therefore a folder create is a required physical v1 mutation, but no frozen durable descriptor can truthfully represent that effect before dispatch.

## CONTRACT CHANGE REQUEST

### Affected frozen contract/type

Primary:
- `RecoverablePhysicalMutationDescriptor`
- `RecoverableMutationEffect`
- `RecoverableOperationIntent`

Related frozen seams:
- `RemoteMutationIdentity` (`reserved-folder-create` already exists)
- `ReliableRemoteMutationPort.reserveFolderCreateIdentity()`
- `ReliableRemoteMutationPort.createReserved()`
- `LocalMutationTransaction`
- `LocalTransactionalMutationPort`

### Exact observed limitation

`RemoteMutationIdentity` and `ReliableRemoteMutationPort` expressly support retry-safe remote folder creation, but `RecoverablePhysicalMutationDescriptor` has no descriptor variant capable of durably recording a remote folder-create effect. Its `remote-file` variant is restricted to `reserved-file-create | existing-file-content-update` and requires canonical file content. Using `move`, `trash`, or `remote-file` to encode folder creation would be semantically false and would violate the frozen contract rather than implement it.

The local side has the same structural omission: `LocalMutationTransaction` is explicitly file-only (`expectedEntityKind: "file"`), and `RecoverablePhysicalMutationDescriptor.local-file` cannot truthfully represent local folder creation.

### Assigned requirement / acceptance criterion blocked

The workstream requires:
- every physical mutation effect to be durably journaled before dispatch authority;
- upload/create/update/download/move/trash/clean-merge execution to observe the fixed mutation lifecycle;
- no synchronization mutation to route around frozen safe execution seams.

The target system separately requires:
- `FILE-003 — Empty folders. Empty directories are part of the synchronized vault structure and MUST be preserved.`

These requirements cannot all be satisfied for folder creation with the frozen descriptor/transaction surface.

### Repository evidence proving no conforming implementation is available

- `RemoteMutationIdentity` contains a dedicated `reserved-folder-create` variant.
- `ReliableRemoteMutationPort` exposes `reserveFolderCreateIdentity()` and permits that variant in `createReserved()`.
- `RecoverablePhysicalMutationDescriptor` exposes only `local-file`, `remote-file`, `move`, and `trash`.
- `remote-file.remoteMutation` accepts only `reserved-file-create | existing-file-content-update`; it excludes `reserved-folder-create`.
- `LocalMutationTransaction` and `LocalTransactionalMutationPort` are file-only.
- `LocalVaultPort` still exposes physical `createFolder()`, proving folder creation is a real mutating effect rather than a non-mutating planning artifact.
- Current `ProductSynchronizationExecutor` actually calls remote/local folder create for folder-valued create operations.
- The target-system specification mandates preservation of empty folders.

### Minimum contract capability required

Add truthful restart-safe durable representation for folder creation on both sides.

At minimum, the frozen contract needs:
1. a recoverable remote-folder-create effect descriptor carrying:
   - target side `remote`;
   - target path;
   - exact reserved `reserved-folder-create` mutation identity;
2. a recoverable local-folder-create effect descriptor or equivalent local folder transaction carrying:
   - target side `local`;
   - target path;
   - authoritative expected absence/pre-state;
   - durable stage sufficient to distinguish not-dispatched / may-have-dispatched / verified / committed after restart;
3. safe local folder-create execution/recovery semantics exposed through a frozen port or frozen transaction family, rather than requiring D to call `LocalVaultPort.createFolder()` outside durable physical-effect recovery.

### Proposed semantic change

Extend the existing recoverable mutation model; do not weaken or replace it.

Suggested semantic shape:
- add `remote-folder` with `mutationKind: "create"` and `remoteMutation: Extract<RemoteMutationIdentity, { kind: "reserved-folder-create" }>`;
- add `local-folder` with `mutationKind: "create"` plus an explicit expected-absent authority and restart-safe local folder transaction/receipt semantics.

Names are not authoritative; the required semantics are.

The new folder effects must use the same durable stages:
`intent-persisted -> dispatch-authorized -> outcome-unknown/effect-verified -> state-committed`.

### Other workstreams affected

- **A — Remote / Google Drive Protocol:** already implements/consumes `reserved-folder-create`; may need no behavioral redesign, but its recovery/adaptation tests must consume the new durable descriptor where integration requires it.
- **B — Local Platform Safety:** must implement the safe local folder-create recovery seam if added.
- **C — State / BASE / Recovery:** must persist/validate/migrate the new descriptor/transaction categories and fail closed on invalid combinations.
- **D — Reconciliation / Orchestration:** can then journal folder effects before dispatch and use the safe seam.
- **G — Adversarial Model:** should add crash/restart cases for local and remote folder create.
- **E/F:** no direct semantic change expected.

### Integration consequences

This is a shared frozen-contract change, so it cannot be made independently on Workstream D. The supervisor must serialize the contract correction, re-run foundation predictive tests, and either:
- rebase/restart affected worker branches from a newly approved common base; or
- explicitly define the controlled integration procedure for incorporating the corrected frozen contract without allowing divergent branch-local copies.

Until then, D must fail closed / not implement authoritative folder mutation rather than route folder creation around durability.

## Files created/modified/deleted in this workstream

Created:
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`

Modified production files:
- none

Modified existing tests:
- none

Created tests:
- none

Deleted:
- none

Frozen contracts modified:
- none

Prohibited files modified:
- none

## Verification performed

Because the Contract Change Rule requires a stop before implementation, implementation verification commands (`npm run typecheck`, `npm test`, `npm run build`, `npm run check`, `git diff --check`, mobile/package verification) were not used to certify nonexistent implementation changes.

Repository/branch verification performed:
- approved base commit exists: PASS
- assigned worker branch absent before creation: PASS
- branch created from exact approved base SHA: PASS
- frozen contract inspected for folder-create representation: FAILS SUFFICIENCY as described above
- prohibited/frozen production modification before stop: PASS (none)

## Completion status

- Workstream implementation: **BLOCKED BY FROZEN CONTRACT GAP**
- Contract-change request: **OPEN — SUPERVISOR ACTION REQUIRED**
- Merge status: **NOT MERGED**
- Stage 3: **NOT STARTED**
- Physical Windows/iPhone synchronization: **NOT PERFORMED**
- Azure/OAuth production configuration: **NOT MODIFIED**

# SUPERVISOR CONTINUATION — FOLDER-CREATE CONTRACT GAP RESOLVED BY PHASE6-SYNC-FOUNDATION-V1.1

## Continuation authority and branch control

- Prior blocked D branch/head preserved unchanged: `phase6-sync-orchestration @ 5497234d8bdb8587f0fad083ade6daed572c144e`.
- Prior blocker disposition: **RESOLVED BY SUPERVISOR-APPROVED PHASE6-SYNC-FOUNDATION-V1.1**. The v1.1 foundation adds first-class LOCAL/REMOTE folder-create descriptors plus the authoritative v1.1 metadata/store path; this historical CCR is not reopened.
- Corrected approved foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`.
- Frozen contract version: `phase6-sync-foundation-v1.1`.
- Continuation branch: `phase6-sync-orchestration-v1.1-continuation`.
- Continuation branch starting SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`.
- Branch was created directly from the exact corrected foundation SHA. The old D branch was neither merged nor rebased into it.
- Historical evidence was carried forward verbatim above before this continuation milestone.

## Continuation grounding

Before production modification, the current v1.1 foundation and D-owned implementation were re-inspected. In particular:

- current manual blob `02adedab577f397d98fb9666166270358a581761` and Stage 2A/re-entry rules;
- target-system `FILE-003` empty-folder preservation plus interrupted-run/recovery and execution-commit requirements;
- `phase6-sync-architecture-foundation.md` R1-R6 and fixed mutation lifecycle;
- `phase6-sync-contract-freeze.md` v1.1 authoritative surfaces;
- `phase6-sync-folder-create-foundation-correction.md` persistence/restart claims;
- `src/contracts/plan.ts`, `execution.ts`, `google-drive.ts`, `local-vault.ts`, `synchronization-foundation.ts`, and `synchronization-folder-create-foundation.ts`;
- current D execution coordinator, planner, controller, production executor, and snapshot assembler;
- frozen folder-authority-store predictive tests.

The confirmed prior descriptor/store defect is repaired: `LocalFolderCreatePhysicalMutationDescriptor`, `RemoteFolderCreatePhysicalMutationDescriptor`, `RecoverableOperationIntentV1_1`, `SynchronizationAuthorityMetadataV1_1`, and `SynchronizationAuthorityStoreV1_1` now provide truthful durable folder intent.

During the mandated restart-recovery trace, however, a distinct frozen-contract insufficiency was found before any production edit.

## CONTRACT CHANGE REQUEST — REMOTE FOLDER PARENT-IDENTITY RECOVERY OBSERVATION

### This is a new defect, not the prior CCR

The prior CCR concerned whether folder-create intent could be represented and persisted at all. v1.1 correctly fixes that problem.

This new CCR concerns whether Workstream D can obtain the **authoritative post-dispatch observation required to verify a REMOTE folder create after process death**, particularly the actual parent Drive object identity required by the frozen verifier.

### Affected frozen types / seams

Primary:
- `RemoteFolderCreateObservation`
- `verifyRemoteFolderCreate()`
- `RemoteFolderCreatePhysicalMutationDescriptor`

Related observation/execution seams:
- `ReliableRemoteMutationPort`
- `RemoteMutationOutcome`
- `RemoteMutationApplicationProof`
- `GoogleDrivePort.observe()`
- `GoogleDrivePort.listForReconciliation()`
- `RemoteObservation`
- `RemoteEntry`

### Exact observed limitation

The v1.1 descriptor correctly persists the intended `parentRemoteObjectId` and exact pre-reserved folder `remoteObjectId` before dispatch.

The frozen `verifyRemoteFolderCreate()` correctly refuses ordinary success unless the observed folder proves all of the following:

- exact target path;
- exact normalized path comparison key;
- exact reserved remote object ID; and
- exact **observed parent remote object ID** matching `descriptor.parentRemoteObjectId`.

But no frozen D-consumable read/recovery seam supplies the actual parent Drive object ID after dispatch:

1. `GoogleDrivePort.observe(rootId, path)` returns `RemoteObservation`; a present `RemoteObservation` includes path, entity kind, remote object ID, content/stability, but **no parent remote object ID**.
2. `GoogleDrivePort.listForReconciliation(rootId)` returns `RemoteEntry[]`; `RemoteEntry` includes path, entity kind, remote object ID, content, and trashed state, but **no parent remote object ID**.
3. `ReliableRemoteMutationPort` exposes reservation and mutation calls only. It has no frozen `observeById`, `reconcileReservedCreate`, `inspectParents`, or equivalent recovery-read operation.
4. A successful `RemoteMutationOutcome` may include `RemoteMutationApplicationProof`, but the `reserved-create` proof carries remote object ID and path, not the actual parent remote object ID. It therefore cannot supply the missing verifier input, and it is unavailable after a hard process death unless separately represented in durable authority.
5. The process-death acceptance case begins from persisted `dispatch-authorized` / `outcome-unknown`, where the original mutation response is specifically not trustworthy/available as completion evidence. D must reconstruct truth from durable intent plus current physical reality.

Therefore D cannot truthfully construct the `status: "folder"` branch of `RemoteFolderCreateObservation` after restart without either fabricating the observed parent from intended state or consuming a non-frozen Workstream A private API. Both are prohibited.

### Blocked acceptance criteria

This insufficiency blocks the continuation prompt's required evidence that:

- restart from REMOTE folder `dispatch-authorized` / `outcome-unknown` reconciles physical reality before retry;
- a lost REMOTE folder-create response reconciles the same reserved Drive object rather than blindly creating another;
- REMOTE folder structural/identity verification is performed using the approved frozen verifier;
- a wrong-identity / wrong-relationship same-path folder cannot become ordinary convergence;
- physical verification remains distinct from path convergence and authoritative state commit.

It also prevents a faithful implementation of the frozen v1.1 trace:
`restart/loadAuthority -> ... -> verifyRemoteFolderCreate -> PathConvergenceState -> authoritative commit`.

### Why the obvious workarounds are invalid

- Reusing `descriptor.parentRemoteObjectId` as though it were observed parent identity would compare intended state to itself and manufacture verification.
- Treating matching path + reserved object ID as sufficient would bypass the frozen verifier's parent-identity invariant.
- Calling a private Workstream A implementation method would violate the parallel-safety rule that D consume only frozen public seams and remain independently build/test capable from the corrected foundation.
- Adding a D-local parent-observation interface with new synchronization semantics would be a contract shadow.
- Blindly retrying `createReserved()` without first classifying physical reality would violate the explicit restart rule for `dispatch-authorized` / `outcome-unknown`.

### Minimum frozen capability required

Expose one authoritative, read-only recovery observation path that can establish the actual parent identity of the reserved Drive folder after restart.

Any one semantically equivalent design is sufficient, for example:

1. extend a frozen remote observation/read result for folder objects to include authoritative parent Drive object ID(s); or
2. add a frozen read/recovery method keyed by stable `RemoteObjectId` that returns enough current structural identity to construct `RemoteFolderCreateObservation`; or
3. add a frozen `ReliableRemoteMutationPort` recovery/reconciliation operation for a persisted `reserved-folder-create` identity that returns the existing frozen conservative folder verification/outcome family.

The capability must distinguish at least:
- reserved ID absent under authoritative complete observation;
- reserved ID present at intended path under intended parent;
- reserved ID present under a different parent/path;
- same logical path occupied by a different object;
- unreadable/incomplete/ambiguous observation.

It must remain read-only and must not turn uncertainty into absence or success.

### Workstreams affected

- **A — Remote / Google Drive Protocol:** must implement the frozen parent-aware recovery observation/reconciliation capability using Drive metadata/parents.
- **D — Reconciliation / Orchestration:** consumes that capability to perform restart verification before redispatch or commit.
- **G — Adversarial Model:** should exercise lost-response folder create with correct parent, wrong parent, wrong ID, incomplete observation, and same-path occupancy.
- **C:** no new persistence semantic is necessarily required if the existing descriptor continues to retain the intended parent/reserved IDs; only the observation side is missing.
- **B/E/F:** no direct semantic change expected.

### Integration consequences

This is a shared frozen-contract correction and cannot be implemented privately on the D continuation branch. The supervisor must amend/refreeze the common foundation, add predictive tests proving that a restarted D agent can obtain an authoritative `RemoteFolderCreateObservation` including actual parent identity using only frozen seams, and issue a new exact continuation base or controlled restart procedure.

Until then, Workstream D must stop rather than manufacture parent observation, consume Workstream A private production, or weaken `verifyRemoteFolderCreate()`.

## Continuation files changed

Created on the continuation branch:
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md` — historical blocked evidence carried forward plus this continuation milestone/new CCR.

Production files modified: **NONE**.
Existing tests modified: **NONE**.
New tests created: **NONE**.
Frozen contracts modified: **NONE**.
Prohibited files modified: **NONE**.
Branch merges performed: **NONE**.

## Continuation verification performed

Repository/contract verification only, because the Contract Change Rule requires stopping before implementation once the new frozen insufficiency is established:

- corrected approved base commit exists: PASS;
- continuation branch created from exact corrected base: PASS;
- old D branch preserved and not merged/rebased: PASS;
- prior folder descriptor/store CCR disposition checked against v1.1: RESOLVED;
- v1.1 REMOTE folder durable descriptor preserves intended parent + reserved object IDs: PASS;
- frozen `verifyRemoteFolderCreate()` requires actual observed parent identity: PASS;
- frozen `GoogleDrivePort.observe()` exposes actual parent identity: **NO**;
- frozen `RemoteEntry` / reconciliation listing exposes actual parent identity: **NO**;
- frozen `ReliableRemoteMutationPort` exposes restart/recovery observation keyed by reserved identity: **NO**;
- frozen `RemoteMutationApplicationProof.reserved-create` exposes actual parent identity: **NO**;
- conforming restart verification using only frozen D-consumable seams: **BLOCKED**.

No `npm run typecheck`, `npm test`, `npm run build`, `npm run check`, package/mobile verifier, or implementation-specific test result is claimed because there are no implementation changes to certify. The pre-modification contract audit is the operative evidence.

## Continuation status

- Prior folder descriptor/store CCR: **RESOLVED BY APPROVED PHASE6-SYNC-FOUNDATION-V1.1**.
- New CCR: **OPEN — REMOTE FOLDER PARENT-IDENTITY RECOVERY OBSERVATION SEAM REQUIRED**.
- Workstream D v1.1 implementation: **BLOCKED BEFORE PRODUCTION MODIFICATION**.
- Continuation branch: **NOT MERGED**.
- Foundation PR #34: **NOT MERGED BY THIS WORKSTREAM**.
- Stage 3: **NOT STARTED**.
- Physical Windows/iPhone synchronization: **NOT PERFORMED**.
- Azure/OAuth/Drive scope: **NOT MODIFIED**.
- Final continuation SHA: read externally after this evidence commit; a commit cannot contain its own resulting SHA without self-reference.
