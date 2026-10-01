# BVP-S08A — Narrow Production Run-Receipt Seam

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted BVP-S07 primary-stage gate and mandatory architecture review

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Final Dispatch Binding

BVP-S08A is **BOUND / EXECUTABLE** from the accepted S07 closure.

Repository coordinates:

- exact accepted S07 predecessor / PHX-CI base: `225e38d0e851ea7e537f71c1134f2931344ef5ac`;
- task branch: `bvp-s08a-production-run-receipt-seam`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- PHX-CI framework version: `0.2.0-dev.2`;
- accepted S07 production artifact baseline: `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`;
- current production-seam baseline: 113 logical LOC / 1 approved file (`src/product/local-vault-boundary-seam.ts`);
- hard production-seam budget remains 350 logical LOC / 4 files;
- framework core is frozen at 4,000 / 4,000 logical TypeScript LOC / 10 modules and S08A has no authority to change it;
- live-device agent/relay surface remains 0 LOC / 0 files and S08A has no authority to begin that surface.

Current production authority grounding:

- `src/core/execution-coordinator-base.ts` already returns authoritative per-operation `CoordinatedExecutionResult` values and commits only verified execution receipts;
- `src/contracts/execution.ts` already distinguishes durable verified success, retryable failure, blocking failure, uncertainty, recovery requirement, cancellation, and stale authority;
- `src/product/product-controller-base.ts` already owns the production run lifecycle, exact plan/trigger authority, committed/skipped counts, cancellation state, run outcome, and terminal surface transitions;
- `src/diagnostics/diagnostic-logger.ts` supplies run IDs and structured terminal diagnostics, but diagnostics are corroborative only and may not serve as the sole success protocol;
- `ProductControllerBase.executePlanned(...)` currently keeps `RunOutcome` private, and `ProductSurfaceState` does not expose a correlated authoritative terminal run receipt.

Existing product capability therefore satisfies the underlying execution authority but **does not fully satisfy BVP-EVID-002**. S08A must add only the minimum read-only receipt observation over that existing authority; it must not create a second execution/result system or derive success from diagnostic text.

Authorized production implementation surface:

- NEW `src/product/run-receipt-seam.ts` — one narrow, generally safe, read-only production receipt contract/reader; no mutation, scenario, transport, persistence, or orchestration authority;
- `src/product/product-controller-base.ts` — minimal receipt capture/read state at the existing production run terminal boundary only.

Authorized governance/test surface:

- `dev/governance/testing-platform-boundary.yaml` — add only the new run-receipt seam path to `production_seam.approved_imports`; budgets and all other governance rules remain frozen;
- NEW `test-platform/test/s08a-production-run-receipt-seam.test.ts` — focused receipt semantics/budget-boundary tests through existing virtual production composition;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

Exact writable-path allowlist:

- `src/product/run-receipt-seam.ts`;
- `src/product/product-controller-base.ts`;
- `dev/governance/testing-platform-boundary.yaml`;
- `test-platform/test/s08a-production-run-receipt-seam.test.ts`;
- `dev/agents/st2a/ph6/05-bvp/08-thin-live-device-agent-production-receipt-comman/08a-narrow-production-run-receipt-seam.md`;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable. In particular, S08A may not change `src/main.ts`, `src/product/runtime.ts`, `test-platform/src/**`, PHX-CI files, PowerShell, shipping build configuration, OAuth/authentication code, command transport, or live-device agent code.

Required focused proof must establish through real production controller execution authority:

- a completed run yields a correlated receipt with unique production run identity, trigger, plan identity, terminal success, committed-count evidence, and `requiredEffectsCommittedAndVerified=true`;
- a blocked/deferred/failed production attempt cannot report authoritative success;
- an uncertain/unverified physical result remains a non-success terminal classification;
- reading the same completed receipt is stable/idempotent;
- a later run produces a distinct run identity so stale prior receipts can be rejected by later live validation;
- the receipt remains available without parsing diagnostic text and cannot itself trigger mutation;
- the new seam is imported by test-platform only through the explicit boundary allowlist and remains inside the 350-LOC / 4-file seam budget.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08a-production-run-receipt-seam.test.js`

BVP-GOV-010 size gate: PASS. This child introduces one bounded contract family, is expected to touch two substantive production implementation files, and is well below the non-test file/LOC split threshold.

## 1. Objective

Introduce only the minimum production-owned terminal run receipt/control observation required for later live validation to identify an actual production synchronization run and its authoritative terminal outcome without reconstructing success from test logs.

The seam must be generally safe production observability/control over existing authority. It MUST NOT introduce scenario/test authority into production.

## 2. Required End State

When complete, production exposes a narrowly bounded receipt or equivalent terminal observation sufficient for the live validation layer to identify, as applicable:

- production run identity;
- trigger/plan identity needed to correlate the run;
- terminal production classification;
- whether required physical effects were committed/verified according to production authority;
- failure/blocking/uncertainty classification necessary to avoid manufacturing PASS.

The seam is enumerated in the architecture boundary, remains within the production-seam budget, and contains no scenario IDs, scenario sequencing, test persistence, cross-device coordination, evidence aggregation, alternate synchronization policy, or test-only mutation behavior.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07 predecessor SHA;
- exact task branch;
- current production run/execution/result/diagnostic authority surfaces;
- whether an existing production terminal observation already satisfies this contract in whole or part;
- exact production files/members, if any, authorized as the seam;
- exact test-platform/test/governance paths required to enumerate/test the seam;
- exact writable-path allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- current production-seam LOC/file baseline;
- confirmation that the child remains within BVP-GOV-010.

If the existing product already exposes sufficient general terminal authority, prefer reusing it and minimize or eliminate production changes.

## 4. Required Semantics

### 4.1 Production ownership

The terminal receipt is produced from the real production execution authority. It is not assembled from BVP expectations or inferred solely from diagnostic strings.

### 4.2 Terminal meaning

The receipt/equivalent must distinguish the terminal states required for safe validation, including success, failure/blocking, and unresolved/ambiguous conditions where production itself cannot yet assert success.

Do not collapse uncertainty into success for test convenience.

### 4.3 Correlation

The live executor must be able to associate a requested production run with its terminal receipt without confusing a stale/prior run.

Use existing run/plan/trigger identity where available; introduce only the minimum generic correlation required by production semantics.

### 4.4 No alternate authority

The seam cannot:

- force a synchronization plan/result;
- alter production state to satisfy a test;
- bypass authentication/safety/preconditions;
- expose a BVP-only mutation path;
- interpret scenario expectations.

### 4.5 Safe ordinary production behavior

The seam must be safe even if present in an ordinary production build. Validation-only scenario/transport/agent code remains excluded from the shipping artifact.

## 5. Hard Architecture Budget

Production BVP-only seam remains:

- maximum **350 logical source lines**;
- maximum **4 production files**.

The count includes all production code whose sole purpose is the BVP seam.

Exceeding either budget is `BLOCKED`; the worker may not raise the budget.

## 6. Invariants

- Production remains synchronization authority.
- Scenario authority remains external.
- Diagnostics remain corroborative.
- No scenario/test data enters production state.
- No new OAuth scope/token export.
- No test-only mutation semantics.
- No live-device agent/transport code in production.
- The seam is explicitly enumerated and re-frozen after acceptance.

## 7. Material Edge / Failure Cases

Tests must establish, as applicable:

- receipt correlates to the intended run rather than a stale one;
- successful run reports authoritative success;
- failed/blocked run does not report success;
- ambiguous/unverified terminal state remains non-success;
- unrelated diagnostic text cannot fabricate a receipt;
- repeated observation of a completed run is stable/idempotent;
- seam cannot trigger unauthorized mutation;
- budget/file-count limits are enforced.

If current production architecture cannot expose the required terminal authority within the budget without a broader redesign, return `BLOCKED`.

## 8. Engineering Discretion

The agent may choose:

- whether to reuse an existing production result type or add a small generic receipt type;
- exact member/type names;
- synchronous vs observable/pollable read shape consistent with current product architecture;
- private implementation helpers within the authorized production files.

Do not introduce a BVP-specific production service hierarchy or scenario API.

## 9. Dependencies

Consumes the existing production execution authority and S03 architecture governance. S08B–F depend on this general terminal observation for live validation.

## 10. Acceptance Criteria

Acceptance requires:

- authoritative terminal observation available to later validation;
- no log-only success inference;
- no scenario/test authority in production;
- seam explicitly enumerated;
- ≤350 LOC / ≤4 production files;
- production shipping behavior otherwise unchanged;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS.

## 11. Non-Goals

Do not implement:

- validation-only Obsidian entrypoint (08B);
- command agent (08C);
- command mailbox/relay (08D);
- live runner executor/checkpoints (08E);
- physical canary (08F);
- scenario catalog;
- new product diagnostics unrelated to the required terminal authority.

## 12. Handoff / Stop

Report exact input SHA, implementation SHA, actual changed paths, exact enumerated seam members/files, production-seam LOC/file count, terminal-state tests, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08B.
