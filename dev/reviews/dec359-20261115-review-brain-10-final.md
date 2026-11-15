# WS-07 / DEC-359 — Independent final acceptance

**Reviewer:** `review-brain-10`  
**Verdict:** **PASS WITH MINOR FINDINGS — SOFTWARE-ONLY FEATURE ACCEPTED; LIVE COMPATIBILITY NOT ESTABLISHED**  
**Exact reviewed candidate:** `b1ef092cf5ce73c7811b5726ee803add2538df2c` (tree `b353df77de37e9c4a1c12a71ef2aac4b9fb4d109`)  
**Baseline:** `e09ab0ce98669cd56c7ec271fb854e00ab37d781`; GitHub comparison confirms candidate is ahead by 13 commits with no behind commits.  
**Frozen first-pass report:** `dev/reviews/dec359-20261115-review-brain-10-blind-source.md`; report commit `f2b1b4ff33ed6d7fcebee4882f8b662d3d6d1a64`.

## Original PHX-CI evidence

- **Qualified run:** `cf399e60-fcdf-4165-b947-3fbc14e7d9ad`
- **Original evidence:** `dev/test-results/cf399e60-fcdf-4165-b947-3fbc14e7d9ad/result.md`, `result.json` and `terminal.log`.
- **Evidence publication commit:** `479b660e97df95387492346431e949c10fa4daee`
- **Pinned runtime SHA:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`; framework `0.2.0-dev.2`.
- **Directly inspected original results:** expected/verified HEAD and tree match exactly; change-set PASS, repository PASS, overall PASS; all 13 stages PASS with native exit zero. Focused `npm run test:bvp-root`: **634/634 passed**. Product `npm test`: **1292/1292 passed**. Typecheck, build, artifact, architecture/repository checks passed.
- **Earlier historical run:** `020904e7-f70c-4c00-a39c-a0c29372355c` remains **BLOCKED** at source `2c70ca5562a4d366c9d54e9bc99dd379bfc7da3a`, evidence commit `ef591e7f60d4792e4ad938854803a525d972990d`. Its prior failed focused testing was not misrepresented as a PASS.

## Independent substantive source/test assessment

**DEC-359 test-only compatibility probe.** Direct inspection of `test-platform/test/windows-controller-oauth.test.ts` lines 296–405 verifies a bounded test-only `dec359Check` and method/endpoint gate. It GETs the independently attested exact expected ID with `fields=id,mimeType,trashed,appProperties`, verifies matching ID, folder MIME, non-trashed and private marker, then GETs the original controller appProperties query with `spaces=drive`, `pageSize=10`, and explicit `nextPageToken` field. Zero/duplicate/paginated/wrong-root results fail closed; provider 403/404 and malformed direct JSON are rejected without printing raw provider content. Successful synthetic fixtures are not represented as live proof. A direct guard rejects POST, upload URLs and wrong origin. The helper invokes the ordinary authenticated request factory only through these internally fixed URLs.

**Live gate.** The actual test is conditionally **registered** only when `BVP_DEC359_LIVE_RUN=YES`. Before constructing an authenticated Drive request, it checks independent original-ID/same-account and consent attestations, qualified-source identity supplied by the operator, local client/token-path inputs, and `git rev-parse HEAD` equality. A fixed redacted success code is the only feature-specific success output. The test does not initiate Obsidian/vault or physical commands. No live case was discovered/executed in the qualified software-only run, and **there is no actual Google cross-client compatibility verdict**.

**DEC-360 governance correction.** `test-platform/src/architecture-governance.ts` changes only the archive-instruction scan by excluding historical `dev/reviews/` while retaining active `dev/planning/`, `dev/authority/`, and `dev/state/` scans. `test-platform/test/architecture-guard.test.ts` adds the permitted historical-review case and negative active-planning/authority/state cases. Owner-approved frozen-surface exception DEC-360 is present. The repository comparison shows no changed production `src/` file, PHX-CI runtime, PowerShell script or accepted WCO-06 source.

**Test-change integrity.** The corrected synchronous `assert.throws` assertion matches the synchronous denial surface; the negative method/target oracle was not weakened. The authorized source change and test-first regressions correspond to the stated DEC-360 constraint. Earlier BLOCKED evidence remains immutable.

## Ten-family risk adequacy

| Family | Reviewer assessment |
| --- | --- |
| 1. Nominal/success | Simulated exact-ID + query VISIBLE and GET-only calls tested |
| 2. Negative/boundary/malformed | Missing/wrong/duplicate/paginated roots, invalid ID, 403/404, malformed direct JSON and disallowed methods/targets tested |
| 3. Allowed/forbidden transitions | Software-only/live registration gates; no mutating Drive method authorized |
| 4. Idempotency/retry/cancellation/recovery | No write/retry lifecycle in this bounded two-read probe; materially N/A for new probe, preexisting OAuth timeout/refresh behavior retained |
| 5. Concurrency/stale state | No concurrent mutation/writer state; materially N/A for the isolated read-only probe |
| 6. Persistence/restart/integrity | No new durable probe state; existing Windows DPAPI handling unchanged, materially N/A for new persistence |
| 7. Identity/auth/security/trust | Exact independently supplied ID, private appProperties, same-account attestation, credential scope, source/consent gates assessed |
| 8. Contracts/integration/compatibility | Uses actual controller query and existing OAuth request boundary; real cross-client behavior explicitly unproven |
| 9. Architecture/ownership/invariants | DEC-360 guard positive/negative cases, frozen boundaries, normal shipping exclusion and budget gates covered |
| 10. End-to-end/fail-closed/destructive safety | Synthetic two-step result and fail-closed cases; real end-to-end intentionally deferred to the separately authorized owner-controlled live PHX-CI observation |

## Minor findings / limits retained

1. **M-01 — Blind-source information isolation was imperfect.** The neutral DEC-359 planning document and existing `dev/state/current-state.yaml` contain embedded Builder progress and PHX-CI summary metadata; these were incidentally exposed during the first-pass source/handoff-grounding step. The frozen report explicitly disclosed exposure and was published before authored tests and original PHX-CI report/terminal evidence were read. This means perfect information isolation is **not** claimed, but independent source/test/evidence assessment identified no acceptance-defeating defect.
2. **M-02 — Malformed listing metadata boundary coverage is narrower than its possible invalid representations.** The list checker validates that `files` is an array of exactly one accepted root and rejects truthy pagination markers; a malformed falsy `nextPageToken` (e.g. numeric zero) is treated as absent. This is not a realistic successful response under the Google Drive v3 field contract, and the fixed single-query success proof still requires the expected root metadata. A defensive type check and synthetic negative for malformed pagination may be added in later authorized maintenance; not a prerequisite to this bounded software qualification.

**Acceptance boundary:** This report accepts only the PHX-CI-qualified probe/guard software at the exact source SHA. It does not establish actual Google cross-OAuth-client discovery, authorize live execution without the separate explicit per-run Owner gating, or approve merge, promotion, installation, physical operation, or release. The next authorized Builder action is controlled feature closeout and, only under the already-scoped Owner consent/source/account prerequisites, preparation/execution of the separate PHX-CI-managed read-only live observation; actual results must be published without inventing success.

**No Reviewer source/test/PHX-CI code changes or software execution occurred.**
