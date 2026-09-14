# Phase 6 Latency Optimization — LAT-06 Controlled Integration

## 0. Agent Identity and Assignment

You are:

`agt-ca-p6-lat06-integration-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-06`

Task classification:

`CONTROLLED INTEGRATION`

Assignment:

> Integrate the completed, independently validated Phase 6 latency-optimization branches into one coherent candidate without adding new optimization design. Resolve only genuine mechanical/semantic integration conflicts, preserve all safety invariants, run focused cross-workstream regression plus the full repository gate, and produce exact integration evidence.

This session begins only after LAT-01, LAT-03, LAT-04, and LAT-05 are complete. LAT-03 already contains LAT-02 as its predecessor.

---

## 1. Frozen Common Ancestor

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required integration branch:

`phase6-latency-opt-06-integration`

Required predecessor branches/evidence:

- `phase6-latency-opt-01-measurement-foundation` → `dev/evidence/_ca-output-agt-p6-latency-opt-01.md`
- `phase6-latency-opt-03-run-scoped-local-evidence` → `dev/evidence/_ca-output-agt-p6-latency-opt-03.md`
- `phase6-latency-opt-04-precondition-dedup` → `dev/evidence/_ca-output-agt-p6-latency-opt-04.md`
- `phase6-latency-opt-05-remote-planning-fast-path` → `dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

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

For LAT-03, additionally verify its evidence identifies a LAT-02 predecessor and that its history contains the LAT-02 branch work. Do not separately merge LAT-02 if it is already an ancestor of LAT-03.

If any required branch/evidence is missing, does not descend from the common base, or reports an unresolved safety blocker, stop. Do not improvise replacement inputs.

---

## 3. Create Integration Branch

Create `phase6-latency-opt-06-integration` directly from `COMMON_BASE_SHA`.

Integrate the validated predecessor tips in this deterministic order:

1. LAT-01
2. LAT-03 (thereby including LAT-02)
3. LAT-04
4. LAT-05

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
- LAT-03 local evidence reuse must not accidentally become broader because of LAT-02 concurrency;
- cached/reused local evidence must never become mutation authority;
- LAT-04 validation dedup must still have one exact fail-closed final authorization boundary;
- LAT-05 remote read concurrency/reuse must remain per-assembly and read-only;
- no combined optimization may cache evidence across synchronization runs;
- no combined optimization may reorder durable intent/effect/state commit semantics;
- diagnostic instrumentation must remain observational only.

Explicitly inspect for accidental concurrency between physical mutations. There must be none.

---

## 6. Required Focused Regression Matrix

Compile tests:

`npx tsc -p tsconfig.test.json`

Run the LAT-01 through LAT-05 focused tests introduced by the predecessor branches, plus directly affected existing tests covering:

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

- local independent observations overlap but never exceed the LAT-02 bound;
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

`dev/evidence/_ca-output-agt-p6-latency-opt-06.md`

Record:

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

Do not perform broad correction work in LAT-06.

---

## 10. Final Response

Report succinctly:

- integration branch;
- exact predecessor SHAs;
- final integration SHA;
- conflict count/disposition;
- focused regression result;
- full-check result;
- next step: LAT-07 post-integration verification;
- blocker, if any.

Do not merge to `phase6-integration` and do not begin real-device testing.
