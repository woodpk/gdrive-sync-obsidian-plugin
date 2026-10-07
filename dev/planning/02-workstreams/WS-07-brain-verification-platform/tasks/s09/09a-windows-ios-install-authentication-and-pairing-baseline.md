# BVP-S09A — Windows / iOS Install, Authentication, and Pairing Baseline

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** REGROUNDED / WINDOWS TRANCHE EXECUTABLE — FULL ACCEPTANCE PENDING IOS  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Accepted pre-S09 BVP green anchor:** `5b57c1ded6d314810ac2cca2a363342e67d9bee3`  
**Current integrated S09 source baseline:** `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f` on `automated-testing-platform-branch`

This contract has been re-grounded against the current WS-07 architecture/decomposition, current repository state, current BVP governance lock, and current PHX-CI pin after completion/integration of the canonical `dev/**` standardization.

The repository-resolvable dispatch coordinates are bound below. The **Windows tranche is executable now** because its exact source/artifact/device/vault coordinates are bound. iOS-specific coordinates remain explicitly UNBOUND and gate only the iOS tranche and full S09A acceptance.

### 0.1 Repository-bound dispatch coordinates

| Coordinate | Binding |
| --- | --- |
| Active branch | `automated-testing-platform-branch` |
| Current integrated S09 source baseline | `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f` |
| Historical substantive pre-S09 BVP green anchor | `5b57c1ded6d314810ac2cca2a363342e67d9bee3` |
| Plugin version | `0.1.18` |
| Production artifact | `main.js` |
| Production artifact SHA-256 guard | `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074` |
| Validation build implementation | `test-platform/src/live-device/build-validation-artifact.ts` |
| Validation entrypoint | `test-platform/src/live-device/validation-entrypoint.ts` |
| Validation output root | `.test-build/bvp-live-device/plugin` |
| Validation identity | `.test-build/bvp-live-device/plugin/build-identity.json` |
| Device command agent | `test-platform/src/live-device/device-command-agent.ts` |
| Drive mailbox | `test-platform/src/live-device/drive-mailbox.ts` |
| External live executor | `test-platform/src/live-device/live-scenario-executor.ts` |
| PHX-CI framework | `0.2.0-dev.2` |
| PHX-CI exact SHA | `69c4aa077d4a1a46d1e85e59f39d36285be99e83` |
| Current evidence surface | `dev/_ca-output.md` |
| PHX-CI history root | `dev/Test-Results/<runId>/` |

### 0.2 Bound physical/operator coordinates

| Coordinate | Binding |
| --- | --- |
| S09A run ID | `s09a-20261007-3e3724ed-01` |
| Fixture root | `BVP-VALIDATION/s09a-20261007-3e3724ed-01` |
| Windows host user | `woodpk` |
| Windows repository root | `D:\\obsidian-brain-dev` |
| Windows Obsidian version | `1.13.7` |
| Windows controller participant | `windows-brain-patrick` |
| Windows product device identity | `device:8b7820faab2603b334a1c13d8c3bdba0` |
| Windows disposable vault | `D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b` |
| Windows vault identity | `vault:c321a8a0-f083-4528-a1c1-25e60ad558bb` |
| Managed remote ID | `1ELFZgG55vMW7FcI1DGBjc2MAqtctN2_-` |
| Drive mailbox root | `BRAIN BVP Mailbox` |
| Relay root | `.obsidian/plugins/brain-google-drive-sync/.bvp-relay` |
| Mailbox record selectors | `brainBvpRunId`, `brainBvpDeviceId`, `brainBvpGeneration` |
| Reserved iOS controller participant label | `ios-s09a-participant` |

The recovered Windows values are established prior physical-validation coordinates. They are not newly invented S09A observations.

### 0.3 Validation artifact binding — COMPLETE

The bounded S09A artifact-generation preflight completed with `S09A_PREFLIGHT_EXIT_CODE=0`.

| Artifact coordinate | Bound value |
| --- | --- |
| Source commit | `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f` |
| Validation artifact | `main.js` |
| Artifact size | `920436` bytes |
| Artifact SHA-256 | `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76` |
| Manifest SHA-256 | `f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc` |
| Local artifact directory | `C:\\temp-2dd7a670f212446995f7038b0eeb9132\\.test-build\\bvp-live-device\\plugin` |
| Included test-platform inputs | `device-command-agent.ts`, `drive-mailbox.ts`, `validation-entrypoint.ts` |

The generated `build-identity.json` artifact hash and the independently printed `S09A_VALIDATION_ARTIFACT_SHA256` matched exactly.

### 0.4 Windows tranche authorization

The Windows portion of S09A is **EXECUTABLE** before iOS availability.

Authorized immediate sequence:

1. install the exact bound validation artifact into `D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync`;
2. preserve existing device-local plugin state such as `data.json`, relay state, and other non-artifact state unless a later bounded test explicitly owns resetting it;
3. verify installed `main.js` SHA-256 equals `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`, installed `manifest.json` matches the validation artifact, and `build-identity.json` retains source commit `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
4. load the installed validation build in Windows Obsidian `1.13.7` and collect the planned Windows baseline evidence;
5. continue with additional Windows-only S09 physical evidence where independently meaningful, while deferring all iOS-specific and genuinely cross-device claims.

This authorization does not declare S09A complete and does not permit a cross-device PASS without iOS evidence.

### 0.5A Windows installation result — PASS

The exact bound validation artifact is installed in the disposable Windows vault.

- target plugin directory: `D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync`;
- installed `main.js` SHA-256: `602b40354f0c5a4ac9906ab4db22d76d71bea688581b3382d4609d0e29a51c76`;
- installed manifest SHA-256: `f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc`;
- installed build source commit: `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`;
- source and installed artifact files are byte-identical;
- existing `data.json`, `.bvp-relay`, and all other device-local state were preserved;
- discrepancies: none.

The Windows tranche therefore advances to **installed-runtime load verification**. No rebuild or reinstall is required.

### 0.5 iOS physical observations still required

Before the **iOS tranche** may execute, and before full S09A acceptance may be claimed, record exactly:

- iPhone model;
- iOS version;
- iOS Obsidian version;
- iOS product logical device identity;
- iOS disposable S09A vault identity.

No credential, token, authorization code, client secret, or other secret may be written into this contract or committed evidence.

### 0.6 Fixed human-checkpoint sequence

1. **Artifact identity / Windows engineering host** — build the validation artifact from exact implementation source `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f`; required observation: complete `build-identity.json`, actual `main.js` SHA-256, and sourceCommit equality.
2. **Windows installed runtime** — install/load that exact artifact in `D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b` under Obsidian `1.13.7`; required observation: validation build reports the exact source identity.
3. **Windows same-device OAuth** — complete the supported browser/provider flow on Windows; required observation: authenticated production state, product device identity `device:8b7820faab2603b334a1c13d8c3bdba0`, and managed remote `1ELFZgG55vMW7FcI1DGBjc2MAqtctN2_-`; no token export.
4. **iOS identity capture** — on the target iPhone record exact model, iOS version, Obsidian version, and disposable S09A vault identity before plugin load.
5. **iOS installed runtime** — install/load the exact same validation artifact in the target iOS Obsidian vault; required observation: validation build reports the exact source identity.
6. **iOS same-device OAuth** — complete the supported provider flow on iPhone; required observation: authenticated production state, observed iOS product device identity, and managed remote `1ELFZgG55vMW7FcI1DGBjc2MAqtctN2_-`; no credential transfer.
7. **Distinct-device/pairing comparison** — verify Windows and iOS product device identities are distinct and both bind to the same intended managed remote.
8. **Terminal evidence** — record S09A PASS/FAIL/BLOCKED, checkpoint observations, artifact/device/run identities, and stop. Do not begin S09B.

### 0.7 Writable-path allowlist for normal S09A execution

Normal S09A physical evidence work may modify only:

- `dev/_ca-output.md`;
- `dev/state/current-state.yaml`;
- `dev/state/handoffs/current-engineering-handoff.md`;
- PHX-CI-owned `dev/Test-Results/<runId>/**` only when repository changes made during the child require authoritative PHX-CI publication.

Normal S09A execution is **not authorized** to modify `src/**`, `test-platform/**`, `phx-ci.json`, `Taskfile*.yml`, or frozen governance surfaces. A substantive defect requiring code/platform repair stops S09A as BLOCKED and creates a separate bounded repair unit.

## 1. Objective

Establish the physical Windows and iPhone/iOS validation baseline: exact validation artifacts load in real Obsidian runtimes, each device authenticates using its own permitted Google authority, and both participants are correctly bound to the intended managed synchronization root/device identities without token export or cross-device credential transfer.

## 2. Required End State

Physical evidence proves:

- the exact Windows validation build loads in the intended desktop Obsidian runtime;
- the exact iOS validation build loads in the intended iPhone/iOS Obsidian runtime;
- both builds are traceable to the exact accepted repository/build identity;
- each device authenticates independently under the product's same-device OAuth model;
- no desktop token is copied to iOS and no device token is exported to the external controller;
- both devices identify the intended managed remote/pairing relationship according to production authority;
- device identities are distinct where the product requires distinct identities;
- authentication/pairing state is sufficient for later S09 physical synchronization runs;
- canonical evidence records build/device/run identities and operator checkpoints without secrets.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted pre-S09 BVP source anchor;
- exact production and validation artifact versions/hashes;
- exact Windows Obsidian version/device identity;
- exact iPhone/iOS/Obsidian version/device identity;
- exact disposable physical validation vault/root identities;
- exact Google account/managed Drive folder identity in non-secret terms;
- exact run identity;
- exact transport/mailbox coordinates needed by S08 live execution;
- exact human checkpoint sequence for platform-mediated authentication steps;
- exact evidence output paths/writable allowlist;
- current PHX-CI pin/runtime and repository verification baseline.

Do not record credentials, tokens, authorization codes, or other secrets in the prompt/evidence.

## 4. Required Physical Semantics

### 4.1 Real installed-runtime proof

A build/test process alone is insufficient. Both artifacts must actually load in the real supported Obsidian runtime on their target platforms.

### 4.2 Same-device authentication

Authentication must occur through the actual product-supported same-device flow.

A synthetic token injection, copied desktop token, exported refresh token, or test-only auth bypass does not satisfy this requirement.

### 4.3 Pairing / managed-root authority

The evidence must prove that each authenticated device is bound to the intended managed remote root according to production product state/authority—not merely that it can access Google Drive generally.

### 4.4 Distinct device identity

Where product safety depends on independent device identity/state, record and verify that Windows and iOS participants are distinct logical devices.

### 4.5 Human checkpoints

OS/browser/provider-mediated actions may be explicit operator checkpoints. Each checkpoint must state:

- exact device;
- exact action;
- expected visible/production state afterward;
- objective observation required before resume.

Do not claim automation where the action was performed manually.

## Invariants

- Windows and iOS evidence comes from real installed runtimes, not simulation.
- Each device authenticates independently through the supported same-device product flow.
- OAuth credentials/tokens are never transferred between devices or exported to the external controller.
- Managed-root pairing and device identity come from production authority, not test expectations.
- Physical evidence is bound to exact source/build/device/run identities.
- Human checkpoints may perform platform/provider actions but cannot fabricate production success.

## 5. Evidence Requirements

Canonical evidence must include, without secrets:

- source/integration SHA;
- validation artifact identity/hash/version;
- production artifact identity where relevant;
- Windows device/runtime identity;
- iOS device/runtime identity;
- run identity;
- authentication result/classification per device;
- managed-root/pairing identity/classification;
- device identity observations;
- human checkpoint actions and completion evidence;
- terminal PASS/FAIL/BLOCKED reason.

Screenshots/manual observations may supplement but not replace production/device result evidence where the product can expose it.

## 6. Failure / Safety Semantics

- Failed/partial authentication is not PASS.
- Wrong managed root/account/device pairing is not PASS.
- Missing iOS load evidence cannot be replaced by Windows evidence.
- A deterministic simulator cannot substitute for physical platform/auth proof.
- Unexpected credential exposure is a hard stop and must not be committed to evidence.
- Unexpected access to unrelated user data is a hard stop.

## 7. Engineering / Operator Discretion

The operator may choose safe fixture names and the exact order of platform-mediated auth steps consistent with current product UX.

No discretion exists to bypass same-device auth, export tokens, or substitute synthetic evidence.

## 8. Dependencies

Consumes the accepted S08 validation build, command agent, transport, live executor, and production receipt architecture.

## 9. Acceptance Criteria

Acceptance requires complete physical Windows+iOS load/auth/pairing evidence, exact build/device/run traceability, no secret/token export, correct managed-root authority, and supervisor review of the evidence.

Any repository change/evidence publication required by this child must also pass authoritative PHX-CI before integration.

## 10. Non-Goals

Do not yet prove:

- bidirectional synchronization/conflict (09B);
- offline/interruption (09C);
- path/resource/large transfer (09D);
- auth revocation/uninstall lifecycle (09E);
- final requirement closure (09F).

## 11. Handoff / Stop

Report exact build/source identities, device/runtime identities, run identity, authentication/pairing outcomes, human checkpoints, evidence locations, any BLOCKED platform step, and any repository evidence commit.

Stop at the supervisor-reviewed S09A physical evidence gate.

Do not begin 09B.
