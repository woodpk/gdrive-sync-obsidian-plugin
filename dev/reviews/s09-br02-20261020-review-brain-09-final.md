# WS-07 / S09-BR02 — Final independent review (Pass 2)

**Verdict: CORRECTION REQUIRED — NOT ACCEPTED.**

- Date / independent reviewer: 2026-10-20 / `review-brain-09`.
- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Feature: `WS-07 / S09-BR02 — BVP Fixed-PHX-CI Consumer Bridge`.
- Planning: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`.
- Submitted exact source: `576f3cfcca9a24c8851456a5487448542cfd0c91`.
- Verified Git tree recorded by PHX-CI: `370849913c5e2bce1385aca52f4bfba45cfb7a2c`.
- Intake handoff: count 1; state `64eeaa38792b2cf7ecf70ff820c164e990a8a92b`; receiving REVIEWER.
- Frozen independent source pass: `dev/reviews/s09-br02-20261020-review-brain-09-source.md` published at `6bc0914c8d8130ebe620b03bc9c8527c87dcefe8`.

## 1. Original immutable PHX-CI evidence — confirmed genuine software qualification

The current candidate passed genuine pinned PHX-CI run `fedef0c1-9fcb-413b-8fbd-7504f9f9b5a0`, runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, framework `0.2.0-dev.2`, using Windows/PowerShell 7.6.6, source `576f3cfcca9a24c8851456a5487448542cfd0c91`, tree `370849913c5e2bce1385aca52f4bfba45cfb7a2c`. Original evidence publication commit `15f61461afb9e3d878f83547af221f7efd4d474a`, original JSON path `dev/test-results/20261021T014003Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-576f3cfcca9a.json`.

All eleven required PHX-CI stages PASS with exit 0: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check and artifacts. Test-focused: **429/429 PASS**, zero failed/skipped; independent full product test: **1,292/1,292 PASS**, zero failed/skipped. They overlap; do not sum as unique assertions. `main.js` 922,631 bytes / observed SHA-256 `6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d`; development observation, not release approval.

The two actual PHX-CI verifications for **synthetic stdout transport** also occurred:
1. Original run `861d8207-3be5-4399-9ab1-5de5ecc98816` on `179cca70fc0c178a4b3af2c8f4363becb01434a6`: test-focused exit **3/FAIL**, full repository verification PASS, overall **BLOCKED**, immutable JSON `dev/test-results/20261021T012519Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-179cca70fc0c.json` published in evidence commit `576f3cfcca9a24c8851456a5487448542cfd0c91`.
2. Run `fedef0c1-9fcb-413b-8fbd-7504f9f9b5a0` retrieved first-run actual Git-published JSON from immutable commit/path, validated it via the BRAIN bridge reader, and emitted a distinct PHX run's successful framed synthetic result with unchanged logical BVP run ID and nominal scenario/fixture identities. Full PHX-CI PASS.

**Critical boundary:** `test-platform/test/batteries/phxci-transport-probe.ts` itself explicitly states it NEVER invokes a live battery, device, actual BVP scenario runner or product action. Its synthetic scenario `br02-phxci-synthetic-checkpoint` is not the registered real battery scenario, and its artifact SHA is the synthetic `1` repeated 64 times. Therefore the two real PHX invocations prove **existing-stage stdout capture, BLOCKED publication, immutable Git retrieval and subsequent PASS transport**, not the mandatory **actual bridge → existing BVP runner → simulated-device checkpoint/resume** round-trip of plan §9, nor correct installed-artifact/manifest attestation.

## 2. Ten mandatory test families — independent adjudication

Directly inspected `test-platform/test/phxci-physical-bridge.test.ts` (12 TDD tests), `test-platform/test/phxci-physical-bridge-adversarial.test.ts` (14 additional cases), `test-platform/test/batteries/phxci-transport-probe.ts`, the bridge implementation, existing runner/checkpoint/late-receipt code and original PHX-CI stage logs. Counting test families in a comment or receiving PHX PASS does not establish adequacy.

| Family | Actual coverage | Acceptance adequacy |
| --- | --- | --- |
| 1. Nominal/success | Envelope round-trip; published synthetic BLOCKED → synthetic PASS with real PHX publications | PARTIAL: no actual bridge/live-runner simulated-device round trip |
| 2. Boundary/negative/malformed | Frame truncation, duplicates, JSON/version, size/depth and selected sensitive keys | PARTIAL: nested allowlist, unrecognized human content and relay scope escape absent |
| 3. Legal/forbidden transitions | Initial/resume attempt indexes and mode restrictions | PARTIAL: real checkpoint→runner transition unproven |
| 4. Idempotency/retry/cancellation/recovery | Prior chain and late-receipt switch assertions, malformed receipts fail | PARTIAL: real continuation/cancellation and effects not exercised |
| 5. Concurrency/race/stale order | Simulated Git ancestry and stale predecessor checks | INSUFFICIENT: concurrent lease/ownership and overlapping attempts not challenged end-to-end |
| 6. Persistence/restart/integrity | Immutable Git retrieval, original PHX checkpoint publication, corrupted frame fail-closed | ADEQUATE for the bounded stdout transport only |
| 7. Identity/security/trust | Source/Git run/device string identity checks, known secret patterns | INSUFFICIENT: absent installed main.js/manifest attestation, scenario digest trusted as supplied, unconstrained nested data |
| 8. Integration/contracts/compatibility | Real fixed PHX-CI stdout-and-published-JSON contract confirmed | PARTIAL: synthetic probe bypasses actual bridge.main and BVP runner |
| 9. Architecture/ownership/invariants | Standalone bridge without request denied, original repository guard PASS, unchanged pinned PHX-CI | ADEQUATE for observed repository boundary |
| 10. End-to-end/fail-closed/destructive safety | No physical effects; many negative decoder tests; PHX publishes proper BLOCKED/PASS statuses | INSUFFICIENT: no simulated-device execution demonstrating effects/replay safety or approved relay confinement |

Original PHX test discovery confirms the two named test modules were executed. The tests use synthetic `GitEvidencePort` instances and deliberately minimal result fixtures. The observed green suite cannot resolve the source identity/security gaps below, nor turn simulated transport into a tested physical-bridge lifecycle.

## 3. Source defects independently confirmed after examining tests and original evidence

**BR02-F01 — HIGH — No observed installed artifact/manifest cryptographic binding.** Frozen source finding BR02-SRC-01 is sustained. `test-platform/test/batteries/phxci-physical-bridge.ts:33–57, 126–161, 163–210, 390–513`. The user-supplied `artifactSha256` is syntactically checked but never bound to observed installed `main.js` or `manifest.json`; `BridgeExpectation` has no manifest digest or relay scope. Device agent's `ValidationBuildIdentity` includes only sourceCommit. Synthetic actual PHX transport successfully emitted an arbitrary `111…` digest, deliberately proving **transport only**, not artifact authenticity. Requirement §4 calls for independently derived/confirmed installed hashes. Fix contract and verify with actual bounded identity evidence, or return for Owner decision if one-file BR01 boundary / frozen device interface prevents it.

**BR02-F02 — HIGH — Mismatched scenario digest can be accepted for a completed attempt.** Sustains BR02-SRC-02. `phxci-physical-bridge.ts:126–161, 163–210, 427–513`. The bridge accepts a structurally valid supplied digest on exit 0 without recomputing the registered battery's actual scenario definition digest. The PHX transport fixture uses a synthetic scenario with the real battery *name*, demonstrating these identities are not coupled by the bridge. A checkpoint-only comparison on exit 3 cannot protect completed outcomes. The tests do not assert an actual registry digest binding. Resolve by validating actual scenario ID/digest and required device mapping for every mode.

**BR02-F03 — HIGH — Incomplete privacy allowlisting permits unapproved nested information in published PHX stdout.** Sustains BR02-SRC-03. `phxci-physical-bridge.ts:29–31, 106–161, 224–255`. The tests reject a new **top-level** `discussion` property and enumerated `apiKey`, `refreshToken`, `vaultContent` child names, but not arbitrary extra nested fields / personal free text under approved parent fields. A value like `result.evidence.machine.observerName = "Jane Doe"` is neither an identified forbidden key nor matched sensitive-value pattern, and passes the shown recursive denylist; it can be serialized into PHX/Git. This violates plan §5's explicit field allowlist/disposable nonsecret data requirement, regardless of no known real leak. Adopt recursive strict shape/value/scope validation or stop if lossless result transport conflicts with privacy.

**BR02-F04 — HIGH — Unrestricted absolute relay root forwards unapproved vault paths to existing runner.** Sustains BR02-SRC-04. `phxci-physical-bridge.ts:416–425, 427–455, 478–505`. Checkpoint/result locations are confined to `C:\\temp\\`, but relayRoot is checked only as absolute, and no exact approved relay root, device/fixture scope or bounded owner grant is authenticated. The negative tests do not exercise this required boundary. Enforce canonical allowed root and scope/lease ownership before any subprocess invocation.

**BR02-F05 — HIGH — Missing mandatory actual BVP runner + simulated-device two-PHX-invocation acceptance demonstration.** Additional evidence-adequacy finding. Plan §9 explicitly requires a simulated-device two-invocation real-PHX dry-run (checkpoint → immutable BLOCKED → resumed completion). The recorded PHX invocations instead call `phxci-transport-probe.js checkpoint/continue`, which directly synthesizes `BridgeAttempt` and never executes `phxci-physical-bridge.main()`, `run-live-battery.js`, a simulated device or any runner side-effect/replay path. The test suite likewise exercises framers/readers with mocks, not the runner under a two-attempt PHX stage. The genuine transport subproof is valuable and preserved, but does not meet the full design acceptance gate. Add a compliant nonphysical actual entrypoint/runner fixture demonstration without changing PHX-CI or claiming physical authorization; if impossible under approved interfaces, return BLOCKED for Owner decision.

## 4. Required Builder correction and authority limits

1. Independently reproduce the listed source counterexamples through additional **tests first**, with honest RED expectations; do not relax existing tests or convert the synthetic transport proof into a claim of end-to-end BVP physical readiness.
2. BR02's writable surface is tests only. Production/adapter changes required for F01–F04 belong to a bounded **BR01 correction** under §8, not unauthorized BR02 implementation expansion. If the one-file BR01 design or frozen PHX/runtime interface cannot meet installed artifact/device attestation, privacy, permitted paths and real runner continuity, seek the Owner's explicit scope/architecture decision.
3. Preserve the two existing PHX transport publications, their genuine status and the immutable exact-source qualification; run a **new** complete pinned PHX-CI only against the corrected source/test identity, publish its original evidence, and then issue a fresh neutral Builder→Reviewer final handoff.
4. Do not change PHX-CI or `phx-ci.json`; no GitHub Actions; do not modify frozen governance, production code outside authorized scope, live devices, Drive/vault, releases, install or Stage 3. No master merge authorized.

**Final disposition: CORRECTION REQUIRED.** Full original PHX software PASS is confirmed but does not override substantive identified unmet source/spec and coverage obligations. Reviewer did not run software validation and did not modify source/tests/PHX evidence.
