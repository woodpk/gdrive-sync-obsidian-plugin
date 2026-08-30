# Phase 6 Supervisor Handoff

## 1. Authority and current purpose

This is the current Stage 2A Phase 6 operational re-entry handoff for `woodpk/gdrive-sync-obsidian-plugin`. It does not redefine product authority.

Normative authority remains in:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`;
- `dev/planning-and-building/target-system-specification.md`;
- `dev/planning-and-building/decision-register.yaml`;
- `dev/planning-and-building/stage-1-build-decomposition.md`;
- `dev/planning-and-building/phase-1-shared-contracts.md` and `src/contracts/**`;
- current repository state and accepted `dev/evidence/**`;
- later explicit user decisions.

Stage 0 and Stage 1 are complete. Stage 2A remains active. Stage 3 has not begun.

## 2. Synchronization foundation continuation state

Foundation branch: `phase6-sync-architecture-foundation`  
Review PR: #34 → `phase6-integration`  
PR state: **OPEN / UNMERGED**  
Reviewed predecessor implementation: PR #33 head `85d509d90d475717d609c559fad870f64b956e9e`  
Historical Codex contract checkpoint: `8b575e7439fdd601166e3bdb6e335992364da3fc`  
Historical Codex handoff head before cloud correction: `e526d65ee64e8baf58fd7ea0439dfabcfb942c9d`  
Contract version label: `phase6-sync-foundation-v1`

The cloud continuation agent is `agt-CA-P6-SYNC-FOUNDATION-CLOUD-01`. It must preserve valid predecessor foundation architecture and correct only the shared authority gaps identified by independent review. Parallel implementation remains **NOT AUTHORIZED**.

The exact current candidate head must always be read from GitHub. The future **supervisor-approved workstream base SHA** is selected externally after independent review and is not the older code-only checkpoint.

## 3. Preserved predecessor foundation

The continuation preserves:

- LOCAL / REMOTE / BASE/common separation;
- persistence revision versus semantic generation;
- exact BASE authority and BASE healing;
- remote ingestion versus path convergence;
- discriminated intermediate/terminal Drive pages;
- explicit duplicate remote-path ambiguity;
- durable mutation identity and unknown outcome;
- restart recovery state;
- local transaction stages;
- exact local mutation provenance;
- cooperative cancellation distinct from crash safety;
- lifecycle state and deterministic fault injection;
- resource-bounded text merge policy;
- semantic state validation;
- A–G decomposition strategy;
- PR #33 operation-local stale isolation and safe unrelated-path progress.

## 4. Independent review corrections now required by candidate contracts

### Remote updates

Current official Drive v3 research did not establish a documented atomic expected-`File.version`/`If-Match` content-update CAS for `files.update`. `File.version` is observable and monotonically increasing, but read-then-later-update does not atomically bind that version. Resumable upload status is transport recovery, not content CAS. Ordinary blob revisions may be purged and are supplementary recovery only.

Accordingly, the candidate requires immutable-candidate preservation for existing-object content updates. Final writer bytes alone cannot prove an intervening Windows/iOS version never existed or was preserved.

### File BASE healing

File common-state authority is discriminated and requires current canonical SHA-256 equality plus current local/remote identity/revision evidence. Size/timestamp/path/object identity alone cannot authorize healing.

### Local hard-death recovery

Create and replace transactions now carry distinct exact target pre-state authority. Replace includes exact old observation + canonical old content authority; create carries authoritative expected absence. Backup expectations therefore cannot be guessed after restart.

### Remote ingestion durability

Authority state keeps a durable backlog of learned batches, not only a singular latest batch. A batch may be retired only after every reconciliation-relevant fact has been durably reduced elsewhere. This protects removals, moves, repeated changes, create-delete, duplicates, and long-lived unresolved paths while later batches continue.

### Dispatch ordering

`dispatch-authorized` is durably persisted before the external mutation call and means the mutation may have happened. Crash points distinguish pre-authority, post-authority/pre-call, call-before-response, and response-before-verification windows.

### Semantic validation

Known issue codes remain stable; `other-semantic-inconsistency` ensures a newly discovered contradictory state still fails closed.

## 5. Current candidate artifacts

- `phase6-sync-architecture-foundation.md`
- `phase6-sync-contract-freeze.md`
- `phase6-sync-parallel-workstreams.md`
- `phase6-sync-adversarial-validation.md`
- `project-state.yaml`
- this handoff
- `src/contracts/synchronization-foundation.ts`
- `test/phase6-sync-architecture-foundation.test.ts`
- predecessor evidence `../evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
- continuation evidence `../evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md` once created

## 6. A–G branch rule

No A–G worker branch exists or is authorized by this handoff. After independent approval, every worker prompt must name the same exact supervisor-approved repository SHA containing all final contracts, planning artifacts, re-entry state, tests, and evidence.

The current ownership manifest proves branch-local feasibility using frozen public seams and workstream-local fakes. Shared `src/testing/fakes.ts` and cross-workstream compatibility tests remain integration-owned. In particular, `test/phase2-execution.test.ts` crosses C's `StateCommitCoordinator` and D's execution coordinator; neither C nor D may edit it during parallel construction.

## 7. Required re-entry procedure

A later supervisor must:

1. read the current manual completely and perform the repository-grounded entry-state assessment;
2. read target specification, decision register, Stage 1 decomposition, Phase 1 shared contracts, project state, this handoff, the four synchronization foundation artifacts, and current evidence;
3. inspect `src/contracts/**`, foundation tests, PR #33 behavior, PR #34 diff, and actual branch/PR state;
4. verify any external Drive concurrency claim against current official Google documentation;
5. treat the exact repository as current implementation evidence;
6. never launch A–G before independent approval names one exact workstream-base SHA.

No unnecessary restart of Stage 0, Stage 1, or completed Stage 2A work is permitted.

## 8. Known infrastructure/platform qualifications

- Azure Static Web Apps PR preview has previously failed because the Static Web App had the maximum number of staging environments. Azure must not be modified as part of the foundation correction. Only a current run showing the same log may be qualified the same way.
- Fresh physical Windows/iPhone synchronization is outside this foundation-contract assignment.
- Existing stock-iOS limitations and later accepted mobile adapter-boundary decisions remain governed by the decision register and accepted evidence; the foundation does not claim new physical platform proof.

## 9. Review governance and hard boundary

Independent review must inspect the exact candidate head, contract semantics, predictive tests, Drive research, workstream ownership/feasibility, and evidence. The foundation is not approved merely because CI passes.

Do not:

- merge PR #34 or PR #33;
- merge `phase6-integration` or `master`;
- create A–G branches or launch workers;
- alter Azure or OAuth production configuration;
- tag/release;
- perform physical synchronization;
- begin Stage 3.

## 10. Next authorized action

After the continuation agent has completed corrections, verification, evidence, and pushed the final candidate:

> Return PR #34 and its exact final head to the independent supervisor architecture reviewer.

Only that reviewer may approve the workstream base SHA and authorize the parallel implementation wave.
