# BRAIN Verification Platform — Child-Session Decomposition

## 1. Purpose

The existing BVP-S01 through BVP-S09 specifications are **primary Stage-2A work packages**, not one-turn coding sessions. This document decomposes them into bounded child sessions sized for one coding-agent execution/review cycle while preserving the manual's minimum-sound high-level phase structure.

The child task files live under `dev/agents/st2a/ph6/05-bvp/**`. Later child prompts are intentionally pre-generated as non-executable scope contracts; they must be repository-grounded and bound immediately before dispatch.

## 2. Verification Model

Every implementation child:

1. starts from an exact supervisor-approved predecessor;
2. owns one coherent responsibility;
3. has an exact writable-path allowlist at dispatch;
4. pushes its task branch;
5. receives authoritative local verification through the installed PHX-CI deployed-runtime operator front door;
6. is independently reviewed before integration.

Every primary S01-S09 work package ends with a `V` acceptance gate. S01 is already complete under its historical verifier; S02 onward use PHX-CI.

## 3. Session Map

| Primary | Child | Capability | Completion |
|---|---|---|---|
| S01 | 01A | Persist BVP authority and decision supersession | BVP planning authority active; legacy decisions superseded; no product source touched. |
| S01 | 01B | Archive legacy dev harness material | Legacy dev artifacts archived; active authority clean; archive manifest complete. |
| S01 | 01V | Authority/archive acceptance | Historical S01 evidence COMPLETE; S02 may begin. |
| S02 | 02A | Retire harness-only test/support surface | Harness-only tests absent; all production source byte-for-byte unchanged; PHX-CI passes. |
| S02 | 02B | Retire harness source and production coupling | src/validation absent; H6C-only seam absent; main/settings/controller exact target hashes; PHX-CI passes. |
| S02 | 02V | Primary-stage PHX-CI acceptance | Integrated phase6-integration passes PHX-CI; no legacy runtime/UI/bundle identifiers; no replacement platform started. |
| S03 | 03A | Create test-platform root and shipping isolation | Separate root exists; production build remains unchanged/exclusive; no runner/simulator. |
| S03 | 03B | Implement architecture guard | Guard fails prohibited dependency/bundle/scenario/archive/script/frozen-surface cases and passes compliant baseline. |
| S03 | 03C | Implement architecture metrics and budget gates | Required metrics/deltas produced; hard budgets fail closed. |
| S03 | 03D | Wire guard and metrics into PHX-CI repository check | Repository check invokes guard+metrics; frozen governance established; no task-specific verifier. |
| S03 | 03V | Primary-stage PHX-CI acceptance and architecture baseline | PHX-CI complete; negative guard tests pass; baseline metrics recorded; supervisor architecture review complete. |
| S04 | 04A | Stateful in-memory local vault | Local observation/read/write/move/trash/listing/path/config behaviors covered; no sync policy in adapter. |
| S04 | 04B | Stateful in-memory Drive core | Stable remote IDs/revisions and core mutation/read semantics proven. |
| S04 | 04C | Drive change feed, completeness, ambiguity and faults | Change feed/completeness/ambiguity semantics proven without policy duplication. |
| S04 | 04D | Per-device durable state, deterministic time/order, restart | Two device-local authorities survive runtime reconstruction over retained simulated reality. |
| S04 | 04E | Virtual-world composition over real production logic | Create/upload/download/two-device/move/partial-listing/ambiguous/restart production-path canaries pass. |
| S04 | 04V | Primary-stage PHX-CI acceptance | PHX-CI complete; S04 acceptance canaries pass; guard/metrics stable. |
| S05 | 05A | Typed scenario contract and small step vocabulary | Scenario contracts exist as data definitions; no runner/router/persistence. |
| S05 | 05B | External deterministic runner core | Runner owns sequence/verdict; unsupported/missing observations block/fail; no distributed state. |
| S05 | 05C | Generic observations, assertions and canonical evidence | Wrong expectations fail; evidence is deterministic/private/traceable. |
| S05 | 05D | Bounded checkpoint/resume representation | Checkpoint state is bounded/non-secret/external and cannot become product authority. |
| S05 | 05E | Declarative canaries and scenario-cost proof | Two canaries run; second scenario is scenario-only; LOC/change-surface tripwire proven. |
| S05 | 05V | Primary-stage PHX-CI acceptance | PHX-CI complete; guard/metrics within budget; runner/core frozen for scenario-only work. |
| S06 | 06A | Initialization and one-sided synchronization scenarios | Mapped initialization/ordinary-sync scenarios pass with no core changes. |
| S06 | 06B | Merge, conflict and delete-vs-modify scenarios | Conflict/merge preservation semantics mapped and passing. |
| S06 | 06C | Deletion, stale-device, clock-skew and unreadable-path scenarios | Safety/authority scenarios pass with scenario-only changes. |
| S06 | 06D | Move/rename identity and path-collision scenarios | Move identity/collision scenarios pass; no timestamp/path guessing policy introduced. |
| S06 | 06E | Exclusions, unknown files and empty-folder scenarios | Remaining non-fault reconciliation scope scenarios mapped and passing. |
| S06 | 06V | Primary-stage PHX-CI acceptance and coverage reconciliation | PHX-CI complete; scenario size/change-surface rules pass; no missing S06 semantic coverage. |
| S07 | 07A | Crash, commit-order and ambiguous-result scenarios | Recovery/uncertainty scenarios pass without new fault framework. |
| S07 | 07B | State/cursor/listing/root recovery scenarios | State/recovery fail-closed semantics mapped and passing. |
| S07 | 07C | Device authority and cancellation scenarios | Authority/cancellation scenarios pass with frozen core. |
| S07 | 07D | Transfer integrity and retry/backoff scenarios | Transfer/retry scenarios pass deterministically. |
| S07 | 07E | Quota/disk, destructive safety, config and lifecycle deterministic scenarios | Safety/resource/config scenarios mapped and passing. |
| S07 | 07F | Deterministic scale and resource measurement | Required scale cases execute and record bounded measurements; architecture unchanged. |
| S07 | 07V | Primary-stage PHX-CI acceptance and mandatory architecture review | PHX-CI complete; deterministic mappings reconciled; architecture review authorizes or blocks S08. |
| S08 | 08A | Narrow production run-receipt seam | Seam enumerated, <=350 LOC/4 files, no scenario/test authority in production; boundary re-frozen. |
| S08 | 08B | Validation-only Obsidian build/entrypoint | Validation build loads separately; production main.js excludes agent/transport/scenarios. |
| S08 | 08C | Bounded device command agent and sequence safety | Agent executes single commands only; no scenario state machine; <=750 LOC subset budget tracked. |
| S08 | 08D | Minimal command mailbox and Windows relay | Transport is run-scoped control metadata, no new OAuth scope/token export/product authority. |
| S08 | 08E | External live executor and human checkpoints | Scenario authority stays external; unavailable OS/provider actions become explicit checkpoints. |
| S08 | 08F | Desktop live canary and production-bundle isolation proof | Desktop canary succeeds; duplicates/stale commands fail; production bundle exclusion proven. |
| S08 | 08V | Primary-stage PHX-CI acceptance and architecture review | PHX-CI complete; architecture review approves physical stage or blocks. |
| S09 | 09A | Windows/iOS install, authentication and pairing baseline | Bound device/build identities recorded; Windows+iOS baseline evidence complete. |
| S09 | 09B | Physical bidirectional synchronization and representative conflict | Cross-device convergence/conflict evidence complete. |
| S09 | 09C | Physical offline/reconnect and interruption/resume | Physical lifecycle/network evidence complete. |
| S09 | 09D | Physical path/platform and resource/large-transfer coverage | Platform/resource evidence complete without inventing automation architecture. |
| S09 | 09E | Physical auth revocation and lifecycle safety | Security/lifecycle physical evidence complete. |
| S09 | 09F | Requirement/evidence traceability closure | Traceability has no material gaps; blockers surfaced; Stage-3 package prepared. |
| S09 | 09V | Final PHX-CI, architecture closure and Stage-3 handoff | PHX-CI complete; all budgets/boundaries pass; Phase 6 evidence complete; Stage 3 ready but not started. |

## 4. Dependency Rule

Default sequencing is serial through `phase6-integration`: accepted child → PHX-CI evidence → supervisor review/integration → repository-ground next child.

Scenario-only batches in S06/S07 MAY be parallelized later only if the supervisor proves non-overlapping writable surfaces and frozen core contracts before dispatch. Parallelism is never inferred merely because task files already exist.

## 5. Dispatch Split Rule

The preplanned decomposition is a ceiling, not a command to keep a task large. If dispatch-time repository inspection shows a child would cross the size gate or touch more than one architecture/contract family, split it again and update this document/index before execution.

## 6. Primary-Stage Gate

No primary stage is complete because all child agents report completion. The stage is complete only after its integrated `V` task passes PHX-CI and the supervisor confirms stage-specific architecture/coverage evidence.
