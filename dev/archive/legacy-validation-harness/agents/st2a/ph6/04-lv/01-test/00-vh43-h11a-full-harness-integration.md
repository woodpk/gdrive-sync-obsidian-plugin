# VH43 — H11A Full C03–F03 Harness Integration

Agent: `agt-ca-p6-vh43-full-harness-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh43-full-harness-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh43-full-harness-integration-01.md`

Local verification launcher: `dev/scripts/verify-vh43-full-harness-integration.ps1`
## Assignment
Integrate the four independently verified series packages into one complete C03–F03 validation harness. Reconcile the central scenario registry/suite order, ensure each of the 23 authoritative scenario IDs is present exactly once, and prove cross-series isolation, ordered-suite composition, validation-mode containment, and evidence/verdict compatibility. This is integration only; do not redesign scenario behavior or execute real-device validation.

## Executable base / input gate
At execution, run `git fetch origin --prune`. Resolve the exact head of `origin/phase6-vh15-validation-mode-runtime-canary` as the integration base and hard-stop unless its evidence begins `STATUS: COMPLETE`. Verify these four integration branches exist and each branch's evidence file begins `STATUS: COMPLETE`: `phase6-vh23-c-series-integration`, `phase6-vh30-d-series-integration`, `phase6-vh38-e-series-integration`, `phase6-vh42-f-series-integration`. Create the required branch from the H6B base and merge those exact verified heads. Record every input SHA. No prompt value is filled in before dispatch.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Stage 1 Phase 6 decomposition, shared live-validation protocol, all C03–F03 scenario package files, VH15 evidence, the four series-integration evidence files, and merged source/tests. Resolve registry/import conflicts centrally by combining the approved scenario entries; do not change frozen H0 contracts, production synchronization semantics, fault certainty rules, sandbox authority, or scenario acceptance contracts. If a genuine incompatible shared contract is discovered, stop with `CONTRACT CHANGE REQUEST`.

Required end state: exactly 23 C03–F03 scenarios are registered once each; single-scenario and ordered-suite selection work; scenario/fault/checkpoint state cannot bleed across runs; iPhone/iPad mobile role identity remains explicit; hybrid scenarios preserve human checkpoints; no ordinary product path enables validation authority.

## Verification / evidence
GitHub Actions are prohibited. Create/use `dev/scripts/verify-vh43-full-harness-integration.ps1` as the task-specific local verification launcher. It must be a thin orchestration layer over the centralized PHX-CI framework at the exact revision pinned by `phx-ci.json.framework.sha`, validate the PHX-CI checkout HEAD against that pin, preserve the user's active/control checkout without reset/clean/switch/stash, and capture complete output and exit codes. Focused/change-set verification and complete repository verification remain separate required dimensions. Through PHX-CI, the focused dimension must execute the complete harness-focused test set, validation-mode isolation tests, sandbox negative tests, fault isolation tests, and evidence-schema tests; repository verification must also require applicable typecheck, full repository tests, build, repository checks, artifact checks, and `git diff --check`. Canonical PHX-CI evidence must be `dev/_ca-output.md` and `dev/_ca-output.json`, with run history under `dev/test-results/`; the existing VH43 `dev/evidence/` file remains separate. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS` and every VH43 integration gate passes.

Fix only bounded integration defects introduced/exposed by combination; do not expand scenario scope. Commit integration corrections first, then write task evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, merges/conflicts, implementation SHA, changed files, PHX-CI/focused results, deviations, and blockers; commit evidence separately.

Stop without promotion/release, real-device canary, full C03–F03 execution, or any scenario PASS claim.