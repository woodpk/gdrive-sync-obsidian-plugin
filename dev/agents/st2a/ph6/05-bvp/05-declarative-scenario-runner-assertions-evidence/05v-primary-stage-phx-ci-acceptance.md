# BVP-S05V — Primary-Stage PHX-CI Acceptance

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify the integrated S05 platform and freeze the common declarative scenario/runner/assertion/evidence core before scenario-dominant S06/S07 coverage begins.

## 2. Required Integrated End State

S05 may close only if:

- scenarios are typed declarative data;
- initial vocabulary is small/capability-oriented;
- one external deterministic runner owns sequence/verdict;
- unsupported/missing required observations fail closed;
- generic objective observations/assertions exist;
- deliberately wrong expectations fail;
- canonical machine/human evidence is deterministic/private/traceable;
- bounded checkpoint/resume state is external and non-authoritative;
- at least two declarative canaries pass;
- the second ordinary canary required no platform-core change;
- scenario LOC/change-surface tripwires are enforced;
- common core remains within hard architecture budgets.

## 3. Dispatch Binding — Hard Data Only

The S05V verification contract is bound as follows:

- exact integrated accepted S05 input / current `phase6-integration`: `8c9fe29e5ac40b02371b09f70ee00831ae30b15f`;
- exact S05V task branch: `bvp-s05v-primary-stage-acceptance`;
- exact stage verification base / accepted S04 closure: `7791976db3bfce21dd8e016e856539e409da96cd`;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `ordinary`;
- S05A accepted implementation / evidence: `63475e8b421ec50c7c28a8e488a65febe8f67718` / `567e506d69285597aceb7eb8330d7a83e5f1c2df`;
- S05B accepted implementation / evidence: `8960e15cb7d9d569e28aed8b0ec05402a57f2a5a` / `f7ee2f3764df2dff5d34868f19a07462e70b2b68`;
- S05C accepted implementation / evidence: `c4e8a25c4ed685446be7facac9c8ee6f3d7cf8dc` / `99a4218f820edf4355de4cec019f2f537eddfcd1`;
- S05D accepted implementation / evidence: `b22a1da9cfc0efd1ce61f35b2aafc173b2c88bb6` / `bcf537c146178a454393759f896ea87272a5380b`;
- S05E accepted implementation / evidence: `8f2740469060d9b000cf8489ffaff68ac541fb00` / `aa88c5e6a84f739ffe99e42a1eb1cab601f82106`;
- S05V has no implementation-repair authority and no writable product/test-platform implementation allowlist; only this verification contract and canonical PHX-CI evidence/acceptance bookkeeping may change;
- focused integrated S05 command: `npm run test:bvp-root`;
- focused S05 canary command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/scenario-canaries.test.js`;
- focused scenario-platform tests include `scenario-contract.test.js`, `scenario-runner.test.js`, `scenario-evidence.test.js`, `scenario-checkpoint.test.js`, and `scenario-canaries.test.js` under the accepted common test-platform build;
- full repository verification remains `npm test` through PHX-CI;
- accepted S04 architecture baseline: framework core 2,904 logical TypeScript LOC / 6 runtime modules; production seam 112 logical LOC / 1 file; live-device 0; scenarios 0; scenario-specific production 0; scenario-specific PowerShell 0; BVP PowerShell 4 scripts / 1,477 logical LOC; production artifact 872862 bytes with SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`;
- current accepted S05 metrics: framework core 3,813 / 4,000 logical TypeScript LOC / 10 runtime modules; production seam 112 / 1; live-device 0; scenarios 2 / 46 logical LOC total (24 + 22); scenario-specific production 0; scenario-specific PowerShell 0; BVP PowerShell 4 / 1,477; production artifact unchanged;
- required stage-level core delta from S04 baseline to accepted S05 state: +909 logical TypeScript LOC;
- required second-canary proof: commit `ed44b0f4422719f250d42bdf42b9841c6ef2837f` changes only `test-platform/scenarios/ordinary-one-sided-sync.ts`;
- required evidence publication proof: S05E PHX-CI evidence commit is one evidence-only commit beyond implementation HEAD, with no implementation drift.

S05V must perform verification only. If any acceptance criterion fails, stop and assign the defect to its causal S05 child; do not repair it on the S05V branch.

## 4. Verification Procedure

Independently inspect integrated S05 code/tests and verify:

1. scenario definitions contain data, not custom scenario lifecycle code;
2. runner has one generic dispatch model and no scenario-ID-specific orchestration;
3. runner fails closed on unsupported/missing required state;
4. assertions are based on objective production/external observations;
5. diagnostics cannot manufacture PASS;
6. evidence privacy and traceability contracts hold;
7. checkpoint state cannot become product/device synchronization authority;
8. second-canary diff does not require common-core change;
9. scenario/core/live-agent/PowerShell metrics obey hard budgets;
10. authoritative PHX-CI passes and publishes canonical evidence.

## 5. Stage-Specific Acceptance Criteria

S05 passes only when:

- PHX-CI overall PASS / compatibility COMPLETE;
- required deterministic canaries pass;
- wrong expectation fails deterministically;
- second ordinary scenario is scenario/fixture/test-only;
- scenario hard LOC maximum enforced;
- scenario-specific production source = 0;
- scenario-specific PowerShell = 0;
- framework core ≤4,000 logical TypeScript LOC;
- architecture guard/metrics PASS;
- no module router/plugin system, distributed workflow engine, second runner, alternate evidence family, or production scenario seam exists.

## 6. Failure / Correction Semantics

Assign any defect to its causal S05 child/contract owner. Do not reopen compliant core merely because another design is preferred, and do not add new requirements that are not part of the S05 contract.

## 7. Non-Goals

Do not begin S06/S07 coverage, live-device validation, or Stage 3.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S05 accepted, treat the common P3 core as frozen for ordinary scenarios, and bind S06A hard execution facts.

Stop after S05 acceptance.
