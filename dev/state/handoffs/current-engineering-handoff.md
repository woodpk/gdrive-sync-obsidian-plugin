# Current Engineering Handoff

## Current state

The canonical working branch is `automated-testing-platform-branch`.

The repository-wide `dev/**` standardization is complete and integrated. Its cumulative accepted integration baseline is `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`. The obsolete divergent `dev-directory-standardization-phase9` line was intentionally excluded; the authoritative Phase-9 continuation was `dev-directory-standardization-phase9-r2`.

The standardization closure verified the four supervisor-requested conditions before integration:

1. the required canonical `dev/` folder system exists;
2. the canonical decision register preserves the complete legacy decision set required by the migration;
3. the target/specification decomposition is accurately represented in the required canonical workstream format;
4. the repository's current-state documentation is accurately represented in the required canonical state format.

No additional Phase-10 launcher or refactor-verification run is pending.

## Active workstream

Active workstream: **WS-07 — BRAIN Verification Platform**.

Active next child: **BVP-S09A — Windows / iOS Install, Authentication, and Pairing Baseline**.

The BVP's historical substantive green source anchor remains `5b57c1ded6d314810ac2cca2a363342e67d9bee3`. The current integrated pre-S09 source baseline is `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`.

S09 physical execution has **not** started. Stage 3 has **not** started.

## S09A re-grounding completed

The retained S09A contract has been reconciled with current repository reality and current governance.

Repository-resolvable bindings are now fixed:

- active branch: `automated-testing-platform-branch`;
- current integrated source baseline: `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
- historical pre-S09 substantive BVP green anchor: `5b57c1ded6d314810ac2cca2a363342e67d9bee3`;
- plugin version: `0.1.18`;
- shipping artifact identity guard: `main.js` SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- validation build implementation: `test-platform/src/live-device/build-validation-artifact.ts`;
- validation output: `.test-build/bvp-live-device/plugin/{main.js,manifest.json,build-identity.json}`;
- validation entrypoint: `test-platform/src/live-device/validation-entrypoint.ts`;
- bounded device agent: `test-platform/src/live-device/device-command-agent.ts`;
- Drive mailbox: `test-platform/src/live-device/drive-mailbox.ts`;
- external live executor: `test-platform/src/live-device/live-scenario-executor.ts`;
- PHX-CI framework: `0.2.0-dev.2` at exact SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`;
- current work-unit evidence surface: `dev/_ca-output.md`;
- immutable PHX-CI history: `dev/Test-Results/<runId>/`.

## S09A remains not executable

The following values cannot be truthfully derived from repository state and therefore remain intentionally unbound until physical dispatch:

- exact validation artifact SHA-256/build identity produced for the S09A run;
- exact Windows Obsidian version and logical device identity;
- exact iPhone/iOS and Obsidian versions and logical device identity;
- exact disposable physical validation vault/root identities;
- exact non-secret Google account/managed Drive folder identity;
- exact S09A run ID;
- exact mailbox/relay coordinates for that run;
- exact ordered human-checkpoint sequence for platform/provider-mediated authentication.

No credential, token, authorization code, or secret may be recorded in these bindings.

## S09A writable boundary

S09A is a physical-evidence child, not a product-implementation child. Normal execution may write only:

- `dev/_ca-output.md`;
- `dev/state/current-state.yaml`;
- `dev/state/handoffs/current-engineering-handoff.md`;
- PHX-CI-owned `dev/Test-Results/<runId>/**` only if a repository change made during the child requires PHX-CI publication.

No normal S09A execution change is authorized under `src/**`, `test-platform/**`, `phx-ci.json`, `Taskfile*.yml`, or frozen governance surfaces. If physical validation exposes a substantive defect requiring implementation repair, S09A stops BLOCKED and a separate bounded engineering repair unit must be created.

## Immediate next action

Bind the remaining physical/operator coordinates listed above into the S09A contract. When—and only when—all required dispatch coordinates are exact, change S09A from `REGROUNDED / NOT-YET-EXECUTABLE` to `EXECUTABLE` and begin the Windows/iOS installed-runtime authentication/pairing baseline.

Do not begin S09B. Do not begin Stage 3.
