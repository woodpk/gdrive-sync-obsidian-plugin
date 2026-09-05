# H-U5-P7 Evidence — Group-D Acceptance Fixture Modernization

## Identity / authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-09`
- Package: `H-U5-P7 — OLF-PHYSICAL Phase 5 Group-D acceptance fixture modernization`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `phase6-sync-integration-h`
- Supervisor-approved pre-task head: `8ab3b43c8e56a8277fcb0c87d03ef3681b425878`
- `H_U5_P7_ENTRY_HEAD`: `16cec69e68029402c611f9b1d9c3f1026c11d8bb`
- `H_U5_P7_CANDIDATE_SHA`: `e09e58e9b9622495f220897ae44736dd91d7075c`
- Final evidence-bearing branch head: the commit containing this evidence file; exact SHA is reported in the supervisor return package because a commit cannot contain its own SHA.

Approved-head -> entry delta was verified to contain only:

- `dev/planning-and-building/phase6-h-u5-p7-group-d-acceptance-fixtures-task.md`

Entry -> candidate implementation/test delta was verified to contain exactly:

- `test/phase5-group-d-acceptance.test.ts`

No `src/**` file, `src/contracts/**` file, canonical `dev/evidence/_ca-output.md`, or additional test file changed.

## Fixture modernization

Scenario 26 now executes through the hardened production mutation authority rather than the obsolete raw Drive create callback.

- The fixture seeds writable synchronization authority through `IntegratedSynchronizationStateStore` over the existing persistent state store.
- The controller receives that integrated state store as both state and authority, plus a minimal in-file `ReliableRemoteMutationPort`.
- The planner is wrapped in `ProductionSynchronizationPlanner` so the fixture exercises the current hardened production authority/mutation seam.
- Legacy raw Drive `create(...)` is a fail guard and is not permitted to perform the mutation.
- `createStarted` now resolves inside `ReliableRemoteMutationPort.createReserved(...)`, after the reserved file-create identity has been accepted and at entry to the real hardened physical create operation, immediately before the deliberate `await createRelease` hold. The create returns only after validating content/path/identity, materializing the fake remote object, and returning a `verified-effect` / `reserved-create` application proof.
- The hold/release coordination remains intact; the local-change event is injected only while that hardened physical create is genuinely active.
- The original Scenario 26 assertions remain present. Its full-view instrumentation counts the initial pre-create full view and does not misclassify the hardened post-mutation recovery refresh as a second initial view.
- Scenario 47 and Scenario 49 semantics/assertions were not rewritten.

## Authoritative proof

Disposable proof branch:

- `h-u5-p7-group-d-acceptance-proof-h09`

Disposable workflow:

- `.github/workflows/h-u5-p7-group-d-acceptance-proof.yml`

Final proof identifiers:

- Run: `33967715314`
- Job: `101310653992`
- Proof-branch head for the final run: `0c5790e0e6e25e7c960a3bbbf478de8a8a913a34`
- Artifact name: `h-u5-p7-group-d-acceptance-proof`
- Artifact ID: `9969961233`
- Artifact size: `76085` bytes
- Artifact digest: `sha256:64009239dbdd6e401a35b60c19c4771b6f2c3e6f5b479315de17a2e682e1ef3e`

The workflow checked out source/test exactly at `H_U5_P7_CANDIDATE_SHA` with Node 22 and `persist-credentials: false`; the proof branch carried workflow-only verification changes.

### Gate A — exact candidate / frozen authority

PASS.

- Candidate checkout: `e09e58e9b9622495f220897ae44736dd91d7075c`
- Frozen `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Canonical evidence blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- Contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- Required predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- Tracked worktree clean before verification.
- Entry -> candidate diff exactly `test/phase5-group-d-acceptance.test.ts`.
- `git diff --check` passed.

### Gate B — install / static verification

PASS.

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`

### Gate C — focused Group-D acceptance

PASS, exit `0`.

- total: 3
- pass: 3
- fail: 0
- cancelled: 0
- skipped/todo: 0

Explicitly:

- Scenario 26: PASS
- Scenario 47: PASS
- Scenario 49: PASS

Scenario 26 reached and held the real hardened `ReliableRemoteMutationPort.createReserved(...)` physical create boundary before the synthetic local-change event was delivered.

### Gate D — V1.3 foundation

PASS, exit `0`.

- total: 17
- pass: 17
- fail: 0
- cancelled: 0
- C15: PASS
- C16: PASS

### Gate E — H/V1.3 critical regression surface

Expected classified nonzero result preserved, real exit `1`.

- total: 82
- pass: 69
- fail: 13
- cancelled: 0
- skipped/todo: 0

H integration checks remain PASS:

- H-I1: PASS
- H-I2: PASS
- H-I3: PASS
- H-I4: PASS
- H-I5: PASS
- H-I6: PASS, including the terminal-batch durable-learning failure case
- H-I7: PASS
- H-I8: PASS

The 13 failures remain exactly the previously classified G-owned adversarial-model set:

1. `03 upload survives crash/restart at every durable effect stage`
2. `04 download survives crash/restart at every durable effect stage`
3. `05 move survives crash/restart at every durable effect stage`
4. `06 trash survives crash/restart at every durable effect stage`
5. `10 durable intended L1 is not substituted by later L2`
6. `15 repeated moves preserve stable remote identity`
7. `16 create-delete sequence preserves acknowledged deletion history`
8. `18 unresolved path A does not block safe path B progress`
9. `19 missed watcher is discovered by integrity reconciliation`
10. `20 Windows watcher-event loss is recoverable through authoritative integrity read`
11. `28 bounded quiescence after mutation pressure stops`
12. `29 concurrent same-path creates never silently select one remote winner`
13. `G-C2 generic recover routes multiple folder journals by exact journal identity`

No new H/V1.3 critical regression was introduced.

### Gate F — fresh whole-repository run

Observed real `npm test` exit: `1`.

Actual H-U5-P7 totals:

- total: 687
- pass: 643
- fail: 27
- cancelled: 17
- skipped/todo: 0

Comparison to supervisor-approved H-U5-P6 baseline `687 / 640 / 27 / 20`:

- total: unchanged
- pass: `+3`
- fail: unchanged
- cancelled: `-3`
- skipped/todo: unchanged

This is exactly the predicted classification delta: the three previously cancelled outcomes in `phase5-group-d-acceptance.test.ts` became passes, with no additional aggregate outcome change.

### Gate G — build

PASS.

- `main.js` size: `697437` bytes
- `main.js` SHA-256: `3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

### Gate H — final invariants / PR state

PASS.

- Exact candidate SHA preserved during source/test verification.
- Frozen contracts tree unchanged.
- Canonical evidence unchanged.
- Contract-freeze whole-file blob unchanged.
- Required predecessor-prefix unchanged.
- Tracked source/test worktree clean.
- Candidate implementation/test delta remained exactly the authorized target test file.
- PR #45: OPEN, DRAFT, UNMERGED.
- PR #45 head branch: `phase6-sync-integration-h`.

## Completion classification

H-U5-P7 fixture-only correction is complete. The stale OLF-PHYSICAL callback dependency in Scenario 26 is removed from mutation authority without weakening production, contracts, crash-safety, remote verification, scheduler deferral/coalescing, active-run serialization, cursor semantics, BASE convergence, notification policy, or managed-root confinement.

No production file, frozen contract, canonical evidence file, or additional test file changed.
