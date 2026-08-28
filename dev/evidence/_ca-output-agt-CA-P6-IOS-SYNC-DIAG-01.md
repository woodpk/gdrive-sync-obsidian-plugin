# Coding-Agent Evidence — Phase 6 Alpha iPhone `Sync now` Diagnostic Logging

## Identity and authority

- agent ID: `agt-CA-P6-IOS-SYNC-DIAG-01`
- task class: diagnostic instrumentation only
- branch: `phase6-alpha-ios-sync-diagnostic-logging`
- exact starting SHA / immutable `0.1.2` source: `9a6b5ffa52d11f699a839214b7fdcb3c4c4701e6`
- base tag verified before work: `0.1.2`
- prepared diagnostic version metadata: `0.1.3`; no tag or release was created
- intended review base: the current Phase 6 integration line, without modifying or merging that line

The work began from a clean branch created directly at the immutable `0.1.2` tag commit. Neither `master` nor `phase6-integration` was checked out, modified, merged, rebased, or force-updated.

## Instrumentation added

The existing device-local `DiagnosticLogger` now supports an independently persisted monotonic `runId` namespace for manual synchronization. A `runId` is created at the actual `Sync now` command boundary and is passed through manual request, planning, snapshot observation, preview, Execute, operation execution, verified-success commit, and terminal outcome. It is distinct from OAuth `attemptId` and retains elapsed-time correlation without logging remote/vault identities.

Major Info events distinguish manual start/request, plan/preview preparation, preview presentation, Execute, execution start, and explicit complete/failed/cancelled/deferred outcomes. Debug events add safe counts, planning mode, trusted-state status, local/remote completeness, plan disposition, first-sync/recovery/normal classification, and aggregate operation categories. Trace events expose ordered boundaries for remote validation, BASE/state load, LOCAL/REMOTE observation, planner entry/completion, and each operation's precondition validation, pending journal, mutation result, verified receipt, authoritative state commit, and completion.

The actual execution architecture exposes integrity verification as the `durable-verified-success` receipt returned by the executor. Therefore the trace records `integrity-verification-complete` at that real receipt boundary, before `state-commit-start`; it does not invent a separate verification-start seam that the current executor contract does not expose.

Operation diagnostics use a safe plan-local ordinal, operation category, direction, precondition count, destructive flag, result, sequence, `runId`, and elapsed time. They do not log operation IDs, paths, Drive object IDs, note contents, binary contents, tokens, OAuth state, PKCE material, authorization codes, complete URLs, or credentials.

The preview modal separately records the Execute gesture. Closing a preview before Execute records a cancelled terminal outcome. Runtime-unavailable and run-lease/paused cases record deferred outcomes. Diagnostic observer callbacks are fail-isolated so they cannot change execution decisions.

The PR #24 rejection correction completes the failure boundaries for that lifecycle. A preview-presentation exception now emits a sanitized Error event at fixed stage `preview-presentation`, closes the same run, and preserves the throw. Execute-request rejections now emit sanitized Error evidence at fixed stage `execute-request` under the original run even when the plan is stale; a returned rejection leaves the preview open and re-enables later dismissal/cancellation. Run-lease acquisition and operation precondition, pending-journal, content-mutation, uncertain-journal, and state-commit failures now identify their exact fixed stage at Error level. Returned mutation failures are no longer Trace-only. Thrown failures retain the original throw behavior, successful ordering is unchanged, and terminal cleanup ends the diagnostic run.

## Synchronization semantics

No synchronization decision, planner rule, transfer behavior, verification rule, state mutation rule, recovery rule, or OAuth behavior was changed. Manual `Sync now` still plans and presents a preview before any explicit Execute request. The coordinator still orders precondition validation, pending journaling, mutation/verification, and authoritative verified-success state commit exactly as before.

Static inspection and the behavioral tests revealed no synchronization root cause. This task does not claim the physical iPhone issue is fixed.

## Complete changed-file manifest

### Created

- `src/diagnostics/sync-diagnostics.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-IOS-SYNC-DIAG-01.md`

### Modified

- `src/core/execution-coordinator.ts`
- `src/diagnostics/diagnostic-logger.ts`
- `src/main.ts`
- `src/product/plan-modal.ts`
- `src/product/plugin-data.ts`
- `src/product/product-controller.ts`
- `src/product/runtime.ts`
- `src/product/snapshot-assembler.ts`
- `manifest.json`
- `package.json`
- `package-lock.json`
- `dev/evidence/_ca-output.md`

### Deleted

- none

Generated `main.js` is intentionally not tracked by this repository and is therefore not part of the Git manifest.

## Focused behavioral verification

Focused command compiled the test tree and ran `test/phase6-alpha-ios-sync-diagnostics.test.ts` directly.

- result: **12/12 PASS**
- actual Sync-now entry helper emits the correlated user-action event
- one manual attempt uses one `runId`; the next attempt advances exactly once
- BASE, LOCAL, REMOTE, and planning events are behaviorally ordered and distinguishable
- safe plan counts/disposition/trust/completeness are asserted
- preview and Execute are separate from planning and from each other
- operation Trace order is asserted
- verified receipt precedes authoritative state commit
- successful and failed terminal outcomes are explicit
- credential-bearing failure text is redacted
- vault path/content sent through planning never appears in exported diagnostics
- the plan remains structurally unchanged and the same verified operation/state commit succeeds
- preview-presentation throw emits a same-run sanitized Error and closes the run
- stale Execute rejection emits a same-run Error and later dismissal records cancellation
- thrown precondition, pending-journal, content-mutation, uncertain-journal, state-commit, and run-lease failures identify their exact stage and close the run
- a returned content-mutation failure produces Error evidence in addition to the preserved Trace lifecycle event

## Full verification

- `npm run typecheck`: **PASS**
- focused sync-diagnostic tests: **12/12 PASS**
- `npm test`: **302/304 PASS**, with exactly the two pre-authorized Windows drive-prefix assertions below and no additional failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS**; informational LF-to-CRLF working-copy warnings only

Qualified pre-existing Windows-only assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
   - actual retained drive-qualified path: `D:\vault\__brain_sync_portable_config__`
   - test expected drive-less path: `\vault\__brain_sync_portable_config__`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`
   - actual retained drive-qualified path: `D:\vault\notes\missing.md`
   - test expected drive-less path: `\vault\notes\missing.md`

No unrelated test or synchronization code was changed to manufacture a green Windows result.

Package verifier results:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Generated artifact:

```text
main.js byte size: 351383
main.js SHA-256: 46e8331738395e669ea7d6fb3a22f0a098129d892e7100a2e28c012c39a0ef55
```

## PR #24 rejection correction closure

Reviewed starting head was independently verified before editing as `86f8850aeb6f56018700b489d863320f12248ae3` on `phase6-alpha-ios-sync-diagnostic-logging`. The correction remains on that branch for PR #24 and does not declare independent approval.

### C1 — preview presentation

`openManualPreview()` now uses a synchronous presentation boundary. A thrown modal-open/presentation transition emits an Error-level `sync-run-failed` record with fixed stage `preview-presentation` and classification `preview-presentation-failure`, ends the same diagnostic run, and rethrows.

### C2 — Execute rejection and cancellation

The controller retains the original manual `runId` by plan ID so stale-plan validation does not erase diagnostic correlation. Every `execute-plan` and `approve-destructive-plan` rejection emits Error-level `execute-request-rejected` evidence with fixed safe classification rather than the raw user-visible reason. The modal distinguishes a pending request from an accepted request; a returned rejection resets pending suppression, leaves the preview visible, and permits a later close to record `sync-run-cancelled` and end the run.

### C3 — exact execution failure stages

The existing lifecycle observer now reports fixed failure stages and optionally passes a thrown value only to the existing sanitized `syncFailure` boundary. It covers run-lease acquisition, operation-precondition validation, pending journaling, content mutation, uncertain-state journaling, and authoritative state commit. Returned failure outcomes use `syncError`; thrown failures use `syncFailure` and preserve rethrow behavior. Successful Trace events and mutation/verification/commit ordering remain unchanged. Observer exceptions remain swallowed so diagnostics cannot alter synchronization results.

### Correction-pass manifest from reviewed head

Created:

- none.

Modified:

- `src/core/execution-coordinator.ts`
- `src/diagnostics/sync-diagnostics.ts`
- `src/main.ts`
- `src/product/plan-modal.ts`
- `src/product/product-controller.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-IOS-SYNC-DIAG-01.md`
- `dev/evidence/_ca-output.md`

Deleted:

- none.

The regenerated `main.js` is ignored and is evidence-only, not a tracked repository change. Version metadata remains `0.1.3`; no tag or release was created.

## Limitations and non-actions

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

Synchronization root cause: NOT YET ESTABLISHED

- no synchronization behavior repair
- `0.1.3` metadata prepared solely to distinguish the future reviewed physical diagnostic build
- no tag or release publication
- no iPhone pairing or synchronization
- no merge to `phase6-integration` or `master`
- no existing Phase 6 PR merge
- no performance work
- no Stage 3 work
