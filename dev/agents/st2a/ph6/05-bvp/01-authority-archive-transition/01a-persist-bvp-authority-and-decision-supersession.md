# BVP-S01A — Persist BVP Authority and Decision Supersession

## 0. Status

**Agent name:** `agt-brain-bvp-s01-authority-archive-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S01 — Authority / Archive Transition

This file is a historical contract record. It authorizes no new work and MUST NOT be re-executed.

## 1. Objective

Make the BRAIN Verification Platform planning/governance package the active Phase-6 testing-platform authority and supersede the legacy internal-harness architecture decisions without altering product source or behavior.

## 2. Required End State

The completed transition established that:

- the BVP target specification, build decomposition, requirement coverage, session decomposition, build-session specifications, and boundary governance became active authority;
- legacy harness architecture decisions were explicitly superseded rather than silently deleted or left concurrently authoritative;
- still-valid product/process authority was preserved;
- archived legacy material remained historical evidence only;
- no product source or tests were changed by this child.

## 3. Required Semantics and Invariants

The work was required to preserve these semantics:

- user/product authority remained above BVP planning authority;
- the BVP could replace validation architecture but could not redefine synchronization-product behavior;
- legacy decisions retained historical traceability while losing current architectural authority;
- active authority could not simultaneously describe both the superseded internal harness and the replacement BVP as current architecture;
- `dev/archive/**` could not become an alternate active authority source.

## 4. Dependencies

This child depended on the accepted BVP Stage-1 planning package and the then-current decision register/project-state authority.

## 5. Engineering Discretion

Ordinary mechanics for persisting clean active planning/governance records were discretionary provided they preserved all still-valid authority and made supersession unambiguous. No discretion existed to alter product behavior, discard history, or reinterpret the replacement architecture.

## 6. Material Edge / Failure Cases

The transition would have been incomplete if:

- a legacy harness decision remained active without explicit supersession;
- valid non-harness authority was lost while cleaning mixed files;
- archived material remained referenced as current tasking/implementation authority;
- the BVP planning package was persisted incompletely or inconsistently.

## 7. Acceptance Criteria

Historical completion required objective evidence that active planning/governance authority named the BVP, supersession was recorded, no product source was touched, and the repository was ready for the archive-transition child.

## 8. Non-Goals

This child did not:

- archive the full legacy `dev/**` surface;
- remove legacy executable source/tests;
- implement any replacement BVP runtime;
- redesign synchronization;
- begin S02 or later platform construction.

## 9. Historical Completion

S01 was completed before the current PHX-CI acceptance model was adopted. Its accepted historical evidence remains authoritative for this completed child.

**Established result:** BVP planning authority active; legacy decisions superseded; no product source touched.

## 10. Stop

No work is authorized by this file.
