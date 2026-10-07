# Phase 6 LOG-06 Diagnostic Bundle / Operator Surface — Evidence Closure

## Identity

- Agent: `agt-ca-p6-log06d-evidence-closure-01`
- Work package: `LOG-06`
- Task: `LOG-06D Evidence Closure`
- Task classification: `EVIDENCE CLOSURE ONLY`
- Wave: `W3`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`
- Frozen LOG-06 base SHA: `8cb7f02930c58313c8ad6f2e25537a7d5b231a57`
- LOG-06C verified implementation SHA: `b80eb843136a35766392910148b45520edf770c3`

## Implementation Change Set

Complete frozen-base-to-verified-implementation changed-file list:

1. `src/diagnostics/diagnostic-bundle.ts`
2. `src/diagnostics/diagnostic-logger.ts`
3. `src/main.ts`
4. `src/product/runtime.ts`
5. `test/phase6-log06-diagnostic-bundle-operator-surface.test.ts`

No implementation or test file was changed by LOG-06D. This evidence record is the only LOG-06D file change.

## Diagnostic Bundle Contract Implemented

- Bundle schema version: `1` (`DIAGNOSTIC_BUNDLE_SCHEMA_VERSION`).
- Top-level sections emitted by `renderDiagnosticBundle(...)`:
  - `bundleSchemaVersion`
  - `generatedAt`
  - `buildRuntime`
  - `configuration`
  - `runtimeReadiness`
  - `authorityState`
  - `structuredTrace`
  - `auditHistory`
  - `synchronizationAttention`
  - `causalIndex`
- Build/runtime identity records sanitized plugin ID/version, platform, and `obsidian` runtime identity.
- Configuration projection records configuration/readiness facts rather than raw OAuth, pairing, vault, or device secret values.
- `causalIndex` links retained trace evidence by run and operation, including plan/operation/intent/effect/request identifiers, last classification/error summaries, outstanding intent IDs, last-known authority revisions/generation, and aggregate evidence counts.

## Safe State / Audit / Attention Projection

### Authority / state

The bundle exports a diagnostic projection of authority/state rather than raw persistence payloads. Raw paths are replaced with diagnostic `pathKey` values; vault/device/source-device identities are one-way identity keys; change cursors are one-way cursor keys; arbitrary state members are excluded by explicit projection. The projection exposes material synchronization evidence such as state/persistence revisions, semantic generation, base/mapping/tombstone/convergence summaries, learned remote batch/reduction summaries, outstanding operation intents/effect stages, local transaction stages, operation journal summaries, and known-device counts.

State collections are explicitly bounded: general state projections to `500` records and intent/journal-style projections to `200` records, with `totalCount`, `includedCount`, and `truncated` evidence where applicable.

### Audit

Audit history is projected to an allowlisted metadata surface: `id`, `event`, `advisoryAtMs`, diagnostic `pathKey`, `operationId`, `planId`, `reasonCode`, `side`, and `count`. The most recent `500` projected records are retained in the bundle with explicit total/included/truncation metadata; vault content is not included.

### Synchronization attention

Synchronization-attention projection retains bounded operational metadata: first/last-seen times, run ID, trigger, diagnostic `pathKey`, category, reason code, occurrence count, current/resolved state. Raw attention keys and `humanReason` free text are excluded. The most recent `500` projected records are included with explicit total/included/truncation metadata.

## Operator Surface

The plugin registers exactly one local command for this surface:

- Command ID: `copy-diagnostic-bundle`
- Command name: `Copy diagnostic bundle`

The command requests `ProductRuntime.exportDiagnosticBundleText(...)` using the current manifest ID/version and platform/runtime identity, copies the complete rendered bundle through the existing clipboard helper, and reports a success notice stating that the bundle contains bounded sanitized metadata and structured trace evidence only. Export/copy failures are routed through the existing sanitized diagnostic failure path with classification `diagnostic-bundle-export-failure` and the user-visible error surface.

Runtime bundle collection reads the currently available synchronization authority, audit history, synchronization-attention ledger, settings/readiness, and retained diagnostic trace, then renders the local JSON bundle. The export path does not call the Google Drive boundary, issue Drive requests, invoke synchronization preview/execution, or clear synchronization/diagnostic evidence. `renderDiagnosticBundle(...)` flushes retained diagnostic logging before snapshotting it, but the export creates no synchronization authority and performs no Drive or synchronization-state/content mutation.

## Privacy / Non-Authority

The diagnostic bundle is local troubleshooting evidence only. It is not synchronization authority, does not authorize planning/execution/deletion/recovery decisions, and does not replace canonical synchronization state. The implementation uses explicit allowlist projections plus the existing diagnostic sanitization/path-key boundary; focused tests verify exclusion of raw vault paths, OAuth/client-secret/token material, raw change cursors/page tokens, request bodies, file content, local staging/backup paths, attention free text, bearer/code/query secrets, and arbitrary unapproved state payloads.

Export performs no Google Drive mutation and no synchronization content/state mutation. No external telemetry or automatic upload is introduced; the operator explicitly copies the bundle to the local clipboard.

## LOG-06C Exact-SHA Verification Record

Verified implementation SHA: `b80eb843136a35766392910148b45520edf770c3`

Fresh exact-SHA verification used GitHub Actions run `34603639242`, attempt `3`, on `phase6-logging-log06-diagnostic-bundle-operator-surface`; the run completed successfully against the exact verified SHA.

Recorded LOG-06C results supplied for closure:

- Dependency install (`npm ci`): `PASS`
- Typecheck: `PASS`
- Test TypeScript compilation: `PASS`
- Focused LOG-06 tests: `6/6 PASS`
- Full tests: `777/777 PASS` (`0 FAIL`)
- Production build: `PASS`
- Full repository check: `PASS`
- `git diff --check` for frozen base `8cb7f02930c58313c8ad6f2e25537a7d5b231a57` through verified implementation `b80eb843136a35766392910148b45520edf770c3`: `PASS`

LOG-06D did not rerun dependency installation, typecheck, tests, build, or the full suite; it records the supplied LOG-06C verification result only.

## Limitations

- No live Google Drive synchronization was performed or required by LOG-06C/LOG-06D.
- This evidence closure does not constitute supervisor approval, PR merge, LOG-06 integration, release approval, B01 validation, or LOG-07 authorization.

## Stop State

Evidence closure only is complete. The verified implementation remains `b80eb843136a35766392910148b45520edf770c3`; this file is committed separately as the sole evidence-closure change on the LOG-06 branch. No implementation, test, CI/workflow, merge, integration, release, B01, live Drive, or LOG-07 work was performed. Supervisor review is next.
