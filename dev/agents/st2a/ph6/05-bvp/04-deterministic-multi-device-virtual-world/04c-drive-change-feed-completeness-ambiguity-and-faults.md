# BVP-S04C — Drive Change Feed, Completeness, Ambiguity, and Boundary Faults

## 0. Status

**Agent name:** `agt-brain-bvp-s04-virtual-world-01`  
**Prompt maturity:** EXECUTABLE / ACTIVE CONTRACT  
**Primary work package:** BVP-S04 — Deterministic Multi-Device Virtual World  
**Predecessor:** accepted S04B

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 1. Objective

Extend the deterministic Drive simulation with production-faithful change-feed, listing-completeness, ambiguous-result, and boundary-fault behavior required to exercise recovery and safety semantics later.

## 2. Required End State

The simulated Drive can deterministically model:

- change cursor/token progression;
- ordered remote change observations as required by production contracts;
- listing/change-feed completeness versus explicitly incomplete/uncertain coverage;
- stale/invalid/lost cursor conditions where production logic handles them;
- provider/network failures at understood Drive boundaries;
- remote mutation outcomes that may be known-success, known-failure, or ambiguous;
- ambiguous outcome where the remote physical effect may have occurred but the caller cannot know from the response alone.

## 3. Dispatch Binding — Hard Data Only

The S04C contract is bound to the reviewed post-S04B repository state as follows:

- exact accepted S04B semantic predecessor: `715d3693aa8f0b47376a1cef03fd4b3af6e0b132`;
- exact BVP-GOV-008 reviewed integration / PHX-CI base authority: `f9e3f40599d8d48a62db8980591bbeb896c441e6`;
- exact task branch: `bvp-s04c-drive-feed-completeness-faults`;
- production Drive contract remains `GoogleDrivePort` from `src/contracts/google-drive.ts`;
- S04C completes the two `GoogleDrivePort` members intentionally deferred by S04B:
  - `getStartCursor(rootId)`;
  - `readChanges(rootId, cursor)`;
- exact production change/completeness types: `ChangeCursor`, `RemoteChange`, `RemoteChangePage`, and `EnumerationCompleteness`;
- exact production-facing Drive failure classes remain the existing `DriveSignal` union. Lost/invalid/stale cursor is represented as `recovery-required` with production detail `drive-change-cursor-invalid`, matching the HTTP-410 transport classification;
- injected provider/network faults use existing production classes such as `transient-failure`, `authentication-required`, `permission-denied`, `rate-limited`, `quota-exhausted`, and `recovery-required`; no BVP-only product result type is introduced;
- ambiguous mutation behavior is modeled at the raw Drive boundary by returning an ordinary production `DriveResult` failure signal while the deterministic external effect is separately scripted as applied or not applied. This preserves uncertainty for later reliable production observation/recovery logic rather than inventing synchronization authority in the simulator;
- listing/change-page incompleteness uses the existing `EnumerationCompleteness` contract and must never be converted into confirmed absence;
- path ambiguity remains represented by the existing production `conflict` classification; S04B already permits retained provider reality with duplicate logical occupancy, and S04C tests that ambiguity rather than adding a new ambiguity result family;
- S04C extends the accepted S04B implementation in place at `test-platform/src/virtual-world/in-memory-google-drive.ts`;
- S04C extends the accepted S04B focused tests in place at `test-platform/test/in-memory-google-drive.test.ts`;
- exact implementation-writable allowlist:
  - `test-platform/src/virtual-world/in-memory-google-drive.ts`;
  - `test-platform/test/in-memory-google-drive.test.ts`;
- supervisor-owned seam expansion is authorized only in the already-approved `src/product/local-vault-boundary-seam.ts` to re-export `ChangeCursor`, `RemoteChange`, `RemoteChangePage`, and `EnumerationCompleteness`; seam file count remains 1 and must remain below 350 logical LOC;
- deterministic controls are bounded helper APIs on the in-memory Drive model only: one-shot boundary faults, explicit cursor invalidation, one-shot listing completeness/omission, and one-shot change-page completeness/omission. No plugin system, persistent fault-program subsystem, or scenario DSL is authorized;
- authoritative PHX-CI runtime SHA: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- focused S04C command: `tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/in-memory-google-drive.test.js`;
- authoritative full BVP focused command remains `npm run test:bvp-root`;
- BVP-GOV-010 size gate: **PASS** — no new platform contract family, no new substantive runtime file, and expected S04C non-test delta remains below the approximately 1000-net-LOC split threshold.

The recurring architecture review required after S04A/S04B passed and is recorded at `f9e3f40599d8d48a62db8980591bbeb896c441e6`. S04C may extend only the reviewed Drive boundary capabilities above and may not begin S04D world/device state.

Binding may not invent new product uncertainty semantics.

## 4. Required Behavior and Semantics

### 4.1 Change-feed fidelity

Remote mutations produce deterministic change events/cursor progression matching the production contract's observable shape.

Change ordering must be controllable/reproducible without wall-clock timing.

### 4.2 Completeness is explicit

A listing/change observation must distinguish complete knowledge from incomplete/uncertain coverage when the production contract does.

Incomplete coverage MUST NOT be silently presented as authoritative absence.

This is crucial for later deletion safety tests.

### 4.3 Cursor loss / invalidity

The simulation must be able to present lost/invalid/stale cursor conditions that production recovery logic must handle.

The simulator reports the external condition; it does not choose the recovery policy.

### 4.4 Ambiguous remote effect

For an injected ambiguous mutation:

- the remote effect MAY have occurred;
- the caller receives an outcome that does not prove success or failure;
- later observation/reconciliation can reveal the actual retained remote state;
- the simulator must not relabel the ambiguous result merely to simplify the test.

This preserves BVP-FAULT-002.

### 4.5 Boundary faults

Fault injection occurs at explicit external/provider boundaries understood by the production Drive contract.

It may model transient/permanent provider/network classes needed later, but cannot bypass production retry, authorization, safety, or commit logic.

## 5. Invariants

- Fault controls change external observations/effects only.
- Fault controls cannot directly set product planner/executor decisions.
- Ambiguity never becomes artificial certainty.
- Partial listing never becomes implicit deletion proof.
- Cursor/revision/change ordering is deterministic.
- No live provider dependency exists.

## 6. Material Edge / Failure Cases

Required deterministic tests include:

- mutation emits expected change event;
- multiple mutations yield deterministic change order;
- valid cursor advances;
- invalid/lost cursor state is observable;
- complete listing is distinguishable from partial/incomplete listing;
- partial listing omits data without claiming authoritative absence;
- known mutation failure leaves known remote state;
- known success mutates expected remote state;
- ambiguous result with effect applied;
- ambiguous result with effect not applied;
- subsequent observation can distinguish retained reality;
- injected transient/permanent failures preserve production-facing classifications.

## 7. Engineering Discretion

The agent may choose:

- cursor representation;
- internal event log;
- deterministic fault scripting primitives;
- helper APIs used by tests/world builder;
- internal scheduling of modeled outcomes.

Do not create a generalized fault framework/plugin system beyond what the frozen BVP boundary requires.

## 8. Dependencies

Consumes S04B core Drive state and the production Drive/change contracts.

Later S04E and S07 will consume these capabilities; they must remain generic boundary controls rather than scenario-specific behaviors.

## 9. Acceptance Criteria

Acceptance requires all semantics above, explicit completeness and ambiguity proof, production-port fidelity, no policy duplication, deterministic tests, architecture-budget compliance, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not implement:

- product recovery policy;
- per-device state store;
- global world composition;
- scenario runner/DSL;
- persistent scenario fault programs;
- live Google Drive faults.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, bound interfaces, focused tests/results, ambiguity/completeness cases, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 04D.
