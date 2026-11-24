# BRAIN project dashboard — repository-integrated DCM adaptation

**Software location:** `woodpk/gdrive-sync-obsidian-plugin`, branch **`progress`**, `dev/scripts/dashboard/`.

**Presentation:** Preserves the DCM ZIP's current two-tab Work Hierarchy / Performance design. The old three-tab HTML is retained as an untouched reference. No DCM task, status, decision or approval is imported as BRAIN authority.

## Normal use: from ANY BRAIN working branch

You **do not** need to change the branch you are currently building on. Run this paste-ready PowerShell 7 bootstrap from anywhere inside your existing BRAIN checkout:

```powershell
$ErrorActionPreference = 'Stop'; `
$repo = ((git rev-parse --show-toplevel) -join '').Trim(); `
if ($LASTEXITCODE -ne 0 -or -not $repo) { throw 'Not inside BRAIN Git checkout' }; `
$launcher = Join-Path $env:TEMP ('brain-dashboard-launch-'+[guid]::NewGuid().ToString('N')+'.ps1'); `
try { `
  git -C $repo fetch --no-tags origin progress; `
  if ($LASTEXITCODE -ne 0) { throw 'Fetching progress failed' }; `
  $source = @(& git -C $repo show 'origin/progress:dev/scripts/dashboard/Launch-BRAINDashboard.ps1'); `
  if ($LASTEXITCODE -ne 0 -or $source.Count -lt 5) { throw 'Cannot read progress launcher' }; `
  [IO.File]::WriteAllText($launcher,($source -join "`n"),[Text.UTF8Encoding]::new($false)); `
  & $launcher -RepositoryRoot $repo -VerifyBrowser -PersistEvidence; `
  $result = $LASTEXITCODE; `
  if ($result -ne 0) { throw "BRAIN dashboard failed (exit $result)" }; `
} finally { `
  Remove-Item -LiteralPath $launcher -Force -ErrorAction SilentlyContinue; `
}
```

The bootstrap fetches only Git objects and the launcher script. It never checks out `progress` in your existing development tree. The launcher validates your existing checkout's repository identity, records its branch/HEAD, clones **only** `progress` to an isolated temporary checkout, runs the generator there, then confirms that your original checkout has the same branch/HEAD. On a successful run the temporary clone is deleted; on failure it is retained for diagnosis.

The `-PersistEvidence` option commits and pushes the **dashboard run evidence only** to `progress` (fast-forward only). Omit it if you want a purely local refresh. `-NoOpen` suppresses opening the report and `-VerifyBrowser` requests strict Microsoft Edge QA.

## Results

| Output | Default location |
| --- | --- |
| Interactive dashboard | `%LOCALAPPDATA%\BRAIN-Dashboards\BRAIN-Dashboard-LATEST.html` |
| Immutable versioned dashboard | Same directory, filename contains a run ID |
| Persistent launcher/runner diagnostics | `%LOCALAPPDATA%\BRAIN-Dashboards\evidence\<run-id>\` |
| Native source-run evidence | `dev/test-results/dashboard/<run-id>/` inside the isolated progress clone; copied into the persistent diagnostics directory |
| Short run index | `dev/_ca-output.md` in the isolated progress clone; copied into persistent diagnostics, and optionally committed to `progress` |

If a run fails, the prior valid `LATEST.html` is not overwritten. The launcher prints a final table with exact result, source branch, evidence path and exit code. The active BRAIN build checkout is not changed.

## Why the earlier command failed

The prior bootstrap stopped when the working checkout was on `build/dec339-step4-observation-comparison-20261123` instead of `progress`. That was the wrong operating model. DCM's dashboard module and source-data branches are independent of the operator's current coding branch. BRAIN now follows that principle: the module/evidence branch is `progress`, while the data reader consults canonical `master` and exact source-owned DEC-339/DEC-362 feature branches.

## What counts as complete

A source commit, passed PHX-CI run, independent Reviewer acceptance and Owner authorization for merge/activation are separate claims. They are displayed separately. The dashboard does not accept work or infer approval from successful tests.

Current known BRAIN feature keys include WS-02/BU-01..07, WS-03 metadata transport, WS-05/DEC-339 Steps 3–5, DEC-362 stable Drive IDs and the separately labeled older WS-07 global BVP pointer. Step 3's independently accepted assembled continuity proof satisfies the formerly deferred DEC362-14 software gate, but no live/physical proof is inferred. Step 5 may be displayed as blocked even after software verification because its independent Reviewer issued F-01.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the original DCM model versus the BRAIN adaptation, data ownership, progress branch safety, qualification and test gates.

## Files

| File | Purpose |
| --- | --- |
| `Launch-BRAINDashboard.ps1` | Branch-independent, safe launcher and optional `progress`-only evidence publication |
| `Run-BRAINDashboard.ps1` | Source-pinned generator/writer, executable only from isolated `progress` checkout |
| `Dashboard.BrainCore.ps1` | BRAIN state, workstream, feature and evidence adapter |
| `Test-BRAINDashboard.ps1` | Offline regressions and optional headless Microsoft Edge QA |
| `brain-dashboard-template.html` | DCM-derived two-tab interface for BRAIN |
| `dcm-reference-three-tab.html` | Non-executed reference from original supplied ZIP |
| `template.sha256` | Template integrity manifest |
| `dashboard.local.json` | Allowed BRAIN source feature prefixes and read limits |
| `ARCHITECTURE.md` | Operational/architecture rationale and trust boundaries |

**Verification limitations:** Native PowerShell parser, fresh Windows source clone, and Edge QA must still be run on Windows; JavaScript syntax/browser checks in another environment are not interchangeable with those results. No GitHub Actions are used.