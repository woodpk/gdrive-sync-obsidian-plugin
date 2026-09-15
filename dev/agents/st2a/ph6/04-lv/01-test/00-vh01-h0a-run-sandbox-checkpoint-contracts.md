# VH01 — H0A Run, Sandbox, and Checkpoint Contracts

Agent: `agt-ca-p6-vh01-run-sandbox-checkpoint-contracts-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh01-run-sandbox-checkpoint-contracts`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh01-run-sandbox-checkpoint-contracts-01.md`

## Assignment
Create the first frozen harness contract slice under `src/validation/`: C03–F03 scenario IDs, validation run/device identity, scenario lifecycle/verdict states, sandbox ownership/authorization, fixture identity, and human-checkpoint/resume vocabulary. Keep it mobile-safe and representation-valid by construction where practical.

## Executable base gate
At execution, run `git fetch origin --prune`, resolve `BASE_SHA` from current `origin/phase6-integration`, and hard-stop unless that commit contains `dev/planning-and-building/phase6-live-validation-harness-plan.md` plus DEC-301–DEC-310 in `decision-register.yaml`. Create the required branch from exactly that SHA. No SHA or other value in this prompt is to be filled in before dispatch.

## Authority / boundaries
Read the complete harness plan, decision register DEC-301–DEC-310, `build-decomposition.md` Phase 6, and `00-live-validation-protocol.md`; inspect current `src/main.ts`, `src/product/runtime.ts`, `src/product/plugin-data.ts`, and relevant tests before editing. Do not modify `src/contracts/**`. If a production-contract change is genuinely required, stop with `CONTRACT CHANGE REQUEST`.

Required end state: the contract slice compiles, has focused valid/invalid-state tests, introduces no production behavior, and is usable by later harness modules without Node/Electron-only dependencies.

## Verification / evidence
Run focused tests, `npm run check`, and `git diff --check`. Fix session-introduced failures. Commit implementation/tests first. Then write the evidence file with first line exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`; record resolved base SHA, implementation SHA, changed files, commands/results, deviations, and blockers; commit evidence separately.

Stop without merging, promoting, releasing, running live Drive/mobile validation, or beginning VH02.