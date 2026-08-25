# Cumulative Coding-Agent Evidence — Phases 1–5

This is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Detailed retained phase evidence remains authoritative at the phase-specific evidence paths and immutable Git history. Phase 6 and Stage 3 have **not** begun.

## Phase 1 — Repository Foundation and Frozen Shared Contracts

Recovered historical evidence commit: `91f740bf3d6ad1a93524dc0a1ea77dfeba22eb9b`.

- baseline: `0f88f8f11d10caf492237b323aec1b550fc2b052`;
- final pushed implementation SHA: `40af4c2a73576f931868453f03857af25bd207d9`;
- final post-lockfile CI run: `32662829150`;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 14/14;
- `npm run build`: PASS.

## Phase 2 — Core Synchronization Semantics and Durable State

Detailed retained evidence: `dev/evidence/_ca-output-CA-P2.md`.

- baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified implementation head: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.

## Phase 3 — Google Drive and OAuth Boundary

Detailed retained evidence: `dev/evidence/_ca-output-CA-P3.md`.

- baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified code head: `6e4621345809b30e8b4161f1e52f6344f7474c33`;
- verification run/job: `32713423290` / `97389515202`.

## Phase 4 — Obsidian Local, Platform, and Configuration Boundary

Detailed retained evidence: `dev/evidence/_ca-output-CA-P4.md`.

- baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- corrected implementation head: `4d06581fa91ba9643496a67296b5002925581ba2`;
- verification run/job: `32731187369` / `97443556511`.

### Preserved stock-iOS platform limitations

1. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type. Unsafe whole-file `readBinary()` fallback remains prohibited.
2. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee. The implementation remains fail-closed when proof capability is unavailable.

## Phase 5 — Integrated Product and Final Corrective Group D Closure

### Baselines and accepted prerequisite

- original Group D baseline: `70b4952c82987e1de8a1455166b090b2a4f57918`;
- accepted G1 trigger-semantics prerequisite: `c12350f0ad00a117a7116d529bc04ebedce09352`;
- G2 corrective baseline: `c12350f0ad00a117a7116d529bc04ebedce09352`;
- authoritative branch: `master`;
- G2 changed no production source files.

Accepted Group A/B/C evidence remains at:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-A-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-B-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-C-01.md`.

Corrective Group D agent-specific evidence:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`.

### Final dynamically tested implementation/test checkpoint

Exact SHA: `7aab9a90c885f33a371576ef602e7a5d352b1d07`.

Authoritative GitHub Actions gate:

- workflow: `Phase 1 CI`;
- run ID: `32811319438`;
- job ID: `97691056148`;
- exact checkout: `7aab9a90c885f33a371576ef602e7a5d352b1d07`;
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 209 tests / 209 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

The prior `ee431c408c64cddf3bcc8642c3015179fefb9b91` / 177-test gate and the accepted G1 `c12350f0ad00a117a7116d529bc04ebedce09352` / 178-test gate are historical checkpoints, not the final Phase 5 gate.

### Executable acceptance closure

G2 added genuine Phase 5 orchestration evidence for the previously insufficient scenarios. The new tests execute real applicable production components, including `Phase5ProductRuntime`, `ProductSyncScheduler`, `IntegratedProductController`, `ProductSnapshotAssembler`, `ProductionSynchronizationPlanner` / `DeterministicSynchronizationPlanner`, `ProductSynchronizationExecutor`, crash-safe authoritative state commit, production path scoping, audit, and notification filtering. Controlled fakes remain at external boundaries.

`test/phase5-acceptance-map.test.ts` now maps all scenarios 1–50 to semantically valid primary executable evidence. Its source-verification test passed in the authoritative 209-test gate.

### Exact G2 change manifest

Git compare baseline: `c12350f0ad00a117a7116d529bc04ebedce09352`.

#### Created

- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

#### Modified

- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`

#### Deleted

- none.

#### Remote Branches Deleted

Historical Group D cleanup, preserved in the record:

- `agt-stg-2a-phase-1-01`
- `ca-c1-verification`
- `master-temp-should-fail`
- `phase5-fix-group-a`
- `phase5-fix-group-b`
- `phase5-fix-group-c`
- `stage-2a-integration-234`
- `stage-2a-phase-2-core-sync-state`
- `stage-2a-phase-3-drive-oauth`
- `stage-2a-phase-4-obsidian-local`
- `stage-2a-phase-5-integrated-product`

Cleanup workflow/run/job: `Group D Branch Cleanup` / `32805742158` / `97675382231`.

No new non-`master` branch and no pull request were created during corrective G2.

### Evidence-only final head convention

The SHA of a commit cannot be embedded in a file contained by that same commit because the file content participates in the Git hash. Therefore this ledger records the exact dynamically tested implementation/test SHA above; the exact post-evidence remote `master` SHA is reported in the final handoff and is independently fetchable from GitHub.

## Live / Physical Validation

The following are **not** represented as passes:

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`;
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`;
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`;
- physical network interruption — `NOT AVAILABLE IN THIS SESSION`;
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`;
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`.

## Current Completion State

`COMPLETE WITH NON-BLOCKING FINDINGS`

The corrective G2 executable acceptance and evidence assignment is complete subject to independent supervisory review. The only retained findings are the two established stock-iOS fail-closed platform limitations and unavailable live/physical validations. No supervisory approval is claimed.