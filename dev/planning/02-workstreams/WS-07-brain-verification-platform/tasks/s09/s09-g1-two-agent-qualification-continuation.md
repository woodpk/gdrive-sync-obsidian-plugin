# S09 G1 — Two-agent Builder qualification continuation (2026-10-19)

## Authority and migration boundary
Current shared Builder–Reviewer Forms, Protocol and Manual supersede the former three-agent/GDC process. This document records a forward-only continuation; historical F-02/F-03/F-04, GDC, original Tester-owned commits and independent review records remain historical evidence, not current dispatch/authorization. The Builder now owns all test authorship, fixtures, test integrity, PHX-CI execution, repair and evidence. The independent Reviewer enters only after complete Builder PHX-CI qualification.

## Feature and position
Repository: `woodpk/gdrive-sync-obsidian-plugin`.
Stage: Stage 2A, Phase 6. Workstream: `WS-07-brain-verification-platform`.
Build Unit: `S09_G1_PLUGIN_DATA_INTEGRITY_MITIGATION`.
Most recent substantive PHX-CI run inspected: `28fb2dad-8771-49f2-9842-2cf39cb966fc`, candidate `1bcf4cef2886fa5d595041b887c2bb6e10a4bd05`, evidence `edaef154bbf034fb1224c991e4ffdda7f97f4b97`: typecheck, focused/full tests, build, artifacts PASS; repository-check FAIL; overall BLOCKED. No feature acceptance.
Frozen `test-platform/src/repository-check.ts` restored byte-for-byte from accepted baseline in correction `f941bf7aea3b35c496374b9ddd596d4725e02ea6`. Its new source/test candidate has NOT received PHX-CI PASS. Generated `main.js` hash is not release-approved and MUST NOT be added to a promotion allowlist merely to attain PASS.

## Immediate Builder-owned work
1. Reconcile current `dev/state/current-state.yaml` without erasing historical evidence. Derive the next exact candidate from the current authorized branch and verify its complete source/test tree and acceptance constraints.
2. Inventory actual test cases, assertions and PHX-CI discovery for this Build Unit against each of the ten mandatory families; record specific gaps and concrete nonapplicability rationale. No family may be justified solely by inherited test count or a green run.
3. Prioritize deterministic dual-order concurrency / stale authorization (5), restart / failed-write durability (6), cancellation / resource lifecycle (4,9), pairing identity / revoked credentials (3,7), and integrated fail-closed contracts (8,10). Preserve nominal and negative tests (1,2), adding only truly missing cases.
4. Repair genuine defects with Test-Change Integrity and no oracle weakening. Use PHX-CI exclusively for executable verification.
5. Execute full source-and-tests PHX-CI qualification, publish exact original run evidence and substantive PASS. Only then issue blind-safe final Builder→Reviewer handoff specified in current Forms.

## Known boundaries
Physical S09A acceptance, live Drive/vault, installation/activation, master merge, promotion and release remain outside this Build Unit's current authority. Do not retroactively relabel historical independent test authorship as Builder-authored. Historical risk acceptance DEC-344 does not itself authorize deployment or newly approved shipping hashes.

## Adequacy audit — preliminary; substantive inspection still required
1. Nominal/success: Existing `tests/adversarial/plugin-data-integrity-regression.test.ts` and product/integration suites exercise fresh installation and valid identity retention. Audit discovery.
2. Negative/boundary: Existing malformed/missing/partial `data.json` and failed absence detection tests; audit unsupported/malformed OAuth and injected storage failures.
3. Transitions: Existing post-pair restrictions, deliberate deauthorization and stale Pair/Create refusals; strengthen forbidden effects at durable boundary.
4. Repetition/cancellation/recovery: Existing failed deauthorization and controller quiescence tests; expand repeated teardown and exactly-once raw adapter disposal / failed initialization.
5. Concurrency/order: Existing gated stale Pair/Create, two-order reconciliation, initializer and deauthorization races; highest risk—expand scheduler/adapter/OAuth/write interleavings.
6. Persistence/restart: Existing repository reopen, namespace rotation and uncertain-save tests; expand durable fault injection and restart with newest resource owner.
7. Identity/authorization: Existing epoch, pairing-root and token retirement assertions; expand stale token/authority effects and cross-pair isolation.
8. Contracts/integration: Existing real `ProductRuntime` and `PluginDataRepository` fixture integrations plus legacy pairing recovery; audit runtime-to-adapter boundary.
9. Architecture/ownership: Frozen repository guard and resource-lifetime tests; confirm normal successful adapter disposal after quiescence and scheduler exactly-once stop.
10. End-to-end/fail-closed/destructive: Deterministic multi-component tests present; physical S09 deliberately separate and cannot be claimed from mocked tests. Expand destructive side-effect absence assertions.
No entire test family has been shown absent; coverage depth and execution discovery require qualification. This table is not a substitute for requirement-by-assertion traceability or PHX-CI.

## Builder test changes on this continuation branch
- `tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts`: strengthen F02-01 runtime teardown to assert exactly one scheduler stop and one local-dispose action; strengthen F02-02 successor initialization to assert raw adapters 1 and 2 each dispose exactly once even after repeated `disposeProduct()`. These tests address families 4, 5, 6 and 9 without relaxing historical oracles.
- These test edits have NOT been compiled or executed. PHX-CI acceptance and full ten-family adequacy sign-off remain pending.

## Expanded adversarial assertions — Builder continuation
Current owned test: `tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts`.
- **LIFE-002 / families 4, 5, 9:** an in-flight controller must quiesce before raw-adapter disposal; synchronous scheduler stop is exactly once. A second runtime disposal must not repeat adapter disposal.
- **STATE-009/010/017 / families 4, 6, 7, 10:** failed deauthorization preserves durable old namespace; a later explicit successful retry persists an unpaired state visible on restart, without double-stopping the retired scheduler.
- **F02-02 / families 4, 5, 9:** both superseded and succeeding raw adapters are released exactly once despite a repeated teardown.
- **LIFE-002 / families 4, 9, 10:** injected `beginRuntimeDisposal` rejection still releases the underlying raw adapter and attention persistence from `finally`, clears stale authority, and avoids repeat cleanup.

These new assertions are **UNEXECUTED** until qualified through PHX-CI. Existing test oracle semantics were preserved. Mandatory end-to-end physical iOS/Windows proof remains a separately authorized S09 gate. No declaration of comprehensive ten-family sufficiency before PHX-CI discovery and exact-candidate evidence.
