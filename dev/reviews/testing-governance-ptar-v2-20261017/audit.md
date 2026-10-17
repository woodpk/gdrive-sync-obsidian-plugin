# Independent Testing Governance and Quality Alignment Audit

**Audit ID:** testing-governance-ptar-v2-20261017  
**Audit date:** 2026-10-17  
**Repository:** woodpk/gdrive-sync-obsidian-plugin  
**Audited branch:** master  
**Immutable source commit:** b1e2ebaee3077e34a4eefaf601ee8124078b7400  
**Immutable source tree:** 07e9eed7c911e99b82990de220675ea2308a40ba  
**Mode:** independent test-governance audit; read-only assessment; report-only publication; NO PHX-CI/test execution  
**Disposition:** CORRECTIVE WORK REQUIRED for future complete test-system acceptance. Existing historical verification and release decisions are unaffected.

## 1. Authority, method, and scope

Current originals read from Google Drive on 2026-10-17:
- PHX-CI Test Authoring Request — PTAR v2.0, document 16UzwNUhC-_0NyH48jIlTiNyWF4cwdHopvblBsFDoXrk.
- Agent-Led Software Engineering Operating Protocol, document 1cbJV1WIVkhIy86zZLkvw6Gkk-bKjSyLCWU9whlhfLRc.
- Agent-Led Software Product Construction Manual, document 1b5BJF216CxJozFbDjGcK25zlNzlO-Q-8QyGG5hp5u14.
- Repository-specific target-system specification, BVP subsystem specification, accepted DEC-338/DEC-341 and pertinent supersession entries in dev/authority/decision-register.yaml, dev/authority/governance/locks/testing-platform-boundary.yaml, workstream verification plans, scripts README and current-state record.

Directly inspected immutable Git tree and current build/test discovery, sample test contents across high-risk categories, production-facing model fakes, declarative scenarios, battery registries, execution scripts, workflow definitions, and future tasking. Source/test semantics were assessed without running code. Test-file inventory is tree-complete for the named SHA; line-by-line semantic inspection of all 169 individual test bodies was NOT performed, so absence of other test-quality defects is NOT established. No historical PHX-CI run results, frozen review reports, or archived tests were used to award compliance. An audit of master does not establish coverage for unmerged task branches.

Current active file inventory from the complete, untruncated 1,833-entry Git tree (1,559 blobs):
| Class | Count | Active location and disposition |
| --- | ---: | --- |
| Product automated test modules | 127 | test/**/*.test.ts; 99 direct children + 28 nested |
| BVP automated test modules | 42 | test-platform/test/*.test.ts |
| Declarative BVP scenarios | 84 | test-platform/scenarios/**; 68 S06/S07, 14 live, 2 top-level canaries |
| BVP core/adapter modules | 16 | test-platform/src/** (framework/support, not test cases) |
| Battery registry/runner/support files | 5 | test-platform/test/batteries/*.ts (non-.test modules) |
| Dedicated product test-support modules | 2 | test/support/dec339-inventory-idb-fixtures.ts and test/adversarial-model/support/model.ts |
| Additional shared product test fake | 1 | src/testing/fakes.ts |
| BVP PowerShell scripts | 2 | dev/scripts/Invoke-BVP-Battery.ps1 and Invoke-BVP-Deterministic-Battery.ps1; both deliberately fail closed |
| PHX-CI staging/deployment script | 1 | dev/scripts/Invoke-PHXCI-S09A-Deploy.ps1 |
| Workflow definitions | 3 | .github/workflows/*.yml |
| Current runner/config surfaces | 5 | package.json, tsconfig.test.json, test-platform/tsconfig.json, phx-ci.json, Taskfile.phx-ci.yml (plus Taskfile.yml include) |
| Canonical new-test root | 0 | tests/ does not exist at this baseline |
| Historical/retired trees | excluded | archive/** (528 source blobs), dev/test-results/** (historical run artifacts); not audited or modified |

The two pre-existing test roots are NOT automatically defective merely for preceding PTAR v2.0. The dedicated BVP root is governed by a frozen architectural boundary. Future new/substantively revised tests must follow the external testing-artifact standard unless a justified, documented native/project-specific exception is approved. Do not move or rewrite existing tests as an unapproved side effect of this audit.

## 2. Compliance matrix

| Applicable standard | State | Basis |
| --- | --- | --- |
| Preserve existing accepted tests and historical evidence | COMPLIANT | No changes or historical requalification; tree shows active vs archived boundaries |
| Current product test discovery is complete | NONCOMPLIANT | npm test selects top-level 99, not nested 28 modules |
| BVP root suite discovery is statically configured | COMPLIANT | package.json test:bvp-root includes all 42 direct-child BVP test modules; registry test checks inventory equality |
| Actual current-source test execution and test counts | NOT EVIDENCED | Not executed; historical PHX-CI evidence intentionally excluded |
| PHX-CI is exclusive verification execution authority | NONCOMPLIANT | Active GitHub Actions validation workflows persist |
| PHX-CI verification-context authenticity | NONCOMPLIANT | Repository check accepts caller-controlled context/flags for development observation |
| Exact canonical dev-root policy enforcement | NONCOMPLIANT | Repository check permits noncanonical dev/_ca-output.json |
| Test category/native-exception/discovery mapping in whole-project verification plan | NONCOMPLIANT | Required roots, exceptions, category-to-PHX-CI runner discovery, and excluded tiers are missing |
| Required future PTAR v2.0 lifecycle and isolated Git handoffs | NONCOMPLIANT | No PTAR reference in external-authority index; active prompts/plans do not define complete six-role gating and immutable authoring handoffs |
| Requirements and observable behavior in BVP declarative scenarios | COMPLIANT for inspected examples | Scenario traceability and concrete hash/plan/state assertions, negative controls, and BVP tests directly inspected |
| Complete requirement-to-individual-test traceability | NOT EVIDENCED | High-level family/workstream tables and Phase5 test-name map do not fully establish it |
| Comprehensive deterministic/assertion/mocks/concurrency quality across every active test | NOT EVIDENCED | High-risk representative tests inspected; no full line-by-line quality audit of all 169 modules or executable fault injection |
| Physical Windows/iOS S09 test execution | NOT EVIDENCED | Current dev/scripts/README.md explicitly marks PHX-CI-owned live battery execution BLOCKED; no physical PASS is claimed |
| Legacy battery PowerShell prohibition | COMPLIANT | Both dev/scripts/Invoke-BVP-*.ps1 sentinels unconditionally throw rather than independently validate |
| Blind Phase 0 independence | NOT APPLICABLE | This is a governance audit, not PTAR Phase 0 |

## 3. Prioritized findings

### TG-01 — MAJOR — 28 active nested product test modules excluded from standard test selection
**Confirmed by source/configuration.** package.json lines 7–10 selects compiled .test-build/test/*.test.js. tsconfig.test.json lines 12–13 compiles test/**/*.ts, but shell top-level wildcard does not select compiled nested directories. The Git tree contains 99 root and 28 nested product test modules, including test/adversarial-model/adversarial-model.test.ts and test/workstreams/{drive,integration,local,merge,orchestration,state}/**/*.test.ts. The existing Node command selects only the 99 direct-child test modules, irrespective of successful TypeScript compilation. This does not prove that PHX-CI has never individually selected the nested modules; it proves that the current default product test command omits them.

**Authority:** Operating Protocol §6A and §§21.1–22; Construction Manual Repository Testing Artifact Standard (native discovery and complete suite selection).  
**Consequence:** A green default product test stage cannot establish that important nested crash/authority/orchestration/adversarial regressions ran.  
**Correction:** An independently authorized test-discovery/config owner must make the PHX-CI-consumed product suite recursively select all 127 active modules, explicitly prevent zero-test/partial selection, and update discovery documentation. The independent PHX-CI executor later confirms actual execution counts. No off-PHX-CI run or unapproved path migration.  
**Owner/authorization:** Independent Test Author for test-owned discovery and check logic; supervisor/PHX-CI maintainer for frozen consumer integration; separate authorization required.

### TG-02 — MAJOR — GitHub Actions workflows remain configured as verification/deployment mechanisms
**Confirmed by source/configuration, not by claimed runs.** .github/workflows/phase1-ci.yml lines 1–52 triggers on push/PR to master and directly runs npm typecheck, npm test, npm build, and may push lockfile changes. .github/workflows/phase6-alpha-diagnostic-ci.yml lines 1–76 runs non-PHX-CI test/build/check/evidence steps against phase6-integration. .github/workflows/azure-static-web-apps-witty-water-08743b310.yml lines 1–70 runs an Actions-hosted deployment job on phase6-integration events. The phase6-integration branch still exists. The repository's accepted DEC-338 prohibits GitHub Actions for BVP verification; the current operating protocol prohibits GitHub Actions as a software-validation authority. No workflow execution was inspected or claimed.

**Consequence:** Repository state still exposes forbidden, independently runnable CI-like checks and a GitHub-Actions-mediated deployment path.  
**Correction:** Authorized repo/governance owners disable or retire active workflow triggers without relying on Actions; preserve Git history and assess Azure callback deployment ownership separately, outside the testing-author scope. Keep all executable verification under PHX-CI and PHX-CI-only dev/scripts launchers.  
**Owner/authorization:** Repository supervisor, PHX-CI/CI-integration owner, and deployment owner for Azure; explicit authorization required before workflow or deployment-control changes.

### TG-03 — MAJOR — Developer-controlled flags/context can change artifact acceptance policy
**Confirmed by current implementation and accepted DEC-341 deferral.** test-platform/src/repository-check.ts lines 8–16, 91–106, 124–173, and 181–190. BVP_CHANGE_CLASS, BRAIN_ARTIFACT_PURPOSE, and PHX_VERIFICATION_CONTEXT_PATH are process-controlled; the JSON reader validates syntax, SHA shape and changedPaths shape but does not authenticate context provenance or bind it to the invoker's verified Git source/runtime. With 'development' and 'authorized-governance' supplied, inspectShippingArtifactIdentity returns no mismatch for any newly observed hash. At lines 201–240, the result can be printed with 'context=authoritative'. No isolated tester may treat this check alone as validated provenance or release approval.

**Authority:** Operating Protocol §§5.1, 21.1–22; DEC-338, DEC-340, DEC-341. DEC-341 expressly records the risk as unfixed and accepts only a bounded historical software-only promotion exception.  
**Consequence:** A fabricated development observation may appear PASS despite unauthenticated classification/context; source/runtime promotion trust is ambiguous.  
**Correction:** Supervisor-owned guarded repository-check/PHX-CI integration must authenticate exact context origin, immutable source/base identity, authorized development classification and fail-closed promotion boundary without changing approved release hashes. Add independent negative tests for forged context, wrong source/base, wrong authorization/class and valid trusted PHX-CI context.  
**Owner/authorization:** Frozen repository-check/PHX-CI authority owner; separate authorized security/governance repair, with independent Test Author ownership of regression tests. Not repaired during this audit.

### TG-04 — MODERATE — Canonical dev-root checker accepts a prohibited extra root file
**Confirmed.** test-platform/src/repository-check.ts lines 64–79: the allowed-file condition explicitly tolerates dev/_ca-output.json. Current Construction Manual and DEC-337 permit only dev/README.md and dev/_ca-output.md as ordinary dev-root files. That extra file is not present in the audited baseline, but the current guard can incorrectly accept it.

**Consequence:** Future invalid dev-root state may be classified compliant, undermining governance-gate precision.  
**Correction:** Remove the compatibility alias from the supervisor-owned guard and add one PHX-CI-consumed negative fixture/test proving the rejected file fails while the compliant baseline remains valid.  
**Owner/authorization:** Frozen architecture/repository-check owner plus independent Test Author for regression; separate authorized correction.

### TG-05 — MODERATE — Incomplete executable test discovery and category traceability specification
**Confirmed documentary gap.** dev/planning/03-verification/verification-plan.md lines 1–86 maps requirement families to workstreams/evidence types but does not enumerate 'test/' and 'test-platform/test/' discovery roots, recursive vs nonrecursive selection, canonical new tests/<category> placement, documented BVP exception, test-to-PHX-CI commands, intentionally excluded suites, or authoritative requirement-to-test coverage/discovery mechanics. WS-01 through WS-07 04-VERIFICATION-PLAN.md define capabilities but not a consistent PTAR authoring/discovery handoff mapping.

**Authority:** Construction Manual Repository Testing Artifact Standard; Operating Protocol §6A; PTAR v2.0 §§7, 9–10.  
**Consequence:** Valid test files may be omitted from PHX-CI selection and newly authored tests may be placed into incompatible roots without an explicit governance decision.  
**Correction:** Update whole-project and affected workstream plans with every active root and its exact runner/PHX-CI mapping; classify source tests as unit/integration/contract/architecture/adversarial/e2e by intent without forced relocation; record the already-frozen BVP root as an explicit exception requiring an authority reconciliation for future new tests. Record expected selected-module counts and proof that the executor, not author, establishes execution.  
**Owner/authorization:** Testing supervisor for plan amendments; user/supervisor authority if a new exception changes governing placement policy.

### TG-06 — MODERATE — PTAR v2.0 is not anchored or enforced in future test-authoring guidance
**Confirmed documentary gap.** dev/authority/external-authorities.md lines 1–20 links the Operating Protocol and Construction Manual but does not name PTAR v2.0. AGENTS.md lines 1–33 correctly requires a freshly read protocol before code for validation scripts and rejects legacy bespoke verifiers, but does not specify six-way role separation or the PTAR test branch/commit handoff. The WS-07 S09 task plans remain PREPLANNED/NOT-YET-EXECUTABLE and require rebinding, but their current text does not itself supply full PTAR lifecycle gates.

**Authority:** PTAR v2.0 §§1–10; Operating Protocol §§2, 6A and 8.  
**Consequence:** Later independent test requests may omit the pre-build branch/commit, fresh blind review and hard stop, separately authorized post-build authoring, distinct PHX-CI executor, or separate acceptance gate.  
**Correction:** Add exact PTAR v2.0 external-authority reference, update future test-request and handoff guidance in existing canonical planning/task locations to require mode/role, neutral blind-review inputs, immutable base/source/commit/tree, allowed paths, coverage/discovery matrix, GitHub read-back, PHX-CI-only execution and separate acceptance. Clarify AGENTS.md's conditional 'supplementary' tool sentence against the current absolute PHX-CI-only rule; owner-locked file requires explicit owner authorization before editing. Never create a new top-level dev/ prompts directory or mandate ZIP handoffs.  
**Owner/authorization:** Testing supervisor for planning; repository authority/owner for AGENTS.md or material policy alteration.

### TG-07 — MINOR — Acceptance mapping uses file-text containment as an evidence claim
**Confirmed limitation, not evidence of any missing test.** test/phase5-acceptance-map.test.ts lines 66–75 asserts 50 scenario rows and that the named test title is included in source text via source.includes(row.testName). A comment, string literal, non-discovered test, or skipped test could satisfy that substring assertion without executing a corresponding test. This is a useful mapping linter, not executable scenario coverage proof.

**Authority:** PTAR v2.0 test discovery/execution separation; Operating Protocol §22.  
**Consequence:** 'source-verified executable evidence' wording overstates what a string inclusion check proves.  
**Correction:** Label the map as static source traceability and establish separately through PHX-CI test discovery/results that the referenced cases execute on the exact candidate. Strengthen map checks if authorized, without weakening existing tests.  
**Owner/authorization:** Independent Test Author for any test edits; supervisor for documentation; separate authorization for test changes.

## 4. Substantive quality observations and limits

Good practices directly present in inspected active files: BVP tests use real production-path deterministic scenarios, concrete plan/identity/hash assertions, negative expectation inversion, and fail-closed missing-observation checks (test-platform/test/s06a-initialization-one-sided.test.ts, test-platform/test/s07b-state-cursor-listing-root-recovery.test.ts). Crash/restart test test-platform/test/s07a-crash-commit-ambiguity.test.ts explicitly compares the same remote object ID before, after recovery, and after a second restart; the scenario's last observation is not an unasserted gap when considered with this test. Live battery registry tests enforce registered scenario coverage and bound checkpoints; 42 BVP automated modules appear in the root suite and deterministic registry.

Important evidence qualifications: test/adversarial-model/adversarial-model.test.ts operates substantially through its own AdversarialSyncModel in test/adversarial-model/support/model.ts, not the whole production synchronization engine. Model proof is useful for abstract invariants but cannot stand alone as end-to-end production verification. Tests using src/testing/fakes.ts or stubbed provider boundaries likewise require complementary integration/physical proof for provider behavior. The existing plans recognize physical Windows/iOS proof as distinct. No specific mock-concealed production failure was established by this static audit.

No duplicate or orphaned test was confirmed from examined registries, but a repository-wide assertion-level duplicate/orphan check and quantitative coverage for every one of the 169 bodies were not established. Do not infer 'fully compliant' from this limitation; do not rewrite sound historical tests speculatively.

## 5. Correction topology and authorization

| Order | Work | Ownership | Gate |
| --- | --- | --- | --- |
| 1 | Resolve F01 selected-test omission; freeze category/discovery contract F05 | Independent Test Author for test-owned discovery, supervisor for plan/frozen PHX-CI wiring | Separate test-authorship/config authorization; PHX-CI-only executor later demonstrates all 127 |
| 2 | Close F03 context-authenticity and F04 dev-root guard holes | Supervisor-authorized repository-check/PHX-CI integration maintainer; distinct Test Author for negative batteries | Freeze trusted context contract first, then tests, PHX-CI reverification and independent acceptance |
| 3 | Retire F02 prohibited workflows and obtain deployment owner direction for Azure Actions | Repository/CI owner, deployment owner | Separate authorization; do not activate or deploy |
| 4 | Complete F05/F06 future authoring maps and PTAR guidance | Independent Testing Supervisor; owner for owner-locked governance edits | Document-only correction plan subject to approval, no retrospective test rewriting |
| 5 | Address F07 traceability label/coverage evidence | Supervisor documentation owner, Test Author only if check logic changes | After discovery selection is correct |
| 6 | Acceptance closure | Distinct Independent PHX-CI Test Execution Agent, then distinct Acceptance Reviewer | Exact integrated candidate, PHX-CI evidence; no inference from this audit |

These are proposals, not implemented fixes. Test source, tests/fixtures/check logic, production software, frozen architecture, PHX-CI and historical run evidence remain unmodified. Preserve independent role ownership and branch isolation. This audit author must not become the executor or independent final acceptance reviewer of repairs made to satisfy its own findings.

## 6. Future enforcement checklist

For each new or substantially changed test request:
1. Identify build unit, source/base SHAs, normative requirement IDs/invariants, permitted test-owned paths, category/exception and expected PHX-CI discovery tier.
2. Assign distinct pre-build test author before production code, and separately identify fresh blind post-build reviewer, post-build test author, PHX-CI executor, and final acceptance reviewer. A blind reviewer receives ONLY neutral PTAR Phase-0 inputs and must hard-stop after frozen review-only Git publication.
3. Author concrete positive/negative/boundary/race/restart/recovery/failure tests proportional to the contract; require independent assertions and objective observations, not tautological or implementation-winner expectations.
4. Require actual test+fixture Git commits with immutable commit/tree identity, full changed-path manifest, source/base identity, requirement-to-test map, category mapping, PHX-CI discovery map, and connector readback. ZIPs or chat transcripts are not canonical delivery.
5. Keep new tests in tests/<category> unless an explicit documented approved native/project exception applies. Respect frozen test-platform boundaries without unapproved rewrites of historical tests.
6. Distinct PHX-CI executor binds the exact combined source-and-tests candidate and proves test discovery/nonzero counts, test behavior, build, governance, and evidence identity; neither author nor supervisor may synthesize PASS.
7. Preserve original tests and immutable evidence; route product defects only to coder, test defects only to Test Author, PHX-CI defects to framework/authorized check owner, and accepted final review to a separate agent.

## 7. Completion determination

**REQUIRES CORRECTIVE WORK BEFORE FURTHER COMPLETE TEST-SYSTEM ACCEPTANCE.** Findings TG-01 through TG-03 materially affect discovery and verification authority; TG-04 through TG-07 affect precision and future controls. This finding is not a retroactive invalidation of any prior genuine PHX-CI result, prior owner software-only promotion, or historical evidence. No new software validation, live operation, installation, release, branch merge, or remediation was performed. This audit ends at report-only publication and stops pending separate corrective authorization.
