# H-U5-P6 Evidence — agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-08

## Identity and bounded assignment

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-08`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration branch: `phase6-sync-integration-h`
- Assignment: H-U5-P6 only — modernize `test/phase5-group-d-recovery-coordination-integration.test.ts` so the existing Group-D recovery/coordination scenarios execute through the current hardened authority/mutation seams without changing production semantics or behavioral assertions.
- Supervisor-approved pre-task head: `4c2335dd2a754bbe04a8f68d2c71abc4f9977b00`
- `H_U5_P6_ENTRY_HEAD`: `76be983a142e1a3934acfa968f1b8d43e2557e65`
- `H_U5_P6_CANDIDATE_SHA`: `0eb4184df1f830824d437e77b5ba58f9b9cf0386`
- Final H-U5-P6 evidence-bearing branch state: this H-08 evidence closure commit is the only post-candidate integration-branch repository change; its exact branch-head SHA is externally observable from `phase6-sync-integration-h` and is reported in the supervisor return package.

## Authorized entry-state verification

The approved H-U5-P5 head to H-U5-P6 entry delta was inspected before implementation:

- base: `4c2335dd2a754bbe04a8f68d2c71abc4f9977b00`
- head: `76be983a142e1a3934acfa968f1b8d43e2557e65`
- only changed path: `dev/planning-and-building/phase6-h-u5-p6-group-d-recovery-coordination-fixtures-task.md`
- no unapproved `src/**` or `test/**` change was present.

## Exact candidate change manifest

The implementation/test delta from `H_U5_P6_ENTRY_HEAD` to `H_U5_P6_CANDIDATE_SHA` contains exactly:

- `test/phase5-group-d-recovery-coordination-integration.test.ts`

No production file, contract file, additional test file, planning file, canonical evidence file, or prior-agent evidence file changed in the candidate.

## Fixture modernization summary

The legacy Group-D recovery/coordination fixture was brought forward to the current hardened production contract while retaining all eight existing test names and behavioral assertions.

Modernization is fixture-only and includes:

- current integrated durable synchronization state/authority via `IntegratedSynchronizationStateStore` for the physical coordination harness;
- seeded current authority state through `createInitialAuthorityState`;
- explicit writable synchronization authority supplied to `IntegratedProductController` only for the hardened physical harness;
- a minimal in-file `ReliableRemoteMutationPort` for file-create coordination;
- fake REMOTE full-reconciliation bookkeeping required for independent reliable mutation convergence verification;
- relocation of the existing start/hold/concurrency instrumentation onto `ReliableRemoteMutationPort.createReserved`, so Scenarios 27-30 observe the actual hardened physical mutation boundary;
- no production fallback and no weakening of authority, crash-safety, reliable mutation, cancellation, pause/resume, serialization, Web Locks, cursor, BASE, recovery, or deletion semantics.

The helper keeps hardened dependencies optional, so the already-passing legacy planning/recovery scenarios are not forced through a change-feed or mutation authority they intentionally do not exercise.

## Scenario preservation and disposition

Preserved as passing with original meaning:

- Scenario 20 — no `ReliableRemoteChangePort`; safe full reconciliation remains observable and commits a fresh cursor.
- Scenarios 21/22 — incomplete REMOTE or LOCAL observation cannot become deletion authority.
- Scenario 23 — stale current device cannot authorize destructive propagation.
- Scenario 40 — missing expected managed root blocks before planning or mutation.

Modernized from stale-harness cancellation to full execution without changing assertions:

- Scenario 27 — active first physical operation begins; cancellation prevents later queued operations; only `a.md` mutates; cursor remains unadvanced.
- Scenario 28 — pause blocks physical work and surfaces paused state; resume permits the original one-operation run.
- Scenario 29 — overlapping same-runtime requests remain serialized; maximum physical concurrency remains `1`.
- Scenario 30 — two distinct controllers retain separate production `WebLocksRunLeasePort` instances over one shared fake lock-manager boundary; B cannot mutate while A holds the lease, and the shared lock is released after each run.

## Proof topology and provenance

Primary disposable proof branch:

- `h-u5-p6-group-d-recovery-coordination-proof-h08`

Primary proof workflow:

- `.github/workflows/h-u5-p6-group-d-recovery-coordination-proof.yml`

Authoritative successful primary proof:

- workflow run ID: `33944973348`
- job ID: `101249298995`
- proof workflow head: `d3aa589d17e12596f0d6596f65d20d9bc0170306`
- workflow conclusion: `success`
- source/test checkout: exact candidate `0eb4184df1f830824d437e77b5ba58f9b9cf0386`
- Node: `22`
- `actions/checkout@v4`: `persist-credentials: false`, `fetch-depth: 0`
- no source/test/contract patch occurred in the proof workflow.

Primary proof artifact:

- name: `h-u5-p6-group-d-recovery-coordination-proof`
- artifact ID: `9963031676`
- artifact digest: `sha256:69e3ea51d3d7e7140b0acc068c804cee634413a38dcd36c670a34a9e3813342d`
- artifact size: `41108` bytes

A redundant workflow-only trigger also completed successfully as run `33944997449`; it did not alter the integration candidate and is not needed as the canonical proof.

Supplemental workflow-only build-identity proof:

- workflow: `.github/workflows/h-u5-p6-build-identity-proof.yml`
- run ID: `33945030284`
- conclusion: `success`
- artifact ID: `9963045279`
- artifact name: `h-u5-p6-build-697437-3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`
- uploaded archive digest: `sha256:84aac0e8d9e9b8db8ab9342471bce20ed1eda6402cc186b9f2bd61318718061c`

## Frozen-authority invariant results

The successful primary proof enforced these exact values before and after verification:

- exact candidate HEAD: `0eb4184df1f830824d437e77b5ba58f9b9cf0386`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable first-16,296-byte contract-freeze predecessor prefix object: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- tracked source/test worktree clean before verification
- tracked source/test worktree clean after verification
- candidate implementation/test scope exactly `test/phase5-group-d-recovery-coordination-integration.test.ts`

## Install / static / type gates

The primary proof completed successfully through:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- `git diff --check 76be983a142e1a3934acfa968f1b8d43e2557e65...0eb4184df1f830824d437e77b5ba58f9b9cf0386`

All passed.

## Focused H-U5-P6 verification

Command:

`node --test .test-build/test/phase5-group-d-recovery-coordination-integration.test.js`

Exact required and observed result, enforced by the successful workflow:

- tests: `8`
- pass: `8`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- exit code: `0`

All four previously passing scenarios remain passing, and Scenarios 27-30 now execute to completion rather than becoming `cancelledByParent`.

## V1.3 foundation gate

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js`

Exact result:

- tests: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- exit code: `0`
- C15: `PASS`
- C16: `PASS`

## H/V1.3 critical regression gate

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Exact result:

- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit code: `1`

H-I1 through H-I8 remain PASS. The 13 failures are the same previously classified G-owned adversarial-model failures:

1. `03 upload survives crash/restart at every durable effect stage`
2. `04 download survives crash/restart at every durable effect stage`
3. `05 move survives crash/restart at every durable effect stage`
4. `06 trash survives crash/restart at every durable effect stage`
5. `10 durable intended L1 is not substituted by later L2`
6. `15 repeated moves preserve stable remote identity`
7. `16 create-delete sequence preserves acknowledged deletion history`
8. `18 unresolved path A does not block safe path B progress`
9. `19 missed watcher is discovered by integrity reconciliation`
10. `20 Windows watcher-event loss is recoverable through authoritative integrity read`
11. `28 bounded quiescence after mutation pressure stops`
12. `29 concurrent same-path creates never silently select one remote winner`
13. `G-C2 generic recover routes multiple folder journals by exact journal identity`

No new H/V1.3 critical regression was introduced by H-U5-P6.

## Fresh whole-repository test measurement

Command:

`npm test`

Exact result enforced by the successful primary proof:

- tests: `687`
- pass: `640`
- fail: `27`
- cancelled: `20`
- skipped: `0`
- todo: `0`
- real exit code: `1`

H-U5-P5 baseline was:

- `687 / 636 pass / 27 fail / 24 cancelled / 0 skipped/todo`

H-U5-P6 therefore changed exactly four outcomes from cancelled to pass, with fail count and every other aggregate category unchanged. This matches the four stale OLF-PHYSICAL coordination outcomes in Scenarios 27-30 and introduces no new non-G failure or cancellation.

## Build/package gate

`npm run build` passed in the primary proof.

The supplemental exact-candidate build-identity proof measured the production artifact rather than inferring it:

- `BUILD_ARTIFACT_SIZE=697437`
- `BUILD_ARTIFACT_SHA256=3ee8d4adc859e19d4b003e19c4c1afc294985d542aeaf41d54662d254beb229b`

The production artifact is therefore semantically unchanged from the preceding test-fixture-only baseline.

## PR #45 state

Immediately before evidence closure, PR #45 remained:

- state: `open`
- draft: `true`
- merged: `false`
- merged_at: `null`
- head branch: `phase6-sync-integration-h`
- candidate head: `0eb4184df1f830824d437e77b5ba58f9b9cf0386`

H-U5-P6 did not merge PR #45 or alter its draft/open state.

## Explicit scope statement

H-U5-P6 modified no production file, no `src/contracts/**` file, no other test file, no canonical `dev/evidence/_ca-output.md`, and no H-01 through H-07 evidence file.

The candidate-to-evidence closure delta is intended to contain only this H-08 evidence file.

## H-U5-P6 conclusion

H-U5-P6 fixture modernization is complete at candidate SHA `0eb4184df1f830824d437e77b5ba58f9b9cf0386`, with focused 8/8, V1.3 foundation 17/17, unchanged 13-failure G-owned H-critical classification, whole-suite `687 / 640 / 27 / 20`, build, frozen-authority, artifact, and PR-state evidence established. This H-08 evidence file is the only authorized integration-branch repository change after the candidate.
