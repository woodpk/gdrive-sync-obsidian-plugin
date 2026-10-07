# Obsidian Local, Platform, and Configuration Boundary

**Workstream:** WS-04  
**Source lineage:** accepted Phase 4 from the original Stage-1 minimum sound build decomposition.

## Objective

Implement the Windows/iOS-safe local-vault and selective-configuration boundary so the synchronization engine can observe and mutate the BRAIN vault without unsafe filesystem assumptions, platform leakage, or accidental synchronization of device-local state.

## Dependency position

Phase 1 only. Phase 4 may execute in parallel with Phases 2 and 3.

## Required end state

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

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
