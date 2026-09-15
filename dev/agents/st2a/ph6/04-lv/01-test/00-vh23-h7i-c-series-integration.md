# VH23 — H7I C-Series Harness Integration

Agent: `agt-ca-p6-vh23-c-series-integration-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh23-c-series-integration`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh23-c-series-integration-01.md`

## Assignment
Integrate the independently built C03–C09 harness scenario branches into one H7 C-series package, wire them into the scenario registry through the extension mechanism established by H6, and verify the complete C-series implementation without running physical Drive/mobile validation.

## Executable base / input gate
At execution, run `git fetch origin --prune`. Resolve the exact head of `origin/phase6-vh15-validation-mode-runtime-canary` as the integration base and hard-stop unless its evidence begins `STATUS: COMPLETE`. Verify these exact branches exist and each branch's own evidence file begins `STATUS: COMPLETE`: `phase6-vh16-c03-scenario`, `phase6-vh17-c04-scenario`, `phase6-vh18-c05-scenario`, `phase6-vh19-c06-scenario`, `phase6-vh20-c07-scenario`, `phase6-vh21-c08-scenario`, `phase6-vh22-c09-scenario`. Create the required branch from the H6B base and merge those exact verified heads. Record every input SHA. No prompt editing is required.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, shared protocol, C03–C09 source package files, VH15 evidence, all seven scenario evidence files, and merged source/tests. Resolve integration conflicts without changing frozen H0 contracts, production synchronization semantics, or the scenario acceptance contracts. Shared helper redesign is out of scope; if independent scenario work exposed a genuine shared-contract deficiency, stop with `CONTRACT CHANGE REQUEST` rather than silently redefining it.

Required end state: all seven C scenarios are uniquely registered, independently invocable, ordered correctly for suite execution, and retain their individual fail-closed plan assertions and evidence semantics.

## Verification / evidence
Run all C-series harness tests plus `npm run check` and `git diff --check`. Commit integration/registry corrections only as necessary, then write evidence beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording base/input SHAs, merge/conflict resolution, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without promotion/release/live validation or C03–C09 PASS claims.