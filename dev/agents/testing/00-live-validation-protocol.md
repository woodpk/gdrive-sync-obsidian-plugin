# Phase 6 Live Validation Protocol — 0.1.13

Applies to every task in this directory.

**Authority:** source `4352f168bd3c4f948f7110fd8713a3f71df2b901`; installed prerelease `0.1.13`; `main.js` SHA-256 `27e5f5a887309c2521f0a16f937076e13db90f11f0bd73bc64daf5f5f349c85c`; `manifest.json` SHA-256 `6db461da1efaaa47be0a6c98a979fb9d17c948978efc0b7e78db1dcb29ee6b0c`.

## Common rules

- Run tasks in filename order; prior task must PASS unless this prompt says otherwise.
- Keep diagnostics at `Trace`, retention `5000`; capture **Copy diagnostic bundle** immediately before and after each scenario.
- Use disposable fixtures only. Do not edit source/tests or reset/re-pair state unless the scenario explicitly requires it.
- Manual sync must be previewed first. If the plan contains an unexpected mutation, duplicate, conflict, destructive action, or recovery condition: **do not execute**; capture evidence and stop.
- Execute only the scenario named in the current file, then stop.
- PASS requires expected local/remote content and identity, correct BASE/mapping/tombstone state, no unrelated mutation, no unexpected duplicate, no unresolved intent unless recovery is the expected result, and correct terminal status.
- Report fixture/hash, plan/action counts, operation/intent/effect/request IDs available, remote IDs, state/semantic revisions, pre/post bundle hashes, and PASS/FAIL.

`OBS-01`: if `causalIndex.runs` remains empty, record it. Tests E01–E04 that depend on uncertain-effect/recovery causality require OBS-01 resolved or explicit supervisor waiver with equivalent correlation evidence.
