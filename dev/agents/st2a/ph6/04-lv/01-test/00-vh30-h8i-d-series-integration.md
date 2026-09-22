# VH30 — H8I D-Series Harness Integration

Agent: `agt-ca-p6-vh30-d-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh30-d-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh30-d-series-integration-01.md`

Local verification launcher: `dev/scripts/verify-vh30-d-series-integration.ps1`
## Assignment
Integrate the independently built D01–D06 harness scenarios into one H8 D-series package, wire them through the H6 registry/runner extension point, and verify their combined behavior and isolation without executing physical device scenarios.

## Executable base / input gate
At execution, run `git fetch origin --prune`. Use exact head of `origin/phase6-vh15-validation-mode-runtime-canary` as integration base only if its evidence begins `STATUS: COMPLETE`. Verify branches `phase6-vh24-d01-scenario`, `phase6-vh25-d02-scenario`, `phase6-vh26-d03-scenario`, `phase6-vh27-d04-scenario`, `phase6-vh28-d05-scenario`, and `phase6-vh29-d06-scenario` each exist and their own evidence files begin `STATUS: COMPLETE`. Create the required branch from the H6B base and merge those exact verified heads; record every SHA. No prompt editing is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, shared protocol, D01–D06 package files, VH15 and all six scenario evidence files, and merged source/tests. Preserve the no-forged-stale-authority rule and D05 human checkpoint semantics. Resolve integration conflicts without changing frozen H0 contracts, production semantics, or scenario acceptance criteria. If a shared deficiency is exposed, stop with `CONTRACT CHANGE REQUEST`.

Required end state: all six D scenarios are uniquely registered, independently invocable, suite-order compatible, and retain conflict/offline/stale-device safety behavior.

## Verification / evidence
GitHub Actions are prohibited. Create/use `dev/scripts/verify-vh30-d-series-integration.ps1` as the task-specific local verification launcher. It must be a thin orchestration layer over the centralized PHX-CI framework at the exact revision pinned by `phx-ci.json.framework.sha`, validate the PHX-CI checkout HEAD against that pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, and keep focused/change-set verification separate from complete repository verification. Through PHX-CI, run all D-series harness/integration tests plus applicable typecheck, full repository tests, build, repository checks, artifact checks, and `git diff --check`. Canonical PHX-CI evidence must be `dev/_ca-output.md` and `dev/_ca-output.json`, with run history under `dev/test-results/`; the existing VH30 `dev/evidence/` file remains separate. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS` and all D-series integration gates pass.

Commit only necessary integration/registry corrections, then write the task evidence with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, merges/conflicts, changed files, PHX-CI/focused results, deviations, and blockers; commit evidence separately.

Stop without promotion/release/live validation or D01–D06 PASS claims.