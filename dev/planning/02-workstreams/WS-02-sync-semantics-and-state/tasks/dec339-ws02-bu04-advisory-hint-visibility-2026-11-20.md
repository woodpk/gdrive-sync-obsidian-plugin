# WS-02 / DEC-339 / BU-04 — Immediate Advisory-Hint Visibility Barrier During Asynchronous Invalidation

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Branch:** `build/dec339-ws02-bu04-local-hint-visibility-barrier-20261120`  
**Baseline:** BU-03 independently accepted/Builder closed `c3bfbb8cbb0aa3dbb775e524607275dac4760e1b`.  
**Status:** **F-01 corrective source R2 BUILDER-QUALIFIED; independent Reviewer reassessment PENDING.** Previous independent verdict remains CORRECTION REQUIRED until a new accepted verdict. Full WS-02 and DEC-339 integration remain incomplete.

## Bounded reason and decision

Reviewer BU-03 M-02 noted that `onChange`, `resume`, and `vault-ready` subscribe callbacks invalidate the backing IndexedDB LOCAL_POINTER asynchronously. During that transaction delay, a raw backing-store `readLocalHint` can still return an `advisory` value captured under the old local state. The coordinator remains dormant and advisory-only, so BU-03 was accepted, but its prospective consumer boundary needs fail-closed protection before live integration.

This Build Unit introduces a **coordinator-mediated advisory read seam** `readAdvisoryHint(fence,path)` that returns `stale` immediately while any asynchronous invalidation is pending, and also refuses a read if the coordinator's epoch changes while the read is in flight. A tracked invalidation promise must clear the pending gate only after each pending job has settled. A fresh `refresh` is refused while invalidation remains in flight. `invalidateForScopeChange` is routed through the same tracked path. The implementation must **not** grant hint authority, activate the inventory, make physical changes or replace the existing raw IndexedDB interface.

## Source and tests

- `src/state/verified-local-inventory.ts`: tracked asynchronous invalidation jobs, instant logical visibility guard for coordinator clients and fail-closed epoch checks on a racing read.
- `tests/integration/dec339-local-observation-integration.test.ts`: delayed IndexedDB invalidation after resume must hide stale hint **before backing storage has finished invalidation**; a second test blocks a hint read, delivers a file-change event, then verifies epoch-based read rejection.
- Prior BU-01/02/03 accepted source/evidence is not rewritten.

## Ten-family proof plan

1. Nominal: advisory return following completed refresh and no invalidation.
2. Negative: pending invalidation returns stale even while raw backing storage still advertises advisory.
3. Transitions: advisory → immediate stale → persisted stale → new fresh advisory.
4. Retry/recovery: fresh enumeration after invalidation settles restores eligible hints.
5. Concurrency/races: asynchronous invalidation and in-flight read race both fail closed; overlapping invalidation semantics require future integration validation.
6. Persistence: independent remote inventory remains readable; canonical cursor, BASE, backup and intent stores untouched.
7. Identity/trust: existing inventory-fenced read delegated unchanged; only additional coordinator-local refusal added.
8. Contract/backward compatibility: new optional consumer seam; no change to existing raw storage contract or runtime planner.
9. Architecture: no new planner/executor, PowerShell script, guard relaxation or inventory activation.
10. End-to-end/fail-closed: deterministic local coordinator→storage→lifecycle invalidation→fresh scan; live device/provider operations not applicable or authorized.

## Follow-on gates

- This seam is **not wired into shipping ProductRuntime**. Future owner must route *every* advisory-hint read through it and notify/await all effective scope changes before any local hint consumption. A direct raw store caller bypassing this seam is not protected.
- Real cross-context IndexedDB `versionchange`/blocked upgrades remain required. Remaining cursor writer, rollback/recovery and local policy integration qualification remain required. No full WS-02 or DEC-339 acceptance.
- Execute exact-source software verification **only via pinned PHX-CI** (runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`) using existing `dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1`, software-only. Preserve full evidence and all errors. Independent blind-first Reviewer only after R1 PASS.
- No GitHub Actions, master/PR #157 merge, live schema upgrade or provider/vault operations, inventory activation, physical testing, installation, promotion or release.


## Exact-source PHX-CI evidence and Builder→Reviewer handoff (2026-11-20)

- Frozen Builder-qualified source `4c0cc689b9c949969f5fda82a96a14b5394e5fd0`, exact tree `1eb7d975f6504bfcde2cd2130eef02f0413d475a`.
- PHX-CI R1 original run `76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8`, immutable evidence publication `5e4ea101cc3e3b7f3bdafc4346fd5a587f11acba`, source bound in `dev/test-results/76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8/`. GitHub original `result.json`, `result.md`, full `terminal.log` inspected.
- Outcome: **13/13 required stages PASS; 634/634 focused; 1323/1323 product; typecheck/build/repository PASS; overall PASS exit 0**. Physical dispatch disabled. Original evidence commit changes only result and log files; no source or test edits after qualification.
- Builder→Reviewer handoff count 1, source and evidence frozen; independent blind-first source assessment, ten-family review and final verdict required before acceptance. This R1 PASS is not Reviewer acceptance.
- **Scope remains limited:** coordinator-mediated local hint visibility guard only; all actual runtime scope-owner wiring, remaining cursor/recovery/rollback, real multi-WebView upgrade behavior and DEC-339 activation remain deferred and unauthorized.

## Reviewer correction F-01 — Builder remediation (2026-11-20)

- **Independent verdict:** CORRECTION REQUIRED, feature handoff count 2, recipient BUILDER, immutable review state `b3c602e51e35501a8bc3b5e094dee58761085cd8`; blind source report at commit `d58fec39779ade8f45828342253c9dea69e0bd01` and final report at `b365c757ecb25d7e267ad68efacc212b4b819cb8`.
- **Defect:** original coordinator cleared its temporary guard on rejected storage invalidation; durable LOCAL_POINTER might remain complete, re-exposing pre-event advisory hints.
- **Correction:** keep a sticky `invalidationFailed` fault that is set for rejected asynchronous jobs and synchronous throws. Mark advisory hints not-ready as soon as an invalidation begins, retain fault despite overlapping success/retries, and require a *fresh* complete enumeration plus successful authority-fenced `replaceLocalSnapshot` with no racing epoch/job before re-enabling advisory reads. A new coordinator starts with hints not-ready and must first refresh. Internal incomplete/raced enumeration invalidations go through the same tracked fault handling.
- **Test integrity:** three additional adversarial integration cases cover rejected lifecycle invalidation with unchanged persisted marker, partial-scan failure to recover, successful fresh replacement with new token, earlier failing/later successful overlapping jobs, retry insufficient for latch clearance, synchronous scope failure, failed replacement, and cold coordinator. No test or PHX-CI guard was weakened or deleted.
- **Qualification required:** corrective source MUST pass a fresh full software-only pinned PHX-CI run. The immutable R1 13/13 PASS at `4c0cc689b9c949969f5fda82a96a14b5394e5fd0` (run `76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8`) remains historical but does not qualify repaired code. No new independent review handoff before corrected exact-source PHX-CI PASS.
- **Boundary:** no live runtime owner wiring, real multi-WebView upgrade proof, or full cursor/rollback/recovery integration; WS-02 and DEC-339 remain incomplete, with no activation, physical tests, deployment or merge authorization.

## R2 corrected-source qualification / independent reassessment boundary (2026-11-20)

- **Corrected immutable source:** `8850dab0970862783f4a7e5beb4f214b83dd4acc`; tree `14e2d7aa2d0507abb60b2aed5e7155fe409795ac`.
- **Original corrective PHX-CI:** run `f48d6511-ec06-405c-8738-f8b91662b0d1`; evidence commit `7c7c2877ddfb290f3581df414f8759d5edf1d989`; original `result.json`, `result.md` and `terminal.log` under `dev/test-results/f48d6511-ec06-405c-8738-f8b91662b0d1/` independently read back in GitHub.
- **Exact outcome:** source and tree match; **13/13 stages PASS, 634/634 focused tests PASS, 1,326/1,326 product tests PASS, typecheck/build/repository PASS, native exit 0; physical dispatch disabled.** Evidence commit is evidence-only and not a new qualified source commit.
- **History preserved:** R1 source `4c0cc689b9c949969f5fda82a96a14b5394e5fd0`, original R1 PASS `76cc9c7b-23f4-4c5e-925b-ea08e6b2d1f8` at `5e4ea101cc3e3b7f3bdafc4346fd5a587f11acba`, and frozen F-01 CORRECTION REQUIRED reports at `d58fec39779ade8f45828342253c9dea69e0bd01` / `b365c757ecb25d7e267ad68efacc212b4b819cb8` remain unchanged.
- **New role boundary:** Builder→Reviewer feature handoff count **3**, for an independent blind-first assessment of exact corrected source, then the mandatory ten-family and original PHX-CI R2 evidence review. This handoff does not waive F-01 or claim independent acceptance.
- **Remaining barriers:** No active coordinator/runtime integration, live effective-scope owner wiring, multi-WebView IndexedDB proof, full cursor/rollback/recovery integration, master merge or DEC-339 activation.
