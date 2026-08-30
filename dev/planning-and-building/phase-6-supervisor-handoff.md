# Phase 6 Supervisor Handoff

## 1. Authority and current purpose

This is the Stage 2A Phase 6 operational re-entry handoff for `woodpk/gdrive-sync-obsidian-plugin`. Product authority remains in the current manual, target-system specification, decision register, Stage 1 decomposition, Phase 1 shared contracts, current repository/evidence, and later explicit user decisions.

Stage 0 and Stage 1 are complete. Stage 2A remains active. Stage 3 has not begun.

## 2. Synchronization foundation state

Foundation branch: `phase6-sync-architecture-foundation`  
Review PR: #34 → `phase6-integration`  
PR state: **OPEN / UNMERGED**  
Reviewed predecessor implementation: PR #33 head `85d509d90d475717d609c559fad870f64b956e9e`  
Cloud continuation rejected candidate: `0d84f542a556800d93020b4000072da8faa3f740`  
Contract version: `phase6-sync-foundation-v1`  
Agent: `agt-CA-P6-SYNC-FOUNDATION-CLOUD-01`

The accepted A–H correction remains valid. The supervisor subsequently rejected `0d84f542...` only for lifecycle contract gaps R1–R6. This branch now contains the bounded reject/fix correction; the exact current candidate head must be read from GitHub after evidence closure. Parallel implementation remains **NOT AUTHORIZED**.

## 3. Accepted foundation preserved

Preserve LOCAL/REMOTE/BASE/common separation; persistence revision versus semantic generation; canonical BASE healing; multi-batch remote ingestion; duplicate-path ambiguity; immutable-candidate remote update preservation; local create/replace pre-state authority; dispatch-authorized crash semantics; exact local provenance; cancellation/lifecycle/fault injection; bounded merge; semantic validation extensibility; A–G ownership; and PR #33 operation-local stale isolation.

## 4. Reject/fix R1–R6 corrected contract

### R1 — executable plan authority

Compatibility planner DTOs may still contain nominal `base-trusted` / `identity-unambiguous`, but they are not executable authority. The new authoritative execution seam accepts only `ExecutablePlannedOperation`, which carries exact `ExactBaseAuthority` / `IdentityAuthorityProof` where required.

### R2 — durable mutation recovery

`RecoverableOperationIntent` persists separately staged physical effects. Durable descriptors cover local file create/replace, remote file create/update, move with side/from/to/identity, and trash with exact BASE/deletion authority. Clean merge has at least two effects, so one-side completion cannot imply logical completion.

### R3 — complete safe remote mutation surface

`ReliableRemoteMutationPort` covers file/folder create, preservation-safe file update, identity-preserving move, and trash. All return explicit verified/not-applied/conflict/unknown outcomes. Raw `GoogleDrivePort` mutation methods are compatibility transport primitives only.

### R4 — application is not convergence

A candidate may be safely materialized while an independent concurrent version remains. `RemoteMutationApplicationProof` verifies physical non-destructive materialization; `RemotePathConvergenceAuthority` separately determines conflict-free convergence. R0 + RI + writer candidate therefore remains conflict-preserved unless independent equivalence/no-concurrency authority exists.

### R5 — exact intended upload version

Remote file-content mutation identity durably binds SHA-256 + byte size for the exact intended bytes before dispatch. Lost-response restart verifies the candidate against that durable L1 evidence, never against later current LOCAL L2.

### R6 — missed-event cache bypass

`LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` is frozen for Workstream B. Verify/Reconcile and policy-selected integrity sweeps must eventually re-read actual bytes, so a same-size/same-mtime missed-event H0→H1 change cannot leave stale H0 as permanent authority. G must model this exact case.

## 5. Mutation lifecycle audit result

The frozen chain is complete for upload-create/update, download-create/update, remote/local move, remote/local trash, and clean merge:

`PLAN -> exact authority -> durable physical effect intent -> durable dispatch authority -> safe mutation port -> verification -> convergence/conflict -> BASE/state commit -> restart recovery`.

No v1 mutation requires pre-crash volatile plan memory or a private authority sidecar to understand unfinished physical intent.

## 6. A–G impact

- **A** implements every remote mutation kind behind `ReliableRemoteMutationPort` and adapts raw Drive transport.
- **B** implements local transaction safety and cache-bypassing integrity reads.
- **C** durably persists every physical effect, exact intended content, dispatch stage, and convergence/conflict authority.
- **D** upgrades nominal planning DTOs into exact executable authority, consumes only safe mutation seams, and separates physical application from path convergence.
- **E** guarantees policy integrity-reconciliation opportunities.
- **F** remains bounded merge/resource safety.
- **G** models all R1–R6 adversarial scenarios with no production ownership.

Worker count and ownership remain unchanged and pairwise disjoint. `test/phase2-execution.test.ts` and `src/testing/fakes.ts` remain integration-owned.

## 7. Evidence/CI semantics

GitHub PR verification uses GitHub's generated **PR merge ref** unless a workflow explicitly checks out the head SHA. Evidence must therefore say "PR merge-ref verification containing candidate head <SHA> passed" rather than "exact-head checkout passed" when that is what occurred.

No new CI workflow is to be created merely to manufacture literal head-SHA checkout evidence.

## 8. Hard boundary

Do not merge PR #34 or PR #33; merge protected branches; create A–G branches; launch workers; alter Azure/OAuth production config; tag/release; perform physical Windows/iPhone synchronization; or begin Stage 3.

## 9. Next authorized action

After the reject/fix agent finishes evidence and final PR merge-ref verification:

> Return PR #34 and its exact corrected candidate head to the independent supervisor architecture reviewer.

Only that reviewer may approve a workstream-base SHA and authorize the parallel implementation wave.
