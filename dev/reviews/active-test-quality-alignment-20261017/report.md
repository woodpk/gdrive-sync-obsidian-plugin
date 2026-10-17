# Active Test Quality / Governance Audit — 2026-10-17

Repository: woodpk/gdrive-sync-obsidian-plugin
Active branch: fix/s09-g104-g105-pairing-namespace-atomic-persistence-20261015
Audited commit: 3907b966c71a124d766c27933a6120b1e870589c
Audited tree: e91e33f43111a1b5fdc7e2d604501a8f8abd26fd
Scope: active and future-facing test artifacts only. Static review; NOT PTAR blind Phase 0, PHX-CI execution, production review, or historical-evidence reassessment.
Verdict: CORRECTION REQUIRED before next normal PHX-CI verification.

## Authorities
- PTAR v2.0: https://docs.google.com/document/d/16UzwNUhC-_0NyH48jIlTiNyWF4cwdHopvblBsFDoXrk
- Operating Protocol: https://docs.google.com/document/d/1cbJV1WIVkhIy86zZLkvw6Gkk-bKjSyLCWU9whlhfLRc
- Development Manual: https://docs.google.com/document/d/1b5BJF216CxJozFbDjGcK25zlNzlO-Q-8QyGG5hp5u14
- Local boundary: dev/authority/governance/locks/testing-platform-boundary.yaml; active planning, state, test discovery, and S09 tasking.

## Inventory and methodology
Nontruncated Git tree: 1,628 blob paths. All 131 product test-owned TypeScript files inspected with static test/assertion indicators and exhaustive side-effect-import target scan; 129 *.test.ts plus two helpers. Categories: unit 61; integration 46; contracts 8; architecture 5; adversarial 9; fixtures 1; support 1. No old test/ files.
Frozen BVP: test-platform/test/ has 42 *.test.ts plus five battery helper files; 84 declarative scenarios under test-platform/scenarios/ (14 live), with representative scenario content inspected. test-platform/src/ remains separate platform infrastructure. src/testing/ is production-owned.
Active discovery: package.json npm test compiles tsconfig.test.json then uses node --test on .test-build/tests/**/*.test.js. The test-platform suite has separate test-platform/tsconfig.json and npm run test:bvp-root discovery. The mere presence of these commands does not prove successful execution.
No TypeScript compilation, test runs, PHX-CI, physical checks, test modification, or historical-evidence rewrites.

## Compliance matrix
| Control | Finding |
| --- | --- |
| Canonical test categories; frozen BVP root | STRUCTURALLY COMPLIANT |
| Product test import closure / compile readiness | NONCOMPLIANT: F-01 CRITICAL |
| PTAR separation of independent authorship and test execution | NONCOMPLIANT: F-02 MAJOR |
| Whole-project and workstream test category / PHX-CI mapping | NONCOMPLIANT: F-03 MAJOR |
| Explicit PTAR v2.0 external-authority index | NONCOMPLIANT: F-04 MODERATE |
| Determinism in timing-sensitive tests | RISK / NOT CONFIRMED: F-05 MINOR |
| Role provenance of six modified and two new current-branch tests | NOT EVIDENCED; cannot infer a historical violation |
| Actual test execution/discovery on audited commit | NOT EVIDENCED; deliberately not executed |
| Historical accepted evidence | EXCLUDED; preserved |

## F-01 CRITICAL — 27 broken side-effect imports in nine active files (CONFIRMED)
Cause: the canonical-path migration adjusted many ordinary imports but omitted bare side-effect import declarations. Every path below targets a non-existent relative location; tsconfig.test.json includes these files, so compilation is expected to fail (compiler not actually run).
| File | Bad lines | Broken | Intended location |
| --- | --- | ---: | --- |
| tests/adversarial/phase6-b-destructive-safety.test.ts | 1-5 | 5 | tests/integration/orchestration/ |
| tests/integration/phase6-h-sync-integration.test.ts | 1-3 | 3 | tests/integration/integration/ (2), tests/adversarial/ (1) |
| tests/integration/phase6-h-u2-affected-regression.test.ts | 1-3 | 3 | tests/unit/state/ (1), tests/integration/orchestration/ (2) |
| tests/integration/phase6-h-u3-dc13-affected-regression.test.ts | 1 | 1 | tests/integration/orchestration/ |
| tests/unit/phase2-conflict.test.ts | 5 | 1 | tests/unit/merge/ |
| tests/unit/phase2-state-hardening.test.ts | 95-96 | 2 | tests/unit/state/ |
| tests/unit/phase3-drive.test.ts | 1 | 1 | tests/contracts/drive/ |
| tests/unit/phase6-a-local-hardening.test.ts | 7-9 | 3 | tests/unit/local/ |
| tests/unit/phase6-d-orchestration-v1.2.test.ts | 1-8 | 8 | tests/integration/orchestration/ |
Required: authorized independent Test Author corrects each import to its exact existing target on isolated branch and checks ordinary/bare/type/dynamic/filesystem references and duplicate umbrella registration; preserve test assertions and traceability. Supervisor integrates before a distinct executor's next normal PHX-CI run.

## F-02 MAJOR — test authorship/execution roles combined in live S09 request (CONFIRMED)
dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-g1-settings-lifecycle-phxci-test-writer-request.md lines 3 and 13-17 direct one Independent PHX-CI Test Writer to write tests (item 2) and run/publish PHX-CI (item 3). PTAR v2.0 sections 6-8 require a different Independent Test Execution Agent. Split task authorization and handoff; do not treat its prior-review-aware inspection as fresh blind Phase 0.

## F-03 MAJOR — missing required category-to-PHX-CI mapping (CONFIRMED)
dev/planning/03-verification/verification-plan.md lines 1-85 covers broad evidence but does not identify canonical product categories, the frozen BVP native exception and runner discovery, intentionally absent standalone E2E, or concrete requirements-to-test traceability approach. All seven dev/planning/02-workstreams/WS-*/04-VERIFICATION-PLAN.md files lack canonical category-to-runner mappings. Required by Development Manual Testing Artifact Standard and Operating Protocol section 6A. Planning owner must document actual category/PHX-CI selection, tsconfig/glob paths, traceability, exclusions and native exception.

## F-04 MODERATE — PTAR omitted from authority index (CONFIRMED)
dev/authority/external-authorities.md lines 1-19 lists Operating Protocol and Manual only; the Protocol identifies PTAR as a required linked shared authority. Governance owner add canonical PTAR v2.0 link and role. No assertion of prior invalid execution follows from this omission.

## F-05 MINOR — short wall-clock sleeps (PLAUSIBLE / UNPROVEN)
tests/integration/phase5-group-d-active-run-integration.test.ts lines 346 and 575 and phase5-group-d-first-sync-integration.test.ts lines 546 and 551 rely on 5-20ms scheduling delays. These are potential environment-sensitive waits; no flaky run has been demonstrated. Have test owner evaluate controlled event/clock synchronization only when the related risk or observed failure justifies it.

## Sequenced remediation and future enforcement
1. Independently authorized test owner repairs F-01 on test-only isolated branch; retains assertions, checks import closure and duplication, publishes exact SHA/tree/path and requirement/discovery mapping.
2. Supervisor/planning and governance owners address F-02/F-03/F-04 without modifying test assertions or retrospective evidence.
3. Supervisor integrates corrections on the active build line; freezes combined candidate source/test identity.
4. Distinct Independent Test Execution Agent uses pinned PHX-CI during next authorized normal verification, reports actual discovery, exit status, run ID and canonical evidence. No special redundant migration run.
5. All future PTAR requests enforce independent author/reviewer/executor roles, requirement-derived assertions, canonical categories, source identity, test import closure, deterministic fixtures, and PHX-CI discoverability with verifiable handoffs.
6. Any product defect returns to Coding Agent; separate acceptance reviewer assesses after genuine PHX-CI evidence.

Final result: NOT READY FOR EXECUTABLE VERIFICATION as written; static audit only. This report authorizes no test/code changes, merges, releases or independent validation.