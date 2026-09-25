# BVP-S03C — Implement Architecture Metrics and Hard Budget Gates

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Predecessor child:** accepted S03B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This prompt is the complete semantic contract for S03C with the current execution binding filled by the supervisor. Corrections to an implementation must restore this contract; they must not broaden or redesign it.

## 1. Objective

Implement one deterministic repository metrics/budget evaluator that makes the BVP architecture-size constraints executable policy.

The metrics surface exists to answer:

> What is the current BVP/production-seam architecture size and dependency footprint, how did it change from an optional base, and does it remain within the hard budgets fixed by the BVP specification?

It is not a benchmarking framework, general code-quality analyzer, or substitute for functional tests.

## 2. Required End State

When complete:

- `dev/scripts/Get-TestingArchitectureMetrics.ps1` (or the exact path already fixed by current governance) calculates all BVP-GOV-003 metrics;
- hard BVP-GOV-004 budgets are evaluated deterministically and fail closed;
- optional base-SHA input produces before/after deltas for the current work package without mutating either state;
- metrics classification follows the authoritative boundary manifest and accepted BVP ownership model;
- deterministic tests prove counting/classification and budget failures;
- the compliant accepted repository produces a stable baseline;
- no PHX-CI repository-check wiring is added yet; 03D owns that integration.

## 3. Execution-Time Binding

The semantic contract above and below is prewritten and fixed. The supervisor binds only hard repository coordinates.

### Bound for this execution

Accepted S03B authority:

- accepted S03B verified implementation SHA: `67959da9e3a52d5580fc790fe48a9c98b3eb322c`;
- accepted S03B PHX-CI evidence / promoted integration predecessor SHA: `78f5f8f7f118e280ee25710f567288a68ba69278`;
- the accepted predecessor for S03C is the **promoted evidence head `78f5f8f...`**, not the earlier implementation-only SHA `67959da...`.

Task branch:

- exact branch: `bvp-s03c-architecture-metrics-budget-gates`;
- the supervisor creates this branch from the `phase6-integration` tasking head containing this bound prompt;
- the worker MUST use that already-created exact branch and MUST NOT choose a different predecessor, recreate the branch from `67959da...`, rebase it, or substitute another branch tip.

Current architecture authority:

- boundary manifest: `dev/governance/testing-platform-boundary.yaml`;
- production root: `src/`;
- testing-platform root: `test-platform/`;
- active development/governance root: `dev/`;
- archive root: `dev/archive/`;
- current concrete production seam allowlist: empty; S03C therefore measures the current production BVP-only seam as zero unless repository content/manifest authority on the bound task branch establishes an explicitly enumerated approved seam;
- current live-device agent/relay subset: absent at S03C;
- current ordinary declarative scenario catalog: absent at S03C;
- current active test-platform source surface is `test-platform/src/platform-root.ts`; tests under `test-platform/test/**` are test code, not framework-core LOC.

Concrete S03C implementation surfaces:

- metrics evaluator: `dev/scripts/Get-TestingArchitectureMetrics.ps1`;
- focused metrics test: `test-platform/test/architecture-metrics.test.ts`;
- test compilation authority: existing `test-platform/tsconfig.json`, which already includes `test/**/*.ts` and is **not writable** in S03C;
- package-script integration surface: `package.json`;
- exact focused package script to add: `test:bvp-architecture-metrics`;
- exact focused command: `npm run test:bvp-architecture-metrics`;
- the package script must compile `test-platform/tsconfig.json` and run only the compiled `.test-build/bvp/test/architecture-metrics.test.js` focused test, following the established S03B focused-test shape.

Exact writable-path allowlist:

1. `dev/scripts/Get-TestingArchitectureMetrics.ps1`;
2. `test-platform/test/architecture-metrics.test.ts`;
3. `package.json`.

Everything else is read-only for S03C, including:

- `dev/governance/testing-platform-boundary.yaml`;
- `dev/scripts/Test-TestingArchitectureGuard.ps1`;
- `test-platform/tsconfig.json`;
- `phx-ci.json`;
- `Taskfile.phx-ci.yml`;
- `Taskfile.yml`;
- production `src/**`;
- PHX-CI evidence files.

PHX-CI authority:

- base authority: `origin/phase6-integration`;
- current framework pin inherited from the accepted integration branch: `56a2b1be50cd1f4338974d21ebdeb9487e737598`;
- deployed runtime authority: `%LOCALAPPDATA%/PHX-CI/runtimes/56a2b1be50cd1f4338974d21ebdeb9487e737598`;
- authoritative task-branch publication mode: `push`;
- authoritative focused command: `npm run test:bvp-architecture-metrics`;
- the target branch's actual `phx-ci.json` remains runtime authority if an explicitly accepted repin occurs before verification.

Dispatch size-gate confirmation:

- this child introduces one platform-level contract family only: architecture metrics/hard-budget evaluation;
- bounded implementation surface is one new non-test implementation file plus one focused test file and one package-script edit;
- no split is required under BVP-GOV-010 / the execution-contract child-session size gate;
- accepted S03B audit recorded the active BVP PowerShell governance/verification surface at 3 scripts / 1,111 logical LOC. The new metrics evaluator becomes the fourth script and MUST keep the independently measured BVP PowerShell surface within the frozen maximum of 4 scripts / 1,500 logical LOC. That prior 1,111 value is dispatch sizing context, not an expected metric value to hard-code; S03C must calculate the baseline independently under its tested counting rule.

Binding may not change the metric families, budgets, failure semantics, or non-goals below. If repository reality requires another writable path or a different architecture contract, return `BLOCKED` rather than expanding scope.

## Dependencies

S03C depends on the accepted S03B architecture guard, the active boundary manifest, and the hard BVP-GOV-003/BVP-GOV-004 metric and budget contracts. It does not depend on 03D PHX-CI wiring, which is intentionally later.

## 4. Required Metrics

At minimum calculate and expose:

1. production-only source LOC;
2. production source LOC/files whose sole purpose is the approved BVP production seam;
3. BVP core-framework LOC excluding tests and declarative scenario definitions;
4. live-device agent/relay subset LOC;
5. declarative scenario-definition LOC by scenario;
6. count of BVP platform-core runtime modules;
7. count and list of production modules imported by BVP;
8. BVP PowerShell script count and combined logical LOC;
9. when a base SHA is supplied, before/after value and delta for metrics for which historical comparison is meaningful.

Metrics must be derived from repository content/classification, not copied from expected values in tests.

Generated artifacts, dependency directories, Git metadata, and unrelated archived material are not source metrics.

## 5. Hard Budget Semantics

Unless later explicit user authority changes the BVP specification, enforce:

- production BVP-only seam: **≤350 logical source lines across ≤4 production files**;
- BVP framework core: **≤4,000 logical TypeScript source lines**;
- live-device agent/relay subset: **≤750 logical TypeScript source lines**;
- each ordinary declarative scenario: target ≤120 logical lines, **hard maximum 200 logical lines**;
- scenario-specific PowerShell scripts: **0**;
- BVP PowerShell governance/verification scripts: **≤4 scripts and ≤1,500 logical lines combined**;
- scenario-specific production source files/classes/interfaces: **0**.

The target value (120 lines) is informative; exceeding it alone is not a hard failure until the 200-line maximum is crossed, but the metric must make the over-target condition observable.

A hard-budget violation returns a deterministic nonzero result and identifies the violated budget and measured value.

## 6. Classification Semantics

Metrics must classify code by architectural role, not by convenient counting that hides growth.

At minimum:

- production source is under the manifest-defined production root;
- BVP implementation is under the manifest-defined testing-platform root plus the explicitly approved BVP governance scripts;
- production BVP-only seam includes only production code whose sole purpose is exposing the approved BVP seam;
- framework core excludes test files and ordinary declarative scenario definitions but includes runner/interpreter/generic assertions/evidence/adapters/orchestration;
- live-agent/relay subset is a subset of BVP code and remains separately measurable;
- scenario-specific production artifacts are prohibited rather than absorbed into generic production totals;
- archive content is excluded from active architecture metrics.

If a source file cannot be classified safely under current manifest/contracts, fail closed or report a blocking classification error rather than silently placing it in the least restrictive category.

## 7. Logical LOC Semantics

Counting must be deterministic and resistant to trivial formatting/comment changes.

Logical source LOC:

- counts source lines containing executable/declarative code;
- excludes blank lines and comment-only lines;
- excludes generated artifacts;
- applies the same documented counting rule consistently to TypeScript and PowerShell where those budget families apply.

Exact parsing/counting mechanics are engineering discretion. Tests must establish the chosen method for representative blank, comment-only, inline-code/comment, and normal-code cases so future metric changes cannot silently redefine the budget denominator.

## 8. Base / Delta Semantics

When supplied a base SHA:

- validate that the base can be read;
- measure the same metric definitions against base and current target;
- emit base value, current value, and delta;
- do not checkout/reset/mutate the control worktree merely to measure the base;
- do not treat inability to read a required base as a zero baseline.

When no base is supplied, current metrics still work; delta fields may be explicitly unavailable.

## 9. Output / Failure Semantics

Output must be deterministic enough for PHX-CI evidence and supervisor review.

It must expose:

- each required metric;
- each hard budget and PASS/FAIL state;
- offending files/items where needed to make a failure actionable;
- base/current/delta when requested;
- overall PASS only if all applicable hard budgets/classifications pass.

The exact serialization may be human-readable, machine-readable, or both, provided 03D/PHX-CI can consume the stable result without scraping ambiguous prose.

Malformed/missing required governance data fails closed.

## Invariants

- Metric definitions and hard budget values come from BVP authority, not from the current implementation's convenience.
- The same classification/counting semantics apply to baseline and delta measurement.
- Unknown/unclassifiable active BVP code cannot be hidden in a permissive category.
- Archive/generated/dependency content cannot inflate or mask active source metrics.
- A hard-budget failure blocks acceptance even when functional tests pass.
- The metrics evaluator is read-only and cannot change repository state to obtain a measurement.

## 10. Material Edge / Failure Cases

Tests must cover at least:

- compliant baseline;
- production seam LOC over 350;
- production seam file count over 4;
- core framework LOC over 4,000;
- live-agent subset over 750;
- individual scenario over 200;
- scenario-specific PowerShell present;
- BVP PowerShell script count over 4;
- BVP PowerShell LOC over 1,500;
- scenario-specific production source detected;
- unknown/unclassifiable active BVP source;
- base-SHA delta with a known controlled change;
- blank/comment-only changes do not inflate logical LOC as code.

## 11. Engineering Discretion

The agent may choose:

- private metric data structures;
- exact deterministic LOC implementation;
- output representation;
- how tests construct disposable fixture repositories;
- efficient Git-object inspection for base measurement.

Do not introduce a general static-analysis framework, package dependency, or new runner architecture merely to count metrics.

## 12. Fixed Boundaries

This child owns metrics/budget calculation and its focused tests only.

It does not own:

- changing budget values;
- changing the boundary manifest except if the dispatch binding explicitly identifies a separately authorized governance correction required by existing authority;
- architecture-guard semantics;
- PHX-CI repository-check wiring;
- product source;
- simulator/runner/live validation.

If any such change is required, return `BLOCKED`.

## 13. Verification / Acceptance Criteria

Worker handoff must prove all required metrics and negative budget cases deterministically and report exact measured baseline values.

Authoritative PHX-CI acceptance must execute the focused metrics tests plus full repository verification and publish canonical evidence.

Acceptance requires:

- complete BVP-GOV-003 metric set;
- all BVP-GOV-004 hard budgets enforced exactly;
- deterministic base/current/delta behavior;
- fail-closed classification/governance handling;
- no budget weakening;
- no out-of-scope changes.

## 14. Non-Goals

Do not:

- wire guard/metrics into the PHX-CI repository check yet;
- change hard budgets;
- build simulator/scenario/live components;
- create task-specific verifier scripts;
- implement performance benchmarking;
- modify synchronization behavior.

## 15. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, focused tests/results, measured baseline metrics, every negative budget result, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 03D.