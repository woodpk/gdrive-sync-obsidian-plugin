# Whole-Project Verification Plan

## Authority and execution model

PHX-CI is the exclusive authoritative executable verification system under DEC-334. Repository-controlled checks may be consumed by PHX-CI, but they do not become independent acceptance authorities. GitHub Actions are prohibited for BVP acceptance.

Verification must preserve exact source identity, run identity, PHX-CI runtime/framework identity, stage results, repository checks, build/artifact results, and final classification. Historical finalized run evidence belongs under `dev/test-results/<runId>/`.

## Active testing inventory, native placement and PHX-CI discovery (2026-10-17)

**Inventory identity:** `master` at `b1e2ebaee3077e34a4eefaf601ee8124078b7400`, tree `07e9eed7c911e99b82990de220675ea2308a40ba`; see `dev/reviews/testing-governance-ptar-v2-20261017/audit.md` on its isolated review branch. Counts are a static source inventory, **not** executed tests or a claim that the audit branch has been accepted into master. Refresh the counts and exact candidate identity when a new source/test integration is frozen.

| Current source surface | Active count | Purpose/categories (by test intent) | Current configured discovery | Disposition |
| --- | ---: | --- | --- | --- |
| `test/**/*.test.ts` | 127 (99 at root; 28 nested) | unit, contracts, integration, adversarial and state/architecture checks as indicated by individual cases | `tsconfig.test.json` includes recursively; `npm test` invokes `node --test .test-build/test/*.test.js`, **selecting only 99 top-level modules** | Existing legacy `test/` root is preserved; **TG-01 discovery correction required** before complete-suite claim |
| `test/support/`, `test/adversarial-model/support/` | 2 support modules | deterministic fixtures, model support, fake builders; not independent tests | imported by corresponding tests | Existing legacy support paths preserved |
| `src/testing/fakes.ts` | 1 support module | existing product/test-only shared fake interfaces; review shipping exclusion before relocation | imported from tests as applicable | Do not migrate without an explicitly authorized scope |
| `test-platform/test/*.test.ts` | 42 | BVP architecture, platform, deterministic scenarios, lifecycle and live-runner infrastructure contracts | `npm run test:bvp-root`: BVP TypeScript compilation then `node --test .test-build/bvp/test-platform/test/*.test.js`; all 42 source modules are direct children | Existing architecturally segregated BVP root is retained under BVP-ARCH and DEC-311–DEC-319; new placement exceptions need explicit approval |
| `test-platform/test/batteries/*.ts` | 5 support/registry/runner modules | deterministic/live battery registry, execution support, late completion | consumed by BVP tests or future PHX-CI-coordinated batteries; not direct `*.test.js` entries | Test-specific logic owned by Independent Test Author; execution only via PHX-CI |
| `test-platform/scenarios/**` | 84 definitions (68 S06/S07; 14 live; 2 canaries) | declarative requirement/invariant scenarios, including failure and physical boundaries | imported by BVP tests and battery registries; existence does not establish a live run | BVP-ARCH segregation retained; live S09 currently BLOCKED absent PHX-CI-owned adapter |

**Exclusions:** `archive/**` contains retired artifacts, not active test source; `dev/test-results/**` contains frozen historical PHX-CI evidence, not active tests or authoring inputs. `.test-build/**`, caches and output are generated artifacts, not source cases. Previously accepted tests are not defective merely because they precede PTAR v2.0.

**Canonical placement for future authoring:** New or substantially revised independent tests default to repository-root `tests/unit/`, `tests/integration/`, `tests/contracts/`, `tests/architecture/`, `tests/adversarial/`, `tests/e2e/`, with `tests/fixtures/` and `tests/support/` as needed. Create no empty categories. Existing `test/` layout remains valid as legacy source; existing `test-platform/` location is a frozen platform architecture, **not an unrestricted exception for every future test**. Any new or revised BVP-specific test that must remain inside the BVP root needs supervisor/owner-reviewed documented exception and confirmed PHX-CI discovery. Never duplicate tests merely to satisfy a taxonomy.

**Discovery/gates (static configuration, not executed evidence):** `package.json` defines product `npm test` and focused `npm run test:bvp-root`; `tsconfig.test.json` and `test-platform/tsconfig.json` define compilation roots; `phx-ci.json` pins `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; `Taskfile.phx-ci.yml` wires the PHX-CI-managed Node consumer, repository check, and focused-command selector. BVP deterministic batteries are registered in `test-platform/test/batteries/deterministic-battery-registry.ts` and can be selected only through an approved PHX-CI stage; live batteries await a PHX-CI-owned physical adapter. An executor must demonstrate selected **actual** test modules/cases on the exact integrated source-and-test SHA and publish original PHX-CI run/evidence identities before any coverage PASS. A green default product check currently cannot prove selection of the nested 28; no standalone `npm`, `node --test`, PowerShell, or GitHub Actions verification is permitted.

**Traceability evidence contract:** Each new test-authoring handoff records exact normative requirement/invariant, expected positive and negative behavior, test module and case name, category/exception, production seam, fixture/observation, PHX-CI stage/discovery pattern, expected source selection, and any genuinely physical/platform-only dependency. Actual execution is subsequently bound by the distinct PHX-CI Test Execution Agent to source SHA, test commits, framework/runtime SHA, run ID, evidence commit, selected/attempted/passed/failed/skipped test counts, and whether acceptance/promotion is separately authorized. `dev/planning/01-target-system/requirement-traceability.md` is workstream/family mapping, not itself proof of individual case execution.

**Current exceptions and blockers:** TG-01 selection gap; TG-03 unauthenticated development-verification context accepted under the explicitly deferred, still-unfixed DEC-341 risk; TG-04 permissive extra `dev/_ca-output.json` guard allowance; live S09 battery adapter BLOCKED. Do not re-label any of these as corrected by a planning edit. Cross-cutting prospective metadata-inventory tests remain governed by DEC-339 and their owning workstream verification plans. PHX-CI is the only software-validation authority under current Operating Protocol and DEC-338, notwithstanding superseded DEC-334 references elsewhere in historical planning.

## Mandatory future PTAR v2.0 authoring and verification phases

1. Supervisor resolves the normative requirement and isolates the work unit; record exact base/source commit, authorized test-owned changed paths and intended test category/discovery tier.
2. A **distinct Pre-Build Test Author** directly commits test sources/fixtures on a role-isolated branch before code implementation; product coder cannot author, weaken or edit them. Optional RED is PHX-CI-only and not PASS.
3. After implementation, a **fresh blind Post-Build Phase 0 Reviewer** receives only neutral PTAR inputs, inspects authoritative requirements and production source, freezes a review-only report under `dev/reviews/<review-id>/`, commits it and **stops**. Prior tests/findings/evidence cannot be supplied pre-freeze.
4. Only **separately authorized Post-Build Test Author** examines the frozen review and earlier tests and commits additional adversarial cases, fixtures and requirement/test/discovery mappings on an isolated branch.
5. Supervisor integrates unchanged immutable authorized test/code commits into the exact combined candidate; a **distinct Independent PHX-CI Test Execution Agent** alone executes software verification and publishes original canonical evidence under `dev/test-results/<runId>/`.
6. Route production defects to the Coding Agent, test assertions/fixtures/check logic to their Independent Test Author, and PHX-CI runtime/adapter defects to the PHX-CI maintainer; affected reverification remains with the executor.
7. A **separate Independent Acceptance Reviewer** assesses source, tests, requirements and original PHX-CI evidence. Approval/promotion and physical activation remain separately owner-governed; neither a test commit nor PHX-CI PASS proves them automatically.

For every author/review handoff require repository, role/mode, work unit, base/source SHA, branch, authored commit/tree SHA, exact changed-path manifest, requirement-to-test or findings-to-test map, runner/PHX-CI discovery expectation, unresolved findings and next authorized action. GitHub commits are canonical; ZIPs, chat narratives or unverified branch references cannot replace them. The role-specific checklist below applies also to active retained `tasks/s09/` contracts when they are rebound before dispatch.

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

## Future metadata-inventory architecture verification (DEC-339)

Target Specification §7.9 is owned by WS-02 (durable inventory/BASE separation, restart and migration), WS-03 (Drive ID/parent/provenance and complete/incremental observations), WS-05 (safe production planning/execution integration), and WS-07 (PHX-CI-consumed deterministic and appropriate physical evidence). Require exact safety parity for duplicate identities, invalid/stale change cursors, partial enumeration, multi-device moves/deletions, uncertain outcomes and crashes, plus bounded iOS memory/storage. Quantify per-operation request count/latency before and after; targeted reads may replace full-tree passes only with proven equivalent authority, uniqueness and convergence. No live-run authorization follows from this planning update.
