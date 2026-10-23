# WS-07 / BVP_ERROR_REPORTING_UPGRADE — Independent source-only assessment

**Reviewer:** review-brain-09 | **Date:** 2026-10-23 | **Pass:** 1 (frozen before candidate test, source-history, Builder-commentary and PHX-CI evidence inspection)

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`.

**Exact production/test-platform source SHA under review:** `fd9ccf9f99ebc73de54f3553fd62b265ed0f86fb`.

**Live intake identity:** `dev/state/current-state.yaml` at `290a48953fd9923fd7b12288e6f864bd80e8f7ba`; branch `build/bvp-error-diagnostics-20261023` verified identical to the state commit; `handoff-count: 1`, recipient `REVIEWER`, feature `WS-07/BVP_ERROR_REPORTING_UPGRADE`, submitted source is its ancestor.

**Governing requirements:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-error-communication-upgrade-2026-10-23.md`, WS-07 `01-SCOPE.md`, `02-ARCHITECTURE.md`, DEC-348 and Owner's DEC-349 authorization (4,500 framework core / 950 live device lines only). The planning document's historical/Builder progress claims were not treated as review evidence or outcome; only its normative contract was used. No source history, authored tests, earlier reviews or PHX-CI evidence were opened.

**Source examined:** `test-platform/src/live-device/diagnostic-contract.ts`, `test-platform/src/scenario/{scenario-diagnostics,scenario-runner,scenario-evidence}.ts`, `test-platform/src/live-device/{live-scenario-executor,device-command-agent,drive-mailbox}.ts`, `test-platform/test/batteries/{run-live-battery,phxci-physical-bridge}.ts`. Source modules under `test-platform/test/batteries` are runtime entrypoints/adapters, not authored test suites.

## Pass-1 judgment: CORRECTION REQUIRED unless Pass 2 proves the apparent contract gaps are safely fulfilled by authoritative adjacent schema/entrypoint behavior.

### Positive implementation findings

- `diagnostic-contract.ts` provides one small browser-safe `BvpDiagnostic` with schema/version, allowlisted component, phase, last-confirmed and first-unconfirmed boundaries, effect uncertainty, next action, optional step ID. `bvpDiagnostic` uses code-only tokens rather than copying private exception text.
- `scenario-diagnostics.ts` provides a trusted typed-error path and strips general raw exception messages. `scenario-runner.ts` attaches safe diagnoses to unsuccessful steps and projects them into canonical evidence, preserving scenario verdict semantics.
- Live executor differentiates outbox failure, no response, malformed receipt, correlation mismatch and rejected production outcomes, and does not automatically resend uncertain effects. Mailbox recognizes safe HTTP categories; command agent uses structured rejection, handler failure and outcome-uncertain diagnoses.
- Battery entrypoint persists the structured result before emitting only bounded summary stdout, emits redacted fallback diagnostics on failure, and never deliberately prints stack traces. Bridge outer catch emits bounded classified codes plus a safe diagnostic rather than raw error/stack.
- Software engineering verification must remain separate from BVP user operation; no new PowerShell library is within this feature.

### Source-level acceptance concerns

**SRC-01 — MAJOR — Shared diagnostic schema does not carry required identity/correlation/observation fields.** `test-platform/src/live-device/diagnostic-contract.ts:7–22,35–48` defines only `schemaVersion,classification,component,phase,lastConfirmedBoundary,firstUnconfirmedBoundary,effect,recommendedAction,stepId?`. The authoritative plan's bounded shared diagnostic contract requires run ID (safely projected), scenario/battery ID, step index, execution mode, *correlation token*, cause class/retriability, and confirmed/not-observed/unknown status **per hop**. The enclosing scenario result gives some scenario/step context but not all of these, particularly for device-command/relay/mailbox diagnostics lacking an enclosing scenario result. No evidence-supported reconstruction of the complete required contract is apparent in source. A single `effect:"unknown"` does not encode which individual hops were confirmed and where receipt/dispatch certainty differs. Pass 2 must prove that the required identity and hop facts are available in an exact stable supported interface; otherwise this is a material unmet DEC-348 condition.

**SRC-02 — MAJOR — Non-MailboxUnavailableError relay failures bypass structured boundary reporting.** `test-platform/src/live-device/drive-mailbox.ts` `createWindowsMailboxRelay().pumpCore()`: a caught error is converted into `BvpDiagnostic` **only** when it is `MailboxUnavailableError`; for ordinary parsing failures (`JSON.parse` of outbox/sent file), `relay-command-invalid`, adapter filesystem read/write/rename failures, or other unexpected exceptions the code `throw e` bypasses the configured `phase,lastConfirmedBoundary,firstUnconfirmedBoundary` reporting. The device validation entrypoint may swallow such periodic poll failures, so this does not establish the required safe actionable report for malformed relay commands and result persistence failures. Distinguish existing observed outcomes from inferences; tests may confirm partial coverage but cannot replace absent source behavior.

**SRC-03 — MODERATE/MAJOR — Runner finalization and early unsupported-mode failure may not preserve structured diagnostics.** `test-platform/src/scenario/scenario-runner.ts:74–112`: unsupported `execution-mode-not-applicable` returns a `classification` without `diagnostic`; `finish()` awaits each `device.dispose()` and `executor.dispose()` without a failure conversion. An exception from cleanup can escape the result-returning path and discard the already observed step classification/boundary, rather than persist a truthful safe UNKNOWN disposition with a specific secondary cleanup failure. The plan explicitly demands reliable status/phase and result/evidence persistence even on failures. Inspect actual callers in Pass 2 before severity closure.

### Boundaries requiring qualification

1. Observable phase claims must never infer device execution from a queued command. The source's timeout classification is appropriately uncertainty-preserving, but incomplete per-hop telemetry remains a contract issue.
2. The bounded reason fields and redacted evidence look directionally safe. The positive privacy claim must be checked against tests that inject private tokens, filesystem/vault paths and raw device IDs through *all* terminal/shared/canonical surfaces.
3. DEC-349 only authorizes two exact ceiling increases; PHX-CI artifact and guard PASS must be verified using original evidence, not planning narration.
4. This pass was source-only for the exact new feature. This chat has previous review work on a different feature; do not claim a fully new clean-room session.

**Freeze:** This file captures findings before inspecting candidate authored tests, history, Builder explanations or original PHX-CI artifacts. Pass 2 may sustain/refine/close findings with direct evidence, without rewriting Pass 1. Reviewer performed no executable validation or production/test/script changes.
