# S09 BVP Physical Integration — Fixed PHX-CI Runtime Source Assessment

**Date:** 2026-10-20. **Status:** Read-only source-backed research; proposed BRAIN-only transport is not yet executable proof.
**BRAIN HEAD inspected:** `684675e079d4cc9199f83d6c60b900a0f033153d`. **Pinned PHX-CI source:** `69c4aa077d4a1a46d1e85e59f39d36285be99e83`.
**Owner constraint:** no PHX-CI edits, version change, fork, package upgrade or consumer-pin change; no physical devices.

## Exact source facts

1. BRAIN `phx-ci.json` fixes adapter `node-typescript` and runtime `69c4...`, evidence `dev/_ca-output.md` and `dev/test-results`. `Taskfile.phx-ci.yml` consumes PHX-CI Node stages, and `package.json` has `test:bvp-root`. Deterministic BVP is already integrated and previously qualified, not a missing runner.
2. Pinned `schemas/run-request-v1.schema.json` has `focusedTestCommand` and `additionalProperties:false`; it has **no** physical attempt or arbitrary result-artifact field. `scripts/Invoke-PhxCiVerification.ps1` executes an isolated detached worktree, rejects unexpected worktree writes, controls expected artifacts and publishes a fixed evidence set. No separate checkpoint hook was found.
3. Pinned `scripts/common/Invoke-RecordedStage.ps1` records `stdout`, `stderr`, `exitCode`, `result` and `runId` for `test-focused`, with 0 -> PASS and nonzero -> FAIL, and prints safe captured output. Pinned `scripts/common/Write-Evidence.ps1` includes those stage records **including stdout** in generated evidence JSON, even when status is BLOCKED. The verifier copies that JSON into historical result JSON and publishes it through its own non-force Git path.
4. A BVP subprocess may therefore potentially **carry an existing non-secret bounded checkpoint/result through stdout embedded in ordinary PHX evidence**. This is a design hypothesis that must be tested by PHX-CI: it does NOT prove byte completeness, size suitability, privacy protection, two-run replay, interruption preservation or all physical scenario compatibility.
5. BRAIN `run-live-battery.ts` emits exit `0` on completed, `3` if an explicit human checkpoint remains, and `1` otherwise. It requires `--run-id`, `--validation-source-commit`, device map, relay root, checkpoint and result paths, and forbids combining human resume with late-receipt recovery.
6. `scenario-checkpoint.ts` schema v2 validates scenario definition digest, source/run/device identity and step prefix; checkpoint max is 32KiB. `live-scenario-executor.ts` has controller lease/command sequence/physical effect safety but does not establish unconditional recovery after a mid-attempt crash. `late-completion-recovery.ts` requires a prior `device-result-unavailable` result, exact terminal correlated receipt, and observe/assert-only trailing steps.
7. `build-validation-artifact.ts` creates full source/`main.js`/manifest SHA-256 build identity; BVP command correlation carries source commit, not installed binary SHA. Installed-artifact verification therefore requires separately approved physical observation.
8. Published PHX history differs by runtime. Pinned source uses timestamp/run-stem historical records; PHX-CI master may use `dev/test-results/<runId>/result.json`. Derive the exact actual path from the pinned-run evidence commit; do not claim the newer layout is in the pinned runtime. `dev/_ca-output.json` is mutable latest evidence, not an immutable resume reference.
9. The original BVP operator is deliberately an exception-throwing sentinel. Its prior behavior and its own Git commits are **not** authorized validation authority.

## Candidate mechanism and rejection rules

A BRAIN-owned adapter, called only from the real PHX focused stage, may print only validated, explicitly bounded and non-sensitive existing BVP checkpoint/result bytes with transport framing and digests. Subsequent attempt obtains those bytes from the **exact published PHX-CI evidence commit and path** with Git, validates stage run/exit/source/ancestry, and hands them to the existing BVP runner. A missing or uncommitted first attempt, unstable/oversize/private result, changed source, wrong device, duplicate or incomplete framing, stale lease or ambiguous physical side effect must BLOCK continuation.

The fixed PHX schema and publication workflow MUST NOT be changed. If the proposed stdout mechanism fails acceptance tests, mark the BRAIN-side architecture BLOCKED and return a detailed capability mismatch for Owner review; do not introduce a separate canonical publisher or call for PHX modifications.

## Proofs required before any physical attempt

- PHX-CI-only simulated first attempt with BVP checkpoint exit 3; original PHX evidence **published** and containing byte-identical validated checkpoint/result.
- Fresh second PHX-CI run reconstructs evidence from immutable first-run commit; stable BVP ID, distinct PHX ID, relevant source-equivalence proof, no duplicate physical effect, accurate continuation.
- No regression of `npm run test:bvp-root`, full tests, build, guard, artifacts, frozen architecture limits or original evidence publication.
- Verify privacy, bounding, crash/retry, race/duplicate, old/missing/forged evidence, prior source/branch advancement, checkpoint incompatible, late receipt and forbidden physical actions.
- No physical canary, installation, OAuth/Drive mutation or S09A activation is implied by this research.

Further detail: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/s09/s09-phxci-fixed-runtime-consumer-bridge-build-plan-20261020.md`.
