# DEC-352 / DEC-356 — R5 Corrective Independent Integration Reassessment

**Date:** 2026-10-28
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Branch:** `build/bvp-poll-error-observability-20261025`
**Exact previously accepted source:** `26f5ed8c95adb4cef7c8b805d880fc613fc9afd1`
**Qualified tree:** `8c8bcd8affa5cb370b8bf603c02d675fcc82dbba`
**Previous R5 final report:** `dev/reviews/bvp-runtime-error-observability-20261025-r5-final.md`, commit `99a5ce49d6953adf51515e8faee285c33fe53b51`
**This report:** Independent corrective addendum, not a new blind Pass 1; retains transparent prior-context exposure.

## CORRECTED FINAL VERDICT — CORRECTION REQUIRED / SOFTWARE ACCEPTANCE WITHDRAWN

The previous `PASS WITH MINOR FINDINGS` disposition was **too broad**. It credited the existence of a Node/Windows OS-exclusive lock helper and simulated tests with proving that the installed validation artifact's Windows relay actually **uses** the authorized controller. Inspection of the concrete assembly path shows that this is not established, and a desktop relay path demonstrably lacks the required lock capability. Software acceptance is withdrawn pending repair and exact-candidate requalification. **This does not negate the genuine original PHX-CI PASS**; the original tests lacked the critical assembled-runtime oracle.

### F01 — HIGH / ACCEPTANCE BLOCKER — Actual generated desktop validation relay is wired without exclusive admission authority

**Normative contract:** DEC-352 requires reporting pending errors via authenticated BVP mailbox and Windows durable inbox, including after offline recovery. DEC-356 requires **one authoritative serialized Windows controller** for promotion of `diagnostic-pending` events to ACTIVE, not device-self-promotion; uncertain ownership must fail closed. Compliance requires both real authorized controller assembly **and** working eventual end-to-end diagnostic receipt.

**Immutable source path evidence:**
1. `test-platform/src/build-validation-artifact.ts` virtual source, approximately line 93: generates `BvpValidationPlugin.onload` and explicitly calls `installBvpMailboxRuntime(requester,{ adapter:this.app.vault.adapter, ..., relay:Platform.isDesktopApp })`.
2. `test-platform/src/live-device/validation-entrypoint.ts` line 39: when `options.relay`, calls `createWindowsMailboxRelay(mailbox,options.adapter,options.root)` directly. The `ValidationAdapter` interface (near line 13) has file operations but **no `withExclusiveDiagnosticDevice` capability**, and the supplied Obsidian vault adapter is not a Node/Windows OS-locking adapter.
3. `test-platform/src/live-device/drive-mailbox.ts` approximately lines 497–505: `withController` explicitly rejects an adapter without `withExclusiveDiagnosticDevice` with `MailboxUnavailableError("relay-controller-exclusive-unavailable")`.
4. Same file lines 621–627: when a pending diagnostic is found, relay `pumpCore` invokes `withController(lease.deviceId, ()=>controller!.admit(...))`; consequently this concrete desktop-plugin relay path cannot promote that pending diagnostic.
5. `test-platform/src/live-device/live-scenario-executor.ts` lines 29–37 **does** export `createWindowsMailboxRelayWithOSLock(...)`, which injects `windowsDiagnosticExclusiveLock(root)` using Node-exclusive `open(path,"wx",0o600)` (lines 51–60). However this helper is **not imported or called by the generated validation artifact or validation entrypoint**, and no source call site was established for its actual use as the live Windows controller at the reviewed commit. The helper's existence and separate unit test are not proof of operational controller wiring.

**Consequence:** On the assembled desktop validation plugin path, a newly staged device diagnostic returns `mailbox-diagnostic-awaiting-controller`; a subsequent local relay pump tries to admit it but fails with `relay-controller-exclusive-unavailable` instead of transitioning to ACTIVE. A separate correctly wired Node controller might supply admission, but **its operational invocation and end-to-end linkage are not demonstrated in the accepted source/test scope**. Thus the end-to-end observability guarantee on which prior acceptance depended is not verified and the shipped validation build path is functionally incomplete if it is expected to be the Windows controller.

**Safety classification:** The absence of a lock fails CLOSED rather than permitting unsafe concurrent admission. The critical issue is **missing authorized controller integration/liveness**, not an unsafe bypass.

**Test gap:** The DEC-356 test fixture in `test-platform/test/dec354-diagnostic-retention.test.ts` supplies `RelayFiles.withExclusiveDiagnosticDevice` as a fake static lock. The direct OS-lock test in `test-platform/test/s08d-drive-mailbox-relay.test.ts` exercises `windowsDiagnosticExclusiveLock` in isolation. Neither proves that `buildValidationArtifact`'s generated plugin, or an expressly identified external Node controller entrypoint actually used by the feature, invokes the OS-locking relay, promotes pending records, and observes them in the Windows inbox. The focused 597/597 PASS can therefore coexist with the assembled-runtime defect.

**Required closure, within Owner-authorized architecture:**
- Make the separation of roles explicit: *validation plugin device reporter* stages only; *authorized external Node/Windows BVP controller* owns OS locking and admission. If the desktop Obsidian plugin must not own controller authority, remove/disable misleading desktop `relay:Platform.isDesktopApp` admission behavior or clearly scope it to read-only diagnostics; do **not** add a Node `fs` import to the browser/iOS bundle.
- Identify and wire a **real, callable Windows controller bootstrap/entrypoint** that uses `createWindowsMailboxRelayWithOSLock`, exact shared authority root and source/lease identity. Ensure OS-singleton topology; reject second independent controller hosts instead of assuming a local OS lock is a Drive-global lease.
- Author an **assembled-entrypoint adversarial integration test FIRST**: generate/execute the Windows-side validation/controller composition with a staged device event, assert `diagnostic-pending` remains non-ACTIVE before controller admission, then assert authorized controller promotion `pending→ACTIVE`, device journal delivery acknowledgment and durable Windows inbox record; include missing-lock, orphan-lock, stale authority, restart, concurrent publisher and no-operator fail-closed oracles.
- Show the exact run invocation/configuration that instantiates the external authorized controller in normal BVP operation, not only in mock tests or exported but unused helper functions.
- Requalify repaired exact source using the unchanged pinned local Windows PHX-CI and publish original immutable evidence. Repeat an independent full acceptance review; never inherit the prior accepted SHA's qualification after source/test changes.

## Pass-2 verification preserved, not rewritten

Original Windows PHX run `8fd67120-48d6-4e84-9c9d-d4b393be2901`, evidence commit `b1d2af6e1961129255cc1e952191b4c849c94bd7`, evidence JSON `dev/test-results/20261028T190352Z-operator-build-bvp-poll-error-observability-20261025-26f5ed8c95ad.json`, Git blob `26bb5e7c835cb0752f46ddb3892690d2476b4cfc`. Source/tree matches `26f5ed8c95adb4cef7c8b805d880fc613fc9afd1` / `8c8bcd8affa5cb370b8bf603c02d675fcc82dbba`. **All 11/11 PHX stages PASS, 597/597 focused BVP tests PASS and 1292/1292 product tests PASS; all exit 0.** Architecture guard **core 4469/4850**, **live 1235/1250** PASS. This evidence must remain unmodified. The canonical run-ID mirror is still not present at `dev/test-results/8fd67120-48d6-4e84-9c9d-d4b393be2901/result.json` at reassessment. Administrative mirroring may follow without claiming another PHX run.

## Amended ten-family conclusion

| Family | Updated result | Reason |
| --- | --- | --- |
| Nominal | PARTIAL / BLOCKING | No proven real controller assembly for pending→ACTIVE in generated path |
| Negative | ADEQUATE for covered malformed source | Missing lock fails closed; safety is distinct from success |
| State transitions | INADEQUATE / BLOCKING | Mock transition covered; assembled Windows-controller transition not |
| Idempotency/retry | ADEQUATE in mock scope | Stable IDs and immutable journal/remote payload, but never proves complete live composition |
| Concurrency | PARTIAL | Actual OS lock tested in isolation; no demonstrated caller path, independent hosts unsupported |
| Persistence | PARTIAL | Local restart tested; assembled staging-to-admission-to-inbox unproved |
| Identity/security/privacy | ADEQUATE for local source guards, integration UNPROVEN | Exact run hash/controller generation checks exist; true operational authority placement unverified |
| Compatibility | PARTIAL | Browser-safe plugin must not depend on Node locks, yet real Windows controller must be wired separately |
| Architecture | ADEQUATE guard, integration gap | Frozen budgets pass; validation-only boundary preserved |
| E2E/fail-closed | **INADEQUATE / BLOCKING** | Missing exclusive admission adapter prevents successful stage delivery in actual desktop generated path |

### Other scope and procedural caveats

The previously disclosed single-Windows-root-only topology and local trusted operator/API attestation boundaries still apply. Do not authorize physical device, actual personal Google Drive/vault, install, merge, promotion or release. This reassessment is a corrective review of the **already-published R5** verdict; it does not pretend to create a fresh blind current-candidate Pass 1, and the existing frozen Pass 1 report must remain immutable.

## Handoff / Reviewer authorization

The GitHub feature-specific state is **already at Reviewer→Builder handoff-count 10** with recipient BUILDER, state commit `411cfc7f1f0bc3e4d996cee494cabfce7fffb683`. Do **not** fabricate a new handoff count 11 or reset to 9. This corrective report **supersedes the prior PASS disposition** without replacing original PHX results. Update at most feature-specific `handoff-status` to `R5_CORRECTIVE_REASSESSMENT_CORRECTION_REQUIRED_BUILDER_COUNT_10`; leave count, sender/owner/recipient, immutable source and unrelated state unchanged. Builder must correct F01 and requalify exact repaired source before seeking another independent Reviewer. Administrative mirror/closeout is secondary to this acceptance blocker.

**Reviewer did not modify production source, tests, fixtures, scripts or original PHX-CI evidence; no software tests were executed.**
