# BVP-S08E — External Live Executor and Human Checkpoints

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository coordinates only.


## 0.1 Dispatch Binding

Repository coordinates:

- exact post-prerequisite architecture-confirmed predecessor / PHX-CI base: `6d328dbfd79c6d9c58ca3b0a3bfcbd32f5fa8ad6`;
- task branch: `bvp-s08e-external-live-executor-checkpoints`;
- accepted single-runner executor seam: `test-platform/src/scenario/scenario-runner.ts`;
- accepted bounded checkpoint representation: `test-platform/src/scenario/scenario-checkpoint.ts`;
- accepted S08C command/result contract: `test-platform/src/live-device/device-command-agent.ts`;
- accepted S08D external-controller transport boundary: protected relay files under `.obsidian/plugins/brain-google-drive-sync/.bvp-relay/{outbox,sent,inbox}`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- framework core baseline: 3,996 / 4,000 logical TypeScript LOC / 10 modules;
- live-device/relay baseline: 572 / 750 logical TypeScript LOC;
- production seam baseline: 187 / 350 logical LOC / 3 of 4 files;
- BVP PowerShell baseline: 4 scripts / 1,492 logical LOC.

Selected live capability mapping for S09 physical use:

- `fixture:put-local-file` with UTF-8 content -> S08C `fixture-put{text}`;
- `fixture:remove-local` -> S08C `fixture-remove`;
- `production:preview` -> S08C manual production preview;
- `production:reconcile` -> verify/reconcile preview followed by production execute;
- `production:synchronize` -> manual preview followed by production execute;
- `production:execute-reviewed-plan` -> S08C production execute using runner-owned prior plan capture;
- `external-state:request-cancellation` -> S08C `production-control:cancel-active-sync`;
- `observe:local-entry` -> S08C `observe-file`;
- `observe:device-state` -> S08C `observe-product`;
- `observe:production-plan` / `observe:production-result` -> prior runner capture observation;
- `assert:*` -> the existing generic scenario assertion semantics;
- `checkpoint:capture` and live `checkpoint:restart-device` -> explicit human checkpoint instructions plus persisted S05D checkpoint state.

Fail-closed mappings:

- arbitrary remote fixture mutation, local move/folder fixture, deterministic fault injection, provider simulation, automatic-sync triggering, remote-entry/change-feed observation, and arbitrary bytes content are unsupported unless a later task binds an already-authorized physical mechanism;
- transport completion is never synchronization success;
- production execute succeeds only when the correlated S08A receipt terminal is `complete`; partial/failed/cancelled/uncertain propagate as failure, while blocked/deferred/recovery-required propagate as blocked;
- missing, stale, or mismatched result correlation blocks/fails rather than continuing.

Human checkpoint binding:

- checkpoint instructions are bound externally by checkpoint ID and contain exact operator action, target device, stop condition, required resume-evidence kinds, and next safe command/observation;
- instruction text is not persisted in checkpoint state;
- only encoded S05D checkpoint data is durable;
- resume must validate scenario, run, live execution mode, and exact bound device identities;
- required resume-evidence kinds must be supplied before the checkpoint step can complete;
- a checkpoint crossing a prior capture dependency required after resume fails closed instead of replaying physical mutations or persisting arbitrary capture state;
- controller restart is supported by deterministic command IDs/sequences and the existing S08C duplicate/sequence safety rather than device-local scenario state.

Exact writable-path allowlist:

- NEW `test-platform/src/live-device/live-scenario-executor.ts`;
- `test-platform/src/scenario/scenario-evidence.ts` only to expose the existing generic assertion helper without changing semantics;
- NEW `test-platform/test/s08e-external-live-executor.test.ts`;
- `test-platform/test/architecture-metrics.test.ts` only to freeze the measured live-device baseline after implementation;
- `test-platform/test/s08b-validation-build-entrypoint.test.ts` only if needed to prove the external executor remains outside the device validation bundle;
- this task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`.

No production, scenario definition, scenario runner, checkpoint implementation, device command-agent, mailbox/relay implementation, PowerShell, PHX-CI, governance-budget, package, manifest, OAuth, or S08F path is writable.

Focused verification command after implementation:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08e-external-live-executor.test.js .test-build/bvp/test-platform/test/s08e-prerequisite-runner-executor-seam.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js .test-build/bvp/test-platform/test/scenario-checkpoint.test.js .test-build/bvp/test-platform/test/scenario-evidence.test.js .test-build/bvp/test-platform/test/s08d-drive-mailbox-relay.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`; do not begin S08F.


## 0.2 Ready-for-Verification Record

BVP-S08E is **READY FOR LOCAL PHX-CI VERIFICATION**.

- semantic implementation HEAD: `db3b2e037dd072f92f3e6ab4b93c6e5ac34291bf`;
- exact post-prerequisite architecture-confirmed PHX-CI base: `6d328dbfd79c6d9c58ca3b0a3bfcbd32f5fa8ad6`;
- branch: `bvp-s08e-external-live-executor-checkpoints`;
- the existing `DeterministicScenarioRunner` remains the only scenario runner;
- the accepted S08E prerequisite executor seam is consumed without runner modification;
- external live execution uses only protected S08D local relay files; it has no Google credential/token access;
- command IDs are deterministic hashes of run/scenario/step/subcommand identity and stay within S08C bounds;
- sequence numbers are deterministic across controller reconstruction for supported physical command mappings;
- exact result correlation requires run/device/sequence/command/kind equality;
- malformed, stale-sequence, wrong-device, and missing results fail/block rather than becoming success;
- production transport completion is not synchronization success: only a correlated S08A receipt terminal `complete` returns completed; blocked/deferred/recovery-required propagate blocked and partial/failed/cancelled/uncertain propagate failed;
- human checkpoint instructions remain bound external metadata and are not persisted;
- durable checkpoint state is exactly encoded S05D schemaVersion-1 state;
- resume validates scenario/run/live-mode/device identities and exact checkpoint position;
- controller reconstruction replays bounded prior step statuses without replaying physical mutations;
- required resume-evidence kinds are mandatory before the checkpoint completes;
- cross-checkpoint prior-capture dependencies fail closed rather than persisting arbitrary runner captures;
- iOS termination/restart is proven with a brand-new executor instance and no device-local runner state;
- arbitrary bytes/remote/fault-injection capabilities remain unsupported rather than being falsely mapped.

Measured architecture:

- production source: 16,813 logical LOC;
- production seam: 187 / 350 logical LOC, 3 / 4 files;
- framework core: **3,996 / 4,000 logical TypeScript LOC / 10 modules**;
- live-device agent/relay/executor: **727 / 750 logical TypeScript LOC**, leaving 23 LOC;
- BVP PowerShell: 4 scripts / 1,492 logical LOC;
- scenario-specific production/PowerShell: 0 / 0.

Focused proof covers:

- exact local fixture -> preview -> execute -> observation -> assertion command order and sequence;
- correlated production-complete receipt success;
- production-uncertain failure propagation;
- wrong-device and stale-sequence result rejection;
- missing result blocking;
- S05D checkpoint serialization with instruction text excluded from persisted state;
- missing resume evidence blocking;
- new-executor checkpoint resume without fixture replay;
- stale run checkpoint rejection;
- cross-checkpoint capture dependency rejection;
- iOS terminate/relaunch checkpoint with no device-local runner state;
- cancellation -> production-control mapping;
- arbitrary byte fixture unsupported with no device command;
- accepted S08E prerequisite runner behavior;
- S05D checkpoint regressions;
- S08D mailbox/relay regressions;
- S08B device-bundle isolation;
- architecture metrics.

Focused command:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/s08e-external-live-executor.test.js .test-build/bvp/test-platform/test/s08e-prerequisite-runner-executor-seam.test.js .test-build/bvp/test-platform/test/scenario-runner.test.js .test-build/bvp/test-platform/test/scenario-checkpoint.test.js .test-build/bvp/test-platform/test/scenario-evidence.test.js .test-build/bvp/test-platform/test/s08d-drive-mailbox-relay.test.js .test-build/bvp/test-platform/test/s08b-validation-build-entrypoint.test.js .test-build/bvp/test-platform/test/architecture-metrics.test.js`

S08E is not accepted until authoritative PHX-CI passes and the exact persisted JSON, Markdown, and complete execution log are reviewed. S08F has not begun.

## 1. Objective

Extend the external BVP runner with a live executor that maps the same declarative capability concepts to bounded device commands/results and uses explicit external checkpoints for OS/provider actions that cannot safely be automated.

Scenario authority remains external.

## 2. Required End State

The external runner can:

- select live execution for scenarios/steps marked live-capable/required;
- translate supported generic scenario capabilities into S08C commands;
- send/receive through S08D transport;
- validate run/device/sequence/result correlation;
- use S08A production receipt for terminal production-run assertions;
- pause at explicit human checkpoints;
- persist only bounded S05D checkpoint state;
- resume after required human/device evidence is supplied;
- fail/block when a required device/result/action is unavailable.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08D predecessor SHA;
- task branch;
- actual S05 runner/executor abstraction;
- accepted S08 command/transport contracts;
- exact live-capable scenario capabilities needed for S09;
- exact live-executor/checkpoint/test paths and writable allowlist;
- PHX-CI base/pin/runtime;
- focused command if established;
- architecture metrics baseline.

Binding may map existing generic capabilities to commands; it may not create a second scenario vocabulary unnecessarily.

## 4. Required Semantics

### 4.1 Same scenario authority

The external runner remains the only owner of scenario step order and final verdict.

The device sees one command at a time.

### 4.2 Live capability mapping

Where a declarative scenario capability has deterministic and live implementations, both represent the same semantic intent even if mechanics differ.

Unsupported live capability fails/blocks; it is not silently skipped.

### 4.3 Production result authority

Synchronization assertions use the production run receipt plus objective observations. Transport acknowledgement alone is not synchronization success.

### 4.4 Human checkpoints

For actual OS/provider actions that cannot or should not be automated—such as user-mediated auth, iOS termination/suspension, network toggles, uninstall/reinstall, authorization revocation—the runner checkpoint must state:

- exact operator action required;
- target device;
- run/scenario identity;
- stop condition before action;
- evidence/observation required to resume;
- next safe command/observation after resume.

A checkpoint is explicit test state, not a vague instruction to “continue later.”

### 4.5 Mobile lifecycle reality

Do not assume true iOS background execution. Live sequencing must tolerate foreground-only operation, suspension, termination, and later resume.

### 4.6 Fail closed

Missing result, stale/mismatched result, unavailable device, unsupported action, or missing checkpoint evidence yields FAIL/BLOCKED rather than PASS.

## 5. Invariants

- No device-local scenario engine.
- No distributed workflow state machine.
- Checkpoints remain bounded/non-secret.
- Transport remains test metadata, not product authority.
- Production synchronization path is invoked for all synchronization claims.
- Human checkpoints are allowed where physical reality requires them.

## 6. Material Edge / Failure Cases

Tests must cover:

- deterministic mapping from scenario capability to live command;
- correct result correlation;
- stale/wrong-device result rejected;
- missing result blocks;
- production failure/ambiguity propagates;
- checkpoint serialization/resume;
- checkpoint run/scenario mismatch rejected;
- unavailable human-required action produces explicit wait/block state;
- executor does not continue past a required checkpoint without evidence;
- iOS suspension/termination does not require background runner state on device.

## 7. Engineering Discretion

The agent may choose:

- live executor interface shape;
- command mapping helpers;
- exact checkpoint rendering;
- local controller persistence using accepted S05D representation.

Do not create a second runner, workflow engine, or live-only scenario language.

## 8. Dependencies

Consumes S05 runner/checkpoints/evidence and S08A–D live contracts.

S08F validates the complete desktop path before broader S09 physical coverage.

## 9. Acceptance Criteria

Acceptance requires external scenario authority, correct live command mapping/correlation, explicit human checkpoint semantics, no mobile-background assumption, fail-closed unavailable/missing evidence, architecture budgets PASS, and authoritative PHX-CI PASS.

## 10. Non-Goals

Do not execute broad physical S09 coverage here; do not automate unsafe/impossible OS actions merely to remove human checkpoints.

## 11. Handoff / Stop

Report exact input SHA, implementation SHA, changed paths, live capability mappings, checkpoint semantics/tests, architecture delta, unavailable checks, and no-out-of-allowlist confirmation.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION`.

Do not begin 08F.
