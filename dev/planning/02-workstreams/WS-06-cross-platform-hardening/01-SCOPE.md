# Scope — Cross-Platform Hardening and Stage 3 Readiness

## Authorized responsibility

- The integrated product satisfies the target specification's complete build/platform, reconciliation, state/crash-safety, transfer/large-vault, destructive-safety, authentication/security, configuration/lifecycle, and asset-boundary evidence requirements.
- Windows desktop behavior and iPhone/iOS behavior are exercised on real supported runtimes for all workflows that cannot be proven by unit/integration fakes alone.
- Large-vault and large-file behavior demonstrates bounded memory/concurrency appropriate to iOS.
- Fault injection covers crashes/interruption before, during, and after content mutation/state commit, ambiguous remote outcomes, corruption, cursor loss, partial listing, remote-root deletion, clone/restore, migration, and cancellation.
- Security checks verify least-privilege OAuth, secret containment, callback isolation, no external telemetry, and absence of credentials in source/synchronized data/diagnostics.
- Destructive-safety testing includes legitimate ordinary deletions, suspicious mass deletion, legitimate bulk reorganization review, recovery checkpoints, and absence of an unsafe bypass.
- Any defects discovered within target scope are corrected and affected/broader tests rerun.
- A complete requirement-to-implementation/test evidence record is available for Stage 3, while Stage 3 remains an independent validation activity.

## Starting assumptions and prerequisites

- Phase 5 has produced the complete integrated product.
- All earlier phase acceptance criteria have passed.
- The current repository, not prior phase summaries, is treated as the implementation authority for this phase.

## Explicit exclusions

- Do not redefine target requirements to match implementation defects.
- Do not add speculative features.
- Do not treat this phase as the independent Stage 3 validation; it prepares evidence and a conformant candidate for that separate review.

## Boundary rule

Implementation within this workstream remains subordinate to the target-system specification, the decision register, inherited repository contracts, and dependency ownership recorded in `00-WORKSTREAM.md`.
