# DEC-352 — R2 Independent Blind Source Assessment

**Feature:** WS-07 / BVP_RUNTIME_FAILURE_OBSERVABILITY
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Branch:** `build/bvp-poll-error-observability-20261025`
**Reviewed immutable source:** `5465f3a44a10943d71dd6aa39f73cad47efd076b`
**Review date:** 2026-10-25
**Pass:** 1 — frozen source-only assessment, no final disposition

## Authorization and procedure
Fresh GitHub remote comparison confirmed branch HEAD **identical** to supplied `5bb3016cbdb1578f4dcb0cf95e99247db120d47c`. The canonical feature-specific `bvp_poll_error_observability_2026_10_25` block (as distinct from unrelated top-level active-unit fields) binds count **3**, sender/owner BUILDER, recipient REVIEWER, feature ID and exact SHA `5465f3a44a10943d71dd6aa39f73cad47efd076b`. The implementation SHA is an ancestor of intake state.

Neutral DEC-352 requirements read only at `dev/authority/decision-register.yaml` DEC-352 and feature planning task **lines 1–48** (normative failure, contract, ownership, ten families and required gates); architecture `dev/authority/governance/locks/testing-platform-boundary.yaml` and WS-07 `02-ARCHITECTURE.md` were examined. The task status line at the beginning was visible but explicitly disregarded as proof. Source was fetched at **exact SHA**, including `test-platform/src/{bvp-runtime-error-journal,diagnostic-contract,build-validation-artifact}.ts` and `test-platform/src/live-device/{validation-entrypoint,drive-mailbox}.ts`, plus pre-existing validation-only entry/build interfaces.

**Isolation disclosure:** No candidate tests, previous independent findings, Builder narratives beyond the task's introductory status, implementation source history/diffs or original PHX-CI verification results were opened during this current candidate's Pass 1. However, the *same reviewer conversation* contains the earlier DEC-352 review of the prior candidate and its defects. Thus this is candidate-access-ordered source-only inspection **but NOT historically blind or zero-prior-exposure**. The existing knowledge cannot be undone. This limitation is noted for governance; it does not replace examination of the corrected immutable source.

## Normative source-only requirements
- Validation-only polling/relay errors must be stage-specific, observable, privacy-safe, durable even offline, journaled with bounded coalescing and restart survival, without raw exception messages.
- Transport is the authenticated existing BVP mailbox, in a distinct diagnostic record kind; no use of product sync or conflation with command/result acknowledgments.
- Exact originating run/device correlation and idempotent receiver/relay processing; no duplicate remote writes on ambiguous response, no fabricated PASS.
- Recovery, bounded retry, one-second best-effort polling, safe fallback on persistent failure; shipping/plugin/frozen architecture boundaries and physical deployment prohibition preserved.

## Positive source findings

1. **Origin-bound local journal:** `BvpRuntimeErrorJournal` now stores optional `DiagnosticOrigin{runId,deviceId}` per entry. It validates route fields, checks a bound entry's privacy-derived run hash on read, and coalesces only genuinely same-bound-run consecutive failure entries (not recovery entries). The active run is explicitly cleared at `pollCore()` start. Delayed delivery uses each *entry's stored origin* rather than the mutable active run. This directly removes the previous wrong-current-run dispatch pattern for bound records.
2. **Idempotent remote file reservation:** Before diagnostic publication, `journal.flush` can obtain a Drive-generated stable ID through `reserveDiagnosticId()` and persist it within the local journal. `publishDiagnostic` queries by event ID, rejects conflicting routes/IDs and multiple files, creates only with the durably reserved file ID, validates pre-existing bytes/count/timestamps, uploads then read-verifies media, publishes visibility only after bytes, and verifies remote identity/visibility before returning. An uncertain create/ack retry cannot intentionally create a new differently identified remote file for the same journal event.
3. **Independent BVP telemetry with privacy:** `cleanDiagnostic` enforces exact allowlisted diagnostic content and removes origin and remoteFileId from remote JSON. Route fields are used in Drive metadata/query, not the remote diagnostic body. Bad/unexpected exceptions are replaced by typed privacy-safe classifications and safe terminal fallback code. Command/results remain distinct from `diagnostic` records.
4. **Bounded local persistence and delivery:** Journal uses a 24-entry cap with durable overflow accounting, serializes writes within one instance, keeps delivered counts across restart and records per-entry recovery. `acquireDeliveryWindow` durably advances a 30-second retry gate before attempting remote operations. The validation-only timer remains one-second best-effort and shared `pollAndReportOnce` is non-reentrant.
5. **Fail-closed relay:** Windows relay reads addressed diagnostics only under existing controller-owned leases, compares origin event identity/classification/chronology with existing inbox records, rejects conflicting records rather than replacing them silently. No physical-device execution or shipping-product sync changes appear in the inspected modules.

## Provisional risks and Pass-2 proof obligations

**R2-S01 — MODERATE: unbound diagnostics do not have remote-delivery or remote recovery representation.** `tickCore` explicitly records relay failure with `{runId:null,deviceId}` and records no-active-run poll failures similarly. `journal.flush` skips entries without both bound run and device; `acquireDeliveryWindow` likewise ignores them. That is safer than misattributing a failure, but an offline/unbound error is *indefinitely local-only* even after network availability returns. Confirm this deliberate fail-closed requirement interpretation, user-visible local retrieval/fallback, and tests ensuring it is neither silently lost nor falsely considered remotely delivered. The neutral contract requires all BVP errors observable and pending reports publish when transport becomes available; the permissible disposition of honestly unbound errors is not explicitly resolved.

**R2-S02 — MODERATE: Drive listing uncertainty and abandoned remote storage.** Remote publication now retains one stable ID per event, which prevents intentional duplicates; however Drive `files.list` consistency and `files.generateIds`/client-provided create IDs need independent tests at lost create/upload/visibility response and eventual listing delays. `publishDiagnostic` rejects conflicts and unknown size, but no source-only proof of concurrent publication across distinct journal instances or bounded remote historical diagnostic retention. Verify one authoritative event and no new object growth under retries.

**R2-S03 — MODERATE: recovery, serial journal and outage behavior.** `recover` uses newest entry by origin, while `record` persists a global `outstanding` flag. Confirm independent multi-run recovery boundaries and no false recovery after run change, saturation, restart, ongoing publication errors or multiple journal instances. The 30s cooldown is durable for pending *bound* records, but unbound events do not cause remote attempts. If storage writes fail, fixed safe code is emitted through the one-second timer; confirm no private detail is emitted.

**R2-S04 — MINOR: local origin data and inbox persistence.** Local on-device journal has exact raw route keys required for authorized delivery, whereas remote JSON has sanitized hashes. Ensure journal resides only under validation-only `.bvp-relay`, no plaintext route values are exposed via public log/remote evidence, and the relay's eventId-only inbox filename cannot permit cross-origin collision to be silently accepted. Tests and source/architecture guard needed.

## Frozen provisional conclusion
**SOURCE-ONLY: SUBSTANTIAL CORRECTIONS PRESENT; FINAL ACCEPTANCE WITHHELD.** The main source-path mechanics for origin preservation and stable-ID retry are materially improved and appear aligned, subject to the above tests and exact PHX qualification. No new validation, deployment, release or physical authority is claimed. The present report is frozen by publication and must not be edited after Pass 2.
