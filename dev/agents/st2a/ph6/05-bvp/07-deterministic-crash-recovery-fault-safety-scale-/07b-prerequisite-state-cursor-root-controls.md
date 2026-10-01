# BVP-S07B Prerequisite — Declarative State / Cursor / Managed-Root Recovery Controls

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07B  
**Predecessor:** accepted S07A closure `62b91e21d8d9be43f98a0e4cdd49081b750e13dc`  
**Architecture-review base:** `93262366c749b27f95f973f1c6db04673f7f8fcb`  
**Branch:** `bvp-s07b-prereq-state-cursor-root-controls`

## 1. Objective

Expose the already-planned deterministic recovery fault capabilities required by S07B through the existing declarative `external-state` family, without creating a new runner, fault framework, persistence subsystem, production seam, or production behavior.

This prerequisite exists because repository grounding found that S07B cannot express three required fault classes through the frozen DSL even though most underlying mechanics already exist.

## 2. Existing Capability to Reuse

- `VirtualDeviceBacking` already owns controlled persisted-state checksum corruption, truncation, and incompatible schema installation.
- `InMemoryGoogleDriveCore.invalidateCursor(...)` already owns deterministic cursor invalidation.
- remote listing/change-page completeness is already exposed through `set-remote-listing-completeness` and `set-remote-change-completeness`; do not redesign them.
- managed-root validation already distinguishes `missing-root`, `identity-mismatch`, and `incompatible-protocol`, but no deterministic external mutation method can place the accepted root into those states.

## 3. Required End State

Add only these generic external-state controls:

1. `fault-device-state`
   - device-scoped;
   - faults: `corrupt-checksum`, `truncate`, `incompatible-schema`;
   - incompatible schema uses an explicit integer `schemaVersion > 1`.

2. `invalidate-change-cursor`
   - device-scoped;
   - invalidates the device's currently persisted cursor using the existing Drive invalidation mechanism;
   - reasons: `invalid`, `lost`, or `stale`;
   - fails closed if trusted state/current cursor is unavailable.

3. `fault-managed-root`
   - shared-remote scoped;
   - states: `missing`, `identity-mismatch`, `incompatible-protocol`;
   - mutates only deterministic virtual Drive authority;
   - does not create or pair a replacement root.

No synchronization/recovery decisions may be encoded in these controls.

## 4. Writable Allowlist

Implementation/test paths:

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/src/virtual-world/in-memory-google-drive.ts`
- `test-platform/test/s07b-recovery-control-prerequisite.test.ts`

Authority/binding documentation:

- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07b-prerequisite-state-cursor-root-controls.md`
- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07b-state-cursor-listing-root-recovery-scenarios.md`
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`

No other path is writable.

## 5. Architecture Constraints

- framework core baseline: 3,970 / 4,000 logical TypeScript LOC / 10 modules;
- net framework-core delta MUST be <=30 LOC;
- no new runtime module;
- production source delta: 0;
- production seam delta: 0;
- PowerShell / PHX-CI / governance delta: 0;
- no second fault framework or scenario-specific core.

If the required controls cannot fit these constraints, stop BLOCKED.

## 6. Verification

Focused test must prove:

- the three new transition schemas validate and execute through the existing runner;
- state corruption/truncation/incompatible-schema controls operate on persisted device state rather than primary user content;
- cursor invalidation targets the currently persisted device cursor and is observable through the existing Drive change-read behavior;
- managed-root faulting makes existing root validation report the requested missing/mismatch/incompatible state;
- wrong/missing required fields fail declarative validation;
- existing completeness/fault controls remain valid.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07b-recovery-control-prerequisite.test.js`

PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`  
PHX-CI base: `93262366c749b27f95f973f1c6db04673f7f8fcb`  
Change class: `ordinary`.

## 7. Acceptance / Stop

Authoritative PHX-CI must PASS / compatibility COMPLETE, architecture guard/metrics must PASS, and framework core must remain <=4,000.

After acceptance, perform the required architecture review before rebinding S07B proper if the accepted delta consumes framework-core headroom.

Stop after prerequisite acceptance. Do not implement S07B scenarios on this branch.
