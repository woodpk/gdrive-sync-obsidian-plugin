# AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-04 — H-U5-P2 EVIDENCE

## Status

`H-U5-P2 COMPLETE — READY FOR SUPERVISOR REVIEW`

The authorized H-U5-P2 OLF-STATIC correction is implemented and focused-verified. The initially observed non-P2 V1.3 documentation-prefix regression was subsequently resolved under explicit supervisor authorization by restoring only `dev/planning-and-building/phase6-sync-contract-freeze.md` to the approved H-authority blob while preserving its V1.3 append-only succession material. C15 was not modified.

## Identity / authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-04`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Writable branch: `phase6-sync-integration-h`
- Classification: `OBSOLETE-LEGACY-FIXTURE / OLF-STATIC`
- Approved pre-task authority: `ac6afd51b2eb23fd94cecaa7e502735e38e93d22`
- `H_U5_P2_ENTRY_HEAD`: `2c1b3ccbe6b4485e1461d9d740636feb057c5073`
- `H_U5_P2_CANDIDATE_SHA`: `4d1daea1f8551de496d29f1a56d489b4b9a813f9`
- Initial H-04 evidence/blocker SHA: `f7d76a9142d9e0575a55e29b78af1bc68feb3acb`
- Supervisor-authorized provenance correction SHA: `740d3338e10b3cdf36a92288f2f8d8c37ee26fe3`
- Frozen V1.3 `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- PR: `#45`, required state OPEN / DRAFT / UNMERGED

## Entry inspection

Comparison `ac6afd51b2eb23fd94cecaa7e502735e38e93d22...2c1b3ccbe6b4485e1461d9d740636feb057c5073` showed two supervisor/planning-history commits and no `src/**` or `test/**` changes. The second planning commit included planning/evidence material such as `dev/planning-and-building/phase6-sync-contract-freeze.md`; no implementation or test source changed before H-U5-P2.

Entry invariants were confirmed:

- `src/contracts/**` tree = `0db68ced179825f929008b502335210260ca2ce3`.
- canonical `dev/evidence/_ca-output.md` blob = `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`.
- H-U4 evidence records `OLF-STATIC` for scenario 31.
- stale acceptance-map literal exactly matched the task statement.
- live scheduler test name exactly matched the task statement and was left unchanged.

## Exact H-U5-P2 correction

Implementation candidate changed only:

- `test/phase5-acceptance-map.test.ts`

Scenario 31 `testName` changed from:

`Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass`

to:

`Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass`

Comparison `2c1b3ccbe6b4485e1461d9d740636feb057c5073...4d1daea1f8551de496d29f1a56d489b4b9a813f9` contains exactly one changed file, with one deletion and one addition. No `src/**`, other `test/**`, tasking, or evidence file changed in the implementation commit.

## Disposable H-U5-P2 GitHub Actions proof

- Disposable branch: `h-u5-p2-olf-static-proof-h04`
- Disposable workflow path: `.github/workflows/h-u5-p2-olf-static-proof.yml`
- Workflow-only branch head: `59a604d1e613e200507691d1f27f58762bf3881d`
- Workflow explicitly checked out candidate: `4d1daea1f8551de496d29f1a56d489b4b9a813f9`
- Node: `v22.23.2`
- npm: `10.9.8`
- Run ID: `33883343463`
- Job ID: `101057052043`
- Job conclusion: `success`
- Artifact ID: `9940787552`
- Artifact name: `h-u5-p2-olf-static-proof`
- Artifact digest: `sha256:b724f4391d24ff51d9098a53244d9e82b9524a77c00c9f89f06ca8e0ab9994da`
- Artifact size: `41639` bytes

## Static / dependency gates

All returned exit code `0`:

- `npm ci`
- `npm run typecheck`
- `npx tsc -p tsconfig.test.json`
- `git diff --check 2c1b3ccbe6b4485e1461d9d740636feb057c5073...4d1daea1f8551de496d29f1a56d489b4b9a813f9`

## Focused OLF-STATIC proof

Command:

`node --test .test-build/test/phase5-acceptance-map.test.js .test-build/test/phase5-scheduler-acceptance.test.js`

Observed:

- real exit code: `0`
- tests: `16`
- pass: `16`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- acceptance-map source-verification test: PASS
- live scenario-31 scheduler test with `scheduler-owned automatic pass` name: PASS

This proves the authorized OLF-STATIC stale-literal defect is removed without changing scheduler behavior or weakening exact source matching.

## Initial V1.3 / H critical-regression measurement and blocker

Initial command at P2 candidate:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Initial observed result:

- real exit code: `1`
- tests: `82`
- pass: `68`
- fail: `14`
- cancelled: `0`
- skipped: `0`
- todo: `0`

H integration markers remained green. Thirteen failures were the already worker-owned G family. The one additional non-G failure was:

- `foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes`
- `dev/planning-and-building/phase6-sync-contract-freeze.md predecessor prefix changed`
- expected prefix Git blob: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- actual prefix Git blob before restoration: `f7b569580d18219d08d73549f3c7459875c73211`

Repository history established that `dev/planning-and-building/phase6-sync-contract-freeze.md` had been reformatted/reflowed by post-authority commit `2c1b3ccbe6b4485e1461d9d740636feb057c5073`. H-U5-P2 stopped and requested supervisor disposition rather than modifying that file without authority.

## Supervisor-authorized planning-document provenance restoration

The supervisor explicitly authorized restoration of only:

- `dev/planning-and-building/phase6-sync-contract-freeze.md`

The supervisor explicitly prohibited updating C15 and retained P2 candidate `4d1daea1f8551de496d29f1a56d489b4b9a813f9` as accepted.

The restoration used the exact file blob already present at approved H authority `ac6afd51b2eb23fd94cecaa7e502735e38e93d22`:

- restored whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- restored immutable first-16,296-byte prefix Git blob: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- V1.3 append heading retained: `## 12. V1.3 APPEND-ONLY FAILURE-PROVENANCE SUCCESSION CANDIDATE`
- provenance correction commit: `740d3338e10b3cdf36a92288f2f8d8c37ee26fe3`

Comparison `f7d76a9142d9e0575a55e29b78af1bc68feb3acb...740d3338e10b3cdf36a92288f2f8d8c37ee26fe3` contains exactly one changed file: `dev/planning-and-building/phase6-sync-contract-freeze.md`.

No `src/**`, `src/contracts/**`, `test/**`, C15, other planning document, canonical evidence file, or predecessor H evidence file was changed by the restoration.

## Disposable provenance-restoration proof

Final successful proof used:

- disposable branch: `h-u5-p2-provenance-restoration-proof-h04`
- disposable workflow path: `.github/workflows/h-u5-p2-provenance-restoration-proof.yml`
- final workflow-only branch head: `7348150e1beb2e53f924019d42fcf04ccba80799`
- workflow explicitly checked out provenance correction SHA: `740d3338e10b3cdf36a92288f2f8d8c37ee26fe3`
- Node: `v22.23.2`
- npm: `10.9.8`
- successful run ID: `33889539367`
- job ID: `101077561943`
- job conclusion: `success`
- artifact ID: `9943250680`
- artifact name: `h-u5-p2-provenance-restoration-proof`
- artifact digest: `sha256:d34628067dc17938eb6e21eac6eaff2645b578d8826fb836b03599fbbbf6117d`
- artifact size: `7742` bytes

Two preceding disposable-workflow attempts terminated before test execution due mechanical preflight assertions only; neither altered the repository candidate. The final proof eliminated those workflow-only issues without changing source, tests, contracts, or the restored planning document.

Final proof preflight confirmed:

- exact checkout = `740d3338e10b3cdf36a92288f2f8d8c37ee26fe3`
- frozen contracts tree = `0db68ced179825f929008b502335210260ca2ce3`
- canonical evidence blob = `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- whole restored planning-document blob = `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- first 16,296-byte prefix Git blob = `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- V1.3 append heading present
- tracked working tree clean
- typecheck = exit `0`
- test compilation = exit `0`
- diff check = exit `0`

## Restored V1.3 foundation proof

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js`

Observed:

- real exit code: `0`
- tests: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- C15: PASS
- C16: PASS

This confirms the immutable predecessor prefix was restored without changing C15 and the approved V1.3 append-only succession remains valid.

## Restored H-U5-P2 V1.3 / H critical-regression gate

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Observed:

- real exit code: `1`
- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped: `0`
- todo: `0`

All V1.3 foundation tests passed. All H integration markers H-I1 through H-I8 present in the consolidated entrypoint passed. The remaining 13 failures are confined to the previously classified G-owned adversarial-model family and are outside H-U5-P2/provenance-restoration authority. No G repair was attempted and no G discovery was weakened or removed.

## Current whole-repository measurement retained from P2 proof

Command:

`npm test`

Observed real process result at P2 candidate:

- exit code: `1`
- tests: `687`
- pass: `622`
- fail: `40`
- cancelled: `25`
- skipped: `0`
- todo: `0`

The scenario-31 OLF-STATIC failure is absent as independently proven by the focused passing command. This full-suite measurement was not rerun for the separate planning-document provenance restoration because the supervisor specifically requested the V1.3 foundation proof followed by the H-U5-P2 critical-regression gate.

## Build / package retained from P2 proof

`npm run build` exit code: `0`.

Build verifier output:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `BUILD_ARTIFACT_SIZE=695580`
- `BUILD_ARTIFACT_SHA256=ddd155779545a002131c1db69d0179a2ea4c0d87dd7ff2cd219f35133bb38a23`

## Final invariants / boundaries preserved

Final provenance proof confirmed:

- exact checked-out restoration SHA remained `740d3338e10b3cdf36a92288f2f8d8c37ee26fe3` throughout execution;
- tracked working tree remained clean;
- `src/contracts/**` tree remained `0db68ced179825f929008b502335210260ca2ce3`;
- canonical evidence blob remained `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`;
- immutable planning-document prefix remained `fe527c76137b2cd578ef7050ee3444498b21a5e0`.

Not modified or begun:

- production `src/**`;
- frozen V1.3 contracts;
- C15 or any other test;
- `test/phase5-scheduler-acceptance.test.ts`;
- any P2 implementation test other than the accepted one-line scenario-31 correction;
- canonical `dev/evidence/_ca-output.md`;
- predecessor H-01/H-02/H-03 evidence;
- other planning documents during the provenance correction;
- remaining `OLF-PHYSICAL` Group-D fixture families;
- any `OLF-FAKE-AUTH` fixture family;
- G-owned `G-W1`, `G-W2`, or `G-W3` defects;
- H-U5-P3;
- H-FINAL;
- physical synchronization.

The initial blocked disposition is superseded by the supervisor-authorized restoration and successful verification recorded above.

`H-U5-P2 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-U5-P3 OR H-FINAL`
