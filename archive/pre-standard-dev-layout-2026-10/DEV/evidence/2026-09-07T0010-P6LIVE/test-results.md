# Test Results

| Test | Scenario | External Result | Internal Pipeline | Final Reconcile | Result |
| ---- | -------- | --------------- | ----------------- | --------------- | ------ |
| P6-LIVE-A01 | Installed release identity | Exact installed asset size/hash match | Not applicable | Not applicable | PASS |
| P6-LIVE-A02 | Runtime initialization | Obsidian/plugin settings UI available to user; pairing retained | Diagnostic settings persisted through production UI | Not applicable | PASS |
| P6-LIVE-A03 | Baseline Verify/Reconcile on repaired 0.1.9 | Approved safe-union execution completed four uploads and nine noops; expected portable `app.json` conflict remained. `Keep local` then failed twice and left `recovery-required`. | First resolution failed with `operation-failed/recovery-required`; bounded reviewed reconcile completed 13 noops and established trusted authority at `state:42`; second resolution failed identically. | Recovery preview was 13 noops + 1 unresolved conflict, but resolution still could not complete. Remote `app.json` remained one unchanged object. | FAIL |

Current checkpoint: hard stop at A03. The non-destructive conflict workflow cannot establish the first-sync baseline on 0.1.9. Tests B-O were not started to avoid contaminating later results.
