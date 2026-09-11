# Phase 6 LOG-07 End-to-End Adversarial Observability Verification — Agent Evidence

- Agent: `agt-ca-p6-log07-end-to-end-observability-verification-01`
- Work package: `LOG-07`
- Task type: `INDEPENDENT VERIFICATION`
- Wave: `W4`
- Resolved LOG-06 base SHA: `503a8f4119cda047b68d7548aff08f3f94f1e616`
- Branch: `phase6-logging-log07-end-to-end-observability-verification`
- Verification evidence SHA: reported in the completion response; a commit cannot contain its own SHA.
- Final verdict: `FAIL — PRODUCT/INSTRUMENTATION DEFECT`

## Base / Drift Gate

The exact bound base `503a8f4119cda047b68d7548aff08f3f94f1e616` was independently resolved and verified as the signed merge commit `Integrate approved LOG-06 diagnostic bundle operator surface`. The required LOG-07 branch was created from exactly that SHA and was still at that SHA immediately before this evidence-only commit. No production implementation change preceded verification.

## Changed Files

Only this evidence file was created:

- `dev/evidence/_ca-output-agt-ca-p6-log07-end-to-end-observability-verification-01.md`

No production `.ts`, runtime, build, dependency, workflow, or test file was modified.

## Independent Architecture / Code Review Finding

### Blocking defect LOG07-D1 — production outstanding-intent recovery drops the diagnostic logger

The production recovery implementation is instrumented to emit the LOG-05 authority/state/recovery trace only when its optional `DiagnosticLogger` argument is supplied:

- `src/product/durable-intent-recovery.ts:420-428` declares `recoverOutstandingDurableIntents(..., dependencies = {}, diagnostics?: DiagnosticLogger)`.
- Immediately after entry it emits `outstanding-recovery-preverification-entry` through `emitStateRecoveryDiagnostic(diagnostics, ...)`.
- The same function and its delegated preverification/base-recovery paths use that `diagnostics` value for recovery intent validation, semantic-generation evidence, physical observation/result recording, receipt reconstruction, and `outstanding-recovery-final-result`.

The production controller does not pass that diagnostic logger at either outstanding-intent recovery call site:

- `src/product/product-controller.ts:108-115` calls `recoverOutstandingDurableIntents(options.executor, authorityStore, options.stateStore, options.stateContext, assembly.managedRemote, recoveryDependencies)` and stops after `recoveryDependencies`.
- `src/product/product-controller.ts:125-132` repeats the same omission for the residual recovery pass.

This is not a test-harness limitation. `ProductController` constructs the authoritative diagnostic composition from `options.diagnostics`, but `authorityLearningAssembler(...)` has no diagnostic parameter and therefore cannot forward the production logger to those two calls.

### Consequence

A production-composed synchronization run can execute pre-planning outstanding-intent recovery while the LOG-05 `recovery.durable` events for that recovery are absent from the structured trace and therefore absent from the exported diagnostic bundle.

As a result, the bundle cannot reliably establish, for that production path:

- that outstanding-intent recovery entered;
- which durable intent/effect was selected and validated;
- the current-vs-intent semantic generation at the recovery decision boundary;
- the exact recovery acceptance/rejection reason emitted by the LOG-05 instrumentation;
- the recovery physical-observation classification and record result emitted by that path;
- the recovery receipt reconstruction result; or
- the explicit outstanding-recovery terminal result.

State-store and Drive-semantic diagnostics may expose adjacent state or I/O facts, but they are not an equivalent replacement for the missing recovery lifecycle events and cannot prove that those facts belong to the required recovery decision path without inference. This violates LOG-07's bundle-only causal reconstruction requirement and the explicit requirement to reconstruct whether outstanding-intent recovery ran or was rejected and why.

The defect requires a production composition change to continue verification. LOG-07 is verification-only and is prohibited from making that repair.

## Hard-Stop Trigger

Triggered LOG-07 Section 12 hard-stop conditions:

- `a required causal fact is absent from the serialized bundle` — production outstanding-intent recovery does not emit its LOG-05 recovery lifecycle into the shared logger because the logger is not passed;
- `a production repair would be necessary to continue verification` — production composition must supply the shared diagnostic logger to both outstanding-intent recovery calls before scenarios 6 and 7 can be faithfully verified through production wiring.

Verification therefore stopped without modifying production code or weakening the required scenarios.

## Adversarial Harness

No LOG-07 harness or test file was added after the hard-stop. Existing integrated tests and production code were inspected only to reconstruct the intended seams and to determine whether the required scenarios were executable through production composition. The blocking wiring defect was established before a faithful LOG-07 harness could be constructed for the mandatory recovery scenarios.

## Scenario Matrix

| Scenario | Status | LOG-07 test evidence | Finding |
| --- | --- | --- | --- |
| 1. Normal remote update | NOT RUN — HARD STOP | `0` LOG-07 tests | Verification stopped before scenario execution after the production recovery instrumentation gap was confirmed. |
| 2. Candidate direct-GET / path-LIST divergence | NOT RUN — HARD STOP | `0` LOG-07 tests | Existing LOG-03 code/tests were inspected as predecessor evidence only; no LOG-07 pass is claimed. |
| 3. Predecessor retirement transport failure/ambiguity | NOT RUN — HARD STOP | `0` LOG-07 tests | Existing LOG-02/LOG-03 code/tests were inspected as predecessor evidence only; no LOG-07 pass is claimed. |
| 4. Delayed post-trash path visibility | NOT RUN — HARD STOP | `0` LOG-07 tests | No LOG-07 pass claimed. |
| 5. Independent third candidate | NOT RUN — HARD STOP | `0` LOG-07 tests | No LOG-07 pass claimed. |
| 6. Restart/outstanding-intent recovery | **FAIL — PRODUCT/INSTRUMENTATION DEFECT** | static production-composition proof; dynamic scenario intentionally not continued | Production `recoverOutstandingDurableIntents` calls omit the diagnostic logger, so required recovery events cannot enter the exported bundle. |
| 7. Semantic-generation interaction | **FAIL — PRODUCT/INSTRUMENTATION DEFECT** | static production-composition proof; dynamic scenario intentionally not continued | The same missing logger prevents the bundle from recording the LOG-05 recovery validation path and exact generation-based acceptance/rejection reason in production composition. |
| 8. Cancellation | NOT RUN — HARD STOP | `0` LOG-07 tests | No LOG-07 pass claimed. |
| 9. HTTP retry/rate-limit/transient failure | NOT RUN — HARD STOP | `0` LOG-07 tests | Existing LOG-02 evidence was not promoted to LOG-07 proof. |
| 10. Diagnostic persistence/export failure | NOT RUN — HARD STOP | `0` LOG-07 tests | No LOG-07 pass claimed. |
| 11. Secret/content adversarial injection | NOT RUN — HARD STOP | `0` LOG-07 tests | Existing sanitizer/privacy tests were inspected but are not claimed as LOG-07 completion. |

Focused LOG-07 adversarial test count: `0` executed because the mandatory production-wiring hard-stop was reached before test implementation. No predecessor green test is represented as LOG-07 proof.

## Bundle-Only / Cross-Layer Verification Status

Scenarios 6 and 7 cannot satisfy the required bundle-only review check against the approved LOG-06 production composition. Because the recovery lifecycle is not delivered to the shared logger on the production outstanding-intent path, serializing the bundle cannot restore those missing events after the fact.

Therefore the required causal chain cannot be proven end-to-end for the mandatory recovery path:

`runId -> planId -> operationId -> intentId -> effectId -> Drive/recovery observation -> state/recovery transition -> terminal recovery result`

The missing recovery emission is a production instrumentation integration defect, not a missing assertion.

## Privacy / Boundedness Review Performed Before Stop

Static review confirmed the approved diagnostic logger/bundle retains the intended sanitizer and bounded projection architecture, including path-key hashing, redaction of query-bearing URLs and secret-like values, bounded diagnostic retention, bounded bundle projections, and local bundle serialization. Existing predecessor tests also cover those seams. LOG-07 does **not** claim a final privacy/boundedness PASS because the hard-stop prevented execution of the required adversarial injection scenario through the complete LOG-07 harness.

No external telemetry or new network destination was introduced by LOG-07; LOG-07 changed no production or dependency surface.

## Diagnostic Enabled-vs-No-Op Non-Authority Verification

NOT RUN — HARD STOP. No semantic-equivalence PASS is claimed. The blocking defect is missing observability, not evidence that diagnostics changed synchronization behavior.

## Clean Verification Commands

The supervising execution container could not clone/install the repository because external DNS/network access to GitHub was unavailable. Before the hard-stop, the existing repository GitHub Actions workflow was inspected and found to contain the required clean commands, but prior CI results are not proof for LOG-07.

Because a production instrumentation defect requiring a separate repair was then established, LOG-07 stopped as required rather than opening a verification PR solely to obtain unrelated green checks.

Accordingly:

- `npm ci`: NOT RUN — hard-stop after confirmed product/instrumentation defect; local repository install unavailable in this session.
- `npm run typecheck`: NOT RUN — same reason.
- `npx tsc -p tsconfig.test.json`: NOT RUN — same reason.
- focused LOG-07 adversarial tests: NOT RUN; `0` tests added/executed.
- `npm test`: NOT RUN — same reason.
- `npm run build`: NOT RUN — same reason.
- `npm run check`: NOT RUN — same reason.
- `git diff --check`: NOT RUN dynamically; the only repository write is this Markdown evidence file.

These checks are not classified as environment failures that obscure the verdict: the production instrumentation defect is independently established by the exact approved source and itself requires the mandated hard stop.

## Live / Release Safety Confirmation

- No live Google Drive request or mutation occurred.
- No B01 rerun or remediation occurred.
- No release, tag, publish, install, or iPhone validation occurred.
- No B02-O or Stage 3 work occurred.
- No dependency changed.
- No production code was repaired or modified.

## Minimum Repair Boundary for Supervisor Routing

LOG-07 does not authorize or implement the repair. The minimum confirmed correction surface is production composition around `authorityLearningAssembler(...)` / its two `recoverOutstandingDurableIntents(...)` calls so the already-approved shared `DiagnosticLogger` reaches the existing LOG-05 recovery diagnostic parameter without changing recovery ordering, generation validation, mutation behavior, or state authority semantics.

After that bounded repair is independently reviewed and integrated, LOG-07 should be rerun from the new supervisor-approved exact SHA; later verification must consume the actual repaired repository state rather than this stale base.

## Final Verdict

`FAIL — PRODUCT/INSTRUMENTATION DEFECT`

Reason: approved LOG-06 production composition drops the shared diagnostic logger when invoking outstanding durable-intent recovery, so mandatory LOG-07 recovery/generation scenarios cannot be reconstructed from one exported diagnostic bundle. Continuing would require a production repair prohibited by this task.

## Exact Stop State

Stopped after recording this evidence on `phase6-logging-log07-end-to-end-observability-verification`. No production/test repair was attempted. Return to supervisor for a separate bounded correction task; do not authorize release or B01.
