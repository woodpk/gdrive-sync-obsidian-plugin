# DEC-352 / DEC-354–356 — R5 Final Independent Architectural, Security, Correctness and Governance Review

**FINAL VERDICT: PASS WITH MINOR FINDINGS — SOFTWARE FEATURE ACCEPTED WITH EXPLICIT SCOPE BOUNDARIES.** Acceptance is limited to the source-verified and PHX-CI-qualified BVP validation-only Windows *single-authoritative-controller/shared-authority-root* software design. This is NOT authorization for a second independent Windows controller, a physical iPhone test, installation, release, promotion, real Drive/vault operation or production synchronization. The untested external authorization and actual deployment of the trusted controller must remain Owner-gated.

**Repository:** `woodpk/gdrive-sync-obsidian-plugin`
**Branch:** `build/bvp-poll-error-observability-20261025`
**Feature:** `WS-07/BVP_RUNTIME_FAILURE_OBSERVABILITY`, locked DEC-352/353/354/355/356
**Reviewed immutable source SHA:** `26f5ed8c95adb4cef7c8b805d880fc613fc9afd1`
**Verified source Git tree:** `8c8bcd8affa5cb370b8bf603c02d675fcc82dbba`
**Date:** 2026-10-28

## 1. Remote authorization and correct source-first sequence

Incoming canonical state commit `16a7e496c3dab0e39c6b6cec689afcc3142c5cf6` matched the refreshed branch HEAD **IDENTICAL** at intake. Feature-scoped `bvp_poll_error_observability_2026_10_25` (NOT the unrelated top-level BVP_CLI_RESULT_FINALIZATION handoff) bound handoff-count **9**, sender BUILDER, owner/recipient REVIEWER, feature identity and exact source SHA. The source is an ancestor by two evidence/state commits. All review/administrative writes are separate descendants; candidate SHA remains immutable.

**Frozen Pass 1 source report:** `dev/reviews/bvp-runtime-error-observability-20261025-r5-source.md` at source assessment commit **`1555f2c0a5650e8b8580b547c9b00a5791eac681`**, published **BEFORE** opening this candidate's tests, earlier review documents, code history/diff or original PHX-CI results. Reviewed locked DEC-352/353/354/355/356 normative decisions, required feature task, frozen machine-readable boundary and WS-07 architecture, and exact-SHA BVP journal, relay, mailbox and validation source. Then in Pass 2 independently inspected dedicated DEC-354/356 and S08 regression tests, actual Windows OS lock assembly/implementation, code boundary diff and original evidence.

**Independence disclosure:** This conversation has earlier DEC-352 Reviewer turns. The current candidate underwent source-before-tests/evidence isolation, but the reviewer cannot credibly assert zero historical prior knowledge. If the process requires a *new agent with no previous DEC-352 exposure*, use a separate fresh Reviewer session before considering the procedure fully blind. This is a process limitation, not a PHX-CI or production-software defect.

## 2. Exact original PHX-CI evidence is authentic

- **Original R5 PHX run ID:** `8fd67120-48d6-4e84-9c9d-d4b393be2901`.
- **Original evidence commit:** `b1d2af6e1961129255cc1e952191b4c849c94bd7`.
- **Original flat evidence JSON:** `dev/test-results/20261028T190352Z-operator-build-bvp-poll-error-observability-20261025-26f5ed8c95ad.json`, Git blob `26bb5e7c835cb0752f46ddb3892690d2476b4cfc`; adjacent `.log`, `.md`, and canonical `dev/_ca-output.{md,json}` committed with it.
- Original evidence directly reports `repository.verifiedHead=26f5ed8c95adb4cef7c8b805d880fc613fc9afd1` and `repository.verifiedTree=8c8bcd8affa5cb370b8bf603c02d675fcc82dbba`; both match immutable reviewed source/tree.
- Source→evidence compare **ahead by one evidence-only commit**, changing exactly five PHX evidence files; evidence→handoff state compare **ahead by one state-only commit**, no source/test edits. The R4→R5 source compare is limited to authorized BVP validation-only source/tests and authorized `dev/**` governance/planning, with **no `src/**` shipping modification**.
- **Pinned unchanged PHX-CI runtime:** `69c4aa077d4a1a46d1e85e59f39d36285be99e83` / `0.2.0-dev.2`. Environment Windows NT 10.0.26200, PowerShell 7.6.6, Node v22.23.2, Task 3.53.1.
- **All 11/11 stages PASS, exit 0:** preflight, node-preflight, node-project-files, install, typecheck, test-focused, test, build, repository-check, check, artifacts. Change-set **PASS**, repository **PASS**, overall **PASS**.
- **Focused BVP 597/597 PASS**, **product 1292/1292 PASS**, zero fail/skip; these suites overlap, so do not add them into a unique total.
- Original focused stdout specifically confirms DEC-356 tests #136–142, #453–456, including fail-closed device staging, independent event proof, forged/mismatched proof rejection, successful verified retirement/resumed admission, two-controller last-slot contest under one lock, crashed/orphan lock fail-closed, and remote event immutability.
- Frozen guard PASS: framework core **4469/4850**, live-device agent/relay **1235/1250** (only **15 LOC remaining**), established DEC-355 Owner-approved budgets; repository check `BVP_REPOSITORY_CHECK_RESULT=PASS devRootExit=0 shippingArtifactExit=0 guardExit=0 metricsExit=0 context=authoritative changeClass=authorized-governance`. The governance authorization cannot be used to relax any future ceiling.
- **Run-ID mirror not present** at intake: `dev/test-results/8fd67120-48d6-4e84-9c9d-d4b393be2901/result.json` returned NOT_FOUND. The original flat evidence is immutable and complete. Builder should mirror the exact original JSON/MD/log bytes and provenance under this canonical run-ID folder without overwriting or rerunning.
- Reviewer executed **no software tests/PHX-CI**, physical commands or real Google Drive requests.

## 3. Prior independent defects closed within qualified scope

**Incorrect run-origin attribution:** Local journal persists run/device identity, checks opaque hash; the remote device-scoped reader validates bound/unbound run hashes before inbox ingestion. Prior forged run-A metadata substitution and historical-run under B-lease defects have dedicated passing tests. History read-only cannot confer historical command dispatch rights.

**Wrong/colliding remote records:** Device journal cannot reuse a remote event snapshot after remoteFileId reservation/delivery: coalescing is restricted to pre-reservation undelivered entries, and the mailbox refuses changes to staged/ACTIVE media. The stable remote file ID reconciles lost create/upload/visibility acknowledgments. Pending records do not become false delivered records.

**Historical/unbound delivery and >200 pages:** Controller-owned device-scoped diagnostic retrieval includes historical and unbound records, reads 25 per page, commits inbox before cursor, and handles expired cursor restart with bounded idempotent replay. Malformed/forged identity fails closed.

**Verified archive and resolution:** DEC-356 `acknowledgeDiagnostic` uses trusted local controller boundary + exact controller generation, event/device/run and SHA-256 content verification. A durable event-specific receipt is written only after validation; `retire` validates archive bytes/metadata and unchanged ACTIVE source before changing its kind to `diagnostic-retired`, preserving bytes, archived copy and original traceability. Mere inbox observation/archiving never retires an unacknowledged event; errors retain ACTIVE evidence.

**Admission and quota:** Device `publishDiagnostic` stages `diagnostic-pending` and returns an explicit unavailable/awaiting-controller result. Only `controllerOps.admit` can change kind to ACTIVE after remote count/age checks. `withController` requires an adapter-level exclusive device lock and current controller-authority file; the production Node/Windows helper `createWindowsMailboxRelayWithOSLock` wires a real `windowsDiagnosticExclusiveLock` using OS-exclusive `open(path,"wx",0o600)`. Collision and orphan/crash locks fail closed; one-authority 4999→5000 competition and actual 5000→5001 failure are tested. No claim is made that different independent Windows roots share the same lock.

## 4. Residual MINOR findings / acceptance boundaries

### R5-M01 — SINGLE-AUTHORITY TOPOLOGY MUST BE ENFORCED OPERATIONALLY

**Scope:** DEC-356 authorizes **one authoritative serialized Windows controller**. Within a shared Windows controller authority root, the `wx` lock is a concrete cross-process exclusion primitive and a genuinely tested software boundary. It is **not** a globally atomic Google Drive lock across two independently deployed Windows hosts/roots. Such a second controller is outside approved topology and could revive the 4999→5001 race. No permission to deploy or activate multiple independent controllers is granted. Before physical use, Owner must establish one trusted root/controller and explicitly reject duplicate installations, remotely conflicting controllers and ambiguous global ownership. If multi-host support is ever requested, it requires a fresh architecture decision and adversarial qualification; do not characterize this feature as distributed lock-safe.

### R5-M02 — OPERATOR ATTESTATION IS AN AUTHORIZED LOCAL-CALL TRUST BOUNDARY, NOT A REMOTE CRYPTOGRAPHIC SIGNATURE

The `DiagnosticAttestation` proof binds exact device/run/event/content SHA/generation/disposition. The authoritative Windows controller/relay API is the sole attestation entrypoint in this software architecture and requires the exclusive device lock and controller authority. Tests of mismatched or forged *content* reject without creating the durable acknowledgment receipt. However the proof **does not carry an independent cryptographic user identity or signed human approval**; the local controller API's caller is implicitly trusted. Operators must protect its invocation and must not equate publicly readable SHA-256 or mere inbox observation with a human resolution decision. No network-exposed unauthenticated attestation endpoint was found in the reviewed test-platform source, but no deployed operator-permission integration was qualified. If this capability is ever exposed to other processes/users, add authentication/authorization before doing so. No change to accepted single-controller software is necessary solely to implement a hypothetical external identity provider.

### R5-M03 — EVIDENCE ORGANIZATION (NONBLOCKING ADMIN)

The original complete R5 flat PHX evidence is present but the mandated `dev/test-results/<runId>/` mirror is absent at intake. Copy exact Git blobs under `dev/test-results/8fd67120-48d6-4e84-9c9d-d4b393be2901/` (result.json, result.md, terminal.log and provenance), retain original immutable files, do not describe administrative mirroring as new PHX qualification.

### R5-M04 — OPERATING/PHYSICAL AND REVIEW-PROCEDURE LIMITATIONS

No physical iOS run, actual Google Drive consistency across accounts, validated installed artifact, auth pairing, autosync OFF verification, prerelease, installation, merge or promotion occurred. They each require separate explicit Owner gates. This conversation has previous DEC-352 review exposure; the frozen source-first access order is verifiable but absolute zero-prior-context blindness requires another independent session if mandated.

## 5. Independent ten-family adequacy review

| Mandatory family | Verdict | Grounded adequacy and scope |
| --- | --- | --- |
| Nominal | ADEQUATE | Healthy poll; staged pending event, controller admission, remote status and eventual inbox |
| Negative and malformed | ADEQUATE | Raw-secrets sanitization, invalid route/record, forged run and mismatched resolution/event hash fail closed |
| State transition | ADEQUATE | Offline→pending→controller admitted→delivered→recovery; acknowledged/resolved→verified archive→non-ACTIVE original; 90-day blocker and restored admission |
| Idempotency and retry | ADEQUATE | Stable remote ID, immutable event snapshot, archive retry reconciliation, exact duplicate attestation replay, unknown response never false delivered |
| Concurrency/order | ADEQUATE **inside one authority root** | Real OS `wx` cross-process lock, deterministic independent instance contest, orphan lock blocks; disjoint-host controllers explicitly unsupported |
| Persistence/restart | ADEQUATE | Bounded durable journal/cooldown; relay cursor/ack receipt; replay of staged event/verified archive; no premature deletion |
| Identity/security/privacy | ADEQUATE **for trusted controller API** | Exact hashed run origin, event hash and current generation, authorized local lock, nonshipping isolation; no external signed operator identity claim |
| Compatibility | ADEQUATE | Existing command/result types, exact lease authority, history read-only, shipping bundle isolation |
| Architecture/governance | ADEQUATE | Locked DEC-356 and DEC-355 approvals, exact PHX guard 4469/4850 and 1235/1250, no GitHub Actions |
| End-to-end/fail-closed | ADEQUATE in Windows simulated software | Protected originals never deleted unresolved; valid proof with verified copy retires bytes-preservingly; unknown/expired/capacity/lock failures remain explicit, no PASS fabrication |

**Ten-family software adequacy: SATISFIED within the approved single-controller Windows simulation scope.** This assessment does not cover unapproved multi-host global concurrency or authorized physical-device software behavior.

## 6. Final handoff disposition

**PASS WITH MINOR FINDINGS — EXACT SOFTWARE FEATURE ACCEPTED** at SHA `26f5ed8c95adb4cef7c8b805d880fc613fc9afd1`. Original PHX qualification remains immutable. Subsequent administrative correction M03 does not require fresh PHX so long as no qualified source/test/script/guard/evidence changes occur. This verdict is **not** release, merge, installation, physical dispatch, external operator authentication or live personal Drive/vault permission. Owner must separately authorize each.

After publication, change **only** the feature-specific DEC-352 `dev/state/current-state.yaml` handoff from **9→10**, sender/owner REVIEWER and recipient BUILDER; source SHA unchanged, status `R5_PASS_WITH_MINOR_FINDINGS_SOFTWARE_ACCEPTED_BUILDER_ADMIN_CLOSEOUT`. Preserve unrelated top-level handoff and existing original PHX evidence. Builder's next authorized action is fresh remote verification, exact-byte evidence mirror/provenance and administrative planning/runbook closeout as permitted, followed by request for separate Owner release/physical authority if appropriate. No Reviewer production/test/fixture/script/evidence mutation or validation run was performed.
