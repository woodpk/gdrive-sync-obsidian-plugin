# H-U5-P10 Evidence — iOS Synchronization Diagnostics Fixture + Production Diagnostic-Seam Correction

## Identity and authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-12`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration branch: `phase6-sync-integration-h`
- Supervisor-approved pre-task H-U5-P9 evidence-bearing head: `bf7ff70082c556dd69bb1047894456c40f3ce203`
- `H_U5_P10_ENTRY_HEAD`: `827d37aa98972b6ac9a3d21fda109793131fda19`
- Approved-head → entry verification: exactly one planning-only file was added: `dev/planning-and-building/phase6-h-u5-p10-ios-sync-diagnostics-fixture-task.md`; no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed.

## Corrected causal classification

The initial P10 fixture-only classification was superseded by explicit supervisor resolution after the first bounded investigation exposed a genuine H-owned diagnostic-seam regression.

Final classification:

`MIXED P10 REPAIR — STALE FIXTURE AUTHORITY + GENUINE H-OWNED PRODUCTION DIAGNOSTIC-SEAM DEFECT`

The successful-upload/privacy failures were stale test authority fixtures. The pending/uncertain-journal failures exposed a bounded production diagnostics defect: current authoritative persistence failures at the structural successors of predecessor pending/uncertain journaling were being reported only as generic `content-mutation-failed`.

No synchronization state-machine or persistence semantics were changed. Legacy `StateCommitCoordinator.markPending()` / `markUncertain()` were not restored to production execution.

## Source/test candidate

`H_U5_P10_CANDIDATE_SHA = a074788c56375e11e1c1ca6b7645ba499202143a`

Exact entry → candidate manifest:

- `src/core/execution-coordinator.ts`
- `src/product/authority-execution-diagnostics.ts`
- `test/phase6-alpha-ios-sync-diagnostics.test.ts`

No other tracked source/test file, contract, planning document, workflow, or canonical evidence file changed. `git diff --check` passed.

The first candidate (`4c7ba548c603f473ea2594e08ad225b4ef378050`) exposed one test-only TypeScript delegate-signature mismatch during proof Gate B. The final candidate above contains only the mechanical test-harness typing correction in addition to the same bounded three-file repair.

## Production diagnostic correction

Two production files changed:

1. `src/product/authority-execution-diagnostics.ts`
   - the existing internal observable-authority wrapper now tracks the active operation and immediately preceding trusted authority state;
   - transition classification is structural, based on authority state deltas only;
   - a newly introduced active-operation intent whose physical effects enter `intent-persisted` is the diagnostic successor of pending journaling;
   - an active-operation effect newly transitioning from another stage to `outcome-unknown` is the diagnostic successor of uncertain journaling;
   - if the corresponding underlying `saveAuthority()` throws, the wrapper records the exact thrown value and an internal consume-once stage classification, then rethrows unchanged.

2. `src/core/execution-coordinator.ts`
   - `AuthorityCompleteExecutionCoordinator` consults that optional internal classification when `executor.execute()` throws;
   - classified `intent-persisted` persistence failure emits `pending-journal-failed`;
   - classified `outcome-unknown` transition persistence failure emits `uncertain-state-journal-failed`;
   - unclassified throws retain existing `content-mutation-failed` behavior;
   - the same thrown value is rethrown unchanged;
   - each classified persistence throw produces one exact Error-stage classification, not an additional false generic `content-mutation` Error.

No reason string, exception message, stack text, or private implementation-error parsing is used as semantic authority. No frozen/public contract was modified.

## iOS diagnostics fixture modernization

`test/phase6-alpha-ios-sync-diagnostics.test.ts` now uses the current H lifecycle:

- `IntegratedSynchronizationStateStore` with seeded writable synchronization authority;
- `authorityStore` supplied to `IntegratedProductController`;
- current `ProductSynchronizationExecutor` for physical upload scenarios;
- a minimal deterministic `ReliableRemoteMutationPort`;
- raw predecessor Drive mutation hooks remain fail guards and are non-authoritative.

The successful fixture reaches real authoritative execution and naturally emits `content-mutation-complete`, integrity verification, canonical state commit, and terminal closure. Plan/execution semantics and diagnostic privacy assertions remain intact.

The pending fixture now throws from writable `saveAuthority()` exactly when the active physical operation's new intent is persisted with effects at `intent-persisted`. The uncertain fixture produces a genuine reliable-mutation `outcome-unknown` and throws from `saveAuthority()` exactly on the transition into that state. No manual observer calls, synthetic diagnostics, `CrashSafeExecutionCoordinator`, legacy pending/uncertain state-journal writes, or restored `markPending()` / `markUncertain()` calls are used.

## Authoritative proof

- Proof branch: `h-u5-p10-ios-sync-diagnostics-proof-h12-r2`
- Proof workflow: `.github/workflows/h-u5-p10-ios-sync-diagnostics-proof-r2.yml`
- Proof branch workflow commit: `c4b7ba1af2092b95a53989926586609c97ccb4c2`
- GitHub Actions run ID: `34010087614`
- Job ID: `101424260517`
- Workflow/job conclusion: `success`
- Exact candidate checkout: `a074788c56375e11e1c1ca6b7645ba499202143a`
- Artifact ID: `9982188581`
- Artifact name: `h-u5-p10-ios-sync-diagnostics-proof-r2`
- Artifact digest: `sha256:fa5bf9f2d2f99f5e623f92b26f67065f16541f791ceb1c2f26b774fc57dea4ca`
- Artifact size: `39095` bytes

The earlier proof run `34009992029` / job `101424008748` is superseded; it stopped at Gate B on the test-only delegate typing mismatch and is not closure provenance.

## Gate A — exact candidate / scope / frozen authority

PASS.

- exact candidate: `a074788c56375e11e1c1ca6b7645ba499202143a`
- exact entry: `827d37aa98972b6ac9a3d21fda109793131fda19`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- tracked verification worktree clean
- exact three-file implementation delta only
- `git diff --check` PASS

## Gate B — install / static verification

PASS.

- `npm ci`: exit `0`
- repository typecheck: exit `0`
- test compilation: exit `0`

## Gate C — complete owned diagnostics file

PASS.

- tests: `13`
- pass: `13`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit: `0`

Former failures now PASS:

1. `iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle`
2. `sync diagnostics preserve plan/execution semantics and never export vault path or content`
3. `pending throw is Error-level at its exact execution substage and closes the run`
4. `uncertain-journal throw is Error-level at its exact execution substage and closes the run`

Lifecycle ordering/correlation and terminal closure remain intact. Privacy assertions remain intact with sentinel path/content/credential inputs. Pending and uncertain persistence throws retain Error-level `sync.execute` classification at `pending-journal` and `uncertain-state-journal`, respectively, and the focused tests explicitly verify that neither also emits a false Error-level `content-mutation` classification.

## Gate D — V1.3 foundation

PASS.

- tests: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `0`
- C15: PASS
- C16: PASS

## Gate E — H/V1.3 critical regression

Expected residual-failure gate PASS.

- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real exit: `1`
- H-I1 through H-I8: PASS

The 13 residual failures remain exactly the pre-existing G-owned adversarial-model family:

1. `03 upload survives crash/restart at every durable effect stage`
2. `04 download survives crash/restart at every durable effect stage`
3. `05 move survives crash/restart at every durable effect stage`
4. `06 trash survives crash/restart at every durable effect stage`
5. `10 durable intended L1 is not substituted by later L2`
6. `15 repeated moves preserve stable remote identity`
7. `16 create-delete sequence preserves acknowledged deletion history`
8. `18 unresolved path A does not block safe path B progress`
9. `19 missed watcher is discovered by integrity reconciliation`
10. `20 Windows watcher-event loss is recoverable through authoritative integrity read`
11. `28 bounded quiescence after mutation pressure stops`
12. `29 concurrent same-path creates never silently select one remote winner`
13. `G-C2 generic recover routes multiple folder journals by exact journal identity`

No H-owned/production regression entered the critical surface.

## Gate F — fresh whole-repository verification

Required P10 result achieved exactly:

- tests: `687`
- pass: `674`
- fail: `13`
- cancelled: `0`
- skipped/todo: `0`
- real `npm test` exit: `1`

Exact delta from approved P9 baseline `687 / 670 / 17 / 0`:

- `+4` passes
- `-4` failures
- cancellations unchanged at `0`
- total unchanged

Every residual failure is one of the 13 G-owned failures listed above. There are zero remaining H/non-G failures and zero cancellations.

## Gate G — production build

PASS.

- build exit: `0`
- built `main.js` size: `699509` bytes
- built `main.js` SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`

The production artifact changed from P9 only because the supervisor explicitly authorized the two bounded production diagnostics files in P10. No other production source changed.

## Gate H — final invariants / PR state

PASS in the authoritative proof before evidence closure.

- exact three authorized candidate files only
- frozen contracts exact
- canonical `_ca-output.md` exact at frozen blob
- contract-freeze blob/prefix exact
- candidate verification worktree clean
- no disposable proof workflow is present on the integration branch
- PR #45: `open`
- PR #45 draft: `true`
- PR #45 merged: `false`
- PR #45 head: `phase6-sync-integration-h`

## Evidence-only closure boundary

This file is the sole file authorized to differ between `H_U5_P10_CANDIDATE_SHA` and the final evidence-bearing H head. The exact final evidence-bearing head is established by the commit containing this file and is reported in the final agent handoff; a Git commit cannot embed its own resulting SHA in its own content without changing that SHA.

No additional production semantic defect was exposed beyond the supervisor-authorized diagnostic mapping.

`H-U5-P10 IS THE FINAL H-U5-P SESSION — NO P11 IS PLANNED OR AUTHORIZED.`
