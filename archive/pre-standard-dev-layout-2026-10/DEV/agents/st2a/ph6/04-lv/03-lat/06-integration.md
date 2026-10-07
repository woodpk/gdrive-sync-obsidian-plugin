# st2a-ph6-04-lv-03-lat-06 — Controlled Integration

Build address: `st2a-ph6-04-lv-03-lat-06`

## 0. Agent Identity and Assignment

You are:

`agt-ca-st2a-ph6-04-lv-03-lat-06-integration-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`st2a-ph6-04-lv-03-lat-06`

Task classification:

`CONTROLLED INTEGRATION`

Assignment:

> Integrate the completed, independently validated Phase 6 latency-optimization branches into one coherent candidate without adding new optimization design. Resolve only genuine mechanical/semantic integration conflicts, preserve all safety invariants, run focused cross-workstream regression plus the full repository gate, and produce exact integration evidence.

This session begins only after `st2a-ph6-04-lv-03-lat-01`, `st2a-ph6-04-lv-03-lat-03`, `st2a-ph6-04-lv-03-lat-04`, and `st2a-ph6-04-lv-03-lat-05` are complete. `st2a-ph6-04-lv-03-lat-03` already contains `st2a-ph6-04-lv-03-lat-02` as its predecessor.

---

## 1. Frozen Common Ancestor

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required integration branch:

`st2a-ph6-04-lv-03-lat-06-integration`

The predecessor prompts 01–05 predate the repository-wide coded naming conversion. Their already-issued branch/evidence artifact names remain execution inputs and must be resolved exactly as written below; do not rename or guess them during this integration session:

- `st2a-ph6-04-lv-03-lat-01` → branch `phase6-latency-opt-01-measurement-foundation` → evidence `dev/evidence/_ca-output-agt-p6-latency-opt-01.md`
- `st2a-ph6-04-lv-03-lat-03` → branch `phase6-latency-opt-03-run-scoped-local-evidence` → evidence `dev/evidence/_ca-output-agt-p6-latency-opt-03.md`
- `st2a-ph6-04-lv-03-lat-04` → branch `phase6-latency-opt-04-precondition-dedup` → evidence `dev/evidence/_ca-output-agt-p6-latency-opt-04.md`
- `st2a-ph6-04-lv-03-lat-05` → branch `phase6-latency-opt-05-remote-planning-fast-path` → evidence `dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

Do **not** ask the operator for SHAs or pasted output.

---

## 2. Self-Resolving Predecessor Gate

For each required predecessor branch:

1. Fetch the branch from `origin`.
2. Resolve its remote-tracking tip and record the exact SHA.
3. Verify `COMMON_BASE_SHA` is an ancestor of that tip using `git merge-base --is-ancestor`.
4. Verify the corresponding evidence file exists at that exact tip using `git cat-file -e`.
5. Read the evidence file from that exact tip.
6. Confirm the predecessor reports its scoped implementation/verification complete, not a hard blocker or safety rejection.

For `st2a-ph6-04-lv-03-lat-03`, additionally verify its evidence identifies the `st2a-ph6-04-lv-03-lat-02` predecessor and that its history contains that predecessor branch work. Do not separately merge the 02 branch if it is already an ancestor of the 03 branch.

If any required branch/evidence is missing, does not descend from the common base, or reports an unresolved safety blocker, stop. Do not improvise replacement inputs.

---

## 3. Create Integration Branch

Create `st2a-ph6-04-lv-03-lat-06-integration` directly from `COMMON_BASE_SHA`.

Integrate the validated predecessor tips in this deterministic order:

1. `st2a-ph6-04-lv-03-lat-01`
2. `st2a-ph6-04-lv-03-lat-03` (thereby including 02)
3. `st2a-ph6-04-lv-03-lat-04`
4. `st2a-ph6-04-lv-03-lat-05`

Use normal Git merge ancestry; preserve predecessor commits. Do not squash away evidence provenance.

If a branch is already an ancestor because of unexpected but valid history, record that fact and do not duplicate it.

---

## 4. Integration Conflict Policy

Resolve conflicts only when the intended result is unambiguous from the predecessor implementations, tests, and frozen architecture.

Allowed conflict-resolution work:

- combine non-overlapping imports/helpers;
- reconcile test-helper naming;
- preserve both sets of focused assertions when they test different concerns;
- adapt private call sites mechanically when two approved branches changed the same private implementation surface;
- update diagnostics so both approved meanings remain represented.

Not allowed:

- redesigning any optimization;
- weakening an approved safety assertion because branches conflict;
- dropping one branch's functionality to make another pass;
- changing frozen synchronization contracts;
- changing durable-state or recovery semantics;
- adding physical-operation concurrency;
- changing mobile lifecycle/background cancellation behavior;
- changing OAuth/PKCE/two-tap behavior or diagnostic authorization/browser controls.

If a conflict requires a substantive architectural choice rather than a mechanical integration, stop and report it for supervisor-directed correction.

---

## 5. Cross-Optimization Safety Review

After merging, inspect the combined call paths specifically for unsafe composition:

- bounded local observation concurrency must remain read-only and globally bounded;
- 03 local evidence reuse must not accidentally become broader because of 02 concurrency;
- cached/reused local evidence must never become mutation authority;
- 04 validation dedup must still have one exact fail-closed final authorization boundary;
- 05 remote read concurrency/reuse must remain per-assembly and read-only;
- no combined optimization may cache evidence across synchronization runs;
- no combined optimization may reorder durable intent/effect/state commit semantics;
- diagnostic instrumentation must remain observational only.

Explicitly inspect for accidental concurrency between physical mutations. There must be none.

---

## 6. Required Focused Regression Matrix

Compile tests:

`npx tsc -p tsconfig.test.json`

Run the focused tests introduced by `st2a-ph6-04-lv-03-lat-01` through `st2a-ph6-04-lv-03-lat-05`, plus directly affected existing tests covering:

- local vault observation/enumeration;
- iOS/mobile adapter/content reading;
- local transaction safety and recovery;
- authoritative boundary/commit lifecycle;
- Drive domain/reconciliation/change feed;
- destructive safety;
- structured Drive/HTTP diagnostic tracing.

Use the exact compiled `.test-build/test/...` paths present after merge.

The focused matrix must include at least:

- `obsidian-local-vault` coverage;
- `phase6-alpha-ios-adapter-boundary` and/or `phase6-alpha-ios-content-reader` as applicable;
- `workstreams/local/local-transaction-safety`;
- `workstreams/orchestration/v1.2-authoritative-boundary`;
- `workstreams/orchestration/v1.2-authoritative-commit-lifecycle`;
- `phase3-drive` and `phase3-changes`;
- `workstreams/orchestration/v1.2-reliable-changes`;
- `phase6-b-destructive-safety`;
- any new `phase6-latency-*` tests.

Then run the full gate:

`npm run check`

---

## 7. Deterministic Combined Acceptance Checks

The integrated candidate must demonstrate structurally:

- local independent observations overlap but never exceed the 02 bound;
- local stable evidence reuse reduces redundant read-only stability/observation work while stale-event invalidation still works;
- full authoritative validation is not redundantly executed twice for one unchanged operation;
- stale authority injected at the validation/dispatch boundary still blocks mutation;
- independent remote read-only domain work overlaps/deduplicates as approved;
- incremental remote planning remains cursor-authority gated;
- no physical mutation concurrency was introduced;
- all durable transaction stages and final integrity proofs remain present.

Do not substitute a wall-clock-only benchmark for these structural checks.

---

## 8. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-st2a-ph6-04-lv-03-lat-06.md`

Record:

- canonical build address `st2a-ph6-04-lv-03-lat-06`;
- `COMMON_BASE_SHA`;
- exact resolved SHA for each predecessor;
- ancestry/evidence gate result for each predecessor;
- integration branch;
- merge order and merge commit SHAs;
- any conflict and exact resolution;
- final integration SHA;
- complete changed-file summary relative to `COMMON_BASE_SHA`;
- focused regression commands/results;
- full `npm run check` result;
- explicit cross-optimization safety findings;
- explicit confirmation that mobile lifecycle behavior and OAuth diagnostic functions were untouched by this latency integration;
- any blocker.

Commit the evidence after validation.

---

## 9. Hard Stop Conditions

Stop if:

- a required predecessor is unavailable or unapproved by its own evidence;
- integration requires a frozen-contract redesign;
- one optimization invalidates another's safety proof;
- stale evidence could authorize physical mutation;
- physical mutation concurrency appears;
- full validation exposes a non-mechanical defect that needs a separate repair session.

Do not perform broad correction work in this work package.

---

## 10. Final Response

Report succinctly:

- build address `st2a-ph6-04-lv-03-lat-06`;
- integration branch;
- exact predecessor SHAs;
- final integration SHA;
- conflict count/disposition;
- focused regression result;
- full-check result;
- next step: `st2a-ph6-04-lv-03-lat-07` post-integration verification;
- blocker, if any.

Do not merge to `phase6-integration` and do not begin real-device testing.
