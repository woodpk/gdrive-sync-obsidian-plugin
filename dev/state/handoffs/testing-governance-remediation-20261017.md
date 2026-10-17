# Testing-Governance Setup Remediation — Current Supervisor Handoff

**Date:** 2026-10-17  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Original audited baseline:** `master` `b1e2ebaee3077e34a4eefaf601ee8124078b7400`, tree `07e9eed7c911e99b82990de220675ea2308a40ba`.  
**Frozen audit:** `audit/testing-governance-ptar-v2-20261017`, final report-only commit `10122d3968694a54f3004ad8c7e5cc990253f9fa`.  
**Current unmerged repair candidate:** `repair/testing-governance-ptar-v2-20261017`.  
**Exceptional owner authorization:** `dev/authority/reconciliations/testing-governance-setup-exception-2026-10-17.md`. Supervisor itself authored test/check changes during one-time setup; do **not** misrepresent normal independent Test Author provenance.  
**Status:** SOURCE CORRECTIONS COMMITTED; **NOT PHX-CI-VERIFIED / NOT ACCEPTED**. Existing historical evidence, production `src/**`, approved shipping SHA allowlist and master remained unchanged.

## Findings disposition (source/configuration only)

| Audit finding | Current candidate correction | Remaining limitation |
| --- | --- | --- |
| TG-01 MAJOR — 28 nested product tests omitted | `package.json` now uses Node 22 quoted recursive glob for both legacy and canonical roots; `tsconfig.test.json` compiles both; new `tests/architecture/test-discovery.test.ts` detects omitted/duplicate modules | Static selection intended for original 127 legacy + 1 new test module; actual PHX-CI discovery/execution not demonstrated |
| TG-02 MAJOR — three active Actions workflows | Removed all three `.github/workflows/*.yml`; `test-platform/src/repository-check.ts` rejects source-state workflow reintroduction; `Taskfile.phx-ci.yml` allows authorized removals without turning Actions into a validator | No PHX-CI repository check run; removing Azure Actions also removes automatic callback redeployment; existing deployed callback untouched |
| TG-03 MAJOR — forged development-context PASS | `test-platform/src/repository-check.ts` labels caller context unverified, records digest, but rejects a new unapproved development hash instead of allowing caller flags to yield PASS; adversarial context cases added | **OPERATIONAL BLOCKER:** authentic PHX-CI producer attestation contract absent; unapproved development artifact cannot be accepted. Do not claim fully operational or independently reviewed DEC-341 closure |
| TG-04 MODERATE — prohibited dev JSON accepted | `dev/_ca-output.json` special allowance removed from guard; negative test added | PHX-CI validation pending |
| TG-05 MODERATE — incomplete discovery/coverage documentation | Whole-project plan plus seven workstream plans updated with roots, category mapping, exception policy, test selection and PHX-CI-only evidence rules | Execution mapping must be reconciled with actual future run |
| TG-06 MODERATE — missing PTAR v2.0 enforcement | External-authority index and owner-locked `AGENTS.md` now bind PTAR and clarify PHX-CI exclusivity; setup exception explicitly recorded | Exception is one-time; normal author/reviewer/executor independence remains required for future accepted work |
| TG-07 MINOR — source-string inclusion mistaken for test evidence | `test/phase5-acceptance-map.test.ts` now parses actual literal TypeScript `test(...)` call registrations; negative comment-only fixture added; documentation distinguishes static mapping from execution | Actual mapped-case execution not demonstrated |

## Immediate next requirements

1. An authorized PHX-CI framework maintenance session must supply genuine producer-authenticated exact source/base/run context for development artifact observation, without relaxing release SHA approval. The consumer cannot authenticate arbitrary process environment variables or path-to-JSON by itself. Until then the stricter repository-check intentionally blocks unapproved development hashes.
2. Once source/run attestation is available, freeze the exact integrated candidate and use **PHX-CI exclusively** to demonstrate that all product + BVP suites actually ran and that source isolation, all regression negatives, workflow ban and developer/promoter hash gates pass. Record original run ID, framework/runtime SHA, source/tree SHA, evidence commit and terminal status.
3. Independently assess the candidate and owner-approve integration/deployment only after required gates. Azure callback redeployment requires a separate non-Actions mechanism. No release, live Drive/vault, S09 physical, merge or Stage 3 authorization is implied.

**This session made only GitHub repository edits and static source inspection.** No test, build, validator, PHX-CI, physical S09, installation, deployment or independent acceptance was executed. No historical run result was altered.