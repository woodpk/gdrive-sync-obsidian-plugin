# Canonical Workstream Index

## Status

This index replaces the former project-level phase decomposition as the canonical whole-system build decomposition. The accepted six product phases map one-to-one to WS-01 through WS-06; the accepted BRAIN Verification Platform subsystem is represented as WS-07.

| Workstream | Name | Dependencies | Responsibility |
| --- | --- | --- | --- |
|  WS-01 | Repository Foundation and Frozen Shared Contracts | None | Establish buildable repository baseline and frozen shared contracts.  |
|  WS-02 | Core Synchronization Semantics and Durable State | WS-01 | Own deterministic reconciliation, state, conflict, deletion, recovery, and crash-safe semantics.  |
|  WS-03 | Google Drive and OAuth Boundary | WS-01 | Own Google authentication, Drive managed-root, remote identity/change/transfer boundary.  |
|  WS-04 | Obsidian Local, Platform, and Configuration Boundary | WS-01 | Own local vault, Windows/iOS platform, filesystem/configuration/asset boundary.  |
|  WS-05 | Integrated Synchronization Product and User Workflows | WS-02, WS-03, WS-04 | Compose the product and user-facing workflows over completed boundaries.  |
|  WS-06 | Cross-Platform Hardening and Stage 3 Readiness | WS-05 | Own integrated hardening, real-platform evidence preparation, scale/fault/security closure.  |
|  WS-07 | BRAIN Verification Platform | WS-06 integrated Phase-6 line / completed product paths | Own the external automated/live verification platform and the distinct **DEC-357 Windows OAuth authoritative diagnostic controller Build Unit**, without entering shipping production architecture. |

## Dependency graph

```text
WS-01
  ├─> WS-02 ─┐
  ├─> WS-03 ─┼─> WS-05 ─> WS-06
  └─> WS-04 ─┘                 │
                               └─> WS-07 (verification-platform subsystem)
```

WS-02, WS-03, and WS-04 are the accepted parallel-safe construction wave after WS-01. WS-05 is the required integration boundary. WS-06 is the integrated hardening/readiness boundary. WS-07 preserves the separately accepted BVP architecture and decomposition used to produce objective verification evidence.

No workstream is introduced merely for organizational convenience; this mapping preserves the dependency and ownership boundaries established by the accepted Stage-1 decompositions.


## DEC-362 stable Drive-ID correction — prerequisite (2026-11-18)

[One WS-05-owned corrective task](WS-05-integrated-sync-product/tasks/stable-drive-id-content-update-correction-2026-11-18.md) coordinates WS-03 same-object Drive mutation semantics with WS-05 executor/recovery/merge integration. Existing-file content updates and clean merges must preserve the established Google Drive ID. This is a hard prerequisite to DEC-339 planner cutover/activation; no new workstream is created.

## DEC-339 production inventory integration — planned (2026-11-17)

[One minimal WS-05 integration task](WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md) coordinates WS-02 storage, WS-03 read-only Drive metadata, WS-05 default-off observation wiring and WS-07 existing verification. DEC-339 implementation is dormant and now gated behind DEC-362; no new workstream, greenfield rebuild, schema migration or activation follows from this plan.

## Current WS-07 successor Build Unit — DEC-357

**BVP_WINDOWS_CONTROLLER_OAUTH** is an Owner-approved, separate **WS-07** unit, not a new global workstream and not a change to WS-03 production OAuth. Canonical [task and BVP-WCO-001–011 requirements](WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md). It follows the DEC-356 R5 corrective F01, uses Option A (independent Windows OAuth PKCE/DPAPI, no Obsidian IPC), and is **WCO-06 PASS WITH MINOR FINDINGS — ACCEPTED for exact frozen Windows software-only scope**, under DEC-358 and the corrected independent [Reviewer addendum](../reviews/bvp-windows-controller-oauth-20261114-wco06-acceptance-addendum.md). Original PHX-CI passed 13/13 stages, focused 628/628, product 1292/1292 against `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0`. [Builder acceptance closeout](WS-07-brain-verification-platform/tasks/wco06-dec357-accepted-software-only-closeout-2026-11-14.md) retains handoff-count 14. Real cross-client Google `drive.file` compatibility is unverified and Owner-gated; no live OAuth/Drive, physical operation, merge or release authorized.
