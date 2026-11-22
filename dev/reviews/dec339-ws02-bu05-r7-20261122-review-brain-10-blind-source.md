# WS-02 / DEC-339 / BU-05 R7 — Frozen independent blind source assessment

**Reviewer:** review-brain-10  
**Scope:** Cursor Writer Concurrency and Backup-First Recovery Gates; software only  
**Repository:** woodpk/gdrive-sync-obsidian-plugin  
**Frozen source SHA:** `c47c88cde35dc827263e3ff7b1366a47bc41acb6`  
**Frozen source tree:** `12d35229a727377583a134522f34d59a3acdac7c`  
**Incoming state commit / branch head:** `80ede331990a03bc522739166b1beb5f1eeeeb1d`  
**Incoming handoff:** count 4, BUILDER → REVIEWER  
**Assignment:** `dev/planning/02-workstreams/WS-02-sync-semantics-and-state/tasks/dec339-ws02-bu05-r7-independent-review-2026-11-22.md`  
**Phase:** Blind/source-only assessment, frozen before reading tests, PHX-CI evidence, historical R4 review reports or R5/R6 diffs.

## Neutral source contract

The WS-02 architecture, bounded BU-05 plan, DEC-339 and the committed R7 assignment require: a trusted canonical Changes cursor; learned batches forming one ordered, unique, noncyclic advancing chain whose frontier is derived from durable history, with zero-advance observations handled as non-edges; no durable persistence of forked/detached/cyclic or incompatible replay records; same-ID replay bound to complete Changes content; source-bound CAS and independent pairing identity; backup-before-recovery replacement; preservation of BASE, mappings, pending intents and remote-inventory validity fencing. The work does **not** authorize DEC-339 planner activation, complete WS-02 acceptance, live Drive/vault/device operations, merges or release.

## Conforming source observations

1. **Controller learning and frontier:** `src/product/product-controller.ts` lines 41–143 now uses `durableRemoteChangeBatchSemanticallyEquivalent` to compare same-ID replay, loads trusted canonical cursor, inspects the entire existing ordered durable history, rejects a new starting token different from its validated frontier, and validates the proposed appended chain **before** `authorityStore.saveAuthority`. Cursor catch-up requires `durableCursorCanAdvance` and bounded CAS retries, not lexical/numeric comparison of opaque Drive tokens. An already-retained history may be caught up after restart.
2. **Canonical batch identity:** `src/product/snapshot-assembler.ts` `batchIdentity()` now hashes normalized starting/terminal tokens and ordered Changes payload. The effective incremental cursor comes from `inspectDurableCursorHistory().frontier`, not the last array element.
3. **Full-history structure:** `src/contracts/synchronization-foundation.ts` `inspectDurableCursorHistory()` checks unique advancing successors and predecessors, acyclicity, connectedness to canonical cursor, and durable array observation order. Zero-advance batches do not create advancing edges. `durableRemoteChangeBatchSemanticPayload()` includes the observed remote changes, not just token endpoints; `persistenceRevision` intentionally remains separate CAS context.
4. **Validator and writable authority CAS:** `src/state/persistent-state-store.ts` `DurableSemanticStateValidator.validate()` rejects invalid cursor histories and duplicated batch IDs. `saveAuthorityCore()` (lines ~591–640) refuses rewriting an existing learned batch's semantic content or checkpoint persistence revision and refuses removing an unreduced batch, then validates replacement and executes atomic byte CAS.
5. **Low-level writer:** `appendLearnedRemoteBatch()` (lines ~689–783) rejects incompatible same-ID replays and invalid proposed histories; direct new learning requires the old canonical cursor or a strictly empty bootstrap state, and successful writes are CAS-bound. This is conservative but possibly more restrictive than the controller's frontier-based path.
6. **Recovery and identity:** `replaceRecoveryState()` preserves the previously accepted pairing identity fences, old-byte backup before CAS, no foreign-pairing takeover. `commitTrustedCursorWithCas()` preserves predecessor/idempotent-target checks. `ProductRuntime` remains the legacy planner, and no new inventory activation is present.

## Blind concern B-01 — Potential MAJOR: generic trusted-state writer bypasses immutable remote-batch protection

**Source:** `src/state/persistent-state-store.ts` `saveTrustedCore()` (lines ~479–504), contrasted with `saveAuthorityCore()` (lines ~604–630).

The public, existing `saveTrusted(state, expectedRevision)` writer also serializes the **full** v1.1 durable authority envelope when its argument contains the authority marker. It invokes shape and current-state-internal `DurableSemanticStateValidator` checks but, unlike `saveAuthorityCore`, does **not compare existing durable batch IDs/contents with the currently persisted version** before its byte CAS. The semantic validator enforces valid cursor structure, not batch observation immutability relative to previously stored bytes.

**Concrete source-level counterexample:** Load a trusted v1.1 state containing a retained batch ID X, starting token C, terminal D, Changes payload P. Construct a candidate spread from that loaded state with the **same** batch ID/checkpoint/token chain but a changed Changes payload Q; maintain internally consistent state and matching `stateRevision`/`persistenceRevision` (and the correct expected old revision). `saveTrustedCore` checks only shape, internal semantics, and byte CAS. The original batch content can thus be replaced through a public canonical state writer, bypassing the immutable-ID protection of `saveAuthorityCore`. No simultaneous device race is required.

The assignment explicitly demands existing durable batch immutability across generic persistence/CAS paths. It is not yet established whether the governing architecture deliberately excludes the legacy `saveTrusted` route from this invariant; note that the actual shipping `commitTrustedCursorWithCas` uses it. **Pass 2 must decide** whether that route is intended to be protected; if so this is a concrete acceptance blocker until it enforces immutable batch records (including legal, proven reduction/retirement), or equivalent caller restrictions that cannot be bypassed.

## Blind concern B-02 — Low-level advancing batch after a lagged canonical cursor

**Source:** `src/state/persistent-state-store.ts` `appendLearnedRemoteBatch()` around lines 745–775.

A direct low-level new batch must start at `loaded.state.changeCursor` even when retained durable advancing history already forms `C→D` while canonical cursor is still C. In that valid pending state the next batch `D→E` begins at the *durable frontier D*, but this low-level API rejects it because D ≠ C. The controller's high-level path does support D as frontier. Assess whether the low-level writer is intentionally constrained to canonical-aligned batches only, or whether the acceptance requirement expects it to support valid frontier catch-up. A source-level compatibility gap exists, but its materiality must be established from authority/test use rather than assumed.

## Provisional blind verdict

**CORRECTION REQUIRED provisionally if B-01 is in scope; otherwise potentially PASS WITH MINOR FINDINGS after Phase 2.** The primary R4 fork/duplicate replay paths appear materially corrected in the controller and authority writer. No R7 software qualification or final acceptance is inferred from source-only reading.

## Blind isolation record

Required committed R7 assignment, feature handoff and neutral planning/state contain embedded Builder-produced correction and verification summaries. They were incidentally exposed solely while establishing task/identity, not treated as correctness proof. The previously known R4 F-01/F-02 requirements were already present in the review conversation. **No authored R7 tests, original R7 PHX-CI files, historical review-file text, or source comparison/diff/history were opened before this independent report was frozen.** This report must remain unchanged after the Phase-2 evidence assessment.
