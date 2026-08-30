# Phase 6 Alpha — Full Synchronization Debugging and Remediation

## 2026-08-30 — Checkpoint 0: ownership and repository grounding

- agent: `agt-CA-P6-FULL-SYNC-REMEDIATION-01`
- assignment: full debugging and remediation ownership for BRAIN Google Drive Sync convergence failures
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- isolated branch: `phase6-alpha-full-sync-remediation`
- starting released `master` SHA: `b1b3a4bd70cd14be49ae9085a8305f5825fccf4f`
- released baseline: `0.1.7`
- physical evidence supplied:
  - `brain-log-10.txt`
  - `sync-plan-errors copy.xlsx`
- governing prompt: `CODEX FULL DEBUGGING & REMEDIATION OWNERSHIP — BRAIN GOOGLE DRIVE SYNC`

### Authorities read completely before implementation

- `dev/planning-and-building/agent-led-software-product-construction-manual.md`
- `dev/planning-and-building/target-system-specification.md`
- `dev/planning-and-building/decision-register.yaml`
- `dev/planning-and-building/project-state.yaml`
- `dev/planning-and-building/phase-6-supervisor-handoff.md`

The current task is a Stage 2A Phase 6 remediation loop, not Stage 3. The target specification remains authoritative over current code, tests, and earlier debugging conclusions. Locked behavior includes serialized/coalesced runs, immutable plan intent, path-local failure isolation, independent safe-path progress, trustworthy BASE/history, conservative cursor/state advancement, crash-safe verified commit ordering, and no weakening of stale-plan, deletion, conflict, recovery, identity, or transfer-integrity protections.

### Investigation gates

1. independently analyze the raw log and workbook;
2. reconstruct the actual trigger-to-reconciliation lifecycle and feedback loops;
3. classify each suspected mechanism as confirmed, rejected, incomplete, or downstream;
4. create predictive reproductions for confirmed failure transitions;
5. add privacy-safe instrumentation where existing evidence is insufficient;
6. implement the minimum architectural correction that prevents the confirmed mechanisms;
7. run focused adversarial and complete repository verification;
8. preserve further milestone evidence here and append material milestones to `_ca-output.md`.

### Current conclusions

No root-cause conclusion has been accepted yet. The supplied hypotheses remain leads pending independent evidence and repository reconstruction.

### Current file manifest

**Created**

- `dev/evidence/_ca-output-agt-CA-P6-FULL-SYNC-REMEDIATION-01.md`

**Modified**

- `dev/evidence/_ca-output.md`

**Deleted**

- none.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION

## 2026-08-30 — Checkpoint 1: raw physical evidence and causal reconstruction

### Evidence identity

- `brain-log-10.txt`: `347711` bytes; `1051` JSONL records; SHA-256 `20985ac0a95bea663ba11209e07091d027fd7393c22cd123283655fa4790731b`
- `sync-plan-errors copy.xlsx`: `11484` bytes; SHA-256 `12b47adf883ed078757dde765d22dc7f458d986a8dfe7b517c4abf2c73bd7f65`
- workbook inspection used the bundled `@oai/artifact-tool` runtime and did not modify the source workbook

### Independently established physical behavior

- the log covers run IDs `130` through `175` from `2026-08-30T04:45:50.288Z` through `2026-08-30T04:50:09Z`;
- `45` consecutive completed automatic `local-change` runs failed;
- every completed run failed on operation index `1`, an `upload-update`, during precondition validation with `stale-precondition`;
- every failed run committed `0` safe operations and skipped `0` operations;
- all plans were classified `safe-auto-eligible`, carried `0` attention operations, and contained `2` or `3` uploads plus unrelated no-ops;
- each failure was followed immediately by another controller-created `automatic:local-change` run; run `175` was already validating operation `1` when the log ended;
- normal diagnostics expose only the aggregate stale result, not the failed precondition kind/side/count;
- the attention workbook contains four records: one resolved and three current;
- current records include `Logs.md`, `Untitled.md`, and `__brain_sync_portable_config__/hotkeys.json`;
- the portable-configuration record incorrectly carries the exact `Untitled.md: listed file was not truthfully observed as file (absent)` reason, establishing cross-path uncertainty contamination rather than an independent hotkeys observation failure.

### Confirmed failure mechanisms

1. **Root cause — incorrect invalidation scope.** `IntegratedProductController.executePlanned()` groups `stale-precondition` with `stale-state`, marks both run-global, stops before unrelated operations, and therefore violates the target distinction between operation/path-local stale intent and globally stale authoritative state.
2. **Livelock amplifier — unconditional immediate self-replan.** That same stale branch calls `CoreRunCoordinator.noteLocalOrRemoteChangeDuringRun()`. `finishRun()` then reports `reconcileAgain`, and the controller immediately calls `runAutomatic("local-change")`. A stale operation therefore generates its own next run even when no new external trigger exists. There is no backoff or convergence condition.
3. **Race amplifier — incoherent repeated validation observation.** `ProductSynchronizationExecutor.validatePreconditions()` independently calls local/remote observation for each path-observation, content-evidence, file-stable, and remote-object precondition. One upload can therefore observe the same object repeatedly during one validation pass, widening the race window and allowing internally mixed evidence. The separate post-journal mutation-boundary validation remains required; coherence is needed within each pass, not across the journal boundary.
4. **Root cause — globalized local enumeration uncertainty.** `ObsidianLocalVaultAdapter.enumerate()` marks the entire listing partial when one listed file disappears before observation. `ProductSnapshotAssembler.makeSnapshots()` then converts every otherwise absent local path into `unknown`, including unrelated portable configuration paths. `ScopedLocalVault.enumerate()` can similarly globalize exact portable-path observation failures. This exactly accounts for the workbook's portable-hotkeys/Untitled mismatch.
5. **Secondary consequence — stale attention remains current.** Because execution aborts before safe progress and never reaches per-path attention resolution, historical/current ledger state cannot converge. This is a consequence of the execution and observation defects, not the primary root cause.

### Hypothesis disposition

- repeated stale preconditions causing whole-run abort: **CONFIRMED**
- immediate automatic replanning/livelock: **CONFIRMED and controller-self-generated**
- starvation of independently safe operations: **CONFIRMED**
- path-local observation uncertainty contaminating unrelated paths: **CONFIRMED**
- repeated same-object observation widening the validation race: **CONFIRMED**
- insufficient failed-precondition telemetry: **CONFIRMED**
- attention remaining current because successful reconciliation is not reached: **CONFIRMED as a secondary consequence**
- exact physical failed precondition kind/side: **NOT ESTABLISHABLE from the supplied sanitized log; instrumentation correction required**

### Required predictive repair gates

- one stale operation must be deferred as path attention while an independent operation commits;
- a stale operation must not self-create an unbounded automatic run loop;
- dependencies of stale work must remain skipped;
- stale-state/recovery/destructive global gates must remain global;
- each validation pass must use one canonical observation per side/path while the post-journal pass remains fresh;
- a post-journal stale result must retire the known-unmutated pending journal before path-local continuation is authorized;
- exact file list/observe races must remain exact-path uncertainty;
- genuine subtree listing loss must affect that subtree only;
- normal diagnostics must expose privacy-safe failed-precondition kind/side/count without paths or secrets;
- later successful reconciliation must resolve current attention without erasing bounded history.

No product behavior decision is unresolved at this checkpoint.

## 2026-08-30 — Checkpoint 2: predictive regression baseline

Created `test/phase6-alpha-full-sync-remediation.test.ts` before changing production code. The focused test file compiles under the repository test TypeScript configuration and fails `0/4` against the released `0.1.7` implementation, proving each intended repair gate is active:

1. `operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs` fails because the stale result creates a second automatic plan (`2 !== 1`);
2. `post-journal stale intent is safely retired before unrelated work continues` fails because execution stops before the independent second operation and the pending intent is not retired;
3. `one validation pass reuses one coherent local and remote observation per path` fails because one pass observes the local path three times (`3 !== 1`), with the same repeated-observation defect also present remotely;
4. `path and subtree enumeration uncertainty do not contaminate unrelated absent paths` fails because an unrelated absent path is reported `unknown` instead of `absent`.

Command:

```text
node --test .test-build/test/phase6-alpha-full-sync-remediation.test.js
```

Result: `0 passed; 4 failed; 4 total`.

The full Windows test invocation also reproduced only these four new predictive failures plus the two already-established drive-prefix expectation mismatches. No production source was changed in this checkpoint.

Physical iPhone validation: NOT AVAILABLE IN THIS SESSION
