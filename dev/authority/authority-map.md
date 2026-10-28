# Authority Map

## Purpose

This file explains authority precedence and navigation for the repository. It does not create product or architecture decisions.

## Precedence

When two artifacts materially conflict, apply the following order unless a later explicit user decision establishes a different order for the matter at issue:

1. later explicit user/product-owner decisions;
2. the authoritative finished-system contract in `dev/planning/01-target-system/`;
3. accepted material decisions in `dev/authority/decision-register.yaml`;
4. applicable repository-level contracts and governance locks under `dev/authority/`;
5. canonical workstream and verification planning under `dev/planning/`;
6. the actual repository as authoritative evidence of current implementation state;
7. current continuity state under `dev/state/`;
8. completed review output under `dev/reviews/`;
9. research under `dev/research/`;
10. non-authoritative temporary material under `dev/scratch/`.

The actual repository never overrides required target behavior, but it is authoritative evidence of what is currently implemented.

## External process authority

Shared engineering-process and repository-organization standards are not copied into this repository. Their canonical links and roles are recorded in `dev/authority/external-authorities.md`.

## Navigation

- Material decisions: `dev/authority/decision-register.yaml`
- Repository contracts: `dev/authority/contracts/`
- Governance locks/rubrics: `dev/authority/governance/`
- Authority reconciliations: `dev/authority/reconciliations/`
- Finished-system definition: `dev/planning/01-target-system/`
- Workstream decomposition: `dev/planning/02-workstreams/`
- Verification planning: `dev/planning/03-verification/`
- Current continuity state: `dev/state/current-state.yaml`
- Historical PHX-CI evidence: `dev/test-results/<runId>/`

## Current WS-07 / DEC-357 authority navigation

The Owner's 2026-10-28 **Option A** choice is recorded as DEC-357 in `dev/authority/decision-register.yaml`. The complete successor **BVP_WINDOWS_CONTROLLER_OAUTH** design/requirements are in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md`, which supplements `dev/planning/01-target-system/bvp-subsystem-specification.md` and its requirement traceability. This is validation-only, distinct from the production WS-03 Google/OAuth boundary. Its state is subordinate to the DEC-356 corrective independent review and actual GitHub source/evidence: **new source remains unverified**. Preserve immutable old `dev/reviews/` reports and `dev/test-results/`, and defer all real Drive, physical tests and promotion until the separate Owner gates.
