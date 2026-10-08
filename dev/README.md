# Development Repository Layout

This repository is being migrated to the canonical development hierarchy required by the governing agent-led software engineering standards.

## Canonical active structure

- `authority/` — durable governing material.
- `planning/` — target-system, workstream, traceability, and verification planning.
- `research/` — research, experiments, source analysis, and durable reasoning.
- `state/` — current continuity and construction state.
- `reviews/` — completed independent/adversarial review outputs.
- `scripts/` — repository-controlled engineering scripts.
- `test-results/` — persisted PHX-CI run evidence.
- `scratch/` — explicitly non-authoritative temporary working material.
- `_ca-output.md` — current coding-agent/work-unit evidence and handoff surface where required.

Only `README.md` and `_ca-output.md` are standard ordinary files directly under `dev/`.

## Authority status

This README is organizational/navigation documentation only. It does not create product, architecture, validation, or process decisions.

During the directory-standardization migration, legacy noncanonical `dev/**` trees may remain temporarily present until their owning migration phase relocates, transforms, archives, or deduplicates them. Their presence during migration does not make those locations part of the canonical target layout.

## Naming

Canonical directory and filename casing is exact. In particular, use `test-results` exactly as written.
