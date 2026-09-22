# VH17 — C04 Correction 01 — Real H6B Runner Orchestration

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh17-c04-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh17-c04.md`  
Rejected prior branch: `phase6-vh17-c04-scenario`  
Rejected prior HEAD: `b01275262e97cfa66ac9e38844e3b4af77877167`  
Required correction branch: `phase6-vh17-c04-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh17-c04-scenario-01-correction-01.md`

## REJECTION

The prior C04 implementation is rejected because a direct C04 executor orchestrated preview/assert/execute outside the actual H6 runner/runtime composition. That bypassed the fixed shared authority path and could not establish that production execution was authorized from the exact plan observed by the repaired runtime.

The original C04 behavior and acceptance requirements remain unchanged.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune`. Require the exact head of `origin/phase6-vh15-validation-mode-runtime-canary` to equal:

`fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

Hard-stop unless the VH15-R2 evidence at that SHA begins `STATUS: COMPLETE`.

Create `phase6-vh17-c04-scenario-correction-01` from exactly that SHA. Do not use the rejected C04 branch as the correction base and do not merge/cherry-pick its orchestration implementation.

## FROZEN BOUNDARIES

Do not modify H6B shared runtime/handoff code, frozen harness contracts, `src/contracts/**`, C04 acceptance text, or production sync semantics.

Do not implement a direct C04 preview/assert/execute executor. Do not override the fixed `production-path-driver` or `plan-assertion-engine`. Do not synthesize or pass execution authorization from scenario code.

No live Drive/mobile validation.

## CORRECTION WORK ORDER

Implement only C04 and focused tests through the actual repaired `ValidationModeRuntime` / runner extension points.

Use explicit authority cycle identifiers for the C04 production mutation phases. Every executable plan must flow through:

production preview → retained exact plan → fixed plan assertion → retained assertion authorization → fixed production execution.

Preserve original C04 semantics: deterministically establish trusted fixture lineage, perform mobile rename/move, drive production synchronization on both participants, assert identity-preserving remote and Windows move, stable Drive ID, old-path absence, unchanged content, and no delete/create substitution.

Focused tests must instantiate/use the real H6B composition and include:

- deterministic success through the fixed runner path;
- fail-closed unexpected-plan behavior before execution;
- delete/create substitution rejection while preserving stable identity requirements.

## ACCEPTANCE / VERIFICATION

Before completion:

- C04 maps one-to-one to `C04-ios-move-windows-move.md`.
- No direct scenario executor bypasses H6B.
- No replacement production driver/assertion engine exists.
- Exact plan identity is preserved from preview through assertion/authorization/execution.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Changes are limited to C04 scenario/test/evidence surfaces.

Commit implementation/tests first, then correction evidence separately. Evidence must begin exactly `STATUS: COMPLETE` or `STATUS: BLOCKED` and record exact base/implementation SHAs, files, verification results, deviations, and blockers.

## FINAL STOP

Push and stop. Do not merge/promote/release, run physical validation, begin VH23, or alter peer scenarios.
