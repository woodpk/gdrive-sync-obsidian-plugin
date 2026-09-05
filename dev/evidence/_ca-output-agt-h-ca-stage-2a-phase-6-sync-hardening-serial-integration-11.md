# H-U5-P9 Evidence — Shared OLF-FAKE-AUTH Controller-Fixture Repair

## Identity and authority

- Agent: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-11`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration branch: `phase6-sync-integration-h`
- Supervisor-approved pre-task H-U5-P8 evidence-bearing head: `6cf861d6a8514d65f67f1daf8cede465eab963bb`
- `H_U5_P9_ENTRY_HEAD`: `b8d7fcef47f8ca505a4ccdb65fb8a2387c791b87`
- Approved-head → entry verification: exactly one changed file, `dev/planning-and-building/phase6-h-u5-p9-shared-olf-fake-auth-controller-fixture-task.md`; no `src/**`, `test/**`, contract, evidence, workflow, or other planning file changed.

## Pre-edit causal classification

`LEGACY TEST/HARNESS INCOMPATIBILITY ONLY — NO PRODUCTION DEFECT IDENTIFIED.`

The owned controller fixtures were still treating predecessor fake-executor/raw state-store behavior as sufficient physical-effect/journal authority. The hardened controller correctly requires writable synchronization authority and reliable physical-mutation seams. The repair therefore modernized only the owned test harnesses to use `IntegratedSynchronizationStateStore` as both the controller state store and writable authority store, with physical-effect observation behind `ReliableRemoteMutationPort`. Raw predecessor Drive mutation hooks remain non-authoritative.

The task document names three older durable-intent tests in `test/phase6-alpha-full-sync-remediation.test.ts`; the current repository and approved P8 evidence instead exposed the same three-file/five-failure P9 ownership through these current remediation tests:

- `operation-local stale precondition is isolated, safe work commits, and no immediate self-replan occurs`
- `a later stable no-op reconciliation resolves transient stale attention without a content mutation`
- `post-journal stale intent is safely retired before unrelated work continues`

No production defect was exposed by the current repository-grounded repair or proof.

## Source/test candidate

`H_U5_P9_CANDIDATE_SHA = 98927846c7e2db622eda38c005389d83be153bc6`

Candidate parent: `b8d7fcef47f8ca505a4ccdb65fb8a2387c791b87`

Exact source/test manifest:

- modified `test/phase5-second-rejection.test.ts`
- modified `test/phase6-alpha-full-sync-remediation.test.ts`
- modified `test/phase6-alpha-mixed-plan-isolation.test.ts`

No production source, contract, planning, workflow, canonical-evidence, or other test/evidence file is present in the entry → candidate delta. `git diff --check` passed.

## Fixture modernization

- `phase5-second-rejection`: current writable integrated synchronization authority plus reliable remote-create seam preserves O4 safe-subset execution; fake/raw mutation hooks cannot bypass durable authority.
- `phase6-alpha-full-sync-remediation`: current authority-format state and integrated authority store preserve stale-precondition/attention behavior; stale simulation invalidates the intended observation token without fabricating an unrelated content change; safe independent work executes only through the reliable mutation seam.
- `phase6-alpha-mixed-plan-isolation`: one shared current-authority harness now seeds writable authority for normal and first-sync cases, supplies dynamic custom-planner operations to the fixture's actual local-content source, and records creates/trashes only through reliable mutation ports. The 17 prior downstream cancellations disappear causally rather than through skips, retries, sleeps, swallowed promises, or weakened assertions.

## Authoritative proof

- Proof branch: `h-u5-p9-shared-olf-fake-auth-proof-h11-final`
- Proof workflow: `.github/workflows/h-u5-p9-shared-olf-fake-auth-proof-final.yml`
- GitHub Actions run ID: `33996747191`
- Job ID: `101388511452`
- Workflow/job conclusion: `success`
- Artifact ID: `9978357334`
- Artifact name: `h-u5-p9-shared-olf-fake-auth-final-proof`
- Artifact digest: `sha256:0daa028ff5d5b47605f4e5427b53963edf0a59d9da56c597366aba2063009f20`
- Artifact size: `28988` bytes

The proof checked out exact candidate `98927846c7e2db622eda38c005389d83be153bc6`; the proof workflow itself was not merged into `phase6-sync-integration-h`.

## Gate A — candidate scope / frozen authority

PASS.

- exact candidate HEAD: `98927846c7e2db622eda38c005389d83be153bc6`
- exact parent/entry: `b8d7fcef47f8ca505a4ccdb65fb8a2387c791b87`
- `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical `dev/evidence/_ca-output.md` blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`
- tracked verification worktree clean
- entry → candidate changed exactly the three owned test files
- `git diff --check` PASS

## Gate B — install / static verification

PASS.

- `npm ci`: exit `0`
- repository typecheck: exit `0`
- test compilation (`tsconfig.test.json`): exit `0`

## Gate C — focused P9 surface

PASS.

Entire three-file owned surface:

- tests: `33`
- pass: `33`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real focused exit: `0`

All five previously P9-owned failures now pass. All 17 prior downstream cancellations in `test/phase6-alpha-mixed-plan-isolation.test.ts` were eliminated and execute normally. No new failure, cancellation, skip, or todo was introduced.

## Gate D — V1.3 foundation

PASS.

- tests: `17`
- pass: `17`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit: `0`
- C15: PASS
- C16: PASS

## Gate E — H/V1.3 critical regression

Expected residual-failure gate PASS.

- tests: `82`
- pass: `69`
- fail: `13`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit: `1`
- H-I1 through H-I8: PASS

The 13 failures are exactly the pre-existing G-owned adversarial-model failures from approved P8:

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

No new H-owned or production regression entered the critical surface.

## Gate F — fresh whole-repository verification

Prescribed P9 result achieved exactly:

- tests: `687`
- pass: `670`
- fail: `17`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real `npm test` exit: `1`

Exact delta from approved P8 baseline `687 / 648 / 22 / 17`:

- `+22` passes
- `-5` failures
- `-17` cancellations
- total unchanged

The only residual failures are the 13 G-owned adversarial-model failures listed above plus the four already-planned H-U5-P10 iOS diagnostics failures:

1. `iPhone Sync now diagnostics correlate entry, planning, preview, Execute, execution, and terminal lifecycle`
2. `sync diagnostics preserve plan/execution semantics and never export vault path or content`
3. `pending throw is Error-level at its exact execution substage and closes the run`
4. `uncertain-journal throw is Error-level at its exact execution substage and closes the run`

No other failure or cancellation remains.

## Gate G — production build

PASS.

- build exit: `0`
- built `main.js` size: `1124518` bytes
- built `main.js` SHA-256: `d2524cc26940531369806b5345024624d665cb1de3bb622d7d2011a73ed92fa9`

P9 changes only test source; no production source was modified.

## Gate H — final invariants / PR state

PASS in the authoritative proof before evidence closure.

- no `src/**` production change in P9 candidate
- frozen contracts exact
- canonical `_ca-output.md` exact at frozen blob
- contract-freeze blob/prefix exact
- candidate verification worktree clean
- candidate contains only three authorized test-file changes
- PR #45 state: `open`
- PR #45 draft: `true`
- PR #45 merged: `false`
- PR #45 head: `phase6-sync-integration-h`
- no disposable proof workflow is part of the candidate/integration source delta

## Evidence-only closure boundary

This file is the sole file authorized to differ between `H_U5_P9_CANDIDATE_SHA` and the final evidence-bearing H head. The exact final evidence-bearing head is necessarily established by the commit that contains this file and is reported in the final agent handoff; a Git commit cannot embed its own final SHA in its content without changing that SHA.

Explicit production-source confirmation: **no production source was modified in H-U5-P9.**
