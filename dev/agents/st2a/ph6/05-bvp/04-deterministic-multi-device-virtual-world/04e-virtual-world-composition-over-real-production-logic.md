# BVP-S04E — Virtual-World Composition over Real Production Logic

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Compose the S04 deterministic boundaries into a small multi-device test world that runs the **real production planner/executor/state authority** end-to-end enough to prove the virtual world is a valid semantic test environment.

## 2. Required End State

A programmatic world builder/composition surface can construct at least:

- two independent logical devices;
- independent local vault realities;
- independent device-local durable state/identity/cursors;
- one shared simulated managed Drive;
- deterministic time/order controls;
- boundary fault/completeness/ambiguity controls;
- fresh production synchronization runtime objects wired to those boundaries.

The following production-path canaries execute through real production logic:

- local create → remote upload/create;
- remote create → local download/create;
- two-device synchronization through shared remote;
- stable remote-ID-preserving move;
- partial/incomplete remote observation without unsafe deletion inference;
- ambiguous remote mutation followed by production reconciliation/observation behavior;
- runtime restart/reconstruction over retained state/reality.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S04D predecessor SHA;
- task branch;
- exact production composition/factory/planner/executor/state entrypoints;
- actual accepted S04 adapter/state/time types;
- exact world-builder/canary test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- size-gate confirmation.

If production composition cannot be achieved without modifying an unapproved production surface, return `BLOCKED` with the exact missing seam rather than adding one.

## 4. Required Behavior and Semantics

### 4.1 Real production authority

Every synchronization claim must result from production planner/executor/state code consuming simulated external boundaries.

The world builder may wire dependencies. It MUST NOT:

- compute sync plans itself;
- decide local-vs-remote authority;
- merge/conflict content;
- infer deletion;
- commit product state on behalf of production code.

### 4.2 Two-device reality

Each device uses its own local/state authority while sharing only the modeled remote and explicitly shared deterministic controls.

### 4.3 Fresh-runtime composition

The world builder must be able to create fresh runtime objects repeatedly over retained world state to support restart tests.

### 4.4 Test control vs product control

World controls may:

- mutate external reality as a fixture;
- set deterministic time/order;
- inject boundary faults/completeness/ambiguity.

They may not directly force product decisions or terminal success.

### 4.5 Observable canaries

Canaries must assert externally meaningful outcomes—content/identity/state/remote effects—not merely that a method returned.

## 5. Invariants

- No duplicate synchronization algorithm.
- No scenario runner or DSL.
- No production test-mode control path.
- No scenario-specific simulator behavior.
- Production-to-test-platform dependency remains prohibited.
- Fault ambiguity/completeness semantics remain intact through composition.

## 6. Material Edge / Failure Cases

Canaries/tests must establish:

- two devices do not share local/state objects accidentally;
- shared remote mutations are visible to both through production observations;
- production move behavior uses stable remote identity;
- incomplete listing cannot masquerade as full absence;
- ambiguous outcome remains ambiguous until later observation/reconciliation;
- reconstructed runtime has new runtime identity but retained simulated durable/external state;
- incorrect world wiring that bypasses production planner/executor is detectable by tests/review.

## 7. Engineering Discretion

The agent may choose:

- world-builder API shape;
- private factory/helper decomposition;
- how device handles expose fixture controls versus production runtime handles;
- canary test organization.

Keep the API small and programmatic. Do not design the later declarative scenario language in this child.

## 8. Dependencies

Consumes all accepted S04A–S04D capabilities and current production composition boundaries.

This child is the integration proof that allows S05 to build a runner over a valid production-path virtual world.

## 9. Acceptance Criteria

Acceptance requires all required canaries through real production logic, direct evidence that no policy is duplicated in the world, correct multi-device isolation/shared-remote composition, restart semantics, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- declarative scenario types;
- runner/verdict engine;
- canonical evidence;
- checkpoint/resume representation;
- broad reconciliation coverage;
- live-device validation.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, production entrypoints used, required canary results, architecture metrics delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin S05.
