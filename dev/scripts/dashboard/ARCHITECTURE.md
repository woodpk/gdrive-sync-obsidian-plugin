# BRAIN dashboard integration contract

## Architecture adapted from the supplied DCM dashboard ZIP

The supplied DCM architecture intentionally separates (1) the operator's persistent development checkout, (2) the dashboard module revision, (3) the source-data revision, (4) generated HTML, and (5) complete run evidence. The original `Run-DCMDashboard.ps1` fetches its module into an isolated Git worktree, while `Invoke-DCMDashboard.ps1` fetches source data into a separate checkout and writes verified output/evidence to persistent locations. The module does **not** require the operator to change branches. DCM's canonical progress-data branch and BRAIN's development records are **not** identical storage models.

The earlier BRAIN port collapsed these responsibilities by making the operator run `dev/scripts/dashboard/Run-BRAINDashboard.ps1` from whatever branch was active. This could place generated reports and `dev/_ca-output.md` in a Build Unit feature checkout. The subsequent strict `progress` guard prevented that contamination, but incorrectly required the Owner to switch the **operator's working branch**. The accompanying bootstrap failed by design on `build/dec339-step4-observation-comparison-20261123`.

The repaired architecture is:

| Responsibility | Location / identity | Writes allowed? |
| --- | --- | --- |
| Operator's BRAIN checkout | The branch currently used for product development (e.g., `build/dec339-step5-...`) | **None by the dashboard**. It is only inspected for repository identity and unchanged branch/HEAD. |
| Dashboard module and evidence branch | Exactly `refs/heads/progress` | Yes: dashboard source, scripts, run evidence and `dev/_ca-output.md`; never product source. |
| Module execution checkout | A fresh, isolated `progress` clone under a uniquely named temporary directory | Local dashboard evidence only; optional fast-forward push of that evidence to `progress`. |
| Source-data checkout | A separate read-only Git clone from the BRAIN repository, pinned to `master` plus discovered owning DEC-339/DEC-362 feature refs | No source Git mutation. |
| Published HTML and persistent diagnostics | `%LOCALAPPDATA%\BRAIN-Dashboards` by default | Yes: local generated reports and launcher diagnostics; independent of all development checkouts. |

### Invocation

`Launch-BRAINDashboard.ps1` is the operator entry point. Because it lives on `progress`, the one-time/current-session bootstrap obtains **only this script** via `git show origin/progress:dev/scripts/dashboard/Launch-BRAINDashboard.ps1` after a read-only `git fetch`, then executes it from a temporary file. This is valid while the operator's existing checkout is on any BRAIN development branch. The operator's active branch is **never** checked out or reset by the launcher.

`Run-BRAINDashboard.ps1` is intentionally a lower-level writer and only runs when the **isolated module checkout** is on `progress`. Its `master` parameter means the canonical *project specification/source baseline*, **not** the dashboard source or writable branch; data also comes from other owned feature branches. Its self-tests and source data parsing are independent of GitHub Actions.

When `-PersistEvidence` is set, the launcher stages the bounded run evidence and `dev/_ca-output.md` in the isolated clone, commits there, then pushes **only** `HEAD:refs/heads/progress` without force. A concurrent remote advancement causes a push failure, not a reset or overwrite. When omitted, all detailed run logs and evidence remain locally in `%LOCALAPPDATA%\BRAIN-Dashboards\evidence\<run-id>\`.

### BRAIN-specific data sources and qualifications

- The canonical `dev/planning/02-workstreams/00-INDEX.md` supplies the seven-workstream inventory; there is **no** assumption that DCM's Workstream/BU counts or `progress` status schema exist in BRAIN.
- Each DEC-339 or DEC-362 feature must own its own `dev/state/current-state.yaml` block (`branch` or `builder_branch` must match the source branch); copied historical blocks on successor branches are not new acceptances.
- The adapter covers WS-02 BU-01..07, WS-03 remote metadata, WS-05 **Step 3 storage-only shadow**, **Step 4 observation-only comparison**, **Step 5 default-off planner cutover**, DEC-362 stable-ID software correction and the separately labeled WS-07 BVP global pointer.
- Step 3 and Step 4 are accepted on their independently reviewed software scopes. The current Step 5 is **Reviewer CORRECTION REQUIRED** for settings-transition ordering. PHX-CI PASS is separate from independent acceptance, and both are separate from the master/PR #157 merge or activation gate.
- Original PHX-CI results are read from immutable `dev/test-results/<run-id>/result.json`, matched to the declared exact source SHA when one is supplied. Unknown counts stay null, not zero. A run with failed tests is not rendered as accepted or passed.
- DEC362-14's deferred same-ID content update → Changes → verified inventory continuity is treated as complete **only when Step 3's separately accepted direct proof is present**. Its broader live/physical scope remains unproven.
- This dashboard reports the discovered, source-owned feature subset rather than claiming to exhaustively recreate the DCM V2 normalized task/evidence hierarchy or all BRAIN requirement IDs.

### Verification gates

1. PowerShell parser preflight for every dashboard `.ps1` before generation.
2. Offline PowerShell state-parser, source ownership, progression, status and safe HTML-binding regressions. Includes the exact Step 3/4/5 progress scenario and the branch-safe launcher contract.
3. Fresh Git data source with pinned source SHAs and self-owned feature records.
4. Original PHX-CI verification separated from Reviewer/Owner acceptance and represented with original denominators where available.
5. HTML template SHA-256 consistency; rendered HTML must embed a snapshot and the master source SHA.
6. Optional headless Microsoft Edge navigation QA, enabled by `-VerifyBrowser`.
7. Local immutable run evidence with terminal, command log, result JSON, snapshot, rendered HTML; optional commit/push to `progress` alone.
8. Verify operator's original branch and HEAD remain unchanged after launcher completion.

**Environment caveat:** Native Windows PowerShell 7 and Edge executions must be performed on the Owner's Windows workstation. JavaScript syntax and isolated Chromium rendering can be tested in non-Windows environments, but those are not substitutes for the Windows parser/launcher/Edge gates.