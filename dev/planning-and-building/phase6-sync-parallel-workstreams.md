# Phase 6 Synchronization Parallel Workstreams

Status: **design only — parallel implementation not authorized**  
Required common base: one exact supervisor-approved repository SHA supplied externally in every worker prompt  
Rule: one production/test file has at most one parallel workstream owner.

## 1. Shared execution and compatibility rules

- Every workstream starts from the same exact approved workstream-base SHA. That SHA is selected only after independent foundation approval and contains the final contracts, architecture, freeze candidate, ownership manifest, adversarial matrix, project-state/handoff, tests, and evidence.
- `src/contracts/**` is frozen and prohibited to every workstream.
- A contract gap requires a persisted `CONTRACT CHANGE REQUEST`; branch-local contract copies or semantic shadowing are prohibited.
- PR #33 operation-local stale isolation, safe-subset progress, exact pending retirement, coherent per-pass observation, scoped uncertainty, diagnostic privacy, `drive.file`, safe union, destructive gates, path isolation, portable configuration, and mobile boundaries remain fixed.
- Each workstream may add **workstream-local fakes/adapters only inside its permitted new-test namespace**. Shared `src/testing/fakes.ts` is integration-owned and frozen during the parallel wave.
- A workstream must remain typecheck/build-capable against the frozen foundation without waiting for another branch. When another subsystem is not yet implemented, the branch uses local contract-conforming fakes—not edits to that subsystem.
- Existing cross-subsystem integration tests explicitly listed as integration-owned are immutable during parallel work. A branch that breaks one has exposed a compatibility defect; it may not edit the test to hide that defect.
- No workstream merges itself. Independent review precedes serialized integration.
- No release, Azure change, physical-device synchronization, or Stage 3 work is authorized.

## 2. A — Remote / Google Drive Protocol

Agent ID: `agt-CA-P6-SYNC-REMOTE-01`

Objective: implement lossless multipage Drive ingestion, explicit path/object ambiguity, retry-safe reserved create, preservation-safe existing-object update, coherent downloads, and explicit provenance migration.

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

Frozen inputs: Drive page/checkpoint/backlog contracts, ambiguity resolution, remote mutation identity/application proof/outcomes, coherent reads, cancellation, fault points, existing Google/OAuth public contracts.

Required outputs:
- every Changes page is consumed through the terminal token without collapsing intermediate/terminal semantics;
- learned batches preserve removals, moves, repeated object changes, duplicate logical paths, and >1000-change pagination until C confirms durable reduction;
- create retries one pre-generated durable object ID;
- existing-object content update uses immutable-candidate preservation; no read/check/in-place PATCH can be called conflict-free merely because final bytes match;
- ambiguous/lost outcomes remain unknown or conflict-preserved;
- coherent downloads prove one expected version/evidence or fail closed;
- list/observe/Changes are read-only; provenance migration is explicit.

Dependencies: none for branch-local compilation; C/D are represented with local contract fakes. Integration consumes C persistence after C is merged.

Integration seam: A implements only frozen remote ports/results. D consumes them; C persists their durable identities/backlog; B consumes coherent content.

Branch-local fake expectation: local in-memory authority/checkpoint and cancellation fakes live only under `test/workstreams/drive/**`.

Prohibited files: every production file not listed above, especially `src/drive/auth.ts`, `src/drive/oauth-return.ts`, `src/contracts/**`, `src/state/**`, `src/local/**`, `src/core/**`, and `src/product/**`.

Acceptance gates: owned + new focused tests; official-Drive protocol cases including concurrent R0→RI between revalidation and writer activity; full suite; typecheck/build/package/mobile verifiers; exact scope/auth regression.

## 3. B — Local Platform Safety, Windows + iOS

Agent ID: `agt-CA-P6-SYNC-LOCAL-01`

Objective: implement truthful cross-platform observation, durable verified local replacement/recovery with exact create/replace pre-state authority, exact self-mutation provenance, and event-loss recovery semantics.

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

Frozen inputs: local transaction/pre-state/recovery, local provenance, canonical file proof, cancellation/lifecycle, fault points, local-vault/path contracts.

Required outputs:
- create requires authoritative expected absence; replace requires exact present observation and old canonical content proof;
- staged bytes are canonical-evidence verified before old target displacement;
- backup absence is interpreted according to create-vs-replace authority rather than guessed;
- every hard-death boundary recovers old, verified new, or an explicit contradictory/recovery state;
- Windows and iOS use supported boundaries without Node/Electron in required mobile paths;
- missed/delayed/overflow events request reconciliation and never imply deletion;
- plugin events correlate by exact transaction/result while concurrent user edits remain visible.

Dependencies: none for branch-local compilation; C persistence and A coherent source are represented by local fakes until integration.

Integration seam: B implements frozen local transaction/observation/provenance behavior; C persists transaction stages; D consumes observations/results; E consumes event/lifecycle signals.

Branch-local fake expectation: persistence/content/event sources live only under `test/workstreams/local/**`.

Prohibited files: all others, especially `src/contracts/**`, `src/drive/**`, `src/state/**`, `src/core/**`, runtime/orchestration/merge files.

Acceptance gates: platform suites, create-vs-replace recovery matrix, every local fault point, event loss/replacement cases, full verification, mobile bundle evaluation.

## 4. C — State / BASE / Recovery

Agent ID: `agt-CA-P6-SYNC-STATE-01`

Objective: implement semantic generation, exact BASE healing, lossless remote-ingestion backlog, operation/local-transaction recovery, semantic validation/migration, and stale-device authority storage.

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

Frozen inputs: persistence/semantic generations, exact BASE/common unions, learned-batch backlog, path convergence, recoverable intent/dispatch authority, local transactions, semantic validator, fault points.

Required outputs:
- persistence-only writes do not alter semantic authority;
- file BASE healing cannot occur without canonical SHA-256 current equality;
- learned batch N+1/N+2 never overwrites the only durable facts from unresolved N; reduction/retirement is explicit and safe for removals, moves, create-delete, repeated object changes, ambiguity, and long-lived unresolved paths;
- restart consumes operation/local transaction state before new automatic mutation authority;
- `dispatch-authorized` and later stages are never treated as definitely unattempted;
- semantic validator rejects every known contradiction and can emit `other-semantic-inconsistency` for a newly discovered impossible state;
- stale-device authority has a real production transition.

Dependencies: none for branch-local compilation; A/B/D are represented by data fixtures/local port fakes.

Integration seam: C is the sole durable authority implementation. A/B emit contract values; D requests authority transitions/recovery; E reads recovery/stale-device gate.

Branch-local fake expectation: no edits to `src/testing/fakes.ts`; all contract drivers and corrupt-state fixtures live in `test/workstreams/state/**`.

Prohibited files: all others, especially `src/contracts/**`, Drive/local/execution coordinator/product runtime/merge files.

Acceptance gates: migration/property tests, multi-batch transition table, crash/fault matrix, semantic-corruption fixtures, full verification.

## 5. D — Reconciliation / Orchestration

Agent ID: `agt-CA-P6-SYNC-ORCHESTRATION-01`

Objective: consume frozen authority/ingestion/mutation seams in planning/execution while preserving safe-subset progress, dependencies, destructive gates, cursor correctness, BASE healing, and PR #33 behavior.

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

Integration-owned compatibility test deliberately **not** D-owned: `test/phase2-execution.test.ts`. It crosses C's `StateCommitCoordinator` and D's `CrashSafeExecutionCoordinator` and must remain unchanged on all parallel branches. C and D must each preserve its existing public seam; intended new behavior is proven in each workstream's local namespace. If this shared compatibility test fails, that is an integration/contract problem, not permission for either branch to edit it.

Frozen inputs: all foundation authority/common/ingestion/ambiguity/mutation/recovery/cancellation/merge contracts plus existing plan/execution/status contracts.

Required outputs:
- BASE-specific and identity preconditions are executable, never nominal;
- file equality can heal BASE only from discriminated canonical proof;
- learned remote progress advances independently of path convergence without losing pending facts;
- remote `verified-applied` is accepted as conflict-free only when its application proof satisfies frozen preservation authority;
- unresolved/ambiguous paths remain isolated and dependencies skip safely;
- global recovery/auth/destructive gates remain global;
- dispatch authority is durably established before external call; post-authority crash is never classified definitely unattempted;
- PR #33 stale-operation progress/retirement/observation behavior remains;
- safe committed operations are not duplicated on retry.

Dependencies: none for branch-local typecheck/build. Local contract fakes represent A/B/C/F until serialized integration.

Integration seam: D consumes only frozen public ports/results. It must not reach into A/B/C/F private state.

Branch-local fake expectation: remote/local/authority/merge fakes live only in `test/workstreams/orchestration/**`; no shared fake edits.

Prohibited files: all others, especially `src/contracts/**`, `src/core/commit-coordinator.ts`, `src/core/conflict-resolver.ts`, `src/core/run-coordinator.ts`, Drive/local/state/runtime/merge files and the integration-owned `test/phase2-execution.test.ts`.

Acceptance gates: planner/executor/controller focused suites, preservation-proof rejection case, destructive/recovery gates, PR #33 regressions, full verification.

## 6. E — Runtime / Lifecycle

Agent ID: `agt-CA-P6-SYNC-LIFECYCLE-01`

Objective: coordinate startup/resume/suspend/unload, cooperative cancellation, trigger coalescing, mandatory reconciliation opportunities, and active-app execution without assuming indefinite iOS background time.

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

Frozen inputs: lifecycle/cancellation, local provenance signal, recovery gate, path convergence, status/diagnostic contracts.

Required outputs: no new operation after suspending/suspended/unloading; cancellation propagates without replacing journal recovery; startup/resume/local/periodic triggers coalesce without lost reconciliation; missed local events have eventual reconciliation opportunity; active-app iOS semantics remain accurate; diagnostics preserve run association/privacy.

Dependencies: branch-local controller/state/event fakes; real integration follows B+C+D.

Integration seam: E invokes D's public controller lifecycle and consumes B/C public signals/state only.

Branch-local fake expectation: all controller/state/event doubles under `test/workstreams/lifecycle/**`.

Prohibited files: all others, especially contracts, Drive/local/state/planner/executor/merge files.

Acceptance gates: controlled async lifecycle tests, suspend/death simulations, trigger races, full build/mobile verifier.

## 7. F — Merge / Resource Safety

Agent ID: `agt-CA-P6-SYNC-MERGE-01`

Objective: make three-way text handling resource-bounded and iOS-safe while preserving both complete versions whenever automatic merge cannot safely run.

Production ownership:
- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`

Existing-test ownership:
- `test/phase2-conflict.test.ts`

Permitted new tests: `test/workstreams/merge/**`

Frozen inputs: text merge resource policy, cancellation, conflict/version contracts.

Required outputs: unknown/oversized inputs never enter unbounded automatic merge; algorithm/materialization remain within declared bounds; cancellation cannot acknowledge partial merge; both versions/provenance survive fallback.

Dependencies: none branch-locally; coherent source behavior represented by local fixtures until A/B integration.

Integration seam: F returns frozen conflict/merge outcomes to D without modifying orchestration.

Branch-local fake expectation: all stream/size/cancellation fixtures under `test/workstreams/merge/**`.

Prohibited files: all others, especially contracts, Drive/local/state/orchestration/runtime files.

Acceptance gates: thresholds, large Unicode/text fixtures, resource/complexity evidence, cancellation, full verification.

## 8. G — Adversarial Model / Verification

Agent ID: `agt-CA-P6-SYNC-ADVERSARIAL-01`

Objective: build deterministic seeded two-device/model-based verification across frozen fault seams. G makes no production changes.

Production ownership: **none**.

Existing-test ownership: **none**.

Permitted new tests/support:
- `test/adversarial-model/**`
- `test/adversarial-model/support/**`

Frozen inputs: all foundation contracts/fault points and public outputs of A–F.

Required outputs: reproducible seed/minimized trace; every durable crash boundary; two-device create/update/move/delete; R0 revalidation → RI concurrent write → writer update case; response loss/reordering; multi-page/multi-batch remote ingestion; duplicate paths; event loss; suspend/resume; preservation/idempotency/ambiguity/eventual-convergence assertions.

Dependencies: contract-only model may be built in parallel; final acceptance executes after A–F serialized integration.

Integration seam: public contracts only; no production helpers.

Branch-local fake expectation: entire model and all fakes remain below `test/adversarial-model/**`.

Prohibited files: all production files and every test outside the permitted namespace.

Acceptance gates: deterministic repeat seeds, minimized failing traces, zero production diff, integrated complete-suite pass.

## 9. Foundation/integration-owned files during the parallel wave

These are prohibited to A–G unless the supervisor serializes a change:

- all `src/contracts/**`;
- `src/diagnostics/**`;
- `src/drive/auth.ts`, `src/drive/oauth-return.ts`;
- `src/product/audit-history.ts`, `history-modal.ts`, `index.ts`, `network-policy.ts`, `notification-policy.ts`, `plan-modal.ts`, `plugin-data.ts`, `settings-tab.ts`, `sync-attention-ledger.ts`, `sync-plan-errors-csv.ts`, `sync-plan-errors-path.ts`;
- `src/testing/fakes.ts`, `src/util/sha256.ts`;
- `test/phase2-execution.test.ts` and every existing test not explicitly assigned above;
- all planning/evidence artifacts except each workstream's new dedicated evidence file.

If exports, shared fakes, compatibility tests, or shared wiring must change after review, the integration operator performs the smallest serialized change after affected branches have been reviewed.

## 10. Parallel feasibility audit

The production ownership lists above are pairwise disjoint. Existing-test ownership lists are pairwise disjoint. New test namespaces are pairwise disjoint.

Feasibility rule applied to every stream: **a branch must typecheck/build against the foundation using only its owned production files plus workstream-local test fakes**. A, B, C, D, E, and F have complete frozen public seams for their dependencies; G has no production dependency. Cross-owned integration tests are frozen rather than assigned to a stream that would need another stream's implementation.

Specific reviewed tension: C owns `src/core/commit-coordinator.ts` while D owns `src/core/execution-coordinator.ts`. The historical `test/phase2-execution.test.ts` exercises both, so it is now integration-owned and immutable during the wave. C proves state/commit changes in `test/workstreams/state/**`; D proves execution/orchestration in `test/workstreams/orchestration/**`. Both must preserve the existing callable seam so the historical compatibility test remains green without either owning it.

A/B/C/F do not need D's real implementation to finish their branches; D does not need A/B/C/F real implementations to finish because it can use local contract fakes. E similarly uses a local controller fake until D is integrated. This is intentional parallelism, not permission to duplicate implementation.

If any workstream discovers it cannot pass typecheck/build/full owned gates without changing another workstream's production/test file, it stops with `CONTRACT CHANGE REQUEST`; it does not negotiate branch-to-branch edits.

## 11. Serialized integration order

1. Independently review and approve the foundation and identify one exact workstream-base SHA.
2. Start A–G from that exact SHA.
3. Independently review each branch against ownership and acceptance gates.
4. Integrate C first.
5. Integrate A and B in either order as directed by the integration operator.
6. Integrate F.
7. Integrate D against real A/B/C/F.
8. Integrate E against final orchestration/state/local seams.
9. Integrate G and run the complete adversarial matrix.
10. Run complete Windows/Linux/build/mobile-package verification and return for supervisor review before any release or physical-test decision.
