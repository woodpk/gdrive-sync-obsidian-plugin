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
