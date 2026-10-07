# BVP-S09A — Windows / iOS Install, Authentication, and Pairing Baseline

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** REGROUNDED / NOT-YET-EXECUTABLE — PHYSICAL BINDINGS PENDING  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Accepted pre-S09 BVP green anchor:** `5b57c1ded6d314810ac2cca2a363342e67d9bee3`  
**Current integrated S09 source baseline:** `3e3724ed40d64d8e5cb26c92430eecdfdf9daa1f` on `automated-testing-platform-branch`

This contract has been re-grounded against the current WS-07 architecture/decomposition, current repository state, current BVP governance lock, and current PHX-CI pin after completion/integration of the canonical `dev/**` standardization.

The repository-resolvable dispatch coordinates are bound below. Physical/device/run coordinates that cannot be truthfully derived from Git remain explicitly UNBOUND. This file is **not executable** until every required physical binding is exact.

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

### 0.2 Physical/operator coordinates still required

The following remain **UNBOUND** and must be supplied/observed at dispatch time:

- exact validation artifact SHA-256 and `build-identity.json` generated for the S09A run;
- exact Windows Obsidian version and logical device identity;
- exact iPhone model/iOS version/Obsidian version and logical device identity;
- exact disposable physical validation vault/root identity on each device;
- exact non-secret Google account/managed Drive folder identity;
- exact S09A run ID;
- exact live mailbox/relay coordinates for that run;
- exact ordered human-checkpoint sequence for platform/provider-mediated authentication.

No credential, token, authorization code, client secret, or other secret may be written into this contract or committed evidence.

### 0.3 Writable-path allowlist for normal S09A execution

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
