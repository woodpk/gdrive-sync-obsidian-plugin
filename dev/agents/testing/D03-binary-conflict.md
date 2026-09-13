# D03 — Concurrent Binary/Opaque Conflict

Follow the shared protocol.

Create and sync a small disposable binary/opaque fixture. Modify its bytes differently on Windows and iPhone from the same BASE before either sees the other; sync one side, then the other.

Expected: binary conflict; never newest-wins.

PASS: both complete byte versions survive with provenance/conflict presentation; neither is silently overwritten; unrelated paths continue safely.

Stop before D04.
