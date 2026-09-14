# st2a-ph6-04-lv-03-lat-07 — Post-Integration Safety and Performance Verification

Build address: `st2a-ph6-04-lv-03-lat-07`

## 0. Agent Identity and Assignment

You are:

`agt-ca-st2a-ph6-04-lv-03-lat-07-post-integration-verification-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`st2a-ph6-04-lv-03-lat-07`

Task classification:

`INDEPENDENT VERIFICATION / BOUNDED CORRECTION`

Assignment:

> Independently verify the integrated latency-optimization candidate in a clean environment, measure the structural performance improvements established by `st2a-ph6-04-lv-03-lat-01`, adversarially verify that safety invariants were not weakened, and make only narrowly bounded corrections if verification exposes a genuine optimization-induced defect. Produce the final optimization evidence and a real-device revalidation checklist; do not perform live Drive or device validation in this session.

---

## 1. Self-Resolving Integration Gate

Frozen common ancestor:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Required predecessor build address:

`st2a-ph6-04-lv-03-lat-06`

Required predecessor branch:

`st2a-ph6-04-lv-03-lat-06-integration`

Required predecessor evidence:

`dev/evidence/_ca-output-agt-st2a-ph6-04-lv-03-lat-06.md`

Required branch:

`st2a-ph6-04-lv-03-lat-07-verification`

Do not ask the operator for a SHA.

At execution time:

1. Fetch `origin/st2a-ph6-04-lv-03-lat-06-integration`.
2. Resolve its exact tip as `INTEGRATION_HEAD`.
3. Verify `COMMON_BASE_SHA` is an ancestor of `INTEGRATION_HEAD`.
4. Verify the 06 evidence file exists at `INTEGRATION_HEAD`.
5. Read that evidence and confirm integration/focused/full checks completed without a hard safety blocker.
6. Create `st2a-ph6-04-lv-03-lat-07-verification` directly from `INTEGRATION_HEAD`.

If any gate fails, stop. Do not substitute another ref.

---

## 2. Clean-Environment Requirement

Verification must not rely on build artifacts left by predecessor sessions.

From the 07 branch:

- remove generated test/build artifacts that are normally regenerated and are not source-controlled;
- run `npm ci` from the checked-in lockfile;
- regenerate test/build outputs through repository commands;
- do not reuse predecessor `node_modules` or `.test-build` as evidence of success if the execution environment permits clean regeneration.

Record the exact Node/npm versions available in evidence.

---

## 3. Required Source Review

Before running or correcting anything, inspect the integrated diff from `COMMON_BASE_SHA` to `INTEGRATION_HEAD` and read the evidence files for `st2a-ph6-04-lv-03-lat-01` through `st2a-ph6-04-lv-03-lat-06`.

The predecessor prompts 01–05 predate the repository-wide coded naming conversion, so their evidence filenames remain exactly:

- `dev/evidence/_ca-output-agt-p6-latency-opt-01.md`
- `dev/evidence/_ca-output-agt-p6-latency-opt-02.md`
- `dev/evidence/_ca-output-agt-p6-latency-opt-03.md`
- `dev/evidence/_ca-output-agt-p6-latency-opt-04.md`
- `dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

The 06 evidence filename is canonical:

- `dev/evidence/_ca-output-agt-st2a-ph6-04-lv-03-lat-06.md`

Review the combined implementation around:

- `src/local/obsidian-local-vault.ts`;
- local read/stale-token paths touched by 03;
- `src/core/execution-coordinator.ts` and authoritative executor composition;
- `src/product/snapshot-assembler.ts`;
- `src/drive/google-drive-port.ts`;
- any new latency test helpers/diagnostics.

Do not assume predecessor evidence is correct merely because it exists. This is an independent verification pass.

---

## 4. Safety Invariants to Adversarially Verify

The optimized candidate must still prove:

- uncertainty is never converted into absence;
- local path safety/exclusions/configuration classification are unchanged;
- file stability is still established before evidence is treated as stable;
- stale observation tokens and local generation changes invalidate old evidence;
- local reusable evidence never persists across run/runtime boundaries;
- no cached evidence by itself authorizes physical mutation;
- remote duplicate/path/domain ambiguity remains fail-closed;
- remote pagination/change-cursor authority remains exact;
- one final authoritative validation/dispatch boundary rejects stale LOCAL/REMOTE/BASE/identity/semantic authority;
- durable intent → dispatch authorization → physical result → verification → canonical commit/finalization ordering remains intact;
- SHA-256/integrity verification required by local transactions remains intact;
- destructive-operation and recovery gates remain intact;
- no physical local or remote mutation concurrency was introduced.

Also verify that OAuth/PKCE/mobile two-tap authorization and all diagnostic authorization/browser buttons/functions remain present and unchanged in behavior.

The known mobile app-switch/lifecycle cancellation behavior is a separate Phase 6 defect. Do not repair it here and do not use app-switch-contaminated wall-clock behavior as an optimization result.

---

## 5. Structural Performance Verification

Use deterministic counters/barriers/test doubles rather than flaky absolute-time CI assertions.

Verify and record, for representative tiny-vault fixtures:

1. **Local enumeration**
   - independent read-only observations overlap when at least two eligible paths exist;
   - maximum in-flight work never exceeds the 02 bound;
   - each file still receives the required stability proof;
   - deterministic results are independent of completion order.

2. **Local evidence reuse**
   - unchanged same-run/same-token read-only work performs fewer redundant full stability/observation cycles than the unoptimized pattern characterized by 01;
   - invalidation events restore conservative live checking;
   - mutation/final-verification checkpoints remain live.

3. **Authoritative execution**
   - one unchanged operation does not run the same full authority-validation pipeline twice;
   - stale authority injected at the closest validation-to-dispatch boundary blocks physical mutation.

4. **Remote planning**
   - approved independent read-only domain operations overlap and/or approved duplicate same-assembly metadata requests are eliminated;
   - output remains deterministic;
   - trusted-cursor incremental planning avoids full reconciliation listing;
   - no-cursor/invalid-cursor planning remains full/fail-closed.

5. **End-to-end structural budget**
   - compare the integrated deterministic operation/request counts with the 01 baseline characterization and record the reduction by category.

Absolute elapsed time may be reported as informational data only. Do not fail CI because a machine was temporarily slow.

---

## 6. Required Regression Suite

Run:

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run all new `phase6-latency-*` focused tests plus relevant existing suites covering:

- local vault/mobile/content-reader safety;
- local transaction safety/recovery;
- authoritative boundary/commit lifecycle/production authority;
- Drive domain and Changes behavior;
- HTTP/Drive semantic diagnostics;
- destructive safety;
- adversarial model coverage.

Then run:

`npm test`

`npm run build`

Finally run the canonical aggregate gate:

`npm run check`

Record exact pass counts/output summaries available from the commands.

---

## 7. Bounded Correction Authority

You may modify code only if this verification exposes a **clear defect introduced by `st2a-ph6-04-lv-03-lat-01` through `st2a-ph6-04-lv-03-lat-06`** and the correction is small enough to complete and verify in this same session.

Allowed examples:

- concurrency limiter off-by-one;
- nondeterministic merge ordering;
- missing cache invalidation for one already-owned event;
- duplicate-validation path accidentally retained for one operation kind;
- remote read-only parallel branch combining partial results incorrectly;
- test/diagnostic instrumentation defect.

For any correction:

- write a failing regression test first where practical;
- make the minimum code change;
- rerun the affected focused matrix and full `npm run check`;
- document the correction separately in evidence.

Do **not** use this work package to redesign architecture, weaken safety, fix unrelated legacy defects, or implement the separate mobile background/lifecycle repair. If the defect is broader than a bounded correction, stop and report it.

---

## 8. Real-Device Revalidation Checklist

In the evidence file, include a short supervisor-ready checklist for the later physical validation release. It must cover at least:

- tiny-vault manual preview latency while app remains foregrounded;
- warm incremental preview after a trusted cursor exists;
- one tiny upload and one tiny download;
- verification that expected files become visible in Obsidian after durable completion;
- capture of diagnostic bundle after the run;
- comparison of planning/execution stage durations to the pre-optimization observations;
- explicit separation of latency observations from the known app-switch cancellation defect.

Targets for later physical evaluation, **not automated pass/fail guarantees**:

- reduce the previously observed roughly five-second tiny-vault planning path materially, with approximately 2–3 seconds as the first practical target;
- evaluate sub-two-second warm incremental behavior as an aspirational target where network conditions permit.

Do not claim these targets are achieved until real-device testing occurs.

---

## 9. Evidence Contract

Create:

`dev/evidence/_ca-output-agt-st2a-ph6-04-lv-03-lat-07.md`

Include:

- canonical build address `st2a-ph6-04-lv-03-lat-07`;
- resolved `INTEGRATION_HEAD` and ancestry proof;
- branch and final SHA;
- environment versions;
- integrated diff review summary;
- structural before/after counts by latency category;
- concurrency-bound proof;
- stale-evidence/authority adversarial results;
- full focused/test/build/check results;
- any bounded correction with failing-before/passing-after evidence;
- explicit statement that physical mutation concurrency, durable safety, OAuth diagnostics, and mobile lifecycle behavior were not altered by this work package;
- real-device revalidation checklist;
- final disposition: `PASS`, `PASS WITH BOUNDED CORRECTION`, or `BLOCKED`.

Commit any correction, tests, and the final evidence file.

---

## 10. Final Acceptance

A `PASS` or `PASS WITH BOUNDED CORRECTION` requires:

- all structural optimization proofs pass;
- no safety invariant is weakened;
- no physical mutation concurrency exists;
- full repository tests/build/check pass, except a genuinely external environment failure that is independently demonstrated and clearly prevents a definitive PASS;
- evidence is complete and reproducible.

---

## 11. Stop / Final Response

Stop after 07 verification/evidence is committed.

Report succinctly:

- build address `st2a-ph6-04-lv-03-lat-07`;
- resolved 06 integration SHA;
- branch;
- final SHA;
- disposition;
- structural performance improvement summary;
- focused/full gate status;
- bounded corrections, if any;
- next step: supervisor review before promotion/release and real-device revalidation.

Do not merge to `phase6-integration`, publish a release, or perform live Drive/device testing.
