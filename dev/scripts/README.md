# Engineering Scripts

Purpose: repository-controlled engineering and PHX-CI operating scripts only.

Allowed artifact classes: scripts that invoke, configure, operate, or publish PHX-CI execution, plus non-validation engineering automation that does not create a competing validation authority.

Prohibited artifact classes: scripts that independently determine correctness, compliance, completeness, safety, readiness, acceptance, or promotion; task-specific or scenario-specific verifier scripts; task-prompt libraries; historical evidence; and project-state journals.

BVP architecture guard and metrics logic is not implemented here. It lives in `test-platform/src/architecture-governance.ts` and is consumed only through `test-platform/src/repository-check.ts` inside PHX-CI.

Authority status: scripts are executable tooling, not governing product or validation authority.

Naming: PHX-CI operating scripts use `Invoke-PHXCI-<scope>.ps1` where applicable. Other permitted engineering scripts use clear verb-noun names consistent with repository conventions.
