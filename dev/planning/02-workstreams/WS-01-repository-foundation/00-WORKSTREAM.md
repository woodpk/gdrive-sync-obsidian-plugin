# Repository Foundation and Frozen Shared Contracts

**Workstream:** WS-01  
**Source lineage:** accepted Phase 1 from the original Stage-1 minimum sound build decomposition.

## Objective

Establish a buildable, testable, mobile-compatible Obsidian plugin repository and the stable cross-workstream contracts required for safe parallel implementation.

## Dependency position

None beyond the authoritative Stage 1 artifacts and donor/source grounding.

## Required end state

- The repository has a functioning TypeScript/JavaScript/npm Obsidian-plugin build and automated-test baseline.
- The plugin manifest/runtime baseline is explicitly mobile-compatible and does not require desktop-only execution.
- The engineering strategy for adopting/reusing donor code is selected and reflected in the actual repository without importing donor behavior that contradicts the target specification.
- Logical ownership boundaries from the target specification are represented in the codebase sufficiently to prevent synchronization policy from being embedded directly in Google Drive, Obsidian I/O, or UI code.
- The shared contracts in Section 4 exist in source and are stable enough for Phases 2, 3, and 4 to implement independently.
- Test doubles/fakes or equivalent contract-testing seams exist so each parallel workstream can be tested without requiring the other workstreams to be complete.
- The baseline contains no credentials or developer-controlled telemetry.

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
