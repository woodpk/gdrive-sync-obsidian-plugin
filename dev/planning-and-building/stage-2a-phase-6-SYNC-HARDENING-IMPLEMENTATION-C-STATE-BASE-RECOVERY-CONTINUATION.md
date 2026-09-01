# Stage 2A Phase 6 Sync Hardening Implementation — Workstream C Continuation

## 1. Agent Identity

Your assigned agent name and authoritative identity is:

`agt-CA-P6-SYNC-STATE-01`

You are the **State / BASE / Recovery implementation agent** for the Phase 6 synchronization hardening parallel wave.

This is a continuation of your existing Workstream C assignment after a supervisor-corrected frozen-contract gap. It is not a restart of Stage 0, Stage 1, Phase 6 architecture, or Workstream C.

If your actual session/agent identity does not match `agt-CA-P6-SYNC-STATE-01`, stop and report the identity mismatch.

## 2. Continuation Authority

The independent supervisor has approved the corrected Phase 6 synchronization foundation after adversarial re-review.

The operative continuation baseline is now:

- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved corrected foundation SHA: `e6e74b6503e95219b3070044a86be2dd7e41bd5d`
- Foundation branch containing that exact state: `phase6-sync-architecture-foundation`
- Frozen synchronization contract version: `phase6-sync-foundation-v1.1`
- Foundation PR: `#34`, still OPEN and UNMERGED
- Prior Workstream C branch: `phase6-sync-state`
- Prior Workstream C head: `59ed9d4e2e2b08347a68976bb922dd7bf79e5f16`
- Prior Workstream C review PR: `#35`, still a review surface and not an integration authority
- Original pre-v1.1 workstream base: `6984915d2989827edf00def64a04c102c4e08785`

The supervisor has explicitly approved `e6e74b6503e95219b3070044a86be2dd7e41bd5d` as the corrected frozen foundation for continuation. PR #34 does **not** need to be merged before this continuation begins.

The specific defect that required foundation correction is resolved at the frozen-contract level. The v1.1 foundation now provides:

- `RecoverablePhysicalMutationDescriptorV1_1`
- `RecoverableMutationEffectV1_1`
- `RecoverableOperationIntentV1_1`
- `SynchronizationAuthorityMetadataV1_1`
- `SynchronizationAuthorityLoadResultV1_1`
- `SynchronizationAuthorityStoreV1_1`
- `recoverableOperationV1_1RestartRecoveryDirectives()`
- `recoverableOperationV1_1IsComplete()`
- LOCAL and REMOTE folder-create descriptors and structural/identity verification semantics

The old v1 synchronization metadata/store/intents remain compatibility surfaces. New or resumed v1.1 synchronization code must use the v1.1 authoritative surfaces for folder-capable recovery.

## 3. Governing Stage 2A Re-Entry

Before modifying code, fully re-ingest the current repository copy of:

`dev/planning-and-building/agent-led-software-product-construction-manual.md`

Apply especially:

- Repository Grounding
- No Unnecessary Restart
- Navigation and Entry
- Entry-State Rule
- Stage 2A Controlled Build Loop
- Evidence-Based Completion
- frozen-contract discipline
- Re-Entering During Construction

Also read and reconcile the current corrected-foundation versions of:

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
15. your prior dedicated evidence at `phase6-sync-state:dev/evidence/_ca-output-agt-CA-P6-SYNC-STATE-01.md`
16. every frozen `src/contracts/**` file relevant to Workstream C, including `src/contracts/synchronization-folder-create-foundation.ts`
17. every Workstream C production file and test assigned by the original parallel tasking prompt.

The original Workstream C task in `stage-2a-phase-6-SYNC-HARDENING-IMPLEMENTATION.md` remains authoritative except where this continuation prompt explicitly updates the base SHA, frozen contract version, branch procedure, and folder-capable state requirements.

Do not rediscover already-established architecture. Implement the corrected frozen contract.

## 4. Branch Procedure — Continue Without Merging

Do **not** merge PR #34, PR #35, `phase6-sync-architecture-foundation`, `phase6-sync-state`, or any other branch.

Preserve the old `phase6-sync-state` branch and PR #35 unchanged as historical pre-v1.1 workstream evidence.

Create a new continuation branch directly from the exact approved corrected foundation SHA:

`phase6-sync-state-v1.1-continuation`

Starting `HEAD` must be exactly:

`e6e74b6503e95219b3070044a86be2dd7e41bd5d`

Then bring forward only the prior Workstream C implementation/evidence changes that are unique to:

`6984915d2989827edf00def64a04c102c4e08785..59ed9d4e2e2b08347a68976bb922dd7bf79e5f16`

Use a controlled replay of **this same agent's own prior Workstream C commits**, not a branch merge.

Before replaying them:

1. inspect the complete commit list in that range;
2. inspect the complete changed-file set;
3. verify every replayed change belongs to Workstream C ownership or its dedicated evidence file;
4. do not replay any unrelated/foundation/other-worker change;
5. preserve the corrected v1.1 foundation files exactly.

If a replay conflicts with `src/contracts/**`, foundation planning/freeze artifacts, or another worker's files, do not resolve that conflict by modifying the frozen/shared file. Abort that replay and report the conflict.

Do not rebase or force-push the old `phase6-sync-state` branch.

Push only the new continuation branch.

A verification-only draft PR may be created for CI if required by the repository workflow, but it must be clearly marked DO NOT MERGE and must not be used as integration authority.

## 5. Original Workstream C Objective

Preserve the completed parts of the original Workstream C implementation and finish the state/BASE/recovery layer against `phase6-sync-foundation-v1.1`.

The state layer must remain the durable authority for:

- persistence revision versus semantic synchronization generation;
- exact BASE/common-state authority;
- lossless learned remote mutation/change batches;
- recoverable operation/effect journals;
- restart classification;
- BASE/state commit;
- semantic fail-closed validation;
- stale-device authority;
- safe migration/recovery with backup and CAS protection.

The new requirement is that this authoritative durable path must now natively support v1.1 folder-create operation intents.

## 6. Exclusive Ownership

### Production files you may modify

- `src/state/indexeddb-state-storage.ts`
- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `src/core/commit-coordinator.ts`

### Existing tests you may modify

- `test/phase2-state.test.ts`
- `test/phase2-state-hardening.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-group-a-recovery-state.test.ts`
- `test/phase6-b-crash-state.test.ts`

### New tests/support you may create

- `test/workstreams/state/**`

### Evidence you may update

- `dev/evidence/_ca-output-agt-CA-P6-SYNC-STATE-01.md`

Do not modify:

- any `src/contracts/**`;
- `src/testing/fakes.ts`;
- foundation planning/freeze/workstream/adversarial artifacts;
- another worker's production files/tests/evidence;
- workflow/release/Azure/OAuth/protected-branch material.

If the approved v1.1 contract is genuinely insufficient, use the Contract Change Rule and stop rather than shadowing it.

## 7. Required V1.1 State Upgrade

### 7.1 Authoritative Store Surface

Upgrade the production state implementation so the authoritative Phase 6 path implements and persists:

`SynchronizationAuthorityStoreV1_1`

with:

`SynchronizationAuthorityMetadataV1_1`

and folder-capable:

`RecoverableOperationIntentV1_1[]`.

A LOCAL or REMOTE folder-create intent must pass through the real production state layer as:

`SAVE -> PROCESS DEATH/RESTART -> LOAD -> SHARED RECOVERY CLASSIFICATION -> VERIFICATION/COMMIT`

without a sidecar, `unknown` blob, unsafe cast, branch-local replacement interface, or loss of folder-specific authority.

### 7.2 Durable Schema and Compatibility

The pre-v1.1 Workstream C implementation currently persists a v1 authority schema built around `SynchronizationAuthorityMetadata` and `RecoverableOperationIntent`.

Update the durable schema coherently for v1.1.

Engineering discretion includes the exact internal schema-version mechanics, but the following are required:

- new/resumed v1.1 authority writes preserve folder-capable operation intents;
- old v1 file/move/trash authority remains compatible or is migrated explicitly and safely;
- a v1 persisted authority document must never be silently interpreted as v1.1 if required v1.1 invariants are not satisfied;
- migration/reconstruction remains backup-first and CAS-bound;
- persistence revision and semantic generation remain distinct;
- journal-only persistence changes do not manufacture semantic-authority advancement;
- migration must not discard pre-existing file/move/trash journal effects.

### 7.3 Folder Descriptor Persistence

Persist and validate LOCAL folder-create descriptors without inventing file-content evidence.

Persist and validate REMOTE folder-create descriptors including:

- `intentId`;
- effect identity;
- durable stage;
- target path;
- parent/path authority;
- `parentRemoteObjectId`;
- exact pre-reserved `reservedRemoteObjectId` contained in the `reserved-folder-create` mutation identity;
- verification reference where present.

After restart, the exact reserved remote identity must be available unchanged. Do not reconstruct it from current path state.

### 7.4 Shared Restart and Completion Semantics

Use the approved shared v1.1 semantics:

- `recoverableOperationV1_1RestartRecoveryDirectives()`
- `recoverableOperationV1_1IsComplete()`

or exact frozen equivalents where the surrounding production state layer needs adapters.

Preserve:

- `intent-persisted` => not yet dispatched;
- `dispatch-authorized` / `outcome-unknown` => may have happened and requires physical reconciliation;
- `effect-verified` => finish authoritative state commit rather than redispatch;
- `state-committed` => complete for that effect;
- logical operation completion only after every required effect is `state-committed`.

### 7.5 Fail-Closed Semantic Validation

Extend the production semantic validator only as necessary to validate the new folder-capable journal.

At minimum reject or recovery-gate contradictions such as:

- duplicate effect IDs;
- inconsistent folder descriptor intent identity;
- inconsistent target/path authority;
- REMOTE folder descriptor whose reserved mutation identity does not match the descriptor path/intent;
- verified/committed effect with missing required durable verification reference;
- malformed v1.1 persisted authority that cannot be interpreted safely.

Do not infer success merely because a same-named folder exists.

Preserve `other-semantic-inconsistency` as the fail-closed extension path for unforeseen contradictions.

## 8. Required Tests

Add focused tests that prove the **production Workstream C implementation**, not merely the frozen foundation types.

At minimum:

1. LOCAL folder-create v1.1 intent saves through the production authority store and reloads after simulated restart unchanged.
2. REMOTE folder-create v1.1 intent saves/reloads with the same `parentRemoteObjectId` and reserved remote folder ID.
3. `dispatch-authorized` REMOTE folder create reloads as physical-reality reconciliation, not "not applied".
4. `effect-verified` LOCAL or REMOTE folder create reloads as finish-authoritative-state-commit.
5. Folder-containing operation completion remains false until every required effect is `state-committed`.
6. Persistence-only journal updates do not advance semantic generation.
7. File/move/trash v1 behavior from the prior Workstream C implementation remains valid.
8. Migration from the prior Workstream C v1 authority schema to the v1.1 production schema is backup/CAS safe and does not lose existing journal effects.
9. Malformed/inconsistent folder journal state fails closed.
10. The existing original Workstream C acceptance suite remains passing.

The original Workstream C acceptance evidence still applies, including:

- persistence revision versus semantic generation;
- exact canonical common-state BASE healing;
- multi-batch lossless remote backlog;
- upload/download/local+remote move/local+remote trash crash matrices;
- clean-merge multi-effect recovery;
- lost-response conservatism;
- semantic contradiction handling;
- stale-device authority transitions;
- migration/recovery backup/CAS safety.

Do not weaken any previous test to accommodate v1.1.

## 9. Contract Change Rule

If a required behavior is genuinely impossible using the now-approved v1.1 contract, do not modify or shadow `src/contracts/**`.

Append a new `CONTRACT CHANGE REQUEST` to your dedicated evidence and stop.

The prior folder-create contract gap is considered resolved by the approved foundation and is not itself an open CCR.

A new CCR must identify:

- exact frozen type/seam;
- exact blocked acceptance criterion;
- repository evidence;
- minimum missing capability;
- affected workstreams;
- integration consequence.

Ordinary implementation difficulty is not a contract gap.

## 10. Verification and Completion Gate

Before claiming completion:

- run all Workstream C owned existing tests;
- run all `test/workstreams/state/**` tests;
- run folder-authority/store foundation tests as compatibility evidence;
- run `npm run typecheck`;
- run `npm test`;
- run `npm run build`;
- run `npm run check`;
- run `git diff --check`;
- run applicable package/mobile verification required by current Phase 6 evidence;
- inspect the complete continuation diff from `e6e74b6503e95219b3070044a86be2dd7e41bd5d`;
- verify every changed production/test file is within Workstream C ownership;
- verify `src/contracts/**` is unchanged from the approved foundation;
- verify no other workstream branch is required for this branch to typecheck/build/test.

If CI verifies a GitHub PR merge ref rather than the literal branch head, report that accurately.

Do not call a test "passed" unless it was actually discovered and executed.

## 11. Evidence Requirements

Preserve the prior Workstream C evidence content and append a new section headed:

`SUPERVISOR CONTINUATION — PHASE6-SYNC-FOUNDATION-V1.1`

Record:

- prior Workstream C branch/head `phase6-sync-state @ 59ed9d4e2e2b08347a68976bb922dd7bf79e5f16`;
- original base `6984915d2989827edf00def64a04c102c4e08785`;
- corrected approved foundation `e6e74b6503e95219b3070044a86be2dd7e41bd5d`;
- contract version `phase6-sync-foundation-v1.1`;
- continuation branch and exact starting SHA;
- exact prior commits replayed;
- exact files carried forward;
- exact v1.1 implementation changes;
- durable schema/migration decision;
- LOCAL folder restart round trip;
- REMOTE folder restart round trip and reserved-ID preservation;
- shared recovery/completion behavior;
- tests and exact results;
- full verification results;
- any new CCR;
- final continuation SHA;
- clean/dirty working state.

Do not rewrite the historical v1 evidence to make it appear as though v1.1 existed during the original run.

## 12. Final Report

Return:

### Repository State

- agent identity;
- continuation branch;
- corrected foundation base SHA;
- prior Workstream C head;
- final continuation SHA;
- PR/CI surface if any;
- working-tree state.

### Continued Implementation

Summarize:

- prior C implementation successfully carried forward;
- production v1.1 authority metadata/store;
- folder-capable durable journal;
- migration/compatibility;
- LOCAL/REMOTE restart behavior;
- reserved remote identity preservation;
- fail-closed validation.

### Verification

Report exact commands and results.

### Scope / Contract

Report:

- frozen contracts modified: YES/NO;
- prohibited files modified: YES/NO;
- new Contract Change Request: NONE or exact status;
- branch merges performed: NONE.

End exactly with:

`WORKSTREAM C V1.1 CONTINUATION COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED`

## 13. Hard Stop

After implementation, verification, evidence, commit, and push:

STOP.

Do not:

- merge PR #34 or PR #35;
- merge the foundation branch;
- merge the old C branch;
- merge the continuation branch;
- modify `phase6-integration`, `master`, or `main`;
- resume another worker;
- perform serial integration;
- begin Stage 3;
- modify Azure/OAuth;
- broaden Drive scope;
- tag/release;
- perform physical Windows/iPhone synchronization.

The supervisor will independently review this continuation branch.
