# Phase 6 Synchronization Workstream F — Merge / Resource Safety Evidence

## Identity / branch control

- Agent: `agt-CA-P6-SYNC-MERGE-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Assigned branch: `phase6-sync-merge`
- Starting HEAD: `6984915d2989827edf00def64a04c102c4e08785`
- Branch was absent before this session and was created directly from the exact approved SHA.
- `phase6-sync-architecture-foundation` was independently checked and pointed to the same approved SHA at branch creation.
- No rebase/cherry-pick from another worker branch was performed.
- No merge was performed.

## Manual re-ingestion proof

Current manual copy re-read/recounted for this workstream:

- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- Last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- Heading counts: H1 `1`; H2 `11`; H3 `65`; H4 `43`; H5 `0`; H6 `0`.
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
- Embedded prompt headings: `Stage 0 Agent Prompt`; `Stage 1 Agent Prompt`; `Stage 2A Build-Prompt Expansion Template`; `Autonomous Build Prompt`; `Stage 3 Validation Prompt`.

The H3 count above is derived from the current supplied manual copy for this session; it is intentionally not copied from predecessor evidence.

## Authoritative artifacts reconciled

The workstream used the current/manual target authorities and repository-grounded Phase 6 authorities, including:

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/planning-and-building/target-system-specification.md`
- `dev/planning-and-building/decision-register.yaml`
- `dev/planning-and-building/stage-1-build-decomposition.md`
- `dev/planning-and-building/phase-1-shared-contracts.md`
- `dev/planning-and-building/project-state.yaml`
- `dev/planning-and-building/phase-6-supervisor-handoff.md`
- `dev/planning-and-building/phase6-sync-architecture-foundation.md`
- `dev/planning-and-building/phase6-sync-contract-freeze.md`
- `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
- `dev/planning-and-building/phase6-sync-adversarial-validation.md`
- predecessor context `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
- `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
- frozen merge/conflict/common/cancellation/resource contracts under `src/contracts/**`
- owned production files and `test/phase2-conflict.test.ts`.

Historical repository artifacts still say the A-G wave was not authorized. Per the assigned work order, the later independent-supervisor approval of exact base `6984915d2989827edf00def64a04c102c4e08785` supersedes only that stale candidate-status wording; architecture/contracts/ownership remain frozen.

## Relevant starting-state findings

- `mergeThreeWayText()` allocated a full `(baseLines + 1) * (sideLines + 1)` LCS matrix separately for LOCAL and REMOTE, producing unbounded quadratic memory and time.
- `ProductTextVersionStore` accumulated complete decoded text strings without resource admission, including capture paths.
- Frozen `TextMergeResourcePolicy`, `assessTextMergeEligibility()`, and `SynchronizationCancellationSignal` already provide a sufficient contract surface; no contract change is required.
- Existing conflict semantics (BASE+LOCAL+REMOTE, no newest-wins, complete provenance on unresolved cases, opaque/binary preservation) were retained.

## Files changed from approved base

Modified production:

- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`

Modified owned existing test:

- `test/phase2-conflict.test.ts`

Created permitted test:

- `test/workstreams/merge/resource-safety.test.ts`

This evidence file is the only additional workstream artifact.

No production file outside Workstream F ownership was modified. No `src/contracts/**` file, `src/testing/fakes.ts`, integration-owned test, foundation planning artifact, other worker evidence, workflow, release, Azure, OAuth-return, protected branch, or version file was modified.

## Implementation decisions within Engineering Discretion

- Added explicit pre-materialization admission using the frozen byte-size policy. Unknown-size, per-version oversized, or combined oversized three-way inputs immediately return frozen `unresolved-text` with complete version provenance.
- Replaced the full quadratic-memory LCS matrix with a linear-memory Hirschberg-style LCS reconstruction using two bounded `Uint32Array` rows.
- Added an explicit comparison-cell budget in addition to byte admission so pathological line structures cannot consume unbounded computation. Exhaustion falls back to unresolved conflict; it never truncates or returns a partial merge.
- Added cooperative cancellation checks at admission, between version materializations, within LCS computation, and before clean-merge acknowledgement.
- Retained fast paths for identical LOCAL/REMOTE and one-side-equals-BASE cases before expensive diff computation.
- Made text-version reads/capture require known admitted byte sizes before buffering. UTF-8 decoding is fatal on invalid sequences, byte-count bounded, and exact declared-size checked.
- Canonical retained text remains keyed by SHA-256 evidence and is persisted only after exact hash/UTF-8-byte-size validation.
- A computed clean merge is not acknowledged unless merge-output evidence is available with hash and byte size; the production `ProductTextVersionStore` computes SHA-256 over the exact merged text and exact UTF-8 byte size before retention.
- Default automatic-merge admission is 512 KiB per version / 1.5 MiB combined. This is an engineering safety parameter behind the frozen policy rather than a product-level file-size ceiling; oversized files remain preserved and surface unresolved rather than being discarded.

## Focused acceptance evidence

`test/workstreams/merge/resource-safety.test.ts`, executed via the owned top-level conflict suite, covers:

- just-below / at / above configured per-version thresholds;
- combined-input over-limit refusal;
- unknown-size refusal;
- proof that refused sizes perform zero text-provider reads, so they do not enter the old materialization/merge path;
- cancellation at admission and during version materialization;
- cancellation during merge computation;
- comparison-budget exhaustion with no partial success;
- ordinary clean non-overlapping merge correctness;
- overlapping-edit unresolved behavior with complete BASE/LOCAL/REMOTE provenance;
- BASE-missing and opaque/binary preservation behavior;
- multibyte Unicode exact UTF-8-byte/hash retention;
- rejection of corrupt text for an existing canonical hash key;
- oversized and unknown-size capture paths not being buffered/retained.

The original owned conflict tests continue to cover ordinary independent-line clean merge, overlapping conflict, complete provenance, timestamp-independent binary conflict, and delete-vs-modify provenance.

## Verification

### Connector-local focused compile check

A minimal TypeScript compile against the frozen contract shapes was used while authoring. It caught one discriminated-union narrowing issue in resource eligibility; that was corrected before repository CI. The two modified production modules then compiled cleanly in that focused harness. This is supplementary only, not substituted for repository CI.

### GitHub PR merge-ref verification containing branch head

A draft CI-only PR #36 was created solely to invoke the repository's existing unmodified workflow. It is explicitly marked `MUST NOT be merged`.

Final implementation/test head before evidence append: `b6dadc0bd168c3a37bc085a2fd1a39ceacc10a1d`.

GitHub Actions `Phase 1 CI`, run `33341622615`, job `99338174192`, on PR merge-ref containing that head:

- dependency installation: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS
  - the owned top-level conflict test imports `test/workstreams/merge/resource-safety.test.ts`, so the new Workstream F acceptance tests execute inside this test step rather than merely compile.
- `npm run build`: PASS
- `npm run check`: semantically covered by the same successful typecheck + test + build commands; package.json defines `check` as exactly those three commands.
- build verifier invoked by `npm run build`: PASS.

An earlier CI run at head `24f3a09096102afc9059d316efa431b0a62d0468` also passed typecheck, ordinary test suite, and production build before the nested suite was wired into the owned top-level runner.

### Exact-base diff / ownership audit

GitHub exact-base comparison `6984915d2989827edf00def64a04c102c4e08785...b6dadc0bd168c3a37bc085a2fd1a39ceacc10a1d` shows only:

- `src/core/conflict-resolver.ts`
- `src/product/text-version-store.ts`
- `test/phase2-conflict.test.ts`
- `test/workstreams/merge/resource-safety.test.ts`

before this dedicated evidence append. Therefore frozen/prohibited code/test files are unchanged from the approved base.

### `git diff --check` qualification

The available GitHub connector does not expose an arbitrary command runner and the container cannot clone GitHub in this session, so a literal repository `git diff --check` command could not be executed without modifying CI/workflow files, which are prohibited by this work order. The exact-base GitHub diff was inspected for scope and generated through GitHub's normal text-content APIs; no whitespace-error indication was observed. This limitation is reported rather than falsely claiming the command ran.

## Pre-existing failures

None observed in the authoritative PR verification: typecheck, test, and production build all passed.

## Integration dependencies

None. Workstream F compiles and verifies against the frozen foundation without another worker branch.

## Contract change request

None. The frozen merge resource/cancellation/conflict surface is sufficient.

## Known limitations within scope

- No physical Windows/iPhone synchronization or device-memory profiling was performed; the work order explicitly prohibits physical-device synchronization. The implementation enforces bounded admission/memory structures and is covered by synthetic resource tests.
- Cancellation remains cooperative. Process death/crash durability is intentionally owned by the frozen operation lifecycle/state workstreams; this workstream does not claim cancellation substitutes for crash recovery.
- Literal local `git diff --check` was unavailable as qualified above.

## Final SHA / working-tree semantics

The implementation/test head verified by CI is `b6dadc0bd168c3a37bc085a2fd1a39ceacc10a1d`. Creating this evidence artifact necessarily advances the branch to a documentation-only evidence commit; as established by predecessor project-state rules, an evidence file cannot contain its own resulting commit SHA without an infinite self-reference. The exact final branch SHA after this evidence append must therefore be read externally and reported in the final agent report.

The branch is remotely persisted; there is no uncommitted connector-side working tree. No merge is authorized or performed.

WORKSTREAM F COMPLETE — READY FOR SUPERVISOR REVIEW — NOT MERGED
