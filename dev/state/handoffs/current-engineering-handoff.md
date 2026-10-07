# Current Engineering Handoff

## Current state

The completed automated testing platform is represented by `automated-testing-platform-branch` at exact green source SHA `5b57c1ded6d314810ac2cca2a363342e67d9bee3`. Its full fresh PHX-CI comparison run passed at run ID `38b52d07-dce9-4e2f-aa61-3fd7188703f7`.

The repository is now in a separate, cross-cutting `dev/**` standardization migration. This migration began from that exact green source. It is organizational/governance work; it does not reopen product behavior or BVP architecture.

## Completed standardization phases

1. Phase 1 — froze the source and classified all 844 tracked legacy `dev/**` files with zero unresolved dispositions.
2. Phase 2 — established the canonical `dev/**` directory skeleton and directory READMEs.
3. Phase 3 — established the canonical authority hierarchy, external-authority references, contracts, governance lock, and superseding repository-organization decisions.
4. Phase 4 — established the canonical target-system/workstream/verification planning hierarchy with WS-01 through WS-07.
5. Phase 5 — replaced stale continuity state with `dev/state/current-state.yaml`, established this concise handoff, and moved the historical supervisor continuity journal outside active `dev/`.

## Current authority and continuity

- Decisions: `dev/authority/decision-register.yaml`
- Target system: `dev/planning/01-target-system/target-system-specification.md`
- Workstream decomposition: `dev/planning/02-workstreams/00-INDEX.md`
- BVP subsystem: `dev/planning/01-target-system/bvp-subsystem-specification.md`
- BVP governance lock: `dev/authority/governance/locks/testing-platform-boundary.yaml`
- Current continuity state: `dev/state/current-state.yaml`

Legacy project-state, supervisor-journal, and agent-handoff locations are non-authoritative migration surfaces.

## Immediate next action

Execute standardization Phase 6: retire `dev/agents/`, `dev/prompts/`, and the standalone `dev/security-prompt-header.md` from active `dev/`; preserve their historical material under `archive/pre-standard-dev-layout-2026-10/DEV/`; and keep future durable task prompts only under the owning workstream's optional `tasks/` directory.

Do not begin S09 or Stage 3 as part of this cleanup. Final comprehensive PHX-CI verification remains reserved for the completed repository-wide migration.
