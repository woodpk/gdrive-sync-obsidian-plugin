# B02 — Windows Local Create → Remote Create

Follow `00-live-validation-protocol.md`.

Create `test-file-02-b02.md` with deterministic unique text after proving the path is absent locally, remotely, and from current authority.

Preview must contain exactly one safe `upload-create` for this fixture and no other mutation. Execute once.

PASS: one live managed Drive object exists at the path; bytes/hash match local; BASE and remote mapping reference that object; no duplicate or outstanding intent; terminal state is `idle-ready`.

Stop before B03.
