# Phase 6 Logging Instrumentation — LOG-02 Google HTTP Transport Tracing

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log02-google-http-transport-tracing-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-02`
- Task classification: `IMPLEMENTATION`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> Instrument `GoogleHttpTransport` with the frozen LOG-01 structured-observability contract so every Google Drive HTTP request can be reconstructed across request start, retry attempts, response/failure classification, backoff decision, and final outcome using safe endpoint classes and correlation IDs, without logging credentials/bodies/raw query URLs or changing request, retry, authentication, or synchronization semantics.

This task owns raw Google HTTP transport tracing only. It does not own semantic Drive-operation tracing or composition wiring.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`COMMON_BASE_SHA = <deferred: exact supervisor-approved LOG-01 output SHA>`

Required semantic predecessor:

> The exact supervisor-approved `LOG-01` output that freezes the shared diagnostic components, safe fields, path-key semantics, correlation primitives, serialization, and redaction contract.

Required branch:

`phase6-logging-log02-google-http-transport-tracing`

Binding authority: supervisor only.

Execution is prohibited until `COMMON_BASE_SHA` is replaced or authoritatively supplied with the exact approved SHA.

Before modifying anything:

1. Resolve `COMMON_BASE_SHA` from the supervisor.
2. Verify repository identity.
3. Check out exactly that SHA and verify `HEAD` equals it.
4. Verify a clean working tree.
5. Create the required branch from exactly `COMMON_BASE_SHA`.
6. Inspect `src/drive/transport.ts`, `src/drive/obsidian-http.ts`, directly related transport/auth tests, and the frozen LOG-01 diagnostic contract.

Do not substitute `phase6-integration`, `main`, another W1 branch, a branch tip, or a guessed SHA. If the supplied LOG-01 contract differs materially from the assumptions in this prompt, stop for supervisor reconciliation rather than redefining it.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system requirements for mobile-safe Drive I/O, bounded retry/backoff, least-privilege authentication, local-only diagnostics, secret exclusion, and non-authoritative logging.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. The logging-instrumentation session contract.
6. The exact approved LOG-01 frozen observability contract.
7. This prompt.
8. Repository code/tests as implementation evidence.

Do not reinterpret retry, OAuth, or Drive semantics in the course of adding diagnostics.

## 3. Temporal / Dependency Context

This is Wave `W1`, parallel with:

- `LOG-04` sync execution/durable-effect tracing;
- `LOG-05` authority/state/recovery tracing.

All three W1 agents must start from the same exact approved LOG-01 SHA and consume the LOG-01 contract read-only.

Your exclusive W1 semantic surface is Google HTTP transport tracing. Shared runtime composition is deferred to `LOG-03` after W1 integration.

The supervisor will independently review W1 outputs, integrate only approved SHAs, run integrated checks, and freeze one exact W1 integration SHA. Local completion is not W1/session approval.

## 4. Scope

In scope:

- `src/drive/transport.ts`;
- directly related transport tests;
- a narrowly necessary transport-local endpoint-classification helper if keeping it separate improves clarity;
- a backward-compatible optional diagnostic dependency or sink on `GoogleHttpTransport` so the module remains constructible before later composition wiring;
- minimal compile-only test-helper changes required by the optional dependency.

Out of scope:

- `src/drive/google-drive-port.ts` semantic Drive operation logging;
- `src/drive/runtime.ts` production composition wiring;
- `src/product/runtime.ts`;
- executor/state/recovery instrumentation;
- diagnostic bundle/UI;
- any retry-policy or OAuth behavior change;
- any B01 repair.

## 5. Required Behavior

### 5.1 One causal request identity

Every logical call to `GoogleHttpTransport.request()` must receive one safe `requestId` that remains stable across all automatic retry attempts for that call.

Each attempt must record enough frozen LOG-01 fields to reconstruct:

- current `runId` when one exists;
- `requestId`;
- `attemptNumber` and `maxAttempts`;
- HTTP method;
- safe `endpointClass`;
- whether automatic replay is allowed for this request;
- attempt start/end timing or latency;
- HTTP status when a response exists;
- final Drive signal/classification when the transport returns failure;
- retry decision and bounded retry delay when another attempt will occur;
- safe provider request identifier only from explicitly allowlisted response headers when present.

Do not create a new correlation schema; use the frozen LOG-01 fields/helpers.

### 5.2 Safe endpoint classification

Never persist the raw URL or query string.

Implement a deterministic safe endpoint classifier sufficient to distinguish relevant transport classes without retaining file names, query parameters, tokens, or other URL content. It must distinguish at least the categories actually used by this repository, such as:

- Drive `about`;
- file metadata `get`;
- file `list/search`;
- file metadata `patch`;
- file metadata/create operations;
- generated-ID requests;
- change-feed requests;
- resumable upload session creation;
- resumable upload status/chunk calls;
- an explicit safe fallback class for an unrecognized Google Drive endpoint.

Do not place Drive object IDs in `endpointClass`; semantic object identity is logged separately by `LOG-03`.

### 5.3 Retry observability without behavior change

Instrument the existing retry state machine exactly as it exists.

The trace must make visible:

- whether a request is replay-safe under the existing policy;
- network exception versus HTTP response failure;
- 401 access-token invalidation/retry behavior;
- 404, 409/412, 410, quota exhaustion, rate limiting, permission denial, 5xx, and generic failure classification;
- retry count and chosen delay;
- use of `Retry-After` when the current implementation honors it;
- final retry-budget exhaustion when applicable.

Do not change:

- `DEFAULT_RETRY_POLICY`;
- what methods are considered replay-safe;
- maximum attempts;
- delay calculation;
- semaphore concurrency;
- OAuth invalidation rules;
- Drive signal mapping.

### 5.4 Timing

Record bounded latency information using a portable monotonic clock or the frozen diagnostic timing facility. Diagnostic timing must not alter sleep/retry behavior and must remain testable with injected clocks/sleepers already present in the transport design.

### 5.5 Secret and content boundary

Never log:

- `Authorization` header or bearer token;
- any request header value except an explicitly safe, non-secret classification fact;
- request body;
- response body;
- raw URL/query string;
- access/refresh token;
- OAuth client secret;
- file content.

Provider request IDs may be captured only from an explicit small allowlist of known safe response-header names and must pass through LOG-01 sanitization.

### 5.6 Non-authoritative failure behavior

Diagnostic recording must not:

- add a new failure return;
- consume/replace an existing Drive response;
- throw into the request path because logging failed;
- alter retries or delays;
- change semaphore release behavior.

## 6. Ownership and Shared Contracts

Owned surface:

- transport-level diagnostic events and endpoint classification in `src/drive/transport.ts` and transport-focused tests.

Frozen/read-only shared contract:

- LOG-01 diagnostic component/field names;
- redaction/sanitization semantics;
- path-key/correlation helpers;
- rendering format.

Protected W1 surfaces:

- `src/drive/google-drive-port.ts`;
- `src/drive/runtime.ts`;
- `src/product/runtime.ts`;
- `src/product/authoritative-production-executor-base.ts`;
- `src/state/**`;
- `src/main.ts`.

You may add a backward-compatible optional diagnostic dependency to the transport constructor. Do not wire it in shared production composition; `LOG-03` owns that later.

If the frozen contract lacks a field needed for required evidence, stop and report the exact insufficiency. Do not extend the shared schema independently.

## 7. Architecture and Dependency Constraints

- Preserve Obsidian desktop/mobile compatibility.
- Use no Node-only networking/logging API.
- Add no dependency.
- Preserve `requestUrl`/fetch abstraction and current test injection seams.
- Keep event volume bounded: one logical request plus bounded per-attempt/retry/final events; do not log payload/chunk bytes.
- Diagnostics remain local and observational.
- Existing transport callers must compile before LOG-03 composition wiring; use an optional/default diagnostic seam rather than forcing protected call-site edits.

## 8. Required Implementation Work

1. Read the current transport request/retry loop and transport tests before editing.
2. Add the optional frozen diagnostic sink/logger dependency without changing existing caller behavior.
3. Implement safe endpoint classification.
4. Allocate one request correlation ID per logical `request()` call and reuse it across attempts.
5. Emit structured start/attempt/response/retry/final-failure/success evidence sufficient to reconstruct the existing state machine.
6. Capture only explicitly safe provider request IDs when available.
7. Add focused tests for success, retries, failure classifications, endpoint privacy, correlation stability, latency/delay evidence, and secret/body exclusion.
8. Reconcile all changed files to this ownership boundary.

## 9. Tests and Verification

Focused tests must prove at minimum:

- a successful one-attempt request logs one stable `requestId`, endpoint class, method, status, and latency/result evidence;
- a retried 5xx/network/rate-limited request keeps the same `requestId` and increments attempt number;
- existing retry delay and `Retry-After` behavior are unchanged and represented correctly;
- 401 invalidation behavior is unchanged and observable without token disclosure;
- 404, 409/412, 410, quota, 403, 429, and exhausted retry classifications are observable with existing returned semantics unchanged;
- POST/non-replay-safe behavior remains unchanged;
- raw URL query strings, authorization headers, request bodies, response bodies, and injected token-like values do not appear anywhere in rendered diagnostics;
- endpoint classification does not expose object IDs/query values;
- diagnostic sink failure cannot change transport return behavior.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Record non-zero focused test counts. Inspect the complete diff from the resolved `COMMON_BASE_SHA` to final HEAD.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log02-google-http-transport-tracing-01.md`

Include:

- agent/work-package/task type and Wave `W1`;
- resolved exact `COMMON_BASE_SHA`;
- branch and final implementation/evidence SHAs;
- complete changed-file list;
- frozen LOG-01 contract consumed;
- endpoint classes implemented;
- request/retry event sequence and correlation semantics;
- exact test commands/counts/results;
- typecheck/full test/build/diff-check results;
- limitations/unavailable checks;
- explicit statement that transport/retry/OAuth semantics were not changed;
- explicit statement that no secrets/bodies/raw query URLs were logged;
- explicit statement that no live Drive mutation occurred;
- exact stop state.

Commit implementation and evidence. Do not claim supervisor approval.

## 11. Prohibitions

- No live Drive calls or B01 rerun.
- No B01 synchronization repair.
- No retry/OAuth/concurrency policy change.
- No semantic Drive-operation instrumentation.
- No W1 peer surface edits.
- No shared composition-root wiring.
- No LOG-01 contract changes.
- No raw URLs, authorization headers, request/response bodies, secrets, or file contents in diagnostics/tests/evidence.
- No dependency upgrade/addition.
- No unrelated refactor/cleanup/formatting churn.
- No release, merge to `phase6-integration`, B02–O, iPhone validation, or Stage 3.
- No force push/base substitution.

## 12. Hard-Stop Conditions

Stop and report if:

- `COMMON_BASE_SHA` remains unresolved;
- the supplied exact SHA does not match the approved LOG-01 state;
- material repository drift exists;
- the frozen LOG-01 contract is insufficient for required transport evidence;
- implementation would require changing retry/auth/transport semantics;
- safe instrumentation would require logging a prohibited value;
- shared composition-root edits are required before W1 integration;
- another W1 agent owns a required mutable surface;
- mandatory verification cannot be completed;
- unexplained changes appear.

Do not improvise around a hard stop.

## 13. Completion and Return to Supervisor

Completion requires the bounded transport instrumentation and tests to exist, required checks to pass or be explicitly blocked, evidence to be committed, and the changed-file set to remain within ownership.

Return the resolved base SHA, branch, implementation SHA, evidence SHA if different, changed files, focused/full verification results, and concise description of the emitted transport evidence. Then stop for supervisory review.

Do not integrate, wire shared composition, or begin another work package.