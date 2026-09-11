# Phase 6 Logging Instrumentation — LOG-06B Bounded Correction

## 0. Agent Identity / Assignment

Agent:

`agt-ca-p6-log06b-bounded-correction-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`BOUNDED IMPLEMENTATION CORRECTION`

Prompt maturity:

`PREPLANNED / REQUIRES SUPERVISOR BINDING`

Your only job is to implement **one supervisor-identified LOG-06 defect** on the existing LOG-06 branch, add or update only the focused test needed for that defect, and stop.

Do **not** run the full suite, perform evidence closure, merge, or begin LOG-07.

---

## 1. Required Supervisor Bindings

This prompt is not executable until the supervisor supplies all three values below:

`LOG06B_INPUT_SHA = <exact implementation SHA to continue from>`

`LOG06B_DEFECT = <one precise defect statement>`

`LOG06B_CORRECTION_BOUNDARY = <smallest authorized file/symbol/test boundary>`

The expected starting candidate, unless superseded by a later supervisor-approved SHA, is:

`0da6562bde442c2a6dc1f7a5df39ece7806e99ba`

Frozen original LOG-06 base for diff context:

`8cb7f02930c58313c8ad6f2e25537a7d5b231a57`

Required branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

Do not substitute a moving branch tip for the exact bound input SHA.

---

## 2. Required Work — One Defect Only

1. Verify repository identity, branch, and exact `LOG06B_INPUT_SHA`.
2. Inspect only:
   - the exact file/symbol named in `LOG06B_CORRECTION_BOUNDARY`;
   - the directly relevant focused LOG-06 test(s);
   - the minimum interface context needed to make the correction safely.
3. Implement the smallest deterministic correction that resolves `LOG06B_DEFECT`.
4. Add or adjust only the focused test coverage necessary to prove that correction.
5. Run only:
   - `npm run typecheck`;
   - the focused LOG-06 test file(s) directly affected by the correction;
   - `git diff --check` for the correction delta.
6. Commit and push the corrected implementation to the existing LOG-06 branch.
7. Return the exact new implementation SHA and stop.

If the correction requires a second independent defect repair, stop and report that dependency. Do not absorb it into this task.

---

## 3. Scope Protection

Permitted changes:

- only files necessary for the bound correction;
- only focused LOG-06 tests necessary to prove it.

Protected behavior:

- synchronization semantics;
- Google Drive mutation semantics;
- retry/authentication behavior;
- authority/state/CAS/recovery semantics;
- approved LOG-01/02/03/04/05 event meanings;
- release/version packaging.

Do not redesign the diagnostic bundle or broaden the feature set.

---

## 4. Verification Limits

Do **not** run:

- the complete `npm test` suite;
- `npm run build` unless the bound correction specifically affects bundling/buildability and the supervisor explicitly adds that requirement;
- release workflows;
- live synchronization;
- Drive access.

Full-suite/build verification belongs to LOG-06C.

---

## 5. Prohibitions

Do not:

- restart LOG-06 from the frozen base;
- rewrite already-correct LOG-06 work;
- fix unbound defects;
- modify CI merely to obtain logs;
- create the final LOG-06 evidence file;
- merge PR #76;
- integrate LOG-06;
- begin LOG-07 or B01;
- claim supervisor approval.

---

## 6. Required Return

Return exactly:

```markdown
### STATUS
`COMPLETE | BLOCKED | FAILED`

### PROVENANCE
- Input SHA: `<LOG06B_INPUT_SHA>`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`
- New implementation SHA: `<sha or N/A>`

### CORRECTION
- Defect: `<bound defect>`
- Files changed: `<complete correction file list>`
- Scope note: `<one sentence confirming only the bound defect was addressed>`

### VERIFICATION
- Focused tests: `<count>/<count> PASS | FAIL | NOT RUN>`
- Typecheck: `PASS | FAIL | NOT RUN`
- `git diff --check`: `PASS | FAIL | NOT RUN`

### RESULT
`<2–4 concise sentences describing the correction>`

### LIMITATIONS / BLOCKERS
`<none, or exact unresolved dependency>`

### STOP STATE
`Correction committed and pushed. Full-suite/build/evidence verification not performed; LOG-06C is next.`
```

Do not add narrative before or after the block.