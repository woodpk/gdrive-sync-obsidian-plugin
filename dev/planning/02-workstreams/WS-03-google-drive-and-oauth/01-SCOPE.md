# Scope — Google Drive and OAuth Boundary

## Authorized responsibility

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

## Starting assumptions and prerequisites

- Phase 1 is complete.
- The Drive/authentication contracts are frozen.
- Phase 2 and Phase 4 may be under construction concurrently.

## Explicit exclusions

- Do not decide synchronization conflicts or deletion policy inside the Drive adapter.
- Do not implement Obsidian local filesystem semantics.
- Do not implement final sync orchestration, preview UI, or conflict/recovery UI.
- Do not broaden Drive scope, add Shared Drive support, or add multiple sync targets.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
