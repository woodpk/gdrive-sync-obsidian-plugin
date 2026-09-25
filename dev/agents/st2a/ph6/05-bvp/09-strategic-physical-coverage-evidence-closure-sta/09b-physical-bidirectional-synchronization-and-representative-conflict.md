# BVP-S09B — Physical Bidirectional Synchronization and Representative Conflict

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted S09A physical baseline

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten physical-evidence contract. Dispatch binding supplies exact build/device/run/fixture coordinates only.

## 1. Objective

Prove representative real cross-device synchronization in both directions and one representative concurrent conflict/merge flow through the installed production path, without physically repeating every deterministic semantic permutation already proven in S06/S07.

## 2. Required End State

Physical evidence demonstrates, at minimum:

- Windows-originated create/upload becomes available correctly on iOS;
- iOS-originated create/update becomes available correctly on Windows;
- representative update/download behavior in both relevant directions as required by current product target evidence;
- one representative concurrent conflict/merge flow across the two real devices;
- objective convergence/content/identity/conflict evidence tied to exact production run receipts;
- no mutation of unrelated user data;
- deterministic S06 evidence remains the primary proof for broad conflict permutations not physically repeated here.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S09A repository/build state;
- exact Windows/iOS device identities and validation artifacts;
- exact disposable fixture namespace/paths/content;
- exact managed remote root identity;
- exact run/scenario identities;
- exact representative conflict type selected from current product physical-evidence obligations;
- exact command/checkpoint sequence;
- exact evidence output paths/writable allowlist;
- current PHX-CI verification baseline.

## 4. Required Physical Semantics

### 4.1 Windows → iOS

Create/update a disposable managed file on Windows through a bounded fixture action, execute the real production sync path, then prove on iOS:

- expected object/content appears;
- identity/state is consistent with production semantics;
- production receipts/results support the claimed synchronization.

### 4.2 iOS → Windows

Perform the reciprocal physical change and prove the Windows result through production path and objective content/state observation.

### 4.3 Representative conflict

Start from an established common synchronized base, make independent real changes on both devices, and invoke production synchronization sufficiently to reach the target-required conflict/merge outcome.

The physical test must not implement conflict policy itself.

### 4.4 Evidence economy

Do not recreate all S06 deterministic scenarios physically. Select representative flows whose evidentiary purpose is real cross-device/platform execution.

## 5. Invariants

- Real devices and real provider path are used.
- Production planner/executor/conflict logic is authoritative.
- Disposable fixture scope only.
- Scenario authority remains external.
- Transport records are not synchronization authority.
- Physical evidence does not supersede broader deterministic semantic evidence.

## 6. Material Edge / Failure Cases

Evidence must detect:

- missing remote/local propagation;
- wrong content;
- stale/duplicate production run correlation;
- conflict flow that silently loses one user's change contrary to product policy;
- incomplete convergence;
- unexpected unrelated-file mutation;
- ambiguous/failed production run being mislabeled success.

A failed physical flow is not corrected by changing expected outcome unless product authority itself changes.

## 7. Evidence Requirements

For each physical flow record:

- exact run/scenario identity;
- initiating device/action;
- production run receipt(s);
- before/after content hashes or bounded fixture content;
- local/remote identities where material;
- receiving-device observation;
- conflict classification/artifacts where applicable;
- terminal verdict and failure reason.

## 8. Engineering / Operator Discretion

The operator may choose representative disposable file names/content and the safest current conflict case that satisfies the product's physical-evidence requirement.

## 9. Dependencies

Consumes S09A authenticated paired devices and accepted S06 deterministic semantic coverage.

## 10. Acceptance Criteria

Acceptance requires real bidirectional production-path evidence and representative conflict evidence, exact run/build/device traceability, objective convergence/conflict assertions, no unrelated data mutation, and supervisor review.

Any repository evidence change must pass authoritative PHX-CI before integration.

## 11. Non-Goals

Do not physically repeat every S06 scenario. Do not perform offline/interruption (09C), resource/path (09D), auth/lifecycle (09E), or final traceability closure (09F).

## 12. Handoff / Stop

Report exact device/build/run identities, fixture identities, each direction's result, conflict result, production receipts, evidence paths, blockers/deviations, and any evidence commit.

Stop at the supervisor-reviewed S09B physical evidence gate.

Do not begin 09C.
