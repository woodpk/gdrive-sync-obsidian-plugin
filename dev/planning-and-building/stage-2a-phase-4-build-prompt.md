# Stage 2A Build Session 04 — Phase 4 Obsidian Local, Platform, and Configuration Boundary

## Role

You are the coding agent responsible for **Stage 2A Build Session 04 / Build Phase 4** of the BRAIN Google Drive Sync Obsidian plugin.

Your job is to implement **only Phase 4 — Obsidian Local, Platform, and Configuration Boundary** from the authoritative Stage 1 decomposition. You are one worker in a three-agent parallel construction wave. Phase 2 and Phase 3 are being implemented independently against the same frozen Phase 1 contracts.

You are a coding/build agent, not the product authority and not the overall construction supervisor. You own the concrete Obsidian-local/platform/configuration implementation behind the frozen local boundary. You do not own synchronization policy, Google Drive/OAuth, final product orchestration, or unilateral shared-contract changes.

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
- `src/contracts/local-vault.ts`;
- `src/contracts/snapshot.ts`;
- `src/testing/fakes.ts`;
- current tests;
- `src/main.ts` only to understand existing plugin foundation, not to implement Phase 5 orchestration;
- installed/current Obsidian typings and package configuration;
- any Phase 4 implementation already present.

Before selecting local I/O, rename/trash, lifecycle, config-directory, mobile, or large-file mechanics, inspect current authoritative Obsidian desktop/mobile API documentation and the actual installed Obsidian TypeScript definitions. Do not assume desktop filesystem APIs are available on iOS.

## Repository Baseline and Isolation

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Authoritative integration branch:

`master`

Supervisor-approved parallel-wave baseline:

`e16719196269b4b31f8f1a4997722cdd1c916058`

Create and work only on an isolated branch rooted at that exact commit:

`stage-2a-phase-4-obsidian-local`

Do not implement directly on `master`. Do not merge your own branch or pull request. The supervising agent owns acceptance and integration.

At the approved baseline, the repository contains only the Phase 1 foundation/contracts/fakes/tests. There is no Phase 4 production local/platform adapter to preserve unless direct branch inspection proves otherwise.

## Objective

Implement the Windows/iOS-safe local-vault and selective-configuration boundary so the synchronization engine can observe and mutate BRAIN without unsafe filesystem assumptions, platform leakage, accidental synchronization of protected state, or dependence on remote availability.

The concrete implementation must satisfy the frozen `LocalVaultPort` on both Windows desktop Obsidian and iPhone/iOS Obsidian without exposing Node/Electron/Windows-only dependencies into mobile-required runtime paths.

## Frozen Local Contract

`src/contracts/local-vault.ts` is a frozen Phase 1 cross-workstream contract and is **read-only for this worker** unless the supervisor explicitly approves a contract revision.

The current `LocalVaultPort` requires production support for:

- runtime active-configuration-directory discovery;
- complete local enumeration with explicit completeness;
- per-path observation;
- stable file read returning lazy `BinaryContentSource` plus integrity evidence and observation token;
- create file;
- replace file;
- create folder;
- rename/move;
- recoverable trash;
- path compatibility validation;
- configuration classification;
- local change events;
- lifecycle events.

Important frozen semantics:

- only explicit `absent` is confirmed non-existence; unreadable/inaccessible/unknown remain distinct;
- `BinaryContentSource` is platform-neutral and must permit incremental consumption without requiring complete-file materialization at the shared boundary;
- `PathValidationResult` can block invalid/reserved names, path length, case collision, Unicode collision, external references, and unsupported objects;
- configuration classification distinguishes portable, device-local, protected, and unknown content;
- the local port is explicitly mobile-safe.

If the frozen contract is genuinely insufficient to satisfy a Phase 4 requirement, do **not** edit it. Record the exact type/member deficiency, the requirement it prevents, the smallest semantic change needed, and affected workstreams; stop only dependent work and report the contract-change request to the supervisor.

## Required End State

When this session is complete, all of the following must be true.

### Whole-Vault Enumeration

Implement local enumeration of all in-scope vault objects, not only Obsidian-recognized note types.

Enumeration must correctly account for:

- ordinary text and binary files;
- unknown extensions as opaque files;
- empty directories;
- hidden/dotfiles unless explicitly excluded;
- explicit/default exclusions;
- the active Obsidian configuration directory as a separate policy boundary;
- unsupported external filesystem references without following them outside the vault;
- unreadable/inaccessible/unknown paths without converting them to absence;
- enumeration completeness/failure truthfully.

The same exclusion semantics must be suitable for later use on both local and remote views so excluded content cannot be misinterpreted as one-sided deletion.

### Explicit Exclusion Policy

Implement visible/configurable path-pattern exclusion mechanics with conservative defaults for known non-vault operational noise such as:

- `.git` content;
- OS metadata;
- lock/temp files;
- plugin/runtime caches.

Exact patterns may be engineering-maintained, but they must be explicit/tested rather than silently dropping unknown user content.

Do not treat unknown file extensions as exclusions.

### Active Obsidian Configuration Directory

Discover the active Obsidian configuration directory from actual runtime/platform capability. Do not hard-code `.obsidian` as the policy-enforcement assumption.

The active configuration directory must be excluded from ordinary vault-content synchronization and handled only by the selective configuration policy.

### Selective Configuration Classification

Implement an explicit safe allowlist/classifier for configuration portability.

Classification must preserve these rules:

- only configuration with known portable semantics is eligible;
- unknown configuration is excluded by default;
- workspace/layout/session state remains device-local by default;
- caches/runtime/temp/lock/platform-specific state remains device-local;
- authentication secrets/tokens are protected and never synchronizable;
- device identity is protected and never synchronizable;
- synchronization base, Drive cursor, checkpoints/journal, tombstones, recovery state, logs, authoritative caches, and other operational state are protected and never synchronizable;
- this plugin may expose only a sanitized portable subset of its own nonsecret settings;
- arbitrary third-party plugin settings are not synchronized wholesale;
- effective inclusion/exclusion policy is representable for later user visibility.

Determine version-specific safe entries through current Obsidian evidence. Do not invent broad portability merely to create a larger allowlist.

### Path and Cross-Platform Compatibility

Implement preflight path validation suitable for the supported Windows/iOS pair.

At minimum handle:

- separator normalization for comparison;
- Unicode normalization/equivalence for comparison while preserving original safe names;
- case-only collisions that cannot coexist safely;
- Windows reserved/invalid names;
- invalid path components;
- path-length compatibility;
- Unicode-equivalent collisions;
- unsupported symlink/junction/alias/external reference cases;
- other target-platform incompatibilities discovered through current platform evidence.

Unsafe/colliding paths must return blocked conditions. Do not silently normalize, rename, discard, or overwrite user content.

### Local Observation and Stability

Implement per-path observation that distinguishes:

- present stable file/folder;
- confirmed absent;
- unreadable;
- inaccessible;
- unknown/unsupported state.

For files, generate content/change evidence and observation tokens suitable for stale-precondition detection without making timestamps authoritative.

Files still being actively written must not be presented as stable transfer inputs. Implement a mobile-safe stability/precondition mechanism appropriate to Obsidian/runtime capabilities.

A local read/access failure must never become deletion evidence.

### Bounded Large-File Read Behavior

Implement `readFile()` so the frozen `BinaryContentSource` can be consumed incrementally with bounded memory appropriate to iOS, rather than requiring an arbitrary small file-size ceiling.

You must inspect actual current Obsidian mobile APIs before choosing the mechanism.

Do **not** satisfy this requirement by importing Node filesystem streams, Electron, desktop-only `FileSystemAdapter` behavior, or another API unavailable to required iOS runtime paths.

If current supported Obsidian mobile APIs make truly bounded incremental reading impossible behind the frozen contract, do not hide that fact by wrapping an already-whole-file buffer in multiple chunks and claiming bounded memory. Treat it as an engineering/platform blocker: document the exact supported API limitation and return it to the supervisor under the frozen-contract/platform-change procedure.

### Safe Create and Replacement

Implement local create/replace semantics through mobile-compatible Obsidian/runtime behavior.

Requirements:

- never expose a partial download/rewrite as valid final vault content;
- use atomic replacement or a functionally equivalent safe staging/commit approach wherever the platform permits;
- preserve previously valid content on failure;
- local disk/storage exhaustion must stop the affected write and surface failure without partially replacing valid content;
- consume `BinaryContentSource` without introducing unbounded whole-file accumulation when a bounded supported mechanism exists;
- create folders explicitly so empty directory structure can be preserved.

If the platform cannot provide a required atomicity/resource guarantee through supported mobile-safe APIs, document the exact limitation instead of silently weakening the target.

### Rename/Move and Obsidian Semantics

Implement local rename/move using Obsidian-supported file-management behavior where needed to preserve Obsidian link-update semantics.

Do not bypass Obsidian carelessly with desktop filesystem rename APIs.

A proven remote rename applied locally should be able to preserve user-visible Obsidian behavior. Ambiguous identity classification belongs to Phase 2; Phase 4 performs the requested safe move.

### Recoverable Local Deletion

Implement local deletion through recoverable Obsidian/local trash where feasible.

Requirements:

- do not hard-delete as ordinary synchronization behavior;
- do not automatically purge local trash/recovery stores;
- surface inability to trash safely rather than silently destroying content.

Deletion authorization/policy belongs to Phase 2/5, not this adapter.

### Local Change and Lifecycle Observation

Implement change/lifecycle seams required by later orchestration:

- created/modified/deleted/renamed events;
- vault-ready/startup readiness;
- resume;
- suspend;
- unload.

The boundary must provide enough truthful events for Phase 5 to debounce/coalesce changes and avoid interpreting initialization-generated activity as user changes.

Do not start synchronization from this adapter. Trigger scheduling/orchestration belongs to Phase 5.

### Offline/Local-First Independence

All local-vault behavior required here must remain usable when:

- the network is offline;
- Google Drive is unavailable;
- Google authentication is missing/revoked.

The local adapter must not require Phase 3 to read or edit the local vault.

### Lifecycle Non-Destruction

Plugin disable/unload/device unlink semantics within the local boundary must not delete:

- local vault content;
- conflict/recovery content;
- shared remote content;
- recovery state required for safe reconnection.

Final device-removal workflow belongs to Phase 5, but the local boundary must not introduce destructive side effects.

### BRAIN Asset Boundary

The existing external Google Drive BRAIN asset repository is not a local-vault synchronization target and must not enter this adapter's management scope.

Local filesystem semantics remain:

- an independently placed binary in `00-Inbox` is an ordinary vault file;
- a binary embedded inside a container such as DOCX remains part of that opaque containing file;
- an Obsidian-materialized attachment is a separate ordinary vault object;
- no AI classification, externalization, Drive-link insertion, or semantic asset processing occurs here.

## Implementation Scope

Implement the smallest coherent Phase 4 production modules and tests necessary to satisfy this phase.

Expected existing integration points are:

- frozen `LocalVaultPort` and related types in `src/contracts/local-vault.ts`;
- `BinaryContentSource`, `ContentEvidence`, `ObservationToken`, and `VaultPath` in `src/contracts/common.ts`;
- observation/completeness types in `src/contracts/snapshot.ts`;
- existing `createLocalVaultFake` seam in `src/testing/fakes.ts`;
- Obsidian package typings already present in the repository.

You may:

- create Phase 4-owned modules under `src/` for Obsidian local I/O, path compatibility, exclusions, config policy, lifecycle/change observation, safe staging/replacement, and the production `LocalVaultPort` implementation;
- extend non-frozen fakes/fixtures needed for tests;
- add Phase 4 tests under `test/`;
- add narrowly justified mobile-compatible dependencies;
- update package/build configuration only when mechanically necessary;
- append Phase 4 evidence to `dev/evidence/_ca-output.md`.

Exact private module/file/class names remain engineering discretion after repository/API inspection.

Do not alter `src/contracts/**` unless and until the supervisor explicitly approves a frozen-contract revision.

## Required Requirement Coverage

Your implementation must satisfy the Phase 4 assignment in `stage-1-build-decomposition.md`, including:

- `SYS-002` through `SYS-004` and `SYS-007` at the local/platform boundary;
- local-trigger/lifecycle portions of `SYNC-003`, `SYNC-004`, `SYNC-006`, `SYNC-007`, `SYNC-011`, and `SYNC-012`;
- local-facing portions of `XFER-002`, `XFER-003`, and `XFER-006`;
- `FILE-001` through `FILE-015`;
- `CONFIG-001` through `CONFIG-009`;
- local-facing `MOVE-004` behavior;
- local recoverable-deletion behavior;
- `FAIL-001`, `FAIL-005`, `FAIL-006`, and `FAIL-007` at the local/platform boundary;
- `ASSET-001` through `ASSET-008`;
- `LIFE-001` and `LIFE-002`;
- `INV-003`, `INV-012` through `INV-014`, `INV-017`, `INV-018`, and `INV-020` at the local/platform boundary.

Do not silently absorb Phase 2 synchronization policy, Phase 3 Drive/OAuth behavior, or Phase 5 final orchestration/UI.

## Fixed Decisions and Invariants

You may not reinterpret these constraints:

- Windows and iPhone/iOS are first-class targets;
- required iOS behavior cannot depend on Node/Electron/Windows-only APIs;
- local editing remains available when remote sync/auth/network is unavailable;
- all in-scope file types are preserved, including unknown/binary files;
- empty directories are preserved;
- hidden/dotfiles are included unless explicitly excluded;
- exclusions are explicit/visible/configurable and symmetric in meaning;
- symlink/junction/external targets are never followed outside the vault boundary;
- read/access failure is not deletion;
- path/Unicode/case incompatibilities are blocked/surfaced rather than silently normalized into loss;
- active Obsidian config directory is discovered from runtime, not assumed permanently `.obsidian`;
- config sync is selective, safe, and unknown-excluded by default;
- secrets/device identity/synchronization operational state never synchronize;
- local replacement must not expose partial content as valid final content;
- local deletion is recoverable where feasible;
- local rename/move should use Obsidian semantics where required for link behavior;
- large files must remain viable with bounded mobile resources rather than arbitrary product-level size ceilings;
- the external BRAIN asset repository is outside the plugin's synchronization-management scope;
- disable/uninstall/device unlink are non-destructive;
- frozen shared contracts may not be changed unilaterally.

## Implementation Discretion

You own ordinary Phase 4 engineering choices, including:

- exact local adapter/private module structure;
- exact Obsidian API calls consistent with supported desktop/mobile behavior;
- path normalization/comparison helper implementation;
- explicit default exclusion patterns;
- version-specific safe configuration allowlist/classifier entries;
- stability detection mechanics;
- observation-token/hash/cache mechanics at the local boundary;
- safe staging/atomic-equivalent replacement mechanics supported by the platform;
- local resource-pressure safeguards;
- change/lifecycle subscription implementation;
- internal tests/fixtures.

Use this discretion only where alternatives do not materially alter the specified product.

## Verification and Acceptance Criteria

Phase 4 is not complete because an adapter class compiles. Establish objective evidence for all applicable requirements.

### Enumeration and File-Scope Tests

Automated tests must cover:

- ordinary text file enumeration;
- binary/unknown-extension enumeration;
- empty directories;
- hidden/dotfiles;
- explicit exclusions;
- conservative default noise exclusions;
- exclusion symmetry semantics;
- active config directory separation;
- unsupported external-reference refusal;
- unreadable/inaccessible paths without deletion inference;
- honest completeness/failure reporting.

### Path Compatibility Tests

Tests must cover at minimum:

- separator normalization;
- Unicode-equivalent representations;
- case collisions;
- reserved Windows names;
- invalid filename/path components;
- path-length preflight;
- Unicode collisions;
- unsupported symlink/junction/alias/external reference;
- preservation of original safe names rather than silent renaming.

### Configuration Tests

Tests must prove:

- active config directory is runtime-derived, not policy-hard-coded to `.obsidian`;
- known portable configuration can be classified portable;
- unknown configuration is excluded by default;
- workspace/session/cache/platform state remains local;
- authentication/token material is protected;
- device identity is protected;
- synchronization operational state is protected;
- broad third-party plugin settings are not automatically portable;
- protected values cannot become synchronizable merely because a path pattern is broad.

### Observation/Stability Tests

Tests must prove:

- present, absent, unreadable, inaccessible, and unknown remain distinct;
- unstable/mid-write content is not returned as a stable transfer input;
- observation-token/precondition evidence changes when the observed stable version changes;
- advisory timestamps do not become correctness authority;
- read/access failure cannot authorize deletion.

### Large-File and Transfer-Boundary Tests

Tests must demonstrate that the actual selected local read/write mechanism satisfies the target rather than merely the TypeScript shape.

At minimum verify:

- `readFile()` produces a lazy `BinaryContentSource` that begins consumption without requiring complete-file materialization **when supported by the actual selected runtime API**;
- large-file behavior does not impose an arbitrary small product-level ceiling;
- bounded memory/resource behavior is explicit and testable;
- create/replace consume content safely;
- no mobile-required source imports Node streams/filesystem/Electron/Windows-only APIs.

A fake multi-chunk source alone is not proof that the production Obsidian adapter reads large local files with bounded memory. If supported mobile Obsidian APIs make bounded incremental local I/O impossible, report a concrete platform blocker instead of claiming success.

### Safe Write/Failure Tests

Tests must cover:

- create file;
- replace existing file;
- safe staging/commit or atomic-equivalent behavior;
- interruption/failure before final replacement does not corrupt valid prior content;
- local storage/disk exhaustion preserves valid existing content and returns an actionable failure;
- folder creation for empty directories;
- no partial final content becomes visible as a successful replacement.

### Trash and Move Tests

Tests must cover:

- recoverable local trash;
- no automatic permanent trash purge;
- local rename/move through Obsidian-supported semantics;
- behavior needed to preserve Obsidian link-management expectations where the platform supports it;
- failure isolation without destructive fallback.

### Lifecycle and Offline Tests

Tests must cover:

- vault-ready/startup event;
- resume;
- suspend;
- unload;
- local change events including rename;
- startup/initialization events can be distinguished/handled so later orchestration does not immediately sync partial startup state;
- local adapter remains functional with no remote/auth/network dependency;
- disable/unload/device unlink does not delete vault content.

### Architecture/Mobile Verification

Inspect production dependency/import paths and add/update automated guards as needed to prove:

- iOS-required modules do not import Node/Electron/Windows-only facilities;
- no secret-bearing data is introduced into synchronized config/domain payloads;
- no code path enumerates or mutates the separate Google Drive BRAIN asset repository;
- synchronization policy is not implemented inside the local adapter.

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
2. open a pull request from `stage-2a-phase-4-obsidian-local` to `master` to trigger `.github/workflows/phase1-ci.yml`;
3. do **not** merge it;
4. inspect the actual workflow run, jobs, step results, and decoded logs;
5. verify `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` all executed and passed;
6. verify from logs that Phase 4 tests were discovered/executed and record actual test/failure counts.

Do not substitute ad hoc snippets for the repository gate when GitHub Actions is available.

### Real-Platform Evidence Boundary

Perform real Windows/iPhone Obsidian checks only when the environment/tools actually permit them without unsafe workarounds. Do not fabricate device evidence.

Phase 4 must nevertheless prove every behavior that can be verified through current API inspection, automated tests, and mobile-safe architecture checks. Explicitly record any final real-device lifecycle/storage behavior that must be confirmed in Phase 5/6 under the Stage 1 plan.

## Evidence Requirements

Before reporting completion, append a clearly delimited section for **Stage 2A Build Session 04 / Phase 4** to:

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
- current Obsidian API/platform evidence material to local I/O/config/lifecycle choices;
- every file created, modified, and deleted, derived from the actual Git change set;
- frozen-contract status (`unchanged` unless a supervisor-approved revision exists);
- real-device evidence actually obtained and explicit later-phase carry-forward;
- any platform limitation or large-file/atomicity blocker discovered;
- deviations, blockers, limitations;
- final worker status.

After updating evidence, ensure the evidence commit is pushed and the PR reflects it. If the evidence update triggers a new CI run, use the latest successful run as final verification evidence.

## Non-Goals

Do not implement in this phase:

- synchronization planning/conflict/deletion policy;
- durable Phase 2 synchronization-state engine;
- Google OAuth;
- Google Drive REST/Changes API behavior;
- final plugin commands/settings/onboarding/sync-preview/conflict/recovery/audit UI;
- startup/local-change/periodic sync scheduling or run orchestration;
- final end-to-end synchronization execution;
- AI/semantic BRAIN asset processing;
- management of the external Google Drive BRAIN asset repository;
- arbitrary third-party settings synchronization;
- desktop-only optimizations that leak into required mobile behavior;
- Stage 5 integration or Stage 6 hardening.

## Completion Response

When finished, respond concisely with:

1. Phase 4 implementation summary;
2. major local I/O/config/path/lifecycle engineering decisions and their current Obsidian API basis;
3. verification PR number, workflow run ID/job ID, commands, test count, and results;
4. production large-file bounded-I/O evidence or exact platform blocker;
5. real Windows/iPhone evidence actually obtained or exact permitted carry-forward limitation;
6. complete created/modified/deleted file manifest;
7. branch and final pushed commit SHA;
8. `dev/evidence/_ca-output.md` update status;
9. any remaining blocker or frozen-contract change request.

Do not claim supervisory approval. Stop after Phase 4 implementation, evidence, push, and PR verification.
