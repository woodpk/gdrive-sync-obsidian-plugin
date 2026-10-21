# WS-07 / S09-BR02 — Independent R3 final reassessment

**Verdict: PASS WITH BOUNDED FINDINGS — ACCEPTED FOR OWNER-GOVERNED SOFTWARE-ONLY, SINGLE-CONTROLLER NONPHYSICAL BRIDGE CLOSEOUT.** This verdict does **not** accept physical S09 execution, distributed controller authority, installation, activation, a release artifact/hash, live Google Drive/vault operations, master integration or Stage 3.

**Reviewer:** `review-brain-09`; **date:** 2026-10-21.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`.

**Feature:** `WS-07 / S09-BR02 — BVP Fixed-PHX-CI Consumer Bridge`.

**Planning authority:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`; DEC-345; Owner Scope A in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-br02-review-correction-owner-scope-decision-20261020.md`.

**Exactly assessed source SHA:** `51d75e63eac1f3a37ef998cf599f039dce7feb2f`; original PHX-CI-verified Git tree `3c362f4ef9cae621415deedf892f83bace20a574`.

**Intake state commit:** `5c842dc1adafc20132e79b3f5d07471c94643518`; handoff-count **5**, recipient **REVIEWER**. Preflight checked exact equality of submitted state and remote branch HEAD, source as ancestor of state, feature and role. Post-source changes to intake state were original verification evidence and canonical status only.

**Frozen source-only Pass 1:** `dev/reviews/s09-br02-20261021-review-brain-09-r3-source.md`; publication commit `b7648ab77eb7f8f85ee0b1f9bbc9e31c7d396f1a`. Only after freezing this report were authored tests, changed-path history and original PHX-CI results opened.

## 1. Original PHX-CI authoritative evidence and immutable candidate continuity

Pinned framework: `0.2.0-dev.2`, pinned runtime SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`. Reviewed BRAIN `phx-ci.json` retaining exact pin; the candidate does not modify the PHX-CI framework.

**Actual BVP runner, controlled simulated-device attempt 1 (original immutable BLOCKED):**

- Verified source `a3b83ecaf97f2ce5f97550ae4f795706161aaa4c`; PHX run `6658c44e-058a-4696-aa1d-bcc3b372d3b8`.
- Original report: `dev/test-results/20261021T152831Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-a3b83ecaf97f.json`; immutable publication commit `51d75e63eac1f3a37ef998cf599f039dce7feb2f`; verified Git blob `5feb18ea2becaa468c8789aa3c05bdb01c2606e6`.
- Focused BVP: **448/448 PASS**, repository tests **1292/1292 PASS**. The checkpoint is **canonical BVP schema v2**, next step index 2, after first simulated effect. Actual focused stage returned **exit 3/FAIL**, overall PHX **BLOCKED**, exactly as required.

**Actual BVP runner, controlled simulated-device attempt 2 (original immutable COMPLETE):**

- Exact candidate verified source `51d75e63eac1f3a37ef998cf599f039dce7feb2f`; tree `3c362f4ef9cae621415deedf892f83bace20a574`. PHX run `4323c021-1c8f-4c35-a3e3-79148d5f39c2`.
- Original report: `dev/test-results/20261021T160011Z-operator-planning-ws07-s09-bvp-physical-phxci-consumer-20261020-51d75e63eac1.json`; original publication commit `f88896b7d89b165c5c5ccd31c3a3f394c8c468d7`; original Git blob `6dd9883481de7d85f0f324a9af7d024266beac58`.
- **ALL ELEVEN PHX-CI STAGES PASS**: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Focused **448/448 PASS**, repository **1292/1292 PASS**, neither has failures/skips. The two test populations overlap; their counts cannot be combined as distinct cases.
- Exact stage command executed mandatory `npm run test:bvp-root` then `phxci-actual-runner-probe.js continue`, using the committed first report/commit/run ID. Final overall PHX: **COMPLETE/PASS, exit 0**.

**Independent byte-level frame comparison:** Inspected and decoded the actual published `BVP-PHXCI-BRIDGE-V1` line in each original PHX stage stdout. Verified same BVP logical run `bvp-br02-9987e4230fd14c13bea9f87ab38a1c29`, original artifact/source identity `a3b83ecaf97f2ce5f97550ae4f795706161aaa4c`, battery `s09-br02-simulated-checkpoint`, scenario `br02-actual-runner-simulated-checkpoint`, scenario digest `sha256:eef83e68bd19ab7ee2f96fe0af81c184fad5196d6dceb9c0627c221021369e9d`, artifact SHA-256 `d859c4dd835f38d006678d3ae7e6be83e5bf16867caac2c46340177da72dd4e6`, manifest SHA-256 `49ef37024f3aae19f18b9daf985fb4cf70e21dc7dfa6be3cd22bab58d1717ed6`, same simulated device mapping, distinct PHX run IDs and monotonic indices 1→2. Continuation predecessor exactly matches earlier evidence commit, history path, run ID and index. Observed result changed from BLOCKED/exit3 with checkpoint to COMPLETED/exit0 without checkpoint. Source `a3b83eca...` to `51d75e63...` comparison is **evidence-only**, with no executable/test/config drift.

These are real PHX-CI invocations and a real existing BVP runner plus disposable local simulated device-command agent; **not** proof of physical Windows/iOS behavior or actual Drive/vault operations.

## 2. R2 blockers — independent adjudication

**R2-01: single writer / attempt-level authority — CLOSED FOR ONE CONTROLLER MACHINE.** `test-platform/test/batteries/phxci-physical-bridge.ts` now exposes `claimBridgeAttemptAuthority` and calls it *before effect-capable runner dispatch*. Stable logical-run and per-device lock roots use SHA-derived names beneath `C:\temp`, atomic active-directory acquisition, durable attempt index and PHX identity markers, predecessor-consumption guard, fail-closed abandonment (no TTL/steal), explicit release only after blocked/completed result, and terminal closed marker. The new `test-platform/test/phxci-bridge-r2-authority-privacy.test.ts` contains specific distinct and overlapping logical-run/device attempts, duplicate predecessors, abandoned claims, repeated PHX identities, and a separate-process contention test. The PHX focused stage discovered and passed the suite. This validates **single-controller Windows host** process-level exclusivity; not a globally distributed-controller guarantee.

**R2-02: raw private identity and arbitrary observation values — CLOSED FOR THE APPROVED PUBLISHABLE ENVELOPE.** The bridge rejects real raw device labels not of `device:sha256:<64 hex>` form, checks pseudonyms throughout attempts, checkpoint schema and observed installation/result identities, and limits synthetic fixture IDs to the PHX-scoped allowlist. It narrows nested BVP observation fields and imposes a fixed lexical value set for observation strings, source-derived scenario step/fixture provenance and shape/byte bounds. New adversarial tests explicitly reject personal workstation/email/account identifiers in outer device IDs, machine device identities, installation-observation keys and formerly permitted observation fields, while accepting a consistent pseudonymous device claim. **Limitation:** hashes/pseudonyms are not proof of anonymous persons; no real participant or personal vault was exercised or authorized.

**Prior requirements retained:** Source-derived registered scenario digest and device-label checks, installed `main.js` + manifest byte hashes and device-side independently measured equality, scoped scratch paths, predecessor Git evidence ancestry, canonical BVP runner/engine reuse, original immutable results, distinct PHX run IDs and no PHX change. Owner Scope A expressly permits the narrow live-device validation contract edits; candidate comparison from earlier accepted S09-BR02 implementation is restricted to bridge module, test additions/probe and related authority/planning/evidence/status. No new PHX-CI verifier, GitHub Actions or release/artifact-approval claim.

## 3. Ten-family verification adequacy

| Family | Reviewer assessment |
| --- | --- |
| 01 Nominal success | ADEQUATE — live BVP runner simulated actual two-PHX-stage BLOCKED → PASS |
| 02 Negative/boundary/malformed | ADEQUATE — hostile transport shape, deep JSON, private IDs, source IDs and scope rejection |
| 03 Allowed/forbidden transitions | ADEQUATE — initial/resume/late-receipt exclusivity, PHX identity and consumed predecessor |
| 04 Idempotence/retries/recovery | ADEQUATE for bounded software — checkpoint continuity, durable completed/blocked/uncertain lease and no repeat effect |
| 05 Concurrency/order/races | ADEQUATE for single controller — in-process and cross-process same logical-run and per-device exclusion |
| 06 Restart/persistence/integrity | ADEQUATE — original immutable PHX report, checkpoint recovery, durable index/claim |
| 07 Identity/privacy/security | ADEQUATE for disposable software fixtures — digest/installed hash correlation and strict allowed values |
| 08 Interface/contract/integration | ADEQUATE — unchanged pinned PHX-CI stage recording, actual BVP runner, device-command simulation |
| 09 Architecture/ownership/invariants | ADEQUATE — Owner Scope A writable paths, retained framework pin, repository check PASS |
| 10 E2E destructive/fail-closed | ADEQUATE for simulated scope — exactly one before/after fixture action, no precheckpoint replay, fail-closed unknown state |

Inspected requirements-derived TDD file, adversarial suite, previous correction suite, R2 concurrency/privacy tests, actual-runner probe and the canonical source implementation. No material test-oracle weakening was observed in these relevant changes. This is an adequacy verdict for **nonphysical single-controller software**, not physical S09A–V acceptance.

## 4. Remaining findings and explicit exclusions

**M-01 — Bounded assurance, no distributed multi-controller claim.** The bridge itself states the local controller lease does not coordinate distinct host controllers; external simultaneous physical controller use requires separately approved shared authority. This acceptance is strictly one controlled Windows verification host / disposable simulation. Do not promote to globally exclusive physical orchestration.

**M-02 — Not all future physical evidence can be guaranteed privacy-transportable.** Nonempty raw captures or non-allowlisted observation values deliberately fail closed. Each separately owner-authorized physical scenario must qualify its original nonsecret schema and bound identities before physical execution; this software-only PASS does not authorize relaxing the privacy filter or truncating canonical evidence.

**M-03 — Reviewer isolation transparency.** This review session contains earlier S09-BR02 review history. Pass 1 followed source-only inspection for the *new* immutable candidate and was published before its tests/evidence; it is **not** a claim of zero-prior-exposure fresh-session blindness. Current verdict is based on actual source, test and original evidence, independently examined.

**M-04 — Existing deferred gates.** DEC-345 and the physical-readiness plan still prohibit install, activation, personal-vault/Drive access, approval of a release digest, master merge or Stage 3 without separate Owner action. Prior owner-accepted DEC-340-01 standalone-verification-context exposure was not fixed here; only genuine pinned PHX-CI original records were used as authority.

## 5. Final disposition and Builder return

**ACCEPT — PASS WITH BOUNDED FINDINGS for the exact qualified S09-BR02 software-only, single-controller nonphysical bridge.** Close the R2 review findings at the software level and return to BUILDER for governance-permitted closeout and a distinct Owner integration decision if requested. **No implied integration/release/physical execution authorization.** Reviewer made no edits to source, tests, scripts, fixture or original PHX evidence and executed no software validation.
