# Engineering Scripts

Purpose: repository-controlled engineering and PHX-CI operating scripts only.

Allowed artifact classes: scripts that invoke, configure, operate, or publish PHX-CI execution, plus non-validation engineering automation that does not create a competing validation authority.

Prohibited artifact classes: scripts that independently determine correctness, compliance, completeness, safety, readiness, acceptance, or promotion; task-specific or scenario-specific verifier scripts; task-prompt libraries; historical evidence; and project-state journals.

BVP architecture guard and metrics logic is not implemented here. It lives in `test-platform/src/architecture-governance.ts` and is consumed only through `test-platform/src/repository-check.ts` inside PHX-CI.

Authority status: scripts are executable tooling, not governing product or validation authority.

Naming: PHX-CI operating scripts use `Invoke-PHXCI-<scope>.ps1` where applicable. Other permitted engineering scripts use clear verb-noun names consistent with repository conventions.

## BVP battery operators

Generic BVP battery operating scripts may live here when they only compile/invoke the canonical BVP implementation and record its returned evidence/exit status. They MUST NOT encode scenario-specific correctness rules or create a competing validation authority.

Battery definitions, assertions, and validation semantics remain under `test-platform/`. The generic operator entrypoint is `Invoke-BVP-Battery.ps1`.

Every BVP battery run persists a self-contained result directory at:

`dev/Test-Results/<run-id>/`

The standard package contains:

- `result.json` — complete machine-readable battery/BVP result.
- `result.md` — human-readable run summary and execution metadata.
- `terminal.log` — complete compilation and BVP execution output.
- `checkpoint.json` — only when the live BVP creates checkpoint/resume state.

After finalizing the package, `Invoke-BVP-Battery.ps1` stages only that run directory, commits it, and pushes the result commit to the currently checked-out branch on `origin`. A BVP run therefore produces both visible terminal output and durable repository evidence under `dev/Test-Results/`.
