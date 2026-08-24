# Stage 2A Build Session 03 — Phase 3 Google Drive and OAuth Boundary

## Role

You are the coding agent responsible for **Stage 2A Build Session 03 / Build Phase 3** of the BRAIN Google Drive Sync Obsidian plugin.

Your job is to implement **only Phase 3 — Google Drive and OAuth Boundary** from the authoritative Stage 1 decomposition. You are one worker in a three-agent parallel construction wave. Phase 2 and Phase 4 are being implemented independently against the same frozen Phase 1 contracts.

You are a coding/build agent, not the product authority and not the overall construction supervisor. You own Google authentication and managed Google Drive implementation mechanics behind the frozen boundary. You do not own synchronization policy, local-vault behavior, final product orchestration, or frozen cross-workstream contract changes.

## Mandatory Authority Ingestion Before Modification

Before modifying the repository, completely read these repository files:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
   2. `dev/planning-and-building/target-system-specification.md`
   3. `dev/planning-and-building/decision-register.yaml`
   4. `dev/planning-and-building/stage-1-build-decomposition.md`
   5. `dev/planning-and-building/phase-1-shared-contracts.md`
   6. `dev/planning-and-building/project-state.yaml`
   7. `dev/security-prompt-header.md`
   8. `dev/evidence/_ca-output.md`

Treat authority in this order: later explicit user decisions; target-system specification; decision register; Stage 1 decomposition; frozen Phase 1 contracts/build-session contract; actual repository as implementation-state evidence. Donor/reference behavior never overrides target authority.

Then inspect the actual repository at the assigned baseline, especially:

- `src/contracts/common.ts`;
  - `src/contracts/google-drive.ts`;
  - `src/contracts/snapshot.ts`;
  - `src/contracts/state.ts` where cursor/durability semantics intersect the boundary;
  - `src/testing/fakes.ts`;
  - current tests;
  - package/build configuration and Obsidian typings;
  - any Phase 3 implementation already present.

Before selecting OAuth, browser-return, secure-storage, Drive HTTP, streaming, or retry mechanics, inspect current authoritative Google OAuth/Drive documentation and current Obsidian desktop/mobile API documentation relevant to those mechanics. Use official sources for protocol/security/platform facts. Do not freeze a mechanism from stale memory or donor behavior.

## Repository Baseline and Isolation

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Authoritative integration branch:

`master`

Supervisor-approved parallel-wave baseline:

`e16719196269b4b31f8f1a4997722cdd1c916058`

Create and work only on an isolated branch rooted at that exact commit:

`stage-2a-phase-3-drive-oauth`

Do not implement directly on `master`. Do not merge your own branch or pull request. The supervising agent owns acceptance and integration.

At the approved baseline, the repository contains only the Phase 1 foundation/contracts/fakes/tests. There is no Phase 3 production Drive/OAuth implementation to preserve unless direct branch inspection proves otherwise.

## Objective

Implement the complete user-owned Google authentication and managed Google Drive remote boundary required by the synchronization contracts, while keeping transport/API concerns from redefining synchronization policy.

The implementation must be compatible with both Windows desktop Obsidian and iPhone/iOS Obsidian. Same-device authentication is mandatory; desktop token transfer is prohibited. Runtime paths required on iOS must not depend on Node.js, Electron, Windows-only APIs, PowerShell, .NET executables, local Python, or other desktop-only facilities.

## Frozen Drive Contract

`src/contracts/google-drive.ts` is a frozen Phase 1 cross-workstream contract and is **read-only for this worker** unless the supervisor explicitly approves a contract revision.

The current `GoogleDrivePort` requires production support for:

- authentication state;
  - managed-root creation;
  - explicit pairing and identity validation;
  - protocol/schema information;
  - complete reconciliation listing with explicit completeness;
  - starting Drive change cursor;
  - incremental change pages;
  - path/object observation;
  - lazy/chunk-capable download through `BinaryContentSource`;
  - file/folder create;
  - update;
  - identity-preserving move;
  - recoverable trash;
  - structured authentication/transient/rate/quota/not-found/conflict/recovery signaling.

`REQUIRED_DRIVE_SCOPE` is frozen as:

`https://www.googleapis.com/auth/drive.file`

Authentication/session success and managed BRAIN remote identity validation are separate concepts and must remain separate.

If the frozen contract is genuinely insufficient to satisfy a Phase 3 requirement, do **not** edit it. Record the exact type/member deficiency, the requirement it prevents, the smallest semantic change needed, and the affected workstreams; stop only dependent work and report the contract-change request to the supervisor.

## Required End State

When this session is complete, all of the following must be true.

### User-Owned OAuth and Least Privilege

Implement device-local Google authorization using the user's own Google Cloud OAuth application/client.

Requirements:

- request only `https://www.googleapis.com/auth/drive.file`;
  - do not broaden scope for convenience;
  - do not use developer-owned shared OAuth credentials/infrastructure;
  - every supported device, including iPhone, can initiate and complete authentication using that device alone;
  - desktop-generated token transfer or credential-bearing connection codes are not part of the design;
  - use a secure external/system browser authorization flow, not an embedded plugin-controlled user agent;
  - use high-entropy OAuth transaction state and current authorization-code interception protections, including PKCE where supported/required by the applicable Google client flow;
  - correlate the callback/return to the initiating device/session before accepting it;
  - changing Google account/identity requires explicit re-pairing and prior remote identity is not silently reused;
  - expired/revoked/invalid/insufficient authorization stops remote operations while preserving local use and surfaces reauthentication state.

Determine the exact current supported Google/Obsidian return mechanism from official current documentation and platform evidence.

Prefer a direct same-device/system-browser return path with no hosted callback when technically feasible and compliant. If a hosted HTTPS callback/bridge is genuinely required, the approved preferred host is **user-controlled Azure Static Web Apps Free** and the callback must:

- be authentication infrastructure only;
  - never receive, inspect, persist, proxy, or synchronize vault content;
  - avoid token persistence;
  - minimize handling of authorization material;
  - preserve anti-interception/session-correlation protections.

Do not deploy a developer-controlled backend.

### Device-Local Secret Handling

Authentication tokens, refresh tokens, OAuth secrets, verifier material, and equivalent sensitive values must remain device-local and must never enter:

- vault synchronization payloads;
  - configuration synchronization payloads;
  - audit logs;
  - exported diagnostics;
  - source control.

Use the strongest secure-storage mechanism currently available through supported Obsidian/runtime APIs. Verify actual current platform capability rather than assuming ordinary plugin `saveData` is secure secret storage.

If no supported mechanism can satisfy the target's secret-storage requirement on a required platform, do not silently fall back to plaintext synchronized or ordinary insecure storage. Report the exact platform/API blocker and evidence to the supervisor.

### Managed BRAIN Sync Remote

Implement creation and explicit pairing of the dedicated plugin-managed BRAIN Sync remote.

The implementation must:

- create or deliberately pair to the intended remote;
  - validate stable BRAIN vault identity independently from authentication success;
  - use stable Google Drive object IDs as remote identity;
  - never silently adopt an arbitrary similarly named folder;
  - treat missing/inaccessible/deleted paired root as recovery-required, not an instruction to silently recreate and repopulate;
  - detect identity mismatch, incompatible protocol version, and ambiguous remote identity;
  - keep the BRAIN Sync remote logically separate from the pre-existing Google Drive BRAIN asset repository;
  - never enumerate/manage the external BRAIN asset repository as part of the sync domain.

### Remote Protocol/Schema Representation

Implement a concrete versioned remote metadata/protocol representation within the dedicated BRAIN Sync domain.

It must:

- carry stable vault identity;
  - carry an explicit protocol/schema version;
  - be distinguishable from ordinary vault content;
  - support compatibility validation;
  - reject incompatible protocol versions safely;
  - remain compatible with the locked `drive.file` authorization model;
  - support controlled migration/backward awareness where the target permits it.

Exact physical Drive layout and serialization are Phase 3 engineering decisions.

### Complete Reconciliation Listing

Implement full managed-remote listing sufficient for reconciliation.

The result must:

- enumerate only the managed BRAIN Sync domain;
  - return stable object IDs, paths/entity kinds, trash state, and integrity/change evidence available through the frozen contract;
  - explicitly report `complete`, `partial`, `failed`, or equivalent frozen completeness semantics;
  - never represent an interrupted/partial/failing listing as complete;
  - ensure downstream logic cannot infer deletion from absence unless the listing is known complete.

### Google Drive Changes API

After baseline, implement incremental remote change detection using the current supported Google Drive Changes API under `drive.file`.

The implementation must support:

- obtaining a start cursor/page token;
  - reading pages of changes;
  - retaining stable object identity and last-known path evidence where available;
  - safe handling of cursor invalidation/loss/expiration;
  - a conservative signal that causes full reconciliation rather than deletion inference when the cursor is unusable;
  - cursor advancement semantics compatible with the durable-state rule that a cursor is not considered authoritative past changes that the core has not durably incorporated.

Phase 3 owns transport/page semantics. Phase 2/5 own authoritative state commit/orchestration.

### CRUD, Move, and Trash

Implement `GoogleDrivePort` create/update/move/trash semantics for files and folders inside the managed remote.

Requirements:

- preserve stable Drive IDs across proven rename/move where the Drive API permits;
  - do not implement rename solely as delete/recreate;
  - use recoverable Google Drive trash, not hard delete, for normal deletion;
  - never automatically empty Drive trash;
  - keep writes safely retryable/idempotent where possible;
  - after ambiguous network outcomes, determine/re-establish actual remote outcome before blindly creating duplicates;
  - return structured signals for not-found, authentication, permission, retry, rate limit, quota, conflict, and recovery conditions.

Synchronization conflict/deletion policy belongs to Phase 2/5, not the Drive adapter.

### Content Transfer and Integrity Evidence

Implement download/upload/update transfer mechanics compatible with `BinaryContentSource` and mobile bounded-resource requirements.

The Drive boundary must not require the entire file to be materialized in memory before transfer begins.

Requirements include:

- lazy/chunked/streamed or functionally equivalent bounded transfer behavior;
  - large-file support without arbitrary small product-level ceilings;
  - bounded memory and bounded concurrency appropriate to iOS WebView/mobile constraints;
  - integrity-relevant evidence sufficient for later verify-before-commit semantics;
  - resumable/safely retryable upload behavior where appropriate;
  - detection/handling of ambiguous upload responses;
  - no assumption that HTTP/API success alone proves correct transferred bytes.

Use browser/mobile-safe primitives. Node streams or desktop filesystem handles are not acceptable runtime dependencies for required mobile behavior.

### Retry, Rate Limit, and Quota Behavior

Implement bounded API retry behavior:

- exponential backoff plus jitter for retryable transient failures;
  - honor current Google quota/rate-limit guidance and server retry timing where applicable;
  - bound concurrency and retry attempts;
  - surface deferred/retry signals rather than blocking local use indefinitely;
  - on Drive storage/quota exhaustion, stop affected remote writes, preserve local changes, and surface actionable quota state;
  - never use destructive fallback behavior.

Exact limits/defaults are engineering decisions and should be conservative and testable.

### Privacy and Diagnostics

Do not introduce developer-controlled telemetry.

Drive/auth diagnostics must not log:

- access tokens;
  - refresh tokens;
  - authorization codes;
  - PKCE verifier material;
  - client secrets;
  - full note contents or binary payloads.

The hosted callback, if any, must remain content-blind and token-nonpersistent.

## Implementation Scope

Implement the smallest coherent Phase 3 production modules and tests necessary to satisfy this phase.

Expected existing integration points are:

- frozen `GoogleDrivePort` and related types in `src/contracts/google-drive.ts`;
  - `BinaryContentSource` and common IDs/evidence in `src/contracts/common.ts`;
  - remote observation/completeness types in `src/contracts/snapshot.ts`;
  - cursor/state semantics consumed from the frozen state contract without changing it;
  - existing test seam `createGoogleDriveFake` in `src/testing/fakes.ts`.

You may:

- create Phase 3-owned modules under `src/` for OAuth, token/secret handling, Drive HTTP/API transport, managed-remote layout/protocol, changes, transfer, retry/backoff, and the production `GoogleDrivePort` implementation;
  - extend non-frozen fakes/fixtures needed for adapter tests;
  - add Phase 3 tests under `test/`;
  - add narrowly justified mobile-compatible dependencies;
  - update package/build configuration when mechanically necessary;
  - append Phase 3 evidence to `dev/evidence/_ca-output.md`.

Exact private file/module/class names are engineering discretion after inspection.

Do not alter `src/contracts/**` unless and until the supervisor explicitly approves a frozen-contract revision.

## Required Requirement Coverage

Your implementation must satisfy the Phase 3 assignment in `stage-1-build-decomposition.md`, including:

- `AUTH-001` through `AUTH-012`;
  - `REM-001` through `REM-010`;
  - `CHANGE-004` through `CHANGE-007` at the Drive boundary;
  - remote-facing portions of `XFER-001`, `XFER-002`, `XFER-004`, `XFER-007`, and `XFER-008`;
  - remote-facing `MOVE-002` behavior;
  - remote recoverable-deletion behavior;
  - `FAIL-002` through `FAIL-004`;
  - `PRIV-001` through `PRIV-004` as applied to authentication, API, callback, diagnostics, and transfer;
  - `INV-002`, `INV-010`, `INV-011`, and `INV-014` at the Drive/auth boundary.

Do not silently absorb Phase 2 synchronization policy, Phase 4 Obsidian local behavior, or Phase 5 final product workflows/UI.

## Fixed Decisions and Invariants

You may not reinterpret these constraints:

- authorization scope is exactly `drive.file` unless the user later explicitly changes product authority;
  - OAuth application/client belongs to the user, not a developer service;
  - iPhone authenticates independently using that device; desktop token transfer is prohibited;
  - use external/system browser authorization;
  - transaction state and current secure authorization-code protections are required;
  - secrets are device-local and never synchronized;
  - authentication success does not prove the remote is the correct BRAIN remote;
  - pairing is explicit and identity-validated;
  - missing paired remote root is recovery-required, not auto-recreate/repopulate;
  - stable Drive IDs are persistent remote identity;
  - Drive Changes API is the incremental remote-detection mechanism after baseline;
  - full reconciliation remains available and partial listing cannot authorize deletion;
  - remote rename/move preserves identity where the API permits;
  - normal deletion uses Drive trash;
  - API success alone is not transfer-integrity proof;
  - large files must remain viable with bounded mobile resources;
  - the external BRAIN asset repository is outside the managed sync domain;
  - no developer-controlled telemetry;
  - no Node/Electron/Windows-only runtime dependency in iOS-required behavior;
  - frozen shared contracts may not be changed unilaterally.

## Implementation Discretion

You own ordinary Phase 3 engineering choices, including:

- exact Google OAuth client-flow mechanics consistent with current official policy and target constraints;
  - exact same-device browser return mechanism;
  - whether a hosted callback is needed at all;
  - code-exchange placement consistent with callback isolation and current Google requirements;
  - exact device-local secure-storage adapter based on supported APIs;
  - Drive HTTP client implementation and request wrapper structure;
  - remote metadata/schema serialization and physical layout;
  - resumable/chunk transfer mechanics and buffer sizes;
  - hash/integrity evidence mechanics at the Drive boundary;
  - retry/backoff/concurrency defaults;
  - internal test fixtures/fakes.

Do not use implementation discretion to broaden scope, weaken security, or move synchronization policy into the adapter.

## Verification and Acceptance Criteria

Phase 3 is not complete because REST methods exist. Establish objective evidence for all applicable requirements.

### OAuth and Security Tests

Automated tests must cover as much of the authorization protocol as can be proven without real user credentials, including:

- exact requested scope is `drive.file` and no broader Drive scope is requested;
  - authorization URL/system-browser request construction;
  - high-entropy transaction state generation/validation;
  - PKCE generation/verification where applicable;
  - callback/return session correlation;
  - rejection of mismatched/expired transaction state;
  - account-change/re-pair requirement;
  - revoked/expired/invalid token behavior becomes authentication-required and blocks remote mutations;
  - token/authorization material is not emitted into logs/diagnostics;
  - secret persistence uses the selected device-local secret-storage boundary rather than synchronized config;
  - hosted callback, if implemented, is content-blind and token-nonpersistent.

Use current official Google/Obsidian documentation as evidence for platform/protocol decisions and record the specific mechanics selected.

Do not commit real credentials to prove tests.

### Managed Remote Tests

Automated tests/fakes must verify:

- managed-root creation;
  - explicit pairing;
  - stable vault identity validation;
  - identity mismatch;
  - ambiguous pairing;
  - protocol version compatibility/incompatibility;
  - missing-root recovery signaling;
  - stable Drive object ID preservation;
  - remote schema/metadata is not interpreted as ordinary vault content;
  - no code path targets the separate BRAIN asset repository.

### Changes and Listing Tests

Tests must verify:

- initial/start cursor acquisition;
  - incremental change page parsing;
  - stable object identity across changes;
  - removed-object handling/last-known path evidence where available;
  - cursor loss/invalidity causes conservative reconciliation signal;
  - full listing reports completeness honestly;
  - interrupted/partial/failing listing cannot masquerade as complete;
  - downstream absence cannot be given deletion authority by a partial listing.

### CRUD/Move/Trash Tests

Tests must verify:

- file and folder creation;
  - update;
  - identity-preserving move/rename with unchanged Drive object ID;
  - recoverable trash;
  - no automatic hard-delete/trash purge path;
  - expected not-found/permission/auth/conflict/recovery signaling;
  - ambiguous upload/network outcomes do not blindly duplicate content.

### Transfer and Resource Tests

Tests must verify:

- download exposes lazy/multi-chunk `BinaryContentSource` behavior rather than whole-file boundary buffering;
  - upload/update can consume content incrementally;
  - large-file logic does not impose arbitrary small ceilings;
  - transfer integrity evidence is produced/checked as designed;
  - retryable transfer interruption is recoverable;
  - bounded concurrency is enforced;
  - rate limiting/backoff/jitter behavior is bounded and respects retry timing;
  - quota exhaustion returns safe structured failure without destructive fallback;
  - mobile-required runtime source imports no Node/Electron/Windows-only facilities.

### Live/Real-Platform Evidence Boundary

The target requires same-device authorization on Windows and iPhone. Perform real-device/live authorization only if the necessary user-controlled OAuth configuration and supported interactive environment are actually available to this CA session without exposing secrets.

If they are not available, do not fabricate a pass and do not demand unsafe credential disclosure. Record exactly what was verified by code/tests/documented platform capability and what final live lifecycle demonstration remains for Phase 5/6. This is acceptable only to the extent permitted by the Stage 1 Phase 3 acceptance language; any material feasibility blocker must be surfaced to the supervisor.

### Repository Gate

The repository verification gate is:

```text
npm ci
npm run typecheck
npm test
npm run build
```

Use verification methods actually available in this customer-facing ChatGPT environment. If direct local npm execution is unavailable or npm registry access is blocked, use GitHub Actions rather than reporting a generic verification blocker.

Required procedure:

1. push your branch;
   2. open a pull request from `stage-2a-phase-3-drive-oauth` to `master` to trigger `.github/workflows/phase1-ci.yml`;
   3. do **not** merge it;
   4. inspect the actual workflow run, jobs, step results, and decoded logs;
   5. verify `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` all executed and passed;
   6. verify from logs that Phase 3 tests were discovered/executed and record actual test/failure counts.

Do not substitute ad hoc snippets for the repository gate when GitHub Actions is available.

## Evidence Requirements

Before reporting completion, append a clearly delimited section for **Stage 2A Build Session 03 / Phase 3** to:

`dev/evidence/_ca-output.md`

Do not erase prior Phase 1 evidence.

Record at minimum:

- build/session identifier;
  - repository and assigned branch;
  - exact baseline SHA;
  - implementation commit SHA(s);
  - pull request number;
  - final verification workflow run ID and job ID;
  - exact repository verification command results;
  - test count and failure count;
  - concise acceptance-criteria mapping;
  - official documentation/protocol decisions material to OAuth/Drive behavior;
  - every file created, modified, and deleted, derived from the actual Git change set;
  - frozen-contract status (`unchanged` unless a supervisor-approved revision exists);
  - any unavailable live credential/device validation and the precise later-phase carry-forward;
  - deviations, blockers, limitations;
  - final worker status.

After updating evidence, ensure the evidence commit is pushed and the PR reflects it. If the evidence update triggers a new CI run, use the latest successful run as final verification evidence.

## Non-Goals

Do not implement in this phase:

- synchronization conflict/planning/deletion policy;
  - Phase 2 durable-state engine beyond adapter-facing cursor/result semantics required by the frozen contract;
  - Obsidian vault enumeration/read/write/trash/rename/configuration implementation;
  - final plugin commands, settings UI, onboarding UI, sync preview, conflict/recovery UI, notifications, or audit UI;
  - final synchronization orchestration;
  - Shared Drive support;
  - multiple sync targets;
  - broad/full Drive scope;
  - developer-hosted sync backend;
  - custom application-level E2E encryption;
  - management of the external Google Drive BRAIN asset repository;
  - Stage 5 integration or Stage 6 hardening.

## Completion Response

When finished, respond concisely with:

1. Phase 3 implementation summary;
   2. OAuth return/code-exchange and secret-storage strategy selected, with current official-platform basis;
   3. verification PR number, workflow run ID/job ID, commands, test count, and results;
   4. live Windows/iPhone authorization evidence actually obtained, or the exact permitted carry-forward limitation;
   5. complete created/modified/deleted file manifest;
   6. branch and final pushed commit SHA;
   7. `dev/evidence/_ca-output.md` update status;
   8. any remaining blocker or frozen-contract change request.

Do not claim supervisory approval. Stop after Phase 3 implementation, evidence, push, and PR verification.
