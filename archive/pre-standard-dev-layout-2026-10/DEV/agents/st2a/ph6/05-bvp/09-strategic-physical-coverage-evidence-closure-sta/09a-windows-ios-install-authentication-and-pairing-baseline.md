# BVP-S09A — Windows / iOS Install, Authentication, and Pairing Baseline

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted BVP-S08 primary-stage gate

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten physical-evidence contract. Dispatch binding supplies exact build/device/run coordinates only.

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

- exact accepted S08 integration SHA;
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