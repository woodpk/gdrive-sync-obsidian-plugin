# Build Decomposition — Obsidian Local, Platform, and Configuration Boundary

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 4 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Obsidian Local, Platform, and Configuration Boundary

### 8.1 Objective

Implement the Windows/iOS-safe local-vault and selective-configuration boundary so the synchronization engine can observe and mutate the BRAIN vault without unsafe filesystem assumptions, platform leakage, or accidental synchronization of device-local state.

### 8.2 Starting Assumptions and Prerequisites

- Phase 1 is complete.
- The local-vault/platform/configuration contracts are frozen.
- Phase 2 and Phase 3 may be under construction concurrently.

### 8.3 Required End State

- Local enumeration covers all in-scope vault files and empty directories, including unknown/binary files, while applying the same explicit exclusion semantics used by reconciliation.
- The active Obsidian configuration directory is discovered from runtime behavior rather than hard-coded as `.obsidian`.
- Portable configuration uses an explicit safe allowlist/classifier; unknown configuration remains local by default; workspace/session/cache/platform state, authentication secrets, and synchronization operational state remain excluded.
- The local boundary handles path normalization, Unicode/case collisions, invalid/reserved names, path-length compatibility, hidden files, exclusions, symlinks/junctions/external references, and read/access failures according to the target specification.
- Local writes/download replacements are atomic or functionally safe; local disk exhaustion cannot partially replace valid content.
- Local deletion uses recoverable Obsidian/local trash where feasible.
- Local rename/move preserves Obsidian link-management behavior where required.
- File-stability checks prevent transient mid-write states from being treated as stable transfer inputs.
- Local change/lifecycle observation supports startup readiness, later debounce/coalescing by the product orchestrator, iOS suspension/resume behavior, and isolation from initialization-generated events.
- The local boundary remains fully usable when remote authentication/network access is absent.
- Plugin disable/uninstall/device-unlink behavior is non-destructive.
- The existing Google Drive BRAIN asset repository remains outside this plugin; ordinary vault binaries, embedded binaries, and materialized attachments follow the target's filesystem-only semantics.

### 8.4 Principal Contracts and Invariants Introduced or Preserved

- `SYS-002` through `SYS-004` and `SYS-007` at the platform boundary.
- Local-trigger/lifecycle portions of `SYNC-003`, `SYNC-004`, `SYNC-006`, `SYNC-007`, `SYNC-011`, and `SYNC-012`.
- Local-facing portions of `XFER-002`, `XFER-003`, and `XFER-006`.
- `FILE-001` through `FILE-015`.
- `CONFIG-001` through `CONFIG-009`.
- Local-facing portions of `MOVE-004` and recoverable deletion.
- `FAIL-001`, `FAIL-005`, `FAIL-006`, and `FAIL-007` at the local/platform boundary.
- `ASSET-001` through `ASSET-008`.
- `LIFE-001` and `LIFE-002`.
- `INV-003`, `INV-012` through `INV-014`, `INV-017`, `INV-018`, and `INV-020` at the local/platform boundary.

### 8.5 Dependencies

Phase 1 only. Phase 4 may execute in parallel with Phases 2 and 3.

### 8.6 Acceptance Criteria

- Automated tests cover all-file enumeration, empty directories, hidden files, exclusion symmetry, unknown extensions, symlink/junction refusal, unreadable paths, and file stability.
- Cross-platform path tests cover separator normalization, Unicode-equivalent names, case collisions, reserved/invalid names, and path-length preflight without silent overwrite/normalization.
- Atomic-replacement and local-disk-exhaustion tests prove valid existing content is preserved on failure.
- Local trash and rename/move tests preserve required recoverability and Obsidian semantics.
- Configuration tests prove unknown configuration is excluded by default and protected operational/auth/device state cannot synchronize.
- Mobile compatibility tests demonstrate that required local behavior does not depend on Node/Electron/Windows-only APIs.
- Lifecycle tests prove startup initialization does not generate unsafe synchronization and iOS interruption can be handed safely to later orchestration.
- Tests prove plugin disable/uninstall/device unlink does not delete shared or local content.
- Tests demonstrate no code path enumerates or mutates the separate Google Drive BRAIN asset repository as part of local-vault synchronization.

### 8.7 Non-Goals

- Do not implement Google OAuth or Drive API behavior.
- Do not decide synchronization conflicts or destructive policy inside the local adapter.
- Do not implement final end-to-end synchronization orchestration or user workflow UI.
- Do not add arbitrary third-party plugin-settings synchronization.

