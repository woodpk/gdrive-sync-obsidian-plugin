# Phase 6 Live Validation Protocol

Applies to every task in this directory.

## Validation authority epochs

### Historical authority — prerelease `0.1.13`

Scenarios already executed under the original Phase 6 validation epoch retain their original authority and are not retroactively reinterpreted:

- source `4352f168bd3c4f948f7110fd8713a3f71df2b901`;
- installed prerelease `0.1.13`;
- `main.js` SHA-256 `27e5f5a887309c2521f0a16f937076e13db90f11f0bd73bc64daf5f5f349c85c`;
- `manifest.json` SHA-256 `6db461da1efaaa47be0a6c98a979fb9d17c948978efc0b7e78db1dcb29ee6b0c`.

### Active authority from C01 forward — prerelease `0.1.17`

C01 revalidation and later C-series scenarios use the repaired prerelease `0.1.17` unless a later scenario explicitly supersedes it:

- approved repair source HEAD `aeb37485da06d0278f1f89c1a50c50a060212615`;
- release-preparation/tag commit `18b689b3b413d02e3172c8eba3d2f782c8cb8a04`;
- `main.js` SHA-256 `19dd0079c5e56082d5c75986caf4ff7f5f281a688b57122d1e0f13205ea6a022`;
- `manifest.json` SHA-256 `7cdeccb50d2cbf496727b5bb685dde32ab537dbae835eb6ae5f713b1c6d798a8`.

After C01 real-platform PASS, the validated repair was integrated into `phase6-integration` at merge commit `2362b88808d806b7acd10e72325a237b238c22cf`.

## Automated verification policy for executable and reusable task prompts

- GitHub Actions are prohibited for Phase 6 build, verification, integration, and independent-verification completion gates.
- Authoritative automated verification runs locally through the **installed PHX-CI runtime** associated with the repository's configured PHX-CI framework/runtime authority in `phx-ci.json`. The deployed runtime production front door is the execution engine.
- The consumer repository MUST NOT require a mutable PHX-CI source checkout, a source-mode `FrameworkRoot`, or manual positioning of a PHX-CI checkout at `phx-ci.json.framework.sha`. If the installed runtime cannot validate/attest the configured repository authority, verification is blocked.
- A repository-controlled bootstrap or task-specific focused command MAY prepare the consumer invocation, but it is orchestration only and MUST NOT duplicate PHX-CI core sequencing or turn a PHX-CI source checkout into an execution dependency.
- Every authoritative PHX-CI run must preserve the user's active/control checkout without reset, clean, switch, or stash, and must capture complete command output and exit codes.
- Focused/change-set verification and complete repository verification are separate required dimensions. Required task-specific focused tests remain mandatory, and PHX-CI must also execute the applicable typecheck, full tests, build, repository checks, artifact checks, and `git diff --check`.
- Canonical PHX-CI evidence is `dev/_ca-output.md` and `dev/_ca-output.json`; historical run evidence belongs under `dev/test-results/`. Task-specific evidence under `dev/evidence/` remains separate where a task requires it.
- Authoritative completion requires Change-set verification PASS, Repository verification PASS, and Overall verification PASS — shorthand `PASS / PASS / PASS`.
- `STATUS: COMPLETE` is forbidden while authoritative PHX-CI verification is blocked or failed.
- The retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` is not an active entrypoint and MUST NOT be restored.
- Historical task text may describe older CI mechanisms only when clearly labeled non-executable history; current execution always follows this policy.

## Common rules

- Tasks execute in filename/dependency order by default.
- Tasks explicitly designated by governing task authority as members of the same **parallel-safe wave** may execute concurrently from their frozen common base.
- A dependent integration/closure task may begin only after every required member of that wave has completed and received the required approval.
- **Parallel Wave D** is explicitly authorized: VH24/D01, VH25/D02, VH26/D03, VH27/D04, VH28/D05, and VH29/D06 may execute concurrently from common base `108ab6ddfccb331c62d1ac18041faf8fd49d26c4`.
- Each Parallel Wave D task must create its own scenario branch from that exact common base, own only its assigned scenario implementation/tests/evidence, consume no other D-series scenario branch, and preserve all frozen/shared semantic authority. If a scenario requires a shared contract change rather than implementation behind existing contracts, that task must stop and report the required contract-change condition instead of modifying the shared contract independently.
- VH30/H8I is **not** a member of Parallel Wave D. It remains the serial D-series integration gate and may begin only after VH24–VH29 have all independently completed and the supervisor has approved each exact scenario HEAD.
- Keep diagnostics at `Trace`, retention `5000`; capture **Copy diagnostic bundle** immediately before and after each scenario.
- Use disposable fixtures only. Do not edit source/tests or reset/re-pair state unless the scenario explicitly requires it.
- Beginning with C02, controlled manual scenarios must disable the three automatic synchronization toggles on every participating device before creating the fixture: **Startup / resume**, **Local changes**, and **Periodic remote reconciliation**. Leave them disabled until post-scenario evidence is captured unless the scenario explicitly tests automatic synchronization.
- Manual synchronization must always be previewed first. If the plan contains an unexpected mutation, duplicate, conflict, destructive action, blocked operation, or recovery condition: **do not execute**; capture evidence and stop.
- Execute only the scenario named in the current file, then stop.
- The product does **not** present a separate completion-status screen after an accepted execution. When execution is accepted, the plan modal closes. Terminal success or failure must be established from the resulting device state/content plus diagnostics, especially the terminal `sync-run-complete` / failure event.
- PASS requires expected local/remote content and identity, correct BASE/mapping/tombstone state, no unrelated mutation, no unexpected duplicate, no unresolved intent unless recovery is the expected result, and correct terminal status.
- Report fixture/hash, plan/action counts, operation/intent/effect/request IDs available, remote IDs, state/semantic revisions, pre/post bundle hashes, and PASS/FAIL.

`OBS-01`: if `causalIndex.runs` remains empty, record it. Tests E01–E04 that depend on uncertain-effect/recovery causality require OBS-01 resolved or explicit supervisor waiver with equivalent correlation evidence.
