# Stage 2A Build Session 01 — Phase 1 Repository Foundation and Frozen Shared Contracts

## Role

You are the coding agent responsible for **Stage 2A Build Session 01 / Build Phase 1** of the BRAIN Google Drive Sync Obsidian plugin.

Your job is to implement **only Phase 1 — Repository Foundation and Frozen Shared Contracts** from the authoritative Stage 1 decomposition. This is the prerequisite gate for later supervised parallel construction. Do not implement later-phase product behavior merely because donor repositories already contain it.

## Mandatory Authority Ingestion Before Modification

Before modifying the repository, completely read these repository files:

1. `agent-led-software-product-construction-manual.md`
2. `target-system-specification.md`
3. `decision-register.yaml`
4. `stage-1-build-decomposition.md`
5. `../security-prompt-header.md`

Treat them according to the authority rules defined by the target-system specification and decision register.

Then inspect the **actual current repository state**. Do not assume the repository still matches the supervisor's earlier snapshot.

Before writing code, report internally/for your own execution planning which repository files, source trees, build files, tests, or other implementation artifacts currently exist. If prior implementation work unexpectedly exists, inspect it and adapt this phase to the actual state rather than overwriting it blindly.

## Repository and Donor Grounding

The project repository is:

`woodpk/gdrive-sync-obsidian-plugin`

At the last supervisor inspection before this prompt was written, the repository root contained only `../../.idea` and `..`; no product source tree, plugin manifest, package/build configuration, or automated test suite existed. **Verify this yourself before acting.**

The established donor strategy is:

- **Primary engineering foundation/baseline:** `laupas/google-drive-mirror`
- **Secondary donor/reference:** `kebl3541/Obsidian-Google-Drive-Merge-Sync`

The Stage 1 grounding snapshot examined Mirror at commit `886f47a0e52e71a33cd2833b4a013f9b81d68464` and Merge Sync at commit `2b4c27b4d18fea52ae3e8239a89ee50bd4ae5222`.

Before choosing the Phase 1 adoption strategy, inspect the current donor repositories and the directly relevant source/tests rather than relying on summaries alone. If donor HEAD has materially changed since those grounding commits, determine whether the change is relevant to this phase.

The direct-fork-versus-adaptation/transplant decision is an **engineering decision for this phase**. Resolve it through evidence. The result must preserve the target product rather than preserve donor behavior for its own sake.

## Objective

Establish a buildable, testable, mobile-compatible Obsidian plugin repository and freeze the shared source-level contracts required for Phases 2, 3, and 4 to be implemented concurrently without independently inventing incompatible synchronization semantics.

This phase exists specifically because parallel work is prohibited until those boundaries are stable.

## Required End State

When this session is complete, all of the following must be true.

### Build and Plugin Foundation

- The repository contains a functioning TypeScript/JavaScript/npm Obsidian-plugin project.
- A clean checkout can install dependencies and build successfully using documented repository commands.
- An automated test baseline exists and runs successfully.
- The plugin manifest/runtime baseline is explicitly compatible with mobile Obsidian rather than desktop-only.
- Required mobile code paths do not depend on Node.js, Electron, Windows-only APIs, PowerShell, .NET executables, native Windows libraries, or other desktop-only facilities.
- No credentials, tokens, private OAuth secrets, or developer-controlled telemetry are introduced.

### Donor-Adoption Decision

- Choose and implement the repository foundation strategy: direct Mirror fork/adaptation, substantial selective adaptation, or another evidence-supported reuse strategy consistent with the authoritative donor decisions.
- Preserve reusable donor engineering only where it is compatible with the target system.
- Do not import superseded donor semantics such as timestamp-winner conflict resolution, broad Google Drive scope as product authority, desktop-assisted mobile token transfer, unsafe state-corruption fallback, or delete/recreate rename semantics as fixed behavior.
- Keep donor provenance/license obligations intact for any reused code.

### Frozen Shared Contracts

Implement stable source-level contracts, types, and test seams for all shared concepts defined in `stage-1-build-decomposition.md` Section 4.

#### Snapshot and Observation Contract

The contract must be capable of representing, without ambiguity:

- local existence and remote existence;
- successful observation versus unreadable/inaccessible/unknown observation;
- stable logical/path identity and stable remote object identity where available;
- content/change evidence without making timestamps authoritative;
- trustworthy base/history evidence;
- deletion/tombstone evidence;
- file-stability evidence;
- remote-enumeration/change-feed completeness sufficient for deletion reasoning;
- identity/path ambiguity or blocking conditions.

Do not implement full reconciliation policy in this phase. Establish the representation and boundary needed by Phase 2.

#### Synchronization Plan Contract

The plan contract must support at least these material outcomes:

- no-op;
- upload/create;
- upload/update;
- download/create;
- download/update;
- identity-preserving rename/move;
- clean text merge;
- unresolved conflict;
- recoverable local deletion/trash;
- recoverable remote deletion/trash;
- blocked/unsafe operation;
- recovery-required condition.

Planned operations must be capable of carrying preconditions and enough reason/evidence metadata for later preview, execution validation, safety policy, diagnostics, audit, and deterministic testing.

Do not implement the final planning algorithm in this phase.

#### Local Vault Boundary Contract

Create a mobile-safe abstraction through which later synchronization logic can request or observe the capabilities required by the target system, including:

- safe vault enumeration;
- file/folder observation and content access;
- safe create/update/replace behavior;
- rename/move behavior;
- recoverable local deletion/trash;
- path compatibility/validation;
- configuration classification boundary;
- local change/lifecycle observation where required by later orchestration.

The core synchronization domain must not be forced to depend directly on desktop filesystem APIs.

Do not implement the complete Obsidian local adapter in this phase.

#### Google Drive Boundary Contract

Create an abstraction through which later synchronization logic can use:

- authentication/session availability without exposing secret material to the domain;
- managed-root creation/pairing and identity validation;
- stable Drive file/folder IDs;
- file/folder CRUD semantics required by synchronization;
- identity-preserving remote rename/move;
- recoverable Drive trash;
- content upload/download and integrity-relevant metadata;
- incremental Drive changes/change cursors;
- complete reconciliation listing with explicit completeness/failure semantics;
- retry/rate-limit/quota signaling;
- remote protocol/schema information.

Do not implement the complete live Google Drive/OAuth integration in this phase.

#### Durable State Contract

Create the source-level state boundary and model needed to represent:

- trustworthy synchronization base/history;
- stable vault identity;
- stable device identity;
- remote-object mappings;
- tombstones/deletion history;
- Drive change cursors;
- checkpoint/operation state including completed, pending, and uncertain outcomes;
- schema/version information;
- trusted versus recovery-required state;
- state integrity/migration/backup concepts required by later implementation.

Do not choose an unsafe semantic in which malformed or absent persisted state silently becomes a valid empty base.

Concrete persistence technology may be selected now only insofar as needed to establish a clean repository architecture; the full durable-state implementation belongs to Phase 2.

#### Conflict and Merge Contract

Establish representations that distinguish:

- no conflict;
- clean merge;
- unresolved text conflict;
- opaque/binary conflict;
- delete-versus-modify conflict;
- preserved alternates/provenance;
- user resolution outcomes.

No contract may encode newest-timestamp-wins semantics as an allowed correctness rule.

Do not implement the complete merge/conflict engine in this phase.

#### Execution Result and Commit Contract

Establish result/precondition semantics capable of distinguishing:

- durable verified success;
- retryable failure;
- non-retryable/blocking failure;
- stale-precondition/re-plan requirement;
- cancellation;
- uncertain/ambiguous outcome;
- recovery-required outcome.

The architecture must permit the required commit ordering: validate precondition → perform mutation → verify durable result/content identity → only then record authoritative synchronization success.

Do not implement the complete executor in this phase.

#### Status, Audit, and User-Action Contract

Establish shared state/events/models sufficient for the eventual UI/product layer to represent or request:

- idle/ready;
- planning;
- syncing;
- offline/deferred;
- authentication required;
- paused;
- conflict present;
- destructive plan blocked;
- recovery required;
- error;
- plan preview/execution approval;
- conflict resolution;
- destructive-plan approval;
- pause/resume;
- Verify/Reconcile Vault;
- privacy-safe audit/history records.

The UI layer must not need to implement independent synchronization policy to use these contracts.

Do not implement the final product UI in this phase.

### Contract Test Seams

- Provide fakes, test doubles, fixtures, contract tests, or equivalent seams that allow Phase 2 to test synchronization semantics without live Google Drive or a real Obsidian vault.
- Provide seams that allow Phase 3 and Phase 4 to verify their adapter implementations independently against the frozen shared contracts.
- Every shared contract family above must be exercised by at least one compile-time/unit/contract-level test sufficient to prove it is usable and does not merely exist as dead declarations.

### Persisted Parallel-Handoff Artifact

Create:

`phase-1-shared-contracts.md`

This document is not a duplicate target specification. It must record the **actual repository-grounded interfaces/contracts created by Phase 1** so successor supervisors and the Phase 2/3/4 agents can work without relying on chat history.

It must contain:

- the exact source file/module location of each frozen shared contract;
- the exact public type/interface names that later phases must consume;
- concise semantic responsibility of each contract;
- ownership assignment for Phases 2, 3, and 4;
- allowed dependency direction;
- how fakes/test doubles are provided;
- the procedure for reporting a required shared-contract change to the supervisor instead of editing it unilaterally;
- any donor code retained at the foundation level and why;
- any donor code/architecture deliberately rejected at the foundation level because it conflicts with the target system;
- exact build/test commands verified in this session.

Use strict Markdown with a single `#` title and organized `##`/`###` headings.

## Required Architecture Rules

- The target-system specification outranks donor implementation behavior.
- Shared contracts must represent required semantics without over-prescribing private implementation mechanics.
- Synchronization/planning policy belongs in the synchronization/domain layer, not inside Google Drive transport, Obsidian I/O, or UI adapters.
- Google Drive and Obsidian adapters must be replaceable/testable behind the shared contracts.
- Mobile-required dependency paths must remain platform-safe.
- Timestamps may be represented as advisory metadata but may not be modeled as authoritative winner-selection evidence.
- Missing/corrupt state, inaccessible local paths, and incomplete remote enumeration must be representable distinctly from confirmed deletion.
- Authentication success and remote-vault identity validation must remain separate concepts.
- The external Google Drive BRAIN asset repository must not enter the managed synchronization-domain abstraction.
- No contract may create a general destructive force-sync bypass.
- No external telemetry may be introduced by default.

## Implementation Scope

Because the repository was pre-implementation when this prompt was created, concrete future source paths and private class names are intentionally not prescribed. After inspection and donor-strategy selection, create the smallest coherent project/source/test layout that satisfies this phase and fits normal Obsidian TypeScript plugin engineering.

You may create or adapt:

- package/build configuration;
- Obsidian plugin manifest and minimal loadable entry point;
- source/module structure;
- shared domain/port/contract types;
- test configuration, fakes, fixtures, and architecture/contract tests;
- licensing/attribution files required by donor reuse;
- concise developer documentation necessary to reproduce build/test behavior;
- `phase-1-shared-contracts.md`.

Do not create later-phase implementations merely to populate interfaces.

## Fixed Decisions and Invariants

You may not reinterpret these Phase 1-relevant fixed decisions:

- product is a TypeScript/JavaScript/npm Obsidian plugin;
- Windows and iPhone/iOS are first-class targets;
- mobile-required behavior cannot depend on desktop-only APIs;
- one BRAIN vault, one personal Google Drive synchronization remote, one user in v1;
- normal sync will be bidirectional;
- Google authorization will use `drive.file` and user-owned OAuth infrastructure;
- same-device mobile authentication is required; desktop token transfer is not the product model;
- Google Drive Changes API is the target incremental remote-detection mechanism after baseline;
- explicit plan/dry-run semantics are required;
- persistent trustworthy base/history is required;
- missing/corrupt state enters recovery rather than becoming a valid empty base;
- timestamps are advisory only;
- concurrent text conflict semantics require three-way merge and complete-version preservation for true conflicts;
- binary conflicts preserve complete versions;
- delete-vs-modify preserves modification;
- proven renames/moves preserve identity where possible;
- deletion is recoverable and guarded by destructive-safety policy;
- first sync is safe union with no deletion propagation before a trustworthy base;
- active Obsidian configuration is selectively synchronized, not blindly copied;
- secrets and operational state never synchronize;
- unknown ordinary vault files synchronize as opaque binary;
- no external telemetry by default;
- the existing Google Drive BRAIN asset repository is outside synchronization management;
- Google Drive Mirror is the primary engineering baseline and Merge Sync is a secondary donor, but neither defines product semantics.

## Implementation Discretion

You retain engineering authority over ordinary Phase 1 mechanics, including:

- fork/adaptation/transplant strategy after donor inspection;
- exact source directory/module organization;
- exact names of private helpers and internal types;
- TypeScript build/test tooling and equivalent library choices;
- precise public contract type names, provided their semantics satisfy this prompt and are frozen/persisted at session completion;
- whether contracts use classes, interfaces, discriminated unions, value objects, or equivalent TypeScript structures;
- exact dependency-injection/composition technique;
- exact test framework and fake implementation style;
- ordinary refactoring required to adapt donor code cleanly.

Do not use this discretion to make later product decisions or to weaken the target semantics.

## Dependencies

This session has no prior implementation-phase dependency. Its authorities are the Stage 1 artifacts and repository/donor evidence.

Phases 2, 3, and 4 depend on this session and must not be started until the supervisor has verified Phase 1 completion and accepted the frozen shared contracts.

## Verification and Acceptance Criteria

Before reporting completion, perform all of the following that are applicable to the repository you establish.

### Repository Build

- Install dependencies from a clean/reproducible state.
- Run the production build successfully.
- Run TypeScript/static checking if separate from the build.
- Run the complete Phase 1 automated test suite successfully.

### Mobile-Safety Verification

- Verify the plugin manifest/runtime is not desktop-only.
- Inspect dependency/import paths used by mobile-required foundation/contracts and prove they do not import Node/Electron/Windows-only facilities.
- Add an automated architecture/import guard if reasonably achievable without unnecessary machinery; otherwise record exact inspection evidence in the completion artifact.

### Contract Verification

For every frozen contract family, prove through tests or compiled fake usage that:

- Phase 2 can consume snapshots/state and produce plans/results without a real Drive or Obsidian adapter;
- Phase 3 can implement the Drive boundary without needing synchronization-policy logic;
- Phase 4 can implement the local boundary without needing synchronization-policy logic;
- UI/status consumers can later observe/request actions without bypassing the synchronization engine;
- deletion-unsafe conditions can be represented distinctly from confirmed deletion;
- stale/uncertain/recovery conditions can be represented without being collapsed into success or absence;
- timestamps are not structurally required as a winner-selection field;
- secrets are not part of synchronized configuration/domain payload contracts.

### Donor-Semantics Review

Explicitly inspect retained donor code for semantics that conflict with the target specification. Correct or exclude such behavior at the foundation boundary. At minimum check for:

- newest-mtime conflict winners;
- broad Google Drive scope as an assumed contract;
- desktop-assisted mobile token transfer assumptions;
- missing/corrupt state silently becoming empty trusted state;
- delete/recreate rename as the only rename semantic;
- full-tree polling being embedded as the only remote-detection contract;
- desktop-only dependencies leaking into mobile-required modules.

### Persisted Evidence

`phase-1-shared-contracts.md` must be complete and match the actual code committed by this session.

Document the exact commands run and their results. Do not claim a check passed unless you actually executed it.

## Non-Goals

Do not implement in this session:

- complete reconciliation/planning semantics;
- durable production sync-state persistence/recovery engine;
- complete Google OAuth or Drive REST client;
- complete Changes API integration;
- complete Obsidian local filesystem/configuration adapter;
- three-way merge engine beyond the contract/test seam needed now;
- conflict-resolution UI;
- first-sync/onboarding workflow;
- automatic sync scheduling/orchestration;
- full transfer/executor logic;
- mass-deletion threshold implementation;
- final audit/history implementation;
- real-device end-to-end validation;
- any v1-excluded feature.

If donor code brings these capabilities in incidentally, keep them isolated and do not treat them as accepted product implementations unless they are necessary to the Phase 1 foundation and demonstrably conform to the target. Avoid spending this session finishing later phases.

## Parallelism and Contract-Change Rule

This Phase 1 session is sequential and owns creation of the frozen shared contracts.

After supervisor acceptance, Phases 2, 3, and 4 may run concurrently. Those later workers are prohibited from independently changing the frozen shared contracts.

If you discover during this session that a required contract cannot be defined without making a genuine unresolved product decision, stop only that affected decision, explain the materially different product alternatives, and return it to the supervisor/user. Resolve ordinary engineering uncertainty yourself through inspection and analysis.

## Completion Report

When finished, report concisely:

1. the donor-adoption strategy selected and why;
2. the exact build/test foundation created;
3. the exact shared contract modules/types frozen;
4. the Phase 2/3/4 ownership boundaries established;
5. tests/build commands executed and results;
6. the path and contents status of `phase-1-shared-contracts.md`;
7. any deviations, blockers, or unresolved product-authority decisions;
8. the commit/branch or other repository evidence containing the completed work.

Do not declare Phase 1 complete if any acceptance criterion is unverified.