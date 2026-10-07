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

Active next child: **BVP-S09A — Windows / iOS Install, Authentication, and Pairing Baseline**, with the **Windows execution tranche active first**.

The BVP's historical substantive green source anchor remains `5b57c1ded6d314810ac2cca2a363342e67d9bee3`. The current integrated pre-S09 source baseline is `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`.

S09 Windows physical execution **has started** with the verified installation of the exact validation artifact into the disposable Windows vault. Stage 3 has **not** started.

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

## S09A physical coordinates now bound

The previously established Windows physical-validation coordinates were recovered and rebound for S09A rather than requesting duplicate operator entry:

- S09A run ID: `s09a-20261007-3e3724ed-01`;
- fixture root: `BVP-VALIDATION/s09a-20261007-3e3724ed-01`;
- Windows host user: `woodpk`;
- repository root: `D:\obsidian-brain-dev`;
- Windows Obsidian: `1.13.7`;
- Windows controller participant: `windows-brain-patrick`;
- Windows product device identity: `device:8b7820faab2603b334a1c13d8c3bdba0`;
- disposable Windows vault: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`;
- vault identity: `vault:c321a8a0-f083-4528-a1c1-25e60ad558bb`;
- managed remote ID: `1ELFZgG55vMW7FcI1DGBjc2MAqtctN2_-`;
- Drive mailbox root: `BRAIN BVP Mailbox`;
- relay root: `.obsidian/plugins/brain-google-drive-sync/.bvp-relay`;
- mailbox run/device/generation keys: `brainBvpRunId`, `brainBvpDeviceId`, `brainBvpGeneration`;
- reserved iOS controller participant label: `ios-s09a-participant`.

The exact human checkpoint order is now fixed:

1. build the validation artifact from exact implementation source `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f` and record `build-identity.json` plus actual artifact SHA-256;
2. load that exact artifact in the disposable Windows Obsidian vault and confirm validation-build/source identity;
3. perform Windows same-device OAuth, then observe product/device/managed-root state without exporting tokens;
4. record exact iPhone model, iOS version, Obsidian version, and disposable S09A vault identity before plugin load;
5. load the exact same validation artifact in iOS Obsidian and confirm validation-build/source identity;
6. perform iOS same-device OAuth, then observe product/device/managed-root state without credential transfer;
7. compare Windows/iOS product device identities for distinctness and verify both bind to the intended managed remote;
8. record terminal S09A PASS/FAIL/BLOCKED evidence and stop before S09B.

## Windows-first S09 execution rule

S09 evidence collection is now explicitly device-scoped where the underlying physical proof is independent. The automated testing platform may execute Windows-only physical evidence before iOS availability or before the GitHub/BRAT mobile release exists. This is an execution-order change only:

- Windows-only claims may be proved on Windows now;
- iOS-only claims remain pending until the mobile artifact is released/installed;
- cross-device claims still require both devices;
- S09A–S09V acceptance remains serial and no later child is declared accepted out of order.

The immediate Windows install binding is:

- source artifact directory: `C:\temp-2dd7a670f212446995f7038b0eeb9132\.test-build\bvp-live-device\plugin`;
- target plugin directory: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync`;
- required validation `main.js` SHA-256: `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`;
- plugin ID: `brain-google-drive-sync`;
- existing device-local plugin state (including `data.json` and relay/state files) must be preserved unless a later test explicitly owns resetting it.

## S09A validation artifact preflight complete

The bounded artifact-generation preflight completed successfully with exit code 0. Exact bound identity:

- source commit: `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
- validation `main.js` size: `920436` bytes;
- validation `main.js` SHA-256: `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`;
- manifest SHA-256: `f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc`;
- current local artifact directory: `C:\temp-2dd7a670f212446995f7038b0eeb9132\.test-build\bvp-live-device\plugin`;
- bundled test-platform inputs are limited to the device command agent, Drive mailbox, and validation entrypoint.

The printed build identity and independently printed artifact SHA-256 agree exactly.

## Full S09A acceptance remains pending iOS

Only these physical observations remain unbound:

- exact iPhone model, iOS version, Obsidian version, product logical device identity, and disposable S09A vault identity.

No credential, token, authorization code, or secret may be recorded in these bindings.

## S09A writable boundary

S09A is a physical-evidence child, not a product-implementation child. Normal execution may write only:

- `dev/_ca-output.md`;
- `dev/state/current-state.yaml`;
- `dev/state/handoffs/current-engineering-handoff.md`;
- PHX-CI-owned `dev/Test-Results/<runId>/**` only if a repository change made during the child requires PHX-CI publication.

No normal S09A execution change is authorized under `src/**`, `test-platform/**`, `phx-ci.json`, `Taskfile*.yml`, or frozen governance surfaces. If physical validation exposes a substantive defect requiring implementation repair, S09A stops BLOCKED and a separate bounded engineering repair unit must be created.

## Windows validation artifact installation complete

Codex Desktop reported `INSTALL: PASS` for the exact bound artifact.

Verified installed state:

- target: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync`;
- installed `main.js` SHA-256: `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`;
- installed manifest SHA-256: `f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc`;
- installed build source commit: `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
- source and installed artifact files were byte-identical;
- `data.json`, `.bvp-relay`, and all other device-local state were preserved;
- discrepancies: none.

## Windows installed-runtime load verification complete

The restarted Windows Obsidian 1.13.7 process loaded the installed validation artifact successfully. Browser-console observation of `globalThis.__BRAIN_BVP_VALIDATION_BUILD__` returned:

- `schemaVersion: 1`;
- `sourceCommit: 3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
- `sentinel: BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL`.

The ordinary JavaScript `[[Prototype]]` properties shown by DevTools are not BVP evidence and require no inspection.

## Immediate next action

Proceed with the Windows same-device authentication/pairing baseline using the already-loaded validation build. Do not reinstall or rebuild the artifact. Collect iOS bindings later before the iOS tranche; full S09A acceptance still requires both platforms.

Do not begin S09B. Do not begin Stage 3.
