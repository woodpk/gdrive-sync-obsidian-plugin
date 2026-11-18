# Build Decomposition — Google Drive and OAuth Boundary

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 3 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Google Drive and OAuth Boundary

### 7.1 Objective

Implement the complete user-owned Google authentication and managed Google Drive remote boundary required by the synchronization contracts, without allowing transport/API concerns to redefine synchronization policy.

### 7.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- The Drive/authentication contracts are frozen.
- Phase 2 and Phase 4 may be under construction concurrently.

### 7.3 Required End State

- The plugin authenticates each device independently against the user's own Google OAuth application using `drive.file` only.
- Windows and iPhone can complete authentication without desktop token transfer.
- The external/system-browser OAuth flow, return mechanism, anti-CSRF state, and PKCE/current code-protection requirements satisfy the target specification.
- If a hosted HTTPS callback is required, the approved user-controlled Azure Static Web Apps boundary is implemented with no vault-data handling and no token persistence.
- Tokens/secrets remain device-local and are never placed into synchronized data, logs, or repository source.
- The Drive implementation creates or explicitly pairs to the dedicated managed BRAIN Sync remote and validates stable vault/remote identity independently from authentication success.
- The managed remote supports stable Drive IDs, content transfer, identity-preserving rename/move, recoverable trash, protocol/schema metadata, remote-root failure detection, and supplementary Drive history recovery where available.
- Incremental remote detection uses the Google Drive Changes API after baseline; durable change-cursor semantics conform to the shared contract.
- Full remote listing/reconciliation can establish completeness explicitly and cannot convert partial listing into deletion authority.
- Transfers support integrity evidence, safe retry after ambiguous failure, bounded concurrency, backoff/jitter, rate-limit handling, and large-file behavior appropriate to the target.
- Remote quota/storage failure preserves local data and fails safely.

### 7.4 Principal Contracts and Invariants Introduced or Preserved

- `AUTH-001` through `AUTH-012`.
- `REM-001` through `REM-010`.
- `CHANGE-004` through `CHANGE-007`.
- Remote-facing portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, and `XFER-008`.
- Remote-facing portions of `MOVE-002` and recoverable deletion behavior.
- `FAIL-002` through `FAIL-004` for remote/API failure handling.
- `PRIV-001` through `PRIV-004` as applied to authentication, API, callback, and diagnostics.
- `INV-002`, `INV-010`, `INV-011`, and `INV-014` at the Drive/auth boundary.

### 7.5 Dependencies

Phase 1 only. Phase 3 may execute in parallel with Phases 2 and 4.

### 7.6 Acceptance Criteria

- Automated tests/fakes verify Drive ID preservation, managed-root identity validation, remote rename/move, trash semantics, remote schema/version handling, missing-root recovery signaling, and ambiguous remote identity handling.
- Changes API tests verify cursor advancement only after durable incorporation and safe fallback to full reconciliation when the cursor is missing/invalid.
- Partial/failing remote enumeration tests prove absence cannot authorize deletion.
- Retry, rate-limit, quota, ambiguous-upload, large-file, and content-integrity tests pass.
- Authorization uses only `drive.file` and no repository credential is committed.
- Same-device authentication is demonstrated on Windows and iPhone/iOS at least to the extent possible before full product integration; any final lifecycle integration remaining is explicitly carried to Phase 5.
- Hosted callback behavior, if used, is demonstrably content-blind and token-nonpersistent.

### 7.7 Non-Goals

- Do not decide synchronization conflicts or deletion policy inside the Drive adapter.
- Do not implement Obsidian local filesystem semantics.
- Do not implement final sync orchestration, preview UI, or conflict/recovery UI.
- Do not broaden Drive scope, add Shared Drive support, or add multiple sync targets.

## DEC-362 corrective prerequisite (2026-11-18)

Before DEC-339 production planner cutover, WS-03 owns the remote-mutation portion of [stable Drive-ID content-update correction](../WS-05-integrated-sync-product/tasks/stable-drive-id-content-update-correction-2026-11-18.md):

- ordinary upload/update and clean-merge propagation against an established file use that file's existing Drive ID;
- remove routine candidate-object creation/predecessor-retirement semantics from existing-file content mutation;
- preserve safe retry/idempotency through exact identity, revision/content preconditions, durable intent and provider-backed outcome verification;
- new/reserved IDs remain available for genuine creates;
- ambiguous/stale/uncertain provider outcomes remain blocked/recovery-required rather than path/name remapping.

This correction does not broaden OAuth scope or change synchronization conflict policy. WS-05 owns executor/recovery integration over the corrected Drive primitive.


## DEC-339 remaining integration (2026-11-17)

D339-03's metadata source/reader exists dormant; **do not rebuild it**. Under the [single WS-05 task](../WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md), WS-03 provides the narrow existing-OAuth metadata transport seam and provider/Changes/provenance equivalence. Preserve `drive.file`, explicit incomplete/unknown results and full-reconciliation fallback. Accepted Phase-3 scope stays unchanged.
