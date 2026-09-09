# Phase 6 — End-to-End Structured Observability Build Session

## 0. Session Identity

- Build-session ID: `p6-logging-instrumentation-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration target: `phase6-integration`
- Session planning base: `3735b29153016550d7eabb8727780d9bae40c30f`
- Temporal execution model: `MIXED-TEMPORAL`
- Session objective: implement a bounded, local-only, deeply integrated structured-observability component that can reconstruct live synchronization behavior from user trigger through Google Drive I/O, physical verification, durable-intent/state transitions, canonical commit, recovery, and final result without changing synchronization semantics or exposing secrets/file contents.

This session is instrumentation work only. It does not authorize B01 rerun, live Google Drive mutation, duplicate remediation, release publication, B02–O, iPhone validation, or Stage 3.

## 1. Governing Authority

Correctness is governed in this order:

1. Later explicit owner/supervisor decisions.
2. `BRAIN Google Drive Sync Plugin — Target-System Specification` and its synchronization safety invariants.
3. `Agent-Led Software Product Construction Manual` / `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md` from `google.drive/shared-resources/`.
5. This session orchestration contract and its frozen observability decisions.
6. The applicable agent-specific tasking prompt.
7. Repository implementation and tests as evidence of current state, not as authority to weaken higher-level behavior.

Material authority conflict is a hard stop. Agents must not choose among conflicting authorities by preference.

## 2. Frozen Product Decisions

The completed component must satisfy all of the following:

- Observability is local to the plugin/device. No telemetry backend, OpenTelemetry collector, remote logging service, analytics service, or new network destination may be added.
- The existing `DiagnosticLogger` is the single logging plane and must be evolved rather than replaced by a competing logger.
- Diagnostics must remain bounded and exportable on both supported Obsidian desktop and mobile runtimes.
- Logging must never contain OAuth access/refresh tokens, authorization headers, client secrets, PKCE material, cookies, request bodies, file contents, or other credential-bearing material.
- Raw vault paths must not be persisted in the structured trace. A deterministic diagnostic path key/fingerprint must be used where path correlation is required.
- Remote Drive object IDs, operation IDs, intent IDs, effect IDs, request correlation IDs, revisions, state generations, persistence revisions, HTTP status/classification, retry information, timing, topology counts/IDs, and verification/decision reason codes may be logged because they are required to reconstruct synchronization behavior.
- Raw Google API URLs with query strings must not be logged. HTTP events use sanitized endpoint classes plus explicit safe fields.
- Instrumentation must be observational: it must not authorize mutation, change planner/executor decisions, change retry semantics, weaken fail-closed behavior, or make synchronization success depend on successful logging persistence.
- Diagnostic persistence must remain outside the synchronized vault/Google Drive content boundary.
- One final diagnostic bundle must be sufficient to reconstruct the causal sequence of a synchronization failure without requiring source-code inference for ordinary runtime events.

## 3. Work-Package Roster

| ID | Agent | Task type | Primary responsibility | Temporal position |
|---|---|---|---|---|
| `LOG-01` | `agt-ca-p6-log01-observability-contract-foundation-01` | Implementation | Structured logging schema, correlation contract, redaction/safe-field foundation | Wave 0 |
| `LOG-02` | `agt-ca-p6-log02-google-http-transport-tracing-01` | Implementation | Google HTTP request/response/retry tracing | Wave 1 parallel |
| `LOG-03` | `agt-ca-p6-log03-drive-semantic-operation-tracing-01` | Implementation | Google Drive semantic mutation/observation/convergence tracing | Wave 2 |
| `LOG-04` | `agt-ca-p6-log04-sync-execution-lifecycle-tracing-01` | Implementation | Sync operation + durable-effect execution tracing | Wave 1 parallel |
| `LOG-05` | `agt-ca-p6-log05-authority-state-recovery-tracing-01` | Implementation | Authority/state/CAS/recovery tracing | Wave 1 parallel |
| `LOG-06` | `agt-ca-p6-log06-diagnostic-bundle-operator-surface-01` | Integration / implementation | Integrated diagnostic bundle and operator command/surface | Wave 3 |
| `LOG-07` | `agt-ca-p6-log07-end-to-end-observability-verification-01` | Verification | Adversarial end-to-end verification of the integrated observability component | Wave 4 |

## 4. Temporal Plan

| Wave | Mode | Authorized work | Required input | Completion gate |
|---|---|---|---|---|
| `W0` | Serial | `LOG-01` | Exact base `3735b29153016550d7eabb8727780d9bae40c30f` | Supervisor reviews and approves the foundation; exact approved SHA is frozen |
| `W1` | Parallel | `LOG-02`, `LOG-04`, `LOG-05` | The exact supervisor-approved `LOG-01` SHA | Each branch passes local review; all three outputs are then integrated by the supervisor into one exact integration SHA |
| `W2` | Serial | `LOG-03` | Exact supervisor-approved integrated W1 SHA | Supervisor reviews Drive semantic tracing and promotes an exact approved SHA |
| `W3` | Serial | `LOG-06` | Exact supervisor-approved `LOG-03`/integrated observability SHA | Diagnostic bundle/operator surface passes integrated review |
| `W4` | Serial | `LOG-07` | Exact supervisor-approved `LOG-06` SHA | Independent adversarial verification passes; supervisor issues final session verdict |

A later wave must not start because one predecessor agent finished. The entire predecessor gate must pass.

## 5. Exact-State / Prompt-Issuance Rule

`build-session-task-batching-rubric.md` explicitly prohibits pre-generating downstream executable prompts with guessed SHAs, placeholder predecessor states, or branch-tip authority when exact provenance is material.

Therefore:

- `LOG-01` is the only executable agent prompt authorized at session creation.
- `LOG-02`, `LOG-04`, and `LOG-05` prompts must be generated only after the exact approved `LOG-01` SHA exists, and all three must reference that same exact approved SHA.
- `LOG-03` must be generated only after W1 local reviews and supervisor integration establish one exact approved integrated SHA.
- `LOG-06` must be generated only after `LOG-03` approval establishes its exact predecessor SHA.
- `LOG-07` must be generated only after `LOG-06` approval establishes its exact predecessor SHA.
- No downstream agent may substitute `phase6-integration`, `main`, a later branch tip, or an approximate predecessor for its required exact SHA.

This is a mandatory provenance control, not optional scheduling guidance.

## 6. Frozen Shared Observability Contract

`LOG-01` owns and freezes the common diagnostic schema consumed by later agents. At minimum it must provide safe structured support for:

- correlation: `runId`, `planId`, `operationId`, `intentId`, `effectId`, `requestId`;
- safe resource identity: deterministic diagnostic path key plus remote/candidate/predecessor object IDs;
- content/remote evidence: canonical content hash when already available, size, expected/observed revision, trashed state;
- transport evidence: endpoint class, method, HTTP status, attempt/max-attempts, latency, replay-safety, retry decision/delay, Drive signal/classification, provider request ID when safely available;
- topology/verification evidence: occupancy count/set, candidate/predecessor verification facts, convergence/result/reason;
- state evidence: persistence revision, semantic generation, state revision, before/after effect stage, semantic-change flag, commit/CAS result, learned-batch/recovery reason;
- existing sanitization guarantees plus deterministic path redaction;
- bounded retention and stable structured rendering/export.

Downstream agents may consume this contract but may not independently redefine field meaning, redaction rules, component taxonomy, or serialization semantics. If the frozen contract is insufficient, the downstream agent must stop and return the incompatibility to the supervisor.

## 7. Ownership Matrix

| Surface | Owner | Parallel rule |
|---|---|---|
| `src/diagnostics/diagnostic-logger.ts` and shared diagnostic schema/helpers | `LOG-01` | Frozen after W0 approval |
| `src/drive/transport.ts` HTTP transport instrumentation | `LOG-02` | Exclusive in W1 |
| `src/product/authority-execution-diagnostics.ts` and bounded execution-lifecycle instrumentation | `LOG-04` | Exclusive in W1 |
| state/authority/recovery instrumentation in `src/state/**`, `src/product/synchronization-adapters.ts`, `src/product/durable-intent-recovery.ts` | `LOG-05` | Exclusive in W1 |
| shared production composition seams such as `src/product/runtime.ts`, `src/drive/runtime.ts`, and `src/main.ts` during W1 | Supervisor integration owner | W1 agents must not compete over these files unless a later prompt explicitly grants a bounded region |
| `src/drive/google-drive-port.ts` semantic Drive instrumentation | `LOG-03` | Begins only after W1 integrated state |
| diagnostic bundle/export/operator surface | `LOG-06` | Serial integration owner for W3 |
| final verification surfaces/tests | `LOG-07` | Verification only unless supervisor later issues a repair task |

Tests belong to the agent responsible for the behavior they prove. Shared test-helper edits must remain bounded and must not redefine another work package's semantics.

## 8. Integration Plan

The supervisor owns integration between waves.

After W1:

1. Review `LOG-02`, `LOG-04`, and `LOG-05` independently.
2. Integrate only approved outputs into `phase6-integration` using their exact approved SHAs.
3. Perform any narrowly necessary composition wiring in supervisor-owned shared runtime/composition files.
4. Do not redesign any locally approved work while integrating.
5. Run integrated typecheck/tests/build and inspect the combined diff.
6. Freeze the resulting exact integrated SHA as the sole input to `LOG-03`.

Any semantic merge conflict or contract incompatibility is a supervisor blocker; it must not be resolved by preference.

## 9. Verification Standard

Every implementation work package must, at minimum:

- inspect its bounded production/test surface before editing;
- run focused tests proving its assigned behavior, including relevant negative/redaction/failure cases;
- run `npm run typecheck`;
- run the strongest broader test/build checks practical for its scope;
- prove that test filters/discovery executed non-zero relevant tests unless zero is explicitly expected;
- reconcile the complete changed-file set against authorized ownership;
- record exact commands, counts/results, runtime/tooling limitations, final implementation SHA, and stop state in its evidence file.

Integrated/final waves must additionally run the full repository checks required by their prompts, including `npm test` and `npm run build`/`npm run check` as applicable.

## 10. Evidence Contract

Each agent uses its own evidence record:

- `LOG-01`: `dev/evidence/_ca-output-agt-ca-p6-log01-observability-contract-foundation-01.md`
- `LOG-02`: `dev/evidence/_ca-output-agt-ca-p6-log02-google-http-transport-tracing-01.md`
- `LOG-03`: `dev/evidence/_ca-output-agt-ca-p6-log03-drive-semantic-operation-tracing-01.md`
- `LOG-04`: `dev/evidence/_ca-output-agt-ca-p6-log04-sync-execution-lifecycle-tracing-01.md`
- `LOG-05`: `dev/evidence/_ca-output-agt-ca-p6-log05-authority-state-recovery-tracing-01.md`
- `LOG-06`: `dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`
- `LOG-07`: `dev/evidence/_ca-output-agt-ca-p6-log07-end-to-end-observability-verification-01.md`

Evidence is mandatory but is not self-approval.

## 11. Session-Wide Prohibitions

- No B01 execution or remediation.
- No live Drive mutation.
- No release/tag/publication.
- No B02–O or Stage 3 work.
- No telemetry/backend/service addition.
- No secrets, raw authorization material, request bodies, or file contents in logs/tests/evidence.
- No unrelated refactoring, dependency upgrades, formatting churn, or repository cleanup.
- No weakening of synchronization fail-closed behavior to make instrumentation easier.
- No agent may begin a successor work package automatically.

## 12. Session Completion

The session is complete only when:

- all seven work packages have passed their required gates in the defined order;
- W1 parallel outputs have been deterministically integrated with no lost work or shared-contract divergence;
- the final integrated plugin emits sufficient structured evidence to reconstruct transport, Drive semantic operations, execution/durable effects, state/CAS/recovery, and final outcome;
- the exported diagnostic bundle contains the required causal trace while enforcing secret/content redaction;
- `LOG-07` demonstrates the trace under adversarial timing/failure scenarios and the full repository checks pass;
- no unresolved instrumentation blocker remains;
- the supervisor issues the final session verdict.
