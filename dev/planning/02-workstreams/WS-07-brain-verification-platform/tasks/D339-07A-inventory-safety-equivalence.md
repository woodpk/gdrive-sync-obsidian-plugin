# DEC-339 / D339-07A — Deterministic Inventory Safety Equivalence and Legacy Fault Parity

## 0. Exact dispatch identity — executable after pinned task-ref handoff

- **Agent:** `agt-brain-dec339-d339-07a-safety-equivalence-01`.
- **Repository:** `woodpk/gdrive-sync-obsidian-plugin` **only**.
- **Workstream:** WS-07 BRAIN Verification Platform, consuming existing WS-02/03/05 production interfaces.
- **Task:** `D339-07A`, bounded implementation of regression tests and deterministic scenario coverage.
- **Maturity:** **EXECUTABLE_AFTER_SUPERVISOR_DISPATCH_WITH_EXACT_PROMPT_REF**. The supervisor supplies the exact planning-branch commit containing this task when dispatching; do not follow a moving planning tip.
- **Exact implementation source BASE (immutable):** `9881c13b542586ff6797f15a7903c22bebb83d4d` — published D339-06B PHX-CI COMPLETE/PASS evidence.
- **Required task branch:** `dec339/d339-07a-safety-equivalence-01`, **precreated at the exact BASE SHA**.
- **Existing verification:** D339-06B source `64199ff7902a0dc09f60b0c3974fe23096adef60`, PHX-CI run `cec6119b-df58-4bd5-b502-6af1ff852d48`, 11/11 stages PASS; this is a predecessor, not D339-07A test evidence.
- **Target feature posture:** inventory observation/targeted executor proof is **disabled by default**; do not activate or deploy.

Before ANY edits, verify remote branch exact HEAD equals BASE, inspect actual files/interfaces at BASE, and use a fresh isolated workspace that preserves the control checkout. If source/branch/task binding drifts, stop with `BLOCKED_DRIFT`, and do not rebase, force-push, switch repository or broaden allowlists to conceal a mismatch.

## 1. Authority and indispensable grounding

At source BASE read:
1. `AGENTS.md`; current **original** `agent-led-software-engineering-operating-protocol` and `software-products-dev-manual-agent-led.md` from connected Google Drive; fresh read the entire original protocol **immediately before writing each verification/test-related code file**. Cached or repository copies do not satisfy the repository's gate. If unavailable, **BLOCKED**, no test-file authoring.
2. `dev/authority/decision-register.yaml` DEC-339; target specification §7.9, retained state/remote/changes/destruction invariants; `dev/research/verified-remote-metadata-inventory/dec339-detailed-architecture-2026-10-10.md` §§2, 4–8, 10–13, particularly §11 matrix; `dev/reviews/dec339-inventory-architecture-adversarial-review-2026-10-10.md` findings A01–A09.
3. WS-07 `02-ARCHITECTURE.md`, `03-BUILD-DECOMPOSITION.md` (new D339-07 decomposition), `04-VERIFICATION-PLAN.md`; locked `dev/authority/governance/locks/testing-platform-boundary.yaml`.
4. Current product modules `src/product/inventory-backed-snapshot-assembler.ts`, `src/product/snapshot-assembler.ts`, `src/product/inventory-targeted-convergence-read.ts`, `src/product/authoritative-production-executor-base.ts`, `src/drive/verified-metadata-inventory-reader.ts`, `src/state/verified-inventory-integration.ts`, and the accepted inventory contract/state modules.
5. Existing tests `test/dec339-snapshot-assembly.test.ts`, `test/dec339-targeted-convergence.test.ts`, `test/dec339-remote-reader.test.ts`, `test/dec339-indexeddb-transaction.test.ts`; existing BVP `test-platform/test/s07a-crash-commit-ambiguity.test.ts`, `test-platform/test/s07b-state-cursor-listing-root-recovery.test.ts`, `test-platform/test/s07e-quota-disk-destructive-config-lifecycle.test.ts`, and relevant scenarios in `test-platform/scenarios/07a|07b|07e/**`.

Existing BVP canonical scenario runner remains the only scenario runner. Production synchronization contracts/policies stay authoritative. This assignment is a test improvement, not an excuse to add a parallel planning/recovery engine.

## 2. Objective and bounded accepted result

Create a compact, source-grounded **adversarial deterministic safety matrix** that (a) compares verified inventory-backed read semantics to the existing canonical full-reconciliation behavior where currently testable, and (b) proves representative existing BVP fault scenarios still produce conservative results. Tests must distinguish actual proof equivalence from a mocked return value. **No feature-level or performance-equivalence claim** is in scope yet; D339-07B/C and D339-08 retain those gates.

### A — Real production-path inventory safety tests

Create `test/dec339-deterministic-safety-equivalence.test.ts`, importing actual production implementation functions and contracts. Cover, where the current seam genuinely supports deterministic demonstration:

1. **Clean complete fixture:** match the canonical snapshot's remote IDs, paths, content/BASE history, tombstones, relevant planning inputs and classification to an inventory-backed observation of the identical fixture; distinguish observational projections from executor authorization. Compare normalized semantic fields, not incidental object/map iteration order, and exercise the real assemblers rather than comparing two manually fabricated expected objects.
2. **Completeness and ambiguity:** same-parent duplicate-name IDs including file/folder, path normalization collision, incomplete sibling pagination or provider `incompleteSearch`, uncertain ancestry, and unknown/inaccessible member must never yield permissive create/destructive authority. Compare with the canonical path's actual **conflict/failure disposition** where available: new path may be stricter, never more permissive. No `unknown → absent` coercion.
3. **Lineage, cursor and identity:** wrong account/root/scope/policy fence, stale cursor/generation or missing immutable predecessor, corrupt overlay/parent cycle, and changed semantic authority must return explicit invalid/fallback/recovery rather than claiming a fresh complete snapshot. Existing BASE, durable effects and learned batches must remain unaffected. Ground each expectation in a real source state/reader boundary; do not fabricate an independent resolver.
4. **Executor read boundary:** with the opt-in **only inside the test dependency injection**, compare positive remote file/folder create eligibility to identical canonical full-reconciliation convergence for the same observed provider state. For stale/partial/mismatched/failing targeted reads, extra unrelated marked-root provenance conflicts, reserved-ID/path/parent mismatches, ambiguous receipts and `outcome-unknown`, verify full fallback or strict block; never accept targeted read for update/move/trash/deletion/recovery. Use the actual targeted verifier and reader semantics for positive proof, not an unconditional mock that returns `verified-convergence-read` to manufacture equivalence.
5. **Nonmutation:** all safety-matrix observations are read-only; assert provider-mutation counters remain zero and no effect or BASE commit is simulated as successful from an inventory observation alone.

If any case requires an unavailable production read seam to exercise correctly, record it as **UNPROVEN / DEFER_TO_D339-07B_OR_CORRECTIVE_UNIT** with exact API blocker; do **not** add a production test hook, bypass a trust check with ungrounded type casts, mark the case PASS or silently drop it. Prefer 6–12 high-value, independently failing cases over broad duplicated fixtures.

### B — Existing BVP virtual-world fault parity

Create `test-platform/test/dec339-legacy-safety-parity.test.ts` to run a selected, **existing** stable set of BVP deterministic scenarios using `DeterministicScenarioRunner.canonical()` and assert not just runner completion but the safety-relevant capture/identity/effect classification when present. Include representative:
- `07a/after-remote-effect`, `07a/ambiguous-applied`, `07a/ambiguous-not-applied` or `07a/before-canonical-state-write`: restart and one stable remote identity / no duplicate dispatch.
- `07b/partial-remote-listing`, `07b/partial-change-page`, `07b/root-identity-mismatch`, `07b/lost-change-cursor`: blocked destructive decisions, rebaseline or recovery, not fabricated absence.
- `07e/destructive-threshold-blocked`: destructive guard continues blocking the actual plan.

Use the **exact existing exports and capture names** after examining each scenario. No new scenario runner, fixture framework, or production import from BVP test code across the frozen seam. These are *legacy safety controls*, **not** proof that dormant inventory was activated in the BVP world. Keep meaningful attribution in test names/case matrix.

### C — Evidence map

In test names and final work report, map each test to DEC-339 §11 gate and architecture finding A01–A09. Report separately (1) executed and passing, (2) executed and failing, (3) not exercisable under current read-only seam, and (4) D339-07B/C/D339-08 still due. No fabricated device-memory, physical API-count or end-to-end benchmark claim.

## 3. Exact writable path allowlist

The implementation child may **CREATE** only:

- `test/dec339-deterministic-safety-equivalence.test.ts` — PHX-CI-owned real production-module unit/integration regressions.
- `test-platform/test/dec339-legacy-safety-parity.test.ts` — BVP existing deterministic virtual-world safety controls.

PHX-CI alone may write its normal `dev/_ca-output.md`, `dev/_ca-output.json`, and `dev/test-results/**` evidence after the owner's pinned run. Do not hand-edit verification outcomes. No other tracked file is writable; especially **NO** `src/**` production change, `test-platform/src/**` BVP core, `test-platform/scenarios/**`, existing test files, build scripts, PowerShell, `phx-ci.json`, Taskfiles, `AGENTS.md`, frozen `dev/authority/**` or shipping/release artifacts. Generated ignored test/build output is allowed solely inside the isolated workspace.

**Size gate:** at most two new test files, target **≤450 net logical test LOC together** and **≤12 purposeful tests**. If safety proof needs larger shared fixtures, BVP architecture edits or production seams, stop and return a grounded split/escalation. Do not create a second test harness.

## 4. Verification — mandatory PHX-CI, not an independent script

After committing/pushing test changes on the exact branch, supply the owner one audited PowerShell 7.6.6 launcher for the installed pinned runtime `69c4aa077d4a1a46d1e85e59f39d36285be99e83`. Do not run GitHub Actions or an ad hoc verifier. The PHX-CI launcher:
- confirms cloned/fresh isolated workspace `HEAD` exactly matches the newly committed implementation SHA; uses BASE `9881c13b542586ff6797f15a7903c22bebb83d4d`, publication mode `push`;
- supplies a nonempty **focused test command** covering the newly created product test and BVP test through their actual TS build paths, e.g. `node node_modules/typescript/bin/tsc -p tsconfig.test.json && node --test .test-build/test/dec339-deterministic-safety-equivalence.test.js && node node_modules/typescript/bin/tsc -p test-platform/tsconfig.json && node --test .test-build/bvp/test-platform/test/dec339-legacy-safety-parity.test.js`; verify the actual output paths before printing;
- lets PHX-CI run existing full repository tests, typecheck, build, frozen repository check/architecture metrics, `check` and artifact hash;
- records full result/exit and published evidence, preserves failure diagnostics, and never calls a manual script to override PHX-CI;
- retains the ordinary `BVP_CHANGE_CLASS` (no governance classification necessary or authorized because **no frozen source** is changed).

Before printing the human launcher, apply original operating protocol §§19.1, 19.2, 19.7 and 37.1 including detailed pre/post audit. No redundant owner rerun solely for administrative artifacts. The accepted shipping `main.js` digest must remain exact `acf331b0a9cc9effd58a1ffdd02eee0d4aca58071b97759c59d3d605e25b8881` (or existing approved baseline, if code path genuinely unchanged), and unknown digests are hard failures.

## 5. Objective acceptance / stop

Return **PASS** only if:
1. both files implement actual independently failing assertions; all new focused cases executed, with no missing scenarios silently skipped;
2. snapshot/targeted tests explicitly distinguish complete, stale, ambiguous and missing proof and preserve legacy BASE/recovery/create/delete safety;
3. BVP parity tests execute actual canonical scenarios and assert relevant captures, not merely `status=completed`;
4. typecheck, focused tests, full product tests, BVP targeted tests, build, frozen architecture/budgets and artifact-gate checks have authoritative PHX-CI evidence `COMPLETE/PASS` all required stages; and
5. exact source SHA, run ID, evidence commit, changed paths, test count and any unproven equivalence claims are clearly reported.

If tests surface a genuine product flaw, do **not** silently change production code or relax test assertions. Preserve failing PHX-CI output, classify `BLOCKED_PRODUCT_DEFECT`, and hand off a bounded corrective unit. Do not proceed to D339-07B or independent review until disposition is explicit.

**Non-goals:** no full DEC-339 acceptance; no assertion of network speedup or device resource readiness; no plugin installation, release, feature activation, state migration, physical Drive/vault mutation, rerun of accepted S09A canary, or Stage 3 entry. D339-07B/C and D339-08 remain separate.

## 6. Completion output

Report exact:
- source branch/BASE/implementation SHA and task prompt ref SHA;
- focused case names, coverage matrix, negative failures and unproven cases;
- PHX-CI run/result/evidence commit and shipping artifact identity;
- changed-file list and any scoped stops;
- next bounded action, not a claim that DEC-339 feature is finished.
