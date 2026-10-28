# Project State

Purpose: current project and construction continuity state that is important for re-entry but is not durable product or architecture authority.

Allowed artifact classes: `current-state.yaml` and bounded handoff artifacts under `handoffs/`.

Prohibited artifact classes: product or architecture decisions, historical build journals, PHX-CI run archives, research, and completed independent reviews.

Authority status: repository reality remains authoritative technical state. State metadata records continuity and must be reconciled when it conflicts with the repository.

Naming: the canonical current-state file is `current-state.yaml`.


## Current BVP successor continuity

See `bvp_windows_controller_oauth_2026_10_28` in [current-state.yaml](current-state.yaml) for the **new DEC-357** build unit. It is distinct from predecessor `bvp_poll_error_observability_2026_10_25` and inherits the same current Builder recipient/hand-off count **10** without creating a cross-role handoff. As of the planning refresh, source/tests are committed but **not PHX-CI executed** or accepted. Original evidence and prior Reviewer records remain historical in their own directories.

