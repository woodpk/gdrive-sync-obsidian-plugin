# Phase 6 Synchronization Foundation v1.1 — Restart-Safe Folder Creation

Status: **corrected candidate for independent supervisor re-review**  
Agent: `agt-CA-P6-SYNC-FOUNDATION-CLOUD-01`  
Foundation branch: `phase6-sync-architecture-foundation`  
Previously approved foundation SHA: `6984915d2989827edf00def64a04c102c4e08785`  
Implementation checkpoint: `6ee8d689f92f9ad2aec88ac359f84ae0ca21ebf8`  
Prior contract identifier: `phase6-sync-foundation-v1`  
Corrected contract identifier: `phase6-sync-foundation-v1.1`  
Parallel continuation: **not authorized pending independent supervisor re-review**

## 1. Defect and bounded correction

Parallel implementation review exposed one shared-foundation deficiency: the v1 durable physical-effect family covered file mutations, move, and trash but did not give LOCAL and REMOTE folder creation the same restart-safe durable lifecycle. Because the product must preserve empty directories independently of child files, Workstream D could not correctly plan and recover empty-folder creation without inventing a branch-local contract.

The correction is additive and narrow. Previously accepted A–H and R1–R6 semantics remain unchanged. No A–G implementation-owned production file is changed by this correction.

The corrected frozen lifecycle remains:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`

Folder creation now participates explicitly in every stage.

## 2. Shared contract extension

`src/contracts/synchronization-folder-create-foundation.ts` adds the v1.1 folder-create authority surface and is exported by `src/contracts/index.ts`.

The extension provides:

- `FolderCreatePathAuthority` — exact logical target path, parent path, stable path-comparison key, and authoritative expected absence;
- `LocalFolderCreatePhysicalMutationDescriptor` — durable LOCAL folder-create effect identity/path/authority;
- `RemoteFolderCreatePhysicalMutationDescriptor` — durable REMOTE folder-create effect identity/path/parent plus the pre-reserved Drive object identity used for retry-safe creation;
- `RecoverablePhysicalMutationDescriptorV1_1`, `RecoverableMutationEffectV1_1`, and `RecoverableOperationIntentV1_1` — additive folder-capable durable physical-effect families while preserving reviewed v1 compatibility types;
- explicit LOCAL and REMOTE folder observations and conservative recovery outcomes;
- structural/identity verification helpers;
- restart-stage classification through the existing durable dispatch semantics;
- an explicit commit gate requiring both verified physical folder creation and logical path convergence.

Folder proof is structural/identity based. It does not invent file hashes or require a child file.

## 3. Local folder-create recovery

A durable LOCAL folder-create effect survives restart without the original in-memory plan. Recovery distinguishes:

- `intent-persisted` before dispatch authority — definitely not dispatched under the existing journal semantics;
- `dispatch-authorized` or later — mutation may have occurred and physical state must be reconciled;
- authoritative absence — verified not applied;
- the intended folder at the exact normalized logical path — structurally verified effect;
- incompatible or non-authoritative occupancy — conflict preserved;
- unobservable state — outcome unknown.

No overwrite, deletion, or ordinary success is inferred merely because an object exists at the path.

## 4. Remote folder-create recovery

A durable REMOTE folder-create descriptor retains the exact parent Drive identity, target logical path/path-comparison authority, and the pre-reserved Drive folder object ID before dispatch.

After a lost response or process death, recovery reconciles that same intended object identity. It does not issue an unrelated second create merely because the first response was lost.

Recovery distinguishes:

- authoritative absence of the reserved intended identity — verified not applied and retryable using the same durable authority;
- the exact reserved folder identity under the exact intended parent/path authority — verified physical effect;
- same-logical-path occupancy by a different identity or wrong parent — conflict preserved;
- inability to observe authoritatively — outcome unknown.

## 5. Physical effect versus synchronization commit

Verified physical folder existence is not sufficient for authoritative synchronization commit. `folderCreateEligibleForAuthoritativeCommit()` requires both:

1. a `verified-effect` folder-create outcome; and
2. `PathConvergenceState.status === "converged"`.

Thus the existing separation between physical application, logical path convergence/conflict, and BASE/state commit remains intact.

## 6. Required predictive coverage

`test/phase6-folder-create-foundation.test.ts` covers all eight supervisor-required cases:

1. LOCAL intent persisted before dispatch;
2. LOCAL dispatch authority followed by interruption;
3. intended LOCAL folder exists after restart and requires structural/path authority;
4. LOCAL collision is preserved rather than overwritten;
5. REMOTE lost response reconciles the same reserved Drive identity;
6. REMOTE intended identity authoritatively absent can be classified verified-not-applied and retried with the same authority;
7. same-logical-path REMOTE object with the wrong identity remains conflict, not convergence;
8. empty-folder end-to-end contract trace uses structural evidence and still requires path convergence before authoritative commit.

At implementation checkpoint `6ee8d689f92f9ad2aec88ac359f84ae0ca21ebf8`, PR merge-ref verification run `33347048717`, job `99353048259`, completed successfully. The artifact evidence records **407/407 full tests passing**, **38/38 workflow-focused tests passing**, production build/check/diff verification passing, all five build/mobile/package verifiers passing, and unchanged `main.js` identity (`415353` bytes; SHA-256 `02f258642be1595e68052e7de189c1bc64e603f984418cdd65224b982e05a1bd`).

The workflow is a pull-request workflow. This evidence therefore describes it as PR merge-ref verification containing head `6ee8d689...`, not as a literal clean head-SHA checkout.

## 7. Parallel workstream impact audit

The corrected v1.1 surface is sufficient at the frozen-contract level for the affected workers without private sidecar contracts:

- **A — Remote / Google Drive Protocol:** can implement retry-safe remote folder creation by persisting and reusing the reserved Drive identity and returning conservative verified/not-applied/conflict/unknown results.
- **B — Local Platform Safety:** can implement LOCAL folder creation and structural verification without inventing a file-content transaction or private folder transaction contract.
- **C — State / BASE / Recovery:** can persist LOCAL/REMOTE folder-create descriptors, durable effect stage, verification reference, and restart state using the v1.1 recoverable effect family.
- **D — Reconciliation / Orchestration:** can plan, journal, authorize dispatch, invoke the owning mutation seam, verify, recover, and commit empty-folder creation while keeping physical application distinct from path convergence.
- **G — Adversarial Verification:** can inject pre-dispatch, post-dispatch, lost-response, wrong-identity, collision, and verified-effect-before-state-commit restart cases using the frozen v1.1 contract.

No workstream implementation is performed here. A later supervisor approval must identify one exact complete v1.1 repository SHA before any affected worker continues.

## 8. Scope and approval boundary

This correction does not reopen the accepted A–H or R1–R6 findings except for the additive descriptor-family extension directly required for folder creation. It does not implement or repair A–G, merge worker branches, begin serial integration or Stage 3, perform physical Windows/iPhone validation, modify Azure/OAuth, broaden Drive permissions, merge PR #33 or #34, modify protected branches, or create a tag/release.

The exact evidence-bearing final branch SHA is recorded externally in PR #34 metadata and the completion report after repository evidence closure; a commit cannot truthfully contain its own SHA without self-reference.
