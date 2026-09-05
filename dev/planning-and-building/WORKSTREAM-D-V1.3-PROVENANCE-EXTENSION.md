# WORKSTREAM D — SUPPLEMENTAL V1.3 FAILURE-PROVENANCE EXTENSION

## 0. STATUS / IDENTITY

You are `agt-CA-P6-SYNC-ORCHESTRATION-02`, receiving one bounded supplemental extension to the already-approved **Workstream D — Reconciliation / Orchestration** implementation.

**THIS IS NOT A REJECTION. YOUR PRIOR APPROVAL, INCLUDING D-C13, REMAINS IN FORCE.**

Previously approved D source/test authority:
`6ccd12e642f3168eeda017360289f95377935cff`

Previously approved D evidence head:
`89bfdf243c2c18689ba432e40fa4ba60673e530b`

Do not redo D-C1 through D-C13.

Repository: `woodpk/gdrive-sync-obsidian-plugin`

Create only:
`phase6-sync-orchestration-v1.3-provenance-extension`

Base it directly on:
`7fa9dd2c95f940260594cefa2674963be3a785de`

Approved V1.3 foundation:
`05600f7ca48a6726b72188005f29eddfc1191519`

Required `src/contracts/**` tree:
`0db68ced179825f929008b502335210260ca2ce3`

Before coding verify exact base and contract tree. If either differs, STOP.

`src/contracts/**` is frozen. Do not modify it.

---

## 1. SINGLE PURPOSE

Extend D's approved authoritative execution path so it consumes the frozen V1.3 successor mutation/local results and emits `ExecutionResultV1_3` **without weakening the durable physical-effect lifecycle**.

This is the orchestration half of the new provenance seam.

It does NOT authorize D to implement A transport, B local-platform behavior, H UI/composition, G adversarial modeling, or C persistence.

A and B may be developed in parallel. Therefore D's focused tests may use controlled V1.3 fakes implementing the approved successor ports; do not depend on unapproved A/B extension commits.

---

## 2. REQUIRED V1.3 SURFACES

Use only the frozen successor contracts:

- `ReliableRemoteMutationPortV1_3`
- `RemoteMutationOutcomeV1_3`
- `LocalTransactionalMutationPortV1_3`
- `LocalTransactionResultV1_3`
- `OperationalFailureProvenanceV1_3`
- `RetrySafePhysicalAuthorityV1_3`
- `ExecutionResultV1_3`
- `AuthoritativeSynchronizationExecutorV1_3`

Do not parse reason strings.

Do not import private A error classes.

---

## 3. REQUIRED MAPPING

The existing lifecycle remains authoritative:

`intent-persisted -> dispatch-authorized -> physical result -> effect-verified/outcome-unknown -> convergence -> canonical state commit`

Operational provenance may affect downstream disposition but never rewrites physical history.

### D-V13-1 — remote outcome unknown

For `RemoteMutationOutcomeV1_3.status === "outcome-unknown"`:

- keep the physical effect unresolved in the durable lifecycle;
- return `ExecutionResultV1_3.status === "uncertain"`;
- preserve structured operational provenance when present;
- never manufacture `RetrySafePhysicalAuthorityV1_3`;
- never turn auth/transient/rate-limit into ordinary redispatch authority.

### D-V13-2 — local outcome unknown

For `LocalTransactionResultV1_3.status === "outcome-unknown"`:

- keep physical state unresolved;
- propagate trustworthy `operationalFailure` into V1.3 `uncertain`;
- generic local uncertainty remains uncertain without fabricated provenance.

### D-V13-3 — verified not applied

Only when actual no-unresolved-effect authority exists may D emit a physically safe V1.3 result.

Required mappings:

- verified-not-applied + authentication -> `authentication-required` with explicit `effectSafety`;
- verified-not-applied + transient -> `retryable-failure` with explicit `retrySafety`;
- verified-not-applied + rate-limited -> `retryable-failure` with explicit `retrySafety`, timing only in provenance;
- permission/quota known-not-applied -> blocking form with explicit physical safety where applicable.

The operational cause alone is NEVER proof of physical retry safety.

### D-V13-4 — preserve approved D semantics

Do not weaken:

- exact state CAS;
- durable intent/effect ordering;
- recovery-before-new-dispatch;
- immutable-candidate update convergence;
- clean merge multi-effect completion;
- folder identity authority;
- stale-precondition handling;
- conflict preservation;
- BASE/state commit only after independently verified convergence.

---

## 4. DOWNSTREAM BOUNDARY

D ends at the authoritative V1.3 execution result.

Do NOT implement H/UI presentation.

The frozen foundation already provides `executionDispositionV1_3(...)`; H will consume it later.

If H's current wrapper exposes only predecessor port typing, do not edit H. Prove D with controlled V1.3 fakes and record the exact later H composition dependency.

---

## 5. SCOPE

Primary authorized D production files:

- `src/product/authoritative-production-executor-base.ts`
- `src/product/authoritative-production-executor.ts`
- `src/core/execution-coordinator-base.ts`
- `src/core/execution-coordinator.ts`

Modify only the minimum subset actually required.

If another D-owned production file is mechanically necessary, STOP and report the exact call path before expanding scope.

Authorized tests:

- create `test/workstreams/orchestration/v1.3-failure-provenance-extension.test.ts`;
- run existing D regressions, but do not rewrite them except for a narrowly necessary compile-only adaptation.

Authorized evidence:
`dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-02-V1.3-EXT.md`

Do NOT modify:

- `src/contracts/**`
- `src/drive/**`
- `src/local/**`
- state persistence
- H integration/UI
- G model
- canonical `_ca-output.md`.

---

## 6. ACCEPTANCE TESTS

Using controlled V1.3 port fakes, prove:

1. remote `outcome-unknown + authentication` -> execution `uncertain + authentication`, unresolved durable effect, no retry-safe proof;
2. remote `outcome-unknown + rate-limited(5000)` -> `uncertain` preserving exact timing, no ordinary redispatch;
3. local `outcome-unknown + transient` -> `uncertain + transient`;
4. local generic `outcome-unknown` -> uncertain without fabricated provenance;
5. verified-not-applied + authentication -> safe authentication result with explicit safety authority;
6. verified-not-applied + transient -> retryable only with explicit safety authority;
7. verified-not-applied + rate-limited(5000)` -> retryable preserving timing only in provenance;
8. uncertain results do not advance BASE/state and do not become `effect-verified`;
9. unresolved restart state reconciles before redispatch;
10. D-C13 immutable-candidate convergence remains green.

You may also assert `executionDispositionV1_3(result)` as a secondary contract check, but do not implement H UI.

---

## 7. VERIFICATION

Verify exact candidate:

```bash
npm ci
npm run typecheck
npx tsc -p tsconfig.test.json
node --test .test-build/test/workstreams/orchestration/v1.3-failure-provenance-extension.test.js
node --test .test-build/test/phase6-foundation-failure-provenance.test.js
node --test <relevant existing D mutation/recovery/D-C13 regression files>
npm run build
git diff --check 7fa9dd2c95f940260594cefa2674963be3a785de...<D_V1_3_EXTENSION_SHA>
```

Use a disposable proof branch if needed.

If full `npm test` is run, report exact totals and do not repair unrelated failures.

---

## 8. EVIDENCE / STOP

Record exact base, contract tree, production files modified, mapping from physical outcome + provenance to V1.3 execution result, where retry-safe authority is created and the physical fact proving it, proof reason strings are not parsed, focused/regression results, typecheck/build/diff results, source/test SHA, proof run/job/artifact/digest if used, and exact H composition dependency if any.

Write only:
`dev/evidence/_ca-output-agt-CA-P6-SYNC-ORCHESTRATION-02-V1.3-EXT.md`

Do not merge. Do not integrate into H. Do not resume H-U5. Prior D approval remains intact.

Return for independent supervisor review.

End exactly:

`WORKSTREAM D V1.3 PROVENANCE EXTENSION COMPLETE — PRIOR D APPROVAL PRESERVED — READY FOR SUPERVISOR REVIEW`
