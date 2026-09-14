# Phase 6 Logging Instrumentation — LOG-03 Google Drive Semantic Operation Tracing

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log03-drive-semantic-operation-tracing-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-03`
- Task classification: `IMPLEMENTATION / INTEGRATION CONSUMER`
- Temporal model: `SERIAL — W2 after approved W1 integration`
- Prompt maturity: `EXECUTION-READY`

Assignment:

> From the exact supervisor-approved W1 integration SHA, instrument `GoogleDriveAdapter` at the semantic operation/observation level and perform only the bounded production composition wiring needed to connect the already-approved LOG-01/02/04/05 diagnostic hooks. The resulting trace must make candidate creation, exact-ID observations, logical-path topology observations, predecessor retirement, convergence decisions, change-feed/reconciliation observations, and Drive mutation outcomes reconstructable without changing synchronization, Drive, retry, authentication, persistence, or recovery semantics.

This is semantic instrumentation and approved-hook wiring only. **Do not repair B01 predecessor-retirement behavior in this task.**

---

## 1. Exact Base / Drift Gate

Frozen supervisor-approved W1 integration SHA:

`W1_INTEGRATED_BASE_SHA = 50b263a61334767d2b604b22de341c0c230abdca`

This merge contains the approved LOG-01 foundation and approved LOG-02, LOG-04, and LOG-05 outputs.

Required branch:

`phase6-logging-log03-drive-semantic-operation-tracing`

Before editing:

1. Verify repository identity and that `50b263a61334767d2b604b22de341c0c230abdca` exists.
2. Create the required branch from **exactly** that SHA.
3. Verify the working tree is clean.
4. Confirm the approved LOG-01/02/04/05 hooks are present and compatible.
5. Inspect the current Drive/update/composition surfaces before changing them.

Do not substitute the current `phase6-integration` tip, the old W1 branch, `main`, or any later tasking-document commit for the exact implementation base above. The commit that publishes this prompt is supervisory metadata, not the implementation base.

If the exact base lacks a required approved W1 hook or contains a material integration inconsistency, stop and report the concrete blocker rather than redesigning a peer contract.

---

## 2. Governing Authority

Correctness is governed, in order, by:

1. Later explicit supervisor decisions.
2. The authoritative target-system requirements for Drive boundaries, stable identity, transfer integrity, retry-safe mutation, operation commit, conflict/recovery, local diagnostics, privacy, and mobile compatibility.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`.
5. The Phase 6 logging-instrumentation orchestration contract.
6. Frozen LOG-01 diagnostic contracts and approved W1 instrumentation interfaces.
7. This prompt.
8. Repository code/tests as current-state evidence.

The B01 live failure is diagnostic context only: a replacement candidate can become live while the predecessor remains live. LOG-03 must make the causal Drive branch observable; it must not change that algorithm.

---

## 3. Repository-Grounded Starting State

At the frozen W1 base:

- `GoogleHttpTransport` already supports an optional `DiagnosticLogger` and emits LOG-02 HTTP transport events.
- `PersistentSynchronizationStateStore` already supports an optional `DiagnosticLogger` and emits LOG-05 state/recovery events.
- `ProductRuntime` already has the host `DiagnosticLogger`, passes it to existing controller/snapshot seams, and sets OAuth diagnostics.
- `createObsidianGoogleDriveBoundary` currently constructs the transport and `GoogleDriveAdapter` without passing the host diagnostic logger.
- `GoogleDriveAdapter` currently has no semantic diagnostic sink in its constructor.

Primary current surfaces to inspect:

- `src/drive/google-drive-port.ts`
- `src/drive/runtime.ts`
- `src/product/runtime.ts`
- `src/drive/transport.ts`
- `src/drive/obsidian-http.ts`
- `src/state/persistent-state-store.ts`
- relevant Drive protocol, W1 instrumentation, and runtime-composition tests

Reconstruct the existing remote update path before editing, including `updateExisting`, `finalizeExistingUpdate`, candidate upload/verification, `finalizeVerifiedUpdateCandidate`, predecessor trash, and logical-path candidate resolution.

---

## 4. Scope and Ownership

You own:

- semantic Drive diagnostic events in `src/drive/google-drive-port.ts`;
- bounded diagnostic composition in `src/drive/runtime.ts`;
- the minimum necessary `src/product/runtime.ts` wiring to pass the one host logger into approved LOG-02/03/05 seams while preserving approved LOG-04 wiring;
- directly related semantic Drive and composition tests;
- a minimal semantic Drive diagnostic helper only if it materially reduces duplication without creating a new contract.

You consume read-only:

- LOG-01 field/component/redaction/path-key contract;
- LOG-02 transport instrumentation semantics;
- LOG-04 execution instrumentation semantics;
- LOG-05 state/recovery instrumentation semantics.

Out of scope:

- any B01/update algorithm repair;
- new retries, settling, polling, delays, request reordering, or mutation behavior;
- changes to HTTP retry/OAuth semantics;
- changes to execution/durable-effect semantics;
- changes to persistence/CAS/generation/recovery semantics;
- diagnostic bundle/UI/export work;
- `src/main.ts` unless a compile-only consequence proves unavoidable and is reported before broadening scope;
- new telemetry/network destinations;
- live Drive mutation or live validation.

Do not rewrite approved W1 implementations merely to make wiring stylistically cleaner.

---

## 5. Required Behavior

### 5.1 Semantic identity and privacy

Use the frozen LOG-01 diagnostic contract. Semantic events must use safe correlation values already available to the operation, including when applicable:

- `runId`;
- `operationId` / `intentId` / `effectId`;
- safe `pathKey` rather than raw path/name;
- predecessor/current/candidate `remoteObjectId`;
- mutation or observation class;
- expected/observed revision;
- canonical content hash/size only when already synchronization evidence;
- bounded result/reason/convergence classification.

Do not log file contents, request/response bodies, OAuth material, credentials, raw query URLs, raw vault paths, or raw file names.

### 5.2 Remote update causal trace — mandatory

Instrument the existing immutable-candidate update/finalization path so the trace can reconstruct, in causal order when applicable:

1. update/finalization entry;
2. predecessor exact-ID observation;
3. candidate pre-observation by exact ID;
4. candidate upload/session semantic dispatch and result when creation is required;
5. candidate post-upload exact-ID observation/verification;
6. predecessor post-candidate exact-ID observation;
7. entry to `finalizeVerifiedUpdateCandidate`;
8. candidate/predecessor revision/content/path verification decisions;
9. pre-retirement logical-path topology observation with bounded occupancy and deterministic occupant-ID representation;
10. the exact branch selected when topology prevents retirement;
11. predecessor-retirement semantic dispatch start/result;
12. predecessor exact-ID post-retirement observation and `trashed` state;
13. post-retirement logical-path topology observation;
14. final convergence decision and exact outcome/reason.

The resulting evidence must distinguish without source-code inference:

- retirement PATCH was never reached;
- retirement was reached but transport returned failure/ambiguous outcome;
- an ambiguous retirement response was later physically verified as trashed;
- retirement occurred but path listing remained ambiguous/stale;
- direct candidate GET succeeded while path listing did not yet expose the candidate;
- an independent third occupant caused conflict preservation;
- candidate content/revision/path verification failed.

**Do not change the existing outcome in any of these scenarios.**

### 5.3 Other Drive semantic operations

Add bounded semantic start/result/observation tracing, where the existing operation materially affects synchronization state, for:

- reserved file/folder creation and ID reservation;
- ordinary remote trash;
- identity-preserving move;
- managed-root creation/pairing validation where identity/mutation matters;
- resumable upload semantic milestones without per-byte/per-chunk logging;
- create/update recovery observations.

Keep this semantic, not a duplicate HTTP trace.

### 5.4 Reconciliation and change-feed observations

Record bounded semantic summaries for:

- reconciliation enumeration start/result/completeness and entry count;
- change-page start/result, change count, intermediate/terminal classification, and safe cursor/checkpoint correlation permitted by LOG-01;
- logical-path candidate-resolution observations used in mutation/convergence decisions;
- relevant recovery-read classification.

Do not log raw entry lists, raw paths/names, or change payloads.

### 5.5 Production composition

Wire the host's existing `DiagnosticLogger` through approved seams so production composition emits LOG-02/03/04/05 events through the same local diagnostic plane.

The composition must remain valid when diagnostics are absent/no-op in tests and remain compatible with Obsidian desktop/mobile `requestUrl` constraints.

Diagnostics are observational only. Diagnostic failure or absence must not change synchronization behavior.

---

## 6. Required Tests

Add focused tests proving at minimum:

- create/move/trash/update semantic events are safe and correlated;
- the remote update trace exposes predecessor/candidate IDs, exact-ID observations, topology observations, retirement dispatch/re-observation, and convergence outcome when those stages occur;
- candidate exact-ID GET may succeed while pre-retirement path listing does not yet expose the candidate, with the existing production branch/outcome unchanged;
- retirement failure/ambiguous transport result is distinguishable from later physical re-observation;
- post-trash exact-ID observation and path listing may disagree and both facts are visible without behavioral change;
- a third occupant is distinguishable from the expected predecessor/candidate pair;
- reconciliation/change-page diagnostics contain bounded counts/completeness but no raw paths/payloads;
- raw file names/paths, credentials, OAuth material, request/response bodies, and raw query URLs do not appear;
- production composition uses one shared logger plane across LOG-02/03/04/05;
- instrumentation does not alter returned Drive outcomes, request ordering, or retry behavior.

Do not weaken existing tests to make LOG-03 pass.

---

## 7. Verification and Commit Discipline

Keep the task reviewable at exact immutable SHAs.

1. Complete the bounded implementation and focused tests.
2. Commit and push the implementation candidate **before** final verification; record the exact implementation SHA.
3. Against that exact SHA run:

```text
npm ci
npm run typecheck
npm test
npm run build
git diff --check 50b263a61334767d2b604b22de341c0c230abdca..<IMPLEMENTATION_SHA>
```

Also run the focused LOG-03 tests separately and record a non-zero focused pass count.

If verification fails, preserve the exact failure output. Correct only a defect attributable to LOG-03, commit the corrected candidate, and rerun required verification against the new exact SHA. Do not perform historical-log archaeology when a fresh exact-SHA rerun can establish the fact directly.

Inspect the complete frozen-base-to-implementation diff and explicitly confirm that no B01 algorithm, retry, authentication, state, CAS, generation, recovery-order, or synchronization-decision behavior changed.

Only after all required gates pass, create:

`dev/evidence/_ca-output-agt-ca-p6-log03-drive-semantic-operation-tracing-01.md`

The evidence record must state the exact base SHA, branch, implementation SHA, changed-file set, focused/full verification results, build/diff results, composition wiring, privacy/non-authority confirmation, and any limitations. Commit and push the evidence record as a **separate evidence commit**.

Do not merge or integrate the branch.

---

## 8. Stop Conditions

Stop and return to the supervisor when one of these is true:

- `COMPLETE`: implementation and evidence commits are pushed and all required verification passes;
- `INCOMPLETE`: turn capacity ends after coherent progress; preserve exact committed state and state the deterministic continuation;
- `BLOCKED`: an actual authority/ownership/contract condition prevents deterministic continuation;
- `FAILED`: a task-owned defect remains after the permitted bounded correction attempt.

Do not call an ordinary unfinished verification step `BLOCKED`. Do not claim supervisor approval.

After successful completion, LOG-06 remains unauthorized until supervisory review approves LOG-03 and freezes its exact output SHA.

---

## Required Return Summary

Return exactly one concise Markdown block in this format:

### STATUS
`COMPLETE | INCOMPLETE | BLOCKED | FAILED`

### PROVENANCE
- Base SHA: `<sha>`
- Branch: `<branch>`
- Implementation SHA: `<sha or N/A>`
- Evidence SHA: `<sha or N/A>`

### CHANGES
- Files changed: `<complete base-to-implementation file list>`
- Scope note: `<one sentence confirming scope stayed bounded>`

### VERIFICATION
- Focused tests: `<count>/<count> PASS | FAIL | NOT RUN`
- Full tests: `<count>/<count> PASS | FAIL | NOT RUN`
- Typecheck: `PASS | FAIL | NOT RUN`
- Build: `PASS | FAIL | NOT RUN`
- `git diff --check`: `PASS | FAIL | NOT RUN`

### RESULT
`<2–4 sentences describing what was implemented or verified and whether any semantic/behavioral change occurred>`

### LIMITATIONS / BLOCKERS
`<none, or exact unresolved issue>`

### STOP STATE
`<exact current state and what must happen next>`

Do not add narrative before or after this block. Do not claim supervisor approval.
