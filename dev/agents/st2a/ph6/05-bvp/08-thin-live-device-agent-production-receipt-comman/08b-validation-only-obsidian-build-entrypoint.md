# BVP-S08B — Validation-Only Obsidian Build / Entrypoint

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08A

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Create a physically separate validation-only Obsidian artifact/entrypoint under `test-platform/**` that can compose later live validation code with the real production plugin path without changing the ordinary shipping bundle.

## 2. Required End State

The repository can build:

1. the ordinary production plugin artifact exactly through its normal production entrypoint; and
2. a distinct validation-only artifact/entrypoint that may include test-platform live-validation composition.

The validation artifact can load in the supported Obsidian runtime needed by later S08/S09 work, while ordinary `main.js` contains none of the validation-only agent, transport, scenario catalog, test faults, or validation UI.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08A predecessor SHA;
- task branch;
- current production Obsidian entrypoint/build mechanism;
- actual test-platform root/build configuration;
- exact validation entrypoint/build/test paths;
- exact writable-path allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- accepted production artifact hash/baseline where deterministic;
- size-gate confirmation.

Binding may not make validation-only code part of the normal production entrypoint.

## 4. Required Semantics

### 4.1 Separate composition root

Validation-only composition originates under `test-platform/**` and may depend on approved production surfaces.

Production `src/**` must not import the validation entrypoint or test-platform implementation.

### 4.2 Production-path fidelity

The validation artifact must execute actual production synchronization code for synchronization claims. It may wrap/compose production entrypoints but cannot substitute a duplicate implementation.

### 4.3 Ordinary shipping exclusion

Normal build output must exclude:

- validation device agent;
- command mailbox/relay;
- scenario runner/catalog;
- validation-only controls/UI;
- fault controls;
- test fixtures.

The S08A general production run-receipt seam may remain in production because it is explicitly production-owned and budgeted.

### 4.4 Build identity

Validation evidence must be able to identify the exact production/source commit and validation artifact build used so later physical results are traceable.

### 4.5 No hidden mode switch

Do not restore a production “validation mode” setting that turns the shipping plugin into the validation harness.

The separate artifact/entrypoint is the isolation mechanism.

## 5. Invariants

- Validation-only code lives outside production source.
- Normal production build remains independently buildable.
- No scenario state machine enters production.
- No additional OAuth scope/token path is introduced.
- Validation build is test infrastructure, not a second product implementation.

## 6. Material Edge / Failure Cases

Tests/proofs must establish:

- normal production build succeeds independently;
- validation build succeeds independently;
- normal production `main.js` lacks validation-only sentinel/import/code signatures;
- validation artifact includes/loads its intended validation composition;
- production artifact remains functional without validation build output present;
- deleting disposable validation build output does not affect production build;
- no production config/entrypoint accidentally points to validation root.

## 7. Engineering Discretion

The agent may choose the smallest build mechanism compatible with the current repository—separate bundler entrypoint, configuration, or equivalent—provided the dependency direction and shipping exclusion contracts hold.

Do not add a generalized multi-product build framework.

## 8. Dependencies

Consumes accepted S08A production receipt and S03 shipping-boundary governance.

S08C/D will populate the validation-only composition with bounded agent/transport capabilities.

## 9. Acceptance Criteria

Acceptance requires distinct production/validation artifacts, production-path fidelity in validation composition, objective shipping-exclusion proof, exact build traceability, no production validation-mode restoration, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement the command agent, command transport, live executor, physical scenarios, or validation UI beyond the minimum entrypoint/load proof.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, production/validation build commands, artifact identities/hashes where stable, exclusion proof, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08C.
