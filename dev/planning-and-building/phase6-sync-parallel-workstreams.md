# Phase 6 Synchronization Parallel Workstreams

Status: **design only — parallel implementation not authorized**  
Required common base: one exact supervisor-approved repository SHA supplied externally in every worker prompt  
Rule: one production/test file has at most one parallel workstream owner.

## 1. Shared execution and compatibility rules

- Every workstream starts from the same exact approved workstream-base SHA selected only after independent foundation approval.
- `src/contracts/**` is frozen and prohibited to every workstream.
- Contract gaps require a persisted `CONTRACT CHANGE REQUEST`; branch-local contract copies/semantic shadowing are prohibited.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Workstream-local fakes/adapters are permitted only inside each stream's new-test namespace. `src/testing/fakes.ts` remains integration-owned.
- Each branch must typecheck/build against frozen seams without waiting for another workstream.
- Existing cross-subsystem tests listed as integration-owned are immutable during the parallel wave.
- No workstream merges itself. No release, Azure change, physical-device synchronization, or Stage 3 work is authorized.

The frozen mutation lifecycle is:

`PLAN -> EXACT AUTHORITY -> DURABLE OPERATION/EFFECT INTENT -> DURABLE DISPATCH AUTHORITY -> SAFE LOCAL/REMOTE MUTATION PORT -> VERIFICATION -> PATH CONVERGENCE OR CONFLICT -> BASE/STATE COMMIT -> RESTART RECOVERY`.

## 2. A — Remote / Google Drive Protocol

Agent ID: `agt-CA-P6-SYNC-REMOTE-01`

Objective: implement lossless Drive ingestion, explicit path/object ambiguity, retry-safe create, preservation-safe file update, recovery-safe move/trash, coherent downloads, and explicit provenance migration.

Production ownership:
- `src/drive/google-drive-port.ts`
- `src/drive/transport.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`
- `src/drive/index.ts`

Existing-test ownership:
- `test/phase3-changes.test.ts`
- `test/phase3-drive.test.ts`
- `test/phase3-transport.test.ts`
- `test/phase5-group-b-drive-domain.test.ts`

Permitted new tests: `test/workstreams/drive/**`

Frozen inputs: Drive page/checkpoint/backlog contracts; ambiguity resolution; `RemoteMutationIdentity`; exact intended canonical content; `RemoteMutationOutcome`; `RemoteMutationApplicationProof`; `RemotePathConvergenceAuthority`; `ReliableRemoteMutationPort`; coherent reads; cancellation/fault points; existing Google/OAuth public contracts.

Required outputs:
- consume all Changes pages through terminal token without collapsing intermediate/terminal state;
- preserve unresolved removals/moves/repeated changes/duplicates across learned batches until C safely reduces them;
- file/folder create uses reserved durable identity;
- file-content create/update binds exact SHA-256+size before dispatch;
- existing-file update uses immutable-candidate preservation, never raw in-place update as synchronization authority;
- remote move uses `ReliableRemoteMutationPort.moveExisting` with explicit verified/not-applied/conflict/unknown outcome;
- remote trash uses `ReliableRemoteMutationPort.trashExisting` with the same recovery-safe outcome family;
- raw `GoogleDrivePort.create/update/move/trash` remain transport primitives only and are adapted behind the reliable seam;
- ambiguous/lost outcomes remain unknown/conflict-preserved until verified;
- coherent downloads prove one expected version/evidence or fail closed.

Dependencies: none branch-locally; C/D are local contract fakes.  
Integration seam: implements only frozen remote ports/results; C persists identities/effects, D consumes them.  
Branch-local fakes: `test/workstreams/drive/**`.  
Prohibited files: all production outside ownership, especially contracts/state/local/core/product and auth/OAuth-return files.  
Acceptance gates: owned tests + new remote create/update/move/trash lost-response cases; R0→RI→writer preservation; exact intended-content verification; full suite/typecheck/build/package/mobile/scope regression.

## 3. B — Local Platform Safety, Windows + iOS

Agent ID: `agt-CA-P6-SYNC-LOCAL-01`

Objective: implement truthful cross-platform observation, durable local create/replace recovery, exact provenance, and cache-bypassing integrity reconciliation.

Production ownership:
- `src/local/config-policy.ts`
- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/exclusions.ts`
- `src/local/local-vault-access-boundary.ts`
- `src/local/mobile-vault-access-boundary.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `src/product/canonical-local-vault.ts`

Existing-test ownership:
- `test/desktop-bounded-local-read.test.ts`
- `test/desktop-external-reference-guard.test.ts`
- `test/local-failure-semantics.test.ts`
- `test/local-policy.test.ts`
- `test/mobile-safety.test.ts`
- `test/obsidian-local-vault.test.ts`
- `test/phase6-a-local-hardening.test.ts`
- `test/phase6-alpha-ios-adapter-boundary.test.ts`
- `test/phase6-alpha-ios-content-reader.test.ts`
- `test/phase6-alpha-portable-collision.test.ts`

Permitted new tests: `test/workstreams/local/**`

Frozen inputs: local transaction/pre-state/recovery; `LocalIntegrityReconciliationPort`; local provenance; canonical file proof; lifecycle/cancellation/fault points; local-vault/path contracts.

Required outputs:
- create expects authoritative absence; replace expects exact present token + canonical old content;
- stage bytes are canonical-evidence verified before displacement;
- every hard-death boundary resolves to old/verified-new/explicit contradiction;
- implement `readFileBypassingEvidenceCache()` so Verify/Reconcile and policy integrity sweeps re-read actual bytes;
- same-size/same-mtime change with missed watcher and unchanged cached token is eventually discovered;
- Windows/iOS remain within supported platform boundaries;
- events remain hints, never deletion authority;
- self-generated events correlate by exact transaction/result while user edits remain visible.

Dependencies: none branch-locally; C/A represented with local fakes.  
Integration seam: B implements frozen local transaction/observation/integrity/provenance behavior.  
Branch-local fakes: `test/workstreams/local/**`.  
Prohibited files: all others, especially contracts/drive/state/core/runtime/orchestration/merge.  
Acceptance gates: platform suites; create/replace recovery matrix; every local fault point; same-size/same-mtime missed-event cache-bypass case; full verification/mobile bundle evaluation.

## 4. C — State / BASE / Recovery

Agent ID: `agt-CA-P6-SYNC-STATE-01`

Objective: implement semantic generation, exact BASE healing, lossless remote-ingestion backlog, durable per-effect mutation recovery, semantic validation/migration, and stale-device authority storage.

Production ownership:
- `src/state/indexeddb-state-storage.ts`
- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `src/core/commit-coordinator.ts`

Existing-test ownership:
- `test/phase2-state.test.ts`
- `test/phase2-state-hardening.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-group-a-recovery-state.test.ts`
- `test/phase6-b-crash-state.test.ts`

Permitted new tests: `test/workstreams/state/**`

Frozen inputs: persistence/semantic generations; exact BASE/common proofs; learned-batch backlog; path convergence; `RecoverablePhysicalMutationDescriptor`; `RecoverableMutationEffect`; `RecoverableOperationIntent`; exact intended content; local transactions; semantic validator; fault points.

Required outputs:
- persistence-only writes never alter semantic authority;
- BASE healing requires frozen common proof;
- unresolved learned facts survive later batches until explicit safe reduction;
- persist every physical mutation effect, exact intended file content, exact deletion/identity authority, dispatch stage, and verification reference;
- clean merge can persist one effect committed while another remains unfinished;
- restart consumes durable effects before new automatic mutation authority;
- dispatch-authorized or later is never treated definitely unattempted;
- semantic contradictions fail closed, including unknown future categories;
- stale-device authority has real transitions.

Dependencies: none branch-locally; A/B/D represented by fixtures/fakes.  
Integration seam: C is sole durable authority implementation.  
Branch-local fakes: `test/workstreams/state/**`; no `src/testing/fakes.ts` changes.  
Prohibited files: all others, especially contracts/Drive/local/execution/runtime/merge.  
Acceptance gates: migration/property tests; multi-batch table; per-effect crash/restart matrix for upload/download/move/trash/merge; semantic-corruption fixtures; full verification.

## 5. D — Reconciliation / Orchestration

Agent ID: `agt-CA-P6-SYNC-ORCHESTRATION-01`

Objective: consume frozen exact authority and mutation/recovery seams while preserving safe-subset progress, destructive gates, cursor correctness, BASE healing, and PR #33 behavior.

Production ownership:
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

Existing-test ownership:
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

Permitted new tests: `test/workstreams/orchestration/**`

Integration-owned compatibility test: `test/phase2-execution.test.ts`; immutable during parallel work.

Frozen inputs: authority/common/ingestion/ambiguity/mutation/recovery/cancellation/merge contracts plus plan/execution/status contracts.

Required outputs:
- history-dependent operation replaces compatibility `base-trusted` with exact `base-authority` before authoritative execution;
- identity-dependent operation replaces compatibility `identity-unambiguous` with exact `identity-authority` proof;
- only `ExecutablePlannedOperation` enters `AuthoritativeSynchronizationExecutor` / `AuthorityCompleteSuccessCommitter`;
- durable per-effect operation intent exists before dispatch authority;
- local/remote mutation routes through frozen safe seams;
- remote physical application proof and path-convergence authority are evaluated separately;
- safely materialized writer candidate with independent RI remains conflict-preserved, not ordinary convergence;
- verified file equality heals BASE only from canonical proof;
- learned progress advances independently without losing unresolved facts;
- unresolved/ambiguous paths remain isolated; global recovery/auth/destructive gates remain global;
- PR #33 stale-operation progress/retirement/observation behavior remains;
- safe committed effects are not duplicated on retry.

Dependencies: none branch-locally; local contract fakes represent A/B/C/F.  
Integration seam: consumes only frozen public ports/results.  
Branch-local fakes: `test/workstreams/orchestration/**`.  
Prohibited files: all others, including contracts/C/F/E production and integration-owned `test/phase2-execution.test.ts`.  
Acceptance gates: exact-authority planner/executor tests; per-mutation lifecycle table; materialization-vs-convergence cases; destructive/recovery gates; PR #33 regressions; full verification.

## 6. E — Runtime / Lifecycle

Agent ID: `agt-CA-P6-SYNC-LIFECYCLE-01`

Objective: coordinate startup/resume/suspend/unload, cooperative cancellation, trigger coalescing, and mandatory reconciliation opportunities without assuming iOS background time.

Production ownership:
- `src/core/run-coordinator.ts`
- `src/product/runtime.ts`
- `src/product/scheduler.ts`
- `src/product/web-lock-run-lease.ts`
- `src/main.ts`

Existing-test ownership:
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-scheduler-acceptance.test.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`

Permitted new tests: `test/workstreams/lifecycle/**`

Frozen inputs: lifecycle/cancellation, local provenance/integrity signals, recovery gate, path convergence, status/diagnostic contracts.

Required outputs: no new operation after suspension/unload starts; cancellation never replaces journal recovery; startup/resume/local/periodic triggers coalesce without lost reconciliation; policy guarantees eventual integrity reconciliation opportunity; active-app iOS semantics remain accurate; diagnostics preserve privacy/run association.

Dependencies: branch-local fakes; real integration follows B/C/D.  
Integration seam: invokes D public lifecycle and consumes B/C public signals/state.  
Branch-local fakes: `test/workstreams/lifecycle/**`.  
Prohibited files: all others.  
Acceptance gates: controlled lifecycle tests, trigger races, integrity-opportunity scheduling, build/mobile verifier.

## 7. F — Merge / Resource Safety

Agent ID: `agt-CA-P6-SYNC-MERGE-01`

Objective: make three-way text handling resource-bounded/iOS-safe while preserving all complete versions when auto-merge cannot run safely.

Production ownership:
- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`

Existing-test ownership:
- `test/phase2-conflict.test.ts`

Permitted new tests: `test/workstreams/merge/**`

Frozen inputs: merge resource policy, cancellation, conflict/version contracts.  
Required outputs: unknown/oversized inputs never enter unbounded merge; cancellation cannot acknowledge partial merge; complete versions/provenance survive fallback.  
Dependencies: none branch-locally.  
Integration seam: returns frozen merge/conflict outcomes to D.  
Branch-local fakes: `test/workstreams/merge/**`.  
Prohibited files: all others.  
Acceptance gates: thresholds/large Unicode/resource/cancellation/full verification.

## 8. G — Adversarial Model / Verification

Agent ID: `agt-CA-P6-SYNC-ADVERSARIAL-01`

Objective: deterministic seeded two-device/model verification across all frozen fault/lifecycle seams. G makes no production changes.

Production ownership: **none**.  
Existing-test ownership: **none**.  
Permitted new tests/support: `test/adversarial-model/**`, `test/adversarial-model/support/**`.

Frozen inputs: all foundation contracts/fault points and public A–F outputs.

Required outputs include reproducible/minimized traces for:
- exact plan BASE/identity authority rejection;
- every durable mutation stage/effect across upload/download/move/trash/clean merge;
- R0 predecessor + independent RI + writer candidate: safe materialization but conflict-preserved path;
- genuine no-concurrent-candidate conflict-free convergence;
- lost response with LOCAL advancing L1→L2 while candidate must verify durable intended L1;
- safe remote move/trash unknown outcomes;
- clean merge crash after one side effect;
- multi-page/multi-batch ingestion and duplicate paths;
- same-size/same-mtime local H0→H1, missed watcher event, unchanged cached token, then cache-bypassing integrity discovery;
- suspend/resume/cancellation/stale device/resource-bounded merge.

Dependencies: contract-only model can be built in parallel; final acceptance after A–F integration.  
Integration seam: public contracts only.  
Branch-local fakes: entirely under `test/adversarial-model/**`.  
Prohibited files: all production and tests outside permitted namespace.  
Acceptance gates: deterministic seeds, minimized traces, zero production diff, integrated full-suite pass.

## 9. Foundation/integration-owned files

Prohibited to A–G unless supervisor serializes a change:
- all `src/contracts/**`;
- `src/diagnostics/**`;
- `src/drive/auth.ts`, `src/drive/oauth-return.ts`;
- shared product settings/audit/history/plan/error-state modules not explicitly assigned;
- `src/testing/fakes.ts`, `src/util/sha256.ts`;
- `test/phase2-execution.test.ts` and every existing test not explicitly assigned above;
- foundation planning/evidence artifacts except each worker's dedicated evidence file.

## 10. Parallel feasibility audit

Production ownership remains pairwise disjoint. Existing-test ownership remains pairwise disjoint. New-test namespaces remain pairwise disjoint.

The R1–R6 contract corrections do not require changing worker count. A can implement all remote mutations behind safe ports; B has an explicit integrity seam; C can persist every physical effect/intended version; D can upgrade legacy planning DTOs into exact executable authority without changing contracts; G can model all new cases without production changes.

Specific C/D boundary remains: C owns `src/core/commit-coordinator.ts`, D owns `src/core/execution-coordinator.ts`, and `test/phase2-execution.test.ts` remains integration-owned. Each stream proves new behavior in its own namespace while preserving public compatibility.

If any workstream cannot pass branch-local typecheck/build/owned gates without another stream's file, it stops with `CONTRACT CHANGE REQUEST`.

## 11. Serialized integration order

1. Independent foundation review identifies one exact workstream-base SHA.
2. A–G branch from that exact SHA.
3. Each branch receives independent review.
4. Integrate C first.
5. Integrate A and B as directed.
6. Integrate F.
7. Integrate D against real A/B/C/F.
8. Integrate E.
9. Integrate G and run the complete adversarial matrix.
10. Run complete cross-platform/build/mobile-package verification before any later release/physical-test decision.
