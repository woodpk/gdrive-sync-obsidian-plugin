# PHASE 6 PRE-LIVE PLATFORM / RUNTIME HARDENING — WP2

## AGENT

`agt-ca-p6-prelive-platform-runtime-wp2-01`

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Create a repair branch from exactly:

`INPUT_SHA = f7657ba99a5a0b464b66f5f9d46ef2c4fa3e877b`

Do not substitute a branch tip.

## ASSIGNMENT

Fix the five confirmed platform/runtime robustness defects below. Keep the repair bounded to current Phase 6 production behavior and directly necessary regression tests.

Do not redesign synchronization contracts, recovery architecture, release/install flow, legacy migration, or live-test orchestration.

### R1 — transient OAuth refresh failures destroy valid refresh authority

Current `GoogleOAuthSession.accessToken()` clears stored OAuth tokens when refresh fails, including failures that can be transient. `GoogleHttpTransport` also clears the whole token set on a Drive 401.

Required behavior:
- preserve a valid refresh token across transport failures, malformed/service responses, 429, and 5xx refresh failures;
- clear credentials only when refresh authority is definitively invalid/revoked or the stored grant is structurally/scope-invalid;
- a rejected/expired access token must not erase a still-valid refresh token;
- prevent reuse of a known-rejected access token: invalidate/expire only the access-token portion so the next attempt must refresh;
- preserve exact `drive.file` scope enforcement and existing secret-redaction guarantees;
- classify/surface transient refresh failure as transient/deferred rather than falsely requiring re-authentication where the internal seams permit that distinction.

Primary surface: `src/drive/auth.ts`, `src/drive/transport.ts`, and focused OAuth/transport tests.

### R2 — non-idempotent Drive create POSTs are retried blindly

`GoogleHttpTransport.request()` generically retries transient failures. `metadataCreate()` uses that behavior for Drive `POST /files` calls that do not always carry a stable pre-reserved object ID. A lost response after server-side success can therefore be repeated and create duplicate roots/folders.

Required behavior:
- never blindly retry a non-idempotent create whose exact object identity is not already fixed;
- reserved-ID creates may remain retry/recovery-safe only where the stable ID plus post-dispatch observation makes repetition provably safe;
- ordinary parent-folder/root/domain creation must either use stable reserved identity or disable automatic POST replay and rely on exact subsequent observation/reconciliation before another create;
- retries after an ambiguous response must not create duplicate managed roots, domain roots, or intermediate folder paths;
- retain current retry policy for retry-safe GETs and other operations where the method/idempotency contract already makes replay safe.

Trace every `metadataCreate()` caller before changing transport defaults. Add tests that simulate “server applied create, response lost” and prove no second distinct object is created.

### R3 — runtime teardown can dispose adapters while execution is still active

`ProductRuntime.disposeProduct()` requests cancellation, then immediately clears/disposes scheduler/controller/local/state resources. The cancellation request signals the run but does not prove run quiescence or lease release.

Required behavior:
- stop new scheduler work first;
- request cancellation of active synchronization;
- await controller/run quiescence, including any queued automatic drain and active run lease release, before disposing local adapters/state/runtime references;
- avoid deadlock when no run is active;
- repeated initialize/dispose remains idempotent;
- do not weaken cancellation semantics or permit a new runtime generation to overlap mutation work from the old one.

Primary surface: `src/product/runtime.ts`, `src/product/product-controller-base.ts`, and/or `src/core/run-coordinator.ts` only as necessary. Add a regression with a deliberately blocked in-flight operation proving disposal does not release/dispose its resources until the run exits.

### R4 — persisted durable descriptor validation is too shallow

Current persisted-authority runtime validation accepts several v1 physical descriptor variants largely by top-level `kind`, allowing malformed nested recovery data to pass load validation and fail later by dereference/throw.

Required behavior:
- validate the full safety-relevant runtime shape of persisted `local-file`, `remote-file`, `move`, and `trash` descriptors before treating authority as trusted;
- validate nested mutation kind, required IDs/paths, identity/base authority, canonical content proof, transaction IDs, and required target-side/mutation-kind consistency as applicable;
- malformed or semantically impossible persisted descriptors must make state load fail closed as recovery-required, not throw during later recovery;
- preserve valid current v1/v1.1 authority documents and existing explicit migration boundaries;
- do not introduce permissive coercion/defaulting for missing durable authority.

Primary surface: `src/state/persistent-state-store.ts` and focused malformed-state tests.

### R5 — preview execution exceptions can wedge the modal

`PlanPreviewModal` sets `executionPending = true` and awaits controller execution without a `try/finally`. A thrown request can leave the modal logically pending and fail to surface a useful retry/recovery state.

Required behavior:
- always clear pending state after execution settles or throws;
- surface a concise user-visible failure without closing the preview as if execution succeeded;
- preserve controller diagnostics/error propagation as appropriate;
- prevent duplicate concurrent Execute submissions while one request is pending;
- accepted execution still closes normally;
- rejected execution still shows its reason.

Primary surface: `src/product/plan-modal.ts` and the smallest practical focused test surface.

## VERIFICATION

Run directly affected tests first, then all of:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run check`

If the private repository cannot be materialized in the local execution container, open a temporary **draft PR** from the repair branch to `phase6-integration` solely to trigger the existing verification workflow. Do not merge it. Do not add or modify workflow files. Record the exact workflow run/job conclusions and close the draft PR after evidence is collected.

A green executable verification surface is required for completion.

## CHANGE MANIFEST

Report every production/test file created, modified, or deleted relative to `INPUT_SHA`.

## COMPLETION

Return:
- R1–R5 completed or blocked individually;
- concise root cause and implemented correction for each;
- actual executable verification results;
- exact workflow run/job IDs if CI was used;
- complete change manifest;
- resulting commit SHA;
- any remaining blocker.

## STOP

Stop after R1–R5 and directly necessary regression fallout are corrected and dynamically verified. Do not publish, install, resume live testing, optimize performance, or begin Stage 3.