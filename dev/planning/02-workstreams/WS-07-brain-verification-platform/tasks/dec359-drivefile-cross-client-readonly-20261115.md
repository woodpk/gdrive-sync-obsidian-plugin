# WS-07 / DEC-359 — Owner-authorized read-only real Google Drive cross-client compatibility

**Owner authorization:** 2026-11-15, explicit narrowly scoped real Google check.  
**Source branch:** feature/bvp-drivefile-cross-client-readonly-20261115  
**Baseline accepted source:** 07f8b20c12e4ab769c4bb8e8b386663d9f02f7f0; tree 759cc887985823293cd75fa4239c10096a45fdcc.  
**Baseline administrative head:** e09ab0ce98669cd56c7ec271fb854e00ab37d781.  
**Status:** OWNER AUTHORIZED; NEW PROBE SOFTWARE UNQUALIFIED; LIVE GOOGLE REQUESTS NOT YET EXECUTED; NO COMPATIBILITY VERDICT.

## Precise question

Can the separately authenticated Windows Desktop OAuth client, using only the fixed Google Drive drive.file scope and the Owner's approved test account, both (1) GET the exact existing BVP mailbox metadata ID established independently from the Obsidian-created/client-visible mailbox and (2) discover the same exact ID by the BVP controller's existing private appProperties metadata query?

## Scope and permitted effects

One Owner-controlled Windows account/host and its BVP DPAPI token path, a single already-existing app-owned mailbox from the same approved Google test account, and no iPhone or Obsidian device command. The existing OAuth authorization-code PKCE flow and refresh exchanges use the token endpoint only; locally encrypted DPAPI token persistence is allowed. A fixed Drive v3 files.get metadata GET and files.list metadata GET are the ONLY permitted Drive API operations. No file bytes or unrelated file metadata; no Drive POST, PATCH, PUT, DELETE; no root creation, ownership change, upload, appProperties mutation, new mailbox, scope expansion, Google Picker grants, additional controller, sync, physical devices, or source promotion.

**Necessary precondition:** Exact expected mailbox ID must be independently obtained from the existing Obsidian client/context without exporting its Google credential. Never infer it from the new Windows client's own listing, a user-configured folder name, a Drive-wide query, the ChatGPT Google Drive connector, or a simulator. Operator must confirm the exact same approved test Google account in the browser. If the expected original ID or controller's approved Desktop OAuth client ID is unavailable, status is BLOCKED, not compatible/incompatible.

## Test and classification contract

* All software test and live verification execution remains PHX-CI-controlled, under the approved unchanged exact runtime and the Owner's existing repo-controlled PowerShell PHX-CI operator. No standalone verifier, additional PowerShell script, GitHub Actions or new pipeline.
* Require explicit environment/owner per-run "YES" gates before allowing the live test to register; do not silently enable real network in the regular deterministic platform suite.
* Before real external execution, independently qualify the newly authored probe through owner-operated PHX-CI software-only verification, then review exact source/evidence and only use that qualified candidate for the authorized live run.
* Verify both GET response classifications, exact expected ID, folder MIME and not-trashed, exact private appProperties marker, no ambiguous or paginated roots. Presence by direct ID but not discovery is NOT proof of controller compatibility.
* Captured original PHX-CI output records PASS only for both verified GETs; provider 401/403/404, invisible root, different ID, missing appProperties, multiple roots, pagination, timeout and any safety gate violation report a redacted blocked/fail code. Never publish raw OAuth tokens, mailbox IDs, personal email, private headers, arbitrary provider body or file contents.
* New synthetic test cases prove GET-only dispatch, correct matching, direct-visible-but-undiscoverable, wrong ID, duplicate root, authorization failure and negative method rejection. Synthetic tests never prove live cross-client access.
* Retain exact WCO06 source/review/PHX-CI identities and handoff-count 14 on their original accepted branch. This separate feature starts administrative build planning at handoff count 0 and must earn its own software qualification. Not a reopened WCO06.
* Actual live outcome must be reported exactly as observed. Do not grant merge/deployment/release permission from it.

## Next action

Create the minimal PHX-CI-owned test-only read-only compatibility checker, run source-impact/budget review, obtain software PHX-CI qualification against its exact branch SHA, then stage the separate Owner-operated OAuth credential consent and live PHX-CI-coordinated read-only check. Physical testing remains prohibited. Do not proceed to live operation merely because the Owner authorized the test before the new probe was qualified.

## 2026-11-15 — Builder test-first software candidate prepared

**Candidate test/source commit:** `32de2818b1acb70716423a61a4febdf609aa542c`. Changes are limited to the existing `test-platform/test/windows-controller-oauth.test.ts`, plus this separately bounded feature's planning/state/DEC-359 Owner decision. Three additional synthetic cases and a fourth **conditionally registered** real Google test are present. The live case is not part of ordinary PHX-CI software qualification unless the explicit local `BVP_DEC359_LIVE_RUN=YES` gate is satisfied.

**Provenance and invariants:** New mock tests establish (a) two GET-only calls against Google's approved Drive metadata endpoint; (b) an independently sourced exact Obsidian mailbox ID must pass both `files.get` and the established BVP `appProperties` `files.list` query; and (c) 403/404, mismatched markers, absent/duplicate/paginated candidates, unknown ID, and attempted POST/unapproved URL fail closed before further dispatch. The source uses the existing independently authenticated `createWindowsControllerRequest` with only `drive.file` and Windows current-user DPAPI. Live guard requires explicit Owner consent, separately attested original mailbox ID/same-account bind, software qualified SHA, and actual `git rev-parse HEAD` equality. No new provider or local vault mutations, network on normal synthetic runs, shipping source, framework core, live relay, PowerShell scripts, PHX-CI runtime, frozen limits, or accepted WCO-06 source/evidence changed.

**Current result:** SOURCE AND TESTS COMMITTED, **UNEXECUTED**; PHX-CI software candidate PASS **NOT CLAIMED**, real Google compatibility **NOT TESTED**, installation/physical dispatch **NOT AUTHORIZED**. The next necessary act is Owner's existing repository-controlled PHX-CI software-only launcher against the final exact branch SHA. After full PASS and independent assessment, freeze a qualified SHA and only then run the separately authorized interactive OAuth and GET-only observation in a fresh exact-source PHX-CI-managed branch. The source qualification run must explicitly clear any leftover `BVP_DEC359_LIVE_RUN` environment value.


**Privacy-hardening follow-up:** source/test commit `90752069f193c097b5575aac40d8d6fac7ed1144` rejects malformed or structurally invalid Google metadata using a fixed redacted classification, before an accidental Node JSON parsing error could reveal provider response fragments. The adversarial synthetic suite includes malformed-provider metadata. This revision is **UNEXECUTED**; only a later exact-source PHX-CI software PASS can qualify it. Ordinary suite runs MUST clear `BVP_DEC359_LIVE_RUN` to prevent real external calls.
