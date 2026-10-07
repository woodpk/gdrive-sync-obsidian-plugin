# Repair and verification

## Minimum repair

- `GoogleDriveAdapter.updateExisting` still creates and verifies the immutable candidate first.
- It now retires the exact persisted predecessor to recoverable Drive trash only when the live path contains exactly the authorized predecessor and candidate and no independent object.
- It re-observes the predecessor's trashed state and requires the candidate to be the sole live, byte-correct occupant before returning `verified-effect`.
- `finalizeExistingUpdate` resumes only that bounded retirement step without needing volatile source bytes. It is idempotent after trash changes the predecessor's Drive version.
- Durable recovery invokes the finalizer only for the exact persisted predecessor/candidate intermediate topology. Missing finalizer, incomplete observation, unexpected identity/content, or any extra object remains recovery-required/conflict-preserved.
- `verifyPreservedRemoteUpdateConvergence` now distinguishes `predecessor-retirement-required` from true convergence; true convergence requires one live intended candidate.
- The ordinary planner's duplicate fail-closed behavior was not weakened.
- Frozen predecessor contract files were not semantically modified.

The predecessor's bytes, ID, revision lineage, and recoverability remain preserved in Drive trash; it no longer masquerades as current path occupancy.

## Regression proof

Focused production/adapter suites passed: **55/55 tests** (49 top-level tests plus nested subtests), including:

- first-sync no-BASE `Keep local` through the production controller/executor path;
- portable `__brain_sync_portable_config__/app.json` ending with one planner-visible candidate, coherent BASE/mapping, and a subsequent noop rather than `blocked-unsafe`;
- ordinary non-portable update coverage;
- real `GoogleDriveAdapter` candidate creation, ambiguous upload response, recoverable predecessor retirement, sole-candidate verification, and idempotent restart finalization after Drive version advancement;
- durable restart from the exact predecessor/candidate intermediate without content redispatch;
- wrong predecessor, wrong candidate, content mismatch, revision mismatch, and unexpected third same-path object all remaining rejected;
- clean-merge and ordinary production integration paths.

Commands:

- `npm run typecheck` — PASS.
- Focused compiled test command — PASS, 55/55.
- `npm run build` — PASS; all five build verifiers PASS; artifact 740540 bytes, SHA-256 `f648f0534dcfdc55b53465c7fe9b841e8050e39b9c68009f6f9750d84f435ba3`.
- `git diff --check` — PASS.
- Full `npm run check` — executed; typecheck PASS, tests **729/732 PASS**, then stopped before its build stage because three established Windows checkout/harness failures remained. A separate production build passed.

The three full-suite failures are outside the changed product/test surfaces:

1. Two `phase6-alpha-portable-collision` expectations compare root-relative Windows paths with the runtime's drive-qualified `D:\\vault\\...` result.
2. Foundation C15 raw-byte prefix verification fails first on untouched `src/contracts/common.ts` because the Windows `core.autocrlf=true` checkout uses CRLF while the approved Git blob prefix is LF.

None of the three files/tests is changed by this repair, and all repair-affected suites pass. They are recorded as environment-qualified full-verification blockers rather than concealed or broadened into unrelated edits.

## Changed production surface

- `src/drive/google-drive-port.ts`
- `src/product/authoritative-production-executor-base.ts`
- `src/product/durable-intent-recovery-base.ts`
- `src/product/durable-intent-recovery.ts`
- `src/product/product-controller.ts`
- `src/product/remote-update-convergence.ts`

Test fixtures that formerly modeled two live objects as success were corrected, and focused causal regressions were added under the existing Phase 5/6 and workstream suites.
