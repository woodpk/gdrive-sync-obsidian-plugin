# DEC-339 Step 4 — Observation-Only Comparison: Final independent review

**VERDICT: CORRECTION REQUIRED — ADMINISTRATIVE IMMUTABLE-TREE IDENTITY; SOFTWARE EVIDENCE SUBSTANTIVELY PASS**

**Reviewer:** `review-brain-10`  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** DEC-339 Step 4 — Observation-Only Comparison  
**Branch:** `build/dec339-step4-observation-comparison-20261123`  
**Frozen source SHA:** `41653ada82c90d898c730e181290ca155ff1574f`  
**ACTUAL source Git tree:** `315d87203ea83681f4ea75edd52d8f911c009eeb`  
**INCORRECT tree asserted in committed handoff state:** `b59e6a64d8d1b63f72e2b327cadb8d2b7ad554bf`  
**Incoming state commit:** `00dd450cd466375af9bf9fe7b052380b57617df3`; count 1, sender BUILDER, recipient REVIEWER.  
**Blind independent report:** `dev/reviews/dec339-step4-observation-comparison-20261123-review-brain-10-blind-source.md` at immutable commit `3eec1f6eae2a1c9969b24fe36fe210a79d75e756`.  
**Normative plan:** `dev/planning/02-workstreams/WS-05-integrated-sync-product/tasks/dec339-step4-observation-comparison-2026-11-23.md`.

## Finding G-01 — BLOCKING governance error: wrong frozen Git tree in state

The GitHub Git commit `41653ada82c90d898c730e181290ca155ff1574f` indisputably has Git tree `315d87203ea83681f4ea75edd52d8f911c009eeb`. Original qualified PHX-CI `result.md` and `result.json` independently report **the same real tree** as the verified checkout, with exact expected/verified HEAD `41653ada...`. However `dev/state/current-state.yaml` for `dec339_step4_observation_comparison_2026_11_23` asserts `qualification_verified_tree: "b59e6a64d8d1b63f72e2b327cadb8d2b7ad554bf"`, contradicting both the Git source commit and original verification.

The wrong value is *administrative handoff metadata*; the original PHX-CI test run verified the **correct immutable source**. This does **not** establish an implementation failure, wrong run, unqualified code or weakened oracle. Nevertheless the final-review handoff explicitly requires exact immutable source/tree and a consistent current handoff state. The Reviewer cannot certify an incorrect published source tree as accepted.

**Mandatory correction:** Authorized Builder/state publisher must fetch GitHub, replace **only this feature-local erroneous `qualification_verified_tree` value** with `315d87203ea83681f4ea75edd52d8f911c009eeb`, and preserve the actual source SHA, PHX-CI ID, evidence commit, existing Reviewer report and historical blocked R1 evidence. Publish/verify non-destructive state commit and reconcile handoff recipient/count under the governing protocol. **Do not rebuild, edit software/tests, or repeat PHX-CI solely to correct this clerical value.** An independent Reviewer can then confirm the reconciled frozen identity and finalize formal acceptance/transfer without repeating the blind source review or original PHX-CI work.

## Source and software acceptance findings

**No software acceptance blocker found within the bounded observation-only contract.**

The production `InventoryBackedSnapshotAssembler` is opt-in, calls the **existing** assembler, substitutes only a fully verified and root-wide-proven read-only REMOTE listing, rechecks canonical cursor/pairing/generation/scope, and uses legacy physical fallback for untrusted observations. `VerifiedInventoryPlanningProjection` checks domain roots, full coverage, stable IDs, sibling/path uniqueness and bounded retrieval; storage returns partial rather than silently truncating a full parent. `ProductRuntime` continues constructing `ProductSnapshotAssembler`, the existing planner and executor. No new dispatch authorization or inventory activation is present.

The authored `tests/integration/dec339-step4-observation-comparison.test.ts` at exact source:
- Creates the **actual production** `createObsidianGoogleDriveBoundary` with paired account key derived from SecretStorage and authenticated `requestUrl`, then runs `VerifiedInventoryBaselineCoordinator` on isolated `FakeDatabase` state. It compares opt-in inventory-backed assembly with **ordinary full physical assembly**, asserting deep equality of LOCAL/REMOTE/BASE snapshots, trusted state, next cursor and the existing `DeterministicSynchronizationPlanner`'s output, both initially and after an account-wide Changes upsert advancing revision/hash **of the same stable remote ID**.
- A deliberately wrong paired-account fence triggers fallback; the compared snapshots and plans equal the existing physical path.
- A partial fresh local scan preserves `unknown` LOCAL uncertainty on both assemblers, asserts equal plans and explicitly denies `trash-remote` operations.
- The provider fixture rejects unanticipated HTTP operations, and the comparison asserts that its complete request log consists of GET only; no production executor is invoked. The same-ID advance in this Step-4 fixture is simulated by advancing provider state; the accepted Step-3 focused test separately invokes the actual production update adapter to prove mutation→Changes→storage continuity.

The focused selector additionally includes `dec339-snapshot-assembly`, `dec339-planning-projection`, `dec339-local-observation-integration` and accepted `dec339-step3-shadow-continuity` tests; local watcher/scope invalidation and failed-IDB latch are covered by the separately selected local integration suite. The assembled Step-4 parity test **does not itself** call local-hint refresh/invalidation; this is nonblocking scoped coverage, not proof of complete deployed scope-owner wiring.

## Ten mandatory test families

| Family | Independent assessment |
| --- | --- |
| 1. Nominal/success | PASS — complete baseline and after same-ID Changes comparison produces identical snapshot/state/cursor and plan |
| 2. Negative/boundary | PASS, bounded — explicit wrong-fence fallback and partial-LOCAL refusal; other malformed/duplicate/incomplete projection cases in selected suites |
| 3. Legal/forbidden transitions | PASS — baseline/incremental publication gated; no inventory-driven executor |
| 4. Repeat/retry/recovery | PASS through previously qualified Step-3 continuity and selected snapshot/projection suites; no new recovery path |
| 5. Concurrency/staleness | PASS at software-unit scope through selected storage/fence checks; actual concurrent physical/device races remain separate gates |
| 6. Persistence/restart/integrity | PASS for selected Step-3 restart and atomic publication tests; Step-4 fixture uses isolated simulated IndexedDB, not live storage |
| 7. Identity/security/trust | PASS — production account-key derivation and shared auth transport exercised, including wrong-fence fallback |
| 8. Interfaces/contracts | PASS — same production reader, inventory assembler and legacy planner semantics; no second planner or changes to production interfaces |
| 9. Architecture/invariants | PASS — no production source change, no alternate dispatch, no live activation, no GitHub Actions |
| 10. E2E/fail-closed | PASS for bounded software observation-comparison and negative local/identity cases, not live provider/device E2E |

## Original PHX-CI and test integrity

**Run:** `9d34351e-227f-4082-8ab6-46b7eae3b36e`  
**Evidence-only commit:** `f512e523b11f769769f9a6afd113ff541f7b3984` (immediate child of frozen source)  
**Canonical originals:** `dev/test-results/9d34351e-227f-4082-8ab6-46b7eae3b36e/result.md`, `result.json`, `terminal.log`, and `dev/_ca-output.md`.  
**Pinned PHX-CI runtime:** `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.

Direct original evidence independently establishes exact expected/verified SHA `41653ada82c90d898c730e181290ca155ff1574f` and **actual tree `315d87203ea83681f4ea75edd52d8f911c009eeb`**, matching the GitHub Git commit. Required stages **13/13 PASS**, focused **36/36 PASS**, full product **1347/1347 PASS**, typecheck/build/artifacts/repository PASS, original exit 0. `main.js` **966306 bytes**, SHA-256 `6a07283dd39a6c5634fe89f5131e402a7d7a398e71ee404812eaab0717b95427`. No physical dispatch.

Evidence-only direct child changes only `dev/_ca-output.md` and three canonical R2 run evidence files. Comparing Step-3 closeout source `d8fdf66db0aeb7c44fafb42ccd5cbee706682425` to reviewed R2 source finds only one new test file (369 lines), selector modification in `package.json` and `dev/**` records; **no production source changes or repository guard weakening**. R1 run `7e1b476c-73ce-43f2-8bec-da3b96b56c90` was BLOCKED due to fixture inventory schema version mismatch; R2 corrected fixture schema version without relaxation of the snapshot/plan equality assertions, and all PHX-CI stages passed.

## Nonblocking findings carried forward

- **M-01:** Deterministic HTTP fixture + `FakeDatabase` are software evidence only; no live Google/browser/Obsidian/device proof.
- **M-02:** The source-level fallback before root-wide provenance can select the legacy incremental assembler, not necessarily a *full* physical enumeration. This does not grant additional inventory authority; maintain the conservative comparison rule at future runtime activation.
- **M-03:** The assembled Step-4 case proves production account-key-to-transport composition and snapshot parity; local-scope invalidation remains separately tested and not directly combined into the new parity test.
- **M-04:** Current test uses complete unambiguous and two selected fail-closed cases, not every possible malformed provider response within this one file; the focused preexisting reader/projection suites cover relevant additional cases.

## Disposition and permitted actions

**FINAL VERDICT: CORRECTION REQUIRED — G-01 published tree-identity metadata mismatch.** Software itself passes independent review against the correct source SHA/tree; the formal final acceptance is **WITHHELD** until an authorized writer reconciles the published `qualification_verified_tree` and a Reviewer verifies the corrected state. This is **not** a demand to reimplement, edit tests or re-run valid original PHX-CI. Preserve all original evidence; do not invent or relabel the actual Git tree to match the erroneous state.

**User's strict write scope:** The Reviewer was directed not to change production/tests/scripts/evidence; this review changes **only independently authored `dev/reviews/` files** and does not amend `dev/state/current-state.yaml`. Thus count remains 1, recipient REVIEWER, and no count-2 state commit is asserted. Authorized state publication and exact transfer verification are still required under governing handoff protocol.

No Step-5 start, master/PR #157 merge, inventory cutover/activation, live migration, provider/vault/device operations, physical testing, installation, promotion or release is authorized. Reviewer executed no software tests, no GitHub Actions, no provider/device operations.
