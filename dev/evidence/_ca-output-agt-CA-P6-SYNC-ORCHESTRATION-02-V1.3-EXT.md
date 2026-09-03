# Workstream D — V1.3 Failure-Provenance Extension Evidence — D-C1 Closure

## Evidence-only correction scope

This artifact closes D-C1 only. It records evidence for the unchanged Agent D V1.3 source/test candidate and does not authorize or record any production/test repair.

- Shared extension base SHA: `7fa9dd2c95f940260594cefa2674963be3a785de`
- Frozen V1.3 `src/contracts/**` tree: `0db68ced179825f929008b502335210260ca2ce3`
- Unchanged source/test SHA: `7981717796f929d8ce155a753583fbc5ce11c87c`
- Exact source/test manifest between the shared base and source/test SHA:
  - `src/product/authoritative-production-executor.ts`
  - `test/workstreams/orchestration/v1.3-failure-provenance-extension.test.ts`

The base-to-source/test comparison contains exactly those two paths. `src/contracts/**` is unchanged, and the contract-tree identity at the source/test SHA was independently rechecked as `0db68ced179825f929008b502335210260ca2ce3` before this evidence-only correction.

## V1.3 physical-result / provenance mapping

The implementation preserves D's existing durable physical-effect lifecycle and adapts only the authoritative return surface to `ExecutionResultV1_3`. Operational failure provenance describes cause/disposition; it is never treated as proof that an unresolved physical effect was not applied.

| Physical observation | Structured operational provenance | `ExecutionResultV1_3` mapping | Retry/effect safety authority |
| --- | --- | --- | --- |
| remote `outcome-unknown` | authentication | `uncertain` + preserved authentication provenance | none |
| remote `outcome-unknown` | transient-failure | `uncertain` + preserved transient provenance | none |
| remote `outcome-unknown` | rate-limited | `uncertain` + preserved rate-limit provenance, including exact `retryAfterMs` when supplied | none |
| remote `outcome-unknown` | absent/other trustworthy provenance | `uncertain`; provenance is omitted when absent | none |
| local `outcome-unknown` | authentication/transient-failure/rate-limited or other trustworthy typed provenance | `uncertain` + preserved provenance | none |
| local `outcome-unknown` | no provenance | `uncertain` without fabricated provenance | none |
| `verified-not-applied` | authentication | `authentication-required` + explicit `effectSafety` | physically safe because the effect was independently verified not applied |
| `verified-not-applied` | transient-failure | `retryable-failure` + explicit `retrySafety` | retry-safe because the effect was independently verified not applied |
| `verified-not-applied` | rate-limited | `retryable-failure` + explicit `retrySafety`; retry timing remains only in provenance | retry-safe because the effect was independently verified not applied |
| `verified-not-applied` | permission-denied or quota-exceeded | blocking `failed` result + preserved provenance + physical safety where applicable | physically safe because the effect was independently verified not applied; the operational cause remains blocking |
| `verified-not-applied` | no recognized operational provenance | `failed` + explicit physical safety | physically safe because the effect was independently verified not applied |
| predecessor failure without typed `verified-not-applied` physical status | any/none | `failed` without fabricated retry-safe authority | none fabricated |
| converged success | n/a | `success` | only after the pre-existing authoritative D lifecycle reaches verified convergence and canonical-state commit |

### Independent physical basis for `RetrySafePhysicalAuthorityV1_3`

`RetrySafePhysicalAuthorityV1_3` is accepted or created only after the typed physical observation establishes `status === "verified-not-applied"`. When the successor result already supplies physical `effectSafety`, D preserves that authority. Otherwise, D's fallback authority is created only after the same typed `verified-not-applied` fact has been established, with the fixed detail that the physical effect was independently verified not applied.

Authentication, transient-failure, rate-limit, permission, quota, or any other operational cause is not the physical basis for retry safety. In particular, `outcome-unknown` is mapped through the unresolved branch before any verified-not-applied mapping can occur, so `outcome-unknown + authentication`, `outcome-unknown + transient-failure`, and `outcome-unknown + rate-limited` remain `uncertain` and acquire neither `retrySafety` nor `effectSafety` solely from provenance. They do not become ordinary redispatch authority.

### Provenance is not reconstructed from reason strings

The source/test candidate does not parse reason strings and does not import private A error classes. V1.3 disposition is selected from typed successor status plus typed `operationalFailure.kind`. The focused regression intentionally supplies misleading generic reason text containing operational-looking terms while omitting typed provenance and verifies that D does not infer provenance or safety from that text.

## Durable lifecycle and predecessor semantic preservation

The V1.3 adapter remains subordinate to D's existing authoritative lifecycle:

`intent-persisted -> dispatch-authorized -> physical result -> effect-verified/outcome-unknown -> convergence -> canonical state commit`

Evidence exercised the following preservation points:

- `outcome-unknown` remains a durable unresolved physical effect rather than becoming `effect-verified`;
- an `uncertain` execution result does not advance BASE/canonical state;
- restart recovery resolves the prior unresolved durable effect before permitting new dispatch; the focused restart case preserves a single physical dispatch while recovery completes;
- durable mutation/recovery and production-lifecycle composition regressions remain green;
- D-C13's predecessor-preserving immutable-candidate existing-file update convergence remains green;
- no change was made to exact state CAS, durable intent/effect ordering, stale-precondition behavior, conflict preservation, clean-merge multi-effect completion, folder identity authority, or the requirement that canonical state commits only after independently verified convergence.

## Focused and regression verification

### Exact-candidate GitHub Actions proof

- GitHub Actions run: `33709169565`
- GitHub Actions job: `100504782494`
- Disposable proof harness head: `68a8a67a1363cdd6af3376d2fa75265ffcd4e711`
- Exact source/test SHA verified by the harness before execution: `7981717796f929d8ce155a753583fbc5ce11c87c`
- Frozen contract tree asserted by the harness before execution: `0db68ced179825f929008b502335210260ca2ce3`

The proof harness first fetched the Agent D extension branch, hard-reset the runner to the exact source/test SHA, asserted the exact HEAD, and asserted the exact `src/contracts` tree before executing candidate verification. Its bounded candidate command surface then performed:

1. dependency installation (`npm ci`) — **PASS**;
2. static/lint verification (`npm run -s lint`) — **PASS**;
3. production TypeScript check (`tsc -p tsconfig.json --noEmit`) — **PASS**;
4. test TypeScript compilation (`tsc -p tsconfig.test.json`) — **PASS**;
5. selected compiled Node test execution — **59 tests, 59 passed, 0 failed**;
6. production build (`npm run build`) — **PASS**;
7. `git diff --check 7fa9dd2c95f940260594cefa2674963be3a785de...7981717796f929d8ce155a753583fbc5ce11c87c` — **PASS**.

The selected compiled test targets were exactly:

- `.test-build/test/workstreams/orchestration/v1.3-failure-provenance-extension.test.js` — focused V1.3 suite, **10/10 focused cases passed** as part of the zero-failure selected run;
- `.test-build/test/phase6-foundation-failure-provenance.test.js` — **PASS**;
- `.test-build/test/workstreams/orchestration/mutation-lifecycle.test.js` — **PASS**;
- `.test-build/test/workstreams/orchestration/durable-recovery.test.js` — **PASS**;
- `.test-build/test/workstreams/orchestration/production-lifecycle-composition.test.js` — **PASS**;
- `.test-build/test/workstreams/orchestration/d-c13-update-independent-verification.test.js` — D-C13 predecessor-preserving immutable-candidate regression, **PASS**.

Exact individual test totals for the five non-focused regression files: `NOT AVAILABLE IN THIS SESSION`.

The CI proof wrapper's `npm run typecheck` step completed successfully; after resetting to the exact candidate, its actual candidate static checks were the explicit lint, production `tsc --noEmit`, test `tsc`, selected compiled tests, build, and diff-check listed above. A separate standalone invocation of the candidate package's native `npm run typecheck` command during this D-C1 evidence-only correction: `NOT AVAILABLE IN THIS SESSION`.

After the bounded exact-candidate proof completed, the repository's standard CI wrapper proceeded to a broader repository-wide `npm test` step, which failed outside the bounded D acceptance surface. That broader failure was not repaired under this assignment. Exact unrelated broad-suite failure diagnostics: `NOT AVAILABLE IN THIS SESSION`.

### Artifact / digest

The run's Actions artifact listing was inspected and reported `total_count: 0`; no workflow artifact was produced for run `33709169565`.

- Artifact: none produced
- Artifact digest: `NOT AVAILABLE IN THIS SESSION` because no artifact exists

## Downstream composition boundary

D ends at the authoritative V1.3 execution result. H/UI composition was not modified. The remaining later composition dependency is for H to consume/compose the V1.3 authoritative executor/result through the frozen V1.3 disposition boundary; this evidence-only correction does not perform that integration and does not resume H-U5.

## D-C1 correction status / limitations

D-C1 is closed by creation of this dedicated evidence artifact for the unchanged source/test candidate.

No D source/test defect was exposed by the bounded exact-candidate verification summarized above. Dynamic verification in this D-C1 correction pass was reconciled from the existing exact-candidate GitHub Actions proof rather than re-executed by changing source/test code. Materially unavailable details are explicitly marked `NOT AVAILABLE IN THIS SESSION` above.
