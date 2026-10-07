# Engineering Scripts

Purpose: repository-controlled engineering scripts.

Allowed artifact classes: scripts that invoke, configure, operate, or publish PHX-CI execution, plus non-validation engineering automation that does not create a competing validation authority.

Prohibited artifact classes: validation scripts that independently determine correctness, compliance, completeness, safety, readiness, acceptance, or promotion outside PHX-CI; task-prompt libraries; historical evidence; and project-state journals.

Authority status: scripts are executable tooling, not governing product authority.

Naming: PHX-CI operating scripts use `Invoke-PHXCI-<scope>.ps1` where applicable. Other permitted engineering scripts use clear verb-noun names consistent with repository conventions.
