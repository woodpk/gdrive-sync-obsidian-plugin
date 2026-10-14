# BVP-S09D — Physical Path / Platform and Resource / Large-Transfer Coverage

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted S09C

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten physical-evidence contract. Dispatch binding supplies exact platform/resource/run coordinates only.

## 1. Objective

Prove representative real Windows/iOS path/platform behavior and constrained/mobile large-transfer/resource behavior that deterministic host tests cannot establish physically.

## 2. Required End State

Physical evidence covers the current product target's real-platform obligations for:

- representative Windows path behavior;
- representative iOS path/storage behavior;
- any material case/Unicode/path compatibility difference requiring real platform evidence;
- representative large transfer on the constrained/mobile runtime;
- representative resource pressure/constraint behavior that can safely be observed physically;
- content integrity and production terminal state after the physical transfer;
- safe handling of platform/resource limits without destructive behavior.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S09C build/device state;
- exact current product physical path/platform/resource requirements;
- exact representative path cases selected;
- exact file sizes/counts required for physical proof;
- exact disposable fixture namespace/storage location;
- exact Windows/iOS device capacity/resource preconditions;
- exact run identities/checkpoints;
- exact evidence output paths/writable allowlist;
- current PHX-CI repository verification baseline.

Do not invent a larger performance/resource SLA than the product target actually requires.

## 4. Required Physical Semantics

### 4.1 Platform path reality

Use actual platform filesystems/APIs. Deterministic path-policy tests from S06 remain semantic proof; this child proves representative real-platform behavior.

### 4.2 Large transfer

Execute a representative physically meaningful large transfer through the real production path on the required constrained/mobile platform.

Prove:

- exact source/target identity;
- content integrity;
- terminal production receipt;
- no partial/corrupt success classification.

### 4.3 Resource evidence

Record bounded resource observations available safely in the environment.

If the product target defines a threshold, evaluate it. If it does not, do not invent a pass/fail benchmark; record observed behavior and required correctness/safety outcome.

### 4.4 Constraint safety

Low resource/capacity conditions must not cause silent data corruption or unsafe destructive fallback.

Only perform safe, bounded resource manipulation approved at dispatch.

## 5. Invariants

- Physical platform claims come from physical execution.
- Content integrity remains mandatory.
- No benchmark framework is introduced.
- No artificial SLA is invented.
- Disposable fixtures only.
- Deterministic S07 scale evidence remains complementary and broader than the physical sample.

## 6. Material Edge / Failure Cases

Evidence must detect:

- incompatible/path-normalization behavior inconsistent with target semantics;
- transfer truncation/corruption;
- false success under resource failure;
- insufficient device capacity to safely run the case;
- physical environment incapable of producing the required evidence.

Unsafe or unavailable resource manipulation yields `BLOCKED`.

## 7. Evidence Requirements

Record:

- device/build/run identity;
- representative path strings/normalization class in non-sensitive form;
- source/target file identity and size;
- pre/post content hash;
- production run receipt;
- resource measurements/constraints available;
- terminal result;
- any operator checkpoint.

## 8. Engineering / Operator Discretion

The operator may choose representative path names/content and safe physical size within the target requirement, plus simple available resource observations.

## 9. Dependencies

Consumes deterministic path/scale coverage from S06D/S07F and accepted S09 physical baseline.

## 10. Acceptance Criteria

Acceptance requires representative physical platform/path and mobile large-transfer/resource evidence, verified integrity, no invented SLA, safe failure behavior, exact traceability, and supervisor review.

Any repository evidence change must pass authoritative PHX-CI.

## 11. Non-Goals

Do not build generalized performance/load infrastructure. Do not perform auth revocation/lifecycle closure (09E) or final traceability closure (09F).

## 12. Handoff / Stop

Report exact device/build/run identity, selected physical cases, sizes/hashes, receipts, resource observations, blockers, evidence paths, and any evidence commit.

Stop at the supervisor-reviewed S09D physical evidence gate.

Do not begin 09E.
