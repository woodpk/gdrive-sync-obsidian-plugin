# C05 — iOS Delete → Windows Recoverable Delete

Follow the shared protocol. Requires C04 PASS.

Delete the C04 fixture on iPhone, sync iPhone, then Windows.

Expected: attested remote trash followed by recoverable local deletion/trash on Windows.

PASS: no live remote object remains, Windows no longer exposes the file as live content, deletion authority/tombstone is coherent, no unrelated mutation occurs.

Stop before C06.
