# Agent-to-Agent Communication — Active Handoff

## Current Authority

The repository is in Stage 2A / Phase 6, inside the DEC-329 pre-S09 closure gate. The active testing-platform architecture is the BRAIN Verification Platform (BVP), governed by the current testing-platform planning documents, `dev/governance/testing-platform-boundary.yaml`, and locked decisions in `dev/planning-and-building/decision-register.yaml`.

The BRAIN product target specification, decision register, build decomposition, Phase-6 synchronization contracts, project state, and later explicit user decisions remain controlling for their scopes.

## Historical Validation Harness

The former internal Phase-6 validation-harness architecture is superseded. `dev/archive/**` is historical/non-authoritative and must not be used as current tasking, implementation architecture, or a design template unless a supervisor explicitly requests a bounded historical lookup.

Earlier standalone S01 verification/bootstrap scripts are no longer active verification authority. Git history and archive material preserve provenance.

## Current Transition State

- BVP-S08 is closed / accepted as the predecessor platform-construction milestone.
- The completed BVP entered the DEC-329 independent final-review and targeted-correction gate before S09.
- Final-review corrections are isolated from `phase6-integration` and `master` until independent correction review and authoritative PHX-CI verification complete.
- S09 physical validation has not begun.
- Stage 3 has not begun and is not authorized.

## Immediate Next Action

Complete independent review of the exact final-review correction candidate. If the correction review passes, perform one authoritative PHX-CI verification of that exact reviewed SHA through the deployed runtime selected by the target branch's `phx-ci.json` framework pin. Only after that accepted candidate passes may the supervisor proceed to semantic reconciliation with the exact then-current `master`, followed by PHX-CI verification of the merged candidate and safe promotion.

Do not begin S09 or Stage 3 before the DEC-329 closure sequence is complete.

## Standing Execution Rules

- PHX-CI is the sole authoritative executable verification/CI-like acceptance framework.
- Do not use GitHub Actions for BVP build, test, verification, or evidence workflows.
- Do not run repository tests, builds, typechecks, architecture guards, architecture metrics, or equivalent executable validation directly as an acceptance substitute; route them through PHX-CI.
- The generic architecture guard and architecture metrics remain repository-controlled project checks invoked through the PHX-CI repository-check path.
- Do not reintroduce scenario orchestration, distributed runner state, evidence engines, cross-device coordinators, or test persistence inside production.
- Complexity-budget increases or new framework-level runner/router/coordination/persistence architecture require explicit architecture approval before implementation.
- Ordinary production `src/**` must not import or ship BVP test-platform code.
