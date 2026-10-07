# F01 — Filesystem Scope / Paths / Opaque Files

Follow the shared protocol. Use disposable fixtures only.

Validate in bounded subcases: unknown-extension binary sync, empty-folder preservation, configured/default exclusion symmetry, and a cross-platform case/Unicode/invalid-name collision created only where the source platform permits it.

PASS: opaque bytes and empty folders round-trip; excluded content produces no one-sided deletion inference; unsafe path collisions are blocked/surfaced rather than normalized or overwritten.

Stop.
