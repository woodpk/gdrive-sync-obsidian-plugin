# BRAIN Google Drive Sync

Private Obsidian plugin under supervised construction. Phase 1 establishes the mobile-safe plugin foundation and frozen shared contracts only; complete synchronization behavior is intentionally deferred to later build phases.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

`npm run build` emits the Obsidian plugin entry bundle as `main.js`. Runtime source under `src/` must remain mobile-safe; build/test tooling may use Node.js because it does not ship in the plugin runtime bundle.

## Architecture

Frozen Phase 1 contracts live under `src/contracts/`. Test doubles for independent Phase 2/3/4 work live under `src/testing/`. See `dev/phase-1-shared-contracts.md` for the authoritative parallel-work handoff after Phase 1 acceptance.


## BVP Operator Re-entry (Owner DEC-350)

Before performing any BVP operation or generating PowerShell to launch it, a newly assigned Builder/operator agent must read **[root AGENTS.md](AGENTS.md)** and the entire **[BVP Operator Runbook](dev/planning/03-verification/bvp-operator-runbook.md)**, then the [source API audit](dev/research/bvp-operator-api-audit-2026-10-24.md) and current TypeScript entrypoints. Read current `dev/state/current-state.yaml` rather than relying on earlier chat summaries. The shared external `session-inits` remains unchanged.

BVP is written in TypeScript and is operated through its compiled Node CLI where an actual CLI exists; PowerShell can be just the launcher. No speculative PowerShell library is necessary for existing named deterministic batteries. Standalone `Invoke-BVP-*.ps1` launchers are disabled. BVP operation is separate from software-change PHX-CI qualification, and live/physical devices remain gated. See the manual before issuing commands.
