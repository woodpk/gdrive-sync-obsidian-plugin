# BVP-S07A — Crash, Commit-Order, and Ambiguous-Result Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`
**Prompt maturity:** COMPLETE / NON-EXECUTABLE
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage
**Predecessor:** architecture-reviewed post-recovery integration `e15a61cfe23b29dbc67b04ededd009c6d6ee0c5d`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Resolved Prerequisite Record

The crash-boundary blocker is resolved by the accepted generic prerequisite:

- accepted prerequisite verification HEAD: `b4b3c219e40b85fa9fa6bf3123c94421fe224133`;
- authoritative prerequisite evidence: `2f22710e01e24f89f0e949bba22b9ef294e3b534`;
- accepted prerequisite closure: `77c48171442fa0eaa170de3469b0f7fc8f434df0`;
- mandatory post-prerequisite architecture review: PASS at `993f459a5e3299c460e427f3010e9c983dfb6ca5`.

The frozen scenario platform now exposes faithful one-shot crash points before REMOTE dispatch, after REMOTE effect, before canonical state write, and after canonical state write. S07A is unblocked. The prerequisite is frozen infrastructure and is not writable by S07A.

## 0.3 S07A Verification Blocker — Missing Ambiguous-Outcome DSL Exposure

Authoritative S07A PHX-CI evidence `3972bca1f39342bcfda30aaceecfd281a57de8c3` proved that the existing declarative `inject-remote-mutation-fault` control is insufficient by itself to preserve a true caller-visible ambiguous outcome when the physical REMOTE effect was applied.

Observed behavior:

- the in-memory Drive correctly returned the scripted transient failure after applying the create;
- the accepted `InMemoryReliableRemoteMutationPort` immediately performed its normal post-mutation observation;
- that observation proved the effect had occurred, so production safely completed the operation instead of returning `outcome-unknown`.

This is correct product behavior. Weakening the S07A scenario to expect success would fail S07A's explicit ambiguity contract, which requires the immediate caller to remain unable to know whether the effect occurred until later observation/recovery.

The virtual-world REMOTE mutation port already owns the required deterministic one-shot control:

`queuePostMutationObservationFailure(reason)`

but that control is not exposed through the frozen declarative scenario vocabulary.

S07A is therefore blocked on one bounded generic DSL prerequisite that exposes this existing hook through the `external-state` family. No production, virtual-world algorithm, persistence, or new fault framework is authorized.

The same failed PHX run also showed scenario-only expectation issues around legitimate post-restart `missing-production-plan` no-work/recovery cycles. Those remain S07A scenario repairs and do not justify core changes.

## 0.4 Ambiguity Prerequisite Resolution / S07A Repair Binding

The ambiguity DSL blocker is resolved by the accepted bounded prerequisite:

- accepted prerequisite verification HEAD: `f0e403e401dfb18d64f5e6e72b5325d6b7a39f75`;
- authoritative prerequisite evidence: `f0dac5853c73c380e0c711b648cbb2b599307ccc`;
- accepted prerequisite closure / repaired S07A PHX-CI base: `3921e81d08be829070b83347539bc3809cf8fa57`;
- framework core after prerequisite acceptance: 3,950 / 4,000 logical TypeScript LOC;
- production source/seam/PowerShell/scenario metrics remain unchanged from the prior reviewed state.

Authoritative failed S07A evidence `3972bca1f39342bcfda30aaceecfd281a57de8c3` also demonstrated three scenario-only expectation repairs:

1. after a before-REMOTE-dispatch crash, the first post-restart production cycle may legitimately perform retained-intent recovery and return `missing-production-plan`; a subsequent normal synchronization cycle must then create the single REMOTE effect;
2. after an after-canonical-state-write crash, restart may legitimately find no production plan because canonical success is already durable; the scenario must treat that no-work result as expected rather than require a new execution;
3. after an ambiguous-not-applied outcome, the first post-restart cycle may resolve/retire ambiguous durable work and return `missing-production-plan`; a subsequent normal synchronization cycle must then create one REMOTE effect.

The accepted new transition `inject-post-mutation-observation-failure` must be paired with the existing `applied-before-failure` provider fault in the ambiguous-applied scenario so the immediate caller remains genuinely unable to resolve the physical outcome.

The repaired task branch is `bvp-s07a-crash-commit-ambiguity-r1`.

No platform-core, production, PowerShell, PHX-CI, governance, persistence, or new fault-framework change is authorized.

## 0.5 S07A Verification Blocker — Verified-Not-Applied Restart Recovery Defect

Authoritative repaired S07A evidence `50506113f51f0aa7450d5f3550aa861b6498545c` proves a production recovery defect in the two restart cases where physical REMOTE observation establishes that an authorized/ambiguous mutation did **not** occur.

Observed production behavior:

- `DurableEffectLifecycleCoordinator.recordPhysicalResult(...)` correctly handles a single logical operation with no progressed sibling by removing the durable operation intent and returning `verified-not-applied`;
- `recoverOne(...)` in `src/product/durable-intent-recovery-base.ts` immediately rejects every recorded result other than `effect-verified` / `already-progressed`;
- therefore the successfully retired `verified-not-applied` result is incorrectly surfaced as `recovery-required`;
- the controller maps that recovery failure into a recovery-gated planning failure, observed by the S07A runner as persistent `missing-production-plan`.

This violates the existing lifecycle contract documented in `recordPhysicalResult(...)`: a verified non-effect may retire the whole operation when no sibling crossed dispatch so renewed ordinary planning authority can decide whether work is still valid.

Affected demonstrated S07A cases:

- `before-remote-dispatch` (`dispatch-authorized` + REMOTE absence);
- `ambiguous-not-applied` (`outcome-unknown` + REMOTE absence).

The `after-canonical-state-write` no-plan behavior is **not** part of this product defect: ordinary successful execution also retains `state-committed` durable history, and restart with already committed canonical state may legitimately produce no new plan.

S07A is blocked pending the separate bounded production prerequisite `07a-prerequisite-verified-not-applied-recovery.md`.

## 0.6 File-Create Recovery Prerequisite Resolution / Final S07A Rebinding

The production recovery blocker from §0.5 is resolved and accepted:

- accepted file-create recovery implementation HEAD: `7c6b5238ea46bba74d365b7b025c4375b1b29f44`;
- authoritative PHX-CI evidence: `32bf4a17357735673309f1465b6c657a1bf8f5d0`;
- accepted prerequisite closure: `7680307475ebb5fde2a383a3896044639011e147`;
- mandatory BVP-GOV-008 architecture review: PASS at `e15a61cfe23b29dbc67b04ededd009c6d6ee0c5d`;
- framework core after acceptance: 3,970 / 4,000 logical TypeScript LOC;
- production source after acceptance: 16,668 logical LOC;
- approved production seam remains 113 LOC / 1 file;
- scenario catalog remains 39 scenarios / 818 LOC;
- BVP PowerShell remains 4 scripts / 1,477 LOC;
- architecture guard passed with 0 violations.

S07A proper is rebound onto that reviewed integration state. The prior repaired scenario implementation is carried forward only as the six declarative scenarios plus one focused test; old blocked PHX-CI evidence/history is not part of the new implementation branch.

Final task branch: `bvp-s07a-crash-commit-ambiguity-r2`.

S07A proper remains strictly scenario/test-only. No platform-core, production, PowerShell, governance, PHX-CI, persistence, or architecture change is authorized.

## 0.7 Acceptance / Closure Record

BVP-S07A is **COMPLETE / ACCEPTED**.

- accepted implementation HEAD: `e243922afdabd49f42f94395243191231ff89ada`;
- authoritative PHX-CI evidence commit: `d836055376110f02a415fa5b8cf0e8c58e9ed6bd`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- authoritative evidence set reviewed in full before acceptance:
  - JSON: `dev/test-results/20261001T013703Z-operator-bvp-s07a-crash-commit-ambiguity-r2-e243922afdab.json`;
  - Markdown: `dev/test-results/20261001T013703Z-operator-bvp-s07a-crash-commit-ambiguity-r2-e243922afdab.md`;
  - execution log: `dev/test-results/20261001T013703Z-operator-bvp-s07a-crash-commit-ambiguity-r2-e243922afdab.log` (6,410 lines);
- focused S07A verification: 13/13 PASS;
- complete repository suite: 830/830 PASS;
- all PHX-CI stages PASS with exit 0;
- architecture guard: PASS, 0 violations;
- repository architecture metrics: PASS;
- framework core: unchanged at 3,970 / 4,000 logical TypeScript LOC;
- production source: unchanged at 16,668 logical LOC;
- approved production seam: unchanged at 113 LOC / 1 file;
- BVP PowerShell: unchanged at 4 scripts / 1,477 logical LOC;
- scenario-specific production and PowerShell remain 0;
- scenario catalog: 45 scenarios / 952 logical LOC, reflecting exactly six new S07A scenarios / +134 scenario LOC;
- each S07A scenario remains below the 200-LOC hard limit: 23, 22, 21, 22, 22, and 24 logical LOC respectively;
- production artifact remains unchanged from the accepted prerequisite state: `main.js` 880,512 bytes, SHA-256 `cee1da879b4c5c73894cb7dee84e55ea434f9dd66a54f59174d9893657f7a860`;
- the full log contains no genuine `not ok` records, no nonzero stage result, and no hidden verification failure. The only non-pass diagnostic is the existing npm audit notice for 2 moderate vulnerabilities, which did not affect install or acceptance.

The accepted scenarios prove crash/restart and ambiguous-result behavior through production logic while preserving stable REMOTE identity and preventing duplicate physical effects. No production, platform-core, PowerShell, PHX-CI, governance, persistence, or new fault-framework change is part of S07A proper.

## 1. Objective

Add declarative deterministic coverage for interruption at critical effect/state boundaries and for remote outcomes whose physical result is genuinely uncertain.

The scenarios must prove production recovery semantics; they must not create a new crash/fault framework or encode recovery policy in test infrastructure.

## 2. Required End State

Executable scenarios cover, at minimum:

- interruption before a physical mutation is authorized/applied;
- interruption after durable intent/state records exist but before physical mutation;
- interruption after physical mutation but before canonical product state commit/finalization;
- interruption during/after state commit where the target specification requires restart proof;
- remote mutation returning an ambiguous outcome where effect may have occurred;
- restart/reconciliation after each relevant interruption using fresh runtime objects over retained simulated reality/state.

## 3. Dispatch Binding — Hard Data Only

The S07A execution binding is:

- accepted predecessor / PHX-CI base: `e15a61cfe23b29dbc67b04ededd009c6d6ee0c5d`;
- task branch: `bvp-s07a-crash-commit-ambiguity-r2`;
- target requirements/invariants: `STATE-009`, `STATE-010`, `XFER-004`, `INV-004`;
- target behavioral clauses: §4.10 interrupted run / iOS suspension and §13.3 controlled crash-safety evidence;
- accepted prerequisite controls: `before-remote-dispatch`, `after-remote-effect`, `before-canonical-state-write`, `after-canonical-state-write`; REMOTE mutation ambiguity `applied-before-failure` / `not-applied`; `inject-post-mutation-observation-failure`; existing `checkpoint:restart-device`;
- scenario files:
  - `test-platform/scenarios/07a/before-remote-dispatch.ts`;
  - `test-platform/scenarios/07a/after-remote-effect.ts`;
  - `test-platform/scenarios/07a/before-canonical-state-write.ts`;
  - `test-platform/scenarios/07a/after-canonical-state-write.ts`;
  - `test-platform/scenarios/07a/ambiguous-applied.ts`;
  - `test-platform/scenarios/07a/ambiguous-not-applied.ts`;
- focused test: `test-platform/test/s07a-crash-commit-ambiguity.test.ts`;
- writable allowlist: exactly those six scenario files plus that focused test file;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- change class: `ordinary`;
- focused command: `node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07a-crash-commit-ambiguity.test.js`;
- architecture baseline: production source 16,668 logical LOC; production seam 113 LOC / 1 file; framework core 3,970 / 4,000 logical TypeScript LOC / 10 modules; scenario catalog 39 scenarios / 818 LOC; BVP PowerShell 4 scripts / 1,477 LOC; scenario-specific production 0; scenario-specific PowerShell 0;
- S07A proper framework-core/production/PowerShell delta must be 0;
- every new scenario targets ≤120 logical LOC and must remain ≤200;
- restart proof must reconstruct fresh runtime objects using the accepted checkpoint operation; no scenario may directly edit product state;
- ambiguous applied/not-applied scenarios must preserve the immediate ambiguous result and let subsequent production observation/recovery determine reality;
- repeated recovery must not create a second REMOTE object/effect for the same logical operation;
- no S07B/S07C/S07D/S07E/S07F concern may be absorbed into this task.

No new generic fault framework or production repair is authorized. If an S07A scenario proves a production recovery defect, stop and re-ground that defect separately rather than changing production on this branch.

## 4. Required Semantics

### 4.1 Boundary fidelity

Faults/interruption must occur at real or faithfully represented production external/commit boundaries.

Do not simulate a crash by merely changing the expected return value when the evidentiary purpose is retained physical/state reality across restart.

### 4.2 Before-effect interruption

If interruption occurs before physical effect authorization/application, later recovery must observe that the effect did not occur and act according to production state/intent semantics.

### 4.3 After-effect / before-finalization interruption

If the physical effect occurred but canonical state was not finalized, later recovery must reconcile against observed external reality rather than blindly replaying or assuming failure.

### 4.4 Ambiguous outcome

The test infrastructure must preserve uncertainty:

- one variant where the physical effect occurred;
- one variant where it did not;
- the immediate caller cannot know which solely from the ambiguous response;
- later production observation/recovery resolves the state safely.

The injector cannot relabel ambiguity into success/failure for test convenience.

### 4.5 Fresh-runtime recovery

Recovery proof requires destruction/reconstruction of runtime objects over retained state and external reality.

## 5. Invariants

- Product recovery logic decides what to do.
- Fault injection cannot bypass product safety/authorization.
- Ambiguity remains ambiguity until observation proves reality.
- Test scenarios do not directly commit product state.
- No scenario-specific core or production source is added.
- Scenario-only default remains in force.

## 6. Material Edge / Failure Cases

Scenarios must prove representative cases for:

- no effect before mutation;
- durable intent without physical effect;
- physical effect without final canonical state;
- ambiguous effect-applied;
- ambiguous effect-not-applied;
- repeated restart/recovery is idempotent/safe where required;
- recovery does not duplicate destructive/remote effects;
- wrong expected recovery state fails deterministically.

If the frozen platform lacks a required generic boundary hook, return `BLOCKED` with the exact missing primitive.

## 7. Engineering Discretion

The agent may choose representative production operations/boundaries and fixture data based on current target requirements, while using the already-accepted generic fault controls.

## 8. Dependencies

Consumes S04 restart/fault/ambiguity capabilities, S05 runner/evidence, and accepted S06 core freeze.

## 9. Acceptance Criteria

Required crash/commit-order/ambiguity scenarios pass against real production logic; restart is genuine; uncertainty is preserved; duplicate effects are prevented as required; wrong expectations fail; scenario/core budgets pass; authoritative PHX-CI passes.

## 10. Non-Goals

Do not cover corrupt state/cursor/root recovery (07B), device authority/cancellation (07C), transfer/retry (07D), quota/disk/destructive/config/lifecycle (07E), or scale/resource measurement (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, mapped requirements, interruption boundaries exercised, scenario results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07B.
