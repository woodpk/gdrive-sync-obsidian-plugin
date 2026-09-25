# BVP-S08C — Bounded Device Command Agent and Sequence Safety

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Implement the validation-only device agent that executes one bounded addressed command at a time inside Obsidian and returns one typed bounded result/observation, while rejecting stale, duplicate, misaddressed, or invalid commands.

The device agent is not a scenario runner.

## 2. Required End State

The validation-only agent supports the minimum generic command families required by later live execution, such as:

- bounded fixture mutation within the authorized validation fixture scope;
- production preview;
- production execute/sync;
- production reconcile/verify;
- objective observation of bounded local/product state;
- lifecycle/checkpoint acknowledgement where the device can observe it;
- named generic validation fault activation only where already authorized and validation-only.

Every command/result binds to:

- run identity;
- target device identity;
- monotonically controlled command/sequence identity;
- command kind and bounded arguments;
- terminal result/classification;
- production run receipt/correlation when a production synchronization command is invoked.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08B predecessor SHA;
- task branch;
- accepted validation-only entrypoint/composition;
- actual production operations/receipt surfaces callable inside Obsidian;
- exact bounded command vocabulary needed by S09 obligations;
- exact agent/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- live-agent LOC baseline/budget;
- size-gate confirmation.

Binding may enumerate concrete command names but may not turn the agent into a scenario engine.

## 4. Required Semantics

### 4.1 Addressed single-command execution

The agent evaluates one command independently against run/device/sequence validity, executes it if valid, and returns a bounded result.

It does not decide the next scenario step.

### 4.2 Run/device identity

Commands for another run/device are rejected/ignored with an explicit mismatch result and produce no product/fixture mutation.

### 4.3 Sequence safety

The agent must prevent stale or duplicate commands from causing repeated unsafe effects.

At minimum:

- lower/previous completed sequence IDs do not re-execute;
- exact duplicate command delivery is idempotently rejected or returns the prior bounded result without repeating the effect;
- an invalid sequence transition does not silently execute.

The exact monotonic policy may follow the simplest design compatible with later transport semantics.

### 4.4 Production commands

Commands claiming synchronization behavior invoke the installed production path and return the S08A production terminal receipt/equivalent plus bounded observations.

The agent cannot manufacture a PASS classification.

### 4.5 Fixture mutation boundary

Validation fixture mutation is strictly bounded to disposable test-controlled fixture content and cannot mutate arbitrary unrelated user vault data.

### 4.6 No scenario state machine

The agent cannot store whole scenario definitions, branch based on scenario ID, choose future commands, aggregate final scenario verdict, or persist distributed suite state.

## 5. Hard Budget

The live-device agent/relay subset across S08 remains maximum **750 logical TypeScript LOC**.

This child must report its contribution to that subset.

## 6. Invariants

- External runner owns global sequence/verdict.
- Agent owns only command validity/execution/result.
- Production owns synchronization behavior.
- Command metadata is not synchronization authority.
- No token export/new OAuth scope.
- Validation-only agent excluded from shipping production artifact.

## 7. Material Edge / Failure Cases

Tests must cover:

- correctly addressed next command executes once;
- wrong run rejected;
- wrong device rejected;
- stale sequence rejected;
- duplicate sequence does not repeat effect;
- malformed/unsupported command fails closed;
- production operation failure/ambiguity propagates accurately;
- fixture command cannot escape authorized fixture scope;
- agent restart retains only the minimal sequence safety required by the frozen command protocol, without becoming scenario persistence.

## 8. Engineering Discretion

The agent may choose:

- command/result discriminated unions;
- local sequence-state representation;
- exact duplicate-result handling;
- private handlers;
- validation-only storage necessary for bounded sequence safety.

Do not add a generic RPC framework or distributed workflow engine.

## 9. Dependencies

Consumes S08A production receipt and S08B validation-only entrypoint.

S08D supplies transport; S08E supplies external scenario authority.

## 10. Acceptance Criteria

Acceptance requires bounded command vocabulary, run/device/sequence safety, single-command execution, production-path fidelity, fixture containment, no scenario engine, live-agent budget compliance, shipping exclusion, architecture guard/metrics PASS, and authoritative PHX-CI PASS.

## 11. Non-Goals

Do not implement:

- Drive-backed mailbox/Windows relay;
- external live scenario executor;
- human checkpoint orchestration;
- full physical scenario catalog;
- production scenario UI.

## 12. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, command vocabulary, run/device/sequence tests, fixture-boundary proof, live-agent LOC contribution, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08D.
