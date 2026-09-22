STATUS: BLOCKED

# VH26 — D03 Concurrent Binary/Opaque Conflict Evidence

Agent: `agt-ca-p6-vh26-d03-scenario-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh26-d03-scenario`

## Frozen authority

- `D_SERIES_COMMON_BASE_SHA = c6daa20ad287f395a99cf88943465a9ecc3159dd`
- Superseded pre-H6B base: `4b57ce65eb771a2a6ed2cc3375178db41d899084`
- No pre-H6B preservation branch was required because the old D03 branch had no substantive task commits beyond the superseded base.
- `origin/phase6-integration` remained exactly `c6daa20ad287f395a99cf88943465a9ecc3159dd` through this correction.
- No rebase, merge, peer D-series integration, promotion, release, VH30, Stage 3, or live validation was performed.

## Correction lineage

Supervisor-rejected implementation HEAD entering this correction:

`9657e10ecd26986d352c43018d9b88a9f80465b2`

Supervisor-rejected branch HEAD entering this correction:

`96a5bd908f74e8c87d9bd9e5d3e9ee4f0001db48`

Corrected implementation HEAD before this evidence-only commit:

`3a6fed1ba22d51d420bf07267973a899d38eff0e`

## Exact branch delta

Relative to the frozen D-series common base, D03 changes remain limited to:

- `src/validation/scenarios/d03-concurrent-binary-conflict.ts`
- `test/validation-d03-concurrent-binary-conflict.test.ts`
- `dev/scripts/verify-vh26-d03-scenario.ps1`
- `dev/evidence/_ca-output-agt-ca-p6-vh26-d03-scenario-01.md`

No `src/contracts/**`, frozen H0 contract, H6B `production-path-driver`, H6B `plan-assertion-engine`, `validation-mode-runtime`, production synchronization/conflict policy, peer D-series scenario, or `phase6-integration` file was modified.

## Protocol correction — conflict plan is never executed

The shared live-validation protocol requires a stop when preview presents a conflict.

D03 now performs the mobile conflict phase as:

1. production `preview-manual`;
2. assert exact expected `unresolved-conflict` at the target plus expected unrelated-safe `download-update`;
3. verify the current production `opaque-binary` conflict surface and exact BASE/local/remote provenance;
4. verify complete Windows and mobile target variants remain intact;
5. verify mobile trusted target BASE remains the original common BASE;
6. verify prior safe progress from the preceding Windows publication:
   - Windows safe bytes are the updated safe variant;
   - remote safe bytes are the updated safe variant;
   - mobile safe bytes and mobile safe BASE remain the established BASE because the conflict plan is not executed;
7. record evidence;
8. stop.

There is no `d03-mobile-conflict-execute` step and the mobile conflict plan is never submitted to `execute-asserted-plan` or resolved.

The conflict preview still requires the unrelated safe operation to be present, proving conflict handling does not globally suppress safe-path planning.

## Exact terminal correlation for executed production cycles

D03 executes only:

- Windows BASE establishment;
- mobile BASE establishment;
- Windows publication of the divergent Windows target plus unrelated-safe update.

For each cycle:

1. production `preview-manual` runs first;
2. D03 immediately captures `DiagnosticLogger.currentSyncRunId()` from the executing device;
3. the exact production plan is asserted;
4. the plan is executed;
5. D03 invokes the frozen `StateConvergenceVerifier` with `terminal-product-result` bound to that exact diagnostic run ID and device;
6. required terminal diagnostic:
   - component `sync.controller`;
   - event `sync-run-complete`;
   - `stage=terminal`;
   - `result=complete`.

Windows BASE and Windows publication must not reuse the same Windows diagnostic run ID.

No terminal completion is required or accepted for the unexecuted mobile conflict preview.

No timestamp, sequence, “latest event,” harness run ID, or plan ID is used as diagnostic-run authority.

## Exact-run mutable context isolation

The old package-global mutable singleton has been removed.

D03 now stores mutable scenario state in an exact-run map keyed by:

`scenarioId + NUL + runId`

Each context also retains its owning `ValidationRunIdentity`.

A fresh context is created only by that exact run's fixture-establishment step. All later D03-owned delegates require the matching run context. Every descriptor consumed from mutable context is revalidated against the exact requesting `ValidationRunIdentity`.

Run-scoped context includes:

- BASE/Windows/mobile/safe descriptors;
- captured executed-cycle diagnostic run IDs;
- executed-cycle terminal verification reports;
- trusted-BASE verification report;
- conflict assessment;
- final conflict-state verification report.

Evidence recording requires all of those prerequisites to belong to the exact requesting run and to be PASS where applicable. Successful evidence recording deletes the completed run context.

Therefore a prior run's descriptors, conflict, diagnostic IDs, or verification reports cannot satisfy a later D03 run.

## Preserved D03 safety/acceptance proofs

The corrected scenario preserves:

- deterministic complete opaque binary variants;
- three distinct BASE/Windows/mobile target hashes;
- exact production `opaque-binary` conflict presentation;
- complete local/mobile, remote/Windows, and trusted-BASE provenance;
- stable remote-object lineage between remote and BASE provenance;
- local device identity;
- newest-wins/silent-overwrite rejection;
- unrelated safe operation presence in conflict preview;
- safe update publication before conflict preview;
- live target mapping/no tombstone;
- no outstanding durable mobile effect;
- path-level remote verification without supplying a remote object ID, preserving frozen duplicate-occupancy ambiguity rejection;
- frozen H6B/shared-contract ownership boundaries.

## Deterministic focused regressions

The focused suite now covers:

- conflict plan ID is never executed;
- no scenario definition step exists for mobile conflict execution;
- only three safe production plans execute;
- exact diagnostic run capture occurs between preview and execution for each executed cycle;
- each executed cycle has its own exact run-correlated terminal-complete expectation;
- the conflict-preview diagnostic run is never used as terminal proof;
- wrong-run matching `sync-run-complete` evidence cannot satisfy any executed cycle;
- missing terminal evidence cannot establish PASS;
- `sync-run-failed` evidence cannot establish PASS;
- partial terminal completion cannot establish PASS where complete execution is required;
- conflict-preview run identity cannot substitute for the earlier mobile BASE execution;
- newest-wins/silent overwrite remains rejected;
- incomplete/substituted opaque conflict provenance remains rejected;
- unrelated safe-path suppression remains rejected;
- non-distinct mobile binary bytes remain rejected;
- the same D03 scenario package instance can complete run A, then run B begins with no run-B context;
- run-A evidence prerequisites cannot permit run-B evidence recording;
- run-A descriptors deliberately supplied to run B fail exact `ValidationRunIdentity` checks before run-B verifier/evidence work;
- stale run-A conflict surface, diagnostic IDs, and verification reports therefore cannot be inherited through D03 mutable context.

## PHX-CI verifier repair

The malformed result-reporting tail was replaced wholesale from `Get-LastRuntimeField` through EOF.

The verifier now contains exactly one assignment/extraction for each:

- PHX-CI verdict;
- Change-set verdict;
- Repository verdict;
- Overall verdict;
- Task exit code;
- Evidence commit;
- Evidence published;
- local evidence branch;
- Publication issue.

It then performs exactly:

- one failure-summary construction;
- one authoritative PASS/PASS/PASS decision;
- one post-verification frozen-integration gate;
- one post-verification peer-base gate;
- one final PASS footer.

No PASS footer appears before result parsing and validation.

Non-PASS output includes all parsed verdicts/publication fields plus the runtime process exit code.

## Complete verifier static re-audit

Entire committed verifier re-audited after the tail replacement:

- ordinary unbraced `$variable:` hazards: none;
- unresolved merge markers: none;
- trailing whitespace: none;
- every direct native `git` invocation captures `$LASTEXITCODE` immediately;
- installed PHX-CI runtime invocation captures `$LASTEXITCODE` immediately;
- required branch fixed to `phase6-vh26-d03-scenario`;
- required base fixed/defaulted to `c6daa20ad287f395a99cf88943465a9ecc3159dd`;
- branch merge-base and non-evidence implementation-head lineage checks retained;
- evidence-only paths are excluded from implementation allowlist evaluation;
- configured immutable PHX-CI runtime SHA is read from `phx-ci.json`;
- installed runtime manifest must attest the configured SHA;
- deployed installed-runtime `scripts/Invoke-PhxCi.ps1` is the only PHX-CI execution front door;
- no mutable PHX-CI source checkout dependency;
- no `FrameworkRoot` or `PHX_FRAMEWORK_ROOT`;
- no direct `task ci`;
- no `git reset`, `clean`, `switch`, `checkout`, `stash`, or worktree mutation;
- exact frozen `origin/phase6-integration` gate required before and after PHX-CI;
- actionable non-PASS reporting retained.

PowerShell execution/parser invocation was not performed because this environment has no PowerShell executable. No local PHX-CI run was performed.

## Verification status

Authoritative local PHX-CI verification remains intentionally **NOT EXECUTED** after this supervisor rejection.

- Change-set verification: **BLOCKED / NOT EXECUTED**
- Repository verification: **BLOCKED / NOT EXECUTED**
- Overall verification: **BLOCKED**
- Required `PASS / PASS / PASS`: **NOT ESTABLISHED**
- GitHub Actions used: **NO**
- user bootstrap supplied: **NO**
- live/physical D03 validation performed: **NO**

Evidence remains `STATUS: BLOCKED` pending supervisor approval for local PHX-CI execution.

## Remaining conflict-provenance acceptance repair

Supervisor-rejected implementation HEAD entering this repair:

`3a6fed1ba22d51d420bf07267973a899d38eff0e`

Supervisor-rejected branch HEAD entering this repair:

`4eac6cffc3f12df13c072be3a02a5a1392417665`

Corrected implementation HEAD before this evidence-only commit:

`e20c7508e55ccc8f7adb301f4e462e577144b147`

### Exact mobile-device provenance enforcement

D03 no longer accepts mere presence of a local conflict-provenance device ID.

The sole expected `opaque-binary` conflict must satisfy exact participant identity:

`conflict.preserved.local.deviceId === options.mobileDevice.deviceId`

at runtime value equality.

Otherwise-correct mobile/local bytes, path, hash, size, and provenance are rejected when the production conflict identifies the Windows participant or any other device as the local source.

### Exact single-conflict production surface enforcement

D03 now fails closed unless all of the following are true:

1. production surface status reports `conflictCount === 1`;
2. the production surface conflict collection contains exactly one non-`none` conflict;
3. that sole non-`none` conflict is `opaque-binary`;
4. that sole conflict path is the D03 target path;
5. all existing exact local/mobile, remote/Windows, BASE, stable remote-object lineage, distinct-hash, and provenance checks then pass.

Therefore D03 rejects:

- the expected target opaque conflict plus an unrelated second conflict;
- the expected target opaque conflict plus a second target conflict of another kind;
- any mismatch between the surface-reported conflict count and the actual non-`none` conflict collection.

All such failures occur before scenario evidence recording.

### Focused deterministic regressions added

The focused test suite now additionally proves:

- otherwise-correct local/mobile conflict provenance with the Windows device ID fails and records no evidence;
- expected target `opaque-binary` conflict plus unrelated second `unresolved-text` conflict fails and records no evidence;
- expected target `opaque-binary` conflict plus a second target-path conflict of another kind fails and records no evidence;
- a sole expected conflict with inconsistent surface `conflictCount` fails and records no evidence.

All previously accepted D03 protocol, terminal-correlation, exact-run context isolation, binary-provenance, safe-path, mapping/tombstone, durable-effect, and duplicate-ambiguity protections remain unchanged.

### Verifier re-audit after focused repair

The complete committed `dev/scripts/verify-vh26-d03-scenario.ps1` was re-audited and no actual verifier defect was found, so the verifier was not modified.

Confirmed:

- exactly one PHX-CI verdict assignment;
- exactly one Change-set verdict assignment;
- exactly one Repository verdict assignment;
- exactly one Overall verdict assignment;
- exactly one Task exit-code assignment;
- exactly one Evidence commit assignment;
- exactly one Evidence published assignment;
- exactly one local evidence-branch extraction;
- exactly one Publication issue assignment;
- exactly one failure-summary construction;
- exactly one authoritative PASS decision;
- exactly one final `VH26 D03 VERIFICATION: PASS` footer;
- exactly one pre-verification frozen-integration gate;
- exactly one post-verification frozen-integration gate;
- peer common-base gate invoked before and after PHX-CI;
- every direct native `git` and PHX-CI runtime invocation captures `$LASTEXITCODE` immediately on the next statement;
- installed immutable PHX-CI runtime only;
- no source-mode `FrameworkRoot` or `PHX_FRAMEWORK_ROOT`;
- no direct `task ci`;
- no active-checkout reset/clean/switch/checkout/stash/worktree mutation;
- implementation allowlist remains limited to:
  - `src/validation/scenarios/d03-concurrent-binary-conflict.ts`;
  - `test/validation-d03-concurrent-binary-conflict.test.ts`;
  - `dev/scripts/verify-vh26-d03-scenario.ps1`;
- no GitHub Actions execution path.

No local PHX-CI run and no bootstrap were performed or supplied for this repair.
