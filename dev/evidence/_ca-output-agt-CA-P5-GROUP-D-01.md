# Coding-Agent Evidence — agt-CA-P5-GROUP-D-01

## Identification

- Agent: `agt-CA-P5-GROUP-D-01`
- Group: `G2R — Final Phase 5 Acceptance Correction`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `master`
- Original Group D start: `70b4952c82987e1de8a1455166b090b2a4f57918`
- Corrective G2 start: `c12350f0ad00a117a7116d529bc04ebedce09352`
- G2R correction-pass baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`
- Final dynamically tested implementation/test SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`
- Final remote `master` SHA: recorded in the final handoff after Git computes the evidence-only commit SHA; a file cannot embed the SHA of the commit that hashes that file without self-reference.
- Production source modified by G2R: **none**
- Pull request created: **none**

## Corrections Delivered

### C1 — Scenario 30

The Scenario 30 primary acceptance test now imports and uses production `WebLocksRunLeasePort`. It constructs two distinct production lease objects over one controlled shared fake lock manager and drives two real `IntegratedProductController` synchronization runs. The test proves the first controller holds the vault lock, the second cannot mutate concurrently, and release clears the shared lock so later acquisition can proceed.

### C2 — Scenario 47

The Scenario 47 primary acceptance test now uses `Phase5ProductRuntime.initialize()` to install the actual runtime-owned product-surface notification subscription. A controlled `ProductRuntimeHost.notify` records delivered messages. Ordinary pause/resume transitions are suppressed; a recovery-required transition traverses the runtime-owned notification filter and reaches `host.notify`. No test-created replacement `MeaningfulNotificationFilter` listener is used for the primary path.

### C3 — cumulative evidence

`dev/evidence/_ca-output.md` restores without condensation or deletion the full Phase 1–4 cumulative sections from `c12350f0ad00a117a7116d529bc04ebedce09352`, then updates Phase 5 with current G2R evidence.

Acceptance-map rows 30 and 47 point to the corrected exact tests, and the map continues to source-verify scenarios 1–50.

## Authoritative Dynamic Verification

- workflow: `Phase 1 CI`
- run ID: `32854213913`
- job ID: `97822114191`
- exact checked-out SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`
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

The GitHub Actions job log was inspected directly. Scenario 30 passed as test 169, Scenario 47 passed as test 173, and the acceptance-map self-check passed as test 121.

## Scenarios 1–50 Acceptance Status

`COMPLETE — AUTOMATED EXECUTABLE EVIDENCE`

All 50 acceptance-map scenarios retain primary executable evidence. The two re-rejected rows now point to the required production-path acceptance tests.

## Exact G2R Change Manifest

Compare baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`.

### Created

- none.

### Modified

- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase5-acceptance-map.test.ts`
- `dev/evidence/_ca-output.md`
- `dev/evidence/_ca-output-CA-P5.md`
- `dev/evidence/_ca-blocker.md`
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-D-01.md`

### Deleted

- none.

### Remote Branches Deleted

No branch was created or deleted during G2R.

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

**None in the assigned G2R automated acceptance/evidence scope.**

Independent supervisory review remains required. This evidence does not claim approval.