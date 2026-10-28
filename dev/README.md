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
- `_ca-output.json` — optional structured PHX-CI evidence metadata published alongside the canonical Markdown report.

Only `README.md` and `_ca-output.md` are required ordinary files directly under `dev/`; PHX-CI may additionally publish `_ca-output.json`.

## Authority status

This README is organizational/navigation documentation only. It does not create product, architecture, validation, or process decisions.

During the directory-standardization migration, legacy noncanonical `dev/**` trees may remain temporarily present until their owning migration phase relocates, transforms, archives, or deduplicates them. Their presence during migration does not make those locations part of the canonical target layout.

## Naming

Canonical directory and filename casing is exact. In particular, use `test-results` exactly as written.


## Current BVP development cycle (DEC-357, 2026-10-28)

The Owner-selected separate Windows OAuth controller is **WS-07/BVP_WINDOWS_CONTROLLER_OAUTH** — [new authoritative Build Unit](planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md) and [decision DEC-357](authority/decision-register.yaml). Cross-reference BVP subsystem specification/traceability, the WS-07 decomposition, whole-project verification plan, and `state/current-state.yaml` for the authoritative current unverified status. This new validation-only scope does **not** modify shipping `src/**` or create another workstream. No PHX-CI, real OAuth/Drive, physical device, deployment, merge or release acceptance follows from documentation or the existing draft source.

