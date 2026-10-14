# BVP-S07C Prerequisite — Clone / Restore and In-Flight Cancellation Controls R2

## 0. Status

**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Parent:** BVP-S07C  
**Predecessor / PHX-CI base:** `4e51ffc187f99183fed0ba77b03d72e533e87621`  
**Branch:** `bvp-s07c-prereq-clone-restore-cancellation-controls-r2`

## 0.1 R1 Evidence and Frozen Root Cause

R1 target `dd4d2234b31b7abcbef2f0c23273c5220cf6c2e2` was BLOCKED by authoritative PHX-CI evidence `facccead7ed9bf56377c8f448bab5ac8b6076f87`.

Acceptance/repair decisions were made only after complete review of:

- persisted JSON: 149 lines;
- persisted Markdown: 55 lines;
- complete execution log: 5,350 lines.

R1 focused result: 4/5 PASS. Full repository suite: 830/830 PASS.

Passing R1 proofs:

- copied persisted state is detected as clone/restore authority mismatch;
- copied old same-device state models restore;
- cancellation after a verified effect preserves the first effect and stops later operations;
- repeated immediate cancellation remains deterministic;
- existing crash-boundary semantics remain intact.

Single R1 failure:

- cancellation armed at `before-remote-dispatch` was accepted but the current REMOTE create still occurred.

Frozen root cause:

- V1.3 REMOTE and LOCAL mutation port contracts already accept `SynchronizationCancellationSignal`;
- `CoreRunCoordinator` already owns the live active-run signal;
- `ProductController.executePlanned(...)` constructs the V1.3 executor after `beginRun()`;
- `createAuthoritativeProductExecutorV1_3(...)` adapted all mutation ports without supplying that live signal;
- cancellation therefore stopped later operations but was invisible to the current physical mutation port.

Do not rediagnose this root cause from scratch.

## 0.2 Ready-for-Verification Record

R2 implementation is complete and **READY FOR LOCAL PHX-CI VERIFICATION**.

- PHX-CI base: `4e51ffc187f99183fed0ba77b03d72e533e87621`;
- branch: `bvp-s07c-prereq-clone-restore-cancellation-controls-r2`;
- generic platform control delta remains constrained to the existing scenario contract/runner/virtual-world files;
- production repair is constrained to `authoritative-production-executor.ts` and `product-controller-base.ts`;
- frozen mutation contracts are unchanged;
- no new module or subsystem exists;
- focused proof now additionally covers fail-closed copy from a source with no persisted state.

Authoritative PHX-CI and complete persisted JSON/Markdown/full-log review are required before acceptance.

Pre-PHX audit:

- semantic implementation HEAD: `4cea4fcdc3c458570ebebe5a6e5ec11890069754`;
- exact changed paths: 9;
- framework-core delta: +1 logical TypeScript LOC, yielding 4,000 / 4,000;
- production source delta: +2 logical TypeScript LOC, projected 16,670;
- production seam: unchanged;
- runtime module count: unchanged at 10;
- scenario catalog: unchanged at 54 scenarios / 1,131 logical LOC;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- frozen `src/contracts/**`: unchanged;
- focused test now contains six prerequisite proofs, including fail-closed missing-source state copy.

## 0.3 Acceptance / Closure Record

The S07C clone/restore + in-flight cancellation prerequisite R2 is **COMPLETE / ACCEPTED**.

- accepted implementation HEAD: `745f2932a5762859a6a7fb039c625c7c6c0c948a`;
- authoritative PHX-CI evidence: `70b3ff145001b2e6049753174b11b26012dbffc8`;
- complete persisted evidence set reviewed before acceptance: JSON, Markdown, and complete 6,618-line execution log;
- focused prerequisite verification: 6/6 PASS;
- complete repository suite: 830/830 PASS;
- every PHX-CI stage: PASS / exit 0;
- architecture guard: PASS, 0 violations;
- framework core: 4,000 / 4,000 logical TypeScript LOC / 10 runtime modules;
- production source: 16,670 logical LOC;
- approved production seam: 113 LOC / 1 file;
- scenario catalog: 54 scenarios / 1,131 logical LOC;
- BVP PowerShell: 4 scripts / 1,477 logical LOC;
- scenario-specific production / PowerShell: 0 / 0;
- artifact: `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`;
- no hidden nonzero stage, `not ok`, BLOCKED/FAIL verdict, or artifact discrepancy exists in the complete log;
- only existing diagnostic: 2 moderate npm vulnerabilities.

Accepted behavior includes copied-state clone detection, same-device old-state restore fixture capability, before-dispatch cancellation preventing physical mutation, after-effect cancellation preserving verified reality while stopping later work, repeated cancellation determinism, and unchanged crash-boundary semantics.

## 1. Objective

Complete the two generic deterministic controls required by S07C and repair only the demonstrated production cancellation-signal propagation defect.

This prerequisite must not redesign device authority, cancellation, durable recovery, retry, or run coordination.

## 2. Generic Test-Platform Controls

### 2.1 External persisted-state copy

Existing `fault-device-state` supports:

- fault: `copy-from-device`;
- target: `device`;
- required `sourceDevice`.

Behavior:

- copy source persisted synchronization-state bytes into target backing;
- fail closed when source has no persisted state;
- copy no local vault content, runtime/controller object, Drive state, clock, or device identity;
- make no authority/recovery decision.

### 2.2 Boundary-armed cancellation

Existing `request-cancellation` supports optional:

- `before-remote-dispatch`;
- `after-remote-effect`.

Without a boundary, immediate production cancellation behavior is unchanged.

With a boundary, the existing physical-boundary interceptor issues production `cancel-active-sync` while the run is active instead of throwing a crash.

Existing crash-boundary behavior remains unchanged when armed as a crash.

## 3. Bounded Production Repair

The R2 production repair is limited to:

1. optional `SynchronizationCancellationSignal` input on `createAuthoritativeProductExecutorV1_3(...)`;
2. forwarding that live signal through all V1.3 successor REMOTE mutation calls:
   - `createReserved`;
   - `updateExisting`;
   - `moveExisting`;
   - `trashExisting`;
3. forwarding the same signal through all V1.3 LOCAL transactional calls:
   - `stageAndVerify`;
   - `commitVerifiedStage`;
   - `recover`;
4. `ProductController.executePlanned(...)` supplying `this.runs.cancellationSignal()` after the run has successfully begun.

No frozen mutation contract changes are authorized.

No predecessor durable-executor semantics are changed.

## 4. Writable Allowlist

Implementation/test:

- `test-platform/src/scenario/scenario-contract.ts`;
- `test-platform/src/scenario/scenario-runner.ts`;
- `test-platform/src/virtual-world/virtual-world.ts`;
- `test-platform/test/s07c-clone-restore-cancellation-prerequisite.test.ts`;
- `src/product/authoritative-production-executor.ts`;
- `src/product/product-controller-base.ts`.

Documentation:

- this file;
- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07c-device-authority-and-cancellation-scenarios.md`;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable.

## 5. Architecture Constraints

- framework-core baseline: 3,999 / 4,000 logical TypeScript LOC / 10 runtime modules;
- test-platform framework-core delta MUST remain exactly <=1 LOC;
- no new runtime module;
- production repair must remain inside the existing V1.3 successor execution seam and controller composition;
- no new device-authority subsystem, cancellation subsystem, persistence family, runner, fault framework, observation family, PowerShell, PHX-CI, or governance mechanism;
- existing after-effect semantics remain: a verified physical effect is never rolled back by cancellation, and later operations do not begin.

## 6. Focused Proof

Focused verification must prove:

- copied A state on B loads as `recovery-required / clone-or-restore-suspected`;
- copied old B state can be restored to B without changing embedded B identity;
- cancellation at `before-remote-dispatch` prevents the physical REMOTE effect;
- cancellation at `after-remote-effect` preserves that verified effect and prevents later plan operations;
- repeated immediate cancellation is deterministic;
- existing crash boundaries remain crashes.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07c-clone-restore-cancellation-prerequisite.test.js`

PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`  
Change class: `ordinary`.

## 7. Stop

Stop after authoritative PHX-CI acceptance and architecture review. Do not implement S07C proper scenarios on this branch.
