# LOG-01 Observability Contract Foundation — Build Evidence

## Identity

- Agent: `agt-ca-p6-log01-observability-contract-foundation-01`
- Work package: `LOG-01`
- Task type: `IMPLEMENTATION — SHARED CONTRACT FOUNDATION`
- Temporal wave: `W0`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Resolved exact base SHA: `9385e19fc021005b45e5046a3b5e074e10965e26`
- Branch: `phase6-logging-log01-observability-foundation`
- Implementation SHA before evidence-only commit: `49b913a5791c93b266a3db0e14fe3709b25c3a23`
- Evidence SHA: the commit containing this file; exact SHA is reported by the completion response because a Git commit cannot contain its own final hash without changing that hash.

## Changed Files

Implementation changes from the exact base:

- `src/diagnostics/diagnostic-logger.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`

Evidence-only addition:

- `dev/evidence/_ca-output-agt-ca-p6-log01-observability-contract-foundation-01.md`

No protected Drive transport, semantic Drive port, planner/executor/state/recovery behavior, runtime composition, `src/main.ts`, release/version, package/dependency, or live-validation surface was changed.

## Frozen Shared Observability Contract

### Component names introduced

- `drive.http` — Google HTTP transport
- `drive.semantic` — semantic Google Drive operations
- `sync.effect` — synchronization durable-effect lifecycle
- `state.authority` — authoritative synchronization-state transitions
- `state.cas` — compare-and-swap / commit authority
- `recovery.durable` — durable recovery lifecycle
- `diagnostics.bundle` — diagnostic bundle/export surface

Existing component names and meanings remain available for compatibility.

### Safe field vocabulary introduced

`planId`, `operationId`, `intentId`, `effectId`, `requestId`, `pathKey`, `remoteObjectId`, `candidateRemoteObjectId`, `predecessorRemoteObjectId`, `contentHash`, `sizeBytes`, `expectedRevision`, `observedRevision`, `endpointClass`, `httpStatus`, `attemptNumber`, `maxAttempts`, `latencyMs`, `retryDelayMs`, `replaySafe`, `retryDecision`, `driveSignal`, `providerRequestId`, `observationSource`, `occupancyCount`, `occupantRemoteObjectIds`, `trashed`, `candidateVerified`, `predecessorVerified`, `convergenceStatus`, `fromStage`, `toStage`, `persistenceRevision`, `semanticGeneration`, `stateRevision`, `semanticChanged`, `commitStatus`, `batchId`, `changeCount`, `verificationEvidenceRef`.

Values remain bounded scalar `string | number | boolean | null`; arbitrary structured objects are not accepted by the logger field contract.

### Path-key semantics

`diagnosticPathKey(path)`:

1. normalizes path separators to `/`;
2. removes a leading `./` form;
3. collapses repeated `/` separators;
4. removes one normalized trailing `/`;
5. normalizes Unicode to NFC;
6. hashes the normalized string with the existing dependency-free portable SHA-256 implementation; and
7. returns `path-sha256:<64 lowercase hex>`.

The returned key is deterministic, requires no secret key, is portable to mobile/iOS runtime boundaries, and does not contain the original path text.

`renderDiagnosticOccupantIds(ids)` produces a deterministic, unique, sorted, bounded scalar JSON-array representation of at most four remote occupant IDs. IDs longer than 64 sanitized characters are replaced by stable SHA-256 diagnostic IDs before rendering so the scalar remains within the logger's existing bounded text contract. `occupancyCount` remains the authoritative total count when the representation is truncated.

### Synchronization-run correlation semantics

- `beginSyncRun()` establishes the active diagnostic run and retains the existing explicit `sync*` APIs.
- `currentSyncRunId()` returns the most recently active run or `undefined` outside a run.
- `endSyncRun(runId)` removes only that exact run from diagnostic correlation and cannot clear a different active run.
- Active-run correlation is in-memory diagnostic state only; it is not persisted as synchronization authority and does not change synchronization behavior.
- No Node-only async-context mechanism is used.

### Compatibility and privacy behavior

- Existing valid persisted events remain parseable/loadable.
- Existing bounded retention and deterministic JSON-lines rendering are preserved.
- Existing field allowlisting remains in force and was extended only with the frozen safe vocabulary.
- Authorization headers are now explicitly redacted in addition to existing bearer/OAuth/token/PKCE/password/query-URL redaction.
- Unknown raw-path, request-body, response-body, raw-note-content, and raw-binary-content field names are dropped by the allowlist.
- Diagnostic persistence failures remain swallowed by the diagnostic persistence chain and do not create synchronization authority or throw through `flush()`.

## Focused Tests

Eight LOG-01-specific runtime test cases were added to `test/phase6-alpha-diagnostic-logging.test.ts`:

1. `structured observability vocabulary records every required bounded causal field`
2. `new component taxonomy separates transport, semantic Drive, effect, state/CAS, recovery, and bundle surfaces`
3. `diagnostic path key is normalized, deterministic, portable, and opaque`
4. `occupant remote object representation is deterministic, unique, sorted, and bounded`
5. `current synchronization run correlation is discoverable and ending one exact run cannot clear another`
6. `prior valid persisted events remain loadable without current-run leakage`
7. `structured privacy boundary drops raw path/body/content fields and redacts authorization and query material`
8. `diagnostic persistence failure remains non-authoritative and does not throw through flush`

The diagnostic logging test file contains 21 runtime `node:test` cases after expansion (the pre-existing log-level table generates six cases). The existing Phase 6 focused diagnostics bundle executed successfully in CI, including this file.

## Verification

Verification PR: `#64` (`phase6-logging-log01-observability-foundation` -> `phase6-integration`), created as draft solely to exercise the existing Phase 6 verification workflow. It is not authorization to merge.

GitHub Actions:

- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Run: `34417813080`
- Job: `102686486454`
- Head implementation SHA: `49b913a5791c93b266a3db0e14fe3709b25c3a23`
- Final conclusion: `success`

Exact workflow commands / checks and observed results:

- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npx tsc -p tsconfig.test.json` — PASS
- `npm test` — PASS
- `node --test .test-build/test/phase6-a03-first-sync-conflict-resolution-authority.test.js` — PASS
- `node --test .test-build/test/phase3-callback.test.js .test-build/test/phase6-alpha-diagnostic-logging.test.js .test-build/test/phase6-alpha-oauth-diagnostics.test.js .test-build/test/phase6-alpha-ios-oauth-launch.test.js .test-build/test/phase6-alpha-oauth-lifecycle.test.js .test-build/test/phase6-alpha-share-export.test.js` — PASS
- `npm run build` — PASS
- `npm run check` — PASS
- `git diff --check` — PASS
- `wc -c main.js` and `sha256sum main.js` artifact-identity step — PASS
- artifact upload — PASS

The uploaded CI artifact is `phase6-oauth-housekeeping-verification`, artifact ID `10129764272`, size `206766` bytes, archive digest `sha256:5c4e19598bfd6dec4e078c9c3f77f4b45306f0920e723dafe000b1a144113c2b`.

The available GitHub connector exposes step-level success but not the TAP log text from the uploaded ZIP, so no unsupported full-suite numeric pass count is asserted. This is not a missing mandatory check: the full test command and focused test command both executed successfully, and focused LOG-01 case count is established directly from the test source.

### Exact-base verification note

The CI workflow is pull-request-triggered against `phase6-integration`. Independent commit comparison from `9385e19fc021005b45e5046a3b5e074e10965e26` to the current `phase6-integration` state showed only the logging-instrumentation tasking Markdown files added after the implementation baseline; no product/source/test/runtime file drift exists on the PR base. Therefore the CI product code under verification is the LOG-01 branch product code rooted at the exact required baseline, plus non-product tasking documents.

## Limitations / Unavailable Checks

- No mandatory LOG-01 verification check was unavailable.
- CI log-text/TAP count extraction from the uploaded artifact is not exposed through the available connector; results are recorded from the authoritative step conclusions instead of inventing counts.

## Safety / Scope Confirmation

- No live synchronization was performed.
- No Google Drive mutation was performed.
- B01 was not repaired or rerun.
- No B02–O, iPhone validation, Stage 3, release, tag, or publication work was performed.
- No external telemetry, logging backend, network destination, or dependency was added.
- No real secret, authorization material, request/response body, note content, binary content, or raw user vault-path fixture was placed in diagnostics, tests, or this evidence record; tests use synthetic sentinel values only.

## Stop State

`LOG-01` implementation and verification are complete on `phase6-logging-log01-observability-foundation` and stop here for independent supervisory review. No downstream `LOG-02`, `LOG-04`, `LOG-05`, integration, release, or live-validation work is authorized by this completion.
