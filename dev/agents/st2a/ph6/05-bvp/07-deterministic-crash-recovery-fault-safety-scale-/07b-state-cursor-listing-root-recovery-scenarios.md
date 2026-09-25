# BVP-S07B — State, Cursor, Listing, and Remote-Root Recovery Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** accepted S07A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for fail-closed recovery from corrupt/incompatible durable state, lost/invalid change cursors, incomplete remote coverage, and loss/replacement of the managed remote root.

## 2. Required End State

Executable scenarios cover:

- corrupt durable synchronization state;
- truncated durable state;
- incompatible/unsupported state version;
- lost/invalid remote change cursor;
- incomplete/partial listing/change coverage;
- managed remote root missing/unavailable;
- managed remote root identity changed/replaced where the product contract distinguishes it;
- safe recovery/reconciliation signaling without destructive inference.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07A predecessor SHA;
- task branch;
- current state/cursor/root recovery requirements and production classifications;
- accepted S04 state/change-feed/root simulation controls;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No new recovery subsystem is authorized.

## 4. Required Semantics

### 4.1 Corrupt/truncated/incompatible state

Unreadable or incompatible authoritative state cannot be treated as valid empty state.

The scenario must prove the product's target-required fail-closed/recovery behavior without discarding user data or fabricating a clean baseline.

### 4.2 Cursor loss

A lost/invalid cursor must cause the production-defined reconcile/full-observation path or blocking behavior. The test must not manually advance/repair product state as a shortcut.

### 4.3 Incomplete remote coverage

Partial listing/change coverage is not authoritative absence and must not drive unsafe deletion.

### 4.4 Remote-root loss

Missing/unavailable root must be distinguished from an empty valid managed root.

If root identity changes/replacement is material, the product must follow target authority/pairing/recovery rules rather than silently treating a different root as continuous authority.

## 5. Invariants

- Corruption does not become an empty valid state.
- Incomplete listing does not prove deletion.
- Root loss does not masquerade as an empty remote.
- Recovery decisions remain production code.
- Primary simulated user content is not mutated merely to create state faults.
- No new recovery engine or scenario-specific core.

## 6. Material Edge / Failure Cases

Required proof includes:

- malformed state fails closed;
- truncated state fails closed;
- unsupported version is classified safely;
- lost cursor triggers target-required recovery path;
- partial listing cannot cause destructive inference;
- missing root is distinguished from valid empty root;
- replacement/root-ID mismatch is handled per target authority;
- recovery preserves valid user content;
- wrong optimistic expectation fails.

## 7. Engineering Discretion

The agent may choose representative corruption bytes/structures and root/cursor fixture values within current production formats.

## 8. Dependencies

Consumes accepted S04 state/change/root controls and S07A restart infrastructure.

## 9. Acceptance Criteria

All required recovery scenarios map to current requirements and pass against production recovery logic; fail-closed distinctions are asserted; no platform-core/production changes occur; scenario/architecture budgets pass; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover device clone/restore authority or cancellation (07C), transfer/retry (07D), resource/safety/config (07E), scale (07F), or physical provider outages.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, recovery classifications/results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07C.
