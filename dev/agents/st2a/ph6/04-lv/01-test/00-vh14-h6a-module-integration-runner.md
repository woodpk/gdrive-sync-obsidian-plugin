# VH14 — H6A Module Integration and Scenario Runner

Agent: `agt-ca-p6-vh14-module-integration-runner-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh14-module-integration-runner`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh14-module-integration-runner-01.md`

## Assignment
Integrate VH04–VH13 and implement the scenario runner/state machine. The runner must enumerate C03–F03, start one scenario or ordered suite, enforce prerequisites/stop conditions, delegate all work to the frozen modules, persist current step, and support PASS, FAIL, BLOCKED, PAUSED-HUMAN-ACTION, and RESUMABLE states.

## Executable base / input gate
At execution, fetch origin. Use exact head of `origin/phase6-vh03-coordination-evidence-freeze` as integration base only if its evidence begins `STATUS: COMPLETE`. Verify branches `phase6-vh04-safety-sandbox`, `phase6-vh05-fixture-manager`, `phase6-vh06-production-path-driver`, `phase6-vh07-plan-assertion-engine`, `phase6-vh08-state-convergence-verifier`, `phase6-vh09-evidence-recorder`, `phase6-vh10-transport-coverage-faults`, `phase6-vh11-state-ambiguity-cancel-faults`, `phase6-vh12-cross-device-coordinator`, and `phase6-vh13-human-checkpoint-resume` each exist and their own evidence file begins `STATUS: COMPLETE`. Create the required branch from the H0 base and merge those exact verified heads. Record every SHA. No prompt editing is required.

## Authority / boundaries
Read the complete harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared protocol, all VH04–VH13 evidence, and merged code. Resolve conflicts centrally without changing frozen H0 semantics or `src/contracts/**`.

Required end state: one integrated runner uses modules only through approved contracts, and one small fake/local canary proves lifecycle orchestration end-to-end.

## Verification / evidence
Run focused integration tests, `npm run check`, `git diff --check`. Commit integrated implementation/tests, then evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, implementation SHA, merges/conflicts, commands/results, deviations, blockers.

Stop without promotion/release/live validation or VH15.