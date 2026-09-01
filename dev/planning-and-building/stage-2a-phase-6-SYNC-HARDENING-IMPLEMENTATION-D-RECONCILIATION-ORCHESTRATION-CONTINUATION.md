# Stage 2A Phase 6 Sync Hardening Implementation — Workstream D Continuation

## 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-ORCHESTRATION-01`

You are the **Reconciliation / Orchestration implementation agent** for the Phase 6 synchronization hardening parallel wave.

This is a continuation of your original Workstream D assignment after the frozen-contract gap you correctly reported was repaired and independently approved.

If your actual session/agent identity does not match `agt-CA-P6-SYNC-ORCHESTRATION-01`, stop and report the identity mismatch.

## 2. Continuation Authority

The supervisor has independently approved the corrected Phase 6 synchronization foundation.

The operative continuation state is:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Corrected approved foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`
- Foundation branch: `phase6-sync-architecture-foundation`
- Frozen contract version: `phase6-sync-foundation-v1.1`
- Foundation PR: `#34`, OPEN and UNMERGED
- Original pre-v1.1 workstream base: `6984915d2989827edf00def64a04c102c4e08785`
- Prior Workstream D branch: `phase6-sync-orchestration`
- Prior Workstream D head: `5497234d8bdb8587f0fad083ade6daed572c144e`

The prior Workstream D branch contains the evidence/Contract Change Request produced when you correctly stopped before production implementation.

The foundation correction was specifically performed because your original contract-change request established that empty-folder synchronization could not follow the required restart-safe mutation lifecycle.

That gap is now resolved at the frozen-contract level.

The approved v1.1 foundation provides, among other corrected surfaces:

- `LocalFolderCreatePhysicalMutationDescriptor`
- `RemoteFolderCreatePhysicalMutationDescriptor`
- `RecoverablePhysicalMutationDescriptorV1_1`
- `RecoverableMutationEffectV1_1`
- `RecoverableOperationIntentV1_1`
- `SynchronizationAuthorityMetadataV1_1`
- `SynchronizationAuthorityStoreV1_1`
- shared v1.1 restart-recovery directives;
- shared v1.1 all-effects-committed completion semantics;
- structural/identity folder-create verification;
- conservative folder-create recovery outcomes;
- durable reserved Drive folder identity.

The supervisor's approval closes the **specific prior folder-create Contract Change Request** as a foundation defect.

It does not authorize architectural redesign.

## 3. Governing Stage 2A Re-Entry

Before modifying code, fully re-ingest the current repository copy of:

`dev/planning-and-building/agent-led-software-product-construction-manual.md`

Apply especially:

- Repository Grounding
- No Unnecessary Restart
- Entry-State Rule
- Stage 2A Controlled Build Loop
- Evidence-Based Completion
- frozen-contract discipline
- Re-Entering During Construction

Also read completely and reconcile:

1. `dev/planning-and-building/target-system-specification.md`
2. `dev/planning-and-building/decision-register.yaml`
3. the current Stage 1 build decomposition, requirement-coverage, and dependency artifacts
4. `dev/planning-and-building/phase-1-shared-contracts.md`
5. `dev/planning-and-building/project-state.yaml`
6. `dev/planning-and-building/phase-6-supervisor-handoff.md`
7. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
8. `dev/planning-and-building/phase6-sync-contract-freeze.md`
9. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
10. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
11. `dev/planning-and-building/phase6-sync-folder-create-foundation-correction.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. your prior Workstream D evidence at `phase6-sync-orchestration:dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`
16. every relevant frozen `src/contracts/**` file, including `src/contracts/synchronization-folder-create-foundation.ts`
17. every Workstream D production file and existing test assigned in the original parallel tasking prompt.

The original Workstream D task in `stage-2a-phase-6-SYNC-HARDENING-IMPLEMENTATION.md` remains authoritative except where this continuation prompt explicitly updates the base SHA, frozen contract version, branch procedure, and folder-create requirements.

Your previous root-cause diagnosis does not need to be repeated. The missing contract was a confirmed foundation defect and has been corrected.

## 4. Branch Procedure — Resume From Corrected Foundation Without Merging

Do **not** merge any branch.

Preserve the old:

`phase6-sync-orchestration @ 5497234d8bdb8587f0fad083ade6daed572c144e`

unchanged as historical evidence of the correctly raised contract gap.

Create a new continuation branch directly from:

`e6e74b6503e95219b3070044a86be2dd7e41bd5d`

named:

`phase6-sync-orchestration-v1.1-continuation`

Its starting `HEAD` must be exactly the approved corrected foundation SHA.

Do not merge or rebase the old D branch into it.

Because the old D branch made **no production or test implementation changes**, carry forward only its dedicated evidence content:

`dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`

Preserve the prior Contract Change Request as historical evidence and append a new continuation milestone stating that the supervisor-approved v1.1 foundation resolved that specific blocker.

Do not rewrite history to imply the original branch was complete.

Push only the continuation branch.

A verification-only draft PR may be created if required to trigger CI, but it must be marked DO NOT MERGE.

## 5. Original Workstream D Objective — Now Resume in Full

Implement the complete original **Reconciliation / Orchestration** workstream against the approved v1.1 frozen foundation.

You previously stopped before production changes, so this continuation resumes the actual assigned implementation rather than merely adding a folder-specific patch.

The required orchestration must:

- establish exact executable authority before mutation;
- prevent compatibility-only nominal preconditions from crossing the authoritative execution boundary;
- durably journal every physical mutation effect before dispatch authority;
- route mutations through the frozen safe LOCAL/REMOTE execution seams;
- separate physical application proof from logical path-convergence authority;
- recover uncertain/dispatched effects after restart rather than blindly retrying;
- commit BASE/state only after required physical verification and path convergence;
- heal stale BASE on exact canonical LOCAL=REMOTE equality without unnecessary rewrite;
- advance durable remote feed ingestion independently from one unresolved logical path;
- preserve operation-local stale isolation and safe-subset progress;
- reach bounded quiescence rather than immediate infinite retry;
- preserve all destructive, recovery, auth, safe-union, conflict, duplicate-path, case/Unicode collision, and diagnostic-safety gates.

Empty-folder creation is now part of this same authoritative lifecycle.

## 6. Exclusive Ownership

### Production files you may modify

- `src/core/destructive-safety.ts`
- `src/core/execution-coordinator.ts`
- `src/core/planner.ts`
- `src/core/production-planner.ts`
- `src/core/semantic-identifiers.ts`
- `src/product/operation-isolation.ts`
- `src/product/path-scope.ts`
- `src/product/product-controller.ts`
- `src/product/production-executor.ts`
- `src/product/snapshot-assembler.ts`

### Existing tests you may modify

- `test/phase2-planner.test.ts`
- `test/phase2-planner-edge.test.ts`
- `test/phase5-auth-controller.test.ts`
- `test/phase5-controller.test.ts`
- `test/phase5-group-d-acceptance.test.ts`
- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-recovery-auth.test.ts`
- `test/phase5-second-rejection.test.ts`
- `test/phase6-alpha-full-sync-remediation.test.ts`
- `test/phase6-alpha-mixed-plan-isolation.test.ts`
- `test/phase6-b-destructive-safety.test.ts`

### New tests/support you may create

- `test/workstreams/orchestration/**`

### Integration-owned test that remains immutable during this wave

- `test/phase2-execution.test.ts`

### Evidence you may update

- `dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-01.md`

Do not modify:

- any production file outside D ownership;
- any existing test outside D ownership;
- any `src/contracts/**`;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another worker's evidence;
- workflow/release/Azure/OAuth/protected-branch material.

## 7. Frozen Cross-Workstream Rules

The following remain fixed:

- `src/contracts/**` is frozen.
- Do not create contract shadows or branch-local substitute authority types.
- Fixed lifecycle:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`

- Persistence revision is distinct from semantic synchronization generation.
- Unknown/incomplete/ambiguous/unobservable state never becomes authoritative absence, deletion, success, or convergence.
- File BASE/common authority requires exact canonical proof.
- Folder creation uses structural/identity authority rather than fabricated file hashes.
- Physical application and logical path convergence remain separate.
- A process may die after any awaited boundary; restart safety is mandatory.
- Cancellation does not substitute for crash recovery.
- No raw compatibility mutation path may become authoritative merely because it still exists.
- PR #33 operation-local stale isolation and safe-subset progress must remain intact.
- No destructive propagation while recovery/global safety authority is unresolved.
- Duplicate remote path candidates remain explicit; path collision is not silently resolved by choosing one object.
- Windows/iOS path and observation uncertainty remains conservative.

## 8. Required V1.1 Folder-Create Orchestration

### 8.1 Planning / Exact Authority

When a required synchronization operation creates an empty folder, construct the applicable v1.1 folder-create physical descriptor using exact path/identity authority.

For LOCAL folder create, do not proceed unless the frozen required expected-absence/path authority is satisfied.

For REMOTE folder create:

- reserve the Drive folder identity before dispatch as required by the frozen remote mutation seam;
- durably retain that reserved identity in the operation intent before mutation dispatch;
- retain the exact parent remote object identity and path authority.

Do not treat "folder with the same name exists" as proof that the intended effect occurred.

### 8.2 Durable Journal Before Dispatch

A LOCAL or REMOTE folder-create effect must be represented in a `RecoverableOperationIntentV1_1` and durably saved through the `SynchronizationAuthorityStoreV1_1` authority seam before dispatch authority.

D must depend only on the frozen store interface. Do not consume Workstream C's production branch.

Use Workstream D-local fakes/adapters under `test/workstreams/orchestration/**` to prove orchestration independently.

### 8.3 Dispatch and Recovery

Respect the shared v1.1 restart classification:

- `intent-persisted`: not yet dispatched;
- `dispatch-authorized`: may have happened; reconcile physical reality before retry;
- `outcome-unknown`: reconcile physical reality;
- `effect-verified`: finish state commit rather than repeat mutation;
- `state-committed`: no physical redispatch.

A lost remote folder-create response must reconcile the same reserved Drive object identity rather than issue a blind second create.

### 8.4 Verification and Convergence

Use approved folder structural/identity verification.

Do not commit authoritative synchronization state merely because a folder physically exists.

Require the appropriate path-convergence authority before BASE/state commit.

A same-logical-path incompatible or wrong-identity folder is conflict/blocked/unknown according to the frozen outcomes, not ordinary convergence.

### 8.5 Empty Directory Completion

Prove an empty directory can complete the full mutation lifecycle without requiring a child file or canonical file-content proof.

## 9. Remaining Original D End State

In addition to the new folder-create cases, implement all original Workstream D requirements.

At minimum:

- compatibility `base-trusted` / `identity-unambiguous` markers cannot substitute for exact execution authority;
- file upload create/update follows durable-intent, dispatch, safe mutation, verification, convergence, commit;
- file download create/update follows the same lifecycle;
- local and remote moves follow the same lifecycle;
- local and remote trash follow the same lifecycle;
- clean text merge preserves each required physical effect independently;
- `R0 + independent RI + writer candidate` remains conflict-preserved rather than manufactured ordinary convergence;
- no-independent-candidate cases may converge only with explicit application and convergence authority;
- `LOCAL=REMOTE!=BASE` exact canonical equality may heal BASE without unnecessary content mutation;
- one unresolved path cannot pin later durable remote feed progress;
- continuously changing path A cannot prevent stable independent path B from committing;
- the run reaches bounded quiescence and does not recreate the immediate self-trigger livelock repaired by PR #33;
- duplicate same-path remote objects, case collisions, Unicode-equivalent names, and unknown local observations remain conservative;
- destructive/recovery/auth global gates remain fail-closed.

## 10. Parallel-Safety Boundary

This branch must remain independently typecheck/build/test capable from the corrected foundation without merging:

- Workstream A production;
- Workstream B production;
- Workstream C production;
- Workstream E/F/G production.

Where D needs collaborators, use frozen interfaces and D-owned fakes under:

`test/workstreams/orchestration/**`

Do not wait for or cherry-pick another worker's implementation.

The only shared source authority is the approved corrected foundation.

## 11. Required Acceptance Evidence

The original Workstream D acceptance evidence remains mandatory:

- exact-authority tests prove compatibility `base-trusted` and `identity-unambiguous` cannot cross the authoritative execution boundary;
- per-mutation lifecycle tests cover upload-create/update, download-create/update, local/remote move, local/remote trash, and clean merge;
- R0 + independent RI + writer candidate proves safe materialization remains conflict-preserved rather than ordinary convergence;
- no-independent-candidate case proves ordinary convergence requires both application and convergence authority;
- LOCAL=REMOTE!=BASE canonical equality heals BASE without unnecessary content rewrite;
- batch 1 unresolved while later remote batches advance does not pin the feed or discard unresolved authority;
- path A continuously changes while stable path B still commits and the run reaches bounded quiescence;
- PR #33 focused regressions remain passing;
- destructive/recovery/auth global-gate tests remain correct;
- duplicate same-path remote objects, case collisions, Unicode-equivalent names, and unknown local observations remain conservative.

Add v1.1-specific acceptance evidence:

1. LOCAL empty-folder create journals a `local-folder-create` effect before dispatch and can resume from every durable stage.
2. REMOTE empty-folder create durably preserves its reserved Drive folder ID before dispatch.
3. Lost remote folder-create response does not create a second unrelated folder on retry/recovery.
4. Restart from `dispatch-authorized` or `outcome-unknown` reconciles physical reality first.
5. Restart from `effect-verified` proceeds to authoritative commit without redispatch.
6. A wrong-identity same-path remote folder does not produce ordinary convergence.
7. LOCAL path occupied incompatibly remains conflict/blocked rather than overwrite.
8. Empty-folder synchronization completes without file-content evidence or a child file.
9. Folder physical verification remains distinct from path convergence and BASE/state commit.
10. D's orchestration uses only the frozen `SynchronizationAuthorityStoreV1_1` interface, not Workstream C production.

## 12. Contract Change Rule

The prior folder-create Contract Change Request is now **RESOLVED BY APPROVED FOUNDATION V1.1**.

Do not reopen it merely because implementation requires ordinary adaptation.

If a genuinely new frozen-contract insufficiency prevents an assigned acceptance criterion:

- do not modify or shadow the contract;
- record a new `CONTRACT CHANGE REQUEST`;
- identify the exact frozen type/seam and blocked criterion;
- provide repository evidence and minimum required capability;
- stop before crossing ownership.

## 13. Verification and Completion Gate

Before claiming completion:

- run all D-owned existing tests;
- run every `test/workstreams/orchestration/**` test;
- run relevant folder-create foundation tests as frozen-contract compatibility evidence;
- run PR #33 focused regression tests;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run applicable package/mobile verification required by Phase 6 evidence;
- inspect the complete diff from `e6e74b6503e95219b3070044a86be2dd7e41bd5d`;
- verify every production/test edit is within D ownership;
- verify `src/contracts/**` remains byte-identical to the approved v1.1 foundation;
- verify no other worker branch is required for build/test success.

If an unrelated failure appears, prove it is pre-existing against the corrected foundation before qualifying it.

Do not present a test as proof unless it was actually discovered and executed.

## 14. Evidence Requirements

Preserve the prior D evidence and prior Contract Change Request.

Append a new section headed:

`SUPERVISOR CONTINUATION — FOLDER-CREATE CONTRACT GAP RESOLVED BY PHASE6-SYNC-FOUNDATION-V1.1`

Record:

- prior D branch/head `phase6-sync-orchestration @ 5497234d8bdb8587f0fad083ade6daed572c144e`;
- prior blocker and CCR disposition;
- corrected approved foundation SHA `e6e74b6503e95219b3070044a86be2dd7e41bd5d`;
- contract version `phase6-sync-foundation-v1.1`;
- new continuation branch and exact starting SHA;
- exact files changed;
- exact orchestration implementation decisions within Engineering Discretion;
- complete mutation-lifecycle evidence;
- LOCAL folder lifecycle;
- REMOTE reserved-ID folder lifecycle;
- restart/unknown-outcome evidence;
- path-convergence versus physical-effect evidence;
- all tests and exact results;
- PR #33 regression status;
- any new integration dependency;
- any new CCR;
- final continuation SHA;
- clean/dirty working-tree state.

Do not rewrite the old blocked evidence as though the original contract had been sufficient.

## 15. Final Report

Return:

### Repository State

- agent identity;
- continuation branch;
- corrected foundation base SHA;
- prior blocked D head;
- final continuation SHA;
- PR/CI surface if any;
- working-tree state.

### Contract Blocker Disposition

State:

`PRIOR FOLDER-CREATE CONTRACT CHANGE REQUEST — RESOLVED BY APPROVED PHASE6-SYNC-FOUNDATION-V1.1`

### Implemented

Summarize the complete original D orchestration end state plus v1.1 folder-create lifecycle.

### Verification

Report exact commands and results.

### Scope

Report:

- frozen contracts modified: YES/NO;
- prohibited files modified: YES/NO;
- branch merges performed: NONE;
- new Contract Change Request: NONE or exact status.

End exactly with:

`WORKSTREAM D V1.1 CONTINUATION COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

## 16. Hard Stop

After implementation, verification, evidence, commit, and push:

STOP.

Do not:

- merge PR #34;
- merge the foundation branch;
- merge the old D branch;
- merge the continuation branch;
- merge another worker branch;
- modify `phase6-integration`, `master`, or `main`;
- perform serial integration;
- resume another worker;
- begin Stage 3;
- modify Azure/OAuth;
- broaden Drive scope;
- tag/release;
- perform physical Windows/iPhone synchronization.

The supervisor will independently review the completed continuation branch before any integration step.
