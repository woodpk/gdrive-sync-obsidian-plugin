# Verification Plan — Obsidian Local, Platform, and Configuration Boundary

## Objective completion evidence

- Automated tests cover all-file enumeration, empty directories, hidden files, exclusion symmetry, unknown extensions, symlink/junction refusal, unreadable paths, and file stability.
- Cross-platform path tests cover separator normalization, Unicode-equivalent names, case collisions, reserved/invalid names, and path-length preflight without silent overwrite/normalization.
- Atomic-replacement and local-disk-exhaustion tests prove valid existing content is preserved on failure.
- Local trash and rename/move tests preserve required recoverability and Obsidian semantics.
- Configuration tests prove unknown configuration is excluded by default and protected operational/auth/device state cannot synchronize.
- Mobile compatibility tests demonstrate that required local behavior does not depend on Node/Electron/Windows-only APIs.
- Lifecycle tests prove startup initialization does not generate unsafe synchronization and iOS interruption can be handed safely to later orchestration.
- Tests prove plugin disable/uninstall/device unlink does not delete shared or local content.
- Tests demonstrate no code path enumerates or mutates the separate Google Drive BRAIN asset repository as part of local-vault synchronization.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.


## Independent PTAR v2.0 authoring, discovery and role ownership (2026-10-17)

**Current candidate test families (not a case-by-case execution claim):** `test/obsidian-local-vault*.test.ts`, `test/mobile-safety.test.ts`, `test/local-*.test.ts`, `test/workstreams/local/*.test.ts` and path/config tests (unit/integration/contracts/adversarial intent). Existing `test/` files remain a legacy native TS source root; do not duplicate or migrate them automatically. Classify new tests by *what they prove* under `tests/<category>/` unless an explicitly authorized, documented architecture/toolchain exception applies. The BVP `test-platform/` root is a separately frozen architectural boundary and must not be moved or expanded as a general exception by an ordinary test author.

**Normative coverage to bind in each independent authoring request:** local path scope, exclusion symmetry, unsafe links, concurrency, persistence and disk failures, iOS/native boundary; installed-device checks remain distinct. Test cases require positive, negative/fail-closed, boundary, concurrency/retry/cancel, persistence/restart and integration expectations **where applicable**, from the target specification and accepted decisions rather than production's incidental implementation. Requirement-family ownership above does not substitute for individual requirement-to-test traceability or physical coverage where the authority requires it.

**Discovery and PHX-CI:** Before writing a new/substantially revised test, bind its exact compiled/discovered path and PHX-CI-consumed runner selection to the whole-project `dev/planning/03-verification/verification-plan.md`. The current `npm test` top-level glob omits 28 active nested product modules: do **not** represent it as complete until TG-01 is independently corrected and proven by a distinct PHX-CI executor. For BVP, the currently configured focused command is `npm run test:bvp-root`, and no direct off-PHX-CI invocation is authorized. The executor must record actual discovered and executed cases against the integrated immutable source/test candidate; static source presence and historical PHX-CI summaries do not count as new execution evidence.

**Mandatory handoffs:** Distinct Pre-Build Test Author → Coding Agent (test files immutable to coder) → fresh blind Phase 0 Reviewer (review-only Git commit and hard stop) → separately authorized Post-Build Test Author → distinct PHX-CI Test Execution Agent → separate Independent Acceptance Reviewer. Each authorized author supplies branch/base/source/commit/tree/changed paths, exact normative requirement/test assertion mapping, category/native exception, discovery scope and blockers. See PTAR v2.0 external authority and whole-project verification plan. Existing accepted tests are preserved; do not fabricate historical pre-build provenance.
