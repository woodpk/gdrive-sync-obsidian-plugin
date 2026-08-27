# Coding-Agent Evidence — Phase 6 Alpha iOS Diagnostic Logging

## Identity and authority

- agent ID: `agt-CA-P6-IOS-DIAG-LOGGING-01`
- execution class: `SERIAL-SHARED-OWNER`
- branch: `phase6-alpha-ios-diagnostic-logging`
- PR: `#21` (`phase6-alpha-ios-diagnostic-logging -> phase6-integration`)
- starting authority/base SHA: `d799e0139c36b629769a917f2d328de6ab84f44d`
- original reviewed implementation head: `233d1da26442b2ab79c8d58f334f70c3cb3cfaf5`
- gesture-safe production/test correction head: `790243209015300a5f3bb2cf7a1931577d84ec85`
- verification-workflow correction head: `5dd64fe0514ee3a48894d937c8cc333644ebc7e9`
- dedicated-evidence commit SHA: recorded in the canonical `_ca-output.md` after this file is created; a commit cannot contain its own content-dependent SHA without changing that SHA.
- `0.1.1` provenance re-verified: Git tag `0.1.1` points exactly to `d799e0139c36b629769a917f2d328de6ab84f44d`.

The work began only after PR #21 was re-checked and confirmed to remain exactly at reviewed head `233d1da26442b2ab79c8d58f334f70c3cb3cfaf5`. No unreviewed intervening commit was present.

## Implemented diagnostic architecture

The branch implements a bounded, device-local structured diagnostic subsystem intended to make otherwise opaque OAuth/mobile launch failures observable without moving diagnostic data into the synchronized vault.

### Structured levels and inclusion semantics

The retained levels are exactly:

```text
Off
Error
Warn
Info
Debug
Trace
```

Severity/detail inclusion is monotonic. `Error` and `Warn` remain present at every non-Off level; `Info` is included at Info and above; `Debug` adds diagnostic context at Debug and above; `Trace` adds finer execution-order/granularity events at Trace. Executable regression coverage establishes materially richer output in the required ordering:

```text
Info < Debug < Trace
```

The richer levels add execution context and ordering, not new secret-bearing data categories.

### Persistence and retention

- diagnostics persist through the plugin-data repository and remain device-local;
- storage is a bounded ring buffer with monotonic sequence ordering;
- retention is configurable within bounded limits;
- diagnostic persistence is separate from vault synchronization content;
- clearing diagnostics affects the local diagnostic record only and does not clear audit history, OAuth credentials, pairing, or synchronization state.

### Console mirroring

Console mirroring is opt-in. When enabled, it mirrors only the same already-sanitized structured records that are eligible for retained diagnostic storage. It does not create a less-redacted console-only representation.

## Export behavior

### Clipboard export — corrected transient-user-activation contract

The rejected implementation awaited `diagnostics.flush()` before calling `navigator.clipboard.writeText()`. That asynchronous boundary was removed from ahead of the protected clipboard call.

`src/diagnostics/share-export.ts` now exposes a small `copyDiagnosticLogText()` helper that:

1. receives the already-rendered sanitized text synchronously;
2. synchronously checks for `clipboard.writeText`;
3. invokes `writeText(text)` before the helper returns its Promise;
4. performs no `await`, timeout, retry, or other asynchronous operation before `writeText()` invocation.

`src/main.ts::copyDiagnosticLog()` synchronously calls `diagnostics.renderText()` and then `copyDiagnosticLogText(...)` directly from the settings-button path. Any desired `diagnostics.flush()` is performed only after clipboard success and is not a prerequisite for constructing or invoking the clipboard operation.

Behavioral regression coverage uses an injected clipboard implementation whose completion Promise remains unresolved. The test proves `writeText()` has already been invoked, and proves the exact rendered text was supplied, before the caller receives/awaits completion. A second behavioral test proves controlled failure when the clipboard API is unavailable. No vault write is involved in this export path.

### `.txt` Web Share export

The existing approved Web Share implementation is preserved. It constructs an in-memory `File` named `brain-sync-diagnostic-log.txt` with MIME type `text/plain` and passes only `{ files: [file] }` to `navigator.share()` directly from the original user gesture. It does not write the diagnostic file into the synchronized vault. Capability is feature-detected; clipboard remains the fallback when file sharing is unavailable.

Physical iPhone share-sheet behavior remains unverified by CI.

## OAuth and browser instrumentation boundaries

The branch instruments the relevant OAuth path without changing OAuth transaction semantics:

- Authenticate-button entry and attempt identity;
- authentication preconditions using presence/classification metadata only;
- runtime initialization boundaries;
- OAuth authorization preparation/launch boundaries;
- callback registration and callback receipt/processing;
- token-exchange safe classifications already exposed by the production OAuth boundary;
- success/failure lifecycle and safe retry/recovery metadata.

OAuth attempts use independent diagnostic attempt IDs for correlation without logging OAuth state/PKCE material.

### Browser probes

Two OAuth-independent probes are present:

- direct `_external` probe: invokes a fixed harmless HTTPS target synchronously from the user gesture;
- delayed `_external` probe: invokes the same fixed target after one controlled Promise microtask boundary.

These probes observe browser-launch behavior without creating an OAuth transaction or changing the production OAuth launcher.

## Redaction and security constraints

Diagnostic records use an allowlisted structured field surface plus defense-in-depth sanitization. Sensitive names/categories are denied, including token, secret, password, authorization, PKCE/verifier, code, challenge, state, URL, request/response body, and similar credential-bearing values. Paths/query-like values are redacted. Error normalization retains only safe classification/message data.

The exact Google Drive OAuth scope remains:

```text
https://www.googleapis.com/auth/drive.file
```

No `about:blank` reservation, returned `Window`/`WindowProxy` dependency, Node/Electron mobile dependency, synchronized diagnostic log, OAuth behavior change, or synchronization behavior change was introduced by this work.

## Corrective provenance

Following rejection of reviewed head `233d1da26442b2ab79c8d58f334f70c3cb3cfaf5`, the serial correction produced:

1. `d8e81878382c0cda6a76c0fd756bd7db6f9151b3` — added the gesture-safe diagnostic clipboard helper;
2. `60f51c290231ebcca5619f56786547776f1dbe77` — wired `src/main.ts` so diagnostic clipboard invocation precedes all asynchronous work;
3. `790243209015300a5f3bb2cf7a1931577d84ec85` — added behavioral clipboard regression coverage; this is the final production/test correction SHA;
4. `5dd64fe0514ee3a48894d937c8cc333644ebc7e9` — mechanically strengthened the dedicated diagnostic CI focused command to include the export regression file explicitly.

## Complete base-to-final evidence-tree manifest

Comparison authority is `d799e0139c36b629769a917f2d328de6ab84f44d`. The final evidence closure is expected to contain the following net paths; the canonical record is reconstructed against the final branch head after both evidence files are committed.

### Created

- `.github/workflows/phase6-alpha-diagnostic-ci.yml`
- `src/diagnostics/browser-probes.ts`
- `src/diagnostics/diagnostic-logger.ts`
- `src/diagnostics/oauth-diagnostics.ts`
- `src/diagnostics/share-export.ts`
- `test/phase6-alpha-diagnostic-logging.test.ts`
- `test/phase6-alpha-oauth-diagnostics.test.ts`
- `test/phase6-alpha-share-export.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-IOS-DIAG-LOGGING-01.md`

### Modified

- `src/drive/auth.ts`
- `src/main.ts`
- `src/product/plugin-data.ts`
- `src/product/runtime.ts`
- `src/product/settings-tab.ts`
- `test/phase6-alpha-ios-oauth-launch.test.ts`
- `test/phase6-alpha-oauth-lifecycle.test.ts`
- `dev/evidence/_ca-output.md`

### Deleted

- none.

## Verification actually performed

### Post-correction production/test gate

GitHub Actions run `33108598399`, job `98645079257`: **SUCCESS**.

- `npm ci`: PASS
- `npm run typecheck`: PASS
- full test suite: PASS — 292/292
- new gesture-safe clipboard tests: PASS
- production build: PASS
- `npm run check`: PASS
- `git diff --check`: PASS
- all five package verifiers: PASS

This run preceded the mechanical focused-command workflow update.

### Stronger final code/workflow gate

GitHub Actions workflow `Phase 6 Alpha Diagnostic Verification`:

- run ID: `33108757692`
- job ID: `98645636059`
- head: `5dd64fe0514ee3a48894d937c8cc333644ebc7e9`
- conclusion: **SUCCESS**
- `npm ci`: PASS — 16 packages added, 17 audited, 0 vulnerabilities
- `npm run typecheck`: PASS
- full tests: **292/292 PASS**, 0 fail/cancelled/skipped/todo
- focused diagnostic/OAuth/export tests: **33/33 PASS**, 0 fail/cancelled/skipped/todo
- progressive detail `Info < Debug < Trace`: PASS
- secret-safety/redaction coverage: PASS
- OAuth launch/lifecycle coverage: PASS
- exact `drive.file` scope coverage: PASS
- `npm run build`: PASS
- `npm run check`: PASS
- `git diff --check`: PASS
- artifact upload: PASS

Five package verifiers:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Final code-bearing `main.js` artifact from that gate:

```text
byte size: 329013
SHA-256: 1225e9b1798d5238d7fd0e0a2241a40080b02b8c0e7d92970828ac1fa98726c6
```

Uploaded diagnostic artifact:

- artifact ID: `9661596129`
- ZIP size: `69259` bytes
- ZIP SHA-256: `30d1dab6fb14719c3cf82e76e7efc54294cded0803150e65354dcf656101ab18`

### Azure Static Web Apps qualification

Contemporaneous Azure Static Web Apps run `33108757695`, job `98645636153`, concluded **FAILURE**, but the inspected deployment log establishes the external cause exactly: Azure rejected the deployment because the Static Web App already had the maximum number of staging environments and instructed that one be removed before retrying. The application directory was found and the static assets proceeded through the deployment action before the capacity rejection. Azure configuration/staging environments were not modified by this task.

This Azure capacity result is not treated as a plugin test/build failure and is not repaired here.

## Explicit limitations / non-actions

- `Physical iPhone execution: NOT AVAILABLE IN THIS SESSION`
- `OAuth root cause: NOT YET ESTABLISHED`
- physical iPhone `.txt` share-sheet / Save-to-Files acceptance: NOT AVAILABLE IN THIS SESSION
- physical iPhone clipboard acceptance: NOT AVAILABLE IN THIS SESSION
- no `0.1.2` release or tag created
- no pairing performed
- no synchronization performed
- no performance work performed
- no Stage 3 work begun
- no `master` modification
- PR #21 is required to remain OPEN and UNMERGED pending independent review and physical iPhone acceptance.

No OAuth secret, token, state, verifier, challenge, authorization code, or full authorization URL is recorded in this evidence.