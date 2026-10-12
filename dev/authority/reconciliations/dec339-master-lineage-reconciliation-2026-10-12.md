# DEC-339 — master / accepted feature branch lineage reconciliation

**Date:** 2026-10-12  
**Classification:** Technical integration and authority preservation record; no new product decision or promotion authorization.

## Pinned inputs

- Master: `caf4a03418b89b57893e3bd5d4c6f89c28604242`.
- Accepted implementation: `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902`.
- Evidence branch HEAD: `6c4e4511ccf6ae8c48d80656e3a1f02ee4669b72`.
- Merge base: `7b4297adceb2fd6268a5801a207b7dce1f7b7728`.
- Divergence: candidate-exclusive 1836 commits, master-exclusive 26 commits.

## Master-exclusive provenance

All 26 master-exclusive commits are documentation/governance work: `AGENTS.md` plus 58 legacy `dev/agents/**` paths, primarily inserting owner-locked fresh-operating-protocol and PHX-CI governance replacement notices into obsolete tasking. They do not modify production code. The candidate's current `AGENTS.md` (blob `0ddf87d459a8ef792b2a013d99320a373aaeb9dd`) carries the same owner-locked fresh-protocol and legacy-supersession intent, rewritten for the current `dev/planning/**/tasks/**` and `archive/**` structure. The canonical current Google Drive operating protocol exclusively governs executable verification. Older task-specific validator permissions are not restored.

The legacy `dev/agents/**` paths are prohibited as active hierarchy under the current standardized `dev/**` governance; their history is preserved in Git ancestry rather than reinstated as executable task instructions. The archived pre-standard material remains historical, not current authority.

## Isolation and construction

An isolated integration branch uses a **two-parent Git commit** with first parent the accepted evidence HEAD and second parent the exact master HEAD. Its baseline tree is taken from the candidate, deliberately preserving the accepted implementation, source, tests, pinned PHX-CI configuration, artifacts policy and evidence rather than naively merging the obsolete master tree. The commit changes only current project-state, handoff, independent review provenance and this reconciliation record. Every master-exclusive commit remains reachable in the merge ancestry; no obsolete `dev/agents/**` hierarchy is reactivated. No force push, history rewrite, or master mutation is authorized.

This is an **integration staging result only**. A future merge/PR from this branch to `master` would still incorporate the broader 1836-commit candidate history. The DEC-339 review and PHX-CI run alone cannot authorize that large unrelated promotion. Before any master update, establish and review the full intended promotion scope, confirm governance/source compatibility, perform necessary PHX-CI verification of the exact candidate, and honor owner-controlled promotion constraints.

## Verification and stop gates

Prior PHX-CI PASS attaches to source `dadd62e93ba1c97cfc89ddf9fe604e3d5dc9c902`, not this new integration SHA. The integrated content tree requires an applicable PHX-CI run before claiming integration verification PASS. Until then mark integration validation pending. No inventory feature activation, targeted read cutover, OAuth changes, live Google Drive/vault operation, migration, install, release, or Stage 3 follows from this merge.
