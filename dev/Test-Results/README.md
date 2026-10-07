# PHX-CI Test Results

Purpose: canonical repository location for persisted PHX-CI execution output.

Allowed artifact classes: one immutable directory per canonical PHX-CI run ID containing `result.md`, `result.json`, `terminal.log`, and optional PHX-CI-produced supporting material under `artifacts/`.

Prohibited artifact classes: decorated run-directory names, flat sibling result triples, rewritten historical results, non-PHX-CI validation output, task prompts, or planning documents.

Authority status: finalized run directories are historical verification evidence. They do not redefine product or architecture authority.

Naming: each run directory must be named by the exact canonical PHX-CI `runId` with no decoration. Finalized run evidence must identify the exact verified source SHA, PHX-CI runtime/framework identity, executed stages, final status, timestamps, and evidence identity.
