# Phase 6 Logging Instrumentation — LOG-03 Google Drive Semantic Operation Tracing

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log03-drive-semantic-operation-tracing-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-03`
- Task classification: `IMPLEMENTATION / INTEGRATION CONSUMER`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> From the exact supervisor-approved integration of LOG-02, LOG-04, and LOG-05, instrument `GoogleDriveAdapter` at the semantic operation/observation level and perform the bounded production composition wiring needed to connect the already-approved diagnostic hooks. The resulting trace must make candidate creation, exact-ID observations, logical-path topology observations, predecessor retirement, convergence decisions, change-feed/reconciliation observations, and Drive mutation outcomes directly reconstructable without changing synchronization, Drive, retry, or recovery semantics.

This is semantic instrumentation and approved-hook wiring only. In particular, do not repair the current B01 predecessor-retirement behavior in this task.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`W1_INTEGRATED_BASE_SHA = <deferred: exact supervisor-approved integration of approved LOG-02 + LOG-04 + LOG-05 outputs>`

Required semantic predecessor state:

- exact approved LOG-01 frozen diagnostic contract;
- exact approved LOG-02 HTTP transport tracing;
- exact approved LOG-04 execution/durable-effect tracing;
- exact approved LOG-05 authority/state/recovery tracing;
- supervisor integration of those approved outputs with integrated checks completed.

Required branch:

`phase6-logging-log03-drive-semantic-operation-tracing`

Binding authority: supervisor only. Execution is prohibited until the exact integrated SHA is supplied.

Before editing:

1. Resolve `W1_INTEGRATED_BASE_SHA`.
2. Verify repository identity, exact HEAD, and clean working tree.
3. Create the required branch from exactly the bound SHA.
4. Confirm the expected approved LOG-01/02/04/05 diagnostic hooks are present and no incompatible duplicate schema exists.
5. Inspect `src/drive/google-drive-port.ts`, `src/drive/runtime.ts`, the relevant production composition in `src/product/runtime.ts`, `src/drive/obsidian-http.ts`, Drive protocol tests, and W1 instrumentation tests.
6. Reconstruct the current remote update path before touching it, including `updateExisting`, `finalizeExistingUpdate`, candidate upload/verification, `finalizeVerifiedUpdateCandidate`, predecessor trash, and logical-path candidate resolution.

Do not substitute a W1 branch, `phase6-integration`, `main`, or guessed integration state. Stop if the integrated state is semantically inconsistent or missing an approved W1 hook.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system Drive boundary, stable-ID, transfer integrity, retry-safe mutation, operation-commit, conflict/recovery, local-diagnostics, privacy, and mobile-runtime requirements.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. Logging-instrumentation session contract.
6. Approved frozen LOG-01 contract and approved W1 instrumentation interfaces.
7. This prompt.
8. Repository code/tests as current-state evidence.

The current B01 failure is diagnostic context only: a replacement candidate becomes live while the predecessor remains live, and existing logs cannot prove which Drive semantic branch caused the divergence. Do not fix that behavior here.

## 3. Temporal / Dependency Context

This is Wave `W2`, serial after the W1 parallel/integration gate.

Your input is one integrated SHA containing all approved W1 work. You are the first agent authorized to wire those optional diagnostic hooks through shared Drive/runtime composition.

After approval, the exact LOG-03 output becomes the sole input to LOG-06.

Completion does not authorize LOG-06 automatically, release, or live validation.

## 4. Scope

Primary in-scope surfaces:

- `src/drive/google-drive-port.ts`;
- `src/drive/runtime.ts`;
- bounded `src/product/runtime.ts` composition required to pass the existing `DiagnosticLogger` into approved transport/Drive/state/recovery instrumentation hooks;
- directly related Drive semantic protocol and composition tests;
- minimal semantic Drive diagnostic helpers if necessary.

Composition wiring must be mechanical consumption of approved hooks. Do not redesign W1 instrumentation during wiring.

Out of scope:

- changing HTTP retry/OAuth semantics from LOG-02;
- changing execution/durable-effect semantics from LOG-04;
- changing state/recovery semantics from LOG-05;
- diagnostic bundle/UI work;
- any B01/update algorithm repair;
- live Drive mutation.

## 5. Required Behavior

### 5.1 Semantic operation identity

For each relevant Drive semantic operation, emit bounded events using the frozen correlation contract so HTTP request IDs from LOG-02 can be understood in the context of higher-level operations when the architecture permits.

At minimum, semantic events must identify when available:

- current `runId`;
- `operationId`/`intentId`/`effectId` correlation supplied by the caller/descriptor;
- safe `pathKey`;
- current/predecessor/candidate `remoteObjectId` values;
- mutation/observation class;
- expected/observed revision;
- canonical content hash/size only where already used as synchronization evidence;
- result/reason/convergence status.

Do not persist raw paths or file contents.

### 5.2 Remote update causal trace — mandatory

The existing immutable-candidate update path must become fully observable without behavioral changes.

For `updateExisting` and `finalizeExistingUpdate`, record in causal order as applicable:

1. update/finalization entry with predecessor ID, reserved candidate ID, intended evidence summary, expected revision, and path key;
2. predecessor exact-ID observation result and observed revision/trashed state;
3. candidate pre-observation by exact ID and whether it exists;
4. candidate upload/session dispatch semantic start/result when creation is required;
5. candidate post-upload exact-ID observation and verification result;
6. predecessor post-candidate exact-ID observation;
7. entry to `finalizeVerifiedUpdateCandidate`;
8. candidate/predecessor revision/content/path verification decisions;
9. pre-retirement logical-path topology observation, including occupancy count and deterministic bounded occupant-ID representation;
10. exact branch selected if topology prevents retirement;
11. predecessor-retirement semantic dispatch start, associated predecessor object ID, and resulting HTTP/Drive classification available from the adapter call;
12. predecessor exact-ID post-retirement observation and `trashed` state;
13. post-retirement logical-path topology observation;
14. final convergence decision and exact outcome/reason.

The trace must let an investigator distinguish at least these live possibilities without source inference:

- retirement PATCH was never reached;
- retirement was reached but the transport returned failure/ambiguous outcome;
- retirement response was ambiguous but exact-ID re-observation proved `trashed=true`;
- retirement occurred but path listing still observed predecessor/candidate ambiguity;
- direct candidate GET succeeded while logical-path listing did not yet contain the candidate;
- an independent/third occupant caused conflict preservation;
- candidate content/revision/path verification failed.

Do not add waiting, retry, settling, polling, reordering, or new mutation to make any of these states converge.

### 5.3 Other Drive mutations

Add similarly bounded semantic tracing for existing:

- reserved file/folder creation and ID reservation;
- ordinary remote trash;
- identity-preserving move;
- managed-root creation/pairing validation where mutation/identity behavior matters;
- resumable upload semantic milestones without logging bytes/bodies;
- create/update recovery observation paths.

Do not log every byte/chunk. Record semantic start/result and bounded counts/size where useful.

### 5.4 Reconciliation and change-feed observations

Instrument existing Drive observation paths sufficiently to record:

- reconciliation enumeration start/result/completeness and entry count;
- change-page read start/result, change count, intermediate/terminal classification, safe cursor/checkpoint correlation allowed by LOG-01;
- logical-path candidate-resolution observations used for mutation/convergence decisions;
- relevant recovery-read classification.

Do not log raw entry lists, paths, file names, or change payloads.

### 5.5 Composition wiring

Wire the host's existing local `DiagnosticLogger` through the approved W1 seams so production runtime actually records:

- LOG-02 transport events;
- LOG-03 Drive semantic events;
- LOG-04 execution events using the approved existing/controller seam;
- LOG-05 state/recovery events.

The resulting composition must remain valid when diagnostics are absent in tests/no-op hosts and must remain desktop/mobile compatible.

Do not add new telemetry/network destinations.

### 5.6 Diagnostic non-authority

No diagnostic emission may:

- alter which Drive request is sent;
- alter request order/retry timing;
- alter update candidate/predecessor semantics;
- alter convergence classification;
- alter recovery/state results;
- turn an uncertain result into verified success;
- make synchronization dependent on diagnostic persistence.

## 6. Ownership and Shared Contracts

You own:

- semantic Drive diagnostic events in `google-drive-port.ts`;
- production wiring of approved observability hooks in `drive/runtime.ts` and the minimum necessary `product/runtime.ts` composition.

You consume read-only:

- LOG-01 field/component/redaction contract;
- LOG-02 transport instrumentation API;
- LOG-04 execution instrumentation API;
- LOG-05 state/recovery instrumentation API.

Do not rewrite those peer implementations. If W1 integration exposed an incompatible hook, stop and report the integration defect.

`src/main.ts` and final bundle/export UI remain protected for LOG-06.

## 7. Architecture and Dependency Constraints

- No new dependency.
- All required behavior must work with Obsidian `requestUrl` and mobile runtime constraints.
- Keep logger dependencies optional/bounded where current test composition requires it.
- Use LOG-01 path keys; never raw path names.
- Use LOG-02 transport events for HTTP-level facts rather than duplicating full HTTP traces at the semantic layer.
- Semantic events should describe intent/observation/decision, not payload data.
- Do not create a second event buffer or persistence mechanism.
- Preserve all existing Drive method signatures/behavior unless a diagnostic-only optional parameter is required and backward compatible.

## 8. Required Implementation Work

1. Verify W1 integration and approved hooks.
2. Add the logger/diagnostic sink to `GoogleDriveAdapter` using the frozen contract.
3. Instrument remote update/finalization exactly as required in Section 5.2.
4. Instrument other material Drive mutations and bounded reconciliation/change-feed observations.
5. Wire LOG-02/03/05 diagnostic dependencies through `createObsidianGoogleDriveBoundary` and `ProductRuntime`; preserve existing LOG-04 controller/execution wiring and connect only what its approved API requires.
6. Add focused semantic Drive tests, including deliberately divergent direct-ID versus path-list observations.
7. Add composition tests proving the production boundary receives one shared logger and emits cross-layer correlated evidence without new network destinations.
8. Reconcile changed files and ensure no synchronization behavior change slipped into the diff.

## 9. Tests and Verification

Focused tests must prove at minimum:

- successful create/move/trash/update semantic operations emit safe correlated events;
- remote update trace contains predecessor/candidate IDs, exact-ID observations, topology observations, retirement dispatch/re-observation, and convergence result when those stages occur;
- **delayed list visibility scenario:** candidate exact-ID GET is verified while pre-retirement path listing does not yet expose the candidate; trace proves the exact branch taken and whether predecessor retirement was reached, while existing production outcome remains unchanged;
- **retirement failure/ambiguous scenario:** retirement is reached and the trace distinguishes transport result from post-observation physical state;
- **delayed post-trash listing scenario:** exact predecessor observation and path topology can disagree and the trace captures both without changing behavior;
- independent third occupant is explicitly distinguishable from expected predecessor/candidate topology;
- reconciliation/change-page summaries contain counts/completeness but no raw paths/payloads;
- raw file names/paths, request/response bodies, secrets, and OAuth material do not appear;
- integrated runtime wiring emits LOG-02/03/04/05 events through the same logger/correlation plane;
- instrumentation does not alter returned Drive outcomes or request sequence.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Record non-zero focused counts. Inspect the complete diff from resolved `W1_INTEGRATED_BASE_SHA` and explicitly verify no B01 algorithm/retry/recovery change occurred.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log03-drive-semantic-operation-tracing-01.md`

Include:

- identity/work-package/task type/Wave `W2`;
- exact resolved integrated base SHA and confirmation it contains approved LOG-02/04/05 outputs;
- branch and final implementation/evidence SHAs;
- complete changed-file list;
- semantic Drive stages instrumented;
- production composition wiring performed;
- focused scenario names/counts/results, especially the direct-GET/path-LIST divergence and predecessor-retirement discriminators;
- full typecheck/test/build/diff-check results;
- limitations/unavailable checks;
- explicit statement that B01/update/Drive/retry/recovery semantics were not changed;
- explicit statement that no secrets/raw paths/file contents/bodies were logged;
- explicit statement no live Drive mutation occurred;
- exact stop state.

Commit implementation and evidence. Do not claim supervisor approval.

## 11. Prohibitions

- No live Drive mutation or B01 rerun/remediation.
- No fix, settle loop, delay, retry, or reorder for the current predecessor-retirement defect.
- No LOG-01 schema change.
- No redesign of LOG-02/04/05 approved instrumentation.
- No raw paths/file names/content/request bodies/response bodies/secrets in diagnostics.
- No diagnostic bundle/UI command implementation.
- No dependency changes or unrelated refactoring.
- No release/merge/B02–O/iPhone/Stage 3 work.

## 12. Hard-Stop Conditions

Stop if:

- integrated base binding is unresolved or incorrect;
- expected approved W1 hooks are missing/incompatible;
- material drift invalidates the prompt;
- accurate semantic tracing requires changing Drive synchronization behavior;
- frozen LOG-01 contract cannot represent a required fact;
- composition would require a new network/telemetry dependency;
- safe tracing would require raw content/secrets;
- unexpected ownership conflict exists;
- mandatory verification cannot be completed;
- unexplained changes appear.

Return the exact blocker instead of implementing a workaround.

## 13. Completion and Return to Supervisor

Return the resolved W1 integrated base SHA, branch, implementation/evidence SHAs, changed files, focused/full verification results, and a concise statement of which Drive mutation/observation branches can now be distinguished from one trace. Then stop for supervisory review.

Do not begin LOG-06, release, or live validation.