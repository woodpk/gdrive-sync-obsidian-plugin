# Whole-Project Verification Plan

## Authority and execution model

The pinned PHX-CI is the exclusive **software-change qualification** system under DEC-338. Separate BVP **operational** test execution follows DEC-350 and runs BVP directly, not through PHX-CI. Repository-controlled checks may be consumed by PHX-CI, but they do not become independent acceptance authorities. GitHub Actions are prohibited for BVP acceptance.

Verification must preserve exact source identity, run identity, PHX-CI runtime/framework identity, stage results, repository checks, build/artifact results, and final classification. Historical finalized run evidence belongs under `dev/test-results/<runId>/`.

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
- `dev/_ca-output.md` and `dev/test-results/<runId>/` contain the configured current and historical PHX-CI evidence, including commands/results, exit codes, architecture metrics, and required verification evidence;
- scenario evidence maps to the BRAIN target specification's §13 completion-evidence categories;
- a Stage-3 validator can trace each material product requirement to implementation and validation evidence without relying on legacy harness claims.


## Stage-3 boundary

WS-06 and WS-07 prepare construction evidence and Stage-3 readiness. Stage 3 remains an independent product/system validation activity and is not satisfied merely by Stage-2A construction verification.

## DEC-339 dormant-software integration verification (2026-11-17)

The [single WS-05 integration plan](../02-workstreams/WS-05-integrated-sync-product/tasks/dec339-inventory-production-integration-2026-11-17.md) assigns WS-02 v1/v2 compatibility, local file/folder hints, rollback and atomic inventory+cursor enforcement; WS-03 unchanged authenticated `drive.file` metadata/Changes and provenance; WS-05 **isolated storage-only shadow → observation-only comparison → default-off planner cutover**, preserving the existing planner/executor, full fallback and recovery.

**Changed-software qualification** uses exact-source PHX-CI (DEC-338), followed by independent blind-first Reviewer acceptance; source-bound evidence belongs in `dev/test-results/<runId>/`. **Operational BVP scenarios** run the existing BVP interface directly (DEC-350), with Windows-first virtual iPhone/iPad simulation (DEC-347), and do **not** count as real iOS/physical evidence. Compare equivalent inventory-on/off safety and actual request/latency measurements **against the active incremental Changes path**, not only full-tree enumeration. Resource/physical behavior not demonstrated remains explicitly unverified. D339-06 targeted executor reads are **deferred, not cancelled**, and require a separate proof/activation gate. DEC-340-01 verification-integrity, S09/`data.json`, exact-artifact promotion and any physical/live migration/release approvals remain independent unresolved-or-separately-verified gates; recheck current authoritative status before activation. This plan grants no execution authority.


## WS-07 DEC-357 Windows OAuth controller — current software-only verification gate

New Owner-authorized `BVP_WINDOWS_CONTROLLER_OAUTH` is a distinct WS-07 Build Unit with requirements [BVP-WCO-001–011](../02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md). Test expectations include generated plugin reporter isolation, Windows-only separate Desktop OAuth S256 PKCE, DPAPI protected tokens, exact `drive.file`, no disconnected mailbox creation, singleton controller/lease fencing, staged→ACTIVE→journal confirmed→durable Windows inbox, idempotent restart, event-specific acknowledgment, quota/age retention, and error/privacy fail-closed negative cases.

Qualification authority remains the **unchanged pinned Windows PHX-CI**: freeze exact source SHA/tree, owner-run software-only validation, publish original source-bound evidence, obtain an independent blind-first final Reviewer acceptance. The prior DEC-356 R5 PHX-CI PASS belongs to its old SHA and **independent software acceptance was withdrawn**. DEC-357 first PHX-CI run `422cc526-615e-4848-8566-9f4152b5126e` on SHA `af178ebc...` was **BLOCKED** by focused TypeScript test compilation (missing `readFile`); it is not a software PASS or independent acceptance. The external fact that a second OAuth Desktop client can access existing app-owned files under `drive.file` is unverified: live compatibility requires separately explicit Owner authorization after software qualification; software mocks cannot establish that fact. No GitHub Actions or non-PHX-CI verification authority, no physical dispatch, personal Drive/vault operation, deployment or merge.
