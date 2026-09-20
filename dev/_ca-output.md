STATUS: BLOCKED

TASK: VH22/C09 Repository-Suite Blocker Repair 01
AGENT: agt-ca-p6-vh22-repository-suite-blocker-repair-01
REPAIR_INPUT_SHA: 5c33bb4e982fe2a211e48e3c082f2e01ce357368
IMPLEMENTATION_SHA_BEFORE_EVIDENCE_ONLY_COMMIT: 4ab5239532fce080f17f4129bc56e9b0b484347a
EXPECTED_BRANCH: phase6-vh22-repository-suite-blocker-repair-01
GITHUB_ACTIONS_USED: NO
PRODUCTION_SOURCE_MODIFIED: NO

BASE_GATE:
- origin/phase6-vh22-c09-scenario-correction-02 resolved exactly to 5c33bb4e982fe2a211e48e3c082f2e01ce357368.
- Accepted repository evidence at the repair input reports 993 tests, 989 pass, 4 fail, 0 cancelled, 0 skipped, 0 todo.
- Exact accepted failures: 477, 478, 641, 775.

ROOT_CAUSE_DISPOSITION:
- 477/478: TEST PORTABILITY DEFECT. Production DesktopExternalReferenceGuard intentionally uses node:path.resolve. The tests used node:path.join against "/vault", which omits the active Windows drive. Exact path expectations now use resolve; containment assertions remain exact and production containment semantics are unchanged.
- 641: TEST REPRESENTATION DEFECT. Canonical Git blob prefix hashes for all five predecessor artifacts equal the approved expected hashes. For src/contracts/common.ts, canonical Git bytes hash to 4048ceca9bd2a5022ededf7406a736360330572c, while CRLF checkout conversion reproduces the observed Windows failure hash 9621d55e03ea006f339792780716c1a95bdda01d. C15 now reads exact HEAD blob bytes through git show before hashing; it does not normalize text or change approved hashes.
- 775: TEST SOURCE-BOUNDARY DEFECT. Production exportDiagnosticBundleText still performs the required state authority, audit, and attention reads. The extraction regex was LF-only. Its boundary now accepts LF or CRLF while the substantive positive and negative wiring assertions remain unchanged.

IMPLEMENTATION_CHANGED_FILES:
- test/phase6-alpha-portable-collision.test.ts
- test/phase6-foundation-failure-provenance.test.ts
- test/phase6-log06-diagnostic-bundle-operator-surface.test.ts
- dev/scripts/verify-vh22-repository-suite-blocker-repair-01.ps1

PRODUCTION_SOURCE_CHANGE:
- None.

REQUIRED LOCAL VERIFICATION COMMANDS:
1. npm ci
2. npm run typecheck
3. npx tsc -p tsconfig.test.json
4. node --test .test-build/test/phase6-alpha-portable-collision.test.js .test-build/test/phase6-foundation-failure-provenance.test.js .test-build/test/phase6-log06-diagnostic-bundle-operator-surface.test.js
5. npm test
6. npm run build
7. npm run check
8. git diff --check 5c33bb4e982fe2a211e48e3c082f2e01ce357368...HEAD

VERIFICATION_STATUS:
- Required Windows PowerShell verification has not been executed in this agent environment because no PowerShell runtime is available.
- No Windows-specific failure exception allowlist is present in the repair verifier.
- The verifier requires raw complete-suite totals of exactly 993 tests / 993 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo.
- The verifier writes both required evidence files, commits evidence separately, and pushes only after the local verification result is known.

BLOCKER:
Required local Windows PowerShell verification must be executed before STATUS may become COMPLETE.
