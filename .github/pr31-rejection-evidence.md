
---

## PR #31 rejection repair — `agt-CA-P6-ALPHA-PLAN-ERRORS-STABILITY-CLOUD-CONT-01`

### Review authority and supersession

- reviewed rejected head: `872c5872df14a848946607035ff1d6234f6f3592`
- branch: `phase6-alpha-plan-errors-stability`
- PR: `#31` -> `phase6-integration`
- version: `0.1.7`
- the earlier continuation statement that no remaining blockers existed is superseded by this rejection package and repair record
- the previously accepted C1/C2 crash-recovery design remains preserved

### Defect 1 — cross-platform-equivalent relocation

**FIXED.** Complete CSV locations are compared using the repository's NFC-normalized, case-folded `normalizedComparisonPath` semantics. Case-only/Unicode-equivalent source and destination locations are rejected before durable relocation journal acceptance or filesystem mutation. Persisted journals receive the same rejection. Cleanup also refuses a source equivalent to the active CSV.

Tests use a normalization-aware adapter whose physical keys collide under the same comparison semantics. They prove case-only and Unicode-equivalent rejection, no write/rename/remove, no accepted journal, and preservation of the original CSV and records.

### Defect 2 — incomplete operational-path validation

**FIXED.** Canonical/stage/backup construction is centralized as `<path>`, `<path>.brain-sync-stage`, and `<path>.brain-sync-backup`. `resolveSyncPlanErrorsPath()` validates all three complete paths through existing cross-platform policy before accepting the directory. Persisted relocation paths are re-derived through that resolver.

Tests prove root/default and normal-directory acceptance; rejection when the directory fits but canonical CSV exceeds the limit; rejection when canonical fits but a transaction path exceeds the limit; and rejection before durable relocation state/filesystem mutation.

### Defect 3 — valid destination history overwrite

**FIXED.** Relocation recovers source and destination independently and deterministically merges valid histories instead of replacing the destination. Matching keys retain maximum occurrence count (no relocation/restart increment), earliest first-seen, latest last-seen, and unresolved/current dominance. Every current record survives; resolved history remains bounded by `DEFAULT_SYNC_ATTENTION_RETENTION`. The destination is written, re-read, and validated before active-location commit/source cleanup. Invalid destination data fails safely without overwrite.

Tests prove source+destination preservation, no fake occurrence increments, current/resolved retention, bounded resolved history, restart idempotence, invalid-destination non-overwrite, and cleanup only after durable validated destination establishment. One pre-rejection C1 assertion was updated because it previously expected a valid destination record to be discarded.

### Implementation/test lineage

- `80733e1d535d32198b05a556a22d921a4b5aa9b1` — operational-path validation and equivalent-journal rejection
- `3141533ab775cdb43ddeb0099eef6c3df6dddf9c` — history-preserving relocation merge and defensive cleanup
- `04fc2094dbe0ed54ce2c17ade4c7854b25c2fdba` — eight new rejection regressions
- `7a8adb4139baa420f323b44d1442e14495635ca8` — final implementation/test tree, including corrected prior C1 restart expectation; **implementation SHA**

### Verification

Strict GitHub/Linux verification:

- workflow: `PR31 Rejection Repair Verification`
- run: `33278086171`
- job: `99168292629`
- verifier commit: `4423dafa6d2557522ee8bcd4efb88d3095abb6d4` (implementation tree plus temporary verifier only)
- `npm ci`: PASS
- `npm run typecheck`: PASS
- `npm test` with `set -o pipefail`: **366/366 PASS**, 0 fail
- focused plan-errors suite: **43/43 PASS**, 0 fail
- `npm run build`: PASS
- `npm run verify:build`: PASS
- `git diff --check`: PASS
- all five build/package verifiers: PASS
- `main.js`: **408025 bytes**
- `main.js` SHA-256: `3a25092b5f097a193d769b41603aaf60c789d5e7609ce69c01957d80d7d2fac5`
- Linux `manifest.json`: 275 bytes; SHA-256 `79127c33d5e7df64776f0bdd076cf58d37ac53f20de1e4bd533f750273c3e547`

An earlier ordinary PR run on `04fc2094...` exposed one stale pre-rejection assertion (365/366 actual TAP) even though its `tee` pipeline reported workflow success. The eight new rejection tests passed. After correcting that stale assertion, the strict pipefail-safe gate passed 366/366 and 43/43.

Fresh Windows execution: **NOT AVAILABLE IN THIS CLOUD SESSION**. The inherited Windows result remains **356/358 qualified PASS** and was not rerun. Its only failures are the established direct-missing-child and nested-missing-target Windows drive-prefix expectation mismatches; this rejection repair did not modify that bounded-read implementation.

### Boundaries

This section is appended to both required evidence files. The generated evidence commit cannot self-contain its own SHA; the exact evidence/closure SHA and exact final PR head are recorded in PR #31 metadata and the completion response. Temporary repair-verification/evidence workflow files are removed from the final tree.

PR #31 remains OPEN and UNMERGED. `phase6-integration`, `master`, tag/release state, OAuth/Azure product behavior, physical devices, synchronization execution, Phase 6 completion, and Stage 3 remain untouched.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
