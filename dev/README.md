# Development Repository Layout

**DEC-339 planning update (2026-11-17):** [Minimal inventory integration plan](planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md) aligns current dormant software with WS-02/03/05/07 ownership. No changes to historical decisions/evidence, active WS-07 work or shipping product behavior. This is planning only; not live migration, activation, physical testing or release.

## Current DEC-357 / WCO-06 software-only closeout (2026-11-14)

**Final status: PASS WITH MINOR FINDINGS — ACCEPTED, Windows software-only.** Exact frozen source `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0` passed original PHX-CI run `e579438f-8a22-434d-8284-ef966f6db535` with 13/13 stages, focused 628/628, product 1292/1292. Locked DEC-358 authorizes the exact runtime; the [corrected independent acceptance](reviews/bvp-windows-controller-oauth-20261114-wco06-acceptance-addendum.md) supersedes only the original WCO06-F01 blocker. [Builder closeout](planning/02-workstreams/WS-07-brain-verification-platform/tasks/wco06-dec357-accepted-software-only-closeout-2026-11-14.md) is complete, **handoff-count 14 preserved**. Real cross-client `drive.file` interoperability is still unverified, and live OAuth/Drive/physical testing, merge, installation and release require separate Owner authorization.


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


## Historical initial DEC-357 development checkpoint (2026-10-28; superseded by current acceptance above)

The Owner-selected separate Windows OAuth controller is **WS-07/BVP_WINDOWS_CONTROLLER_OAUTH** — [new authoritative Build Unit](planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md) and [decision DEC-357](authority/decision-register.yaml). Cross-reference BVP subsystem specification/traceability, the WS-07 decomposition, whole-project verification plan, and `state/current-state.yaml` for the authoritative current unverified status. This new validation-only scope does **not** modify shipping `src/**` or create another workstream. No PHX-CI, real OAuth/Drive, physical device, deployment, merge or release acceptance follows from documentation or the existing draft source.

