# AGENT NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-05`

## 0. AGENT IDENTITY

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-05`

You are the next serial Phase 6 H integration agent for:

`woodpk/gdrive-sync-obsidian-plugin`

You are the successor to:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-04`

This is a continuation assignment.

Do not restart H integration.
Do not restart H-U4 classification.
Do not redo V1.3 A/B/D integration or H-C1 authority restoration.
Do not redo H-U5-P1.
Do not redo H-U5-P2 or its contract-freeze provenance restoration.

Your assignment is exactly one bounded H-U5 continuation unit:

`H-U5-P3 — OLF-PHYSICAL Phase 5 Group-D first-sync fixture modernization`

Do not begin another H-U5 package after completing this one.

Do not begin H-FINAL / H-U6 final closure.

---

# 1. REPOSITORY / BRANCH / CURRENT AUTHORITY

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Writable integration branch:

`phase6-sync-integration-h`

Supervisor-approved H-U5-P2 final evidence/branch head immediately before this tasking file was added:

`2a4f18f110ca1b20f20312c2986e4d78ae830d40`

Retained V1.3 A/B/D implementation authority:

`4fef16f498dafba15fc1da5a63124567c5f56bcc`

Accepted H-U5-P2 implementation SHA:

`4d1daea1f8551de496d29f1a56d489b4b9a813f9`

Supervisor-authorized contract-freeze provenance restoration:

`740d3338e10b3cdf36a92288f2f8d8c37ee26fe3`

Frozen V1.3 `src/contracts/**` tree:

`0db68ced179825f929008b502335210260ca2ce3`

Canonical evidence blob that must remain unchanged:

`d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`

Current H verification PR:

`#45`

Required PR state throughout this unit:

`OPEN / DRAFT / UNMERGED`

The supervisor tasking commit that creates this file necessarily advances the branch above `2a4f18f...`.

At entry:

1. record the actual live branch head as `H_U5_P3_ENTRY_HEAD`;
2. compare `2a4f18f110ca1b20f20312c2986e4d78ae830d40...H_U5_P3_ENTRY_HEAD`;
3. require that the only post-approval change is this tasking file under `dev/planning-and-building/**` unless the supervisor has explicitly supplied another approved planning/evidence-only commit;
4. if any unapproved `src/**` or `test/**` change appears above `2a4f18f...`, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

Do not substitute another SHA for any authority named above.

---

# 2. COMPLETED WORK THAT MUST BE PRESERVED

## H-U1 through H-U4

H production composition, mutation/restart integration, feed/lifecycle/merge integration, full verification, and failure classification are complete.

Accepted H-U4 classification established:

- `H-INTEGRATION-DEFECT`: `0`;
- obsolete legacy fixtures remain repairable only in bounded H-U5 packages;
- G adversarial-model failures remain worker-owned and are not H repair authority.

## H-U5-P1

The first foundational `OLF-PHYSICAL` constructor-fixture package is complete.

Preserve the approved modernized fixture patterns in:

- `test/phase5-controller.test.ts`;
- `test/phase5-group-a-recovery-state.test.ts`;
- `test/phase5-group-b-scope-transfer.test.ts`.

In particular, `test/phase5-controller.test.ts` now demonstrates the approved test-side construction pattern using current durable/writable authority and explicit recoverable mutation seams. Treat that file as an implementation reference, not as new repair scope.

## H-U5-P2

The `OLF-STATIC` scenario-31 acceptance-map correction is complete.

The contract-freeze predecessor-prefix regression discovered during P2 was separately restored under supervisor authority and verified:

- V1.3 foundation: `17/17 PASS`;
- C15: PASS;
- C16: PASS;
- current H/V1.3 critical gate: `82 total / 69 pass / 13 fail`;
- all 13 remaining failures in that critical gate are the already-classified G-owned adversarial-model failures.

Do not modify C15, the contract-freeze document, the acceptance map, or the P2 evidence in this unit.

---

# 3. SOURCE OF THIS UNIT — APPROVED H-U4 CLASSIFICATION

H-U4 classified the affected file under:

`OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL`

Authorized file:

`test/phase5-group-d-first-sync-integration.test.ts`

H-U4 recorded eight failing tests in this file:

1. `G2 scenarios 1 and 5 local-only reviewed first sync uploads, commits cursor/base, and only then opens automatic eligibility`
2. `G2 scenario 2 remote-only reviewed first sync downloads and commits authoritative cursor/base`
3. `G2 scenario 3 identical first sync establishes BASE without content mutation`
4. `G2 scenario 4 divergent same-path no-BASE first sync surfaces conflict and preserves both versions`
5. `G2 scenario 5 scheduler ignores local changes before first-sync completion and executes them after reviewed completion`
6. `G2 scenario 7 ordinary trusted local edit executes upload-update through production orchestration`
7. `G2 scenario 8 ordinary trusted remote edit executes download-update through production orchestration`
8. `G2 scenario 9 transient offline failure preserves prior cursor then a later production reconciliation succeeds`

These failures were classified as stale fixture construction, not product defects.

---

# 4. CAUSAL DEFECT TO REPAIR

The current first-sync fixture still constructs the physical controller using pre-hardening assumptions.

Its harness uses legacy/raw fixture composition such as:

- direct `PersistentSynchronizationStateStore` use where the integrated writable authority seam is now required;
- `ProductSynchronizationExecutor` over raw local/Drive callbacks;
- `IntegratedProductController` construction without the current explicit writable/recoverable mutation dependencies required by hardened production behavior.

Production correctly fails closed when those seams are absent.

The test fixture is stale.

The approved H-U5-P1 modernization in `test/phase5-controller.test.ts` demonstrates the intended direction:

- use the existing integrated synchronization-state authority adapter rather than inventing a shadow store;
- provide an explicit `ReliableRemoteMutationPort` test seam for physical remote mutations;
- provide an explicit `LocalTransactionalMutationPort` test seam for physical local create/replace behavior;
- preserve durable authority semantics and current fail-closed production behavior;
- keep fixture implementations minimal and faithful to the test's original physical effects.

Do not copy P1 code mechanically if the first-sync harness needs a smaller or slightly different in-memory implementation. Use the minimum current approved seams required by this file's actual scenarios.

---

# 5. EXACT AUTHORIZED REPAIR

This unit authorizes exactly one implementation/test file modification:

`test/phase5-group-d-first-sync-integration.test.ts`

Modernize only that file's fixture/harness construction so all eight existing tests execute through the current hardened controller/executor authority model.

You may:

- add or adjust imports in this file;
- replace direct legacy fixture state construction with the existing approved integrated state adapter;
- add minimal in-file `ReliableRemoteMutationPort` support required for upload create/update and any other remote physical effect actually exercised by these eight tests;
- add minimal in-file `LocalTransactionalMutationPort` support required for download create/update and local transaction behavior exercised by these tests;
- add any other currently-required controller dependency only if the current production constructor proves it is directly necessary for these existing scenarios;
- update the harness's in-memory bookkeeping only as required to model the same physical effects the tests already assert.

You must preserve every existing test's behavioral assertion and scenario meaning.

Do not:

- modify production code;
- modify `src/contracts/**`;
- modify another test file;
- weaken, delete, skip, rename away, or disable any of the eight tests;
- convert physical assertions into mocks that bypass the hardened execution path;
- reintroduce legacy raw mutation fallback into production;
- add permissive fallback behavior merely to make tests pass;
- alter first-sync product semantics;
- alter scheduler semantics;
- alter cursor/BASE commit ordering;
- alter conflict-preservation semantics;
- alter offline/deferred semantics.

If semantic repair genuinely requires a second repository file, stop before editing it and report:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

# 6. ENTRY INSPECTION — READ ONLY

Before editing:

1. confirm the live branch and record `H_U5_P3_ENTRY_HEAD`;
2. verify the post-`2a4f18f...` delta is tasking/planning-only as specified above;
3. verify `src/contracts/**` tree remains exactly `0db68ced179825f929008b502335210260ca2ce3`;
4. verify canonical `dev/evidence/_ca-output.md` remains blob `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`;
5. verify `dev/planning-and-building/phase6-sync-contract-freeze.md` still has the restored approved whole-file blob `b675e0fc9776d03892a4309231b91a4bf0a84b93` and first-16,296-byte prefix hash `fe527c76137b2cd578ef7050ee3444498b21a5e0`;
6. inspect in full:
   - `test/phase5-group-d-first-sync-integration.test.ts`;
   - current `test/phase5-controller.test.ts` as the approved P1 fixture-modernization reference;
   - the current controller/executor constructor surfaces needed to understand required dependencies;
   - H-U4 evidence for the eight first-sync failures.

Do not run the full repository merely to rediscover the eight H-U4 failures before editing.

---

# 7. IMPLEMENTATION PROCEDURE

Modify only:

`test/phase5-group-d-first-sync-integration.test.ts`

After the correction is committed/pushed on `phase6-sync-integration-h`, record the resulting SHA as:

`H_U5_P3_CANDIDATE_SHA`

Then compare:

`H_U5_P3_ENTRY_HEAD...H_U5_P3_CANDIDATE_SHA`

Acceptance:

- exactly one changed file;
- that file is `test/phase5-group-d-first-sync-integration.test.ts`;
- no `src/**` changes;
- no other `test/**` changes;
- no planning/evidence changes in the implementation commit.

If the candidate delta is broader, correct the scope before verification.

---

# 8. EXECUTION ARCHITECTURE

Do not spend the turn building a local repository execution environment.

Use repository reads/writes for inspection and the bounded test-fixture change.

Use one disposable GitHub Actions proof branch for execution.

Do not modify the repository's persistent production CI workflow.

Do not use Replit, Codespaces, or another external execution environment.

Do not enter repeated workflow-repair loops.

If GitHub execution capability is unavailable, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

# 9. DISPOSABLE PROOF BRANCH

Create one disposable proof branch from exactly:

`H_U5_P3_CANDIDATE_SHA`

Preferred branch name:

`h-u5-p3-group-d-first-sync-proof-h05`

If that name exists, use a unique successor suffix. Never force-update or overwrite an existing branch.

On the disposable branch only, add:

`.github/workflows/h-u5-p3-group-d-first-sync-proof.yml`

The workflow must explicitly check out `H_U5_P3_CANDIDATE_SHA`, use Node 22, and use `persist-credentials: false`.

The proof workflow must not patch source/test files and must never be merged into `phase6-sync-integration-h`.

---

# 10. REQUIRED VERIFICATION

Run the following in one bounded proof workflow.

## A. Exact candidate / invariant preflight

Verify:

- `git rev-parse HEAD == H_U5_P3_CANDIDATE_SHA`;
- `src/contracts/**` tree = `0db68ced179825f929008b502335210260ca2ce3`;
- canonical `dev/evidence/_ca-output.md` blob = `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`;
- contract-freeze whole-file blob = `b675e0fc9776d03892a4309231b91a4bf0a84b93`;
- contract-freeze first-16,296-byte prefix hash = `fe527c76137b2cd578ef7050ee3444498b21a5e0`;
- tracked working tree clean.

Print Node/npm versions.

## B. Dependency and static gates

Run directly:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

`git diff --check H_U5_P3_ENTRY_HEAD...H_U5_P3_CANDIDATE_SHA`

All must return exit code `0`.

## C. Focused H-U5-P3 verification

Run exactly:

`node --test .test-build/test/phase5-group-d-first-sync-integration.test.js`

Capture the real process exit code.

Acceptance:

- exit code `0`;
- tests: `8`;
- pass: `8`;
- fail: `0`;
- cancelled: `0`;
- skipped: `0`;
- todo: `0`.

All eight original scenario assertions must remain present and pass.

## D. V1.3 / H critical-regression gate

Run:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Capture the real process exit code and totals.

Expected current surface if P3 does not disturb H/V1.3 behavior:

- tests: `82`;
- pass: `69`;
- fail: `13`;
- cancelled: `0`;
- skipped: `0`;
- todo: `0`;
- exit code: `1` because the 13 already-classified G-owned adversarial-model failures remain.

Acceptance for P3:

- all 17 V1.3 foundation tests remain PASS, including C15/C16;
- all H integration markers H-I1 through H-I8 remain PASS;
- the only failures in this command are the same 13 G-owned adversarial-model failures;
- no new non-G failure appears.

Do not repair G.
Do not weaken or remove G discovery.

## E. Whole-repository measurement

Run:

`npm test`

directly, with no `tee` or pipeline that can mask the real process exit code.

Capture immediately:

- real numeric npm exit code;
- tests;
- pass;
- fail;
- cancelled;
- skipped;
- todo.

The authoritative P3 acceptance condition is not a manufactured green full suite. Known classified failures remain.

Required semantic checks:

- none of the eight authorized first-sync tests remains failed or cancelled;
- no new failure is introduced by P3;
- the 13 G-owned failures remain untouched;
- remaining obsolete-fixture families remain outside this unit.

Bookkeeping expectation only, assuming no unrelated branch drift since the verified P2/provenance closure: the full suite should improve by exactly eight passing results relative to the current post-restoration state. If aggregate totals differ materially from that expected eight-result improvement, do not broaden the repair; record the exact discrepancy and stop for supervisor review.

## F. Build / package gate

Run:

`npm run build`

Require exit code `0` and capture the existing build-verifier outputs.

## G. Final invariant recheck

After execution, verify again:

- HEAD is still `H_U5_P3_CANDIDATE_SHA`;
- tracked source/test working tree is clean;
- `src/contracts/**` tree remains `0db68ced179825f929008b502335210260ca2ce3`;
- canonical evidence blob remains `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`;
- contract-freeze whole-file blob and immutable predecessor prefix remain exact.

Upload proof logs, exit-code records, totals, and invariant results as one GitHub Actions artifact.

---

# 11. NO REPAIR SPIN

This is one causal fixture package.

Do not convert it into the entire remaining Group-D modernization wave.

If the disposable workflow has one bounded mechanical defect that prevents the intended commands from running, correct only that disposable workflow and rerun once.

If verification reveals a semantic issue outside `test/phase5-group-d-first-sync-integration.test.ts`, stop and report it.

Do not begin a second repair cycle against another file merely because turn capacity remains.

---

# 12. EVIDENCE CLOSURE

After successful P3 verification, create/update only the successor H-05 evidence record:

`dev/evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-05.md`

Do not modify predecessor H-01, H-02, H-03, or H-04 evidence files.

Do not modify canonical:

`dev/evidence/_ca-output.md`

Record:

- agent identity;
- `H_U5_P3_ENTRY_HEAD`;
- `H_U5_P3_CANDIDATE_SHA`;
- classification `OBSOLETE-LEGACY-FIXTURE / OLF-PHYSICAL`;
- the one authorized file;
- the eight H-U4 test names;
- exact fixture modernization performed;
- explicit confirmation that production code was not changed;
- focused proof run ID/job ID and 8/8 result;
- typecheck/test-compile/diff/build results;
- H/V1.3 critical-regression totals and G-only qualification;
- whole-repository totals and real exit code;
- proof artifact ID/digest;
- frozen-contract result;
- contract-freeze prefix result;
- canonical-evidence result;
- PR #45 state;
- disposable proof-branch state;
- explicit statement that no other Group-D file, OLF-FAKE-AUTH family, G defect, H-U5-P4, or H-FINAL/H-U6 was started.

Commit/push only that H-05 evidence file after the verified candidate and record the resulting SHA as:

`H_U5_P3_EVIDENCE_SHA`

Then verify:

- `H_U5_P3_ENTRY_HEAD...H_U5_P3_CANDIDATE_SHA` = only `test/phase5-group-d-first-sync-integration.test.ts`;
- `H_U5_P3_CANDIDATE_SHA...H_U5_P3_EVIDENCE_SHA` = only the H-05 evidence file;
- frozen contracts unchanged;
- canonical evidence unchanged;
- contract-freeze predecessor prefix unchanged;
- PR #45 remains OPEN / DRAFT / UNMERGED.

---

# 13. REMAINING WORK IS NOT AUTHORIZED IN P3

After this package, do not repair any other known family in the same turn.

Remaining classified work includes, at minimum:

## Other `OLF-PHYSICAL` fixtures

- `test/phase5-group-d-acceptance.test.ts`;
- `test/phase5-group-d-active-run-integration.test.ts`;
- `test/phase5-group-d-conflict-destruction-integration.test.ts`;
- `test/phase5-group-d-recovery-coordination-integration.test.ts`;
- `test/phase5-group-d-surface-lifecycle-integration.test.ts`;
- `test/phase6-alpha-plan-errors-stability.test.ts`.

## `OLF-FAKE-AUTH`

The previously classified fake-authority fixture family remains separate and is not authorized here.

## G worker defects

All 13 G-owned adversarial-model failures remain worker-owned and are not authorized here.

A later supervisor task will select the next causal package.

---

# 14. HARD BOUNDARIES

Do not:

- restart H-U4;
- redo H-U5-P1 or P2;
- modify production `src/**`;
- modify `src/contracts/**`;
- modify the contract-freeze document;
- modify canonical `dev/evidence/_ca-output.md`;
- modify any test other than `test/phase5-group-d-first-sync-integration.test.ts` in the implementation candidate;
- modify predecessor H evidence;
- modify worker branches;
- modify `phase6-integration`, `main`, or `master`;
- merge PR #45;
- merge the disposable proof branch;
- repair G;
- repair OLF-FAKE-AUTH;
- repair another Group-D file;
- begin H-U5-P4;
- begin H-FINAL / H-U6;
- perform physical synchronization.

---

# 15. COMPLETION REPORT / HARD STOP

On completion report only:

1. `H_U5_P3_ENTRY_HEAD`;
2. `H_U5_P3_CANDIDATE_SHA`;
3. `H_U5_P3_EVIDENCE_SHA`;
4. implementation files changed;
5. exact fixture modernization summary;
6. focused proof run ID/job ID and 8/8 result;
7. V1.3/H regression result;
8. current full-suite real exit code and totals;
9. typecheck/test-compile/build/diff results;
10. proof artifact ID/digest;
11. frozen-contract result;
12. contract-freeze prefix result;
13. canonical-evidence result;
14. PR #45 state;
15. disposable proof-branch state;
16. explicit remaining classified families not touched.

Then end exactly:

`H-U5-P3 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P4 OR H-FINAL`

If the task cannot be completed without changing anything outside the one authorized test file:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

If turn capacity ends after a safe committed state:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U5-P3 NOT COMPLETE`
