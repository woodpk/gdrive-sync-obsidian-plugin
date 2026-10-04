# BVP-S08F — Desktop Live Canary and Production-Bundle Isolation Proof

## 0. Status

**Agent name:** `agt-brain-bvp-s08-live-device-validation-01`  
**Prompt maturity:** BOUND / EXECUTABLE — DISPOSABLE VALIDATION ENVIRONMENT  
**Primary work package:** BVP-S08 — Thin Live-Device Agent / Production Receipt / Command Transport  
**Predecessor:** accepted S08E

Read `dev/agents/st2a/ph6/05-bvp/00-execution-contract.md` first.

This is a complete prewritten semantic contract. Dispatch binding supplies hard repository/device coordinates only.


## 0.1 Dispatch Binding

Repository coordinates:

- exact accepted S08E predecessor closure: `4f9c69c38c12c09d2f06f3f966dc8519ed45a99f`;
- exact accepted S08E runtime / validation-artifact source: `e1067f5159a316f328c492837b8c6ff59e08d226`;
- task branch: `bvp-s08f-desktop-live-canary`;
- package / manifest version: `0.1.18`;
- accepted ordinary production artifact baseline: `main.js` 885,307 bytes / SHA-256 `8b950648aa2e9d2a920a48fe54151b6b0cb81c017ea9890763426aa5f3417074`;
- accepted validation artifact baseline SHA-256: `4c2e3d3cc18cfc30a2622068659ca8199c6ce8ed67dfec11dc298ff5b1e4e351`;
- PHX-CI runtime: `192bc722bdd886c1b18731bf5fde35ec7cfe091c`;
- framework version: `0.2.0-dev.2`;
- framework core: 3,996 / 4,000 logical TypeScript LOC / 10 modules;
- live-device/relay/executor: 727 / 750 logical TypeScript LOC;
- production seam: 187 / 350 logical LOC / 3 of 4 files;
- BVP PowerShell: 4 scripts / 1,492 logical LOC.

Windows physical-validation coordinates:

- validation device: the established real Windows Obsidian installation hosting the BRAIN vault;
- validation command device ID: `windows-brain-patrick`;
- development repository: `D:\obsidian-brain-dev`;
- BRAIN vault: `C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN`;
- installed plugin directory: `C:\Users\woodpk\Phoenix Rising Counseling Services\brain-patrick\BRAIN\.obsidian\plugins\brain-google-drive-sync`;
- protected relay root: `.obsidian/plugins/brain-google-drive-sync/.bvp-relay` within that vault;
- install procedure preserves `data.json`, Google authentication/client secret, managed remote identity, vault identity, and pairing state; only validated `main.js` / `manifest.json` are replaced for the canary.

Disposable canary identity:

- run ID: `s08f-desktop-canary-4f9c69c`;
- fixture root: `BVP-VALIDATION/s08f-desktop-canary-4f9c69c`;
- fixture relative path: `canary.md`;
- fixture vault path: `BVP-VALIDATION/s08f-desktop-canary-4f9c69c/canary.md`;
- fixture content exactly:
  `BVP S08F desktop live canary\nsource=e1067f5159a316f328c492837b8c6ff59e08d226\n`;
- fixture UTF-8 byte length: 77;
- fixture SHA-256: `db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d`;
- no permanent user file may be used or modified as canary content.

Selected bounded canary:

1. build the validation artifact from exact accepted S08E runtime source `e1067f5159a316f328c492837b8c6ff59e08d226`;
2. back up installed `main.js` and `manifest.json` only; preserve `data.json` and all local authentication/pairing state;
3. install the validation artifact into the established Windows plugin directory and reload Obsidian;
4. confirm validation build identity and existing authenticated/paired product state;
5. instantiate one bounded device agent in the running validation artifact for run `s08f-desktop-canary-4f9c69c`, device `windows-brain-patrick`, fixture root `BVP-VALIDATION/s08f-desktop-canary-4f9c69c`, using the real vault adapter, accepted production verification control, bounded sequence state, and existing mailbox runtime;
6. run an external S08E live scenario through the protected local relay:
   - put the exact disposable local fixture;
   - request manual production preview;
   - execute the returned plan;
   - require a fresh correlated S08A terminal receipt whose terminal is `complete`;
   - observe the local fixture objectively and require size/hash identity;
   - retain canonical live scenario evidence;
7. physically demonstrate safe command identity behavior without broadening scope:
   - exact duplicate command returns/reuses the accepted bounded result without repeating mutation;
   - a stale sequence is rejected;
   - wrong run/device input is rejected or left unprocessed before mutation;
8. cleanup:
   - remove the disposable fixture through the bounded agent;
   - run a bounded production synchronization to reconcile the deletion;
   - require a fresh terminal `complete` receipt;
   - objectively verify local fixture absence;
   - leave relay/canary state documented for cleanup or remove only canary-owned relay state after evidence capture;
9. restore the ordinary production artifact after canary evidence is complete and verify exact ordinary production `main.js` identity.

Validation artifact build command from an exact-source detached checkout:

`node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node .test-build/bvp/test-platform/src/live-device/build-validation-artifact.js`

Expected validation artifact directory:

`.test-build/bvp-live-device/plugin`

Expected validation artifact files:

- `main.js`;
- `manifest.json`;
- `build-identity.json`.

Physical evidence root:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/`

Required physical evidence files:

- `build-identity.json` — copied validation build identity;
- `installed-validation-identity.md` — installed file sizes/hashes and preserved-state confirmation;
- `canary-scenario-evidence.json` — canonical S08E live scenario evidence;
- `canary-command-results.json` — exact bounded command/result records used for duplicate/stale/mismatch proof;
- `canary-production-receipts.json` — production terminal receipt(s), including cleanup synchronization;
- `canary-observations.json` — objective fixture observations before/after cleanup;
- `production-bundle-isolation.md` — ordinary shipping hash plus source/artifact exclusion proof;
- `S08F-PASS.md` or `S08F-BLOCKED.md` — bounded physical verdict and exact device/build/run identities.

S08F requires no new runtime implementation by default. If the accepted validation artifact cannot be composed into a real bounded device agent from its already-exposed factory/mailbox/runtime and production seam on the Windows device, stop as `BLOCKED`; do not silently add another device runtime, transport, runner, persistence family, or production seam.

Writable paths for repository recording:

- this S08F task file;
- `dev/agents/st2a/ph6/05-bvp/00-session-index.md`;
- files only under `dev/evidence/2026-10-02-BVP-S08F-4f9c69c/**`.

No production, test-platform runtime, scenario catalog, PowerShell, governance, PHX-CI, package, manifest, or S09 implementation path is writable unless S08F proves the accepted stack is materially incapable and supervisor re-grounding explicitly authorizes a prerequisite.

Authoritative repository verification after physical evidence capture uses PHX-CI with exact base `4f9c69c38c12c09d2f06f3f966dc8519ed45a99f`, ordinary change class, and a unique GUID-suffixed temp root.


## 0.2 Supervisor Binding Correction — Working Vault Prohibited

The previously bound working BRAIN vault is **not an authorized S08F canary target**.

Observed physical bootstrap result before correction:

- validation artifact source: `e1067f5159a316f328c492837b8c6ff59e08d226`;
- validation artifact SHA-256: `4c2e3d3cc18cfc30a2622068659ca8199c6ce8ed67dfec11dc298ff5b1e4e351`;
- validation artifact loaded in Windows Obsidian;
- bounded S08 device agent composed successfully;
- agent reported `S08F_DEVICE_AGENT_READY`;
- product status was `idle-ready`;
- **no mailbox command was sent**;
- **no disposable fixture was created**;
- **no production preview or synchronization execution occurred**;
- **no S08F product-behavior verdict was claimed**.

The working vault path previously named in section 0.1 is withdrawn as an execution target. It may be retained only as historical context for the aborted bootstrap and MUST NOT receive further S08F canary commands.

S08F remains semantically bound by its original requirement for one bounded Windows/Obsidian live canary, but execution is now **BLOCKED** until a dedicated disposable validation environment is explicitly bound. That environment must:

- be a separate disposable Obsidian vault, not the user's working BRAIN vault;
- contain no permanent user content;
- use an isolated validation plugin install;
- use isolated validation authentication/pairing/remote state or another supervisor-approved non-production equivalent consistent with the original S08F contract;
- permit complete removal after the canary;
- preserve the distinction between S08F platform smoke validation and S09 product-validation coverage.

No further physical command execution is authorized under the old working-vault binding.


## 0.3 Disposable Windows Validation Environment Binding

The S08F environment blocker is resolved.

Exact disposable validation vault:

- vault root: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`;
- plugin directory: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\.obsidian\plugins\brain-google-drive-sync`;
- validation artifact source: `e1067f5159a316f328c492837b8c6ff59e08d226`;
- validation artifact SHA-256: `4c2e3d3cc18cfc30a2622068659ca8199c6ce8ed67dfec11dc298ff5b1e4e351`;
- ordinary working BRAIN vault is not an authorized S08F execution target;
- no working-vault content, plugin `data.json`, OAuth token, pairing identity, remote identity, or synchronization authority was copied into this disposable vault;
- this vault exists only for the single S08F testing-platform smoke canary and is not S09 product-validation evidence.

Permitted setup before the S08F canary:

- non-secret OAuth application configuration (`oauthClientId` and `oauthRedirectUri`) may be copied from the existing installation or entered manually;
- OAuth authorization for this disposable vault must be performed independently if required by the real production path;
- the disposable vault must create or pair only to a disposable managed remote identity created for this S08F canary;
- no existing production/working BRAIN remote root or vault identity may be reused;
- all automatic synchronization modes remain disabled;
- no permanent user content may be introduced.

The previous working-vault bootstrap result remains evidence only that the validation artifact and bounded agent could compose in Windows Obsidian. It does not authorize working-vault execution and is not a canary PASS.

S08F may now proceed only against the disposable vault bound above.


## 0.4 Disposable Environment Live Identity Binding

The disposable S08F vault completed independent OAuth authentication and created its own managed remote.

Bound non-secret identities:

- disposable product device identity: `device:8b7820faab2603b334a1c13d8c3bdba0`;
- disposable BRAIN vault identity: `vault:c321a8a0-f083-4528-a1c1-25e60ad558bb`;
- disposable managed remote root ID: `1ELFZgG55vMW7FcI1DGBjc2MAqtctN2_-`;
- first synchronization: not yet executed;
- automatic synchronization: disabled;
- working BRAIN vault/remote identities remain prohibited for S08F.

These identities belong only to the disposable S08F environment and are not S09 product-validation evidence.

## 1. Objective

Prove the complete S08 live path on Windows with one bounded disposable canary before S09 broad physical validation, while independently proving the ordinary production bundle remains free of validation-only agent/transport/scenario code.

## 2. Required End State

A Windows desktop validation artifact:

- loads in the intended Obsidian runtime;
- receives an addressed command through the selected transport/relay;
- executes a bounded production-path synchronization canary;
- returns a correctly correlated command result and authoritative production terminal receipt;
- supports an objective post-run observation;
- rejects stale/duplicate/wrong-run or wrong-device commands;
- leaves disposable test state suitable for cleanup/reconciliation.

Separately, the ordinary production build remains clean and loadable without validation-only code.

## 3. Dispatch Binding — Hard Data Only

Before execution the supervisor binds:

- exact accepted S08E predecessor SHA;
- task branch/build SHA;
- exact validation artifact/version;
- Windows validation device/vault identity;
- disposable fixture location/content identity;
- selected command transport/relay coordinates;
- exact bounded canary operation;
- exact production and validation build commands/artifact expectations;
- exact evidence locations;
- PHX-CI base/pin/runtime;
- current architecture metrics/budgets.

No permanent user data may be used as the canary fixture.

## 4. Required Canary Semantics

The canary must:

1. establish a disposable bounded fixture;
2. send an addressed command from the external live executor;
3. execute through the installed production synchronization path;
4. observe the production terminal receipt;
5. verify the expected external/local effect objectively;
6. record canonical scenario evidence;
7. exercise stale/duplicate/mismatch rejection without repeating unsafe effects;
8. restore/leave the test environment in an explicitly known safe state.

The exact create/update direction may be chosen at dispatch based on the simplest safe production-path proof.

## 5. Shipping-Isolation Proof

Independently prove the normal production artifact contains none of:

- validation-only device agent;
- mailbox/relay implementation;
- scenario runner/catalog;
- validation-only fixture controls;
- validation-only fault controls/UI.

The approved S08A generic run-receipt seam is not a violation.

Use architecture guard plus artifact/source inspection sufficient to prove actual bundle exclusion.

## 6. Failure / Safety Semantics

- A transport acknowledgement without production receipt is not PASS.
- A stale/duplicate command that causes repeated mutation is failure.
- A failed/ambiguous production result must remain failed/ambiguous.
- Unexpected non-disposable user content exposure/mutation is a hard stop.
- If Windows/Obsidian environment cannot execute the required canary, record BLOCKED; do not substitute a deterministic simulation and call it live evidence.

## 7. Invariants

- Canary scope is disposable and bounded.
- Production path is real.
- Scenario authority remains external.
- Production bundle remains validation-code-free.
- No S09 coverage expansion in this child.

## 8. Engineering Discretion

The agent/operator may choose the safest representative desktop canary action and fixture content consistent with the bound environment.

## 9. Dependencies

Consumes the complete accepted S08A–E stack.

## 10. Acceptance Criteria

Acceptance requires:

- desktop validation artifact loads;
- bounded live production-path canary succeeds with objective receipt/effect evidence;
- stale/duplicate/mismatch protections are physically demonstrated where safely possible;
- production bundle exclusion is proven;
- live-agent/core/seam budgets pass;
- architecture guard/metrics PASS;
- authoritative PHX-CI PASS for repository state;
- physical evidence is bound to exact build/device/run identities.

## 11. Non-Goals

Do not perform iOS coverage, broad cross-device scenario coverage, auth revocation, large mobile transfer, or lifecycle closure; those belong to S09.

## 12. Handoff / Stop

Report exact source/build SHA, validation artifact identity, Windows device/vault identity, canary steps/results, production receipt, command-safety results, production-bundle exclusion proof, architecture metrics, and any BLOCKED physical step.

Stop at `READY FOR LOCAL PHX-CI VERIFICATION` for code changes and supervisor physical-evidence review.

Do not begin S09.


## 0.5 Supervisor Retry Binding — Lifecycle-Aware Attempt 2

Attempt 1 is terminal and MUST NOT be replayed.

The physical sequence-3 diagnostic established the following bounded state before any retry authorization:

- run `s08f-desktop-canary-4f9c69c` reached sequence 3 exactly once;
- sequence 3 was `production-execute` and completed as `rejected / production-action-rejected`;
- the production terminal receipt was `deferred` with reason `run-start:stopping`;
- zero operations were committed and `requiredEffectsCommittedAndVerified=false`;
- the exact 77-byte canary fixture remained present with SHA-256 `db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d`;
- local relay outbox/sent/inbox were drained;
- repository inspection localized the rejection to the existing production lifecycle gate: a non-active Obsidian synchronization lifecycle correctly causes `CoreRunCoordinator.beginRun()` to return `stopping` before mutation authority is granted.

This is an **S08F physical execution-harness/environment defect**, not authorization to modify production synchronization semantics. The fail-closed production lifecycle behavior remains required.

Authorized retry identity:

- retry run ID: `s08f-desktop-canary-4f9c69c-r2`;
- scenario ID: `s08f-desktop-live-canary-r2`;
- device command ID remains `windows-brain-patrick`;
- disposable vault, managed remote, fixture root/content, accepted S08E runtime source, validation artifact, and production artifact identities remain unchanged from sections 0.1–0.4.

Retry preconditions and execution rules:

1. Re-prove the exact attempt-1 safe state above before any retry mutation.
2. Establish a **real Windows/Obsidian suspend→resume lifecycle transition** and require the renderer to be visible before retry commands may execute.
3. Use a fresh sequence-state file for the retry run; do not reuse, rewrite, delete, or replay attempt-1 sequence state.
4. The retry device poller must not execute commands while the renderer is hidden/non-active.
5. Use the accepted S08C/S08D/S08E agent, Drive mailbox, local relay, production-control seam, and single scenario runner. No parallel runtime or production control path is authorized.
6. Demonstrate the complete bounded canary, objective observation, cleanup synchronization, exact-duplicate replay, stale-sequence rejection, wrong-run rejection, and wrong-device rejection.
7. Restore the ordinary production `main.js` / `manifest.json`, preserve `data.json`, and remove validation-only build identity from the installed disposable plugin after a successful physical canary.
8. Preserve failed diagnostic state when useful; do not blindly replay a failed sequence.
9. Physical PASS means **READY FOR LOCAL PHX-CI VERIFICATION**, not final S08F acceptance.

Protocol-compliant repository-controlled continuation harness:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/Invoke-S08FProtocolContinuation.ps1`

This harness location is inside S08F's already-authorized evidence root. It does not add a fifth `dev/scripts` BVP PowerShell verifier and does not modify production, test-platform runtime, governance, or PHX-CI surfaces.



## 0.6 Supervisor Prerequisite Binding — Multi-Root Remote Folder Recovery

S08F has now proved the accepted stack materially incapable of completing one legitimate live recovery state without a bounded prerequisite repair.

Observed physical evidence at evidence commit `39cf1ff62fb927aba9d2ee49f99724d9ce1f2856`:

- retry `s08f-desktop-canary-4f9c69c-r2` is durably terminal at sequence 3 as `rejected / production-action-rejected` and MUST NOT be replayed;
- production independently records terminal `uncertain`, reason `uncertain-physical-outcome`, zero committed operations, and `recovery-required`;
- the exact canary fixture remains preserved;
- accepted production recovery `previewManual()` reaches the existing durable-intent recovery path but returns no plan because the persisted remote-folder effect remains `outcome-unknown: managed-root-unobservable:recovery-required`;
- repository grounding shows the concrete Drive recovery reader falls back from an absent reserved folder ID to `uniqueManagedRoot()`, which requires account-global managed-root uniqueness;
- the disposable S08F managed root legitimately coexists with another managed root on the same authenticated Drive account, so account-global uniqueness is not a valid recovery prerequisite for this folder descriptor;
- the frozen `RemoteFolderCreatePhysicalMutationDescriptor` already carries the intended parent remote object ID. That value remains expectation-only until exact Drive reads prove the parent object and its actual managed-root ancestry.

This explicitly authorizes one bounded prerequisite repair inside the existing S08F task branch.

Exact writable prerequisite paths:

- `src/drive/google-drive-port.ts`;
- `test/workstreams/drive/phase6-remote-protocol.test.ts`;
- derived shipping artifact `main.js`, but only as the deterministic output of the repaired production build after source/test verification passes;
- this S08F task file;
- existing S08F evidence root `dev/evidence/2026-10-02-BVP-S08F-4f9c69c/**` for repair evidence only.

Repair semantic boundary:

1. Do not change frozen synchronization contracts or descriptors.
2. Do not widen OAuth scope or introduce a second recovery mechanism.
3. For an absent reserved remote-folder ID, use the persisted parent ID only to select an exact read; treat no descriptor value as observed proof.
4. Require the exact parent object to be remotely observed as a live folder.
5. Prove that observed parent's actual ancestry reaches one managed root using existing Drive ancestry logic.
6. Resolve the intended parent path under that observed root and require it to identify the same exact parent object before target absence/occupancy may be classified.
7. Preserve conservative `unobservable` behavior for missing, moved, ambiguous, inaccessible, non-folder, or structurally inconsistent parent evidence.
8. Add regression coverage proving recovery remains authoritative with multiple managed roots visible on the same account and performs no Drive mutation.
9. Preserve all existing folder-recovery semantics and tests.
10. Keep the semantic source/test candidate distinct from the derived `main.js` artifact commit and from the subsequent evidence-only commit.

After automated verification, rebuild the validation artifact from the exact repaired source SHA, rebind S08F artifact identity, and resume product-authority recovery from the preserved physical state. Do not begin S09.
