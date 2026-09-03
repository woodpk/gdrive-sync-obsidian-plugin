# H-U4 — FULL INTEGRATED VERIFICATION & FAILURE CLASSIFICATION

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

## Entry gate

Begin only after H-U3 is complete, committed, pushed, and recorded in the H-specific evidence file.

Before running verification:

1. verify the branch is `phase6-sync-integration-h`;
2. read the checkpoint plus H-U1, H-U2, and H-U3 evidence sections;
3. verify the current source/test SHA is the recorded H-U3 completion authority;
4. verify the working tree is clean;
5. verify `src/contracts/**` remains byte-identical to `96b4541b15012ac4ce0d81243b73ef779efd343e`;
6. verify the H top-level test entrypoint exists and G's adversarial model is runtime-discoverable.

If the prior unit is incomplete, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Mission

Run the **complete assembled verification surface** and produce an exact, evidence-backed failure classification ledger.

This unit is primarily diagnostic. **Do not turn it into an open-ended repair session.** The purpose is to establish the true post-integration state before deciding what, if anything, needs repair.

## Required verification surface

Run from a clean dependency/build state as appropriate:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run check`
6. `git diff --check`
7. explicit G adversarial runtime execution if ordinary `npm test` output does not independently make G execution unmistakable;
8. focused A, B, C, D, E, F suites as needed to localize failures;
9. focused H integration suites.

If the environment makes one command redundant after a prior command has already executed exactly the same constituent work, you may note the redundancy, but do not skip required evidence needed to determine actual pass/fail state.

## Raw test evidence requirement

Do not rely on a summary such as "CI green" or an agent-level prose claim.

Capture/inspect the actual test output sufficiently to record:

- total tests;
- pass;
- fail;
- cancelled;
- skipped;
- todo;
- exact failing/cancelled test names or identifiers;
- whether G executed;
- whether H integration tests executed.

If output is piped through `tee`, ensure the actual test exit status is preserved (`pipefail` or equivalent). A green shell pipeline with a failed test process is not acceptable evidence.

## Failure classification ledger

Every remaining failure or cancellation must be classified into exactly one of the following categories, with evidence:

### H-INTEGRATION-DEFECT

A defect caused by H's cross-workstream composition or compatibility wiring.

Required evidence:

- failing test;
- actual code path;
- why A–G individually satisfy their contract but H composition violates it;
- likely H-owned repair surface.

### OBSOLETE-LEGACY-FIXTURE

A pre-Phase-6/legacy test fixture that constructs an obsolete dependency graph and now fails because hardened production correctly requires frozen writable/recoverable seams.

This classification is allowed only when the **test construction** is obsolete and the desired product semantics remain correct. Do not use this label to hide a production regression.

Required evidence:

- exact legacy assumption in the fixture;
- exact current production contract/seam it omits;
- why updating fixture construction would preserve, not weaken, intended assertions.

### WORKER-DEFECT

An actual defect in A, B, C, D, E, F, or G that is not properly owned by H compatibility wiring.

Required evidence:

- causal worker owner;
- exact worker-owned surface;
- failing behavior versus frozen/approved contract;
- why H must not locally redesign it.

### UNRELATED-PREEXISTING

A failure demonstrably unrelated to Phase 6 integration and already present in the relevant pre-integration authority.

Required evidence must establish provenance; do not infer this merely because a test is old.

## No silent waivers

Every `fail` and every `cancelled` result must appear in the ledger or be explicitly explained as downstream cancellation from a specifically classified parent failure.

No failure may be waived because "it was already failing in D's earlier isolated run." The assembled A–G candidate must be evaluated afresh.

## Repair prohibition for this unit

Do not make substantive source/test repairs while building the classification ledger.

The only permitted repository modification during H-U4 is evidence recording, except for a trivial non-semantic test-runner instrumentation correction strictly necessary to obtain raw test evidence. If such an instrumentation correction is needed, record and isolate it clearly.

Do not update obsolete fixtures yet. Do not fix H defects yet. Do not touch worker defects.

## CI, if used

CI is optional unless the current integration procedure requires it, but if used record:

- workflow run ID;
- job ID;
- artifact ID;
- artifact digest;
- exact checked-out SHA;
- raw TAP/check counts after downloading/inspecting artifacts.

A workflow UI conclusion alone is insufficient.

## Frozen boundaries

Do not modify:

- `src/contracts/**`;
- canonical `dev/evidence/_ca-output.md`;
- worker branches;
- `phase6-integration`, `main`, or `master`.

Do not merge.

## Evidence

Append an `H-U4` section to the H-specific evidence file containing:

- H-U3 source/test SHA consumed;
- exact commands;
- raw counts;
- G/H discovery proof;
- the complete failure/cancellation classification ledger;
- any CI identifiers/artifact evidence;
- frozen-contract audit;
- exact recommendation for H-U5 scope.

The recommended H-U5 scope must be **causal and bounded**. Group only defects that share the same owner/root cause and can reasonably be repaired in one model turn.

Do not modify canonical `_ca-output.md`.

## Completion criteria

H-U4 is complete when the verification surface has been run and every failure/cancellation has an evidence-backed disposition. H-U4 does **not** require the repository to be green.

End exactly:

`H-U4 COMPLETE — FAILURE LEDGER READY FOR SUPERVISOR REVIEW — DO NOT START H-U5`

If capacity is exhausted:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U4 NOT COMPLETE`

If the verification environment itself prevents trustworthy classification:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
