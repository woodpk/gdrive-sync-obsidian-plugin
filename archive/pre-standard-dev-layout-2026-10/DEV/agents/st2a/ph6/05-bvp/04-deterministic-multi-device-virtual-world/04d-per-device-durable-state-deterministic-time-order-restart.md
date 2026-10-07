# BVP-S04D — Per-Device Durable State, Deterministic Time / Order, and Restart

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Authoritative Acceptance Record

S04D is complete and accepted.

- authoritative predecessor / accepted S04C closure: `95bd0e4f229e4173311120aa94bf8a3203b03c1a`;
- accepted implementation SHA: `6271bcf600f824bac501d6a5bb4e0cee6940e12a`;
- authoritative PHX-CI evidence / promoted integration SHA: `f1371daacabe51196580f9e8e974e242471b4909`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused BVP verification: PASS, 122/122;
- full repository tests: PASS, 822/822;
- architecture guard: PASS, 0 violations;
- production seam: 1 file / 80 logical LOC;
- framework core: 1911 logical TS LOC / 5 runtime modules, within the 4000-LOC budget;
- live-device/scenario-specific production surfaces: 0;
- production artifact: unchanged at 872862 bytes, SHA-256 `6e3e1b0deb16f714c19dc9b71b0f9c57b07853add755b46a08ed1cb52b237c7d`.

The initial S04D run at evidence `bdcf308886c4c6ddbba6fb2355baaea607bcc331` was BLOCKED solely by a TypeScript variance defect in the deterministic order-gate queue. Repository verification and the full production test suite passed in that run. The bounded type-storage repair at `6271bcf600f824bac501d6a5bb4e0cee6940e12a` changed only `test-platform/src/virtual-world/per-device-runtime.ts` beyond the failed evidence commit and was then reverified authoritatively.

Accepted S04D behavior includes isolated per-device production state/cursor authority, shared Drive with independent local/state reality, genuine runtime destruction/reconstruction over retained production bytes, deterministic explicit time inputs to production policies, explicit external observation ordering, cursor loss, truncation, checksum corruption, incompatible schema, missing expected state, and clone/restore identity mismatch.

This file is now a historical completion record and authorizes no further S04D work.

## 1. Objective

Provide deterministic per-device authority/state stores, clocks/order controls, and runtime reconstruction so later tests can prove crash/restart, stale-device, cursor, tombstone, and multi-device behavior using real production state logic.

## 2. Required End State

The virtual-world foundation can represent at least two independent logical devices where each has its own retained:

- device identity;
- production synchronization state;
- cursor/change-feed state;
- tombstones/identity mappings where production contracts use them;
- configuration/state authority required by production logic.

The test infrastructure can:

- control relevant time values deterministically;
- control operation ordering without wall-clock sleeps;
- destroy runtime/service objects;
- reconstruct fresh runtime objects over retained simulated local/remote/state reality;
- inject controlled state corruption/truncation/version/cursor-loss conditions needed by later tests.

## 3. Dispatch Binding — Hard Data Only

The S04D contract is bound to accepted S04C state as follows:

- exact accepted S04C predecessor / PHX-CI base authority: `95bd0e4f229e4173311120aa94bf8a3203b03c1a`;
- exact task branch: `bvp-s04d-per-device-state-time-restart`;
- production durable byte boundary: `StateByteStorage` from `src/state/persistent-state-store.ts`;
- production in-memory durable backing reused by BVP: `MemoryStateByteStorage`;
- production serialization/checksum/schema/CAS/recovery implementation: `PersistentSynchronizationStateStore`;
- production split-domain compatibility layer used by the runtime: `SynchronizationStateAuthorityAdapter` from `src/product/synchronization-adapters.ts`;
- production initial durable authority constructor: `createInitialAuthorityState`;
- production device identity generation: `generateDeviceIdentity(randomBytes)` from `src/state/state-policy.ts`; S04D injects deterministic bytes rather than inventing a second device-identity format;
- production time-dependent state policies: `ageKnownDevices(state, nowMs, ...)`, `markKnownDeviceReconciled(..., advisoryReconciledAtMs)`, and `TombstoneRetentionPolicy`; production has no general synchronization clock port, so S04D supplies deterministic explicit `nowMs` values only where production already accepts them;
- actual retained external reality consumed from accepted predecessors:
  - `InMemoryLocalVault` from S04A;
  - `InMemoryGoogleDriveCore` from S04B/S04C;
- restart means new `PersistentSynchronizationStateStore` and `SynchronizationStateAuthorityAdapter` instances over the same retained per-device `MemoryStateByteStorage`, while the device's local external reality and shared Drive reality remain retained outside those runtime objects;
- state-fault controls are restricted to the byte-storage boundary or valid production state transitions: missing bytes, checksum corruption, truncation, incompatible schema, device-identity mismatch, and change-cursor loss. Production load/recovery classification remains authoritative;
- deterministic ordering is a narrow external observation gate in BVP code only; it controls when queued external actions are released and carries no synchronization decisions, retries, verdicts, or durable workflow state;
- exact S04D implementation path: `test-platform/src/virtual-world/per-device-runtime.ts`;
- exact S04D test path: `test-platform/test/per-device-runtime.test.ts`;
- exact implementation-writable allowlist:
  - `test-platform/src/virtual-world/per-device-runtime.ts`;
  - `test-platform/test/per-device-runtime.test.ts`;
- supervisor-owned seam expansion is authorized only in the existing `src/product/local-vault-boundary-seam.ts` to re-export the frozen production state/store/device/time-policy surfaces enumerated above; production seam count remains 1 and must remain below 350 logical LOC;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S04D command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/per-device-runtime.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- BVP-GOV-010 size gate: **PASS** — one existing state contract family, one new substantive BVP runtime file, two implementation-writable files, and expected non-test delta remains below the approximately 1000-net-LOC split threshold.

S04D may build the per-device/restart foundation only. It may not begin S04E's composed synchronization world or scenario execution.

Binding may not replace production authority semantics with a BVP-only model.

## 4. Required Behavior and Semantics

### 4.1 Per-device independence

Two devices sharing one simulated Drive must not share device-local synchronization authority unless production architecture explicitly says they do.

Mutating device A's local state/cursor must not mutate device B's state by aliasing or global singleton accident.

### 4.2 Production state fidelity

The simulated durable-state layer implements the same production state boundary/serialization semantics used by real logic.

It may expose deterministic corruption/fault controls for tests but must not create a second synchronization state model.

### 4.3 Deterministic time

Relevant clocks are controllable by tests. Production logic receives deterministic time through its existing abstraction/boundary.

Tests must not depend on wall-clock sleeps for semantic sequencing.

### 4.4 Deterministic order

Where concurrent/external ordering affects behavior, tests can establish a deterministic operation/observation order.

The infrastructure controls when external events are observed; it does not choose product decisions.

### 4.5 Restart / reconstruction

Restart testing means destruction of runtime objects and creation of new runtime objects that load retained simulated durable state and retained external reality.

A “restart” that merely calls another method on the same in-memory runtime is insufficient.

### 4.6 State faultability

Tests must be able to represent corruption/truncation/incompatible version/cursor loss at the state boundary without mutating primary simulated user content as a shortcut.

## 5. Invariants

- Device-local authority remains isolated per logical device.
- Shared remote state is shared deliberately, not through accidental object aliasing.
- Restart preserves persisted reality but not ephemeral runtime objects.
- Time/order are deterministic.
- State faults remain external/storage conditions; production recovery chooses behavior.
- No scenario engine or verdict state is introduced here.

## 6. Material Edge / Failure Cases

Tests must cover at least:

- independent device identities;
- independent per-device cursors/state;
- shared remote with independent local/state stores;
- advancing deterministic time;
- deterministic event ordering;
- runtime destruction/reconstruction preserving durable state;
- runtime reconstruction preserving shared remote/local external reality;
- lost cursor;
- corrupt/truncated state representation;
- incompatible state version where production boundary supports classification;
- no cross-device state leakage.

## 7. Engineering Discretion

The agent may choose:

- in-memory durable backing representation;
- clock/scheduler primitive;
- reconstruction factories/world state containers;
- deterministic corruption controls;
- helper/test decomposition.

Do not create a general workflow scheduler or alternate product state machine.

## 8. Dependencies

Consumes S04A local reality and S04B/C remote reality. Produces the per-device/restart foundation used by S04E and later S07 tests.

## 9. Acceptance Criteria

Acceptance requires real production state contracts to run against isolated per-device simulated state; deterministic time/order; genuine runtime reconstruction; state/cursor fault controls; no policy duplication; architecture-budget compliance; authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- full world scenario orchestration;
- declarative scenario model;
- external runner;
- evidence engine;
- live device transport;
- product recovery redesign.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, bound production state/time abstractions, focused tests/results, restart proof, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04E.
