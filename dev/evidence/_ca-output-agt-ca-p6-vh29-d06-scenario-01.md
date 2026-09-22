STATUS: BLOCKED

# VH29 — D06 Stale Device Return Safety

Agent: `agt-ca-p6-vh29-d06-scenario-01`  
Required branch: `phase6-vh29-d06-scenario`  
Scenario: `D06`

## Frozen authority

- `D_SERIES_COMMON_BASE_SHA`: `c6daa20ad287f395a99cf88943465a9ecc3159dd`
- Pre-contract-change D06 implementation HEAD: `019ab7203c64aa0d90971e79b99b9c02ae1162fc`
- The implementation HEAD is intentionally retained unchanged while the shared validation-infrastructure gap is resolved.
- No merge, promotion, VH30, physical D06 execution, or Stage 3 work is permitted from this blocked state.

## Preserved pre-contract-change D06 work product

The retained implementation introduced only the task-owned D06 scenario/test/verifier surfaces:

1. `src/validation/scenarios/d06-stale-device.ts`
2. `test/validation-d06-stale-device.test.ts`
3. `dev/scripts/verify-vh29-d06-stale-device.ps1`

The existing D06 work product preserves these accepted properties:

- exact required `BLOCKED — STALE CONDITION NOT SAFELY INDUCIBLE`;
- acknowledgement alone cannot establish staleness;
- VH13 checkpoint/postcondition workflow;
- exact returning-device stale-authority discrimination;
- rejection of an unrelated stale peer;
- no direct writes of stale state, device age, authority generation, tombstones, or trusted production authority;
- six disposable fixture scope;
- exact-object Windows deletion authority;
- stale resurrection/destructive proposal rejection;
- guard-path protection;
- fixed H6B ownership boundaries.

The current implementation is retained only as the pre-contract-change D06 work product. It is not ready for local PHX-CI, physical validation, integration, or promotion.

## Confirmed protocol violation in current implementation

The governing live-validation protocol requires that a production plan containing a blocked operation not be executed.

The current D06 stale-return cycle previews/asserts a plan containing both:

- safe `download-update`; and
- `blocked-unsafe`.

It then executes that whole asserted plan through the fixed H6B production path.

That behavior is now known to violate the governing live-validation protocol. No authoritative verification run may be used to convert this implementation into a PASS/COMPLETE claim.

## CONTRACT CHANGE REQUEST

D06 cannot be repaired safely behind the current frozen validation contracts. Shared validation infrastructure must first provide BOTH capabilities below.

### 1. Safe-only production reconciliation authority

The shared validation infrastructure must provide a validation-safe production authority path that can progress an independently safe operation without executing a production plan containing `blocked-unsafe`.

Required properties:

- a blocked/conflict/destructive/recovery-containing production plan is never executed;
- safe non-destructive reconciliation can proceed through a separately previewed/asserted executable production cycle containing only execution-safe operations;
- no D06-local selective executor or operation-subset executor;
- no fabricated synchronization-state, authority, tombstone, stale-age, or generation transition;
- no D06 bypass of H6B production-plan authority;
- no production synchronization semantic change performed by D06;
- after safe progress, a fresh production preview can again prove the stale deletion remains blocked.

The frozen validation driver currently executes only whole authorized `planId` values. It exposes no safe-subset/operation-scoped execution request. Under the current stale-return state, the safe update and blocked deletion remain members of the same production plan. Therefore D06 cannot satisfy the governing protocol without a shared seam extension.

### 2. Exact production diagnostic correlation

The shared validation infrastructure must bind each relevant production authority cycle to its exact production diagnostic run identity and terminal result.

Required properties:

- correlation is exact and run-scoped;
- manual preview/execution cycles are covered;
- verify/reconcile preview/execution cycles are covered;
- each accepted execution on which PASS depends can be verified against the exact diagnostic run;
- required terminal proof is `component=sync.controller`, `event=sync-run-complete`, exact diagnostic run identity, `stage=terminal`, and the exact required result;
- missing or ambiguous correlation fails closed;
- harness validation-run identity is not substituted for production diagnostic-run identity;
- no timestamp matching;
- no “latest event” selection;
- no inference from unscoped retained diagnostics.

The frozen state-convergence verifier already supports `terminal-product-result` with an exact `diagnosticRunId`, but the current shared production-path authority does not expose/bind the exact production diagnostic run identity for all required authority cycles, including verify/reconcile.

## Task-local repairs required after the shared seam is supplied

After the shared contract/infrastructure repair is available and supervisor-approved, D06 itself must be repaired before local PHX-CI is authorized.

Required task-local corrections:

1. Never execute any production plan containing `blocked-unsafe`.
2. Replace the current mixed stale-return execution with the shared safe-only production reconciliation cycle.
3. Retain the exact original-object trash proof and add an independent path-level complete-enumeration proof for `D06_DELETE_PATH` with no `remoteObjectId`, proving exactly the expected trashed occupancy and no live/duplicate resurrection.
4. Add deterministic failure coverage where the original remote object remains trashed while a second live object exists at `D06_DELETE_PATH`.
5. Remove package-global `assertionRun`.
6. Scope all mutable D06 assertion authority, fixture descriptors, remote IDs, and evidence to exact `ValidationRunIdentity`.
7. Validate every D06 fixture descriptor against the exact requesting validation run and fail closed on cross-run descriptor/remote-ID/evidence substitution.
8. Add run-A/run-B interleaving regressions proving a paused run cannot consume another run's descriptors, remote IDs, evidence, or plan-assertion authority.
9. Add `terminal-product-result` assertions for every execution on which D06 PASS depends, including Windows seed, mobile seed, Windows absent-device publication, and the future safe-only stale-return reconciliation execution.
10. Add focused regressions proving missing, wrong-run, failed, and contradictory terminal diagnostic evidence cannot establish PASS.
11. Harden the task verifier to enforce the exact authorized implementation paths over `BaseSha..ImplementationHead`.
12. Require the implementation HEAD to be the latest commit touching task implementation paths.
13. Permit after-implementation commits only for the dedicated task evidence file and approved canonical PHX-CI publication artifacts.
14. Add Wave-D peer evidence checks: available VH24–VH28 evidence must record the same `D_SERIES_COMMON_BASE_SHA`; mismatches must stop with `D-SERIES COMMON BASE MISMATCH`. Missing peer evidence remains allowed while the parallel wave is incomplete.
15. Replace duplicate/ad-hoc PHX-CI result parsing with one result-parser block that independently reports PHX-CI verdict, Change-set verdict, Repository verdict, Overall verdict, task exit code, evidence commit, publication status, local evidence branch, publication issue, and runtime process exit code.
16. Accept the supported PHX-CI terminal form `PHX-CI RESULT: PASS (exit code 0)` as well as the bare PASS form through the single parser.
17. Use one authoritative PASS decision followed by exactly one post-verification fetch, frozen integration recheck, task-head/ancestry/path recheck, peer common-base recheck, and final PASS footer. No PASS footer may print before those post-run authority checks complete.

## Verification prohibition

Authoritative local PHX-CI MUST NOT be run against the current D06 implementation.

The existing verifier/bootstrap:

`dev/scripts/verify-vh29-d06-stale-device.ps1`

is NOT AUTHORIZED FOR EXECUTION while the shared contract/infrastructure repair is absent and the D06 task-local corrections above have not been applied.

Running PHX-CI now would verify an implementation already known to violate the live-validation protocol. Such a run cannot establish D06 acceptance.

Accordingly:

- Change-set verification: NOT AUTHORIZED
- Repository verification for D06 acceptance: NOT AUTHORIZED
- Overall D06 verification: BLOCKED
- `PASS / PASS / PASS`: MUST NOT BE CLAIMED
- `STATUS: COMPLETE`: FORBIDDEN

## Scope / stop state

This evidence correction changes no implementation or verifier behavior.

No correction is authorized here to:

- `src/contracts/**`;
- H6B `production-path-driver`;
- H6B `plan-assertion-engine`;
- `validation-mode-runtime`;
- production planner/executor/authority semantics;
- D06 implementation/tests;
- peer D-series scenarios;
- `phase6-integration`.

Current D06 remains blocked pending the shared validation-infrastructure repair described in the CONTRACT CHANGE REQUEST.

No merge, promotion, VH30, physical D06 execution, local D06 PHX-CI acceptance run, or Stage 3 work is permitted until that shared repair is supplied and D06 is subsequently corrected and re-reviewed.
