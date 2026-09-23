# 02V — Primary-stage PHX-CI acceptance

## 0. Status

**Agent name:** `agt-brain-bvp-s02-legacy-retirement-01`  
**Prompt maturity:** EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S02 — Legacy Executable Retirement  
**Exact integrated S02 verification input SHA:** `dd8f5f7d65598a2ec175627a6749316119b521c0`  
**Verification branch:** `phase6-integration`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

Accepted children now integrated:

- S02A accepted implementation: `cbc9b086432b9b521ab9246db4386f08b7533c55`
- S02A PHX-CI evidence: `3a5c4577179fcd5e57e336c97c7632c54be639f5`
- S02A accepted integration: `ff87c49752844f1e52d884bcf4af94dea01c6eff`
- S02B accepted implementation: `64035ae6b36ef1b6372e3153a815dbe8be72668a`
- S02B PHX-CI evidence: `9a04f3a20ef0448731b79d6f5f915a20107f37c1`
- exact integrated S02 head to verify: `dd8f5f7d65598a2ec175627a6749316119b521c0`

## 1. Objective

Independently verify the integrated S02 result before S03.

Required end state:

> Integrated `phase6-integration` passes authoritative PHX-CI; legacy validation harness runtime/UI/source/test surfaces are absent; no replacement BVP implementation has started; accepted S01 authority/archive state remains intact.

## 2. Exact Gate

Before verification:

1. fetch/prune origin;
2. verify `dd8f5f7d65598a2ec175627a6749316119b521c0` is an ancestor of current `origin/phase6-integration`;
3. verify every path changed on `phase6-integration` after `dd8f5f7d65598a2ec175627a6749316119b521c0` is under `dev/**` only; if any later change touches `src/**`, `test/**`, package/build configuration, Taskfiles, `phx-ci.json`, or another executable/build surface, stop for supervisor rebind;
4. treat `dd8f5f7d65598a2ec175627a6749316119b521c0` as the immutable S02 implementation-under-test SHA and the current later `phase6-integration` tip only as supervisor/tasking metadata;
5. verify the target branch's `phx-ci.json` and use its exact installed deployed runtime;
6. do not modify production/test/build/governance/tasking files in this verification task.

This task has **no production-code repair authority**.

## 3. Stage-Specific Acceptance Checks

Independently confirm all of the following against the integrated head:

1. `src/validation/**` has zero entries.
2. `src/diagnostics/production-diagnostic-correlation.ts` is absent.
3. The 33 S02A harness-only test/support paths are absent.
4. Active `src/**` contains zero occurrences of:
   - `ValidationModeRuntime`
   - `validationRuntime`
   - `validationModeEnabled`
   - `setValidationModeEnabled`
   - `validationScenarioIds`
   - `startValidationScenario`
   - `resumeValidationScenario`
   - `currentDiagnosticCorrelation`
   - `ProductionDiagnosticCorrelation`
   - `scenario-runner`
   - `cross-device-coordinator`
   - `scenario-evidence-recorder`
5. The integrated production blobs are:
   - `src/main.ts` = `dc5d6bb13e2bd389fdcd5357730a4144ad7d2eb7`
   - `src/product/settings-tab.ts` = `e6a56451a3a6723d223c09175cc901c46f527985`
   - `src/product/product-controller-base.ts` = `fee7c40e715d277cea2b5e26059a86753bb316a0`
6. No `test-platform/**` implementation exists yet.
7. S01 authority/archive artifacts remain present and authoritative.
8. No GitHub Actions are introduced or used.

## 4. PHX-CI Procedure

Run authoritative deployed-runtime PHX-CI against `phase6-integration` with publication mode `push`.

Use a short temporary root on Windows if necessary to avoid the already-observed PHX-CI long-path infrastructure defect. Changing only `TEMP`/`TMP` for the verification process is permitted and does not alter acceptance semantics.

After the run, inspect fresh:

- `dev/_ca-output.md`
- `dev/_ca-output.json`
- `dev/test-results/**`

Verify that PHX-CI reports:

- change-set verification PASS;
- repository verification PASS;
- overall verification PASS;
- compatibility COMPLETE;
- task exit code 0;
- evidence published;
- control checkout preserved.

## 5. Completion

If all §3 checks and PHX-CI pass, report:

`S02 PRIMARY STAGE ACCEPTED`

and stop.

If any verification check exposes a defect, do not repair it in this task. Return the exact blocker to the supervisor for bounded corrective tasking.

Do not begin S03 in this task.