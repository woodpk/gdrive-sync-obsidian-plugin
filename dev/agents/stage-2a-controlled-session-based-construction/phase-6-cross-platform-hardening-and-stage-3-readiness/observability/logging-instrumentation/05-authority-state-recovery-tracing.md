# Phase 6 Logging Instrumentation — LOG-05 Authority, State, and Recovery Tracing

## 0. Agent Identity and Assignment

- Agent: `agt-ca-p6-log05-authority-state-recovery-tracing-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Work package: `LOG-05`
- Task classification: `IMPLEMENTATION`
- Prompt maturity: `PREPLANNED / NOT-YET-EXECUTABLE`

Assignment:

> Instrument the authoritative synchronization-state, semantic/persistence CAS, remote-change learning, and outstanding durable-intent recovery paths with the frozen LOG-01 observability contract so diagnostics can reconstruct exactly how authority generations/revisions and recovery decisions evolve, especially across uncertain physical effects, without changing state semantics, recovery ordering, Drive mutation behavior, or synchronization decisions.

This task makes existing authority/recovery behavior observable. It is not a recovery redesign or B01 repair.

## 1. Base / Drift Gate

Deferred execution-critical binding:

`COMMON_BASE_SHA = <deferred: exact supervisor-approved LOG-01 output SHA>`

Required semantic predecessor:

> Exact supervisor-approved LOG-01 output with frozen diagnostic fields, components, correlation, path-key, serialization, and redaction behavior.

Required branch:

`phase6-logging-log05-authority-state-recovery-tracing`

Binding authority: supervisor only. Do not execute until the exact SHA is supplied.

Before editing:

1. Resolve `COMMON_BASE_SHA`.
2. Verify repository identity, exact HEAD, and clean working tree.
3. Create the required branch from exactly the bound SHA.
4. Inspect state authority/recovery code and focused tests, including `src/state/persistent-state-store.ts`, `src/product/synchronization-adapters.ts`, `src/product/durable-intent-recovery.ts`, and only directly necessary contract/test helpers.
5. Read the approved LOG-01 contract and consume it without modification.

Do not substitute any branch tip, `phase6-integration`, another W1 output, or guessed predecessor.

## 2. Governing Authority

Correctness is governed by:

1. Later explicit supervisor decisions.
2. Target-system requirements for durable state, explicit operation-commit ordering, conservative recovery, change-cursor durability, no state-missing destruction, no success before verified mutation, local diagnostics, and secret/content minimization.
3. `software-products-dev-manual-agent-led.md`.
4. `build-session-task-batching-rubric.md`, Drive file ID `1Zp20YD-JfYtHe1hcCmHYsJXk9yZHXD7BlohBZzvdibw`, revision `ANLCKQl8g7Bl_Hhvt6x4506kVoDb19P0l-wUH7EhJktLXwxmm90Iw4qm5OMAPMNTQQMqJpWyEUc3YaDC8xugJpne45Q9bmjmDq7wxXksyw0`.
5. Logging-instrumentation session contract.
6. Approved LOG-01 frozen observability contract.
7. This prompt.
8. Repository implementation/tests as evidence.

If instrumentation reveals a semantic defect, preserve it as evidence and report it; do not fix it in this work package.

## 3. Temporal / Dependency Context

This is Wave `W1`, parallel with `LOG-02` and `LOG-04`.

All W1 work starts from the same exact LOG-01 base. You own authority/state/recovery instrumentation only. Google transport, execution-lifecycle, Drive semantic-operation, shared composition, and UI surfaces belong elsewhere.

After independent W1 reviews, the supervisor integrates approved outputs and freezes one exact W1 integration SHA for `LOG-03`.

Local completion is not integration or session approval.

## 4. Scope

Primary in-scope surfaces:

- `src/state/persistent-state-store.ts`;
- `src/product/synchronization-adapters.ts`;
- `src/product/durable-intent-recovery.ts`;
- focused state/CAS/remote-ingestion/recovery tests;
- narrowly necessary state/recovery-local diagnostic helper interfaces.

Allowed design shape:

- add backward-compatible optional diagnostic logger/sink parameters or callbacks to owned modules so they remain constructible from the common base without shared runtime wiring;
- emit only structured LOG-01 events/fields.

Out of scope:

- Google HTTP transport;
- `src/drive/google-drive-port.ts` semantic Drive operations;
- execution/durable-effect dispatch lifecycle owned by `LOG-04`;
- `src/drive/runtime.ts`/broad `src/product/runtime.ts` composition;
- diagnostic bundle/UI;
- any state/recovery algorithm change.

## 5. Required Behavior

### 5.1 Authority load/save observability

Record the existing authoritative state lifecycle without dumping raw state.

For relevant load/save/CAS boundaries, make visible when safely available:

- state load status (`trusted`, `uninitialized`, `recovery-required`, etc.);
- current `stateRevision`;
- current `persistenceRevision`;
- current `semanticGeneration`;
- expected persistence/semantic CAS values;
- whether the candidate changes semantic authority;
- resulting persistence/semantic values on successful save;
- stale-persistence versus stale-semantic-authority versus recovery-required result;
- bounded counts of pending operation intents/local transactions/learned batches when useful.

Never log the full state object or raw vault paths.

### 5.2 Semantic-generation transition observability

The trace must explicitly expose every existing transition that may advance semantic authority, including:

- ordinary `saveAuthority` semantic projection change;
- BASE/mapping/tombstone/path-convergence commit transitions;
- learned remote batch persistence/reduction/cursor transitions;
- any explicit convergence-generation rebasing performed by the existing adapter.

Where a transition occurs, record prior and resulting semantic/persistence revisions using the frozen LOG-01 fields/contract. If LOG-01 represents before/after with event pairing rather than distinct fields, use that exact contract consistently.

Do not change what counts as a semantic change.

### 5.3 Durable-intent state visibility

For recovery-relevant operation intents, make visible without dumping descriptors:

- `operationId`/`intentId` and bounded effect count;
- intent semantic generation;
- current authority semantic generation;
- each relevant `effectId` and stage;
- whether the intent is current-generation or stale under existing rules;
- exact existing reason when validation rejects an intent;
- intent retirement/removal when the current code performs it.

Use `pathKey` only when path correlation is essential and available safely.

### 5.4 Remote change-learning observability

Instrument the existing durable change-learning path sufficiently to reconstruct:

- remote batch/checkpoint identity;
- change count;
- cursor/checkpoint presence or safe opaque identity as allowed by LOG-01;
- persistence/CAS start and result;
- whether persistence changed semantic generation;
- reduction/commit progression when present;
- failure reason without raw Drive payload or path list.

Do not change when cursors or batches advance.

### 5.5 Outstanding durable-intent recovery observability

Instrument `recoverOutstandingDurableIntents` and its bounded helper paths so diagnostics reveal, in existing execution order:

- recovery/preverification entry;
- authority generation at entry;
- each selected outstanding intent and its generation/stage;
- remote-update preverification/recovery decision classification;
- current-generation validation success or exact mismatch reason;
- physical-reality observation classification returned by the existing recovery dependencies;
- result of recording the recovered physical result;
- receipt reconstruction success/failure;
- final recovery result/reason.

This is specifically required to make a sequence such as “remote batch advanced authority generation before an outstanding update intent was evaluated” directly visible if that is what the current production logic actually does.

Do not reorder batch learning or recovery to make the trace look cleaner.

### 5.6 Non-authoritative diagnostics

Instrumentation must not:

- alter semantic projection logic;
- change CAS expected values;
- change persistence revision/generation increments;
- rebase an intent that was not previously rebased;
- retain/discard an intent differently;
- move recovery earlier/later;
- alter change-cursor advancement;
- call Drive mutation itself;
- convert any failure into success.

## 6. Ownership and Shared Contracts

Owned semantic surface:

- state persistence/CAS diagnostics;
- synchronization authority adapter diagnostics;
- durable outstanding-intent recovery diagnostics.

Frozen shared contract:

- approved LOG-01 fields/components/path privacy/correlation/rendering.

Protected peer surfaces:

- `src/drive/transport.ts` (`LOG-02`);
- execution/durable effect dispatch (`LOG-04`);
- `src/drive/google-drive-port.ts` (`LOG-03` later);
- shared runtime composition/UI.

You may add optional diagnostic constructor/function parameters to owned modules provided existing call sites remain valid. Production wiring is deferred to LOG-03.

If accurate instrumentation requires modifying peer-owned logic, stop and report the exact ownership dependency.

## 7. Architecture and Dependency Constraints

- Add no dependency.
- Preserve IndexedDB/mobile-compatible persistence behavior.
- Do not serialize a second copy of authoritative state into diagnostics.
- Do not log raw state envelopes, BASE arrays, mappings, tombstones, learned-change payloads, paths, or file contents.
- Use IDs/counts/revisions/generations/reason codes only through the LOG-01 safe contract.
- Diagnostic failure must not change CAS/recovery results.
- Keep event volume bounded around semantic transitions, not every internal property comparison.
- Keep optional instrumentation seams backward-compatible until LOG-03 wires production composition.

## 8. Required Implementation Work

1. Reconstruct current authority load/save, semantic projection, learned-remote-batch, and durable-recovery order before editing.
2. Add optional LOG-01 diagnostic sinks/loggers to owned modules without requiring shared composition changes.
3. Emit structured events around authority load/CAS/semantic transitions and existing failure classifications.
4. Emit bounded change-learning/checkpoint evidence.
5. Emit outstanding-intent recovery selection/generation/stage/decision evidence, including exact stale-generation rejection when it occurs.
6. Add focused tests that prove event order and before/after authority facts while proving state/recovery outputs remain unchanged.
7. Add privacy tests ensuring raw paths/state payloads/content do not enter logs.
8. Reconcile all changed files against ownership.

## 9. Tests and Verification

Focused tests must prove at minimum:

- trusted authority load exposes safe revisions/generation and bounded counts without state dump;
- successful persistence exposes expected/current/result revisions and whether semantic authority changed;
- stale-persistence and stale-semantic-authority are distinguishable;
- a non-semantic persistence update does not falsely log a semantic-generation transition;
- a true semantic transition reports prior/result generation correctly without altering the existing increment logic;
- learned remote batch persistence exposes batch/change/CAS/generation evidence without raw change payload;
- an outstanding current-generation intent recovery emits its stage/generation and result;
- an outstanding stale-generation intent emits the exact existing mismatch/recovery-required classification;
- the current ordering between remote-change learning and durable recovery can be reconstructed from the emitted events;
- receipt reconstruction success/failure is observable;
- diagnostics do not alter returned save/recovery results;
- raw paths, full state JSON, secrets, and file content do not appear in rendered diagnostics.

Run:

```text
npm run typecheck
npm test
npm run build
git diff --check
```

Record focused non-zero test counts and inspect the complete diff from resolved `COMMON_BASE_SHA`.

## 10. Evidence Requirements

Write exactly:

`dev/evidence/_ca-output-agt-ca-p6-log05-authority-state-recovery-tracing-01.md`

Include:

- agent/work-package/task type/Wave `W1`;
- resolved exact common base SHA;
- branch and final implementation/evidence SHAs;
- complete changed-file list;
- frozen LOG-01 contract consumed;
- state/CAS/semantic/change-learning/recovery boundaries instrumented;
- exact tests demonstrating generation/recovery observability;
- all commands/counts/results;
- typecheck/full suite/build/diff-check results;
- limitations/unavailable checks;
- confirmation state/recovery semantics and ordering were not changed;
- confirmation no raw state/path/content/secrets entered logs/evidence;
- confirmation no live Drive mutation occurred;
- exact stop state.

Commit implementation and evidence. Evidence is not approval.

## 11. Prohibitions

- No live Drive mutation, B01 rerun, or remediation.
- No change to state schema semantics, semantic projection, generation/revision algorithms, CAS rules, change-cursor rules, intent lifecycle, or recovery ordering.
- No Drive transport/adapter instrumentation outside owned recovery call-site observations.
- No execution peer-surface edits.
- No LOG-01 contract changes.
- No shared runtime composition wiring.
- No raw path/state payload/file content/secret persistence.
- No dependency changes or unrelated refactoring.
- No merge/release/B02–O/iPhone/Stage 3 work.

## 12. Hard-Stop Conditions

Stop if:

- deferred common base is unresolved/mismatched;
- material drift invalidates assumptions;
- the frozen LOG-01 contract cannot represent required state/recovery facts;
- instrumentation would require changing authority/recovery behavior or ordering;
- peer-owned files are materially required;
- safe tracing would require dumping raw state, paths, content, or secrets;
- an unexpected semantic defect requires repair to proceed;
- mandatory verification cannot be completed;
- unexplained repository changes appear.

Report the blocker precisely; do not fix beyond scope.

## 13. Completion and Return to Supervisor

Return the exact resolved base, branch, implementation/evidence SHAs, changed files, focused/full verification results, and concise list of authority/generation/recovery facts now observable. Then stop for supervisory review.

Do not integrate or begin another work package.