# BVP-S07C Prerequisite — Clone / Restore and In-Flight Cancellation Controls R2

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
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
