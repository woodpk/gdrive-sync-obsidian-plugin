# Phase 6 Synchronization Hardening — Workstream E Runtime / Lifecycle Evidence

## Identity and repository control

- Agent: `agt-CA-P6-SYNC-LIFECYCLE-01`
- Assignment: Workstream E — Runtime / Lifecycle
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Frozen synchronization contract: `phase6-sync-foundation-v1`
- Supervisor-approved workstream base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Assigned branch: `phase6-sync-lifecycle`
- Verified branch starting SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Final dynamically verified implementation/test SHA before this evidence-only commit: `60a7a194109ff6f6e1a0a6a7dfc5715511164722`
- Branch ancestry verification: compare from approved base reports `behind_by=0`; merge base is exactly the approved base.
- Branch creation: the assigned branch did not previously exist and was created directly from the approved base. No rebase or cherry-pick from another parallel worker was performed.
- Local worktree status: no local Git worktree could be materialized because this execution environment could not resolve `github.com` for `git clone`. All branch changes were made through the authenticated GitHub repository interface and are committed/pushed; there is no uncommitted branch state in GitHub. Executable verification was therefore performed through the repository's existing GitHub Actions workflow.

The exact SHA of the commit that creates/updates this evidence file cannot be embedded inside that same commit without an impossible self-reference. The exact final branch SHA is therefore read from GitHub after evidence closure and reported in the completion report, consistent with the foundation's established final-head recording rule.

## Re-entry and authoritative artifacts read

The assignment's later supervisor approval explicitly supersedes only stale candidate/authorization status wording in older planning artifacts. It does not weaken their architecture, contracts, safety rules, or ownership boundaries. That reconciliation was applied rather than restarting Stage 0 or Stage 1.

Repository copies read/reconciled for this workstream include:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. `dev/planning-and-building/stage-1-build-decomposition.md`, including requirement coverage and dependency/phase-gate material
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as read-only predecessor/integration context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. frozen contracts directly relevant to lifecycle behavior, especially `src/contracts/synchronization-foundation.ts`, `src/contracts/local-vault.ts`, `src/contracts/status-audit-actions.ts`, and their exports through `src/contracts/index.ts`
16. all five production files assigned to Workstream E and all four existing tests assigned to Workstream E; adjacent controller/local-adapter code was inspected read-only where necessary to establish actual lifecycle/run-entry behavior.

Relevant authoritative outcomes confirmed during ingestion:

- target `SYNC-006`, `SYNC-008`, `SYNC-009`, `SYNC-011`, `PLAN-007`, `PLAN-009`, and `CHANGE-006` require debounced/coalesced serialized runs, cross-instance exclusion, iOS active/startup/resume behavior only, future reconciliation after concurrent changes, cooperative safe cancellation, and periodic/on-demand integrity reconciliation;
- decision register `DEC-048`, `DEC-051`, `DEC-052`, `DEC-053`, `DEC-054`, and `DEC-230` preserve the same lifecycle/cancellation constraints;
- foundation §9 freezes cancellation as cooperative control distinct from crash durability and prohibits new operations while suspending/suspended/unloading;
- foundation/contract-freeze R6 makes `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` the authoritative cache-bypassing integrity seam consumed by Workstreams B/E/G;
- adversarial validation requires missed-event recovery, cancellation-non-delivery equivalence to crash recovery, self-mutation/user-edit preservation, stale-device reconciliation, and bounded retry/defer behavior.

## Manual re-ingestion proof

Derived from the current approved-base repository copy, blob SHA `02adedab577f397d98fb9666166270358a581761`:

- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- Last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- Heading counts: H1 `1`; H2 `11`; H3 `67`; H4 `43`; H5 `0`; H6 `0`
- Complete H2 sequence:
  1. `Purpose`
  2. `Operating Principles`
  3. `Navigation and Entry`
  4. `Stage 0 — Product Discovery and Requirements Elicitation`
  5. `Stage 1 — Target-System Specification and Minimum Sound Build Decomposition`
  6. `Stage 2A — Controlled Session-Based Construction`
  7. `Stage 2B — Autonomous Product Construction`
  8. `Stage 3 — Independent Product and System Validation`
  9. `Cross-Stage Handoff Rules`
  10. `Re-Entry and Recovery`
  11. `Recommended Default Workflow`
- Embedded prompt headings:
  - `Stage 0 Agent Prompt`
  - `Stage 1 Agent Prompt`
  - `Stage 2A Build-Prompt Expansion Template`
  - `Autonomous Build Prompt`
  - `Stage 3 Validation Prompt`

## Relevant pre-change repository findings

1. `ProductSyncScheduler` listened for vault-ready/resume/local-change/periodic/suspend/unload, but it mainly forwarded triggers/cancellation to `IntegratedProductController`; it had no authoritative lifecycle stopping gate.
2. `CoreRunCoordinator` serialized an already-started run and polled cancellation between operations, but had no suspending/suspended/unloading state and no lease-acquisition race protection. A trigger could begin acquiring a lease immediately before suspension and receive run authority afterward.
3. `IntegratedProductController` can schedule an immediate automatic follow-up from `finishRun().reconcileAgain`; therefore an inactive-lifecycle deferred bit had to be retained outside that immediate recursion path or suspension could be followed by a new run.
4. Local watcher events directly called `noteChangeDuringRun()` and also debounced another automatic trigger, allowing overlapping sources of follow-up authority rather than one bounded scheduler-owned coalescing path.
5. Periodic scheduling invoked ordinary full reconciliation but did not consume the frozen cache-bypassing local integrity seam. The approved-base local implementation does not yet contain Workstream B's production implementation of that frozen seam.
6. `WebLocksRunLeasePort` safely used browser Web Locks when present but returned lease-unavailable when the API was absent. A same-realm mobile fallback was needed so lack of Web Locks could not be interpreted as permission for concurrent same-vault run authority.
7. Existing diagnostic ownership and privacy were already controller/logger-owned; Workstream E did not need to add path/content-bearing diagnostics.

## Implementation

### `src/core/run-coordinator.ts`

- Added process-local frozen lifecycle authority using `SynchronizationLifecycleState` and a lifecycle epoch.
- Added synchronous lifecycle entry/query helpers and a one-bit deferred-reconciliation handoff across inactive lifecycle periods.
- Added a concrete `SynchronizationCancellationSignal` implementation with exact-once notification semantics.
- Hardened `beginRun()` so paused/stopping states cannot begin run authority and so suspension/unload/cancellation racing an awaited lease acquisition releases the late lease without granting mutation authority.
- Added `acquiring` serialization so concurrent begin calls cannot both acquire authority.
- `canStartNextOperation()` now requires active lifecycle, active run, not paused, and not cancelled.
- `finishRun()` preserves a required future reconciliation across suspension/unload instead of returning an immediate `reconcileAgain` that the legacy controller could recursively execute while stopping.
- Cooperative cancellation remains a control signal only; no code treats it as evidence that an in-flight mutation did not happen.

### `src/product/scheduler.ts`

- Made lifecycle stopping synchronous before any asynchronous cancellation request.
- Suspended/unloaded state cancels active-app timers and preserves pending/debounced reconciliation facts for a later active lifecycle opportunity.
- Resume reopens lifecycle authority only when the scheduler has not entered unloading and replays at most the coalesced required reconciliation fact.
- Replaced per-event controller deferral with scheduler-owned trigger coalescing and deterministic trigger priority.
- Added bounded draining: at most two immediate passes per drain; continued trigger pressure is delayed by at least `max(250ms, configured local debounce)` rather than forming a zero-delay retry loop.
- Periodic timers exist only while lifecycle state is active, accurately avoiding any iOS background-execution promise.
- Periodic integrity opportunities consume `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` when the Workstream B seam is present, compare cache-bypassing content evidence with enumerated evidence, and queue reconciliation on mismatch/uncertainty. The scheduler also continues ordinary periodic reconciliation when that parallel production seam is not yet integrated.
- No automatic cadence was tightened beyond the existing minimum periodic interval; no failure path creates an immediate unbounded retry storm.

### `src/product/web-lock-run-lease.ts`

- Preserved browser Web Locks as the cross-instance primary authority.
- Added a shared in-process same-vault exclusion fallback for environments where `navigator.locks` is unavailable, rather than treating missing Web Locks as permission for concurrent run authority.
- Browser lock-request failures still fail closed; they do not silently switch to a potentially conflicting second coordination system.

### Tests

Modified `test/phase5-scheduler-acceptance.test.ts` within assigned ownership to execute, in the repository's actual top-level test glob:

- repeated local events coalesce into one scheduler-owned automatic pass;
- rapid startup/resume bursts coalesce while retaining exactly one later reconciliation opportunity;
- suspension during awaited lease acquisition refuses/releases the late lease;
- concurrent `beginRun()` calls serialize before acquisition and retain one follow-up fact;
- lifecycle stopping blocks further operation starts while retaining deferred reconciliation for resume;
- cooperative cancellation signal is observable exactly once;
- periodic active-app integrity policy uses cache-bypassing evidence to discover a changed hash even with no watcher event;
- suspended state performs no periodic cache-bypass work, explicitly avoiding an iOS background-sync claim.

Two temporary tests were initially placed under the permitted `test/workstreams/lifecycle/**` namespace. Repository inspection then proved the current `npm test` command compiles nested tests but executes only `.test-build/test/*.test.js`. They were removed and the acceptance cases were consolidated into the owned top-level test instead of falsely recording compiled-only tests as executed.

## Exact final code/test change manifest before evidence

Comparison `6984915d2989827edf00def64a04c102c4e08785` → `60a7a194109ff6f6e1a0a6a7dfc5715511164722`:

Modified:
- `src/core/run-coordinator.ts`
- `src/product/scheduler.ts`
- `src/product/web-lock-run-lease.ts`
- `test/phase5-scheduler-acceptance.test.ts`

Created: none in final code/test diff.
Deleted: none in final code/test diff.

This dedicated evidence file is the only additional final branch artifact.

No `src/contracts/**`, `src/testing/fakes.ts`, integration-owned test, other workstream evidence, foundation planning/freeze artifact, release/version/workflow/Azure/OAuth-return material, `phase6-integration`, `master`, or `main` was modified.

## Workstream-specific acceptance evidence

### Rapid startup/resume/local/periodic races

PASS. Scheduler tests prove rapid ready/resume bursts do not start concurrent runs and preserve exactly one future reconciliation. Local changes debounce/coalesce through the same scheduler-owned queue. Periodic opportunities enter that queue and cannot overlap an existing scheduler drain.

### Suspend/unload during a run

PASS. The run coordinator's lifecycle gate is checked both before and after awaited lease acquisition; a late lease is released without granting authority. `canStartNextOperation()` becomes false immediately when stopping begins. Scheduler stopping enters the gate synchronously before sending cooperative cancellation.

### Cancellation not delivered / process death semantics

PASS by architecture and focused test. Lifecycle stopping independently makes `canStartNextOperation()` false and `isCancellationRequested()` true without requiring a cancellation callback. No cancellation path marks in-flight mutation success/not-applied or bypasses durable recovery semantics owned by C/D. This matches the foundation adversarial requirement that non-delivered cancellation is handled as crash/recovery authority rather than successful cancellation proof.

### Repeated local-change bursts / no retry storm

PASS. Watcher bursts are debounced to one queued fact; active trigger pressure is coalesced. The scheduler bounds immediate follow-up passes and delays continued pressure, and caught automatic-run failures are surfaced by existing controller status/diagnostics rather than immediately retried in an unbounded loop.

### Integrity opportunity with no watcher event

PASS. The executed acceptance test provides stale enumerated evidence and a different cache-bypassing hash with no watcher event. One active-app periodic opportunity calls the frozen bypass seam and queues a reconciliation. Under suspension, the same timer path does not run.

### iOS no-background promise

PASS. All scheduler timers are active-lifecycle opportunities only and are cleared on suspend/unload. Resume/startup restore opportunities when JavaScript is active again; correctness does not depend on a suspend callback finishing before process death.

### Existing lifecycle/scheduler/diagnostic privacy

PASS. The complete repository tests and the focused diagnostic/OAuth suite passed. Workstream E did not add path/content diagnostics or weaken logger sanitization. Existing iOS synchronization diagnostics continue to prove path/content/OAuth material does not reach diagnostic export.

### Run lease concurrency

PASS. `CoreRunCoordinator` now serializes even the pre-acquisition window. The production Web Locks implementation remains vault-exclusive; the pre-existing Phase 5 production-path Scenario 30, included in the complete test suite, already exercises two distinct `WebLocksRunLeasePort` instances over one shared lock manager and proves the second controller cannot mutate until the first releases authority. Workstream E additionally adds same-realm fail-closed exclusion for platforms where Web Locks are absent.

## Verification

A local checkout was not available because outbound DNS for direct `git clone` failed in this execution environment. To execute the repository's own commands rather than substitute static inspection, a temporary **draft verification-only PR #37** was opened from `phase6-sync-lifecycle` to `phase6-integration`. It was never merged and existed solely to trigger the already-present PR verification workflow. No workflow file was changed.

Authoritative final code/test verification checkpoint:

- branch/head: `phase6-sync-lifecycle @ 60a7a194109ff6f6e1a0a6a7dfc5715511164722`
- workflow: `Phase 6 Alpha Diagnostic Verification`
- run ID: `33341689198`
- job ID: `99338352430`
- conclusion: **SUCCESS**

Exact workflow steps/results:

- dependency installation (`npm ci`): **PASS**
- `npm run typecheck`: **PASS**
- `npm test`: **PASS**
- focused callback/diagnostic/OAuth/export suite: **PASS**
- `npm run build`: **PASS**
- `npm run check`: **PASS**
- `git diff --check`: **PASS**
- artifact identity recording: **PASS**
- build/verification evidence upload: **PASS**

`npm run build` uses the repository production build plus build verifier; therefore the current package/mobile evaluation gate is included in the PASS result. `npm run check` repeats typecheck, tests, and production build and also passed.

The workflow is a GitHub pull-request workflow and therefore checks out GitHub's generated PR merge ref containing the candidate head rather than a literal detached checkout of the head SHA. Evidence is intentionally labeled accordingly; no new workflow was created to manufacture a literal head-only checkout.

## Diff / ownership audit

Final implementation compare from the exact approved workstream base showed only four code/test files changed before this dedicated evidence file:

- three production files explicitly owned by Workstream E;
- one existing test explicitly owned by Workstream E.

Frozen contracts are byte-unmodified. No prohibited production or existing-test file is in the diff. No test expectation was weakened merely to make code pass; the changes add/strengthen lifecycle and integrity assertions and relocate compiled-only temporary acceptance cases into the suite that `npm test` actually executes.

## Integration dependencies

1. **Workstream B production integration:** the approved-base branch does not yet contain B's production `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` implementation. Workstream E is already wired to consume the frozen seam automatically when present; serial integration must supply B's assigned implementation. No contract revision or E-side semantic change is required.
2. **Workstreams C/D durable mutation/recovery integration:** E deliberately does not treat cancellation as physical mutation authority. Their frozen durable operation/recovery semantics remain authoritative for an in-flight operation that may have executed before suspension/process death. E exposes the cooperative signal and hard operation-start gate without routing around those seams.

No other cross-workstream production dependency was introduced.

## Contract-change request

**NONE.** All Workstream E acceptance criteria were implementable against the frozen contract surface. No frozen contract was edited, shadowed, or replaced.

## Known limitations within scope

- Physical Windows/iPhone synchronization was not performed and is not claimed.
- True iOS background execution is intentionally not implemented or promised.
- Cross-process exclusion on a platform that lacks browser Web Locks cannot be manufactured from a single JavaScript realm without a supported platform primitive; the new fallback guarantees same-realm exclusion, while supported Web Locks remain the production cross-instance primitive where available. The plugin still fails closed on browser lock acquisition failure.
- The cache-bypassing integrity sweep becomes physically authoritative in production after Workstream B's frozen seam implementation is serially integrated; branch-local acceptance verifies Workstream E's consumer/policy behavior independently.

## Completion state

Workstream E implementation and branch-local acceptance behavior are complete at the verified code/test checkpoint, the required repository verification gate is green, ownership/frozen-contract boundaries are intact, and no contract change is requested. The branch remains unmerged and is ready for independent supervisor review.
