# BVP-S08E — External Live Executor and Human Checkpoints

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Extend the external BVP runner with a live executor that maps the same declarative capability concepts to bounded device commands/results and uses explicit external checkpoints for OS/provider actions that cannot safely be automated.

Scenario authority remains external.

## 2. Required End State

The external runner can:

- select live execution for scenarios/steps marked live-capable/required;
- translate supported generic scenario capabilities into S08C commands;
- send/receive through S08D transport;
- validate run/device/sequence/result correlation;
- use S08A production receipt for terminal production-run assertions;
- pause at explicit human checkpoints;
- persist only bounded S05D checkpoint state;
- resume after required human/device evidence is supplied;
- fail/block when a required device/result/action is unavailable.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08D predecessor SHA;
- task branch;
- actual S05 runner/executor abstraction;
- accepted S08 command/transport contracts;
- exact live-capable scenario capabilities needed for S09;
- exact live-executor/checkpoint/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

Binding may map existing generic capabilities to commands; it may not create a second scenario vocabulary unnecessarily.

## 4. Required Semantics

### 4.1 Same scenario authority

The external runner remains the only owner of scenario step order and final verdict.

The device sees one command at a time.

### 4.2 Live capability mapping

Where a declarative scenario capability has deterministic and live implementations, both represent the same semantic intent even if mechanics differ.

Unsupported live capability fails/blocks; it is not silently skipped.

### 4.3 Production result authority

Synchronization assertions use the production run receipt plus objective observations. Transport acknowledgement alone is not synchronization success.

### 4.4 Human checkpoints

For actual OS/provider actions that cannot or should not be automated—such as user-mediated auth, iOS termination/suspension, network toggles, uninstall/reinstall, authorization revocation—the runner checkpoint must state:

- exact operator action required;
- target device;
- run/scenario identity;
- stop condition before action;
- evidence/observation required to resume;
- next safe command/observation after resume.

A checkpoint is explicit test state, not a vague instruction to “continue later.”

### 4.5 Mobile lifecycle reality

Do not assume true iOS background execution. Live sequencing must tolerate foreground-only operation, suspension, termination, and later resume.

### 4.6 Fail closed

Missing result, stale/mismatched result, unavailable device, unsupported action, or missing checkpoint evidence yields FAIL/BLOCKED rather than PASS.

## 5. Invariants

- No device-local scenario engine.
- No distributed workflow state machine.
- Checkpoints remain bounded/non-secret.
- Transport remains test metadata, not product authority.
- Production synchronization path is invoked for all synchronization claims.
- Human checkpoints are allowed where physical reality requires them.

## 6. Material Edge / Failure Cases

Tests must cover:

- deterministic mapping from scenario capability to live command;
- correct result correlation;
- stale/wrong-device result rejected;
- missing result blocks;
- production failure/ambiguity propagates;
- checkpoint serialization/resume;
- checkpoint run/scenario mismatch rejected;
- unavailable human-required action produces explicit wait/block state;
- executor does not continue past a required checkpoint without evidence;
- iOS suspension/termination does not require background runner state on device.

## 7. Engineering Discretion

The agent may choose:

- live executor interface shape;
- command mapping helpers;
- exact checkpoint rendering;
- local controller persistence using accepted S05D representation.

Do not create a second runner, workflow engine, or live-only scenario language.

## 8. Dependencies

Consumes S05 runner/checkpoints/evidence and S08A–D live contracts.

S08F validates the complete desktop path before broader S09 physical coverage.

## 9. Acceptance Criteria

Acceptance requires external scenario authority, correct live command mapping/correlation, explicit human checkpoint semantics, no mobile-background assumption, fail-closed unavailable/missing evidence, architecture budgets PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not execute broad physical S09 coverage here; do not automate unsafe/impossible OS actions merely to remove human checkpoints.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, live capability mappings, checkpoint semantics/tests, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08F.
