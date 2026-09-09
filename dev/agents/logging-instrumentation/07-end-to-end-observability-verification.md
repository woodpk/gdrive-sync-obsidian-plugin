# Phase 6 Logging Instrumentation — LOG-07 End-to-End Adversarial Observability Verification

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log07-end-to-end-observability-verification-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-07`
- Task classification: `INDEPENDENT VERIFICATION`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> Independently verify the completed Phase 6 structured-observability component from the exact approved LOG-06 state. Using controlled synthetic/fake Drive timing and failure behavior through production wiring, prove that one exported diagnostic bundle faithfully reconstructs causal synchronization behavior across transport, Drive semantics, execution/durable effects, authority/state/recovery, and final result under normal and adversarial scenarios. Do not modify production code, repair synchronization behavior, or perform live Google Drive mutation.

The verification target is observability fidelity and integration, not correction of the still-separate B01 product defect.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`LOG07_BASE_SHA = <deferred: exact supervisor-approved LOG-06 output SHA>`

Required semantic predecessor state:

- approved integrated LOG-01 through LOG-06 implementation;
- one production-composed local diagnostic plane;
- one approved diagnostic bundle/operator export surface.

Required branch:

`phase6-logging-log07-end-to-end-observability-verification`

Binding authority: supervisor only. Execution is prohibited until the exact approved LOG-06 SHA is supplied.

Before verification:

1. Resolve `LOG07_BASE_SHA` and verify repository identity and exact HEAD.
2. Verify a clean working tree and create the required branch from exactly the bound SHA.
3. Inspect the integrated implementation and prior evidence, but do not assume prior agent claims are proof.
4. Reconstruct the expected causal event chain and diagnostic-bundle schema from code/contracts.
5. Identify the existing test harness/fake Drive seams that can emulate timing/failure states without live Drive access.

Do not substitute `phase6-integration`, `main`, a branch tip, or an approximate predecessor.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system requirements for explainability, local diagnostics, diagnostic/state export, privacy/content minimization, mobile-safe runtime behavior, operation-commit ordering, Drive/recovery safety, and secret exclusion.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. Logging-instrumentation session contract.
6. Approved LOG-01 observability contract and LOG-02 through LOG-06 integrated implementation.
7. This verification prompt.
8. Repository code/tests as evidence.

A prior green test or implementation-agent evidence is not proof for this task. Verify independently.

## 3. Temporal / Dependency Context

This is Wave `W4`, the final serial gate of the logging-instrumentation build session.

All implementation work must already be complete and supervisor-approved before this task begins.

This agent is verification-only:

- production code is read-only;
- test/evidence additions are allowed;
- if verification exposes a production instrumentation defect or integration gap, stop and report it for a separate bounded repair task rather than fixing it here.

A passing LOG-07 closes only the observability build session. It does not authorize release or B01 live validation.

## 4. Scope

In scope:

- inspect all integrated logging/bundle production code;
- add narrowly scoped verification/adversarial test files and test helpers if needed;
- exercise production composition with fake/synthetic local/Drive/HTTP/state inputs;
- validate diagnostic-bundle content, ordering, causal correlation, privacy, boundedness, and non-authority;
- run clean dependency install and full repository verification where environment permits;
- produce final verification evidence.

Out of scope:

- any production `.ts`/build/runtime source modification;
- synchronization bug repair;
- logging implementation repair;
- live Google Drive requests/mutations;
- installation, release, B01 rerun, B02–O, iPhone validation, Stage 3.

## 5. Required Behavior

### 5.1 Causal reconstruction standard

For every required scenario below, the exported bundle alone must allow an investigator to answer, where applicable:

- which sync run/plan/operation executed;
- which durable intent/effect was involved;
- which remote current/predecessor/candidate IDs were involved;
- which Google HTTP request class/method/attempts occurred;
- whether a predecessor-retirement PATCH was reached;
- what transport classification/status/retry decision occurred;
- what exact-ID Drive observations occurred before/after mutation;
- what logical-path topology was observed and from which observation source;
- what convergence branch/reason was selected;
- what durable effect stage transition occurred;
- what semantic/persistence revisions/generations existed before/after relevant state operations;
- whether outstanding-intent recovery ran or was rejected and why;
- whether canonical commit/finalization occurred;
- the final operation/run result;
- which facts are observations versus derived bundle index summaries.

The bundle need not infer information the product never observed, but it must not omit an important observed branch needed to distinguish materially different failure mechanisms.

### 5.2 Required adversarial scenarios

Use controlled fakes/test doubles through real production classes/composition. Cover at minimum:

1. **Normal remote update:** candidate creation/verification, predecessor retirement, convergence, verified durable effect, canonical commit/finalization.
2. **Candidate direct-GET / path-LIST divergence:** candidate exact-ID observation succeeds while immediate logical-path listing does not yet expose the candidate. Verify the bundle shows both observations and whether retirement was or was not reached under existing behavior.
3. **Predecessor retirement transport failure/ambiguity:** retirement is reached but response fails/is ambiguous; verify request attempt/result and post-observation physical state are separately visible.
4. **Delayed post-trash path visibility:** exact predecessor observation reports `trashed=true` while logical-path listing still reports a conflicting topology; verify both facts remain distinguishable.
5. **Independent third candidate:** expected predecessor/candidate transition is contaminated by another live ID; verify topology and conflict-preservation reason are explicit without weakening fail-closed behavior.
6. **Restart/outstanding-intent recovery:** persisted uncertain effect is processed through existing recovery; verify intent/effect generation/stage, recovery observation, record result, and receipt/terminal result are reconstructable.
7. **Semantic-generation interaction:** construct a state where remote change learning and an outstanding intent exercise the existing generation-validation path. Verify the bundle can establish the before/after authority generation and exact recovery acceptance/rejection reason. Do not change ordering or semantics to force a preferred outcome.
8. **Cancellation:** cancel at a supported boundary and verify cancellation is distinguishable from transport failure, conflict, and successful mutation.
9. **HTTP retry/rate-limit/transient failure:** verify one request ID spans attempts and retry classification/delay are visible without changing policy.
10. **Diagnostic persistence/export failure:** verify logging/bundle failure cannot authorize or change synchronization state/mutation outcome.
11. **Secret/content adversarial injection:** inject token-like strings, authorization headers, OAuth query parameters, raw paths, and distinctive fake file-content strings into test inputs where the production boundary could encounter them; prove none leak into the bundle.

Scenarios may share a well-designed harness. Do not create separate giant end-to-end fixtures when one bounded reusable test world can exercise multiple cases.

### 5.3 Bundle-only review check

For the most important scenarios—at least scenarios 1, 2, 3, 6, and 7—assert against the serialized diagnostic bundle rather than internal spy state alone. Internal spies may help set up the test but are not sufficient proof that the operator export contains the evidence.

### 5.4 Cross-layer correlation

Prove stable correlation across available layers:

`runId -> planId -> operationId -> intentId -> effectId -> semantic Drive event -> requestId -> observation -> state/recovery transition -> terminal result`

Not every event needs every ID; the chain must nevertheless be traversable without ambiguity for a single operation.

### 5.5 Privacy and boundedness

Prove:

- no raw vault path/file name included by new observability paths;
- no note/binary content;
- no authorization/token/secret/PKCE/cookie values;
- no raw query-bearing Google URL;
- no request/response body;
- bounded retained event set and bundle projection;
- no external telemetry/network destination introduced.

### 5.6 Non-authority

Compare observable outcomes with diagnostics enabled versus an equivalent no-op/disabled diagnostic sink for representative success/failure cases. Logging must not change request sequence, mutation result, retry decision, recovery result, semantic generation, or commit outcome.

## 6. Ownership and Shared Contracts

Production code is protected/read-only.

You may own:

- new focused verification/adversarial tests;
- bounded verification-only test helpers;
- your evidence file.

Do not modify approved production instrumentation to make a test pass. If a test reveals a genuine defect, classify and report it with exact evidence.

Existing test helpers may be reused; avoid modifying a broadly shared helper if a local verification helper is sufficient.

## 7. Architecture and Dependency Constraints

- No live Google APIs.
- No new dependency.
- Use production classes/composition wherever feasible; avoid verifying only isolated mocks of the logger.
- Fake Drive/HTTP must be deterministic and explicitly model divergent observation timing rather than one synchronous map for all views.
- Do not use sleeps or real wall-clock races where an injected deterministic observation sequence can prove the same behavior.
- Keep verification one-turn sized: one reusable adversarial harness plus focused scenarios rather than many unrelated test frameworks.
- Preserve desktop/mobile portability in any test assumptions about production code.

## 8. Required Implementation Work

1. Inspect the integrated production instrumentation and bundle exporter independently.
2. Build or extend one bounded deterministic verification harness capable of controlling direct-ID observations, path-list observations, transport responses, state generations, recovery state, cancellation, and diagnostic persistence.
3. Add the required scenarios from Section 5.2 using production implementation paths.
4. Assert bundle-level causal evidence and privacy, not merely internal calls.
5. Verify no external telemetry/new network destination exists in the integrated diff/dependency graph.
6. Run clean-environment repository checks.
7. Inspect the complete production diff for the logging session as available and reconcile implementation surfaces with the session ownership plan.
8. If any defect appears, stop production modification and document the minimum exact failing scenario/evidence.

## 9. Tests and Verification

Required clean verification where environment permits:

```text
npm ci
npm run typecheck
npx tsc -p tsconfig.test.json
npm test
npm run build
npm run check
git diff --check
```

Also run the focused LOG-07 adversarial tests separately and record exact non-zero scenario/test counts.

Verification requirements:

- no filtered command may silently execute zero relevant tests;
- distinguish product/instrumentation defects from environment/harness-specific failures;
- do not convert a known unchanged platform-only harness failure into a new product defect without evidence;
- do not waive a new failure merely because broader tests pass;
- inspect generated build success but do not publish/tag/install it.

If a command is unavailable in the environment, identify it as unavailable, explain why, and do not claim it passed.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log07-end-to-end-observability-verification-01.md`

Include:

- identity/work-package/task type/Wave `W4`;
- exact resolved LOG-06 base SHA;
- branch and verification evidence SHA;
- complete changed-file list, which must contain no production implementation change;
- independent architecture/code-review findings;
- adversarial harness description;
- scenario-by-scenario PASS/FAIL with exact test names/counts;
- for each key scenario, concise statement of what the serialized bundle proves;
- secret/path/content leakage checks;
- diagnostic enabled-vs-no-op semantic equivalence results;
- exact clean verification commands and results;
- environment-specific limitations/failures separately classified;
- confirmation no live Drive mutation/release/install occurred;
- final verification verdict: `PASS`, `FAIL — PRODUCT/INSTRUMENTATION DEFECT`, or `BLOCKED — ENVIRONMENT`, with precise reason;
- exact stop state.

Evidence is not supervisory approval.

## 11. Prohibitions

- No production-code repair or modification.
- No live Google Drive/network mutation.
- No B01 rerun/remediation.
- No release/tag/publish/install.
- No dependency changes.
- No weakening assertions to match missing evidence.
- No use of internal spy state as the sole proof for key bundle scenarios.
- No raw secrets/content in test evidence.
- No unrelated test cleanup/refactoring.
- No B02–O/iPhone/Stage 3.

## 12. Hard-Stop Conditions

Stop and report if:

- deferred base is unresolved/mismatched;
- production state differs materially from the approved LOG-06 input;
- a required causal fact is absent from the serialized bundle;
- a privacy leak is observed;
- instrumentation changes product behavior;
- a production repair would be necessary to continue verification;
- test harness limitations make a required scenario non-faithful;
- mandatory clean verification is blocked in a way that prevents a defensible verdict;
- unexplained repository changes appear.

Do not repair the defect in this task.

## 13. Completion and Return to Supervisor

Return the exact base, branch/evidence SHA, changed test/evidence files, full clean-check results, scenario matrix, privacy/non-authority results, and final verification verdict. Then stop.

Do not authorize release or B01. Final session approval belongs to the supervisor.