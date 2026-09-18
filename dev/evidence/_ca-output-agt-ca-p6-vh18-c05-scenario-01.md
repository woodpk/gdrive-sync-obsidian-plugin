STATUS: COMPLETE

# VH18 — C05 Mobile Delete → Windows Recoverable Delete

## Provenance

- Agent: `agt-ca-p6-vh18-c05-scenario-01`
- Repository: `woodpk/gdrive-sync-obsidian-plugin`
- Required branch: `phase6-vh18-c05-scenario`
- Executable base branch: `origin/phase6-vh15-validation-mode-runtime-canary`
- BASE_SHA: `6372184d2649e21369001ea28cc583e6636781c5`
- BASE tree: `06765a1c20e405c0329ea277213674c097cc6c88`
- VH15 predecessor evidence gate: **PASS** — `dev/evidence/_ca-output-agt-ca-p6-vh15-validation-mode-runtime-canary-01.md` begins exactly `STATUS: COMPLETE`.
- Implementation SHA: `361909ddfccdbfb77ce0c5dfcd63c89be2274c83`
- Implementation tree: `897c0d4de87b0880893bf0cd27943760c334f5c8`

## Implemented C05 scope

Implemented only the C05 harness scenario package and its focused tests.

The scenario package:

- exposes exactly one C05 registration/definition for later H7 C-series integration;
- defines the harness-owned deletion fixture at the C04-renamed logical path;
- requires a C05-owned trusted fixture and unrelated protected witness state before mutation;
- deletes the fixture on the mobile participant through the fixture-manager/local-trash boundary;
- drives the production synchronization path through manual preview, frozen plan assertion, and asserted-plan execution;
- accepts mobile propagation only when production emits exactly the fixture-scoped `trash-remote` plan with the production `attested-local-deletion` reason;
- objectively verifies remote trash, mobile tombstone authority, no unresolved mobile effects, production `trash-remote` execution, mobile live-path absence, and unrelated-change absence before Windows deletion may begin;
- drives Windows production synchronization only after that remote-trash proof;
- accepts Windows propagation only when production emits exactly `trash-local` with the production `attested-remote-deletion` reason;
- verifies final remote trashed/no-live-same-path state, mobile and Windows tombstones, no unresolved effects, production `trash-local` execution through the local trash boundary, cross-device live-path absence, cross-device tombstone authority, and unrelated-change absence;
- hard-stops before production execution if an observed plan contains an unexpected or additional destructive operation.

No alternate synchronization engine, Drive mutation shortcut, direct production-state mutation, or live-validation path was introduced.

## Implementation changed files

Exact `BASE_SHA..IMPLEMENTATION_SHA` comparison contains only:

1. `src/validation/scenarios/c05-ios-delete-windows-trash.ts` — added
2. `test/validation-c05-ios-delete-windows-trash.test.ts` — added

No `src/contracts/**`, frozen H0 validation contracts, scenario acceptance text, existing production synchronization source, shared runner source, or shared registry/barrel was changed.

## Focused C05 tests

The C05-focused file contains four deterministic tests:

1. one-to-one C05 registration/step sequence;
2. successful mobile `trash-remote` → objective remote-trash proof → Windows `trash-local` → tombstone/convergence/unrelated-mutation verification;
3. unsafe-plan hard stop when an unrelated destructive mutation appears;
4. hard stop before Windows deletion when remote-trash/tombstone proof is not observable.

GitHub verification logs show all four C05 tests passed:

- test 817 — registration: **PASS**
- test 818 — deterministic success path: **PASS**
- test 819 — unrelated destructive-plan hard stop: **PASS**
- test 820 — missing remote-trash proof hard stop: **PASS**

The four focused C05 tests executed in the full `npm test` pass and again inside `npm run check`.

## Repository verification

Verification used the repository's existing `Phase 6 Alpha Diagnostic Verification` workflow through temporary draft PR #129 solely because no local shell/network execution environment was available for authoritative repository commands.

- Workflow run: `35357921668`
- Job: `105641738019`
- Conclusion: **success**
- `npm ci`: **PASS**
- `npm run typecheck`: **PASS**
- test TypeScript compilation (`npx tsc -p tsconfig.test.json`): **PASS**
- full `npm test`: **PASS — 984/984, 0 failed**
- production build: **PASS**
- `npm run check`: **PASS**
- `git diff --check`: **PASS**
- fixed workflow focused legacy regression steps: **PASS**

Temporary PR #129 was closed unmerged after verification.

## Exact tested-tree proof

The workflow tested GitHub synthetic merge:

- synthetic merge SHA: `ad7bfe9fee60de96ca893db123bdb704bb32145d`
- synthetic merge tree: `897c0d4de87b0880893bf0cd27943760c334f5c8`
- implementation tree: `897c0d4de87b0880893bf0cd27943760c334f5c8`
- exact-tree identity: **PASS**

Therefore the successful repository verification applies to the exact VH18 implementation content.

## Deviations / blockers

- Remaining blockers: **none**.
- A separate single-file C05-only CI command is not present in the fixed repository workflow. The four C05-only test cases were nevertheless executed and observed passing twice: once in `npm test` and once through `npm run check`.
- No physical Google Drive/iPhone/Windows C05 validation was executed or claimed.
- No merge, promotion, release, C06 work, or physical PASS claim was performed.
