# TG-03 / TG-04 — PHX-CI Context Integrity and Canonical Root Guard Repair

**Status:** AUTHORIZED IN PRINCIPLE BY OWNER 2026-10-17; PENDING DISTINCT FROZEN-SURFACE MAINTAINER AND INDEPENDENT TEST-AUTHOR ASSIGNMENTS; NOT EXECUTED  
**Repository:** woodpk/gdrive-sync-obsidian-plugin  
**Audit baseline:** master `b1e2ebaee3077e34a4eefaf601ee8124078b7400`  
**Planning branch:** repair/testing-governance-ptar-v2-20261017; rebind latest exact candidate/source/base and immutable PHX-CI pin at dispatch.  
**Audit findings:** TG-03 (MAJOR), TG-04 (MODERATE).  
**Existing risk acceptance:** DEC-341 explicitly says DEC-340-01 remained unfixed and prior software-only master merge did not authorize release. The 2026-10-17 owner request initiates correction but is **not** PHX-CI PASS or release approval.

## Required separate ownership
- **Supervisor-authorized repository-check/PHX-CI maintainer:** frozen `test-platform/src/repository-check.ts`, PHX-CI producer/consumer interfaces if an authorized change is necessary. This file is listed as supervisor-owned frozen by `dev/authority/governance/locks/testing-platform-boundary.yaml`. No ordinary Test Author or production coder may alter it.
- **Independent Test Author:** source-controlled negative/positive tests for the corrected boundary, fixtures and PHX-CI-consumed check assertions in approved test-owned paths.
- **Distinct PHX-CI Test Execution Agent:** executes exact integrated candidate via the pinned PHX-CI runtime and publishes original evidence.
- **Separate Acceptance Reviewer:** inspects original source/authority/test commits and resulting canonical PHX-CI evidence.

## Confirmed TG-03 defect
At the audited baseline `test-platform/src/repository-check.ts` accepts BVP_CHANGE_CLASS, BRAIN_ARTIFACT_PURPOSE and PHX_VERIFICATION_CONTEXT_PATH from process context. The pointed JSON is only shape-checked for `schemaVersion`, 40-hex `targetHead`, `baseSha`, and string `changedPaths`. In development observation mode the repository checker bypasses approved shipping SHA allowlist, without proof the claimed context was emitted by the actual PHX-CI run or bound to the checked source. Printing `context=authoritative` does not create authority. A forged structurally plausible input can produce an apparent success. Original owner-approved release hashes must remain unchanged.

**Required corrected invariant:** Only a genuinely PHX-CI-attested/bound, authorized development-observation run can relax release-hash comparison to recording the development artifact digest. A caller-controlled file/flag alone is not sufficient proof. The trust-binding mechanism belongs to the PHX-CI producer/consumer contract, not a second independent verifier. If trusted provenance cannot be established in currently pinned PHX-CI interfaces, return `REPAIR PHX-CI` / `VALIDATION: BLOCKED`; do not claim code-only shape validation provides cryptographic or process-authentic provenance. Promotion/release always requires exact independently authorized artifact identity and cannot inherit a development-observation exemption.

**Required independent adversarial tests:** caller-supplied fake context; correct-looking but wrong source/base; source drift; unauthorized change class; missing/mismatched PHX-CI producer binding; valid genuinely authorized development observation; promotion with unapproved hash; preservation of all existing three owner-approved release digests and shipping isolation. The test expected results derive from the current Operating Protocol and DEC-340/341, not from current code behavior.

## Confirmed TG-04 defect
`test-platform/src/repository-check.ts` explicitly allows `dev/_ca-output.json` as a top-level root compatibility alias. Current shared directory standard and DEC-337 permit only `dev/README.md` and `dev/_ca-output.md` as ordinary root files. At the audited tree that alias did not exist; the checker is defective because it could accept a newly created forbidden file.

**Required corrected invariant:** Any unapproved file directly under `dev/`, including `_ca-output.json`, fails PHX-CI-consumed canonical structure checks. Negative test proves rejection; positive test proves canonical root passes. Do not edit frozen historical evidence under `dev/test-results/`.

## Completion/handoff
Maintain independent branches/commits with exact tree IDs and changed paths; supervisor integrates without rewriting assertions. PHX-CI executor demonstrates positive/negative checks through original runtime evidence at exact combined SHA, without direct Node/npm/PowerShell validation. Final independent acceptance reviews the repaired provenance boundary before any release/promotion dependency on it. No user live data/installation, no GitHub Actions, no Stage 3, no self-approval.

## Setup-exception implementation update — 2026-10-17

Owner explicitly authorized the testing supervisor to edit the frozen check and its tests as a setup-only exception (see `dev/authority/reconciliations/testing-governance-setup-exception-2026-10-17.md`).

**Source authored on `repair/testing-governance-ptar-v2-20261017`**: `test-platform/src/repository-check.ts` rejects any non-allowlisted development artifact hash even when caller-supplied `BRAIN_ARTIFACT_PURPOSE=development`, `BVP_CHANGE_CLASS=authorized-governance` and a structurally valid context are present; it records digest and labels context unverified. It rejects `dev/_ca-output.json` at the dev root. It rejects active GitHub Actions YAML by source state; `Taskfile.phx-ci.yml` now permits the specifically owner-authorized workflow deletions while source-state bans persist. `test-platform/test/repository-check-integration.test.ts` contains adversarial negative regression cases. No production source or approved artifact hash list was changed.

**TG-03 operational blocker remains:** The pinned PHX-CI framework's context JSON contains source/base/changedPaths but no authenticated producer binding. Without an extension to the **PHX-CI producer/runtime contract**, the consumer cannot securely approve a newly generated development artifact. The candidate now FAILS CLOSED for unapproved development hashes rather than accepting a forgery; this is source mitigation, not a functional framework trust replacement. Do not weaken the check to make a new development hash PASS by local flags or changing historical release hashes. Authentication must originate in PHX-CI. All changes here are **UNVERIFIED by PHX-CI** and lack normal independent author/acceptance provenance due to the exceptional owner instruction.

Remaining gate: approved authenticated PHX-CI producer-to-consumer contract, exact integrated PHX-CI execution by the authorized executor, and owner-governed acceptance/promotion.


## Owner risk disposition — supersedes the earlier TG-03 development-attestation blocker

On 2026-10-17, the owner explicitly judged the additional context-authentication concern outside the current controlled development project's threat model. In this bounded setup, development artifact SHA-256 observation may proceed under the existing declared purpose, valid context and authorized-governance classification; the absence of new PHX-CI producer attestation is **not** a release or verification-blocking prerequisite. Earlier statements in this task demanding such an extension are superseded for this workflow.

The implementation in `test-platform/src/repository-check.ts` again permits controlled *development observation*; it still labels context provenance unverified, leaves all three approved release digests unchanged and enforces exact hashes for promotion/default mode. The test battery has been updated accordingly. TG-04's strict root-file enforcement remains in place. **Actual PHX-CI tests and independent acceptance are still pending; no new PHX-CI PASS is claimed.**
