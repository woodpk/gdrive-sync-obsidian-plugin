#!/usr/bin/env bash
set -euo pipefail
E=dev/evidence/_ca-output-agt-ca-p6-sync-foundation-failure-provenance-01.md
cat >> "$E" <<'EOF'

## THIRD SUPERVISOR REJECTION / T3 CORRECTION

### Correction authority and history preservation

- Third-review rejected source/test/document candidate: `dbec3f7a49ebea1e41c4dd71b2171649901ee346`.
- Third-review rejected evidence closure: `61f440551d1c305a849db6c585617122475bff6e`.
- Approved predecessor foundation: `96b4541b15012ac4ce0d81243b73ef779efd343e`.
- Approved predecessor contract tree: `4deb82e382f7957c731ef78db52b4164571d57a3`.
- T3 corrective rollback commit: `6f034f9c0c8db870399a1ea1773df162959e2474`.
- T3 corrected exact source/test/document candidate: `05600f7ca48a6726b72188005f29eddfc1191519`.
- T3 corrected `src/contracts` tree: `0db68ced179825f929008b502335210260ca2ce3`.
- The rollback and correction are normal descendants of the rejected history. No reset, force-push, squash-away, or history rewrite was used.
- `src/contracts/synchronization-foundation.ts` remained untouched and predecessor-identical.

### Correction of the prior proof record

The prior closure report was incorrect. It claimed that the exact-candidate proof passed `git diff --check` and passed overall. Authoritative GitHub state shows otherwise.

Prior claimed proof:

- run `33672336883`
- job `100388716273`

Actual GitHub conclusion:

- **failure**

Actual successful gates from that prior run:

- `npm ci = 0`
- `npm run typecheck = 0`
- `npx tsc -p tsconfig.test.json = 0`
- `npm test = 0`
- `npm run build = 0`
- `npm run check = 0`

Actual failing gate:

- `git diff --check = nonzero`
- reason = trailing whitespace in two newly appended `phase6-sync-contract-freeze.md` identity lines.

The prior artifact did not contain a completed `git-diff-check` status line or `overall-status.txt` because GitHub's Bash invocation retained inherited `errexit`; the script's earlier `set -uo pipefail` did not disable `-e`, so the nonzero diff check terminated the capture step early.

This historical incorrect evidence remains preserved above. This section corrects it append-only.

### T3-C1 — physically safe authentication

V1.3 now structurally distinguishes physically safe authentication failure from uncertain authentication failure.

A physically safe authentication result uses `ExecutionResultV1_3.status === "authentication-required"`, carries `AuthenticationOperationalFailureV1_3`, and requires `RetrySafePhysicalAuthorityV1_3` as `effectSafety`. Its disposition is:

- `primary = authentication-required`
- `physicalReconciliationRequired = false`
- `physicalRedispatchSafe = true`
- `retryMode = reauthenticate-then-retry`
- `mutationRedispatchAuthorized = false`

An uncertain authentication result remains `status === "uncertain"` with authentication provenance and yields:

- `primary = authentication-required`
- `physicalReconciliationRequired = true`
- `physicalRedispatchSafe = false`
- `retryMode = reauthenticate-then-reconcile`
- `mutationRedispatchAuthorized = false`

Thus a pre-dispatch/no-token rejection no longer fabricates physical recovery, while a may-have-dispatched authentication failure still requires physical reconciliation.

### T3-C2 — physical retry safety versus current dispatch authorization

`ExecutionDispositionV1_3` now exposes `physicalRedispatchSafe` separately from `mutationRedispatchAuthorized`.

`RetrySafePhysicalAuthorityV1_3` proves only that no unresolved may-have-dispatched physical effect exists. It does not satisfy scheduling, authentication, or rate-limit gates and therefore does not pre-authorize a future mutation dispatch.

For safe transient and safe rate-limited failures:

- `primary = deferred`
- `physicalReconciliationRequired = false`
- `physicalRedispatchSafe = true`
- `retryMode = ordinary-retry`
- `mutationRedispatchAuthorized = false`

For rate limiting, `retryAfterMs` remains sourced only from structured `OperationalFailureProvenanceV1_3` and exact timing is preserved. A later scheduler opportunity may authorize a new attempt only after operational gates are satisfied.

For uncertain transient/rate-limit/authentication failures:

- `physicalReconciliationRequired = true`
- `physicalRedispatchSafe = false`
- `mutationRedispatchAuthorized = false`

### T3-C3 — trailing whitespace and proof harness

The two trailing-whitespace defects in newly appended V1.3 freeze-document material were removed without changing approved predecessor bytes. Blank Markdown lines are used instead of two-space hard-break syntax.

The new disposable proof harness explicitly executes `set +e` before `set -uo pipefail`, captures every command status, writes `overall-status.txt`, and exits with the accumulated final status.

### Predictive tests

The reconstructed V1.3 predictive test surface retains the valid prior coverage and adds/repairs the T3 requirements:

- physically safe authentication execution/disposition chain;
- uncertain authentication remains reconciliation-gated;
- safe transient failure is physically retry-safe but not currently dispatch-authorized;
- safe rate-limit failure preserves exact `retryAfterMs = 5000`, is physically retry-safe, remains deferred, and is not currently dispatch-authorized;
- compile-time negative proof that physically safe authentication cannot omit no-unresolved-effect authority;
- retained negative proofs for duplicate retry timing, retryable transient/rate-limit without physical safety authority, and invalid provenance source/category combination;
- retained predecessor byte-prefix proofs and untouched synchronization-foundation blob proof.

Exact candidate test result: **440/440 tests passed**, 0 failed, 0 cancelled, 0 skipped, 0 todo.

### New exact-candidate verification

Disposable proof branch: `foundation-v1-3-t3-exact-proof-05600f7`.

Proof workflow commit: `a757231d59b64efca624f6c7ba9e4099dc5c4e66`.

Exact candidate checked out by SHA: `05600f7ca48a6726b72188005f29eddfc1191519` with `fetch-depth: 0` and Node 22.

Workflow run: `33676276728`.

Workflow job: `100401634991`.

Workflow run conclusion: **success**.

Workflow job conclusion: **success**.

Captured statuses:

- `exact-candidate-check=0`
- `npm-ci=0`
- `npm-run-typecheck=0`
- `npx-tsc-test=0`
- `npm-test=0`
- `npm-run-build=0`
- `npm-run-check=0`
- `git-diff-check=0`
- `overall=0`

The uploaded proof artifact contains `overall-status.txt` with exactly `0`.

Proof artifact:

- name: `foundation-v1-3-t3-exact-candidate-proof`
- artifact ID: `9864470461`
- size: `41928` bytes
- digest: `sha256:049113d1c6abf033f08d9fe64280f30083e95e4bdb669b68fe3ea77bc32ec126`
- created: `2026-09-02T19:56:43Z`
- expires: `2026-12-01T19:56:13Z`
- exact candidate recorded in artifact: `05600f7ca48a6726b72188005f29eddfc1191519`
- exact contract tree recorded in artifact: `0db68ced179825f929008b502335210260ca2ce3`

### Scope and stop boundary

No Workstream A, B, C, D, E, F, G, or H production implementation was modified by the T3 correction. No integration branch or canonical integration evidence was modified. The historical failed proof branch `foundation-v1-3-exact-proof-dbec3f7` remains preserved and unmerged. The new proof branch is disposable and unmerged. PR #47 must remain open, draft, and unmerged. H-U5-P1 remains paused. No downstream implementation is authorized by this candidate.
EOF

git config user.name "foundation-v1.3-t3-evidence-builder"
git config user.email "foundation-v1.3-t3-evidence-builder@users.noreply.github.com"
git add "$E"
git diff --cached --name-only | grep -Fx "$E"
test "$(git diff --cached --name-only | wc -l)" -eq 1
git commit -m "evidence: append third supervisor T3 correction closure"
git push origin HEAD:phase6-sync-foundation-v1.3-failure-provenance
