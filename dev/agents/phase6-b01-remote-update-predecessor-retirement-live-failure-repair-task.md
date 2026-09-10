# PHASE 6 B01 — REMOTE UPDATE PREDECESSOR RETIREMENT LIVE FAILURE REPAIR

## Assignment

Repair the confirmed B01 production defect exposed by installed prerelease `0.1.12`.

Exact Phase 6 integration base:

`c422f17630158edc44d0f1e0e44896201419ac39`

Create one repair branch from that exact SHA.

## Confirmed failure

During controlled B01 physical validation, `0.1.12` successfully executed the intended `upload-update` for `test-file-01.md`, but failed to retire the prior remote object. The result was multiple live remote objects at the same logical path. The subsequent preview correctly became `blocked-unsafe`.

No manual remediation, reset, retry, or additional sync was performed. Local `test-file-01.md` remained unchanged and byte-exact.

This means the `0.1.12` predecessor-convergence repair is still incomplete in real Google Drive execution: candidate creation succeeds, but predecessor retirement does not complete as required.

## Required repair

Inspect the exact production path used by the B01 `upload-update`, including the remote-update execution/finalization and Drive trash operation.

Determine why the real Drive predecessor is not being retired after the candidate is created, then implement the minimum production correction so that:

- the exact authorized predecessor is moved to recoverable Google Drive trash;
- the candidate becomes the sole live object at the logical path before the operation is committed as converged;
- restart/recovery can safely finish an interrupted predecessor-retirement step without recreating the candidate;
- any unexpected identity/topology still fails closed;
- ordinary duplicate detection remains strict.

Do not weaken duplicate detection or treat multiple live objects as successful convergence.

## Verification

Add or strengthen the smallest regression that reproduces the actual production wiring failure, not only an in-memory/mock success path.

Run the focused B01 remote-update/recovery regressions and the complete automated suite available in the environment. Build and typecheck must pass.

Do not perform live Drive remediation or rerun B01 in this task.

## Scope

Modify only production code and directly necessary tests for this defect. Do not redesign synchronization architecture, first-sync semantics, release/install behavior, or unrelated Phase 6 work.

Record exact changed files, verification results, and final repair HEAD in the normal evidence file, then stop for supervisor review.

End with:

`B01 PREDECESSOR RETIREMENT REPAIR COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT RESUME LIVE B01`
