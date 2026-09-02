# H-U5 — TARGETED REPAIR OF CLASSIFIED INTEGRATION FAILURES

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-02`

Predecessor:

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

Approved H-U4 source/test authority: `84cae684607be10b57ec5569bab14a819bad822f`

Approved H-U4 closure/evidence authority: `14b38332416096b17ccc625d12bbc4fe49ca9328`

## Entry gate

H-U4 is supervisor-approved and closed.

The accepted H-U4 ledger is:

- `OBSOLETE-LEGACY-FIXTURE`: 34 FAIL + 25 CANCELLED = 59 non-pass results;
- `WORKER-DEFECT — G`: 13 FAIL;
- `H-INTEGRATION-DEFECT`: 0;
- `UNRELATED-PREEXISTING`: 0.

Do not re-run or re-derive H-U4 classification as an entry exercise.

Before editing:

1. verify the branch is `phase6-sync-integration-h`;
2. verify approved H-U4 closure commit `14b38332416096b17ccc625d12bbc4fe49ca9328` is an ancestor of the current branch head;
3. inspect any commits after `14b38332416096b17ccc625d12bbc4fe49ca9328` and confirm they are supervisor/tasking-only changes, not unauthorized production/test changes;
4. read the full H evidence through H-U4, including `dev/evidence/_ca-output-AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-02.md`;
5. identify the exact supervisor-authorized H-U5 repair class/package for this session;
6. verify the working tree is clean;
7. verify current production source and test content remains identical to the approved H-U4 source/test authority `84cae684607be10b57ec5569bab14a819bad822f`, except for any H-U5 changes made after this gate;
8. verify `src/contracts/**` remains byte-identical to the frozen v1.2 contract tree `4deb82e382f7957c731ef78db52b4164571d57a3`.

If no specific H-U4 failure class/package has been authorized for repair, stop with `BLOCKED — SUPERVISOR DECISION REQUIRED`.

## Mission

Repair **only the bounded failure class/package authorized from the approved H-U4 ledger** and verify that repair without broadening into unrelated cleanup.

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

The 13 currently accepted `WORKER-DEFECT — G` failures remain G-owned unless explicitly reassigned by the supervisor.

Otherwise record the defect as externally routed and stop or proceed only with separately authorized H-owned repair classes.

### If the ledger contains `UNRELATED-PREEXISTING`

Do not repair it under this Phase 6 H task unless explicitly authorized.

## Repair method

For the authorized class/package:

1. reproduce the exact failing behavior from the approved H-U4 evidence;
2. confirm the causal code/fixture path;
3. implement the smallest correct correction;
4. run the formerly failing focused test(s);
5. run adjacent focused tests covering the same seam;
6. confirm no frozen-contract change;
7. run `git diff --check`;
8. inspect the diff for accidental unrelated changes.

Do not start another unrelated failure class/package merely because turn capacity remains.

## Capacity guard

If H-U4 identified multiple independent repair classes/packages, this H-U5 session owns **one causal repair package only**: the exact package authorized by the supervisor.

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

Append an `H-U5` section to:

`dev/evidence/_ca-output-AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-02.md`

Record:

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
