# WS-02 / DEC-339 / BU-04 — R2 Independent final corrective reassessment

**VERDICT: PASS WITH MINOR FINDINGS — CORRECTED BU-04 SOFTWARE FEATURE ACCEPTED**

- Independent Reviewer: `review-brain-10`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Feature: WS-02/DEC-339/BU-04, immediate local advisory-hint visibility barrier, specifically F-01 corrected source
- Corrected reviewed source SHA: `8850dab0970862783f4a7e5beb4f214b83dd4acc`
- Exact corrected Git tree: `14e2d7aa2d0507abb60b2aed5e7155fe409795ac`
- Incoming handoff count: 3, Builder → Reviewer, state commit `abb1ffd41f12b0305ded9ec6b82ec06fa14db7df`
- Frozen R2 blind report: `dev/reviews/dec339-ws02-bu04-20261120-review-brain-10-r2-blind-source.md`, publication commit `fe759f3d865517d421718c195f1cbaac55b54d54`
- Earlier first-pass rejected source: `4c0cc689b9c949969f5fda82a96a14b5394e5fd0`; original F-01 independent report: `dev/reviews/dec339-ws02-bu04-20261120-review-brain-10-final.md` at `b365c757ecb25d7e267ad68efacc212b4b819cb8`. Historic rejection and source-specific PASS evidence retained unchanged.

## Independent assessment and F-01 disposition

**F-01 RESOLVED for this bounded software-only coordinator consumer seam.** `src/state/verified-local-inventory.ts` now has an `invalidationFailed` latch and a default-false `advisoryReady` gate. `trackInvalidation()` synchronously increments the epoch and revokes advisory readiness before IndexedDB work, sets the sticky fault on both a synchronous error and an asynchronous rejection, and leaves that fault untouched by successful or completed other jobs. `readAdvisoryHint()` denies reads on the latch, not-ready state, or pending jobs; it also rechecks conditions/epoch after the delegated raw read. `refresh()` cannot expose advisory hints merely by completing an invalidation retry: it resets readiness, requires a current trusted inventory fence, a fresh complete local enumeration under the current inclusion policy, matching epoch/generation/canonical cursor/authority revisions, and successful persistent `replaceLocalSnapshot` with no new event/job racing publication. Only then does it clear the fault and re-enable advisory reads.

This eliminates the original counterexample: a rejected IndexedDB invalidation whose old `LOCAL_POINTER` still reads complete can no longer re-expose the old advisory hint through this coordinator. The direct backing store remains unchanged and is intentionally outside this coordinator-mediated visibility guarantee. The coordinator is **not** instantiated/wired into shipping ProductRuntime; no live inventory activation or physical operation is authorized.

## Original corrected exact-source PHX-CI evidence

- Run: `f48d6511-ec06-405c-8738-f8b91662b0d1`
- Evidence publication: `7c7c2877ddfb290f3581df414f8759d5edf1d989`
- Original reports: `dev/test-results/f48d6511-ec06-405c-8738-f8b91662b0d1/result.md`, `result.json`, `terminal.log`
- Runtime: `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, PHX-CI framework `0.2.0-dev.2`
- Independently fetched and inspected all three original files **after publishing** the R2 blind report. Exact expected and verified HEAD `8850dab0970862783f4a7e5beb4f214b83dd4acc` and Git tree `14e2d7aa2d0507abb60b2aed5e7155fe409795ac`. **13/13 required stages PASS**, focused **634/634**, product **1326/1326**; native typecheck, build, artifact and repository guards PASS, overall PASS/exit 0. Windows local verification only, no GitHub Actions or real-device/Drive operations.
- Comparison from first rejected source is ahead six commits, behind zero; actual corrected production change remains limited to `src/state/verified-local-inventory.ts`, with 168 additional lines of regression tests and administrative/report/evidence changes. No test/guard budget was weakened.

## Authored corrective test review and ten-family adequacy

Inspected `tests/integration/dec339-local-observation-integration.test.ts` lines 254–521. The two original BU-04 cases still prove pending asynchronous read denial and a raced in-flight read. Three new regression cases cover: rejected file-change invalidation while the raw stored marker remains `advisory`, sticky coordinator denial after settlement, incomplete recovery refusing to clear the fault, successful new observation token only after refreshed publish; overlapping earlier rejection and later successful completion, successful retry insufficient without full refresh; synchronously thrown scope invalidation failure, failed snapshot replacement, and cold-instance initial refusal. Test asserts distinguish old raw-store behavior from coordinator-mediated refusal, and preserve original expectations. No oracle relaxation was found.

| Mandatory family | R2 independent result |
| --- | --- |
| 1. Nominal | PASS: fresh complete enumeration and successfully replaced snapshot restore advisory visibility |
| 2. Negative/boundary | PASS: rejected async and sync invalidations never expose prior advisory hint |
| 3. Allowed/forbidden transitions | PASS: ready → immediately stale → fault-latched recovery-required → fresh recorded → advisory |
| 4. Retry/recovery | PASS: retry alone cannot clear latch; incomplete scan and failed durable replacement retain denial; successful complete replacement repairs |
| 5. Concurrency/races | PASS for in-scope overlapping jobs and in-flight reads; real cross-WebView arbitration deferred |
| 6. Persistence/integrity | PASS within local pointer boundaries; remote inventory remains independently readable; canonical BASE/cursor/intents untouched |
| 7. Identity/security/trust | PASS: delegates original identity/authority-fenced backing reader, adds only refusal |
| 8. Contracts/compatibility | PASS: additive coordinator consumer API, existing raw storage contract unchanged |
| 9. Architecture/invariants | PASS: no planner/executor activation, new script or budget relaxation; repository gates pass |
| 10. End-to-end/fail-closed | PASS for software coordinator → failing/successful storage invalidation → read refusal → recovery; physical Google/vault/device tests N/A to BU-04 |

## Minor findings and qualifications

**M-01 (nonblocking, explicitly deferred):** The latch/ready state is **per coordinator instance**, and direct callers of `IndexedDbInventoryObservationStore.readLocalHint()` bypass it. The future integrated owner must route **every** consumer through this coordinator (or separately implement an equivalent cross-context safety barrier) and ensure every effective scope change is notified and awaited. This is not proven by this dormant BU.

**M-02 (nonblocking, future workstream integration):** Genuine multi-WebView IndexedDB versionchange/blocking, complete legacy cursor/recovery/rollback and real device lifecycle/migration behaviors remain separate WS-02 gates. A pass in the in-memory deterministic fixture does not establish a live browser guarantee.

**M-03 (blind-information disclosure):** Neutral planning/state records embed Builder-produced evidence status and were incidentally visible when verifying the published incoming handoff. R2 production-code conclusions were derived independently and frozen/published first. Authored tests, original R2 PHX-CI report/log, history/compare and earlier independent report files were not opened until after the R2 blind publication; the earlier F-01 mechanism was necessarily known to the reviewer from this conversation.

## Final disposition

**PASS WITH MINOR FINDINGS — corrected WS-02/DEC-339/BU-04 ACCEPTED** only at exact corrected frozen source `8850dab0970862783f4a7e5beb4f214b83dd4acc` and associated original R2 PHX-CI run `f48d6511-ec06-405c-8738-f8b91662b0d1`. Builder may complete bounded BU-04 closeout and carry minor findings to subsequent authorized integration units. The acceptance does **not** complete WS-02, activate DEC-339 inventory, approve PR #157/master merge, deploy, install, promote, release, authorize real IndexedDB migration, live Drive/vault actions or physical testing. Reviewer made no production/test/fixture/script/evidence edits and executed no software verification.
