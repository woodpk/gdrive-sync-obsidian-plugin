# S09 G1 — Independent source assessment (Pass 1)

- Date: 2026-10-20
- Reviewer: review-brain-09
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Feature: `WS-07/S09_G1_PLUGIN_DATA_INTEGRITY_MITIGATION`
- Frozen production source SHA: `9c100e4702190fe5e7908ea76f2f10068dc6e548`
- Intake state commit: `0b01d7a3fbc812caa0faac983d9d09e0d285a706`; handoff-count 5, recipient REVIEWER.
- PASS-1 disposition: **NO CONFIRMED SOURCE-LEVEL ACCEPTANCE BLOCKER in the inspected feature surfaces; not a final PASS.**

## Normative basis

BRAIN target requirements AUTH-008–012, REM-002–008, FIRST-001–007, STATE-001–017, CONFIG-001–009, DELETE-001–010 and invariants INV-001, INV-009, INV-011, INV-014, INV-016; current Builder–Reviewer Forms and two-agent Protocol. Preserve safe-union initial pairing, durable identity, conservative state recovery, device-local tokens, safe deauthorization and fail-closed synchronization.

## Directly inspected production source

`src/main.ts` (plugin startup, user settings intent, durable mutation, runtime and OAuth handoff), `src/product/plugin-data.ts` (data.json validation, transaction serialization, pairing namespaces and uncertain writes), `src/product/runtime.ts` (initialization generations, lifecycle queueing, pairing, deauthorization, scope changes, relocation and recovery), `src/product/settings-tab.ts` (user-intent wiring), `src/product/sync-plan-errors-path.ts` (path validation and managed exclusion), `src/product/sync-plan-errors-csv.ts` (journal recovery, staged replacement and relocation), `src/product/path-scope.ts` (local/config scope), `src/product/product-controller.ts` (runtime disposal and in-flight operation accounting), relevant `src/product/product-controller-base.ts` reconciliation completion/commit paths, and `src/drive/auth.ts` (OAuth transaction revocation and refresh lifetimes). Neutral WS-07 scope/architecture and target-specification requirements were consulted.

## Source assessment

1. **Persistent settings integrity:** `PluginDataRepository` serializes settings and diagnostic/audit persistence and refuses missing or malformed existing pairing authority; a failed save causes fail-closed reconciliation against confirmed storage rather than writing over an uncertain result. New remote pairing rotates the state namespace and restricts automatic synchronization.
2. **Stale asynchronous authority:** `ProductRuntime` has generation checks for initializing older runtimes, checks pairing identities before controller callbacks commit settings, retires OAuth sessions at deauthorization, and quiesces controller operations before persisting unpairing. Remote creation/pairing rechecks initiating authority at the post-I/O persistence boundary.
3. **Managed CSV lifecycle:** path validation and managed exclusions separate the errors CSV (including temporary/backup operational paths) from ordinary sync scope; relocation uses a persisted journal, staged replacement and restart recovery.
4. **Scope reconciliation:** an exclusion-policy edit increments `scopeReconcileGeneration`; full-run completion clears the marker only when it is still the sampled generation. The executor's completion path requires completed trusted state.
5. **Remaining verification questions (not asserted defects):** adversarial racing user edits with relocation, create/pair with deauthorization, OAuth callback/refresh with credential retirement, and crash points around journal transition must be checked independently against the actual tests and PHX-CI evidence in Pass 2. Also verify that no semantic test oracle was weakened to pass and that all ten mandated test families are meaningfully covered.

## Evidence-isolation limitation

Only normative requirements, architecture and production source informed the above assessment. A prior preflight in this conversation exposed administrative historical status text from `dev/state/current-state.yaml`; accordingly this report does **not** represent a perfectly information-isolated fresh-session blind assessment. The source analysis above does not rely on those narratives, tests, results or prior reviewer conclusions. No source history, tests, prior review reports or PHX-CI evidence was inspected as part of this Pass-1 analysis.

## Freeze

This is the frozen source-only assessment. Subsequent evidence inspection may alter the final verdict, not retroactively edit this assessment.
