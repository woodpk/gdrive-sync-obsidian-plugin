# Verification Plan — Integrated Synchronization Product and User Workflows

## Objective completion evidence

- End-to-end automated integration scenarios cover first sync, additional-device pairing, ordinary local edit, ordinary remote change, offline edit/reconnect, text merge, true text conflict, binary conflict, rename/move, deletion, delete-vs-modify, suspicious bulk destruction, recovery mode, cancellation, and stale-precondition re-planning.
- Manual and automatic synchronization demonstrably use the same planning semantics; no alternate unsafe mutation path exists.
- Status, preview, conflict, recovery, audit/history, notification, pause/resume, and Verify/Reconcile flows operate against real product state rather than UI-only mock behavior.
- Transfer verification precedes authoritative success-state commit in integrated tests.
- Auth revocation, wrong account, missing remote root, corrupt state, lost cursor, partial remote listing, local unreadability, disk/quota exhaustion, network/rate failure, invalid path, and repeated per-path failure produce the specified product response.
- First-sync and corrupt-state integration tests prove destructive propagation remains disabled until trustworthy state exists.
- The integrated product builds successfully and remains loadable on both desktop and mobile Obsidian targets.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.


## Independent PTAR v2.0 authoring, discovery and role ownership (2026-10-17)

**Current candidate test families (not a case-by-case execution claim):** `test/phase5-*.test.ts`, `test/phase5-acceptance-map.test.ts`, `test/workstreams/integration/*.test.ts`, `test/workstreams/orchestration/*.test.ts` (integration/contracts/adversarial/e2e intent). Existing `test/` files remain a legacy native TS source root; do not duplicate or migrate them automatically. Classify new tests by *what they prove* under `tests/<category>/` unless an explicitly authorized, documented architecture/toolchain exception applies. The BVP `test-platform/` root is a separately frozen architectural boundary and must not be moved or expanded as a general exception by an ordinary test author.

**Normative coverage to bind in each independent authoring request:** production controller and orchestrator real authority, first sync, race orders, cancellation, crash and authoritative commit, conflict/destructive safety and UI-visible outcomes. Test cases require positive, negative/fail-closed, boundary, concurrency/retry/cancel, persistence/restart and integration expectations **where applicable**, from the target specification and accepted decisions rather than production's incidental implementation. Requirement-family ownership above does not substitute for individual requirement-to-test traceability or physical coverage where the authority requires it.

**Discovery and PHX-CI:** Before writing a new/substantially revised test, bind its exact compiled/discovered path and PHX-CI-consumed runner selection to the whole-project `dev/planning/03-verification/verification-plan.md`. The current `npm test` top-level glob omits 28 active nested product modules: do **not** represent it as complete until TG-01 is independently corrected and proven by a distinct PHX-CI executor. For BVP, the currently configured focused command is `npm run test:bvp-root`, and no direct off-PHX-CI invocation is authorized. The executor must record actual discovered and executed cases against the integrated immutable source/test candidate; static source presence and historical PHX-CI summaries do not count as new execution evidence.

**Mandatory handoffs:** Distinct Pre-Build Test Author → Coding Agent (test files immutable to coder) → fresh blind Phase 0 Reviewer (review-only Git commit and hard stop) → separately authorized Post-Build Test Author → distinct PHX-CI Test Execution Agent → separate Independent Acceptance Reviewer. Each authorized author supplies branch/base/source/commit/tree/changed paths, exact normative requirement/test assertion mapping, category/native exception, discovery scope and blockers. See PTAR v2.0 external authority and whole-project verification plan. Existing accepted tests are preserved; do not fabricate historical pre-build provenance.
