# Test Results

| Test | Scenario | External Result | Internal Pipeline | Final Reconcile | Result |
| ---- | -------- | --------------- | ----------------- | --------------- | ------ |
| P6-LIVE-A01 | Installed release identity | Exact installed asset size/hash match | Not applicable | Not applicable | PASS |
| P6-LIVE-A02 | Runtime initialization | Obsidian/plugin settings UI available to user; pairing retained | Diagnostic settings persisted through production UI | Not applicable | PASS |
| P6-LIVE-A03 | Baseline Verify/Reconcile | No standard plan/preview appeared; UI showed `recovery-required` | Latest durable audit event was `sync-cancelled`; `firstSyncCompleted=false` | Not run; unsafe to continue | BLOCKED |

Current checkpoint: waiting for sanitized diagnostic exports for the unexpected `recovery-required` baseline state. No fixture mutation or live sync execution has occurred.
