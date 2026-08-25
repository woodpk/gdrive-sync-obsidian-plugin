# Cumulative Coding-Agent Evidence — Phases 1–5

This file is the cumulative construction-evidence ledger for `woodpk/gdrive-sync-obsidian-plugin`. Earlier phase evidence is retained rather than declared superseded. Detailed phase records remain authoritative historical evidence at their preserved paths/commits; this ledger records their identity and carries the evidence chain forward into Phase 5.

Phase 6 and Stage 3 have **not** begun.

---

## Phase 1 — Repository Foundation and Frozen Shared Contracts

### Recovered historical evidence

The original Phase 1 `_ca-output.md` was recovered from Git history at commit:

`91f740bf3d6ad1a93524dc0a1ea77dfeba22eb9b`

That historical record identifies:

- build/session: `Stage 2A Build Session 01 / Phase 1 — Repository Foundation and Frozen Shared Contracts`;
- baseline: `0f88f8f11d10caf492237b323aec1b550fc2b052`;
- final pushed implementation SHA before the Phase 1 evidence-only commit: `40af4c2a73576f931868453f03857af25bd207d9`;
- final post-lockfile CI run: `32662829150`;
- `npm ci`: PASS;
- `npm run typecheck`: PASS;
- `npm test`: PASS — 14/14 Phase 1 tests;
- `npm run build`: PASS.

Phase 1 established the mobile-compatible Obsidian plugin foundation, reproducible build/test tooling, frozen shared contracts under `src/contracts/**`, test fakes, architecture/mobile-safety checks, and `dev/phase-1-shared-contracts.md`.

The complete recovered Phase 1 evidence remains available through the immutable historical Git object above; its prior failed intermediate CI attempts and corrective steps remain part of the record and are not rewritten here as passes.

---

## Phase 2 — Core Synchronization Semantics and Durable State

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P2.md`

That record identifies:

- session: `Stage 2A Build Session 02 / Phase 2 — Core Synchronization Semantics and Durable State`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final implementation head verified by Phase 2 CI: `5be0dca6eb97d2842c63b16540d9c938dd96ecb6`.

Phase 2 established deterministic LOCAL/REMOTE/BASE planning, safe-union initialization, timestamp-independent truth, conservative deletion authority, conflict/three-way-merge semantics, identity-preserving move recognition, destructive safety policy, durable/versioned synchronization state, tombstones/stale-device protection, operation journaling, crash-safe verified commit order, run serialization, cancellation/pause/deferred reconciliation, and precondition validation.

The full Phase 2 implementation inventory and verification history are preserved in `_ca-output-CA-P2.md`.

---

## Phase 3 — Google Drive and OAuth Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P3.md`

That record identifies:

- session: `Stage 2A Build Session 03 / Phase 3 — Google Drive and OAuth Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- verified Phase 3 code head: `6e4621345809b30e8b4161f1e52f6344f7474c33`;
- final code verification run: `32713423290`;
- verification job: `97389515202`.

Phase 3 established the `drive.file` OAuth/Drive implementation, PKCE/state transaction integrity, device-local secret storage, same-device authorization return seams, stable managed-root identity/protocol metadata, explicit pairing and account binding, Changes API support, complete/partial reconciliation semantics, lazy bounded downloads, resumable uploads, identity-preserving Drive moves, recoverable Drive trash, and structured bounded retry/error signaling.

The full Phase 3 implementation, official-documentation basis, limitations, and verification record remain preserved in `_ca-output-CA-P3.md`.

---

## Phase 4 — Obsidian Local, Platform, and Configuration Boundary

Detailed retained evidence:

`dev/evidence/_ca-output-CA-P4.md`

That record identifies:

- session: `Stage 2A Build Session 04 / Phase 4 — Obsidian Local, Platform, and Configuration Boundary`;
- supervisor-approved baseline: `e16719196269b4b31f8f1a4997722cdd1c916058`;
- final corrected implementation head recorded in the Phase 4 evidence: `4d06581fa91ba9643496a67296b5002925581ba2`;
- verification run for the recorded correction: `32731187369`;
- verification job: `97443556511`.

Phase 4 established the production local-vault boundary, path/exclusion/configuration policy, atomic local replacement semantics, Obsidian FileManager move/trash behavior, startup/lifecycle event handling, desktop external-reference containment checks, and mobile-safe fail-closed behavior.

### Preserved stock-iOS platform limitations

The Phase 4 evidence established two limitations that remain authoritative and were not weakened during Phase 5:

1. stock Obsidian iOS cannot currently prove bounded arbitrary-file byte-range reading for every required file type; unsafe whole-file `readBinary()` fallback is prohibited;
2. stock Obsidian iOS cannot currently prove symlink/alias/external-reference containment equivalent to the required safety guarantee; the implementation fails closed where proof capability is unavailable.

The full Phase 4 evidence remains preserved in `_ca-output-CA-P4.md`.

---

## Phase 5 — Integrated Product, Accepted A/B/C Repairs, and Group D Acceptance Closure

### Integrated starting point for Group D

- authoritative branch: `master`;
- integrated starting SHA: `70b4952c82987e1de8a1455166b090b2a4f57918`;
- accepted Group A/B/C repairs were already integrated before Group D began.

Retained Group repair evidence:

- `dev/evidence/_ca-output-agt-CA-P5-GROUP-A-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-B-01.md`;
- `dev/evidence/_ca-output-agt-CA-P5-GROUP-C-01.md`.

Final Group D Phase 5 evidence:

`dev/evidence/_ca-output-CA-P5.md`

Current blocker/limitation record:

`dev/evidence/_ca-blocker.md`

### Group D material acceptance changes

Group D:

- created a genuine production-chain Scenario 26 integration test proving a local change during an active synchronization is deferred to a later reconciliation pass rather than mutating the active plan;
- added executable acceptance evidence for meaningful-notification policy and canonical external BRAIN asset-repository isolation;
- replaced the prior 1–50 free-text acceptance list with a structured map containing exact executable test files/names and orchestration/evidence descriptions;
- made that map self-verifying by loading the referenced test source and failing when a mapped executable test is absent or renamed;
- restored Phase 5-specific evidence and the blocker record;
- recovered the original Phase 1 evidence identity from Git history and restored this cumulative Phase 1–5 ledger.

### Final dynamically tested implementation/test checkpoint

Exact SHA:

`ee431c408c64cddf3bcc8642c3015179fefb9b91`

Authoritative GitHub Actions gate:

- workflow: `Phase 1 CI`;
- run ID: `32805503922`;
- job ID: `97674724654`;
- clean checkout confirmed exact SHA `ee431c408c64cddf3bcc8642c3015179fefb9b91`;
- `npm ci`: **PASS**;
- `npm run typecheck`: **PASS**;
- `npm test`: **PASS** — 177 tests / 177 pass / 0 fail / 0 cancelled / 0 skipped / 0 todo;
- `npm run build`: **PASS**.

This is the authoritative dynamically tested implementation/test SHA. Later commits that change only evidence documentation are evidence-only heads and are not substituted for this tested SHA unless separately observed through CI.

### Phase 5 acceptance-map status

The final CI run executed and passed:

`Phase5 acceptance map has exact source-verified executable evidence for scenarios 1 through 50`

The map covers Scenario 1 through Scenario 50 and verifies every exact test-file/test-name reference. Scenario 26 is backed by the new Group D production orchestration integration test rather than a textual placeholder.

### Final invariant sweep

The integrated passing suite includes evidence covering:

- stale-state compare-and-swap protection;
- recovery completion authority only after complete reconstruction/cursor commit;
- canonical SHA-256 retained-text materialization;
- Drive synchronization-domain provenance and cross-domain reclassification protection;
- managed-object escape protection;
- path-local reserved-domain collision isolation;
- lazy Drive authentication/transient/rate-limit failure taxonomy;
- startup-readiness replay and lifecycle-trigger coalescing;
- same-runtime serialization and cross-instance Web Locks exclusion;
- conservative stale/incomplete deletion authority;
- timestamp advisory-only semantics;
- external BRAIN asset-repository isolation;
- non-destructive unload/disposal behavior.

No new production-contract defect was exposed by the final Group D automated acceptance gate.

---

## Current Unavailable Live / Physical Validation

These are **not** recorded as passes:

- real Windows Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real iPhone/iOS Obsidian synchronization — `NOT AVAILABLE IN THIS SESSION`;
- real-user Google OAuth authentication — `NOT AVAILABLE IN THIS SESSION`;
- deployed Azure callback validation — `NOT AVAILABLE IN THIS SESSION`;
- live production Google Drive synchronization — `NOT AVAILABLE IN THIS SESSION`;
- physical network interruption during transfer — `NOT AVAILABLE IN THIS SESSION`;
- physical disk-full behavior — `NOT AVAILABLE IN THIS SESSION`;
- physical large-vault / large-file stress testing — `NOT AVAILABLE IN THIS SESSION`.

---

## Current Completion State

`BLOCKED`

The Phase 5 implementation/test gate is green, but the Group D work order also requires remote GitHub branch enumeration to contain only `master`. The connected GitHub tool surface available in this session does not expose remote-ref/branch deletion. Actual enumeration still contains historical non-`master` branches. See `dev/evidence/_ca-blocker.md` for the exact branch list and blocker statement.

No supervisory approval is claimed.