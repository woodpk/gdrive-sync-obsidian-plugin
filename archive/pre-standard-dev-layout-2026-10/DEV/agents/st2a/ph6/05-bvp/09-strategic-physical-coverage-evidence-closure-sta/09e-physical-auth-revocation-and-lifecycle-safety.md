# BVP-S09E — Physical Authentication Revocation and Lifecycle Safety

## 0. Status

**Agent name:** `agt-brain-bvp-s09-physical-validation-01`  
**Prompt maturity:** PREPLANNED / NOT-YET-EXECUTABLE  
**Primary work package:** BVP-S09 — Strategic Physical Coverage / Evidence Closure / Stage-3 Readiness  
**Predecessor:** accepted S09D

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten physical-evidence contract. Dispatch binding supplies exact account/device/lifecycle coordinates only.

## 1. Objective

Prove real authorization revocation/restoration and installed-plugin/device lifecycle safety for the target platform obligations: disable, uninstall/reinstall, and device unlink behavior must not silently destroy managed user data or remote authority.

## 2. Required End State

Physical evidence covers, where required by the current product target:

- real Google authorization revocation;
- production behavior after revoked/invalid authorization;
- same-device reauthentication/restoration;
- plugin disable/reenable;
- plugin uninstall/reinstall;
- device unlink/removal from synchronization authority where supported;
- preservation/non-destruction of user and remote data across lifecycle transitions;
- correct state/identity handling after return/relink;
- no credential/token evidence leakage.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S09D build/device state;
- exact product auth/lifecycle requirements to prove physically;
- exact device(s) and account/root identities in non-secret terms;
- exact disposable fixture/data whose preservation will be observed;
- exact provider/UI actions required for revocation/restoration;
- exact disable/uninstall/reinstall/unlink sequence;
- exact stop/resume conditions and evidence required;
- exact evidence output paths/writable allowlist;
- current PHX-CI repository verification baseline.

## 4. Required Physical Semantics

### 4.1 Real revocation

Authorization must actually be revoked through the real provider/account path when that is the evidentiary requirement.

A simulated auth error does not satisfy physical revocation evidence.

### 4.2 Revoked-state safety

After revocation, production must fail/block/re-authenticate according to target semantics and MUST NOT claim successful remote synchronization without authority.

### 4.3 Restoration

Reauthentication must use the normal supported same-device flow and restore permitted behavior without token injection/export.

### 4.4 Disable / uninstall / reinstall

Physical application/plugin lifecycle actions must be real when those transitions are being proven.

Observe that required local/remote user data survives according to target semantics.

### 4.5 Device unlink

Unlink/removal must not delete canonical remote data merely because one device is removed, unless the target explicitly defines another safe behavior.

Returning/relinked devices must follow current authority/state rules rather than assuming stale state is current.

## 5. Invariants

- Credentials/tokens never enter evidence.
- Lifecycle operations do not use unrelated user data.
- Product authority decides post-lifecycle behavior.
- Physical actions remain physical.
- External runner uses checkpoints; device does not host scenario state.
- Non-destructive behavior is objectively observed.

## 6. Material Edge / Failure Cases

Evidence must detect:

- revoked auth still incorrectly claiming success;
- reauth requiring token export/bypass;
- uninstall/reinstall causing unexpected user/remote data loss;
- unlink deleting unrelated/canonical remote data;
- restored stale device overwriting newer authoritative state;
- platform action unavailable or unsafe.

Unavailable required physical transition yields `BLOCKED`.

## 7. Evidence Requirements

Record, without secrets:

- device/build/run identity;
- pre-transition data/state identity;
- exact operator/provider lifecycle action;
- post-action production classification;
- reauthentication/restoration result;
- local/remote preservation observations;
- device identity/relink state where applicable;
- terminal verdict.

## 8. Engineering / Operator Discretion

The operator may choose the safest exact order of provider/Obsidian lifecycle UI actions consistent with current product semantics and bound checkpoints.

## 9. Dependencies

Consumes S09A authenticated baseline, S07 deterministic auth/lifecycle/state invariants, and S08 live checkpoint architecture.

## 10. Acceptance Criteria

Acceptance requires real revocation/restoration and required lifecycle-transition evidence, no false-success auth behavior, non-destructive data preservation, exact build/device traceability, no secret leakage, and supervisor review.

Any repository evidence change must pass authoritative PHX-CI.

## 11. Non-Goals

Do not add new auth architecture, token export, or lifecycle automation framework. Do not begin final traceability closure until this evidence is accepted.

## 12. Handoff / Stop

Report exact device/build/run identities, lifecycle/revocation actions, production classifications, preservation observations, blockers, evidence paths, and any evidence commit.

Stop at the supervisor-reviewed S09E physical evidence gate.

Do not begin 09F.
