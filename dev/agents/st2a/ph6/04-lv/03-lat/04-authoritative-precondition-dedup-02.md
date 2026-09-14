# Phase 6 Latency Optimization — LAT-04 Authoritative Precondition Deduplication Reject/Fix 02

## REJECTION

The current LAT-04 branch is rejected for final acceptance. The core optimization may be retained, but the work package is not complete because the full repository gate is red and closure artifacts remain unfinished.

Continue the same work package for:

`agt-ca-p6-lat04-authoritative-precondition-dedup-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-04`

Task classification:

`REJECT / FIX — SAFETY-SENSITIVE OPTIMIZATION`

This prompt is a bounded correction of `04-authoritative-precondition-dedup.md`. Do not restart the optimization from scratch unless a confirmed safety defect forces abandonment of the retained implementation.

---

## 1. Exact Repair Input / Drift Gate

Continue on:

`phase6-latency-opt-04-precondition-dedup`

Use exactly:

`R1_INPUT_SHA = 22c7df6f1c879ff790eb546b319c5bfd232335da`

Original common base:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Before editing:

1. Fetch the branch.
2. Verify `git rev-parse HEAD` is exactly `R1_INPUT_SHA`.
3. Verify the merge base with `COMMON_BASE_SHA` is exactly the common base.
4. Record `git status --short`.
5. Inspect the current base-to-head diff before changing it.

The current branch diff is expected to include:

- `.github/workflows/lat04-branch-validation.yml`;
- `src/core/execution-coordinator.ts`;
- `src/product/authoritative-production-executor.ts`;
- `src/product/authoritative-production-executor-base.ts`;
- `src/product/operation-isolation.ts`;
- `test/workstreams/orchestration/lat04-authoritative-precondition-dedup.test.ts`.

If the branch has drifted, stop and report the actual SHA and diff. Do not substitute a branch tip from another work package, rebase, or merge `phase6-integration`.

---

## 2. REPAIR TOPOLOGY

### G1 — Preserve single-pass authority while restoring exact diagnostic-stage semantics

- **Execution class:** SERIAL-SHARED-OWNER
- **Owns:** the existing LAT-04 authority-complete coordinator/executor composition, the narrow private diagnostic-stage handoff needed by that composition, LAT-04 tests, and final LAT-04 evidence.
- **Depends on:** no other latency package.
- **May run with:** no other agent modifying the same execution/authority composition.

This is one bounded repair group. Do not split diagnostic repair from authority composition because both concern the exact validation-to-dispatch ownership boundary.

---

## 3. CONFIRMED VALIDATION FACTS — DO NOT REDIAGNOSE BROADLY

GitHub Actions run:

`34848613689`

Job:

`103990574636`

Run head:

`75bf0d56298ce3f9f98c1e9a919522523eff7417`

Actual observed results:

- dependency install: PASS;
- production typecheck: PASS;
- test compile: PASS;
- focused LAT-04 / authority-safety suite: PASS, 96/96;
- full repository check: FAIL;
- diff-whitespace check: skipped after the full-check failure.

The run therefore does **not** establish LAT-04 acceptance.

The full repository failure is concrete and already localized:

`test/phase6-alpha-ios-sync-diagnostics.test.ts`

Subtest:

`precondition throw is Error-level at its exact execution substage and closes the run`

Observed assertion:

`undefined !== 1`

The test searches for an Error-level diagnostic at execution stage:

`operation-precondition-validation`

and does not find it.

The retained LAT-04 coordinator currently detects the private marker `validatesAtExecuteBoundary === true` and skips its own full call to `validatePreconditions()`. That is the intended deduplication. However, a validation exception now occurs inside the executor-owned `execute()` boundary and reaches the coordinator's generic execute catch, so the previous exact precondition-stage lifecycle evidence is lost or misclassified as later content-mutation execution.

This is the confirmed approval blocker. Do not weaken or rewrite the existing diagnostic test to accept the wrong stage.

---

## 4. FROZEN BOUNDARIES

The original LAT-04 safety contract remains frozen:

- production physical operations must use **one**, not two, full authority-complete validation passes;
- the surviving full validation remains fail-closed and as close as practicable to physical dispatch;
- LOCAL token changes, REMOTE revision/object identity changes, BASE/semantic-generation changes, and stale destructive authority must prevent mutation;
- any narrow post-authorization guard must remain narrower than a second full validation pipeline;
- durable intent persistence, dispatch authorization, physical-result classification, verification, canonical commit, and finalization ordering must not be weakened;
- clean-merge handling must not invalidate the REMOTE half merely because the preceding authorized LOCAL half changed LOCAL state;
- generic `AuthorityCompleteExecutionCoordinator` behavior for executors that do **not** own execute-boundary validation remains intact;
- do not change frozen public contracts merely to repair diagnostics;
- no cross-run authority cache;
- no physical-operation parallelism;
- no retry/backoff, conflict, lifecycle/background, Drive-planning, or local-enumeration redesign;
- do not remove or change the prepared-authorization diagnostic helper, prepared-launch diagnostic behavior, external-browser diagnostic, delayed-browser diagnostic, or their UI controls/state independence.

Preserve the working 96/96 focused authority/safety behavior unless a minimal correction is directly necessary to restore the frozen diagnostic contract.

---

## 5. GROUP WORK ORDER

### G1 — Exact precondition-stage diagnostic restoration and closure

#### Scope

Modify only the current LAT-04 execution-authority composition, directly necessary private diagnostic-stage plumbing, directly affected tests, temporary validation workflow cleanup, and LAT-04 evidence.

Do not broaden the work into a new execution architecture.

#### Corrections

**C1 — Restore precondition-validation exception provenance without restoring duplicate validation**

- **Primary files:** `src/core/execution-coordinator.ts`, `src/product/authoritative-production-executor.ts`, `src/product/authoritative-production-executor-base.ts`, and only directly necessary private supporting code already touched by LAT-04.
- **Defect:** when the production executor owns the single full validation at its `execute()` boundary, an exception thrown during that validation is no longer surfaced through the execution lifecycle at the exact `operation-precondition-validation` stage.
- **Violated contract:** the original LAT-04 prompt explicitly requires preserved/normalized diagnostic lifecycle meaning while eliminating duplicate validation. Existing Phase 6 diagnostics require a precondition failure/throw to remain attributable to the precondition-validation substage.
- **Required change:** retain exactly one full validation pass and add the smallest private/internal mechanism necessary for the coordinator/diagnostic lifecycle to distinguish a throw from that executor-owned validation boundary from later pending-journal/content-mutation/commit failures.
- **Constraint:** do not solve this by calling the full validation pipeline a second time. Do not classify every executor throw as a precondition failure. Later-stage exceptions must retain their existing exact stage.
- **Preferred shape:** private capability/state/error provenance analogous in spirit to the existing internal persistence-failure-stage handoff is acceptable. Keep it internal to production composition; do not alter the frozen public `AuthoritativeSynchronizationExecutor` contract.
- **Acceptance:** the existing `precondition throw is Error-level at its exact execution substage and closes the run` test passes unchanged in meaning; pending/mutation/uncertain-journal/commit throw tests continue to report their existing exact stages; the LAT-04 deterministic count still proves one full validation pass.

**C2 — Reconfirm stale-authority and durable-effect safety after C1**

- **Files:** `test/workstreams/orchestration/lat04-authoritative-precondition-dedup.test.ts` plus existing focused authority/destructive-safety tests.
- **Required change:** add a new test only if C1 introduces a new private provenance path not already covered. Do not replace existing safety assertions.
- **Acceptance:** unchanged valid execution succeeds; LOCAL-token, REMOTE-revision, REMOTE-object-identity, semantic-generation, destructive-authority, and validation-to-dispatch race cases still prevent stale physical mutation; guard rejection remains represented as non-applied/verified-not-applied where the retained lifecycle requires it.

**C3 — Remove temporary validation workflow from final branch diff**

Delete:

`.github/workflows/lat04-branch-validation.yml`

Only delete it after the final validation mechanism is no longer needed. It must not remain in the final LAT-04 base-to-head diff.

**C4 — Complete LAT-04 evidence**

Create:

`dev/evidence/_ca-output-agt-p6-latency-opt-04.md`

Record:

- `COMMON_BASE_SHA`;
- `R1_INPUT_SHA`;
- branch and exact final SHA;
- complete final changed-file manifest;
- before/after full-validation count, expected `2 -> 1` for the normal production path;
- where the single surviving full validation occurs;
- exact narrow dispatch guard(s) that remain;
- the diagnostic-stage defect and its bounded correction;
- results for stale LOCAL/REMOTE/semantic-generation races and destructive-safety tests;
- full durable-effect lifecycle confirmation;
- focused and full validation commands/results;
- confirmation that no public contract or safety test was weakened;
- confirmation that the temporary workflow was removed.

Commit implementation/test/evidence cleanup before reporting final SHA.

---

## 6. VERIFICATION

Run on the actual final branch state after removing the temporary workflow:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run the focused LAT-04 suite and the directly relevant existing authority/destructive-safety tests.

Also run the directly affected Phase 6 diagnostic test containing the precondition/pending/mutation/uncertain-journal/commit stage assertions.

Then run:

`npm run check`

Finally run:

`git diff --check COMMON_BASE_SHA..HEAD`

Do not infer a pass from the earlier 96/96 focused result. The final SHA itself must be green.

Do not weaken tests or skip the full repository gate.

---

## 7. COMPLETION RESPONSE

Return only after final closure:

- branch;
- exact final SHA;
- complete final changed-file manifest;
- before/after full-validation count;
- exact surviving validation/dispatch authority boundary;
- diagnostic-stage repair summary;
- focused authority/destructive/diagnostic test results;
- `npm run check` result;
- `git diff --check` result;
- evidence-file path;
- confirmation temporary workflow is absent;
- blocker, if any.

If practical turn capacity ends before all of this is complete, preserve a resumable checkpoint and report exactly:

`CONTINUATION REQUIRED — WORKSTREAM NOT COMPLETE`

Include current SHA, completed corrections, remaining corrections, current failing checks, and the exact next executable action. Do not claim LAT-04 complete while any branch-introduced full-check failure remains.

---

## FINAL STOP

Stop after LAT-04 is corrected, fully green, evidenced, and committed.

Do not create a PR, merge to integration, begin LAT-05/LAT-06, perform release work, mutate live Drive state, or perform real-device validation.