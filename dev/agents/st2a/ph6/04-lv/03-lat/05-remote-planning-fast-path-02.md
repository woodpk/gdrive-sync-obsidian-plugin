# Phase 6 Latency Optimization — LAT-05 Remote Planning Fast Path Reject/Fix 02

## REJECTION

The current LAT-05 implementation is rejected for acceptance in its present form.

Continue the same work package for:

`agt-ca-p6-lat05-remote-planning-fast-path-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Work package:

`LAT-05`

Task classification:

`REJECT / FIX — BOUNDED REMOTE-PLANNING OPTIMIZATION`

The intended read-only optimization remains approved in principle. The current implementation is not approved because the automated test gate is red and the production refactor is materially broader than the smallest-safe change required by the original prompt.

---

## 1. Exact Repair Input / Drift Gate

Continue on:

`phase6-latency-opt-05-remote-planning-fast-path`

Use exactly:

`R1_INPUT_SHA = 67a98b7a5d902af2c06756b96beb3ce52e2e03cc`

Original common base:

`COMMON_BASE_SHA = 02bc3ba9ded805374303f3b18b0bfc6c7d3ca7c7`

Before editing:

1. Fetch the branch.
2. Verify `git rev-parse HEAD` is exactly `R1_INPUT_SHA`.
3. Verify the merge base with `COMMON_BASE_SHA` is exactly `COMMON_BASE_SHA`.
4. Record `git status --short`.
5. Inspect the exact common-base-to-head diff.

The rejected diff is expected to contain:

- modified `src/drive/google-drive-port.ts`;
- new `src/drive/google-drive-port-core.ts`;
- new `test/phase6-lat05-remote-planning-fast-path.test.ts`.

At rejection, the split introduced approximately 499 lines in the new core file and a roughly 632-line churn in `google-drive-port.ts`. That change surface is not justified by LAT-05's bounded read-only optimization objective.

If the branch has drifted from `R1_INPUT_SHA`, stop and report the actual state. Do not substitute another branch, merge integration, or rebase.

---

## 2. REPAIR TOPOLOGY

### G1 — Smallest-safe remote planning fast path

- **Execution class:** SERIAL-SHARED-OWNER
- **Owns:** the LAT-05 read-only reconciliation/planning implementation inside the existing Google Drive port, its focused deterministic tests, and LAT-05 evidence.
- **Depends on:** no other latency package.
- **Does not own:** mutation transport, authoritative execution, local enumeration, durable state schemas, lifecycle/background behavior, OAuth, or diagnostic authorization/browser UI.

One agent owns the complete repair because domain discovery, domain traversal, deterministic merge, and same-assembly metadata reuse share one remote-planning authority surface.

---

## 3. CONFIRMED REJECTION FACTS — DO NOT REOPEN THE OBJECTIVE

GitHub Actions run:

`34847584177`

Job:

`103987193921`

Head:

`67a98b7a5d902af2c06756b96beb3ce52e2e03cc`

Observed gate state:

- dependency installation: PASS;
- production typecheck: PASS;
- automated test stage: FAIL;
- production build: skipped after test failure.

The exact failing runtime assertion was not available in the prior handoff. Because the production structure is independently rejected as over-broad, do not spend the repair session preserving that split merely to diagnose its failing test. First reduce the production change to the bounded architecture required below; then run the focused/full tests on the corrected design. If a failure remains, diagnose that concrete corrected-branch failure.

The following intended optimizations remain the target:

1. content-root and portable-config-root discovery may overlap **after** managed-root authority is validated;
2. the two disjoint reconciliation-domain traversals may overlap once their roots are validated;
3. results must be collected independently and merged deterministically in the existing content-then-config semantic order;
4. exact metadata already obtained within the same reconciliation assembly may be reused privately instead of issuing the same read twice;
5. no evidence may be cached across independent planning assemblies/runs;
6. the trusted Changes cursor fast path and conservative fallback semantics remain unchanged.

---

## 4. FROZEN BOUNDARIES

Preserve every original LAT-05 safety invariant:

- exact managed-root validation occurs before dependent domain work;
- content and portable-config roots remain unique, correctly marked, non-trashed, and children of the exact managed root;
- missing, duplicate, unmarked, ambiguous, colliding, or provenance-invalid roots remain fail-closed;
- content/config domain provenance remains validated independently;
- duplicate logical path or remote identity remains fail-closed;
- pagination is exhausted before a traversal is complete;
- transient/partial listing stays partial and cannot be represented as complete;
- valid trusted cursor uses reliable Changes semantics only under existing authority;
- missing/invalid/conflicting cursor falls back to conservative full reconciliation;
- no cursor synthesis or early cursor advancement;
- no Drive mutation endpoint may be introduced into planning;
- no cache survives one reconciliation/planning assembly;
- deterministic exposed ordering must not depend on promise completion order;
- do not change transport retry/backoff semantics;
- do not change exact-ID/topology validation used by mutation paths;
- do not change local observation/stability behavior;
- do not change LAT-04 authoritative execution validation;
- do not change state schemas/CAS semantics;
- do not change mobile lifecycle/background behavior;
- do not modify OAuth/PKCE/two-tap authorization;
- do not remove, rename, merge, or repurpose the prepared-authorization diagnostic helper, prepared-launch diagnostic, external-browser test, delayed external-browser test, or their controls/state independence.

---

## 5. GROUP WORK ORDER

### G1 — Collapse broad refactor and implement bounded read-only concurrency

#### Scope

Final production ownership should be limited to the existing Drive planning port unless a directly necessary existing helper already owned by that port requires a tiny consequential edit.

Expected final production file:

`src/drive/google-drive-port.ts`

Expected focused test:

`test/phase6-lat05-remote-planning-fast-path.test.ts`

Required evidence:

`dev/evidence/_ca-output-agt-p6-latency-opt-05.md`

#### Corrections

**C1 — Remove the rejected production-file split**

- **Files:** `src/drive/google-drive-port-core.ts`, `src/drive/google-drive-port.ts`.
- **Defect:** LAT-05 extracted a large new `google-drive-port-core.ts` and moved substantial existing implementation solely to support a narrow read-only optimization, materially increasing review and integration surface.
- **Required change:** delete `src/drive/google-drive-port-core.ts` from the final branch and restore the pre-existing `google-drive-port.ts` ownership/layout as the architectural baseline. Reapply only the localized LAT-05 changes required for independent read-only overlap, deterministic result merge, and private same-assembly evidence reuse.
- **Implementation guidance:** use `COMMON_BASE_SHA:src/drive/google-drive-port.ts` as the structural reference. Preserve unrelated base behavior byte-for-byte where practical. Do not recreate the same split under a different filename.
- **Acceptance:** final base-to-head production diff is a localized change to `src/drive/google-drive-port.ts`, not a wholesale extraction/refactor.

**C2 — Parallelize independent domain-root discovery only after managed-root validation**

- **Location:** the existing full-reconciliation/root-discovery path in `src/drive/google-drive-port.ts`.
- **Required change:** after the managed root has been authoritatively read and validated, start content-root and portable-config-root discovery concurrently when they have no data dependency on each other.
- **Constraint:** managed-root validation itself stays serialized before both child-domain lookups. Each result must undergo the same uniqueness/marker/parent/provenance checks as the base implementation.
- **Acceptance:** deterministic barrier-based test proves both child-root lookups can be in flight concurrently, but neither starts before managed-root authority exists.

**C3 — Parallelize the two disjoint domain traversals with deterministic merge**

- **Location:** the existing `listForReconciliation()` full-listing assembly.
- **Required change:** once both validated domain roots exist, permit content-domain and portable-config-domain traversal to overlap. Each traversal must build its own result; combine only after both settle successfully/partially according to existing semantics.
- **Deterministic merge:** preserve existing semantic ordering, with content-domain result incorporated before portable-config result regardless of completion order.
- **Constraints:** do not concurrently mutate one shared entries array/cache in completion order; do not erase partial/incomplete provenance when one traversal fails or is transient; do not weaken duplicate/collision checks after merge.
- **Acceptance:** reverse-completion tests produce the same logical result/order and partial/failure cases remain fail-closed.

**C4 — Keep metadata reuse private to one reconciliation assembly**

- **Location:** exact repeated parent/domain metadata reads in the same full-reconciliation call.
- **Required change:** where an exact metadata value has already been obtained and remains the direct evidence for a later step in the same call, pass/reuse that value privately instead of issuing the same request again.
- **Constraints:** no module-level cache, no TTL, no persistence, no reuse across a second `listForReconciliation()` call or synchronization run, and no reuse after an authority boundary where fresh evidence is required.
- **Acceptance:** focused test proves reduced duplicate request count in one assembly and proves a second independent assembly performs its own reads.

**C5 — Protect the existing incremental Changes fast path**

- **Files:** focused LAT-05 test and only production code if correction of a branch-introduced regression is required.
- **Required behavior:** trusted valid cursor remains incremental and avoids full reconciliation unless existing reliable-Changes semantics explicitly require fallback. Missing/invalid/conflicting cursor still takes the conservative full path.
- **Acceptance:** deterministic tests prove both routes and prove no planning mutation endpoint is called.

**C6 — Complete evidence after green validation**

Create `dev/evidence/_ca-output-agt-p6-latency-opt-05.md` containing:

- `COMMON_BASE_SHA` and `R1_INPUT_SHA`;
- branch and exact final SHA;
- complete created/modified/deleted file manifest;
- explicit deletion of the rejected `google-drive-port-core.ts` split;
- before/after structural request/concurrency counts;
- exact independent stages that overlap;
- deterministic merge rule;
- proof of pagination/partial/ambiguity/provenance/duplicate safety;
- proof same-assembly reuse does not cross runs;
- proof trusted cursor remains incremental and unsafe cursor state falls back full;
- focused validation and full `npm run check` results;
- production build result if separately required;
- any optimization intentionally omitted because it would weaken remote authority.

Commit the corrected implementation, tests, and evidence before reporting final SHA.

---

## 6. VERIFICATION

Run on the corrected final branch state:

`npm ci`

`npm run typecheck`

`npx tsc -p tsconfig.test.json`

Run the focused LAT-05 test plus directly affected existing suites covering:

- Phase 3 Drive domain/listing behavior;
- Phase 3 Changes behavior;
- Phase 5 Drive-domain/scope transfer;
- reliable Changes / remote-feed authority;
- Google HTTP transport tracing;
- Drive semantic-operation tracing.

Then run:

`npm run check`

Run the standard production build if it is not already included in `npm run check`.

Finally:

`git diff --check COMMON_BASE_SHA..HEAD`

No existing ambiguity/provenance/pagination/change-feed test may be weakened to obtain green results.

If a corrected-branch test still fails, fix only the concrete LAT-05 defect within this ownership. Do not respond by reintroducing the broad core-file split.

---

## 7. COMPLETION RESPONSE

Return only after LAT-05 is genuinely closed:

- branch;
- exact final SHA;
- complete final changed-file manifest;
- confirmation `src/drive/google-drive-port-core.ts` is absent from the final diff;
- structural request/concurrency improvement;
- deterministic merge behavior;
- same-assembly cache/reuse scope;
- focused-test result;
- full `npm run check` result;
- production-build result if separate;
- `git diff --check` result;
- evidence-file path;
- blocker, if any.

If turn capacity expires before all assigned work is complete, preserve a resumable checkpoint and report:

`CONTINUATION REQUIRED — WORKSTREAM NOT COMPLETE`

Include exact current SHA, completed corrections, remaining corrections, current validation/failures, and the exact next executable action. Do not claim acceptance with a red test gate or missing evidence.

---

## FINAL STOP

Stop after LAT-05 is minimized, fully validated, evidenced, and committed.

Do not begin LAT-06 integration, merge shared branches, modify another latency package, perform live Drive mutation, release a build, or perform real-device validation.