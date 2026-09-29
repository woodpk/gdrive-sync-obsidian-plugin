# BVP-S05E — Declarative Canaries and Scenario-Cost Proof

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence
**Predecessor:** accepted S05D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Authoritative Acceptance Record

S05E is complete and accepted.

- accepted S05D predecessor / PHX-CI base: `a990838016fc13d83e8a853c301a41b49fdc334c`;
- accepted implementation / verification HEAD: `8f2740469060d9b000cf8489ffaff68ac541fb00`;
- authoritative PHX-CI evidence SHA: `aa88c5e6a84f739ffe99e42a1eb1cab601f82106`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused architecture-metrics regression verification: PASS, 37/37;
- focused S05E canaries: PASS, 3/3;
- integrated BVP tests: PASS, 167/167;
- full repository verification: PASS;
- architecture guard / metrics: PASS;
- framework core: 3,813 / 4,000 logical TypeScript LOC, delta 0 for S05E;
- scenario catalog: 2 scenarios / 46 logical LOC total;
- `multi-device-conflict`: 24 logical LOC;
- `ordinary-one-sided-sync`: 22 logical LOC;
- scenario-specific PowerShell: 0;
- scenario-specific production source: 0;
- production seam: 112 logical LOC / 1 file;
- production artifact unchanged.

Canary requirement mapping and result:

- `multi-device-conflict` traces to `CONFLICT-001`, `CONFLICT-003`, and `PLAN-003`; it establishes a shared base through real production synchronization, creates divergent independent text edits on two devices, and objectively observes an `unresolved-conflict` plan through the canonical S05C evidence path;
- the deliberately inverted expectation fails deterministically with `assertion-mismatch`, proving that diagnostics or mere command completion cannot manufacture PASS;
- `ordinary-one-sided-sync` traces to `SYNC-013` and `PLAN-003`; it synchronizes a local-only opaque file through the shared remote and into the second device through the frozen common runner/core;
- the second-scenario commit `ed44b0f4422719f250d42bdf42b9841c6ef2837f` changes only `test-platform/scenarios/ordinary-one-sided-sync.ts`, proving zero common-core, production, PowerShell, vocabulary, assertion-engine, or virtual-world change for the second ordinary scenario.

The pre-S05E architecture-metrics regression test contained a stale zero-scenario assumption. S05E corrected that test to validate structural scenario-metric consistency and the frozen scenario cost limits rather than hard-code an empty catalog. This was test-governance adaptation to the intended S05E state and did not alter metric implementation or architecture budgets.

No S06/S07 scenario batches, live execution, production source, core runner capability, scenario vocabulary, evidence family, or checkpoint architecture were added.

This file is now a historical completion record and authorizes no further S05E implementation work.

## 1. Objective

Prove that the S04/S05 platform can express and execute ordinary multi-device synchronization tests as declarative data, and prove that adding a second ordinary scenario does not require a platform-core change.

## 2. Required End State

At least two representative deterministic canaries exist and pass through the common scenario model/runner/assertion/evidence path.

The canary set must include:

- at least one multi-device merge/conflict-style scenario exercising real production synchronization semantics;
- a second ordinary scenario that uses the already-frozen vocabulary/core and is implemented by scenario/fixture/test data only.

A deliberately wrong expectation for a canary must fail deterministically.

## 3. Dispatch Binding — Hard Data Only

The S05E contract is bound to the accepted S05D/S05C/S05B/S05A repository state as follows:

- exact accepted S05D predecessor / PHX-CI base: `a990838016fc13d83e8a853c301a41b49fdc334c`;
- exact task branch: `bvp-s05e-declarative-canaries-cost-proof`;
- scenario catalog root: `test-platform/scenarios/` (excluded from framework-core LOC and measured separately by the frozen architecture metrics);
- first canary path: `test-platform/scenarios/multi-device-conflict.ts`;
- second ordinary scenario path: `test-platform/scenarios/ordinary-one-sided-sync.ts`;
- focused test path: `test-platform/test/scenario-canaries.test.ts`;
- exact S05E implementation-writable allowlist is those three paths plus `test-platform/test/architecture-metrics.test.ts`, solely to replace the stale pre-S05E zero-scenario baseline assertion with structural scenario-metric consistency/cost checks;
- no changes to `test-platform/src/**`, `src/**`, `dev/scripts/**`, governance, PHX-CI configuration, checkpoint code, live-device surfaces, or production are authorized;
- accepted execution path: `DeterministicScenarioRunner.canonical()` using the frozen S05A–S05D contract/runner/evidence surfaces;
- focused command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/scenario-canaries.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `ordinary`;
- current accepted framework core: 3,813 / 4,000 logical TypeScript LOC; S05E must produce zero framework-core LOC delta;
- current scenario baseline: 0 scenarios / 0 scenario logical LOC;
- each new scenario targets <=120 logical lines and hard-fails above 200 logical lines;
- scenario-specific PowerShell baseline/required result: 0;
- scenario-specific production baseline/required result: 0;
- production artifact must remain byte-identical;
- BVP-GOV-010 size gate: PASS — two declarative scenario files plus one focused canary test and one bounded update to the existing architecture-metrics regression test, all outside framework-core classification; no new subsystem, dependency, core capability, or production surface.

The platform core is treated as frozen for the second-scenario proof unless a genuinely missing generic capability causes a BLOCKED return.

## 4. Canary Semantics

### 4.1 First canary

Use the existing generic vocabulary to exercise a meaningful multi-device production-path merge/conflict behavior.

The canary must assert objective results such as final content/identity/conflict classification/state rather than only successful command completion.

### 4.2 Second ordinary canary

Add another ordinary scenario after the common core is already sufficient.

Its implementation must require no change to:

- runner core;
- scenario vocabulary;
- generic assertion/evidence engine;
- virtual-world core;
- production source;
- transport/persistence architecture.

Scenario-specific fixture data/helpers are permitted only inside the scenario/fixture layer.

### 4.3 Cost tripwire

Each ordinary scenario:

- targets ≤120 logical lines;
- hard-fails architecture acceptance above 200 logical lines;
- introduces zero scenario-specific PowerShell;
- introduces zero scenario-specific production source.

If an ordinary scenario requires a new platform abstraction/core capability, STOP and report the missing generic capability rather than silently changing core.

## 5. Invariants

- Scenarios remain data.
- No scenario ID branches appear in core runner/world/production.
- Production semantics are executed by real production logic.
- Evidence uses the canonical S05C model.
- Checkpoint representation is not required unless the canary semantically needs a generic checkpoint.
- Architecture metrics distinguish scenario growth from core growth.

## 6. Material Edge / Failure Cases

Tests/evidence must prove:

- first canary passes with correct expectations;
- an inverted/wrong expectation fails;
- second canary passes;
- second canary's change surface is scenario/fixture/test only;
- no core files need modification for the second canary;
- each scenario remains below hard LOC limit;
- scenario-specific PowerShell count remains zero;
- production scenario-specific source remains zero.

## 7. Engineering Discretion

The agent may choose the exact representative canary subjects provided they satisfy the required merge/conflict and second-ordinary-scenario proof and map to real BRAIN requirements.

Scenario data syntax follows accepted S05A; do not redesign it for stylistic preference.

## 8. Dependencies

Consumes all accepted S04 and S05A–S05D capabilities.

Successful completion freezes the P3 common core for scenario-dominant S06/S07 coverage.

## 9. Acceptance Criteria

Acceptance requires two declarative canaries, wrong-expectation detection, scenario-only second addition, scenario-cost compliance, no core/production/PowerShell growth for the second ordinary scenario, requirement traceability, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not:

- migrate full reconciliation coverage;
- add S06/S07 scenario batches;
- expand the vocabulary merely for convenience;
- add live execution;
- modify production source.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, canary requirement mappings/results, wrong-expectation result, second-scenario change-surface proof, per-scenario LOC, core metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin S06.
