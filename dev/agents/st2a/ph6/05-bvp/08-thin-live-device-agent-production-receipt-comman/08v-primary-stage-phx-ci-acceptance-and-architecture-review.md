# BVP-S08V — Primary-Stage PHX-CI Acceptance and Architecture Review

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Phase-boundary authority:** `DEC-328`

This is a complete prewritten verification contract. It has no implementation-repair authority.

BVP-S08 constructs and automatically verifies the BRAIN Verification Platform itself. Real Windows/iOS/Obsidian/vault/Google Drive/provider/synchronization-product validation belongs to BVP-S09 and is prohibited in S08.

## 0.1 Final Dispatch Binding

S08V is **BOUND / EXECUTABLE** against the corrected integrated S08 state.

Repository coordinates:

- verification branch: `bvp-s08v-primary-stage-acceptance`;
- corrected integrated `phase6-integration` input: `d4553122d565fd70d976d926f4a022efe93a5aaa`;
- integration reconciliation parents: prior integration `76482df328492fc44fda08bda82483ac7a690185` plus corrected accepted S08F closure `08a033956b3605ef2dc13f756f099b5ff37f5888`;
- reconciliation tree is byte-for-byte identical to the corrected accepted S08F closure tree `440ad6fba3d6acf768e3f8f0bd9b1ee9ae0ef2c0`;
- exact S08 stage verification base / accepted pre-S08 closure: `225e38d0e851ea7e537f71c1134f2931344ef5ac`;
- PHX-CI runtime: `69c4aa077d4a1a46d1e85e59f39d36285be99e83`;
- PHX-CI framework version: `0.2.0-dev.2`;
- change class: `authorized-governance` because the integrated S08 change set includes frozen governance surfaces;
- publication mode: `push`.

Accepted S08 child implementation / evidence lineage:

- S08A: `cd0e3225295b76287133d30a2787ae7cfcc69d43` / `3ff8fa27d25d0de260403047550aa6bbd609c60a`;
- S08B: `3189e0646402273aeb33a25acf0a538b15137b7b` / `ac8a666fff361d49d610f5bae1d0f0aae5fa6c19`;
- S08C production-control prerequisite: `24a5f94518679254d4855a4a2f0d42e15e939c64` / `d4cfef6a48e257ca2d7b43c74400134175406c2f`;
- S08C: `441e7cdd3bfe215b2d47d27c9a1eb4efe90711f8` / `ac039c73b72afa3f9bf8a9f1e5bb1cb1d35179d6`;
- S08D: `62cd8fcdac1fe2f1aa424b10db5ad2e450fdd65b` / `dd71266d19f2b2d0c58973b4cff7d2f18712696e`;
- S08E single-runner prerequisite: `7d261698ec83cebeee6063524e57802955600b23` / `5828e0c251758d05c171ad8f2a0ba6a5db15d674`;
- S08E: `e1067f5159a316f328c492837b8c6ff59e08d226` / `2a68eb896bb33b92f480cb9f43d7ac002cdce539`;
- S08F verified source / authoritative evidence / run: `b53f8628353f0115248503fa5a81e4ebc206c218` / `a002ee81b56d6681bb9dd3e3ca9093d2bbcc5ca8` / `6bf02af1-91be-4b74-9f19-a50591abb255`.

Accepted automated architecture/artifact state entering S08V:

- approved production seam: `src/product/local-vault-boundary-seam.ts`, `src/product/run-receipt-seam.ts`, `src/product/live-validation-control-seam.ts`;
- production seam: 187 / 350 logical LOC, 3 / 4 files;
- framework core: 3,996 / 4,000 logical TypeScript LOC / 10 modules;
- live-device / relay / executor: 727 / 750 logical TypeScript LOC;
- BVP PowerShell: 4 / 4 scripts, 1,492 / 1,500 logical LOC;
- scenario-specific production / PowerShell: 0 / 0;
- ordinary production `main.js`: 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- accepted validation artifact from S08E: SHA-256 `4c2e3d3cc18cfc30a2622068659ca8199c6ce8ed67dfec11dc298ff5b1e4e351`.

Focused integrated S08 command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08a-production-run-receipt-seam.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/s08c-prerequisite-production-control-seam.test.js .test-build/bvp/test-platform/test/s08c-device-command-agent.test.js .test-build/bvp/test-platform/test/s08d-drive-mailbox-relay.test.js .test-build/bvp/test-platform/test/s08e-prerequisite-runner-executor-seam.test.js .test-build/bvp/test-platform/test/s08e-external-live-executor.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js .test-build/bvp/test-platform/test/scenario-checkpoint.test.js .test-build/bvp/test-platform/test/scenario-evidence.test.js .test-build/bvp/test-platform/test/architecture-guard.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js .test-build/bvp/test-platform/test/repository-check-integration.test.js`

No physical-canary evidence, vault coordinate, Drive credential, or live product execution is part of this binding.

## 1. Objective

Independently verify the integrated S08 testing-platform construction, frozen architecture/budgets, production seams, command transport, single-runner/live-executor/checkpoint contracts, PHX-CI evidence, and shipping-bundle isolation before S09 physical product validation begins.

## 2. Required Integrated End State

S08 may close only if:

- the production terminal run-receipt seam is minimal, authoritative, enumerated, and within budget;
- the bounded production control seam remains an approved facade over existing production authority and within the frozen production-seam budget;
- a separate validation-only Obsidian build/entrypoint exists;
- the bounded device command agent implements run/device/sequence safety, including duplicate, stale, wrong-run, and wrong-device handling;
- no device-local scenario engine or distributed suite state exists;
- the selected command transport / Windows relay requires no hosted backend, new OAuth scope, or token export and remains test-control metadata rather than synchronization authority;
- the existing external runner remains the single owner of scenario order, captures, expectation handling, evidence, and verdict;
- the live executor consumes one generic step at a time and does not become a second runner;
- human-checkpoint state remains bounded, external, non-secret, and resumable under the accepted checkpoint contract;
- existing automated tests prove the S08A-E contracts and fail-closed behaviors;
- ordinary production `main.js` excludes validation-only agent/transport/scenario/runner/fault/platform code;
- architecture guard and all frozen metrics/budgets pass;
- authoritative integrated PHX-CI completes with canonical evidence;
- no real Obsidian, vault, Google Drive, provider, Windows/iOS product workflow, or real synchronization execution is used to establish S08 acceptance.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact integrated `phase6-integration` SHA containing the accepted S08 children and corrected S08F closure;
- exact stage verification base/change-set authority;
- current target-branch `phx-ci.json` framework pin/runtime;
- accepted S08A-F implementation/evidence SHAs;
- exact approved production seam enumeration;
- exact production and validation artifact identities/hashes available from accepted automated evidence;
- S07 architecture baseline and current S08 architecture metrics;
- exact PHX-CI focused/integrated test selection already represented in repository configuration or the accepted S08 contract.

No physical-canary evidence or physical execution coordinate is part of S08V binding.

## 4. Verification Procedure

Independently:

1. inspect the complete integrated S08 change set and accepted S08A-F evidence;
2. verify the production seam remains within ≤350 logical LOC / ≤4 production files and contains no scenario/test authority;
3. verify the live-device/relay/executor subset remains within ≤750 logical TypeScript LOC;
4. verify framework-core, module-count, PowerShell, and scenario-specific production/PowerShell budgets remain within frozen limits;
5. verify the validation build remains distinct from the ordinary production build;
6. verify the ordinary production artifact excludes BVP runtime/scenario/relay/agent code;
7. inspect command protocol semantics for run/device/sequence duplicate/staleness/wrong-run/wrong-device safety;
8. verify transport remains bounded, credential-local, no-new-scope/no-backend, and non-authoritative for synchronization;
9. verify the external runner remains singular and owns scenario sequence/verdict while the live executor consumes bounded generic steps only;
10. inspect human-checkpoint persistence/resume semantics for bounded external state, identity validation, required evidence, and fail-closed behavior;
11. verify production receipt correlation preserves terminal authority and transport acknowledgement cannot manufacture synchronization success;
12. run authoritative integrated PHX-CI only, inspect canonical evidence, architecture guard, metrics, full repository tests/build/repository/artifact gates, and exact source/evidence identities;
13. perform the required supervisor architecture review and determine whether S09 physical validation may be bound.

## 5. Stage-Specific Acceptance Criteria

S08 passes only when:

- PHX-CI overall PASS / compatibility COMPLETE / task exit 0 / canonical evidence published;
- the exact verified source SHA and evidence SHA are recorded;
- production-seam, framework-core, live-device/relay/executor, PowerShell, and scenario-specific budgets pass;
- architecture guard reports zero violations;
- shipping-exclusion checks pass and the production artifact is free of BVP validation-only code;
- automated S08A-E contract coverage passes, including stale/duplicate/mismatch safety, mailbox/relay boundedness, live-executor correlation, checkpoints, and production-receipt terminal semantics;
- no second runner, distributed workflow system, alternate synchronization engine, new OAuth scope, token export, or hosted validation backend appears;
- the S08/S09 boundary is preserved: no physical product execution was required for S08 acceptance;
- the supervisor architecture review authorizes S09 physical coverage.

## 6. Failure / Correction Semantics

S08V performs no implementation repair.

If integrated automated verification exposes a substantive defect, route the smallest correction to the causal S08 owner and re-run only the PHX-CI scope whose substantive result is actually in question.

If only evidence publication/bookkeeping fails after substantive SUT PASS is conclusively established, apply the governing PHX-CI evidence-recovery/rerun rules rather than forcing a redundant SUT rerun.

A failure to perform a real desktop/mobile canary is not an S08 defect because physical product validation is explicitly outside S08 under `DEC-328`.

Architecture drift blocks S09 even if all functional automated tests are green.

## 7. Non-Goals

Do not:

- launch or automate Obsidian;
- touch a real/disposable vault or managed Google Drive remote;
- authenticate to Google Drive;
- execute real synchronization or provider behavior;
- begin S09 physical coverage;
- begin Stage 3;
- modify implementation in this verification task.

## 8. Completion / Stop

Only after every S08 automated construction/architecture criterion passes may the supervisor mark BVP-S08 accepted and bind S09A physical execution facts.

Stop after S08 acceptance.
