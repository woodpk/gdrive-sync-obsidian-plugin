# H-U5 — TARGETED REPAIR OF CLASSIFIED INTEGRATION FAILURES

## Agent

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-02`

Predecessor:

`AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-01`

## Repository / branch

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Writable branch: `phase6-sync-integration-h`

Frozen Phase 6 v1.2 foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`

Approved H-U4 source/test authority: `84cae684607be10b57ec5569bab14a819bad822f`

Approved H-U4 closure/evidence authority: `14b38332416096b17ccc625d12bbc4fe49ca9328`

Frozen contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`

Canonical evidence blob that must remain unchanged: `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`

---

# 1. EXECUTION ARCHITECTURE — MANDATORY

The predecessor H agent lost multiple execution windows attempting local checkout/dependency/test execution.

**Do not repeat that execution pattern.**

For this H-U5 unit:

- use GitHub repository reads/comparisons to inspect code and history;
- make authorized repository edits directly on `phase6-sync-integration-h` through GitHub repository file-write operations;
- do **not** create a local repository clone;
- do **not** run `npm ci`, TypeScript compilation, tests, builds, or Git commands in the ChatGPT local/container environment;
- do **not** use Replit, Codespaces, or any other external execution service;
- delegate all npm/test/build/diff-check execution to one disposable GitHub Actions proof branch after the code correction is committed;
- do not alter the repository's existing production CI workflow;
- do not spin in repeated polling/retry loops.

If the required GitHub read/write or Actions capability is unavailable, stop with:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

Do not improvise a local execution environment.

---

# 2. H-U4 IS APPROVED AND CLOSED

Do not re-run or re-derive H-U4 classification as an entry exercise.

Accepted H-U4 ledger:

- `OBSOLETE-LEGACY-FIXTURE`: 34 FAIL + 25 CANCELLED = 59 non-pass results;
- `WORKER-DEFECT — G`: 13 FAIL;
- `H-INTEGRATION-DEFECT`: 0;
- `UNRELATED-PREEXISTING`: 0.

The 13 `WORKER-DEFECT — G` failures remain G-owned and are **not authorized for repair in this H-U5 unit**.

---

# 3. THIS UNIT'S EXACT AUTHORIZED REPAIR PACKAGE

This H-U5 unit authorizes exactly one causal package:

## H-U5-P1 — obsolete physical-controller construction fixtures

Authorized classification:

`OBSOLETE-LEGACY-FIXTURE`

Authorized files:

1. `test/phase5-controller.test.ts` — 4 H-U4 failures;
2. `test/phase5-group-a-recovery-state.test.ts` — 1 H-U4 failure;
3. `test/phase5-group-b-scope-transfer.test.ts` — 3 H-U4 failures.

Total authorized failing results:

`8`

Known causal family from approved H-U4:

These legacy tests construct the current physical controller using pre-Phase-6 fixture assumptions and omit now-required durable authority / reliable mutation / recovery seams. Production correctly fails closed; the stale fixtures must be modernized to provide the current required dependencies while preserving the tests' original behavioral assertions.

This is **test-fixture modernization**, not production redesign.

No other H-U4 failure family is authorized in this unit.

---

# 4. ENTRY GATE — GITHUB-ONLY

Before editing, perform only these bounded checks through GitHub:

1. confirm `phase6-sync-integration-h` exists and record its current head as `H_U5_ENTRY_HEAD`;
2. confirm approved H-U4 closure `14b38332416096b17ccc625d12bbc4fe49ca9328` is an ancestor of `H_U5_ENTRY_HEAD`;
3. inspect commits between `14b38332416096b17ccc625d12bbc4fe49ca9328` and `H_U5_ENTRY_HEAD` and confirm they are supervisor/tasking/evidence-only changes, not unauthorized production/test changes;
4. confirm `src/**` and `test/**` at entry still match the approved H-U4 source/test authority except for supervisor-authorized tasking/evidence files outside those trees;
5. confirm `src/contracts/**` tree remains exactly `4deb82e382f7957c731ef78db52b4164571d57a3`;
6. fetch the three authorized test files and the minimum current production/test-support files needed to understand the required constructor/dependency shape;
7. read the approved H-U4 evidence relevant to these eight failures; do not reproduce the failures locally.

The approved H-U4 evidence already establishes the before-state failure. Do **not** consume time recreating it before editing.

If entry invariants fail, stop.

---

# 5. REPAIR RULES

Modify only the three authorized test files unless a required shared test helper is proven unavoidable.

If a shared test helper outside those three files must change, **stop before editing it** and report the exact helper/path and why it is necessary.

For the three authorized fixtures:

- supply the current required production dependencies using existing approved production/test support interfaces;
- preserve the original behavioral assertion of every test;
- preserve fail-closed production semantics;
- do not add permissive fallback behavior to production;
- do not weaken assertions;
- do not skip, delete, rename away, or disable tests;
- do not change production code merely to support stale fixture construction;
- do not modify `src/contracts/**`;
- do not touch G adversarial-model production or tests;
- do not repair any other obsolete fixture family in this unit.

Use the smallest correct test-fixture correction.

Make the authorized test edits on `phase6-sync-integration-h` through GitHub file-write operations.

After all three files are corrected, record the resulting branch SHA as:

`H_U5_P1_CANDIDATE_SHA`

Before verification, compare:

`H_U5_ENTRY_HEAD...H_U5_P1_CANDIDATE_SHA`

The code/test delta must contain only the three authorized test files.

If any other file changed, stop and correct the scope before testing.

---

# 6. VERIFICATION — ONE DISPOSABLE GITHUB ACTIONS BRANCH

Do not test locally.

Create one disposable branch directly from:

`H_U5_P1_CANDIDATE_SHA`

Preferred name:

`h-u5-p1-proof-h02`

If that name already exists, use a unique successor suffix; do not overwrite or force-update an existing branch.

On the disposable branch only, add:

`.github/workflows/h-u5-p1-proof.yml`

The workflow must explicitly check out `H_U5_P1_CANDIDATE_SHA`, use Node 22, run `npm ci`, and execute the following bounded verification in this order.

## Required verification commands

### A. Authority / environment

- verify `git rev-parse HEAD` equals `H_U5_P1_CANDIDATE_SHA`;
- print Node/npm versions.

### B. Static/build gates

Run directly:

`npm run typecheck`

`npm run build`

`git diff --check 84cae684607be10b57ec5569bab14a819bad822f...H_U5_P1_CANDIDATE_SHA`

These must return `0`.

### C. Focused repaired fixtures

Compile tests without executing the full suite:

`npx tsc -p tsconfig.test.json`

Then run exactly:

`node --test .test-build/test/phase5-controller.test.js .test-build/test/phase5-group-a-recovery-state.test.js .test-build/test/phase5-group-b-scope-transfer.test.js`

Capture its real process exit code directly.

Acceptance:

- focused command exit code = `0`;
- all tests in those three files pass;
- no skipped/cancelled/todo results.

### D. Broader regression measurement

Run:

`npm test`

directly, with no `tee` masking.

Capture the real npm exit status immediately.

The full suite is **expected to remain nonzero** because unrelated accepted H-U4 failures remain.

Given the approved H-U4 baseline and this eight-failure-only package, the expected full-suite surface is:

- tests: `656`;
- pass: `592`;
- fail: `39`;
- cancelled: `25`;
- skipped: `0`;
- todo: `0`.

This expected delta is:

- eight formerly failing authorized results become pass;
- the 13 G worker defects remain untouched;
- all other obsolete legacy fixture results remain untouched.

If the full-suite totals materially differ from this expected surface, do not broaden the repair; record the discrepancy and stop for supervisor review.

### E. Frozen invariants

Verify from the candidate checkout:

- `src/contracts/**` tree = `4deb82e382f7957c731ef78db52b4164571d57a3`;
- canonical `dev/evidence/_ca-output.md` blob = `d4c610ccbc6cbbd6d58f548525239bb6d61e1f73`.

### F. Evidence artifact

Upload the focused-test log, full-test log, exit-code record, typecheck/build logs, and invariant results as one GitHub Actions artifact.

Use `include-hidden-files: true` if storing evidence under a dot-directory.

The proof workflow itself must be isolated to the disposable branch and must never be merged into `phase6-sync-integration-h`.

---

# 7. NO EXECUTION SPIN

Once the disposable workflow is triggered:

- inspect the resulting run normally;
- do not repeatedly recreate the branch;
- do not repeatedly edit/retrigger the workflow unless a demonstrable workflow-definition defect prevented the intended commands from executing;
- do not switch to local execution because a run is pending;
- if the workflow itself has a bounded mechanical defect, correct only that workflow on the disposable branch and rerun once;
- if verification reveals a source/test defect, stop and report rather than entering an open-ended repair loop.

This unit should require one code correction cycle and one verification cycle, not exploratory execution.

---

# 8. EVIDENCE CLOSURE

After successful verification, append an `H-U5-P1` section to:

`dev/evidence/_ca-output-AGT-H-CA-STAGE-2A-PHASE-6-SYNC-HARDENING-SERIAL-INTEGRATION-02.md`

Record:

- `H_U5_ENTRY_HEAD`;
- `H_U5_P1_CANDIDATE_SHA`;
- authorized classification/package;
- the three authorized files;
- approved before-state: 8 failures;
- exact fixture correction made in each file;
- confirmation production code was not changed;
- focused proof run ID/job ID;
- focused result counts and exit code;
- `npm run typecheck` exit code;
- `npm run build` exit code;
- `git diff --check` result;
- full `npm test` real exit code;
- full-suite totals after repair;
- proof artifact ID and digest;
- frozen-contract result;
- canonical-evidence result;
- remaining accepted H-U4 non-pass families;
- disposable proof branch name/state.

Commit/push this evidence append on `phase6-sync-integration-h`.

Record the resulting evidence closure SHA as:

`H_U5_P1_EVIDENCE_SHA`

Then verify:

- `H_U5_ENTRY_HEAD...H_U5_P1_CANDIDATE_SHA` contains only the three authorized test files;
- `H_U5_P1_CANDIDATE_SHA...H_U5_P1_EVIDENCE_SHA` contains only the H-02 evidence file;
- `src/contracts/**` remains frozen;
- canonical `_ca-output.md` remains unchanged;
- PR #45 remains open, draft, and unmerged.

Do not modify the predecessor H-01 evidence file.

---

# 9. REMAINING FAILURES ARE NOT AUTHORIZED HERE

Even if H-U5-P1 succeeds, additional known work remains.

Do not repair it in this unit.

Known remaining categories after a successful P1 are expected to include:

- the remaining obsolete legacy fixture failures/cancellations;
- all 13 `WORKER-DEFECT — G` failures, which remain G-owned unless explicitly reassigned.

Do not begin a second H-U5 repair package merely because turn capacity remains.

Do not begin H-FINAL.

---

# 10. TEMPORARY BRANCH CLEANUP

If a direct branch-delete operation is available, delete the disposable proof branch after evidence capture.

If deletion is not directly available, leave it unmerged and record that state.

Do not spend execution time trying alternate cleanup methods.

An unmerged disposable proof branch is not a completion blocker.

---

# 11. HARD BOUNDARIES

Do not:

- use a local clone/container to execute the repository;
- use Replit or another external service;
- modify production code;
- modify `src/contracts/**`;
- modify canonical `dev/evidence/_ca-output.md`;
- modify worker branches;
- modify `phase6-integration`, `main`, or `master`;
- repair G;
- repair any fixture outside the three authorized files;
- merge PR #45;
- merge the disposable proof branch;
- begin H-FINAL;
- run a physical synchronization test.

---

# 12. COMPLETION / STOP STATE

This unit is complete when H-U5-P1 is corrected, verified, evidenced, and pushed.

Report only:

1. `H_U5_ENTRY_HEAD`;
2. `H_U5_P1_CANDIDATE_SHA`;
3. `H_U5_P1_EVIDENCE_SHA`;
4. files changed;
5. focused proof run ID/job ID;
6. focused test result/exit code;
7. typecheck/build/diff-check results;
8. full-suite real exit code and totals;
9. proof artifact ID/digest;
10. frozen-contract result;
11. canonical-evidence result;
12. PR #45 state;
13. disposable proof-branch cleanup state;
14. remaining classified failure counts/categories.

Then end exactly:

`H-U5-P1 COMPLETE — READY FOR SUPERVISOR REVIEW — DO NOT START ANOTHER H-U5 PACKAGE OR H-FINAL`

If a required change falls outside the authorized three test files:

`BLOCKED — SUPERVISOR DECISION REQUIRED`

If capacity is exhausted after a safe committed state:

`TURN CAPACITY EXHAUSTED / CONTINUATION REQUIRED — H-U5-P1 NOT COMPLETE`
