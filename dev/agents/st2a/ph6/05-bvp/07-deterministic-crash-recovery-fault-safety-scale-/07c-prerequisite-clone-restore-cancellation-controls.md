# BVP-S07C Prerequisite — Clone / Restore and In-Flight Cancellation Controls

## 0. Status

**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Parent:** BVP-S07C  
**Predecessor / PHX-CI base:** `124b7cb59505ca17ac9d80eab989d7b3160bc222`  
**Branch:** `bvp-s07c-prereq-clone-restore-cancellation-controls`

## 0.1 Ready-for-Verification Record

The bounded S07C prerequisite implementation is complete and **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `23fe1dc4c829672a5b6bf0deb68ce6a278380b74`;
- PHX-CI base: `124b7cb59505ca17ac9d80eab989d7b3160bc222`;
- branch: `bvp-s07c-prereq-clone-restore-cancellation-controls`;
- implementation paths changed: existing scenario contract, existing scenario runner, existing virtual-world boundary controller, plus one focused test;
- framework-core delta: +1 logical TypeScript LOC;
- projected framework core: 4,000 / 4,000;
- runtime module count unchanged at 10;
- production source / production seam / PowerShell / PHX-CI implementation delta: 0;
- no new runner, state machine, persistence subsystem, device-authority subsystem, cancellation subsystem, fault framework, or observation family.

Implemented controls:

- `fault-device-state: copy-from-device` copies persisted synchronization-state bytes only;
- `request-cancellation` accepts optional `before-remote-dispatch` / `after-remote-effect` boundary arming;
- immediate cancellation behavior remains unchanged;
- ordinary crash-boundary behavior remains unchanged.

Authoritative PHX-CI and architecture metrics remain the acceptance authority.

## 1. Objective

Expose two already-supported production semantics through the existing deterministic external-state/boundary family so S07C can model:

1. copied/restored persisted per-device synchronization state as an external fixture condition;
2. cancellation accepted while a production run is actually in flight at a deterministic physical-effect boundary.

This prerequisite must not implement device-authority policy or cancellation policy.

## 2. Existing Capability to Reuse

- `VirtualDeviceBacking.persistedBytes()` returns a defensive copy of persisted synchronization-state bytes.
- `MemoryStateByteStorage.write(...)` copies bytes into a target backing.
- production state load already classifies an embedded device identity that disagrees with the installation identity as `recovery-required / clone-or-restore-suspected`.
- `request-cancellation` already delegates to production `cancel-active-sync`.
- `VirtualCrashController` already intercepts `before-remote-dispatch` and `after-remote-effect`.

## 3. Required End State

### 3.1 External persisted-state copy

Extend the existing `fault-device-state` transition with:

- fault: `copy-from-device`;
- target remains `device`;
- required `sourceDevice`.

Behavior:

- copy the source backing's persisted synchronization-state bytes into the target backing;
- fail closed if the source has no persisted bytes;
- copy no local vault content, runtime object, Drive state, clock, controller, or device identity;
- make no authority/recovery decision.

This single control must be sufficient for:
- direct clone simulation A -> B;
- old-state backup/restore simulation B -> C (backup) then C -> B (restore).

### 3.2 Boundary-armed cancellation

Extend existing `request-cancellation` with optional:

- `boundary: "before-remote-dispatch" | "after-remote-effect"`.

Behavior:

- without `boundary`, preserve the existing immediate production cancellation request exactly;
- with `boundary`, arm the existing deterministic physical-boundary interceptor;
- when the named boundary is reached, issue production `cancel-active-sync` against the already-active device controller instead of crashing;
- do not throw a virtual crash for a cancellation-armed boundary;
- cancellation semantics after the boundary remain entirely production-owned.

## 4. Writable Allowlist

Implementation/test:

- `test-platform/src/scenario/scenario-contract.ts`
- `test-platform/src/scenario/scenario-runner.ts`
- `test-platform/src/virtual-world/virtual-world.ts`
- `test-platform/test/s07c-clone-restore-cancellation-prerequisite.test.ts`

Documentation:

- this file;
- `dev/agents/st2a/ph6/05-bvp/07-deterministic-crash-recovery-fault-safety-scale-/07c-device-authority-and-cancellation-scenarios.md`;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable.

## 5. Architecture Constraints

- framework-core baseline: 3,999 / 4,000 logical TypeScript LOC / 10 modules;
- net framework-core delta MUST be <=1 LOC;
- no new runtime module;
- no production, seam, PowerShell, PHX-CI, persistence, planner, device-authority, cancellation, fault, or observation subsystem;
- existing crash behavior remains unchanged unless the boundary was explicitly armed for cancellation.

If this cannot fit, stop BLOCKED.

## 6. Focused Proof

Focused verification must prove:

- copied state A -> B loads on B as `recovery-required / clone-or-restore-suspected`;
- a B-state backup copied into another backing and later copied back to B preserves B's embedded identity while restoring old authority bytes;
- missing source state copy fails closed;
- immediate `request-cancellation` remains accepted and deterministic;
- cancellation armed at `before-remote-dispatch` prevents the physical mutation;
- cancellation armed at `after-remote-effect` does not pretend the verified physical effect rolled back and prevents starting later work after cancellation;
- repeated cancellation requests remain safe/deterministic;
- existing virtual crash boundaries still throw when armed as crashes.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07c-clone-restore-cancellation-prerequisite.test.js`

PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`  
Change class: `ordinary`.

## 7. Stop

Stop after authoritative PHX-CI acceptance and architecture review. Do not implement S07C proper scenarios on this branch.
