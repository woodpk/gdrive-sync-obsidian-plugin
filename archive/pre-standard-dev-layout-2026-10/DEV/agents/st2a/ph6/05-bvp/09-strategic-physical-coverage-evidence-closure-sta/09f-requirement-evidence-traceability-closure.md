# BVP-S09F — Requirement / Evidence Traceability Closure

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted S09E

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten closure contract. Dispatch binding supplies exact current evidence/repository coordinates only.

## 1. Objective

Reconcile all accepted deterministic and physical Phase-6 evidence to every material current BRAIN product target requirement and BVP completion obligation, identify any real gap explicitly, and prepare a traceable Stage-3 handoff without adding new product behavior.

## 2. Required End State

A Stage-3-ready traceability package establishes, for every material current product requirement:

- implementation location/authority;
- validation mode classification: deterministic, physical, or mixed;
- exact accepted scenario/test/evidence identity;
- exact build/commit identity where relevant;
- latest accepted verdict/evidence reference;
- any residual limitation or explicit blocker.

It also reconciles all BVP architecture/governance completion requirements and historical C03–F03 semantic obligations without treating historical scenario IDs as current authority.

There are no silently unassigned material requirements.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S09E integration/evidence state;
- exact current BRAIN target-system specification revision;
- exact BVP target/build/coverage specification revisions;
- exact accepted deterministic child/stage evidence locations;
- exact accepted S09A–E physical evidence locations;
- exact current architecture metrics/baseline;
- exact traceability/handoff files and writable allowlist;
- current PHX-CI pin/runtime and verification base.

Binding may update coordinates but may not redefine requirements to erase evidence gaps.

## 4. Traceability Semantics

### 4.1 Current requirement authority

Traceability keys off the current product target specification and active decisions.

Historical C03–F03 labels are migration aids only.

### 4.2 Evidence classification

For each requirement, identify whether appropriate proof is:

- deterministic primary;
- physical primary;
- mixed.

Do not require physical repetition where deterministic semantics are the proper proof, and do not claim deterministic simulation proves a physical OS/provider transition.

### 4.3 Exact evidence references

A vague statement such as “tests pass” is insufficient.

Reference the exact accepted test/scenario/result/evidence record and exact source/build identity where material.

### 4.4 Gaps fail closed

If a material requirement lacks adequate evidence:

- mark it explicitly unproven/BLOCKED;
- identify the missing evidence type;
- do not infer PASS from adjacent requirements;
- do not add new product behavior inside this closure task.

### 4.5 BVP completion traceability

Also confirm:

- legacy active harness authority retired;
- production shipping exclusion;
- architecture guard/metrics/budgets;
- deterministic world/runner/evidence capability;
- live validation capability;
- child/stage PHX-CI acceptance evidence;
- final archive/governance invariants.

## 5. Required Coverage Reconciliation

At minimum reconcile the product target evidence families:

- §13.1 build/platform;
- §13.2 reconciliation semantics;
- §13.3 state/crash safety;
- §13.4 transfer/large vault;
- §13.5 destructive safety;
- §13.6 auth/security;
- §13.7 config/lifecycle/asset boundary;
- §13.8 Stage-3 traceability.

Use the current specification headings/IDs if they have changed at dispatch; preserve semantic authority.

## 6. Invariants

- Evidence records observations; it does not create authority.
- No requirement is marked PASS without suitable accepted evidence.
- Historical harness claims do not substitute for BVP evidence.
- No new testing architecture is introduced.
- No product code is modified in this closure child.
- Secrets/PHI/unrelated user data are excluded.

## 7. Material Edge / Failure Cases

The closure process must catch:

- requirement with implementation but no validation evidence;
- evidence tied to stale/unaccepted commit/build;
- physical requirement backed only by deterministic simulation;
- deterministic semantic requirement backed only by one narrow physical anecdote;
- historical scenario ID with no current requirement mapping;
- duplicate/conflicting evidence verdicts;
- architecture budget failure despite green functional tests;
- evidence file missing/corrupt/untraceable.

## 8. Engineering Discretion

The agent may choose the concise traceability table/serialization format consistent with current repository conventions.

Do not create a new evidence database or generalized reporting system.

## 9. Dependencies

Consumes all accepted S01–S09E implementation and evidence.

## 10. Acceptance Criteria

S09F is complete only when:

- every material current requirement has an explicit evidence status;
- no silent gaps remain;
- deterministic/physical classification is appropriate;
- every PASS points to accepted exact evidence;
- unresolved items are explicit blockers;
- BVP completion requirements are reconciled;
- Stage-3 handoff package is complete but Stage 3 is not performed;
- any repository changes pass authoritative PHX-CI.

## 11. Non-Goals

Do not:

- repair product defects;
- create missing evidence by assertion;
- perform new broad physical testing without a separately bound corrective evidence task;
- begin Stage 3.

## 12. Handoff / Stop

Report exact traceability artifact commit, requirement counts by PASS/BLOCKED/unproven classification, any gaps, evidence references, architecture status, and Stage-3 handoff locations.

Stop at `READY FOR FINAL S09V ACCEPTANCE`.

Do not begin Stage 3.
