# S09 G1 — Obsidian plugin data.json integrity investigation (2026-10-14)

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Owner-authorized scope:** investigate and reduce risk of `.obsidian/plugins/brain-google-drive-sync/data.json` loss/corruption; **no live Drive/vault operation or software release**.  
**Baseline `master`:** `b1e2ebaee3077e34a4eefaf601ee8124078b7400`.  
**Isolated implementation:** `fix/s09g1-plugin-data-existing-null-guard-20261014`; source commit `68b75447f5ca8d0a8b4aff52f547bc763805ddaf` (UNVERIFIED).  

## Established evidence and limits

- Historical physical S09A work reports a preserved `data.json` on a previous installation and successful read of persisted diagnostics in October; available repo evidence does **not** reproduce an original filesystem deletion, truncated file, corrupt JSON parse, or lost device identity. No original corruption cause has been established.
- Current `src/main.ts` constructs `PluginDataRepository` around Obsidian `Plugin.loadData()` / `Plugin.saveData()`. `src/product/plugin-data.ts` previously interpreted every null/undefined load as a legitimate new installation; subsequent setting/diagnostic/audit writes would replace loaded contents with defaults. Obsidian `loadData()` returning null is also the normal new-installation signal; the previous code did **not** separately check whether an old `data.json` existed.
- This is a **confirmed unsafe fallback in source**, not proof of the historical root cause. The code also accepts non-object raw results by replacing them with defaults. Serializing queued saves prevents writer overlap but does not solve corrupted existing contents, loss of the file itself, or host filesystem write durability.

## Bounded mitigation staged, not verified

1. `PluginDataHost.dataFileExists()` checks the canonical plugin `data.json` through Obsidian's vault adapter (using `manifest.dir` or the vault's configuration directory).
2. A null/undefined `loadData()` result **with the existing file present** now throws before the runtime or any persistence writes are initialized; invalid non-object/array root data also blocks initialization.
3. A proven absent file still permits first-install defaults; valid existing settings/identities remain readable. Tests cover existing-null, existing-invalid, valid existing, new absent, and existence-check failures.
4. No change was made to live sync behavior, remote mutation logic, shipping digest pins, PHX-CI framework, or installation. No local tests/builds or PHX-CI run executed; no success verdict is asserted for this changed code.

## Required before acceptance

- PHX-CI MUST verify this exact changed SUT, including the new regression file, full product tests, focused BVP tests, build and repository checks. Then independently review safety and artifact controls before integration.
- **Verification gate conflict:** `test-platform/src/repository-check.ts` defaults to `promotion` and accepts only three historical `main.js` hashes; legitimately changed ordinary source generates a new hash. Development observation currently requires BOTH `BRAIN_ARTIFACT_PURPOSE=development` AND `BVP_CHANGE_CLASS=authorized-governance` plus context. This G1 code/test correction is **ordinary**, not frozen-surface governance. Do not mislabel it as `authorized-governance` just to obtain a PASS, and do not add an unapproved new hash to shipping allowlist. The blocked verification path needs an authorized PHX-CI-coordinated ordinary-development artifact observation capability before testing.
- The owner already accepted deferral of independent finding `DEC-340-01`; that exception permitted the earlier software-only master merge, **not bypass of validation** for this changed code. Do not request a PHX-CI run known to fail the artifact-class gate.
- This mitigation is **not closure of S09 G1**. The true physical loss/corruption mechanism remains unproved; after exact-source PHX-CI/review, require safe, owner-approved data-integrity assessment and separately gated S09 physical evidence. Retain live sync/release/install/Stage 3 BLOCKED.

**Exact tasking:** `dev/planning/02-workstreams/WS-07-brain-verification-platform/03-BUILD-DECOMPOSITION.md` — S09 row, and `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/09a-windows-ios-install-authentication-and-pairing-baseline.md` (PREPLANNED, not authorized for live execution).
