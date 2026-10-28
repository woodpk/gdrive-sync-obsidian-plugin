# Planning

Purpose: current target-system definition, workstream decomposition, requirement coverage, and verification planning derived from project authority.

Allowed artifact classes: target-system specifications and traceability, canonical workstreams and their build decompositions, requirement-to-workstream coverage, and Stage-1/whole-project verification planning.

Prohibited artifact classes: historical PHX-CI execution output, completed review reports, ad hoc task hierarchies outside owning workstreams, or material decisions that belong in the decision register.

Authority status: planning is subordinate to accepted authority and may not silently contradict current decisions.

Naming: use the exact canonical `01-target-system/`, `02-workstreams/`, and `03-verification/` structure. Workstream directories use `WS-##-<kebab-case-name>`.


## Current authorized new build unit

`WS-07/BVP_WINDOWS_CONTROLLER_OAUTH` (Owner DEC-357, 2026-10-28): [standalone task contract and requirements](02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md). Indexed under WS-07, with BVP target specification, traceability, architecture, full build decomposition and verification coverage. This is **draft implementation, first PHX-CI BLOCKED (run `422cc526-615e-4848-8566-9f4152b5126e`), NOT QUALIFIED**, and is not a production WS-03 OAuth feature. The current-state file records the exact Builder ownership and next qualification gates.

