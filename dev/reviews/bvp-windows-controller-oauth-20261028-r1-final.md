# WS-07 / BVP_WINDOWS_CONTROLLER_OAUTH (DEC-357) — R1 FINAL Independent Review

**Final verdict: CORRECTION REQUIRED — NOT ACCEPTED.**
**Exact immutable source:** `3d55fa1bc8f46657b5462aa28a850a77124f76b4`.
**Exact verified Git tree:** `055c255e2fbb4e3881ddf534529ba18966daf41b`.
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`.
**Branch:** `build/bvp-poll-error-observability-20261025`.
**Date:** 2026-10-28.

The exact candidate passed all original local Windows PHX-CI stages and implements the distinct Owner-selected Option A OAuth/controller design. It does **not** satisfy all normative acceptance conditions: the supposedly bounded Node controller cycle has no timeout/cancellation boundary for indefinitely stalled OAuth/Drive I/O, and the original tests do not exercise that failure. Operator token-path protection and authority-directory artifact tolerance also remain adverse conditions not closed by tests. This verdict does NOT declare PHX-CI invalid or imply a Google/iOS failure observed in the wild.

## 1. Verified identity, authorization, access order

GitHub remote `build/bvp-poll-error-observability-20261025` was refreshed and **IDENTICAL** to incoming state `15e3d4b12c702c373ea781fe84da5746b8af90c0` before any review write. The canonical feature block `bvp_windows_controller_oauth_2026_10_28` specifies exact `WS-07/BVP_WINDOWS_CONTROLLER_OAUTH`, DEC-357, handoff-count **11**, current recipient REVIEWER, branch and exact source SHA. This is **not** the earlier `BVP_RUNTIME_FAILURE_OBSERVABILITY` handoff: the predecessor was rejected and new DEC-357 Option A is a separate bounded Build Unit.

Locked authority: DEC-357; inherited DEC-352, DEC-354, DEC-355, DEC-356; BVP-WCO-001–011 in `dev/planning/02-workstreams/WS-07-brain-verification-platform/tasks/bvp-windows-controller-oauth-2026-10-28.md`; supplemental `dev/planning/01-target-system/bvp-subsystem-specification.md` and locked `dev/authority/governance/locks/testing-platform-boundary.yaml`. Only validation-only source, fixed architecture budgets and pinned PHX-CI are authorized, never new shipping sync/OAuth, multiple host controllers, real OAuth/Drive, installation, merge, physical dispatch or release.

**Frozen source assessment:** `dev/reviews/bvp-windows-controller-oauth-20261028-r1-source.md`, publication commit `0c3e03b570084cf12aa01b9fa373e544737e4863`, created **before** reading authored tests, original PHX-CI evidence or source history. It examines exact-SHA `test-platform/src/{windows-controller-auth,windows-diagnostic-controller,run-windows-diagnostic-controller}.ts`, `test-platform/src/live-device/{drive-mailbox,live-scenario-executor,validation-entrypoint}.ts`, and the generated browser validation artifact source.

**Integrity-of-blind-pass disclosure:** The entire authoritative task file was fetched in Pass 1, inadvertently exposing historical Builder/verification narrative embedded in its lower sections. Therefore this review cannot truthfully certify literal no-narrative-exposure blindness, although source findings were independently derived before current tests/PHX-CI were read. This conversation also contains prior DEC-352 reviewer history. If governance demands a pristine zero-exposure Reviewer, commission a new session after any correction; do not present this R1 as perfectly blind.

## 2. Exact PHX-CI qualification verified

**Original PHX-CI run:** `494b79f3-b948-4544-a562-02971cdbc7d4`.
**Original publication commit:** `d179034e97c1a25c1682b4bfbb885b7327e46578`.
**Original JSON:** `dev/test-results/20261029T012557Z-operator-build-bvp-poll-error-observability-20261025-3d55fa1bc8f4.json`, Git blob `1ddccc1f262b88dc8e95bf7d2ffc2fdbc9118858`; accompanying original MD/log and `dev/_ca-output.{json,md}` are published. Source→original-evidence compare is **one commit modifying precisely five evidence files**; original-evidence→incoming state compare covers only task/runbook/handoff administration, **not implementation or tests**.

Evidence `repository.verifiedHead` is **exactly** `3d55fa1bc8f46657b5462aa28a850a77124f76b4` and `repository.verifiedTree` **exactly** `055c255e2fbb4e3881ddf534529ba18966daf41b`. Original status **11/11 stages PASS**, each exit 0: preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts; change-set PASS, repository PASS, overall PASS. Focused BVP **612/612 PASS**, product **1292/1292 PASS**; suites overlap and must not be summed. Pinned runtime **`69c4aa077d4a1a46d1e85e59f39d36285be99e83`**, framework `0.2.0-dev.2`. Verified OS Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1. Architecture guard PASS: framework core **4729/4850** (121 LOC margin), live agent/relay **1236/1250** (14 LOC margin), `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`. No code/test/script/evidence mutation followed qualification at handoff.

**Canonical run-ID evidence mirror:** `dev/test-results/494b79f3-b948-4544-a562-02971cdbc7d4/result.json` was NOT_FOUND at incoming handoff. The original flat evidence remains authoritative; Builder may publish a byte-identical administrative mirror with provenance, not present it as a new PHX-CI run.

## 3. Substantial requirements satisfied in software

- **WCO-001/006:** Generated Obsidian artifact is reporter-only. `installBvpMailboxRuntime` uses `mode:"reporter"`; Windows Node controller has a separate entry and OS lock. Actual simulated reporter staged `diagnostic-pending`→separate OAuth-backed controller ACTIVE→durable inbox test PASSED. No Node module enters the browser validation runtime or shipping bundle.
- **WCO-002:** Localhost-bound 127.0.0.1 Desktop OAuth, high-entropy 32-byte state, 64-byte verifier, S256 PKCE, explicit single-use callback, offline refresh grant, one `drive.file` scope; happy path, replay rejection and missing refresh tests PASS.
- **WCO-003:** Windows-current-user DPAPI stores refresh-token JSON as encrypted bytes, stdin/stdout secret transfer to PowerShell rather than CLI argv, guarded domain-limited Drive Bearer request, missing/corrupt token fail closed; mocked restart/refresh PASS. Operational file path policy is separately noted below.
- **WCO-004/010:** Controller mailbox is created with `allowRootCreation:false`; missing or inaccessible old mailbox fails closed instead of manufacturing a second. **Real cross-client Google `drive.file` visibility remains unverified and explicitly Owner-gated**, not a silent PASS.
- **WCO-005:** Windows Node process root-level `wx` lock, per-device `wx` lock and exact existing controller-authority source/generation. Root collision/orphan tests PASS. No distributed cross-host ownership claim.
- **WCO-007/009:** Inherited diagnostic origin, safe journal/pending, immutable event ID, 5,000 ACTIVE/90-day cap, resolved-event proof and verified byte-preserving retirement remain source-protected; no shipping `src/**`, PHX runtime or frozen budgets changed.
- **WCO-008:** The CLI is real, compiled Node `--authorize`, `--once`, `--serve`; controller mode expressly skips command outbox and sent-result loops. Its *time bound* is deficient as described next.

## 4. OPEN independent findings

### WCO-R1-F01 — HIGH / BLOCKING — `--once` and `--serve` lack enforceable bounded I/O and lock recovery

**Authority:** BVP-WCO-008 expressly requires **bounded `--once`**; WCO-002 specifies bounded OAuth callback transaction; WCO-005 requires the exclusive single-controller lock; WCO-006 requires eventual stage→ACTIVE delivery without false acknowledgement.

**Source counterexample:** `test-platform/src/run-windows-diagnostic-controller.ts` `runWindowsControllerCycle` obtains `controller-owner.lock`, then awaits `cycleCore`→`runWindowsDiagnosticControllerOnce`→mailbox `pumpOnce`. `test-platform/src/windows-controller-auth.ts` `createWindowsControllerRequest` performs both refresh-token and Drive `fetcher` calls **without AbortSignal, signal deadline or per-request timeout**; `windows-diagnostic-controller.ts` awaits the relay's remote I/O without a cycle deadline. Supply an authorized token but a valid mocked `fetcher` whose Promise never settles: neither `--once` nor `--serve` reaches completion, `controller-owner.lock` remains held, staged events remain pending indefinitely. `--serve` also cannot progress to next cycle or respond promptly to SIGINT/SIGTERM while `cycleCore` is pending. The PKCE `--authorize` listener has a 120-second `result` timer, but the in-flight token exchange fetch is not aborted when that timer fires; callback/socket shutdown completion is unproven.

**Authored tests:** `test-platform/test/windows-controller-oauth.test.ts` tests compiled `--once` **only** for immediate missing credentials (exit 1); authorization callback success/replay, token refresh success, corrupt token, root-lock contention and exact mock assembly. It does not exercise a hanging refresh, hanging Drive request, process termination/release, nor subsequent controller recovery. The PHX 612/612 PASS therefore does not prove the bounded-cycle contract.

**Required correction:** Introduce a bounded cancellation/deadline policy for token exchange, Drive calls and the complete `--once` operation, including process/root/device lock finalization and explicit UNKNOWN/unavailable classification on timeout. Ensure a timed-out async remote mutation cannot later be incorrectly acknowledged. Design `--serve` shutdown and restart safety under a nonresponding provider, with a deterministic nonresolving `fetcher` adversarial test and actual compiled-process deadline test. Preserve existing OAuth scope and no live Google calls. The Owner must approve any required architecture/budget changes before they occur.

### WCO-R1-F02 — MODERATE — Mixed authority directory may reject legitimate concurrent controller cycles

`createLiveScenarioExecutor` creates temporary `controller-authority/<deviceHash>.json.lock` while safely editing a run lease; its device-level lock also uses `.json.diagnostic.lock`. The Node diagnostic relay's `pumpCore` lists **all** files in that directory and parses each as a lease JSON before filtering to the requested device. A transient or orphan coordination file is not a lease and yields `relay-controller-authority-invalid`. This is protective fail-closed behavior, but can stall legitimate `--serve` cycles during run startup and persistent orphan artifacts can block all cycles. The current tests verify lock collisions/orphan protection but do **not** prove canonical-name-only lease enumeration across simultaneous runner startup and mixed authority directory. Add regression oracles for canonical JSON lease selection, valid mixed-device roots, transient lock files and genuine malformed canonical lease. Do not broadly ignore forged real lease files.

### WCO-R1-F03 — MODERATE — Token path restriction and Windows ACL policy not established

`WindowsDpapiSecrets` permits **any absolute token-file path** on Windows; the CLI accepts `--token-file` without forbidding repository, vault, or dev-evidence directories. WCO-003 prohibits credentials under those surfaces. DPAPI does protect their confidentiality against a different Windows user; it is not equivalent to a raw plaintext token leak. However a user can direct the encrypted token file into a prohibited repo/vault and there is no Windows ACL inspection; POSIX `mode:0o600` is not an audited Windows ACL guarantee. Require an explicit configured trusted local path policy, no secret files inside repo/vault, and Windows account/ACL checks appropriate to the approved single-owner topology. Test denial of unsafe storage paths and denied/malformed permissions before declaring the complete secure-storage requirement satisfied.

### WCO-R1-F04 — MINOR — Evidence organization and current documentation

The exact original R3 PHX-CI evidence is published as flat original files, but the run-ID mirror was missing at intake. Publish byte-identical `result.json`, MD, terminal log and provenance after preserving originals. The current `bvp-operator-runbook.md` contains stale language saying DEC-357 tests are not PHX-CI qualified, while the original source-exact R3 evidence proves PASS. Administrative runbook alignment is needed but must not be used to conceal the software acceptance blockers.

### WCO-R1-F05 — PROCEDURAL — Literal blind isolation not fully satisfied

The full task file contains historical Builder narratives and was accessed before Pass 1 freeze; prior-conversation feature exposure also exists. This was disclosed in the frozen source review; independent source-level findings are grounded, but strict no-narrative-before-freeze compliance cannot be claimed. After correction, use a new fresh Reviewer session if that exact standard is mandatory.

## 5. Mandatory ten-family assessment

| Family | Result | Independent evidence / unresolved oracle |
| --- | --- | --- |
| 1. Nominal | ADEQUATE (software only) | Generated reporter, staged record, separate OAuth-backed mocked controller, ACTIVE and Windows inbox |
| 2. Negative/malformed | PARTIAL | Corrupt/missing token, rejected scope/callback, inaccessible root fail closed; no hung-I/O timeout case |
| 3. State transitions | PARTIAL / BLOCKING | Staged→ACTIVE→received and missing lease covered; stalled refresh/Drive leaves cycle/lock indefinitely pending |
| 4. Idempotency/retry | ADEQUATE in tested scope | Remote event ID and media immutable, duplicate archived/ACTIVE and callback replay handled |
| 5. Concurrency/ordering | PARTIAL / BLOCKING | Local `wx` collision, orphan and callback replay verified; stalled cycle and mixed authority lock/lease listing untested |
| 6. Persistence/restart | PARTIAL | DPAPI restart and durable journal/inbox proven; timeout/lock-release/restart after abandoned request untested |
| 7. Identity/security/privacy | PARTIAL | S256, 32-byte state, strict scope and DPAPI protect secrets; token directory/ACL policy unverified |
| 8. Compatibility/interfaces | ADEQUATE for mocks | Distinct reporter/controller, old mailbox only, command publication suppressed; real cross-client visibility separately Owner-gated |
| 9. Architecture/governance | ADEQUATE exact source | PHX 11/11 PASS, frozen guard 4729/4850 and 1236/1250, no shipping changes |
| 10. E2E/fail-closed | INADEQUATE / BLOCKING | Event-to-inbox success proved, but nonresponding OAuth/Drive provider leaves exclusive controller indefinitely unavailable |

**Final ten-family adequacy is insufficient for independent feature acceptance.**

## 6. Disposition and restricted Reviewer→Builder handoff

**CORRECTION REQUIRED — NOT ACCEPTED.** Original R3 PHX-CI PASS at source SHA `3d55fa1bc8f46657b5462aa28a850a77124f76b4` remains authentic; no Reviewer validation was run. This is not approval for real Desktop OAuth login, any live Google Drive access, personal vault/device activity, installation, merge, prerelease or release.

After publishing this report, only the **feature-specific** `bvp_windows_controller_oauth_2026_10_28` handoff metadata in `dev/state/current-state.yaml` may change: handoff-count **11→12**, sender REVIEWER, recipient BUILDER, exact source unchanged; status `R1_CORRECTION_REQUIRED_REVIEWER_TO_BUILDER`. Do not change unrelated `bvp_poll_error_observability_2026_10_25` or top-level feature handoff, source, tests, scripts, original PHX evidence or locked authority. Builder must address F01, F02, F03 with source-grounded test-first work and Owner-governed architecture limits, run a fresh exact-source pinned Windows PHX-CI, publish original immutable evidence and issue a new authorized Builder→Reviewer handoff. A new pristine Reviewer session is recommended for literal blind compliance.
