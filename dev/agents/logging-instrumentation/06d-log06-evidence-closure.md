# Phase 6 Logging Instrumentation — LOG-06D Evidence Closure

## 0. Agent Identity / Assignment

Agent:

`agt-ca-p6-log06d-evidence-closure-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`EVIDENCE CLOSURE ONLY`

Prompt maturity:

`PREPLANNED / REQUIRES SUPERVISOR BINDING`

Your only job is to write and commit the final LOG-06 evidence record for an implementation SHA that has already passed LOG-06C verification.

Do **not** modify implementation code or tests, rerun the full suite, merge, or begin LOG-07.

---

## 1. Required Supervisor Bindings

This prompt is not executable until the supervisor supplies:

`LOG06D_VERIFIED_IMPLEMENTATION_SHA = <exact SHA that passed LOG-06C>`

`LOG06D_VERIFICATION_RESULTS = <exact LOG-06C verification summary/results>`

Frozen original LOG-06 base:

`8cb7f02930c58313c8ad6f2e25537a7d5b231a57`

Required branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

Required evidence file:

`dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`

Do not substitute a moving branch tip for the exact verified implementation SHA.

---

## 2. Required Work — Evidence File Only

1. Verify repository identity and that the branch contains exactly `LOG06D_VERIFIED_IMPLEMENTATION_SHA` as the implementation state to document.
2. Inspect the frozen-base-to-implementation changed-file list only as needed to record provenance accurately.
3. Use the supplied LOG-06C results. Do **not** rerun the full suite, build, or typecheck.
4. Create exactly the required evidence file and include:
   - agent/work-package/task identity;
   - Wave `W3`;
   - frozen base SHA;
   - verified implementation SHA;
   - branch;
   - complete implementation changed-file list;
   - bundle schema/version and implemented sections as established by the implementation;
   - safe state/audit/attention projection summary;
   - operator `Copy diagnostic bundle` behavior;
   - exact focused/full verification counts and typecheck/build/diff-check results supplied by LOG-06C;
   - privacy/non-authority statement;
   - statement that export performs no Drive/synchronization mutation;
   - limitations, if any;
   - exact stop state.
5. Commit **only** that evidence file as a separate evidence commit.
6. Push the branch and return the implementation SHA, evidence SHA, and evidence-file path.
7. Stop for supervisor review.

---

## 3. Prohibitions

Do not:

- change production source;
- change tests;
- change CI/workflows;
- rerun npm install/typecheck/tests/build;
- repair any defect;
- merge PR #76;
- integrate LOG-06;
- begin LOG-07, release, B01, or live Drive work;
- claim supervisor approval.

If the supplied verification results are incomplete or inconsistent, stop and identify the exact missing datum. Do not fill gaps by inference.

---

## 4. Evidence Commit Integrity

The evidence commit must be exactly one commit after the verified implementation state unless the supervisor explicitly supplies a different branch state.

The implementation-to-evidence diff must contain only:

`dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`

If any other file would be included, stop without committing and report the unexpected branch state.

---

## 5. Required Return

Return exactly:

```markdown
### STATUS
`COMPLETE | BLOCKED | FAILED`

### PROVENANCE
- Base SHA: `8cb7f02930c58313c8ad6f2e25537a7d5b231a57`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`
- Verified implementation SHA: `<LOG06D_VERIFIED_IMPLEMENTATION_SHA>`
- Evidence SHA: `<sha or N/A>`

### EVIDENCE
- File: `dev/evidence/_ca-output-agt-ca-p6-log06-diagnostic-bundle-operator-surface-01.md`
- Evidence-only diff: `PASS | FAIL | NOT RUN`

### RECORDED VERIFICATION
- Focused tests: `<count>/<count> PASS`
- Full tests: `<count>/<count> PASS`
- Typecheck: `PASS`
- Test TypeScript compilation: `PASS`
- Build: `PASS`
- `git diff --check`: `PASS`

### RESULT
`<2–4 concise sentences describing evidence closure only>`

### LIMITATIONS / BLOCKERS
`<none, or exact missing/inconsistent verification datum>`

### STOP STATE
`Evidence committed and pushed. No implementation/merge/integration/LOG-07 work performed. Supervisor review is next.`
```

Do not add narrative before or after the block.