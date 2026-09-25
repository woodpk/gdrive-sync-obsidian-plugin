# BVP-S03V — Primary-Stage PHX-CI Acceptance and Architecture Baseline

## 0. Status

**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement

This is a prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify the fully integrated S03 result and establish the architecture/complexity baseline that all later BVP construction must preserve.

## 2. Required Integrated End State

S03 may close only if the integrated repository establishes all of the following together:

- physically separate `test-platform/**` root and production shipping isolation from S03A;
- durable architecture guard with valid positive/negative semantics from S03B;
- deterministic required metrics and hard budget gates from S03C;
- mandatory PHX-CI repository-check integration from S03D;
- machine-readable boundary manifest remains authoritative;
- canonical PHX-CI evidence exposes architecture/metrics results;
- production bundle remains free of BVP implementation;
- no simulator, runner, scenario catalog, live-device agent, or production validation mode has started early;
- recurring supervisor architecture review finds the integrated architecture consistent with the BVP target specification.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor fills:

- exact current `phase6-integration` SHA containing only accepted S03 children;
- exact stage verification base;
- exact current target-branch PHX-CI pin/runtime;
- accepted guard/metrics focused test commands and repository-check entrypoint;
- current expected baseline metric categories and any prior baseline needed for delta comparison;
- exact integrated child evidence SHAs.

No binding may alter S03 acceptance semantics.

## 4. Verification Procedure

The verifier must independently inspect, not merely trust child summaries.

At minimum:

1. reconcile integrated changed paths with accepted S03 child scopes;
2. inspect the boundary manifest, guard, metrics evaluator, tests, and PHX-CI consumer wiring;
3. run authoritative deployed-runtime PHX-CI against integrated `phase6-integration` with publication mode `push`;
4. inspect fresh canonical evidence;
5. confirm required negative guard cases genuinely fail and false-positive boundary tests pass;
6. confirm required metric families and hard budget failures are tested;
7. confirm repository check makes guard/metrics mandatory and failure-propagating;
8. confirm ordinary production build excludes `test-platform/**` and retains required production artifact integrity;
9. record the accepted architecture metrics baseline;
10. perform the BVP-GOV-008 repository-level architecture review.

## 5. Stage-Specific Acceptance Criteria

S03 passes only when:

- PHX-CI change-set verification PASS;
- PHX-CI repository verification PASS;
- overall PASS / compatibility COMPLETE / task exit 0;
- architecture guard PASS on integrated repository;
- architecture guard negative tests prove every BVP-GOV-002 prohibited family;
- syntax/textual-lookalike tests establish guard semantic validity for actual dependencies;
- all BVP-GOV-003 metrics are present;
- all BVP-GOV-004 budgets pass and negative budget tests fail as expected;
- repository-check wiring makes architecture failure acceptance-blocking;
- canonical evidence is published;
- no frozen governance surface changed outside accepted S03 ownership;
- production bundle separation proof passes;
- architecture review identifies no alternate runner/engine/evidence/persistence/transport architecture;
- baseline metrics are recorded for later delta review.

## 6. Failure / Correction Semantics

This gate does not repair implementation.

If a defect exists:

- identify the violated S03 contract and causal owner (03A/03B/03C/03D or supervisor authority);
- issue one complete bounded corrective work order for that ownership surface;
- do not add unrelated new requirements or serialize symptom-specific micro-fixes;
- re-run the affected integrated acceptance after correction.

## 7. Non-Goals

Do not:

- implement S04;
- redesign compliant S03 code because another mechanism is preferred;
- change hard budgets;
- create new platform abstractions;
- perform Stage 3.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S03 accepted and bind S04A hard execution facts.

Stop after S03 acceptance. Do not begin S04 in this task.
