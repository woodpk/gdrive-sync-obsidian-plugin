# BVP-S08E Prerequisite — Single-Runner Executor Seam

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** COMPLETE / NON-EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Purpose:** prerequisite only; S08E proper remains PREPLANNED / NOT-YET-EXECUTABLE.

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

## 0.1 Dispatch Binding

Repository coordinates:

- exact architecture-reviewed predecessor / PHX-CI base: `bdd34c5e32d42cdfe20bc82fe97a17cce4e9f171`;
- task branch: `bvp-s08e-prereq-runner-executor-seam`;
- accepted single scenario runner: `test-platform/src/scenario/scenario-runner.ts`;
- accepted canonical evidence family: `test-platform/src/scenario/scenario-evidence.ts`;
- accepted checkpoint representation: `test-platform/src/scenario/scenario-checkpoint.ts`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- framework core: exactly 4,000 / 4,000 logical TypeScript LOC across 10 runtime modules;
- live-device/relay: 572 / 750 logical TypeScript LOC;
- production seam: 187 / 350 logical LOC across 3 / 4 files;
- BVP PowerShell: 4 scripts / 1,492 logical LOC.

Grounded gap:

- the existing runner constructs `VirtualSynchronizationWorld` internally and accepts only deterministic execution;
- fixture, production, and external-state execution are hard-wired into that runner;
- existing hooks cover only observe/assert/checkpoint;
- no other runner/executor abstraction exists;
- canonical evidence hard-codes `executionMode: "deterministic"`.


## 0.2 Ready-for-Verification Record

The S08E single-runner executor prerequisite is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `a234f6b611c1cded1d2ae60b02531ed9888dfc4c`;
- exact architecture-reviewed predecessor / PHX-CI base: `bdd34c5e32d42cdfe20bc82fe97a17cce4e9f171`;
- branch: `bvp-s08e-prereq-runner-executor-seam`;
- no new framework-core runtime module was added;
- `DeterministicScenarioRunner` remains the sole scenario runner;
- optional `ScenarioStepExecutor` declares one execution mode, bounded device identities, one-step execution, bounded prior-capture reads, current step index, and optional disposal;
- executor-driven runs do not construct the deterministic virtual world and cannot invoke deterministic fixture/production/external-state mechanics for the same step;
- runner-owned capture handling is centralized for deterministic and executor-driven completed results;
- deterministic observation hooks retain the accepted historical behavior of recording an explicit undefined capture when a completed observation returns no value;
- runner-owned expected-outcome matching, early termination, final verdict, evidence creation, and executor disposal are preserved;
- invalid scenario and execution-mode mismatch dispose an injected executor without dispatching a step;
- canonical evidence schemaVersion remains 1 and now records the actual existing `ScenarioExecutionMode` union;
- deterministic evidence still records `deterministic`; executor-driven live evidence records `live`;
- framework core is **3,996 / 4,000 logical TypeScript LOC across exactly 10 modules**;
- live-device/relay remains 572 / 750 LOC;
- production source/seam, PowerShell, governance, transport, mailbox, checkpoint implementation, scenario definitions, and evidence family count are unchanged.

Focused proof includes:

- existing deterministic runner tests;
- existing canonical-evidence tests;
- live-only scenario execution through the same runner;
- strict step-index/order delivery to the injected executor;
- runner-owned captures;
- expected blocked continuation;
- failed and unsupported early-terminal propagation;
- live evidence mode/device identities;
- deterministic evidence-mode/capture compatibility;
- executor disposal on completion, early terminal, invalid input, and mode rejection;
- architecture metrics/budgets.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08e-prerequisite-runner-executor-seam.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js .test-build/bvp/test-platform/test/scenario-evidence.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

S08E proper remains blocked until authoritative PHX-CI passes, the full evidence triad is reviewed, this prerequisite is accepted/promoted, and post-prerequisite architecture confirmation passes.


## 0.3 Acceptance Record

The S08E single-runner executor prerequisite is **COMPLETE / ACCEPTED**.

Authoritative lineage:

- accepted implementation HEAD: `7d261698ec83cebeee6063524e57802955600b23`;
- authoritative PHX-CI evidence commit: `5828e0c251758d05c171ad8f2a0ba6a5db15d674`;
- authoritative run ID: `e8590eae-5d13-4149-9a4a-21b5e8081953`;
- exact verification base: `bdd34c5e32d42cdfe20bc82fe97a17cce4e9f171`;
- complete persisted JSON, Markdown, and 7,411-line execution log reviewed before acceptance;
- focused prerequisite + runner + evidence + metrics suite: 68/68 PASS;
- complete repository suite: 835/835 PASS;
- `npm ci`: 0 vulnerabilities;
- every required PHX-CI stage: PASS / exit 0;
- architecture guard: PASS / 0 violations;
- repository gate: PASS;
- shipping artifact: `main.js` 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`.

Accepted semantics:

- `DeterministicScenarioRunner` remains the only scenario runner;
- optional `ScenarioStepExecutor` receives exactly one selected generic scenario step at a time plus current step index and read-only prior-capture access;
- runner retains scenario validation, mode applicability, order, captures, expected-outcome matching, final verdict, canonical evidence creation, and disposal lifecycle;
- executor-driven execution does not construct or invoke deterministic virtual-world mechanics for the same step;
- deterministic observation capture behavior is preserved;
- invalid input, mode mismatch, early terminal outcomes, and successful completion dispose an injected executor;
- failed/blocked/unsupported executor outcomes pass through existing runner expectation/verdict rules;
- canonical evidence remains schemaVersion 1 and truthfully records the selected existing execution mode union;
- deterministic evidence remains deterministic; live executor evidence records live;
- no second runner, second evidence family, live-only scenario language, transport authority, checkpoint implementation, production code, PowerShell, or governance-budget change was introduced.

Accepted architecture state:

- production source: 16,813 logical LOC;
- production seam: 187 / 350 logical LOC, 3 / 4 files;
- framework core: **3,996 / 4,000 logical TypeScript LOC across exactly 10 modules**;
- live-device agent/relay: 572 / 750 logical TypeScript LOC;
- BVP PowerShell: 4 scripts / 1,492 logical LOC;
- scenario-specific production source: 0 files;
- scenario-specific PowerShell: 0 files.

S08E proper remains blocked only until post-prerequisite architecture confirmation is recorded.

## 1. Objective

Refactor the existing S05 runner into one runner with a narrow injected step-executor seam so later S08E can supply live step mechanics without creating a second runner or changing declarative scenario authority.

## 2. Required End State

The existing `DeterministicScenarioRunner` remains the only scenario runner and still owns:

- scenario validation;
- execution-mode applicability;
- step order;
- capture storage;
- expected-outcome matching;
- final verdict;
- canonical evidence production.

An optional injected executor may own only the mechanics of one already-selected scenario step at a time.

## 3. Executor Contract

The injected executor must expose:

- one declared `executionMode` of `deterministic` or `live`;
- bounded device identities for canonical evidence;
- `execute(step, context)` receiving one generic scenario step at a time;
- a context that can read prior captures but cannot reorder steps or set the final verdict;
- optional disposal after runner completion.

For executor-driven execution:

- the runner MUST NOT invoke its deterministic fixture/production/external-state implementation for the same step;
- a completed executor result carrying a value is captured only when the scenario step declares `captureAs`;
- unsupported/blocked/failed results flow through the same existing expectation/verdict rules;
- scenario definitions remain unchanged.

## 4. Canonical Evidence Mode

The existing evidence schema family remains schemaVersion 1.

The evidence machine's `executionMode` type is widened from the literal `deterministic` to the existing `ScenarioExecutionMode` union. The runner supplies the actual selected mode.

Existing deterministic evidence output must remain semantically and serialization-equivalent except for no-op internal plumbing.

No second evidence schema, file family, or live-only evidence representation is authorized.

## 5. Framework-Core Budget

Framework core MUST remain at or below 4,000 logical TypeScript LOC and exactly 10 runtime modules.

No budget increase is authorized.

The implementation must offset new executor/mode-plumbing LOC through genuine simplification/refactoring within the existing runner/evidence modules. Do not add a new framework-core module merely to hide LOC.

## 6. Exact Writable-Path Allowlist

- `test-platform/src/scenario/scenario-runner.ts`;
- `test-platform/src/scenario/scenario-evidence.ts`;
- NEW `test-platform/test/s08e-prerequisite-runner-executor-seam.test.ts`;
- existing `test-platform/test/scenario-runner.test.ts` and/or `scenario-evidence.test.ts` only if an existing assertion must be strengthened;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No production, live-device, transport, mailbox, PowerShell, governance, PHX-CI, scenario-definition, or checkpoint implementation path is writable.

## 7. Focused Proof

Focused proof must establish:

- all existing deterministic runner behavior remains PASS;
- deterministic canonical evidence still reports `executionMode: "deterministic"`;
- a live executor can run a live-only scenario through the same runner;
- the executor receives steps strictly in declared order;
- the runner retains capture ownership;
- the executor cannot bypass expected-outcome matching;
- a failed/blocked/unsupported executor result becomes the runner verdict exactly as deterministic results do;
- live canonical evidence reports `executionMode: "live"`;
- executor-supplied device identities are used in canonical evidence;
- executor disposal occurs on completed and early-terminal runs;
- framework-core metrics remain <= 4,000 LOC / 10 modules.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08e-prerequisite-runner-executor-seam.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js .test-build/bvp/test-platform/test/scenario-evidence.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

## 8. Non-Goals

Do not implement S08E live capability mapping, S08 command transport use, checkpoint persistence/resume flow, human checkpoint instructions, physical execution, or S08F canary work.

## 9. Completion / Stop

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

S08E proper remains blocked until this prerequisite passes authoritative PHX-CI, supervisor acceptance, and post-prerequisite architecture confirmation.
