# WS-07 / DEC-352 — FINAL Independent Review: Runtime Failure Observability

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED.** The exact Windows PHX-CI qualification is authentic and PASS; however the tested implementation has two HIGH source-grounded defects against explicit DEC-352 acceptance requirements: (1) wrong run attribution for pending offline events after run changes, and (2) duplicate remote Drive writes after ambiguous diagnostic-publication responses. These cannot be cured by aggregate 559/559 focused tests; relevant adversarial cases are absent.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`; **branch:** `build/bvp-poll-error-observability-20261025`; **feature:** `WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY`. **Reviewer date:** 2026-10-25. **Exact source SHA:** `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64`. **Verified Git tree:** `475ee95499d7c9ef3522dbc5ed4da724d9b43851`.

## 1. Authorization and source assessment

Incoming GitHub branch HEAD matched exact state commit **`6c6baf72f39d4562ca61396274be86f1827925d3`** (compare `identical`), and source is an ancestor by two administrative/evidence commits. Top-level current-state fields refer to a DIFFERENT feature, `BVP_CLI_RESULT_FINALIZATION`, with recipient BUILDER. The canonical file ALSO has a **DEC-352-specific** handoff object `bvp_poll_error_observability_2026_10_25` near lines 1153–1196, whose count 1, sender BUILDER, recipient/owner REVIEWER, feature ID and source SHA match this exact assignment. The feature-specific handoff is the verified authority for this review; top-level unrelated metadata must remain unchanged.

Frozen source-only report: **`dev/reviews/bvp-runtime-error-observability-20261025-r1-source.md`**, published at **`d44ac2a63cb5dfefb7eb781ff89564456a7f992c` BEFORE authored tests, previous review findings, source history or original PHX-CI evidence were inspected**. Assessed DEC-352, normative requirements, frozen WS-07 architecture, and immutable validation-only source.

**Procedural qualification:** A broad first fetch of the planning file inadvertently exposed lower Builder status/history and historical PHX-CI text before source freeze, despite the user's strict no-Builder-narrative/no-results Pass-1 rule. The Reviewer did not rely on those passages as proof and source findings were independently derived, but cannot claim perfect blindness. The source report discloses this. If strictly pristine historical-blind review is mandatory, assign a fresh Reviewer separately. This is a review-process limitation, independent of the two substantive source defects below.

## 2. Original immutable PHX-CI verification independently confirmed

- **Original PHX-CI R3 run:** `23fd83ff-613e-4543-a66e-514e37132d59`; **original evidence publication commit:** `ad1bd817388ff976f9877c71b72e8c3ce1e5eb12`.
- Original flat evidence JSON: `dev/test-results/20261025T171255Z-operator-build-bvp-poll-error-observability-20261025-800b8b3dd228.json`, Git blob **`762c3b0377bcc92bc87f345bdd645cedbde6fe29`**. The original publication includes matching terminal `.log`, result `.md` and `dev/_ca-output.{md,json}`. Read the JSON at its original evidence commit rather than from a mutable summary.
- `repository.verifiedHead` is exactly `800b8b3dd2287c6c66d05b1ff2bff7fd1f91df64`; `repository.verifiedTree` is exactly `475ee95499d7c9ef3522dbc5ed4da724d9b43851`. Source→original evidence commit changed **only** the five PHX evidence files; original evidence→intake commit changed **planning, operator runbook and state only**. The qualified source/tests were not mutated by evidence administration.
- Pinned PHX runtime from unmodified `phx-ci.json`: SHA `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; framework 0.2.0-dev.2. Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2 and Task 3.53.1.
- **All 11/11 stages PASS, exit 0**: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Change-set PASS; repository PASS; overall COMPLETE/PASS. **Focused BVP 559/559 PASS** and **product 1292/1292 PASS** (overlapping suites, not additive).
- Original focused stdout specifically shows all NINE `DEC-352` named tests PASS (cases 410–418): journal persistence/recovery, pending delivery and journal corruption, relay inbox idempotency, safe code/ID validation, malformed mailbox records, invalid diagnostics, interrupted media upload hidden, malformed lease and bounded offline saturation.
- Repository guard PASS: core **4444/4500 logical TS LOC**, live-device agent/relay **824/950**, source/shipping exclusion/guard PASS; result `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`. Existing DEC-349 approved budget change accounts for historical authorized-governance classification; no new manifest/pin edit was detected in reviewed feature's baseline→source modified paths. No physical dispatch or live iOS test is proved.
- An expected canonical run-ID mirror `dev/test-results/23fd83ff-613e-4543-a66e-514e37132d59/result.json` was **NOT_FOUND** at the original evidence commit. Preserve the original flat immutable evidence; Builder should publish a byte-identical administrative mirror when closeout is authorized, without presenting a redundant run as new verification. This organization observation does not nullify the legitimate original PHX-CI PASS.

## 3. Substantive findings

### DEC352-F01 — HIGH / OPEN — Originating run/device attribution lost across offline run transitions

**Authority:** DEC-352 requires failure records retain privacy-safe *origin* run/device/command correlation, exact route to originating run/device, restart-safe pending status, and recovery boundaries. Neutral task §Normative contract items 1, 2, 4, 5.

**Actual source:** `test-platform/src/bvp-runtime-error-journal.ts` defines `RuntimeErrorRecord` and on-disk `Entry` with `eventId`, `firstAt/lastAt`, `occurrences`, `diagnostic`, `deliveredCount`, but no immutable originating run or device route. `test-platform/src/live-device/validation-entrypoint.ts` sets mutable `activeRunId` when a current binding exists, **does not clear it when `activeRun()` returns undefined**, and flushes all queued entries with `mailbox.publishDiagnostic(activeRunId!,options.deviceId,entry)`. When offline run A fails and bindings transition to run B before upload, A's retained event is delivered under **run B**. When binding disappears, stale `activeRunId=A` can continue to be used. `unexpected()` constructs an identity-less typed diagnostic (run/correlation unavailable), so many observed thrown failures cannot later be assigned to the correct source. Repeated equal failure coalescing compares the diagnostic JSON, not immutable run/device binding, and can combine events from different runs.

**Why this matters:** Windows relay's exact lease filters only guarantee it retrieves records by the **routing metadata actually stamped on Drive**. They cannot recover the true origin after the publisher has stamped the wrong run. An error can appear in an unrelated run's inbox, while its originating run lacks its observability record.

**Existing tests do not close this:** `s08d-drive-mailbox-relay.test.ts` verifies journal restart/recovery with an unbound `bvpPollFailure()` and a single `publishDiagnostic("run-a","device-a", event)`; it asserts that explicitly chosen route can be filtered but **never tests run-A offline journal → active binding changes to run B → automatic flush/restart and correct origin**, nor absent-binding/stale-activeRun state. `s08b-validation-build-entrypoint.test.ts` tests individual failure/recovery but does not assert original-route preservation.

**Correction required:** add an immutable origin route binding to each persisted event with safe pseudonyms for logs and a validated exact route for authorized mailbox publishing, tie diagnostic to actual available run/command/device context, clear/reconcile absence and supersession, and forbid merging same classification across different origin runs/devices. Ensure unbound errors remain observably unbound (rather than falsely attributing them to a later run). Test A→B switch, loss of binding, restart while offline, correct leased Windows relay delivery, and no cross-run presentation. Preserve privacy and authorization.

### DEC352-F02 — HIGH / OPEN — Duplicate remote Drive diagnostic creation on ambiguous write response

**Authority:** Neutral task normative item 5 explicitly prohibits duplicate remote writes and unbounded logs; DEC-352 requires pending retry with unknown-effect semantics and idempotent receiver/relay handling.

**Actual source:** `test-platform/src/live-device/drive-mailbox.ts` `publishDiagnostic()` ALWAYS (1) creates a new Drive file with `brainBvpRecord:"0"` and eventId metadata, (2) uploads JSON, (3) flips `brainBvpRecord:"1"`. It performs **no existing-event lookup** and uses a newly allocated Drive file ID on every retry. `BvpRuntimeErrorJournal.flush()` marks delivered only after the callback returns, correctly retaining pending entries after a thrown/ambiguous response. But if the final visibility mutation reaches Drive and the response is lost, a retry recreates a *second* remote file for the same event ID, potentially repeatedly. Stable event ID and idempotent Windows inbox filename do **not** give remote storage idempotency. A repeated equivalent journal occurrence increases the same event count and can further multiply remote records.

**Existing test explicitly leaves upstream duplication unchecked:** `s08d-drive-mailbox-relay.test.ts` test `DEC-352 device diagnostics arrive in exact leased Windows relay inbox idempotently` invokes `publishDiagnostic("run-a","device-a",event)`, then invokes it AGAIN with the same event ID and increased occurrences; it checks **only** that one local inbox `.error.json` survives and has updated count, not that remote Drive has one authoritative event record. The interrupted-media-upload test only covers failed upload remaining undiscoverable, not final visibility response loss after commit or retry with same eventId. No server-side idempotent publish or deterministic existing-file reconciliation is present.

**Correction required:** an authenticated, run/device/eventId-bound reconciliation protocol for uncertain publication, duplicate detection/consolidation and a stable authoritative file/record policy. Do not assume same eventId equals safe remote storage semantics if multiple objects are created; detect and fail-closed on conflicting payloads or origins. Tests should inject lost success responses for metadata create, media upload and final record-visible patch, then retry/restart and show one logically authoritative remote event, bounded object counts, correct occurrences and no false PASS/delivery. Never auto-retry uncertain command execution; this is telemetry only.

### DEC352-F03 — MODERATE / OPEN — Recovery and saturation retry invariants insufficiently demonstrated

`validation-entrypoint.ts` on a healthy tick flushes pending diagnostics, appends a recovery record, then flushes again; if remote publication fails it appends a classified `diagnostic-publication` error and can retry on every one-second healthy tick without a backoff/cooldown. `BvpRuntimeErrorJournal` caps events at 24, preserves `overflow` on saturated insertion and throws a safe code, but a live persistent outage with varied failure types, dropped publication ACKs, or repeated recovery transitions needs a bounded retry/retention proof. `s08d` test proves 24 distinct events give a stored overflow counter and an exception, NOT that repeated ticks/races during a sustained offline period avoid repeated remote mutation attempts or false recovered/blocked status. Add targeted long-lived failure/ambiguous-response tests. This remains independent of the two HIGH blockers.

### DEC352-F04 — MINOR / REVIEW PROCEDURE — Source pass not perfectly blind

As disclosed in frozen source report, the initial normative planning-file retrieval included Builder/history narrative. No tests, actual candidate PHX evidence, source diff or previous Reviewer findings were read until AFTER Pass-1 report was published. Do not claim pristine blind source assessment; a separate fresh independent reviewer can meet that procedural requirement if strict acceptance process demands zero contamination. The substantive F01/F02 arguments are directly provable from immutable source regardless.

### DEC352-F05 — MINOR / EVIDENCE ORGANIZATION

The original R3 flat evidence is genuine and complete; the canonical `dev/test-results/<runId>/result.json` mirror was not found. Publish identical-byte run-ID mirror and provenance as required at authorized closeout; never rewrite or rename original evidence nor perform unnecessary redundant verification solely for administrative copying.

## 4. Independent mandatory ten-family adequacy

| Family | Reviewer assessment | Concrete evidence / missing cases |
| --- | --- | --- |
| 1. Nominal success | ADEQUATE for software | Successful journal poll and existing relay mailbox tests, proper no-error paths |
| 2. Negative/malformed | PARTIAL | Invalid diagnostic code, malformed Drive records and corrupt journal tested; missing ambiguous finalized-visibility ACK |
| 3. State transitions | **INADEQUATE** | Offline→pending→recovered is tested locally; **run A→no binding→run B** with pending events is absent (F01) |
| 4. Idempotency/retry | **INADEQUATE** | Local coalescing and Windows inbox dedupe tested; **remote Drive create retry is nonidempotent** (F02) |
| 5. Concurrency/order | PARTIAL | Journal same-instance serialized, relay pump nonreentrant; no cross-run state-transition races or concurrent remote publish finalization |
| 6. Persistence/restart | PARTIAL | Journal reconstructed and pending event persists; original identity of pending event not preserved across run transition |
| 7. Identity/privacy/security | **INADEQUATE** | Typed redaction and mailbox address filtering present; source-origin correlation/routing violated by mutable activeRunId (F01) |
| 8. Integration/schema/compatibility | ADEQUATE within software scope | Distinct `diagnostic` kind, validation-only packaging, existing command/result semantics preserved, TS inventory qualification |
| 9. Architecture/governance | ADEQUATE with caveat | PHX 11/11 PASS, core 4444/4500 and live 824/950; inherited authorized-governance class is not blanket future approval |
| 10. E2E/fail-closed | **INADEQUATE** | Invalid remote entries block, upload failure hidden; real uncertain visibility-success/retry and correct origin across lease transitions not proven |

**Mandatory test-family acceptance is not complete.**

## 5. Corrective scope and final handoff decision

**VERDICT: CORRECTION REQUIRED — NOT ACCEPTED** for DEC-352. F01 and F02 are HIGH correctness/security/observability defects. F03 is MODERATE test/algorithm hardening. F04/F05 are bounded procedural/administrative notes. The original qualified SHA and original PHX-CI PASS remain historically valid **for that exact implementation**, but do not satisfy independent DEC-352 acceptance. Do not install validation artifact, issue GitHub prerelease, dispatch real iPhone commands, enable product autosync, touch personal vaults or promote/merge the branch.

After publishing this independent review, update **only the DEC-352 feature-specific** `dev/state/current-state.yaml` handoff fields to count **2**, outgoing REVIEWER, recipient BUILDER, status CORRECTION_REQUIRED. Preserve unrelated top-level active-build-unit fields and all original verification evidence. Builder must read these findings and normative DEC-352 authority, author adversarial tests FIRST, repair only authorized validation-only code, then obtain fresh exact-source pinned Windows PHX-CI 11-stage PASS with immutable original evidence before another Builder→Reviewer handoff. No software validation run or code/tests/scripts/evidence mutation was performed by this Reviewer.
