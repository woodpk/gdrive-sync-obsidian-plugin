# Testing-Governance Setup Exception — Owner Authorization and Limits

**Date:** 2026-10-17  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Audited baseline:** master `b1e2ebaee3077e34a4eefaf601ee8124078b7400`  
**Audited report-only commit:** `10122d3968694a54f3004ad8c7e5cc990253f9fa`  
**Isolated corrective candidate:** `repair/testing-governance-ptar-v2-20261017`.

## Owner authorization

After receiving the independent test-governance audit and an initial partial supervisor remediation, the human owner explicitly directed a **single-session, setup-only exception**: the independent-testing supervisor itself should correct all seven findings now rather than wait for a second test-authoring agent. This instruction authorizes bounded test-specific source/configuration fixes, the frozen BVP repository-check surface, the PHX-CI consumer taskfile, and the associated governance/planning corrections on an isolated branch. It does NOT authorize production-source edits, GitHub Actions verification, standalone test execution, rewriting historical evidence, installed-product changes, merging, release, activation, Stage 3, or fabricating independent PHX-CI results.

This is a factual owner-instruction record, not a general PTAR v2.0 repeal. The current shared PTAR still prescribes distinct agents for ordinary independent authoring/review/execution. The resulting supervisor-authored tests **lack ordinary independent test-author provenance**, an exception material to later acceptance; do not label them independently authored, blind-reviewed, independently executed, or accepted. An owner accepting the exception does not turn the same agent into an independent reviewer of its own changes.

## Bounded correction policy

- Existing tests/fixtures and all prior PHX-CI run evidence stay unchanged except explicitly justified, source-preserving strengthening of active mapping/check expectations.
- Active GitHub Actions workflow definitions are removed, and PHX-CI repository check guards against reintroduction; authorized workflow-file deletions are allowed by consumer changed-path configuration. Azure callback redeployment remains a distinct owner-governed requirement.
- Default product test discovery expands recursively to all 127 historical `test/` modules and the new `tests/architecture/` regression module; counts are **configured selection only** until a PHX-CI executor demonstrates actual execution.
- The owner subsequently accepted the verification-context provenance limitation for the current controlled development environment. Development digest observations are permitted again; this does not approve a release artifact. The existing approved-hash gate for promotion remains unchanged. Future workflow changes may warrant revisiting this decision.
- The prohibited `dev/_ca-output.json` compatibility alias is rejected, and Phase5 static acceptance-map proof now checks actual literal test registrations without claiming execution.

## Remaining gates

After source fixes are committed, PHX-CI must verify the exact immutable candidate; new context authentication is not a prerequisite in the current owner-approved development setup. The supervisor must disclose BLOCKED/NOT VERIFIED rather than label repairs PASS. Separate owner integration/promotion approval remains required if any verified release decision is contemplated. No old evidence is retroactively invalidated and no new evidence is fabricated.
