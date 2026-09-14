# Phase 6 Latency Optimization — LAT-05 Remote Planning Fast Path

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat05-remote-planning-fast-path-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-05`

Task classification:

`IMPLEMENTATION`

Assignment:

> Reduce Google Drive planning latency by eliminating avoidable serialization and repeated read-only metadata work inside one reconciliation/planning cycle, while preserving exact managed-root/domain provenance, duplicate/ambiguity detection, pagination completeness, trusted change-cursor semantics, deterministic output, and fail-closed fallback to full reconciliation.

This work package owns **read-only remote planning latency only**. It does not own mutation throughput or authoritative execution validation.

---

## 1. Exact Base / Drift Gate

Use exactly:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required branch:

`phase6-latency-opt-05-remote-planning-fast-path`

Create the branch directly from that exact SHA. Record the starting SHA/status before editing. If the base cannot be used exactly, stop.

---

## 2. Required Reading

Inspect at minimum:

- `src/product/snapshot-assembler.ts`
- `src/drive/google-drive-port.ts`
- `src/drive/transport.ts`
- relevant Drive contracts under `src/contracts/`
- `test/phase3-drive.test.ts`
- `test/phase3-changes.test.ts`
- `test/phase5-group-b-drive-domain.test.ts`
- `test/phase5-group-b-scope-transfer.test.ts`
- `test/workstreams/orchestration/v1.2-reliable-changes.test.ts`
- `test/workstreams/orchestration/v1.2-remote-feed-authority.test.ts`
- `test/phase6-log02-google-http-transport-tracing.test.ts`
- `test/phase6-log03-google-drive-semantic-operation-tracing.test.ts`.

At the frozen base:

- `ProductSnapshotAssembler` already supports an incremental path when trusted canonical state has a cursor and reliable change-feed support is available;
- full reconciliation validates the managed remote and obtains a complete remote listing;
- `GoogleDriveAdapter.listForReconciliation()` discovers the two managed domains and enumerates them read-only;
- domain-root discovery and the two disjoint domain listings contain independent read-only work that is currently serialized in places.

Confirm exact implementation before editing.

---

## 3. Remote Safety Invariants

Do not weaken any of these:

- managed root must be the exact expected vault/protocol root;
- content and portable-config domains must each be unique, correctly marked, and within the managed root;
- an unmarked/ambiguous/colliding portable-config namespace remains conflict/recovery-required as today;
- remote object provenance and domain membership remain validated;
- duplicate path/identity ambiguity remains fail-closed;
- pagination must be exhausted before a listing/change batch is called complete;
- partial/transient listing remains partial, never silently complete;
- change-feed pages must prove the requested token and terminate in a new start token;
- an invalid/missing/conflicting cursor must fall back to the existing conservative full-reconciliation path;
- no remote mutation may be introduced into planning.

Do not cache Drive authority across synchronization runs in this work package.

---

## 4. Required Optimization Work

Implement the smallest safe combination of these read-only optimizations supported by the current code:

### A. Parallelize independent managed-domain discovery

After the managed root itself has been authoritatively read/validated, discovery of the ordinary content root and portable-configuration root is independent read-only work. Execute those independent lookups concurrently where safe.

Do not parallelize the managed-root validation that establishes the parent authority they depend on.

### B. Parallelize the two disjoint reconciliation-domain listings

Once both managed domain roots are validated, the content-domain traversal and portable-config-domain traversal are independent read-only operations. Permit them to overlap.

Requirements:

- do not concurrently mutate one shared `entries` array or path cache in a way that makes output order nondeterministic;
- collect each domain's result separately, then merge in a stable deterministic order compatible with existing semantics;
- preserve partial-result accounting if either domain encounters a retryable/transient interruption;
- preserve collision/provenance checks before merged results are exposed.

### C. Eliminate repeated metadata work within one planning assembly where exact evidence already exists

If the same immutable Drive metadata result is requested multiple times inside the **same** full planning/reconciliation assembly and the exact result can be safely passed/reused without changing a public contract, reuse it privately rather than reissuing the same request.

This reuse must be per-call/per-assembly only. No TTL cache and no reuse across synchronization runs.

### D. Protect the existing incremental fast path

Add/strengthen deterministic tests proving that a trusted valid change cursor uses the reliable Changes path and does not perform a full reconciliation listing unless the incremental feed explicitly requires conservative fallback.

Do not invent a cursor when none exists. First-sync/no-cursor behavior remains full reconciliation.

---

## 5. Required Deterministic Tests

Use fake transport/Drive fixtures, deferred promises, counters, and controlled pagination. Do not use live Google Drive or wall-clock performance thresholds.

Prove at minimum:

- independent content-root/config-root discovery overlaps after managed-root authority is established;
- domain discovery still rejects missing, duplicate, unmarked, trashed, or ambiguous roots exactly as before;
- content-domain and portable-config-domain listings overlap;
- output ordering is deterministic even when the two domain listings complete in the reverse order;
- the combined listing contains the same logical entries as the serial baseline;
- partial/transient failure in either domain cannot be reported as complete;
- pagination remains complete and deterministic;
- concurrent read-only work does not weaken path/identity collision detection;
- same-assembly metadata reuse reduces duplicate request count in the fixture where the base currently repeats it;
- reuse does not survive a second independent assembly/run;
- valid trusted cursor uses the incremental Changes route without full listing;
- invalid/conflicting/missing cursor falls back safely to full reconciliation;
- no Drive mutation endpoint is invoked by these optimized planning paths.

Add request-count assertions only where they express structural deduplication; do not bind tests to incidental diagnostic requests unrelated to the optimized path.

---

## 6. Out of Scope / Prohibited

Do not:

- change upload/download/update/move/trash mutation algorithms;
- parallelize physical Drive mutations;
- change transport retry/backoff policy;
- weaken exact-ID or topology verification used by mutations;
- change local enumeration/stability behavior;
- change authoritative execution validation; LAT-04 owns that;
- change durable state schemas or CAS semantics;
- synthesize or advance a change cursor before its existing durable commit point;
- cache managed-root/domain evidence across runs;
- change mobile lifecycle cancellation/background behavior;
- modify OAuth/PKCE/two-tap authorization;
- remove/rename/change the prepared-authorization diagnostic helper or browser/auth diagnostic controls;
- perform live Drive mutations or device testing;
- merge shared branches.

If a proposed request reduction would require trusting remote metadata after its authority could have changed, do not implement that reduction.

---

## 7. Validation

Run:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run directly affected Drive/domain/change-feed/diagnostic focused tests with `node --test`.

Then run:

`npm run check`

Do not weaken existing Drive ambiguity/provenance tests to obtain green status.

---

## 8. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

Include:

- exact base SHA;
- branch;
- final SHA;
- changed files;
- before/after structural request/concurrency counts from deterministic fixtures;
- which independent read-only stages now overlap;
- deterministic merge strategy;
- proof that partial/ambiguity/provenance behavior remains fail-closed;
- proof that incremental mode avoids full listing only under trusted cursor authority;
- focused/full validation results;
- any optimization rejected because it would weaken remote authority.

Commit implementation, tests, and evidence.

---

## 9. Acceptance Criteria

Accept only if:

- at least one previously serialized independent remote-read stage now overlaps or a demonstrably duplicate same-assembly request is removed;
- result ordering remains deterministic;
- no cross-run remote cache exists;
- ambiguity/duplicate/provenance/pagination safety remains intact;
- valid incremental mode remains incremental and unsafe incremental state falls back full;
- no mutation behavior changes;
- focused and full gates pass.

---

## 10. Stop / Final Response

Stop after committing/validating LAT-05.

Report succinctly:

- branch;
- final SHA;
- changed files;
- structural request/concurrency improvement;
- focused/full test status;
- blocker, if any.

Do not begin integration or another latency work package.
