# Verification Plan — BRAIN Verification Platform

## DEC-351 scenario-ID CLI test contract — 2026-10-24

**PLANNED ONLY; NOT RUN.** The [bounded direct scenario-ID task](tasks/bvp-direct-scenario-id-cli-2026-10-24.md) shall expose a **single** exact-ID deterministic scenario CLI over the existing BVP TypeScript runner; read-only scenario catalog discovery is permitted. Its test-first acceptance matrix must prove: (1) each supported deterministic definition can be selected by exact ID and executes **only once**; (2) incomplete/duplicated registry mappings and scenario ID/mode mismatches fail; (3) missing/malformed/repeated/unknown flags, unknown/live-only IDs and inappropriate paths cause **no dispatch**; (4) scenarios returning failed/blocked/unsupported stay nonzero, with trustworthy diagnostics and no synthetic PASS; (5) repeated/concurrent runs remain isolated; (6) result JSON persistence, schema and error behavior; (7) identity/privacy and absence of secrets/raw captures in public evidence; (8) compatibility with existing battery CLI and compiled CommonJS output; (9) frozen architecture/LOC limits, shipping isolation, no second runner, zero scenario-specific PS scripts; and (10) end-to-end determinism, adversarial oracle sensitivity and fail-closed/no physical or real Drive effects. Builder must trace all mandatory ten test families, including concrete reason for any not applicable; do not relax test expectations for PASS.

**Required qualification:** Exact source+tests through existing pinned Windows PHX-CI, original `dev/_ca-output.md` and `dev/test-results/<runId>/`, all gates and architecture metrics PASS, then **independent Reviewer two-pass final acceptance**. The intended one-window Builder code authoring is not a guarantee of completing qualification/review in that window. On acceptance update `dev/planning/03-verification/bvp-operator-runbook.md` with the **actual** verified CLI invocation and evidence, keeping simulation versus physical provenance explicit. No code/tests, PHX-CI, runtime execution, hardware testing or Reviewer handoff are claimed by these planning edits.

## DEC-350 operator re-entry supersession — 2026-10-24

Owner DEC-350 replaces the *prior prerequisite to build a full PowerShell interface library* with direct PowerShell invocation of BVP's **existing compiled TypeScript/JavaScript Node CLI**, where the current source actually exposes an operator interface. Canonical mandatory operator instructions: `dev/planning/03-verification/bvp-operator-runbook.md`; source API audit: `dev/research/bvp-operator-api-audit-2026-10-24.md`. Every assigned new BVP Builder/operator session must read root `AGENTS.md`, the runbook and current source first; the external `session-inits` is unchanged. The old PowerShell library plan is historical/paused. No new release, source-change qualification, live/physical mobile operation or simulator-equivalence claim is authorized by this documentation update. Prior DEC-347 physical restrictions and PHX-CI software-change qualification remain effective.

## Owner-directed verification strategy amendment — 2026-10-23

**DEC-346/347/348 control future BVP operation.** The default test environment is Windows Obsidian plus BVP's existing Windows-hosted virtual iPhone/iPad world. All iOS/iPad-relevant scenarios must be inventoried and mapped to that simulator; genuine OS/hardware behaviors that it cannot prove remain explicitly UNVERIFIED and must not be called physical PASS. Physical mobile runs are deferred pending an explicit future Owner decision. The complete BVP API is to be operated through a compact PowerShell library **directly**, never through PHX-CI; only engineering software-change verification (if required by the existing build rules) remains a separate PHX-CI concern. The planned error-reporting coverage, safety, and failure-injection matrix is at [BVP Error Communication and Diagnostic Upgrade](tasks/bvp-error-communication-upgrade-2026-10-23.md); all-command API parity, persistent config profiles and no-mid-run-prompt acceptance are covered by the [PowerShell operator library plan](tasks/bvp-powershell-interface-library-2026-10-23.md). Historical sections below describing physical/live acceptance are superseded **for the present Windows-first campaign**, not deleted or silently treated as proven.

## 1. Purpose

This artifact proves that the replacement testing architecture covers both its own target specification and the BRAIN product target specification's completion-evidence obligations without preserving the oversized legacy harness architecture.

The primary authority is the BRAIN product target-system specification. Historical C03–F03 scenario IDs are retained below only as migration traceability labels; they do not define the replacement architecture or require one custom program per historical scenario.

## 2. BVP Requirement-to-Phase Coverage

| BVP requirement family | Primary phase | Final verification |
| --- | --- | --- |
| `BVP-ARCH-*` | P0–P1 | P5 |
| `BVP-SIM-*` | P2 | P4–P5 |
| `BVP-SCN-*` | P3 | P4–P5 |
| `BVP-RUN-*` | P3 | P4–P5 |
| `BVP-EVID-*` | P3; production run receipt in P5 | P5 |
| `BVP-FAULT-*` | P2–P4 | P5 |
| `BVP-LIVE-*` | P5 | P5 |
| `BVP-VER-*` | P1 | every phase; P5 final |
| `BVP-MIG-*` | P0 | P1 search/guard; P5 final |
| `BVP-GOV-*` | P1 | every session; P5 final |
| `BVP-INV-001`–`012` | P0–P3 according to ownership | every phase; P5 final |

## 3. BRAIN Product Completion-Evidence Mapping

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

## 4. Historical C03–F03 Migration Mapping

These IDs are **historical traceability labels only**. The new platform may combine scenarios where one declarative scenario proves multiple old contracts or split a contract where target-spec traceability requires it.

| Historical ID | Subject | Replacement primary mode | Required live component |
| --- | --- | --- | --- |
| C03 | iOS update → Windows download/update | deterministic semantic + live canary | yes, representative cross-device update/download |
| C04 | iOS move → Windows move | deterministic semantic | representative move may be live; not architecture-critical |
| C05 | iOS delete → Windows trash | deterministic semantic | representative cross-device delete/trash may be live |
| C06 | Windows create → iOS download | deterministic semantic + live canary | yes, representative Windows→iOS create/download |
| C07 | Windows update → iOS download | deterministic semantic + live canary | yes, representative update/download direction |
| C08 | Windows move → iOS move | deterministic semantic | representative move may be live |
| C09 | Windows delete → iOS trash | deterministic semantic | representative delete/trash may be live |
| D01 | clean text merge | deterministic primary | one representative live conflict/merge flow sufficient for platform evidence |
| D02 | true text conflict | deterministic primary | representative physical conflict required by product platform evidence |
| D03 | binary conflict | deterministic primary | optional physical repetition unless needed for platform-specific behavior |
| D04 | delete-vs-modify | deterministic primary | no separate live run required unless platform issue discovered |
| D05 | offline/reconnect | deterministic semantic + physical transition | actual offline/reconnect evidence for platform behavior |
| D06 | stale device | deterministic state/authority primary | physical long-duration staleness only if needed to prove a platform-specific mechanism; never forged as physical evidence |
| E01 | interruption/restart | deterministic crash/reconstruction + physical lifecycle | actual Obsidian termination/restart evidence |
| E02 | ambiguous network outcome | deterministic primary | live provider ambiguity only if safe/reproducible and materially required |
| E03 | state/cursor recovery | deterministic primary | no routine physical repetition required |
| E04 | remote coverage failures | deterministic primary | no routine physical repetition required |
| E05 | destructive circuit breaker | deterministic primary | representative live blocked preview may supplement |
| E06 | auth/network/quota | deterministic classification + real auth/provider cases | real auth revocation/restoration and representative live network/provider behavior |
| E07 | safe cancellation | deterministic primary | representative live cancellation if UI/runtime behavior is material |
| F01 | filesystem scope/paths | deterministic policy + platform adapter tests | real Windows/iOS path/platform cases where adapter behavior differs |
| F02 | large transfer/resource | deterministic scale + resource instrumentation | representative constrained/mobile physical evidence |
| F03 | disable/unlink lifecycle | deterministic state invariants + physical lifecycle | actual disable/uninstall/reinstall/device-unlink evidence |

## 5. Anti-Drift Coverage Matrix

| Drift risk | Mechanical prevention | Review prevention |
| --- | --- | --- |
| testing framework re-enters production | import/bundle guard | supervisor architecture review |
| scenario becomes a custom program | per-scenario LOC + allowed-change-surface guard | scenario-cost tripwire |
| another runner/router/state machine appears | forbidden-abstraction rules + core metrics | explicit architecture approval required |
| framework grows silently | core/live-agent LOC metrics + hard budgets | review after max two sessions |
| per-scenario verification scripts proliferate | `.ps1` path/name guard | build prompt prohibits them |
| archived legacy plan regains authority | archive-reference guard | active project-state precedence |
| agent weakens guard to pass its work | governance files excluded from normal writable scope | supervisor-owned change only |
| tests pass but architecture drifts | PHX-CI repository check runs architecture guard/metrics | functional pass cannot override architecture failure |
| GitHub Actions becomes default verification | guard/search + required local verifier | every child/stage gate requires PHX-CI evidence |

## 6. Coverage Completion Gate

Before P5 can hand off to Stage 3:

1. every material BRAIN target requirement must have implementation evidence and at least one appropriate validation path;
2. every target-spec §13 evidence category must be classified as deterministic, live, or mixed with actual evidence attached;
3. no legacy C03–F03 semantic obligation may disappear merely because the old scenario program was archived;
4. no historical scenario ID itself is treated as more authoritative than the current product requirement it was intended to test;
5. architecture guard and all hard budgets pass on the final integrated repository;
6. `dev/_ca-output.md` records the final local verification and architecture metrics.

## 13. Completion Evidence

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


## Verification authority

All executable acceptance is PHX-CI-controlled under DEC-334. Architecture guard and metrics are repository-controlled checks consumed by PHX-CI. Physical Windows/iOS/Obsidian/provider execution belongs to the physical-validation stage defined by the BVP specification and does not become implied evidence merely because deterministic automation passes.

## Future metadata-inventory optimization evidence (planned, not executed)

PHX-CI-owned BVP deterministic coverage must establish baseline completeness, every-in-scope identity mapping, incremental Changes API incorporation and restart/cursor continuity, duplicate same-name siblings, wrong-root/provenance, file/folder moves, stale multi-device state, partial/failed listings, corrupt/migrated device-local inventory, ambiguous create/crash recovery, and safe full-reconciliation fallback. Verify bounded Windows/iOS-scale working memory and persisted storage, unchanged sync outcomes, and targeted-proofs equivalent to the independent authority/convergence checks they replace. Measure before/after Google Drive request counts and wall time by semantic caller class; no optimization PASS absent evidence.

The current S09A canary battery remains blocked: the unexpected second `upload-create` hash resolves to the canary parent folder, but its remote existence/authority has not been independently determined. This planning decision neither weakens the scenario guard nor authorizes folder creation or a new physical run.

## DEC-339 detailed verification design — pending independent review

The test-case matrix, failure classifiers, exact source/evidence requirements and comparable-workload benchmark design are at `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md`, §11. It is prospective: no DEC-339 tests, performance gains or PHX-CI verification are claimed yet. PHX-CI is sole executable verification authority and preserves current BVP platform boundary lock. The 223-request S09A canary with 35 unscoped planning requests is diagnostic background, not a speedup control or permission to repeat physical operations.

## Fixed-PHX-CI S09 consumer bridge verification plan (prospective, software-only)

**No PHX-CI changes. No physical execution.** These are requirements-to-test obligations for the Owner-directed BRAIN consumer bridge; pass/fail evidence must originate in actual pinned PHX-CI runs. A normal successful bridge invocation must preserve `npm run test:bvp-root` and the full product typecheck/test/build/repository/artifact/guard gates. A physical checkpoint can only yield PHX overall BLOCKED, never PASS.

| Mandatory test family | Minimum material tests and oracles |
| --- | --- |
| 1. Nominal | Simulated BVP completes -> exit 0, full PHX-CI may PASS; original record contains correct identity and results. |
| 2. Negative/boundary | Wrong/empty/duplicated/oversized marker, malformed JSON/base64, incomplete checkpoint, unsupported version, secret-containing result, missing Git path/commit -> BLOCKED. |
| 3. Legal/forbidden transitions | Initial -> published checkpoint -> authorized resume; resume without published prior PHX record, after completion, or in disallowed mode -> BLOCKED. |
| 4. Idempotency/retry/cancellation/recovery | Exact previous evidence may be re-read without effects; duplicate attempt/repeated physical command, uncertain prior action, canceled/missing publication -> no dispatch and BLOCKED. |
| 5. Concurrency/order/races | Two consumers racing on same BVP/device/relay identity, advancing branch between evidence preflight/publication, delayed receipts -> no conflicting execution or forged PASS. |
| 6. Persistence/restart/data integrity | Two real PHX invocations with distinct PHX IDs, same BVP ID, canonical first-run BLOCKED evidence reconstructed byte-for-byte from immutable history; original evidence never modified. |
| 7. Identity/authorization/security/trust | Wrong source/device/validation artifact hash, changed executable paths despite evidence-only commit, wrong PHX run ID, unknown operator authority, path traversal/symlink, stdout secret leakage -> reject. |
| 8. Contracts/integration/backward compatibility | Pinned run-request schema unchanged; stages retained; `test:bvp-root` and product tests retained; `dev/scripts` sentinel unchanged; full PHX JSON/stage/exit and path readback verified. |
| 9. Architecture/ownership/invariants | No PHX repository/config edits, no BVP runner replacement, no additional PowerShell scenario verifier or product seam, no new evidence schema authority, unchanged BVP budgets/guard. |
| 10. End-to-end/fail-closed/destructive safety | End-to-end simulated initial checkpoint/PHX BLOCKED/publish/new PHX invocation/valid completion; blocked publication, timeout late result, incomplete receipt or action-budget breach never cause physical effect or PASS. |

Add focused adversarial mutation/fault-injection tests of frame parsing, proof checking, source comparison, checkpoint digest validation, relay lease and BVP result correlation. Document every N/A decision against a specific behavior; do not use blanket exemptions or relax expected outcomes to get green tests.

**Evidence proofs required:** (a) source-pinned first run's actual Git-published PHX result JSON contains the bounded serialized checkpoint and original BVP result in `test-focused.stdout`; (b) second run obtains exact immutable prior commit/path and validates it before executing; (c) first run remains BLOCKED and untouched; (d) second successful run passes all required PHX gates; (e) both full PHX evidence commits are verifiable; (f) impossible/unsupported scenarios remain BLOCKED. PHX publisher's configured history layout is derived from the pinned runtime, not invented. Simulated proof does not establish real Windows/iOS acceptance or permission for S09 physical canaries.

### Two-unit authorship and qualification attribution (2026-10-20)

- **S09-BR01 — test-first implementation:** author requirements-derived executable test file(s) under `test-platform/test/**` and commit them before creating the single proposed BRAIN-side adapter file, `test-platform/test/batteries/phxci-physical-bridge.ts`; existing PHX-CI regression gates apply even before new tests are added. The adapter must not write another verifier, change the PHX-CI runtime, or replace the deterministic focused suite.
- **S09-BR02 — test hardening:** additional/adversarial test files and test-oracle integrity review beneath `test-platform/test/**`, with coverage of all ten test families above. The final combined software candidate must pass original pinned PHX-CI verification and simulated checkpoint→published BLOCKED→fresh verification→resume/eligible PASS without activating physical devices.
- **Independent final Reviewer acceptance** follows BR02 qualification; it is not a Build Unit. Defects requiring adapter edits return to BR01 as bounded corrections, followed by renewed verification. There is no S09-BR03/BR04.

**Scope status:** PLANNED / NONEXECUTABLE; physical S09A–S09V stays separately gated.

**Initial TDD RED state:** The first committed BR01 tests intentionally reference an absent adapter and must not be mistaken for a qualified software candidate. If an expected-RED baseline is executed, only use PHX-CI and preserve its actual BLOCKED original evidence. No standalone `tsc`, `node --test`, Task, or script is acceptance. This is an internal Builder iteration; no cross-role handoff or new Build Unit is created.


## DEC-357 verification matrix — new Windows OAuth controller Build Unit

Owner-selected Option A is a distinct WS-07 successor to the rejected DEC-356 R5 controller assembly. Normative requirements BVP-WCO-001–011, architecture and test contracts: [standalone task](tasks/bvp-windows-controller-oauth-2026-10-28.md).

| Evidence family | Required proof |
| --- | --- |
| Authentication | Separate Windows desktop OAuth S256 PKCE, one-time callback state, exact existing `drive.file` scope, offline renewal, protected local tokens, no Obsidian credential transfer |
| Controller authority | Single Windows-root process owner, per-device exclusive lock, existing run/device/generation lease; missing, stale and contending controller remain unavailable |
| Delivery correctness | Reporter stages pending; only authorized controller promotes ACTIVE; journal confirms only after ACTIVE; Windows inbox record remains durable across restart |
| Failure/security | Invisible existing mailbox cannot cause a second mailbox; ambiguous Drive responses, expired cursors, DPAPI failures, forgery and replay do not produce false success |
| Isolation/architecture | No production `src/**` changes, mobile/browser Node dependencies, physical commands or frozen guard/budget/pin changes |
| Qualification | Actual complete 11-stage pinned Windows software-only PHX-CI results, preserved original evidence, then independent blind-first final acceptance |

**Current status:** first DEC-357 PHX-CI run `422cc526-615e-4848-8566-9f4152b5126e` against `af178ebc...` **BLOCKED** at focused BVP TypeScript compilation (undefined `readFile` in `s08d-drive-mailbox-relay.test.ts:820`); full product test stage passed, later gates were not reached. No qualified PASS, Reviewer acceptance or live OAuth/Drive authorization exists. The prior R5 PHX-CI PASS qualifies only its earlier exact source and its Reviewer disposition was CORRECTION REQUIRED. Separate OAuth-client visibility of the existing app-owned `drive.file` mailbox remains an independently authorized operational compatibility prerequisite; mocks do not close it. No GitHub Actions, release or physical dispatch.

