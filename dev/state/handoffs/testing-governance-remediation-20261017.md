# Active Testing Governance Remediation — Supervisor Handoff

- **Date:** 2026-10-17.
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`.
- **Immutable assessed master source:** `b1e2ebaee3077e34a4eefaf601ee8124078b7400` (tree `07e9eed7c911e99b82990de220675ea2308a40ba`).
- **Original independent audit:** `audit/testing-governance-ptar-v2-20261017`, report-only final commit `10122d3968694a54f3004ad8c7e5cc990253f9fa`.
- **Active authorized supervisor remediation branch:** `repair/testing-governance-ptar-v2-20261017`.
- **Status:** PARTIAL, INDEPENDENT CORRECTIVE ASSIGNMENTS REQUIRED. This branch is **not accepted** and does not supersede `master` or historical accepted PHX-CI evidence.

## Applied on the isolated remediation branch (unverified; not promoted)

1. **TG-02 candidate correction:** deleted all three `.github/workflows/*.yml` GitHub Actions workflow files. This removes their triggers only from this branch; merging would also remove automatic Azure Static Web Apps callback deployment. `oauth-callback/**` and currently deployed service were not touched. WS-03 bounded deployment-owner handoff: `dev/planning/02-workstreams/WS-03-google-drive-and-oauth/tasks/tg02-azure-callback-non-actions-deployment.md`.
2. **TG-05 planning:** whole-project `dev/planning/03-verification/verification-plan.md` now inventories and explicitly maps existing 127 product test modules, 42 BVP test modules, 84 declarative scenarios, current compiler/runner roots, the 28-module exclusion, native/category exceptions, physically blocked S09 and required PHX-CI discovery proof. All seven workstream `04-VERIFICATION-PLAN.md` files now require category mapping and independent authoring/discovery handoff.
3. **TG-06 future enforcement:** added PTAR v2.0 to `dev/authority/external-authorities.md`; updated owner-locked `AGENTS.md` to remove misleading 'supplementary' validation exception and require distinct PTAR roles and Git persistence.
4. **TG-07 documentary part:** whole-project plan now explicitly distinguishes static Phase5 acceptance-title mapping from executed test evidence. No existing test source altered.

## Pending separated owners (not corrected)

| Finding | Status and next owner |
| --- | --- |
| TG-01 MAJOR: default product suite omits 28 active nested tests | **OPEN** — distinct Independent Test Author + authorized package/PHX-CI discovery owner. See `WS-07.../tasks/tg01-tg07-test-discovery-and-traceability-repair.md`. |
| TG-03 MAJOR: unauthenticated development observation context (DEC-341) | **OPEN** — frozen `test-platform/src/repository-check.ts` / PHX-CI maintainer plus separate independent negative tests. See `WS-07.../tasks/tg03-tg04-phxci-context-and-root-guard-repair.md`. |
| TG-04 MODERATE: prohibited `dev/_ca-output.json` allowed by root guard | **OPEN** — same frozen-surface maintainer and independent negative test author, separately attributed. |
| TG-07 MINOR: static title inclusion can overstate test evidence | **DOCUMENTARY DISTINCTION RECORDED; TEST OWNERSHIP REMAINS OPEN**. No fake execution claims or source test modification. |
| TG-02 deployment dependency | **OPEN BEFORE CALLBACK REDEPLOYMENT:** separate Azure callback non-Actions deployment method/owner authorization. Do not imply existing service stopped working. |

## Next dependency-safe sequence

1. Bind fresh exact branch/source/PHX-CI identities and authorize the independent Test Author to repair TG-01 and TG-07 test-owned surfaces. Leave production unmodified.
2. Authorize the frozen repository-check/PHX-CI maintainer to repair TG-03 and TG-04, paired with separately authored adversarial tests. Preserve accepted artifact SHA policy; do not infer validation from caller-supplied data.
3. Supervisor integrates separate immutable owner commits into one exact candidate without rewriting independent tests.
4. **Distinct Independent PHX-CI Test Execution Agent only** executes the combined candidate through PHX-CI; capture exact runtime/run/source/evidence identities and selection counts. No direct `npm`, PowerShell or GitHub Actions validation.
5. Separate Independent Acceptance Reviewer assesses original source and PHX-CI evidence; owner authorizes integration/promotion/deployment independently.

**No substantive validation or live deployment was executed during this session.** No production or test files were modified, no audit/historical evidence overwritten, no branch merged, no release/activation/Stage 3 authorized. Static GitHub readback/commit comparison is only repository persistence confirmation, not PHX-CI PASS.
