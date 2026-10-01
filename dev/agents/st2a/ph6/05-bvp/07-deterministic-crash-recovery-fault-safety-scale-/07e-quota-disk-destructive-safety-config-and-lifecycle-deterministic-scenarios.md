# BVP-S07E — Quota / Disk, Destructive Safety, Configuration, and Lifecycle Deterministic Scenarios

## 0. Status

**Agent name:** `agt-brain-bvp-s07-resilience-safety-scale-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S07 — Deterministic Crash / Recovery / Fault / Safety / Scale Coverage  
**Predecessor:** architecture-reviewed accepted S07E prerequisite closure `db444c5430be19ac2ccaf7c4c5ef822a9675ab4a`

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.

## 0.1 Current Binding Blocker

S07E proper is unblocked by accepted prerequisite closure `2606062068afe1da3b0a3d152637e19c70c0d9b7`, but implementation has not started.

The prerequisite is bounded to the two generic resource-fault gaps identified at accepted S07D closure:

- preserve `quota-exhausted` through the existing remote mutation fault control;
- model local `disk-full` as a write-capacity failure through the existing local-access fault family without making existing readable content disappear.

Prerequisite base: `c47efae7b1785e0d5a89e482044fcf5811785bce`.

Accepted prerequisite evidence: `70f8dba093c00ae2ac3917e73168bb9b43b2e0d3`.

Post-prerequisite architecture review: PASS.

S07E proper retains zero authority for platform-core or production changes.

## 0.2 Final Dispatch Binding

S07E proper is **BOUND / EXECUTABLE** from the architecture-reviewed prerequisite closure.

- exact PHX-CI base: `db444c5430be19ac2ccaf7c4c5ef822a9675ab4a`;
- branch: `bvp-s07e-quota-disk-destructive-config-lifecycle`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework core baseline: 4,000 / 4,000 logical TypeScript LOC / 10 modules;
- production source baseline: 16,670 logical LOC;
- production seam baseline: 113 LOC / 1 file;
- scenario baseline: 64 scenarios / 1,311 logical LOC;
- BVP PowerShell baseline: 4 scripts / 1,477 logical LOC;
- production artifact baseline: `main.js` 880,742 bytes, SHA-256 `9745d590e8348ce896f11b90321706546afded1b837fe12702e59b9b51452df4`.

Bound production authority:

- `FAIL-004` remote quota exhaustion preserves local changes and blocks affected remote writes;
- `FAIL-005` local disk exhaustion preserves the previously valid local file and blocks affected writes;
- `DELETE-005` through `DELETE-010` destructive circuit breaker and recovery-checkpoint requirements;
- production default destructive thresholds remain authoritative: absolute count 25, affected fraction 0.20, abnormal multiple 3;
- `CONFIG-001` through `CONFIG-009` selective configuration boundaries;
- `LIFE-001`, `LIFE-002`, and `INV-020` non-destructive lifecycle invariants, limited here to deterministic reconstruction/re-enable semantics rather than physical install/uninstall evidence.

Accepted generic controls:

- `inject-remote-mutation-fault` with preserved `quota-exhausted`;
- `set-local-access: disk-full`;
- persisted restart/reconstruction through `checkpoint:restart-device`;
- ordinary production preview/execute/reconcile;
- exact production destructive approval through the existing controller action and recovery checkpoint in focused verification only.

Writable implementation allowlist:

- `test-platform/scenarios/07e/*.ts`;
- `test-platform/test/s07e-quota-disk-destructive-config-lifecycle.test.ts`;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No framework-core, production, production-seam, PowerShell, PHX-CI, persistence, safety-policy, configuration-policy, or lifecycle implementation change is authorized.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s07e-quota-disk-destructive-config-lifecycle.test.js`

## 0.3 Ready-for-Verification Record

S07E proper is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic scenario/test implementation HEAD: `676abf52928721c6bd1fa16cc20b7cf3942ff414`;
- exact PHX-CI base: `db444c5430be19ac2ccaf7c4c5ef822a9675ab4a`;
- implementation delta: six `test-platform/scenarios/07e/*.ts` files plus one focused S07E test only;
- framework-core / production / production-seam / PowerShell / PHX-CI implementation delta: 0;
- framework core remains 4,000 / 4,000;
- scenario catalog projects to 70 scenarios / 1,524 logical LOC;
- S07E scenario logical LOC remains below the 200-LOC hard limit for all six scenarios.

Requirement coverage:

- `FAIL-004`: quota exhaustion blocks remote write and preserves local content;
- `FAIL-005`: disk-full blocks local replacement and preserves the prior valid file;
- `DELETE-005` / `DELETE-006` / `DELETE-010`: one deletion among ten managed paths remains below production thresholds;
- `DELETE-005` through `DELETE-008` / `DELETE-010`: 25-item destructive plan is blocked before effect, requires the exact production recovery checkpoint, rejects a mismatched checkpoint, and completes only after exact reviewed approval;
- `CONFIG-001` / `CONFIG-003` / `CONFIG-005`: repeated protected authentication-configuration changes remain local and never enter ordinary remote synchronization;
- `LIFE-001` / `LIFE-002` / `INV-020`: deterministic runtime reconstruction preserves trusted state and shared/local data and resumes synchronization.

Negative proof changes the blocked-plan expectation and must fail with stable `assertion-mismatch`.

Physical uninstall/reinstall/device unlink and installed-runtime lifecycle evidence remain explicitly unavailable here and stay assigned to S09E.

### First S07E PHX-CI correction

Authoritative evidence `1679b310395ae215c89a6787f4bf666f9c0e177f` exposed two focused-test assumptions, not production regressions:

- the suspicious plan contains 25 destructive operations plus four harmless portable-configuration no-op operations, so total plan operation count is 29; the corrected proof asserts the destructive-operation count rather than total plan length;
- the virtual Drive core does not model the production Google Drive adapter's dedicated portable-configuration remote-domain root, so a declarative portable-file transfer is not an admissible S07E proper proof without a new platform prerequisite. S07E instead exercises an already-supported configuration invariant: a protected authentication artifact can change repeatedly while remaining local and excluded from ordinary remote synchronization.

No production, framework-core, safety-policy, or configuration-policy change is made.

## 1. Objective

Add declarative deterministic coverage for modeled resource failures, destructive-safety/circuit-breaker behavior, recovery checkpoints, and configuration/lifecycle invariants that do not intrinsically require a real installed Windows/iOS runtime.

## 2. Required End State

Executable scenarios cover current deterministic requirements for:

- remote quota/capacity failure;
- local disk/capacity write failure;
- destructive-operation threshold/circuit-breaker activation;
- blocked destructive plan/preview behavior;
- explicit recovery/reconcile checkpoint after a destructive-safety stop;
- configuration/scope option semantics suitable for deterministic proof;
- lifecycle invariants that are about persisted product state rather than physical OS/app behavior.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S07D predecessor SHA;
- task branch;
- current quota/disk/destructive/config/lifecycle requirement IDs and production thresholds/contracts;
- accepted S04 fault/config controls;
- exact scenario/fixture/test writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

No production threshold or safety policy may be changed by binding.

## 4. Required Semantics

### 4.1 Resource failures

Quota/disk failures are modeled as external boundary failures with production-facing classifications. The test does not bypass normal product retry/safety/error handling.

### 4.2 Destructive circuit breaker

Construct a deterministic state that would exceed the product's allowed destructive threshold and prove that production blocks/halts according to target policy before unauthorized destructive effects occur.

### 4.3 Recovery checkpoint

After a destructive safety stop, prove the target-required reconcile/verify/human-confirmation/recovery pathway can resume safely. The scenario must not reset safety state merely to continue.

### 4.4 Configuration semantics

Exercise deterministic configuration/scope behaviors whose subject is product logic rather than real platform UI/storage APIs.

### 4.5 Lifecycle invariants

Prove state invariants for disable/unlink/re-enable/reconstruction only where those invariants can be tested without claiming actual installed-runtime lifecycle evidence.

Physical uninstall/reinstall/device unlink behavior remains S09E.

## 5. Invariants

- Safety thresholds remain production authority.
- Test infrastructure cannot lower/disable circuit breakers.
- Resource failure does not authorize data loss.
- Deterministic lifecycle tests do not claim physical OS evidence.
- No new safety/config engine or scenario-specific core.

## 6. Material Edge / Failure Cases

Required proof includes:

- quota failure classified safely;
- local disk write failure classified safely;
- destructive threshold below limit permits normal behavior where appropriate;
- threshold-exceeding plan is blocked before destructive effects;
- recovery checkpoint requires target-approved conditions;
- configuration change produces target semantics;
- deterministic lifecycle state preserves user/remote data according to product invariants;
- wrong unsafe expectation fails.

## 7. Engineering Discretion

The agent may choose representative resource limits and destructive-count fixtures consistent with current production thresholds/contracts.

## 8. Dependencies

Consumes S04 faults/config controls, S05 runner/evidence, and current production safety/config/lifecycle rules.

## 9. Acceptance Criteria

All deterministic safety/resource/config/lifecycle scenarios map to current requirements and pass; circuit-breaker proof demonstrates actual prevention; no safety weakening/core/production changes occur; budgets and authoritative PHX-CI pass.

## 10. Non-Goals

Do not claim physical install/uninstall/auth/mobile resource behavior; those belong to S09. Do not implement scale measurement (07F).

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, requirement mappings, safety/resource/config results, architecture delta, unavailable checks, and no core/out-of-allowlist changes.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 07F.
