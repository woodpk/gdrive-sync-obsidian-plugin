# DEC-352 / WS-07 — R2 Final Independent Architectural, Correctness, Security and Governance Review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED** for complete DEC-352 runtime error observability. The revised R5 implementation repairs the previous same-event duplicate-creation defect and correctly binds local journal origin, but three material **end-to-end reachability / retention** gaps remain. Genuine PHX-CI PASS qualifies precisely the tested implementation; it does not substitute for requirement-complete independent acceptance.

## Intake and immutable identities

- Repository: `woodpk/gdrive-sync-obsidian-plugin`.
- Feature/decision: `WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY`, DEC-352.
- Branch: `build/bvp-poll-error-observability-20261025`.
- Incoming **state commit**: `5bb3016cbdb1578f4dcb0cf95e99247db120d47c`. Fresh branch compare returned **IDENTICAL** at intake; exact reviewed source SHA is ancestor by 4 published evidence/metadata commits.
- Authorized **feature-specific** `bvp_poll_error_observability_2026_10_25` state: handoff-count **3**, sender/owner BUILDER, recipient REVIEWER, feature ID exactly as above, source `5465f3a44a10943d71dd6aa39f73cad47efd076b`. The distinct top-level `BVP_CLI_RESULT_FINALIZATION` handoff belongs to another feature and must not be changed.
- Immutable qualified **source SHA**: `5465f3a44a10943d71dd6aa39f73cad47efd076b`; **verified tree**: `9452eb587b4e5bd09fb28b0e13545bea7e688a29`.
- Neutral governing task: `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-runtime-poll-error-observability-2026-10-25.md` normative requirements, scope, ten families and gates; locked DEC-352; WS-07 architecture; frozen testing-platform boundary.

## Two-pass sequence and limitation

**Pass 1 published first**: `dev/reviews/bvp-runtime-error-observability-20261025-r2-source.md`, immutable publication commit **`99610fd9d8c2be5aed6d1fd21f274110d40d9b1d`**. The source-only report was frozen before any new-candidate authored test file, prior review, source diff/history, or original PHX-CI evidence was opened in this turn. Normative task retrieval was specifically limited to **lines 1–48**, avoiding its lower Builder narrative. Source inspection used exact frozen SHA.

**Honest independence limitation:** This same chat previously reviewed the *earlier* DEC-352 candidate and reported findings. The Reviewer cannot claim historical zero-prior-exposure or a brand-new-session blind review. The current candidate was nonetheless assessed on its own source before retrieving the corrected tests/evidence, with this limitation openly disclosed. A separate clean-session reviewer is needed if the governance authority interprets blindness as zero prior feature knowledge, not merely current-candidate access ordering.

## Original Windows PHX-CI evidence: real PASS and exact candidate binding

- **Original R5 PHX-CI run:** `096ba9a5-aba5-41e8-84b9-1c7990d906e6`.
- **Original evidence publication commit:** `2c028c9b69941b15634fd3ec79b1e8f923cc9689`; source→original evidence compare is exactly one evidence-only commit modifying `dev/_ca-output.{json,md}` and creating the original flat result JSON/MD/log. No source/tests were modified by that publication.
- **Original flat JSON:** `dev/test-results/20261025T200944Z-operator-build-bvp-poll-error-observability-20261025-5465f3a44a10.json`; original Git blob `a166f55dfc075af82ab184020a46407bb76611ba`.
- **Canonical run-ID mirror:** `dev/test-results/096ba9a5-aba5-41e8-84b9-1c7990d906e6/`, provenance.md; original and mirrored **result.json, result.md, terminal.log have identical Git blobs** respectively `a166f55dfc075af82ab184020a46407bb76611ba`, `371beea11d4a2134f31091733ec1f21b28822c86`, `7481764e08b31918eb6dab1d621722c1ce514111`. No missing evidence-folder issue remains.
- R5 evidence `repository.verifiedHead=5465f3a44a10943d71dd6aa39f73cad47efd076b` and `repository.verifiedTree=9452eb587b4e5bd09fb28b0e13545bea7e688a29`, exact match.
- Framework pinned SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`, version `0.2.0-dev.2`; Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- **All 11/11 stages PASS, exit 0**: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Change-set PASS, repository PASS, overall PASS.
- **Focused BVP: 566/566 PASS**; **full product: 1292/1292 PASS**. Test counts overlap and are not added into a unique-test total. The **seven newly authored** `DEC352-F01/F02/F03` cases (focused #419–425) were each individually verified PASS in original PHX stdout, in addition to original DEC-352 cases #410–418.
- BVP repository guard PASS: `FRAMEWORK_CORE_LOC=4468/4500`, `LIVE_DEVICE_AGENT_RELAY_LOC=879/950`; `BVP_REPOSITORY_CHECK_RESULT=PASS`, devRoot/shippingArtifact/guard/metrics exits all 0, no new forbidden surfaces reported. `changeClass=authorized-governance` relates to previously Owner-authorized DEC-349 frozen-budget baseline, not a new DEC-352 blanket dispensation. The reviewed correction diff makes no PHX-CI pin, frozen lock, shipping `src/**`, or production seam changes.
- **No Reviewer PHX-CI/test execution. No live iOS, real Drive/vault, installation, merge or prerelease acceptance.**

## Prior findings: independent dispositions on corrected source/tests

### DEC352-F01 (previous HIGH) — PARTIALLY CORRECTED; historical-run receiver completeness OPEN

The revised `test-platform/src/bvp-runtime-error-journal.ts` stores `DiagnosticOrigin(runId,deviceId)` with each event, rejects tampered origin by comparison against privacy-derived hashed identity and coalesces only within same bound run. `validation-entrypoint.ts` resets `activeRunId` on each poll, and `journal.flush` passes each *entry's immutable origin* to the authenticated mailbox. Tests prove A/B/no-run journal isolation, restarted journal persistence and no misrouting through a callback. This **closes the earlier wrong-current-run stamping bug**.

**R2-F01 — HIGH OPEN: remote historical-run events are not durably exposed by the Windows receiver once that run loses the active controller lease.** In `drive-mailbox.ts` the relay's diagnostic ingest enumerates `<root>/controller-authority`, selects only each current `lease.runId`, and calls `mailbox.diagnostics(lease.runId,lease.deviceId)`. After offline run A is superseded by B, a pending A event can correctly publish to Drive under A but **the relay only reads B**. No historical-bound-but-superseded run enumeration, authorized replay queue, or alternate delivered-to-controller record exists. The corrective A→B test flushes journal entries to a custom callback; it **does not exercise actual Drive+Windows relay ingestion across a lease change**. An event can thus be safely attributed and safely stored yet remain invisible to the expected Windows inbox permanently. This fails normative DEC-352 item 4's *collect/durably expose addressed origin-correlated records* and the offline-delivery intention of items 2/3.

**Required closure:** Add an authorized, bounded, read-only historical-diagnostic replay path, preserving originating run/device, lease authority and no physical-command dispatch. Test offline A failure → switch controller lease to B → reconnect → event delivered under origin A **and** observable in Windows receiver without current A lease, plus restart and no cross-run leakage. Do not simply rebind A to B.

### DEC352-F02 (previous HIGH) — CLOSED for exact in-memory/fake-Drive software scope

A Drive-generated `remoteFileId` is durably stored *before* publishing, reused after restart, matched against server metadata and existing event ID, with read-back of media/visibility and strict conflicting origin/payload rejection. `s08d-drive-mailbox-relay.test.ts` tests lost successful response after create, media upload, and visibility PATCH, then restart/retry. For all three, one exact remote Drive object survives; no duplicate or false deliveredCount. Companion tests reject conflicting origins/payloads and duplicate server records. All pass in original R5 PHX evidence. This closes the original nonidempotent retry bug for the tested deterministic mock. It **does not** establish real Google Drive consistency or physical-device acceptance.

### DEC352-F03 (previous MODERATE) — CORE COOLDOWN CORRECTED; retention obligations OPEN

`BvpRuntimeErrorJournal.acquireDeliveryWindow` persists the next eligible publication time and enforces a **30-second minimum retry window** for bound pending events. The installed-agent test injects a continuous remote outage, confirms one initial attempt across 20 more ticks and a second attempt only after the cooldown; restart test confirms the gate survives. Serial journal and fail-closed overflow tests pass. Recursive publication errors are kept unbound locally rather than sending a self-referential message.

**R2-F02 — HIGH OPEN: diagnostic history is unbounded on Drive and will eventually disable per-run diagnostic ingestion.** `drive-mailbox.ts` creates one distinct file per diagnostic event. Local 24-entry journal bounds only *local retained entries*; the remote `diagnostic` file count is not pruned. The mailbox `cleanup(runId,deviceId)` deletes **only** command/result/run-binding record kinds and explicitly omits diagnostic. `listing("diagnostic",runId,deviceId)` uses Drive pageSize=200, and `records()` fails whenever `nextPageToken` appears with `mailbox-current-run-overflow`. Under sustained events on one run/device, earlier delivered local entries can be evicted, permitting creation of additional remote events; after more than 200 diagnostic records, the receiver repeatedly reports unavailable and cannot ingest **any** of those pages, even though each record is valid. The ten-family tests inject a local 24-entry overflow but **never prove bounded remote retention nor recovery after a multi-page diagnostic history**. This violates task item 5 (no unbounded logs) and item 4 (durable relay observability).

**Required closure:** Define an Owner/authority-compliant bounded remote retention/archive policy **or** authenticated pagination with a bounded per-cycle cursor/checkpoint and eventual complete ingestion, plus safe lifecycle cleanup, without destroying unresolved diagnostic evidence. Test >200 unique historical remote records, restart and no loss/forever-unavailable behavior. Do not delete unresolved telemetry merely to pass the cap.

### R2-F03 — MODERATE OPEN: unbound runtime faults are retained locally but never enter any remote delivery path

On `activeRun()` failure (network/auth/remote binding unavailable), `pollCore` cannot establish a run, so `tickCore` records an `origin.runId:null` event. It similarly records relay and diagnostic-publication exceptions as unbound. `journal.acquireDeliveryWindow()` and `flush()` skip all such events **indefinitely**, even after transport recovers. The new F01 test explicitly verifies unbound entries remain undelivered, which establishes safe no-misattribution but **not** an observability channel on the Windows receiver. The local `.bvp-relay/runtime-errors.json` remains an inspectable, durable source of truth, but DEC-352 explicitly calls for observability of authentication/network failures and publishing pending diagnostics when available. No authenticated device-scoped unbound-diagnostic reporting route or operator-visible local retrieval/reconciliation is proven.

**Required closure:** Define a privacy-safe, authenticated **unbound/device-scoped** telemetry route or an equivalent independently accessible operator path that makes such failures reliably observable without fabricating a run ID, forging a command acknowledgment or weakening lease security. Test failed active-run discovery while offline → connectivity restored → Windows receiver/operator can observe the original fault with an explicitly unknown run association. If the Owner decides local-only unbound telemetry satisfies requirements, record that explicit limitation/decision as a binding authority before accepting.

### R2-F04 — MINOR governance note

The current-candidate blind access order was preserved, but reviewer had prior-feature knowledge from the earlier R1 review in this same conversation. It is disclosed in the frozen source report. This cannot be represented as zero-prior-exposure independent blindness, and strict governance may require a separate fresh Reviewer session.

## Mandatory ten-family test adequacy

| Family | R2 verdict | Original proof and remaining obligation |
| --- | --- | --- |
| 1. Nominal | ADEQUATE | Good poll, local journal creation, bounded remote publication, relay inbox |
| 2. Negative / malformed | ADEQUATE for bounded paths | Invalid codes, tampered origins/journal, malformed lease, failed upload, safe errors; unbound reporting R2-F03 |
| 3. State transitions | PARTIAL / BLOCKING | A/B/no-run origin is preserved in journal; historical A events are not collected after B takes active lease (R2-F01) |
| 4. Retry / idempotency | ADEQUATE in tested mock | Stable remote ID and lost create/upload/PATCH response tested; 30s cooldown and restart |
| 5. Concurrency / ordering | PARTIAL | Per-instance serialized journaling and relay non-reentrant; no multi-page receiver or long remote lifetime invariant |
| 6. Persistence / restart | PARTIAL / BLOCKING | Local restart, remote ID and cooldown persist; historical-run receiver delivery and >200 remote event ingestion absent |
| 7. Identity / privacy / security | PARTIAL / BLOCKING | Opaque run hash and verified source origin prevent misroute, but historical B lease cannot retrieve A's record and no unbound operator route |
| 8. Compatibility / public contract | ADEQUATE for simulation | Separate diagnostic record kind, existing command/result semantics, nonshipping artifact isolation |
| 9. Architecture / ownership | ADEQUATE for qualified code | PHX 11/11 PASS, 4468/4500 core, 879/950 live, no new frozen change, standard pinned framework |
| 10. End-to-end / fail-closed | **INADEQUATE** | A→B→relay history, >200 remote events and unbound network/auth reconciliation are absent |

**Acceptance-critical test adequacy remains incomplete**, notwithstanding all 566 authored focused tests passing.

## Final direction

**CORRECTION REQUIRED — NOT ACCEPTED.** Prior WRONG-RUN attribution logic and same-event duplicate remote creation have been corrected, but source-level R2-F01 and R2-F02 are HIGH completeness/retention blockers, with R2-F03 MODERATE. The exact R5 PHX-CI PASS and immutable evidence remain true and must not be rewritten, deleted or misrepresented.

After publishing this final report, advance only DEC-352's **feature-specific** `dev/state/current-state.yaml` handoff **3 → 4**, outgoing REVIEWER, recipient BUILDER, status `CORRECTION_REQUIRED_R2_REVIEWER_TO_BUILDER`. Preserve unrelated top-level active-unit fields and original evidence.

Builder must first derive failing, requirements-traceable independent tests for historical-run relay visibility, remote history growth/pagination, and unbound authentication/network observability. Correct only authorized BVP validation-only source within DEC-352 / frozen limits (current core at **4468/4500** has 32 lines of headroom); if budget or architecture authority prevents sound solutions, STOP and request an explicit Owner architecture decision rather than hiding code or relaxing guard. Requalify any new exact candidate via unchanged pinned local Windows PHX-CI and publish original evidence, then issue a fresh Builder→Reviewer handoff only after genuine PASS. No production/code/test/script/evidence writes, test execution, merge, install, release, physical device dispatch or live Google Drive/vault operations by Reviewer.
