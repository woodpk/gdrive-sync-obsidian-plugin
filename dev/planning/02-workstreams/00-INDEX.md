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
|  WS-07 | BRAIN Verification Platform | WS-06 integrated Phase-6 line / completed product paths | Own the external automated/live verification platform used to prove Phase-6 and Stage-3 readiness without re-entering production architecture.  |

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
