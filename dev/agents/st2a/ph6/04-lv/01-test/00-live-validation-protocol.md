# Phase 6 Live Validation Protocol

Applies to every task in this directory.

## Validation authority epochs

### Historical authority — prerelease `0.1.13`

Scenarios already executed under the original Phase 6 validation epoch retain their original authority and are not retroactively reinterpreted:

- source `4352f168bd3c4f948f7110fd8713a3f71df2b901`;
- installed prerelease `0.1.13`;
- `main.js` SHA-256 `27e5f5a887309c2521f0a16f937076e13db90f11f0bd73bc64daf5f5f349c85c`;
- `manifest.json` SHA-256 `6db461da1efaaa47be0a6c98a979fb9d17c948978efc0b7e78db1dcb29ee6b0c`.

### Active authority from C01 forward — prerelease `0.1.17`

C01 revalidation and later C-series scenarios use the repaired prerelease `0.1.17` unless a later scenario explicitly supersedes it:

- approved repair source HEAD `aeb37485da06d0278f1f89c1a50c50a060212615`;
- release-preparation/tag commit `18b689b3b413d02e3172c8eba3d2f782c8cb8a04`;
- `main.js` SHA-256 `19dd0079c5e56082d5c75986caf4ff7f5f281a688b57122d1e0f13205ea6a022`;
- `manifest.json` SHA-256 `7cdeccb50d2cbf496727b5bb685dde32ab537dbae835eb6ae5f713b1c6d798a8`.

After C01 real-platform PASS, the validated repair was integrated into `phase6-integration` at merge commit `2362b88808d806b7acd10e72325a237b238c22cf`.

## Common rules

- Run tasks in filename order; prior task must PASS unless the current task explicitly says otherwise.
- Keep diagnostics at `Trace`, retention `5000`; capture **Copy diagnostic bundle** immediately before and after each scenario.
- Use disposable fixtures only. Do not edit source/tests or reset/re-pair state unless the scenario explicitly requires it.
- Beginning with C02, controlled manual scenarios must disable the three automatic synchronization toggles on every participating device before creating the fixture: **Startup / resume**, **Local changes**, and **Periodic remote reconciliation**. Leave them disabled until post-scenario evidence is captured unless the scenario explicitly tests automatic synchronization.
- Manual synchronization must always be previewed first. If the plan contains an unexpected mutation, duplicate, conflict, destructive action, blocked operation, or recovery condition: **do not execute**; capture evidence and stop.
- Execute only the scenario named in the current file, then stop.
- The product does **not** present a separate completion-status screen after an accepted execution. When execution is accepted, the plan modal closes. Terminal success or failure must be established from the resulting device state/content plus diagnostics, especially the terminal `sync-run-complete` / failure event.
- PASS requires expected local/remote content and identity, correct BASE/mapping/tombstone state, no unrelated mutation, no unexpected duplicate, no unresolved intent unless recovery is the expected result, and correct terminal status.
- Report fixture/hash, plan/action counts, operation/intent/effect/request IDs available, remote IDs, state/semantic revisions, pre/post bundle hashes, and PASS/FAIL.

`OBS-01`: if `causalIndex.runs` remains empty, record it. Tests E01–E04 that depend on uncertain-effect/recovery causality require OBS-01 resolved or explicit supervisor waiver with equivalent correlation evidence.
