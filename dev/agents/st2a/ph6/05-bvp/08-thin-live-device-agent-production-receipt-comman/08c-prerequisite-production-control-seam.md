# BVP-S08C Prerequisite — Bounded Production Control Seam

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Purpose:** prerequisite only; S08C proper remains PREPLANNED / NOT-YET-EXECUTABLE.

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

## 0.1 Dispatch Binding

Repository coordinates:

- exact accepted architecture-reviewed predecessor / PHX-CI base: `c31f99dd5e2ea0cbf6443ba3110f377f4292f67b`;
- task branch: `bvp-s08c-prereq-production-control-seam`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- accepted shipping artifact baseline: `main.js` 884,300 bytes / SHA-256 `0d4f755dfd85da9a66180ed38cededd37168ea9f46ae1aa4ee3c15cdb8341411`;
- current production seam: 140 logical LOC / 2 files versus frozen 350 / 4 maximum;
- current framework core: 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- current live-device/relay surface: 176 / 750 logical TypeScript LOC / 2 files.

Grounded gap:

- `ProductRuntime.productController()` already exposes the real production controller internally;
- `BrainGoogleDriveSyncPlugin` owns `ProductRuntime` in a private `runtime` field;
- the validation build therefore has no supported production-path invocation surface;
- `run-receipt-seam.ts` is intentionally read-only;
- the frozen boundary manifest explicitly allows a bounded invocation seam over already-authorized production actions;
- reflective/private-field access, monkey-patching, broad `src/main.ts` BVP imports, or duplicate synchronization behavior are prohibited.

## 1. Objective

Add the smallest production-owned control facade required for later validation-only command execution to invoke existing production synchronization authority safely and observe the S08A terminal receipt, without adding synchronization policy, scenario authority, transport, persistence, or test-only mutation bypass.

## 2. Required End State

A new approved production seam exposes only:

- reviewed manual plan preview;
- reviewed Verify/Reconcile plan preview;
- execution of an already-produced production plan ID;
- pause;
- resume;
- cancel-active-sync;
- current production surface observation;
- latest S08A production run receipt.

`BrainGoogleDriveSyncPlugin` exposes one explicit public accessor returning this facade only when the real production controller exists.

The facade delegates to the existing `ProductController`; it does not duplicate planner/executor/state behavior.

## 3. Exact Writable-Path Allowlist

- NEW `src/product/live-validation-control-seam.ts`;
- `src/main.ts`;
- `dev/governance/testing-platform-boundary.yaml`;
- NEW `test-platform/test/s08c-prerequisite-production-control-seam.test.ts`;
- `test-platform/test/architecture-metrics.test.ts`;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No other path is writable.

## 4. Required Semantics

### 4.1 Delegation only

The seam may translate bounded control methods into existing controller calls, but it must not implement plan selection, operation policy, retry policy, state transitions, safety policy, or scenario decisions.

### 4.2 Fail-closed availability

If the real production controller is unavailable, the plugin accessor returns `undefined`. It must not construct a fake controller or optimistic success object.

### 4.3 Exact production actions

The seam's execution/control methods must invoke the same controller methods already used by production UI/runtime:

- `previewManual()`;
- `previewVerifyReconcile()`;
- `request({ kind: "execute-plan", planId })`;
- `request({ kind: "pause" })`;
- `request({ kind: "resume" })`;
- `request({ kind: "cancel-active-sync" })`.

### 4.4 Receipt authority

Latest terminal receipt must come from the S08A production receipt source. The seam may copy/read the receipt but may not synthesize or upgrade a result.

### 4.5 Shipping and architecture

This seam is allowed to ship only because it is an explicitly budgeted BVP production seam. It exposes no validation UI, scenario state, command protocol, transport, fixture mutation, evidence aggregation, OAuth path, or alternate synchronization engine.

## 5. Governance Change

Add only `src/product/live-validation-control-seam.ts` to `production_seam.approved_imports`.

No complexity budget may increase.

Because the supervisor-owned boundary manifest is intentionally re-frozen, authoritative verification MUST use `BVP_CHANGE_CLASS=authorized-governance`.

## 6. Focused Proof

Focused tests must establish:

- undefined source/controller yields no facade;
- manual and Verify/Reconcile previews delegate exactly;
- execute-plan delegates the exact plan ID;
- pause/resume/cancel delegate exact production actions;
- current surface observation comes from the source;
- latest receipt is production-derived and remains non-mutating;
- unsupported scenario/transport/test mutation authority is absent from the facade;
- `src/main.ts` exposes the accessor without importing `test-platform/**`;
- architecture metrics recognize exactly three approved production-seam files and remain within frozen budgets.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08c-prerequisite-production-control-seam.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

## 7. Non-Goals

Do not implement S08C command unions, run/device/sequence state, fixture commands, live observations beyond this production facade, mailbox/relay transport, external live executor, physical scenarios, OAuth changes, or validation UI.

## 8. Completion / Stop

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

S08C proper remains blocked until this prerequisite passes authoritative PHX-CI, supervisor acceptance, and post-prerequisite architecture confirmation.
