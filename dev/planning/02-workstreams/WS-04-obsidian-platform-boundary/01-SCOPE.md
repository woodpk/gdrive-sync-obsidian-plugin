# Scope — Obsidian Local, Platform, and Configuration Boundary

## Authorized responsibility

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

## Starting assumptions and prerequisites

- Phase 1 is complete.
- The local-vault/platform/configuration contracts are frozen.
- Phase 2 and Phase 3 may be under construction concurrently.

## Explicit exclusions

- Do not implement Google OAuth or Drive API behavior.
- Do not decide synchronization conflicts or destructive policy inside the local adapter.
- Do not implement final end-to-end synchronization orchestration or user workflow UI.
- Do not add arbitrary third-party plugin-settings synchronization.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
