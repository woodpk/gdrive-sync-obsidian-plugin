# VH30 — H8I D-Series Harness Integration

Agent: `agt-ca-p6-vh30-d-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh30-d-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh30-d-series-integration-01.md`

## Assignment
Integrate the independently built D01–D06 harness scenarios into one H8 D-series package, wire them through the H6 registry/runner extension point, and verify their combined behavior and isolation without executing physical device scenarios.

## Execution class / executable base / approved input gate

**Execution class:** `SERIAL D-SERIES INTEGRATION GATE`. VH30 is not part of Parallel Wave D.

VH30 MUST NOT begin until VH24–VH29 have each independently completed and the supervisor has approved the **exact scenario HEAD SHA** for D01, D02, D03, D04, D05, and D06.

At execution:

1. run `git fetch origin --prune --tags`;
2. require approved common integration base `D_SERIES_COMMON_BASE_SHA = 108ab6ddfccb331c62d1ac18041faf8fd49d26c4` to exist locally as a commit;
3. obtain and record the six supervisor-approved exact inputs named `D01_APPROVED_HEAD`, `D02_APPROVED_HEAD`, `D03_APPROVED_HEAD`, `D04_APPROVED_HEAD`, `D05_APPROVED_HEAD`, and `D06_APPROVED_HEAD`;
4. for each approved input, require that exact commit to exist, require `D_SERIES_COMMON_BASE_SHA` to be its ancestor, and require that scenario's task evidence **at that exact commit** to begin `STATUS: COMPLETE` and record authoritative `PASS / PASS / PASS`;
5. require the supervisor approval to apply to that exact SHA.

Do **not** substitute a scenario branch tip for an approved SHA, do not assume any scenario branch still exists, and do not restore deleted historical branches.

Only after all six exact inputs pass those gates: create `phase6-vh30-d-series-integration` from exactly `D_SERIES_COMMON_BASE_SHA`, integrate the six approved exact scenario HEADs, and record every consumed SHA and resulting integration commit. No future value other than those six exact approved scenario SHAs is deferred.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, shared protocol, D01–D06 package files, the approved common integration baseline after VH23, all six exact approved scenario evidence files, and merged source/tests. Preserve the no-forged-stale-authority rule and D05 human checkpoint semantics. Resolve integration conflicts without changing frozen H0 contracts, production semantics, or scenario acceptance criteria. If a shared deficiency is exposed, stop with `CONTRACT CHANGE REQUEST`.

Serial integration ownership: consume the six supervisor-approved exact scenario HEADs only after every scenario gate passes. Preserve the fixed H6B `production-path-driver`, fixed H6B `plan-assertion-engine`, frozen H0 contracts, production authority/state, no-timestamp/newest-wins policy, D05 human-checkpoint semantics, D06 stale-device safety/BLOCKED semantics, and the prohibition on harness-only bypasses. If integration exposes a required shared contract change, stop with `CONTRACT CHANGE REQUEST` rather than redefining shared authority during integration.

Required end state: all six D scenarios are uniquely registered, independently invocable, suite-order compatible, and retain conflict/offline/stale-device safety behavior.

## Verification / evidence
GitHub Actions are prohibited.

Authoritative verification must run locally through the **installed PHX-CI runtime associated with this repository's configured authority in `phx-ci.json`**, using the deployed runtime production front door. Do not require a mutable PHX-CI source checkout, do not manually position a PHX-CI checkout at `phx-ci.json.framework.sha`, and do not require a source-mode `FrameworkRoot`. If the installed runtime cannot validate/attest the configured repository authority, completion is blocked.

Preserve the user's active/control checkout without reset, clean, switch, or stash. Capture complete command output and exit codes.

PHX-CI must report these dimensions independently:

- Change-set verification: task-specific focused tests remain mandatory; include the applicable focused `npm run check` / configured typecheck and `git diff --check` gates.
- Repository verification: complete repository verification remains mandatory, including applicable typecheck, full repository tests, build, repository checks, artifact checks, and `git diff --check`.
- Overall verification: PASS only when every required gate passes.

Required successful completion is exactly `PASS / PASS / PASS` for Change-set verification / Repository verification / Overall verification.

Canonical PHX-CI evidence is `dev/_ca-output.md` and `dev/_ca-output.json`, with historical runs under `dev/test-results/`; this task's `dev/evidence/` file remains separate. `STATUS: COMPLETE` is forbidden unless authoritative PHX-CI verification reports `PASS / PASS / PASS` and the task-specific focused gates pass.

Run all D-series harness/integration tests as the task-specific focused gate, then complete repository verification through PHX-CI. Commit only necessary integration/registry corrections, then write the task evidence with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording the common base, all six approved input SHAs, integration commits/conflicts, changed files, PHX-CI/focused results, deviations, and blockers; commit evidence separately.

Stop without promotion/release/live validation or D01–D06 PASS claims.