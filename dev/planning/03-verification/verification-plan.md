# Whole-Project Verification Plan

## Authority and execution model

PHX-CI is the exclusive authoritative executable verification system under DEC-334. Repository-controlled checks may be consumed by PHX-CI, but they do not become independent acceptance authorities. GitHub Actions are prohibited for BVP acceptance.

Verification must preserve exact source identity, run identity, PHX-CI runtime/framework identity, stage results, repository checks, build/artifact results, and final classification. Historical finalized run evidence belongs under `dev/Test-Results/<runId>/`.

## Product completion-evidence ownership

## 14. Completion-Evidence Coverage

| Target-specification evidence category | Construction phase responsible for producing evidence |
| --- | --- |
| §13.1 Build and platform evidence | Phases 1, 4, 5, and 6 |
| §13.2 Reconciliation semantic tests | WS-02; integrated confirmation in Phases 5 and 6 |
| §13.3 State and crash-safety tests | WS-02; integrated fault injection in WS-06 |
| §13.4 Transfer and large-vault evidence | Phases 3 and 4; integrated scale validation in WS-06 |
| §13.5 Destructive-safety evidence | WS-02; integrated approval/execution validation in Phases 5 and 6 |
| §13.6 Authentication and security evidence | WS-03; integrated device/security validation in Phases 5 and 6 |
| §13.7 Configuration, lifecycle, and asset-boundary evidence | WS-04; integrated validation in Phases 5 and 6 |
| §13.8 Stage 3 traceability readiness | WS-06 prepares complete evidence; Stage 3 independently validates it |


## BVP evidence strategy

## BRAIN Product Completion-Evidence Mapping

| Product target-spec evidence | Primary BVP proof | Physical/live proof still required |
| --- | --- | --- |
| §13.1 Build/platform | local PowerShell build/typecheck/tests; production-bundle guard; platform tests | Windows Obsidian functional evidence; iPhone/iOS auth, pairing, upload/download, conflict, interruption/resume, UI-critical flows |
| §13.2 Reconciliation semantics | deterministic virtual-world scenarios using production planner/executor | selected real cross-device canaries only; not every semantic permutation needs physical repetition |
| §13.3 State/crash safety | deterministic faults, runtime reconstruction, persistent simulated reality/state | actual app termination/resume where physical lifecycle behavior itself is material |
| §13.4 Transfer/large vault | deterministic content integrity, file-change, retry/backoff, concurrency, modeled quota/disk; synthetic scale | representative real mobile constrained-resource/large-transfer evidence |
| §13.5 Destructive safety | deterministic plan/safety/state scenarios | representative live preview/execution evidence where useful; deterministic proof remains primary for broad permutations |
| §13.6 Auth/security | production automated security tests + artifact/source/evidence scans | same-device Google auth on Windows/iOS; real revocation/restoration where required |
| §13.7 Config/lifecycle/asset boundary | deterministic/local product tests + repository boundary scans | actual disable/uninstall/reinstall/unlink behaviors that require installed runtime |
| §13.8 Stage-3 traceability | BVP evidence aggregator maps product requirement → implementation → validation evidence | Stage 3 independently verifies the mapping |


## Completion Evidence

The BVP is complete only when objective evidence proves all of the following.

### 13.1 Architecture and Anti-Drift

- legacy active harness authority is archived/superseded;
- legacy `src/validation/**` runtime and shipping UI integration are removed;
- production build excludes `test-platform/**`;
- architecture guard passes;
- complexity metrics are within hard budgets;
- frozen governance files are present and protected by work-package rules;
- no scenario-specific production source or PowerShell verifier exists.

### 13.2 Deterministic Test Capability

- multi-device stateful virtual world exists;
- real production planner/executor/state semantics run against it;
- deterministic fault/restart controls exist;
- target-specification reconciliation, crash/state, transfer, destructive-safety, and relevant lifecycle requirements are mapped to executable deterministic scenarios;
- failures demonstrate that the scenarios actually detect incorrect outcomes rather than always passing.

### 13.3 Live Platform Capability

- separate validation artifact/entrypoint runs on Windows and iOS Obsidian without entering the ordinary shipping bundle;
- device agent accepts bounded addressed commands and returns objective results;
- cross-device command transport rejects stale/mismatched commands;
- representative Windows/iOS workflows required by the product target specification execute through the production path;
- external checkpoints cover genuinely physical transitions without inventing background execution.

### 13.4 Evidence and Verification

- authoritative PHX-CI verification completes successfully for every accepted child branch and final integrated stage;
- `dev/_ca-output.md` and `dev/Test-Results/<runId>/` contain the configured current and historical PHX-CI evidence, including commands/results, exit codes, architecture metrics, and required verification evidence;
- scenario evidence maps to the BRAIN target specification's §13 completion-evidence categories;
- a Stage-3 validator can trace each material product requirement to implementation and validation evidence without relying on legacy harness claims.


## Stage-3 boundary

WS-06 and WS-07 prepare construction evidence and Stage-3 readiness. Stage 3 remains an independent product/system validation activity and is not satisfied merely by Stage-2A construction verification.
