# D06 — Stale Device Return Safety

Follow the shared protocol.

Use a disposable fixture and an actually stale/offline second device state; do not forge production state. While the device is absent, establish newer authoritative changes including one attested deletion. Return the stale device.

PASS: it must reconcile before its stale view can authorize destructive propagation or resurrect deleted content. Any unsafe destructive proposal is a FAIL/hard stop.

If the configured stale threshold cannot be safely reached or induced, report `BLOCKED — STALE CONDITION NOT SAFELY INDUCIBLE` rather than altering state.

Stop.
