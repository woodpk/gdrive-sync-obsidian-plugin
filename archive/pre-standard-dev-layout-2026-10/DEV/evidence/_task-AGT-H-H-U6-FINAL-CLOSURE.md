# H-FINAL — FINAL INTEGRATION CLOSURE

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

## Entry gate

H-FINAL may begin only when:

1. H-U1 through H-U4 are complete and supervisor-reviewed;
2. every authorized H-U5 repair package needed for integration closure is complete and supervisor-reviewed;
3. no unresolved `H-INTEGRATION-DEFECT` remains;
4. any `WORKER-DEFECT` that prevents integration approval has been resolved by its causal owner or explicitly disposed by the supervisor;
5. the candidate is ready for a final clean verification pass rather than active debugging.

Before doing anything:

- verify `phase6-sync-integration-h` is checked out;
- read the full H-specific evidence file from checkpoint through the latest repair unit;
- record the exact source/test SHA entering H-FINAL;
- verify working tree cleanliness;
- verify `src/contracts/**` remains byte-identical to `96b4541b15012ac4ce0d81243b73ef779efd343e`;
- verify canonical `dev/evidence/_ca-output.md` has not yet been modified by H.

If any entry condition is false, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

## Mission

Perform the authoritative final verification of the assembled Phase 6 synchronization-hardening candidate, close H-specific evidence, and only after successful source/test verification append one H integration closure section to canonical evidence.

This unit does **not** merge the candidate into `phase6-integration` and does not begin Stage 3 or a release.

## Source/test freeze inside H-FINAL

Treat the exact H-FINAL entry source/test SHA as the candidate under review.

Do not make substantive source or test changes during final closure.

If final verification exposes any code/test defect:

1. do not patch it opportunistically inside H-FINAL;
2. record the exact failure;
3. stop without canonical closure;
4. return the defect to a bounded repair unit.

The final evidence must describe one stable source/test candidate, not a moving target.

## Final verification surface

Run from a clean dependency/build state:

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. `npm run check`
6. `git diff --check`
7. explicit G adversarial test execution if its runtime execution is not unmistakably demonstrated in ordinary test output;
8. focused H integration acceptance suite;
9. focused A/B/C/D/E/F suites if necessary to prove all integrated worker surfaces remain intact.

Capture trustworthy raw output.

If piping output, preserve the true command exit code. Do not accept a false green pipeline.

## Final test accounting

Record exact:

- total tests;
- pass;
- fail;
- cancelled;
- skipped;
- todo;
- H integration counts;
- proof G actually executed.

All remaining non-pass results must already have an approved disposition from H-U4/H-U5. If a new unclassified failure/cancellation appears, H-FINAL fails and canonical closure must not be appended.

## CI/raw artifact verification, if CI is used

Record and independently inspect:

- workflow run ID;
- job ID;
- artifact ID;
- artifact digest;
- checked-out source/test SHA;
- raw TAP/check artifacts;
- exact test counts.

Do not rely only on workflow UI status.

## Frozen contract audit

Compare the final source/test candidate to:

`96b4541b15012ac4ce0d81243b73ef779efd343e`

There must be no changed file under `src/contracts/**`.

If any frozen-contract change exists, stop. Do not rationalize it during closure.

## H-specific final evidence

Append the final H closure section to:

`dev/evidence/_ca-output-AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01.md`

Include:

- final source/test SHA;
- integrated A–G authority manifest actually consumed;
- H integration commits/repair commits;
- cross-workstream compatibility changes;
- final changed-file manifest or reliable compare reference;
- final verification commands/counts;
- CI/raw artifact identifiers if used;
- frozen-contract audit;
- residual failure dispositions, if any;
- explicit statement that the candidate is not merged and Stage 3 has not begun.

Commit/push this H-specific evidence update before canonical closure, or otherwise preserve a clearly auditable source/test-versus-evidence commit boundary.

## Canonical evidence append-only rule

Only after all final source/test verification succeeds may H append one integration-closure section to:

`dev/evidence/_ca-output.md`

This is a strict historical append operation.

Required procedure:

1. capture/hash or otherwise preserve the exact complete canonical file before editing;
2. append the new H integration closure **only at end-of-file**;
3. do not rewrite, normalize, reflow, trim, replace, or regenerate any historical byte/line;
4. do not use a whole-file rewrite method that can silently alter historical content;
5. verify the complete pre-append canonical content is a byte-identical prefix of the post-append file;
6. inspect the final diff and confirm the canonical file contains additions only, with zero deletions and zero historical hunks;
7. verify the canonical H closure appears exactly once.

If append-only integrity cannot be demonstrated, stop and correct evidence before claiming closure. Do not modify source/test code to address an evidence-file problem.

## Final evidence-only delta requirement

After the source/test candidate is frozen and all final evidence is written, compare the final evidence commit(s) against the final source/test SHA.

The post-source/test delta must contain only authorized evidence additions/updates needed for closure.

No production or test file may change in the evidence-only closure step.

## Prohibitions

Do not:

- modify `src/contracts/**`;
- merge into `phase6-integration`;
- merge worker PRs;
- modify `main` or `master`;
- begin Stage 3;
- create a release;
- conduct physical synchronization testing;
- claim Phase 6 integration approval on behalf of the independent supervisor.

## Completion criteria

H-FINAL is complete only when:

- the final source/test candidate has passed the required verification surface or all non-pass outcomes have an explicit previously approved disposition;
- no new unclassified failure exists;
- G and H tests are proven runtime-executed;
- frozen contracts are unchanged;
- H-specific final evidence is complete;
- canonical evidence was appended strictly append-only and verified as such;
- evidence-only commits did not alter source/test;
- branch remains unmerged.

End exactly:

`PHASE 6 H INTEGRATION CANDIDATE COMPLETE — READY FOR INDEPENDENT SUPERVISOR REVIEW — NOT MERGED`

If capacity is exhausted before all closure checks/evidence are complete:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-FINAL NOT COMPLETE`

If any final verification defect appears:

`BLOCKED — SUPERVISOR DECISION REQUIRED`
