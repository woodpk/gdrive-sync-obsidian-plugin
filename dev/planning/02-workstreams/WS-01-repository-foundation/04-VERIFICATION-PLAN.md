# Verification Plan — Repository Foundation and Frozen Shared Contracts

## Objective completion evidence

- A clean checkout installs dependencies, builds, and runs the initial automated test suite successfully.
- The plugin baseline is configured to support both desktop and mobile Obsidian.
- Automated architecture/contract checks or equivalent inspection demonstrate that mobile-required paths do not depend on desktop-only facilities.
- Every Section 4 shared contract is present and exercised by at least one contract/unit test or fake-based compile/test path.
- Phase 2, Phase 3, and Phase 4 implementation can begin without needing to invent or independently redefine cross-workstream semantics.
- No target-system product requirement is weakened by the selected donor-code strategy.

## Verification authority

Authoritative executable acceptance is through PHX-CI under DEC-334. Workstream-specific tests, repository checks, architecture checks, build checks, and artifacts are evidence consumed by PHX-CI rather than independent validation authorities.

## Whole-project evidence relationship

See `../../03-verification/verification-plan.md` and `../requirement-workstream-coverage.md` for cross-workstream evidence ownership and target requirement coverage.
