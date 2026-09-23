# Agent-to-Agent Communication — Active Handoff

## Current Authority

The repository is in Stage 2A / Phase 6. The active testing-platform architecture is the BRAIN Verification Platform (BVP), defined by the active testing-platform planning documents and dev/governance/testing-platform-boundary.yaml.

The BRAIN product target specification, decision register, build decomposition, Phase-6 synchronization architecture/frozen contracts, and later explicit user decisions remain controlling for their scopes.

## Legacy Validation Harness

The former internal Phase-6 validation harness architecture is superseded. Its tasking, planning, harness-specific evidence, and related development artifacts were moved beneath dev/archive/legacy-validation-harness/ during BVP-S01.

dev/archive/ is historical/non-authoritative. Do not use archived harness material as current tasking, implementation architecture, or a design template unless a supervisor explicitly requests a bounded historical lookup.

## Current Transition State

- BVP-S01 start: phase6-integration at efb9a0bb88084d706dc535f2826e4df956cfd57d.
- BVP planning/anti-drift authority: persisted.
- Legacy dev harness authority: archived/superseded.
- Local S01 verification: required before BVP-S02 dispatch.
- Stage 3: not started and not authorized.

## Immediate Next Action

Run dev/scripts/Invoke-BvpS01AuthorityArchiveVerification.ps1 through the committed bootstrap. If and only if it passes and the resulting dev/_ca-output.md evidence is committed/pushed to phase6-integration, generate the executable BVP-S02 prompt against that exact verified head.

## Standing Execution Rules

- Do not use GitHub Actions.
- Build/test/verification/evidence workflows use repository-controlled PowerShell under dev/scripts/ and write canonical evidence to dev/_ca-output.md.
- Do not reintroduce scenario orchestration, distributed runner state, evidence engines, cross-device coordinators, or test persistence inside production merely because an individual scenario would be easier to implement that way.
- From BVP-S03 onward, architecture guard + metrics are mandatory for every implementation session.
- Complexity-budget increases or new framework-level runner/router/coordination/persistence architecture require explicit architecture approval before implementation.
