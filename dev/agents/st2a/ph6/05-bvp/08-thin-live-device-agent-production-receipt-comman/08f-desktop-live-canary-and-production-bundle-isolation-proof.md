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
- generated production artifact identity/evidence for `main.js` from the exact repaired source SHA; `main.js` remains repository-ignored and MUST NOT be committed;
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
10. Keep the semantic source/test candidate distinct from generated `main.js`/validation artifacts and from the subsequent evidence-only commit; do not create a tracked `main.js` commit.

After automated verification, rebuild the validation artifact from the exact repaired source SHA, rebind S08F artifact identity, and resume product-authority recovery from the preserved physical state. Do not begin S09.

## 0.7 Protocol Reset — Prerequisite Verification Harness

The prior incremental prerequisite-verifier implementation is superseded. The replacement verifier is governed directly by the Agent-Led Software Engineering Operating Protocol.

Required verifier behavior:

1. Treat the verifier as a repository-controlled engineering build unit and adversarially review it before owner execution.
2. Use one owner execution to collect all safe independent diagnostics: exact candidate/repository state, bounded scope/contract freeze, toolchain/dependencies, static/type checks, focused recovery regressions, complete product tests, complete BVP tests, architecture/repository checks, production build, production artifact identity, validation artifact identity, and repository mutation audit.
3. Ordinary failures are structured evidence. Record PASS/FAIL/BLOCKED/SKIPPED/INDETERMINATE; block only dependency-unsafe stages; continue every independent safe diagnostic.
4. Use an exact-SHA GUID-isolated detached worktree. Never depend on or mutate the owner's active checkout.
5. On FAIL, preserve the diagnostic workspace and report its exact path. Do not publish a failure/evidence commit and do not move the remote task branch.
6. On PASS only, prepare canonical evidence under the authorized S08F evidence root, verify that evidence is the only residual tracked mutation, create one evidence-only child commit whose parent is the verified candidate, and push it under a branch lease.
7. A rerun after a successful evidence commit must recognize a direct evidence child whose canonical PASS evidence names the requested candidate and return the existing PASS rather than report branch drift.
8. main.js remains repository-ignored. Build and hash it from the exact candidate; do not attempt to track or commit it.
9. Raw diagnostic logs are evidence, not source. Source whitespace/diff checks apply only to bounded task/source/test/verifier surfaces and must not rewrite preserved raw logs.
10. Child-process execution must deterministically provide Node, npm, Git, PowerShell 7, and Windows system tools required by npm/BVP tests.
11. The final process exit code must agree with the consolidated result.
12. The chat launcher must remain small: retrieve the verifier from the exact candidate, invoke it, and propagate its status.
13. No disposable-vault, plugin-install, Google Drive, mailbox, or other physical S08F mutation is authorized by this prerequisite verifier.
14. Do not resume physical S08F recovery until this prerequisite verifier records PASS for the repaired source candidate.

Do not begin S09.

## 0.8 Supervisor Artifact-Identity Rebind Amendment

The protocol-aligned prerequisite verifier at candidate `64785b7214e79344e6b6dd89a97904fa8bcda431` completed every independent verification branch and isolated one remaining test-only blocker:

- the complete BVP suite executed 346 tests with 345 PASS / 1 FAIL;
- the sole failure is `test-platform/test/s08b-validation-build-entrypoint.test.ts` comparing the repaired production bundle SHA-256 against the pre-repair accepted S08E production hash;
- the exact repaired source deterministically builds production `main.js` SHA-256 `2082c5d216e71306b78c7235f4ed75186a452738a78f81dffc9dda99d67a1dc9` with the production build and isolation checks passing;
- the earlier S08F prerequisite binding already requires rebuilding and rebinding artifact identity after the bounded source repair.

This is a test-artifact identity rebind, not a production or architecture redesign.

Additional writable path for this bounded rebind only:

- `test-platform/test/s08b-validation-build-entrypoint.test.ts`.

Required change:

1. Rebind only the frozen accepted production SHA-256 constant from the pre-repair S08E production hash to `2082c5d216e71306b78c7235f4ed75186a452738a78f81dffc9dda99d67a1dc9`.
2. Do not alter validation-artifact construction semantics, architecture, governance, PHX-CI configuration, production code, or any other BVP test.
3. Update the prerequisite verifier's bounded changed-path allowlist to include exactly this test path.
4. Re-run the same complete protocol-aligned prerequisite verifier. Acceptance still requires every required stage PASS.

Do not begin S09.

## 0.9 Independent Review Rejection — Required Corrections

Independent review session `review-s08f-multi-root-recovery-prerequisite-01` REJECTED candidate `92d153b990ed0fca79eb76187d867cb272e5dadb` with three approval-blocking findings:

- `S08F-R01` CRITICAL — missing expected-parent exact observation incorrectly falls back to account-global managed-root discovery and can manufacture recovery authority;
- `S08F-R02` MAJOR — already-verified evidence-child recognition is insufficiently validated and can fail open;
- `S08F-R03` MODERATE — post-publication local-report failure can convert a published PASS into process FAIL.

Required correction binding:

1. `src/drive/google-drive-port.ts`: remove the expected-parent `not-found` fallback entirely. Any unsuccessful exact expected-parent read, including `not-found`, must return `unobservable`. Continue only after observing that exact object as a live folder, proving managed-root ancestry, resolving the intended parent path under that observed root, and matching that resolved ID to the exact observed parent ID.
2. `test/workstreams/drive/phase6-remote-protocol.test.ts`: add direct regressions for expected parent `not-found` and replacement-at-same-path. Both must remain unobservable, perform zero mutation, and perform zero account-global root enumeration.
3. Add or strengthen downstream recovery coverage so an unobservable missing/replaced parent remains recovery-pending / non-redispatchable rather than becoming verified-not-applied or safe-retry-eligible.
   Authorized downstream test-only path: `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`.
4. `Invoke-S08FPrerequisiteVerification.ps1`: already-verified recognition must require exactly one parent equal to the candidate, evidence-only changed paths, complete canonical PASS schema/identity, required stage presence with PASS status, matching verification base/branch/candidate, physicalMutationAttempted=false, and valid artifact identities.
5. Synthetic/fail-closed verifier self-checks must demonstrate that an out-of-scope direct child or incomplete/fabricated PASS report cannot be accepted as already verified.
6. Complete all verdict-affecting reporting before evidence publication, or make post-publication local reporting explicitly best-effort and incapable of changing a published PASS into FAIL.
7. Re-run full protocol-aligned verification after correction, then repeat independent REVIEW before ACCEPT.

No physical S08F execution is authorized while these review findings remain open. Do not begin S09.

## 0.10 Review-Correction Artifact Rebind Automation

The CRITICAL review correction changes production source after the previously accepted S08B production SHA was frozen. A separate owner execution solely to discover and then manually rebind the deterministic bundle hash is prohibited by the operating protocol's one-execution / bounded-automatic-repair preference.

The protocol-aligned prerequisite verifier is therefore authorized to perform exactly one bounded test-only artifact-identity rebind inside its GUID-isolated detached verification worktree before full verification:

1. Start from the exact supervisor-bound review-correction input candidate and a remote branch still leased to that candidate.
2. Install dependencies and build ordinary production `main.js` from that exact source before running the full suites.
3. Compute the generated production SHA-256 directly from `main.js`.
4. Read `test-platform/test/s08b-validation-build-entrypoint.test.ts` and identify exactly one frozen `acceptedProductionSha256` 64-hex constant.
5. If that constant already equals the generated hash, create no implementation commit.
6. If it differs, replace only that one constant; require the resulting Git diff to contain only that test file; require `git diff --check` PASS; and create one local test-only implementation child commit.
7. After any such rebind, treat the resulting local commit as the exact verification candidate. Re-run typecheck, focused recovery tests, the complete product suite, complete BVP suite, architecture guard/metrics, repository check, production build/isolation, validation-artifact identity, and repository mutation audit against that exact resulting commit.
8. The validation artifact must identify the resulting verified candidate SHA, not merely the input candidate.
9. On any FAIL/BLOCKED/INDETERMINATE result, publish neither the implementation child nor evidence; preserve the diagnostic workspace and leave the remote branch unchanged.
10. On complete PASS only, create one evidence-only child whose parent is the resulting verified candidate and push the local implementation child (if any) plus evidence child together as one fast-forward update while the remote branch is still leased to the input candidate.
11. Canonical evidence must record both `inputCandidateSha` and `candidateSha` when they differ.
12. A future rerun must recognize only the resulting verified candidate's strict canonical evidence child; the pre-rebind input SHA is not itself accepted as verified.

This authorization does not permit any production-source modification, any other BVP-test change, or any physical S08F action.

Do not begin S09.

## 0.11 Second Independent Review Rejection — Required Corrections

Independent review session `review-s08f-multi-root-recovery-prerequisite-02` REJECTED verified candidate `15e61ac0b0e6a9a353ade24a50195751129b2326` with the following disposition:

- `S08F-R01` remains CRITICAL: malformed successful exact-parent JSON can still manufacture recovery authority because returned object identity and explicit live-state evidence are not runtime-validated;
- `S08F-R02` remains MAJOR: existing-evidence recognition still accepts semantic files under the evidence root and does not independently prove rebind lineage / candidate-bound artifact identity;
- `S08F-R03` is CLOSED and must remain closed;
- new `S08F-R04` MODERATE: publication checks the branch lease before push but does not enforce the expected old SHA atomically at push time.

Required correction binding:

1. In `src/drive/google-drive-port.ts`, after a successful exact read of `descriptor.parentRemoteObjectId`, require runtime proof that the returned object's `id` is a non-empty string exactly equal to the requested parent ID and that `trashed` is explicitly present as `false` before ancestry/path authority may be derived. Missing/mismatched ID, missing/invalid live-state evidence, wrong MIME type, moved/ambiguous/inaccessible structure, or any other incomplete evidence remains `unobservable`.
2. In `test/workstreams/drive/phase6-remote-protocol.test.ts`, add direct malformed-success regressions for mismatched returned ID, missing returned ID, and missing explicit live-state (`trashed`) evidence. Each must remain `unobservable`, perform zero mutation, and perform no path/root authority fallback.
3. In `test/workstreams/orchestration/v1.2-durable-intent-recovery.test.ts`, extend downstream coverage so those malformed-parent reasons remain `recovery-pending` / `recovery-required`, retain `outcome-unknown`, and perform zero redispatch.
4. In `Invoke-S08FPrerequisiteVerification.ps1`, existing evidence recognition must accept only the exact canonical PASS JSON/Markdown/log paths; semantic verifier/harness files under the evidence directory are not evidence-only.
5. When canonical evidence reports an artifact-rebind candidate, recognition must independently prove from Git that the verified candidate is a single-parent child of `inputCandidateSha`, that its only changed path is the authorized S08B test, and that the candidate's actual `acceptedProductionSha256` constant equals the reported accepted/production SHA.
6. Canonical report validation must reconcile top-level production and validation artifact identities with their corresponding stage evidence and reject contradictory stage/top-level hashes or sizes.
7. Synthetic fail-closed self-checks must additionally reject: a child changing the verifier, an unrelated input SHA / false rebind lineage, and contradictory production artifact evidence, while continuing to accept a genuine coherent canonical model.
8. Evidence publication must retain a verified fast-forward topology and atomically enforce the exact expected remote old SHA during `git push` using an exact lease; a race/reset between pre-check and push must fail publication without moving the branch.
9. Re-run full protocol-aligned verification after correction, then repeat independent REVIEW before ACCEPT.

No physical S08F execution is authorized while these findings remain open. Do not begin S09.


## 0.12 Supervisor PHX-CI Runtime Rebind — Frozen Tool Environment Repair

Authoritative PHX-CI verification against runtime `192bc722bdd886c1b18731bf5fde35ec7cfe091c` reached the canonical PHX-CI runner but BLOCKED at `install` before any SUT test, build, repository-check, or artifact stage executed.

Observed PHX-CI evidence commit: `927ad0899574415303e91a882162e6d6c097a571`.

The blocker is a PHX-CI runtime/toolchain defect: `npm ci` launched successfully, but its lifecycle child `cmd.exe /c node install.js` could not resolve `node` from the inherited stage environment. The accepted product candidate was not implicated.

PHX-CI implementation `69c4aa077d4a1a46d1e85e59f39d36285be99e83` is the authorized replacement runtime source for this S08F verification. Its committed Stage 3 correction evidence records PASS for the full PHX-CI regression, including the frozen tool-environment boundary and the Node adapter regression proving focused/full lifecycle survival under adversarial inherited PATH.

This amendment supersedes the earlier S08F PHX-CI runtime binding only for authoritative repository verification. It does not modify product semantics, does not reopen the already-passed S08F prerequisite SUT verification, does not authorize physical S08F mutation, and does not authorize S09.

Required next action:

1. publish deployed PHX-CI runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83` into the standard runtime store;
2. run authoritative PHX-CI against the exact S08F task branch using base `4f9c69c38c12c09d2f06f3f966dc8519ed45a99f`, ordinary change class, and a GUID-isolated temp root under `C:\`;
3. do not rerun the custom S08F prerequisite verifier solely because of this administrative/runtime repair.


## 0.13 PHX-CI Evidence Recovery Acceptance

Authoritative PHX-CI run `34a003cf-8277-4ba5-8831-c9019eb65596` at source build HEAD `06c9dbeb95ee5f0b0336745e8772074e1ace9b56` and runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83` established:

- change-set verification PASS;
- repository verification PASS;
- focused tests PASS;
- full tests PASS;
- build PASS;
- artifact verification PASS;
- production `main.js` 886635 bytes / SHA-256 `550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477`.

The original PHX-CI evidence commit `ace5192897c08b4170407211260c89f71f74335f` reported Overall BLOCKED solely because the explicitly authorized `phx-ci.json` runtime rebind was evaluated under repository change class `ordinary`, producing exactly one architecture-guard violation: `FROZEN_SURFACE_CHANGED phx-ci.json`. Architecture metrics passed; no product/test/build/artifact failure was demonstrated.

Under the governing owner-rerun prohibition and evidence-recovery rule, the SUT is not rerun for this administrative classification defect. Canonical recovered PASS evidence is:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/S08F-PHX-CI-EVIDENCE-RECOVERY-PASS.md`

Recovery evidence commit:

`c744453d76eb5d39d442511c728c88b991a70639`

The original PHX-CI evidence remains preserved unchanged. The unexecuted composite `check` wrapper is not falsely claimed PASS.

Recovered authoritative repository verification verdict: **PASS**.

Next required process step: independent review of the bounded S08F prerequisite repair using the accepted implementation, prerequisite evidence, original PHX-CI evidence, and recovered PHX-CI PASS evidence. Physical S08F recovery and S09 remain unauthorized pending review/acceptance.


## 0.14 Final Independent Review — APPROVED

Final independent review of the bounded S08F prerequisite repair completed with:

- CRITICAL: 0
- MAJOR: 0
- MODERATE: 0
- MINOR: 0
- INFORMATIONAL: 0
- final verdict: `REVIEW RESULT: APPROVED`.

Canonical review evidence:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/S08F-FINAL-INDEPENDENT-REVIEW-APPROVED.md`

Review-evidence commit:

`249ae6fdb92b74a29426d389a4c729fc8b08fb50`

The reviewer independently confirmed closure of R01–R04, prerequisite evidence integrity, authoritative PHX-CI substantive PASS, PHX-CI evidence-recovery accuracy, exact-candidate typecheck/focused recovery verification, production build verification, and reproduced production artifact identity:

- `main.js`: 886635 bytes
- SHA-256: `550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477`

No remaining defect was identified within the assigned prerequisite-repair contract.

Protocol state is now:

`REVIEW → HUMAN ACCEPT`

Physical S08F recovery remains unauthorized until the human software owner explicitly ACCEPTS resumption. S09 remains unauthorized.


## 0.15 Human ACCEPT — Resume Preserved Physical S08F Recovery

The human software owner explicitly authorized:

`ACCEPT — resume physical S08F recovery`

Acceptance prerequisites satisfied before this authorization:

- bounded prerequisite repair verification PASS;
- authoritative PHX-CI substantive verification PASS with canonical evidence recovery;
- final independent review APPROVED with zero findings.

Authorized next scope:

1. resume only the preserved S08F physical recovery in the already-bound disposable Windows/Obsidian validation environment;
2. preserve all prior terminal and uncertain physical state;
3. do not replay attempt 1;
4. do not replay retry `s08f-desktop-canary-4f9c69c-r2`;
5. do not reset or discard uncertain physical evidence;
6. do not use the working BRAIN vault;
7. do not begin S09.

This ACCEPT authorizes the physical-recovery phase; it does not itself constitute S08F final PASS.


## 0.16 Post-Repair Physical Authority-Recovery Binding

Human ACCEPT in section 0.15 authorizes resumption of the preserved physical S08F state. The first authorized physical action is **product-authority recovery only**. The terminal retry `s08f-desktop-canary-4f9c69c-r2` MUST NOT be replayed or reset.

Verified repaired implementation:

`57e5be079ded16ba50b4f95c49f78a9d90b47f3f`

Required repaired ordinary production artifact:

- `main.js`: 886635 bytes
- SHA-256: `550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477`

Required repaired validation artifact:

- source: `57e5be079ded16ba50b4f95c49f78a9d90b47f3f`
- `main.js`: 911149 bytes
- SHA-256: `6c676900aaaf4aaa3417215d1eda2c16e578822715536ef1ffc0ca8741ffc9cf`
- manifest SHA-256: `f7ec45b74beb0e9edb041f17ae3af9e8f40b4cfd216ddbd3870adfdbd9d55ccc`

Preserved state that must be re-proved before mutation:

- disposable vault remains `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`;
- retry `r2` remains terminal at sequence 3 as `rejected / production-action-rejected`;
- product authority remains the preserved uncertain/recovery-required state until the repaired validation runtime resolves it;
- zero committed operations remain bound to the uncertain receipt;
- the exact 77-byte canary fixture remains present with SHA-256 `db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d`;
- the working BRAIN vault remains prohibited.

Repository-controlled physical authority-recovery harness:

`dev/evidence/2026-10-02-BVP-S08F-4f9c69c/Invoke-S08FPostRepairAuthorityRecovery.ps1`

The harness is authorized to:

1. create exact-SHA disposable worktrees for the repaired implementation and current S08F task/evidence head;
2. rebuild and verify the exact repaired production and validation artifacts;
3. verify the preserved r2 terminal state and exact canary fixture before mutation;
4. replace only disposable-vault validation `main.js`, `manifest.json`, and `build-identity.json`, while proving `data.json` remains byte-identical;
5. reload the validation plugin only as needed to make the repaired implementation active;
6. invoke the accepted production `previewManual()` recovery path against the preserved durable intent;
7. execute only an exact reviewed recovery plan that passes the existing non-destructive safety gate;
8. require a new authoritative complete receipt, `requiredEffectsCommittedAndVerified=true`, and final product status `idle-ready`;
9. require the exact canary fixture to remain unchanged throughout authority recovery;
10. record and publish evidence under the existing S08F evidence root using an exact branch lease.

The harness MUST stop after successful product-authority recovery with:

`READY FOR FRESH S08F CANARY IDENTITY BINDING`

It MUST NOT create a fresh canary identity or perform another canary mutation in the same execution.

A BLOCKED/FAIL result preserves the physical state and diagnostic workspace. The terminal r2 command remains non-replayable in every outcome.

This physical-recovery execution is supplementary physical validation, not a replacement for PHX-CI. Final repository verification after resulting physical evidence remains governed by the mandatory PHX-CI authority and the protocol's no-administrative-rerun rule.

S09 remains unauthorized.
