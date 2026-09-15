# VH44 — H11B Independent Automated Harness Verification

Agent: `agt-ca-p6-vh44-independent-harness-verification-01`  
Repository: `woodpk/gdrive-sync-obsidian-plugin`  
Required branch: `phase6-vh44-independent-harness-verification`  
Evidence: `dev/evidence/_ca-output-agt-ca-p6-vh44-independent-harness-verification-01.md`

## Assignment
Perform an independent clean-environment verification of the complete C03–F03 validation harness produced by VH43. This is a verification/evidence session, not a feature session. Prove the harness is buildable, its automated tests are green, validation-only authority is isolated, all 23 scenario contracts are represented exactly once, production tests remain green, and a canary-ready plugin artifact can be built and hashed. Do not run any physical Windows/mobile/Google Drive scenario and do not declare the real-device canary passed.

## Executable base gate
At execution, run `git fetch origin --prune`; resolve `BASE_SHA` as exact head of `origin/phase6-vh43-full-harness-integration`; hard-stop unless `dev/evidence/_ca-output-agt-ca-p6-vh43-full-harness-integration-01.md` exists there and begins `STATUS: COMPLETE`. Create the required verification branch from exactly that SHA. No prompt field requires pre-dispatch editing.

## Required verification
Use a clean dependency install consistent with the repository lockfile. Inspect the harness plan, DEC-301–DEC-310, shared protocol, VH43 evidence, all registered C03–F03 scenarios, package scripts, and actual source/tests. Run at minimum: typecheck; test TypeScript compilation through the repository test command; complete automated test suite; harness-focused unit/integration tests; validation-mode-off/isolation tests; sandbox out-of-scope negative tests; fault-injection leakage/physical-uncertainty tests; cross-device/checkpoint stale-run tests; evidence-schema/privacy tests; build and build verification; repository checks; `git diff --check`. Verify the produced `main.js`/manifest package shape and record cryptographic hashes and byte sizes.

## Hard acceptance rules
Verification fails if any required command fails, any C03–F03 scenario ID is missing/duplicated, ordinary product execution can reach harness fault/sandbox authority, an injected ambiguous remote effect can become fabricated certainty, non-disposable mutation can pass sandbox authorization, evidence can include credentials/private payloads, or production tests regress. Environment-specific failures must be identified precisely and must not be mislabeled as product PASS.

Do not modify source/tests to make failures green. If verification exposes a genuine defect, preserve the failure evidence, set final status `STATUS: BLOCKED`, identify the smallest correction scope, and stop for supervisor tasking. Evidence-only files are allowed.

## Evidence / stop
Write the evidence file with first line exactly `STATUS: COMPLETE` only if every automated gate passes; otherwise `STATUS: BLOCKED`. Record exact base SHA, commands/results, test counts, scenario registry audit, artifact hashes/sizes, environment, and any blocker. Commit evidence separately.

Stop without merging/promotion/release, installing on devices, running the real-device canary, or running C03–F03 physically.