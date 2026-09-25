# BVP-S04D — Per-Device Durable State, Deterministic Time / Order, and Restart

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

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

Before execution the supervisor binds:

- exact accepted S04C predecessor SHA;
- task branch;
- actual production state-store/device-identity/time abstractions;
- existing serialization/state helpers relevant to deterministic reconstruction;
- exact implementation/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

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
