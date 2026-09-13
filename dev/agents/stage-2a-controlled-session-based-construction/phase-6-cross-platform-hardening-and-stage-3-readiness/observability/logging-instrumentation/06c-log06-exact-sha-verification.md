# Phase 6 Logging Instrumentation — LOG-06C Exact-SHA Verification

## 0. Agent Identity / Assignment

Agent:

`agt-ca-p6-log06c-exact-sha-verification-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`VERIFICATION ONLY`

Prompt maturity:

`PREPLANNED / REQUIRES SUPERVISOR BINDING`

Your only job is to independently verify one exact LOG-06 implementation SHA and report the exact result.

Do **not** repair code, write evidence, merge, or begin LOG-07.

---

## 1. Required Supervisor Binding

This prompt is not executable until the supervisor supplies:

`LOG06C_IMPLEMENTATION_SHA = <exact implementation SHA to verify>`

Frozen original LOG-06 base for diff verification:

`8cb7f02930c58313c8ad6f2e25537a7d5b231a57`

Expected branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

The implementation SHA may be the original candidate `0da6562bde442c2a6dc1f7a5df39ece7806e99ba` if LOG-06A found no correction, or a later supervisor-approved LOG-06B correction SHA.

Do not verify a moving branch tip. Resolve and verify the exact bound SHA first.

---

## 2. Required Work — Verification Only

Against exactly `LOG06C_IMPLEMENTATION_SHA`:

1. Verify repository identity and exact checkout/HEAD.
2. Run:

```text
npm ci
npm run typecheck
```

3. Run the repository's test TypeScript compilation step if separate from `npm test`.
4. Run the focused LOG-06 test file(s) and record the exact non-zero pass/fail count.
5. Run the complete automated test suite once and record the exact total/pass/fail count.
6. Run:

```text
npm run build
git diff --check 8cb7f02930c58313c8ad6f2e25537a7d5b231a57..LOG06C_IMPLEMENTATION_SHA
```

7. Inspect the complete frozen-base-to-implementation changed-file list and confirm it remains within LOG-06 ownership.
8. Report the exact results and stop.

If the full suite fails, capture and return:

- exact failing test name(s);
- exact assertion/error;
- expected/actual values when present;
- source/test file and line when present;
- exact suite counts.

Then stop. Do not diagnose beyond what the fresh failure directly establishes and do not change code.

---

## 3. Verification Rules

- A historical CI failure is not authoritative for this task; this fresh exact-SHA verification is authoritative.
- If using CI, ensure the workflow checks out the exact bound SHA.
- Preserve the fresh failing output sufficiently to quote the exact failure in the return block.
- Do not rerun repeatedly in search of a green result. One clean verification attempt is the task; rerun only if the first attempt is invalid because of an explicit infrastructure failure unrelated to the repository.

---

## 4. Prohibitions

Do not:

- edit production code or tests;
- modify CI/workflow files as part of the LOG-06 implementation;
- create the LOG-06 evidence file;
- merge PR #76;
- integrate LOG-06;
- begin LOG-07, B01, release, or live Drive work;
- weaken tests;
- infer a repair from a failure and implement it.

If verification fails because of a genuine LOG-06 defect, return the exact failure so the supervisor can issue a new bounded LOG-06B repair prompt.

---

## 5. Required Return

Return exactly:

```markdown
### STATUS
`COMPLETE | FAILED | BLOCKED`

### PROVENANCE
- Base SHA: `8cb7f02930c58313c8ad6f2e25537a7d5b231a57`
- Verified implementation SHA: `<LOG06C_IMPLEMENTATION_SHA>`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`

### CHANGED FILES
- `<complete frozen-base-to-implementation file list>`

### VERIFICATION
- `npm ci`: `PASS | FAIL | NOT RUN`
- Typecheck: `PASS | FAIL | NOT RUN`
- Test TypeScript compilation: `PASS | FAIL | NOT RUN`
- Focused LOG-06 tests: `<count>/<count> PASS | FAIL | NOT RUN`
- Full tests: `<count>/<count> PASS | FAIL | NOT RUN`
- Build: `PASS | FAIL | NOT RUN`
- `git diff --check`: `PASS | FAIL | NOT RUN`

### FAILURE
`N/A`, or:
- Test: `<exact name>`
- Error/assertion: `<exact failure>`
- Expected/actual: `<values or N/A>`
- Location: `<file:line or N/A>`

### SCOPE RESULT
`PASS | FAIL` — `<one sentence>`

### STOP STATE
`Verification only complete. No code/evidence/merge changes performed.`
```

Do not add narrative before or after the block.