# WS-02 / DEC-339 / BU-05 — R7 Independent Blind-First Correction Review

**Date:** 2026-11-22  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** WS-02 / DEC-339 / BU-05 — Cursor Writer Concurrency and Backup-First Recovery Gates  
**Source branch:** `build/dec339-ws02-bu05-cursor-recovery-gates-20261120`  
**Frozen reviewed implementation SHA:** `c47c88cde35dc827263e3ff7b1366a47bc41acb6`  
**Frozen Git tree:** `12d35229a727377583a134522f34d59a3acdac7c`  
**Incoming handoff count:** **4**  
**Role:** Independent Reviewer, strictly read-only.  
**Prior verdict:** R4 **CORRECTION REQUIRED** for F-01 and F-02. Those findings are historical requirements to verify after the blind source assessment, not evidence of R7 correctness.

## Independence order

Perform the review in two phases and preserve the order.

### Phase 1 — blind source assessment

Before reading Builder-authored R7 tests, Builder correction narratives, PHX-CI reports/logs, prior BU-05 review reports, or the R5/R6 failure history:

1. Read the governing requirements and current product contracts that define canonical cursor authority, durable remote Changes learning, restart/recovery behavior, backup-first recovery, pairing identity fencing, fail-closed persistence, and opaque-token handling.
2. Inspect exactly frozen source `c47c88cde35dc827263e3ff7b1366a47bc41acb6`.
3. Independently determine whether the production implementation:
   - prevents any new durable learned-batch observation from starting behind or outside the current durable frontier;
   - treats non-advancing observations as durable observations without inventing ordering semantics for opaque Drive tokens;
   - accepts advancing retained history only as one ordered, unique, acyclic component connected through the canonical cursor;
   - rejects forks, multiple predecessors, cycles, detached histories, out-of-order retained observations, and unrelated replays;
   - prevents a conflicting learned batch from becoming durable before rejection;
   - makes existing durable batch identity/content immutable across controller, low-level writer, and generic authority-CAS paths;
   - gives same-ID replay one deterministic complete observation identity rather than endpoint-only equivalence;
   - keeps persistence revision as CAS context rather than semantic remote-batch identity;
   - derives incremental effective cursor from validated durable history rather than array-position assumptions;
   - preserves restart catch-up through already-durable advancing history without stale cursor overwrite;
   - preserves BASE, pending intents, mappings, pairing identity, recovery fencing, and inventory invalidation semantics;
   - retains the previously reviewed commitCursor and backup-first recovery protections;
   - does not activate DEC-339 inventory, authorize live migration, or perform real Drive/vault/device operations.
4. Freeze and publish the blind source assessment before opening Phase-2 material.

Do not use green tests or PHX-CI as proof during Phase 1.

### Phase 2 — correction findings, tests, evidence, and final verdict

After the blind report is frozen:

1. Read the prior R4 independent reports:
   - `dev/reviews/dec339-ws02-bu05-r4-20261121-review-brain-10-blind-source.md`
   - `dev/reviews/dec339-ws02-bu05-r4-20261121-review-brain-10-final.md`
2. Explicitly disposition the two blocking findings:
   - **F-01:** a conflicting learned-batch cursor edge could become durable before later cursor-mirror rejection.
   - **F-02:** same batch ID and endpoints with different Changes payload could be accepted as compatible.
3. Inspect the R7 authored tests and determine whether they genuinely prove refusal-without-contamination, restart safety, valid recovery, complete replay identity, and bypass resistance through both low-level and generic authority writers.
4. Assess mandatory ten-family coverage: nominal, negative/boundary, transitions, retry/recovery, concurrency/staleness, persistence/integrity, identity/security, API/contracts, architecture/invariants, and end-to-end/fail-closed.
5. Inspect the immutable qualification chain, preserving every earlier result:
   - partial-scope R1 PASS source `8d7785aa0e40bfaab3c446183422c64242aee070`, run `d8e9b739-6353-44cd-a4b0-5695c4c09228`;
   - expanded R2 BLOCKED source `d32e0219b2002ea054e48eea073ce2563d2cbde3`, run `d0260a16-e6f9-470d-a39c-bc0225e1e1a3`;
   - R3 BLOCKED source `241e2659e7a56188be6565971dcdb542b5e51e4e`, run `fa4c0e0f-7ae1-4581-8f57-0a936e0dd0ea`;
   - R4 PASS source `9319472e7b3a075c1ddfccad87c1913d6d3758dc`, run `99a90abf-16fd-4e31-a5ca-0d05589de610`, then independent **CORRECTION REQUIRED**;
   - R5 corrected candidate `88fdb7ae26a63047817c5861191960a845c1af62`: first attempt blocked before SUT by GitHub fetch reset; subsequent genuine run `72fc242f-48f5-424e-88c9-a8ca572c0c2c` exposed focused BVP recovery regressions;
   - R6 source `fed6d52bd3b2c28db259c60c50da5b3ea7844682`, run `867791e0-7f7a-47f7-a6e8-2a4fec49f1d9`, focused PASS but product FAIL due a Builder-authored fixture assumption; do not treat it as accepted source;
   - canonical R7 PASS source `c47c88cde35dc827263e3ff7b1366a47bc41acb6`, tree `12d35229a727377583a134522f34d59a3acdac7c`, run `ba32978e-3536-43bf-8b0a-4ffb4e456c22`, evidence-only child `aa773cf65c5724182273c28cd603b97ef4a358a1`.
6. Verify R7 evidence directly:
   - 13/13 required stages PASS;
   - focused BVP **634/634 PASS**;
   - full product **1336/1336 PASS**;
   - typecheck/build/artifacts/check/change-set/repository PASS;
   - overall PASS / exit 0;
   - `main.js` 926008 bytes, SHA-256 `6825b343e8dfc38bdceda66b86dddeacc59f2fce6b773db349074036ff64531b`;
   - physical dispatch disabled.
7. Verify evidence commit `aa773cf65c5724182273c28cd603b97ef4a358a1` is exactly one child of the reviewed source and evidence-only; do not review it as product source.
8. Compare R4→R7 and ensure the correction does not weaken tests, requirements, architecture guards, recovery fences, inventory invalidation, or opaque-token rules merely to obtain PASS.
9. Publish a final independent verdict: **PASS**, **PASS WITH MINOR FINDINGS**, or **CORRECTION REQUIRED**, with concrete findings and exact reviewed source identity.

## Scope / non-authorization

A BU-05 PASS does **not** complete WS-02 or DEC-339. Still outside this BU:

- genuine cross-WebView/browser IndexedDB `versionchange` / blocked-upgrade behavior;
- complete live pre-/post-migration rollback;
- live scope-owner and consumer wiring;
- inventory activation/cutover;
- master or PR #157 merge;
- real Drive/vault/device operations;
- physical testing, installation, promotion, release, or Stage 3.

The Reviewer must not modify production source, tests, PHX-CI evidence, or Builder state.
