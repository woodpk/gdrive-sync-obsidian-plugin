# Workstreams

Purpose: canonical whole-system build decomposition.

Allowed artifact classes: `00-INDEX.md`, `requirement-workstream-coverage.md`, and numbered workstream directories.

Each workstream directory must contain `00-WORKSTREAM.md`, `01-SCOPE.md`, `02-ARCHITECTURE.md`, `03-BUILD-DECOMPOSITION.md`, and `04-VERIFICATION-PLAN.md`. An optional `tasks/` directory is permitted only when durable task or agent-prompt artifacts genuinely need to persist.

Prohibited artifact classes: a separate project-level build-decomposition hierarchy, a standardized `dev/agents/` replacement, PHX-CI run results, or authority decisions.

Authority status: workstreams are implementation-planning artifacts subordinate to target-system and decision authority.

Naming: `WS-##-<kebab-case-name>`, beginning with `WS-01` and increasing monotonically within the active decomposition.


## Current WS-07 successor scope

The 2026-10-28 Owner Option A decision added [DEC-357, BVP_WINDOWS_CONTROLLER_OAUTH](WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md), a **new bounded Build Unit inside existing WS-07**, not a new project workstream or change to production WS-03. WCO-001–011 requirements and WCO-01–06 sequencing are mapped into the canonical WS-07 workstream and verification plans. Existing code/tests are committed but **unverified**; no PHX-CI or Reviewer acceptance yet.

