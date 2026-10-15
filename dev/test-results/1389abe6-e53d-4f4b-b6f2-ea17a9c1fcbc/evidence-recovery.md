# PHX-CI evidence recovery — 1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc

**Classification:** Administrative evidence-path recovery under operating protocol §27.1; NOT a new verification execution.  
**Substantive result:** PHX-CI **COMPLETE / PASS**; all 11 required stages PASS; exit 0.  
**Verified source SHA:** `41dcc92954608214329974bd847b1741b6d37ba5`  
**Verified tree SHA:** `363b011f2eec1220e007d8b3112ec06c66bc36e9`  
**Base SHA:** `b1e2ebaee3077e34a4eefaf601ee8124078b7400`  
**Original PHX-CI evidence commit:** `4e0b225b44e0227390decc176b762ed8ff435556`  
**PHX-CI run ID:** `1389abe6-e53d-4f4b-b6f2-ea17a9c1fcbc`  
**Framework/runtime SHA:** `69c4aa077d4a1a46d1e85e59f39d36285be99e83`  
**Framework version:** `0.2.0-dev.2`  
**Execution UTC:** 2026-10-15T00:12:00.3520241Z — 2026-10-15T00:16:06.7112037Z  
**Build artifact:** `main.js`, 905089 bytes, SHA-256 `98cb628178e2591c1e2ca95554a4cee2650127b685cdb3cc1a689416411338b8` (development observation only; release authorization **not granted**).

## Original PHX-CI-reported results

- `preflight`, `node-preflight`, `node-project-files`, `install`, `typecheck`, `test-focused`, `test`, `build`, `repository-check`, `check`, `artifacts`: all PASS, exit 0, no failure classification.
- Focused command `npm run test:bvp-root`: **403 tests, 403 PASS, 0 FAIL**.
- Full command `npm test`: **990 tests, 990 PASS, 0 FAIL**.
- Production `npm run build` and build verification PASS; production artifact verification PASS.
- BVP repository check `BVP_REPOSITORY_CHECK_RESULT=PASS`, including dev-root check, shipping development observation, architecture guard, and architecture metrics (all exit 0). `changeClass=authorized-governance` applies to the explicitly approved DEC-343 frozen-surface change and does not approve release.

## Administrative defect and recovery

The pinned PHX-CI publisher wrote the complete original run outputs as timestamped files directly under `dev/test-results/`, whereas the operative governance requires `dev/test-results/<phx-ci-run-id>/`. Original outputs were published by PHX-CI in evidence commit `4e0b225b44e0227390decc176b762ed8ff435556`; this discrepancy is **administrative**, not a product-verification failure.

For exact-byte recovery, this commit duplicates the original PHX-CI-produced Git blobs **by blob identity** in this canonical run directory:

| Canonical recovered file | Original published evidence | Unchanged Git blob SHA |
|---|---|---|
| `result.json` | `dev/test-results/20261015T001156Z-operator-fix-s09g1-plugin-data-existing-null-guard-20261014-41dcc9295460.json` | `b6670357426d52287797e3842a0abeb930110271` |
| `result.md` | `dev/test-results/20261015T001156Z-operator-fix-s09g1-plugin-data-existing-null-guard-20261014-41dcc9295460.md` | `d6fdf390b8f783830b5850a01cf459dcf14e1fe9` |
| `terminal.log` | `dev/test-results/20261015T001156Z-operator-fix-s09g1-plugin-data-existing-null-guard-20261014-41dcc9295460.log` | `997a0db72be8e76d560152d2ddf2532648008d84` |

This recovery document binds the exact run and its raw original evidence. The original timestamped files remain unmodified. These are **PHX-CI results**, not independently rerun or independently adjudicated tests. The administrative publishing-layout defect in the PHX-CI/consumer evidence path remains a tooling-conformance item for a separately authorized, minimal-scope change; it is not a reason to rerun the already-green source (protocol §37.1).

## Remaining gates

PHX-CI PASS is **software verification only**. Independent architecture/security/governance review and explicit owner software-promotion authority remain pending. DEC-340-01 remains an unfixed, owner-deferred MAJOR governance finding; historical physical S09 `data.json` loss/corruption root cause remains unproven; no release hash approved. No release, installation, activation, physical S09, live Drive/vault operations, or Stage 3.
