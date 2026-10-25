# BVP — Durable receiver and relay error observability (2026-10-25)

**Status:** OWNER-AUTHORIZED SOFTWARE BUILD; NOT PHX-CI QUALIFIED; NO PHYSICAL DISPATCH/RELEASE.
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
