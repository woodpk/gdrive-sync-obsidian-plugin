# Phase 6 Synchronization Hardening — Local Workstream Evidence

## Agent / Branch Authority

- Agent identity: `agt-CA-P6-SYNC-LOCAL-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Approved workstream-base SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Assigned branch: `phase6-sync-local`
- Starting branch SHA: `6984915d2989827edf00def64a04c102c4e08785`
- Frozen synchronization contract version: `phase6-sync-foundation-v1`
- Final verified implementation SHA before this evidence-only publication commit: `3cdcac3fede721d8135e00f11773c01cce551b43`
- Note on final branch SHA: writing this evidence artifact necessarily creates a later commit, so a commit cannot truthfully contain its own final SHA. The exact post-publication branch SHA is reported in the supervisor-facing final report and can be read directly from `phase6-sync-local`. No executable or test source is changed by this evidence-only publication commit.

## Manual Re-Ingestion Proof

The current branch copy of `dev/planning-and-building/agent-led-software-product-construction-manual.md` was re-read rather than relying on the auxiliary conversation copy.

- Title: `Agent-Led Software Product Construction Manual`
- First substantive sentence: `This manual defines an agent-led process for moving from an initial software idea or partially developed concept through product definition, build planning, implementation, and independent validation.`
- Last sentence: `The appropriate entry stage should always be determined from the actual project state rather than from an assumption that the manual must be followed from the beginning.`
- Heading counts:
  - H1: 1
  - H2: 11
  - H3: 50
  - H4: 34
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
  - `### Stage 0 Agent Prompt`
  - `### Stage 1 Agent Prompt`
  - `### Stage 2A Build-Prompt Expansion Template`
  - `### Autonomous Build Prompt`
  - `### Stage 3 Validation Prompt`

## Authoritative Artifacts Read

The workstream re-entry/read set included:

1. `dev/planning-and-building/agent-led-software-product-construction-manual.md`
2. `dev/planning-and-building/target-system-specification.md`
3. `dev/planning-and-building/decision-register.yaml`
4. `dev/planning-and-building/stage-1-build-decomposition.md` and the current Stage 1 dependency/coverage context referenced by it
5. `dev/planning-and-building/phase-1-shared-contracts.md`
6. `dev/planning-and-building/project-state.yaml`
7. `dev/planning-and-building/phase-6-supervisor-handoff.md`
8. `dev/planning-and-building/phase6-sync-architecture-foundation.md`
9. `dev/planning-and-building/phase6-sync-contract-freeze.md`
10. `dev/planning-and-building/phase6-sync-parallel-workstreams.md`
11. `dev/planning-and-building/phase6-sync-adversarial-validation.md`
12. `dev/evidence/_ca-output.md` as predecessor/read-only context
13. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-01.md`
14. `dev/evidence/_ca-output-agt-CA-P6-SYNC-FOUNDATION-CLOUD-01.md`
15. directly relevant frozen contract files, including `src/contracts/local-vault.ts` and `src/contracts/synchronization-foundation.ts`
16. workstream-owned production and relevant tests, including canonical local evidence, Obsidian local vault, desktop/mobile access boundaries, exclusions/config policy/external-reference guard, and local-hardening tests.

## Relevant Current-State Findings

- `CanonicalEvidenceLocalVault` cached canonical SHA-256 by path plus opaque observation token. If bytes changed while the token-generating metadata stayed unchanged and no watcher event arrived, the ordinary fast path could keep returning stale canonical evidence indefinitely.
- The frozen foundation contract already supplied `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` as the authoritative integrity seam; production behavior had not implemented it.
- Existing local mutation behavior predated the frozen `LocalTransactionalMutationPort`. It did not provide the final explicit create-versus-replace pre-state, canonical old/new proof, durable stage/backup/swap recovery, or transaction/result provenance required by the frozen synchronization authority model.
- Desktop bounded reads and external-reference safety already remain behind desktop-specific boundaries. The mobile path uses Obsidian/DataAdapter-compatible facilities; the workstream did not introduce Node/Electron/PowerShell/.NET requirements into shared/mobile code.
- Local filesystem/watch events remain hints. The existing enumeration model preserves completeness/uncertainty distinctions; this workstream did not turn events or unknown reads into deletion authority.

## Files Changed

Modified production files:

- `src/local/local-vault-access-boundary.ts`
- `src/product/canonical-local-vault.ts`

Created tests:

- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`

Created evidence:

- `dev/evidence/_ca-output-agt-CA-P6-SYNC-LOCAL-01.md`

Deleted files: none.

No `src/contracts/**` file was modified. No cumulative evidence file, integration-owned test, workflow/release/Azure/OAuth-return file, or another worker's evidence file was modified.

## Implementation Decisions Within Engineering Discretion

### Crash-safe local transaction port

`ObsidianLocalMutationTransactions` was added behind the frozen `LocalTransactionalMutationPort` using only the Obsidian `DataAdapter` plus `LocalVaultPort` observation/read semantics.

- Stable transaction-provided stage/backup paths are used; volatile process memory is not needed to identify recovery artifacts.
- Target/stage/backup must be distinct, platform-compatible sibling paths.
- Create requires authoritative expected absence.
- Replace requires exact stable expected presence, exact observation token, and canonical verification of the old bytes before displacement.
- New bytes are written to the stage path and SHA-256/size verified before any valid target can be displaced.
- Replacement first moves the old target to the persisted backup path and verifies the backup against canonical old content before swapping the verified stage into place.
- Final target bytes are canonically re-verified after swap.
- Cleanup is best effort and explicitly non-correctness-critical. A durable verified new target may return `cleanup-pending` if backup cleanup fails.
- Recovery reasons from actual target/stage/backup state. Missing target plus missing required replace backup is an `outcome-unknown` contradiction and is never reinterpreted as create authority.
- A recoverable old target is restored when the new stage is missing/corrupt after displacement.

### Authoritative integrity cache bypass

`CanonicalEvidenceLocalVault` now implements `LocalIntegrityReconciliationPort`.

- Ordinary observations retain the existing token-keyed fast cache.
- `readFileBypassingEvidenceCache()` deliberately starts below that cache, reads actual bytes, hashes them, then proves the same stable observation token still holds after the read.
- Bounded retry handles stale observations.
- Only after a successful authoritative read is the ordinary cache refreshed.
- This preserves fast-path performance while allowing integrity reconciliation to detect same-size/same-mtime content drift after a missed event.

### Exact mutation-event provenance/coalescing

`CanonicalEvidenceLocalVault` also fronts the transactional backend for watcher-event correlation.

- Target-touching watcher hints are held only during the exact transaction commit/recovery interval.
- Hints are coalesced only when the transaction returns committed/recovered with an exact resulting observation token, direct post-observation confirms that token, and every held event is an exact structural rename implied by that transaction.
- A nonstructural/overlapping user `modified` event, token mismatch, blocked/stale/unknown result, or thrown error causes held hints to be released.
- No timing-window suppression is used and no event is promoted into deletion authority.

## Verification Commands and Results

Because the execution container could not resolve `github.com`, repository checkout could not be performed there. Verification was therefore executed against the pushed isolated branch by the repository's GitHub Actions workflows. A temporary draft PR was opened solely to trigger those existing workflows; it was explicitly non-merge and is closed after evidence collection.

### Intermediate correction history

Two branch-local test-authoring TypeScript issues were found by CI and corrected before completion:

1. Initial local-safety test used an assertion form that TypeScript narrowed incorrectly. Production code was unchanged; the test typing was corrected without weakening the scenario.
2. The explicit recovery-matrix fixture allowed TypeScript to infer optional `undefined` properties across heterogeneous object literals. Production code was unchanged; the fixture was given an explicit `Record<string, Uint8Array>` matrix-case type.

These were not pre-existing failures and are not represented as such. Final completion evidence uses the post-fix branch state only.

### Full Phase 6 diagnostic gate — PASS

Final verified implementation SHA: `3cdcac3fede721d8135e00f11773c01cce551b43`.

The final Phase 6 diagnostic workflow run completed successfully and exercised the repository-defined gate, including:

- `npm ci` — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS (includes every workstream-owned existing test plus both `test/workstreams/local/**` files)
- focused Phase 6 callback/diagnostic/OAuth/replay/mobile-oriented test invocation — PASS
- `npm run build` — PASS
- `npm run check` — PASS
- `git diff --check` — PASS
- built-artifact identity/packaging check in the diagnostic workflow — PASS

A preceding corrected standard CI run also passed `npm run typecheck`, the complete `npm test` suite, and `npm run build` before the explicit recovery-matrix expansion. The final diagnostic run above is the authoritative post-matrix result.

## Workstream-Specific Acceptance Evidence

### Create recovery matrix

`test/workstreams/local/local-recovery-matrix.test.ts` explicitly covers:

- death before stage: no target, no verified stage -> blocked with target absence preserved;
- death after stage write but before verification: corrupt/truncated stage -> blocked and never promoted to target;
- death after stage verification: verified stage -> recovery completes create;
- backup-establishment boundary: not applicable to create because create requires authoritative absence and never displaces a valid old target;
- death after swap: exact intended target -> recovered;
- death before cleanup: exact intended target -> recovered; cleanup is not correctness authority.

### Replace recovery matrix

The matrix proves:

- after backup establishment: exact old backup plus verified new stage -> recovery completes replacement;
- after swap/before cleanup: exact new target plus exact old backup -> recovered and cleanup may proceed best effort;
- missing expected backup while target is absent -> `outcome-unknown` contradiction, never create.

Additional production recovery behavior restores an exact old backup when target is absent and the stage is unavailable/corrupt instead of declaring deletion/success.

### Corrupt/truncated staged download

`test/workstreams/local/local-transaction-safety.test.ts` stages bytes that do not match the frozen expected new SHA-256/size. The transaction is blocked before target displacement and the create target remains absent.

### Same-size/same-mtime missed watcher + unchanged token

The local-safety test primes the ordinary canonical cache with H0, mutates underlying bytes to same-size H1 without changing the observation token and without emitting a watcher event, confirms that the ordinary cache may still return H0, then calls `readFileBypassingEvidenceCache()` and proves H1 is discovered from actual bytes.

### Exact self-mutation plus overlapping user edit

The local-safety test proves exact transaction structural rename hints can be coalesced after matching the resulting token, while an overlapping user `modified` event occurring during the same plugin transaction remains observable to synchronization listeners.

### Windows and iOS safety regressions

The full `npm test` suite remained green, including the owned desktop bounded-read, external-reference, local failure/policy, mobile safety, Obsidian local-vault, Phase 6 local-hardening, iOS adapter/content-reader, and portable-collision suites. `npm run check` and the Phase 6 diagnostic workflow also remained green, preserving mobile-safe packaging/import boundaries.

### Failure/absence semantics

The transaction implementation never turns unknown/unreadable expected-target state into absence. Replace missing target plus missing expected backup is a contradiction. Existing enumeration/read failure semantics remain unchanged and the full path-local failure tests remained green.

## Scope / Diff Audit

The complete diff from approved base `6984915d2989827edf00def64a04c102c4e08785` was inspected. Before this dedicated evidence artifact, executable/test changes were limited to:

- `src/local/local-vault-access-boundary.ts`
- `src/product/canonical-local-vault.ts`
- `test/workstreams/local/local-transaction-safety.test.ts`
- `test/workstreams/local/local-recovery-matrix.test.ts`

All are inside this workstream's exclusive ownership/new-test namespace. The only additional final diff entry is this permitted dedicated evidence file.

Frozen/prohibited files were not modified. Tests were added to make the frozen safety semantics executable; no existing test was weakened to manufacture a pass.

## Integration Dependencies

No production dependency on another parallel worker branch was introduced and this branch builds/tests independently against the approved foundation.

Expected serialized integration work remains:

- the integration supervisor must compose/wire `ObsidianLocalMutationTransactions` into the production runtime path that owns the frozen safe mutation port;
- Workstream E/integration scheduling must invoke `LocalIntegrityReconciliationPort.readFileBypassingEvidenceCache()` at policy-selected Verify/Reconcile/integrity opportunities.

Those are ownership/integration handoffs, not contract gaps, and this workstream did not cross into their production files.

## Contract Change Request

None. All assigned acceptance semantics were implementable behind the frozen contract surface.

## Known Limitations Within Scope

- No physical Windows/iPhone synchronization was performed; the prompt explicitly prohibits that in this worker session.
- Cleanup of transaction stage/backup artifacts is deliberately best effort; correctness/restart recovery does not depend on cleanup succeeding immediately.
- The workstream supplies the production transaction and integrity implementations but does not cross ownership to wire scheduler/orchestration call sites assigned to integration/other workstreams.

## Final Status

- Implementation verified at SHA `3cdcac3fede721d8135e00f11773c01cce551b43` before evidence-only publication.
- Branch was pushed through the GitHub repository API throughout the workstream.
- No merge was performed.
- No Stage 3, release, tag, Azure/OAuth production configuration, integration-branch modification, or physical-device synchronization was performed.
