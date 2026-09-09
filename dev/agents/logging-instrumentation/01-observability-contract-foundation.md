# Phase 6 Logging Instrumentation — LOG-01 Observability Contract Foundation

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-log01-observability-contract-foundation-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`IMPLEMENTATION — SHARED CONTRACT FOUNDATION`

Assignment:

> Upgrade the existing local `DiagnosticLogger` into the frozen structured-observability contract required by the Phase 6 logging-instrumentation build session: define the complete safe event/component/field vocabulary, deterministic correlation/resource helpers, bounded retention/rendering behavior, and sync-run correlation primitives needed by later HTTP, Drive, execution, state/recovery, and bundle consumers, while preserving current diagnostic behavior and synchronization semantics.

This work package owns the shared observability contract. It does not instrument Google HTTP, Google Drive mutation semantics, durable execution, state/recovery, or the final diagnostic bundle.

## 1. Base / Drift Gate

Use exactly:

`LOG01_BASE_SHA = 3735b29153016550d7eabb8727780d9bae40c30f`

Required branch:

`phase6-logging-01-observability-foundation`

Before modifying anything:

1. Verify repository identity is `woodpk/gdrive-sync-obsidian-plugin`.
2. Verify `HEAD`/task input is exactly `3735b29153016550d7eabb8727780d9bae40c30f`.
3. Verify the working tree is clean.
4. Inspect the current `src/diagnostics/diagnostic-logger.ts`, directly related diagnostic helpers/tests, and call sites necessary to understand backward compatibility.
5. Create the required branch from exactly `LOG01_BASE_SHA`.

Do not substitute `phase6-integration`, `main`, a newer branch tip, or any later tasking/evidence commit.

The tasking document itself may exist only on a later supervisor branch state; that does not change the implementation base. If the exact implementation base cannot be checked out cleanly, stop and report the blocker.

## 2. Governing Authority

Correctness is governed in this order:

1. Later explicit owner/supervisor decisions.
2. `BRAIN Google Drive Sync Plugin — Target-System Specification`, especially safety, recoverability, no-telemetry-by-default, secret exclusion, and verify-before-state-commit invariants.
3. `Agent-Led Software Product Construction Manual` / `software-products-dev-manual-agent-led.md`.
4. The supervisor session plan `dev/agents/logging-instrumentation/00-logging-instrumentation-session-orchestration.md` as supplied with this task.
5. This prompt.
6. Repository implementation/tests as current-state evidence.

The supervisor-owned architectural decision is already made: this plugin will use one local, bounded, structured diagnostic plane built by evolving the existing `DiagnosticLogger`. Do not redesign that decision.

## 3. Temporal / Dependency Context

This is `LOG-01`, Wave `W0`, the serial foundation of a mixed-temporal session.

- No predecessor implementation work package exists.
- Your output will be reviewed before any downstream instrumentation implementation is authorized.
- After approval, `LOG-02` Google HTTP tracing, `LOG-04` execution tracing, and `LOG-05` state/recovery tracing will execute in parallel from your exact approved SHA.
- Those agents must consume your contract read-only; therefore your schema meanings, safety rules, and exported helpers must be coherent and complete enough for those consumers.
- Integration ownership remains with the supervisor.

Local completion is not session approval. Stop after this work package.

## 4. Scope

### 4.1 In scope

Own the shared structured-diagnostic foundation, centered on:

- `src/diagnostics/diagnostic-logger.ts`;
- narrowly necessary new files under `src/diagnostics/` if separating helper/contract logic materially improves clarity;
- focused tests for the diagnostic contract;
- narrowly necessary updates to existing diagnostic-only helper/call-site typing caused directly by the contract expansion.

The required result is a backward-compatible diagnostic contract that later agents can consume without independently inventing:

- component names;
- safe field names and meanings;
- correlation identifiers;
- path-redaction/correlation behavior;
- rendering/serialization behavior;
- retention behavior;
- secret/content exclusion rules.

### 4.2 Out of scope

Do not implement:

- `GoogleHttpTransport` request tracing;
- `GoogleDriveAdapter` semantic-operation tracing;
- sync executor/durable-effect instrumentation;
- state/CAS/recovery instrumentation;
- final diagnostic-bundle construction;
- new UI/commands;
- live validation;
- any synchronization bug repair.

## 5. Required Behavior

### 5.1 Single logging plane

The existing `DiagnosticLogger` remains the authoritative structured diagnostic plane. Preserve existing callers and persisted records where safely possible. Do not introduce a second logger or competing event store.

### 5.2 Structured causal vocabulary

The frozen contract must support later events that can be correlated across the full chain:

`sync run -> plan -> operation -> durable intent -> physical effect -> Drive request -> physical observation -> convergence -> durable state transition -> canonical commit/recovery -> final result`

At minimum the safe field vocabulary must support these meanings with stable names and scalar values compatible with the current structured event model:

- `planId`
- `operationId`
- `intentId`
- `effectId`
- `requestId`
- `pathKey`
- `remoteObjectId`
- `candidateRemoteObjectId`
- `predecessorRemoteObjectId`
- `contentHash`
- `sizeBytes`
- `expectedRevision`
- `observedRevision`
- `endpointClass`
- `httpStatus`
- `attemptNumber`
- `maxAttempts`
- `latencyMs`
- `retryDelayMs`
- `replaySafe`
- `retryDecision`
- `driveSignal`
- `providerRequestId`
- `observationSource`
- `occupancyCount`
- `occupantIds`
- `trashed`
- `candidateVerified`
- `predecessorVerified`
- `convergenceStatus`
- `fromStage`
- `toStage`
- `persistenceRevision`
- `semanticGeneration`
- `stateRevision`
- `semanticChanged`
- `commitStatus`
- `batchId`
- `changeCount`
- `cursorKey`
- `verificationEvidenceRef`

Preserve the current useful fields. Do not remove or silently reinterpret existing field meanings.

### 5.3 Component taxonomy

Extend the component vocabulary sufficiently to distinguish at least:

- raw/sanitized Google HTTP transport activity;
- semantic Google Drive mutation/observation activity;
- synchronization execution/durable-effect lifecycle;
- authoritative state/CAS activity;
- durable recovery activity;
- diagnostic bundle/export activity.

Use deterministic, concise component identifiers consistent with the existing naming style. Once added in this work package, their meanings are frozen for downstream consumers.

### 5.4 Correlation behavior

Preserve the existing `runId` model and provide a safe way for deeply nested instrumentation to determine the currently active synchronization run when one exists, without Node-only async-context APIs.

Requirements:

- existing explicit `sync*` methods remain valid;
- beginning a sync run establishes current run correlation;
- ending that exact run removes its current-run authority without corrupting another active run if one exists;
- diagnostic calls outside a synchronization run continue to work without manufacturing a run ID;
- correlation state must not affect synchronization behavior.

Choose the smallest browser/mobile-safe implementation that satisfies these semantics after inspecting actual run usage.

### 5.5 Deterministic path privacy

Raw vault paths must not be retained by the structured observability component.

Provide a deterministic exported helper for converting a logical/path string into an opaque diagnostic `pathKey` suitable for equality/correlation across events and restarts on the same codebase. The result must:

- not contain the original path text;
- be deterministic for the same normalized input;
- be collision-resistant for practical diagnostic use;
- use existing portable hashing utilities rather than Node-only crypto;
- never require secret storage.

Tests must prove that recognizable input path fragments do not appear in the result.

### 5.6 Secret/content safety

Retain and strengthen the existing sanitization boundary. Structured diagnostics must reject, redact, or omit:

- bearer/authorization material;
- access/refresh tokens;
- client secrets;
- OAuth authorization codes/state;
- PKCE verifier/challenge material;
- cookies/password-like assignments;
- raw URLs containing query parameters;
- request bodies;
- raw file contents.

Do not create generic arbitrary-object logging that bypasses the safe field allowlist.

IDs and metadata required for synchronization reconstruction may remain as explicit allowed fields, but text values still pass through existing sanitization/truncation behavior.

### 5.7 Persistence and failure semantics

- Keep diagnostic retention bounded.
- Existing persisted diagnostic records must remain loadable when they satisfy the prior schema.
- New optional fields/components must serialize/render deterministically.
- Diagnostic persistence failure must remain non-authoritative and must not change synchronization mutation/state semantics.
- Diagnostics must never be written into the vault sync namespace or Google Drive.

## 6. Ownership and Shared Contracts

### 6.1 Owned surfaces

You are the sole semantic owner of:

- shared diagnostic component taxonomy;
- shared diagnostic safe-field taxonomy;
- field meanings introduced by this task;
- deterministic path diagnostic-key behavior;
- sync-run correlation primitive exposed by `DiagnosticLogger`;
- diagnostic serialization/redaction behavior directly changed by this task.

### 6.2 Protected surfaces

Do not modify synchronization semantics in:

- `src/drive/transport.ts`;
- `src/drive/google-drive-port.ts`;
- planner/executor/state/recovery logic except compile-only call-site adjustments strictly required by your diagnostic contract;
- `src/product/runtime.ts`, `src/drive/runtime.ts`, or `src/main.ts` for downstream instrumentation wiring;
- release/build versioning.

If your proposed contract cannot be implemented without substantial changes to those protected surfaces, stop and report the incompatibility rather than expanding scope.

### 6.3 Frozen output contract

After supervisor approval, downstream agents may not independently:

- rename your component/field identifiers;
- change their meanings;
- weaken redaction;
- add convenience variants that create competing semantics;
- change serialization format for the same fields.

Design this foundation accordingly.

## 7. Architecture and Dependency Constraints

- Remain compatible with Obsidian desktop and mobile runtimes.
- Do not use Node-only APIs such as `AsyncLocalStorage`, filesystem logging, or server-side telemetry libraries.
- Do not add dependencies.
- Preserve the existing local `DiagnosticPersistence` abstraction and bounded storage model unless a tiny backward-compatible adjustment is directly required.
- Logging must not become a second durable synchronization-state authority.
- Logging must not participate in planner/executor authorization decisions.
- Logging must not throw into the synchronization path because a diagnostic record could not be persisted.
- Preserve deterministic rendering needed for later diagnostic-bundle export.

## 8. Required Implementation Work

1. Inspect the existing diagnostic logger, persistence shape, sanitization tests/callers, and actual sync-run begin/end usage.
2. Extend the diagnostic component and field contracts with the complete vocabulary required in Section 5.
3. Implement deterministic safe path-key generation using existing portable hashing.
4. Implement the minimal current-sync-run correlation primitive required by Section 5.4.
5. Update sanitization/serialization/parsing only as necessary to safely support the new contract while retaining old records.
6. Add/update focused tests proving the new contract, redaction rules, determinism, backward compatibility, retention, and run-correlation behavior.
7. Make only directly consequential diagnostic-only typing/call-site changes.
8. Reconcile the changed-file set and remove any accidental/generated files before evidence commit.

Do not begin consumer instrumentation.

## 9. Tests and Verification

### 9.1 Required focused verification

Add or update focused automated tests that prove at minimum:

- every required new safe field survives structured record/render/parse when given a valid scalar value;
- unknown/unapproved fields are dropped;
- sensitive assignments/tokens/authorization material remain redacted;
- URL query material is not retained;
- `pathKey` is deterministic and contains none of the original recognizable path text;
- prior-format persisted events still initialize/load correctly;
- new components/events render deterministically;
- sync-run current correlation is established and correctly cleared;
- diagnostics outside a run do not receive a fabricated run ID;
- retention remains bounded;
- persistence failure behavior remains non-authoritative.

### 9.2 Static/full checks

Run:

```text
npm run typecheck
npm test
```

Run `npm run build` if the implementation changed any production TypeScript imported by the shipped bundle; this task is expected to do so, therefore build should normally run.

For every filtered/focused test command, record the exact discovered/executed count and prove the filter was not a no-op.

If a required command is unavailable because of the execution environment, record `NOT AVAILABLE IN THIS SESSION`, explain why, run every safe substitute, and do not claim the unavailable gate passed.

### 9.3 Diff verification

Inspect the complete diff from `LOG01_BASE_SHA` to final HEAD. Verify every changed file is authorized by Sections 4 and 6 and that no unrelated code/test/document churn is present.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log01-observability-contract-foundation-01.md`

The evidence record must contain:

- agent identity and work-package ID `LOG-01`;
- task classification;
- exact base SHA;
- branch name;
- final implementation SHA;
- final evidence SHA if different;
- complete changed-file list;
- concise description of frozen components, fields, path-key semantics, run-correlation API, and compatibility behavior;
- commands executed;
- focused test names/counts/results;
- `npm run typecheck`, `npm test`, and build results;
- any unavailable verification and why;
- confirmation that no live Drive mutation occurred;
- confirmation that no secrets/file contents were introduced into diagnostic fixtures/evidence;
- limitations/deviations/blockers;
- exact stop state.

Commit implementation and evidence. Do not claim supervisory approval.

## 11. Prohibitions

- No live synchronization or Google Drive mutation.
- No B01 remediation or rerun.
- No B02–O or Stage 3 work.
- No release/tag/publication.
- No new telemetry service or network destination.
- No new dependency/package upgrade.
- No raw secrets, authorization headers, OAuth material, request bodies, or file contents in logging/tests/evidence.
- No raw vault-path persistence in structured diagnostics.
- No unrelated refactoring, renaming, formatting churn, or repository cleanup.
- No implementation of downstream `LOG-02` through `LOG-07` behavior.
- No merge into `phase6-integration`.
- No force push/rebase over the authorized base.

## 12. Hard-Stop Conditions

Stop implementation and return control to the supervisor if any of the following occurs:

- exact base cannot be established;
- material repository drift is discovered;
- target-system/manual/session authority conflicts materially;
- satisfying the required contract would require changing synchronization behavior;
- a required frozen semantic decision is missing;
- the needed implementation requires Node-only/runtime-incompatible machinery;
- safe logging would require persisting secrets, request bodies, or raw file content;
- implementation requires broad edits to protected Drive/execution/state/runtime composition surfaces;
- relevant tests reveal a pre-existing product defect outside this work package;
- required verification cannot be performed and no valid substitute can establish the assigned acceptance contract.

On hard stop:

- stop coding;
- preserve evidence;
- identify the exact blocker and affected files/contracts;
- report any safe partial work;
- do not improvise a workaround.

## 13. Completion and Return to Supervisor

This work package is complete only when:

- the complete shared structured-observability contract exists and is internally coherent;
- all required safety/redaction/correlation behavior is tested;
- required checks have passed or any unavailable mandatory check has caused a hard stop;
- the actual diff is bounded to authorized surfaces;
- evidence is committed;
- final SHAs are reported.

Then stop.

Do not begin `LOG-02`, `LOG-03`, `LOG-04`, `LOG-05`, `LOG-06`, or `LOG-07`. The supervisor must review this output, freeze the exact approved SHA, and explicitly authorize the next wave.
