# TG-01 / TG-07 — Independent Test Discovery and Traceability Repair

**Status:** AUTHORIZED IN PRINCIPLE BY OWNER 2026-10-17; PENDING DISTINCT TEST-AUTHOR ASSIGNMENT; NOT EXECUTED  
**Repository:** woodpk/gdrive-sync-obsidian-plugin  
**Audit reference:** dev/reviews/testing-governance-ptar-v2-20261017/audit.md (review-only branch)  
**Original source baseline:** b1e2ebaee3077e34a4eefaf601ee8124078b7400  
**Supervisor planning branch:** repair/testing-governance-ptar-v2-20261017; rebind exact latest combined source SHA and approved writable-path allowlist before dispatch.  
**Target findings:** TG-01 (MAJOR) and TG-07 (MINOR).

## Contract and ownership
Independent Test Author owns test assertions, fixtures and test-specific discovery/check logic. The owning PHX-CI consumer/configuration maintainer coordinates package.json and approved runner wiring where it falls outside test-owned paths. Neither role edits production implementation or accepts their own tests. A separate PHX-CI executor is required; there is no legitimate direct `npm test` validation.

## Confirmed existing issue
`tsconfig.test.json` compiles `test/**/*.ts`, but `package.json` defines `npm test` as `node --test .test-build/test/*.test.js`. At b1e2ebaee3077e34a4eefaf601ee8124078b7400, 99 top-level `test/*.test.ts` modules are selected; the additional 28 nested modules under `test/adversarial-model/` and `test/workstreams/**` are omitted from that command. The existing `test-platform/test` default command selects 42 direct-child automated test modules. This is static discovery evidence, not a run result.

## Required corrected state
1. A PHX-CI-consumed product suite selects **all 127 existing active modules** at the frozen pre-change baseline, plus any subsequently approved additions. New `tests/<category>` files are included by compiler and PHX-CI runner selection as applicable. Avoid module duplicates, hidden skip patterns, zero-case false PASS, and shell-specific recursive glob assumptions.
2. A distinctly authored PHX-CI-consumed regression check enforces complete module selection/discovery and fails on a deliberately newly introduced nested test and an intentionally unselected module. It must not become a standalone validation authority.
3. Preserve existing 127 modules, 42 BVP modules, 84 scenario source definitions and all previously accepted assertions; no wholesale taxonomy migration.
4. `test/phase5-acceptance-map.test.ts` must accurately distinguish static source-string mapping from executed test proof. Improve independent test-owned checks only if justified; prove actual mapped-case discovery/execution through PHX-CI rather than static title string inclusion.
5. Update the whole-project/workstream verification plan exact selection expectations, counts, category mapping, and intentional exclusions if changes alter them.
6. Submit immutable independent test-author Git commit/tree SHA, base/source identity, path manifest, requirement-to-test map, observed static discovery configuration and expected PHX-CI gate. Config maintainer changes must be separately attributed. No PASS until separate executor reports original PHX-CI run and canonical evidence.

## Authorization boundary
Allowed candidate surfaces only after separate owner/supervisor rebind: `test/**/*.test.ts`, `tests/<category>/**` as approved, BVP test-owned `test-platform/test/**` if justified, `tsconfig.test.json`, test-specific `package.json` command and bounded required test-owned documentation. Changes to `phx-ci.json`, `Taskfile.phx-ci.yml`, `test-platform/src/repository-check.ts`, production `src/**`, governance locks or frozen artifact hashes are **NOT** implicitly authorized. A change outside this list must be separately assigned to the correct owner.

## Final stop
Do not run tests, PHX-CI, GitHub Actions or live Obsidian. Do not merge or declare acceptance. Submit exact independent commit/tree and handoff to supervisor; distinct PHX-CI executor then validates the exact integrated candidate.

## Setup-exception implementation update — 2026-10-17

Owner explicitly authorized the testing supervisor to implement the test-owned corrections directly as a setup-only exception (see `dev/authority/reconciliations/testing-governance-setup-exception-2026-10-17.md`).

**Source authored on `repair/testing-governance-ptar-v2-20261017`**: `package.json` now uses the documented Node 22 quoted recursive test globs for legacy and canonical roots; `tsconfig.test.json` compiles both `test/**` and `tests/**`; `tests/architecture/test-discovery.test.ts` checks compiled-module completeness plus negative omitted/duplicate selection; `test/phase5-acceptance-map.test.ts` now parses real TypeScript `test("...")` calls rather than merely searching source text. These are **supervisor-authored under exception**, not normal independent author provenance. Actual PHX-CI discovery and outcomes **NOT VERIFIED**.

Remaining task is distinct PHX-CI-only source/test verification at exact integrated identity when the verification trust blocker is resolved. Do not re-author or rewrite currently valid tests merely to satisfy the original work-order wording.
