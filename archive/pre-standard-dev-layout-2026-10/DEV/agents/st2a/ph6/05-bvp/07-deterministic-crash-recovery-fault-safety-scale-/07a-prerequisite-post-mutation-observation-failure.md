# BVP-S07A Prerequisite — Post-Mutation Observation-Failure Control

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S07A  
**Predecessor:** S07A bound integration state `4b81e6044b7281b490c64c9928fad288893e1814`  
**Triggering evidence:** `3972bca1f39342bcfda30aaceecfd281a57de8c3`

## 0.1 Ready-for-Verification Record

Implementation is complete and ready for authoritative PHX-CI.

- implementation HEAD: `f52fbfc57746932272e456c70b9a8b6e866a3b01`;
- PHX-CI base: `44814af44e4e5fbd2550a1357182d6b18035c44b`;
- changed implementation paths: exactly the four writable allowlist paths;
- framework-core delta: +6 logical/nonblank lines, approximately 3,950 / 4,000;
- production / virtual-world implementation / PowerShell / PHX-CI delta: 0;
- proof pairs the accepted `applied-before-failure` provider fault with the new one-shot post-mutation observation failure and verifies caller rejection while the physical REMOTE object exists.

## 0.2 Acceptance Record

This prerequisite is complete and accepted.

- prerequisite base: `44814af44e4e5fbd2550a1357182d6b18035c44b`;
- accepted verification HEAD: `f0e403e401dfb18d64f5e6e72b5325d6b7a39f75`;
- authoritative PHX-CI evidence: `f0dac5853c73c380e0c711b648cbb2b599307ccc`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused prerequisite verification: PASS, 28/28;
- repository verification: PASS;
- overall verification: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: 3,950 / 4,000 logical TypeScript LOC (+6);
- production source: unchanged at 16,534 logical LOC;
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: unchanged at 39 scenarios / 818 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted prerequisite exposes only the already-existing one-shot post-mutation observation-failure control through the existing declarative `external-state` family. It adds no virtual-world algorithm, production hook, persistence behavior, or new fault framework.

This file is now a historical completion record and authorizes no further prerequisite implementation work.

## 1. Objective

Expose the already-existing one-shot `InMemoryReliableRemoteMutationPort.queuePostMutationObservationFailure(...)` control through the existing declarative `external-state` family so an S07A scenario can preserve a genuine `outcome-unknown` REMOTE mutation result after an applied-but-response-lost provider failure.

## 2. Required Capability

Add exactly one external-state transition:

`inject-post-mutation-observation-failure`

Required fields:

- `device`;
- `classification` — non-empty deterministic reason string.

Semantics:

- resolve/reuse the selected device's existing production runtime;
- enqueue exactly one post-mutation observation failure on that device's existing `remoteMutations` port;
- do not alter the in-memory Drive mutation result;
- do not directly edit durable authority or canonical state;
- do not manufacture `outcome-unknown`; production receives it only through the existing reliable mutation port's normal behavior.

This control is intended to be paired with the already-accepted `inject-remote-mutation-fault` step when a scenario needs an applied physical mutation whose immediate result remains unresolvable.

## 3. Writable Allowlist

Exactly:

- `test-platform/src/scenario/scenario-contract.ts`;
- `test-platform/src/scenario/scenario-runner.ts`;
- `test-platform/test/scenario-contract.test.ts`;
- `test-platform/test/scenario-runner.test.ts`.

No production, virtual-world implementation, PowerShell, PHX-CI, persistence, governance, or architecture-metrics implementation changes are authorized.

## 4. Acceptance

Prove:

- the new transition validates with exactly `device` + `classification`;
- missing/extra fields fail closed;
- the runner dispatches to the selected device's existing REMOTE mutation port;
- paired with an `applied-before-failure` REMOTE create fault, the immediate production request remains rejected/ambiguous while the physical REMOTE object is present;
- the control is one-shot because the underlying accepted port queue is one-shot;
- all existing scenario behavior is unchanged;
- framework core remains ≤4,000 logical TypeScript LOC;
- architecture guard/metrics and authoritative PHX-CI pass.

Stop after prerequisite acceptance. Do not repair or resume S07A scenarios on this prerequisite branch.
