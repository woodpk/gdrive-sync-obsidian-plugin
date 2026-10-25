# WS-07 / DEC-352 — R3 FINAL Independent Architecture, Correctness, Security and Governance Review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.** Exact R7 Windows PHX-CI validation **PASS** is authentic, and the preceding HIGH defects in historical-run reachability, unbound telemetry and device-wide bounded-page ingestion are substantively corrected. However an independent remote-origin integrity flaw remains in the new device-scoped reader, and the explicit remote lifetime bound on diagnostic logs has not been established. Neither may be waived merely because all authored focused tests pass.

**Date:** 2026-10-25
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Feature:** `WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY`; authority DEC-352, narrow extension DEC-353
**Branch:** `build/bvp-poll-error-observability-20261025`
**Exact reviewed source SHA:** `3e1c002450dddce140ba6ede0fd83ceaf13ff2de`
**Exact verified Git tree:** `d9c5ab1fce31b7cb4a51f0543277d62a2a0691fe`

## 1. Live authorization, two-pass protocol and limitations

The incoming **state commit** `36b28e7cb55c7067e8241533db4fdcca9de7d709` matched the branch HEAD **IDENTICAL** when fetched. The canonical feature-specific `bvp_poll_error_observability_2026_10_25` block binds handoff **count 5**, owner/sender **BUILDER**, recipient **REVIEWER**, exact feature ID and SHA. The top-level `BVP_CLI_RESULT_FINALIZATION` handoff is a different work unit and is not modified by this review.

**Frozen source-only Pass 1:** `dev/reviews/bvp-runtime-error-observability-20261025-r3-source.md`, immutable publication commit **`006bfa0ee25a88e92f0b86420877972a7202ac7c`**, published **before** authored tests, original PHX evidence, previous reports or source diffs/history were opened on this R7 candidate. DEC-352, DEC-353, neutral task lines 4–48, frozen boundary and architecture were read first; then source at exact SHA. Pass 1 reports source-only strengths and provisional retention/cursor concerns.

**Independence limitation:** The same ChatGPT conversation previously reviewed two DEC-352 candidates; there is no plausible claim of zero historical knowledge. The current candidate's source-before-tests/evidence ordering was preserved, but strict fresh-agent historic blindness requires another session. Source findings herein are directly grounded in new immutable implementation, not earlier summaries.

## 2. Independently verified exact immutable R7 PHX-CI evidence

**Original run:** `60ef927e-5985-4163-985a-6583fa83b888`.
**Original evidence publication commit:** `6b0080a85e1d40ef140d6f550445a9d847c70573`.
**Original flat result JSON:** `dev/test-results/20261025T220333Z-operator-build-bvp-poll-error-observability-20261025-3e1c002450dd.json`; **original Git blob SHA:** `8eb30776b95db43bd11f11f09bbdfee93ae36a49`. Original `.log`, `.md`, `dev/_ca-output.json` and `dev/_ca-output.md` exist in the same evidence-only publication. Git source→evidence compare is **one commit modifying exactly those five evidence files**, not production/tests. Evidence→intake state compare changed only feature planning and state.

- Evidence `repository.verifiedHead = 3e1c002450dddce140ba6ede0fd83ceaf13ff2de`, **exact**.
- Evidence `repository.verifiedTree = d9c5ab1fce31b7cb4a51f0543277d62a2a0691fe`, **exact**.
- Installed pinned PHX-CI runtime from `phx-ci.json`: `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, framework `0.2.0-dev.2`.
- Original environment: Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- **11/11 stages PASS, exit 0**: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check and artifacts. Change-set PASS, repository PASS, overall PASS.
- **Focused BVP 571/571 PASS**, **product 1292/1292 PASS**, zero skipped/fail. These suites overlap; counts are not additive.
- Original stdout explicitly identifies **PASS** of `DEC-353 owner-approved core and live frozen ceilings reject one extra logical line` and five R2-specific DEC-352 cases: delayed run A under B lease, **231** paginated historic entries, unbound delivery, cross-device forged origin marker, and local-only publication failure.
- Repository guard PASS: framework core `4469 / 4550` and live-device agent/relay `919 / 950`, frozen manifest as Owner-approved DEC-353. Repository check devRoot0/shippingArtifact0/guard0/metrics0 and `changeClass=authorized-governance`. That class covers explicitly authorized DEC-349/353 governance changes, not future bypass.
- **Original canonical run-ID evidence mirror not found:** `dev/test-results/60ef927e-5985-4163-985a-6583fa83b888/result.json` returned NOT_FOUND on intake state. The original immutable flat evidence remains genuine; a later byte-identical, provenance-preserving run-ID mirror is a narrow administrative closeout obligation, not a new PHX verification. Do not claim it already exists.
- No Reviewer validation executed, no installed artifact/real iOS or personal Google Drive execution, and no physical release acceptance is implied.

## 3. Previously open independent issues — status at exact R7 SHA

**Previous R2-F01, historical run A diagnostics under current B lease: CORRECTED in ordinary software scope.** `createWindowsMailboxRelay` now enumerates controller-approved device identities and uses a read-only `diagnosticsForDevice(deviceId,pageToken)` route that includes both historical bound-run records and run-unbound records. Test `DEC352-R2-F01` verifies a run-A offline event reaches inbox while B owns the active lease, and that an old run-A *command* remains in outbox and is denied. This does not grant historical command authority.

**Previous R2-F02, all-or-nothing >200 retrieval: CORRECTED as a pagination failure.** Reader obtains 25 records per device/page, writes them to inbox, then durably advances a device-specific cursor. Test loads **231** remote entries, reconstructs relay, and eventually verifies all 231 are persisted while each page is at most 25. This confirms per-cycle bounded progress and restart replay, **not** total lifetime remote retention.

**Previous R2-F03, run-unbound auth/network failure: CORRECTED in software scope.** BVP journal coalesces by known device even with null run; run-unbound records publish with explicit origin-unbound metadata and no fabricated run ID. The receiver obtains them under the authenticated device-only read path, never as command/result. The focused test checks retained coalesced occurrences, exact inbox origin `runId:null` and no synthetic command acknowledgment. Publication failures themselves remain intentionally local-only to prevent recursion; bounded no-recursion test passes.

**Previous F02, ambiguous create/upload/visibility idempotency: CLOSED in deterministic mocked transport.** Reserved remote file ID is persisted before Drive creation; reconciliation and confirmed media/metadata prevents a second remote object in tested lost-response cases.

## 4. NEW independent acceptance findings

### DEC352-R3-F01 — HIGH / OPEN — Remote bound-run identity can be reattributed by altering otherwise valid Drive metadata

**Neutral authority:** DEC-352's exact run/device source-origin correlation, privacy-derived run IDs, remote-safety and correct attribution; DEC-353 is read-only historical diagnostics, not a waiver of authentication or identity integrity.

**Exact source path:** `test-platform/src/live-device/drive-mailbox.ts` `diagnosticsForDevice(deviceId,pageToken)` reads `brainBvpRunId` and `brainBvpOriginBound` from remote `appProperties`, validates device match, run token shape and diagnostic JSON using `cleanDiagnostic()`, then constructs `origin:{runId:boundRun?rawRun:null,deviceId}`. **There is no comparison of the bound remote `rawRun` to the sanitized `safe.diagnostic.identity.runId` opaque SHA-256 token**, and no matching check in relay's newly created inbox path. The journal DOES check this association when loading local-origin journal files, so the omission in the remote ingress is significant.

**Demonstrable source-level failure case:** A record actually originating in run A has a valid safe diagnostic carrying `identity.runId=opaqueDiagnosticId("run-a","run")`. If remote metadata `brainBvpRunId` is changed to **another syntactically valid** `run-b` while the event ID, device ID, content and `brainBvpOriginBound` remain otherwise valid, the device-wide query accepts that record. It is persisted in the Windows inbox with **`origin.runId="run-b"` while the diagnostic identity still says run A**. This is incorrect attributed evidence, not just a harmless malformed-record warning, and defeats a core purpose of source-origin telemetry.

**Authored test gap:** `DEC352-R2 cross-device diagnostic retrieval and falsified remote origins fail closed` tests a different device and mutates `brainBvpOriginBound` to an invalid inconsistent marker, not a **valid run-A→run-B metadata substitution** with unchanged safe JSON. The test can pass despite this flaw.

**Correction:** The authenticated ingress must verify that a bound run's privacy-derived ID equals `opaqueDiagnosticId(rawRun,"run")`, with explicit well-defined safe behavior for unbound events, **before** returning any record or writing any inbox file. Malformed/mismatching records must be classified as unsafe, leave the inbox unchanged and never become command/result acknowledgment. Add adversarial bound A→B spoof, unbound marker/had-hash conflict, same-event cross-page conflict and genuine valid-origin control cases. This should not require new protocol, unapproved production modifications or physical execution.

### DEC352-R3-F02 — MODERATE / ACCEPTANCE-RELEVANT — Unbounded remote lifetime diagnostics remain without explicit retention decision

**Neutral authority:** DEC-352 normative item 5 explicitly prohibits **unbounded logs** while item 4 requires durable diagnostic evidence. These constraints need simultaneous satisfaction, not silent substitution of one for the other.

**Exact source:** `publishDiagnostic` creates one distinct Drive object for each new event, and `createDriveCommandMailbox().cleanup()` removes only `command`, `result`, and `run-binding` record kinds. `diagnosticsForDevice` paginates the entire retained device history but has **no total-retention/age/lifecycle cap**. `BvpRuntimeErrorJournal` has a local 24-event bound but evicts delivered events; with continued unique failures, remote record count can grow indefinitely. No owner-defined remote retention/archive exception appears in DEC-352 or DEC-353.

**Tests do not resolve:** The 231-record test proves paging throughput and explicitly asserts Drive files are *not deleted* to pass pagination. This is correct for unresolved evidence but not a lifetime retention policy. The implementation must not delete potentially unresolved events arbitrarily.

**Required:** Owner/supervisor clarify a bounded durable remote retention/archive policy, preservation and acknowledgment criteria, or specifically amend authority to accept unlimited historical telemetry despite 'unbounded logs' rule; after authorization implement/test a safe bounded lifecycle. This is a requirements acceptance gap, not a reason to weaken pagination or erase evidence.

### DEC352-R3-F03 — MODERATE / TEST-ADEQUACY — No recovery from expired remote pagination cursor

The relay persists Drive `nextPageToken` in `diagnostic-cursors` and reuses it after reconstruction. Invalid cursor metadata is rejected safely; **Drive-side cursor expiration/invalidation** on long-lived history is not handled by an explicit reset/reconciliation protocol, so a persistent bad remote page-token response can block future pages indefinitely. The 231-record test uses stable FakeDrive pagination and same-source reconstruction, not stale/expired tokens after history churn. Add an authenticated bounded recovery strategy (reset to first page, idempotently reconcile local inbox, avoid lost new events, confirm progress and retain safe UNKNOWN on failure) and an expired-token adversarial case. This can be treated as a lesser follow-up only if an explicit operator recovery procedure and fail-closed observability are documented.

### DEC352-R3-F04 — MINOR — Publication failure telemetry local-only by intentional recursion guard

`diagnostic-publication` failure records are excluded from further remote `flush()` to prevent self-recursive reporting. This is a defensible failure boundary, and the test verifies no endless retries. A remote observer cannot read them; operators must inspect the on-device BVP journal / fixed fallback. Do not represent a remote diagnostic failure as remotely delivered.

### DEC352-R3-F05 — MINOR — Original run-ID evidence mirror missing; historic reviewer exposure

The R7 original flat evidence and identity are genuine but the canonical run-ID mirror is not yet published. Add identical-byte mirror with provenance at closeout. This ChatGPT session includes earlier DEC-352 reviews; its Pass 1 source-first access order is valid, but **zero-prior-feature-knowledge blindness cannot be claimed**. If governance strictly requires it, obtain an independent fresh-session Reviewer when corrected.

## 5. Independent ten-family test adequacy

| Mandatory family | Status at R7 | Grounded proof / missing acceptance oracle |
| --- | --- | --- |
| 1. Nominal | ADEQUATE software-only | Healthy poll, distinct diagnostic publish, inbox receipt, run/device scoping |
| 2. Boundary/negative | PARTIAL | Malformed marker and cross-device record blocked; valid A→B remote metadata spoof not tested (F01) |
| 3. State transitions | ADEQUATE for modeled A/B/offline | Old run observed under new lease without old command privilege; unbound recovered |
| 4. Idempotency/retry | ADEQUATE for mocked cases | Reserved stable ID, lost create/media/visible response, durable 30s retry cooldown |
| 5. Concurrency/order | PARTIAL | Single-flight poll/relay and serialized journal, 25/page; stale Drive cursors and history churn not exercised (F03) |
| 6. Persistence/restart | ADEQUATE for stable cursor | Local journal and relay cursor persist, 231 records delivered after reconstruction; no expire/reset oracle |
| 7. Identity/privacy/security | **INADEQUATE — BLOCKING** | Device match and safe JSON are validated independently; bound metadata-to-diagnostic run hash link missing (F01) |
| 8. Public-contract compatibility | ADEQUATE | Distinct diagnostic kind, history read-only, commands/results remain separately authorized |
| 9. Architecture/governance | ADEQUATE qualified software | Authorized DEC-353 budget 4550/950, exact R7 PHX 11/11 PASS, shipping isolation |
| 10. End-to-end/fail-closed | PARTIAL / BLOCKING | A→B, >200, unbound cases PASS, but A→B forged metadata accepted and remote lifetime bound unspecified |

**Ten-family acceptance is incomplete despite 571 authored focused tests passing.**

## 6. Decision and authorized continuation

**VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.** The prior R2 functional blockers are substantially corrected, but R3-F01 is a source-grounded origin-integrity defect and R3-F02 is an unresolved mandatory bounded-log requirement. R3-F03 is an adversarial durability gap. Exact PHX-CI R7 PASS remains truthful and complete for the reviewed source; it does not independently prove those untested cases.

On publication, Reviewer is authorized to change only the DEC-352-specific handoff metadata in `dev/state/current-state.yaml`: count **5→6**, outgoing REVIEWER, recipient BUILDER, status **R3_CORRECTION_REQUIRED_REVIEWER_TO_BUILDER**, immutable reviewed source preserved. Top-level unrelated handoff and all original source, tests, scripts and evidence must remain unchanged.

Builder next: refresh GitHub, read this report and DEC-352/DEC-353 authority; author adversarial run-hash/metadata-tamper and cursor-expiry tests first. Resolve bounded remote lifetime retention only through an Owner governance decision if safety/authority requires; do not delete unresolved remote diagnostics, add a second protocol or exceed Owner limits. Correct only authorized validation-only code and requalify new exact source via unchanged pinned Windows PHX-CI, publish original immutable evidence, and hand off only after real PASS. No merge/install/release, live Drive/vault or physical device operations are authorized. Reviewer performed no test execution or implementation/evidence mutations.
