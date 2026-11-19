# DEC-362 — Independent Blind-First Review of Stable Drive-ID Content-Update Correction

**NEXT AGENT:** separate INDEPENDENT REVIEWER, never the Builder who authored this candidate.  
**Repository:** `woodpk/gdrive-sync-obsidian-plugin`  
**Feature:** WS-03/WS-05 DEC-362 stable Drive object identity for ordinary existing-file content update and clean-merge propagation.  
**Branch for locating records:** `fix/dec362-stable-drive-id-content-update-20261118`. Treat its head as an administrative pointer, not the source under review.  
**Frozen product/test source SHA:** `640845815dc85672c2411b1b7d3ae48f17a86bc2`  
**Frozen source Git tree:** `133efbae0fc19162c168caf567ec663de04115fa`  
**Verification baseline:** `f507cbcc669568d1cb480abca469bdb1a7d184b8`  
**PHX-CI evidence publication:** `8f7dfdefa96eae3bec7a1acc4fc22763757756a5` (direct child of the qualified source; evidence-only)  
**PHX-CI run:** `56e68fb7-2b1f-4b47-9969-9e871bd30f7a`; pinned runtime `4cf0c865c7b189641e2acebc0a6ad757b6f01992`, framework `0.2.0-dev.2`.  
**Handoff-count:** 1, Builder → Reviewer, correction feature-local.  
**Reviewer status:** NO VERDICT YET. **PR #157/DEC-339 CUTOVER BLOCKED.**

## Mandatory review ordering and independence

This assignment is **READ-ONLY**. Do not change source, tests, evidence, task/decision registers, refs, PR #157, Drive/vault/device state or production activation. Do not run independent executable validation, use GitHub Actions or claim a live physical test. Inspect with the connected GitHub tools against **the exact frozen source SHA**, not the later branch head.

**BLIND FIRST:** Before reading Builder claims, implementation histories/diffs, tests or PHX-CI evidence, freshly read authoritative requirements and the implementation source at the frozen SHA; complete and write down a source-only provisional assessment identifying plausible correctness/security/governance defects and coverage gaps. Ground findings in concrete code paths, conditions, and causal counterexamples; distinguish established defects from hypotheses. Only **after** that first-pass assessment is frozen, inspect source diff, tests, Builder notes, historical failed runs, the qualifying PHX-CI evidence, and amend the final assessment as necessary.

Read `AGENTS.md` and current authoritative target/decisions (`dev/planning/01-target-system/target-system-specification.md`, `dev/authority/decision-register.yaml`, including DEC-339, DEC-338 and DEC-362), this corrective task, WS-03 and WS-05 verification plans, and the applicable connected original Google Drive governing manuals. Do not let retrospective Builder narration substitute for source inspection.

## Acceptance question

Does the correction **actually** preserve established Drive object ID A across ordinary edits and clean three-way merges, with independent content/revision verification and safe authoritative state/recovery, without opening destructive, stale-write, duplicate-path, new-file-create, or cross-device identity regressions?

The review must inspect and reason adversarially about:

1. **Drive transport and physical identity:** `src/drive/google-drive-port.ts` and the existing PATCH resumable update method, expected ID/revision/root/provenance constraints, upload session ambiguous outcomes, post-upload exact-ID and path topology checks. No successor B, no retiring A during routine update.
2. **Contract and authoritative executor:** `src/contracts/synchronization-foundation.ts`, `src/product/authoritative-production-executor-base.ts`, `src/product/remote-update-convergence.ts`, and state validation. Identity in durable intent, dispatch proof, resulting receipt, BASE, remoteMappings, and revision/content coherence.
3. **Crash and recovery:** `src/product/durable-intent-recovery-base.ts`, `src/product/durable-intent-recovery.ts`, and persistent state. Lost response, interrupted dispatch, post-effect/pre-commit crash, stale revision, repeated recovery, empty/partial/ambiguous listings, wrong same-name identity, and refusal to fabricate success.
4. **Cross-device and convergence:** two-device A→B→A update, nonoverlapping clean merge, stale writer and concurrent edit hazards proportionate to single-user use. Explicitly assess whether revision recheck is sufficient in provider realities; do not assume Google Drive supports an atomic compare-and-swap unless verified. Do not impose unrelated multi-user collaboration architecture.
5. **Non-update regressions:** reserved-ID genuine creates; move/trash and first sync; state and Changes feeds; DEC-339 inventory fallback; policy boundaries; one planner, one executor, one recovery lifecycle, no new logical ID layer or OAuth changes.
6. **Test credibility:** Analyze all ten task-mandated test families (or justified N/A); tests' independent-oracle quality, stubs realism and oversights; virtual-world behavior and negative cases. Especially scrutinize the boundary where a mock's same-ID update can mask provider implementation errors.
7. **Governance/evidence:** Confirm only exact source `640845815dc85672c2411b1b7d3ae48f17a86bc2` was qualified. Do not ascribe qualification to later documentation/evidence commits. No GitHub Actions or live Drive/device activity. No DEC-339/PR #157 activation.

After the blind phase, consult `dev/test-results/56e68fb7-2b1f-4b47-9969-9e871bd30f7a/result.json`, `result.md`, `terminal.log` and the publication `dev/_ca-output.md`. Published evidence reports **13/13 stages PASS**, focused BVP **634/634**, product suite **1308/1308**, build and artifact checks PASS, and physical dispatch disabled. Inspect the reports instead of relying on this synopsis. Earlier BLOCKED runs are historical evidence of corrected defects, not a license to omit present coverage.

## Required independent deliverable

Deliver **ACCEPT / ACCEPT WITH MINOR FINDINGS / CORRECTION REQUIRED / REJECT**, with finding IDs and severity, the exact source SHA/tree, source-anchored causal proof, prior-verdict corrections (if any), test/coverage assessment, and a clear next-role directive. When correction is required, handoff count must advance according to current per-feature governance; a Reviewer cannot self-correct production. Do not merge, approve PR #157 planner cutover, or claim DEC-362 accepted before completing this separate review.

**Owner guardrails:** No changes to locked decisions, no new complex recovery-artifact architecture, no GitHub Actions, no physical/live Drive operations, no unapproved activation/release. The product is single-user; manage stale/offline-device outcomes safely but keep concurrency design proportionate.
