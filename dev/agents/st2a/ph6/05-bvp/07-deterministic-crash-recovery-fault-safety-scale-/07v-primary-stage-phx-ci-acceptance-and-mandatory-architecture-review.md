# BVP-S07V — Primary-Stage PHX-CI Acceptance and Mandatory Architecture Review

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify completion of the deterministic Phase-6 evidence families assigned to S07 and perform the mandatory architecture review before any live-device architecture is allowed to begin.

## 2. Required Integrated End State

S07 may close only if deterministic executable evidence covers, where applicable to current product requirements:

- crash/interruption around physical effect and state commit;
- ambiguous remote outcomes;
- corrupt/truncated/incompatible state;
- lost/invalid cursor;
- partial/incomplete remote coverage;
- managed-root loss/replacement;
- clone/restore/stale device authority;
- safe cancellation;
- transfer integrity and changing-during-transfer;
- retry/backoff/rate-limit classification;
- quota/local-disk failures;
- destructive circuit breaker/recovery checkpoint;
- deterministic configuration/lifecycle invariants;
- bounded large-file/large-vault scale/resource measurements.

The common platform core must remain frozen/bounded; coverage growth should be dominated by scenario/fixture/test content.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact integrated `phase6-integration` SHA containing accepted S07 children;
- stage verification base;
- current PHX-CI pin/runtime;
- accepted S07 child implementation/evidence SHAs;
- complete current product requirement list assigned to deterministic S07 coverage;
- focused catalog/scale commands;
- S05/S06 architecture baseline and current metrics.

## 4. Verification Procedure

Independently:

1. reconcile every assigned deterministic requirement/evidence category to executable scenarios/evidence;
2. inspect S07 changes for scenario-only/default surface compliance;
3. verify fault injection remains boundary-based and does not encode product policy;
4. verify ambiguity, incomplete coverage, and corruption remain fail-closed;
5. verify restart tests use fresh runtime reconstruction;
6. verify safety thresholds were not weakened;
7. verify scale evidence does not invent performance requirements;
8. run authoritative integrated PHX-CI;
9. inspect canonical evidence and architecture metrics;
10. perform the mandatory pre-S08 BVP-GOV-008 architecture review.

## 5. Stage-Specific Acceptance Criteria

S07 passes only when:

- no material deterministic target requirement assigned through §13.2–§13.5 and applicable deterministic portions of §13.4/§13.7 remains unassigned;
- required scenario evidence passes;
- representative wrong expectations/failure cases prove tests are discriminating;
- no new runner/router/state-machine/persistence/evidence/transport architecture exists;
- scenario-specific production source = 0;
- scenario-specific PowerShell = 0;
- framework/core budgets pass;
- S05 common-core growth is justified and within authorized boundaries;
- PHX-CI overall PASS / compatibility COMPLETE / canonical evidence published;
- architecture review explicitly finds S08 may proceed, or blocks with the smallest required architecture decision.

## 6. Failure / Correction Semantics

Product defects discovered by deterministic evidence are product defects; do not change expected results to green them.

Architecture drift discovered here blocks S08 even when functional tests pass.

Corrective work must be routed to the causal owner; this verification task performs no implementation repair.

## 7. Non-Goals

Do not begin live-device agent, production receipt seam, command transport, or S09 physical coverage.

## 8. Completion / Stop

Only after all criteria pass and the architecture review authorizes continuation may the supervisor mark BVP-S07 accepted and bind S08A hard execution facts.

Stop after S07 acceptance.
