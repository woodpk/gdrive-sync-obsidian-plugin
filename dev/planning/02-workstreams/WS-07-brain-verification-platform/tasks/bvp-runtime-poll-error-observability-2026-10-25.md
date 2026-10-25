# BVP — Durable receiver and relay error observability (2026-10-25)

**Status:** R5 BUILDER-QUALIFIED, INDEPENDENT R2 FINAL REVIEW PENDING; NO PHYSICAL DISPATCH/RELEASE.
**Repository:** woodpk/gdrive-sync-obsidian-plugin
**Feature:** WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY
**Base SHA:** ecb4d26e85444d24d07cffb57b966ed2d5f7f6df
**Decision:** DEC-352, extending DEC-348 without changing BVP architecture or production sync.

## Failure and required outcome
The validation-only plugin's one-second tick currently invokes `pollDeviceOnce().catch(() => undefined)` and the desktop relay equivalent. Typed `status: unavailable` results are also ignored. iOS errors can therefore disappear even with automatic product sync disabled. User requires all BVP errors to be observable, including network/auth/remote result errors.

## Normative contract
1. Replace silent async catch and ignored unavailable results with one stage-specific error boundary. Capture the existing `BvpDiagnostic` classification, stage, confirmed/unconfirmed boundaries, unknown-effect safety and privacy-derived IDs; never capture raw exception text or error stack in persisted or remote evidence.
2. Record a bounded, durable local BVP-only journal under the installed validation plugin's .bvp-relay directory. It must work while offline, coalesce repeated equivalent failures with occurrence counts, preserve first/last occurrence and pending-delivery state across restart, and never touch production managed sync files.
3. When transport is available, publish pending redacted records using the existing authenticated Google Drive BVP mailbox as a separate diagnostic record kind. Never reuse automatic BRAIN sync or command/result records, and never treat a diagnostic delivery failure as a successful command acknowledgment.
4. The Windows relay must collect and durably expose addressed diagnostic records through its existing inbox, idempotently by a stable diagnostic event identifier, preserving exact run/device routing and source-origin correlation; a missing receipt or unknown effect remains BLOCKED/UNKNOWN.
5. A successful poll after failures records the recovery boundary and may retry remote delivery; no uncontrolled infinite retries, unbounded logs, duplicate remote writes or self-recursive reporting.
6. Preserve one-second best-effort foreground polling, iOS background-suspension limits, privacy/identity/lease rules and no change to the shipping plugin. All user-visible logs must be secret-safe; failed journal persistence must emit a safe fallback code and remain an explicit observable blocked condition.
7. Existing three automatic product synchronization options remain OFF for physical readiness; physical test dispatch remains separately gated.

## Scope and ownership
Allowed source: `test-platform/src/live-device/**` and the two browser-pure shared modules `test-platform/src/diagnostic-contract.ts` and `test-platform/src/bvp-runtime-error-journal.ts`; Node-only validation artifact builder source is moved to `test-platform/src/build-validation-artifact.ts` with its unchanged established live-device entrypoint forwarding wrapper, to preserve runtime-device versus build-tool budget classification (necessary to preserve the frozen 950-line live-device budget without artificial code compression); existing focused tests under `test-platform/test/**`; bounded authoritative `dev/authority/**`, `dev/planning/**`, `dev/state/**`.
Prohibited: `src/**` shipping logic, PHX-CI source/pin/taskfiles, frozen architecture lock/budgets, deterministic runner replacement, external broker, alternative CI, unrelated physical command or personal-vault mutation.

## Mandatory test adequacy and traceability
| Family | Required proof |
| --- | --- |
| Nominal | Successful poll, no false error, delivery of a prior offline failure |
| Negative/malformed | Unavailable result and rejected/invalid diagnostics, storage failure |
| State transitions | Offline -> pending -> delivered -> recovered |
| Idempotency/retry | Duplicate timer ticks and retry do not publish duplicate events |
| Concurrency | Overlapping poll and relay pump cannot race journal flush |
| Persistence | Reconstructed plugin replays the journal; bounded retention |
| Identity/security | Correct device/run correlation; reject raw secrets/invalid tokens |
| Compatibility | Existing result/command semantics and shipping isolation retained |
| Architecture | Existing budget and frozen boundary remain PASS |
| E2E/fail-closed | Failed publication remains pending; unknown effect not turned into PASS |

## Build sequence and gates
1. Persist DEC-352 and this neutral task before implementation.
2. Add tests in existing S08 mailbox / validation tests; implement the bounded validation-only journal and relay mailbox path. Do not broaden command authority.
3. Static impact review of all affected consumers, exports, published failure paths and user credentials. No test execution outside PHX-CI.
4. Owner runs unchanged PHX-CI on exact feature SHA; original terminal output, exit codes, original results and evidence must be published canonically.
5. After substantive PASS, independent final Reviewer blind source assessment then full evidence assessment. Only after acceptance and owner release authorization may exact verified validation-only artifacts be installed or issued as prerelease.
6. Re-run preflight of actual iPhone plugin identity, authentication, remote pairing and automatic-sync OFF, then separately authorize one `observe-product` physical scenario.

## Known limitations
If iOS terminates Obsidian or denies all persistent storage, no JavaScript callback can guarantee telemetry; record a failure code on restart if detectable and never claim guaranteed delivery. Directly proving iOS mailbox polling requires an approved device run, not code review or desktop simulation.

## Builder implementation checkpoint — 2026-10-25

- Candidate source/test commit before this state-only publication: `92f848bb5519488242be4fbb398ea1754cad5788` on `build/bvp-poll-error-observability-20261025`.
- Structured BVP runtime errors are journaled under the validation-only plugin's `.bvp-relay/runtime-errors.json`; repeated errors are coalesced and pending delivery is retained through restart. BVP Google Drive mailbox `diagnostic` records are distinct from BRAIN sync, command, and result records. Diagnostic metadata stays unlisted until content upload completes. Windows relay projects exact leased diagnostic events into its own inbox; invalid records and corrupt controller leases report typed errors.
- Focused regression authoring: `test-platform/test/s08b-validation-build-entrypoint.test.ts` and `test-platform/test/s08d-drive-mailbox-relay.test.ts`. Existing product artifact exclusion and architecture tests must be re-run, unchanged, through PHX-CI.
- Node-only artifact builder moved to `test-platform/src/build-validation-artifact.ts` with the original live-device entrypoint as a compatible wrapper. The original shipping `manifest.json` remains `0.1.19`; the validation-only build accepts an explicit version override (planned `0.1.20-bvp.2`).
- Operator distribution: two owner-executed PowerShell artifact scripts, `Install-BvpValidation.ps1` and `New-BvpPrerelease.ps1`, are delivered separately to the owner. These scripts have **not** been executed or qualified by PHX-CI. They require exact PHX-CI PASS identities, the accepted independent review report, approved artifact digest and an explicit owner approval before installation or GitHub prerelease publication.
- **No execution evidence:** A connected GitHub repository interface is not a Windows 11 PHX-CI runtime. Source and test presence do not establish a compiler/test/architecture PASS. Do not issue Builder→Reviewer handoff until qualified original canonical evidence exists. Do not install, release, or physically dispatch any iPhone commands from this feature state.

## R1 original PHX-CI result and bounded correction — 2026-10-25

- Submitted source: `eeccd74e1c578af0ad17d9dd0df26b2eafaae338`. PHX-CI run `08400703-ef66-4ae9-8332-644648f07378` exit 201: change-set FAIL at `test-focused` (TypeScript compile exit 2), repository PASS (1,292/1,292 product tests); overall BLOCKED, not qualified. Original published evidence: `2c51e3c9b6b5af264167990a89cee3921a2794d5`, `dev/_ca-output.json` and `dev/test-results/08400703-ef66-4ae9-8332-644648f07378/`. Later dependent build/repository-check/artifact stages were not completed.
- Root cause: moving the shared contract to `test-platform/src/diagnostic-contract.ts` left one type re-export pointing to nonexistent `../diagnostic-types`; the correct path is `./diagnostic-types`. The two runner `stepId` and three `h` inference errors were cascading symptoms. Preserve the existing shared diagnostic public type contract and callers.
- Correction committed at `50b4c95b31607f43531bd06ddc4e0bf57b73956b`, with follow-on bounded retention fix and offline-overflow regression at `f73364610f7b6c03362e8bdf31f7b8bc8c6385e0`. Persistent overflow accounting is now written before returning the explicit saturated-journal condition. No verification has executed for the corrected candidate; **not PASS**.
- The source change-set from current `master` still includes the already-approved DEC-349 frozen-budget amendment (framework 4,000→4,500, live-device 750→950). Existing PHX-CI `-SoftwareOnlyGovernance` classification is required to represent that inherited authorization accurately; this feature does not authorize further budget changes. No physical mode or iPhone dispatch.
- Rerun eligibility: substantive focused BVP compilation failed and its tests/build/repository-check were not completed (Protocol §37.1). PHX-CI verification must be repeated on the corrected exact source through the installed pinned framework, original evidence retained. No release, installation, or Reviewer handoff until qualified.

## R2 original PHX-CI result and bounded inventory reconciliation — 2026-10-25

- Exact R2 verified source: `31960df061418d96492f3aa3d0740c2bc546c617`. PHX-CI run `f8cfa238-805f-444c-9d4c-d4e4858d6960`, original evidence `91e5eb3090bc386f78ecda04c57f930c98c32a95`. Result: focused BVP 558 PASS / 1 FAIL of 559; full repository product tests 1,292 PASS; overall BLOCKED (201). TypeScript compilation passed and no stage after failed focused tests was qualified. Preserve R1 and R2 evidence separately.
- Only focused failure: `P1 exported TypeScript contracts are complete, including type-only reexports` reports that the frozen **classified** TypeScript API inventory omitted `test-platform/src/build-validation-artifact.ts`, `test-platform/src/bvp-runtime-error-journal.ts`, and `test-platform/src/diagnostic-contract.ts`, and retained outdated exports for two relocated/wrapper modules.
- Repair: update the *authoritative P1 export classification inventory*, not the assertion, by enumerating the new declarations and reexports; clearly classify the Node-only validation builder, browser-safe diagnostic contract, and private BVP journal, and reclassify the compatibility wrappers. All new BVP journal exports remain **internal** (no public operator privileges); no CLI parity, physical dispatch, or frozen architecture relaxations are authorized.
- This inventory-only correction is unverified until a new exact-source PHX-CI software run. The substantive missed focused test and later unexecuted build/repository-check/architecture stages make a bounded qualified rerun eligible under protocol §37.1. Do not promote or release.

## R3 verified qualification and final-review boundary — 2026-10-25

- Verified immutable source SHA: `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64`; source Git tree: `475ee95499d7c9ef3522dbc5ed4da724d9b43851`; original PHX-CI runtime: `69c4aa077d4a1a46d1e85e59f39d36285be99e83`.
- Original PHX-CI run ID: `23fd83ff-613e-4543-a66e-514e37132d59`; original evidence commit `ad1bd817388ff976f9877c71b72e8c3ce1e5eb12`; original result path `dev/test-results/20261025T171255Z-operator-build-bvp-poll-error-observability-20261025-800b8b3dd228.json` with sibling terminal log and Markdown summary, plus `dev/_ca-output.json` and `dev/_ca-output.md`.
- **Substantive PHX-CI qualification PASS:** all 11 named stages PASS, focused BVP tests 559/559 PASS, product tests 1,292/1,292 PASS; change-set PASS, repository PASS, overall PASS, exit 0, original evidence published. Verified source and evidence identities are distinct: the evidence commit's first parent is the exact source SHA.
- Builder is qualified to hand off for a SINGLE FINAL independent Reviewer engagement. No independent review has yet been performed for DEC-352, and no feature acceptance is claimed. For blind Pass 1 read ONLY the neutral original feature contract sections (Failure and required outcome, Normative contract, Scope, Mandatory test adequacy, Known limitations) and exact immutable production source. Do not inspect the Builder implementation checkpoint or R1/R2/R3 history, test files, code history, review findings, PHX-CI results or Builder reasoning until the independent blind-source assessment has been frozen and published.
- Final review then evaluates the authored tests and mandatory ten families, exact immutable source/tree, original PHX-CI evidence and remaining defects; Reviewer may write only `dev/reviews/` reports and narrowly scoped handoff metadata in `dev/state/current-state.yaml`. No Reviewer software verification execution, source/test/script edits or installation. No GitHub Actions.
- No merge, installation, prerelease, iPhone command dispatch, OAuth reauthentication, sync enablement, product-data mutation or production release is authorized by PHX-CI PASS. Reserved Owner authorization is still required after independent acceptance.

## R1 independent rejection and Builder correction — unverified checkpoint (2026-10-25)

- Immutable first qualification source `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64` remains an authentic prior 11-stage PHX-CI PASS, but **not accepted**. Reviewer source assessment: `dev/reviews/bvp-runtime-error-observability-20261025-r1-source.md` at `d44ac2a63cb5dfefb7eb781ff89564456a7f992c`. Final CORRECTION REQUIRED report: `dev/reviews/bvp-runtime-error-observability-20261025-r1-final.md` at `564db71dc3a5aa7566716a8165b0cda241d69396`. Reviewer→Builder handoff count `2`, published at `e330267e7624dd49c99e5f1c206073fe60fe90b0`; feature-specific state, not the unrelated top-level current Build Unit, governs the handoff.
- DEC352-F01: Journal entries now bind an immutable local-only original run/device route when the active run has actually been observed, including an opaque run hash in the diagnostic contract. Unbound failures cannot be silently rebound to a later lease or coalesced across unknown origins. Recovery evaluates the event's original scope, and delayed flush routes each entry by its persisted origin rather than the mutable currently active run.
- DEC352-F02: Before any diagnostic file mutation the journal obtains a Google Drive pre-generated file ID, commits it locally, and always reuses that ID. Remote publication lists all visible and staging records for the event ID, rejects incompatible origin/payload/duplicate identities, resumes a partially completed file and reads back media/visibility. Ambiguous responses leave delivery unconfirmed and retain pending work; a new remote ID is never issued after an uncertain create. Remote command/result semantics are not changed.
- DEC352-F03: One-second polling remains best-effort; remote diagnostic retries are scheduled no more than once per 30 seconds per active installed runtime, remain serialized with journal flush, and never automatically acknowledge an unknown publication. Journal overload remains bounded and explicit; relay duplicate/conflicting persisted inbox evidence is rejected. New and preserved test expectations cover the ten families below. No test oracle was loosened to get a green result.
- DEC352-F04: R1 Reviewer disclosed incidental Builder narrative exposure before freezing the source-first report; it is **not** characterized as perfectly blind. The next independent final Reviewer must maintain a clean blind first pass and acknowledge any source-access limitations.
- DEC352-F05: The original R3 JSON, Markdown and terminal log are now mirrored at `dev/test-results/23fd83ff-613e-4543-a66e-514e37132d59/` by reusing the exact original Git blobs, with `provenance.md`. No original record was modified, and the mirror does **not** qualify corrected code.

### Ten-family traceability / adversarial acceptance work (pending PHX-CI discovery and execution)

| Family | Applicable correction evidence |
| --- | --- |
| 1. Nominal/success | Existing successful poll and diagnostic/recovery relay cases; new fixed-ID successful reconciliation |
| 2. Negative/malformed | Forged origin/event collisions, malformed persisted journal and invalid remote payloads |
| 3. State transitions | New run A→B→no-run journal and scoped recovery checks |
| 4. Idempotency/retry/cancel/recovery | Lost successful create, upload, final visibility response; stable file-ID reuse after reconstructed journal |
| 5. Concurrency/order/staleness | Overlapping journal calls, repeated 1s ticks, relay ingestion and stale-run separation |
| 6. Persistence/restart/integrity | Journal restart preserving original run, unsent count, pre-generated remote ID and overflow |
| 7. Identity/authorization/privacy | Origin run/device binding, hashed run correlation, event identity conflict blocks, redacted failure fields |
| 8. Contracts/integration/compatibility | Existing command/result/lease tests; diagnostic record kind remains separate from shipping data |
| 9. Architecture/ownership/invariants | Original frozen guard/budget and P1 exhaustive export inventory preserved for PHX-CI re-evaluation |
| 10. E2E/fail-closed/destructive | Failed or ambiguous remote publication remains pending; no false result receipt, no physical dispatch or product sync |
 
**Current qualification:** Initial corrective PHX-CI run BLOCKED; latest bounded compiler correction is not yet qualified. The next authorized operation is a new, exact-SHA, unchanged pinned Windows PHX-CI **software-only** run via the existing repository-controlled PHX-CI launcher. Do not fabricate test totals or acceptance. Physical execution, shipping promotion, installation and release remain prohibited.

## R4 corrective source PHX-CI — blocked at focused test compilation (2026-10-25)

- Submitted immutable corrective source `c39bad0717244044f72739f151a8833928410495`, tree `e7df3c3ef0ab3a992b41ddbd35114b97f092de3c`; original Windows PHX-CI run ID `03aee3d0-bd29-4215-8201-eeb93b7769a5`, framework SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, published evidence commit `eab9bab72667581d6853c7d26ab6e2818eaf4412`. Exact original JSON `dev/test-results/20261025T200014Z-operator-build-bvp-poll-error-observability-20261025-c39bad071724.json`, with matching terminal log and summary plus `dev/_ca-output.{md,json}`.
- **Authentic result: change-set FAIL, repository PASS, overall BLOCKED, exit 201**. Root product tests 1,292/1,292 PASS; `typecheck` PASS. The focused BVP `npm run test:bvp-root` returned compiler exit 2 before any BVP focused tests were run: `TS1308` at `test-platform/test/s08d-drive-mailbox-relay.test.ts:270:132`. The test passed an `await mailbox.reserveDiagnosticId()` expression inside a non-`async` `assert.rejects` lambda. Later focused, build, repository-check and artifacts stages were not qualified.
- Narrow correction `70b06f4d847566b7bd4222a5ba2ba78e6b0e4b79`: evaluate and await the reserved ID **before** constructing the rejecting lambda, preserving the original media-upload-failure oracle and all functional code. No standalone executable test or PHX-CI run has been performed on this latest correction; it is **UNQUALIFIED**. The compilation failure prevents R4 from serving as a full qualification, and a bounded exact-source software-only PHX-CI rerun is necessary. Preserve all prior evidence and never claim that exit 201 means success.

## R5 corrective PHX-CI source qualification — PASS / REVIEW PENDING

- Immutable source `5465f3a44a10943d71dd6aa39f73cad47efd076b`, verified Git tree `9452eb587b4e5bd09fb28b0e13545bea7e688a29`; exact pinned framework SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`.
- Original PHX-CI run `096ba9a5-aba5-41e8-84b9-1c7990d906e6`, evidence commit `2c028c9b69941b15634fd3ec79b1e8f923cc9689`, a direct child of this exact source SHA. Original flat evidence at `dev/test-results/20261025T200944Z-operator-build-bvp-poll-error-observability-20261025-5465f3a44a10.{json,log,md}`; exact original Git blobs also mirrored without byte changes under `dev/test-results/096ba9a5-aba5-41e8-84b9-1c7990d906e6/`, including explicit provenance.
- Actual Windows software-only verification: **11/11 stages PASS**, change-set PASS, repository PASS, overall PASS, exit **0**, BVP focused **566/566 PASS**, product **1,292/1,292 PASS**; typecheck, build, artifacts and repository architecture check PASS. No PHX-CI runtime, frozen manifest, budget, shipping sync behavior or physical device was modified.
- The previous R1 independent final review's CORRECTION REQUIRED remains historically valid for R3 source `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64` only. F01/F02/F03 corrective code and adversarial tests have now passed PHX-CI but independent sufficiency/ten-family/security assessment of the **new R5 source** is still pending. F04 R1 blind-procedure disclosure and F05 run-ID original-evidence mirror are preserved. This R5 mirror is administrative, not another run.
- Builder→Reviewer **handoff-count 3** is published separately as feature-scoped metadata; pass 1 must limit itself to neutral normative requirements/architecture and exact qualified production source, freezing a fresh blind assessment before reading Builder history, tests or PHX-CI evidence. No deployment, promotion, installation, physical Drive/vault effects, iPhone/iPad command dispatch, merge or release is authorized.

## R2 Builder correction checkpoint — budget decision pending (2026-10-25)

The Owner approved a bounded, read-only historical-run and device-scoped unbound diagnostic extension to the **existing** authenticated BVP mailbox; this did NOT authorize changes to frozen numerical budgets. Four test-first R2 regression scenarios were committed at `44b31bb8d6ca9516d430eae85998b939a6bbde1b`, with fixture token correction `64d5ca6b852f3fe0f45261c1e7fb463f07849c3c`. These tests are NOT EXECUTED and NOT PHX-CI qualified. No implementation source or frozen governance file has changed since the R5 PASS source.

A nonexecuting three-file candidate footprint estimate is +40 core and +40 live logical lines, against previously measured 4468/4500 core and 879/950 live. Estimated next totals: **4508/4500 core (over by 8)** and **919/950 live (within by 31)**. This is a source estimate, not an authoritative PHX-CI measurement. The implementation was therefore stopped before source mutation. The next required Owner decision is a quantified increase in core budget **4500 to 4550 (+50)**, with live budget unchanged at 950. Neither architecture approval alone nor these unqualified tests permit changing the frozen budget, running physical tests, handoff advancement, or claiming software acceptance.

## Owner authorization: framework-core expansion (2026-10-25)

The Owner explicitly answered YES to the separate amendment of the BVP framework-core limit from 4,500 to 4,550 logical TypeScript lines (+50), with the live-device/relay limit remaining 950 and all other limits unchanged. The earlier YES for a read-only historical-run and unbound-device diagnostic extension to the existing authenticated BVP mailbox remains valid. The test-first regression commits are `44b31bb8d6ca9516d430eae85998b939a6bbde1b` and `64d5ca6b852f3fe0f45261c1e7fb463f07849c3c`. The connected GitHub write to the frozen architecture lock was blocked; therefore the budget change is NOT yet applied, the implementation is NOT built, and no new PHX-CI qualification exists. Preserve original evidence and handoff-count 4. Do not exceed the effective frozen limit until its authorized update is actually published.

## R6 original Windows PHX-CI — substantive FAIL / R7 corrective checkpoint (2026-10-25)

- Source SHA `2bb4e3a1fb211b83579dc797e21ee047a869606a`; tree `a0b20bb8cfffaed12534af6f24580086e9809f77`. The Owner executed the unchanged pinned Windows software-only PHX-CI at runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; original run `e5dfbe24-7a98-4ad6-9e0e-3a7dd7ff9d2d`, original evidence commit `06f488c2ab64e532ce0967113f8ec9a72f8c9ac0` (direct child of source SHA). Original immutable flat JSON, Markdown and log are under `dev/test-results/20261025T215430Z-operator-build-bvp-poll-error-observability-20261025-2bb4e3a1fb21.{json,md,log}`. Do not modify or replace that original evidence.
- **AUTHENTIC VERDICT:** change-set FAIL; repository PASS; overall BLOCKED exit 201. Typecheck PASS; focused **567/571 PASS; 4 FAIL**; product **1292/1292 PASS**; build, repository-check, check and artifacts not reached. The four failures are: (1) architecture baseline asserting prior `4500`, (2) frozen-manifest exact-ceiling regression expecting `4500` despite Owner-approved DEC-353 core `4550`, (3) malformed addressed diagnostic classification mismatch, (4) R1-era unbound-error local-only assertion in contradiction with the Owner-authorized device-scoped unbound delivery path.
- R7 minimal substantive correction adjusts the architecture tests to **4550** while preserving *both* at-ceiling PASS and at-`4551` FAIL and live-device hard ceiling **950**; validates malformed diagnostic JSON by publishing appropriately addressed but invalid JSON content, and emits the established safe `mailbox-record-malformed` classification; updates the old unbound case to require original null-run identity with no fabricated active run and successful bounded delivery. Corrections committed under `test-platform/test/architecture-metrics.test.ts`, `test-platform/test/s08d-drive-mailbox-relay.test.ts`, `test-platform/src/live-device/drive-mailbox.ts`. PHX-CI has not yet run on these corrections. No PHX-CI runtime/pin, frozen manifest/guard, shipping sync, device, actual Drive/vault or physical test changed.
- Owner-executed **R7** PHX-CI is substantively justified because four R6 focused tests FAILED, the corrective source changed, and R6 later build/architecture checks never ran (operating protocol §37.1). Preserve unchanged original R6 evidence and handoff count **4**, recipient **BUILDER**, until new complete PHX-CI PASS and evidence publication. Do not issue Reviewer handoff yet; no merge, installation, release, promotion, physical dispatch or live Drive/vault operations.
