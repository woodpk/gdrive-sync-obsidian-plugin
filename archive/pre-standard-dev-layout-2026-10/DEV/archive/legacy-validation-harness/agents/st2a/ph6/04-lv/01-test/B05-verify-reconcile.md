# B05 — Verify/Reconcile Corrects a Missed Local Trigger

Follow the shared protocol.

Temporarily disable automatic local-change sync. Create `test-file-05-reconcile.md`; do not run ordinary Sync now. Invoke **Verify/Reconcile Vault**.

Expected preview/result: full integrity observation detects the fixture and proposes/executes exactly one safe remote create. Restore the prior auto-sync setting afterward.

PASS: local/remote bytes match, one live remote object exists, authority converges, no unrelated mutation occurs, and a second Verify/Reconcile is no-op.

Stop.
