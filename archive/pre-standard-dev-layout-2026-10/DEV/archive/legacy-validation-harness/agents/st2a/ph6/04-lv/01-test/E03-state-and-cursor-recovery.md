# E03 — Corrupt State and Lost Cursor Recovery

Follow the shared protocol and OBS-01 gate. Use a disposable validation vault/state copy, never the primary BRAIN state.

A. Corrupt/truncate authoritative local sync state after making a backup. Expected: explicit recovery/untrusted state; no deletion inference.

B. Restore clean state, invalidate/remove only the remote change cursor using the approved test method. Expected: conservative full reconciliation.

PASS: neither case treats missing state/cursor as deletion authority; content remains intact and recovery re-establishes trustworthy state.

Stop.
