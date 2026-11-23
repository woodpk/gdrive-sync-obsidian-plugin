# BRAIN Repository Progress Dashboard — DCM-derived local module

This is an install-ready adaptation of the supplied DevCycle Management dashboard ZIP for `woodpk/gdrive-sync-obsidian-plugin`.

## Scope and design

- **Visual inheritance:** Preserves DCM's current **two-tab** dark-gray HTML interface: **Work Hierarchy** and **Performance**, with the searchable tree, active-unit purpose, selected-item inspector, evidence links, closeout-readiness checks, and performance cards. `dcm-reference-three-tab.html` is included strictly as the original ZIP's preserved reference. This package does *not* silently substitute that legacy three-tab design.
- **Source-specific BRAIN adapter:** The old DCM YAML/planning extraction is replaced with BRAIN's `dev/state/current-state.yaml` per-feature records from pinned Git branches, plus original PHX-CI `dev/test-results/<run-id>/result.json` evidence and project plans. It understands seven BRAIN workstreams, DEC-339/WS-02 BU-01..07, DEC-339/WS-03 remote metadata and DEC-362 stable-Drive-ID correction. Future `build/dec339-*` branches are discovered automatically if their progress blocks identify the matching `branch` field; unrelated branches are excluded.
- **No false acceptance:** `PHX-CI PASS` does not mean Reviewer acceptance. A copied historical state block is ignored on a newer unrelated branch. A bounded accepted feature does not close the full Workstream or authorize PR #157, database migration, inventory activation, physical testing, merge or release. The `active` panel is explicitly a *most recent outstanding feature focus* rather than an overwrite of BRAIN's global BVP active pointer.
- **Supplementary checklist:** DEC362-13, 14, 15 and 16 are represented as linked checks distinct from the source-backed Build Units. DEC362-14 remains **partial** pending direct end-to-end continuity proof; DEC362-16 remains **pending** for PR #157 cutover. The statuses are bounded interpretations of the user's checklist and independent DEC-362 review, not invented completion in GitHub.
- **Privacy:** A generated HTML embeds state/evidence data and may contain repository paths, SHAs and review metadata. Store it only in an approved private location. Do not share publicly.

## Install

From a PowerShell 7 terminal opened in the BRAIN repository checkout, download `brain-dashboard-for-repo.zip` and extract its contents **into the repository root**, so that the entrypoint is:

`dev/scripts/dashboard/Run-BRAINDashboard.ps1`

A straightforward initial run (without browser QA):

```powershell
& './dev/scripts/dashboard/Run-BRAINDashboard.ps1' -RepositoryRoot (Get-Location).Path
```

A strict run on Windows with installed Microsoft Edge:

```powershell
& './dev/scripts/dashboard/Run-BRAINDashboard.ps1' -RepositoryRoot (Get-Location).Path -VerifyBrowser
```

A non-opening refresh:

```powershell
& './dev/scripts/dashboard/Run-BRAINDashboard.ps1' -RepositoryRoot (Get-Location).Path -NoOpen
```

The dashboard performs a fresh **read-only Git clone** in a temporary directory. It fetches BRAIN source branches, pins each SHA, compares authoritative feature-state blocks against their owning branch, reads original evidence and generates a deterministic JSON-backed HTML snapshot. It does not switch or reset the operator's repository branch. It does not contact or modify Google Drive, Google API, Obsidian vault data, or GitHub Actions.

## Output and evidence

- Latest HTML: `dev/dashboards/BRAIN-Dashboard-LATEST.html`
- Versioned HTML: `dev/dashboards/BRAIN-Dashboard-<run-id>.html`
- Complete original output: `dev/test-results/dashboard/<run-id>/terminal.log` and `command-log.ndjson` (full native output and exit codes, including source reads)
- Snapshot, browser QA, and final verdict: same run folder (`dashboard.snapshot.json`, `dashboard.html`, `validation.json`, optional `browser-dom.txt`)
- Short, persistent evidence index: `dev/_ca-output.md`

On failure, final verdict is FAIL and the prior LATEST.html remains unchanged. The script always prints a final summary table and exits nonzero. No outgoing Git commits/pushes happen during a refresh; commit evidence through the normal Owner-approved repo governance workflow when persistence is requested.

### Explicit verification limits

The supplied DCM dashboard has been adapted and its HTML rendering/navigation have been exercised in this development environment using an isolated sample dataset. **PowerShell 7 and Windows Edge execution are not available in this container**; therefore the `.ps1` integration has **not** been run against a local Windows clone. First Windows execution, offline `.ps1` tests and Edge QA require the above command in the Owner's Windows environment. Do not label the build independently accepted before that evidence exists.

## Data/source rules

1. Default source repository is `https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`; no arbitrary repo URL is allowed in the packaged configuration.
2. Only `master` and matching feature branches whose own `dev/state/current-state.yaml` block claims the matching branch are considered. `dashboard.local.json` controls the prefix allowlist and maximum number of refs.
3. Branch SHA is pinned at source collection. Original `result.json` must exist within the pinned branch history. Historical failed runs remain inspectable; a later PASS is not evidence for a different source SHA.
4. Acceptance is derived from affirmative current feature status and (where available) its immutable review references. It is not inferred from passing tests or high-level workstream position.
5. No source-backed overall product completion percentage or delivery forecast is invented. Workstream acceptance roll-up is deliberately conservative until entire Workstream reviews are explicitly represented.
6. BRAIN global `active_build_unit` currently reflects older WS-07 work in some new branch copies, so the dashboard selects the newest unfinished self-owned feature branch for *focus* and labels it accordingly.
7. `Dashboard.BrainCore.ps1` has a small English description mapping for known DEC-339 units. This is presentation content, not new engineering authority.

## Files

| Name | Function |
|---|---|
| `Run-BRAINDashboard.ps1` | Fresh read-only clone, SHA pin, generation, original evidence, optional browser QA, publish and final result |
| `Dashboard.BrainCore.ps1` | Source parsing, status classification, evidence verification, workstream hierarchy and snapshot assembly |
| `Test-BRAINDashboard.ps1` | Offline PowerShell tests, optional isolated Edge interaction QA |
| `brain-dashboard-template.html` | Adapted current DCM Draft 1 two-tab HTML with BRAIN variable-count validation, branding and source-link policy |
| `template.sha256` | Exact adapted-template source checksum |
| `dcm-reference-three-tab.html` | Original three-tab reference from the supplied ZIP, not used for generation |
| `dashboard.local.json` | Read-only source-selection configuration |
| `.gitattributes` | Fixed LF line endings to preserve the template source hash |

## Known limits and next improvements

- This module is an **initial integration-grade port** of the supplied dashboard, not a product-wide, independently accepted replacement for BRAIN's governance documents. BRAIN's full nested planning decomposition and exhaustive requirements catalog are not yet normalized to DCM's 8/26/182 planning schema; source-specific feature blocks are reported instead of manufacturing equivalent counts.
- A formal independent review is recommended for `Dashboard.BrainCore.ps1` status extraction and source-ownership logic before making the dashboard a governed release/acceptance instrument.
- The generated HTML uses the latest pinned feature-state snapshot, not real-time auto-refresh. Rerun the launcher for updated data.
- The original DCM module contains a more extensive parser/consistency test suite for its own schema; that suite is **not directly reusable** for BRAIN's `current-state.yaml` without rewriting DCM-specific assertions.