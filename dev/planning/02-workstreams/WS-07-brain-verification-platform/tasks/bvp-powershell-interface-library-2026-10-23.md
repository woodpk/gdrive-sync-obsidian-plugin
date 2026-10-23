# BVP PowerShell Operator Library + Persistent Configuration — Build Plan

**Status:** PLANNED / NOT IMPLEMENTED / NOT VERIFIED.  
**Owner directive:** 2026-10-23, DEC-346 (entire BVP API via PowerShell), DEC-347 (Windows/Windows-hosted iPhone/iPad simulation), DEC-348 (diagnostic quality).  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`, `WS-07-brain-verification-platform`.  
**Engineering scope:** Operator-facing BVP invocation, configuration, discovery and interface parity; not a new test engine, independent verifier, simulation engine, or production-plugin feature. **Do not call PHX-CI to operate BVP.** Ordinary code-change/software qualification through existing governed local engineering tooling, if necessary, is a distinct activity.

## 1. Target user experience / non-negotiable requirements

1. The **primary human interface** to BVP is a small, importable repository-controlled PowerShell module supporting **100% of existing supported BVP API/command capabilities** (including the ability to discover all available commands, arguments and modes). No operator should need to enter raw Node/TypeScript syntax, know device IDs, manually compose JSON, or supply infrastructure paths during an ordinary test invocation.
2. Relatively persistent values—**device IDs**, logical device mappings, test-vault roots, installed build/manifest identities and paths, simulator/device profiles, transport mode, output preferences and default timeouts—are saved in a **persistent configuration file** and validated **before** an operation begins. **Never request them halfway through a script run.**
3. Run-specific values (fresh run/attempt IDs, transient output directory under `C:\temp\<GUID>\`, one-time checkpoints, confirmation of a materially impactful operation) are generated/managed separately; they must not be mistaken for persistent device configuration.
4. Defaults are **Windows** Obsidian and the *existing* BVP Windows-hosted virtual iPhone/iPad environment. The module selects simulated vs. Windows-live execution explicitly. Physical iPhone/iPad and live mobile mailbox operations are **deferred**; the API may be discoverable but cannot bypass an explicit future Owner authorization.
5. Results expose truthful BVP verdict/status/exit code, a concise failure cause, location of the failure and evidence links; the library transports BVP's outcome and does **not** act as a second correctness oracle or invent a PASS.

## 2. Confirmed code surfaces; required full inventory before implementation

### Existing operator-facing entrypoints

| Present component | Existing scope | Library responsibility |
| --- | --- | --- |
| `test-platform/test/batteries/deterministic-battery-registry.ts` | Enumerates named deterministic test-family batteries: `platform-core`, `s06-sync-semantics`, `s07-fault-recovery-safety`, `s08-live-platform-infrastructure`, `s09-late-completion-recovery`, `all-platform-tests` | Discover and list exact current names/descriptions; select/run each without hardcoded user-facing choices |
| `test-platform/test/batteries/run-deterministic-battery.ts` | `--battery`, `--result-file`, `--tap-file`; spawns compiled Node test families | Invoke existing runner, never reimplement it; collect bounded JSON + TAP, preserve exit status |
| `test-platform/test/batteries/battery-registry.ts` | Registered Windows/iOS live scenario batteries, required device labels and human checkpoint metadata | List, inspect prerequisites, map device labels via named persistent profiles; separately show simulation capability |
| `test-platform/test/batteries/run-live-battery.ts` | Live battery `--battery`, `--device-map-json`, `--run-id`, `--relay-root`, `--validation-source-commit`, `--checkpoint-file`, optionally `--validation-build-identity-file`, `--recover-timed-out-result-file`, `--resume-evidence-json`, `--result-timeout-ms`, `--production-result-timeout-ms`, `--poll-interval-ms` | Bind parameters from validated config and ephemeral run context; expose checkpoint/late-completion recovery and prohibit unsafe mode conflation |
| `test-platform/src/scenario/scenario-runner.ts`, `test-platform/src/scenario/scenario-contract.ts`, `test-platform/src/scenario/scenario-evidence.ts` | Common declarative scenario execution, observation/assertion and canonical evidence | Provide discover/run/inspect capabilities without duplicating scenario execution |
| `test-platform/src/virtual-world/**` and `test-platform/scenarios/**` | Existing deterministic simulated devices and scenario definitions | Expose test selection, simulator profiles and supported simulated operations by delegating to existing BVP runtime |
| `test-platform/src/live-device/**` | Bounded device commands, relay/mailbox, leases, build observation, checkpoint and recovery | Expose each already supported safe command via the same API surface; **do not require real mobile participation** for simulated-mode testing |
| `dev/scripts/Invoke-BVP-Battery.ps1`, `dev/scripts/Invoke-BVP-Deterministic-Battery.ps1` | Legacy entrypoints currently **throw and prohibit standalone execution** | Do **not** treat these as working operator APIs; replace/retire through an authorized and tested migration consistent with the frozen guard |
| `dev/scripts/README.md`, `test-platform/src/architecture-governance.ts` | Current rules and PowerShell architecture budgets | Update navigation and, only if expressly authorized, the relevant frozen governance checks |

**Inventory gate (must precede construction):** Enumerate every callable public BVP operation, CLI flag, supported mode, scenario registry item, deterministic and live test family, typed command kind, configuration input, checkpoint/recovery action, result/evidence/readback operation, and available simulator transition from **actual current source**. Publish a machine-readable `API inventory` with `source path + export/entrypoint + signature/flags + mode + side-effect class + PowerShell command + coverage test`. Search for **all** entrypoints, not just the items above. An internal helper without a supported public contract is not automatically a safe public command: either expose it through one **minimal BVP dispatcher** (only if its behavior is already supported and safe), or document the precise API accessibility blocker and resolve that gap without pretending parity. At build completion, reject any unmapped added/changed BVP public endpoint rather than silently skip it.

## 3. Proposed operator API (names provisional; verify complete parity)

A single importable module, tentatively `dev/scripts/Bvp.psm1`, should use stable PowerShell command verbs with ergonomic parameter sets. Proposed public families:

- **Discovery:** `Get-BvpCommand`, `Get-BvpBattery`, `Get-BvpScenario`, `Get-BvpCapability`, `Get-BvpVersion`; display source-proven mode/support status and reasons for unsupported physical-only behavior.
- **Configuration:** `Initialize-BvpConfig`, `Get-BvpConfig`, `Test-BvpConfig`, `Set-BvpConfig`, `Get-BvpProfile`; one-time setup/update is separate from starting a battery.
- **Execution:** `Invoke-BvpBattery`, `Invoke-BvpScenario`, `Invoke-BvpCommand` for every supported command/step mode, with explicit `-Profile`, `-Mode`, `-Battery`/`-Scenario` and `-WhatIf` where meaningful. Dispatch only to existing compiled BVP runners/ports; no PowerShell reimplementation of assertions.
- **Progress and evidence:** `Get-BvpRun`, `Get-BvpResult`, `Get-BvpDiagnostic`, `Get-BvpEvidence`, `Get-BvpPendingCheckpoint`; return machine-readable objects and optional human summaries.
- **Safe continuation:** `Resume-BvpRun`, `Resolve-BvpRun` for existing BVP checkpoint and late-result reconciliation contracts; never automatic replay of uncertain effects.
- **Transport/agent operations:** expose all current BVP public relay, mailbox and device-command operations through `Invoke-BvpCommand` or clearly named equivalents, subject to existing authorizations, device/transport compatibility and effect/side-effect classifications, **not** through raw JSON/shell interpolation. Physical APIs remain discoverable but fail closed unless independently authorized.

These command names are a **design candidate, not an assertion that they exist**. A canonical inventory-to-implementation parity check decides final exported names and parameter sets. Expose native typed PowerShell objects; output JSON only by explicit request and preserve Node exit code.

## 4. Persisted configuration architecture

### Locations and precedence

- **Version-controlled, nonsensitive defaults/template:** a documented example/schema under `test-platform/config/` (or nearest currently accepted repository location), **never** containing real machine IDs, OAuth details or live vault paths.
- **Real persistent per-user settings:** proposed `$HOME\.brain-bvp\config.json` on Windows, outside Git worktrees, repository clones, Obsidian vaults, and Google Drive sync. A one-time `Initialize-BvpConfig` creates/updates this file with explicit operator intent and protects it with appropriate user-only file access where supported. It persists across fresh `C:\temp\<GUID>\` runs and is never committed.
- **Optional explicit location:** `-ConfigPath` (or `BVP_CONFIG_PATH` for launch environment). No implicit config search through personal/production vaults. Validate full resolved path and file ownership/access; reject world-readable/unsafe sensitive config placement when possible.
- **Resolution order:** built-in schema defaults → repository template → selected persisted profile → **explicit per-invocation approved override**. Operator overrides never silently persist and cannot disable source/identity/privacy or simulation/physical gates.
- **Fail before execution:** absence, invalid schema, incomplete required profile, absent test root, duplicate device identity, wrong installed plugin/manifest binding, unknown BVP version, or incompatible mode yields an actionable **preflight-only** error; no halfway prompt, no remote or local test mutation.

### Proposed config structure (illustrative schema, not executable values)

```json
{
  "schemaVersion": 1,
  "defaultProfile": "windows-sim",
  "profiles": {
    "windows-sim": {
      "mode": "simulated",
      "devices": {
        "windows": { "kind": "windows-sim", "deviceId": "CONFIGURED-ONCE-LOCALLY" },
        "ios": { "kind": "ios-sim-on-windows", "deviceId": "CONFIGURED-ONCE-LOCALLY" },
        "ipad": { "kind": "ipados-sim-on-windows", "deviceId": "CONFIGURED-ONCE-LOCALLY" }
      },
      "vault": { "kind": "disposable", "path": "SET-AT-SETUP" },
      "runtime": { "nodePath": "auto-discover", "compiledBvpRoot": "from-repository" },
      "timeoutsMs": { "result": 60000, "productionResult": 600000, "poll": 250 },
      "results": { "rootPolicy": "fresh-C-temp-GUID", "format": "json-and-summary" }
    }
  }
}
```

**Semantics:** `ios` and `ipad` are **simulated logical participants**, not real iPhone/iPad device IDs or proof of iOS execution. Real Windows plugin and physical-device profiles, if later authorized, use separately named profiles with their own pinned observed device/build identities; NEVER reuse simulator aliases as real-device identities. Configuration may hold stable *nonsecret* device routing IDs, fixture/vault location, root binding alias, plugin/source/main/manifest hash pins and runner preferences. OAuth/access/refresh tokens, passwords and private keys are **never stored here**; use existing same-device authenticated stores where applicable and only store an opaque reference if supported and required. Secrets and IDs must be masked in logs/diagnostics.

### Run lifecycle / mutation safety

- At beginning of **each** call: load the chosen profile, validate schema, verify BVP build and approved target mode, resolve device aliases to pinned IDs, check disposable Windows/simulator roots and any necessary controlled product state; report a single consolidated preflight result (rather than asking one variable at a time).
- Create the fresh run ID and scratch root `C:\temp\<GUID>\` only **after preflight**; store one resolved, redacted run manifest with configuration schema/version, selected profile *identity*, library/BVP source, command selection and resolved *hashes* (never secret values).
- Use native PowerShell structured invocation and carefully formed argv arrays with quoted paths; never `Invoke-Expression`, raw executable concatenation, untrusted shell evaluation or PowerShell-born JSON as an ad hoc API.
- For multiple device labels, bind IDs by logical name and verify unique IDs. Different Windows/simulated/real backend adapters must never be silently interchanged. Reject missing simulator implementation rather than falling back to real devices.
- Do not auto-provision live Google Drive mailboxes, activate product sync, alter a production vault or run physical iPhone/iPad code. Side-effecting commands need declared effect categories and existing owner-safe gates; **no interactive infrastructure requests during execution**.
- At completion: preserve exact underlying verdict/error and exit code; write only bounded, secret-safe output and route to the existing diagnostics/evidence implementation per DEC-348.

## 5. Suggested implementation slices

1. **P1 — Source/API contract inventory:** enumerate full BVP exports, runnable entrypoints, every parameter and registered battery/scenario. Identify where simulator vs. live operations are supported and determine smallest dispatcher needed; identify the existing disabled PowerShell launchers. Write the parity manifest and a missing-coverage test **before implementation**.
2. **P2 — Config schema + one-time initialization:** add stable versioned profile schema/template, parse/read/write/validate/migrate safely, root/backend identity checks, preservation across ephemeral worktrees and no-prompt preflight. Add tests for missing/malformed/stale/duplicate/sensitive config and no updates on failed initialization.
3. **P3 — Thin module and existing BVP adapter:** implement a compact `.psm1` with reusable argument validation/dispatch, command inventory/listing and PowerShell aliases for all supported API operations. If a BVP API cannot be reached outside TS modules, add only the minimum controlled CLI surface in BVP with typed args and machine result—do not create another orchestrator or test runner.
4. **P4 — Windows simulator parity:** connect each existing iPhone/iPad-required scenario/command to **existing Windows-hosted simulated devices** as DEC-347 requires; fail closed on unavailable platform-specific simulation. Exercise cross-device deterministic world, fault/recovery and known mobile scenarios without real phone or Google Drive writes.
5. **P5 — Diagnostics and workflows:** integrate DEC-348 structured failure context, operator-facing `Get-BvpDiagnostic`, persistence/traceability, consistent return/exit mapping, and explicit safe resume/recovery controls. Demonstrate no device ID prompts midway through a run.
6. **P6 — Complete parity and acceptance:** tests assert **every** public BVP API/CLI command is accessible via PowerShell and parameter/mode/effect mapping is correct, including newly added APIs; verify no unapproved side effect, no physical fallback, and no private config leakage. Exercise under PowerShell **7.6.6** on Windows 11, preserving existing Node/TS BVP runtime. Qualify materially changed software using the distinct repository-governed Windows engineering process as required, **not** as a wrapper around routine BVP test execution.

**Dependency:** define shared diagnostics interface from [BVP Error Communication Upgrade](bvp-error-communication-upgrade-2026-10-23.md); integration may run after or alongside its test-first work, but neither scope is allowed to invent another verification authority.

## 6. Architecture/guard reconciliation BEFORE code changes

Current `dev/planning/02-workstreams/WS-07-brain-verification-platform/02-ARCHITECTURE.md` and the frozen `testing-platform-boundary.yaml` govern a **maximum of 4 BVP operational PowerShell scripts and 1,500 logical PowerShell lines total**, and prohibit scenario-specific PowerShell verifiers. Two legacy launchers currently throw `BVP_F1_PHX_CI_REQUIRED`; operator launch/migration and the new module must be reviewed against **all existing script counts and metrics**, including `.psm1` treatment. Reuse or retire the disabled scripts where possible; **do not bypass the existing guard by renaming or moving files**. If full API parity cannot fit under approved budgets, document exact count/LOC delta and request a specific Owner-governed budget/lock amendment **before implementing**; do not silently weaken a guard. Owner's DEC-346 later operational directive supersedes historical insistence on PHX-CI as the BVP operator, but does not itself silently relax an unrelated architectural complexity limit.

## 7. Acceptance criteria and negative tests

- **Complete API parity:** source-generated inventory of commands, params, modes and result/effect contracts has **zero unmapped entries**, including deterministic, simulated-mobile, Windows-live, checkpoint, late-result recovery, evidence and any supported direct device commands; new BVP APIs break mapping tests until exposed.
- **No repeated setup:** an operator enters a device ID once during explicit configuration (or it is safely derived/provisioned there) and can run the same supported battery repeatedly across fresh isolated working copies without any inline prompts for identifiers/paths/versions.
- **Fail closed preflight:** missing/invalid/corrupt/stale config or mismatched installed identity fails **before** dispatch, with concise guidance naming the config **key**, not its secret value; no mutation or physical/Drive activity.
- **Strong config isolation:** settings survive worktree refreshes, do not enter `.git`, any Obsidian vault, or any BVP evidence, and never hold tokens; no credentials or private device IDs are exposed in console/result/error.
- **Mode honesty:** every iPhone/iPad simulation result is `simulated`; Windows-live is distinct; physical mobile requires a new explicit Owner scope change. No false physical proof and no silent simulator → real fallback.
- **Semantics:** invoking through PowerShell produces same underlying BVP result/status as direct runner for matched inputs; all CLI errors retain meaningful, sanitized classification and actionable preflight information. `-WhatIf` causes zero side effects.
- **Safe operation:** no dynamic evaluation, no arbitrary unreviewed command execution, no duplicate uncertain-effects execution, no environment-wide config changes, no change to user control checkout. Run-generated files reside under new `C:\temp\<GUID>\` root.
- **Docs and maintainability:** import/setup/use, schema/migration, inventory/coverage, CLI API reference, sample sanitized profiles, dry-run and common failure explanations are documented without requiring the user to understand Node CLI syntax.
- **Verification:** test-first contracts include valid profiles, all invalid-config cases, device-ID uniqueness, per-device manifest checks, process launch/exit mapping, command coverage, simulator modes, recovery and privacy. Record qualification evidence for exact changed source when required; no routine BVP test through PHX-CI.

## 8. Deferred / explicitly excluded

No live real iPhone/iPad tests, no real-device command-mailbox dispatch, no production-vault action, no OAuth credential capture or sharing, no GitHub Actions, and no source modifications under this *planning* task. Exact exported function names/config file schema will be locked against the complete source inventory and test-first contracts before coding. The presence of a planned API does **not** mean it is already callable or all iOS behaviors are simulated.
