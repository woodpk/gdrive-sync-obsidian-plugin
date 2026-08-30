# Phase 6 Sync State / BASE / Recovery Evidence

## Agent and branch control

- Agent identity: `agt-CA-P6-SYNC-STATE-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Foundation branch verified at approved base: `phase6-sync-architecture-foundation`
- Frozen contract version: `phase6-sync-foundation-v1`
- Assigned branch: `phase6-sync-state`
- Starting branch SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Branch-control result: `phase6-sync-state` did not exist before this workstream and was created directly from the exact approved base SHA. No alternate base, rebase, or parallel-worker cherry-pick was used.
- Repository access note: the execution environment could not resolve `github.com` for a local clone, so repository writes were made through the repository API and executable verification was delegated to the repository's existing GitHub Actions diagnostic workflow. No uncommitted local repository copy exists.

## Manual re-ingestion proof

Derived from the current approved-branch copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md`, not copied from historical evidence.

- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- Last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- Heading counts:
  - H1: 1
  - H2: 11
  - H3: 67
  - H4: 43
  - H5+: 0
  - Total headings: 122
- Complete H2 sequence:
  1. Purpose
  2. Operating Principles
  3. Navigation and Entry
  4. Stage 0 — Product Discovery and Requirements Elicitation
  5. Stage 1 — Target-System Specification and Minimum Sound Build Decomposition
  6. Stage 2A — Controlled Session-Based Construction
  7. Stage 2B — Autonomous Product Construction
  8. Stage 3 — Independent Product and System Validation
  9. Cross-Stage Handoff Rules
  10. Re-Entry and Recovery
  11. Recommended Default Workflow
- Embedded stage prompt headings:
  - `Stage 0 Agent Prompt`
  - `Stage 1 Agent Prompt`
  - `Stage 2A Build-Prompt Expansion Template`
  - `Autonomous Build Prompt`
  - `Stage 3 Validation Prompt`

## Authoritative artifacts read

The following were read/reconciled against the approved base before or during implementation:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. `dev/planning-and-building/stage-1-build-decomposition.md` (including its coverage/dependency material)
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` (read-only predecessor context)
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. Relevant frozen contracts: `src/contracts/common.ts`, `src/contracts/state.ts`, `src/contracts/synchronization-foundation.ts`, `src/contracts/google-drive.ts`, `src/contracts/index.ts`
16. Workstream-owned production files and tests, including Phase 2 state/state-hardening/safety-policy, Phase 5 recovery-state, and Phase 6 crash-state tests.

## Relevant current-state findings

- The pre-workstream persistent store primarily persisted legacy `TrustedSynchronizationState` with one persistence/state revision and shallow structural validation.
- The frozen Phase 6 foundation already separates byte-level persistence/CAS revision from semantic synchronization generation and defines exact common-state proof, durable learned remote batches, recoverable physical mutation descriptors/effects, explicit dispatch stages, restart directives, semantic validation, and stale-device authority.
- Frozen Workstream C ownership makes this state layer the sole durable synchronization-authority implementation for the parallel architecture. Workstreams A/B may supply observations/results later; Workstream D later orchestrates the authority APIs.
- Existing legacy state APIs remain necessary to keep the approved-base repository buildable independently while the frozen authority path is introduced.

## Files created / modified / deleted

Modified:

- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `test/phase2-state-hardening.test.ts`

Created:

- `test/workstreams/state/state-authority.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-STATE-01.md`

Deleted: none.

No `src/contracts/**`, `src/testing/fakes.ts`, foundation planning/freeze/workstream/adversarial artifact, another workstream evidence file, workflow, release, Azure, OAuth-return, or protected-branch file was modified.

## Engineering-discretion implementation decisions

- Extended the existing persistence envelope rather than introducing a second independent persistence authority. Legacy state APIs are retained for compatibility; the new path implements the frozen `SynchronizationAuthorityStore` contract directly.
- Authority writes require atomic compare-and-swap. `persistenceRevision` tracks durable document writes; `semanticGeneration` advances only when the semantic authority projection changes. Journal-only writes do not advance semantic authority.
- Added explicit durable BASE fingerprint authority so deletion/current-common transitions can be checked against the exact frozen generation/path/fingerprint proof rather than inferred from legacy BASE shape.
- File common-state healing accepts only frozen exact canonical SHA-256 content proof; folder and absence proofs remain distinct.
- Learned Drive batches are append-preserved and can retire only after an explicit durable reduction record establishes that required facts have been transferred into other durable authority. Remote feed watermark advancement remains distinct from path convergence.
- Recoverable operations persist frozen per-effect descriptors, intended canonical file content where applicable, deletion/identity authority, durable stage, and verification reference. Journal garbage collection is allowed only after every required effect is `state-committed`.
- Semantic validation includes both enumerated contradiction checks and fail-closed extension checks reported as `other-semantic-inconsistency`.
- Legacy state is not silently promoted to Phase 6 semantic authority. Authority migration requires explicit reconstruction, backup first, and CAS-bound replacement.
- Stale-device timestamps are advisory aging metadata only; they are never synchronization winner/BASE authority.

## Workstream-specific acceptance evidence

### Persistence revision versus semantic generation

`test/workstreams/state/state-authority.test.ts` proves a journal-only durable operation-intent write advances persistence/CAS revision while leaving semantic generation unchanged, and proves the exact frozen physical mutation descriptor remains durable.

### Exact BASE/common transitions

The same suite proves unequal LOCAL/REMOTE canonical file content cannot produce frozen file-common proof; exact canonical equality can heal stale BASE; semantic generation advances on the authoritative transition; and re-use of the prior generation proof is rejected as stale semantic authority.

### Lossless learned-remote backlog

The multi-batch table preserves unresolved batch A while later batch B is learned. B deliberately includes create-then-delete and duplicate same-path remote objects. Cursor/watermark advancement is exercised independently of path convergence. Retirement of A fails until explicit durable reduction evidence exists; a later batch never overwrites the only durable facts from A.

### Crash/restart matrix

The acceptance suite walks upload, download, local move, remote move, local trash, and remote trash through every durable stage:

- `intent-persisted` -> `retire-unattempted-intent`
- `dispatch-authorized` -> `reconcile-physical-reality`
- `outcome-unknown` -> `reconcile-physical-reality`
- `effect-verified` -> `finish-authoritative-state-commit`
- `state-committed` -> `none`

This proves a lost response after dispatch never becomes `definitely not applied`, and a verified physical effect resumes the authoritative state commit rather than redispatching the physical mutation.

### Multi-effect clean merge

A clean text merge persists two independently staged physical effects. One effect is verified and state-committed while the other remains `intent-persisted`; the logical operation remains incomplete until all required effects commit.

### Semantic contradiction handling

The suite exercises a known contradiction (`active-device-missing`) and an extension/future invariant contradiction. Both fail closed; the extension contradiction is surfaced using `other-semantic-inconsistency` rather than being silently accepted because it lacks a more specific enumerated code.

### Stale-device authority transitions

Production transitions are exercised for peer registration, durable stale authority, reconciliation clearing, aging back to stale, and explicit stale marking. The durable state save demonstrates that a real stale-device authority change advances semantic generation. This is not a manually injected planner fixture.

### Migration/recovery backup and CAS safety

A structurally readable legacy state is accepted only by the legacy compatibility load; `loadAuthority()` returns recovery-required. Explicit authority migration creates a backup before replacing state and uses CAS-bound replacement. Existing Phase 2 state-hardening tests also exercise CAS races and durable verified-deletion state handling.

## Verification record

### Repository diagnostic verification

Latest implementation verification before this evidence-only commit:

- Commit: `0dc07df5c97b80e8efa81edd2f95ef5d44b34bff`
- Workflow: `Phase 6 Alpha Diagnostic Verification`
- Workflow run: `33341856879`
- Job: `99338808330`
- Result: SUCCESS / all steps green.

The workflow executed and passed:

- dependency installation (`npm ci`)
- `npm run typecheck`
- `npm test` — includes all owned existing state tests and, through the owned Phase 2 state-hardening test, every new `test/workstreams/state/**` acceptance test
- focused OAuth/callback diagnostic tests retained by repository CI
- diagnostic privacy/redaction and recovery-export refusal checks
- `npm run build`
- `npm run check` (repository package/mobile integration verifier)
- `git diff --check`
- artifact identity verification and artifact upload

No unrelated/pre-existing test failure remained.

Development-time failures were branch-introduced and were corrected rather than misclassified as pre-existing:

1. Initial CI identified a TypeScript cast defect in per-effect advancement; fixed before acceptance.
2. The next CI identified a strict-null typing defect in the new acceptance test; fixed without weakening the assertion.
3. The subsequent full diagnostic run above was green.

Because the execution environment could not clone the repository locally, focused tests could not be run as separate local shell invocations. The repository's full `npm test` command executed them as part of the green Actions job, and the workstream tests were deliberately imported from an owned root test so the repository's existing test-discovery command exercises them.

## Diff / ownership inspection

The complete compare from approved base `6984915d2989827edf00def64a04c102c4e08785` through implementation commit `0dc07df5c97b80e8efa81edd2f95ef5d44b34bff` was inspected. Before this evidence-only commit, the compare contained only:

- `src/state/persistent-state-store.ts`
- `src/state/state-policy.ts`
- `test/phase2-state-hardening.test.ts`
- `test/workstreams/state/state-authority.test.ts`

All are within assigned ownership. This evidence file is the only additional final-branch change.

## Integration dependencies

No production dependency on another parallel worker branch was introduced. Expected later integration dependency: Workstream D must consume the frozen authority APIs/restart directives and withhold new automatic mutation authority until pending/uncertain restart recovery has been reconciled. Workstreams A and B can supply their frozen protocol/local-transaction results without requiring branch-local contract changes.

## CONTRACT CHANGE REQUEST

None. The assigned acceptance criteria were implementable using the frozen contract surface.

## Known limitations / hard-stop boundaries

- No physical Windows or iPhone synchronization was performed, as prohibited by the workstream hard stop.
- Cross-workstream orchestration remains the assigned responsibility of Workstream D; Workstream C exposes the durable authority and recovery directives required for that integration.
- No local working-tree status exists because no local clone could be established in this environment. All branch mutations are repository commits; final branch/diff/PR status is verified through repository metadata and CI.

## Final branch status

- Implementation SHA before this evidence-only commit: `0dc07df5c97b80e8efa81edd2f95ef5d44b34bff`
- Final branch SHA: the commit containing this evidence file; it is reported by the supervisor handoff/final response because a Git commit cannot contain its own final SHA without changing that SHA.
- Working state: all repository mutations are committed on `phase6-sync-state`; no merge was performed.
- Draft PR #35 exists only as a supervisor-review/CI surface and remains unmerged.
