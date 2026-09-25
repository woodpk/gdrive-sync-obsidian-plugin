# BVP-S05D — Bounded Checkpoint / Resume Representation

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S05 — Declarative Scenario Runner / Assertions / Evidence  
**Predecessor:** accepted S05C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Define and implement the minimum external test-controller checkpoint state needed to pause and resume later physical scenario execution without creating a durable distributed workflow engine.

## 2. Required End State

A bounded checkpoint can record only the non-secret controller state necessary to resume an interrupted scenario, including as applicable:

- checkpoint/schema version;
- scenario identity;
- run identity;
- execution mode;
- next/current step position;
- references or bounded summaries of prior step results needed for continuation;
- target device identity/sequence state when live execution later requires it;
- explicit waiting/checkpoint condition and required resume evidence.

It remains external test-runner state and never becomes product synchronization authority.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S05C predecessor SHA;
- task branch;
- actual runner/scenario/result types to checkpoint;
- exact checkpoint storage/codec/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

No binding may turn the checkpoint into general workflow persistence.

## 4. Required Semantics

### 4.1 Bounded state

Persist only what is required to resume the test sequence. Do not serialize entire runtime object graphs, production state stores, OAuth credentials, or arbitrary external reality.

### 4.2 External authority only

A checkpoint may tell the **test runner** what step to attempt next. It cannot tell production synchronization what state should exist or force a product result.

### 4.3 Resume validation

Resume must validate that the checkpoint belongs to the intended:

- scenario;
- run;
- compatible checkpoint schema/version;
- execution context/device identity where applicable.

Stale/mismatched checkpoints fail closed.

### 4.4 No implicit replay ambiguity

The representation must make it possible for later live execution to distinguish whether the next action is:

- not yet issued;
- awaiting a human/external resume condition;
- safe to re-observe/reconcile;
- already completed and recorded.

Do not invent exactly-once distributed execution; instead preserve enough run/sequence/result identity for later executor semantics.

### 4.5 Privacy

Checkpoint state contains no OAuth secrets/tokens or unrelated note content.

## 5. Invariants

- Checkpoint storage is not per-device synchronization state.
- Devices do not own the global scenario machine.
- Production code does not read BVP checkpoints.
- Evidence and checkpoint state remain conceptually distinct.
- Checkpoint persistence stays small and bounded.

## 6. Material Edge / Failure Cases

Tests must cover:

- serialize/restore a valid checkpoint;
- scenario mismatch rejected;
- run mismatch rejected;
- unsupported/incompatible version rejected;
- malformed/truncated checkpoint rejected;
- secret/token-like fields are not part of the schema;
- next-step position/result references survive round trip;
- restored checkpoint cannot mutate product state by itself.

## 7. Engineering Discretion

The agent may choose:

- JSON or equivalent simple serialization;
- exact versioning representation;
- local file/in-memory test storage abstraction;
- validation helpers.

Do not introduce a database, distributed state service, generic workflow engine, or per-device durable scenario state.

## 8. Dependencies

Consumes S05A scenario identity, S05B runner position/result semantics, and S05C canonical result references.

P5 live execution will later use this representation for bounded interruption/human checkpoints.

## 9. Acceptance Criteria

Acceptance requires bounded/versioned/non-secret checkpoint state, fail-closed mismatch/corruption handling, external-only authority, deterministic round-trip tests, no workflow-engine architecture, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- live command transport;
- device agent;
- background iOS workflow;
- distributed locks/leases;
- generalized retry scheduler;
- synchronization-state persistence.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, checkpoint schema semantics, negative tests, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 05E.
