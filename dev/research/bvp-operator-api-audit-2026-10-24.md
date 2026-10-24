# BVP TypeScript/Node Operator API — Source Audit (2026-10-24)

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Audited immutable commit:** `d78385e485ec966505c8d5122e99a3121840c16a`  
**Git tree:** `7b4dba8d8294a4ac2c3064f11a43ab3933331c11`  
**Status:** SOURCE-INSPECTED; **NOT** an executed Windows runtime qualification, installed-product proof, or PHX-CI PASS.  
**Owner direction:** Use existing TypeScript/compiled JavaScript BVP directly from PowerShell where supported; do not build a speculative full PowerShell-clone API merely to launch Node.

## 1. Scope, completeness and identity

Inspected the full Git recursive tree (not truncated), root `package.json` and `test-platform/tsconfig.json`, all **19** `test-platform/src/**/*.ts` runtime/framework modules, all **9** `test-platform/test/batteries/**/*.ts` battery/CLI/bridge modules, deterministic and live registries, existing P1 scenario/operation inventory, and governing architecture, verification plan, decision register, `AGENTS.md`, and existing PowerShell sentinel scripts. The 84 registered/declarative scenario definitions are represented by their file inventory and the live registry; this audit is of **operator-accessible API and execution pathways**, not a line-by-line independent assessment of the semantic correctness of every scenario/assertion or every production synchronization source file. Prior P1 export inventory covered 27 modules and omitted `test-platform/src/virtual-world/per-device-runtime.ts`; **do not mistake its 158 exports for a complete count**. The present operator audit explicitly includes that missing module. All conclusions must be refreshed against current HEAD before use.

- **Implementation language:** TypeScript, compiled as CommonJS by `tsc -p test-platform/tsconfig.json` to `.test-build/bvp/`. The Node interfaces are compiled JavaScript. PowerShell simply launches `node` with argv; PowerShell does not directly import TypeScript.
- **Public runtime/API distinction:** TypeScript exports, class methods, typed scenario steps and constructor options are **library contracts**, not automatically supported Node CLI commands. The public operator CLI is much smaller than the total internal API.
- **Existing counted .ps1:** `dev/scripts/Invoke-BVP-Battery.ps1` and `Invoke-BVP-Deterministic-Battery.ps1` intentionally throw `BVP_F1_PHX_CI_REQUIRED`; neither is an operational launcher. Do not invoke or resurrect them.
- **Already-authored P1 contract tests:** `test-platform/test/bvp-powershell-api-inventory.test.ts` are not PHX-CI-run/qualified. The earlier source parity inventory is useful research but **cannot establish production-ready direct API coverage**.

## 2. Actually callable CLI commands (inspect source before every new use)

| Entry point source | Actual CLI and arguments | Result, effect and eligibility |
| --- | --- | --- |
| `test-platform/test/batteries/run-deterministic-battery.ts` | Compiled `run-deterministic-battery.js`. **Required**: `--battery`, `--result-file`, `--tap-file`. | Looks up a named deterministic battery; invokes compiled `node --test --test-reporter=tap` for its registered test modules. Writes result JSON and sanitized structural TAP; child exit propagated. **Operational BVP usage supported on Windows** after compiling and identity/preflight. |
| `test-platform/test/batteries/run-live-battery.ts` | Compiled `run-live-battery.js`. **Required**: `--battery`, `--result-file`, `--device-map-json`, `--run-id`, `--relay-root`, `--validation-source-commit`, `--checkpoint-file`. **Optional**: `--validation-build-identity-file`, `--recover-timed-out-result-file`, `--resume-evidence-json`, `--result-timeout-ms`, `--production-result-timeout-ms`, `--poll-interval-ms`. | Real live executor and relay controller, **not** a logical-iOS simulator launcher. Device mappings, source/build identities and controller leases are effectful. **No physical execution authorized** by current Owner scope; cite for study only, do not print runnable live operator scripts. |
| `test-platform/src/live-device/build-validation-artifact.ts` | Module export `buildValidationArtifact(repositoryRoot?)`; `require.main === module` build-helper pathway. | Build/installation engineering helper; may write artifacts and compose validation-only bundle. **Not an ordinary BVP test launcher.** |
| `test-platform/src/repository-check.ts` | Compiled `repository-check.js` used by pinned PHX-CI repository-check command. | Architecture, source and repository-governance checks under PHX-CI. **Software-change qualification only**; not a BVP operator shortcut. |
| `test-platform/test/batteries/phxci-physical-bridge.ts`, `phxci-actual-runner-probe.ts`, `phxci-transport-probe.ts` | PHX-CI-specific bridge/probe arguments; see exact sources. | Internal engineering/proof plumbing with explicit physical/authority gates, not user-operable BVP API. Do not use as alternative front doors. |

**No supported generic CLI** was found for `--list`, `--help`, `--scenario <id>`, `--command <device-command>`, arbitrary fixture mutation, or a general `Get-BvpResult`/checkpoint readback. The deterministic CLI uses simple `process.argv.indexOf` parsing; unknown flags may be ignored instead of rejected. Validate argv against the above source-defined allowlist **before launching**. Do not infer existence of CLI features from proposed `Get-Bvp*` cmdlet names.

## 3. Deterministic batteries — existing direct operator selector

Registry: `test-platform/test/batteries/deterministic-battery-registry.ts`.

| Battery | Operational interpretation |
| --- | --- |
| `platform-core` | Framework, architecture, scenario, evidence, virtual-world, repository-check and battery tests. |
| `s06-sync-semantics` | Reconciliation / merge / conflict / rename / exclusions test family. |
| `s07-fault-recovery-safety` | State, crash, cancellation, integrity, resource and destructive-safety family. |
| `s08-live-platform-infrastructure` | **Software tests of** validation build, command agents and live infrastructure — **not** actual live product testing. |
| `s09-late-completion-recovery` | Software tests of PHX-CI bridge, relay, recovery and identity safeguards — **not** an authorized live device attempt. |
| `all-platform-tests` | Union of normal registered test modules, sorted and deduplicated. |
| `bvp-private-tap-canary` | Isolated, intentionally adversarial privacy fault-injection battery; **not** part of routine `all-platform-tests`. Do not use for ordinary success evidence. |

The runner uses compiled test-file names, not the 84 scenario-definition IDs as selectors. The terminal's structural TAP intentionally suppresses test titles, errors, stack traces and raw child stderr. The persisted JSON holds the battery object, `result.status`, `result.exitCode`, duration, optional safe diagnostic; the TAP file carries structural counts. Exit 0 only for reported completed child execution, nonzero for failure/preflight/interrupt. No result file, missing/incomplete TAP, mismatched battery or missing compiled tests is **NOT VERIFIED**, not PASS.

## 4. Direct TypeScript API, not independent operator CLI

- `scenario/scenario-contract.ts`: `defineScenario`, `validateScenarioDefinition`, typed `ScenarioDefinition`, `executionModes: ['deterministic'|'live']`, six step families: fixture, production, external-state, checkpoint, observe, assert. Approximately 42 discriminated typed variants are represented in the prior P1 manifest; their existence is not a CLI.
- `scenario/scenario-runner.ts`: `DeterministicScenarioRunner.canonical().run(definition)`; returns completed/failed/blocked/unsupported, step status, captures, classified diagnostics and canonical evidence. With no external executor it creates a **two-or-more-device in-memory** `VirtualSynchronizationWorld`. With the live executor it changes mode to `live` and requires real external effects.
- `scenario/scenario-evidence.ts`: `createScenarioEvidenceHooks`, `assertScenarioObservation`, `buildScenarioEvidence`. Structured machine/human evidence; privacy filtering, hash-based identity redaction. Not an independent acceptance decision.
- `scenario/scenario-checkpoint.ts`: `scenarioDefinitionDigest`, `create/encode/decodeScenarioCheckpoint`, `validateScenarioCheckpointForResume`, and `InMemoryScenarioCheckpointStore`. Checkpoint schema 2, validates scenario/run/mode/source/device identities; **no general public CLI for checkpoint inventory or direct resume**.
- `scenario/scenario-diagnostics.ts`, `live-device/diagnostic-contract.ts`, `diagnostic-types.ts`: typed, stage-aware diagnostic contract, privacy-safe error conversion and correlation helpers.
- `virtual-world/in-memory-google-drive.ts`: `InMemoryGoogleDriveCore` backed by memory; simulates Drive listing, mutations, cursors and faults, **not the real Google provider**.
- `virtual-world/in-memory-local-vault.ts`: `InMemoryLocalVault`, synthetic file access, lifecycle, local mutations and observations.
- `virtual-world/per-device-runtime.ts`: `VirtualDeviceRuntime`, `VirtualDeviceBacking`, `DeterministicClock`, `DeterministicOrderGate`, persisted simulation state and reconstruction; earlier P1 export inventory missed this module.
- `virtual-world/virtual-world.ts`: `VirtualSynchronizationWorld.create(deviceNames)`, `deviceBacking`, crash/cancellation injection and `reconstructDevice`. It integrates production planner/executor/controller semantics against simulated adapters, with generated deterministic **logical** device identities.
- `live-device/device-command-agent.ts`: typed `DeviceCommand` kinds `fixture-put`, `fixture-remove`, `observe-file`, `production-preview`, `production-execute`, `production-control`, `observe-product`; bounded agents enforce run/device/sequence/version and uncertain-result handling. These types and factory do **not** equal safe CLI availability.
- `live-device/drive-mailbox.ts`: authenticated Drive mailbox/Windows relay APIs; real transport and side effects. **Physical/live scope deferred.**
- `live-device/live-scenario-executor.ts`: relay controller, device authority locks, checkpoint persistence, command correlation, timing, result handling. It creates relay directories and may dispatch real commands: **do not call for simulated operation**.
- `live-device/validation-entrypoint.ts`: validation-only installed runtime binding and participant observation; not ordinary CLI.
- `architecture-governance.ts`, `repository-check.ts`, `platform-root.ts`: engineering governance and nonshipping architecture.
- `test/batteries/battery-registry.ts`: 14 registered **physical/live** batteries including Windows smoke and S09A–E; their existence does not authorize execution and does not mean they have a Windows-hosted iOS simulator equivalent.
- `test/batteries/late-completion-recovery.ts`: `loadLateCompletionRecovery` and `withLateCompletionRecovery`; read-only strict predecessor/receipt identity proof followed by guarded continuation. Available only through live CLI path, with exact identity and no uncertain-effect replay.
- `test/batteries/phxci-physical-bridge.ts`: private PHX-CI coordination/evidence projection; internal, not a public general operator API.

The 84 `test-platform/scenarios/**/*.ts` files are **definitions**, not 84 independent compiled executables. They can be run by the TypeScript scenario-runner API in the appropriate context, or exercised by test modules that import them. To select a **specific scenario** dynamically from PowerShell, a small audited TypeScript CLI dispatch/discovery entrypoint may be required; **none was verified**. Do not improvise `node path/to/scenario.js` and expect the scenario to execute.

## 5. Simulator and live capabilities: do not conflate

- `VirtualSynchronizationWorld` creates logical, in-memory multi-device environments, **not actual iOS/iPadOS binaries, native runtime, hardware, plugin installation or Google OAuth**. Device labels may be `ios` or `ipad`, but labels alone cannot prove OS fidelity.
- `DeterministicScenarioRunner` checks `scenario.executionModes`; it returns `unsupported` where mode does not apply. It does not silently bridge a `live` scenario onto the virtual world. In deterministic mode, `set-device-connectivity` blocks and `put-local-pattern` is unsupported; other capabilities must be inspected step-by-step.
- `getLiveBattery('s09-br02-simulated-checkpoint')` exists solely as an internal PHX-CI test-only fixture behind `PHX_VERIFICATION_CONTEXT_PATH_INTERNAL` and `BVP_NONPHYSICAL_SIMULATION=YES`. It must **never** be advertised as a general iOS simulator or public owner operator battery.
- Running `s08-live-platform-infrastructure` via the deterministic CLI only tests **the code** implementing the live infrastructure. It neither exercises a real device nor supplies simulated execution parity for live S09 scenarios.
- Never use real device IDs, actual Google Drive, live vaults, authentication or iOS/iPad under current deferred physical scope.

## 6. Execution and safety invariants extracted from source

1. **Identity:** pin/recheck repository, branch, exact source SHA and compiled output source before dispatch. Compile BVP TS with `tsc -p test-platform/tsconfig.json` after checkout; JS path: `.test-build/bvp/test-platform/test/batteries/run-deterministic-battery.js`. The `package.json` root script `test:bvp-root` compiles the same project and runs *all* test modules directly, but is a PHX-CI-focused engineering verification command; avoid treating its direct invocation as owner acceptance.
2. **Isolation:** use a new `C:\temp\<GUID>\` detached/ephemeral checkout with temporary results; never execute against or mutate owner's control checkout. No run files in `%LOCALAPPDATA%`, actual vaults or Google Drive.
3. **Preflight:** check Node version/executable, npm dependency state, Git worktree commit, TS compiled existence, chosen registered battery and output paths; do not solicit missing parameters halfway through execution.
4. **Exit:** deterministic result JSON `result.status=completed`, `result.exitCode=0` **and** actual process exit 0 and complete expected output are required to report the BVP operation as completed. A local BVP result is **not** PHX-CI source qualification, Reviewer acceptance or real-platform evidence.
5. **Failure:** preserve nonzero exit, result/TAP artifacts and privacy-safe `BVP_DIAGNOSTIC`; distinguish missing result/preflight/runtime errors and interrupted child. Do not expose raw child stdout/stderr/fixture contents. Do not re-run any uncertain physical effect.
6. **Live runner contract (source-only; not authorized):** requires non-empty device-map JSON, required labels, run/relay/checkpoint/source identity. Positive timeouts default to 60,000 ms (command), 600,000 ms (production), and 250 ms (poll); no `--help`. Source commit requires 40 hex characters inside `createLiveScenarioExecutor`; duplicate physical device identity blocked. `--recover-timed-out-result-file` and `--resume-evidence-json` are mutually exclusive.
7. **Live exit semantics (source-only):** completed 0, blocked awaiting checkpoint 3, other blocked/failed 1. Exit 3 is **NOT PASS**, and an absent device receipt is not proof its effect did not occur.
8. **Governance:** PHX-CI remains the sole authority for **qualifying source changes**. Under later Owner DEC-346/DEC-347, routine BVP operation should call the BVP runtime directly, not put PHX-CI in front merely as a CLI. Changing software still follows the separate PHX-CI/Reviewer process. No GitHub Actions.

## 7. Operational API accessibility matrix

| Human request | Current actual direct Node CLI | Disposition |
| --- | --- | --- |
| Run a named deterministic battery | Yes, after compiling | Supported (source-grounded; Windows runtime not yet re-executed for this new manual) |
| List names of batteries | Registry exports list/get functions, **no CLI list flag** | Read registry/source or add minimal read-only Node CLI |
| Run **one** arbitrary `test-platform/scenarios` definition | Runner class supports it, **no generic CLI selector** | Gap; small TS CLI if needed |
| Run one selected compiled `*.test.js` test file | Node test process supports test-file path, but no BVP battery envelope | Technical test-runner facility; not an approved BVP battery operator contract |
| Configure persisted PowerShell profiles | No present config CLI / `Bvp.psm1` | Not implemented; per-invocation PowerShell variables suffice initially |
| Execute generic typed device command | Typed TS API exists, no approved standalone generic CLI | Not exposed; physical side effects may be prohibited |
| Simulate an entire registered physical S09 iOS scenario | Virtual multi-device world exists, but S09 live scenario is mode `live` | Not proven; specific semantic mapping required |
| Read a known deterministic run result/TAP | Read stored JSON/TAP files | Supported; no special BVP readback CLI required |
| Resume a real checkpoint/late receipt | Live CLI flags exist, strict identity preflight | Source capability exists; **not authorized for physical use** |
| PHX-CI-qualify modified software | Existing pinned PHX-CI engineering operator | Different workflow, not routine BVP operation |

## 8. Audit assurance boundary and next verification

**Performed:** immutable GitHub tree and exact-source reads; detailed inspection of both CLI runners, both registries, virtual world, scenario runner/DSL/evidence/checkpoints, relay/device commands and recovery; fixed flags, mode and exit-state mapping; compared current docs and owner decisions.  
**Not performed:** executing Node/npm/TypeScript on the owner's Windows PowerShell 7.6.6 machine; a new authoritative PHX-CI source-change qualification; physical/iOS testing; runtime validation that an auto-generated PowerShell block compiles/runs; whole-product source correctness review. The repository's earlier P1 tests remain unexecuted and **must not be represented as passing**.

**Recommended operator manual (source of truth):** `dev/planning/03-verification/bvp-operator-runbook.md`. Keep detailed research here; put a mandatory **read-before-BVP-work** pointer at the **top of root `AGENTS.md`** (do not weaken its existing fresh-protocol requirement), plus discoverability pointers in `dev/state/current-state.yaml` and `dev/scripts/README.md`. A static external `session-inits` file cannot itself force reading a new repo file before the repository is opened. New sessions must explicitly ground the repo and read `AGENTS.md`/runbook; future assistant should refresh BVP source rather than rely on its memories or an outdated static example.
