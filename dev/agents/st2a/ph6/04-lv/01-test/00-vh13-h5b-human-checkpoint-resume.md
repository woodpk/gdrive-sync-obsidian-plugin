# VH13 — H5B Human Checkpoint and Resume Controller

Agent: `agt-ca-p6-vh13-human-checkpoint-resume-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh13-human-checkpoint-resume`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh13-human-checkpoint-resume-01.md`

## Assignment
Implement named durable checkpoints for the approved external actions: real offline/reconnect, actually stale-device waiting, real Obsidian termination/restart, genuine authentication restoration, and F03 disable/uninstall/reinstall/device-unlink actions. Persist only non-secret run state, verify observable postconditions before resuming, and remain safely paused on ambiguity or timeout.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No prompt edit or supplied SHA is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, H0 checkpoint/coordination contracts, plugin-data/runtime/scheduler code, and relevant tests. Do not modify `src/contracts/**` or persist credentials/private payloads.

Required end state: tests prove restart-safe resume, exact one-action checkpoint state, duplicate acknowledgement resistance, safe device-switch boundaries, postcondition verification where observable, and indefinite safe pause rather than guessed completion.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.