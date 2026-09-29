# BVP-S05D — Bounded Checkpoint / Resume Representation

## 0. Status

**Agent name:** `agt-brain-bvp-s05-scenario-platform-01`
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT
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

The S05D contract is bound to the accepted S05C/S05B/S05A repository state as follows:

- exact accepted S05C predecessor / PHX-CI base: `94b903a7bca9f13269e3eec93e72b6c6c46ac2a6`;
- exact task branch: `bvp-s05d-bounded-checkpoint-resume`;
- accepted scenario identity/applicability authority: `ScenarioDefinition.id` and `ScenarioDefinition.executionModes`;
- accepted runner result semantics: `ScenarioExecutionResult` and ordered `ScenarioStepExecution` records;
- accepted canonical evidence type: `CanonicalScenarioEvidence`; checkpoint state may retain bounded references/summaries needed for continuation but may not serialize arbitrary captures or the production runtime object graph;
- existing S05A checkpoint vocabulary remains `checkpoint:capture` and `checkpoint:restart-device`; S05D defines the external checkpoint representation/codec/store only and does not redesign runner sequencing;
- exact checkpoint implementation path: `test-platform/src/scenario/scenario-checkpoint.ts`;
- exact checkpoint test path: `test-platform/test/scenario-checkpoint.test.ts`;
- exact implementation-writable allowlist: `test-platform/src/scenario/scenario-checkpoint.ts` and `test-platform/test/scenario-checkpoint.test.ts` only;
- no changes to `scenario-contract.ts`, `scenario-runner.ts`, `scenario-evidence.ts`, production, production seam, governance, PowerShell, live-device transport, or scenario catalog are authorized;
- checkpoint state is external test-controller authority only and may never become synchronization authority or mutate product state by restoration alone;
- representation must be versioned, deterministic, bounded, JSON-safe, and secret-free; malformed, truncated, wrong-scenario, wrong-run, incompatible-version, and execution-context mismatches must fail closed;
- permitted storage is a small in-memory/local test-controller abstraction only; no database, distributed state service, workflow engine, retry scheduler, or per-device durable scenario state is authorized;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI change classification: `ordinary`;
- focused S05D command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/scenario-checkpoint.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- current accepted framework core is 3,594 / 4,000 logical TypeScript LOC, leaving 406 LOC of hard-budget headroom before S05D;
- S05D must remain compact enough to preserve architecture margin; if the required checkpoint module approaches the remaining hard budget, stop and replan rather than broaden architecture;
- BVP-GOV-010 size gate: PASS — one bounded checkpoint representation/codec/store module plus one focused test file, two implementation paths total, no new dependency, and no new platform-level subsystem family.

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
