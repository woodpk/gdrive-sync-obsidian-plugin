# S09-BR02 — Final independent reassessment

**Verdict: CORRECTION REQUIRED — NOT ACCEPTED FOR FULL BRIDGE.**

- Reviewer `review-brain-09`; date 2026-10-21; repository `woodpk/gdrive-sync-obsidian-plugin`.
- Feature `WS-07/S09-BR02 — BVP Fixed-PHX-CI Consumer Bridge`.
- Reviewed immutable implementation/test HEAD: `95415859f1a9890c796f9256431da81e5e34375c`.
- Original PHX-CI-verified tree: `18607b899e08ef99ecd9c1817ab7852c444d9f25`.
- Intake state `cfbda0c603a43828b30da5d268ee729bfbe06775`, handoff-count 3, REVIEWER recipient; source is ancestor of state and current branch equals supplied state at intake.
- **Pass-1 source assessment frozen first:** `dev/reviews/s09-br02-20261021-review-brain-09-reassessment-source.md`, publication `56669401e17abb56b9dc7c43e98fd838706d6f94`.
- Authority: S09 fixed-PHX-CI bridge plan §§4–9, WS-07 architecture and verification plan, DEC-345 and separate Owner-approved Scope A decision in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-br02-review-correction-owner-scope-decision-20261020.md`.

## 1. Original PHX-CI verification: authentic and technically successful

**Actual BVP runner on disposable simulated device, attempt 1:** PHX-CI `e9dd6103-2e81-4626-926e-4003d2f0e6d9` verified source `4de42fb252467c0c7646195bf96e8d9a12c1d8d2`. Original immutable report `dev/test-results/20261021T114912Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-4de42fb25246.json`, original publication commit `95415859f1a9890c796f9256431da81e5e34375c`, Git blob `6f2709114e08d65a0d7e14fe6852de6c0776334b`. Focused 437/437 tests PASS; actual runner checkpoint generated; focused stage intentionally FAIL exit 3; repository 1292/1292 tests PASS; PHX overall **BLOCKED**. Original report preserves stdout frame.

**Actual BVP runner on disposable simulated device, attempt 2:** PHX-CI `bf436873-3320-42ba-be40-2f5e9a28068d` verified exact current source `95415859f1a9890c796f9256431da81e5e34375c`, tree `18607b899e08ef99ecd9c1817ab7852c444d9f25`. Original report `dev/test-results/20261021T115855Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-95415859f1a9.json`, publication `5c2694b075631f94fb774cda0d513d6348dea539`, Git blob `39dd76b3560c009045049dbb98fece10f8d0db01`. PHX `COMPLETE`, all **11/11 required stages PASS**, focused **437/437** PASS and product **1292/1292** PASS (distinct suites overlap), zero failures/skips. The focused stage ran `npm run test:bvp-root` and `phxci-actual-runner-probe.js continue` in the same recorded invocation. Both source-to-evidence publication and source-to-continuation ancestry were verified: original `4de42fb...` → `95415859...` changes were evidence-only, with no test/implementation drift.

Direct inspection of `test-platform/test/batteries/phxci-actual-runner-probe.ts` confirms the probe starts the actual bridge `main()`, existing `run-live-battery.js`, and real bounded device-command-agent with disposable C:\\temp fixtures. Its prior-run worker effect log checks one precheckpoint action and exactly one postcheckpoint action after resume; the first action must not replay. This **closes the previous synthetic-framing-only integration insufficiency**. It remains NONPHYSICAL: no installation or live device, Google Drive, personal vault, release or physical S09 operation was authorized.

The above are genuine PHX outcomes and remain valid notwithstanding this separate acceptance decision. Reviewer did not execute validation.

## 2. Corrections independently adjudicated

- **F01 installed artifact+manifest identity:** SOURCE CORRECTION PRESENT. Bridge checks local installed-scratch `build-identity.json`, compares actual local `main.js`/manifest hashes, forwards expected digests to runner; validation entrypoint measures installed plugin files from Obsidian adapter and sends those digests in authenticated device responses. Live executor enforces source+artifact+manifest correlation per device result. The test fixture is synthetic, not real-device attestation; scope A expressly permits this correction, no claim of running-image attestation.
- **F02 scenario digest:** SOURCE CORRECTION PRESENT. Actual registered battery ID, scenario digest and exact device labels are validated by `main()` and `validateAttempt()`; synthetic test IDs are behind a separate PHX-context condition and physical `main()` registration checks.
- **F03 nested privacy:** PARTIALLY CORRECTED. The recursive structural allowlist is materially stronger and known secret keys/values and unapproved captured objects are blocked. **Residual HIGH finding R2-02** below.
- **F04 path confinement:** SOURCE CORRECTION PRESENT. Attempt-bound `C:\\temp\\<GUID>\\relay` with same-root scratch files, disallowed UNC/traversal and existing symbolic-link components. Symlink/reparse corner cases merit later Windows-specific tests but no independently proven exploit in this pass.
- **F05 real two-run PHX + actual runner:** CORRECTION VERIFIED. Genuine first BLOCKED published report and genuine second PASS, immutable earlier checkpoint ingestion and real simulated agent fixture execution demonstrated. Still strictly nonphysical.
- **Scope governance:** Earlier one-file rule was explicitly expanded by the Owner's Scope A authorization; comparison showed the implementation changes inside the six named path allowlist, with other changes to test sources, planning/state and evidence. PHX-CI framework and frozen pin/guards were not altered in the inspected change set. Scope A removes the earlier unapproved-file blocker.

## 3. Independent unresolved findings — acceptance blockers

**R2-01 — HIGH — Duplicate/simultaneous attempts can share one logical run's controller authority and command IDs.**

**Requirement:** S09 plan §6 A4 requires rejecting duplicate, already-consumed and concurrent attempts; §7 states **single writer, only one authorized attempt may own a logical BVP run and involved device/controller lease**. A crash does not authorize concurrent redispatch. The bridge `main()`, `loadPublishedBridgeAttempt()` and `buildLiveRunnerArguments()` validate ancestry, predecessor and input identity but never acquire an exclusive **attempt-level** lease/consumed-predecessor guard before invoking the runner. The live executor (`test-platform/src/live-device/live-scenario-executor.ts`, controller-authority initialization) explicitly accepts `current.runId === options.runId` and releases its authority-file lock after initialization; it does not discriminate PHX-CI attempt 2 from competing PHX-CI attempt 2 using the required *same* BVP run ID. BVP command IDs derive from that logical run ID, scenario and step indexes, so overlapping duplicate resumes share command IDs. Both can pass immutable predecessor checks before either publishes a successor. PHX publication race protection occurs **after** physical execution, too late to guarantee single effect writer. Deterministic happy-path serial attempts do not prove simultaneous exclusion.

**Required:** enforce a durable fail-closed one-attempt-at-a-time authority for BVP logical run+device lease (including predecessor-consumption and concurrent duplicate invocation) **before** any simulated or physical effect. Distinguish PHX attempt identities without changing the stable logical BVP run, reconcile unresolved locks/effects after crash conservatively. Add controlled overlap/abandoned-lease tests under the existing authorized scope and verify exclusively via pinned PHX-CI.

**R2-02 — HIGH — Transport may publish unapproved raw device/observation identifiers and uncontrolled allowlisted values.**

**Requirement:** S09 plan §§4–5 requires stable sorted **device identity digests**, byte/field/fixture allowlisting, only preapproved disposable nonsecret fixture evidence, and no account identifiers, sensitive dumps or note bodies in PHX stdout / public immutable Git evidence. Bridge `BridgeAttempt.deviceIds`, nested `checkpointJson`, BVP machine `deviceIdentities`, and `installationObservation.devices` carry *raw* device identity values. `allowedShape` allows nested `observationValue.remoteObjectId`, `deviceIdentity`, `vaultIdentity`, `revision`, `changeCursor` and other strings, but does not prove those values are approved disposable fixture identities. `inspectSensitive` relies on token/name regex and string lengths; it cannot exclude arbitrary account/device identifiers or arbitrary content in allowed string fields. The current two-PHX successful fixture safely used `device:simulated-windows`; that is not evidence that a real physical S09 path will never publish private identifiers.

**Required:** decide and enforce an explicit lossless BVP-checkpoint/result privacy contract: hash/redact safe transport-side identity where possible while preserving exact private resume input inside authorized scratch, or require verifiably nonsecret fixture-only identities and constrain all publishable value domains. Reject output whenever canonical original results cannot satisfy privacy. Add positive/negative tests with plausible private identifiers in *allowed* nested fields, not only forbidden keys. If lossless immutable resume conflicts with mandatory privacy, obtain Owner scope choice rather than claiming physical readiness.

## 4. Ten mandatory test-family review (source+authored tests+original run)

Directly inspected `test-platform/test/phxci-physical-bridge.test.ts` (12 tests), `test-platform/test/phxci-physical-bridge-adversarial.test.ts` (14 tests), `test-platform/test/phxci-bridge-review-corrections.test.ts` (8 tests), `test-platform/test/batteries/phxci-actual-runner-probe.ts` and the original PHX stage records.

| Family | Adjudication |
| --- | --- |
| 1 nominal/success | PASS for software-only actual-bridge simulated PHX two-attempt execution |
| 2 negative/boundary/malformed | PARTIAL; many frame, path, schema, size, key and digest rejection tests; no private *allowed-value* counterexample |
| 3 permitted/forbidden transitions | PARTIAL; valid checkpoint/late-receipt and identities; no simultaneous competing attempt exclusion |
| 4 retry/cancel/idempotency/recovery | PARTIAL; repeat-effect suppression in serial resume, but no concurrent or abandoned-lease recovery demonstration |
| 5 concurrency/order/stale state | **INSUFFICIENT**: no deliberately overlapping same-logical-run PHX attempts or duplicate predecessor-consumption test |
| 6 persistence/restart/data integrity | PASS for bounded immutable PHX evidence publishing/recovery and saved checkpoint continuity |
| 7 identity/authorization/security | PARTIAL: manifest/device hash correlation and strict source ancestry demonstrated in software; raw identity evidence privacy still unresolved |
| 8 contracts/integration/compatibility | PASS for fixed PHX-CI focused-stage + original BVP runner through simulated device, without PHX code modification |
| 9 architecture/ownership/invariants | PASS for Scope A permitted files and observed PHX repository-check; single-writer invariant outstanding under F01 |
| 10 end-to-end/fail-closed/destructive | PARTIAL: serial simulated no-replay proof, no simultaneous effect-collision safety or physical qualification |

Reviewer's procedural limitation: this same existing chat includes prior S09-BR02 review exposure; therefore the frozen Pass 1 is a source-only *reassessment* and explicitly does not claim a new zero-context Reviewer session. The two passes were published in the prescribed order without inspecting this source's tests and PHX results before Pass-1 freeze. This limitation does not turn genuine PHX-CI PASS into a failure or waive substantive unresolved findings.

## 5. Mandatory Builder return

**CORRECTION REQUIRED** for R2-01 and R2-02; all closed subproofs and PHX results remain intact. Introduce narrowly scoped new negative tests FIRST, use Builder/BR01 versus BR02 writable ownership from the Owner-approved Scope A, and stop on any need for additional PHX schema, frozen guard, framework pin, production source or architecture change. Requalify the exact corrected code/tests through pinned PHX-CI, publish immutable original PHX evidence, and submit a new neutral independent review handoff. No original evidence editing, validation by Reviewer, physical operations, installation, master merge, release or Stage 3 authorized.
