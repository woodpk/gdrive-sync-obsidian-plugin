# G-R2/R3 Evidence — Adversarial Ambiguity + Exact Folder-Journal Recovery Repair

## Identity and authority

- Agent: `agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration branch: `phase6-sync-integration-h`
- Independently supervisor-approved pre-task authority: `117a940d82eb0352f46c7fdafa93d48dfa294cc8`
- `G_R2_R3_ENTRY_HEAD`: `51126acc6ef06820adb192543c67f390ed40595d`
- Approved-head → entry verification: exactly one planning-only file was added: `dev/planning-and-building/phase6-g-r2-r3-ambiguity-folder-journal-recovery-task.md`; no source, test, contract, evidence, workflow, or other planning file changed.
- `G_R2_R3_CANDIDATE_SHA`: `4b70eb2a15711c6e83aad809e623c400e50b4e01`
- Final evidence-bearing H head: the evidence-only commit containing this file; its concrete commit SHA is recorded separately in the final completion response because a commit cannot self-contain its own SHA.

## Exact manifests

Entry → final candidate changed-file manifest:

- `test/adversarial-model/support/model.ts`

No test file, production source, contract, planning file, workflow, canonical evidence file, or other tracked path changed in the final candidate delta. `git diff --check` passed.

Candidate → evidence-bearing head manifest:

- `dev/evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02.md`

The authoritative proof workflow exists only on a disposable proof branch and was never added to `phase6-sync-integration-h`.

## G-W2 causal diagnosis and repair

### Diagnosis

`29 concurrent same-path creates never silently select one remote winner` exposed a model finalization-order defect.

Both devices could derive and durably persist independent `remote-create` intents for the same logical path from the same no-base/no-remote observation. In the failing ordering, device A could dispatch, verify, and finalize its own create before device B advanced its already-persisted create intent to `dispatch-authorized`. The previous finalization logic saw only A's active remote object and therefore committed A's object as authoritative BASE / `converged`. When B later dispatched its distinct candidate, the model had two active remote objects at the same logical path while A remained falsely converged, triggering the duplicate-ambiguity invariant.

The defect was not candidate-ID ordering, insertion ordering, or remote sorting. It was premature BASE establishment despite an independent durable same-path create intent already existing in another device journal.

### Repair

The G model now treats another device's durable `remote-create` intent for the same logical path and a different reserved remote object as ambiguity evidence before BASE establishment. During upload-create finalization:

- any independent active remote candidate still causes conflict preservation as before;
- any independent durable same-path create intent also causes conflict preservation, including an `intent-persisted` journal not yet dispatched;
- the current journal is retired without calling `commitBase()`;
- neither remote candidate is trashed, rewritten, or selected as a winner;
- the path remains explicit `conflict` rather than `converged`.

The repair is generic to same-logical-path remote-create intents. It does not special-case `same.md`, device identity, candidate sorting, or the test number.

Both complete local/user versions and both independently created remote candidates remain preserved once both dispatches occur.

## G-W3 causal diagnosis and repair

### Diagnosis

`G-C2 generic recover routes multiple folder journals by exact journal identity` exposed two coupled model defects.

First, `advance()` selected the first unfinished journal even when that journal's effect was already `dispatch-authorized`. In a device with two simultaneous folder-create journals, a second `advance()` could therefore stall on the first journal instead of advancing the second journal's `intent-persisted` effect. Generic `recover()` could then interpret the second journal as never dispatched and retire it, producing only one recovery read instead of one independent read per eligible folder journal.

Second, `recoverFolderCreateJournal()` stored the current verifier result into the public aggregate `folderRecovery` field and then used that shared aggregate as the routing authority. That made the model structurally vulnerable to cross-journal result conflation even though the frozen verifier itself is descriptor-specific.

### Repair

The G model now:

- makes `advance()` select a journal that actually has an actionable `intent-persisted` or `effect-verified` effect, so multiple eligible journals progress independently rather than stalling behind an already-authorized journal;
- for every eligible folder journal, obtains that journal's own observation using its own descriptor/reserved ID/path/parent authority;
- computes `const recovery = verifyRemoteFolderCreate(descriptor, observation)` locally;
- retains `folderRecovery` only as public/test-observable aggregate state;
- routes state mutation exclusively from the journal-local `recovery.status`;
- updates/removes only the exact journal/path whose descriptor produced that result.

Thus a wrong-parent result for journal/path `one` remains conflict-preserved and dispatch-authorized, while the correct-parent result for journal/path `two` becomes effect-verified, with exactly two independent recovery reads.

No frozen folder-create verifier contract changed.

## G-R1 and quiescence preservation

All previously approved G-R1 transition/recovery/settle behavior remains in place.

`AdversarialSyncModel.assertQuiescentOrExplicit()` was not changed or weakened. It continues to require coherent BASE/local/exactly-one-active-remote identity/content convergence unless the path is explicitly conflict/recovery.

No production source changed.

## Authoritative proof

- Authoritative proof branch: `g-r2-r3-ambiguity-folder-recovery-proof-g02-r3`
- Proof workflow: `.github/workflows/g-r2-r3-ambiguity-folder-recovery-proof.yml`
- Proof branch workflow/head commit: `db0a7cebc8eb15062868c0248184b645566d562d`
- Exact candidate checked out by workflow: `4b70eb2a15711c6e83aad809e623c400e50b4e01`
- GitHub Actions run ID: `34015295432`
- Job ID: `101437892793`
- Workflow conclusion: `success`
- Job conclusion: `success`
- Proof artifact ID: `9983702726`
- Proof artifact name: `g-r2-r3-ambiguity-folder-recovery-proof`
- Proof artifact digest: `sha256:342d2f97d320ec951b1b666cb43f6bf4b313564e5dd9248a39e430f6ea7960ef`
- Proof artifact size: `38474` bytes

Run/job/artifact identity, conclusion, digest, and size were cross-checked against authoritative GitHub metadata after the run completed.

The authoritative workflow used Node 22 and `actions/checkout@v4` with `persist-credentials: false` and full history. It checked out the exact candidate and performed no source/test/contract patching.

## Verification results

### Gate A — exact scope / frozen authority

PASS.

- exact candidate checkout: `4b70eb2a15711c6e83aad809e623c400e50b4e01`;
- entry → candidate manifest exactly `test/adversarial-model/support/model.ts`;
- `git diff --check` PASS;
- candidate tracked worktree clean before generated build/test outputs;
- no `src/**` delta;
- frozen contract tree exact;
- canonical evidence blob exact;
- contract-freeze blob and immutable predecessor-prefix hash exact.

### Gate B — install / static

PASS.

- `npm ci` exit `0`;
- `npm run typecheck` exit `0`;
- `npx tsc -p tsconfig.test.json` exit `0`.

### Gate C — complete focused adversarial model

PASS, real exit `0`.

- total: `56`
- pass: `56`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`

Explicit residual repair tests:

- G-W2 — `29 concurrent same-path creates never silently select one remote winner` — PASS
- G-W3 — `G-C2 generic recover routes multiple folder journals by exact journal identity` — PASS

All eleven G-W1 tests remain PASS:

- 03 upload survives crash/restart at every durable effect stage — PASS
- 04 download survives crash/restart at every durable effect stage — PASS
- 05 move survives crash/restart at every durable effect stage — PASS
- 06 trash survives crash/restart at every durable effect stage — PASS
- 10 durable intended L1 is not substituted by later L2 — PASS
- 15 repeated moves preserve stable remote identity — PASS
- 16 create-delete sequence preserves acknowledged deletion history — PASS
- 18 unresolved path A does not block safe path B progress — PASS
- 19 missed watcher is discovered by integrity reconciliation — PASS
- 20 Windows watcher-event loss is recoverable through authoritative integrity read — PASS
- 28 bounded quiescence after mutation pressure stops — PASS

### Gate D — V1.3 foundation

PASS, real exit `0`.

- total: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- C15 PASS
- C16 PASS

### Gate E — H/V1.3 critical

PASS, real exit `0`.

- total: `82`
- pass: `82`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- H-I1 PASS
- H-I2 PASS
- H-I3 PASS
- H-I4 PASS
- H-I5 PASS
- H-I6 PASS
- H-I7 PASS
- H-I8 PASS

### Gate F — complete repository

PASS, real exit `0`.

- total: `687`
- pass: `687`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`

Exact approved G-R1 baseline → G-R2/R3 delta:

- total: unchanged at `687`
- pass: `685 → 687` (`+2`)
- fail: `2 → 0` (`-2`)
- cancelled: unchanged at `0`
- skipped/todo: unchanged at `0`

No automated failure remains.

### Gate G — production build

PASS, real exit `0`.

- `main.js` size: `699509` bytes
- SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`

Production artifact identity is exactly unchanged from the approved G-R1 baseline, as required for this G-owned test/model-only repair.

### Gate H — repository / PR invariants

PASS in authoritative proof.

- no production source changed;
- no contract changed;
- final candidate delta is confined to the authorized G model file;
- canonical evidence unchanged;
- proof workflow remains off the integration branch;
- PR #45: `open`;
- PR #45: `draft = true`;
- PR #45: `merged = false` / `merged_at = null`;
- PR #45 head branch: `phase6-sync-integration-h`;
- PR #45 head at candidate-proof time: `4b70eb2a15711c6e83aad809e623c400e50b4e01`.

The final evidence-only commit necessarily advances the PR head afterward without changing its open/draft/unmerged/head-branch invariants; the final concrete PR head is recorded separately in the completion response after evidence commit creation.

## Frozen authority values

- Approved V1.3 foundation source: `05600f7ca48a6726b72188005f29eddfc1191519`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Canonical evidence blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- Contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- Immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`

All remained exact in authoritative proof.

## Proof-driven correction history / blockers

No remaining blocker exists.

Two bounded proof iterations preceded the authoritative successful run:

1. A first disposable workflow attempt failed before code/test gates because the proof workflow added an unnecessary ancestry assertion for the V1.3 foundation commit. The task required exact frozen authority, not ancestry. The disposable workflow was corrected without touching the integration candidate.
2. The first implementation candidate then reached focused verification with G-W3 PASS but G-W2 still failing because ambiguity detection waited until the competing journal was dispatch-authorized. The observed exact test ordering proved the competing journal could still be only `intent-persisted` when the first device finalized. The final candidate generalized the check to any independent durable same-path create intent. No scope expansion was required.

The final authoritative proof run is `34015295432` and is fully green. No production change, frozen-contract drift, H regression, cancellation, skip, todo, or residual automated failure remains.
