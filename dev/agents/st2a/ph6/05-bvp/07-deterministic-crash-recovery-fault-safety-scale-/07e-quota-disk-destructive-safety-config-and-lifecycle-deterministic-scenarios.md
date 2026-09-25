# BVP-S07E — Quota / Disk, Destructive Safety, Configuration, and Lifecycle Deterministic Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** accepted S07D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Add declarative deterministic coverage for modeled resource failures, destructive-safety/circuit-breaker behavior, recovery checkpoints, and configuration/lifecycle invariants that do not intrinsically require a real installed Windows/iOS runtime.

## 2. Required End State

Executable scenarios cover current deterministic requirements for:

- remote quota/capacity failure;
- local disk/capacity write failure;
- destructive-operation threshold/circuit-breaker activation;
- blocked destructive plan/preview behavior;
- explicit recovery/reconcile checkpoint after a destructive-safety stop;
- configuration/scope option semantics suitable for deterministic proof;
- lifecycle invariants that are about persisted product state rather than physical OS/app behavior.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07D predecessor SHA;
- task branch;
- current quota/disk/destructive/config/lifecycle requirement IDs and production thresholds/contracts;
- accepted S04 fault/config controls;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No production threshold or safety policy may be changed by binding.

## 4. Required Semantics

### 4.1 Resource failures

Quota/disk failures are modeled as external boundary failures with production-facing classifications. The test does not bypass normal product retry/safety/error handling.

### 4.2 Destructive circuit breaker

Construct a deterministic state that would exceed the product's allowed destructive threshold and prove that production blocks/halts according to target policy before unauthorized destructive effects occur.

### 4.3 Recovery checkpoint

After a destructive safety stop, prove the target-required reconcile/verify/human-confirmation/recovery pathway can resume safely. The scenario must not reset safety state merely to continue.

### 4.4 Configuration semantics

Exercise deterministic configuration/scope behaviors whose subject is product logic rather than real platform UI/storage APIs.

### 4.5 Lifecycle invariants

Prove state invariants for disable/unlink/re-enable/reconstruction only where those invariants can be tested without claiming actual installed-runtime lifecycle evidence.

Physical uninstall/reinstall/device unlink behavior remains S09E.

## 5. Invariants

- Safety thresholds remain production authority.
- Test infrastructure cannot lower/disable circuit breakers.
- Resource failure does not authorize data loss.
- Deterministic lifecycle tests do not claim physical OS evidence.
- No new safety/config engine or scenario-specific core.

## 6. Material Edge / Failure Cases

Required proof includes:

- quota failure classified safely;
- local disk write failure classified safely;
- destructive threshold below limit permits normal behavior where appropriate;
- threshold-exceeding plan is blocked before destructive effects;
- recovery checkpoint requires target-approved conditions;
- configuration change produces target semantics;
- deterministic lifecycle state preserves user/remote data according to product invariants;
- wrong unsafe expectation fails.

## 7. Engineering Discretion

The agent may choose representative resource limits and destructive-count fixtures consistent with current production thresholds/contracts.

## 8. Dependencies

Consumes S04 faults/config controls, S05 runner/evidence, and current production safety/config/lifecycle rules.

## 9. Acceptance Criteria

All deterministic safety/resource/config/lifecycle scenarios map to current requirements and pass; circuit-breaker proof demonstrates actual prevention; no safety weakening/core/production changes occur; budgets and authoritative PHX-CI pass.

## 10. Non-Goals

Do not claim physical install/uninstall/auth/mobile resource behavior; those belong to S09. Do not implement scale measurement (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, safety/resource/config results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07F.
