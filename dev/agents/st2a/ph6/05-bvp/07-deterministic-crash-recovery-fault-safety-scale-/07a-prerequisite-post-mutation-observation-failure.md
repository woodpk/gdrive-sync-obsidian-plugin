# BVP-S07A Prerequisite — Post-Mutation Observation-Failure Control

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07A  
**Predecessor:** S07A bound integration state `4b81e6044b7281b490c64c9928fad288893e1814`  
**Triggering evidence:** `3972bca1f39342bcfda30aaceecfd281a57de8c3`

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
