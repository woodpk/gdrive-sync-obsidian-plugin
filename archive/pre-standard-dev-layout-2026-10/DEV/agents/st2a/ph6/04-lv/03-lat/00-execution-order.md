# Phase 6 Latency Optimization — Execution Order

Common starting point for the independent first-wave sessions is exact `phase6-integration` SHA `02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`.

1. **Run in parallel:** `01`, `02`, `04`, and `05`.
2. **Then run:** `03`, after `02` is complete. Its prompt resolves the approved `02` branch tip itself; do not edit the prompt with a SHA.
3. **Then run:** `06`, after `01`, `03`, `04`, and `05` are complete. It resolves all predecessor branch tips itself.
4. **Then run:** `07`, after `06` is complete. It resolves the integration branch tip itself.

Do not start a dependent session early. No prompt requires the operator to supply a predecessor SHA or paste output from another session.
