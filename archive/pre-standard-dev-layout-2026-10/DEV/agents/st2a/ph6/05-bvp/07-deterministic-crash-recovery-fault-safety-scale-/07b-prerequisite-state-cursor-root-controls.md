# BVP-S07B Prerequisite — Declarative State / Cursor / Managed-Root Recovery Controls

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S07B  
**Predecessor:** accepted S07A closure `62b91e21d8d9be43f98a0e4cdd49081b750e13dc`  
**Architecture-review base:** `93262366c749b27f95f973f1c6db04673f7f8fcb`  
**Branch:** `bvp-s07b-prereq-state-cursor-root-controls`

## 0.1 Ready-for-Verification Record

The bounded prerequisite implementation is complete and ready for authoritative PHX-CI.

- semantic implementation HEAD: `77ed363738e2b4aa32e2c93fe22a10da3073e69e`;
- PHX-CI base: `93262366c749b27f95f973f1c6db04673f7f8fcb`;
- branch: `bvp-s07b-prereq-state-cursor-root-controls`;
- implementation paths changed: exactly `scenario-contract.ts`, `scenario-runner.ts`, `in-memory-google-drive.ts`, plus the prerequisite focused test;
- projected framework-core delta using the repository's logical-LOC algorithm: +24 LOC, from 3,970 to 3,994 / 4,000;
- no new runtime module;
- production source/seam/PowerShell/PHX-CI/governance implementation delta: 0;
- existing partial listing/change completeness controls are unchanged;
- state corruption/truncation/incompatible schema reuse `VirtualDeviceBacking`;
- cursor invalidation reuses the currently persisted device cursor and `InMemoryGoogleDriveCore.invalidateCursor(...)`;
- managed-root faulting reuses existing validation semantics and mutates only deterministic virtual Drive root authority.

Authoritative PHX-CI and architecture metrics remain the acceptance authority.

## 0.2 Acceptance / Closure Record

The S07B recovery-control prerequisite is **COMPLETE / ACCEPTED**.

- accepted implementation HEAD: `7a0c13b7af67f317e870c4b85063561413c20776`;
- authoritative PHX-CI evidence: `058a931e64320ea2982efe938d246211ef70be5e`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- complete persisted evidence set reviewed before acceptance:
  - JSON: `dev/test-results/20261001T030404Z-operator-bvp-s07b-prereq-state-cursor-root-controls-7a0c13b7af67.json`;
  - Markdown: matching `.md` report;
  - execution log: matching `.log` report, 6,423 lines;
- focused prerequisite verification: 8/8 PASS;
- complete repository suite: 830/830 PASS;
- all PHX-CI stages: PASS / exit 0;
- architecture guard: PASS, 0 violations;
- framework core: 3,994 / 4,000 logical TypeScript LOC (+24 from accepted base), 10 runtime modules;
- production source: unchanged at 16,668 LOC;
- production seam: unchanged at 113 LOC / 1 file;
- scenario catalog: unchanged at 45 scenarios / 952 LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 LOC;
- scenario-specific production / PowerShell: 0 / 0;
- production artifact remains unchanged: `main.js` 880,512 bytes, SHA-256 `cee1da879b4c5c73894cb7dee84e55ea434f9dd66a54f59174d9893657f7a860`;
- no genuine `not ok`, hidden nonzero stage, hidden BLOCKED/FAIL verdict, or artifact discrepancy exists in the full execution log;
- only non-pass diagnostic is the existing npm audit notice for 2 moderate vulnerabilities, which did not affect verification.

The accepted prerequisite adds only generic declarative recovery-control exposure through existing platform families. It introduces no production behavior, new runtime module, new fault framework, persistence subsystem, evidence family, PowerShell, or PHX-CI change.

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
