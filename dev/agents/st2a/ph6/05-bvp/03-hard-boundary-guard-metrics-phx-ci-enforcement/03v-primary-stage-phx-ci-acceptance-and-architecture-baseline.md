# 03V — Primary-stage PHX-CI acceptance and architecture baseline

## 0. Status


**Agent name:** `agt-brain-bvp-s03-boundary-governance-01`
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S03 — Hard Boundary / Guard / Metrics / PHX-CI Enforcement

> Do not execute until all implementation children in this primary stage have individually passed PHX-CI, been supervisor-reviewed, and been integrated.

## 1. Objective

Verify integrated S03 and establish the frozen architecture/metrics baseline.

Required end state:

> PHX-CI complete; negative guard tests pass; baseline metrics recorded; supervisor architecture review complete.

## 2. Dispatch Binding Required

The supervisor must bind:

- exact current `phase6-integration` SHA containing only accepted children;
- exact stage completion criteria from current target/decomposition;
- current PHX-CI pin/runtime;
- current architecture metrics baseline/delta where applicable;
- any stage-specific repository searches or physical evidence inputs.

This verification task has **no production-code repair authority**.

## 3. Verification Procedure

1. independently inspect the integrated changed paths and accepted child evidence;
2. run authoritative deployed-runtime PHX-CI against `phase6-integration` with publication mode `push`;
3. review fresh `dev/_ca-output.md`, `dev/_ca-output.json`, and `dev/test-results/`;
4. from S03 onward, independently confirm architecture guard and metrics passed;
5. check the primary-stage end state against the governing BVP specification/decomposition;
6. perform the recurring architecture review whenever required by DEC-324.

If verification exposes a defect, do not repair it in this task. Return a bounded corrective work order to the responsible implementation surface.

## 4. Completion

Only after PHX-CI and independent review pass may the supervisor mark BVP-S03 accepted and bind the first child of the next primary stage.

Do not begin the next stage in this task.
