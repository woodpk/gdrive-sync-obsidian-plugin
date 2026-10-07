# Cross-Platform Hardening and Stage 3 Readiness

**Workstream:** WS-06  
**Source lineage:** accepted Phase 6 from the original Stage-1 minimum sound build decomposition.

## Objective

Exercise the complete integrated product under the failure, scale, platform, security, and interruption conditions that cannot be validated adequately before integration; correct defects; and produce objective construction evidence suitable for independent Stage 3 validation.

## Dependency position

Phase 5.

## Required end state

- The integrated product satisfies the target specification's complete build/platform, reconciliation, state/crash-safety, transfer/large-vault, destructive-safety, authentication/security, configuration/lifecycle, and asset-boundary evidence requirements.
- Windows desktop behavior and iPhone/iOS behavior are exercised on real supported runtimes for all workflows that cannot be proven by unit/integration fakes alone.
- Large-vault and large-file behavior demonstrates bounded memory/concurrency appropriate to iOS.
- Fault injection covers crashes/interruption before, during, and after content mutation/state commit, ambiguous remote outcomes, corruption, cursor loss, partial listing, remote-root deletion, clone/restore, migration, and cancellation.
- Security checks verify least-privilege OAuth, secret containment, callback isolation, no external telemetry, and absence of credentials in source/synchronized data/diagnostics.
- Destructive-safety testing includes legitimate ordinary deletions, suspicious mass deletion, legitimate bulk reorganization review, recovery checkpoints, and absence of an unsafe bypass.
- Any defects discovered within target scope are corrected and affected/broader tests rerun.
- A complete requirement-to-implementation/test evidence record is available for Stage 3, while Stage 3 remains an independent validation activity.

## Acceptance boundary

The workstream is complete only when the required end state exists and the verification obligations in `04-VERIFICATION-PLAN.md` are satisfied. This artifact preserves the accepted phase boundary; it does not redefine product behavior.
