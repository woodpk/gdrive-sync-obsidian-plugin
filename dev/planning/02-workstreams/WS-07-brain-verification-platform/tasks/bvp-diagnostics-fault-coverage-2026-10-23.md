# DEC-348 BVP diagnostics — fault/acceptance coverage

**Status:** Builder-authored code and tests; changes since the first accepted PHX-CI diagnostic slice are **NOT VERIFIED** until a new exact-source Windows PHX-CI PASS. Simulation and mock evidence are not physical iPhone, live Google Drive or live Obsidian proof.

## Source-grounded acceptance map

| # | Failure family | Contract test location | Safe observations asserted | Remaining proof |
| --- | --- | --- | --- | --- |
| 1 | Invalid scenario / preflight input | `test-platform/test/bvp-diagnostics.test.ts` — invalid preflight scenario; existing `test-platform/test/scenario-contract.test.ts` | Explicit `invalid-scenario`, scenario-preflight, non-dispatch, private fields withheld | PHX-CI R4 |
| 2 | Windows-hosted simulator step exception and expected failure | `test-platform/test/bvp-diagnostics.test.ts` — step exception; simulated assertion; existing `scenario-runner.test.ts` | Stable step/phase, actual outcome, unknown effect, canonical evidence | PHX-CI R4 |
| 3 | Unavailable simulated state / observation | Existing `scenario-evidence.test.ts`, `scenario-runner.test.ts`, `s07b-state-cursor-listing-root-recovery.test.ts` | Typed simulated state/observation failures, no fabricated success; shared runner now adds diagnosis | Explicit R4 coverage appraisal |
| 4 | Relay outbox write error before publication | `bvp-diagnostics.test.ts` — relay write failure | `relay-outbox-write-failed`, command-queue, prepared only, no claim of delivery | PHX-CI R4 |
| 5 | Drive auth/permission/rate/provider/network error | `bvp-diagnostics.test.ts` — Drive HTTP families | 401/403/429/503/400 and thrown network classified without raw request/error | PHX-CI R4 |
| 6 | No reply after command queued | `bvp-diagnostics.test.ts` — missing live response; `s08e-external-live-executor.test.ts` | Last confirmed outbox write, first unconfirmed receipt; delivery/effects UNKNOWN | PHX-CI R4; no claim of Drive publication |
| 7 | Invalid, stale, duplicate, conflicting or malformed receipt | `bvp-diagnostics.test.ts` — malformed receipt; `s08e-external-live-executor.test.ts` — correlation cases; `s08d-drive-mailbox-relay.test.ts` — duplicate/reorder | Separate malformed vs mismatch, preserve malformed/mismatched evidence; no false success | PHX-CI R4 |
| 8 | Device agent identity and sequence rejections | `s08c-device-command-agent.test.ts` — run/device/stale/sequence checks | Device rejects wrong or stale commands; no extra dispatch; generic runner diagnoses failed outcomes | PHX-CI R4 |
| 9 | Device handler fault or write-ahead state finalization | `s08c-device-command-agent.test.ts` — new claimed-handler and finalization tests; `s08d-drive-mailbox-relay.test.ts` — diagnostic roundtrip | Claim persisted; handler or durable result uncertain; original exception never shared; replay forbidden | PHX-CI R4 |
| 10 | Battery result/evidence persistence unavailable | `bvp-diagnostics.test.ts` — live + deterministic result-file write faults | Separate JSON diagnostic, nonzero exit, no raw file path or stack | PHX-CI R4 |
| 11 | OAuth/secret/private path in exception and untrusted fields | `bvp-diagnostics.test.ts`; `s08c-device-command-agent.test.ts`; `s08d-drive-mailbox-relay.test.ts` | Safe allowlist for diagnostics, no raw private exception text; raw device ID pseudonymized in canonical live evidence | PHX-CI R4 and Reviewer privacy audit |
| 12 | Ordinary PASS and intentional expected failure semantics | Existing BVP test suite, `scenario-runner.test.ts`, `s08e-external-live-executor.test.ts` | Existing successful flow, result correlation, expected failure and absence-of-retry semantics retained | Full PHX-CI R4 |
| 13 | Outer bridge unexpected error vs known failure | `bvp-diagnostics.test.ts` — bridge error fallback; existing physical bridge unit tests | Safe known failure code vs bounded unexpected fallback, no assertion of physical dispatch; no device execution | PHX-CI R4; no physical dispatch authorized |
| 14 | Windows relay lost authority / unavailable transport | `s08d-drive-mailbox-relay.test.ts` — missing lease and outage | Safe reason, verified read boundary, first unconfirmed lease/publish stage, effects UNKNOWN, queued command retained | PHX-CI R4 |

## Current architecture and operational boundaries

- Owner's `DEC-349` approves only BVP core **4,500** and live-device **950** logical TypeScript lines. All other frozen guards are intact.
- The first limited implementation slice already had genuine Windows PHX-CI PASS: source `5c8d34ad9bee7f968eee47f5d8d26c2d27a7eb96`, run `6b6dd05b-33e2-4b63-ac29-3088477fdf64`, evidence `569efcb54c75826b31c7d70a19193020ed7bb293`. **These identities do not qualify subsequent modifications.**
- BVP operating tests remain direct BVP responsibilities under `DEC-346`, not operated through PHX-CI. PHX-CI is used for software-build/change qualification only.
- Current feature changes require a fresh **Windows, software-only, authorized-governance** PHX-CI PASS. No iPhone/iPad hardware, installed Obsidian, production vault, live mailbox, release or Reviewer handoff is authorized by this matrix.
- The independent Reviewer must verify source-to-contract fit, all ten mandatory test families, failure boundaries, security/privacy, evidence and current source identity after Builder completes qualification. A test-count PASS alone is not independent acceptance.
