# C04 — iOS Rename/Move → Windows Move

Follow the shared protocol. Requires C03 PASS.

Rename `test-ios-c02.md` on iPhone to `test-ios-c04-renamed.md`, sync iPhone, then Windows.

Expected: identity-preserving remote move and corresponding local Windows move; no delete+create guess.

PASS: remote Drive ID is preserved, both devices converge on the new path, old path is absent, content unchanged.

Stop before C05.
