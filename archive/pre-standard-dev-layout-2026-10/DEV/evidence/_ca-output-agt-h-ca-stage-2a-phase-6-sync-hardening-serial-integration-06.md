# H-U5-P4 Evidence — agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-06

## Identity and bounded assignment

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-06`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Writable integration branch: `phase6-sync-integration-h`
- Assignment: H-U5-P4 only — modernize the Phase 5 Group-D active-run integration fixture family for the current hardened production authority seams.
- `H_U5_P4_ENTRY_HEAD`: `e59b61990c8ec37fb7b3fae4b1604f267f49fb42`
- `H_U5_P4_CANDIDATE_SHA`: `7523eff48f4708f577feee1de2118e783be63589`

## Exact candidate change manifest

The candidate delta from `H_U5_P4_ENTRY_HEAD` to `H_U5_P4_CANDIDATE_SHA` contains exactly:

- `test/phase5-group-d-active-run-integration.test.ts`

No `src/**`, planning, canonical evidence, prior-agent evidence, or contract file changed in the candidate.

## Fixture modernization

The legacy active-run fixture was updated to construct the current production authority seams without changing production code or scenario intent:

- Scenario 15 now supplies current durable synchronization authority and executes the single ordinary REMOTE deletion through `ReliableRemoteMutationPort.trashExisting`; the legacy raw Drive trash seam is instrumented to fail if reached.
- Scenario 24 now supplies current writable authority plus hardened remote mutation seams and verifies that a stale operation precondition refuses mutation, completes attention-required, and does not manufacture a follow-up Changes reconciliation.
- Scenario 25 now uses the current reliable REMOTE immutable-candidate update authority and B-style `LocalTransactionalMutationPort` stage/commit authority. A REMOTE change arriving during the active run is deferred and consumed only by the later serialized Changes reconciliation. Legacy raw Drive update and raw LOCAL replacement seams are instrumented to fail if reached.

The three original scenario assertions/names remain represented by the focused test family.

## Proof topology and provenance

- Disposable proof branch: `h-u5-p4-group-d-active-run-proof-h06`
- Successful proof workflow head SHA: `5a980370da47ae03e6735398cfd7f66ea9ea3511`
- Successful workflow run ID: `33936328012`
- Successful workflow job ID: `101224873984`
- Workflow conclusion: `success`
- Workflow checked out the exact candidate SHA `7523eff48f4708f577feee1de2118e783be63589` with full history and `persist-credentials: false`.
- A prior disposable proof attempt failed only in the proof harness because shallow checkout made the entry SHA unavailable to `git diff --check`; no candidate source/test change resulted. The successful proof corrected only the disposable workflow by fetching full history.

## Environment and static/type gates

Successful proof environment:

- Git: `2.55.0`
- Node: `v22.23.2`
- npm: `10.9.8`

Successful gates:

- `npm ci`: exit `0`
- `npm run typecheck`: exit `0`
- `npx tsc -p tsconfig.test.json`: exit `0`
- `git diff --check e59b61990c8ec37fb7b3fae4b1604f267f49fb42...7523eff48f4708f577feee1de2118e783be63589`: exit `0`

## Focused H-U5-P4 proof

Command:

`node --test .test-build/test/phase5-group-d-active-run-integration.test.js`

Exact result:

- tests: `3`
- pass: `3`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- exit code: `0`

Passing scenarios:

1. `G2 scenario 15 one properly attested ordinary deletion trashes only the remote copy without triggering bulk approval`
2. `G2 scenario 24 stale operation precondition refuses mutation, completes with attention, and awaits an external reconciliation trigger`
3. `G2 scenario 25 remote change during an active production run is deferred to the later serialized Changes reconciliation`

## V1.3 / H critical gate

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Exact result:

- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- exit code: `1`

All 17 foundation V1.3 tests pass. H-I1 through H-I8 are all represented by passing H integration tests, including both H-I6 cases. The only 13 failures are the already-classified G-owned adversarial-model failures:

- `03 upload survives crash/restart at every durable effect stage`
- `04 download survives crash/restart at every durable effect stage`
- `05 move survives crash/restart at every durable effect stage`
- `06 trash survives crash/restart at every durable effect stage`
- `10 durable intended L1 is not substituted by later L2`
- `15 repeated moves preserve stable remote identity`
- `16 create-delete sequence preserves acknowledged deletion history`
- `18 unresolved path A does not block safe path B progress`
- `19 missed watcher is discovered by integrity reconciliation`
- `20 Windows watcher-event loss is recoverable through authoritative integrity read`
- `28 bounded quiescence after mutation pressure stops`
- `29 concurrent same-path creates never silently select one remote winner`
- `G-C2 generic recover routes multiple folder journals by exact journal identity`

No H/V1.3 critical-gate regression was introduced by P4.

## Whole-repository measurement

Command:

`npm test`

Exact result:

- tests: `687`
- pass: `633`
- fail: `30`
- cancelled: `24`
- skipped: `0`
- todo: `0`
- numeric exit code: `1`

This is the exact required two-result improvement for P4: the former scenario-15 failure and scenario-25 cancellation are now passing, with no material aggregate drift beyond those expected results. Known classified failures/cancellations outside P4 remain intentionally unresolved.

## Build/package gate

Command:

`npm run build`

Exit code: `0`

Existing build-verifier output:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `BUILD_ARTIFACT_SIZE=697437`
- `BUILD_ARTIFACT_SHA256=3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

## Frozen-authority checks

The successful proof enforced these values before and after execution:

- exact candidate HEAD: `7523eff48f4708f577feee1de2118e783be63589`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable first-16,296-byte contract-freeze predecessor prefix object: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- candidate tracked source/test tree clean after execution
- candidate scope rechecked as exactly `test/phase5-group-d-active-run-integration.test.ts`

## Proof artifact

- Artifact name: `h-u5-p4-group-d-active-run-proof`
- Artifact ID: `9960291765`
- Artifact digest: `sha256:0cdc9d2722d6f9937486bf6f36db21d8061c1a59bb47bbc6efae062e085e713f`
- Artifact size: `39785` bytes

The artifact contains focused, critical, full-suite, build, static/type, preflight, and final-invariant logs.

## PR #45 state at P4 proof closure

PR #45 remains:

- state: `open`
- draft: `true`
- merged: `false`
- head branch: `phase6-sync-integration-h`
- candidate head at the pre-evidence check: `7523eff48f4708f577feee1de2118e783be63589`

It was not merged or converted from draft status by P4.

## Remaining work explicitly outside H-U5-P4 authority

The following remain unauthorized in this task and were not repaired:

### Remaining OLF-PHYSICAL

- `test/phase5-group-d-acceptance.test.ts`
- `test/phase5-group-d-conflict-destruction-integration.test.ts`
- `test/phase5-group-d-recovery-coordination-integration.test.ts`
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`
- `test/phase6-alpha-plan-errors-stability.test.ts`

### Other unauthorized families/work

- OLF-FAKE-AUTH legacy family
- all 13 G-owned adversarial-model failures
- production-structure normalization, including phase/workstream naming leaked into production surfaces
- H-U5-P5 or any other later H-U5 corrective family not separately authorized by the supervisor
- H-FINAL / H-U6 final closure
- physical iPhone synchronization

P4 made no change to those surfaces.

## P4 conclusion

H-U5-P4 fixture modernization is complete at candidate SHA `7523eff48f4708f577feee1de2118e783be63589`, with the required focused, critical, aggregate, build, authority, artifact, and PR-state evidence established. This file is the only authorized evidence closure change following the candidate.
