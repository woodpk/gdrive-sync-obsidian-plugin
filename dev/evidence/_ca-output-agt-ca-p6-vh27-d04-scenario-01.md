STATUS: BLOCKED

# VH27 — D04 Delete vs Independent Modify — Run-State Isolation Repair

- Agent: `agt-ca-p6-vh27-d04-scenario-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Required branch: `phase6-vh27-d04-scenario`
- D_SERIES_COMMON_BASE_SHA: `c6daa20ad287f395a99cf88943465a9ecc3159dd`
- Preserved pre-H6B HEAD: `889e6f91eddea343cec033b341d2792db1729438`
- Supervisor-rejected implementation HEAD: `451bc91aa7bbb430551fb224907cdc65d0c8a4e1`
- Supervisor-rejected branch HEAD: `dab9090a40629f5735d6a2b47f1e3c2cf5b368fe`
- Corrected implementation HEAD: `76f06445b0079439310c286c00e2bbb2fee6765d`
- GitHub Actions used: **NO**
- Local PHX-CI executed: **NO**

## Run-state isolation design

The package no longer owns one shared mutable D04 context.

It now owns a map of independent `D04RunContext` instances keyed by the exact validation identity tuple:

`(scenarioId, runId)`

Each run context owns only that run's:

- cycle observations;
- diagnostic sequence checkpoints;
- bound production diagnostic run IDs / plan IDs;
- baseline / current fixture descriptors;
- subcase A / B modified descriptors;
- subcase A / B conflict observations;
- baseline / subcase / restored-base verification reports.

The first D04 fixture-establishment step creates the current run context. Every later task-local module step requires the exact current run context and fails closed when it is absent.

Cycle observations also carry their exact `ValidationRunIdentity`, and binding requires exact run + authority cycle + device role.

Conflict observations carry their exact `ValidationRunIdentity`.

Fixture descriptors are rejected if their embedded fixture identity belongs to another validation run, including deletion descriptors.

Verifier reports are rejected if `report.result.run` differs from the current validation run.

Evidence recording revalidates all four fixture descriptors, all four verification reports, and both conflict observations against the current exact validation run before invoking the evidence recorder.

No timestamp/advisory-time separation is used.

## Preserved conflict and terminal proof

The accepted production-surface and terminal-correlation corrections remain intact.

Conflict proof still requires the exact production-surface `delete-vs-modify` assessment, target path, surviving modified hash/size/path/remote identity, exact BASE provenance when present, and no conflict-plan execution/resolution.

Terminal correlation still:

1. checkpoints retained diagnostic sequence before preview;
2. finds exactly one post-checkpoint manual preview start;
3. binds the exact production diagnostic `runId` using the current plan's preparation diagnostics;
4. accepts only post-checkpoint terminal diagnostics with that exact bound diagnostic run ID;
5. requires `sync-run-complete` / `stage=terminal` / `result=complete`;
6. passes that exact diagnostic run ID into `terminal-product-result` state verification.

Each cycle binding is now additionally owned by the exact validation run.

## Focused regressions

New deterministic focused coverage uses the same D04 scenario package instance and proves:

### Sequential-run isolation

- full run A completes;
- the same package then executes distinct run B;
- run B reuses the same authority-cycle IDs without inheriting run A cycle checkpoints;
- run B obtains five distinct production diagnostic run IDs not used by run A;
- run B evidence contains run-B fixture identities and run-B verification reports only.

### Cross-run stale-state rejection

After run A completes, run B is deliberately started at a stateful step without its initial run-establishment step.

The package fails closed because no run-B task-local context exists; run-A context is not consumed.

### Terminal-evidence isolation

Run A completes and its successful terminal diagnostics remain retained.

For run B, the subcase-A mobile execution deliberately emits no terminal diagnostic.

Run B fails for missing run-correlated terminal evidence even though run-A terminal events for the same plan shape remain retained.

### Conflict isolation

Run A completes and therefore owns valid conflict observations.

Run B then reaches subcase A with the production conflict surface deliberately absent.

Run B fails on missing `delete-vs-modify` presentation; run-A conflict observations do not satisfy run B.

All prior missing/wrong-run/failed/partial terminal, wrong conflict provenance, silent deletion, newest-wins, BASE restoration, deleting-side absence, and no-conflict-resolution regressions remain present.

## Exact implementation range

`c6daa20ad287f395a99cf88943465a9ecc3159dd..76f06445b0079439310c286c00e2bbb2fee6765d`

contains exactly:

- `src/validation/scenarios/d04-delete-vs-independent-modify.ts`
- `test/validation-d04-delete-vs-independent-modify.test.ts`
- `dev/scripts/verify-vh27-d04.ps1`

The prior evidence commit was deliberately removed from inside the repaired implementation history before the bounded repair was reapplied.

## Verifier re-audit

The complete committed verifier was re-audited after the D04 repair.

PASS static audit:

- result parser is structurally intact;
- every inspected native command has immediate `$LASTEXITCODE` capture;
- exact three-path implementation gate remains present;
- only the dedicated VH27 evidence path is allowed after `ImplementationHead`;
- pre-H6B preservation SHA gate remains exact;
- Wave-D peer common-base evidence checks remain present;
- installed immutable PHX-CI manifest/runtime/front-door checks remain present;
- PHX-CI failure reporting still includes:
  - PHX-CI verdict;
  - Change-set verification;
  - Repository verification;
  - Overall verification;
  - Task exit code;
  - evidence commit;
  - local evidence branch;
  - publication status;
  - publication issue;
  - runtime process exit code;
- no GitHub Actions invocation;
- no active-checkout reset/clean/stash/switch/checkout;
- no source-mode PHX-CI fallback.

## Proactive audit

Static audit found:

- no shared mutable singleton D04 run context;
- no unscoped cycle observation map;
- no fixture use without current-run descriptor checks at state-consuming boundaries;
- no cross-run verification-report acceptance;
- no cross-run conflict-observation acceptance;
- no terminal binding without current validation-run ownership;
- no direct synchronization-authority writes;
- no timestamp/newest-wins authority;
- no `resolve-observed-conflict` execution;
- no H6B/shared contract override or modification;
- no production synchronization/conflict semantic change;
- no peer D-series scenario modification;
- no trailing whitespace or merge markers in the three implementation files.

## Verification status

Authoritative local PHX-CI has not been run, per supervisor instruction.

No bootstrap is provided.
No `PASS / PASS / PASS` is claimed.
No `STATUS: COMPLETE` is claimed.

The task remains `STATUS: BLOCKED` pending supervisor review of this bounded run-state-isolation repair.
