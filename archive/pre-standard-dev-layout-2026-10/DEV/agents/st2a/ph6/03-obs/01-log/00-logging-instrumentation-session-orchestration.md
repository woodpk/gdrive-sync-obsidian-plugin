# Phase 6 — End-to-End Structured Observability Build Session

## 0. Session Identity

- Agent-Name: `agt-ca-p6-log01-observability-contract-foundation-01`
- Build-session ID: `P6-LOGGING-INSTRUMENTATION-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Integration target: `phase6-integration`
- Temporal execution model: `MIXED-TEMPORAL`
- Session implementation baseline for `LOG-01`: `9385e19fc021005b45e5046a3b5e074e10965e26`
- Governing batching rubric: `build-session-task-batching-rubric.md`
- Rubric Drive file ID: `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`
- Rubric revision used to construct this package: `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`

Session objective:

> Build one bounded, local-only, deeply integrated structured-observability component for the Obsidian BRAIN Google Drive sync plugin so a single exported diagnostic bundle can reconstruct a synchronization run causally from trigger and plan through operation/durable intent, Google Drive request/response and semantic observations, convergence decisions, authoritative state/CAS transitions, recovery, canonical commit, and final result without changing synchronization semantics or exposing secrets or file contents.

This session is instrumentation work only. It does not authorize B01 rerun, live Google Drive mutation, manual duplicate remediation, release publication, B02–O, iPhone validation, or Stage 3.

## 1. Authoritative Inputs and Precedence

Correctness is governed in this order:

1. Later explicit owner/supervisor decisions.
2. `BRAIN Google Drive Sync Plugin — Target-System Specification`, especially local diagnostics, privacy/content minimization, mobile-safe runtime boundaries, explainability, state export, operation commit ordering, and fail-closed invariants.
3. `Agent-Led Software Product Construction Manual` / `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md` at the exact revision identified in Section 0.
5. This session orchestration contract.
6. The applicable agent-specific tasking prompt.
7. Repository implementation and tests as evidence of current state, not authority to weaken higher-level requirements.

Material authority conflict is a hard stop. An agent must not resolve conflicting authority by preference.

## 2. Current Problem Context and Frozen Design Decisions

The current live B01 failure is context for why observability is required, not an authorized repair target in this session:

- installed `0.1.12` executed an ordinary `test-file-01.md` `upload-update`;
- the replacement candidate became live;
- the predecessor remained live at the same logical path;
- subsequent reconciliation correctly produced `blocked-unsafe` for duplicate live occupancy;
- current exported synchronization state nevertheless reports the relevant update as completed with no pending durable authority operation;
- existing device diagnostics do not contain the Drive mutation sequence required to determine exactly where physical reality and persisted success authority diverged.

The following architecture is frozen for this build session:

- Evolve the existing `DiagnosticLogger`; do not introduce a competing logging system.
- Observability remains local to the device. No telemetry backend, collector, analytics service, external logging destination, or new network destination is authorized.
- The design must remain viable in Obsidian desktop and iOS/mobile runtimes; no Node/Electron/Windows-only dependency may be introduced into required mobile behavior.
- Logging is observational and non-authoritative. It must never alter planning, authorization, retry policy, mutation ordering, recovery decisions, convergence, or state-commit semantics.
- Diagnostic persistence failure must not authorize or change synchronization behavior.
- Logs must not contain access/refresh tokens, authorization headers, client secrets, OAuth authorization codes/state, PKCE material, cookies, request/response bodies, raw note contents, or binary contents.
- Raw vault paths must not be retained in the structured trace. Path correlation uses a deterministic opaque diagnostic path key.
- Stable Drive object IDs, operation/intent/effect/request IDs, hashes already used as content evidence, revisions, state generations, persistence revisions, HTTP classifications/status, retry facts, topology identities/counts, and verification reason codes may be retained because they are required for causal reconstruction.
- Raw Google API URLs with query strings must not be persisted. HTTP tracing uses safe endpoint classes and explicit safe fields.
- Logging remains bounded. Do not build enterprise telemetry infrastructure for this private Obsidian plugin.
- The final diagnostic bundle must be useful by itself for debugging ordinary production runs without requiring source-code inference to determine which important branch executed.
- This workstream must not repair the current B01 remote-update defect. It instruments current behavior so subsequent diagnosis and repair are evidence-driven.

## 3. Work-Package Roster

| ID | Agent | Task type | Primary responsibility | Prompt maturity at package publication |
|---|---|---|---|---|
| `LOG-01` | `agt-ca-p6-log01-observability-contract-foundation-01` | Implementation / shared-contract foundation | Structured event, correlation, privacy/redaction, and local retention foundation | Execution-ready |
| `LOG-02` | `agt-ca-p6-log02-google-http-transport-tracing-01` | Implementation | Google HTTP request/response/retry tracing | Preplanned / not-yet-executable |
| `LOG-04` | `agt-ca-p6-log04-sync-execution-durable-effect-tracing-01` | Implementation | Sync execution and durable-effect lifecycle tracing | Preplanned / not-yet-executable |
| `LOG-05` | `agt-ca-p6-log05-authority-state-recovery-tracing-01` | Implementation | Authority/state/CAS/change-feed/recovery tracing | Preplanned / not-yet-executable |
| `LOG-03` | `agt-ca-p6-log03-drive-semantic-operation-tracing-01` | Implementation / integration consumer | Semantic Google Drive operation tracing plus bounded composition wiring | Preplanned / not-yet-executable |
| `LOG-06` | `agt-ca-p6-log06-diagnostic-bundle-operator-surface-01` | Integration / implementation | Unified diagnostic bundle and operator export command | Preplanned / not-yet-executable |
| `LOG-07` | `agt-ca-p6-log07-end-to-end-observability-verification-01` | Verification | Adversarial integrated verification of the completed observability system | Preplanned / not-yet-executable |

Each work package is sized for one reliable coding-agent execution turn: inspect bounded authority/surface, implement or verify one responsibility, run required checks, write evidence, commit, and stop.

## 4. Temporal Plan and Dependency Graph

The required build order is:

`[LOG-01] -> [LOG-02, LOG-04, LOG-05] -> [LOG-03] -> [LOG-06] -> [LOG-07]`

| Wave | Mode | Work packages | Required input | Completion gate |
|---|---|---|---|---|
| `W0` | Serial | `LOG-01` | Exact baseline `9385e19fc021005b45e5046a3b5e074e10965e26` | Supervisor approves one exact LOG-01 output SHA and freezes the observability contract |
| `W1` | Parallel | `LOG-02`, `LOG-04`, `LOG-05` | Same exact supervisor-approved LOG-01 SHA | Each output is independently reviewed; supervisor then integrates only approved outputs and freezes one exact integrated W1 SHA |
| `W2` | Serial | `LOG-03` | Exact supervisor-approved integrated W1 SHA | Supervisor approves semantic Drive tracing/composition wiring and freezes exact LOG-03 output SHA |
| `W3` | Serial | `LOG-06` | Exact supervisor-approved LOG-03 output SHA | Supervisor approves the integrated diagnostic bundle/operator surface and freezes exact LOG-06 output SHA |
| `W4` | Serial | `LOG-07` | Exact supervisor-approved LOG-06 output SHA | Independent adversarial verification passes and supervisor issues final session verdict |

A later wave must not start because one predecessor agent finished. The full predecessor gate for that wave must pass.

## 5. Prompt Maturity and Deferred Binding Rules

The updated batching rubric explicitly permits all later-wave prompts to be generated in advance when future predecessor values do not yet exist, provided the missing values are represented as controlled deferred bindings and execution remains prohibited until they are resolved.

Therefore:

- `LOG-01` is execution-ready from the exact base in Section 0.
- `LOG-02`, `LOG-04`, and `LOG-05` each contain `COMMON_BASE_SHA = <deferred: exact supervisor-approved LOG-01 output SHA>`.
- `LOG-03` contains `W1_INTEGRATED_BASE_SHA = <deferred: exact supervisor-approved integration of approved LOG-02 + LOG-04 + LOG-05 outputs>`.
- `LOG-06` contains `LOG06_BASE_SHA = <deferred: exact supervisor-approved LOG-03 output SHA>`.
- `LOG-07` contains `LOG07_BASE_SHA = <deferred: exact supervisor-approved LOG-06 output SHA>`.
- The supervisor is the only authority allowed to bind those values.
- No agent may execute while an execution-critical binding remains unresolved.
- No agent may substitute `phase6-integration`, `main`, a branch tip, a newer commit, an approximate predecessor, or a guessed SHA.
- Binding an exact SHA later must not silently change scope, behavior, ownership, or acceptance criteria. If predecessor review materially changes an assumption, the affected downstream prompt must be revised before execution.

Tasking-document publication commits are not implementation provenance. `LOG-01` branches from the exact implementation baseline stated above even though these prompt files are published later on `phase6-integration`.

## 6. Frozen Shared Observability Contract

`LOG-01` owns and freezes the shared observability contract consumed by every later work package. The approved contract must provide safe structured support for the following causal dimensions, using the repository's existing scalar structured-event model or an equally bounded backward-compatible evolution:

- correlation: `runId`, `planId`, `operationId`, `intentId`, `effectId`, `requestId`;
- safe path correlation: deterministic opaque `pathKey` rather than raw vault path;
- remote identity: current/predecessor/candidate Drive object IDs;
- evidence: canonical content hash when already available, size, expected/observed revision, trashed state;
- transport: endpoint class, HTTP method/status, attempt/max-attempts, latency, replay safety, retry decision/delay, Drive signal/classification, safe provider request identifier when available;
- observation/topology: observation source, occupancy count, deterministic bounded occupant-ID representation, candidate/predecessor verification facts, convergence status, reason code;
- durable execution: prior/next effect stage, verification evidence reference, physical-outcome classification;
- authority/state: persistence revision, semantic generation, state revision, semantic-change fact, CAS/commit result, change-batch/recovery reason;
- deterministic rendering and bounded retention;
- existing redaction guarantees plus deterministic path privacy.

Downstream agents consume this contract read-only. They must not rename fields, change their meaning, weaken redaction, change serialization semantics, or create parallel convenience schemas. If the approved contract cannot express required evidence, the consumer must hard-stop and report the incompatibility.

## 7. Ownership Matrix

| Mutable surface | Authoritative owner | Parallel rule |
|---|---|---|
| Shared diagnostic schema, safe-field vocabulary, path-key helper, correlation primitives under `src/diagnostics/**` | `LOG-01` | Frozen after W0 |
| `src/drive/transport.ts` request/retry instrumentation and focused transport tests | `LOG-02` | Exclusive W1 owner |
| Execution/durable-effect instrumentation in `src/product/authority-execution-diagnostics.ts`, `src/product/authoritative-production-executor-base.ts`, and bounded `src/core/execution-coordinator.ts` regions | `LOG-04` | Exclusive W1 semantic owner |
| Authority/state/recovery instrumentation in `src/state/persistent-state-store.ts`, `src/product/synchronization-adapters.ts`, and `src/product/durable-intent-recovery.ts` | `LOG-05` | Exclusive W1 semantic owner |
| `src/drive/google-drive-port.ts`, `src/drive/runtime.ts`, and bounded runtime composition needed to connect approved W1 diagnostic hooks | `LOG-03` | Serial after W1 integration |
| Diagnostic bundle/export/operator command, principally `src/diagnostics/**`, `src/main.ts`, and narrow read/export wiring | `LOG-06` | Serial integration owner for bundle surface |
| End-to-end/adversarial verification tests and verification evidence | `LOG-07` | Production code read-only |

During W1, shared composition roots such as `src/drive/runtime.ts`, `src/product/runtime.ts`, and `src/main.ts` are protected. W1 agents may define backward-compatible optional diagnostic hooks inside their owned modules, but they must not compete over shared composition wiring. `LOG-03` owns that wiring after the W1 integration gate.

## 8. Integration Plan

The supervisor owns integration between work-package branches; no implementation agent is authorized to merge itself into `phase6-integration`.

### 8.1 W1 integration

After independent approval of `LOG-02`, `LOG-04`, and `LOG-05`:

1. Use only the exact approved output SHAs.
2. Integrate the approved outputs onto one integration state.
3. Do not redesign approved implementations or the frozen LOG-01 contract.
4. Resolve only mechanically determined conflicts. Any semantic conflict returns to supervisor decision rather than being resolved by preference.
5. Run integrated typecheck/tests/build and reconcile the combined changed-file set.
6. Freeze the exact resulting SHA as `W1_INTEGRATED_BASE_SHA` for `LOG-03`.

`LOG-03` then performs the previously deferred shared composition wiring and semantic Drive instrumentation from that exact integrated state.

### 8.2 Later serial integration

After each of `LOG-03` and `LOG-06` is approved, its exact approved output becomes the only valid input to its successor. No branch-tip substitution is allowed.

## 9. Review Gates

The following gates are mandatory:

- `G0`: LOG-01 implementation + shared-contract review.
- `G1A/G1B/G1C`: independent local reviews for LOG-02/LOG-04/LOG-05.
- `G1I`: W1 integrated-state review and full integrated checks.
- `G2`: LOG-03 semantic Drive/composition review.
- `G3`: LOG-06 bundle/operator review.
- `G4`: LOG-07 independent adversarial verification and final supervisory reconciliation.

Evidence is mandatory but never self-approval.

## 10. Verification Standard

Every implementation work package must:

- inspect its bounded current production/test surface before editing;
- add focused positive and negative tests for its assigned behavior;
- prove test discovery/execution was non-zero for focused filters unless zero is explicitly expected;
- run `npm run typecheck`;
- run the strongest broader repository tests/build practical for that work package;
- run `npm test` and `npm run build` whenever production TypeScript is changed unless the execution environment makes a check unavailable;
- run `git diff --check` or equivalent repository diff hygiene check;
- inspect the complete diff from the resolved base to final HEAD;
- reconcile every changed file to authorized ownership;
- record exact commands, counts/results, limitations, implementation SHA, evidence SHA if different, and stop state.

`LOG-07` must run the full integrated repository suite and build from a clean dependency installation where the environment permits.

A required unavailable check must be reported as unavailable; it must never be represented as passed.

## 11. Evidence Contract

Use these exact evidence paths:

- `LOG-01`: `dev/evidence/_ca-output-agt-ca-p6-log01-observability-contract-foundation-01.md`
- `LOG-02`: `dev/evidence/_ca-output-agt-ca-p6-log02-google-http-transport-tracing-01.md`
- `LOG-03`: `dev/evidence/_ca-output-agt-ca-p6-log03-drive-semantic-operation-tracing-01.md`
- `LOG-04`: `dev/evidence/_ca-output-agt-ca-p6-log04-sync-execution-durable-effect-tracing-01.md`
- `LOG-05`: `dev/evidence/_ca-output-agt-ca-p6-log05-authority-state-recovery-tracing-01.md`
- `LOG-06`: `dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`
- `LOG-07`: `dev/evidence/_ca-output-agt-ca-p6-log07-end-to-end-observability-verification-01.md`

Each record must include agent/work-package identity, task type, temporal wave, resolved exact base SHA, branch, implementation SHA, evidence SHA if different, complete changed-file set, behavior implemented/verified, frozen contracts consumed, commands and test counts/results, unavailable checks, limitations/deviations/blockers, live-mutation statement, and exact stop state.

## 12. Session-Wide Prohibitions and Hard Stops

Session-wide prohibitions:

- no B01 rerun or remediation;
- no live Google Drive mutation;
- no B02–O, iPhone validation, or Stage 3;
- no release/tag/publication;
- no telemetry/backend/service addition;
- no secret or raw-content persistence in diagnostics/tests/evidence;
- no package/dependency upgrades;
- no unrelated refactoring, formatting churn, or repository cleanup;
- no synchronization-semantics repair disguised as instrumentation;
- no automatic continuation into a successor work package.

Every agent must hard-stop on unresolved execution-critical binding, base mismatch, material repository drift, authority conflict, frozen-contract insufficiency, ownership collision, architecture/runtime incompatibility, secret-exposure requirement, unexpected destructive/live-mutation requirement, or any discovered need to change synchronization semantics outside the assigned instrumentation surface.

## 13. Session Completion

The session is complete only when:

- all seven work packages pass their defined review gates in the required temporal order;
- W1 parallel outputs are deterministically integrated with no lost approved work or shared-contract divergence;
- the integrated plugin records a correlated causal trace spanning transport, Drive semantics, execution/durable effects, authority/state/recovery, and final outcome;
- the diagnostic bundle includes the required sanitized state/runtime/trace evidence and an understandable failure-focused causal timeline;
- the bundle contains no prohibited secrets, raw request/response bodies, or raw file contents;
- `LOG-07` proves the observability system under the required adversarial timing/failure scenarios and full repository checks;
- no unresolved instrumentation blocker remains;
- the supervisor issues the final session verdict.

Completion of this session does not authorize a release or B01 rerun. Those require separate explicit authorization.