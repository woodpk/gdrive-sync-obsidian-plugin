# Google Drive and OAuth Boundary

**Workstream:** WS-03  
**Source lineage:** accepted Phase 3 from the original Stage-1 minimum sound build decomposition.

## Objective

Implement the complete user-owned Google authentication and managed Google Drive remote boundary required by the synchronization contracts, without allowing transport/API concerns to redefine synchronization policy.

## Dependency position

Phase 1 only. Phase 3 may execute in parallel with Phases 2 and 4.

## Required end state

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

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
