# BVP-S07C — Device Authority and Cancellation Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** accepted S07B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for device identity/authority hazards and safe cancellation of in-progress synchronization behavior.

## 2. Required End State

Executable scenarios cover current product requirements for:

- cloned/copied local vault or state presented as another device;
- restored stale device/state returning after authoritative newer activity;
- device identity mismatch/duplication where production contracts detect it;
- stale-device authority protections not already fully covered in S06C;
- cancellation before a physical effect;
- cancellation during bounded work;
- cancellation after an uncertain/physical effect where production must preserve/reconcile reality rather than pretending rollback.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07B predecessor SHA;
- task branch;
- current device identity/authority/cancellation requirement IDs and production APIs;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No new device-authority or cancellation subsystem is authorized.

## 4. Required Semantics

### 4.1 Device authority

Device-local identity/state must not gain authority merely because files/state were copied.

Scenarios must prove production uses the target device/state authority model to prevent stale/cloned state from causing unsafe resurrection, overwrite, or identity collision.

### 4.2 Restore/stale return

Restored old device state must reconcile against current authoritative reality rather than assuming its snapshot is current.

### 4.3 Cancellation before effect

When cancellation occurs before physical mutation, no prohibited physical effect should occur.

### 4.4 Cancellation after effect begins

Cancellation cannot claim rollback of an external effect that may already have occurred. The resulting state/uncertainty must remain recoverable and observable according to production semantics.

### 4.5 No test-forced authority

The scenario cannot directly rewrite product device identity/state to manufacture the expected safe result except as an explicit external fixture condition before production execution.

## 5. Invariants

- Device authority remains production-owned.
- Clone/restore conditions are external state facts, not alternate authority rules.
- Cancellation never creates stronger certainty than physical reality.
- No scenario-specific core/production changes.
- Scenario-only default remains intact.

## 6. Material Edge / Failure Cases

Required proof includes representative:

- cloned identity/state condition safely detected/handled;
- stale restored device cannot overwrite newer authoritative content;
- cancellation before effect prevents effect;
- cancellation after ambiguous/applied effect preserves uncertainty/recovery requirements;
- repeated cancellation is deterministic/idempotent where applicable;
- wrong authority/cancellation expectation fails.

## 7. Engineering Discretion

The agent may choose representative clone/restore chronology and cancellation boundaries supported by current production abstractions.

## 8. Dependencies

Consumes S04 per-device state/restart controls, S07A ambiguity boundaries, and current product authority/cancellation contracts.

## 9. Acceptance Criteria

All required scenarios pass against production authority/cancellation behavior; no destructive stale-device result occurs; cancellation semantics preserve real effect state; wrong expectations fail; no core/production changes occur; budgets and authoritative PHX-CI pass.

## 10. Non-Goals

Do not cover transfer integrity/retry (07D), quota/disk/destructive/config/lifecycle (07E), or scale (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, mapped requirements, authority/cancellation cases/results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07D.
