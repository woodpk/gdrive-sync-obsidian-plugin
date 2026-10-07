# Phase 6 Logging Instrumentation — Build Session Run Order

## Purpose

This directory contains the complete mixed-temporal build-session package for Phase 6 logging instrumentation.

Run the work packages in the order and wave structure below. Do not advance merely because one agent finishes. Every
required predecessor review, exact-SHA binding, integration step, and gate must complete before the next dependent wave
begins.

The governing orchestration contract is:

`00-logging-instrumentation-session-orchestration.md`

Read that file before issuing any agent prompt.

## Execution Order

| Wave                             | Mode                             | Prompt(s)                                       | Execution rule                                                                                                                                                                         |
|----------------------------------|----------------------------------|-------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `W0`                             | Serial                           | `01-observability-contract-foundation.md`       | Run first. Review and approve the result. Freeze the exact approved `LOG-01` SHA before continuing.                                                                                    |
| -------------------------------- | -------------------------------- | --------------------------------                | --------------------------------                                                                                                                                                       |
| `W1`                             | Parallel                         | `02-google-http-transport-tracing.md`           | Bind all three prompts to the same exact supervisor-approved `LOG-01` SHA, then run them concurrently if desired. Review each result independently.                                    |
|                                  |                                  | `04-sync-execution-durable-effect-tracing.md`   |                                                                                                                                                                                        |
|                                  |                                  | `05-authority-state-recovery-tracing.md`        |                                                                                                                                                                                        |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W1 Integration Gate`            | Serial supervisor integration    | No separate agent prompt in this directory      | Integrate only the approved `LOG-02`, `LOG-04`, and `LOG-05` outputs into the authorized integration state. Run integrated verification and freeze the exact approved integrated SHA.  |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W2`                             | Serial                           | `03-google-drive-semantic-operation-tracing.md` | Bind to the exact approved W1 integrated SHA. Run, review, and approve before continuing.                                                                                              |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W3`                             | Serial                           | `06-diagnostic-bundle-operator-surface.md`      | Bind to the exact supervisor-approved `LOG-03` output/integrated observability SHA. Run, review, and approve before continuing.                                                        |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W4`                             | Serial verification              | `07-end-to-end-observability-verification.md`   | Bind to the exact supervisor-approved `LOG-06` SHA. Run only after the complete implementation is stable.                                                                              |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Final Gate`                     | Serial supervisory gate          | No agent prompt                                 | Reconcile `LOG-07` evidence, integrated repository state, required tests/builds, and all session prohibitions before issuing the final session verdict.                                |
| -------------------------------- | -------------------------------- | --------------------------------                | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |

## Dependency Graph

```text
LOG-01
  |
  +--> LOG-02 --+
  +--> LOG-04 --+--> W1 INTEGRATION --> LOG-03 --> LOG-06 --> LOG-07 --> FINAL SUPERVISORY GATE
  +--> LOG-05 --+
```

## Prompt Maturity and SHA Binding

`LOG-01` is the foundation work package. Later prompts may exist in this directory before their exact predecessor SHAs
exist, but they remain preplanned / not-yet-executable until every execution-critical deferred binding is resolved.

Before issuing any downstream prompt:

1. confirm the required predecessor gate has passed;
2. obtain the exact supervisor-approved predecessor SHA or integrated SHA required by that prompt;
3. bind that exact value into the prompt or otherwise supply it authoritatively as the prompt requires;
4. verify that no other prompt assumptions have become stale;
5. prohibit substitution of a branch tip, newer `main`, later `phase6-integration`, approximate commit, or guessed
   value;
6. only then authorize execution.

## Review and Integration Rules

- `LOG-01` must be approved before any W1 agent begins.
- `LOG-02`, `LOG-04`, and `LOG-05` are the only intended parallel wave.
- Local success of any W1 agent is provisional; it is not session approval.
- All three approved W1 outputs must be integrated and verified before `LOG-03` begins.
- `LOG-03`, `LOG-06`, and `LOG-07` are serial successors and must not overlap their predecessor gates.
- No agent may auto-continue into another prompt, later wave, integration, release, live validation, B01 rerun, or other
  Phase 6 work.
- The supervisor remains the integration and approval authority unless a later explicit task changes that ownership.

## File Order

Use the files in this directory as follows:

1. `00-logging-instrumentation-session-orchestration.md` — governing session contract and wave plan.
2. `01-observability-contract-foundation.md` — `LOG-01`, W0 foundation.
3. `02-google-http-transport-tracing.md` — `LOG-02`, W1 parallel.
4. `04-sync-execution-durable-effect-tracing.md` — `LOG-04`, W1 parallel.
5. `05-authority-state-recovery-tracing.md` — `LOG-05`, W1 parallel.
6. Perform the W1 supervisory integration gate.
7. `03-google-drive-semantic-operation-tracing.md` — `LOG-03`, W2 serial.
8. `06-diagnostic-bundle-operator-surface.md` — `LOG-06`, W3 serial.
9. `07-end-to-end-observability-verification.md` — `LOG-07`, W4 serial verification.
10. Perform the final supervisory session gate.

## Hard Ordering Rule

A later wave may begin only when the complete predecessor condition defined by
`00-logging-instrumentation-session-orchestration.md` has passed and the required exact execution input has been bound.

Do not infer authorization from file numbering, agent completion, branch availability, or a passing local test suite
alone.
