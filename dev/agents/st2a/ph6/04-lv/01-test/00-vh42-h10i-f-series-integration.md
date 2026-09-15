# VH42 — H10I F-Series Harness Integration

Agent: `agt-ca-p6-vh42-f-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh42-f-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh42-f-series-integration-01.md`

## Assignment
Integrate the independently built F01–F03 harness scenarios into one H10 F-series package, register them through the H6 runner extension point, and verify filesystem/resource/lifecycle scenario isolation without executing physical mobile lifecycle or large-transfer validation.

## Executable base / input gate
At execution, run `git fetch origin --prune`. Use exact head of `origin/phase6-vh15-validation-mode-runtime-canary` as integration base only if its evidence begins `STATUS: COMPLETE`. Verify branches `phase6-vh39-f01-scenario`, `phase6-vh40-f02-scenario`, and `phase6-vh41-f03-scenario` each exist and their own evidence files begin `STATUS: COMPLETE`. Create the required branch from the H6B base and merge those exact verified heads; record every SHA. No prompt editing is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, shared protocol, F01–F03 package files, VH15 and all three scenario evidence files, and merged source/tests. Preserve platform containment, bounded-resource behavior, hash/integrity assertions, and F03 human lifecycle checkpoints. Resolve conflicts without redefining frozen H0 contracts or product semantics; stop with `CONTRACT CHANGE REQUEST` if a genuine shared deficiency is exposed.

Required end state: F01–F03 are uniquely registered and independently invocable; their disposable-scope, resource, platform, and lifecycle controls remain isolated and compatible with ordered-suite execution.

## Verification / evidence
Run all F-series harness tests plus `npm run check` and `git diff --check`. Commit only necessary integration/registry corrections, then evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, merge/conflict resolution, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without promotion/release/live validation or F01–F03 PASS claims.