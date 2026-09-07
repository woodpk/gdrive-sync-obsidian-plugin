# Test Results

| Test | Scenario | External Result | Internal Pipeline | Final Reconcile | Result |
| ---- | -------- | --------------- | ----------------- | --------------- | ------ |
| P6-LIVE-A01 | Installed release identity | Exact installed asset size/hash match | Not applicable | Not applicable | PASS |
| P6-LIVE-A02 | Runtime initialization | Obsidian/plugin settings UI available to user; pairing retained | Diagnostic settings persisted through production UI | Not applicable | PASS |
| P6-LIVE-A03 | Baseline Verify/Reconcile on repaired 0.1.9 | Preview produced: 14 operations (`noop` 9, `upload-create` 4, `unresolved-conflict` 1); execution withheld | Planner reached `requires-user-approval`; conflict preserved for explicit resolution | Not run; supervisor authorization required before execution | PASS |

Current checkpoint: repaired 0.1.9 A03 preview gate reached successfully. Execution is withheld pending supervisor review of four uploads and one unresolved portable-config conflict.
