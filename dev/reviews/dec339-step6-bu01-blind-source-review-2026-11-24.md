# Blind independent source assessment — WS-05 / DEC-339 Step 6 / BU-01
Date: 2026-11-24 (America/New_York)
Reviewer stage: BLIND SOURCE ASSESSMENT — FROZEN BEFORE TESTS, PRIOR REVIEWS, SOURCE HISTORY, OR PHX-CI EVIDENCE
Repository: woodpk/gdrive-sync-obsidian-plugin
Immutable production source: c6dac8033567cb617f598b2340c5ee61ccb9dd9e
Handoff state commit: 02379520f13bbff50faf82edfc57e4bcb3d46539
Branch observed on GitHub remote: build/dec339-step6-metadata-bvp-20261124

## Authority and method
Read AGENTS.md, DEC-339 Step 6 planning/BU-01 acceptance and neutral synchronization architecture contracts. Read immutable production modules for inventory-aware planning, planning boundary, projection, provider metadata and provenance, canonical snapshot assembly, inventory integration. Did not inspect authored tests, prior review reports, source history, or PHX-CI outputs before freezing this assessment. This assessment is static only; no software validation was executed.

## Blind source observations
1. Enabled ordinary planning selects an inventory attempt; explicit full/recovery, first pairing and outstanding durable effects retain canonical physical safety paths. The enabled attempt does not silently return legacy incremental planning after a failed inventory proof. Disabled selection can preserve legacy construction without inventory dependencies (A1/A3).
2. The shipping authority adapter's semantic planner CAS and the inventory publication's durable persistence/semantic revisions are distinguished with a same-state durable fence. Malformed authority markers are rejected rather than interpreted as legacy DTOs. Both publication snapshots, active generation, cursor and identity are checked around the inventory lease (A1/A4).
3. Projection traverses domain-root graphs and requires verified parent/domain coverage, exact identity, bounded children/entities, unique normalized paths, complete listing and correct ancestry before offering the existing canonical snapshot assembler a REMOTE listing. Canonical LOCAL/BASE semantics are delegated to that assembler; a proxy supplies the already-observed remote listing rather than opening physical reconciliation (A2).
4. A fresh combined provider boundary brackets ordinary production planning; after read/projection, the code compares current provider horizon, pairing/scope and publication. A fresh root-wide marked-object census path exists for non-continuity operation; the continuity-granted path instead depends on a verified refresh receipt and terminal provider horizon. This latter distinction warrants targeted proof review, not an automatic finding of unsafety (A4).
5. Stale horizon invokes one bounded incremental refresh; invalid inventory invokes a guarded rebaseline that preserves canonical cursor. Failed restoration blocks. There is no code-level authorization in this assembler for provider mutation. The baseline coordinator performs validation and atomic publication checks (A4).
6. The reader's root-wide census rejects duplicate IDs, wrong-domain marks, unreachable/cross-domain/cyclic ancestry and conflicting freshly observed shared ancestors; ancestor metadata are reused within a single census only. This is consistent with the bounded efficiency-remediation architecture.
7. Static source alone cannot establish snapshot/operation parity, ten-family test adequacy, comparative request counts, numeric-only output registry, exact-source PHX-CI qualification or release fitness (A2/A5/A6/A7). The root-wide census can still be O(vault-wide objects), and reduced request overhead is not equivalent to live-provider speedup.

## Provisional blind finding
No independently demonstrated critical production defect from this source-only pass. Source-structure alignment is **provisional, not acceptance**. Evidence must demonstrate the exact continuity boundary, drift/races, fresh LOCAL/BASE parity, the root-wide census and scale costs, registration/allowlisting and independent exact-candidate qualification. This report is frozen and must not be edited following test/evidence inspection.
