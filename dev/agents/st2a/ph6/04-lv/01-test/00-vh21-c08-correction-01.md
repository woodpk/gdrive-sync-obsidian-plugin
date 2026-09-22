# VH21 — C08 Correction 01 — Resume After Shared H6B Repair

> **Current verification policy override (applies only if this historical task is re-executed):** GitHub Actions and the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` are prohibited. Automated verification must run locally through the centralized PHX-CI revision pinned by `phx-ci.json.framework.sha`. A task-specific repository-controlled launcher under `dev/scripts/` may orchestrate the run but must not reimplement PHX-CI core sequencing; it must validate the PHX-CI checkout HEAD against the exact pin, preserve the user's active/control checkout without reset/clean/switch/stash, capture complete output and exit codes, run task-focused/change-set verification and complete repository verification through PHX-CI (including required tests, build, repository checks, artifact checks, and `git diff --check`), and leave canonical evidence in `dev/_ca-output.md` and `dev/_ca-output.json`. `STATUS: COMPLETE` is forbidden unless PHX-CI reports `PASS / PASS / PASS`. Any GitHub-hosted CI, workflow/run/job, synthetic-merge, or retired-runner language below is historical context only and is not executable current policy.


Agent: `agt-ca-p6-vh21-c08-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Original tasking: `dev/agents/st2a/ph6/04-lv/01-test/00-vh21-c08.md`  
Prior blocked branch: `phase6-vh21-c08-scenario`  
Prior blocked HEAD: `b281c74f05094e15410d22cfbcf878f0d9495e1f`  
Required correction branch: `phase6-vh21-c08-scenario-correction-01`  
Correction evidence: `dev/evidence/_ca-output-agt-ca-p6-vh21-c08-scenario-01-correction-01.md`

## PRIOR VERDICT / RESUME AUTHORITY

The prior VH21 output correctly stopped `BLOCKED` because the old H6B composition could not safely hand the exact observed production plan through assertion and authorization to fixed production execution. That shared deficiency is now repaired by VH15-R2.

Do not redesign or locally replace the shared mechanism. Resume the original C08 assignment against the repaired canonical base.

## EXECUTABLE BASE GATE

Run `git fetch origin --prune`. Require the exact canonical VH15 head:

`fbe9dfca58840e49ebcb3a14b97d4c569770cf6e`

and require VH15-R2 evidence at that SHA to begin exactly `STATUS: COMPLETE`.

Create `phase6-vh21-c08-scenario-correction-01` from exactly that SHA. Do not use the prior blocked C08 branch as implementation base.

## FROZEN BOUNDARIES

Do not modify H6B shared runtime/handoff code, frozen H0 contracts, `src/contracts/**`, C08 acceptance text, or production sync semantics.

No direct preview/assert/execute orchestration, custom production driver, substitute assertion engine, or caller-supplied authorization.

No physical validation.

## CORRECTION WORK ORDER

Implement only C08 using the actual repaired H6B runtime composition.

Use explicit authority cycles and the fixed lifecycle:

production preview → exact retained plan → fixed plan assertion → retained assertion-derived authorization → fixed production execution.

Preserve original C08 semantics: deterministic trusted fixture lineage → Windows rename/move → Windows then mobile production synchronization → identity-preserving remote/mobile move → stable Drive ID → old-path absence → unchanged bytes/hash → no delete/create replacement → no unrelated mutation.

Focused tests must use the real runtime and prove:

- deterministic successful move;
- delete/create substitution rejection;
- unexpected-plan hard-stop before production execution.

## ACCEPTANCE / VERIFICATION

Required:

- C08 one-to-one with `C08-windows-move-ios-move.md`.
- No local workaround or alternate runner exists.
- Stable identity/old-path semantics are proven through the actual H6B execution route.
- Exact previewed plan is the asserted/authorized/executed plan.
- Focused tests pass.
- `npm run check` passes.
- `git diff --check` passes.
- Diff limited to C08 scenario/test/evidence surfaces.

Commit implementation/tests first, evidence separately with exact `STATUS: COMPLETE` or `STATUS: BLOCKED` first line and exact SHAs/results/deviations/blockers.

## FINAL STOP

Push and stop. No merge/promotion/release, physical validation, VH23, or peer-scenario modification.
