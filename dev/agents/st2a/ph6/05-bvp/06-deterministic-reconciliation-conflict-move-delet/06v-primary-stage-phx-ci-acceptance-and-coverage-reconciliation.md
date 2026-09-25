# BVP-S06V — Primary-Stage PHX-CI Acceptance and Coverage Reconciliation

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Task type:** PRIMARY-STAGE INTEGRATION / VERIFICATION  
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage

This is a complete prewritten verification contract. It has no implementation-repair authority.

## 1. Objective

Independently verify the integrated S06 scenario catalog and reconcile it against all product reconciliation/conflict/move/deletion requirements assigned to S06.

## 2. Required Integrated End State

S06 may close only if executable deterministic coverage exists for:

- fresh local-only / remote-only / equal / divergent-no-base initialization;
- ordinary one-sided local/remote changes;
- clean text merge;
- true text conflict;
- binary conflict;
- delete-vs-modify both directions;
- ordinary local/remote deletion and both-deleted;
- no-base absence safety;
- unreadable path safety;
- clock-skew non-authority;
- stale-device safety;
- stable-ID moves/renames and ambiguous move handling;
- path/case/Unicode collisions;
- exclusions;
- unknown/unmanaged local/remote content;
- empty-folder behavior.

All scenarios must map to current product requirements and use the frozen common core.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact integrated `phase6-integration` SHA containing accepted S06 children;
- stage verification base;
- PHX-CI pin/runtime;
- accepted child implementation/evidence SHAs;
- focused S06 catalog command(s);
- current target requirement list assigned to S06;
- S05 core metrics baseline and current metrics.

## 4. Verification Procedure

Independently:

1. inspect all S06 scenario/fixture/test changes;
2. reconcile every assigned target requirement to executable scenario evidence;
3. verify no scenario-specific core/production/PowerShell changes were introduced;
4. verify each ordinary scenario ≤200 logical lines;
5. verify S05 common core metrics remain effectively stable except separately authorized generic corrections, if any;
6. run authoritative integrated PHX-CI;
7. inspect canonical evidence and architecture metrics.

## 5. Stage-Specific Acceptance Criteria

S06 passes only when:

- no material assigned reconciliation requirement is unmapped;
- all mapped scenarios pass;
- representative wrong expectations fail;
- scenario-specific production files/classes/interfaces = 0;
- scenario-specific PowerShell = 0;
- no new runner/persistence/evidence/transport architecture exists;
- per-scenario hard LOC limit passes;
- architecture guard/metrics PASS;
- PHX-CI overall PASS / compatibility COMPLETE / canonical evidence published.

Historical C03–D06 labels may be used only as traceability; acceptance is against current product requirements, not historical scenario symmetry.

## 6. Failure / Correction Semantics

If a scenario exposes a product defect, report it as a product defect rather than changing expected results to make the test green.

If a genuinely missing generic platform primitive is discovered, identify it as an architecture/supervisor blocker rather than allowing a scenario child to grow the core silently.

## 7. Non-Goals

Do not begin S07 or physical/live validation.

## 8. Completion / Stop

Only after all criteria pass may the supervisor mark BVP-S06 accepted and bind S07A hard execution facts.

Stop after S06 acceptance.
