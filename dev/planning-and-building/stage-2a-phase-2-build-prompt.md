# Stage 2A Build Session 02 — Phase 2 Core Synchronization Semantics and Durable State

## Role

You are the coding agent responsible for **Stage 2A Build Session 02 / Build Phase 2** of the BRAIN Google Drive Sync Obsidian plugin.

Your job is to implement **only Phase 2 — Core Synchronization Semantics and Durable State** from the authoritative Stage 1 decomposition. You are one worker in a three-agent parallel construction wave. Phase 3 and Phase 4 are being implemented independently against the same frozen Phase 1 contracts.

You are a coding/build agent, not the product authority and not the overall construction supervisor. You may resolve ordinary engineering mechanics inside your assigned ownership, but you must not reinterpret product requirements, alter frozen cross-workstream semantics, or absorb another phase merely because doing so appears convenient.

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

Then inspect the actual repository at the assigned baseline, including all of `src/contracts/**`, `src/testing/fakes.ts`, current tests, package/build configuration, and any Phase 2 implementation already present. Do not infer current implementation from this prompt when direct repository inspection can establish it.

## Repository Baseline and Isolation

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Authoritative integration branch:

`master`

Supervisor-approved parallel-wave baseline:

`e16719196269b4b31f8f1a4997722cdd1c916058`

Create and work only on an isolated branch rooted at that exact commit:

`stage-2a-phase-2-core-sync-state`

Do not implement directly on `master`. Do not merge your own branch or pull request. The supervising agent owns acceptance and integration.

At the approved baseline, the repository contains only the Phase 1 plugin foundation, frozen contracts, test fakes, and contract/mobile-safety tests. There is no Phase 2 production implementation to preserve unless you discover that your assigned branch was altered after creation; inspect before editing.

## Objective

Implement the deterministic synchronization decision model and durable operational-state/recovery model that make safe bidirectional synchronization possible independently of concrete Google Drive and Obsidian I/O.

The finished Phase 2 must be testable entirely through the frozen Phase 1 contracts and fakes. It must not require a live Google Drive account, a real Obsidian vault, Phase 3, Phase 4, or Phase 5 orchestration to prove its domain/state semantics.

## Current Frozen Contracts

The Phase 1 cross-workstream contracts are frozen and are **read-only for this worker** unless the supervisor explicitly approves a contract revision.

Relevant frozen modules include:

- `src/contracts/common.ts`
  - `src/contracts/snapshot.ts`
  - `src/contracts/plan.ts`
  - `src/contracts/state.ts`
  - `src/contracts/conflict.ts`
  - `src/contracts/execution.ts`
  - `src/contracts/local-vault.ts`
  - `src/contracts/google-drive.ts`
  - `src/contracts/status-audit-actions.ts`
  - `src/contracts/index.ts`

Important current semantics include:

- `PathSnapshot` distinguishes present/absent/unreadable/inaccessible/unknown observations, remote completeness, base trust, and identity ambiguity.
  - `SynchronizationPlanner` consumes `PlanningInput` and returns an explicit `SynchronizationPlan` using the frozen operation vocabulary.
  - `SynchronizationStateStore` distinguishes `trusted`, true `uninitialized`, and `recovery-required` state.
  - `ConflictAssessment` distinguishes clean merge, unresolved text conflict, opaque/binary conflict, and delete-vs-modify.
  - `SynchronizationExecutor` / `AuthoritativeSuccessCommitter` encode stale-precondition handling and verify-before-authoritative-commit ordering.
  - `LocalVaultPort` and `GoogleDrivePort` are adapter boundaries owned by Phases 4 and 3 respectively; Phase 2 may consume them but must not implement their production adapters.
  - binary transfer uses the platform-neutral lazy `BinaryContentSource` contract rather than whole-file transfer payloads.

If a frozen contract is genuinely insufficient to satisfy a Phase 2 requirement, do **not** edit it. Record the exact type/member deficiency, the requirement it prevents, the smallest semantic change needed, and affected workstreams; stop only dependent work and report the contract-change request to the supervisor.

## Required End State

When this session is complete, all of the following must be true.

### Deterministic Reconciliation Planner

A production Phase 2 planner must deterministically derive an explicit synchronization plan from LOCAL + REMOTE + trustworthy BASE/history evidence without mutating either side.

The planner must correctly distinguish and represent at least:

- unchanged/equal content → no-op;
  - fresh local-only content → upload/create;
  - fresh remote-only content → download/create;
  - only-local modification → upload/update;
  - only-remote modification → download/update;
  - divergent same-path content with no trustworthy base → preserve-both/unresolved conflict, never overwrite;
  - both recognized text sides changed from a trustworthy common base → three-way merge classification;
  - proven clean text merge → clean-merge operation;
  - true text conflict → unresolved conflict preserving complete-version provenance;
  - independently changed opaque/binary content → binary conflict preserving both versions;
  - deletion versus independent modification in either direction → modification survives and conflict is surfaced;
  - both sides intentionally deleted from trustworthy prior state → safe tombstone/base transition;
  - one-sided attested deletion from trustworthy prior state → recoverable trash plan when safe;
  - proven rename/move → identity-preserving move;
  - ambiguous rename/identity → blocked/conflict outcome, never guessed reassignment;
  - unsafe path/completeness/observation signals supplied by the adapter boundaries → blocked or recovery-required result rather than destructive inference;
  - missing/corrupt/untrusted state → recovery-required planning with destructive propagation disabled.

The same planning semantics must be usable by later manual preview, automatic execution, diagnostics, and tests. Do not create a second unsafe planner/execution policy.

### Change Truth

Change classification must use trustworthy state, stable identity, content/hash evidence, and relevant metadata. Timestamps are advisory only.

Device clock skew, advisory modified times, or newest-mtime ordering must never determine overwrite/conflict winners.

### First-Synchronization Semantics

Implement the domain semantics for safe-union initialization:

- one-sided content copies to the missing side;
  - identical same-path content establishes agreement/no-op;
  - divergent no-base collisions preserve both and surface conflict;
  - no deletion propagation is possible before a trustworthy base exists;
  - partial, unreadable, inaccessible, unknown, or untrusted observations cannot be interpreted as deletion authority.

Final onboarding/preview UI and first-sync workflow orchestration remain Phase 5.

### Conflict and Merge Engine

Implement Phase 2 conflict/merge semantics behind the frozen conflict contract.

For safely recognized text content with a trustworthy BASE, LOCAL, and REMOTE version:

- perform true three-way merge reasoning;
  - return a clean merge only when the result is provably conflict-free;
  - preserve complete source-version provenance when unresolved;
  - never resolve by timestamp order.

For binary/opaque concurrent modifications, preserve both complete versions by reference/provenance and surface conflict.

For delete-vs-modify, preserve the modified version and surface the deletion conflict.

Select the concrete three-way merge algorithm/library through engineering evidence. Do not weaken the required semantics to fit a library.

### Rename and Identity Semantics

Implement evidence-based rename/move classification at the domain level:

- stable remote identity and trustworthy historical/content evidence may establish a rename/move;
  - path alone is not identity;
  - ambiguous candidate matches are never guessed;
  - Drive file-ID preservation is requested through the frozen operation/adapter semantics, while the actual Drive move belongs to Phase 3;
  - local Obsidian move behavior belongs to Phase 4.

### Deletion, Tombstones, and Stale Devices

Implement the core destructive-safety model:

- only reliably observed absence plus trustworthy prior state may become deletion evidence;
  - never-seen content, unreadable/inaccessible/unknown observations, partial remote enumeration, and untrusted state cannot authorize deletion;
  - tombstones prevent stale/offline devices from resurrecting intentionally deleted content;
  - tombstone/history retention is bounded/configurable but cannot expire while a known device is too stale to reconcile safely;
  - stale returning devices cannot authorize destructive propagation until reconciliation restores trustworthy current knowledge;
  - ordinary low-risk attested deletions can remain auto-eligible;
  - suspicious destructive plans are blocked before mutation and require review/approval plus a recoverable checkpoint;
  - there is no global force-sync/force-delete bypass.

Determine conservative numeric circuit-breaker thresholds/heuristics and tombstone-retention defaults as Phase 2 engineering decisions, and test them against both ordinary deletion and legitimate bulk-reorganization scenarios.

### Durable Operational State

Implement production durable-state behavior for the frozen `SynchronizationStateStore` semantics and the Phase 2 state model.

The implementation must support:

- stable vault identity;
  - stable random device identity;
  - trustworthy base/history;
  - remote-object mappings;
  - tombstones/deletion history;
  - Drive change cursor state;
  - operation/checkpoint journal status including pending/completed/uncertain;
  - known/stale device state;
  - explicit schema versioning;
  - recovery-required state;
  - safe backup/export evidence;
  - migration assessment and safe migration behavior;
  - clone/restore suspicion handling;
  - stale revision/concurrent state-write detection.

Missing, malformed, truncated, incompatible, internally inconsistent, or integrity-failed expected state must be detected as untrusted/recovery-required. It must never silently become a trusted empty base.

Choose the concrete persistence/journal/atomicity technology using repository/platform evidence. Any runtime persistence used by Phase 2 must remain compatible with the mobile-first target and must not introduce a Node/Electron/Windows-only requirement into iOS-required behavior.

### Crash-Consistent Commit Ordering

Implement state/execution coordination sufficient to preserve this authority order:

1. validate operation preconditions;
   2. perform or delegate the mutation;
   3. verify durable result/content identity;
   4. only then record authoritative synchronization success.

Interrupted work must retain enough durable evidence to distinguish completed, pending, and uncertain operations. Restart must safely resume or recompute without silently duplicating or losing data.

A stale operation precondition must invalidate/re-plan affected work rather than execute stale intent. Remote changes affecting planned work cause affected re-planning; local changes during a run are deferred to a subsequent reconciliation pass.

### Cancellation and Run-Level Core Semantics

Provide the Phase 2 state/execution semantics needed for later orchestration to:

- serialize a device's sync run;
  - stop starting new operations after cancellation is accepted;
  - safely finish or abandon the current atomic operation according to its result contract;
  - checkpoint only durable verified work;
  - resume/recompute later;
  - pause remote participation without corrupting local state;
  - isolate per-path failures when global state integrity remains trustworthy.

Do not implement final trigger scheduling/UI orchestration; that belongs to Phase 5.

## Implementation Scope

Implement the smallest coherent Phase 2 production modules and tests necessary to satisfy this phase.

Expected existing integration points are the frozen contracts listed above and the existing test seams in `src/testing/fakes.ts`.

You may:

- create Phase 2-owned production modules under `src/` for planning, change classification, conflict/merge, destructive safety, state persistence/recovery, and execution/commit coordination;
  - extend non-frozen fakes/fixtures needed for deterministic testing;
  - add Phase 2 tests under `test/`;
  - add narrowly justified dependencies for merge/state implementation when they are compatible with the mobile/runtime constraints;
  - update package/build configuration only when mechanically necessary for Phase 2;
  - append Phase 2 evidence to `dev/evidence/_ca-output.md`.

Exact private module/file names, class decomposition, helper functions, algorithms, storage representation, and dependency-injection mechanics remain your engineering discretion after inspection.

Do not alter `src/contracts/**` unless and until the supervisor explicitly approves a frozen-contract revision.

## Required Requirement Coverage

Your implementation must satisfy the Phase 2 assignment in `stage-1-build-decomposition.md`, including:

- `PLAN-001` through `PLAN-009`;
  - `CHANGE-001` through `CHANGE-003`;
  - `FIRST-001` through `FIRST-005` at the domain-semantic level;
  - `STATE-001` through `STATE-017`;
  - `CONFLICT-001` through `CONFLICT-011` at the domain-semantic level;
  - `MOVE-001`, `MOVE-003`, and `MOVE-005`;
  - `DELETE-001` through `DELETE-010` at the planning/safety level;
  - `XFER-005` and the state/commit-facing portions of `XFER-001` and `XFER-004`;
  - Phase 2 portions of `SYNC-008` through `SYNC-010`;
  - `INV-001` through `INV-009`, `INV-015`, `INV-016`, and `INV-019`.

Do not silently absorb Phase 3 transport/OAuth work, Phase 4 local/platform/config work, or Phase 5 UI/orchestration work.

## Fixed Decisions and Invariants

You may not reinterpret these constraints:

- LOCAL and REMOTE are peers after initialization; neither side is globally authoritative.
  - trustworthy BASE/history is required for deletion and concurrent-change reasoning.
  - timestamps are advisory only and cannot decide winners.
  - missing/corrupt state never becomes a valid empty base.
  - read/access/unknown/partial-enumeration conditions never become deletion evidence.
  - first sync is safe union with no deletion propagation before trustworthy state.
  - text concurrency uses BASE + LOCAL + REMOTE three-way semantics.
  - true text conflicts preserve complete recoverable versions.
  - binary conflicts preserve complete versions.
  - delete-vs-modify preserves the modification.
  - proven renames/moves preserve identity; ambiguous moves are not guessed.
  - ordinary deletion is recoverable; suspicious destructive plans are circuit-broken.
  - authoritative state cannot claim success before durable integrity-verified effects.
  - stale plans are invalidated/re-planned rather than silently reinterpreted.
  - no force-sync bypass may defeat deletion/conflict/state-integrity safeguards.
  - Phase 2 must remain testable without live Drive or a real Obsidian vault.
  - frozen shared contracts may not be changed unilaterally.

## Implementation Discretion

You own ordinary Phase 2 engineering choices, including:

- exact private module/class decomposition;
  - concrete state persistence and journal representation;
  - schema serialization and integrity/checksum strategy;
  - safe migration mechanics;
  - concrete three-way merge library/algorithm;
  - internal content/version resolver design behind the frozen contracts;
  - hash/cache optimization inside Phase 2 ownership;
  - circuit-breaker numeric thresholds and heuristics;
  - tombstone/history default retention parameters;
  - run-lock/state-write coordination mechanics that belong to the core/state layer;
  - internal test fixture design.

Use this discretion only where alternatives do not materially alter the specified product.

## Verification and Acceptance Criteria

Phase 2 is not complete because the code compiles. Establish objective evidence for all requirements below.

### Deterministic Reconciliation Matrix

Automated tests must cover the Phase 2/domain meaning of the reconciliation scenarios in Target Specification §13.2, including at minimum:

- fresh local only;
  - fresh remote only;
  - equal no-base collision;
  - divergent no-base collision;
  - unchanged both sides;
  - only-local modification;
  - only-remote modification;
  - both recognized text sides changed;
  - clean three-way merge;
  - true text conflict;
  - binary/opaque conflict;
  - attested local deletion;
  - attested remote deletion;
  - delete-vs-modify in both directions;
  - both deleted;
  - no-base absence;
  - unreadable/inaccessible/unknown local observation;
  - incomplete/failed/unknown remote enumeration supplied by the boundary;
  - clock skew/advisory timestamp variation;
  - stale-device/tombstone resurrection attempt;
  - identity-preserving rename classification;
  - ambiguous rename refusal;
  - boundary-supplied blocked path/identity conditions;
  - excluded/out-of-scope signals when represented in the supplied planning input;
  - unknown/binary content classification where the domain must remain opaque;
  - empty-folder/entity-kind semantics where they affect planning.

Tests must prove that changing advisory timestamps alone cannot change winner/conflict/deletion classification.

### State and Recovery Tests

Automated tests must cover:

- true first-install uninitialized state versus missing expected state;
  - malformed state;
  - truncated state;
  - incompatible schema version;
  - internally inconsistent state;
  - integrity-check failure;
  - migration assessment and safe migration with backup/checkpoint;
  - unsafe migration refusal;
  - stale revision/concurrent write;
  - clone/restore suspicion;
  - stale known device behavior;
  - tombstone retention safety;
  - diagnostic export without authentication secrets or full vault content;
  - operation journal pending/completed/uncertain transitions;
  - crash/fault points before mutation, after mutation before state commit, during/after state commit as far as Phase 2 can deterministically simulate;
  - verified-success-only authoritative commit ordering;
  - cancellation and restart/recompute semantics.

### Destructive-Safety Tests

Tests must prove:

- no first-sync deletion;
  - no deletion from corrupt/missing/untrusted state;
  - no deletion from local read/access uncertainty;
  - no deletion from incomplete remote enumeration;
  - ordinary small attested deletions may remain safe-auto-eligible;
  - suspicious mass deletion is blocked before mutation;
  - circuit-breaker signals include absolute count, percentage, abnormal divergence where available, and state-integrity/rebuild conditions;
  - approval semantics require a practical recovery checkpoint;
  - legitimate bulk reorganization can be reviewed/approved without a global bypass;
  - no unguarded force-delete/force-sync path exists.

### Architecture and Contract Verification

Prove through compilation/tests that:

- Phase 2 uses the frozen contracts without modifying their semantics;
  - no Phase 2 production module depends on concrete Phase 3 or Phase 4 implementations;
  - production synchronization policy remains outside Google Drive and local-vault adapter code;
  - no Node/Electron/Windows-only dependency leaks into iOS-required runtime paths;
  - no credentials or external telemetry are introduced.

### Repository Gate

The repository verification gate is:

```text
npm ci
npm run typecheck
npm test
npm run build
```

Use verification methods actually available in this customer-facing ChatGPT environment. If direct local npm execution is unavailable or npm registry access is blocked, do not report that as the final verification blocker when GitHub Actions can execute the repository gate.

Required procedure:

1. push your branch;
   2. open a pull request from `stage-2a-phase-2-core-sync-state` to `master` to trigger `.github/workflows/phase1-ci.yml`;
   3. do **not** merge it;
   4. inspect the actual workflow run, jobs, step results, and decoded logs;
   5. verify that `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` all executed and passed;
   6. verify from test logs that the Phase 2 tests were discovered and executed, with the actual test/failure count recorded.

Do not substitute ad hoc snippets for the repository gate when GitHub Actions is available.

## Evidence Requirements

Before reporting completion, append a clearly delimited section for **Stage 2A Build Session 02 / Phase 2** to:

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
  - every file created, modified, and deleted, derived from the actual Git change set;
  - frozen-contract status (`unchanged` unless a supervisor-approved revision exists);
  - deviations, blockers, limitations, or deferred Phase 5/6 real-device work;
  - final worker status.

After updating evidence, ensure the resulting evidence commit is pushed to the assigned branch and the PR reflects it. If that evidence update triggers a new CI run, use the latest successful run as final verification evidence.

## Non-Goals

Do not implement in this phase:

- live Google OAuth;
  - Google Drive REST/Changes API production transport;
  - concrete `GoogleDrivePort` implementation;
  - concrete Obsidian local-vault/platform/configuration adapter;
  - final plugin commands, settings UI, onboarding, preview UI, conflict/recovery UI, notifications, or audit UI;
  - startup/local-change/periodic trigger scheduling;
  - complete end-to-end transfer orchestration against real adapters;
  - real-device Windows/iPhone integration testing;
  - Stage 5 integration or Stage 6 hardening;
  - any v1-excluded feature.

## Completion Response

When finished, respond concisely with:

1. Phase 2 implementation summary;
   2. major engineering decisions made within Phase 2 discretion;
   3. verification PR number, workflow run ID/job ID, commands, test count, and results;
   4. complete created/modified/deleted file manifest;
   5. branch and final pushed commit SHA;
   6. `dev/evidence/_ca-output.md` update status;
   7. any remaining blocker, frozen-contract change request, or explicitly deferred integration/real-device limitation.

Do not claim supervisory approval. Stop after Phase 2 implementation, evidence, push, and PR verification.
