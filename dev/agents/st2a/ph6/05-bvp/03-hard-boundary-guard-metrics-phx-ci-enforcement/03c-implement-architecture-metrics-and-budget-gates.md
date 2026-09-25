# BVP-S03C — Implement Architecture Metrics and Hard Budget Gates

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement  
**Predecessor child:** accepted S03B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This prompt is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

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

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor fills:

- exact accepted S03B predecessor SHA;
- exact task branch;
- exact current boundary-manifest path and relevant current roots/classifications;
- exact metrics-script/test/package-script paths that instantiate this contract;
- exact writable-path allowlist;
- exact PHX-CI base authority and current target-branch pin/runtime;
- exact focused test command, if established;
- confirmation that the child remains within BVP-GOV-010 size limits.

Binding may not change the metric families, budgets, failure semantics, or non-goals below.

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
