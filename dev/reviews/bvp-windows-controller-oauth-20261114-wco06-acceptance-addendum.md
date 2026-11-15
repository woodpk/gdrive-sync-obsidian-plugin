# WCO-06 / DEC-357 — CORRECTED Independent Final Verdict (Acceptance Addendum)

**FINAL, SUPERSEDING DISPOSITION: PASS WITH MINOR FINDINGS — ACCEPTED, SOFTWARE-ONLY.**

**Scope:** `woodpk/gdrive-sync-obsidian-plugin`, branch `build/bvp-poll-error-observability-20261025`, WS-07/`BVP_WINDOWS_CONTROLLER_OAUTH`, WCO-06, DEC-357 as narrowly amended by **Owner-approved DEC-358**.

**Immutable accepted source SHA:** `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0`  
**Immutable source Git tree:** `759cc887985823293cd75fa4239c10096a45fdcc`  
**Original Windows PHX-CI run:** `e579438f-8a22-434d-8284-ef966f6db535`  
**Original evidence publication:** `6b7c67e0639cba184e875d6184497bad781317fd`  
**Owner-authorized PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`  
**Handoff:** REVIEWER → BUILDER; **feature handoff-count 14 (correction of existing count-14 disposition; no fabricated extra transfer)**.

## Disposition correction

This addendum **supersedes the acceptance verdict** in `dev/reviews/bvp-windows-controller-oauth-20261114-wco06-final.md` without deleting, editing, or falsifying that historical report or its source-only predecessor `dev/reviews/bvp-windows-controller-oauth-20261114-wco06-source.md`. The original source-first and evidence-informed inspections, substantive source findings, authored test inspection, and original verification evidence remain part of the review record.

**WCO06-F01 — CLOSED / WITHDRAWN AS BLOCKER.** The prior report incorrectly treated lack of an Owner approval in the then-inspected repository documents as proof of an unauthorized PHX-CI runtime upgrade. The **Owner explicitly directed the upgrade and confirmed that authorization**; the precise scoped exception is recorded as locked DEC-358 in `dev/authority/decision-register.yaml`, with supplemental text in the WCO task. The approved pin is `4cf0c865c7b189641e2acebc0a6ad757b6f01992`. Previous DEC-357 pin constraints remain historical truth for the prior runtime, not a rejection of the Owner-authorized successor. No rollback, second approval, software rebuild or duplicate test run is necessary solely to close this incorrect finding.

**No other blocking software defect was established by the original WCO-06 independent assessment.** On the fully established existing source assessment and evidence plus the now verified Owner authority, the Reviewer **ACCEPTS** the frozen software-only implementation **WITH MINOR FINDINGS**. This is a corrected independent review disposition, not Builder self-acceptance.

## Source-matched verification retained intact

- **13/13** PHX-CI stages PASS, including authority-check, preflight, Node, install, typecheck, test-focused, full test, artifact-preparation, build, artifacts, check and repository-check.
- **628/628** focused BVP tests PASS and **1292/1292** product tests PASS; no skipped/cancelled/failing tests in the qualifying run. Suites overlap and counts must not be summed.
- Change-set **PASS**, repository **PASS**, overall **PASS**, native exit code **0**.
- Architecture frozen ceilings PASS: framework core **4849/4850** and live agent/relay **1239/1250**.
- Verified source and tree match the immutable original PHX-CI result. Original `dev/_ca-output.md`, `result.json`, `result.md`, and `terminal.log` remain unchanged. No independent PHX-CI run or new software verification is asserted or required for this administrative review correction.
- Corrective regressions include compiled `--once` with hung network, abort/timeout, controller lock and restart, native NTFS ACL and restricted DPAPI credentials, canonical authority lease filtering, and simulated reporter-to-controller-to-inbox path. The original report records the underlying test cases and their exact evidence.

## Nonblocking retained findings

| ID | Severity | Disposition |
| --- | --- | --- |
| **WCO06-F01** — PHX-CI pin authorization | Previously HIGH | **CLOSED** by explicit Owner instruction and locked DEC-358; prior rejection unjustified |
| **WCO06-F02** — cancellation of local filesystem operations | MINOR | Documented residual liveness limitation; network/subprocess deadlines tested; no demonstrated software failure |
| **WCO06-F03** — same-user reparse/ACL TOCTOU | MINOR | Documented trusted-current-user security boundary; DPAPI/ACL negatives PASS |
| **WCO06-F04** — historic-context exposure and live cross-client visibility | PROCEDURAL / EXTERNAL | Disclosed. True zero-history blindness not claimed; live real-Google `drive.file` cross-client compatibility remains separately Owner gated |

## Ten-family conclusion

1. Nominal — ADEQUATE (simulated Windows software).
2. Negative/malformed — ADEQUATE.
3. State transitions — ADEQUATE.
4. Idempotency/retry — ADEQUATE.
5. Concurrency/order — ADEQUATE for the one-root/single-authoritative-host design.
6. Persistence/restart — ADEQUATE for qualified software scope.
7. Identity/security/privacy — ADEQUATE for trusted single Windows operator.
8. Compatibility/interfaces — ADEQUATE for simulated interfaces; **real separate-client Google Drive interoperability remains UNVERIFIED**, separately gated.
9. Architecture/governance — **ADEQUATE FOR THIS QUALIFICATION UNDER DEC-358**, with frozen 4850/1250 budgets and exact pin.
10. E2E/fail closed — ADEQUATE for simulated software; no live/physical assertion.

**Final disposition: PASS WITH MINOR FINDINGS — ACCEPTED** for WCO-06 **Windows software-only**. The acceptance does **not** grant installation, master merge, release, deployment, production sync activation, physical Windows/iOS dispatch, real OAuth/Google Drive, creation of a new mailbox, any second authority host, expanded OAuth scope, a further PHX-CI pin change, budget expansion, or GitHub Actions.

## Governed transfer

The **Reviewer→Builder** acceptance handoff is `dev/state/handoffs/wco06-dec357-accepted-reviewer-to-builder.md`; the feature-specific current-state block under `bvp_windows_controller_oauth_2026_10_28` is to be reconciled with **PASS_WITH_MINOR_FINDINGS_ACCEPTED_SOFTWARE_ONLY**, keeping feature handoff-count **14**, sender REVIEWER, recipient BUILDER, immutable original source and evidence, plus the retained restrictions. Builder's next action is **administrative software-only acceptance closeout**, not a duplicate build or review. Any later live compatibility/physical operation needs separate explicit Owner authorization.
