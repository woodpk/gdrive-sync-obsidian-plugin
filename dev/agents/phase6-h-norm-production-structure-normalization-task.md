# NAME: `agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-13`

# SESSION 6 — H-NORM — MANDATORY PRODUCTION-STRUCTURE NORMALIZATION

## 0. AGENT IDENTITY / ASSIGNMENT

You are:

`agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-13`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Integration branch:

`phase6-sync-integration-h`

You are the bounded **H-NORM production-structure normalization agent** for the already-integrated Phase 6 synchronization-hardening candidate.

All planned H-U5 and G repair sessions are complete. The automated repository test surface is now fully green.

Your assignment is **not** another repair campaign and **not** a semantic redesign.

Your exact assignment is:

> Remove temporary phase/workstream/integration scaffolding nomenclature from live production structure where it is not an enduring domain responsibility, while preserving the already-approved synchronization behavior exactly. Audit every relevant `src/**` occurrence, normalize the production module/class/symbol/runtime identifiers that are genuine temporary artifacts, update only mechanically necessary live references, prove zero semantic regression, and stop for independent supervisor review before H-FINAL.

This is **Session 6 — H-NORM** in:

`phase6-h-remaining-test-failure-fix-plan.md`

H-FINAL is a later separate session. Do not begin it.

---

## 1. EXACT APPROVED ENTRY AUTHORITY

The independently supervisor-approved G-R2/R3 final evidence-bearing H head is:

`ec6c66d1a2c7eb8485d1c9a624ac77f448d93695`

At that approved head:

- G-R2/R3 candidate: `4b70eb2a15711c6e83aad809e623c400e50b4e01`;
- focused adversarial model: `56 / 56 PASS`;
- V1.3 foundation: `17 / 17 PASS`, including C15/C16;
- H/V1.3 critical: `82 / 82 PASS`, including H-I1 through H-I8;
- whole repository: `687 / 687 PASS`, with zero fail/cancelled/skipped/todo;
- production build: PASS;
- `../../main.js`: `699509` bytes;
- `../../main.js` SHA-256: `212cc1af1f785a6c1b34f9e4789a3b0eacae4c5ed0f5e647d9864e3b8e621613`;
- frozen V1.3 authorities remain exact;
- PR #45 is open, draft, unmerged, headed by `phase6-sync-integration-h`.

This tasking document is committed after that approved head as one supervisor planning-only commit.

At startup:

1. resolve live `phase6-sync-integration-h` head;
2. record it as `H_NORM_ENTRY_HEAD`;
3. compare:
   - base: `ec6c66d1a2c7eb8485d1c9a624ac77f448d93695`
   - head: `H_NORM_ENTRY_HEAD`;
4. require that the delta contains **only**:
   - `phase6-h-norm-production-structure-normalization-task.md`;
5. require no source, test, contract, evidence, workflow, or other planning change.

If that exact entry condition is false, stop:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not substitute another SHA or silently absorb intervening work.

Before editing, read completely:

1. `software-products-dev-manual-agent-led.md`
2. `phase6-h-remaining-test-failure-fix-plan.md`
3. this tasking document
4. `../evidence/_task-AGT-H-H-U6-FINAL-CLOSURE.md` for the already-authorized normalization-before-final-closure requirement, while treating its older Phase 6 baseline/status values as historical rather than current authority
5. `../evidence/_ca-output-agt-g-ca-stage-2a-phase-6-sync-adversarial-repair-02.md`
6. every production file identified by the audit in Section 4
7. every live source/test import or reference that must change mechanically because a normalized production module or symbol is renamed.

---

## 2. PURPOSE AND NON-NEGOTIABLE BOUNDARY

The candidate is already functionally green.

H-NORM exists because implementation-history names such as `phase5`, `phase6`, workstream letters, or generic `integration` scaffolding must not remain as permanent production architecture when the code now serves an enduring domain responsibility.

Normalization must satisfy all of these principles:

1. **Preserve capability and behavior exactly.**
2. **Prefer enduring domain-responsibility names.**
3. **No semantic redesign.**
4. **No frozen-contract change.**
5. **No persistence/schema/protocol migration.**
6. **No historical evidence rewrite.**
7. **No historical test-name/file-name cosmetic rewrite.**
8. **Update live imports/references consistently when a production module/symbol is renamed.**
9. **Do not preserve a temporary production artifact merely because tests currently import it by that historical name.** Mechanical test reference updates are allowed when necessary.
10. **Do not invent abstractions solely to make names look cleaner.** Existing responsibilities should be given durable homes/names with minimum structural disturbance.

A green test suite does not authorize behavior changes during normalization.

If you discover that removing a temporary layer requires a substantive synchronization redesign rather than a mechanical responsibility-preserving normalization, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

---

## 3. FROZEN AUTHORITIES

Preserve exactly:

- approved V1.3 foundation source: `05600f7ca48a6726b72188005f29eddfc1191519`
- frozen `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- canonical evidence blob: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`
- contract-freeze whole-file blob: `b675e0fc9776d03892a4309231b91a4bf0a84b93`
- immutable predecessor-prefix SHA-1: `fe527c76137b2cd578ef7050ee3444498b21a5e0`

No file under `src/contracts/**` may be modified.

Operational failure provenance and physical-effect certainty remain orthogonal.

`executionDispositionV1_3` remains the H/UI interpretation authority.

All approved H-U5 and G semantics are frozen for this session.

---

## 4. MANDATORY COMPLETE PRODUCTION NOMENCLATURE AUDIT

Before editing, audit **all tracked `src/**` paths and contents**, not only the known examples.

At minimum, use exact repository-state searches equivalent to:

```bash
git ls-files 'src/**' | grep -Ei 'phase[0-9]+|workstream|integrat(ed|ion)' || true
git grep -nEi 'phase[0-9]+|workstream|integrat(ed|ion)' -- 'src/**' || true
```

Also inspect obvious historical owner-letter commentary or symbol names (`A`, `B`, `C`, `D`, `H`) where context shows they describe implementation workstreams rather than enduring domain concepts. Do not blindly grep-renormalize ordinary words or legitimate domain terminology.

Create an internal audit ledger and record its final disposition in your evidence.

For **every** match under `src/**`, classify it as one of:

### A. `NORMALIZATION-DEFECT`

The name/comment/path reflects temporary implementation history rather than an enduring product/domain responsibility and must be normalized in this session.

### B. `OPERATIONALLY-RETAINED`

The occurrence is legitimately enduring terminology or cannot be changed because it is frozen authority/protocol/schema/history that production must continue to interpret exactly.

For every retained match, give a short concrete reason in evidence.

Do not leave a match unclassified.

### Frozen-contract nuance

Occurrences under `src/contracts/**` are audit-visible but frozen. Classify them rather than modifying them.

Do not use H-NORM as an excuse to revise versioned contract type names such as `V1_1`/`V1_3`, protocol versions, persisted schema versions, or compatibility data that are functionally meaningful.

---

## 5. MANDATORY MINIMUM DISPOSITIONS

The following are already supervisor-classified normalization targets and **must not be left unresolved**.

### H-N1 — `src/product/phase6-sync-integration.ts`

This production module is named for the implementation phase rather than its enduring responsibilities.

Its live responsibilities include at least:

1. crash-safe local transactional mutation adaptation between logical scoped paths and the physical Obsidian adapter; and
2. synchronization state/authority adaptation between canonical trusted-state CAS semantics and durable authoritative persistence semantics.

The responsibilities are real; the phase-specific module name is not permanent architecture.

Required:

- inspect the complete module and all live consumers;
- assign enduring domain-responsibility module name(s);
- rename/move the implementation with minimum structural disruption;
- update all live imports;
- do not leave a production compatibility shim at `src/product/phase6-sync-integration.ts` merely to preserve the historical filename;
- do not alter the behavior of `IntegratedLocalTransactionalMutationPort` / `IntegratedSynchronizationStateStore` merely because their names are normalized;
- normalize helper/export names such as `nextIntegratedSemanticGeneration` or `rebaseIntegratedConvergence` if the audit determines `Integrated` is only temporary integration-history nomenclature;
- rewrite live production comments that describe the permanent responsibility only in terms of workstream letters or “H integration” where such comments would otherwise misstate the enduring architecture.

Whether the two responsibilities remain in one domain module or are split into two already-natural responsibility modules is permitted **only if semantics and dependency direction are unchanged and the change remains small**. Do not create a new abstraction layer for aesthetics.

### H-N2 — `Phase5ProductRuntime`

In:

`../../src/product/runtime.ts`

The runtime class must no longer be phase-numbered.

Required:

- rename it to an enduring product/domain runtime name;
- update live production references and mechanically necessary test imports/type references;
- preserve constructor/API behavior except for the name;
- do not rename historical test titles/files merely to remove “Phase5” wording from historical test descriptions.

### H-N3 — production lease-holder prefix `phase5:`

In the runtime controller construction, production currently uses a holder identifier of the form:

`phase5:<device>:<unique>`

Replace the phase-numbered prefix with an enduring synchronization/product responsibility prefix.

Constraints:

- preserve uniqueness and per-device correlation properties;
- do not change lease semantics;
- do not change cancellation/serialization behavior;
- do not introduce persisted schema/protocol consequences.

### H-N4 — other live `Integrated*` / phase/workstream/integration artifacts

At current entry, live production code includes integration-history naming beyond the filename above, including at least the imported/derived controller/state/local-mutation names around the production composition.

Examples that the audit must explicitly disposition include, where present:

- `IntegratedLocalTransactionalMutationPort`
- `IntegratedSynchronizationStateStore`
- `IntegratedProductController`
- aliases such as `BaseIntegratedProductController`
- helper names containing `Integrated`
- comments that describe permanent runtime architecture by temporary workstream letters or phase ownership.

Do **not** assume every use of the English word “integrated” is automatically defective. Classify each against the rule: is this an enduring domain responsibility or only implementation-history scaffolding?

If defective, rename consistently.

---

## 6. WRITE AUTHORITY

### 6.1 Production files

You may modify production files under `src/**` **only when** the mandatory audit classifies the exact path/content as required to remove a `NORMALIZATION-DEFECT` or as a mechanically necessary live reference/import consequence of such a rename.

You may create/delete/rename production module files only for that same bounded purpose.

You may **not** modify `src/contracts/**`.

### 6.2 Tests

You may modify live test source **only** where compilation/runtime requires a mechanical import/path/symbol reference update caused by an authorized production rename.

Test changes may not:

- change behavior;
- change assertions;
- change fixtures;
- change expected values;
- rename test cases/files merely for cosmetics;
- skip/todo/cancel tests;
- alter timing or concurrency.

A test-only textual reference to an old production symbol may be updated when necessary to compile against the normalized production API.

### 6.3 Evidence

After the source/test candidate is fixed, you may create/update only your evidence file:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-13.md`

### 6.4 Forbidden surfaces

Without supervisor re-authorization, do not modify:

- `src/contracts/**`;
- canonical `../evidence/_ca-output.md`;
- any prior evidence file;
- any planning file;
- persisted test fixtures/data except a mechanically necessary import/reference change as described above;
- workflow files on `phase6-sync-integration-h`;
- PR #45 metadata;
- `main`, `master`, `phase6-integration`, or worker branches.

A disposable proof workflow may exist only on a separate proof branch.

---

## 7. NORMALIZATION ACCEPTANCE STANDARD

A compliant candidate must satisfy all of the following:

1. Every phase/workstream/integration-name match under `src/**` is classified in evidence.
2. Every classified `NORMALIZATION-DEFECT` is removed or renamed to an enduring domain responsibility.
3. Every `OPERATIONALLY-RETAINED` match has a concrete justification.
4. `src/product/phase6-sync-integration.ts` no longer exists as a live production module.
5. No production class remains named `Phase5ProductRuntime`.
6. No production lease/holder ID remains prefixed `phase5:`.
7. No compatibility shim preserves those temporary names merely to avoid updating consumers.
8. Frozen versioned contract/schema/protocol names are not cosmetically rewritten.
9. Production behavior is unchanged.
10. Test behavior/assertions are unchanged.
11. All mechanically affected source/test imports resolve correctly.
12. Dependency direction remains valid; no duplicate competing abstraction is created.
13. The full automated suite remains green.

If removal of a temporary name would itself violate frozen protocol/persistence compatibility, retain and document that specific occurrence as `OPERATIONALLY-RETAINED`; do not break compatibility for cosmetic purity.

---

## 8. CANDIDATE COMMIT BOUNDARY

Perform the complete normalization as one bounded source/test candidate lineage.

Before recording the final candidate:

- run `git diff --check`;
- inspect the full changed-file manifest;
- prove every changed source/test file is justified by the audit;
- prove no frozen contract/evidence/planning/workflow path changed.

Record the final normalized source/test commit as:

`H_NORM_CANDIDATE_SHA`

Do not place evidence edits in the source/test candidate.

After the candidate is fixed, create one later evidence-only commit containing only:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-13.md`

Record the final evidence-bearing H head separately.

Because module renames may appear as delete/add in Git metadata, evidence must record both the logical rename mapping and the exact Git changed-file manifest.

---

## 9. AUTHORITATIVE PROOF PROCEDURE

Use a disposable GitHub Actions proof branch.

Preferred proof branch:

`h-norm-production-structure-proof-h13`

Preferred workflow:

`.github/workflows/h-norm-production-structure-proof.yml`

Requirements:

- workflow-only changes on the disposable proof branch;
- checkout exact `H_NORM_CANDIDATE_SHA`;
- Node 22;
- `actions/checkout@v4` with `persist-credentials: false` and `fetch-depth: 0`;
- no source/test/contract patching inside the workflow;
- no PR mutation;
- no secret output;
- no merge of the proof branch;
- preserve real command exits and raw logs/artifacts.

The integration candidate is already green. Every verification test command in H-NORM is therefore expected to exit `0`.

---

## 10. REQUIRED VERIFICATION GATES

### Gate A — exact candidate / audit scope / frozen authority

Prove:

1. checkout equals exact `H_NORM_CANDIDATE_SHA`;
2. `src/contracts/**` tree remains exactly:
   `0db68ced179825f929008b502335210260ca2ce3`;
3. canonical evidence blob remains exactly:
   `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`;
4. contract-freeze blob remains:
   `b675e0fc9776d03892a4309231b91a4bf0a84b93`;
5. predecessor-prefix SHA-1 remains:
   `fe527c76137b2cd578ef7050ee3444498b21a5e0`;
6. candidate tracked worktree is clean;
7. `git diff --check H_NORM_ENTRY_HEAD...H_NORM_CANDIDATE_SHA` PASS;
8. no unauthorized contract/evidence/planning/workflow file appears in the candidate;
9. every candidate path is tied to an audit disposition;
10. rerunning the full nomenclature audit produces no unclassified occurrence and no unresolved mandatory target.

### Gate B — install / static

Run and require real exit `0`:

- `npm ci`
- `npm run typecheck`
- repository test compilation (`npx tsc -p tsconfig.test.json` or repository-equivalent)

### Gate C — focused H/V1.3 critical integration

Run the established H/V1.3 critical regression surface.

Required:

- total: `82`
- pass: `82`
- fail: `0`
- cancelled: `0`
- skipped/todo: `0`
- H-I1 through H-I8 all PASS
- real exit `0`

### Gate D — adversarial G runtime surface

Run the complete adversarial model explicitly unless Gate F output unmistakably proves its runtime discovery.

Required:

- `56 / 56 PASS`
- G-W1 repairs remain PASS
- G-W2 PASS
- G-W3 PASS
- real exit `0`

### Gate E — V1.3 foundation

Required:

- `17 / 17 PASS`
- C15 PASS
- C16 PASS
- real exit `0`

### Gate F — complete repository

Required:

- total: `687`
- pass: `687`
- fail: `0`
- cancelled: `0`
- skipped: `0`
- todo: `0`
- real exit `0`

A normalization-caused regression must be corrected **inside H-NORM** if it is a direct mechanical consequence of the authorized rename. It does not create another H-U5 package.

If verification exposes an unrelated/genuine semantic defect, stop rather than broadening normalization.

### Gate G — production build/package checks

Run:

- `npm run build`
- `npm run check` if available in the repository at this candidate

Require success for every available required command.

Record actual normalized `../../main.js` byte size and SHA-256.

The H-NORM production artifact **is allowed to have a different byte hash/size** from G-R2/R3 because production module/symbol/comment names may change. Do not require byte identity with `699509` / `212cc...`.

Instead prove that the production changed-file manifest contains only normalization-authorized files and that all semantic verification remains green.

### Gate H — final repository / PR invariants

Prove:

- candidate source/test manifest matches the normalization audit;
- no frozen contract changed;
- no prior/canonical evidence changed;
- candidate → evidence head changes only the agent-13 evidence file;
- proof workflow is absent from the integration branch;
- PR #45 remains `open`;
- PR #45 remains `draft = true`;
- PR #45 remains unmerged;
- PR #45 head branch remains `phase6-sync-integration-h`.

---

## 11. REQUIRED EVIDENCE

Create/update only:

`../evidence/_ca-output-agt-h-ca-stage-2a-phase-6-sync-hardening-serial-integration-13.md`

Record at minimum:

1. agent identity;
2. approved pre-task authority `ec6c66d1a2c7eb8485d1c9a624ac77f448d93695`;
3. `H_NORM_ENTRY_HEAD` and exact planning-only entry proof;
4. full production nomenclature audit command(s);
5. complete audit ledger of every relevant `src/**` match with `NORMALIZATION-DEFECT` or `OPERATIONALLY-RETAINED` disposition and reason;
6. exact old → new module rename map;
7. exact old → new production class/export/helper identifier map;
8. explicit disposition of `src/product/phase6-sync-integration.ts`;
9. explicit disposition of `Phase5ProductRuntime`;
10. explicit disposition of `phase5:` holder prefix;
11. explicit disposition of every other `Integrated*`, phase, workstream, integration, or historical-owner-letter production artifact found by the audit;
12. `H_NORM_CANDIDATE_SHA`;
13. exact entry → candidate Git manifest;
14. explanation of every mechanically changed test file, if any, proving assertions/behavior were untouched;
15. final evidence-bearing H head;
16. exact candidate → evidence-head manifest;
17. `git diff --check` result;
18. typecheck/test-compile results;
19. critical `82/82` and H-I1–H-I8;
20. adversarial `56/56`;
21. foundation `17/17` including C15/C16;
22. whole repository `687/687`;
23. build/check results;
24. actual new `../../main.js` size and SHA-256;
25. proof branch/workflow/head commit;
26. run ID/job ID/conclusion;
27. artifact ID/name/digest/size copied from authoritative GitHub metadata after run completion;
28. frozen-authority verification;
29. PR #45 state/head/unmerged proof;
30. explicit statement that no semantic synchronization behavior or frozen contract was changed;
31. blockers or unexpected semantic delta, if any.

Cross-check all workflow/run/job/artifact/build provenance before committing evidence.

---

## 12. HARD STOP

If every H-NORM gate passes, commit the evidence-only closure and stop for independent supervisor review.

Do **not** begin H-FINAL.

Do **not** append canonical evidence.

Do **not** merge PR #45 or `phase6-sync-integration-h`.

Do **not** begin Stage 3.

Do **not** run physical iPhone synchronization.

Your completion response must include:

- `H_NORM_ENTRY_HEAD`;
- `H_NORM_CANDIDATE_SHA`;
- final evidence-bearing H head;
- full audit/disposition summary;
- old → new module/symbol mappings;
- exact changed-file manifests;
- verification totals;
- build artifact identity;
- proof run/job/artifact identifiers;
- frozen authority proof;
- PR #45 state;
- confirmation that H-FINAL was not started.

End exactly:

`H-NORM COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START H-FINAL OR PHYSICAL IPHONE VALIDATION`

If a semantic redesign or unrelated production defect is required, end:

`BLOCKED — SUPERVISOR DECISION REQUIRED`