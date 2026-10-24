# Engineering Scripts

Purpose: repository-controlled engineering and PHX-CI operating scripts only.

Allowed artifact classes: scripts that invoke, configure, operate, or publish PHX-CI execution, plus non-validation engineering automation that does not create a competing validation authority.

Prohibited artifact classes: scripts that independently determine correctness, compliance, completeness, safety, readiness, acceptance, or promotion; task-specific or scenario-specific verifier scripts; task-prompt libraries; historical evidence; and project-state journals.

BVP architecture guard and metrics logic is not implemented here. It lives in `test-platform/src/architecture-governance.ts` and is consumed only through `test-platform/src/repository-check.ts` inside PHX-CI.

Authority status: scripts are executable tooling, not governing product or validation authority.

Naming: PHX-CI operating scripts use `Invoke-PHXCI-<scope>.ps1` where applicable. Other permitted engineering scripts use clear verb-noun names consistent with repository conventions.

## DEC-350 operator runbook (current as of 2026-10-24)

**Every assigned BVP Builder/operator session must freshly read root `AGENTS.md` and `dev/planning/03-verification/bvp-operator-runbook.md` before preparing a PowerShell invocation.** Source-level audit: `dev/research/bvp-operator-api-audit-2026-10-24.md`. Authoritative later Owner DEC-350 selects direct invocation of existing compiled **BVP Node deterministic battery CLI** from audited PowerShell, instead of constructing a full PowerShell adapter just to run existing batteries. Earlier documentation below concerning PHX-CI as the only **BVP operator** is historical where conflicting; it remains strictly applicable to **source-change software acceptance** and prior physical safety restrictions.

Current source: `test-platform/test/batteries/run-deterministic-battery.ts` (`--battery`, `--result-file`, `--tap-file`). Do not invent `--scenario` or `--list` flags. The existing 2 `Invoke-BVP-*.ps1` files still **throw** and must not be launched. The real-device `run-live-battery.ts` exists but remains **not authorized** for physical/Drive/vault execution and does not provide the desired Windows-hosted iOS simulator. A direct BVP operator result is not a PHX-CI/Reviewer source-change acceptance result.

## BVP battery operators

F1 resolution (PR #150): `Invoke-BVP-Battery.ps1` and `Invoke-BVP-Deterministic-Battery.ps1` are **fail-closed compatibility sentinels**, not operators. Neither compiles, executes tests or physical scenarios, creates results, or commits/pushes evidence. Any future execution must be a PHX-CI-owned stage or explicitly PHX-CI-coordinated adapter, with PHX-CI-issued evidence. Do not revive standalone BVP validation authority.

Battery registries and operator-facing execution support live under `test-platform/test/batteries/`; declarative live cases live under `test-platform/scenarios/live/`; canonical runner, checkpoint, live-executor, and evidence semantics remain in the existing BVP core rather than the PowerShell operators.

### Live physical batteries

Retired, fail-closed historical entrypoint (not executable as a battery runner):

`Invoke-BVP-Battery.ps1`

Registered live batteries currently include:

- `windows-live-smoke`
- `s09a-dual-device-readiness`
- `s09a-ios-initial-sync`
- `s09a-windows-initial-sync`
- `s09b-bidirectional-sync`
- `s09b-clean-text-merge`
- `s09c-offline-reconnect`
- `s09c-interruption-resume`
- `s09d-unicode-path-roundtrip`
- `s09d-large-transfer`
- `s09e-auth-revocation-restore`
- `s09e-plugin-disable-reenable`
- `s09e-uninstall-reinstall`

When an approved PHX-CI physical-battery adapter exists, batteries requiring a genuinely physical operator/provider/OS transition will stop at an external BVP checkpoint rather than synthesizing that transition. PHX-CI must coordinate initial attempts, durable checkpoint publication, and resume using the same run identity and bounded evidence tokens. **Live physical execution is currently BLOCKED**, not accepted or silently replaced by deterministic tests. Any resume carrying `human-confirmation` must also provide a short `-ResumeEvidenceNote` describing the observed physical action/outcome; credentials, tokens, and authorization codes must never be included.

Live battery relay commands retain a 60-second default response window. Production execution has a separate **10-minute default** receipt window (`-ProductionResultTimeoutMs`) because an authorized multi-operation synchronization may legitimately exceed the routine command deadline. Expiration remains `device-result-unavailable`, never proof that the physical effect failed.

A timed-out live production-execute step can be continued only with the exact retained terminal receipt and the prior blocked run, using `-RecoverTimedOutRun -RunId <original-run-id>`. This mode verifies correlation (command ID, sequence, device, run, source), complete/verified production receipt, and empty pending queues before replaying earlier completed steps **without dispatching them**. It executes only the remaining scenario observations and assertions. It requires the original controller lease to be safely released, does not accept human checkpoint resume, and preserves the original `result.json` and `result.md` unchanged. Continuation is separately recorded as `late-completion-result.json` and `late-completion-result.md`, plus an additional attempt's terminal evidence. A late receipt never retroactively changes the original battery verdict.

A future PHX-CI-coordinated checkpointed run will preserve all attempts under:

`dev/test-results/<run-id>/attempts/attempt-###/`

The future adapter must retain the current `result.json`, `result.md`, and BVP `checkpoint.json` without changing earlier attempt verdicts.

### Deterministic batteries

Retired, fail-closed historical entrypoint (not executable as a battery runner):

`Invoke-BVP-Deterministic-Battery.ps1`

Supported automated BVP checks remain accessible via the pinned PHX-CI `test-focused` stage using `npm run test:bvp-root`. Selective battery execution requires a future PHX-CI-coordinated adapter; do not run the Node CLI directly for acceptance.

Registered deterministic batteries are:

- `platform-core`
- `s06-sync-semantics`
- `s07-fault-recovery-safety`
- `s08-live-platform-infrastructure`
- `all-platform-tests`

These are logical groupings over the existing automated BVP test-platform suite. They do not replace the underlying tests or create parallel correctness logic.

## Persisted results

An authorized future PHX-CI-coordinated physical battery run must persist a self-contained result directory at:

`dev/test-results/<run-id>/`

A future PHX-CI-owned live result package will contain the current machine-readable result, human-readable summary, checkpoint state when applicable, and complete per-attempt terminal output.

PHX-CI-controlled deterministic execution produces canonical PHX-CI result evidence; a future battery-specific package may contain:

- `result.json` — machine-readable battery summary.
- `result.md` — human-readable run summary and execution metadata.
- `terminal.log` — complete compile/battery terminal output.
- `test-output.tap` — complete Node test-runner TAP output.

The retired standalone operators no longer create or publish packages. All software-validation verdicts and evidence publication must come from PHX-CI. For a future PHX-CI-owned physical adapter, checkpoint/attempt artifacts must be handed back to PHX-CI for durable publication before any human-resume action. GitHub Actions are not used.
