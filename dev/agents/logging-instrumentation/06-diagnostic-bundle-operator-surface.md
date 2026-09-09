# Phase 6 Logging Instrumentation — LOG-06 Diagnostic Bundle and Operator Surface

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log06-diagnostic-bundle-operator-surface-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-06`
- Task classification: `INTEGRATION / IMPLEMENTATION`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> Build one bounded, privacy-safe diagnostic bundle and one obvious Obsidian operator command that exports the integrated LOG-01 through LOG-05 observability state in a single deterministic artifact: build/runtime identity, sanitized configuration/state authority, recent structured causal trace, and bounded audit/attention context. The bundle must be sufficient for a human or coding agent to reconstruct a synchronization failure without separately copying multiple diagnostic surfaces, while remaining local-only and without changing synchronization behavior.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`LOG06_BASE_SHA = <deferred: exact supervisor-approved LOG-03 output SHA>`

Required semantic predecessor state:

- approved LOG-01 shared observability contract;
- approved/integrated LOG-02 HTTP transport trace;
- approved LOG-04 execution/durable-effect trace;
- approved LOG-05 state/recovery trace;
- approved LOG-03 semantic Drive trace and production composition wiring.

Required branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

Binding authority: supervisor only. Execution is prohibited until the exact approved LOG-03 SHA is supplied.

Before editing:

1. Resolve and verify `LOG06_BASE_SHA`, repository identity, exact HEAD, and clean working tree.
2. Create the required branch from exactly that SHA.
3. Verify the integrated runtime actually contains one shared diagnostic plane spanning transport, Drive, execution, and state/recovery.
4. Inspect `src/main.ts`, `src/diagnostics/diagnostic-logger.ts`, `src/diagnostics/share-export.ts`, `src/product/runtime.ts`, `src/product/plugin-data.ts`, audit/attention read APIs, and focused export tests.
5. Inspect the exact current synchronization-state/audit/attention shapes before designing their safe bundle projection.

Do not substitute a later branch tip or approximate predecessor. Stop if integrated observability is incomplete or incompatible.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system requirements for local diagnostics, user-accessible diagnostic/state export, content minimization, no external telemetry, secret exclusion, mobile compatibility, and explainability.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. Logging-instrumentation session contract.
6. Approved LOG-01 through LOG-03/04/05 observability contracts and implementations.
7. This prompt.
8. Repository code/tests as current-state evidence.

## 3. Temporal / Dependency Context

This is Wave `W3`, serial after LOG-03 approval.

This work package is the integration owner for the **operator-facing export surface**, not for synchronization internals. It consumes the approved integrated trace; it must not redesign its event schema or mutate prior instrumentation semantics.

The exact approved LOG-06 output will become the sole input to LOG-07 final adversarial verification.

Completion does not authorize LOG-07 automatically or any live B01 run.

## 4. Scope

In scope:

- a new focused diagnostic-bundle module under `src/diagnostics/`;
- `src/main.ts` command wiring for one obvious command named `Copy diagnostic bundle` or equivalent clear wording;
- narrowly necessary read/export methods in `src/product/runtime.ts`;
- existing diagnostic/share-export helper changes directly required for clipboard export;
- explicit privacy-safe projections of current authority/state, audit, and attention records;
- focused bundle/export/operator tests.

Out of scope:

- changing LOG-01 event schema/field meanings unless a true approved-contract defect is discovered, which is a hard stop;
- changing HTTP/Drive/execution/state/recovery behavior;
- adding external telemetry, file upload, server, dashboard, or remote collector;
- automatic support submission;
- live synchronization or Drive mutation.

## 5. Required Behavior

### 5.1 One deterministic bundle

Provide one deterministic, versioned, machine-readable bundle format. Prefer a single JSON document unless repository constraints make another equally deterministic format demonstrably better.

The bundle must contain explicit sections for:

- `bundleSchemaVersion` and generation timestamp;
- best available installed build identity that is safely available cross-platform, including plugin ID/version and platform/runtime information; do not invent a git SHA or file hash that the runtime cannot actually establish;
- sanitized configuration/runtime readiness summary using booleans/enums rather than OAuth/client/redirect secret-bearing values;
- sanitized current authoritative synchronization-state summary;
- retained structured diagnostic events in chronological/sequence order;
- bounded audit-history summary/projection;
- bounded synchronization-attention summary/projection;
- a compact causal/correlation index or failure-focused summary that makes available run/plan/operation/intent/effect/request relationships easy to locate without changing the underlying evidence.

The bundle is evidence, not synchronization authority.

### 5.2 Sanitized authority/state projection

Do not embed the existing raw state export directly because current authority structures can contain logical paths and other unnecessary metadata.

Construct an explicit allowlisted projection sufficient to diagnose synchronization state. When the corresponding state is available, include safely:

- state load/status classification;
- schema/authority version;
- state/persistence revision and semantic generation;
- device/vault identity only if the approved LOG-01 privacy contract permits the existing stable IDs; otherwise use safe diagnostic identities;
- BASE entries as `pathKey`, entity kind, remote object ID, content hash/size/revision when present;
- remote mappings as `pathKey`, object ID, entity kind;
- tombstone/path-convergence summaries using `pathKey` and safe authority facts;
- outstanding operation intents: operation/intent IDs, semantic generation, effect IDs/stages, and a sanitized descriptor summary sufficient to identify mutation kind, target side, predecessor/candidate/current object identities, expected revision, and intended evidence without raw path/content;
- learned remote batch/reduction counts and safe checkpoint/cursor facts;
- local-transaction counts/stage summaries where relevant.

Do not serialize raw vault paths, file names, full state envelopes, request bodies, or note content.

### 5.3 Structured trace inclusion

Before bundle construction:

- ensure pending diagnostic persistence is flushed or otherwise obtain a current in-memory snapshot according to the approved LOG-01 API;
- include the retained events in deterministic sequence order;
- preserve their existing structure rather than converting them into prose;
- do not silently drop error/trace events required for causal reconstruction;
- keep total bundle size bounded by the approved logger retention and bounded state/audit/attention projections.

Do not clear the log as part of export.

### 5.4 Causal index / failure-focused summary

Add a deterministic derived index or summary that helps an investigator navigate the raw evidence. It may summarize, for example:

- retained run IDs and their sequence ranges;
- plan/operation/intent/effect/request IDs observed for each run;
- last terminal/failure classification per run/operation;
- outstanding durable intent IDs/stages at export time;
- last known semantic/persistence revisions;
- attention/error counts.

This derived section must never claim facts not supported by the raw structured events/current state. It is an index, not an inference engine.

### 5.5 Audit and attention privacy

Inspect actual audit/attention structures. Include only explicitly safe fields required for diagnostics. Transform any raw path to `pathKey`; omit human note content/free-text that may contain vault content or sensitive data. Do not blindly spread/serialize existing records.

### 5.6 Operator command

Add one obvious command:

`Copy diagnostic bundle`

Required behavior:

- available through the normal Obsidian command registration path;
- obtains the current integrated bundle;
- writes it to the clipboard using existing platform-safe mechanisms;
- shows a success/failure Notice consistent with existing UX;
- does not trigger synchronization, reconciliation, authentication, or Drive access solely for export;
- does not clear diagnostics;
- remains usable on supported desktop/mobile runtimes when clipboard capability exists.

Existing lower-level diagnostic commands may remain for compatibility unless removing them is explicitly required, which it is not in this task.

### 5.7 Export failure safety

A bundle/export failure must:

- surface as an operator-facing diagnostic/export error;
- not mutate synchronization state;
- not trigger recovery or Drive work;
- not corrupt/clear retained diagnostics.

## 6. Ownership and Shared Contracts

You own:

- bundle schema/serialization and explicit safe projections;
- operator-facing `Copy diagnostic bundle` command;
- minimum runtime read/export wiring required for that bundle.

You consume read-only:

- approved LOG-01 field/component/redaction/path-key contract;
- approved LOG-02/03/04/05 event semantics.

Protected:

- transport/Drive/execution/state/recovery synchronization semantics;
- event meanings already frozen/approved;
- release/version packaging.

If the integrated instrumentation lacks a required factual event, do not fabricate it in the bundle. Stop and report the upstream observability gap.

## 7. Architecture and Dependency Constraints

- Add no dependency.
- Remain mobile-safe; do not depend on Node filesystem/zip/process APIs.
- Keep export local to clipboard/share mechanisms already present in the plugin; no remote submission endpoint.
- Use explicit allowlisted projections, never recursive “sanitize arbitrary object” of authoritative state.
- Bundle generation must be bounded by existing retained data; do not crawl the vault or Drive during export.
- Do not read file content to enrich diagnostics.
- Preserve deterministic ordering of arrays/maps where practical for machine comparison.
- A bundle may be large enough to contain retained structured events but must not grow without the existing bounded retention limits.

## 8. Required Implementation Work

1. Inspect the integrated logger/runtime/state/audit/attention APIs and exact data shapes.
2. Define a versioned deterministic bundle type/schema in a focused diagnostics module.
3. Implement explicit safe state/audit/attention projection using the LOG-01 path-key/redaction contract.
4. Include the current retained structured trace after the appropriate diagnostic flush/snapshot step.
5. Build a deterministic correlation/failure index strictly derived from included evidence.
6. Add a runtime method to construct/export the bundle without causing synchronization or Drive reads.
7. Register `Copy diagnostic bundle` in `src/main.ts` and use existing clipboard/Notice patterns.
8. Add focused tests for completeness, deterministic ordering, privacy, boundedness, export failure safety, and operator wiring.
9. Reconcile the changed-file set and verify no synchronization logic changed.

## 9. Tests and Verification

Focused tests must prove at minimum:

- bundle includes build/runtime summary, sanitized authority state, structured trace, audit/attention safe projections, and correlation index;
- a synthetic update with run/operation/intent/effect/request events can be followed through the bundle by identifiers and sequence order;
- outstanding durable intent stage/generation/remote identities are represented safely when present;
- raw vault paths/file names from BASE/mappings/audit/attention do not appear and corresponding `pathKey` values do;
- OAuth tokens/client secrets/authorization headers/PKCE material/raw URLs/query strings/request bodies/file contents injected into candidate inputs do not appear;
- diagnostic events remain in sequence order and are not cleared by export;
- bundle generation performs no Drive request and no synchronization action;
- clipboard success/failure behavior is bounded and does not mutate state;
- bundle output is deterministic for equivalent fixed-time/test inputs except explicitly variable generation timestamp;
- output remains bounded by retained event/state/audit/attention inputs.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Record focused non-zero counts and inspect the complete diff from resolved `LOG06_BASE_SHA`.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`

Include:

- identity/work-package/task type/Wave `W3`;
- exact resolved LOG-03 base SHA;
- branch and final implementation/evidence SHAs;
- complete changed-file list;
- bundle schema/version and included sections;
- explicit safe-state/audit/attention projection description;
- operator command behavior;
- focused test names/counts/results including privacy tests;
- full typecheck/test/build/diff-check results;
- limitations/unavailable checks;
- statement that bundle export performs no Drive/sync mutation;
- statement that no raw paths/content/secrets are included;
- exact stop state.

Commit implementation and evidence. Do not claim supervisor approval.

## 11. Prohibitions

- No live sync/Drive access required for bundle export.
- No B01 rerun/remediation.
- No synchronization-state or algorithm change.
- No LOG-01 schema redefinition.
- No modification of approved LOG-02/03/04/05 event meanings.
- No raw state dump or raw audit/attention serialization.
- No raw vault paths/file names/content/secrets/request bodies in the bundle.
- No remote telemetry/upload/support endpoint.
- No new dependency or unrelated refactor.
- No release/merge/B02–O/iPhone/Stage 3 work.

## 12. Hard-Stop Conditions

Stop if:

- deferred base is unresolved/mismatched;
- integrated prior observability is incomplete or materially incompatible;
- a required fact cannot be represented without changing an upstream frozen contract;
- safe bundle construction would require raw secret/content persistence;
- export would require crawling Drive/vault or changing synchronization behavior;
- mobile compatibility would be lost;
- unexpected ownership overlap appears;
- mandatory verification cannot be completed;
- unexplained repository changes appear.

Report the exact upstream gap or blocker; do not manufacture evidence.

## 13. Completion and Return to Supervisor

Return the exact base, branch, implementation/evidence SHAs, changed files, bundle schema/sections, privacy guarantees, command behavior, and focused/full verification results. Then stop for supervisory review.

Do not begin LOG-07, publish a release, or run B01.