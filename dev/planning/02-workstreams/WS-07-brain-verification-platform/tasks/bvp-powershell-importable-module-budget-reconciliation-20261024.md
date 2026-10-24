# DEC-346 — PowerShell module / architecture budget reconciliation (P1)

**Status: DESIGN SELECTED FOR TEST-FIRST TRIAL, NOT YET IMPLEMENTED OR VERIFIED.**
**Owner authorization:** Begin BVP PowerShell Interface Library immediately (2026-10-24).
**Authority:** DEC-346 supersedes historical PHX-CI-only operation of BVP itself; PHX-CI remains the **sole source-change software qualification** authority. No physical operations, real Drive/vault, installation, release, or master merge.

## Source-grounded budget and module constraint

1. Frozen `dev/authority/governance/locks/testing-platform-boundary.yaml`: maximum **4** BVP PowerShell operational scripts, **1,500** combined logical PowerShell lines, and **0** scenario-specific scripts.
2. The actual `test-platform/src/architecture-governance.ts` budget scanner includes `dev/scripts/**/*.ps1` and excludes `.psm1`. Accepted R10 PHX-CI evidence reports **4 scripts / 401 logical lines**, leaving **1,099** lines under the unchanged ceiling, if existing script count remains four.
3. The present four scripts: `dev/scripts/Invoke-BVP-Battery.ps1` and `Invoke-BVP-Deterministic-Battery.ps1` are 5-line fail-closed legacy compatibility sentinels; `Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` and `Invoke-PHXCI-S09A-Deploy.ps1` are governed engineering operators and must not be changed for BVP operations.
4. **PowerShell 7.6 explicitly supports importing a `.ps1` as a script module** via `Import-Module`, or setting a module manifest `RootModule` to a `.ps1`. This permits an importable operator module within the *already counted* script class, without an unaccounted `.psm1`. Microsoft documentation: `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/import-module?view=powershell-7.6`; `https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_module_manifests?view=powershell-7.6`.

## Selected compliant candidate architecture

- **Reuse** `dev/scripts/Invoke-BVP-Deterministic-Battery.ps1` as the sole **counted** PowerShell module root, optionally paired with a static `Bvp.psd1` manifest with `RootModule='Invoke-BVP-Deterministic-Battery.ps1'` and explicitly enumerated exports. No `.psm1` is introduced. Direct invocation must retain **fail-closed** behavior; only a verified `Import-Module` of the counted file may expose approved commands. The module may safely bind deterministic/simulated BVP operations to *existing* BVP Node entrypoints; it must never become a second test executor or alternate verifier.
- `Invoke-BVP-Battery.ps1` retains its old disabled physical-battery sentinel; two PHX-CI scripts remain unchanged. All physical/live-mutation APIs may appear in discovery but must fail closed without a later explicit Owner decision and proper BVP capability proof.
- Count all executable PowerShell logic inside the existing `.ps1` files; do **not** source `.psm1`, embed script code in `.psd1`, generate PowerShell at runtime, or hide code in other extensions or unmeasured paths to defeat architecture metrics.
- Expose only supported typed existing BVP operations; preserve Node/BVP verdict and nonzero exit. No dynamic invocation, string evaluation, user-provided executable path or shell interpolation. Config and scratch behavior are owned by the operator adapter and must be validated before dispatch.

## Mandatory qualification of import-only technique before accepting it

1. **Test-first:** regression must prove `Import-Module` creates the requested commands under PowerShell 7.6.6 without triggering a battery, file mutation, or PHX-CI; direct `& Invoke-BVP-Deterministic-Battery.ps1` still throws with a safe fail-closed message.
2. Direct legacy live script stays fail-closed; executing an import-only module command with no persisted config fails preflight before creating a run scratch, invoking Node or accessing real devices.
3. Explicit module exports must match the approved API inventory; no drift or generated hidden commands. The `Bvp.psd1` only contains static metadata and resolves an existing counted `.ps1` root.
4. Assert guard still reports **4** counted scripts, **≤1,500** actual counted PowerShell logical lines, **0** scenario-specific scripts, with no frozen manifest or architecture-source modifications. If any rule cannot be met, **STOP and obtain a specific Owner architecture decision** before changing boundaries.
5. The previous independent Reviewer PASS is for the diagnostics source only. The new PowerShell feature has no software qualification yet. Do not run BVP user tests through PHX-CI; use PHX-CI only later to qualify exact software changes.

## Deliberately open

- Verify Windows `Import-Module` behavior on PowerShell 7.6.6 using test-first contracts; these are not validated merely by Microsoft documentation.
- Determine whether complete API parity, persistent-config privacy, iOS/iPad simulation and recovery adapters can actually be implemented in **1,099** remaining logical PowerShell lines. Use thin delegates to existing BVP TypeScript/Node runtimes. If not, seek an Owner-specified budget change *before* adding any unmeasured module.
- Full TS export/method accessibility and BVP runtime operation classification must be completed before the module can be considered a production-ready primary interface.


## Identified frozen-guard false positive — Owner decision required

During P1 source review, `test-platform/src/architecture-governance.ts` classifies any counted PowerShell script containing this expression as a **scenario-specific** script:

```text
/(?:test-platform\/scenarios\/|\bscenario[A-Za-z0-9_-]*\b|\b[A-Za-z0-9_-]*Scenario[A-Za-z0-9_-]*\b|...)/i
```

The actual matcher rejects both **generic operator names** `Get-BvpScenario` and `Invoke-BvpScenario` even though these names alone do not select, contain or hardcode any particular scenario. It treats these as violation of `scenario_specific_powershell_scripts_max: 0`, independent of behavior. Existing 4-script capacity is already full.

**Owner architectural decision needed before implementing the counted importable script:**

- **Recommended: Approve a narrow, test-first semantic correction of the supervisor-frozen `test-platform/src/architecture-governance.ts` guard** so general-purpose, allowlisted `Get-BvpScenario`/`Invoke-BvpScenario` cmdlets are not mistaken for scenario-specific verifier scripts. Preserve strict rejection of per-scenario launchers, embedded scenario names/IDs, path-specific routing, direct physical dispatch and any new script count/LOC. Add adversarial tests in `test-platform/test/architecture-metrics.test.ts` that specifically prove generic imports pass and hardcoded scenario-specific scripts continue failing. **Do not** change `testing-platform-boundary.yaml`, its 4-script/1500-LOC/zero-scenario limit, PHX-CI or pin.
- Alternative: explicitly direct a different general-purpose public naming/API arrangement that can fulfill 100% BVP API parity under the existing unchanged matcher *without* obfuscating, renaming solely to avoid enforcement, or adding an unmeasured module. Do not infer this approval from the broader start authorization.

**Gate:** Until Owner chooses, P1 may continue with source inventory, tests and design records, but implementation touching a frozen source file or attempting to route generic scenario operation through an uncounted `.psm1` remains **unauthorized**.
