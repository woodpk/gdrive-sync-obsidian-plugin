# Build Decomposition — Repository Foundation and Frozen Shared Contracts

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 1 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Repository Foundation and Frozen Shared Contracts

### 5.1 Objective

Establish a buildable, testable, mobile-compatible Obsidian plugin repository and the stable cross-workstream contracts required for safe parallel implementation.

### 5.2 Starting Assumptions and Prerequisites

- The target-system specification and decision register are authoritative.
- The repository contains no existing product implementation to preserve.
- Google Drive Mirror is the primary engineering foundation/baseline; Google Drive Merge Sync is a secondary donor/reference.
- The direct-fork versus adaptation/transplant strategy remains an engineering decision and is resolved here through repository and donor inspection rather than by product authority.

### 5.3 Required End State

- The repository has a functioning TypeScript/JavaScript/npm Obsidian-plugin build and automated-test baseline.
- The plugin manifest/runtime baseline is explicitly mobile-compatible and does not require desktop-only execution.
- The engineering strategy for adopting/reusing donor code is selected and reflected in the actual repository without importing donor behavior that contradicts the target specification.
- Logical ownership boundaries from the target specification are represented in the codebase sufficiently to prevent synchronization policy from being embedded directly in Google Drive, Obsidian I/O, or UI code.
- The shared contracts in Section 4 exist in source and are stable enough for Phases 2, 3, and 4 to implement independently.
- Test doubles/fakes or equivalent contract-testing seams exist so each parallel workstream can be tested without requiring the other workstreams to be complete.
- The baseline contains no credentials or developer-controlled telemetry.

### 5.4 Principal Contracts and Invariants Introduced or Preserved

- Preserve the target specification's authority over donor code.
- Preserve mobile-safe dependency direction.
- Freeze snapshot, plan, local-vault, Drive, state, conflict, execution-result, status, and audit semantics before parallel work begins.
- Keep product policy in synchronization/planning contracts rather than transport or UI adapters.
- Ensure no shared interface embeds timestamp-winner, unsafe deletion, broad Drive-scope, desktop-token-transfer, or other superseded donor semantics.

### 5.5 Dependencies

None beyond the authoritative Stage 1 artifacts and donor/source grounding.

### 5.6 Acceptance Criteria

- A clean checkout installs dependencies, builds, and runs the initial automated test suite successfully.
- The plugin baseline is configured to support both desktop and mobile Obsidian.
- Automated architecture/contract checks or equivalent inspection demonstrate that mobile-required paths do not depend on desktop-only facilities.
- Every Section 4 shared contract is present and exercised by at least one contract/unit test or fake-based compile/test path.
- Phase 2, Phase 3, and Phase 4 implementation can begin without needing to invent or independently redefine cross-workstream semantics.
- No target-system product requirement is weakened by the selected donor-code strategy.

### 5.7 Non-Goals

- Do not implement complete synchronization behavior.
- Do not implement the complete Google Drive/OAuth integration.
- Do not implement the complete Obsidian filesystem/configuration integration.
- Do not implement the final user interface or onboarding workflows.
- Do not add speculative abstractions unrelated to a target requirement or cross-phase dependency.

