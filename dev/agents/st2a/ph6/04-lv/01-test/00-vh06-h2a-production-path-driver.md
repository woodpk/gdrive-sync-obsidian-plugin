# VH06 — H2A Production-Path Driver

Agent: `agt-ca-p6-vh06-production-path-driver-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh06-production-path-driver`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh06-production-path-driver-01.md`

## Assignment
Implement the harness adapter that invokes the existing production planning, reviewed execution, Verify/Reconcile, status, and run-lifecycle seams. Inspect the actual product-controller/runtime APIs and use them directly or add only the smallest testability seam necessary. Do not duplicate planner/executor policy and do not write synchronization authority directly.

## Executable base gate
At execution, fetch origin; resolve `BASE_SHA` as exact head of `origin/phase6-vh03-coordination-evidence-freeze`; hard-stop unless its evidence file begins `STATUS: COMPLETE`. Create the required branch from that exact SHA. No supervisor-supplied SHA or pre-dispatch prompt edit is needed.

## Authority / boundaries
Read the harness plan, DEC-301–DEC-310, Phase 6 decomposition, shared live protocol, H0 contracts, `src/product/product-controller.ts`, `product-controller-base.ts`, `runtime.ts`, authoritative executor code, and relevant tests. Do not modify `src/contracts/**`.

Required end state: focused tests prove harness planning/execution delegates to the real production path, observes actual production results/status, and cannot manufacture success or bypass reviewed-plan authority.

## Verification / evidence
Run focused tests, `npm run check`, `git diff --check`. Commit implementation/tests first; then write the evidence file beginning exactly `STATUS: COMPLETE` or `STATUS: BLOCKED`, recording resolved base SHA, implementation SHA, changed files, commands/results, deviations, blockers; commit evidence separately.

Stop without merge/promotion/release/live validation.