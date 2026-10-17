# Verification Plan — Google Drive and OAuth Boundary

## Objective completion evidence

- Automated tests/fakes verify Drive ID preservation, managed-root identity validation, remote rename/move, trash semantics, remote schema/version handling, missing-root recovery signaling, and ambiguous remote identity handling.
- Changes API tests verify cursor advancement only after durable incorporation and safe fallback to full reconciliation when the cursor is missing/invalid.
- Partial/failing remote enumeration tests prove absence cannot authorize deletion.
- Retry, rate-limit, quota, ambiguous-upload, large-file, and content-integrity tests pass.
- Authorization uses only `drive.file` and no repository credential is committed.
- Same-device authentication is demonstrated on Windows and iPhone/iOS at least to the extent possible before full product integration; any final lifecycle integration remaining is explicitly carried to Phase 5.
- Hosted callback behavior, if used, is demonstrably content-blind and token-nonpersistent.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.


## Independent PTAR v2.0 authoring, discovery and role ownership (2026-10-17)

**Current candidate test families (not a case-by-case execution claim):** `test/phase3-*.test.ts`, `test/workstreams/drive/*.test.ts`, and provider/transport-dependent integration tests (contracts/integration/adversarial intent). Existing `test/` files remain a legacy native TS source root; do not duplicate or migrate them automatically. Classify new tests by *what they prove* under `tests/<category>/` unless an explicitly authorized, documented architecture/toolchain exception applies. The BVP `test-platform/` root is a separately frozen architectural boundary and must not be moved or expanded as a general exception by an ordinary test author.

**Normative coverage to bind in each independent authoring request:** Drive IDs and remote enumeration, Changes cursor completeness and durability, OAuth/same-device auth, ambiguity, retry/backoff/remote failure; physical provider checks separately. Test cases require positive, negative/fail-closed, boundary, concurrency/retry/cancel, persistence/restart and integration expectations **where applicable**, from the target specification and accepted decisions rather than production's incidental implementation. Requirement-family ownership above does not substitute for individual requirement-to-test traceability or physical coverage where the authority requires it.

**Discovery and PHX-CI:** Before writing a new/substantially revised test, bind its exact compiled/discovered path and PHX-CI-consumed runner selection to the whole-project `dev/planning/03-verification/verification-plan.md`. The current `npm test` top-level glob omits 28 active nested product modules: do **not** represent it as complete until TG-01 is independently corrected and proven by a distinct PHX-CI executor. For BVP, the currently configured focused command is `npm run test:bvp-root`, and no direct off-PHX-CI invocation is authorized. The executor must record actual discovered and executed cases against the integrated immutable source/test candidate; static source presence and historical PHX-CI summaries do not count as new execution evidence.

**Mandatory handoffs:** Distinct Pre-Build Test Author → Coding Agent (test files immutable to coder) → fresh blind Phase 0 Reviewer (review-only Git commit and hard stop) → separately authorized Post-Build Test Author → distinct PHX-CI Test Execution Agent → separate Independent Acceptance Reviewer. Each authorized author supplies branch/base/source/commit/tree/changed paths, exact normative requirement/test assertion mapping, category/native exception, discovery scope and blockers. See PTAR v2.0 external authority and whole-project verification plan. Existing accepted tests are preserved; do not fabricate historical pre-build provenance.
