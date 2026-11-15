# WCO-06 / DEC-357 — Frozen independent source-only assessment

**Date:** 2026-11-14  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Branch:** `build/bvp-poll-error-observability-20261025`  
**Feature:** `WS-07/BVP_WINDOWS_CONTROLLER_OAUTH`, WCO-06, locked DEC-357  
**Intake state:** `6b2fd7d761d1f872370d9fd407f872e53acb340d`  
**Exact qualified candidate source:** `07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0`  
**Candidate Git tree (direct immutable commit-object verification):** `759cc887985823293cd75fa4239c10096a45fdcc`  

## 1. Remotely verified authorization and review method

The live branch compared **IDENTICAL** to the supplied incoming state. The exact source is an ancestor of that state; the Git commit object establishes the claimed tree. The canonical **`bvp_windows_controller_oauth_2026_10_28`** block specifies correct feature, DEC-357, branch, **handoff-count 13**, **BUILDER sender / REVIEWER recipient**, and exact source. Other preceding feature blocks are not this feature's current handoff.

Neutral authority inspected: locked DEC-357 and inherited DEC-356/354/355 in `dev/authority/decision-register.yaml`; normative BVP-WCO-001–011 requirements and interface definitions in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md`; supplement in `dev/planning/01-target-system/bvp-subsystem-specification.md`; WS-07 architecture and frozen `dev/authority/governance/locks/testing-platform-boundary.yaml`. Only the numbered neutral requirements, design boundaries and source were used as technical criteria. Historic status statements in surrounding documents were not used as qualification evidence.

Exact source inspected: `test-platform/src/windows-controller-auth.ts`, `test-platform/src/windows-diagnostic-controller.ts`, `test-platform/src/run-windows-diagnostic-controller.ts`, `test-platform/src/live-device/{drive-mailbox,live-scenario-executor,validation-entrypoint}.ts`, and `test-platform/src/build-validation-artifact.ts`, all fetched by exact candidate SHA. Source tree listing was used to confirm source family. **Before publishing this report, no authored tests, previous Reviewer reports, source history/change diff or PHX-CI result/evidence were opened in this review turn.** This report is frozen on publication.

**Independence disclosure:** This conversation itself contains historical DEC-357/R1 and predecessor DEC-352 review material. Therefore **zero-historical-exposure blindness cannot be credibly claimed**, even though this WCO-06 pass is current-candidate source-before-tests/evidence. A strict never-previously-exposed Reviewer must be a newly initialized session. The full repository state was machine-filtered to current feature authorization rather than treated as proof.

## 2. Normative source-conformant architecture

1. **WCO-001/006 — reporter/controller split:** The generated Obsidian validation artifact passes its own vault adapter; `installBvpMailboxRuntime` constructs only `mode:"reporter"` on desktop, so no ACTIVE authority is conferred by `Platform.isDesktopApp`. A separate Windows-only Node controller binds the OS-exclusive device lock via `createWindowsMailboxRelayWithOSLock(...,{mode:"controller",deviceId})`, preserving ordinary command-outbox separation and existing run/device/generation ownership.
2. **WCO-002 — independent Desktop OAuth:** `windows-controller-auth.ts` derives 32 random bytes for callback state, 64 random bytes for PKCE verifier, S256 challenge, `127.0.0.1` local callback, offline refresh grant, exact `https://www.googleapis.com/auth/drive.file` scope, single callback exchange and bounded authorization deadline. Token provider response/refresh is validated before storage.
3. **WCO-003 — DPAPI and protection:** Windows-current-user `ProtectedData` uses PowerShell over stdin/stdout (never token values on CLI argv). New path restriction confines `.dat` token storage under `LOCALAPPDATA/BRAIN-BVP/controller`; safe-location checks reject direct symbolic links and current repo/vault sentinel directories; Windows ACL helper applies/probes owner-current-user, protected inheritance, and allow rules only for current user and SYSTEM. Synchronous and async credential methods encrypt and verify storage; path/ACL failures fail closed.
4. **WCO-004/010 — existing mailbox only:** `runWindowsDiagnosticControllerOnce` calls `createDriveCommandMailbox(request,{allowRootCreation:false})`; a missing/ambiguous root gives explicit unavailable, not a new mailbox. This does **not** prove real Google Drive `drive.file` sharing between separately registered OAuth clients; locked DEC-357 deliberately reserves that as a separate Owner-governed live gate.
5. **WCO-005/007 — single-host authority and protected retention:** Root process lock `controller-owner.lock` uses exclusive Windows `wx` creation and preserves crash-orphan fail-closed behavior; device lock is separate `<hash>.json.diagnostic.lock`. Mailbox ingress and active admission require exact device authority, preserve run/event hash, and retain existing active-cap, archive-first and no-unsafe-retirement semantics. No multi-host distributed lease is claimed.
6. **WCO-008 — compiled operational CLI:** `run-windows-diagnostic-controller.ts` implements `--authorize`, `--once`, `--serve`, requires explicit token file/root/device and no implicit lease creation. `--serve` holds the root lock for lifetime and suppresses command publication by controller-scoped relay. An overall cycle `AbortController` now enforces a default 30-second deadline, and per-request `bounded` transport covers refresh and Drive. SIGINT/SIGTERM aborts cycles and sleep. Failures use bounded, credential-free classifications.
7. **WCO-009/011 — source isolation:** These controller/OAuth modules are under validation-only `test-platform`; the browser reporter does not import Node filesystem/auth helpers. Frozen core/live ceilings remain **4850 / 1250**. No shipping, installation, physical execution, release or real OAuth authorization is inferred from this source audit. Exact-source architecture guard, pin provenance and software qualification await Pass 2.

## 3. Frozen source-level proof obligations

### WCO06-S01 — MODERATE / investigate strict overall-cycle termination for uncancellable local work

`boundedCycle` aborts a signal after 30 seconds and awaits `cycleCore`. Its downstream OAuth fetch and asynchronous PowerShell ACL/DPAPI helpers accept cancellation, and transport's `bounded` races unresolved fetch against a timeout — a meaningful improvement. However `runWindowsDiagnosticControllerOnce` also awaits local `readFile`, `readdir`, `writeFile` and relay filesystem calls without receiving the `AbortSignal`, and the process lock's filesystem operations are outside `boundedCycle`. A non-settling local FS Promise can defeat a literal hard cycle deadline (no outer race/forceful process boundary) and retain the singleton. This is not evidence of an observed real Windows filesystem stall; it is a theoretical adversarial boundary requiring test/evidence evaluation. **Pass 2:** inspect compiled-process timeout/release/restart tests, stuck asynchronous provider tests, and whether the stated WCO-008 bound is intended to cover the entire mixed FS/network cycle. Do not confuse an AbortController existing with proof that every awaited operation is cancellable.

### WCO06-S02 — MODERATE / identity and ACL location race proof obligation

`securedTokenLocation` enforces LOCALAPPDATA/controller root, absolute paths, no direct symbolic links, and protected owner/DACL; the new `enforceTokenAcl` is a real PowerShell+icacls implementation. It does not validate the LOCALAPPDATA root's own link/ACL, and path/ACL verification are separate from subsequent synchronous `readFileSync` / `renameSync`. Same-user tampering and Windows reparse-point/ACL changes between verification and use are not eliminated by source. A Windows current-user operator owns the authorized process, so such a race may be out-of-scope; nevertheless inspect adversarial symlink/junction, ACL refusal and unsafe-root tests, and classify any remaining risk precisely. Avoid equating encrypted file creation with full ACL proof.

### WCO06-S03 — MINOR / documented root-boundary liveness

`drive-mailbox.ts` now skips lock-artifact filenames unless they match exactly `^[0-9a-f]{64}\\.json$`, addressing the prior source concern about `.lock` files. It still parses validly named unrelated device leases before filtering to the exact controller device, so corruption in an unrelated canonical lease can conservatively block a cycle. This is fail closed, not command escalation. Pass 2 should distinguish intentional global authority corruption rejection from inadvertent deadlock and verify canonical lease handling.

### WCO06-S04 — MANDATORY EXTERNAL LIMIT / NOT A SOFTWARE DEFECT

A separate OAuth Desktop application may lack access to pre-existing `drive.file` objects owned through the reporter's OAuth client. No simulated integration establishes real cross-client visibility. **Owner must separately authorize a narrowly scoped live compatibility check before any real authorization, Google Drive operation, device activity, promotion or release.** If unsupported, return for architecture decision; no broader scope or alternate mailbox.

## 4. Provisional conclusion at source freeze

**SOURCE-ONLY: substantial corrective implementation present; final acceptance UNDETERMINED pending independent tests, all ten families, original immutable PHX-CI evidence and governance/pin checks.** The previous timeout, authority-lock enumeration and token-path concerns appear materially addressed in code. No independent software verification has been run and no implementation, test, script or original evidence was modified by Reviewer. This document must remain unchanged after publication.
