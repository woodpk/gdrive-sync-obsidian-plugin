# BVP-S08F — Desktop Live Canary and Production-Bundle Isolation Proof

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08E

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository/device coordinates only.

## 1. Objective

Prove the complete S08 live path on Windows with one bounded disposable canary before S09 broad physical validation, while independently proving the ordinary production bundle remains free of validation-only agent/transport/scenario code.

## 2. Required End State

A Windows desktop validation artifact:

- loads in the intended Obsidian runtime;
- receives an addressed command through the selected transport/relay;
- executes a bounded production-path synchronization canary;
- returns a correctly correlated command result and authoritative production terminal receipt;
- supports an objective post-run observation;
- rejects stale/duplicate/wrong-run or wrong-device commands;
- leaves disposable test state suitable for cleanup/reconciliation.

Separately, the ordinary production build remains clean and loadable without validation-only code.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08E predecessor SHA;
- task branch/build SHA;
- exact validation artifact/version;
- Windows validation device/vault identity;
- disposable fixture location/content identity;
- selected command transport/relay coordinates;
- exact bounded canary operation;
- exact production and validation build commands/artifact expectations;
- exact evidence locations;
- PHX-CI base/pin/runtime;
- current architecture metrics/budgets.

No permanent user data may be used as the canary fixture.

## 4. Required Canary Semantics

The canary must:

1. establish a disposable bounded fixture;
2. send an addressed command from the external live executor;
3. execute through the installed production synchronization path;
4. observe the production terminal receipt;
5. verify the expected external/local effect objectively;
6. record canonical scenario evidence;
7. exercise stale/duplicate/mismatch rejection without repeating unsafe effects;
8. restore/leave the test environment in an explicitly known safe state.

The exact create/update direction may be chosen at dispatch based on the simplest safe production-path proof.

## 5. Shipping-Isolation Proof

Independently prove the normal production artifact contains none of:

- validation-only device agent;
- mailbox/relay implementation;
- scenario runner/catalog;
- validation-only fixture controls;
- validation-only fault controls/UI.

The approved S08A generic run-receipt seam is not a violation.

Use architecture guard plus artifact/source inspection sufficient to prove actual bundle exclusion.

## 6. Failure / Safety Semantics

- A transport acknowledgement without production receipt is not PASS.
- A stale/duplicate command that causes repeated mutation is failure.
- A failed/ambiguous production result must remain failed/ambiguous.
- Unexpected non-disposable user content exposure/mutation is a hard stop.
- If Windows/Obsidian environment cannot execute the required canary, record BLOCKED; do not substitute a deterministic simulation and call it live evidence.

## 7. Invariants

- Canary scope is disposable and bounded.
- Production path is real.
- Scenario authority remains external.
- Production bundle remains validation-code-free.
- No S09 coverage expansion in this child.

## 8. Engineering Discretion

The agent/operator may choose the safest representative desktop canary action and fixture content consistent with the bound environment.

## 9. Dependencies

Consumes the complete accepted S08A–E stack.

## 10. Acceptance Criteria

Acceptance requires:

- desktop validation artifact loads;
- bounded live production-path canary succeeds with objective receipt/effect evidence;
- stale/duplicate/mismatch protections are physically demonstrated where safely possible;
- production bundle exclusion is proven;
- live-agent/core/seam budgets pass;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS for repository state;
- physical evidence is bound to exact build/device/run identities.

## 11. Non-Goals

Do not perform iOS coverage, broad cross-device scenario coverage, auth revocation, large mobile transfer, or lifecycle closure; those belong to S09.

## 12. Handoff / Stop

Report exact source/build SHA, validation artifact identity, Windows device/vault identity, canary steps/results, production receipt, command-safety results, production-bundle exclusion proof, architecture metrics, and any BLOCKED physical step.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION` for code changes and supervisor physical-evidence review.

Do not begin S09.
