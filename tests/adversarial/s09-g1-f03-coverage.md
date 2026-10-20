# F-03 Post-Build Adversarial Test Coverage — S09 G1

FORM: F-03  
HANDOFF_ID: WS07-S09G1-F03-20261017-001  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Exact production input: `f92c488a5d8c2f511eb3f494d7c91b7717a66e45` (tree `9cc753e4de2360d282406d4e13f62f9a6abced43`)  
Historical test input: `39d1f0c3ecf9b76b52ede5f17e1a804893c917b0`; this is a migration snapshot, **not** a retroactive F-01 completion.  
Frozen F-02 review: `0a5b72cdf5ebc01650232595a1c3b4cd690953e8`; the frozen report reviewed `1dacb1e5213dac74135f98bce43e4fe3b449e8bc`, before the corrected source.  
Test branch: `test/ws07-s09g1-f03-adversarial-20261017-001`.

## Independently added or adapted test cases

| Requirement / F-02 finding | New/adapted test and exact assertion intent | Deterministic seam |
| --- | --- | --- |
| F02-01 HIGH; AUTH-011/012, PLAN-005/009, STATE-009/010, STATE-017, LIFE-002 | `tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts` — "deauthorization revokes entry points immediately but waits for atomic/durable completion before unpairing"; confirms scheduler/tokens retired synchronously, no namespace save before operation quiescence, no further old-run admission, non-destructive unpair, durable restart | Controlled pending `beginRuntimeDisposal` promise with explicit release; real `ProductRuntime.deauthorize` and `PluginDataRepository` persistence; the synthetic controller models the quiescence contract (not a claim that a physical Drive mutation executed) |
| F02-01; STATE-009/010, STATE-017 | Same file — "failed durable unpairing does not restore old run authority or silently change persisted namespace"; persistent failure-before-write, old controller retired, old durable pairing preserved, restart and explicit retry | In-memory durable document with injected first-write failure; real runtime disposal and repository transaction |
| F02-02 MODERATE; SYNC-008/009, AUTH-011/012 | Same file — "later initialize supersedes initializer suspended at adapter await, retires its adapter, and is sole runtime owner"; first initializer suspended at adapter construction, newer one supersedes, old adapter disposed, only successor publishes controller/boundary, disposal releases current adapter | Actual runtime `initialize()` state machine and resource publication; gated fake local adapter and Node Obsidian shim; no remote provider access |
| F02-02; LIFE-002, STATE-008 | Same file — "deauthorization while initialize awaits adapter prevents publication of either stale controller or old remote boundary"; old initializer rejected, adapter released, unpaired identity durable | Controlled pending `createLocalAdapter` await, real `initialize` / `deauthorize` ordering |
| F02-01; AUTH-012, REM-003, STATE-008 | `tests/adversarial/s09-g1-pairing-epoch-stale-results.test.ts` — delayed Pair result after deauthorization; verifies no stale re-pair/namespace reuse and restart isolation | Gated provider `pairManagedRoot`; actual runtime post-await binding and settings transaction |
| F02-01; REM-003, STATE-008, STATE-017 | Same file — delayed Create result after deauthorization; verifies orphaned result cannot become persisted pairing | Gated provider `createManagedRoot`; preserves distinction between a provider-side created object and authorization to persist pairing |
| F02-01; AUTH-012, STATE-008 | Same file — fresh explicit Pair after stale result; checks fresh state/text namespaces, automatic sync disabled and first-sync remains incomplete | Actual `pairManagedRemote` identity/persistence gate, with adapter reinitialization intentionally isolated as a separate lifecycle test |
| PLAN-005, STATE-009; inherited G1-07 scope/lifecycle invariant | Same file — stale reconciliation callback versus a new exclusion-policy generation in **both** orderings, persisted after restart | Real `completeFullReconciliation` and `PluginDataRepository` serialization; two explicit orderings |
| LIFE-002, F02-01; compatible controller disposal | `tests/integration/phase5-group-d-surface-lifecycle-integration.test.ts` — existing G2 scenario 50 mock now models idempotent `beginRuntimeDisposal` transition, retaining its **one retirement**, non-destructive behavior, settings reset, and cleanup assertions | Adapted original mock to the real idempotent `ProductController.beginRuntimeDisposal` semantics; existing objective behavior remains asserted |

## Preserved independent regression coverage (not rewritten)

- `tests/adversarial/plugin-data-integrity-regression.test.ts`: existing G1-01–07 plugin-data parsing/absence, completed-sync identity, deauthorization namespace reset, failed write uncertainty, concurrent settings edits and restart safety.
- `tests/integration/phase5-group-d-recovery-coordination-integration.test.ts`: G2 scenarios 27–30 exercise actual controller cancellation/no future operation, pause/resume, nonoverlapping runtime runs and lease isolation. These tests complement the new runtime-level cancellation/quiescence ordering tests.
- `tests/integration/phase5-group-d-surface-lifecycle-integration.test.ts`: G2 scenario 50 non-destructive device deauthorization and cleanup, G1-07 real callback/UI patch interleavings, plus existing notification and lifecycle integration.
- `tests/integration/phase5-group-b-scope-transfer.test.ts`: B4 auth revoked, transient provider failure, and rate limiting after a transfer starts without false cursor/local commits.
- `tests/unit/phase6-alpha-oauth-lifecycle.test.ts`: T1–T7 callback single registration/current-session delegation, initialization lifecycle and no secret leakage.
- `tests/integration/s09-g106-legacy-pairing-planner-integration.test.ts`: legacy R1 BASE does not authorize destructive fresh R2 state.
- Existing architecture, scenario, and state-recovery tests remain in place; no claims of universal physical or provider coverage.

## Boundaries, assumptions, and separate gate

F-03 authoring only. All new tests run against the real runtime/persistence methods with controlled local/provider/adapter seams; synthetic fixtures do not prove live remote mutation, OS OAuth, real browser callback cancellation, actual iOS lifecycle, crash-resilient physical storage, or PHX-CI PASS. The new unit-adjacent fake controller specifically asserts the runtime's quiescence/ordering *contract* and is complemented by the existing real-controller cancellation suite. F02-02 is tested at real runtime initialization boundaries; scheduler uniqueness beyond the current live runtime's single published controller is not asserted from mock counts.

PHX-CI-only discovery: `tsconfig.test.json` compiles `tests/**/*.ts`; `package.json` `npm test` includes `node --test ".test-build/tests/**/*.test.js"`. The future F-04 Tester must bind the exact Builder-integrated production/test SHA, pinned PHX-CI runtime, selected/attempted/passed/failed/skipped module/case counts, and original canonical evidence. No test/build/typecheck, PHX-CI, live Drive/vault, physical S09, or acceptance executed in this F-03 session.

**Expected handoff:** Builder inspects the exact test commit/tree, integrates test-owned commits without editing their assertions, persists/updates canonical handoff/current state, then issues a separate exact-candidate F-04. Any actual PHX-CI failure must route to F-05 with causal ownership rather than weakening expected outcomes.

## GDC handoff 4 — Tester adequacy and mechanical import repair (2026-10-19)

This addendum records assessment of the ten current Forms/Protocol adequacy families **without** representing historical F-03 as a new independent Pass A/B. The original `npm test` run (PHX-CI `bf21fd33-9253-459c-a0a9-ec7a7e2ff90a`) exposed obsolete relative side-effect imports left by the test-directory migration. Nine aggregators were repaired to reference the **existing committed substantive test modules** under `tests/{unit,integration,contracts,adversarial}/`. No assertion, test-case body, test data, or test oracle was deleted, rewritten, relaxed, or stubbed. This is not evidence of PHX-CI PASS; every restored substantive test remains required.

| Governance adequacy family | Current relevant coverage and risk disposition |
| --- | --- |
| Nominal/success | Existing production/runtime init, pairing, local/Drive merge and controller scenario success checks; restored aggregation must execute in PHX-CI. |
| Negative, malformed, unsupported, boundaries | Plugin-data malformed settings/absence and malformed state, Drive/API failures, invalid pairing and scope exclusions; verify all run. |
| State transitions and forbidden transitions | G1 deauthorization, prohibited old-run admission, obsolete initialization, authoritative pairing epoch; relevant F03 tests preserved. |
| Repetition, idempotency, retry, cancellation, recovery | Non-destructive repeated deauthorization, failed persistence retry, controller cancellation, crash/restarter regression; restored module imports are mandatory. |
| Concurrency, races, ordering, stale authority | F02-01/02 deterministic gates, stale Pair/Create, exclusion-policy generations in opposing orderings; preserve all assertions. |
| Persistence, restart, data integrity | PluginDataRepository reopen, persisted pairing namespace, crash/state authority, v1.1 journals and recovery; restored dependent suites. |
| Identity, authorization, trust, security | Pairing identity/epoch, OAuth revocation, stale token handling, root/provenance, exclusion and authorization gates; no live credentials required. |
| Public contracts, integration, compatibility | Google Drive response and configured-root contracts, controller and scoped adapter integration, preexisting compatibility suites. |
| Architecture, ownership, invariants | PHX-CI-consumed BVP architecture guard, production-only source boundary, scheduler/controller/adapter lifecycle and zero destructive effects on unpair. |
| End-to-end, fail-closed, destructive behavior | Deterministic multi-component sync/restart and destructive-safety scenarios; **physical S09, real Google Drive mutation, iOS termination and OS-level execution remain separately gated, NOT demonstrated by this repair**. |

**Risk-driven methods:** Explicit deterministic fault injection and scheduled interleaving are material for pairing/teardown authority, stale async callbacks, durability boundaries, and destructive safety; those techniques already exist in inherited G1 tests. No arbitrary property/fuzz test count is imposed without new risk evidence. The reopened suites must run via PHX-CI, with special attention to runtime adapter quiescence, failed writes, stale results and root-observability discrepancies.

**Remaining verification obligation:** PHX-CI must confirm the repaired imports actually compile/execute and investigate the remaining F02-02 and configured-root assertions. A nominal green test count alone does not satisfy this adequacy gate. The tester must verify each relevant family against authoritative requirements and report true gaps before acceptance. No existing substantive assertion may be modified solely to obtain PASS.
