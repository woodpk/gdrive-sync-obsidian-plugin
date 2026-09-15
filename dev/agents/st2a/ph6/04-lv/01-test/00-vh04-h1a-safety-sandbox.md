# VH04 — H1A Validation Safety Sandbox

Agent: `agt-ca-p6-vh04-safety-sandbox-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh04-safety-sandbox`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh04-safety-sandbox-01.md`

## Assignment
Implement the validation safety sandbox against the frozen H0 contracts. It must issue run-scoped ownership, authorize setup/cleanup only for provably harness-owned disposable surfaces, reject ambiguous or out-of-scope paths, and retain provenance proving what the harness created and may remove. Sandbox authority must never become production synchronization authority.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless `dev/evidence/_ca-output-agt-ca-p6-vh03-coordination-evidence-freeze-01.md` there begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No supervisor-supplied SHA is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, live protocol, H0 contracts, current path/local/plugin-data code, and relevant tests. Do not edit `src/contracts/**` or unrelated production policy.

Required end state: negative tests prove the sandbox refuses unrelated vault content, canonical external BRAIN assets, credentials, primary/non-disposable state, ambiguous ownership, and unsafe cleanup while allowing only properly owned disposable validation surfaces.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, with resolved base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.