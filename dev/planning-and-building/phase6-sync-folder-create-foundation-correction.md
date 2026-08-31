# Phase 6 Synchronization Foundation v1.1 — Restart-Safe Folder Creation

Status: **corrected candidate for independent supervisor re-review**  
Agent: `agt-CA-P6-SYNC-FOUNDATION-CLOUD-01`  
Foundation branch: `phase6-sync-architecture-foundation`  
Previously approved foundation SHA: `6984915d2989827edf00def64a04c102c4e08785`  
Rejected v1.1 candidate: `c9a7f9c2fe77d134bed1659111d58b9a53d3eda3`  
Authority-store implementation checkpoint: `750100f95c8a32a6deb6909cd03ebbee3682d650`  
Prior contract identifier: `phase6-sync-foundation-v1`  
Corrected contract identifier: `phase6-sync-foundation-v1.1`  
Parallel continuation: **not authorized pending independent supervisor re-review**

## 1. Defect and bounded correction

The first v1.1 correction added folder-capable recoverable descriptor/effect/intent types, but supervisor re-review correctly found that the authoritative metadata/store path remained typed only to the old v1 `RecoverableOperationIntent[]` family. Candidate `c9a7f9c2fe77d134bed1659111d58b9a53d3eda3` therefore could not durably carry folder-create intent through Workstream C/D persistence without a sidecar or shadow contract.

The bounded correction preserves all accepted A–H, R1–R6, and folder verification semantics. It adds an explicit authoritative v1.1 metadata/store/recovery/completion surface in `src/contracts/synchronization-folder-create-foundation.ts`. The old v1 metadata/store and recoverable-intent family remain compatibility-only for already-reviewed v1 behavior.

The authoritative v1.1 lifecycle is:

`FOLDER INTENT -> V1.1 DURABLE EFFECT -> V1.1 OPERATION INTENT -> SynchronizationAuthorityMetadataV1_1 -> SynchronizationAuthorityStoreV1_1.saveAuthority -> PROCESS DEATH -> loadAuthority -> SHARED RESTART CLASSIFICATION -> STRUCTURAL/IDENTITY VERIFICATION -> PATH CONVERGENCE -> AUTHORITATIVE COMMIT`

No private sidecar, untyped blob, cast-through-unknown authority, replacement worker store, or branch-local synchronization metadata is required.

## 2. Shared folder-create authority

`src/contracts/synchronization-folder-create-foundation.ts` provides:

- `FolderCreatePathAuthority` — exact target, parent, normalized comparison key, and expected absence;
- `LocalFolderCreatePhysicalMutationDescriptor` — durable LOCAL folder-create identity/path authority;
- `RemoteFolderCreatePhysicalMutationDescriptor` — durable REMOTE identity/path/parent plus the pre-reserved Drive folder object ID;
- `RecoverablePhysicalMutationDescriptorV1_1`, `RecoverableMutationEffectV1_1`, `RecoverableOperationIntentV1_1` — folder-capable physical-effect family;
- `SynchronizationAuthorityMetadataV1_1` — authoritative metadata whose `operationIntents` are `RecoverableOperationIntentV1_1[]`;
- `SynchronizationAuthorityLoadResultV1_1` and `SynchronizationAuthorityStoreV1_1` — authoritative load/save/BASE-transition persistence seam for new/resumed v1.1 synchronization;
- `recoverableOperationV1_1RestartRecoveryDirectives()` — shared effect-level restart classification;
- `recoverableOperationV1_1IsComplete()` — shared rule that a logical operation is complete only when every required effect is `state-committed`;
- existing conservative LOCAL/REMOTE folder verification and path-convergence commit gating.

Folder proof remains structural/identity based. It does not invent file hashes or require a child file.

## 3. LOCAL durable store/restart trace

A LOCAL folder-create intent can be inserted directly into `SynchronizationAuthorityMetadataV1_1`, saved through `SynchronizationAuthorityStoreV1_1`, loaded by a simulated restarted process, and recovered with unchanged:

- operation identity;
- mutation intent identity;
- effect identity;
- durable stage;
- target path;
- parent/path-comparison/expected-absence authority;
- verification reference when present.

`intent-persisted` remains definitely pre-dispatch. `dispatch-authorized` or later remains may-have-dispatched and requires physical reconciliation. Structural verification does not itself authorize synchronization commit; converged path authority is still required.

## 4. REMOTE durable store/restart trace

A REMOTE folder-create intent follows the same authoritative metadata/store path. The persisted descriptor additionally carries:

- exact parent Drive object ID;
- exact pre-reserved intended Drive folder object ID.

The round-trip test saves a `dispatch-authorized` REMOTE folder create, constructs a new store instance from durable state to simulate process death/restart, reloads the operation, and proves the `intentId`, `effectId`, `parentRemoteObjectId`, `reservedRemoteObjectId`, target path, and path authority are unchanged. Restart therefore reconciles the same reserved Drive identity; it does not derive or allocate another identity from current path state.

## 5. Recovery, verification, convergence, and completion

`recoverableOperationV1_1RestartRecoveryDirectives()` applies the accepted durable dispatch semantics to every v1.1 effect. `recoverableOperationV1_1IsComplete()` returns true only when every required effect has reached `state-committed`; one verified or committed effect cannot complete a multi-effect logical operation while another remains unfinished.

`verifyLocalFolderCreate()` and `verifyRemoteFolderCreate()` retain their conservative outcomes. `folderCreateEligibleForAuthoritativeCommit()` continues to require both a verified intended physical folder effect and explicit `PathConvergenceState.status === "converged"`.

## 6. Predictive coverage

Existing `test/phase6-folder-create-foundation.test.ts` remains unchanged and passing.

New `test/phase6-folder-authority-store-foundation.test.ts` proves:

1. LOCAL folder intent fits authoritative v1.1 metadata without unsafe casts;
2. REMOTE folder intent fits authoritative v1.1 metadata with its reserved Drive identity;
3. LOCAL authority-store save/restart/load preserves durable stage and structural authority;
4. REMOTE authority-store save/restart/load preserves the exact reserved Drive identity and parent/path authority;
5. shared v1.1 completion requires every required effect to be `state-committed`;
6. C and D can exchange persisted folder intent solely through the frozen v1.1 metadata/store contract, with shared pre-dispatch versus may-have-dispatched restart classification.

At implementation checkpoint `750100f95c8a32a6deb6909cd03ebbee3682d650`, `Phase 6 Alpha Diagnostic Verification` run `33355904138`, job `99377893445`, completed successfully as PR merge-ref verification containing that candidate head. Artifact `9745116592` records **413/413 full tests passing**, **38/38 workflow-focused tests passing**, production build/check/diff verification passing, all five build/mobile/package verifiers passing, `main.js` `415353` bytes with SHA-256 `02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd`, and artifact digest `sha256:02e82a061ef7077cade14cfca3405a04492505c72c2d957eb2114c3a7718dcd4`.

## 7. Workstream contract readiness

With the authoritative v1.1 metadata/store path now explicit:

- **A** has the frozen remote folder identity/verification contracts it already required;
- **B** has the frozen LOCAL structural folder-create contracts it already required;
- **C** can implement persistence/recovery of LOCAL and REMOTE folder-create intent through `SynchronizationAuthorityMetadataV1_1` / `SynchronizationAuthorityStoreV1_1` without a sidecar;
- **D** can journal, reload, classify, verify, converge, and commit empty-folder synchronization using the same frozen authoritative store contract;
- **G** can model persistence/restart identity preservation and shared completion/recovery semantics without production ownership.

No workstream implementation has been resumed or completed by this correction. Independent supervisor approval of one exact complete v1.1 candidate SHA remains mandatory before continuation.

## 8. Scope and approval boundary

This correction does not reopen accepted A–H, R1–R6, Drive protocol architecture, local file transaction architecture, BASE architecture, merge architecture, lifecycle architecture, or worker implementation. It does not merge PR #33 or #34, alter protected branches, modify Azure/OAuth or Drive scope, perform physical Windows/iPhone validation, begin Stage 3, or create a tag/release.

The exact evidence-bearing final branch SHA is recorded externally in PR #34 metadata and the completion report after evidence closure; a commit cannot contain its own SHA without self-reference.
