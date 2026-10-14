# Phase 5 Coding-Agent Evidence — Group D G2R Closure

## Identification

- Agent: `agt-CA-P5-GROUP-D-01`
- Assignment: `G2R — Final Phase 5 Acceptance Correction`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Branch: `master`
- Original Group D baseline: `70b4952c82987e1de8a1455166b090b2a4f57918`
- Accepted G1 / G2 starting point: `c12350f0ad00a117a7116d529bc04ebedce09352`
- G2R correction-pass baseline: `4509df8ad95e4caa4af19928bfea1abb7cd2c7fa`
- Final dynamically tested implementation/test SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`
- PR: `NOT APPLICABLE — DIRECT MASTER WORK; NO PR CREATED`
- Phase 6: `NOT STARTED`
- Stage 3: `NOT STARTED`

G2R modified no production source files.

## G2R Corrections

### C1 — Scenario 30

Scenario 30 now exercises the production cross-instance lease implementation. It creates two distinct `WebLocksRunLeasePort` instances backed by one controlled shared fake Web Locks manager and runs two real `IntegratedProductController` synchronization paths. The first controller holds the shared vault lock; the second cannot mutate while it is held; release makes the lock available again. `InMemoryRunLeasePort` remains only for other tests and is not Scenario 30 primary evidence.

### C2 — Scenario 47

Scenario 47 now initializes `Phase5ProductRuntime`, installs the runtime-owned controller-surface subscription, records `ProductRuntimeHost.notify`, proves ordinary pause/resume transitions do not notify, and proves a recovery-required transition traverses the runtime-owned notification filter and reaches the host notification delivery boundary. The test does not reconstruct a separate `MeaningfulNotificationFilter` listener as primary evidence.

### C3 — cumulative evidence

`dev/evidence/_ca-output.md` restores the complete Phase 1–4 cumulative text from `c12350f0ad00a117a7116d529bc04ebedce09352` before the updated Phase 5 material. Earlier cumulative phase evidence was not condensed or deleted.

## Acceptance Map

Rows 30 and 47 in `test/phase5-acceptance-map.test.ts` point to the corrected exact G2R tests. Scenarios 1–50 remain present, source-verified, and executable. The map self-check passed in the authoritative gate.

## Authoritative GitHub Actions Gate

- workflow: `Phase 1 CI`
- run ID: `32854213913`
- job ID: `97822114191`
- exact checked-out SHA: `3aab3647b57baad7df0b31cc40042325fcfa0e4f`
- checkout: clean, fetch depth 1
- `npm ci`: **PASS** — 14 packages installed, 0 vulnerabilities
- `npm run typecheck`: **PASS**
- `npm test`: **PASS**
  - tests: **209**
  - pass: **209**
  - fail: **0**
  - cancelled: **0**
  - skipped: **0**
  - todo: **0**
- `npm run build`: **PASS**

The GitHub Actions job log was inspected directly. Corrected Scenario 30 passed as test 169, corrected Scenario 47 passed as test 173, and the acceptance-map self-check passed as test 121.

Historical checkpoints remain historical only:

- `ee431c408c64cddf3bcc8642c3015179fefb9b91` — 177/177;
- `c12350f0ad00a117a7116d529bc04ebedce09352` — 178/178;
- `7aab9a90c885f33a371576ef602e7a5d352b1d07` — 209/209, run `32811319438`, job `97691056148`.

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

No branches were created or deleted by G2R.

Historical Group D cleanup deleted:

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

## Evidence-only Final Head Convention

The exact dynamically tested implementation/test SHA is fixed above. Evidence-only commits follow it. A file cannot embed the SHA of the commit that hashes that same file without self-reference, so the exact final remote `master` SHA is recorded in the final handoff after evidence commits complete and is independently verifiable from GitHub.

## Live / Physical Validation

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`
- physical network interruption — `NOT AVAILABLE IN THIS SESSION`
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`

## Preserved Stock-iOS Limitations

1. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range local reading for every required file type; unsafe whole-file fallback remains prohibited.
2. `BLOCKED — PROVEN PLATFORM LIMITATION`: stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee; fail closed where proof is unavailable.

## Remaining Blocker

**None discovered in the assigned G2R automated acceptance/evidence scope.**

Independent supervisory review remains required. No supervisory approval is claimed.