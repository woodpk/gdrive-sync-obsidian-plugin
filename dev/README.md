# Development Repository Layout

This repository uses the canonical development hierarchy required by the governing agent-led software engineering standards.

## Canonical active structure

- `authority/` — durable governing material.
- `planning/` — target-system, workstream, traceability, and verification planning.
- `research/` — research, experiments, source analysis, and durable reasoning.
- `state/` — current continuity and construction state.
- `reviews/` — completed independent/adversarial review outputs.
- `scripts/` — repository-controlled engineering scripts.
- `Test-Results/` — persisted repository verification run evidence.
- `scratch/` — explicitly non-authoritative temporary working material.
- `_ca-output.md` — current coding-agent/work-unit evidence and handoff surface where required.

Only `README.md` and `_ca-output.md` are standard ordinary files directly under `dev/`.

## Authority status

This README is organizational/navigation documentation only. It does not create product, architecture, validation, or process decisions.

Historical pre-standard development material is preserved outside active `dev/` under `archive/pre-standard-dev-layout-2026-10/DEV/` and is non-authoritative unless an active authority explicitly incorporates or cites it.

## Naming

Canonical directory and filename casing is exact. In particular, use `Test-Results` exactly as written.
