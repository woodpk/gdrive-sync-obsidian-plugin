# DEC-362 — Frozen independent blind source assessment

- **Reviewer/session:** `review-brain-10`
- **Feature:** WS-03/WS-05 DEC-362 stable remote Google Drive ID on existing-file content update and clean merge
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin`
- **Frozen production/test source:** `640845815dc85672c2411b1b7d3ae48f17a86bc2`
- **Frozen source Git tree:** `133efbae0fc19162c168caf567ec663de04115fa` (verified independently with GitHub Git commit/tree endpoints).
- **Handoff state:** feature-local `handoff-count: 1`, recipient `REVIEWER` at the verified feature branch. The feature-specific review assignment was committed after the frozen code source and read from the administrative branch head solely to establish tasking.
- **Blind phase:** production source and normative requirements/architecture only. No tests, PHX-CI files, Builder change history/diffs or earlier reviewer reports inspected before publication of this report. No executable validation performed.

## Governing source contract
`REM-006`, `CHANGE-002`, `STATE-004/009/010/013`, `XFER-001/004`, `CONFLICT-001/002/011`, `MOVE-001/002`, target §4.3, locked `DEC-362`, and WS-03/WS-05 verification plans require existing-file and clean-merge updates to retain exact remote ID A, validate revision/content and managed identity, and avoid unauthenticated replacement-ID adoption. A stale/concurrent remote writer must not be silently overwritten or approved; uncertain outcomes fail closed and recover against A. An atomic provider-side conditional update, if available, must be established; if no safe provider protocol can meet these invariants, DEC-362 reserves the outcome for Owner decision rather than silently weakening the guarantee.

## Source inspection — provisional assessment

**Conforming elements found:** `src/contracts/synchronization-foundation.ts` now defines `existing-file-content-update` with `remoteObjectId`, `expectedRevision`, `stable-object-in-place` and intended content; `src/product/authoritative-production-executor-base.ts` constructs this same-ID descriptor for ordinary uploads and clean merge (around lines 385–408 and 455–481). `src/drive/google-drive-port.ts` uses PATCH at the existing ID rather than allocating a candidate/replacing an old ID (around lines 325–370 and `resumableUpload` near the end). It reobserves the ID/revision before dispatch and after, checks resulting hash/size/revision/managed-root topology, and reports uncertainty. `src/product/remote-update-convergence.ts` requires unique path identity, matching intended content and advanced revision. `src/product/durable-intent-recovery{,-base}.ts` reconstructs against stable identity and complete observation; the new create path still uses reserved IDs.

**FINDING B1 — MAJOR, approval-blocking: non-atomic stale-writer overwrite remains permitted.**
- **Location:** `src/drive/google-drive-port.ts` `updateExisting()` around lines 325–370 and `resumableUpload()` around lines 540–551.
- **Directly observed mechanism:** A final `getFile(remoteObjectId)` rechecks `expectedRevision`, but subsequent `PATCH https://www.googleapis.com/upload/drive/v3/files/{id}?uploadType=resumable` initializes the write without an expected revision/ETag conditional header or another atomic server-enforced precondition. The upload session's subsequent `PUT` writes chunks without such a bound either. The expected revision remains an *application-side read predicate* only; it is not made a provider-side write condition. A post-write read verifies that the final bytes are ours but cannot reconstruct and preserve intervening data that we overwrote.
- **Concrete interleaving:** Devices A and B both plan from remote object X at revision r1. B's pre-dispatch GET sees r1, then A writes distinct version r2. B starts/finishes its unconditioned upload to the same X, creating r3 with B's stale content. B's final hash/revision check observes r3 with its intended bytes and returns `verified-effect`. A's r2 is silently overwritten even though its remote revision changed after B's last read. Depending on the other device's committed BASE/next sync, A's independent update can be lost without an explicit conflict. This violates the DEC-362 stale/concurrent-writer and `XFER-004` safety obligation even though X's ID is preserved.
- **Required corrective contract:** For the real Drive upload pathway, prove and enforce a provider-recognized atomic conditional write against the expected remote revision/ETag (including resumable initiation/finalization) or another independently demonstrated non-destructive concurrency protocol. If the current Google Drive API cannot support an equivalent guarantee under current fixed authority, BLOCK and request the reserved Owner decision, rather than treating two GETs and a post-write hash as an atomic compare-and-swap. Test the intervening-writer race at the actual transport boundary, not only with fake `getFile` responses.

**Additional verification questions, not independently established source defects:**
1. Does the real Google Drive v3 resumable update response expose the content hash/size/version fields expected by `canonicalMatches` without relying solely on a permissive mock?
2. Do durable restart and cross-device tests exercise the exact concurrent/stale writer interleaving above and verify that existing content cannot be overwritten after a competing write?

## Blind conclusion
**PROVISIONAL: CORRECTION REQUIRED, subject to Pass 2 evidence assessment.** The current source clearly preserves Drive object identity for the ordinary happy-path update; it does not enforce the stronger concurrent-writer safety required by DEC-362. No independent PHX-CI qualification or final verdict is claimed here.

**Information-isolation limitation:** The current task assignment and feature-local `dev/state/current-state.yaml` include embedded Builder/evidence summaries even though used for task/identity grounding. Their contents were incidentally visible before this blind pass was frozen; this report does not treat them as proof. The authored test sources, original PHX-CI files, implementation diff/history and prior reviewer findings remained unopened during Pass 1.

*Immutable blind assessment: any subsequent changes in the final conclusion belong only in the separate Pass 2 report.*
