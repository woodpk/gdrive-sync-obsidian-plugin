# Phase 6 Live Validation Session

- Controller: `codex-desktop-p6-live-validation-01`
- Session ID: `2026-09-07T0010-P6LIVE`
- Installed plugin: `brain-google-drive-sync` version `0.1.9`
- Validation namespace: `BRAIN/_phase6-live-validation/2026-09-07T0010-P6LIVE/`
- Evidence directory: `D:/obsidian-brain-dev/dev/evidence/2026-09-07T0010-P6LIVE/`
- Source-code changes: none
- Git branch changes: none

## Installed release identity

- `main.js`: 722333 bytes; SHA-256 `9d45d5b3ba26218d3a47dae62ac2c0798133937197811cae185b0aee022128b2`
- `manifest.json`: 275 bytes; SHA-256 `9cbccf935b8f9d5a637bbe900cfb01a9455ca1d8537fac007f1e76761d087f40`

## Current hard stop

- Test: `P6-LIVE-A03`
- Status: `recovery-required`
- `firstSyncCompleted`: `false`
- `scopeReconcileRequired`: `true`
- Cause: the product's non-destructive `Keep local` workflow for `__brain_sync_portable_config__/app.json` failed authoritatively twice, including once after a reviewed full reconciliation established trusted authority.
- Remote safety result: no duplicate `app.json` object and no change to the pre-existing object's ID, size, created time, or modified time.
- Later tests: not started, because A03 did not establish the required baseline.

## Original controlled settings

- Diagnostic log level: `info`
- Diagnostic console mirroring: `false`
- Diagnostic retention: `2000`
- Local-change synchronization: `false`
- Periodic reconciliation: `false`
- Periodic interval: `15` minutes
- Startup/resume: `false`

Pairing, device identity, and vault identity were present at the start gate. No secret values were recorded.
