# BVP-S06C Prerequisite — Generic Local Access and Deterministic Time Controls

## Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Predecessor:** accepted S06B closure `e6b3b85f8a4c1982b5c6e883c536098b5da7afc3`
**Architecture review:** BVP-GOV-008 PASS recorded on `phase6-integration` before dispatch
**Branch:** `bvp-s06c-prereq-local-access-time-controls`

## Acceptance Record

This prerequisite is complete and accepted.

- accepted S06B closure / PHX-CI base: `e6b3b85f8a4c1982b5c6e883c536098b5da7afc3`;
- accepted prerequisite implementation SHA: `72a4e79ea69f0f0dad062cc7128115e6e3c22ce1`;
- authoritative PHX-CI evidence SHA: `5ce98f0a1a132b3ef57491f1a2f9d987ed3b639a`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused prerequisite verification: PASS, 19/19;
- integrated BVP verification: PASS, 187/187;
- full repository verification: PASS;
- PHX-CI overall: PASS / compatibility COMPLETE;
- architecture guard: PASS, 0 violations;
- framework core: 3,841 / 4,000 logical TypeScript LOC (+14);
- production seam: unchanged at 113 logical LOC / 1 file;
- scenario catalog: unchanged at 14 scenarios / 351 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production: 0;
- scenario-specific PowerShell: 0;
- production artifact unchanged at 872,862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The accepted prerequisite extends only the existing declarative `external-state` family with generic `set-local-access` and `advance-device-time` controls backed by already-existing virtual-world capabilities. No new runner, persistence system, evidence family, production seam, synchronization policy, or architecture family was introduced.

This file is now a historical completion record and authorizes no further prerequisite implementation work.

## Objective

Expose two already-existing deterministic virtual-world capabilities through the frozen declarative scenario `external-state` family so S06C can represent unreadable/inaccessible local paths and deterministic device-time advancement without changing production synchronization behavior or introducing a new platform contract family.

This is a generic BVP capability prerequisite. It does not own any S06C scenario, product policy, stale-device policy, deletion policy, or clock-authority decision.

## Existing Capabilities Being Exposed

- `InMemoryLocalVault.setAccess(path, access)` already models `readable`, `unreadable`, and `inaccessible` local observations.
- each `VirtualDeviceBacking` already owns a `DeterministicClock` with `set(...)` and `advanceBy(...)`.

The prerequisite may expose these controls only; it may not invent alternate local-state or time semantics.

## Writable Allowlist

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/test/scenario-contract.test.ts`
- `test-platform/test/scenario-runner.test.ts`

No other implementation path may change.

## Required End State

The existing `external-state` step family supports exactly two new generic transitions:

1. `set-local-access`
   - fields: `device`, `path`, `state`;
   - `state` is exactly `readable | unreadable | inaccessible`;
   - dispatch invokes the selected virtual device's existing local-vault access control.

2. `advance-device-time`
   - fields: `device`, `deltaMs`;
   - `deltaMs` must be finite and non-negative;
   - dispatch advances only the selected virtual device's existing deterministic clock.

Validation must fail closed for unsupported access states, missing required fields, negative/non-finite time deltas, or unsupported extra fields.

Focused tests must prove that runner dispatch changes the actual retained virtual-world access state and selected device clock, while leaving other devices unaffected.

## Frozen Boundaries

- no new step family; extend only `external-state`;
- no new runner, persistence, evidence schema, checkpoint model, or orchestration lifecycle;
- no production source/seam change;
- no synchronization planner/executor/state-policy change;
- no S06C scenario file;
- no PowerShell or PHX-CI change;
- no architecture-budget change.

## Verification Binding

- accepted S06B predecessor / PHX-CI base: `e6b3b85f8a4c1982b5c6e883c536098b5da7afc3`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/scenario-contract.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js`;
- full BVP command: `npm run test:bvp-root`;
- change class: `ordinary`;
- accepted architecture baseline: framework core 3,827/4,000; production seam 113 LOC/1 file; scenario catalog 14/351 LOC; BVP PowerShell 4 scripts/1,477 LOC; scenario-specific production 0; scenario-specific PowerShell 0;
- framework-core delta must remain within the 4,000-LOC hard budget.

## Stop

After implementation, report the exact implementation SHA and changed paths and stop for authoritative PHX-CI verification. Do not begin S06C scenarios until this prerequisite is accepted and promoted.
