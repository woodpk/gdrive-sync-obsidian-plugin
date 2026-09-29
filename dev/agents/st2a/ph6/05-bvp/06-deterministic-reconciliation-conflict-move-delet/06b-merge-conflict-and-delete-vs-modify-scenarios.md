# BVP-S06B — Merge, Conflict, and Delete-vs-Modify Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s06-reconciliation-coverage-01`
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT
**Primary work package:** BVP-S06 — Deterministic Reconciliation / Conflict / Move / Deletion Coverage
**Predecessor:** accepted S06B generic text-version prerequisite closure `4ee5aaeebb89b4531831450ad016e93c0b4f334d`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Resolved Prerequisite Record

The original S06B dispatch was correctly blocked at commit `c222d86222e4b60d13d478d261355bb9ffce80b9` because the accepted virtual-world composition did not materialize recognized text through the production `ProductTextVersionStore`. That blocker has been resolved by the accepted generic production-parity prerequisite:

- prerequisite implementation: `194f00c012c09811e595a5aacbe1f112a7709df1`;
- authoritative prerequisite evidence: `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`;
- accepted prerequisite closure: `4ee5aaeebb89b4531831450ad016e93c0b4f334d`.

S06B is therefore unblocked. The prerequisite is frozen infrastructure and is not writable by this scenario-only child.

## 1. Objective

Add declarative deterministic coverage for concurrent text merge/conflict, binary conflict, and delete-vs-modify preservation semantics using the frozen S04/S05 core.

## 2. Required End State

Executable scenarios cover:

- clean concurrent text merge where edits are non-overlapping and product semantics permit automatic merge;
- true overlapping text conflict that cannot be safely merged;
- binary concurrent conflict where content cannot be line-merged;
- local delete vs remote modify;
- remote delete vs local modify.

Each scenario proves the current product target requirement and preservation/safety invariant, including identities/conflict artifacts/state where relevant.

## 3. Dispatch Binding — Hard Data Only

The S06B execution binding is:

- accepted S06A closure before the generic text-version prerequisite: `109a4ac26309ccd5c22de6eb70420af410c2a8d8`;
- accepted generic text-version prerequisite closure / PHX-CI base: `4ee5aaeebb89b4531831450ad016e93c0b4f334d`;
- accepted prerequisite implementation/evidence: `194f00c012c09811e595a5aacbe1f112a7709df1` / `595483b2b459f89c05948d0b8e0a9b78bfaa0f1a`;
- task branch: `bvp-s06b-merge-conflict-delete-modify`;
- frozen scenario catalog root: `test-platform/scenarios/`;
- new scenario paths: `test-platform/scenarios/06b/clean-text-merge.ts`, `true-text-conflict.ts`, `binary-conflict.ts`, `local-delete-remote-modify.ts`, and `remote-delete-local-modify.ts`;
- focused test path: `test-platform/test/s06b-merge-conflict-delete-modify.test.ts`;
- writable allowlist: exactly those five scenario files plus that focused test file;
- target requirements: `CONFLICT-001`–`CONFLICT-009`, `PLAN-001`–`PLAN-004`, `CHANGE-001`, `CHANGE-002`, and `XFER-003`; invariants `INV-005`–`INV-008`; conflict contract §6.5; required conflict/deletion responses in §9; reconciliation evidence cases in §13.2;
- focused command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s06b-merge-conflict-delete-modify.test.js`;
- full BVP command: `npm run test:bvp-root`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`; change class: `ordinary`;
- accepted architecture baseline after the prerequisite: framework core 3,827/4,000; production seam 113 LOC/1 file; scenarios 9/208 LOC; live-device 0; scenario-specific production 0; scenario-specific PowerShell 0; BVP PowerShell 4 scripts/1,477 LOC;
- required S06B framework-core delta: 0; required production-seam delta: 0; required PowerShell delta: 0; each scenario targets ≤120 logical lines and must remain ≤200;
- no `test-platform/src/**`, production, PowerShell, governance, PHX-CI, or architecture-metrics implementation changes are authorized.

The accepted prerequisite is frozen and consumed as existing infrastructure. No core change is authorized.

## 4. Required Semantics

### 4.1 Clean text merge

The scenario must start from a common synchronized base, apply independent non-overlapping edits, invoke production synchronization, and assert the target-required merged result plus authoritative state/identity effects.

The scenario must not implement merge logic itself.

### 4.2 True text conflict

Apply overlapping incompatible edits from a common base and prove the product preserves both user changes according to the target conflict policy rather than silently selecting one side.

Assertions must cover conflict classification and resulting preserved content/artifacts/state as required by the product contract.

### 4.3 Binary conflict

Concurrent incompatible binary changes must exercise the product's keep-both/preservation policy. No text-merge path may be assumed.

### 4.4 Delete-vs-modify

For both directions:

- deletion on one side plus modification on the other must preserve the modified content according to target policy;
- the scenario must prove no unsafe destruction occurs merely because one side is absent;
- authority must come from production state/base semantics, not timestamps.

## 5. Invariants

- Merge/conflict policy remains production code.
- Scenario data contains expected outcomes, not implementation logic.
- No scenario-specific production helper/seam.
- No custom merge engine in test-platform.
- No platform-core change unless supervisor separately authorizes a generic missing primitive after BLOCKED.
- Canonical evidence records conflict/preservation observations.

## 6. Material Edge / Failure Cases

Required proof includes:

- clean merge succeeds and contains both non-overlapping edits;
- deliberately changed expected merged content fails;
- overlapping text conflict is not falsely classified as clean merge;
- binary conflict preserves both versions as required;
- local-delete/remote-modify preserves modified remote content;
- remote-delete/local-modify preserves modified local content;
- conflict results remain deterministic across repeated runs.

## 7. Engineering Discretion

The agent may choose representative fixture contents and exact scenario decomposition while preserving the semantic distinctions above.

Do not add generic merge/conflict abstractions unless they already exist in the frozen core.

## 8. Dependencies

Consumes accepted S06A and frozen S04/S05 infrastructure.

## 9. Acceptance Criteria

All required scenarios pass against real production logic, wrong expectations fail, preservation/conflict semantics are objectively asserted, requirement traceability is complete, scenario budgets pass, core metrics remain stable, and authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover:

- ordinary deletion/stale/clock-skew/unreadable cases (06C);
- move/path collisions (06D);
- exclusions/unknown/empty folders (06E);
- crash/fault recovery (S07);
- live physical conflict evidence.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, scenario/conflict results, wrong-expectation proof, per-scenario LOC, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 06C.
