# D01 — Concurrent Non-Overlapping Text Edits

Follow the shared protocol.

Establish one synced text fixture as common BASE on both devices. Before either device sees the other's change, edit different lines on Windows and iPhone. Sync one device, then preview/execute the other, then reconcile the first.

Expected: clean three-way merge, no conflict copy.

PASS: final local/remote content contains both edits exactly once; both devices converge; no version is lost and timestamps do not decide authority.

Stop before D02.
