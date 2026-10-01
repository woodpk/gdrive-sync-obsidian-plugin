# BVP-S07E Prerequisite — Resource-Failure Fault Controls

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07E — Quota / Disk, Destructive Safety, Configuration, and Lifecycle Deterministic Scenarios  
**Base:** `c47efae7b1785e0d5a89e482044fcf5811785bce`  
**Branch:** `bvp-s07e-prereq-resource-fault-controls`

## 1. Objective

Complete the two missing generic deterministic resource-fault controls required by the already-fixed S07E contract without increasing framework-core size or changing production behavior.

## 2. Authorized Behavior

1. Existing `external-state:inject-remote-mutation-fault` preserves an explicitly supplied `quota-exhausted` classification as a Drive `quota-exhausted` signal rather than collapsing it to `transient-failure`, and the existing virtual reliable-mutation adapter preserves that operational provenance into the V1.3 production execution path.
2. Existing `external-state:set-local-access` accepts `disk-full` as a device-level write-capacity fault. While armed:
   - observations and reads of existing valid content remain available;
   - file writes/staging fail before new bytes are committed;
   - existing bytes remain unchanged.

All existing transient remote-fault and readable/unreadable/inaccessible behavior remains unchanged.

## 3. Writable Surface

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/src/virtual-world/in-memory-local-vault.ts`
- `test-platform/src/virtual-world/virtual-world.ts`
- `test-platform/test/s07e-resource-fault-prerequisite.test.ts`
- this prerequisite record
- `07e-quota-disk-destructive-safety-config-and-lifecycle-deterministic-scenarios.md`
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`

## 4. Architecture Constraints

- framework core baseline: 4,000 / 4,000 logical TypeScript LOC / 10 runtime modules;
- net framework-core LOC growth: **0 maximum**;
- no new runtime module;
- no production, production-seam, PowerShell, PHX-CI, persistence, safety-policy, or governance implementation changes;
- no new fault framework or resource-management subsystem.

## 5. Verification

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07e-resource-fault-prerequisite.test.js`

Required proof:

- quota-exhausted prevents remote create and preserves local content;
- disk-full prevents local staging/replacement and preserves prior local bytes while newer remote reality remains visible;
- full repository verification and architecture guard/metrics pass.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.


## 6. Ready-for-Verification Record

The prerequisite is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `a583b9de46ed6effe28f0431154c3f693e981fdf`;
- exact base: `c47efae7b1785e0d5a89e482044fcf5811785bce`;
- framework-core delta:
  - scenario contract: 190 → 190;
  - scenario runner: 280 → 280;
  - in-memory local vault: 508 → 508;
  - virtual world: 980 → 980;
  - net framework-core delta: 0;
- projected framework core: 4,000 / 4,000;
- production source/seam delta: 0;
- scenario catalog delta: 0;
- PowerShell / PHX-CI delta: 0;
- no new runtime module.

Focused proof contains three tests: declarative quota preservation, declarative disk-full preservation, and direct V1.3 production-disposition proof for quota exhaustion.
