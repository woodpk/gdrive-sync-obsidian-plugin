# Workstreams

Purpose: canonical whole-system build decomposition.

Allowed artifact classes: `00-INDEX.md`, `requirement-workstream-coverage.md`, and numbered workstream directories.

Each workstream directory must contain `00-WORKSTREAM.md`, `01-SCOPE.md`, `02-ARCHITECTURE.md`, `03-BUILD-DECOMPOSITION.md`, and `04-VERIFICATION-PLAN.md`. An optional `tasks/` directory is permitted only when durable task or agent-prompt artifacts genuinely need to persist.

Prohibited artifact classes: a separate project-level build-decomposition hierarchy, a standardized `dev/agents/` replacement, PHX-CI run results, or authority decisions.

Authority status: workstreams are implementation-planning artifacts subordinate to target-system and decision authority.

Naming: `WS-##-<kebab-case-name>`, beginning with `WS-01` and increasing monotonically within the active decomposition.
