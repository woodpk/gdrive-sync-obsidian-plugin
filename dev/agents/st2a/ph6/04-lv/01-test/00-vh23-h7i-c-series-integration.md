# VH23 — H7I C-Series Harness Integration

Agent: `agt-ca-p6-vh23-c-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh23-c-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh23-c-series-integration-01.md`  
Local verification launcher: `dev/scripts/verify-vh23-c-series-integration.ps1`

## Assignment

Integrate the six still-parallel accepted C03–C08 scenario correction lines into the current Phase 6 integration state, preserve the already-integrated accepted C09 line, wire C03–C09 into one coherent H7 C-series runtime/registry package through the H6 extension mechanism, and verify the combined implementation without running physical Drive/mobile validation.

This task is integration plus bounded registry/composition correction. It is not permission to redesign scenario semantics, H6B, production synchronization, PHX-CI, or the frozen validation contracts.

## Current repository state — authoritative correction to the original task

The original VH23 prompt assumed live VH15–VH22 branches. Those branches were intentionally retired during Phase 6 branch cleanup and their accepted heads are preserved by immutable archive tags.

The current integrated baseline also already contains the accepted VH22/C09 line and the completed PHX-CI consumer migration. Therefore:

- do **not** require deleted VH15–VH22 branches to exist;
- do **not** use the rejected/original C03–C08 branch heads;
- do **not** re-merge C09;
- do **not** restore the retired BRAIN-owned `dev/scripts/run-phx-ci.ps1`;
- use the current `phase6-integration` state as the VH23 base and the archived accepted correction tags below as immutable integration inputs.

## Executable base gate

Run `git fetch origin --prune --tags`.

The post-S07 integration anchor is:

`BASE_ANCHOR_SHA = 7b4297adceb2fd6268a5801a207b7dce1f7b7728`

Resolve:

`INTEGRATION_BASE_SHA = origin/phase6-integration`

Hard-stop unless all of the following are true:

1. `BASE_ANCHOR_SHA` is an ancestor of `INTEGRATION_BASE_SHA`.
2. The only committed path difference from `BASE_ANCHOR_SHA..INTEGRATION_BASE_SHA` is this task file:
   `dev/agents/st2a/ph6/04-lv/01-test/00-vh23-h7i-c-series-integration.md`.
3. `phx-ci.json`, `Taskfile.phx-ci.yml`, and `Taskfile.yml` exist at `INTEGRATION_BASE_SHA`.
4. The retired BRAIN-owned `dev/scripts/run-phx-ci.ps1` does not exist at `INTEGRATION_BASE_SHA`.
5. The accepted VH22 repository-repair head `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` is an ancestor of `INTEGRATION_BASE_SHA`.

Create `phase6-vh23-c-series-integration` from exactly the resolved `INTEGRATION_BASE_SHA`. Record that exact SHA in evidence.

If `phase6-integration` contains any additional change beyond the single VH23 task-file update after `BASE_ANCHOR_SHA`, stop and report `BASE DRIFT` rather than guessing whether the newer state is authorized.

## Immutable accepted inputs

Verify every archive ref resolves to the exact SHA below before integrating anything.

| Work item | Immutable archive ref | Required SHA | Disposition |
|---|---|---|---|
| VH15 / repaired H6B base | `archive/branch-cleanup-20260920/phase6-vh15-validation-mode-runtime-canary` | `fbe9dfca58840e49ebcb3a14b97d4c569770cf6e` | semantic/common ancestor only; do not merge |
| VH16 / C03 correction 01 | `archive/branch-cleanup-20260920/phase6-vh16-c03-scenario-correction-01` | `6f9b5a0225c5bce5c07bedb7904edca39035f242` | merge |
| VH17 / C04 correction 01 | `archive/branch-cleanup-20260920/phase6-vh17-c04-scenario-correction-01` | `68ce67099c18e3f8830d4efebb144706471a7814` | merge |
| VH18 / C05 correction 01 | `archive/branch-cleanup-20260920/phase6-vh18-c05-scenario-correction-01` | `70ba6d6bf0da537b630e8642d84823daeeb624f5` | merge |
| VH19 / C06 correction 01 | `archive/branch-cleanup-20260920/phase6-vh19-c06-scenario-correction-01` | `fb983f9a67523b625998df7bf5a6dba870e5bb47` | merge |
| VH20 / C07 correction 01 | `archive/branch-cleanup-20260920/phase6-vh20-c07-scenario-correction-01` | `ffeedf1cbfd334381e2316a8326c6daaa5e03bf8` | merge |
| VH21 / C08 correction 01 | `archive/branch-cleanup-20260920/phase6-vh21-c08-scenario-correction-01` | `6aafd865a37f55d87b5a57c03d53c0f847363a94` | merge |
| VH22 / C09 correction 02 | `archive/branch-cleanup-20260920/phase6-vh22-c09-scenario-correction-02` | `5c33bb4e982fe2a211e48e3c082f2e01ce357368` | already represented by accepted integrated line; do not merge |
| VH22 repository-suite repair | `archive/branch-cleanup-20260920/phase6-vh22-repository-suite-blocker-repair-01` | `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` | already ancestor of integration base; do not merge |

For C03–C08, open the correction evidence file from the corresponding archive ref and hard-stop unless its first line is exactly `STATUS: COMPLETE`.

Required evidence paths:

- C03: `dev/evidence/_ca-output-agt-ca-p6-vh16-c03-scenario-01-correction-01.md`
- C04: `dev/evidence/_ca-output-agt-ca-p6-vh17-c04-scenario-01-correction-01.md`
- C05: `dev/evidence/_ca-output-agt-ca-p6-vh18-c05-scenario-01-correction-01.md`
- C06: `dev/evidence/_ca-output-agt-ca-p6-vh19-c06-scenario-01-correction-01.md`
- C07: `dev/evidence/_ca-output-agt-ca-p6-vh20-c07-scenario-01-correction-01.md`
- C08: `dev/evidence/_ca-output-agt-ca-p6-vh21-c08-scenario-01-correction-01.md`

For C09, do not use the earlier `STATUS: BLOCKED` correction evidence as acceptance authority. Instead verify that:

1. `f94cadc247230164a5a5bac3aaef4111b2ea5b8f` is already an ancestor of the VH23 integration base; and
2. `dev/test-results/20260920T044300Z-vh22-repository-suite-blocker-repair-01-29f11394f9da.md` at the archived VH22 repair ref begins exactly `STATUS: COMPLETE` and reports change-set, repository, and overall verification all `PASS`.

## Integration procedure

Merge the exact accepted C03–C08 SHAs into the VH23 branch in scenario order: C03, C04, C05, C06, C07, C08.

Use true merges that preserve the accepted histories. Do not substitute branch tips, rejected/original scenario heads, reconstructed patches, or cherry-picked approximations.

C09 is already present through the current integration base. Do not merge a C09 archive ref again.

Conflict-resolution authority:

1. current `phase6-integration` wins for later Phase 6 tasking/history, branch-cleanup artifacts, PHX-CI consumer integration, and post-VH22 repository-suite repairs;
2. each accepted C03–C08 correction line is authoritative for its own scenario implementation/tests;
3. H6B/frozen shared contracts remain authoritative and must not be silently rewritten;
4. VH23 may make only the minimum shared registration/composition/test corrections required to make the seven accepted scenarios coexist and execute coherently.

If a conflict cannot be resolved without changing scenario acceptance semantics, H6B authority semantics, frozen H0 contracts, or production synchronization behavior, stop with `CONTRACT CHANGE REQUEST`.

## Authority / boundaries

Read and apply:

- the Phase 6 live-validation harness plan;
- DEC-301–DEC-310;
- the shared validation protocol;
- C03–C09 source scenario packages;
- VH15-R2 evidence;
- all accepted C03–C08 correction evidence;
- accepted VH22 historical PHX-CI evidence;
- current merged H6/runtime/registry source and tests;
- the current PHX-CI consumer configuration.

Do not modify `src/contracts/**`.

Do not change production synchronization semantics.

Do not create a parallel scenario runner, registry, production driver, plan-assertion engine, authorization path, or second CI framework.

Do not run physical Google Drive or mobile-device validation.

## Required end state

The combined VH23 branch must establish all of the following:

- C03, C04, C05, C06, C07, C08, and C09 are all present exactly once;
- all seven are discoverable through the actual H6 scenario registration/composition mechanism;
- each scenario remains independently invocable;
- suite execution order is deterministic and C03 → C09;
- no duplicate IDs/registrations/aliases exist;
- every scenario still uses the fixed H6B preview → retained exact plan → assertion → assertion-derived authorization → production execution path;
- every scenario retains its own fail-closed plan assertions and evidence semantics;
- C09 remains the already-accepted integrated implementation rather than being replaced by an older archived line;
- no accepted scenario implementation is silently lost or overwritten during integration.

## Verification

GitHub Actions are prohibited.

Create the committed repository-controlled launcher:

`dev/scripts/verify-vh23-c-series-integration.ps1`

It must be a thin launcher around the repository's **pinned centralized PHX-CI framework**, not a replacement CI implementation.

The launcher must:

1. validate that the supplied/local PHX-CI checkout HEAD exactly matches `phx-ci.json.framework.sha`;
2. verify the exact VH23 source branch, implementation HEAD, and VH23 integration base;
3. run a focused C-series verification that exercises all seven scenario tests plus the registry/integration surface;
4. run the complete repository verification through the PHX-CI consumer path;
5. require typecheck, focused tests, full repository tests, build, repository checks, artifact checks, and `git diff --check`;
6. capture complete command output and exit codes;
7. leave canonical PHX-CI evidence in `dev/_ca-output.md` and `dev/_ca-output.json`;
8. require final PHX-CI status `PASS / PASS / PASS`;
9. preserve the user's active/control checkout;
10. use no GitHub Actions.

The integration implementation must be committed before authoritative verification. Verification/evidence must be committed separately when the PHX-CI run completes.

## VH23 evidence

Write:

`dev/evidence/_ca-output-agt-ca-p6-vh23-c-series-integration-01.md`

Its first line must be exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`.

Record at minimum:

- resolved `INTEGRATION_BASE_SHA`;
- `BASE_ANCHOR_SHA`;
- every archive ref and verified input SHA;
- confirmation that C09 was inherited rather than re-merged;
- merge commits and any conflict resolutions;
- files changed by VH23-specific integration work;
- exact implementation SHA before evidence commit;
- focused C-series result;
- PHX-CI change-set status;
- PHX-CI repository status;
- PHX-CI overall status;
- build/check/artifact results;
- `git diff --check` result;
- deviations and blockers.

`STATUS: COMPLETE` is forbidden unless all seven scenarios are integrated, registration/composition is coherent, and PHX-CI reports `PASS / PASS / PASS`.

## Final stop

Push the VH23 branch and evidence, then stop.

Do not promote to `phase6-integration`.
Do not release.
Do not run physical Drive/mobile validation.
Do not claim C03–C09 physical PASS.
Do not begin VH24.
