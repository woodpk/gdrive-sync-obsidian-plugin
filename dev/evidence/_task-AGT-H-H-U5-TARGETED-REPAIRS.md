# H-U5 — TARGETED REPAIR OF CLASSIFIED INTEGRATION FAILURES

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

## Entry gate

Begin only after H-U4 has produced a complete failure/cancellation classification ledger and that ledger has been reviewed by the supervisor.

Before editing:

1. verify the branch is `phase6-sync-integration-h`;
2. read the full H evidence through H-U4;
3. identify the exact supervisor-authorized repair class for this session;
4. verify the working tree is clean;
5. verify the current source/test SHA matches the post-H-U3 source authority unless H-U4 made an explicitly recorded non-semantic instrumentation change;
6. verify `src/contracts/**` remains byte-identical to the frozen v1.2 foundation.

If no specific H-U4 failure class has been authorized for repair, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Mission

Repair **only the bounded failure class authorized from H-U4** and verify that repair without broadening into unrelated cleanup.

This prompt is intentionally narrow. It is not permission to make the whole repository green by any means necessary.

## Ownership rules

### If the authorized class is `H-INTEGRATION-DEFECT`

You may modify H-owned cross-workstream composition/compatibility surfaces and H-owned tests needed to prove the fix.

Typical H-owned surfaces include:

- `src/product/runtime.ts`;
- `src/product/phase6-sync-integration.ts`;
- H integration test files;
- `src/product/product-controller.ts` only when the defect is demonstrably in integration composition rather than worker D semantics.

Preserve A–G worker semantics.

### If the authorized class is `OBSOLETE-LEGACY-FIXTURE`

Modify only the fixture/test construction necessary to supply the current frozen production dependencies while preserving the original behavioral assertion.

Requirements:

- do not weaken expected behavior;
- do not replace fail-closed production with permissive fallback behavior;
- do not delete the test merely because it is inconvenient;
- do not change product code solely to satisfy an obsolete construction pattern.

### If the H-U4 ledger contains `WORKER-DEFECT`

Do **not** repair worker-owned production semantics in H-U5 unless the supervisor has explicitly reassigned that exact defect to H.

Otherwise record the defect as externally routed and stop or proceed only with separately authorized H-owned repair classes.

### If the ledger contains `UNRELATED-PREEXISTING`

Do not repair it under this Phase 6 H task unless explicitly authorized.

## Repair method

For the authorized class:

1. reproduce the exact failing behavior from H-U4;
2. confirm the causal code/fixture path;
3. implement the smallest correct correction;
4. run the formerly failing focused test(s);
5. run adjacent focused tests covering the same seam;
6. confirm no frozen-contract change;
7. run `git diff --check`;
8. inspect the diff for accidental unrelated changes.

Do not start another unrelated failure class merely because turn capacity remains.

## Capacity guard

If H-U4 identified multiple independent repair classes, this H-U5 session owns **one causal repair package only**: the exact package authorized by the supervisor.

If additional independent repair packages remain after this one succeeds, record them and stop. A continuation/next repair unit can then be issued from the actual new repository state.

Do not preemptively solve later independent classes.

## Full verification

After the focused repair passes, run enough broader verification to show the repair did not regress adjacent integrated behavior.

A complete clean repository verification may be run if practical, but **H-FINAL owns the authoritative final closure pass**. Do not append canonical closure evidence in H-U5.

If broader verification reveals a new or previously unclassified failure, classify and record it; do not automatically expand the repair scope.

## Frozen boundaries

Do not modify:

- `src/contracts/**`;
- canonical `dev/evidence/_ca-output.md`;
- worker branches;
- `phase6-integration`, `main`, or `master`.

Do not merge.

## Evidence

Append an `H-U5` section to the H-specific evidence file recording:

- exact H-U4 ledger item(s) authorized;
- root cause;
- owner classification;
- files changed;
- exact correction;
- focused before/after test evidence;
- adjacent verification;
- remaining classified failures, if any;
- frozen-contract result;
- source/test repair SHA.

Do not modify canonical `_ca-output.md`.

## Completion criteria

H-U5 is complete when the single authorized causal repair package is corrected and verified, with all unrelated failure classes left untouched.

If this repair clears the final known integration blocker, state that the candidate is eligible to enter H-FINAL. Do not perform H-FINAL work in this session.

End exactly:

`H-U5 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-FINAL`

If additional independent repair packages remain, include them in evidence and still stop after the authorized package.

If capacity is exhausted:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U5 NOT COMPLETE`

If the root cause proves to be worker-owned or otherwise outside authorization:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
