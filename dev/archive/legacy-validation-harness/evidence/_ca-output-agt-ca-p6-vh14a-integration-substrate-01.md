STATUS: COMPLETE

# VH14-A — Integrated Substrate and Runner Contract Evidence

## Identity and accepted base

- Final required package branch: `phase6-vh14-a-integration-substrate`
- Recovery implementation branch: `phase6-vh14-a-integration-substrate-r1`
- Exact authorized recovery base: `d50e7ad5ed77d2f8f45534528cc8d7630465f6af`
- Recovery-base tree: `470f96b93b15f61e5c6303c72760ad15a4852c0f`
- Last accepted VH04–VH13 integration: `692517b6aedd676a9903eae6fe970d861ff0dad9`
- Supervisor-authorized integration-only repair: `d50e7ad5ed77d2f8f45534528cc8d7630465f6af`
- Final implementation/test checkpoint: `7b5e0a9389ab93147dac8ed924eade83640ead14`
- Final implementation/test tree: `4fa9296a93b2485639513a216b9e5acf04d06915`
- Recovery evidence head: `a1ddc7e994bab3d5547c8fe78a0a6399b538cb36`
- Recovery evidence tree: `3858e1f1bb49f1b1768711c6a22b9a984a13bd3f`
- Required-branch acceptance merge: `99f4fd0676663060d80863a7b1e851fdb3b575f2`
- Required-branch acceptance tree: `3858e1f1bb49f1b1768711c6a22b9a984a13bd3f`
- Final Package A evidence/branch head: the commit containing this evidence-only closure; its exact SHA/tree is returned to the supervisor because a Git commit cannot embed its own identity.

The supervisor append-only reconciled the completed recovery branch through merge
`99f4fd0676663060d80863a7b1e851fdb3b575f2`. Its tree exactly equals recovery
head `a1ddc7e994bab3d5547c8fe78a0a6399b538cb36`:

`3858e1f1bb49f1b1768711c6a22b9a984a13bd3f == 3858e1f1bb49f1b1768711c6a22b9a984a13bd3f`

Therefore the required branch accepted the exact already-verified Package A
content without rewriting the recovery history or changing implementation bytes.

## Repaired-substrate gate

The full VH14 §9.2 substrate gate was rerun from the exact recovery base before H6A contract work.

Results:

- `692517b6aedd676a9903eae6fe970d861ff0dad9` remains an ancestor: PASS.
- Required VH07–VH13 remote heads equal their exact approved SHAs: PASS.
- Each approved VH07–VH13 head is an ancestor of the accepted integration: PASS.
- Each corresponding predecessor evidence file begins exactly `STATUS: COMPLETE`: PASS.
- All approved VH04–VH13 implementation files exist: PASS.
- The repaired `src/validation/index.ts` exports every VH04–VH13 module, including VH05 `fixture-manager` and VH13 `human-checkpoint-resume-controller`: PASS.
- The repair commit changes only `src/validation/index.ts` relative to its parent: PASS.
- Worktree was clean and no merge/rebase/cherry-pick/revert operation was active: PASS.

Approved VH04–VH13 source/evidence heads already integrated:

| Package | Accepted source/evidence head |
| --- | --- |
| VH04 | `7f1f3ef409869f8498efa91f1fe0ec22a7f71225` |
| VH05 | `86c2b1da5b389679bd8d9c3fdd468fe697a56c56` |
| VH06 | `6d05a1e3c1831d3460ecd3a3624dbb98aea3a3b6` |
| VH07 | `bd73a0ce713d0993cf60b6fe6c5457f3dd5e9be8` |
| VH08 | `a119a741db2eb5f1c0f613490a94f6fb39f21e77` |
| VH09 | `733ed17eb3307bfdfd65a2c9032aff1c18f48b74` |
| VH10 | `f2e8be3228e84b89da0f18a448b0a1d73b810a2e` |
| VH11 | `130fefa991e330fdaa9a3838f473183f6256d8ba` |
| VH12 | `8f6754239f41055d1862274490e2cc3812dba775` |
| VH13 | `a27a3e94436f239cd1a84a30dfe316114678d7db` |

Accepted first-parent integration merges reconstructed from repository history:

| Package | Integration merge |
| --- | --- |
| VH04 | `d64139984629bc2a5889f83fc1e0311ec2567733` |
| VH05 | `2e55c57352d9043b46669ad0d7897df1596152af` |
| VH06 | `58f0c851c7fecb0214280ff98dd967324053c224` |
| VH07 | `f0e166977fd6d7e16ca0c588e95357ca46f1fea5` |
| VH08 | `943355f294130a50c9f0bfa51aa29ce0f462d57d` |
| VH09 | `582beada55b681ad088f3ec9cceb4f8169614aa4` |
| VH10 | `703663cd60f12a2630a62ce73d201d6dac51f52f` |
| VH11 | `c312a9e3652a348df1e82cf68c89836830cdfc5a` |
| VH12 | `32493b3179099f4477ce019e2513feb304152556` |
| VH13 | `692517b6aedd676a9903eae6fe970d861ff0dad9` |

Historical discrepancy retained without rewriting history: tasking-listed VH04 SHA `7ae491c5083e463633c6ba5adb81db9024530a1a` does not resolve in the repository; repository-authoritative accepted first-parent history contains `d64139984629bc2a5889f83fc1e0311ec2567733`.

## H6A internal runner contract seam

Created `src/validation/scenario-runner-contracts.ts` as a type/composition seam only. It implements no runner or module behavior.

The seam:

- aliases the exact frozen H0 `VALIDATION_SCENARIO_IDS` tuple for C03–F03 enumeration;
- reuses frozen `ValidationRunIdentity`, `ValidationRunId`, `ValidationScenarioId`, `ValidationStepId`, `ValidationDeviceIdentity`, `HumanCheckpoint`, `HumanCheckpointId`, `HumanCheckpointResume`, and `ValidationScenarioLifecycle` vocabulary;
- freezes declarative single-scenario, ordered-suite, current-step, completion-proof, prerequisite, and stop-reason shapes;
- defines the revision-CAS runner state-store boundary and complete persistent run/scenario/suite-position/current-step/lifecycle state;
- defines the approved-module facade without implementing or duplicating any module semantics;
- makes delegated verification and evidence proofs explicit so the runner cannot manufacture PASS from an operation acknowledgement;
- defines `ValidationRunnerDurableStatePort` as both the runner state store and VH13 `HumanCheckpointResumeCommitPort`, preserving durable/idempotent adoption before checkpoint cleanup;
- exposes the narrow VH13 `consumeResume` structural seam and exact adoption tuple;
- defines the generic runner/factory/dependency interfaces required for B/C/D/E and final I composition.

No second synchronization engine, filesystem/Drive behavior, planner policy, verifier behavior, evidence behavior, fault behavior, coordination behavior, or checkpoint behavior was implemented.

## Focused contract tests

Created `test/validation-scenario-runner-contracts.test.ts` with four focused cases:

1. exact identity reuse of the frozen C03–F03 tuple;
2. exact approved-module, completion-proof, prerequisite, and stop-reason vocabulary;
3. revision-CAS persistent-state shape and exact assignability to VH13's resume-commit port;
4. generic composition/factory seams representing `RUNNING`, `PASS`, `FAIL`, `BLOCKED`, `PAUSED-HUMAN-ACTION`, and `RESUMABLE` without granting module behavior.

Compile-time negative assertions reject pre-C03 scenario IDs and an alternate synchronization-engine module identity.

## Durable Package A checkpoints

| Purpose | Commit | Tree | Push result |
| --- | --- | --- | --- |
| Repaired substrate/provenance receipt | `0cce8987eedddad052d97ebaec22b4060467eb73` | `8444e60a3ac8c491b9eee4bbfa610ac2101d9c4c` | pushed |
| Compile-clean contract seam | `4fba074566886fb15550f48bed9b0c164853c1e5` | `1a68946fa06aa9385274be3c74e98f19b18df9b5` | pushed |
| Focused contract tests / final implementation | `7b5e0a9389ab93147dac8ed924eade83640ead14` | `4fa9296a93b2485639513a216b9e5acf04d06915` | pushed |

## Exact changed-file manifest

Relative to exact authorized recovery base `d50e7ad5ed77d2f8f45534528cc8d7630465f6af`, Package A changes exactly:

- `src/validation/scenario-runner-contracts.ts`;
- `test/validation-scenario-runner-contracts.test.ts`;
- `dev/evidence/_ca-output-agt-ca-p6-vh14a-integration-substrate-01.md`.

No other file is Package A-owned or changed by this package.

Required-branch closure rechecked `d50e7ad5ed77d2f8f45534528cc8d7630465f6af..99f4fd0676663060d80863a7b1e851fdb3b575f2` and found exactly the same three A-owned files. The same comparison restricted to `src/contracts/**`, the three frozen H0 contract files, `src/validation/index.ts`, and `dev/evidence/vh14-orchestration-state.json` is empty.

## Verification

Dependency restoration:

- `npm ci` — PASS; 16 packages installed/audited, 0 vulnerabilities.

Required acceptance gates at exact implementation checkpoint `7b5e0a9389ab93147dac8ed924eade83640ead14`:

- `npm run typecheck` — PASS.
- `npx tsc -p tsconfig.test.json` — PASS.
- `node --test .test-build/test/validation-scenario-runner-contracts.test.js` — PASS: 4 passed, 0 failed, 0 skipped/cancelled/todo.
- `git diff --check d50e7ad5ed77d2f8f45534528cc8d7630465f6af..HEAD` — PASS.

The complete repository suite/build are Package I final gates and were not required for Package A acceptance; no claim is made that Package I verification has occurred.

## Frozen-boundary and safety confirmation

- `src/contracts/**`: unchanged.
- Frozen H0 validation contracts: unchanged.
- Approved VH04–VH13 implementations/tests/evidence: unchanged.
- `src/validation/index.ts`: unchanged by Package A.
- Supervisor orchestration manifest: unchanged by Package A.
- VH11 uncertainty remains unresolved until VH08 independent observation.
- VH13 durable adoption ordering remains mandatory and is represented structurally by the combined durable state/adoption port.
- No live validation, release, promotion, merge, or VH15 work occurred.

## Deviations and blockers

- Historical tasking/repository VH04 merge-SHA discrepancy is recorded above and was explicitly accepted by the supervisor as historical; repository history was not rewritten.
- The fresh worktree initially lacked npm dependencies. Locked dependencies were restored with `npm ci` before verification.
- Remaining Package A blockers: none.

## Required-branch evidence-only closure

- Required branch before closure: `99f4fd0676663060d80863a7b1e851fdb3b575f2`.
- Exact-tree equality to recovery evidence head: PASS.
- Three-file Package A ownership delta from recovery base: PASS.
- Frozen H0, `src/contracts/**`, barrel, and supervisor-manifest delta from recovery base: empty / PASS.
- `git diff --check d50e7ad5ed77d2f8f45534528cc8d7630465f6af..99f4fd0676663060d80863a7b1e851fdb3b575f2`: PASS.
- Closure changes only this Package A evidence file; no source, test, frozen contract, barrel, or manifest file was modified.
