# WS-07 / DEC-357 — Independent Windows OAuth and Authoritative BVP Diagnostic Controller

**Status:** NEW OWNER-APPROVED BUILD UNIT; IMPLEMENTATION DRAFT COMMITTED; **FIRST PHX-CI BLOCKED (FOCUSED TYPESCRIPT COMPILE)**; SOFTWARE **NOT QUALIFIED**; REVIEWER **NOT ACCEPTED**; OPERATION **NOT AUTHORIZED**.  
**Owner decision:** 2026-10-28, Option A (separate Windows OAuth), not Option B (Obsidian↔Node authenticated IPC).  
**Workstream:** WS-07 BRAIN Verification Platform; this is a **distinct follow-on build unit** dependent on DEC-352/354/355/356, not a new product workstream and not a revision to production WS-03 OAuth.  
**Feature/branch:** `WS-07/BVP_WINDOWS_CONTROLLER_OAUTH` on `build/bvp-poll-error-observability-20261025` until separately re-bound by the Owner.  
**Authority:** `dev/authority/decision-register.yaml` DEC-357, DEC-356/354/352, `dev/planning/01-target-system/bvp-subsystem-specification.md`, frozen `dev/authority/governance/locks/testing-platform-boundary.yaml` and current external engineering protocol.  
**Corrective predecessor:** R5 report `dev/reviews/bvp-runtime-error-observability-20261028-r5-corrective-integration-reassessment.md`, F01 HIGH, acceptance withdrawn.  
**Pre-documentation implementation checkpoint:** `af178ebc17f90d0be8db78c45f12b9bf22375594`. This is **not** a PHX-CI-qualified SHA. The branch HEAD moves with administrative documents; exact candidate identity must be frozen anew before software verification.  
**Current handoff-count:** 10, owner/recipient BUILDER. No new cross-role handoff merely because planning was updated.

## 1. Purpose and rationale

DEC-356 requires a **single authoritative Windows controller** with operating-system-exclusive admission of staged BVP diagnostic records. The generated Obsidian validation plugin is a **reporter**, using a vault adapter without exclusive controller authority. It cannot be assigned that authority by a desktop/platform flag. An initial Node controller helper existed, but lacked a documented, authenticated, normally invocable operating path. The Owner selected **Option A**: give the **separate Windows-only Node BVP controller its own Google OAuth Desktop PKCE session** rather than construct a privileged Obsidian↔Node IPC bridge.

This Build Unit is **validation-only**. It does not build another scenario runner, verification authority, production synchronization engine, Obsidian settings control, or new distributed lease system. It is not part of the shipping `main.js` or iOS/mobile artifact.

## 2. Scope and normative acceptance requirements

| ID | Requirement | Acceptance evidence |
| --- | --- | --- |
| BVP-WCO-001 | Only a separately authorized Windows Node process can operate the controller; Obsidian Windows/iOS validation builds remain device reporters, with no Node filesystem lock or delegated controller role. | Actual generated desktop/mobile bundle and source-boundary tests; no shipping bundle change |
| BVP-WCO-002 | Separate OAuth Desktop application authorization uses S256 PKCE, high-entropy single-use anti-CSRF state, localhost-only `127.0.0.1` callback, bounded lifetime, `offline` refresh token grant and only the pre-existing `https://www.googleapis.com/auth/drive.file` scope. | Callback forgery/replay, timeout, port, malformed scope and missing-refresh negative tests |
| BVP-WCO-003 | OAuth credentials never cross Obsidian→Node IPC, CLI argv, terminal logs, Google Drive evidence or repository; refresh tokens are persisted encrypted under Windows current-user DPAPI with denied/missing/corrupt decryption failing closed. | Token storage/restart/revocation/refresh tests; log/output and file-content inspection |
| BVP-WCO-004 | Only the already-authorized Google BVP mailbox is usable; the independent controller must NOT create another mailbox when `drive.file` visibility, account identity or permissions are missing/ambiguous. | Controller root-lookup failure test: zero writes and explicit unavailable result |
| BVP-WCO-005 | A single authorized Windows host and exact relay root own controller admission. The root-level process `wx` lock and device-scoped `wx` lock fence concurrency; orphan, missing, stale, conflicting or ambiguous authority fails closed; **no cross-host guarantee** is claimed. | Competing process, orphan restart, source/device/run/generation mismatch and failed-lock oracles |
| BVP-WCO-006 | Exact existing authenticated BVP Drive mailbox transports `diagnostic-pending → ACTIVE` exclusively under controller authority; staging or inbox observation is NEVER device delivery acknowledgment or event resolution. Device journal confirms delivery only after actual ACTIVE success. | Assembled reporter → fake Drive pending → Windows controller admit → journal confirm → durable Windows inbox test |
| BVP-WCO-007 | Preserve existing immutable originating device/run/event identity, content-hash proof, 5,000 ACTIVE/device limit, 90-day ACTIVE boundary, attested acknowledgment and verified archive-before-byte-preserving-retirement semantics. No deletion of unresolved/unacknowledged evidence. | Adversarial quota, retirement, replay, conflicting payload, forged proof, downtime and restart suites |
| BVP-WCO-008 | Windows controller starts, operates and stops through a real **compiled Node CLI** with explicit `--authorize`, bounded `--once`, and single-owner `--serve` modes. A missing runtime lease means idle/unavailable, not implicit admission. Controller process NEVER dispatches physical BVP commands. | CLI actual-process tests, singleton ownership, zero-command-publication/physical-dispatch assertions |
| BVP-WCO-009 | The new controller is classified under the frozen BVP architecture: no `src/**` shipping changes; no production-auth imports outside approved seam; no guard, script-count, framework core 4,850 / live relay 1,250, or PHX-CI pin changes. | Full unchanged PHX-CI architecture guard, metrics and repository-check |
| BVP-WCO-010 | Software-only tests cannot prove real separate OAuth client's access to existing app-owned `drive.file` files. Treat compatibility as a **separate owner-authorized live prerequisite**; do not silently broaden scope or substitute untrusted credentials. | Explicit negative claim in evidence/review; separate Owner go/no-go before real OAuth/Drive operation |
| BVP-WCO-011 | Requalify exact changed source through owner-operated unchanged pinned Windows PHX-CI, publish original immutable evidence, then obtain fresh independent Reviewer acceptance before any merge, installation, deployment, physical dispatch or release. | Exact source/tree/run evidence, 11-stage and test outcomes as actually observed, independent review verdict |

**Privacy:** no raw OAuth tokens, authorization codes, Drive response bodies/URLs with query parameters, vault data, actual device identifiers or local personal paths in published outputs. Authorized local callback URL contains only the one-time PKCE initiation transaction and is not an access/refresh token.

## 3. Frozen system boundaries and interface contracts

```text
BVP device validation plugin (Windows/iOS; browser-safe)
  └─ BvpRuntimeErrorJournal + authenticated reporter mailbox
       └─ Google Drive BVP mailbox: diagnostic-pending
            └─ Windows-only Node controller
                 ├─ separate OAuth Desktop PKCE → Windows DPAPI token file
                 ├─ one owner process lock + per-device OS-exclusive admission
                 ├─ existing DEC-356 mailbox/controller ops (ACTIVE, immutable proof, archival)
                 └─ durable Windows .bvp-relay/inbox records
```

**Authority split:** the existing live-battery executor creates/owns run/device/generation leases; the controller **consumes** such leases and cannot create them. Device reporter **stages** and confirms delivery only after successful ACTIVE transition. The Windows controller uses the **same** relay root as the live runner; the controller's diagnostic-only scope may not touch the ordinary command outbox. Two independent Windows hosts sharing one Drive mailbox are **not** supported.

**Shared interfaces** (source-defined; inspect current implementation before further edits):
- `test-platform/src/windows-controller-auth.ts`: `WindowsOAuthOptions`, `WindowsDpapiSecrets`, `authorizeWindowsController`, `createWindowsControllerRequest`. Independent desktop PKCE + DPAPI; `AuthenticatedDriveRequest` must retain provider HTTP status for canonical mailbox error/cursor classification.
- `test-platform/src/windows-diagnostic-controller.ts`: `runWindowsDiagnosticControllerOnce(request, {relayRoot,deviceId})`. Requires existing exact authority, uses `createWindowsMailboxRelayWithOSLock` and a pre-existing mailbox only.
- `test-platform/src/run-windows-diagnostic-controller.ts`: `WindowsControllerCycleOptions`, `withWindowsControllerProcessLock`, `runWindowsControllerCycle`; compiled entry `.test-build/bvp/test-platform/src/run-windows-diagnostic-controller.js`.
- `test-platform/src/live-device/drive-mailbox.ts`: `createDriveCommandMailbox(request,{allowRootCreation:false})` for controller; reporter retains normal mailbox creation behavior. `createWindowsMailboxRelay(...,{mode:"reporter"|"controller",deviceId?})` separates report/command read from exclusive ACTIVE admission.
- `test-platform/src/live-device/validation-entrypoint.ts`: installed generated device reporter; **never** Node `fs` or independent ACTIVE controller.
- `test-platform/src/live-device/live-scenario-executor.ts`: existing Windows Node OS lock and authoritative lease lifecycle.

**No new external verifier, server, background daemon auto-installation, privilege escalation or new OAuth scope.** The CLI is *not* an independent software verification engine; the only authoritative executable qualification remains PHX-CI.

## 4. Bounded build units, explicit dependencies, and test-first implementation

| Unit | Deliverable / dependency | Test-first oracle | Status as of planning |
| --- | --- | --- | --- |
| WCO-01 | Identity/transport contract; depends on DEC-356 reporter/controller separation | Missing lock, pending→ACTIVE, journal confirmation, inbox, no command side effects | Draft source/tests committed; unverified |
| WCO-02 | Windows DPAPI and separate PKCE; depends on WCO-01's immutable mailbox boundary | Scope, callback state/replay, refresh, restart, no-secret-plaintext, malformed/missing store | Draft source/tests committed; unverified |
| WCO-03 | Existing mailbox-only access, root/capacity/archival safety | Absent/ambiguous root, cursor expiry, unexpected status, no duplicate mailbox | Draft source/tests committed; unverified |
| WCO-04 | Real Node single-controller CLI composition, process singleton, lease fencing and fault recovery | Compiled process; two controllers; orphan lock; startup without lease; no command dispatch | Draft source/tests committed; unverified |
| WCO-05 | Full source-impact/architecture review, frozen exact software-only PHX-CI and evidence | Full focused/product tests and guard; no unauthorized change | **INITIAL RUN BLOCKED**; compiler repair and new exact-source run needed |
| WCO-06 | New independent blind/source-first Reviewer acceptance and Owner-controlled next-stage decisions | Separate frozen review; approval distinctly states mock vs live proof | **NOT STARTED** |

For resumed work, minimize changes and keep each coding-agent assignment bounded to one turn, with explicit interface ownership between any parallel workers. No test modification merely to make a failing assertion pass without reconciling its normative expectation.

## 5. Verification plan and adversarial matrix

**Nominal:** actual generated reporter cannot admit; distinct Windows Node PKCE client supplies authenticated request; ACTIVE confirmation and durable Windows inbox after staged upload.  
**Negative:** missing/corrupt DPAPI, token expired, refresh failure, absent `drive.file` permission, invisible mailbox, 401/403/429/5xx, malformed callback, absent/zero/stale lease, orphan lock, occupied capacity.  
**Concurrency:** concurrent OAuth callbacks; two controller processes; competing reporters; interrupted upload/ambiguous admission; refresh single flight; distinct host rejection under owner deployment policy.  
**Persistence:** restart process/controller/reporter; no false delivery; durable inbox replay; append-only/immutable ACTIVE source; event-specific archive+ack verification.  
**Security/privacy:** token never logged, file encrypted, callback state single use, no untrusted endpoint/URL, no browser/mobile Node dependency, no shipping `src/**` modification.  
**Compatibility:** exact `drive.file` semantics under independent Desktop OAuth **unverified against real Google**; software fixtures cannot substitute for Owner authorization or physical acceptance.  
**Authority:** unchanged Windows PHX-CI 11-stage pinned software-only execution, unchanged budgets/guard, reviewer rejection remains operative until independent fresh acceptance.

Test locations: `test-platform/test/windows-controller-oauth.test.ts`, `s08d-drive-mailbox-relay.test.ts`, `s08b-validation-build-entrypoint.test.ts`, existing DEC-354 retention and BVP architecture tests. Owner's PHX-CI launcher is `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1` with `-SoftwareOnlyBranch`, `-SoftwareOnlyGovernance`, `-ExpectedSourceSha`; **do not run during planning or infer PASS**.

## 6. Outstanding risks, decisions and acceptance gates

1. **Highest external compatibility risk:** Google `drive.file` access is app-specific. A second OAuth client could fail to see records initially created by the Obsidian client, even within a Google Cloud project. Existing root-only guard intentionally fails closed; no proof of real shared visibility. Owner must separately authorize a narrowly bounded real compatibility check after software qualification/review; if it fails, return to Owner for architecture choice, not switch OAuth scope automatically.
2. **Token storage/permission policy:** DPAPI current-user protects at rest; Windows filesystem ACL and operator account context must be independently verified before live activation. Do not persist credentials in `dev/`, vault, JSON evidence, argv, or console logs.
3. **Single-host owner control:** local `wx` locks do not coordinate independent hosts. Deployment topology is **one Windows host/controller root**; automated multi-host admission is prohibited.
4. **Current code status:** although draft modules/tests are committed, the first PHX-CI attempt was BLOCKED during focused TypeScript compilation before those BVP tests ran. The old R5 `26f5ed8c...` PASS of 597 focused tests cannot validate DEC-357. The first DEC-357 PHX-CI run on `af178...` was **BLOCKED**, not a qualification. The corrected R5 Reviewer verdict is **CORRECTION REQUIRED**.
5. **Stopping rule:** until this entire dev inventory/decomposition/traceability/state refresh is complete, **no PHX-CI run**, new reviewer handoff or live operation. After documentation, freeze current Git SHA, run unchanged pinned Windows PHX-CI only via explicit Owner operation, publish original evidence and request independent review only after substantive PASS.
6. **Owner approval boundary:** approval of Option A authorizes software development and design documentation; does not authorize opening a live Google login flow, operating on personal Drive/vault, physical iPhone testing, promotion or release.

## 7. Traceability and navigation

Canonical requirements: this WCO-001–011 table, cross-referenced in `dev/planning/01-target-system/bvp-subsystem-specification.md` and `requirement-traceability.md`.  
Ownership: WS-07 `00-WORKSTREAM.md`, `01-SCOPE.md`, `02-ARCHITECTURE.md`, `03-BUILD-DECOMPOSITION.md`, `04-VERIFICATION-PLAN.md`.  
Cross-workstream: production WS-03 Google OAuth is **not** modified; this validation-only separate OAuth client belongs in WS-07.  
Evidence: current `dev/state/current-state.yaml` feature section, `dev/planning/03-verification/verification-plan.md`, `dev/planning/03-verification/bvp-operator-runbook.md`.  
Historical R5 Reviewer report and original PHX-CI output remain immutable under `dev/reviews/` and `dev/test-results/`.


## 8. First immutable Windows PHX-CI observation — BLOCKED, not qualification (2026-10-28)

A **separate Owner-operated PHX-CI run** was published while this `dev/` documentation refresh was in progress; this documentation agent neither invoked it nor changed source/tests. Preserve the original evidence without alteration.

| Field | Source-bound observation |
| --- | --- |
| Verified source SHA | `af178ebc17f90d0be8db78c45f12b9bf22375594` |
| Verified Git tree | `8002bb96439af1d422b56b1ad26a8a8d524d15e8` |
| PHX-CI runtime pin | `69c4aa077d4a1a46d1e85e59f39d36285be99e83` |
| Run ID | `422cc526-615e-4848-8566-9f4152b5126e` |
| Evidence publication commit | `5a04d4710234f0a69a01c62e92179a381b23144f` |
| Original result | `dev/test-results/20261028T224816Z-operator-build-bvp-poll-error-observability-20261025-af178ebc17f9.json`, Git blob `d04f4a92aee689dd5bb3f21ee2a64391ffd47273` |
| Change-set / repository / overall | **FAIL / PASS / BLOCKED** |
| Focused test stage | **FAIL, exit 2** — compiler TS2304, `test-platform/test/s08d-drive-mailbox-relay.test.ts(820,35): Cannot find name 'readFile'` |
| Product test stage | **PASS** |
| Remaining stages | build/repository-check/check/artifacts **NOT REACHED** |

**WCO-R1-F01 corrective issue:** the source-level BVP test references `readFile` without an available binding. The focused tests were not executed because compilation failed; the real controller-integration tests therefore remain unverified. This is a scoped **Builder software correction** for a future coding phase, **not** an instruction to change source during the Owner-mandated dev-only documentation phase.

**Next sequence:** finish the complete `dev/` planning, traceability and continuity refresh; then the Builder may repair the compile blocker under the ordinary test-first/change-authority rules; freeze the *new* corrected exact source and run the unchanged pinned Owner-operated software-only Windows PHX-CI. The prior run's BLOCKED result must remain immutable and must not be repurposed to qualify any later candidate. Reviewer acceptance, real separate-client Google `drive.file` compatibility and Owner live/release authority all remain outstanding.


## 9. R1 compiler correction (unqualified)

Builder committed `9568e5936761c796c886cf74f4946b90a363a226`: add missing `readFile` import from `node:fs/promises` in the BVP integration test. No test expectation or production logic changed. The first original PHX-CI result remains BLOCKED for `af178ebc17f90d0be8db78c45f12b9bf22375594`. This corrective source has **not** passed PHX-CI and has not received independent review. Next gate: freeze the current corrected source SHA, run the unchanged pinned Windows PHX-CI software-only, assess original results and only then commission independent review. No physical/live operations or merge.

## Second PHX-CI BLOCKED, correction pending (2026-10-28)

Run 707952d6-95e7-4a7c-8b07-060bc99f056e verified source 63a509b20175f9c4a0da348ba06f8347faf258ec; evidence commit 74efbb8ec92756f4bc89a930cf0ec54e829fe53f. Focused BVP tests: 607 passed, 5 failed (numbers 144, 399, 460, 607, 609). Full product test stage passed. Overall BLOCKED. The original evidence is immutable.

The Builder committed targeted fixes for test registry completeness, device-bundle import attribution, root-level Windows process lock placement, root-conformant lock test, and timely expected OAuth promise rejection handling. The corrected source is NOT yet PHX-CI verified. No production code, PHX-CI pin, frozen architecture limit, physical execution, installation, or merge was changed. Preserve handoff-count 10. Run the next exact-source software-only Windows PHX-CI before independent review.
