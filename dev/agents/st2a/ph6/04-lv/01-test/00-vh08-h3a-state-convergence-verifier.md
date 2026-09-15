# VH08 — H3A State and Convergence Verifier

Agent: `agt-ca-p6-vh08-state-convergence-verifier-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh08-state-convergence-verifier`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh08-state-convergence-verifier-01.md`

## Assignment
Implement objective postcondition verification using existing read-only local, remote, state, and diagnostic seams. Verify requested bytes/hash/path, stable remote identity, live/trash/absence, BASE/mappings/tombstones, revisions, outstanding intents/effects, cursor/completeness, conflict provenance, terminal run result, unrelated mutations, and final convergence when observable. Missing required proof is never PASS.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from exactly that SHA. No pre-dispatch substitution is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 contracts, state store/authority adapters, Drive/local read seams, diagnostics, and relevant tests. Do not modify `src/contracts/**` or mutate synchronization authority to obtain proof.

Required end state: focused tests prove PASS only from complete authoritative observations and distinguish FAIL from BLOCKED/not-observable conservatively.

## Verification / evidence
Run focused tests, `npm run check`, and `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.