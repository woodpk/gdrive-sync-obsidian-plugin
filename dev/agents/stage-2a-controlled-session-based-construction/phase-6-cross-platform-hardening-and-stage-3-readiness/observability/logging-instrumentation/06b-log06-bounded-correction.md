# Phase 6 Logging Instrumentation — LOG-06B Bounded Correction

## 0. Agent Identity / Assignment

Agent:

`agt-ca-p6-log06b-bounded-correction-01`

Repository:

`woodpk/gdrive-sync-obsidian-plugin`

Task classification:

`BOUNDED IMPLEMENTATION CORRECTION`

Prompt maturity:

`EXECUTION-READY`

Your only job is to correct the one privacy defect identified by LOG-06A: request-body text embedded in diagnostic string fields can survive `sanitizeDiagnosticText` and therefore appear in the LOG-06 structured trace.

Do **not** run the full suite, redesign the bundle, perform evidence closure, merge, or begin LOG-07.

---

## 1. Exact Binding

Continue from exactly:

`LOG06B_INPUT_SHA = 0da6562bde442c2a6dc1f7a5df39ece7806e99ba`

Frozen original LOG-06 base for diff context:

`8cb7f02930c58313c8ad6f2e25537a7d5b231a57`

Required branch:

`phase6-logging-log06-diagnostic-bundle-operator-surface`

Bound defect:

> `src/diagnostics/diagnostic-logger.ts :: sanitizeDiagnosticText` redacts authorization headers, OAuth/query values, tokens, and URLs, but does not redact request-body/requestBody assignments. A value such as `safeMessage="requestBody=SENTINEL_BODY"` can therefore be retained in `DiagnosticLogger.snapshot()` and serialized unchanged by LOG-06 `structuredTrace`.

Authorized correction boundary:

- production symbol: `src/diagnostics/diagnostic-logger.ts :: sanitizeDiagnosticText`;
- focused regression coverage only in the directly relevant LOG-06/diagnostic privacy test(s), including the existing LOG-06 privacy test that injects `requestBody=SENTINEL_BODY`;
- minimum adjacent sanitizer context required to implement the correction safely.

Do not substitute a moving branch tip for `LOG06B_INPUT_SHA`.

---

## 2. Required Work — One Defect Only

1. Verify repository identity, required branch, and exact input SHA.
2. Inspect `sanitizeDiagnosticText` and the directly relevant focused privacy test(s).
3. Extend the existing diagnostic text sanitizer only far enough to redact request-body assignments in diagnostic strings. Cover the naming forms actually used or reasonably represented by the existing sanitizer/test conventions, including `requestBody=` and request-body equivalents if the sanitizer already supports normalized variants.
4. Preserve the frozen diagnostic event schema, field meanings, ordering, and every synchronization/Drive/auth/state/recovery behavior.
5. Do not modify `diagnostic-bundle.ts` unless the correction cannot be made at the identified sanitizer boundary; if that occurs, stop instead of broadening scope.
6. Add or adjust only the focused regression necessary to prove the sentinel request-body value is absent while ordinary safe diagnostic text remains intact.
7. Run only:
   - `npm run typecheck`;
   - the directly affected focused diagnostic/LOG-06 test file(s);
   - `git diff --check 0da6562bde442c2a6dc1f7a5df39ece7806e99ba..<NEW_IMPLEMENTATION_SHA>` after committing, or the equivalent correction-delta check before commit.
8. Commit and push the correction to the existing LOG-06 branch.
9. Return the exact new implementation SHA and stop.

If this requires any independent defect repair, stop and report it. Do not absorb it into this task.

---

## 3. Scope Protection

Expected production change:

- `src/diagnostics/diagnostic-logger.ts`

Permitted additional change:

- only the directly relevant focused test file(s) necessary to prove this redaction defect.

Protected behavior:

- synchronization semantics;
- Google Drive mutation semantics;
- retry/authentication behavior;
- authority/state/CAS/recovery semantics;
- approved LOG-01/02/03/04/05 event meanings;
- LOG-06 bundle schema and operator feature set;
- release/version packaging.

Do not redesign the diagnostic bundle or broaden the feature set.

---

## 4. Verification Limits

Do **not** run:

- the complete `npm test` suite;
- `npm run build`;
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
- alter the diagnostic schema or event semantics;
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
- Input SHA: `0da6562bde442c2a6dc1f7a5df39ece7806e99ba`
- Branch: `phase6-logging-log06-diagnostic-bundle-operator-surface`
- New implementation SHA: `<sha or N/A>`

### CORRECTION
- Defect: `request-body assignment text could survive sanitizeDiagnosticText and enter structuredTrace`
- Files changed: `<complete correction file list>`
- Scope note: `<one sentence confirming only the bound sanitizer defect was addressed>`

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