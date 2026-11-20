# WS-02 / DEC-339 / BU-04 — Immediate Advisory-Hint Visibility Barrier During Asynchronous Invalidation

**Date:** 2026-11-20  
**Builder:** `build-brain-67`  
**Branch:** `build/dec339-ws02-bu04-local-hint-visibility-barrier-20261120`  
**Baseline:** BU-03 independently accepted/Builder closed `c3bfbb8cbb0aa3dbb775e524607275dac4760e1b`.  
**Status:** BUILDER SOURCE/TEST AUTHORSHIP; NOT PHX-CI QUALIFIED OR INDEPENDENTLY REVIEWED.

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

