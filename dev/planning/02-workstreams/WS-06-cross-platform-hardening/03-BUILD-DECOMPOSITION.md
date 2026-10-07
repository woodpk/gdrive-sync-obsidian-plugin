# Build Decomposition — Cross-Platform Hardening and Stage 3 Readiness

## Status

The original project was constructed before adoption of the canonical workstream directory standard. The accepted Phase 6 definition below is therefore preserved as this workstream's source decomposition. Existing accepted implementation is not reopened merely by this migration.

For future unfinished or corrective work, the active supervisor must split work into execution-sized build units against current repository reality before dispatch; durable task prompts, if genuinely needed, belong only under this workstream's optional `tasks/` directory.

## Accepted source decomposition

## Cross-Platform Hardening and Stage 3 Readiness

### 10.1 Objective

Exercise the complete integrated product under the failure, scale, platform, security, and interruption conditions that cannot be validated adequately before integration; correct defects; and produce objective construction evidence suitable for independent Stage 3 validation.

### 10.2 Starting Assumptions and Prerequisites

- Phase 5 has produced the complete integrated product.
- All earlier phase acceptance criteria have passed.
- The current repository, not prior phase summaries, is treated as the implementation authority for this phase.

### 10.3 Required End State

- The integrated product satisfies the target specification's complete build/platform, reconciliation, state/crash-safety, transfer/large-vault, destructive-safety, authentication/security, configuration/lifecycle, and asset-boundary evidence requirements.
- Windows desktop behavior and iPhone/iOS behavior are exercised on real supported runtimes for all workflows that cannot be proven by unit/integration fakes alone.
- Large-vault and large-file behavior demonstrates bounded memory/concurrency appropriate to iOS.
- Fault injection covers crashes/interruption before, during, and after content mutation/state commit, ambiguous remote outcomes, corruption, cursor loss, partial listing, remote-root deletion, clone/restore, migration, and cancellation.
- Security checks verify least-privilege OAuth, secret containment, callback isolation, no external telemetry, and absence of credentials in source/synchronized data/diagnostics.
- Destructive-safety testing includes legitimate ordinary deletions, suspicious mass deletion, legitimate bulk reorganization review, recovery checkpoints, and absence of an unsafe bypass.
- Any defects discovered within target scope are corrected and affected/broader tests rerun.
- A complete requirement-to-implementation/test evidence record is available for Stage 3, while Stage 3 remains an independent validation activity.

### 10.4 Principal Contracts and Invariants Introduced or Preserved

No new product semantics are introduced. Phase 6 validates and hardens all requirements and all `INV-001` through `INV-020` against the complete implementation.

### 10.5 Dependencies

Phase 5.

### 10.6 Acceptance Criteria

- Reproducible clean build and complete automated test suite pass.
- Required Windows and iPhone/iOS functional scenarios pass.
- Target Specification §13.1 through §13.7 completion-evidence categories are satisfied with recorded objective evidence.
- Fault-injection/crash-safety tests pass without silent data loss or false-success state.
- Large-vault/large-file tests meet bounded-resource requirements on representative constrained/mobile conditions.
- Security/privacy checks pass and no secret or vault-content telemetry leakage is present.
- Full requirement traceability has no unassigned or untested material requirement before Stage 3 handoff.
- No known Critical or Major construction-scope defect remains unresolved when the implementation is handed to Stage 3.

### 10.7 Non-Goals

- Do not redefine target requirements to match implementation defects.
- Do not add speculative features.
- Do not treat this phase as the independent Stage 3 validation; it prepares evidence and a conformant candidate for that separate review.

