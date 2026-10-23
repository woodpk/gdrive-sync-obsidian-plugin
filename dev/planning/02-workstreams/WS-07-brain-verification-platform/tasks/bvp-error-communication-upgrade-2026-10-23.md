# BVP Error Communication and Diagnostic Upgrade — Planning Contract (2026-10-23)

## Authority and status

**Status: PLANNED / NOT IMPLEMENTED / NO TEST EXECUTION.** Owner-authorized under **DEC-348**, informed by **DEC-346** (PowerShell primary operational interface) and **DEC-347** (Windows / Windows-hosted iPhone-iPad simulation first). This is a BVP platform-core improvement, not a request to create a second runner, change the production synchronization system, launch a physical iPhone test, or use PHX-CI to OPERATE BVP. Ordinary software-change qualification remains a separate Windows-based engineering gate where governed; it must not be inserted into BVP user test execution.

Governing navigation: `dev/authority/decision-register.yaml`; this workstream's `02-ARCHITECTURE.md`, `03-BUILD-DECOMPOSITION.md`, `04-VERIFICATION-PLAN.md`; `dev/planning/01-target-system/bvp-subsystem-specification.md`. Preserve BVP source/test isolation, frozen boundaries, existing complexity budgets, and the current simulator and scenario runner. If complying would exceed a hard budget, surface the proposed budget delta to the Owner before executable changes.

## Problem established from source inspection

1. **Outer physical controller hides unknown faults.** `test-platform/test/batteries/phxci-physical-bridge.ts` catches unrecognized errors and emits only `BVP_PHXCI_BRIDGE_BLOCKED unclassified-error`. The recent failed S09A attempt produced this output; it does not prove a command was published or an iPhone failed to respond.
2. **Live reply wait loses hop-level location.** `test-platform/src/live-device/live-scenario-executor.ts` returns `undefined` at deadline, mapped to `device-result-unavailable`; invalid/correlation-mismatched result returns `null`. Neither reliably states whether the command was only queued, published, consumed, executed, or answered.
3. **Transport collapses useful error categories.** `test-platform/src/live-device/drive-mailbox.ts` maps many Drive request errors to `mailbox-drive-unavailable`; relay `pumpCore` returns unavailable without carrying safe cause details.
4. **Device handler and CLI lose or risk exposing diagnostics.** `test-platform/src/live-device/device-command-agent.ts` maps handler exceptions to `command-handler-failed`. `test-platform/test/batteries/run-live-battery.ts` may write an unfiltered stack/message into its result file, which is unsuitable for portable/shared evidence.
5. **Core reporting is present, not uniformly used.** `test-platform/src/scenario/scenario-runner.ts` already records per-step status/classification/reason, and `test-platform/src/scenario/scenario-evidence.ts` creates filtered canonical evidence. Improve those shared facilities and adapters instead of replacing them.

Source references above describe observed code paths, **not** a proven root cause for the prior failed physical S09A run.

## Required outcome

For every BVP execution mode, a failure or BLOCKED verdict must report **what operation failed, exactly where observation stopped, why if known, and what remains unknown**, without exposing sensitive data or falsely asserting that device dispatch occurred. A stable machine-readable record and concise human-readable explanation must be returned by the existing BVP runtime; the planned PowerShell library consumes that record and does not invent its own diagnoses. Preserve current success, scenario semantics, fail-closed safety, and canonical evidence.

### Bounded shared diagnostic contract (design target; finalize by inspecting existing schemas)

- **Identity:** error schema/version, run ID (safe/pseudonymous in shared evidence), scenario/battery ID, step ID/index, execution mode (`deterministic`, `windows-live`, or `simulated-mobile` as grounded), component, correlation token.
- **Outcome:** `completed`, `failed`, `blocked`, or `unsupported` as applicable; stable classification/reason code, severity, retriability category (`safe-to-repeat` / `requires-reconciliation` / `not-applicable`), recommended next action when determined.
- **Position:** phase, `lastConfirmedBoundary`, `firstUnconfirmedBoundary`, and per-hop status `confirmed` / `not-observed` / `unknown`. Never report publication, execution, or delivery as facts without corresponding observations.
- **Cause:** bounded, allowlisted cause class and sanitized detail (e.g. filesystem, source identity, credential state, HTTP class/status, timeout, malformed receipt, correlation mismatch). Preserve cause chaining for internal controlled debugging without exposing raw exception text.
- **Privacy:** use an explicit public-field allowlist, redact/hash private device identities and sensitive paths, and exclude tokens, credentials, secret-bearing HTTP response bodies, vault filenames/content and raw stack traces from printed output, result envelopes, and any publishable evidence.
- **Compatibility:** extend existing canonical scenario result/evidence contracts minimally. No new independent evidence authority, runner, mailbox, or per-scenario PowerShell scripts; deterministic failures retain their existing meanings.

### Hop/phase accounting

For the Windows-hosted simulator: preflight → scenario selection → simulated device/world construction → step dispatch → production-model action → observation/assertion → result/evidence persistence.

For the existing optional external live path (diagnostics only; **do not run real iOS in this task**): preflight → controller relay outbox write → relay publication to Drive mailbox (only if observed) → device poll/claim (only if observed) → device execution (only if receipt confirms it) → response publication (only if observed) → relay inbox receipt → integrity/correlation validation → verdict/evidence persistence.

If a stage fails, preserve the last confirmed stage and classify subsequent stages UNKNOWN; a missing reply is not evidence that send failed. Explicitly distinguish **pre-dispatch failure**, **not published**, **published with unknown consumption**, **executed with missing/invalid acknowledgment**, and **definitely rejected** when evidence supports them. Do not automatically replay or clean up an outcome with uncertain external effects.

## Implementation sequence (future work, not authorized test dispatch)

1. **Inventory & baseline:** enumerate error producers, catches, reporting sinks, public/CLI result schemas, error codes, evidence projection, and operator paths across deterministic runner, simulator, agent, relay, mailbox, bridge and PowerShell-facing operations. Freeze a source-linked diagnostic and redaction matrix; classify which capabilities are currently live-only versus simulated.
2. **Regression tests first:** define failing unit/contract/adversarial cases for error phase, observed hop certainty, classification, correlation, privacy, unknown effect, and stable exit mapping before production changes. Preserve old canonical pass/fail semantics.
3. **Shared structured diagnostics:** add minimal typed error context/mapper and canonical projection reused by existing runner/evidence, with strict safe-field allowlisting, stable codes, bounded storage/output, and no raw stack in shared result files.
4. **Instrument boundary transitions:** modify existing simulator/live executor, relay, mailbox and device agent to record only verified transitions and distinct failure categories. Preserve successful-path behavior, exact-once/lease logic, and existing command IDs. Do not create new command transport.
5. **Repair entrypoints:** replace generic outer `unclassified-error` as the routine diagnosis with privacy-safe phase/classification; retain a safe `unexpected-internal-error` fallback, bounded local operator guidance, truthful failure exit codes, and a record even when primary result persistence fails. Preserve existing source and installation authenticity checks.
6. **PowerShell interface integration requirement:** specify an error mapping interface that the separate DEC-346 library can expose uniformly for *all* BVP commands (details, classifications, summary, last confirmed stage, status, run identities, exit code). Do not build the PowerShell library inside this diagnostics-only change unless separately scoped.
7. **Qualification and documentation:** run new and existing automated diagnostic/scenario tests on Windows; qualify changed software through the repository's governed engineering verification workflow if required, **separately from direct BVP operational execution**; update the diagnostic contract, scenario operator guidance and capability/coverage matrix with actual results. No real iOS, no personal vault, no real mailbox mutation for this upgrade.

## Required fault/acceptance matrix

| Injected condition / test | Required safe diagnostic behavior |
| --- | --- |
| Invalid scenario/arguments or wrong source/manifest before dispatch | Name preflight field/type or integrity class; `lastConfirmedBoundary=preflight`; no claim of sending |
| Windows-hosted simulated-device step exception | Correct scenario/step/component and deterministic failure; simulator path clearly labeled |
| Unavailable or malformed simulated state/observation | Distinct state/observation code; no fabricated PASS |
| Relay outbox write failure | Queue failure, not 'device did not respond'; no publish claim |
| Drive authentication/HTTP permission/transport outage (mocked) | Safe auth/status/network class without tokens, URLs containing secrets, or response body |
| Command published but no response by deadline (mocked) | Publish confirmed only if observable; consumption/execution UNKNOWN; no automatic redispatch |
| Mismatched/malformed/duplicate or stale receipt | Explicit validation/correlation/replay class; fail closed, retain identity of boundary |
| Device agent rejects wrong run/device/sequence | Preserve actionable rejection classification without raw private device ID |
| Device handler throws / state finalization uncertain | Structured handler/uncertain-effect class, never pretend no effects occurred |
| Result/evidence file write fails | Bounded secondary diagnostic and failure exit, no false success |
| Exception message contains OAuth token, private path, vault content or raw device ID | None of those strings appear in standard output, shared JSON or canonical evidence |
| Ordinary success and pre-existing expected-failure canaries | Unchanged functional outputs/verdicts; no new false failures or false PASS |

Every row must have a test tied to an observed output field; do not rely only on string matching a generic failure line.

## Definition of done

- Failure diagnostics identify the **first unconfirmed boundary** and last confirmed boundary wherever observable; when cause cannot be proven, report UNKNOWN explicitly and name the missing evidence.
- Distinct blocked/failed/unsupported causes survive the scenario runner, CLI and future PowerShell interface without disappearing into one generic message.
- No public result, canonical evidence, terminal output, or committed test artifact contains private device IDs, vault content, credential values, sensitive raw paths, or unchecked exception stacks.
- All listed injected fault families and honest UNKNOWN/dispatched-state distinctions pass on Windows; normal deterministic scenarios and existing passing behavior are preserved.
- Scenario/emulator errors and operator exit codes are repeatable, stable and have specific safe next steps.
- Actual source/evidence identities are preserved; nothing in this plan asserts that the historical physical failure was diagnosed, the simulator has complete iOS behavior, or any physical mobile acceptance occurred.
- Work remains **PLANNED** until implementation and verification evidence are attached; no Reviewer handoff or deployment is implied.

## Exclusions and follow-up boundaries

Separate DEC-346 work provides a complete PowerShell API parity interface; separate DEC-347 work inventories and connects each iOS/iPad-targeted scenario to the pre-existing Windows virtual-world emulator and identifies any true OS-specific gaps. Neither a phone nor PHX-CI is needed to **operate** the BVP test platform. The older S09 physical test plans are deferred by the new Owner decision; retain their records historically rather than deleting them.
