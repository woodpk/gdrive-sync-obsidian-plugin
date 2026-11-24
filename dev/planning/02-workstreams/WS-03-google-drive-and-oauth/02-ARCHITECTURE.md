# Architecture — Google Drive and OAuth Boundary

## Inherited architecture

The frozen shared contracts established by WS-01 are inherited. This workstream may implement behind those contracts but may not silently redefine them.

## Workstream-owned contracts and invariants

- `AUTH-001` through `AUTH-012`.
- `REM-001` through `REM-010`.
- `CHANGE-004` through `CHANGE-007`.
- Remote-facing portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, and `XFER-008`.
- Remote-facing portions of `MOVE-002` and recoverable deletion behavior.
- `FAIL-002` through `FAIL-004` for remote/API failure handling.
- `PRIV-001` through `PRIV-004` as applied to authentication, API, callback, and diagnostics.
- `INV-002`, `INV-010`, `INV-011`, and `INV-014` at the Drive/auth boundary.


## Approved Drive metadata-inventory boundary (dormant software; cutover pending)

WS-03 provides exact managed-root/domain-scoped Google Drive file/folder ID, parent, revision, provenance, completeness and Changes API evidence for Target Specification §7.9. Drive permits same-name siblings; `files.generateIds` and creation with a reserved ID protect retry identity, **not** name/parent uniqueness. The existing managed-root, `drive.file` scope, duplicate-path detection, uncertain-outcome recovery and full reconciliation remain mandatory. Reuse proven mappings and narrow ID reads instead of repeated broad traversal only where completeness, uniqueness, current authority and convergence are preserved; record request attribution and validate equivalence through PHX-CI before optimization.

## Dependency direction

Phase 1 only. Phase 3 may execute in parallel with Phases 2 and 4.

Repository-specific implementation mechanics remain engineering discretion only within these fixed ownership and invariant boundaries.

## DEC-362 stable remote identity correction (2026-11-18)

For an already-established managed file, the Drive boundary MUST use a same-object content update and preserve the established Google Drive file ID/`remoteObjectId`. Pre-generated/reserved IDs are for genuinely new object creation and retry identity, not routine replacement of an existing logical file. Before mutation, revalidate exact object identity and applicable revision/content preconditions; after mutation, verify the **same ID** with the intended resulting revision/content before authoritative state commit. Stale revision/identity, access loss, concurrent modification or ambiguous network outcome remains fail-closed and recovery-owned. Path/name equality is never authority to adopt a different ID.

The historical `immutable-candidate-preservation` replacement protocol is therefore nonconforming for ordinary existing-file content updates. This WS-03 correction is a hard prerequisite to DEC-339 planner cutover. Canonical corrective task: [stable Drive-ID content-update correction](../WS-05-integrated-sync-product/tasks/stable-drive-id-content-update-correction-2026-11-18.md).


## DEC-339 implementation boundary (2026-11-17)

The read-only `inventory-metadata-source.ts` and `verified-metadata-inventory-reader.ts` already exist dormant. WS-03's remaining contribution is a **narrow interface to the existing production-authenticated Drive transport** and equivalence evidence for baseline, Changes pagination, stable ID/parent identity, root-wide provenance and explicit inaccessible/unknown outcomes. No new OAuth client, permission or mutation authority. Follow the [single WS-05 integration plan](../WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md).

## Boundary clarification: DEC-357 Windows BVP OAuth is WS-07-only (2026-10-28)

Owner DEC-357 authorizes a **separate Windows Node OAuth Desktop PKCE session** exclusively for WS-07 BVP's nonshipping diagnostic controller, tracked in [WS-07 BVP_WINDOWS_CONTROLLER_OAUTH](../WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md). It does **not** change this WS-03 production OAuth/Drive scope, refresh-token authority, authentication UX, authorized product grant, or shipping production dependencies. No BVP test-platform source may be added to shipping `src/**` or create an unapproved production seam. The controller's separate `drive.file` grant may not see the plugin-created mailbox; that is an **unverified compatibility prerequisite** and cannot be solved by silently broadening scope. All real OAuth/Drive activity remains Owner-reserved.

## DEC-364 / DEC-339 BU01-F03 — bounded continuity (2026-11-24; historical pre-research design)
Reuse inventory-metadata-source and VerifiedMetadataInventoryReader. Establish supported corpus/visibility eligibility, consume complete opaque Changes replay from durable cursor, prove changed IDs and affected parent occupancy/ancestry, independently check final fence/horizon. No routine listMarked for proven eligible ordinary leaf deltas; retain baseline/recovery and required global proof where feed insufficient. Uncertain permission/corpus/subtree changes rebaseline/block.
Canonical prospective design: `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step6-bu01-f03-continuity-technical-design-2026-11-24.md`. Documentation only; no authorization to build.

### DEC-365 — operative research-supported design
Complete opaque Changes replay from durable cursor; use stable IDs and affected-parent/ancestry checks; independent final fence/horizon. No routine listMarked; retain baseline/recovery and detected-uncertainty proof. Unknown visibility/unsupported corpus fail closed. See the canonical F03 technical design §2.1. Earlier pending-proof and documentation-only restrictions are superseded for implementation; activation, live use and release remain unauthorized.


### DEC-365 exact-ID boundary optimization
**WS-03 session-bound proof contract:** On a trusted, current app-grant/policy and matching prior inventory generation, persisted managed-domain IDs are query *hints*, never proof. Fresh exact-ID metadata validates root/content/config instead of repeated domain searches. The Changes reader may consume a previously verified combined boundary only in the same planning attempt, skips its redundant first proof, then independently verifies exact IDs and final cursor before atomic publication. Direct/non-witnessed reader calls retain full validation. Final planner account+cursor validation is independent and follows all assembly reads. Unauthorized changes or provider uncertainty block; baseline/recovery still use full physical proof.
