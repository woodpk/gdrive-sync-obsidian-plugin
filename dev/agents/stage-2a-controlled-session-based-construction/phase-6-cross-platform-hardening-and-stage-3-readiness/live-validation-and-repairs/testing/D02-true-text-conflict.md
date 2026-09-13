# D02 — Concurrent Overlapping Text Conflict

Follow the shared protocol.

From a common synced text BASE, make incompatible edits to the same text region on Windows and iPhone before either observes the other. Sync one side, then the other.

Expected: unresolved text conflict; no newest-wins overwrite. Preserve both complete versions and surface actionable conflict UI. Resolve using one explicit supported choice, then reconcile both devices.

PASS: both originals remain recoverable until resolution and the chosen resolution converges safely.

Stop before D03.
