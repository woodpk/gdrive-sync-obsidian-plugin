# Phase 6 Logging Instrumentation — LOG-01 Observability Contract Foundation

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log01-observability-contract-foundation-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-01`
- Task classification: `IMPLEMENTATION — SHARED CONTRACT FOUNDATION`
- Prompt maturity: `EXECUTION-READY`

Assignment:

> Evolve the existing local `DiagnosticLogger` into the frozen structured-observability contract for the Phase 6 logging-instrumentation session: define the safe event/component/field vocabulary, causal-correlation primitives, deterministic path-privacy helper, bounded rendering/persistence semantics, and focused tests required by all later transport, Drive, execution, state/recovery, and diagnostic-bundle instrumentation while preserving current diagnostic compatibility and synchronization semantics.

This task owns the shared observability contract only. Do not implement the later consumer instrumentation.

## 1. Base / Drift Gate

Use exactly:

`LOG01_BASE_SHA = 9385e19fc021005b45e5046a3b5e074e10965e26`

Required branch:

`phase6-logging-log01-observability-foundation`

Before modifying anything:

1. Verify repository identity is `woodpk/gdrive-sync-obsidian-plugin`.
2. Check out exactly `LOG01_BASE_SHA` and verify `HEAD` equals it.
3. Verify the working tree is clean before creating the task branch.
4. Create the required branch from exactly `LOG01_BASE_SHA`.
5. Inspect `src/diagnostics/diagnostic-logger.ts`, directly related diagnostic persistence/export helpers, focused diagnostic tests, and the existing sync-run begin/end call sites necessary to preserve compatibility.

Do not substitute `phase6-integration`, `main`, a newer branch tip, a later tasking-document commit, or any approximate predecessor. The tasking documents were published after this implementation baseline; their publication commits are not implementation authority.

If the exact base cannot be established or material product-code drift exists relative to the supplied task, stop and report it.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. `BRAIN Google Drive Sync Plugin — Target-System Specification`, especially mobile-safe runtime behavior, local diagnostics, content minimization, no external telemetry by default, state diagnostic export, explainability, and synchronization safety invariants.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. The Phase 6 logging-instrumentation session contract supplied with this task.
6. This prompt.
7. Repository implementation/tests as current-state evidence.

The supervisor-owned architectural decision is frozen: extend the existing local `DiagnosticLogger`; do not introduce a second logger, telemetry service, or external observability backend.

## 3. Temporal / Dependency Context

This is Wave `W0`, the serial foundation of a mixed-temporal session.

- There is no predecessor implementation work package.
- `LOG-02`, `LOG-04`, and `LOG-05` are preplanned parallel consumers of the exact supervisor-approved output of this work package.
- Those consumers must treat your approved schema, field meanings, path-privacy rules, and correlation semantics as frozen.
- The supervisor performs review and later integration.
- Completion of `LOG-01` does not authorize any downstream work automatically.

Your output must therefore be coherent enough that three independent consumers can use it without redesigning shared semantics.

## 4. Scope

In scope:

- `src/diagnostics/diagnostic-logger.ts`;
- narrowly necessary new shared diagnostic contract/helper files under `src/diagnostics/`;
- focused tests proving the shared contract;
- directly consequential diagnostic-only typing/call-site adjustments required to keep existing diagnostics compiling and compatible.

The required result is one backward-compatible structured diagnostic contract that later agents can consume for:

- component taxonomy;
- safe field names and meanings;
- causal IDs;
- deterministic path correlation without raw path retention;
- safe string sanitization/redaction;
- deterministic rendering/parsing;
- bounded local retention;
- current synchronization-run correlation.

Out of scope:

- Google HTTP request tracing;
- Google Drive semantic-operation tracing;
- executor/durable-effect tracing;
- state/CAS/recovery tracing;
- diagnostic-bundle UI/export construction;
- any synchronization behavior repair;
- live testing or Drive mutation.

## 5. Required Behavior

### 5.1 Single local logging plane

The existing `DiagnosticLogger` remains the single structured diagnostic plane. Preserve existing public behavior and persisted records where safely possible. Do not create a competing event store.

### 5.2 Frozen causal vocabulary

The approved contract must be able to describe this chain:

`run -> plan -> operation -> durable intent -> effect -> Drive request -> semantic observation -> convergence -> state/CAS transition -> recovery/commit -> final result`

At minimum, provide stable safe fields or equivalent bounded typed representation for these meanings:

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
- deterministic bounded occupant-ID representation
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
- `verificationEvidenceRef`

Preserve useful existing fields and meanings. Do not silently repurpose prior fields.

### 5.3 Component taxonomy

Extend the component vocabulary only as needed to clearly separate:

- Google HTTP transport;
- semantic Google Drive operations;
- synchronization execution/durable effects;
- authoritative state/CAS;
- durable recovery;
- diagnostic bundle/export.

Choose concise names consistent with the existing style. Once approved, these names and meanings are frozen for later consumers.

### 5.4 Synchronization-run correlation

Preserve existing explicit `sync*` APIs and provide the smallest mobile-safe way for nested instrumentation to discover the currently active synchronization run when one exists.

Required semantics:

- `beginSyncRun` establishes current run correlation;
- ending the exact run removes its authority without corrupting a different active run;
- diagnostics outside a synchronization run do not manufacture a run ID;
- correlation state is diagnostic only and cannot alter synchronization behavior;
- do not use Node-only async-context APIs.

### 5.5 Deterministic path privacy

Provide an exported deterministic helper that converts a logical/path string into an opaque diagnostic `pathKey`.

It must:

- never contain the original path text;
- normalize consistently before hashing;
- return the same value for the same normalized path across runs;
- use portable existing hashing utilities rather than Node-only crypto;
- require no secret key;
- be sufficiently collision-resistant for diagnostic correlation.

Raw vault paths must not be persisted in the new structured trace.

### 5.6 Secret/content safety

Retain and strengthen the allowlisted structured-field boundary. Diagnostics must redact, reject, or omit:

- bearer/authorization material;
- OAuth access/refresh tokens;
- client secrets;
- authorization code/state and PKCE material;
- cookies/password-like values;
- raw URLs containing query parameters;
- request/response bodies;
- raw note/binary contents.

Do not add arbitrary-object logging that can bypass the allowlist. Safe string fields must continue through sanitization/truncation.

### 5.7 Persistence and compatibility

- Retention remains bounded.
- Existing valid persisted events remain loadable.
- New fields/components render deterministically.
- Diagnostic persistence is local and outside the synchronized vault/Drive domain.
- A persistence/export failure must not become synchronization authority or change mutation/state behavior.

## 6. Ownership and Shared Contracts

You are the sole semantic owner of:

- shared diagnostic component names introduced here;
- shared safe-field names and meanings;
- deterministic path-key semantics;
- synchronization-run diagnostic correlation primitive;
- diagnostic serialization/redaction behavior changed by this task.

Protected surfaces:

- `src/drive/transport.ts`;
- `src/drive/google-drive-port.ts`;
- synchronization planner/executor/state/recovery semantics;
- `src/drive/runtime.ts` and `src/product/runtime.ts` composition wiring;
- `src/main.ts` operator commands;
- release/version files.

A tiny compile-only adjustment outside the owned diagnostic surface is allowed only when directly forced by the contract change and must be listed in evidence. If substantial protected-surface changes are required, stop.

After supervisor approval, later agents may consume but may not redefine this contract.

## 7. Architecture and Dependency Constraints

- Remain compatible with Obsidian desktop and mobile/iOS.
- Do not add dependencies.
- Do not use Node filesystem logging, Electron-only facilities, `AsyncLocalStorage`, or external telemetry libraries.
- Preserve the existing local `DiagnosticPersistence` abstraction unless a small backward-compatible change is required for this contract.
- Logging cannot become a synchronization-state persistence channel.
- Logging cannot participate in planner/executor decisions.
- Preserve deterministic, machine-readable rendering suitable for later bundle export.
- Avoid high-volume per-byte/per-chunk logging at the foundation layer; downstream consumers will emit bounded semantic events.

## 8. Required Implementation Work

1. Inspect the existing logger, persisted event shape, sanitization/parsing/rendering logic, and sync-run lifecycle usage.
2. Extend the component and safe-field contracts with the frozen vocabulary required above.
3. Add the deterministic path-key helper using portable existing hash support.
4. Add the minimum current-sync-run correlation API required by Section 5.4.
5. Preserve backward compatibility for valid prior persisted events.
6. Add focused tests for field allowlisting, redaction, path privacy/determinism, correlation, parsing/rendering, retention, and persistence-failure non-authority.
7. Make only directly consequential diagnostic typing/call-site changes.
8. Reconcile the changed-file set and remove accidental/generated changes before evidence.

Do not instrument downstream subsystems in this task.

## 9. Tests and Verification

Focused tests must prove at minimum:

- every required new safe field can be recorded/rendered with valid scalar/bounded values;
- unknown fields are dropped;
- sensitive authorization/token/PKCE/password-like material is redacted;
- raw URL query material is not retained;
- `pathKey` is deterministic and does not contain recognizable source path fragments;
- prior valid persisted events still load;
- new components/events render deterministically;
- current-run correlation is established and cleared correctly;
- diagnostics outside a run do not gain a fabricated run ID;
- retention remains bounded;
- diagnostic persistence failure does not change synchronization semantics or throw a new authoritative result.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

For focused filters, record non-zero discovered/executed counts. If a mandatory check is unavailable in the execution environment, identify it, explain why, run valid substitutes, and do not claim it passed.

Inspect the full diff from `LOG01_BASE_SHA` to final HEAD and verify every changed file is authorized.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log01-observability-contract-foundation-01.md`

The evidence record must include:

- agent/work-package identity and task type;
- temporal wave `W0`;
- exact resolved base SHA and branch;
- final implementation SHA;
- final evidence SHA if different;
- complete changed-file list;
- frozen component names/field vocabulary and any helper APIs introduced;
- path-key semantics;
- run-correlation semantics;
- compatibility/redaction behavior;
- exact commands executed;
- focused test names/counts/results;
- typecheck/full test/build/diff-check results;
- unavailable checks and limitations;
- confirmation no live Drive mutation occurred;
- confirmation no secrets/raw file contents were placed in diagnostics, fixtures, or evidence;
- exact stop state.

Commit implementation and evidence. Evidence is not self-approval.

## 11. Prohibitions

- No live synchronization or Google Drive mutation.
- No B01 repair or rerun.
- No B02–O, iPhone validation, or Stage 3.
- No release/tag/publication.
- No external telemetry or new network destination.
- No new package/dependency.
- No raw secrets, authorization material, request/response bodies, or file contents in diagnostics/tests/evidence.
- No raw vault-path retention in the new structured trace.
- No unrelated refactoring, renaming, formatting churn, or cleanup.
- No downstream `LOG-02` through `LOG-07` implementation.
- No merge into `phase6-integration`.
- No force push or base substitution.

## 12. Hard-Stop Conditions

Stop and return control if:

- exact base cannot be established;
- material repository drift invalidates the prompt;
- governing authorities materially conflict;
- the required contract would require changing synchronization behavior;
- a shared semantic decision remains unresolved;
- the design would require Node-only/mobile-incompatible machinery;
- safe observability would require persisting secrets, raw request bodies, or raw file contents;
- implementation requires substantial edits to protected Drive/execution/state/runtime surfaces;
- required verification cannot run and is mandatory for completion;
- unexplained repository changes appear.

Preserve evidence of any safe partial work and identify the exact blocker; do not improvise around it.

## 13. Completion and Return to Supervisor

Completion requires:

- the shared observability contract is implemented and focused tests pass;
- required broader checks are complete or explicitly blocked as defined above;
- actual changes match authorized ownership;
- evidence is committed;
- no known blocker remains;
- no prohibited action occurred.

Report the exact branch, base SHA, implementation SHA, evidence SHA if different, changed files, verification results, and frozen contract summary. Then stop for supervisory review.

Do not begin `LOG-02`, `LOG-04`, `LOG-05`, integration, release, or live validation.