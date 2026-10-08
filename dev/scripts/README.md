# Engineering Scripts

Purpose: repository-controlled engineering and PHX-CI operating scripts only.

Allowed artifact classes: scripts that invoke, configure, operate, or publish PHX-CI execution, plus non-validation engineering automation that does not create a competing validation authority.

Prohibited artifact classes: scripts that independently determine correctness, compliance, completeness, safety, readiness, acceptance, or promotion; task-specific or scenario-specific verifier scripts; task-prompt libraries; historical evidence; and project-state journals.

BVP architecture guard and metrics logic is not implemented here. It lives in `test-platform/src/architecture-governance.ts` and is consumed only through `test-platform/src/repository-check.ts` inside PHX-CI.

Authority status: scripts are executable tooling, not governing product or validation authority.

Naming: PHX-CI operating scripts use `Invoke-PHXCI-<scope>.ps1` where applicable. Other permitted engineering scripts use clear verb-noun names consistent with repository conventions.

## BVP battery operators

Generic BVP battery operators may live here when they only compile/invoke the canonical BVP implementation and record its returned evidence/exit status. They MUST NOT duplicate product synchronization policy or create a competing validation authority.

Battery registries and execution machinery remain under `test-platform/src/batteries/`; declarative live cases remain under `test-platform/scenarios/live/`; assertions, checkpoint semantics, and evidence semantics remain inside the BVP rather than the PowerShell operators.

### Live physical batteries

Entry point:

`Invoke-BVP-Battery.ps1`

Registered live batteries currently include:

- `windows-live-smoke`
- `s09a-dual-device-readiness`
- `s09b-bidirectional-sync`
- `s09b-clean-text-merge`
- `s09c-offline-reconnect`
- `s09c-interruption-resume`
- `s09d-unicode-path-roundtrip`
- `s09d-large-transfer`
- `s09e-auth-revocation-restore`
- `s09e-plugin-disable-reenable`
- `s09e-uninstall-reinstall`

Batteries requiring a genuinely physical operator/provider/OS transition stop at an external BVP checkpoint rather than synthesizing that transition. The initial attempt is persisted and uploaded with exit code 3. Resume uses the same Run ID plus the bounded evidence tokens requested by the checkpoint.

A checkpointed run preserves all attempts under:

`dev/Test-Results/<run-id>/attempts/attempt-###/`

The run root retains the current `result.json`, `result.md`, and BVP `checkpoint.json`.

### Deterministic batteries

Entry point:

`Invoke-BVP-Deterministic-Battery.ps1`

Registered deterministic batteries are:

- `platform-core`
- `s06-sync-semantics`
- `s07-fault-recovery-safety`
- `s08-live-platform-infrastructure`
- `all-platform-tests`

These are logical groupings over the existing automated BVP test-platform suite. They do not replace the underlying tests or create parallel correctness logic.

## Persisted results

Every battery run persists a self-contained result directory at:

`dev/Test-Results/<run-id>/`

A live result package contains the current machine-readable result, human-readable summary, checkpoint state when applicable, and complete per-attempt terminal output.

A deterministic result package contains:

- `result.json` — machine-readable battery summary.
- `result.md` — human-readable run summary and execution metadata.
- `terminal.log` — complete compile/battery terminal output.
- `test-output.tap` — complete Node test-runner TAP output.

After each run/attempt, the operator stages only that run directory, commits it, and pushes the result commit to the currently checked-out branch on `origin`. GitHub Actions are not used.
