# DEC-357 / WS-07 BVP Windows Controller OAuth — R1 Frozen Source-Only Assessment

**Date:** 2026-10-28
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Feature:** `WS-07/BVP_WINDOWS_CONTROLLER_OAUTH`, Owner decision DEC-357
**Branch:** `build/bvp-poll-error-observability-20261025`
**Exact immutable implementation SHA:** `3d55fa1bc8f46657b5462aa28a850a77124f76b4`
**Incoming handoff state SHA:** `15e3d4b12c702c373ea781fe84da5746b8af90c0`

## Current authority and source-only protocol

The GitHub branch was refreshed and compared **identical** to the supplied incoming state. The feature-specific block `bvp_windows_controller_oauth_2026_10_28` binds exact feature ID, source SHA, handoff-count **11**, current recipient **REVIEWER**, branch and governing task. `DEC-357` is locked; DEC-356/354/355 and the unchanged architecture lock remain applicable. This is a **new bounded OAuth/controller build unit**, not an administrative reclassification of the preceding rejected DEC-352 candidate.

Reviewed, before tests or PHX-CI: locked DEC-357 and related neutral decisions in `dev/authority/decision-register.yaml`; BVP-WCO-001–011 in task `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md`; normative supplement in `dev/planning/01-target-system/bvp-subsystem-specification.md`; frozen architecture boundary; and exact source `test-platform/src/{windows-controller-auth,windows-diagnostic-controller,run-windows-diagnostic-controller}.ts`, `test-platform/src/live-device/{drive-mailbox,live-scenario-executor,validation-entrypoint}.ts` and `test-platform/src/build-validation-artifact.ts`.

**Access-order qualification:** The full task document was initially fetched, which itself includes historical Builder/evidence narrative in its lower sections (notably sections 8 and beyond). This violates a strictly literal *never read Builder narrative before source freeze* condition, even though those historical assertions were NOT used as evidence for the source findings and no authored test file, earlier Reviewer report, Git source history or PHX-CI evidence file was read. This reviewer also has prior DEC-352 contextual exposure from preceding turns. It would be false to claim a pristine blind session. The source conclusions below are independently grounded at the immutable SHA; a truly clean historical-blind review requires a separate new reviewer session.

## Neutral contract and observed implementation

1. **Reporter/controller separation (WCO-001, 006):** The generated Obsidian validation plugin uses browser-safe `installBvpMailboxRuntime`; the entrypoint passes `scope:{mode:"reporter"}`, which skips controller admission. Windows diagnostic controller constructs `createDriveCommandMailbox(request,{allowRootCreation:false})` and `createWindowsMailboxRelayWithOSLock(...,deviceId)`, keeping Node filesystem operations outside browser/mobile runtime.
2. **OAuth Desktop PKCE (WCO-002):** `windows-controller-auth.ts` generates 32-byte random state, 64-byte PKCE verifier, SHA-256 S256 challenge, localhost-only HTTP listener at `127.0.0.1`, explicit callback state/authorization code, `access_type=offline` and one exact `https://www.googleapis.com/auth/drive.file` scope. It validates token response shape, requires refresh token on new grant, and closes listener after completion/timeout.
3. **DPAPI (WCO-003):** Current-user `ProtectedData.Protect/Unprotect` via non-interactive Windows PowerShell, piping base64 via stdin/stdout rather than argv, AES/OS key storage external to Obsidian, temp+rename encrypted file, plaintext not logged. Missing/corrupt/unprotect failure is explicit. Request transport only attaches Bearer to `https://www.googleapis.com` Drive v3 paths.
4. **Existing-root-only (WCO-004):** Controller constructs mailbox with `allowRootCreation:false`; unseen root produces `mailbox-root-not-accessible` rather than silently creating a parallel mailbox. Real cross-client `drive.file` visibility cannot be proved by software and is expressly Owner-gated.
5. **Windows-exclusive topology (WCO-005):** `run-windows-diagnostic-controller.ts` acquires root-level `controller-owner.lock` via `open(...,"wx")`; the relay uses the device-scoped Node `wx` lock and checks durable controller authority. There is no global distributed lock or multi-host claim.
6. **CLI (WCO-008):** Explicit `--authorize`, `--once`, `--serve`; fixed client/token/root/device config, no implicit lease creation, controller mode skips command outbox/sent publishing and only admits diagnostics under lock; `serve` holds process lock throughout its life.
7. **Architecture (WCO-009):** New auth/controller/CLI modules are validation-only `test-platform/src/**`; lock remains **4850 core / 1250 live agent**; shipping isolation and pinned PHX-CI must be independently verified in Pass 2.

## Frozen independent findings / proof obligations

### R1-S01 — MODERATE/HIGH: `--once` is not bounded against stalled OAuth/Drive operations

WCO-008 explicitly requires a **bounded `--once`** mode; WCO-002 demands bounded OAuth authorization. `runWindowsControllerCycle` obtains an OS root lock then awaits `cycleCore`→`createWindowsControllerRequest`→`runWindowsDiagnosticControllerOnce`→Drive mailbox `pumpOnce` with **no overall cycle timeout, AbortSignal, bounded I/O time limit or deadline**. `createWindowsControllerRequest` calls the configurable/native `fetcher(url, {...})` without timeout for both refresh and Drive requests; `windows-diagnostic-controller.ts` filesystem and relay operations are likewise awaited with no deadline. An authenticated but permanently stalled OAuth token refresh, Drive fetch or interrupted callback may hold `controller-owner.lock` and leave `--once` running indefinitely, preventing future controller service. For `--serve`, an indefinite `cycleCore` likewise stalls future cycles and signal-driven shutdown. The authorization code callback has its own timer, but this does not bound the general controller cycle. **Pass 2 must inspect real process tests injecting non-resolving fetch/transport, abort/release lock on timeout and preserved pending/UNKNOWN state.** The claimed "bounded" CLI cycle must be explicit, not inferred from OS defaults.

### R1-S02 — MODERATE: Authority directory lock artifacts can be misclassified as authority files

`createLiveScenarioExecutor` locks controller authority paths by creating `controller-authority/<deviceHash>.json.lock` during initial lease creation. The diagnostic relay `pumpCore` enumerates **all** files under `controller-authority` and parses every file as a `ControllerAuthority` JSON document before checking device ID or skipping irrelevant leases. A transient `.json.lock` or abandoned crash lock in the same directory becomes `relay-controller-authority-invalid` and blocks a controller cycle. The per-device diagnostic `.json.diagnostic.lock` has the same co-location, although a local `pumpCore` normally enumerates before taking its own device lock. This fails CLOSED but may prevent progress during an ordinary concurrent scenario startup or crash, even if the actual `.json` lease is valid. **Pass 2:** verify tests cover concurrent live runner lease mutation, orphan/lock files, mixed-device directory and that controller selects only canonical exact lease records rather than treating coordination files as malformed leases.

### R1-S03 — MODERATE: Operator-only token file path/ACL policy is not enforced by the auth module

`WindowsDpapiSecrets` enforces `process.platform==="win32"` and an absolute `tokenFile`, uses current-user DPAPI and writes encrypted temporary file with mode `0o600`. It does **not** validate that the supplied absolute token path lies outside repo/vault/evidence or that the existing parent/file ACL excludes other Windows principals. DPAPI protects decryption from other users, and no plaintext is knowingly persisted, so this is not equivalent to an exposed refresh token; however WCO-003 specifically prohibits storage under vault/repo and WCO-002/003 require operator-secure storage. A CLI caller can currently pass a path under those forbidden roots. **Pass 2:** verify operator-runbook/documented path contract and tests for rejected unsafe directories or a narrow Owner-approved path policy. Do not falsely claim Windows POSIX mode bits prove Windows ACLs.

### R1-S04 — MINOR: No real cross-client Google Drive proof

The new OAuth client may not see mailbox objects created by the original Obsidian OAuth client under `drive.file`. The implementation correctly refuses to create another root. This is an **explicit accepted external prerequisite**, not something fake Drive software tests can close. No real OAuth/Drive operation, installation, physical iPhone dispatch or release is authorized by DEC-357.

## Frozen provisional verdict

**SOURCE-ONLY: CORE ARCHITECTURE PRESENT; FINAL ACCEPTANCE WITHHELD.** Normative separation, PKCE, DPAPI, root-only lookup and a true Windows Node entrypoint exist. Unbounded `--once` and strict authority-directory parsing appear source-grounded liveness problems; operator token-path checks remain a security/operational proof gap. Pass 2 must independently assess tests, ten-family coverage, exact source/tree/evidence identity and Owner governance. This document is frozen on publication; Reviewer performed no software validation or implementation/test/script/evidence changes.
