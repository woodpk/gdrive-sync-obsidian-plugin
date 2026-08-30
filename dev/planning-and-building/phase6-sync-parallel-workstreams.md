# Phase 6 Synchronization Parallel Workstreams

Status: **design only — parallel implementation not authorized**  
Required common base: the independently approved SHA recorded in `phase6-sync-contract-freeze.md`  
Rule: one production/test file has at most one workstream owner.

## 1. Shared rules

- All workstreams branch from the same exact approved foundation implementation SHA.
- `src/contracts/**` is frozen and prohibited to every workstream.
- A discovered contract gap requires the persisted `CONTRACT CHANGE REQUEST`; no branch-local redefinition is allowed.
- Existing product invariants, PR #33 behavior, `drive.file` scope, authentication, safe-union, destructive approval, path isolation, portable configuration, and diagnostic privacy remain fixed.
- Workstreams add tests only in their exact assigned files/namespaces.
- No workstream merges itself. Independent review precedes integration.
- No release, Azure change, physical iPhone test, or Stage 3 work is authorized.

## 2. Workstream A — Remote / Google Drive Protocol

Proposed agent: `agt-CA-P6-SYNC-REMOTE-01`

Objective: implement lossless multipage Drive ingestion, explicit ambiguity, reserved-ID retry-safe create, conflict-preserving update/outcome recovery, coherent downloads, and explicit provenance migration.

Exact production ownership:

- `src/drive/google-drive-port.ts`
- `src/drive/transport.ts`
- `src/drive/runtime.ts`
- `src/drive/obsidian-http.ts`
- `src/drive/index.ts`

Owned test files/namespaces:

- `test/phase3-changes.test.ts`
- `test/phase3-drive.test.ts`
- `test/phase3-transport.test.ts`
- `test/phase5-group-b-drive-domain.test.ts`
- new `test/workstreams/drive/**`

Input contracts: remote pages/checkpoint, path resolution, mutation identity/outcome, cancellation, fault points.

Dependencies/integration seams:

- consumes C's durable ingestion and intent persistence;
- supplies D with unambiguous observation/change batches and mutation outcomes;
- supplies B/D with coherent remote content evidence;
- G injects Drive faults through the frozen fault points.

Required outputs:

- all pages consumed through terminal token, including >1000 changes, repeated objects, moves, and removals;
- learned batch can be replayed safely until C confirms durability;
- duplicate same-path objects remain ambiguous;
- create uses one durable reserved ID across ambiguous retry;
- update cannot silently acknowledge an intervening edit;
- ranged transfer is one coherent verified version or returns unknown/conflict;
- list/observe/Changes do not mutate provenance.

Acceptance gates: focused tests, full suite, typecheck/build/package verifiers, two-device create/update adversarial cases, no OAuth/scope regression.

Prohibited production files: every file not listed above, especially `src/drive/auth.ts`, `src/drive/oauth-return.ts`, `src/contracts/**`, `src/state/**`, `src/local/**`, `src/core/**`, and `src/product/**`.

## 3. Workstream B — Local Platform Safety (Windows + iOS)

Proposed agent: `agt-CA-P6-SYNC-LOCAL-01`

Objective: implement truthful cross-platform observation, durable verified local replacement/recovery, exact self-mutation provenance, and event-loss recovery semantics on both Windows and iOS.

Exact production ownership:

- `src/local/config-policy.ts`
- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/exclusions.ts`
- `src/local/local-vault-access-boundary.ts`
- `src/local/mobile-vault-access-boundary.ts`
- `src/local/obsidian-local-vault.ts`
- `src/local/path-policy.ts`
- `src/product/canonical-local-vault.ts`

Owned test files/namespaces:

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
- new `test/workstreams/local/**`

Input contracts: local transaction/recovery, local provenance, cancellation/lifecycle, fault points, existing local-vault/path contracts.

Dependencies/integration seams:

- persists/reloads transaction stages through C's state seam;
- exposes receipts/provenance and truthful observations to D/E;
- consumes coherent binary source/evidence from A;
- G injects platform/event/crash faults.

Required outputs:

- staged bytes are canonical-evidence verified before old target displacement;
- every hard-death boundary recovers old, verified new, or explicit transaction state;
- Windows and iOS use supported boundaries without Node/Electron in required mobile paths;
- missed/delayed/overflow events trigger/rely on reconciliation, never authoritative deletion;
- plugin events are correlated by exact transaction/result and concurrent user edits remain visible.

Acceptance gates: platform-focused suites, crash-boundary matrix, event-loss/replacement tests, full verification, mobile bundle evaluation.

Prohibited production files: every file not listed above, especially `src/contracts/**`, `src/drive/**`, `src/state/**`, orchestration/runtime/merge files.

## 4. Workstream C — State / BASE / Recovery

Proposed agent: `agt-CA-P6-SYNC-STATE-01`

Objective: implement semantic generation, BASE healing transitions, durable ingestion/path state, complete operation/local-transaction recovery, semantic validation/migration, and stale-device authority lifecycle storage.

Exact production ownership:

- `src/state/indexeddb-state-storage.ts`
- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `src/core/commit-coordinator.ts`

Owned test files/namespaces:

- `test/phase2-state.test.ts`
- `test/phase2-state-hardening.test.ts`
- `test/phase2-safety-policy.test.ts`
- `test/phase5-group-a-recovery-state.test.ts`
- `test/phase6-b-crash-state.test.ts`
- new `test/workstreams/state/**`

Input contracts: persistence/semantic revisions, exact BASE, ingestion checkpoint, path convergence, recoverable intent, local transaction, semantic validation, fault points.

Dependencies/integration seams:

- persists A's learned batches and mutation identities;
- persists B's local transaction stages;
- provides exact authority/recovery transitions to D;
- provides stale-device state transitions to E;
- G crashes each durable transition.

Required outputs:

- schema migration is backed up, CAS-safe, and fail-closed;
- semantic validator rejects all frozen issue codes and contradictory state;
- journal recovery is consumed before new automatic mutation;
- BASE healing is exact and does not rewrite content;
- persistence-only writes do not invalidate unchanged semantic authority;
- learned terminal token and unresolved path state coexist safely;
- stale-device status has a real production transition/authority mechanism.

Acceptance gates: migration/property tests, restart boundary matrix, semantic-corruption fixtures, full verification.

Prohibited production files: every file not listed above, especially `src/contracts/**`, Drive/local/orchestration/runtime/merge files.

## 5. Workstream D — Reconciliation / Orchestration

Proposed agent: `agt-CA-P6-SYNC-ORCHESTRATION-01`

Objective: consume the frozen authority/ingestion/mutation seams in planning and execution while preserving safe-subset progress, dependencies, destructive gates, cursor correctness, and PR #33 behavior.

Exact production ownership:

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

Owned test files/namespaces:

- `test/phase2-execution.test.ts`
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
- new `test/workstreams/orchestration/**`

Input contracts: all authority, ingestion/convergence, ambiguity, outcome, recovery, cancellation, merge eligibility, existing plan/execution/status contracts.

Dependencies/integration seams:

- uses A/B/C/F through contracts and fakes during parallel work;
- real integration follows A+B+C+F;
- E invokes the final controller lifecycle;
- G validates integrated interleavings.

Required outputs:

- BASE-specific and identity preconditions are executable, never nominal;
- equal common reality heals BASE;
- durably learned changes can advance independently of path convergence;
- unresolved/ambiguous paths remain isolated and dependencies skip safely;
- global recovery/auth/destructive approval still stops the run;
- PR #33 stale-operation progress/retirement/observation behavior remains;
- safe committed operations are not duplicated on retry.

Acceptance gates: planner/executor/controller focused suites, destructive/recovery gates, PR #33 regressions, full verification.

Prohibited production files: every file not listed above, especially `src/contracts/**`, `src/core/commit-coordinator.ts`, `src/core/conflict-resolver.ts`, `src/core/run-coordinator.ts`, Drive/local/state/runtime/merge files.

## 6. Workstream E — Runtime / Lifecycle

Proposed agent: `agt-CA-P6-SYNC-LIFECYCLE-01`

Objective: coordinate startup/resume/suspend/unload, cooperative cancellation, trigger coalescing, mandatory reconciliation opportunities, and active-app execution without assuming indefinite iOS background time.

Exact production ownership:

- `src/core/run-coordinator.ts`
- `src/product/runtime.ts`
- `src/product/scheduler.ts`
- `src/product/web-lock-run-lease.ts`
- `src/main.ts`

Owned test files/namespaces:

- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-scheduler-acceptance.test.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`
- new `test/workstreams/lifecycle/**`

Input contracts: lifecycle/cancellation, local provenance signal, recovery gate, path convergence, status/diagnostic contracts.

Dependencies/integration seams:

- consumes B lifecycle/event signals and C recovery/stale-device state;
- invokes D serialized plan/execute lifecycle;
- propagates cancellation to A/B/D/F;
- G injects suspend/termination and trigger races.

Required outputs:

- no new operation starts after suspending/suspended/unloading;
- cancellation propagates but never substitutes for journal recovery;
- startup/resume/local/periodic triggers coalesce without lost reconciliation;
- missed local events are eventually recovered by a reconciliation opportunity;
- active-app-only behavior is accurate on iOS;
- diagnostics retain run association and privacy.

Acceptance gates: controlled async lifecycle tests, iOS suspend/death simulations, trigger races, full build/mobile verifier.

Prohibited production files: every file not listed above, especially `src/contracts/**`, Drive/local/state/planner/executor/merge files.

## 7. Workstream F — Merge / Resource Safety

Proposed agent: `agt-CA-P6-SYNC-MERGE-01`

Objective: make three-way text handling resource-bounded and iOS-safe while preserving both versions whenever automatic merge cannot safely run.

Exact production ownership:

- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`

Owned test files/namespaces:

- `test/phase2-conflict.test.ts`
- new `test/workstreams/merge/**`

Input contracts: text merge resource policy, cancellation, existing conflict/version contracts.

Dependencies/integration seams:

- consumes coherent sources from A/B;
- returns clean merge or preservation conflict to D;
- G supplies size/memory/cancellation adversarial inputs.

Required outputs:

- unknown/oversized inputs never enter unbounded automatic merge;
- algorithm and retained storage remain within declared bounds;
- cancellation does not produce acknowledged partial merge;
- both versions and provenance survive fallback.

Acceptance gates: threshold/boundary tests, large Unicode/text fixtures, complexity/resource evidence, full verification.

Prohibited production files: every file not listed above, especially `src/contracts/**`, Drive/local/state/orchestration/runtime files.

## 8. Workstream G — Adversarial Model / Verification

Proposed agent: `agt-CA-P6-SYNC-ADVERSARIAL-01`

Objective: implement deterministic seeded two-device/model-based verification across the frozen fault seams. This workstream makes no production changes.

Exact production ownership: **none**.

Exact test ownership:

- new `test/adversarial-model/**`
- new model helpers under `test/adversarial-model/support/**`

Input contracts: all frozen foundation contracts and fault points; public outputs of A-F after integration.

Dependencies: may build a contract-only model in parallel; final acceptance run occurs after A-F integration.

Required outputs:

- reproducible seed and minimized failing trace;
- crash before/after every durable boundary;
- two-device creates/updates/moves/deletes;
- response reordering/loss, paging, rate limit, event loss, suspend/resume;
- data preservation, idempotency, explicit ambiguity, and eventual convergence assertions.

Acceptance gates: deterministic repeated seeds, zero production diff, integration suite pass.

Prohibited files: all production files and every test outside `test/adversarial-model/**`.

## 9. Foundation/integration-owned files prohibited during parallel work

The following remain untouched by A-G unless the supervisor serializes a change:

- all `src/contracts/**`;
- `src/diagnostics/**` except no workstream owns it in this wave;
- `src/drive/auth.ts` and `src/drive/oauth-return.ts`;
- product UI/persistence files not explicitly owned: `src/product/audit-history.ts`, `history-modal.ts`, `index.ts`, `network-policy.ts`, `notification-policy.ts`, `plan-modal.ts`, `plugin-data.ts`, `settings-tab.ts`, `sync-attention-ledger.ts`, `sync-plan-errors-csv.ts`, `sync-plan-errors-path.ts`;
- `src/testing/fakes.ts` and `src/util/sha256.ts`;
- all planning/evidence artifacts except each workstream's new dedicated evidence file;
- all existing tests not explicitly assigned above.

If exports or shared fakes must change after integration, the integration operator performs that small serialized change after all branches have been reviewed.

## 10. Non-overlap verification

The production ownership lists above are pairwise disjoint. Test ownership lists/namespaces are pairwise disjoint. `phase2-safety-policy.test.ts` is exclusively C-owned; D is explicitly directed to create new planner safety cases instead of sharing it. `src/main.ts` is exclusively E-owned; `src/drive/runtime.ts` is exclusively A-owned. The local canonical wrapper is exclusively B-owned. Commit coordination is exclusively C-owned; execution coordination is exclusively D-owned.

## 11. Integration order

1. Independently review and approve the foundation.
2. Start A, B, C, D, E, F, and contract-only G from the same exact foundation SHA.
3. Review each branch independently against its ownership and acceptance gates.
4. Integrate C first (state/recovery schema and durable seams).
5. Integrate A and B in either order after rebasing only as the integration operator directs.
6. Integrate F.
7. Integrate D against the real A/B/C/F implementations.
8. Integrate E against the final orchestration/lifecycle seams.
9. Integrate G's adversarial suite and run the complete matrix.
10. Run full Windows/Linux/build/mobile-package verification and return for supervisor review before any release/physical testing decision.
