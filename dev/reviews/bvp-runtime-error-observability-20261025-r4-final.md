# DEC-352 / DEC-354 / DEC-355 — R4 FINAL Independent Review

**FINAL VERDICT: CORRECTION REQUIRED — NOT ACCEPTED for complete feature acceptance.** The exact immutable DEC-355 R6 candidate has a genuine local Windows PHX-CI PASS and significantly improved safe BVP error reporting, but the Owner-selected DEC-354 Option B ACTIVE-to-ARCHIVE retention lifecycle is unfinished. Distinguish fail-closed evidence protection (which works for cases tested) from completion of the configured 5000-per-device/90-day ACTIVE history and eligibility-verified retirement. A multi-publisher active-count race is also not bounded by the implementation's non-atomic admission check. Do not merge/install/release or dispatch physical iPhone commands under this verdict.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Branch:** `build/bvp-poll-error-observability-20261025`
**Feature:** `WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY`, locked decisions DEC-352, DEC-353, DEC-354 (Option B) and DEC-355.
**Date:** 2026-10-25.
**Reviewed immutable source SHA:** `bf51a238de73b07577c8fc8385f19978873c451b`
**Verified source Git tree:** `84e42e253a8ec2f60af56e4c62a5b3d8d6edbdd5`.

## 1. Live authorization, review sequence, independence

Fresh remote compare confirmed the feature branch HEAD **IDENTICAL** to supplied state `700b7d2d2887ec015c3008a524f4c82948b7f207` at intake. The canonical DEC-352 **feature-specific** block `bvp_poll_error_observability_2026_10_25` carried handoff-count **7**, BUILDER sender/owner, REVIEWER recipient, exact feature and SHA. The unrelated top-level `BVP_CLI_RESULT_FINALIZATION` fields are separate, unchanged authority.

**Pass 1 published and frozen BEFORE opening any candidate tests, source diff/history, earlier reports, original PHX-CI evidence or Builder narrative:** `dev/reviews/bvp-runtime-error-observability-20261025-r4-source.md` at immutable publication commit `39e3418f13fe144b7cdd0c7b060bb05734142fda`. Source-only pass inspected DEC-352/353/354/355 locked neutral decisions; normative task lines 7–48, frozen architecture manifest and WS-07 architectural rules; and exact SHA source in BVP journal, runtime, Drive mailbox, shared diagnostic and validation-only artifact builder. No candidate tests/PHX evidence used for frozen conclusions. After publication, Pass 2 independently inspected dedicated DEC-354 tests, other S08 tests, original PHX-CI evidence, source ancestry and earlier context as applicable.

**Independence disclosure:** The same long conversation has conducted earlier DEC-352 reviews. This is a correct **current-candidate source-before-tests/evidence** sequence, but a fresh-session zero-prior-knowledge blind review was not possible. The top-level handoff state also contains historical feature metadata, disregarded as proof. Governance requiring strict no-prior-feature-exposure must use a new independent session. This procedural issue is separate from substantive findings.

## 2. Exact original immutable PHX-CI evidence independently verified

- **Original run ID:** `1ffc49c7-e267-435e-bd0e-5c3e53f44550`.
- **Original evidence publication commit:** `0714a71c2e09772b0fe75f6c2e726c57b1f3c412`.
- **Original flat evidence JSON:** `dev/test-results/20261026T021955Z-operator-build-bvp-poll-error-observability-20261025-bf51a238de73.json` at original evidence commit, Git blob `3311cc12b69526f2399f6460450174ceab06e427`. Original matching flat MD/log, and `dev/_ca-output.{md,json}` published in the **same source-child evidence-only commit**; source→evidence diff is one commit with exactly those five original evidence files. Evidence→intake state touched only planning, state and **administrative evidence mirror**, not production/tests/verification source.
- Original **verifiedHead** `bf51a238de73b07577c8fc8385f19978873c451b`; original **verifiedTree** `84e42e253a8ec2f60af56e4c62a5b3d8d6edbdd5`. Both match supplied exact candidate, with no post-qualification source edit.
- **Run-ID-organized mirror** under `dev/test-results/1ffc49c7-e267-435e-bd0e-5c3e53f44550/` is published. Independently verified matching original/mirror Git blobs: JSON `3311cc12b69526f2399f6460450174ceab06e427`; MD `3f64dfbbe6bacee811c4c946b604c38c5449b539`; log `b02e8f933fec3a39872d89c5dc6ea102b6255e50`. The mirror is administrative copy, not an independent second PHX run.
- Pinned unchanged PHX runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`; framework `0.2.0-dev.2`. Verified operator environment Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- **11/11 PHX stages PASS, overall exit 0:** preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Change-set PASS, repository PASS, overall PASS.
- **Focused BVP 585/585 PASS**; **product 1292/1292 PASS**, none failed/skipped; the suites overlap and must not be represented as a distinct-test sum.
- Original PHX focused stdout independently confirms **nine DEC-354 test cases #126–134 PASS** and a DEC-355 exact-at-limit/one-line-over architecture guard test PASS.
- Frozen architecture metrics **framework core 4469/4850 PASS** and **live agent/relay 1036/1250 PASS**. DEC-355 Owner authorization explicitly raised *both* budgets +300 from DEC-353 values. Original repository-check output `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`. This class applies Owner-authorized governance amendments, not future unrestricted permission.
- PHX results prove **Windows software/mock verification**, not physical iPhone/iPad, live user Drive/vault, installed binary, prerelease approval, production autosync disablement on device or release readiness. Reviewer executed no software validation.

## 3. Affirmed progress and earlier findings

- **Run-origin integrity — corrected:** Device-scoped diagnostic remote ingress independently checks bound remote run against `opaqueDiagnosticId(rawRun,"run")` and rejects incompatible unbound run markers. Malformed/untrusted evidence remains unavailable instead of silently entering inbox; earlier R3 forged run A→B metadata gap closed by implementation and authored tests.
- **Expired cursor handling — corrected for tested cases:** Drive 400/410 expired-page-token response is classified and the relay restarts one bounded page from the beginning with inbox reconciliation before writing cursor, preserving safety and eventual progress under mocked expired cursor; earlier R3-F03 closed within tested scope.
- **Historical-run/unbound telemetry — preserved:** Read-only device-scoped diagnostic collection includes original run A events under B's current command lease and explicit null-run device events. No old command authorization is granted. Stable 25-record pages, local journal 24 cap and retry cooldown preserved.
- **Remote archive-copy integrity — substantively present:** `archiveVerifiedDiagnostic` hashes the actual source bytes, creates or reconciles a distinct `diagnostic-archive` record, verifies byte-for-byte archived content and metadata, rechecks source unchanged, and never deletes a source on uncertainty. Interrupted upload and lost-create response mock tests support this non-destructive behavior. This is **not** the same as demonstrating an authorized ACTIVE retirement transition.

## 4. Current independently found acceptance issues

### DEC352-R4-F01 — HIGH — Option B safe eligible ACTIVE-to-archive retirement and 90-day operational lifecycle are not implemented

**Authority:** DEC-354 explicitly selected **ACTIVE 5000 records/device and 90 days**, durable verified archive **before retiring eligible acknowledged/resolved ACTIVE originals**, and absolute preservation of unacknowledged/unresolved evidence. When eligibility/integrity is uncertain, keep evidence and block unsafe archival/retirement rather than fabricate safe eligibility.

**Source:** `test-platform/src/live-device/drive-mailbox.ts`:
- `archiveVerifiedDiagnostic` creates a verified copy but expressly **does not retire or reclassify the ACTIVE source**; there is no event-specific trusted acknowledged/resolved eligibility check.
- `cleanup()` omits the `diagnostic` kind and makes no attempt at safe retirement.
- `admitActive()` rejects all new diagnostic creations if *any* ACTIVE entry is older than 90 days (`mailbox-diagnostic-active-expired`) or at 5000 (`mailbox-diagnostic-active-capacity`).
- Relay archives at most one aged entry per cycle, retaining the ACTIVE record regardless of resolution. Once one entry passes 90 days, its ACTIVE record remains indefinitely and preflight rejects *every* newly arriving event, even if an archival copy exists. After the device accumulates 5000 records it similarly cannot admit new entries until an entirely absent retirement flow is provided.

**Authored tests corroborate the gap rather than close it:** `test-platform/test/dec354-diagnostic-retention.test.ts` specifically asserts `91-day unresolved source blocks new unique remote event without deletion` and `capacity: new event 5001 blocked; all 5000 unresolved originals retained`. Both are proper **fail-closed safety oracles**, but no test constructs **trusted acknowledged/resolved event → verified archive → confirmed safe ACTIVE retirement → admission restored**, and no such implementation path exists. The tests also archive unresolved entries as non-destructive copies; no event-specific resolution/acknowledgment is proved.

**Finding:** This is not a claim that source improperly deletes protected records — it wisely does not. It is a hard **feature-completeness and liveness gap**: DEC-354's selected Option B lifecycle cannot complete; one expired ACTIVE event prevents further remote error observability indefinitely. Copy integrity alone is insufficient to label archival retirement accepted.

**Required correction:** Establish neutral binding eligibility authority for *acknowledged/resolved* events, one immutable receipt that is genuinely tied to event/run/device and is independent of mere relay inbox delivery, then implement safe post-integrity retirement/reclassification with recheck and uncertainty-block. Prove eligible transition and restored capacity/90-day processing end-to-end, while unresolved originals never get deleted. If no event-specific eligibility authority exists within currently authorized DEC-354 architecture, **STOP and obtain Owner decision**; never reinterpret inbox write or successful archive copy as resolved acknowledgment.

### DEC352-R4-F02 — MODERATE/HIGH — Non-atomic ACTIVE count preflight permits capacity oversubscription under concurrent same-device publishers

**Source:** `admitActive(deviceId)` counts currently listed active/reserved diagnostic objects and returns when count is below 5000. `publishDiagnostic` then separately posts a new unique metadata file. No atomic device-specific reservation/compare-and-swap or server-enforced active quota binds admission to the following mutation.

**Counterexample:** Two independent authorized local instances for the same device each enumerate **4999** current ACTIVE files and pass. Each creates a new event ID, producing **5001** ACTIVE objects. Both publication callbacks may confirm success because each subsequent verification checks only its own record. The next write fails, but the Owner's hard **5000 ACTIVE cap** has already been breached. Per-instance journal queue and same-event ID reconciliation do not serialize **distinct events from distinct instances**. A mock test at exactly 5000 proves only the single-process preexisting-full case, not concurrent 4999→5001. This is a concurrency/fail-closed test-family deficiency and a plausible literal hard-cap violation.

**Required correction:** Define authoritative serialized admission or conservatively fail closed when shared remote capacity cannot be atomically guaranteed; add a two-actor 4999→5001 race oracle, post-mutation cap reconciliation and rollback/unknown-effect disposition that never fabricates successful compliant capacity. Preserve evidence; do not delete a newly created unresolved event in an unconfirmed race merely to conceal overage.

### DEC352-R4-F03 — MODERATE — Archive verification is not a resolution acknowledgment; age-based archival of unresolved records needs an explicit contract

The relay chooses any aged event for `archiveVerifiedDiagnostic` without authoritative positive event-resolution evidence, and persists a local ID receipt of successful copy integrity. This does **not** itself delete protected ACTIVE evidence, but neither `status:"verified"` nor receipt grants an acknowledgment/resolved predicate. DEC-354 says when acknowledgment or safe eligibility cannot be established, preserve evidence and block unsafe archival/retirement. If non-destructive copies of unresolved events are permitted as additional backups, the Owner must expressly distinguish their meaning from **eligible retention retirement**; do not convert the archival copy/receipt into a deletion gate.

### DEC352-R4-F04 — MINOR — Reviewer historic blindness and physical acceptance limits

This same conversation has prior DEC-352 feature reviews, so wholly fresh zero-prior-exposure blindness is not satisfied despite strict Pass-1 current-candidate source-before-test/evidence ordering and frozen publication. If this governance gate is literal, a different fresh Reviewer session must independently re-review. The R6 verification is software-only and proves no installation, physical execution, live personal Drive/vault or release readiness.

## 5. Independent ten-family test adequacy

| Family | R4 assessment | Specific grounded oracles and remaining gap |
| --- | --- | --- |
| 1. Nominal | ADEQUATE within tested software scope | Healthy poll, delivery of offline prior error, distinct BVP diagnostic relay |
| 2. Negative/malformed | ADEQUATE for sampled paths | Invalid codes/IDs, forged run markers, archive upload failure and corrupt journal rejected; no false deletion |
| 3. State transitions | **PARTIAL / BLOCKING** | Offline→pending→delivered/recovered, verified archive copy; no eligible acknowledged/resolved→ACTIVE retirement→fresh admission |
| 4. Idempotency/retry | ADEQUATE for single-event mocked failures | Lost response reconciliation, stable reserved file ID, archive copy replay |
| 5. Concurrency | **INADEQUATE / BLOCKING** | Per-instance serialization exists; multi-instance same-device active capacity race 4999→5001 absent |
| 6. Persistence/restart | PARTIAL | Local pending/retry and archive receipt durable; no safe retirement receipt semantics/lifecycle |
| 7. Identity/privacy/security | ADEQUATE for mocked BVP identity | Remote bound/unbound hash matching, invalid metadata blocked, no raw exception leaks |
| 8. Integration / compatibility | ADEQUATE | Validation-only plugin and authenticated BVP mailbox; command/result authority unchanged |
| 9. Architecture/governance | ADEQUATE for exact qualified software | DEC-355 4850/1250 ceilings, guard PASS, Owner amendment and exact PHX provenance |
| 10. End-to-end fail-closed | **PARTIAL / BLOCKING** | Unknown response retains originals, cap and expired records block safely; nonterminating blocked lifecycle and concurrent capacity overrun not proven safe |

The 585 focused passing tests are real. Mandatory **coverage and normative acceptance remain insufficient** for selected Option B.

## 6. Final disposition and required next handoff

**CORRECTION REQUIRED — NOT ACCEPTED.** Preserve the R6 source and its original PASS evidence exactly. Do not imply failure of PHX itself; the remaining dispute is the complete retention/eligibility contract, safe lifetime behavior, and atomic capacity. Do not install, merge, release or dispatch physical/live records.

Publish this final report under `dev/reviews/` first, then change **only DEC-352 feature-specific** `dev/state/current-state.yaml` metadata: handoff-count **7→8**, sender/owner REVIEWER, recipient BUILDER, status `R4_CORRECTION_REQUIRED_REVIEWER_TO_BUILDER`, exact qualified source SHA unchanged. Preserve the unrelated top-level handoff and all original evidence.

Builder must refresh remote, read full R4 final report and locked DEC-354/355, derive first failing adversarial tests for *eligible verified archival retirement and resumption* and the *concurrent 4999→5001 quota boundary*, then seek the Owner's explicit architecture/eligibility decision where no reliable acknowledgment authority exists. Never simply delete unresolved records, increase budgets/pin, skip PHX, activate production sync, alter shipping code, or use GitHub Actions. After a separately authorized, source-exact full pinned local Windows PHX PASS with immutable evidence, issue a new Builder→Reviewer handoff. Reviewer made no code, test, fixture, script or original evidence mutations and executed no software validation.
