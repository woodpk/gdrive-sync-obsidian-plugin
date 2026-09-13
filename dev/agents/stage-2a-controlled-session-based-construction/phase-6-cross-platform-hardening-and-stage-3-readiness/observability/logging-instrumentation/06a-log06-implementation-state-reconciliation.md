# Phase 6 Logging Instrumentation — LOG-06A Implementation-State Reconciliation

## 0. Agent Identity / Assignment

Agent:

`agt-ca-p6-log06a-implementation-state-reconciliation-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`RECONCILIATION / READ-ONLY`

Prompt maturity:

`EXECUTION-READY`

Your only job is to determine the exact implementation state of the existing LOG-06 candidate and identify whether one bounded correction is required before verification.

Do **not** implement, repair, verify the full suite, create evidence, merge, or begin LOG-07.

---

## 1. Authoritative Inputs

Frozen LOG-06 base:

`LOG06_BASE_SHA = 8cb7f02930c58313c8ad6f2e25537a7d5b231a57`

Existing LOG-06 implementation candidate:

`LOG06_CANDIDATE_SHA = 0da6562bde442c2a6dc1f7a5df39ece7806e99ba`

Existing branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

Existing unmerged PR:

`#76`

Original LOG-06 behavioral specification:

`dev/agents/logging-instrumentation/06-diagnostic-bundle-operator-surface.md`

Historical CI failure is known but its exact failing assertion is not authoritative and must not be reconstructed speculatively.

---

## 2. Required Work — Nothing More

1. Verify repository identity and that `LOG06_CANDIDATE_SHA` resolves.
2. Inspect the complete diff:

   `8cb7f02930c58313c8ad6f2e25537a7d5b231a57..0da6562bde442c2a6dc1f7a5df39ece7806e99ba`

3. Record the complete changed-file list.
4. Inspect only the changed LOG-06 production/test files plus the minimum directly referenced interfaces needed to understand them.
5. Reconcile the candidate against the LOG-06 specification at a feature level:
   - diagnostic bundle module/schema;
   - sanitized state projection;
   - retained structured trace inclusion;
   - correlation/failure index;
   - audit/attention projections;
   - runtime export/read wiring;
   - `Copy diagnostic bundle` operator command;
   - clipboard/Notice failure behavior;
   - focused LOG-06 tests/privacy assertions.
6. Determine one of exactly two outcomes:
   - `NO_CORRECTION_IDENTIFIED`: static inspection finds no concrete LOG-06 defect; proceed to independent verification.
   - `ONE_BOUNDED_CORRECTION_REQUIRED`: identify exactly one concrete implementation defect, with exact file/symbol/test evidence and the smallest correction boundary.

Do not search for additional speculative defects once the required classification is possible.

---

## 3. Prohibitions

Do not:

- modify any file;
- commit or push anything;
- run the complete test suite;
- run build/release workflows;
- create or edit CI workflows;
- create evidence;
- merge PR #76;
- change synchronization/Drive/auth/state/recovery behavior;
- begin LOG-07 or B01;
- diagnose the historical CI failure from incomplete logs;
- invent a defect merely because the historical suite was red.

A read-only repository inspection is sufficient for this task.

---

## 4. Stop Conditions

Stop immediately after producing the required reconciliation result.

If the candidate SHA cannot be resolved or the diff is unavailable, return the exact repository/access error and stop.

If more than one concrete implementation defect is visible, report them as separate bounded findings but designate only the **first dependency-ordered defect** as the next authorized correction target. Do not repair any of them.

---

## 5. Required Return

Return exactly:

```markdown
### STATUS
`COMPLETE | BLOCKED`

### PROVENANCE
- Base SHA: `8cb7f02930c58313c8ad6f2e25537a7d5b231a57`
- Candidate SHA: `0da6562bde442c2a6dc1f7a5df39ece7806e99ba`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`

### CHANGED FILES
- `<complete candidate diff file list>`

### RECONCILIATION
- Bundle/schema: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Safe state projection: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Structured trace: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Correlation index: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Audit/attention projection: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Runtime export wiring: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Operator command: `PRESENT | MISSING | DEFECT IDENTIFIED`
- Focused tests/privacy coverage: `PRESENT | MISSING | DEFECT IDENTIFIED`

### DECISION
`NO_CORRECTION_IDENTIFIED | ONE_BOUNDED_CORRECTION_REQUIRED`

### NEXT CORRECTION TARGET
`N/A`, or:
- File/symbol: `<exact location>`
- Defect: `<one precise defect>`
- Required correction boundary: `<smallest safe change>`
- Evidence: `<exact code/test observation>`

### STOP STATE
`Read-only reconciliation complete. No repository mutation performed.`
```

Do not add narrative before or after the block.