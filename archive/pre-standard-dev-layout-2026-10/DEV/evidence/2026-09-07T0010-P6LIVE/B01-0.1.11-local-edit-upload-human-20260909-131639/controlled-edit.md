# B01 Controlled Local Mutation

- Saved UTC observed: `2026-09-09T13:27:55.0830876Z`
- Path: `test-file-01.md`
- Mutation: appended exactly one line, `P6-B01 local-edit validation 2026-09-09T13:20:24Z`
- Post-edit local identity: 63 bytes; SHA-256 `06de33f820883553f415a375e5c03a10e9bbdc35ece54f0e7b9bfff92cc80de6`
- Exact edited bytes preserved as `test-file-01.edited.md`.
- Watcher filesystem observations: two ordinary `changed` notifications for `test-file-01.md`; no other vault path event was observed through this checkpoint.
- Watcher resource telemetry remained live with four responsive Obsidian processes.
- One resource-sample append encountered a sharing violation while Codex read the live CSV. The watcher remained alive and continued sampling; fixture filesystem telemetry was not lost.
