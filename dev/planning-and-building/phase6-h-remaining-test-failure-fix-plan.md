# Phase 6 H — Remaining Test-Failure Repair and Closure Plan

## 1. Status and purpose

**Status:** current supervisor execution plan for the remainder of Phase 6 H synchronization integration after H-U5-P7 receives independent supervisor approval.

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

Planning snapshot inspected before this document was written:

`8f75956eaa0161b5d4744ba0a303f5555408d613`

This is a **fixed decomposition / sequencing plan**, not a future coding-agent task prompt. Detailed task prompts for each session must still be generated against the exact approved repository SHA that exists when that session begins, as required by the governing construction manual and Stage 1 decomposition.

This document locks the number, order, causal scope, and stop boundary of the remaining H/G repair and H closure sessions so the finish line is no longer open-ended.

### P7 review boundary

The branch snapshot above already contains an H-U5-P7 evidence commit. This planning document does **not** review, accept, or approve that P7 result.

The sequence below activates only after independent supervisor review approves P7. If P7 is rejected, correction remains inside the P7 repair/re-review lineage; it does not create a new P-number or silently expand the plan below.

---

## 2. Complete planning-directory review performed before writing

Before this plan was written, every line of every file already present in `dev/planning-and-building/` at snapshot `8f75956eaa0161b5d4744ba0a303f5555408d613` was read.

That directory contained 26 pre-existing files covering:

- the governing construction manual;
- target-system specification;
- decision register;
- Stage 1 decomposition and Phase 1 contract handoff;
- historical Stage 2A Phase 1–4 prompts;
- Phase 6 supervisor/foundation/contract/adversarial/workstream planning;
- V1.3 A/B/D provenance-extension prompts;
- H-U5-P2 through H-U5-P7 tasking documents;
- current-but-stale project-state metadata.

The contradictions and supersession boundaries discovered by that complete read are recorded explicitly in Section 3.

---

## 3. Supersession / contradiction resolution

This plan supersedes **only stale or contradictory execution-status, next-action, and post-package sequencing language**. It does not rewrite historical facts and does not supersede product authority, frozen contracts, approved implementation SHAs, accepted evidence, or architectural safety invariants.

### 3.1 Files whose execution/status language is superseded

The following documents contain execution-state language that is now stale relative to the current Phase 6 H repository history:

1. `phase-6-supervisor-handoff.md`
   - says A–G remain paused and the next action is PR #34 v1.1 foundation re-review;
   - that execution status is superseded by the later approved V1.3 foundation/adoption, A/B/D implementation, H integration, H-U4 classification, and H-U5 repair history.

2. `project-state.yaml`
   - labels itself `authoritative_current_progress` as of 2026-08-31;
   - still says the v1.1 authority-store candidate awaits supervisor re-review, parallel implementation is unauthorized, affected workers may not resume, and PR #34 review is the next action;
   - those progress/next-action fields are superseded for the current H execution lineage by this document and later accepted evidence.

3. `phase6-sync-architecture-foundation.md`
   - candidate/re-review/parallel-stop status language is historical and superseded for current execution state;
   - its preserved architecture/invariants remain authoritative where not superseded by the approved V1.3 append-only successor.

4. `phase6-sync-contract-freeze.md`
   - predecessor candidate/approval-state language is historical and superseded for current execution state;
   - its frozen contract history and the V1.3 append-only physical-certainty/provenance semantics remain authoritative and are **not** superseded.

5. `phase6-sync-folder-create-foundation-correction.md`
   - its "candidate / workers not resumed" status is historical and superseded;
   - its accepted folder persistence/recovery semantics remain preserved.

6. `phase6-sync-remote-folder-recovery-observation-correction.md`
   - its "candidate / no worker consumes it" execution status is historical and superseded;
   - its remote-folder restart-observation semantics remain preserved.

7. `phase6-sync-parallel-workstreams.md`
   - its "design only — parallel implementation not authorized" status is historical and superseded;
   - its workstream ownership model remains useful historical authority, especially G's test-only ownership.

8. `phase6-sync-adversarial-validation.md`
   - its statement that the comprehensive G simulator is "not yet implemented" is superseded by the implemented adversarial model and the later H-U4 classification of its current failures;
   - the matrix/invariants remain design authority.

9. Historical Stage 2A Phase 1–4 build prompts
   - their old `master` baselines, branch names, and completion-pending instructions are historical session instructions, not current Phase 6 execution sequencing;
   - their accepted implementation results and the higher-level Stage 1 phase boundaries remain historical authority.

### 3.2 H-U5-P2 through H-U5-P7 sequencing language

Each bounded H-U5 task correctly told its coding agent not to start the next package and left later package selection to the supervisor.

Those task-local stop boundaries remain valid for the sessions in which they were issued.

This document is the later supervisor-level plan that **supersedes the formerly open-ended/undetermined post-package sequencing language** after each package has been independently approved. It does not retroactively broaden P2–P7 scope or modify their evidence.

P7's own `DO NOT START H-U5-P8 OR H-FINAL` stop remains operative until P7 receives independent supervisor approval. After approval, this document defines the authorized next sequence.

### 3.3 Authority explicitly not superseded

This plan does **not** supersede:

- `target-system-specification.md` product requirements;
- locked product decisions in `decision-register.yaml`;
- `stage-1-build-decomposition.md` Phase 6 hardening / Stage 3 readiness boundary;
- frozen `src/contracts/**` authority;
- V1.3 physical-effect certainty versus operational-failure provenance separation;
- `executionDispositionV1_3` as the H/UI interpretation authority;
- approved H-U5 P1–P7 implementation/evidence once independently approved;
- any accepted A–G/H safety invariant;
- the rule that production must fail closed when hardened authority/mutation seams are absent.

### 3.4 Post-iPhone optimization decisions remain outside this plan

Locked performance-optimization decisions `DEC-290` through `DEC-298` remain valid and are **not** superseded.

They are scheduled only after the iPhone integration/setup is working and after the active correctness-remediation sequence is completed/authorized. The `H-FINAL` session in this document is the final H integration-candidate verification/closure session; it is not a declaration that every later physical-device/performance activity required for overall Phase 6 / Stage 3 readiness has been completed.

---

## 4. Fixed remaining session count

After independently approved P7, the remaining plan contains exactly:

- **5 failure-repair sessions**;
- **1 production-structure normalization session**;
- **1 H final verification/closure session**.

**TOTAL: 7 sessions after P7.**

For the H-U5 sequence specifically:

- P8
- P9
- P10

**P10 is the final planned H-U5-P session. There is no planned P11.**

No new P-number or other prerequisite may be inserted silently.

The only events that can alter this fixed count are:

1. an explicit user/supervisor-approved scope amendment; or
2. a genuinely new defect directly exposed by the authorized correction, where proceeding without addressing it would make the candidate objectively incorrect or unsafe.

A changed aggregate test count alone does not create a new session. It must first be causally classified inside the active session or returned for explicit scope amendment.

---

## 5. Accounting baseline after successful P7

The last supervisor-approved pre-P7 whole-suite baseline was:

- total: 687
- pass: 640
- fail: 27
- cancelled: 20
- skipped/todo: 0

P7 is scoped to the three cancelled tests in `test/phase5-group-d-acceptance.test.ts`.

If P7 is independently approved with exactly its tasked effect, the fixed post-P7 accounting baseline for the remaining plan is:

- total: **687**
- pass: **643**
- fail: **27**
- cancelled: **17**
- skipped/todo: **0**

Those 17 cancellations are not 17 separate code defects. They are the downstream cancellation cascade in `test/phase6-alpha-mixed-plan-isolation.test.ts` behind its first failing fake-authority fixture.

Of the 27 failures:

- **14 are remaining non-G classified compatibility/legacy-fixture outcomes**;
- **13 are the already-classified G adversarial-model defects**.

The sessions below account for every one of those outcomes.

---

## 6. Session 1 — H-U5-P8

### Name

`H-U5-P8 — remaining non-fake-authority compatibility repair`

### Exact owned test files

1. `test/phase5-group-d-surface-lifecycle-integration.test.ts`
   - 2 current failures

2. `test/phase6-alpha-plan-errors-stability.test.ts`
   - 2 current failures

3. `test/workstreams/drive/phase6-remote-protocol.test.ts`
   - 1 current failure

### Exact causal work

#### A. Remaining OLF-PHYSICAL fixture modernization

Modernize the two lifecycle/stability test harnesses to the already-approved hardened writable-authority / reliable-mutation construction pattern while preserving their existing behavioral assertions.

Production fail-closed behavior must not be weakened.

#### B. One stale predecessor Drive assertion

The legacy coherent-download revision-change test still inspects the predecessor/private stream-error shape. The V1.3 companion test already establishes the public operational failure provenance for the same post-stream revision-change condition:

- `kind: recovery-required`
- `source: google-drive`
- `detail: remote-changed-during-coherent-download`

Update only the stale legacy test expectation/fixture needed to match the approved V1.3 public behavior. Do not change Drive production semantics merely to preserve the predecessor private error assertion.

### Why these are safe in one session

This package is only five failing outcomes across three narrowly bounded test files. Four are the final small OLF-PHYSICAL compatibility fixtures; the fifth is one mechanically identified stale predecessor assertion. They require no broad production redesign and fit one agent reasoning window without carrying the much larger fake-authority suite.

### Expected aggregate after P8

If only the five intended outcomes change:

- total: 687
- pass: **648**
- fail: **22**
- cancelled: **17**

### Production authority

Production changes are initially prohibited. A genuine production defect exposed by correct fixture modernization is a hard stop for supervisor decision, not self-authorized scope expansion.

---

## 7. Session 2 — H-U5-P9

### Name

`H-U5-P9 — shared OLF-FAKE-AUTH controller-fixture repair`

### Exact owned test files

1. `test/phase5-second-rejection.test.ts`
   - 1 current failure

2. `test/phase6-alpha-full-sync-remediation.test.ts`
   - 3 current failures

3. `test/phase6-alpha-mixed-plan-isolation.test.ts`
   - 1 current failure + 17 downstream cancellations

### Exact causal work

These fixtures inject a fake `executor.execute()` and/or treat the legacy state-store save path as if it were still authoritative physical-effect/journal authority, while omitting the current writable `SynchronizationAuthorityStoreV1_1` / integrated H authority seam.

The hardened controller correctly persists durable authority before invoking those legacy hooks and therefore fails closed when the writable authority seam is absent.

P9 must modernize the fixture construction so the original controller behaviors are exercised through the current authoritative lifecycle:

- provide writable in-memory/integrated authority;
- preserve exact plan/execution semantics;
- preserve fake-executor behavior only behind the current authority lifecycle rather than bypassing it;
- preserve cursor/baseline/attention semantics;
- preserve safe-subset progress and global gates;
- preserve serialization/coalescing and diagnostics assertions;
- preserve all existing test names and assertions unless a purely mechanical current-interface adaptation is required.

### Cancellation accounting

The 17 cancelled mixed-plan tests are one cancellation cascade, not 17 independent repair tasks. Correcting the file's leading fake-authority construction permits the remaining tests to execute normally.

### Why P9 remains separate from P10

`phase6-alpha-mixed-plan-isolation.test.ts` is a large, high-density controller lifecycle/attention/diagnostic suite. Adding the iOS diagnostics family would increase context load and cross-domain reasoning risk without providing a useful shared fixture boundary. P9 therefore remains one bounded controller-fixture session.

### Expected aggregate after P9

If the five failures and 17 cancellations become passes and no other outcomes change:

- total: 687
- pass: **670**
- fail: **17**
- cancelled: **0**

### Production authority

Production changes are initially prohibited. Genuine production defects are escalated rather than hidden by fixture changes.

---

## 8. Session 3 — H-U5-P10

### Name

`H-U5-P10 — iOS synchronization diagnostics fake-authority fixture modernization`

### Exact owned test file

`test/phase6-alpha-ios-sync-diagnostics.test.ts`

### Current outcomes

4 current failures.

### Exact causal work

Modernize the iOS diagnostic test construction from legacy fake-authority/state-journal assumptions to the current authoritative execution seam while preserving the diagnostic contract:

- entry/planning/preview/Execute/execution/terminal lifecycle correlation;
- plan/execution semantics;
- privacy: no vault path/content leakage where prohibited;
- exact Error-level reporting at the pending/uncertain execution substage;
- proper run closure;
- V1.3 failure disposition/provenance semantics rather than reason-string/private-error interpretation.

### Why this remains its own session

This file tests diagnostic lifecycle ordering and privacy semantics in addition to authority construction. It is intentionally separated from P9 so the P9 agent does not have to hold the large mixed-plan attention surface and the iOS diagnostic stage machine simultaneously.

### Expected aggregate after P10

- total: 687
- pass: **674**
- fail: **13**
- cancelled: **0**

At that point all remaining failures must be exactly the 13 classified G-owned adversarial-model failures.

### H-U5 stop

**P10 ends H-U5. No P11 is planned or authorized.**

---

## 9. Session 4 — G-R1

### Name

`G-R1 — adversarial transition / settle / quiescence repair`

### Owned source/test namespace

Only G-owned adversarial model/test surfaces:

- `test/adversarial-model/support/model.ts`
- `test/adversarial-model/adversarial-model.test.ts`

No production source ownership.

### Exact defect family

11 classified `G-W1` failures ending in the model's transition/settle/quiescence handling, including:

- upload crash/restart stage survival;
- download crash/restart stage survival;
- move crash/restart stage survival;
- trash crash/restart stage survival;
- durable intended L1 retention after LOCAL advances to L2;
- repeated move stable identity;
- create-delete acknowledged deletion history;
- unresolved path A not blocking safe path B;
- missed watcher integrity discovery;
- Windows watcher-event loss recovered by authoritative integrity read;
- bounded quiescence after mutation pressure stops.

### Exact repair objective

Correct G's executable transition/recovery/settle model so these modeled cases reach either true convergence or an explicit conflict/recovery state consistent with the frozen production contracts.

Do not weaken `assertQuiescentOrExplicit()` merely to hide unresolved model state. Do not change A–F/H production semantics to satisfy G.

### Expected aggregate after G-R1

- total: 687
- pass: **685**
- fail: **2**
- cancelled: 0

The only remaining failures must then be G-W2 and G-W3.

---

## 10. Session 5 — G-R2/R3 combined

### Name

`G-R2/R3 — adversarial ambiguity + exact folder-journal recovery repair`

### Owned source/test namespace

Same bounded G surfaces as G-R1:

- `test/adversarial-model/support/model.ts`
- `test/adversarial-model/adversarial-model.test.ts`

No production source ownership.

### G-W2 — one failure

`concurrent same-path creates never silently select one remote winner`

Preserve duplicate logical-path ambiguity so no device can mark a multi-candidate path converged without explicit authority.

### G-W3 — one failure

`G-C2 generic recover routes multiple folder journals by exact journal identity`

Ensure generic recovery handles multiple folder-create journals by the exact journal/descriptor identity instead of allowing singleton recovery-result state or cross-journal routing to conflate one folder recovery with another.

### Why G-R2 and G-R3 are intentionally combined

They remain two distinct defect classifications, but both are tiny and live entirely inside the same already-loaded two-file G model/test surface. Combining them removes redundant context loading and verification overhead without adding production ownership or materially increasing reasoning complexity.

This is the one intentional session merge in the remaining plan.

### Why they are not merged with G-R1

G-R1 is the substantive 11-failure transition/quiescence campaign and changes the model's core settle/recovery behavior. Keeping the two small residual defects for a second pass prevents unrelated ambiguity/journal details from competing with that larger reasoning task and allows G-R2/R3 to begin from the independently reviewed G-R1 result.

### Expected aggregate after G-R2/R3

- total: **687**
- pass: **687**
- fail: **0**
- cancelled: **0**
- skipped/todo: 0

This is the required automated-test state before production normalization begins.

---

## 11. Session 6 — H-NORM

### Name

`H-NORM — mandatory production-structure normalization`

This session was already explicitly authorized by the supervisor/user as a pre-H-FINAL requirement.

### Mandatory production audit/disposition

Inspect all `src/**` for temporary phase/workstream/integration nomenclature and at minimum disposition:

- `src/product/phase6-sync-integration.ts`;
- production runtime class `Phase5ProductRuntime` in `src/product/runtime.ts`;
- production lease/holder identifier prefixed `phase5:`;
- any additional production module/exported symbol/runtime identifier/import whose name is a temporary phase/workstream/integration artifact rather than an enduring domain responsibility.

### Rules

1. Preserve capability; normalize structure/nomenclature.
2. Prefer enduring domain-responsibility names.
3. No semantic redesign.
4. No frozen-contract changes.
5. Do not rewrite historical evidence.
6. Update live production imports/references consistently.
7. Do not rename historical tests/evidence merely for cosmetics.
8. Classify every remaining phase/workstream/integration name under `src/**` as operationally necessary or a normalization defect.

### Required verification

After normalization:

- typecheck;
- test compilation;
- full repository test suite;
- H/V1.3 critical surface;
- build/package verification;
- frozen contract/evidence invariants.

### Expected aggregate

Unless normalization itself changes the number of tests, the required state remains:

- 687 total
- 687 pass
- 0 fail
- 0 cancelled

A normalization regression must be fixed inside H-NORM; it does not create another H-U5-P package.

---

## 12. Session 7 — H-FINAL

### Name

`H-FINAL — authoritative clean verification and H integration closure`

### Source/test rule

H-FINAL is a verification/evidence closure session, not another repair package.

At entry, implementation/test source is frozen at the independently approved H-NORM candidate.

### Required authoritative verification

From an exact clean candidate checkout, run the complete required verification surface, including:

- exact SHA / clean-worktree proof;
- `npm ci`;
- typecheck;
- test compilation;
- complete repository test suite;
- H/V1.3 critical/integration tests including H-I1 through H-I8;
- G adversarial model runtime discovery/execution;
- build/package/mobile verifiers;
- `git diff --check` against the appropriate approved entry authority;
- frozen V1.3 contract-tree verification;
- canonical evidence verification;
- contract-freeze whole-file/prefix verification;
- PR #45 remains OPEN / DRAFT / UNMERGED until independent supervisor disposition.

### Required automated result

Subject only to a deliberate test-count change independently approved in an earlier session, the expected clean result is:

- **687 total**
- **687 pass**
- **0 fail**
- **0 cancelled**
- **0 skipped/todo**
- typecheck PASS
- build PASS

### Closure output

H-FINAL closes H evidence and stops at:

`PHASE 6 H INTEGRATION CANDIDATE COMPLETE — READY FOR INDEPENDENT SUPERVISOR REVIEW — NOT MERGED.`

H-FINAL does not merge the candidate and does not begin Stage 3.

---

## 13. Fixed sequential dependency graph

```text
P7 independent supervisor approval
        |
        v
H-U5-P8
        |
        v
H-U5-P9
        |
        v
H-U5-P10  <-- H-U5 ENDS; NO P11
        |
        v
G-R1
        |
        v
G-R2/R3 combined
        |
        v
H-NORM
        |
        v
H-FINAL
        |
        v
Independent supervisor review of completed H candidate
```

No step may start from an unapproved predecessor candidate.

---

## 14. Per-session common execution discipline

For every repair/normalization session above:

1. start from the exact independently approved predecessor SHA;
2. generate the detailed task prompt from the then-current repository, not from an assumed future branch tip;
3. keep the authorized changed-file surface explicit;
4. preserve frozen contracts unless an explicit contract-change process is separately authorized;
5. use a disposable GitHub Actions proof branch for authoritative execution rather than repeated local-environment reconstruction;
6. preserve real command exit codes and raw test totals;
7. verify no unexpected source/test drift;
8. record deterministic evidence;
9. stop for independent supervisor review before the next session begins.

A task agent must not opportunistically begin the next listed session merely because turn capacity remains.

---

## 15. No-moving-finish-line rule

The finish line defined by this document is fixed:

1. P8;
2. P9;
3. P10;
4. G-R1;
5. G-R2/R3;
6. H-NORM;
7. H-FINAL.

There is no planned P11, G-R4, extra cleanup wave, or additional H prerequisite.

If an active session exposes a genuine new defect, the supervisor must identify the exact causal defect and either:

- correct it inside that active session when it is a direct consequence of the authorized work and remains within the session's safe ownership/capacity boundary; or
- stop and obtain an explicit scope amendment.

It must never silently manufacture a new numbered session from a raw test outcome, an aesthetic preference, or open-ended "more verification" language.

---

## 16. Final accounting proof

Conditional on successful/approved P7 and no deliberate test-count changes, the entire remaining non-pass surface is accounted for as follows:

| Boundary | Pass | Fail | Cancelled | Change from prior boundary |
|---|---:|---:|---:|---|
| Post-P7 baseline | 643 | 27 | 17 | P7 converts 3 cancellations to passes |
| After P8 | 648 | 22 | 17 | 5 failures -> pass |
| After P9 | 670 | 17 | 0 | 5 failures + 17 cancellations -> pass |
| After P10 | 674 | 13 | 0 | 4 failures -> pass |
| After G-R1 | 685 | 2 | 0 | 11 G-W1 failures -> pass |
| After G-R2/R3 | 687 | 0 | 0 | final 2 G failures -> pass |
| After H-NORM | 687 | 0 | 0 | structure-only; no regression |
| H-FINAL | 687 | 0 | 0 | authoritative closure proof |

Total remains 687 throughout unless an earlier independently reviewed session deliberately adds/removes tests. Any such deliberate change must be explicitly reconciled against this outcome accounting; it does not alter the locked causal/session decomposition by itself.

---

## 17. Current-plan authority statement

For **remaining Phase 6 H test-failure repair, G repair batching, production normalization, and H closure sequencing**, this document is the current supervisor plan.

Where an older planning file conflicts with this document about:

- whether A–G are still paused;
- whether v1.1/PR #34 review is still the next action;
- whether the adversarial model is still unimplemented;
- whether the post-P7 H-U5 sequence is unknown/open-ended;
- whether H-U5 may extend past P10;
- whether G-W2 and G-W3 require separate execution sessions;
- whether production normalization occurs before H-FINAL;

the execution/sequencing statement in **this document supersedes the older statement**.

All non-conflicting architecture, product, contract, safety, historical evidence, and accepted implementation authority in those older files remains preserved.