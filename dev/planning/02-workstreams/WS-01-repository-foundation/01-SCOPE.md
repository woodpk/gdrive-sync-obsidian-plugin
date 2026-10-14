# Scope — Repository Foundation and Frozen Shared Contracts

## Authorized responsibility

- The repository has a functioning TypeScript/JavaScript/npm Obsidian-plugin build and automated-test baseline.
- The plugin manifest/runtime baseline is explicitly mobile-compatible and does not require desktop-only execution.
- The engineering strategy for adopting/reusing donor code is selected and reflected in the actual repository without importing donor behavior that contradicts the target specification.
- Logical ownership boundaries from the target specification are represented in the codebase sufficiently to prevent synchronization policy from being embedded directly in Google Drive, Obsidian I/O, or UI code.
- The shared contracts in Section 4 exist in source and are stable enough for Phases 2, 3, and 4 to implement independently.
- Test doubles/fakes or equivalent contract-testing seams exist so each parallel workstream can be tested without requiring the other workstreams to be complete.
- The baseline contains no credentials or developer-controlled telemetry.

## Starting assumptions and prerequisites

- The target-system specification and decision register are authoritative.
- The repository contains no existing product implementation to preserve.
- Google Drive Mirror is the primary engineering foundation/baseline; Google Drive Merge Sync is a secondary donor/reference.
- The direct-fork versus adaptation/transplant strategy remains an engineering decision and is resolved here through repository and donor inspection rather than by product authority.

## Explicit exclusions

- Do not implement complete synchronization behavior.
- Do not implement the complete Google Drive/OAuth integration.
- Do not implement the complete Obsidian filesystem/configuration integration.
- Do not implement the final user interface or onboarding workflows.
- Do not add speculative abstractions unrelated to a target requirement or cross-phase dependency.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
