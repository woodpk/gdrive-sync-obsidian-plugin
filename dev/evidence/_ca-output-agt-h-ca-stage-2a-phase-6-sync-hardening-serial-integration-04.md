# AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-04 — H-U5-P2 EVIDENCE

## Status

`BLOCKED — SUPERVISOR DECISION REQUIRED`

The authorized H-U5-P2 OLF-STATIC correction itself is implemented and focused-verified. Completion is blocked by a new non-G, non-P2 V1.3 foundation documentation-prefix regression observed during the required critical-regression command. No repair outside the authorized acceptance-map line was attempted.

## Identity / authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-04`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Writable branch: `phase6-sync-integration-h`
- Classification: `OBSOLETE-LEGACY-FIXTURE / OLF-STATIC`
- Approved pre-task authority: `ac6afd51b2eb23fd94cecaa7e502735e38e93d22`
- `H_U5_P2_ENTRY_HEAD`: `2c1b3ccbe6b4485e1461d9d740636feb057c5073`
- `H_U5_P2_CANDIDATE_SHA`: `4d1daea1f8551de496d29f1a56d489b4b9a813f9`
- Frozen V1.3 `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- PR: `#45`, required and observed state before evidence commit: OPEN / DRAFT / UNMERGED

## Entry inspection

Comparison `ac6afd51b2eb23fd94cecaa7e502735e38e93d22...2c1b3ccbe6b4485e1461d9d740636feb057c5073` showed two supervisor/planning-history commits and no `src/**` or `test/**` changes. The second planning commit included planning/evidence material such as `dev/planning-and-building/phase6-sync-contract-freeze.md`; no implementation or test source changed before H-U5-P2.

Entry invariants were confirmed:

- `src/contracts/**` tree = `0db68ced179825f929008b502335210260ca2ce3`.
- canonical `dev/evidence/_ca-output.md` blob = `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`.
- H-U4 evidence records `OLF-STATIC` for scenario 31.
- stale acceptance-map literal exactly matched the task statement.
- live scheduler test name exactly matched the task statement and was left unchanged.

## Exact correction

Implementation candidate changed only:

- `test/phase5-acceptance-map.test.ts`

Scenario 31 `testName` changed from:

`Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass`

to:

`Phase5 scenario 31 local-change debounce coalesces repeated events into one scheduler-owned automatic pass`

Comparison `2c1b3ccbe6b4485e1461d9d740636feb057c5073...4d1daea1f8551de496d29f1a56d489b4b9a813f9` contains exactly one changed file, with one deletion and one addition. No `src/**`, other `test/**`, tasking, or evidence file changed in the implementation commit.

## Disposable GitHub Actions proof

- Disposable branch: `h-u5-p2-olf-static-proof-h04`
- Disposable workflow path: `.github/workflows/h-u5-p2-olf-static-proof.yml`
- Workflow-only branch head: `59a604d1e613e200507691d1f27f58762bf3881d`
- Workflow explicitly checked out candidate: `4d1daea1f8551de496d29f1a56d489b4b9a813f9`
- Node: `v22.23.2`
- npm: `10.9.8`
- Run ID: `33883343463`
- Job ID: `101057052043`
- Job conclusion: `success` (measurement steps intentionally preserved raw nonzero test exit codes in evidence rather than masking them as green product tests)
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

## V1.3 / H critical-regression measurement

Command:

`node --test .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-h-sync-integration.test.js`

Observed:

- real exit code: `1`
- tests: `82`
- pass: `68`
- fail: `14`
- cancelled: `0`
- skipped: `0`
- todo: `0`

H integration markers H-I1 through H-I8 shown in the command output remained green. The consolidated H entrypoint also executed G-owned adversarial tests; 13 failures correspond to the already worker-owned G family and were not repaired.

One additional non-G failure was observed:

- test: `foundation v1.3 C15: predecessor approved contract/document bytes remain exact immutable prefixes`
- failure: `dev/planning-and-building/phase6-sync-contract-freeze.md predecessor prefix changed`
- expected prefix hash: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- actual prefix hash: `f7b569580d18219d08d73549f3c7459875c73211`

This failure is outside the authorized H-U5-P2 acceptance-map surface and was not caused by the P2 one-line test change. Repository history shows `dev/planning-and-building/phase6-sync-contract-freeze.md` was modified by the post-authority `planning documents upload` commit `2c1b3ccbe6b4485e1461d9d740636feb057c5073`. Per H-U5-P2 no-repair-spin and hard-boundary rules, no correction was attempted.

## Current whole-repository measurement

Command:

`npm test`

Observed real process result:

- exit code: `1`
- tests: `687`
- pass: `622`
- fail: `40`
- cancelled: `25`
- skipped: `0`
- todo: `0`

The scenario-31 OLF-STATIC failure is absent as independently proven by the focused passing command. Remaining non-pass results were not used as authorization for further repair.

## Build / package

`npm run build` exit code: `0`.

Build verifier output:

- `BUILD_VERIFY_ENTRYPOINT=PASS`
- `BUILD_VERIFY_SYNTAX=PASS`
- `BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS`
- `BUILD_VERIFY_MOBILE_EVALUATION=PASS`
- `BUILD_VERIFY_PACKAGE_SHAPE=PASS`
- `BUILD_ARTIFACT_SIZE=695580`
- `BUILD_ARTIFACT_SHA256=ddd155779545a002131c1db69d0179a2ea4c0d87dd7ff2cd219f35133bb38a23`

## Final proof invariants

After execution:

- HEAD remained exact candidate `4d1daea1f8551de496d29f1a56d489b4b9a813f9`.
- tracked working tree remained clean.
- `src/contracts/**` tree remained `0db68ced179825f929008b502335210260ca2ce3`.
- canonical evidence blob remained `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`.

## Boundaries preserved / remaining work not touched

Not modified or begun:

- production `src/**`;
- frozen V1.3 contracts;
- `test/phase5-scheduler-acceptance.test.ts`;
- any test other than `test/phase5-acceptance-map.test.ts` in the implementation candidate;
- canonical `dev/evidence/_ca-output.md`;
- predecessor H-01/H-02/H-03 evidence;
- remaining `OLF-PHYSICAL` Group-D fixture families;
- any `OLF-FAKE-AUTH` fixture family;
- G-owned `G-W1`, `G-W2`, or `G-W3` defects;
- H-U5-P3;
- H-FINAL;
- physical synchronization.

## Required supervisor disposition

The P2 OLF-STATIC correction is locally complete and focused-verified, but the required critical-regression measurement revealed a new non-G documentation-prefix failure outside this unit's repair authority. H-U5-P2 therefore does not claim completion and stops for supervisor decision rather than modifying `dev/planning-and-building/phase6-sync-contract-freeze.md` or its V1.3 foundation proof.
