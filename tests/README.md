# Product test layout — independent migration handoff

Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Baseline source SHA: `b1e2ebaee3077e34a4eefaf601ee8124078b7400`  
Baseline tree SHA: `07e9eed7c911e99b82990de220675ea2308a40ba`  
Migration branch: `migration/independent-test-layout-20261017`

## Category inventory

| Category | Migrated artifacts |
| --- | ---: |
| `tests/unit/` | 61 |
| `tests/integration/` | 45 |
| `tests/contracts/` | 8 |
| `tests/architecture/` | 5 |
| `tests/adversarial/` | 8 |
| `tests/e2e/` | 0 |
| `tests/fixtures/` | 1 |
| `tests/support/` | 1 |

## Scope and restrictions

- Relocated 129 tracked TypeScript artifacts from the prior `test/` tree into categorized `tests/` paths. Preserved test cases, assertions, names, and fixture behavior; changes within files are path/import adjustments only.
- `test-platform/**` is a **separate frozen verification-platform root** under `dev/authority/governance/locks/testing-platform-boundary.yaml`. Its tests, scenarios, fixtures, registries, and source were not moved; changing that root or frozen discovery surfaces requires supervisor architecture authority.
- `src/testing/**` remains in the production-owned `src/` hierarchy. No production code, PHX-CI runtime/configuration, `phx-ci.json`, `Taskfile.phx-ci.yml`, or frozen BVP check was changed.
- There is no independently migrated standalone E2E suite; physical BVP acceptance remains separate and incomplete. See `tests/e2e/README.md`.
- Historical `archive/**`, `dev/test-results/**` and prior PHX-CI evidence remain unchanged.

## Discovery and verification handoff

- `tsconfig.json` and `tsconfig.test.json` now include `tests/**/*.ts`; `test-platform/tsconfig.json` continues to own BVP test discovery.
- `package.json` `test` compiles via `tsconfig.test.json` then selects compiled product tests with the quoted Node 22 glob `.test-build/tests/**/*.test.js`; BVP stays on `test:bvp-root`.
- The Independent Test Execution Agent **must run PHX-CI only**, checking exact combined SHA, product and BVP test discovery and nonzero counts, TypeScript compilation, test outcomes, architecture guard/metrics, source maps and any affected regression. No software validation was performed during this migration.
- Supervisor controls all integration, correction routing, acceptance and owner promotion. This branch is not merged into `master`.

## Pre-merge static audit — 2026-10-17

- Baseline-to-branch audit: 129/129 tracked TypeScript artifacts relocated once, with the unchanged BVP test platform excluded. No source assertions were removed and the 34 larger renames with omitted GitHub diff patches were compared directly against their expected path-only transformations.
- Static import/path inspection covered all 129 migrated TypeScript files. Corrected one defect in `tests/integration/phase5-acceptance-map.test.ts`: 14 stale `test/**` evidence paths, plus its path assertion, were updated to the relocated sources.
- The acceptance map's 50 scenario names were checked against all 14 destination source files; all 50 supporting names exist. TypeScript includes and Node 22 test glob target the new product test layout.
- Existing BVP `test-platform/**` root, PHX-CI infrastructure, production sources, and historical evidence were not modified. Separate frozen BVP discovery remains in its existing configuration.
- **Static review only: software verification NOT EXECUTED.** Supervisor to integrate after accepting this audit; Independent Test Execution Agent to execute integrated source exclusively via PHX-CI.

## Exact old-to-new tracked path map

| Baseline artifact | Migration artifact |
| --- | --- |
| `test/adversarial-model/adversarial-model.test.ts` | `tests/adversarial/adversarial-model.test.ts` |
| `test/adversarial-model/support/model.ts` | `tests/support/adversarial/model.ts` |
| `test/contracts.test.ts` | `tests/contracts/contracts.test.ts` |
| `test/dec339-benchmark-observability.test.ts` | `tests/unit/dec339-benchmark-observability.test.ts` |
| `test/dec339-deterministic-safety-equivalence.test.ts` | `tests/unit/dec339-deterministic-safety-equivalence.test.ts` |
| `test/dec339-indexeddb-storage-contract.test.ts` | `tests/contracts/dec339-indexeddb-storage-contract.test.ts` |
| `test/dec339-indexeddb-transaction-core.test.ts` | `tests/unit/dec339-indexeddb-transaction-core.test.ts` |
| `test/dec339-indexeddb-transaction-faults.test.ts` | `tests/adversarial/dec339-indexeddb-transaction-faults.test.ts` |
| `test/dec339-indexeddb-transaction-integration.test.ts` | `tests/integration/dec339-indexeddb-transaction-integration.test.ts` |
| `test/dec339-inventory-contracts.test.ts` | `tests/contracts/dec339-inventory-contracts.test.ts` |
| `test/dec339-inventory-gc.test.ts` | `tests/unit/dec339-inventory-gc.test.ts` |
| `test/dec339-local-observation-integration.test.ts` | `tests/integration/dec339-local-observation-integration.test.ts` |
| `test/dec339-matched-optimizer-benchmark.test.ts` | `tests/unit/dec339-matched-optimizer-benchmark.test.ts` |
| `test/dec339-planning-projection.test.ts` | `tests/unit/dec339-planning-projection.test.ts` |
| `test/dec339-provider-changes-adversarial.test.ts` | `tests/adversarial/dec339-provider-changes-adversarial.test.ts` |
| `test/dec339-remote-reader.test.ts` | `tests/unit/dec339-remote-reader.test.ts` |
| `test/dec339-snapshot-assembly.test.ts` | `tests/unit/dec339-snapshot-assembly.test.ts` |
| `test/dec339-targeted-convergence.test.ts` | `tests/integration/dec339-targeted-convergence.test.ts` |
| `test/dec339-targeted-effect-safety-comparison.test.ts` | `tests/unit/dec339-targeted-effect-safety-comparison.test.ts` |
| `test/desktop-bounded-local-read.test.ts` | `tests/unit/desktop-bounded-local-read.test.ts` |
| `test/desktop-external-reference-guard.test.ts` | `tests/architecture/desktop-external-reference-guard.test.ts` |
| `test/folder-move-transitive-execution.test.ts` | `tests/integration/folder-move-transitive-execution.test.ts` |
| `test/local-failure-semantics.test.ts` | `tests/unit/local-failure-semantics.test.ts` |
| `test/local-policy.test.ts` | `tests/contracts/local-policy.test.ts` |
| `test/mobile-safety.test.ts` | `tests/architecture/mobile-safety.test.ts` |
| `test/oauth-prepared-launch-diagnostic.test.ts` | `tests/unit/oauth-prepared-launch-diagnostic.test.ts` |
| `test/obsidian-local-vault-concurrency.test.ts` | `tests/unit/obsidian-local-vault-concurrency.test.ts` |
| `test/obsidian-local-vault-evidence-reuse.test.ts` | `tests/unit/obsidian-local-vault-evidence-reuse.test.ts` |
| `test/obsidian-local-vault.test.ts` | `tests/unit/obsidian-local-vault.test.ts` |
| `test/phase2-conflict.test.ts` | `tests/unit/phase2-conflict.test.ts` |
| `test/phase2-execution.test.ts` | `tests/unit/phase2-execution.test.ts` |
| `test/phase2-planner-edge.test.ts` | `tests/unit/phase2-planner-edge.test.ts` |
| `test/phase2-planner.test.ts` | `tests/unit/phase2-planner.test.ts` |
| `test/phase2-safety-policy.test.ts` | `tests/contracts/phase2-safety-policy.test.ts` |
| `test/phase2-state-hardening.test.ts` | `tests/unit/phase2-state-hardening.test.ts` |
| `test/phase2-state.test.ts` | `tests/unit/phase2-state.test.ts` |
| `test/phase3-callback.test.ts` | `tests/unit/phase3-callback.test.ts` |
| `test/phase3-changes.test.ts` | `tests/unit/phase3-changes.test.ts` |
| `test/phase3-drive.test.ts` | `tests/unit/phase3-drive.test.ts` |
| `test/phase3-oauth.test.ts` | `tests/unit/phase3-oauth.test.ts` |
| `test/phase3-obsidian-http.test.ts` | `tests/unit/phase3-obsidian-http.test.ts` |
| `test/phase3-transport.test.ts` | `tests/unit/phase3-transport.test.ts` |
| `test/phase5-acceptance-map.test.ts` | `tests/integration/phase5-acceptance-map.test.ts` |
| `test/phase5-auth-controller.test.ts` | `tests/integration/phase5-auth-controller.test.ts` |
| `test/phase5-controller.test.ts` | `tests/integration/phase5-controller.test.ts` |
| `test/phase5-group-a-recovery-state.test.ts` | `tests/integration/phase5-group-a-recovery-state.test.ts` |
| `test/phase5-group-b-drive-domain.test.ts` | `tests/integration/phase5-group-b-drive-domain.test.ts` |
| `test/phase5-group-b-scope-transfer.test.ts` | `tests/integration/phase5-group-b-scope-transfer.test.ts` |
| `test/phase5-group-d-acceptance.test.ts` | `tests/integration/phase5-group-d-acceptance.test.ts` |
| `test/phase5-group-d-active-run-integration.test.ts` | `tests/integration/phase5-group-d-active-run-integration.test.ts` |
| `test/phase5-group-d-conflict-destruction-integration.test.ts` | `tests/integration/phase5-group-d-conflict-destruction-integration.test.ts` |
| `test/phase5-group-d-first-sync-integration.test.ts` | `tests/integration/phase5-group-d-first-sync-integration.test.ts` |
| `test/phase5-group-d-recovery-coordination-integration.test.ts` | `tests/integration/phase5-group-d-recovery-coordination-integration.test.ts` |
| `test/phase5-group-d-surface-lifecycle-integration.test.ts` | `tests/integration/phase5-group-d-surface-lifecycle-integration.test.ts` |
| `test/phase5-product.test.ts` | `tests/integration/phase5-product.test.ts` |
| `test/phase5-recovery-auth.test.ts` | `tests/integration/phase5-recovery-auth.test.ts` |
| `test/phase5-scheduler-acceptance.test.ts` | `tests/integration/phase5-scheduler-acceptance.test.ts` |
| `test/phase5-second-rejection.test.ts` | `tests/integration/phase5-second-rejection.test.ts` |
| `test/phase6-a-local-hardening.test.ts` | `tests/unit/phase6-a-local-hardening.test.ts` |
| `test/phase6-a03-first-sync-conflict-resolution-authority.test.ts` | `tests/unit/phase6-a03-first-sync-conflict-resolution-authority.test.ts` |
| `test/phase6-alpha-diagnostic-logging.test.ts` | `tests/unit/phase6-alpha-diagnostic-logging.test.ts` |
| `test/phase6-alpha-full-sync-remediation.test.ts` | `tests/integration/phase6-alpha-full-sync-remediation.test.ts` |
| `test/phase6-alpha-ios-adapter-boundary.test.ts` | `tests/architecture/phase6-alpha-ios-adapter-boundary.test.ts` |
| `test/phase6-alpha-ios-content-reader.test.ts` | `tests/unit/phase6-alpha-ios-content-reader.test.ts` |
| `test/phase6-alpha-ios-oauth-launch.test.ts` | `tests/unit/phase6-alpha-ios-oauth-launch.test.ts` |
| `test/phase6-alpha-ios-sync-diagnostics.test.ts` | `tests/unit/phase6-alpha-ios-sync-diagnostics.test.ts` |
| `test/phase6-alpha-mixed-plan-isolation.test.ts` | `tests/unit/phase6-alpha-mixed-plan-isolation.test.ts` |
| `test/phase6-alpha-oauth-diagnostics.test.ts` | `tests/unit/phase6-alpha-oauth-diagnostics.test.ts` |
| `test/phase6-alpha-oauth-lifecycle.test.ts` | `tests/unit/phase6-alpha-oauth-lifecycle.test.ts` |
| `test/phase6-alpha-oauth-live.test.ts` | `tests/unit/phase6-alpha-oauth-live.test.ts` |
| `test/phase6-alpha-plan-errors-stability-rejection.test.ts` | `tests/adversarial/phase6-alpha-plan-errors-stability-rejection.test.ts` |
| `test/phase6-alpha-plan-errors-stability.test.ts` | `tests/unit/phase6-alpha-plan-errors-stability.test.ts` |
| `test/phase6-alpha-portable-collision.test.ts` | `tests/adversarial/phase6-alpha-portable-collision.test.ts` |
| `test/phase6-alpha-share-export.test.ts` | `tests/unit/phase6-alpha-share-export.test.ts` |
| `test/phase6-b-crash-state.test.ts` | `tests/adversarial/phase6-b-crash-state.test.ts` |
| `test/phase6-b-destructive-safety.test.ts` | `tests/adversarial/phase6-b-destructive-safety.test.ts` |
| `test/phase6-c-auth-security.test.ts` | `tests/unit/phase6-c-auth-security.test.ts` |
| `test/phase6-c-callback-security.test.ts` | `tests/unit/phase6-c-callback-security.test.ts` |
| `test/phase6-c01-ios-local-transaction-artifact-path.test.ts` | `tests/unit/phase6-c01-ios-local-transaction-artifact-path.test.ts` |
| `test/phase6-d-orchestration-v1.2.test.ts` | `tests/unit/phase6-d-orchestration-v1.2.test.ts` |
| `test/phase6-folder-authority-store-foundation.test.ts` | `tests/unit/phase6-folder-authority-store-foundation.test.ts` |
| `test/phase6-folder-create-foundation.test.ts` | `tests/unit/phase6-folder-create-foundation.test.ts` |
| `test/phase6-folder-remote-recovery-observation-foundation.test.ts` | `tests/unit/phase6-folder-remote-recovery-observation-foundation.test.ts` |
| `test/phase6-foundation-failure-provenance.test.ts` | `tests/adversarial/phase6-foundation-failure-provenance.test.ts` |
| `test/phase6-h-sync-integration.test.ts` | `tests/integration/phase6-h-sync-integration.test.ts` |
| `test/phase6-h-u2-affected-regression.test.ts` | `tests/integration/phase6-h-u2-affected-regression.test.ts` |
| `test/phase6-h-u3-dc13-affected-regression.test.ts` | `tests/integration/phase6-h-u3-dc13-affected-regression.test.ts` |
| `test/phase6-lat05-remote-planning-fast-path.test.ts` | `tests/unit/phase6-lat05-remote-planning-fast-path.test.ts` |
| `test/phase6-latency-measurement-foundation.test.ts` | `tests/unit/phase6-latency-measurement-foundation.test.ts` |
| `test/phase6-log02-google-http-transport-tracing.test.ts` | `tests/unit/phase6-log02-google-http-transport-tracing.test.ts` |
| `test/phase6-log03-google-drive-semantic-operation-tracing.test.ts` | `tests/unit/phase6-log03-google-drive-semantic-operation-tracing.test.ts` |
| `test/phase6-log06-diagnostic-bundle-operator-surface.test.ts` | `tests/unit/phase6-log06-diagnostic-bundle-operator-surface.test.ts` |
| `test/phase6-log07-end-to-end-observability-verification.test.ts` | `tests/integration/phase6-log07-end-to-end-observability-verification.test.ts` |
| `test/phase6-prelive-platform-runtime-wp2-r1.test.ts` | `tests/architecture/phase6-prelive-platform-runtime-wp2-r1.test.ts` |
| `test/phase6-prelive-platform-runtime-wp2.test.ts` | `tests/architecture/phase6-prelive-platform-runtime-wp2.test.ts` |
| `test/phase6-sync-architecture-foundation.test.ts` | `tests/unit/phase6-sync-architecture-foundation.test.ts` |
| `test/plan-presentation.test.ts` | `tests/unit/plan-presentation.test.ts` |
| `test/product-controller-reconstruction-recovery-r1.test.ts` | `tests/integration/product-controller-reconstruction-recovery-r1.test.ts` |
| `test/product-controller-uninitialized-first-sync.test.ts` | `tests/integration/product-controller-uninitialized-first-sync.test.ts` |
| `test/s07f-large-transfer-resource.test.ts` | `tests/unit/s07f-large-transfer-resource.test.ts` |
| `test/s09a-request-attribution.test.ts` | `tests/unit/s09a-request-attribution.test.ts` |
| `test/support/dec339-inventory-idb-fixtures.ts` | `tests/fixtures/dec339-inventory-idb-fixtures.ts` |
| `test/workstreams/drive/phase6-configured-root-recovery.test.ts` | `tests/contracts/drive/phase6-configured-root-recovery.test.ts` |
| `test/workstreams/drive/phase6-remote-protocol-v1.3.test.ts` | `tests/contracts/drive/phase6-remote-protocol-v1.3.test.ts` |
| `test/workstreams/drive/phase6-remote-protocol.test.ts` | `tests/contracts/drive/phase6-remote-protocol.test.ts` |
| `test/workstreams/integration/h-u2-mutation-restart-integration.test.ts` | `tests/integration/integration/h-u2-mutation-restart-integration.test.ts` |
| `test/workstreams/integration/h-u3-feed-lifecycle-merge-integration.test.ts` | `tests/integration/integration/h-u3-feed-lifecycle-merge-integration.test.ts` |
| `test/workstreams/local/local-recovery-matrix.test.ts` | `tests/unit/local/local-recovery-matrix.test.ts` |
| `test/workstreams/local/local-transaction-safety.test.ts` | `tests/unit/local/local-transaction-safety.test.ts` |
| `test/workstreams/local/local-v1_3-failure-provenance.test.ts` | `tests/unit/local/local-v1_3-failure-provenance.test.ts` |
| `test/workstreams/merge/resource-safety.test.ts` | `tests/unit/merge/resource-safety.test.ts` |
| `test/workstreams/orchestration/lat04-authoritative-precondition-dedup.test.ts` | `tests/integration/orchestration/lat04-authoritative-precondition-dedup.test.ts` |
| `test/workstreams/orchestration/log04-execution-diagnostics.test.ts` | `tests/integration/orchestration/log04-execution-diagnostics.test.ts` |
| `test/workstreams/orchestration/v1.2-authoritative-boundary.test.ts` | `tests/integration/orchestration/v1.2-authoritative-boundary.test.ts` |
| `test/workstreams/orchestration/v1.2-authoritative-commit-lifecycle.test.ts` | `tests/integration/orchestration/v1.2-authoritative-commit-lifecycle.test.ts` |
| `test/workstreams/orchestration/v1.2-d-c13-predecessor-preserving-update.test.ts` | `tests/integration/orchestration/v1.2-d-c13-predecessor-preserving-update.test.ts` |
| `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts` | `tests/integration/orchestration/v1.2-durable-intent-recovery.test.ts` |
| `test/workstreams/orchestration/v1.2-effect-verified-convergence.test.ts` | `tests/integration/orchestration/v1.2-effect-verified-convergence.test.ts` |
| `test/workstreams/orchestration/v1.2-folder-identity-production.test.ts` | `tests/integration/orchestration/v1.2-folder-identity-production.test.ts` |
| `test/workstreams/orchestration/v1.2-mutation-lifecycle.test.ts` | `tests/integration/orchestration/v1.2-mutation-lifecycle.test.ts` |
| `test/workstreams/orchestration/v1.2-production-authority-path.test.ts` | `tests/integration/orchestration/v1.2-production-authority-path.test.ts` |
| `test/workstreams/orchestration/v1.2-production-identity-authority.test.ts` | `tests/integration/orchestration/v1.2-production-identity-authority.test.ts` |
| `test/workstreams/orchestration/v1.2-production-lifecycle-composition.test.ts` | `tests/integration/orchestration/v1.2-production-lifecycle-composition.test.ts` |
| `test/workstreams/orchestration/v1.2-reliable-changes.test.ts` | `tests/integration/orchestration/v1.2-reliable-changes.test.ts` |
| `test/workstreams/orchestration/v1.2-remote-feed-authority.test.ts` | `tests/integration/orchestration/v1.2-remote-feed-authority.test.ts` |
| `test/workstreams/orchestration/v1.2-remote-folder-restart.test.ts` | `tests/integration/orchestration/v1.2-remote-folder-restart.test.ts` |
| `test/workstreams/orchestration/v1.3-failure-provenance-extension.test.ts` | `tests/integration/orchestration/v1.3-failure-provenance-extension.test.ts` |
| `test/workstreams/state/state-authority-v1-1.test.ts` | `tests/unit/state/state-authority-v1-1.test.ts` |
| `test/workstreams/state/state-authority.test.ts` | `tests/unit/state/state-authority.test.ts` |
