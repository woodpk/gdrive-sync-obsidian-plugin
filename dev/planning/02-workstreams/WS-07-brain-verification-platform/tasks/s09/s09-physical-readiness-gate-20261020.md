# WS-07 S09 — Physical readiness and authorization gate (2026-10-20)

**Status (updated 2026-10-21): SOFTWARE PHX-CI BRIDGE MERGED AND ACCEPTED FOR NONPHYSICAL SINGLE-CONTROLLER USE; PHYSICAL EXECUTION STILL BLOCKED.** This is a *read-only grounding and future gate contract*, not a reactivation of preplanned S09A–S09V, not an executable physical test assignment, not a software-verification result, and not release/installation/activation authority.

## 1. Source of truth and current baseline

Repository: `woodpk/gdrive-sync-obsidian-plugin`.

- Software-only S09 G1 integration: PR #153 MERGED into `master` at `067857effe1d930b25db4dd7879601a0f918e1b2`. Initial post-merge state commit: `d37edb9a1219a30616ea465fb8b0d7cda8d1ec03`; obtain fresh `master` HEAD before any later execution.
- Accepted exact production/test source: `9c100e4702190fe5e7908ea76f2f10068dc6e548`, tree `4c92e604228ae8a383bbb077a5535aa5e104607f`.
- Genuine PHX-CI qualification: `ba2e1467-ded5-48bb-9d86-4ee2de7b2f42`, PASS 11/11, original publication `18e2b38ec8da83395146dafbd6bdae1f3bdfbd20`, unchanged original run files under `dev/test-results/ba2e1467-ded5-48bb-9d86-4ee2de7b2f42/`.
- Independent review: `dev/reviews/s09-g1-20261020-review-brain-09-final.md`, commit `b45ed296b88e8423fa45a4ac29c2f478a01d9d7d`; verdict PASS WITH MINOR FINDINGS for the bounded **software** mitigation only. M-01 source-review isolation limitation, M-02 risk-accepted but unfixed DEC-340-01, M-03 unverified physical/runtime conditions remain retained.
- Governing physical scope: `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` (especially prospective DEC-339 and S09 rules), `04-VERIFICATION-PLAN.md`, active product target specification §13 and `dev/authority/decision-register.yaml`. The former `tasks/s09/09a-...` through `09v-...` are **PREPLANNED / NOT-YET-EXECUTABLE**, and the current decomposition explicitly prohibits reactivating them or rerunning the old S09A canary automatically.

This contract is *not* a replacement Build Unit or a dispatch authorization. The old S09 G1 handoff-count remains 6; no new cross-role transfer is made by this planning step.

## 2. Existing physical evidence — preserve its distinct verdicts

1. Historical Windows initial-sync BVP run `bvp-s09a-windows-initial-sync-20261009T113754861Z-eadfbfe3` is **BLOCKED**, `device-result-unavailable`, due to a 60-second controller wait. Its original `result.json`, `result.md` and attempt records must remain unchanged. The separate `supplemental-late-completion.md` reports that production subsequently completed and verified 23 effects and preserved the canary; it **does not** establish the missing post-sync BVP observation/assertion steps or retroactively turn the battery PASS.
2. `dev/research/s09a-request-attribution-live-analysis-2026-10-10.md` records a different bounded Windows request-attribution **canary COMPLETE**, with one exact run having 25 committed operations and a measured 223 HTTP requests, 35 not attributed to a request-purpose scope. That supports only its bounded claims. It is not Windows+iOS baseline acceptance and is not permission for another run.
3. `04-VERIFICATION-PLAN.md` separately records an S09A canary issue involving an unexpected second `upload-create` hash resolving to the canary parent folder; remote existence/authority is **not independently established** under that decision. Preserve the safety guard and distinguish this from the separately completed attribution canary; resolve contradictory or stale run interpretations using the original *specific run* evidence before physical dispatch.
4. Historical physical data.json loss/corruption **root cause is unproved**, as distinguished from the accepted fail-closed software mitigation; see `dev/research/s09-g1-data-json-integrity-investigation-2026-10-14.md`.
5. `dev/scripts/README.md` says historical `Invoke-BVP-Battery.ps1` / `Invoke-BVP-Deterministic-Battery.ps1` are fail-closed compatibility sentinels. The live physical battery operator remains **BLOCKED** until a genuine PHX-CI-owned or explicitly PHX-CI-coordinated adapter is approved and available; direct Node battery execution is not verification authority. Current `test-platform/src/live-device/` implementation and live scenarios do not by themselves prove that a deployable, physically accepted artifact or PHX-CI adapter exists.

## 3. Required bindings before physical execution (currently NOT established)

All columns below are mandatory, scoped to **one** bounded future authorization. Resolve by original artifacts or deliberate Owner-approved physical fixture selection; do not infer from historical machines/accounts/roots.

| Binding | Current disposition | Evidence required |
| --- | --- | --- |
| Fresh integrated source / permitted verification base | `master` software integrated; future HEAD must be rechecked | Immutable Git source/tree, accepted source ancestry, current PHX-CI runtime, relevant current code/test evidence |
| S08 live-device infrastructure and physical-run adapter | Components and tests exist; **live PHX-CI execution route not accepted** | Named installed PHX-CI-owned adapter/version, successful PHX-CI-only qualification and no standalone validation shortcut |
| Windows installed Obsidian build | UNBOUND | Exact device/runtime/version, isolated vault, artifact manifest and `main.js` SHA, successful runtime load observation |
| iOS installed Obsidian build | UNBOUND | Exact device/runtime/version, independently loaded artifact, iOS-specific capability/permission observations |
| Validation-only artifact for each device | NOT PREPARED / NOT AUTHORIZED TO INSTALL | Source-built reproducible `build-identity.json`, `main.js` and `manifest.json` hashes; production-vs-validation build separation; explicit controlled-install approval |
| Google account / OAuth authority per device | UNBOUND / NO CREDENTIALS IN GIT | Authorized disposable account and managed root; same-device OAuth, no token export or shared secrets |
| Disposable local/remote fixtures | UNBOUND | Explicitly isolated Windows and iOS test vaults, bounded disposable Drive root, empty/safe starting state, object ID/path/parent allowlist, owner approval for any mutations |
| Identity and preservation preconditions | UNBOUND | Distinct device IDs, pairing namespace/remote identity, a read-only data.json existence/identity baseline before and after; fail closed on ambiguous existing state |
| Historical canary dispositions | OPEN | Exact-run reconciliation of completed versus blocked evidence; check unresolved parent-folder authority without automatically recreating a folder or rerunning canary |
| Physical operation budget and rollback | UNBOUND | Exact action allowlist, capped writes/requests/time, no personal vault or unrelated Drive data, stop conditions, authority/receipt/cleanup plan |
| Run/checkpoint/evidence binding | UNBOUND | Run ID, command device mapping, physical checkpoints, PHX-CI-owned attempt/result storage, bounded authorized resume semantics and final signed evidence |
| Human Owner execution authorization | **NOT GRANTED** | Explicit approval of devices, vault/Drive fixtures, authentication/install permissions, allowed read/write operations and physical-run scope |

Historical Windows device/relay identifiers in old BVP logs are evidence for their *old* runs, not current binding. iOS readiness or dual-device pairing cannot be inferred from a Windows-only canary. No new artifact digest has been authorized for product shipping.

## 4. Nonexecuting prerequisite sequence

**P0 — Read-only evidence reconciliation (allowed now).** Verify current source/evidence and each distinct S09A historical run; inventory exact S08 contracts, device-command scope, existing scenario preconditions, post-timeout recovery controls and the physical evidence already accepted. Do not convert old BLOCKED verdicts to PASS or fill current identity fields from old run metadata.

**P1 — PHX-CI physical integration gap decision (no live run).** If current PHX-CI has no authenticated physical adapter, author a bounded *software-only* adapter work-unit proposal grounded against the deployed PHX-CI runtime and the existing BVP command transport, without a new correctness oracle/PowerShell scenario verifier or remote operations. Any adapter implementation/test change must use PHX-CI qualification and independent final Reviewer acceptance before subsequent physical execution. An adapter is not implied to be already present.

**P2 — Owner-governed physical binding (separate future gate).** Bind exact non-secret machine/Obsidian/version, Windows+iOS test vault, disposable Drive root, device identities, OAuth-account configuration, data.json preservation checks, generated artifact hashes, operation budgets and allowlisted physical commands. Submit a precise physical authorization scope; no defaults from a prior canary.

**P3 — Only after separate approval, produce an executable physical contract.** The designated Builder must refresh GitHub and normative requirements, prove S08 predecessor sufficiency and PHX-CI adapter availability, confirm all P2 preconditions, bind an exclusive run ID and explicit writable surfaces/checkpoints, and use PHX-CI as the sole software-validation authority. Start with no-mutation inventory/physical load/auth/pairing observations as separately approved before any write-bearing synchronizations. A physical run is independently gated from software artifact release/promotion.

**P4 — Later scope only.** Subsequent S09B–S09V physical evidence and Stage 3 are **not initiated** by P0–P3. No installed-product activation, personal-vault migration, durable account changes, managed-root creation or remote deletion may be inferred from software-only merge or this file.

## 5. Fail-closed physical checkpoint contract (future only)

Before *any* physical action, the operator must receive: exact device, action, expected objective observation, approved root/path ID(s), evidence capture mechanism, failure/timeout stop condition, and a human confirmation requirement. Never store token/authorization code, personal vault contents or secrets in repository evidence. Specifically:

- Observation or credential/identity ambiguity -> **BLOCKED**, no write.
- Unknown remote child or nonempty personal-root collision -> **STOP**, preserve existing state; no inferred absence/deletion.
- Unexpected additional planned effect or unapproved parent creation -> **STOP** before execution.
- Timed-out production receipt -> **device-result-unavailable**, not effect failure; do not re-dispatch the command before exact source/run/lease/receipt reconciliation.
- data.json missing/invalid/uncertain -> **STOP**; preserve bytes and cause evidence, no default overwrite or re-pairing.
- After a separately approved run, require device receipts, observed state/identity, exact original attempt logs and any supplemental late results without rewriting original verdicts.

## 6. Readiness verdict and next permitted action

**Current readiness: PREPARATION DOCUMENTED; PHYSICAL EXECUTION BLOCKED.** No new live testing, installation, Drive/vault mutation, PHX-CI execution, release approval or Stage 3 took place while preparing this contract.

The next permissible engineering action is a **read-only S08/PHX-CI adapter capability and physical-evidence dependency inventory**, then (only if needed) a separately grounded software-only adapter Build Unit; this is *not* activation of S09A. Any real physical execution requires the explicit Owner approvals and complete bindings above.

## 7. Read-only S08 / PHX-CI adapter inventory — 2026-10-20

This inventory used GitHub source/document inspection only; **no executable validation, deployment or device interaction**.

| Surface inspected | Direct observation | Disposition |
| --- | --- | --- |
| `woodpk/phx-ci` verified product runtime pin `69c4aa077d4a1a46d1e85e59f39d36285be99e83` | Generic `scripts/Invoke-PhxCi.ps1`, `scripts/Invoke-PhxCiVerification.ps1`, and Node/.NET/Python adapters; no physical/BVP-named adapter script in that pinned tree | Physical battery PHX-CI coordinator **NOT ESTABLISHED** by pinned runtime |
| `woodpk/phx-ci` repository `master` inspected at `381a30dc930998279bfbc788581ad8a50dacf120` | Generic adapters/front doors present; no physical/BVP-named adapter script in inspected tree | Newer branch presence **does not** count as approved or deployed runtime |
| Pinned PHX-CI `docs/node-adapter.md` | Stage overrides permit selected *software* commands, with semantic stage preservation; the generic Node adapter is not itself a physical checkpointed battery operator | A focused test command is **not** a substitute for PHX-CI-owned live execution, checkpoint provenance and original-attempt publication |
| BRAIN `test-platform/src/live-device/*` | `build-validation-artifact.ts` constructs a distinct validation build identity; `device-command-agent.ts` and `live-scenario-executor.ts` model addressed device commands, observed receipts, controller leases and checkpoint/resume | S08 building blocks **EXIST**, but existence of code does not establish an authorized live run path |
| BRAIN `test-platform/scenarios/live/s09a-dual-device-readiness.ts`, `s09a-ios-initial-sync.ts` | Registered live scenarios require observed devices; the iOS scenario contains a write-bearing local canary and production synchronization step | **DO NOT EXECUTE** under the present preparation-only authorization |
| BRAIN `dev/scripts/README.md` | The legacy battery wrappers are fail-closed and explicitly state that live physical execution is BLOCKED until an approved PHX-CI-coordinated path exists | Confirms current physical-execution blocker |
| BRAIN `dev/scripts/Invoke-PHXCI-S09A-Deploy.ps1` | Historical deploy/staging script embeds an old task branch, absolute local repository/vault paths and an already-obsolete build identity; script explicitly stages into a local plugin directory | **DO NOT REUSE OR INVOKE** for current S09; no new artifact installation approval |
| Physical records and S09A planning | Historical Windows timeout, later receipt, separate request-attribution canary, unbound iOS/load/pairing and unproven physical data.json incident | Overall physical S09 readiness **NOT ACCEPTED** |

### P1 engineering design boundary (prospective, not an executable assignment)

If an executable adapter is truly absent, the **next nonphysical engineering work unit** is a bounded PHX-CI ownership/integration design: identify the host repository that owns the coordinator; require existing `ScenarioDefinition` and `LiveScenarioExecutor` rather than duplicating scenario logic; specify per-attempt immutable evidence, checkpoint freezing, authorized resume with no repeated effects, version/source/device identity gates, secret redaction, and rejection of direct standalone battery launchers. The prospective adapter's test plan must satisfy the applicable ten-family coverage and Test-Change Integrity; any code change must receive PHX-CI qualification and independent final Reviewer assessment. No adapter implementation is authorized by this planning file, and no new CI-verifier script may be invented outside governing scope.

The plan remains **PREPARED / BLOCKED** until an actual approved adapter and physical fixture/Owner bindings are established. The accepted S09 G1 source/PHX-CI evidence is unchanged by this inventory.

## 8. Exact integration-path verification — 2026-10-20 (read-only)

**Determination:** BVP is implemented and integrated with PHX-CI for the deterministic and BVP infrastructure test suite. The physical battery runner and its safety logic are implemented in BRAIN, but a **current approved PHX-CI-managed physical attempt/checkpoint/resume/evidence lifecycle is NOT WIRED in the inspected repository/runtime source**. This is narrower than "BVP is unfinished" and does not prove the physical live runner itself defective. No tests or physical operations were executed in this review.

### Confirmed working separation

1. Consumer PHX-CI configuration at `Taskfile.yml`, `Taskfile.phx-ci.yml`, `phx-ci.json`, and `package.json` is real. PHX-CI runs the focused `npm run test:bvp-root` suite and product suite with repository/build/artifact checks. Original qualified S09 G1 `ba2e1467-ded5-48bb-9d86-4ee2de7b2f42` completed 11/11 stages, focused 403/403 and full 1292/1292. These are **automated tests, not physical-device S09 acceptance**.
2. BVP live implementation exists: `test-platform/src/live-device/{build-validation-artifact,device-command-agent,drive-mailbox,live-scenario-executor,validation-entrypoint}.ts`; live battery definitions/CLI `test-platform/test/batteries/{battery-registry,run-live-battery,late-completion-recovery}.ts`; tests of relay/device command/sequence/checkpoint/recovery under `test-platform/test/`.
3. The BVP CLI `run-live-battery.ts` intentionally returns **0** on completed, **3** for a physical checkpoint, or **1** for blocked/failed with no checkpoint. It emits a runner result and optional checkpoint to a specified file. The BVP code handles run identity, observed device commands and late completion.
4. In pinned `woodpk/phx-ci` source `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, `taskfiles/node.yml` and `taskfiles/common.yml` expose normal install/typecheck/focused-test/full-test/build/check stages. `scripts/common/Invoke-RecordedStage.ps1` maps stage exit **0 → PASS** and **nonzero → FAIL**; `scripts/Invoke-PhxCiVerification.ps1` accepts a focused-test command but exposes no physical battery-specific initial-attempt/checkpoint/resume interface or a way to retain a checkpoint pending human evidence as a separate authorized stage disposition. Therefore running the physical CLI as an ordinary focused test would **not establish** the required physical checkpoint/resume/evidence contract. The current `woodpk/phx-ci` `master` inspected at `381a30dc930998279bfbc788581ad8a50dacf120` similarly lacks a BVP/physical-named adapter entrypoint; it is not the consumer's current pinned/qualified runtime.
5. BRAIN's `dev/scripts/Invoke-BVP-Battery.ps1` intentionally throws `BVP_F1_PHX_CI_REQUIRED`; `dev/scripts/Invoke-BVP-Deterministic-Battery.ps1` also fails closed while referring deterministic tests to PHX-CI. `dev/scripts/Invoke-PHXCI-S09A-Deploy.ps1` is a **historical artifact-stage-and-install script** with obsolete hardcoded source/branch/vault identities; it is neither the current physical runner nor permission to install or run anything.

### Smallest engineering gap to resolve

**Do not rebuild BVP scenarios, runners, device agents, simulated environments, test catalogs, or production sync logic.** The missing integration is a **PHX-CI-owned/coordinated physical runner contract** that:

- accepts exact source/validation-build hash, live scenario, device-map/relay identities, bounded operation allowlist and an approved physical run ID;
- calls BVP's existing `run-live-battery` / `LiveScenarioExecutor` through a controlled interface, without running external validation outside PHX-CI or creating a second test oracle;
- models initial attempt, external/human checkpoint, blocked/failure, authorized resume and verified late-receipt continuation **without replaying a completed physical effect**;
- publishes **original immutable attempt** output (including exit 3/checkpoint as a non-PASS disposition, not silently remapping it to success), redacted command/output records, verified device/receipt correlation, and separate subsequent attempt/continuation artifacts to the canonical PHX-CI run/evidence record;
- preserves the PHX-CI standard software-verification 11-stage gates and integrates physical-run acceptance as an additional separately controlled capability, not a replacement test-focused shortcut;
- is designed, tested, PHX-CI-qualified and independently reviewed under a separate **software-only** work unit in whichever repo owns the interface, with a deliberate version/pin update before any BRAIN live physical execution.

### Execution authority and verification limits

This inspection shows **no current authorized end-to-end physical runner integration**; it cannot assert that no alternative private/local adapter exists outside the GitHub/pinned runtime source inspected. Any such alternative must have an exact published source/version, approved owner, reproducible run/evidence contract and independently reviewable PHX-CI verification before it could satisfy the prerequisite. No new physical adapter, scripts, deployment, release, vault use, Drive access or test run was created.

**Next engineering action:** Bound the adapter ownership and accepted run/checkpoint/evidence interface as a software-only Build Unit. This is a specific integration job, **not** a request to redesign the existing BVP automated testing platform. A future PHX-CI runtime upgrade or BRAIN consumer pin update requires its own authorization/qualification as appropriate.

## 9. Owner-directed replacement of prospective adapter ownership (2026-10-20)

The human Owner has now expressly prohibited **any PHX-CI tool changes** in this integration effort, including a framework-side physical coordinator enhancement or pin update. This overrides the *prospective owner-selection* wording in `7–8 above; their original factual source inventory, physical gates and historical evidence remain unchanged.

The engineering effort is BRAIN-only, using PHX-CI's **already supported** focused stage and stage-output publication. The proposed narrow BRAIN adapter publishes no competing records; it explores carriage of bounded existing BVP checkpoint/result bytes inside PHX-CI's automatically captured/published structured `test-focused.stdout` and exact immutable PHX evidence path. This hypothesis must be demonstrated through nonphysical PHX-CI execution before any live physical attempt. If it fails under existing PHX interfaces, engineering must report a **BRAIN design blocker**, not request PHX changes or revive the old launcher.

New planning source: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`. Decision authority: DEC-345. Neither this correction nor any software-only qualification grants physical devices, installation, OAuth, vault/Drive mutation, S09A rerun, release or Stage 3.


## 9. 2026-10-21 software-merge update and supported operator route

**Update to earlier P1 inventory:** The preceding 2026-10-20 statements that a qualifying BRAIN-side PHX-CI bridge was not wired describe the historical state. They are **superseded for nonphysical software use only** by completed S09-BR01/BR02 Scope A development and independent acceptance. The pinned PHX-CI framework itself remains unchanged and does not acquire a new built-in physical adapter.

- Owner explicitly authorized SOFTWARE-ONLY master integration on 2026-10-21. PR **#154** was merged as **\`59037ba35c1b3daf60a4dddf1047151a9a5806c2\`**, with merged tree **\`b01753284466dd53f28e7364335d77e2fee30be9\`** exactly equal to its approved source branch tree. This does not imply product installation/release authorization.
- Corrected implementation independently accepted at source **\`51d75e63eac1f3a37ef998cf599f039dce7feb2f\`**, verified tree **\`3c362f4ef9cae621415deedf892f83bace20a574\`**, Reviewer report **\`dev/reviews/s09-br02-20261021-review-brain-09-r3-final.md\`** published **\`9f66cecb88a1066c7f2452d5f00ea149bfeee850\`**; exact verdict **PASS WITH BOUNDED FINDINGS** for single-Windows-controller nonphysical software.
- PHX-CI pin **\`69c4aa077d4a1a46d1e85e59f39d36285be99e83\`**. R4 software test run **\`538f331b-9436-4c25-9e97-1cd286ce1de3\`** PASS, 448/448 focused BVP tests; actual BVP bridge/runner nonphysical first checkpoint **\`6658c44e-058a-4696-aa1d-bcc3b372d3b8\`** expected BLOCKED, second resumed **\`4323c021-1c8f-4c35-a3e3-79148d5f39c2\`** PASS 11/11, original records immutably published and preserved.
- Operator route for ordinary, **nonphysical automated BVP verification:** installed immutable \`scripts/Invoke-PhxCi.ps1\` from the pinned runtime, \`-FocusedTestCommand 'npm run test:bvp-root'\`, use a separate verification branch and \`-PublicationMode push\` to prevent PHX-CI evidence publication from advancing \`master\`. Development artifact observation must use the previously approved \`BRAIN_ARTIFACT_PURPOSE=development\`, \`BVP_CHANGE_CLASS=ordinary\` controls only in genuine PHX-CI verification.
- The old \`dev/scripts/Invoke-BVP-Battery.ps1\` and \`Invoke-BVP-Deterministic-Battery.ps1\` are intentionally fail-closed and must not be used as runners. No direct Node or npm tests may substitute for PHX-CI acceptance.
- **Physical execution remains separately gated:** one controlled Windows verifier is not a distributed multi-controller coordinator; no real installed runtime/manifest/Obsidian app on Windows or iOS has been rebound, no disposable vault/Drive root or approved OAuth authority bound, and future physical observations may be rejected by the strict privacy contract. The requirements and stop conditions in §§3–5 remain binding. No live S09 battery, personal data, installation/activation, release, or Stage 3 authorized. A future separately approved run must bind exact safe fixture/device/command identities and a new explicit Owner-approved physical scope before performing any real effects.


## 10. 2026-10-22 Windows 0.1.19 startup and minimum physical-run effect inventory

**Status: P0 READ-ONLY ENGINEERING RECONCILIATION ONLY. NO PHYSICAL BATTERY EXECUTED OR APPROVED.** This note advances current readiness after the published prerelease; it does not supersede the bounded physical-effect/Owner/PHX-CI gates above.

- The shipping 0.1.19 GitHub prerelease is published at tag `0.1.19` (tag target `6fea57fdded4a643556defe8a546e1225e46f918`). Its shipping `main.js` SHA-256 is `6bb0012cb21a244a2f53a44b7bdcf3203b6284070bb3b725d7b32d919c2b881d`.
- The existing **Windows BVP validation-only** installation in `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b` was inspected by the Owner with Obsidian closed: installed `main.js` SHA-256 `90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7`, matching validation identity source `2bf51ca15aec9c752e3ac7769fcf3ac237df99df`; manifest version 0.1.19 and matching approved manifest hash. `data.json` is readable and byte-identical to the verified pre-install backup, stable pairing and first-sync-complete fields are present, all three automatic-sync toggles are false, and the plugin is enabled. The Owner separately reports it subsequently loaded correctly inside Obsidian. These are local/operator observations, **not a PHX-CI physical S09 PASS**, remote-state proof, or independently measured network/authentication observation.
- Current `test-platform/scenarios/live/s09a-dual-device-readiness.ts` is observe/assert only, but requires **both Windows and iOS**, so cannot be dispatched as a Windows-only battery. `windows-live-smoke.ts` is Windows-only but is **not read-only**: it sends a device-state observation, creates a file within the run-scoped BVP-VALIDATION local fixture, then observes/asserts it. It must not be substituted for a purported no-mutation probe.
- The installed validation-only `build-validation-artifact.ts` polls BVP's Google Drive mailbox separately from ordinary automatic sync. The mailbox `rootId()` can POST-create a control folder if absent; dispatch also requires run-binding, command and result metadata writes, plus controller/relay scratch and leases. An on-line startup or BVP physical battery therefore **cannot be represented as guaranteed remote-write-free merely because the three ordinary sync toggles are disabled**.
- The accepted `phxci-physical-bridge.ts` enforces `owner-approved-physical`, exact approved physical scope, PHX-CI execution context, installed-artifact hash/manifest binding, privacy pseudonyms, isolated `C:\temp\<GUID>` scratch, and durable single-Windows-controller run authority. It was independently accepted for **nonphysical single-controller software behavior**; real device readiness remains a separate Owner-approved binding and original-evidence obligation.
- **Next proposed narrow physical battery** after explicit Owner authorization and preflight: existing `windows-live-smoke`, one Windows participant, exact installed 0.1.19 BVP validation build, one disposable BVP-VALIDATION local fixture, BVP-only control mailbox metadata, PHX-CI coordinated run/evidence, **zero production sync executions and zero changes to personal vault, BRAIN synchronized remote, credentials, or pairing**. Bind the exact device pseudonym, local fixture namespace, BVP mailbox ownership and creation policy, approved metadata effects, current physical lease/relay state, scratch GUID, runnable exact PHX source, and stop/retry rules before dispatch. **No implicit permission to create a new Drive mailbox root**: when root ownership/existence is unknown, stop and obtain a deliberate Owner policy decision rather than invoking the create-on-miss API path.
- Human "let's proceed" to the previously described read-only readiness step is **not** approval of the newly discovered remote metadata writes/local fixture creation. Do not assert physical readiness PASS, run a standalone BVP launcher, edit PHX-CI, authorize S09A–S09V generally, rerun the blocked historical canary, or initiate synchronization.

**Immediate safe disposition:** prior software/release/install gates remain complete; read-only source/effect inventory complete; first meaningful live Windows BVP run **awaits a precisely scoped authorization for the fixture and control-plane metadata effects and an execution-safe PHX-CI operator binding**.


## 11. 2026-10-22 owner go-ahead and Windows live-controller relay wiring blocker

**Owner direction:** Following explicit description of the `windows-live-smoke` battery's single local fixture, BVP command/result metadata writes, and excluded new mailbox-root/cleanup/synchronization effects, the Owner instructed, “let's begin now.” Treat this as intent/permission to progress **only the described Windows smoke scope**, not unconditional operation authority for an unbound executable or any additional effects.

**Confirmed from source (read-only inspection, not a physical run):**

1. The installed exact 0.1.19 validation-only artifact's source `test-platform/src/live-device/build-validation-artifact.ts` binds the Windows runtime relay to `this.app.vault.configDir + "/plugins/" + this.manifest.id + "/.bvp-relay"` on the **existing D: BVP vault**. The runtime's `createWindowsMailboxRelay` reads local `outbox`, publishes BVP-only commands to the Google Drive mailbox, collects matching results and writes local `inbox`.
2. The accepted `test-platform/test/batteries/phxci-physical-bridge.ts` **requires** the controller `paths.relayRoot` to be exactly `C:\temp\<32hex-guid>\relay`, and rejects non-isolated scratch path ancestry/symlinks. `test-platform/src/live-device/live-scenario-executor.ts` writes command files, controller authority, and waits for results under that supplied controller relay root.
3. There is **no evidenced, approved bidirectional transport** connecting the installed D:-vault `.bvp-relay` to the C:-scratch controller relay. The pinned PHX-CI source has only the ordinary verification front doors and no device-relay bridge. Without that transport, PHX-CI could time out `device-result-unavailable`, and retrying might create ambiguous remote effects or leases. Do not attempt to remedy via symlink/junction, ad hoc copy loop, direct Node runner, untracked sidecar, or a standalone verifier.
4. `createDriveCommandMailbox().rootId()` searches for the marked BVP mailbox folder and **creates one if none is found**, without an existing-root-only mode; its result cannot be assumed read-only. Existing mailbox-root presence/ownership, exact device pseudonym, physical relay and controller authority, and disposable fixture budget still require verified bindings. No new mailbox root was approved.
5. The previously accepted software-only Scope A BR01/BR02 tests did not qualify this particular Windows-installed relay route. `windows-live-smoke` legitimately creates one run-scoped BVP-local fixture; `s09a-dual-device-readiness` requires both Windows and iOS and is not an alternative Windows-only battery.

**Disposition:** the physical battery has **NOT BEEN DISPATCHED**. Its engineering preflight is **BLOCKED_BY_UNBOUND_PHYSICAL_RELAY_TRANSPORT_AND_MAILBOX_ROOT**, not a software or battery FAIL. Preserve release 0.1.19, installed plugin/settings/data, original S09 evidence, and current PHX-CI pin. The narrow owner's permission remains bounded and does not waive missing preconditions.

**Required correction sequence:** (a) reconcile whether an existing approved relay transport and previously owned BVP mailbox exist without creating either; (b) if no transport, define the smallest BRAIN-side PHX-CI-subordinate relay coordination correction, with explicit fixture/command budget, C:-scratch integrity and D:-vault containment, and without modifying PHX-CI or production sync; (c) independently qualify/review any software or operator-script change through the existing PHX-CI and Builder/Reviewer gates; (d) bind exact physical run source, installed SHA, device pseudonym, controller lease, scratch and mailbox policy before retry-free initial dispatch. Do not construct/run any such correction based solely on this planning note; it is an exposed execution dependency requiring a separate bounded engineering authorization if work is necessary.


## 12. 2026-10-22 Windows BVP direct-relay engineering correction (candidate)

**Engineering status: IMPLEMENTED ON A DEDICATED BUILDER BRANCH; PHX-CI NOT YET RUN; NO PHYSICAL BATTERY DISPATCHED.**

The real installed Windows validation plugin already reads/writes its local BVP relay under the disposable D: vault. Instead of introducing a competing daemon, a junction, or copying command records between drives, the existing PHX-CI-subordinate BVP runner now has an explicitly scoped exception to select the **exact same installed D: relay directory**. Its result, checkpoint, verification identity staging and independent PHX evidence remain in C:\temp\<GUID> scratch. The ordinary C:-only contract remains unchanged for nonphysical tests.

Candidate: branch fix/s09-windows-controller-plugin-relay-20261022. Requirement-derived tests were committed FIRST at 35fe4b352606a89417a5335eeab006458cd86d65 in test-platform/test/s09-windows-direct-relay-route.test.ts; the corrected bridge is in test-platform/test/batteries/phxci-physical-bridge.ts. The repository-controlled PHX-only qualification operator is dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1.

Hard boundaries: only the existing S08F disposable Windows BVP vault shape and existing windows-live-smoke battery; an explicit matching physicalPluginRelayRoot field, Owner-approved physical class and required BVP_OWNER_PHYSICAL_APPROVAL; no arbitrary D path, UNC, junction, symlink, different plugin, alternate battery or C: scratch escape. The physical bridge checks its staged validation artifact bytes against installed main.js and manifest.json, the existing device/pairing configuration and ordinary automatic-sync-off state, and refuses pending D relay commands. Until reviewed and separately authorized, no mailbox root creation, cleanup, production synchronization, iOS participation, or broad S09A–S09V activation.

The installed validation-only plugin remains unchanged at source 2bf51ca15aec9c752e3ac7769fcf3ac237df99df, SHA-256 90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7. A narrowly checked Git ancestry/diff allows newer nonshipping bridge code and its own exact tests/operator documentation while refusing product, scenario, manifest, and configuration drift.

**Open gates:** genuine pinned PHX-CI qualification with original published evidence; independent Builder→Reviewer acceptance; confirmation that current device identity is of the PHX-safe digest form and matches the installed agent; BVP control mailbox root existence/ownership and permitted effects; explicit live execution contract with distinct PHX and BVP run IDs. The source correction is NOT proof of a working remote control path, not physical S09 acceptance, and not authority to repeat a timed-out battery.


## 13. 2026-10-22 exact PHX-CI R1 focused failure and corrected test inventory

- Initial nonphysical PHX-CI qualification of the Windows direct-relay correction at source `1878c7b9f98efd74bb50a5151ee38c7dfbf9e971` returned **OVERALL BLOCKED**, focused-test stage exit 1, with original PHX-CI run `51f6d5f0-3a1e-45fc-b036-8ab61384eb68` and published evidence commit `79eb60993c77bdbdebf410b8a810f07d5bad86f9`. Repository/full product tests PASS, focused tests **451 PASS / 2 FAIL / 453 total**. Original evidence preserved.
- Root cause F-01: `architecture-metrics.test.ts` hardcoded count three, but the new PHX-only operator script is the **fourth** BVP PowerShell script; frozen ceiling remains four. Correct the test's actual-enumeration expectation, **do not raise the authoritative ceiling or exempt the new script**.
- Root cause F-02: the new test `s09-windows-direct-relay-route.test.ts` was compiled and automatically executed but missing from `batteries/deterministic-battery-registry.ts`, violating the exact all-platform-tests partition. Register the module under existing S09 test family, retaining the one-module-one-entry invariant.
- Both corrections have been committed; PHX-CI rerun is **pending**. The original R1 BLOCKED verdict never becomes PASS.
- Additional future physical gate from unchanged source: `src/state/state-policy.ts` generates device IDs of the form `device:<32-hex>`, passed unmodified to the installed BVP polling agent, but the current PHX privacy envelope demands `device:sha256:<64-hex>` identities. The direct-relay path correction alone does not provide a private raw-device-ID to public-pseudonym mapping; dispatching a physical battery without resolving this discrepancy would fail correlation or expose an unapproved identifier. **Do not weaken privacy, rewrite the installed pairing, substitute a claimed digest for the real mailbox address, or dispatch the physical test.** A separate strictly bounded PHX-owned identity-mapping design and authorization is necessary if confirmed.


## 14. 2026-10-22 PHX R2 repository-stage Obsidian stub collision and isolated fixture correction

**R2 frozen source:** `35dd7340d99ad67e0dcbd40da5e00e04911e24e6`. PHX-CI run `b61a2725-60f7-4508-b728-22bb217d22a5`, published evidence commit `5044508187d8a373f0e54a5e92fa130f1c743178`: change-set **PASS**, repository **FAIL**, overall **BLOCKED** (exit 201). Focused BVP tests passed; full production suite 1,289/1,292 passed, three failed. The three failures were F02-01/F02-02 tests in `tests/adversarial/s09-g1-runtime-authority-interleavings.test.ts`, each reporting a Node `writeFileSync` error `UNKNOWN: unknown error, open ...\.test-build\node_modules\obsidian\index.js`. No product assertion was reached for those cases. PHX evidence published; preserve this R2 failure and do not relabel it as PASS.

**Observed cause and bounded remedy:** that existing test writes to the same global top-level `.test-build/node_modules/obsidian/index.js` path used by another independently executed Node test file, `tests/adversarial/s09-g1-pairing-epoch-stale-results.test.ts`. Under Windows parallel Node processes, this is a plausible file-write/open race; the exact Windows low-level error mechanism is not independently proven. Commit `73445b8f464e36770cac1da066cec598dca2f98c` moves **only the first test's** Obsidian mock to `.test-build/src/node_modules/obsidian/index.js` (within its compiled production-module resolution search path). All original test assertions, BVP controls, product code, and production artifact remain unchanged. PHX-CI focused/repository rerun pending. Bridge frozen-installed-source-delta allowlist amended for this exact nonshipping test file; no generic exception for production changes.

**Safety gate:** this is a test-fixture/tooling correction, not evidence of production or synchronization failure. No physical battery dispatched. The separately noted actual `device:<32hex>` versus PHX privacy `device:sha256:<64hex>` mismatch remains OPEN; do not claim end-to-end controller-to-device operation from passing focused tests alone.
