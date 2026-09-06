# G-R1 Evidence — Adversarial Transition / Settle / Quiescence Repair

## Identity and authority

- Agent: `agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration branch: `phase6-sync-integration-h`
- Supervisor-approved pre-task authority SHA: `03c2d7d478553427f56b4e827487081328d479f2`
- `G_R1_ENTRY_HEAD`: `a0dacde6849bfdce99422a318faebe733418222c`
- Approved-head → entry verification: exactly one planning-only file was added: `dev/planning-and-building/phase6-g-r1-adversarial-transition-settle-quiescence-task.md`; no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed.
- `G_R1_CANDIDATE_SHA`: `1fedd3752a7409fd3691b18456a6fe851c80a7bb`
- Final evidence-bearing H head: the evidence-only commit containing this file; its concrete commit SHA is recorded separately in the final completion response because a commit cannot self-contain its own SHA.

## Exact manifests

Entry → candidate changed-file manifest:

- `test/adversarial-model/support/model.ts`

No test file, production source, contract, planning file, workflow, canonical evidence file, or other tracked path changed in the source/test candidate delta. `git diff --check` passed.

Candidate → evidence-bearing head manifest:

- `dev/evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-01.md`

The proof workflow exists only on the disposable proof branch and was never added to `phase6-sync-integration-h`.

## G-W1 causal diagnosis

1. **03 upload crash/restart stages** — transition/recovery scheduling defect. Normal newly persisted work was entering recovery semantics instead of ordinary dispatch progression; restart recovery also needed exact observe/resume/retire behavior by durable stage.
2. **04 download crash/restart stages** — same transition/recovery scheduling defect for local-write effects.
3. **05 move crash/restart stages** — transition/recovery scheduling plus identity/path bookkeeping; the old BASE path had to migrate to the remote object's current path while preserving the same remote ID.
4. **06 trash crash/restart stages** — transition/recovery scheduling defect in destructive lifecycle advancement and recovery ordering.
5. **10 durable intended L1 versus later L2** — stale-plan/dirty-path defect. Finalization could erase later local evidence after committing the immutable L1 journal, and in-flight base-authorized mutation state could remain falsely labeled converged.
6. **15 repeated moves preserve stable remote identity** — identity/path bookkeeping defect. A remote candidate already mapped by BASE at another path was treated as unrelated no-base evidence instead of being owned by the prior BASE mapping for move migration.
7. **16 create-delete acknowledged history** — settle scheduling and completion cleanup defect prevented the create/delete lifecycle from retiring cleanly into BASE removal plus tombstone history.
8. **18 unresolved path A does not block safe path B** — isolation/settle scheduling defect. An already-explicit unresolved path could regenerate non-progressing work and starve an independent safe path.
9. **19 missed watcher discovered by integrity reconciliation** — the integrity read already marked authoritative divergence dirty; the defect was downstream settle/progress accounting and finalization consumption of that dirty evidence.
10. **20 Windows watcher-event loss recovery** — same integrity-to-reconcile downstream scheduling defect for authoritative local deletion and destructive lifecycle progression.
11. **28 bounded quiescence** — settle progress detection omitted volatile plan/recovery state, and completed work could leave stale dirty evidence; this caused premature termination or repeated regeneration instead of bounded convergence.

During proof-driven correction, two regressions in previously passing G coverage were also identified and removed before the final candidate: multi-effect clean-merge restart could discard a journal after an earlier effect became durable, and churn isolation could label a path `converged` while a base-authorized candidate mutation was physically transitional. Neither regression remains in the final candidate.

## Model repair

The final G-only model repair:

- separates restart recovery from healthy ordinary durable-stage progression;
- advances normal `intent-persisted` work through authorization/dispatch instead of treating it as crash recovery;
- makes `outcome-unknown` recovery observe physical reality before any redispatch decision;
- retires/replans not-yet-applied work only when no earlier effect in the same journal has become durable;
- preserves a multi-effect journal after an earlier effect is durable and safely resets a later authoritatively-not-applied effect for continued execution;
- includes volatile plan, in-flight, and restart-recovery state in settle progress accounting;
- suppresses regeneration of already explicit conflict/recovery paths unless new dirty evidence exists;
- keeps base-authorized in-flight mutation paths non-converged until finalization;
- preserves later local evidence after an immutable durable intent commits by recomputing dirty state from BASE/local/exact remote identity/content convergence;
- migrates BASE path ownership across remote moves while preserving the existing remote object ID;
- recognizes a no-base candidate already owned by another BASE path as identity evidence for move migration rather than an unrelated object;
- retires completed create/delete work cleanly while preserving acknowledged deletion tombstones.

`AdversarialSyncModel.assertQuiescentOrExplicit()` was not changed or weakened. It continues to require coherent BASE/local/exactly-one-active-remote identity/content convergence unless the path is explicitly conflict/recovery.

No production source changed.

## Authoritative proof

- Proof branch: `g-r1-adversarial-transition-quiescence-proof-g01`
- Proof workflow: `.github/workflows/g-r1-adversarial-transition-quiescence-proof.yml`
- Proof branch workflow commit: `6a5f2635f04501323fb0642c14c560f20af204ee`
- Exact candidate checked out by workflow: `1fedd3752a7409fd3691b18456a6fe851c80a7bb`
- GitHub Actions run ID: `34012563107`
- Job ID: `101430768907`
- Workflow/job conclusion: `success`
- Proof artifact ID: `9982912760`
- Proof artifact name: `g-r1-adversarial-transition-quiescence-proof`
- Proof artifact digest: `sha256:1c110193590acc7ed8b2da47dcea25faf02728837783fb76bbf76b1916e15ac4`
- Proof artifact size: `8082` bytes

The authoritative workflow used Node 22, `actions/checkout@v4` with `persist-credentials: false` and full history, and performed no source/test/contract patching.

## Verification results

### Gate A — scope / frozen authority

PASS.

- candidate checkout exact;
- entry → candidate manifest exactly `test/adversarial-model/support/model.ts`;
- `git diff --check` PASS;
- tracked candidate worktree clean;
- no `src/**` delta.

### Gate B — install / static

PASS.

- `npm ci` exit `0`;
- `npm run typecheck` exit `0`;
- `npx tsc -p tsconfig.test.json` exit `0`.

### Gate C — focused G adversarial model

Expected real exit: `1` because G-W2/G-W3 remain intentionally deferred.

Totals:

- total: `56`
- pass: `54`
- fail: `2`
- cancelled: `0`
- skipped: `0`
- todo: `0`

All eleven G-W1 tests PASS:

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

No previously passing G test regressed in the final candidate.

Exact residual failures:

- G-W2 — `29 concurrent same-path creates never silently select one remote winner`
- G-W3 — `G-C2 generic recover routes multiple folder journals by exact journal identity`

### Gate D — V1.3 foundation

PASS, real exit `0`.

- total: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- C15 PASS
- C16 PASS

### Gate E — H/V1.3 critical regression

Expected real exit: `1` solely for deferred G-W2/G-W3.

- total: `82`
- pass: `80`
- fail: `2`
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

The only failures are the exact deferred G-W2/G-W3 tests above. No H/non-G critical regression exists.

### Gate F — whole repository

Expected real exit: `1` solely for deferred G-W2/G-W3.

Final totals:

- total: `687`
- pass: `685`
- fail: `2`
- cancelled: `0`
- skipped: `0`
- todo: `0`

Exact P10 → G-R1 delta:

- total: unchanged at `687`
- pass: `674 → 685` (`+11`)
- fail: `13 → 2` (`-11`)
- cancelled: unchanged at `0`
- skipped/todo: unchanged at `0`

The only residual failures are G-W2 and G-W3.

### Gate G — production build

PASS, real exit `0`.

- `main.js` size: `699509` bytes
- SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`

Production artifact identity is exactly unchanged from approved P10, as required for this test-only G repair.

### Gate H — repository / PR invariants

PASS.

- no production source changed;
- no contract changed;
- candidate delta is confined to the authorized G model file;
- canonical evidence unchanged;
- proof workflow remains off the integration branch;
- PR #45: `open`;
- PR #45: `draft = true`;
- PR #45: `merged = false`;
- PR #45 head: `phase6-sync-integration-h`.

## Frozen authority values

- Approved V1.3 foundation source commit: `05600f7ca48a6726b72188005f29eddfc1191519`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Canonical evidence blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- Contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- Required immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`

All remained exact in authoritative proof.

## Blockers / unexpected classification delta

None.

G-R1 repaired exactly the eleven assigned G-W1 failures. G-W2 and G-W3 remain exactly deferred. No production change, contract drift, H regression, unexpected passing deferred test, cancellation, skip, or todo was introduced.
