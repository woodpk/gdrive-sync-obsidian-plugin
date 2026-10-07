# S08F Post-Repair Product-Authority Recovery — BLOCKED Evidence Recovery

## Execution identity

- execution date: 2026-10-05
- task branch: `bvp-s08f-desktop-live-canary`
- task candidate: `d4da4ce85852e921126cf6517c5de12761b704ca`
- repaired implementation: `57e5be079ded16ba50b4f95c49f78a9d90b47f3f`
- disposable vault: `D:\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b`
- recovery harness blob: `390bfcaddabc56e3a7dea7e7fd7831664e2f3cfd`
- PowerShell: `7.6.6`
- Node: `v22.23.2`
- harness diagnostic workspace: `C:\s08f-c75ea54c75d8415399579893f074c61f`
- unpublished local evidence commit reported by the harness: `1d39c157e9f0b86b9d5c788e05f94e7b813486c1`

## Substantive physical result

**PHYSICAL PRODUCT-AUTHORITY RECOVERY: BLOCKED BEFORE RECOVERY PLAN PREVIEW/EXECUTION**

The execution conclusively demonstrated all of the following before the blocker:

- exact task identity PASS;
- exact repaired implementation identity PASS;
- isolated exact-SHA worktrees PASS;
- dependency installation PASS;
- test-platform compilation PASS;
- repaired ordinary production artifact PASS:
  - 886635 bytes;
  - SHA-256 `550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477`;
  - validation markers absent;
- repaired validation artifact PASS:
  - 911149 bytes;
  - SHA-256 `6c676900aaaf4aaa3417215d1eda2c16e578822715536ef1ffc0ca8741ffc9cf`;
  - source `57e5be079ded16ba50b4f95c49f78a9d90b47f3f`;
- preserved r2 physical state PASS:
  - r2 remains terminal sequence 3;
  - exact canary remains unchanged;
  - old installed validation artifact was observed before bounded replacement;
- helper syntax/self-check PASS;
- bounded repaired-validation installation PASS;
- `data.json` remained byte-identical;
- attempt-1 terminal rejected sequence-3 state remains preserved;
- r2 terminal rejected sequence-3 state remains preserved and was not replayed;
- exact canary remains preserved before recovery;
- disposable renderer reachable;
- prior S08F control quiesced before reload;
- repaired validation artifact successfully loaded from exact repaired source;
- repaired validation renderer/control state successfully quiesced;
- Drive mailbox inspection completed without mutation;
- Drive mailbox contained no logical r2 command outside sequences 1-3;
- local relay remained bounded to r2 records and its sequence-3 inbox record matched the durable rejected result.

The execution then BLOCKED at:

`r2recovery-uncertain-production-authority`

No product recovery preview or recovery-plan execution occurred after this failed precondition.

## Harness defect diagnosis

The blocker was caused by a supplementary recovery-harness defect, not by a demonstrated product defect.

The harness reloaded the plugin from the old validation build to the repaired validation build, then required `production.latestProductionRunReceipt()` to still expose the prior uncertain r2 receipt.

That receipt is held only in the production controller's private in-memory `latestReceipt` field. A plugin/runtime reload reconstructs the product controller and therefore clears that in-memory receipt. The durable recovery-required state survives independently.

Correct recovery authority must therefore require:

1. exact repository-preserved prior physical evidence proving the r2 uncertain receipt and zero committed/skipped operations;
2. exact retry-command identity;
3. live repaired controller status still equal to `recovery-required`;
4. if a live receipt does exist, it must agree exactly with the historical uncertain receipt.

It must not require an in-memory receipt to survive plugin reconstruction.

## Independent administrative defects observed

### Evidence publication defect

The harness attempted publication with a PowerShell argument expression that split the intended lease option into separate arguments. Git therefore interpreted the lease string as an additional refspec and GitHub rejected an invalid 40-hex branch name.

Observed remote error:

`GH002: branch or tag names consisting of 40 or 64 hex characters are not allowed`

The task branch did not move.

### Process-status propagation defect

The harness final report contained FAIL/BLOCKED stages but the parent launcher observed harness exit code `0`.

The repository-controlled harness used `[Environment]::ExitCode` without an explicit process exit at the end of the script, so the child `pwsh -File` invocation did not propagate the intended nonzero status reliably.

## Repair disposition

Repository repairs:

- `46db08a1c9a369ebb4e2105140487caad43de069` — bind r2 recovery authority across plugin reload and add fail-closed synthetic self-checks;
- `a9abc5d8565a977b7ca40c0d5896789dd6a9f82f` — repair exact-lease push argument construction and final process-status propagation.

The SUT/product implementation did not change.

## PHX-CI authority

This physical recovery harness is supplementary and does not replace PHX-CI.

The previously established authoritative PHX-CI repository-verification PASS remains valid because this execution and its repairs concern only supplementary physical-recovery tooling. No new authoritative repository-verification claim is made here.

## Rerun disposition under operating protocol Section 37.1

A subsequent owner execution of the repaired physical recovery is permitted and required because the relevant substantive physical recovery preview/execution **did not execute** after the failed harness precondition.

This is not an administrative-only rerun of a substantively passed physical recovery.

The next execution must continue to preserve these hard boundaries:

- never replay attempt 1;
- never replay or reset r2;
- do not use the working BRAIN vault;
- do not start a fresh canary in the same execution;
- do not begin S09.
