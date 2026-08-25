# Coding-Agent Evidence — agt-CA-P5-GROUP-D-01

## Identification

- Agent: `agt-CA-P5-GROUP-D-01`
- Group: `G2 — Phase 5 Executable Acceptance and Evidence Closure`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `master`
- Original Group D start: `70b4952c82987e1de8a1455166b090b2a4f57918`
- Corrective G2 start: `c12350f0ad00a117a7116d529bc04ebedce09352`
- Final dynamically tested implementation/test SHA: `7aab9a90c885f33a371576ef602e7a5d352b1d07`
- Final remote `master` SHA: recorded in the final handoff after Git computes the evidence-only commit SHA; a file cannot embed the SHA of the commit that hashes that file without self-reference.
- Production source modified by G2: **none**
- Pull request created: **none**

## Delivered Acceptance Work

G2 added real Phase 5 integration/orchestration acceptance for all scenarios previously rejected as insufficient. The tests use production decision/orchestration components and controlled fakes only at external boundaries.

Primary new integration files:

- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`

The corrected `test/phase5-acceptance-map.test.ts` maps scenarios 1–50 to semantically valid primary executable tests. Scenario 26 retains the accepted G1 semantics and runs with local-change synchronization enabled.

## Authoritative Dynamic Verification

- workflow: `Phase 1 CI`
- run ID: `32811319438`
- job ID: `97691056148`
- exact checked-out SHA: `7aab9a90c885f33a371576ef602e7a5d352b1d07`
- `npm ci`: **PASS** — 14 packages installed; 0 vulnerabilities
- `npm run typecheck`: **PASS**
- `npm test`: **PASS**
  - total: **209**
  - passed: **209**
  - failed: **0**
  - cancelled: **0**
  - skipped: **0**
  - todo: **0**
- `npm run build`: **PASS**

The GitHub Actions job log was inspected directly and confirms all values above.

## Scenarios 1–50 Acceptance Status

`COMPLETE — AUTOMATED EXECUTABLE EVIDENCE`

The acceptance-map self-check executed and passed in the 209-test authoritative gate. All scenarios previously called out in the corrective assignment now use primary Phase 5 orchestration evidence rather than semantically adjacent lower-layer substitutes.

## Exact G2 Change Manifest

Compare baseline: `c12350f0ad00a117a7116d529bc04ebedce09352`.

### Created

- `test/phase5-group-d-active-run-integration.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-first-sync-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

### Modified

- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`

### Deleted

- none.

### Remote Branches Deleted

Historical Group D cleanup deleted eleven obsolete branches:

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

Historical cleanup evidence: workflow `Group D Branch Cleanup`, run `32805742158`, job `97675382231`.

Corrective G2 created no non-`master` branch.

## Live / Physical Validation

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`
- physical network interruption — `NOT AVAILABLE IN THIS SESSION`
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`

## Preserved Stock-iOS Platform Limitations

1. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type. Unsafe whole-file fallback remains prohibited.
2. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee. The product remains fail-closed where proof is unavailable.

## Remaining Blocker

**None in the assigned G2 automated acceptance/evidence scope.**

Independent supervisory review remains required. This evidence does not claim approval.