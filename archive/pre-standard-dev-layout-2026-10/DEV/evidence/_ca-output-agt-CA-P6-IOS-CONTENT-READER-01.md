# Coding-Agent Evidence — Phase 6 Alpha iOS Canonical Content Reader Repair

## Identity and branch control

- agent ID: `agt-CA-P6-IOS-CONTENT-READER-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- branch: `phase6-alpha-ios-adapter-boundary-refactor`
- PR: `#27`, retained open and unmerged
- verified starting evidence head: `50ab9d4a5e112c33f0e9b070c2158c33e73a480d`
- final dynamically verified implementation SHA: `7fba7fbc568c4512e54740f549d44c434b7b2a79`
- base branch remains `phase6-integration`; neither `phase6-integration` nor `master` was modified
- version metadata is consistently prepared at `0.1.5`; no tag or release was created

The final branch head after this record and the canonical ledger are committed is necessarily a later evidence-only SHA. The content-dependent evidence commit cannot record its own SHA without changing it; the exact pushed branch head is reported in the operator handoff and GitHub PR state.

## Root cause

Physical iPhone `0.1.4` testing proved that the mobile adapter boundary and vault-relative path confinement were operating, but canonical evidence failed for every healthy non-empty ordinary or portable-configuration file. `ResourceFetchContentSource` sent bounded `Range` requests through `DataAdapter.getResourcePath()` and accepted only `206 Partial Content`. The iOS resource runtime returned a readable `200 OK` full representation instead. The reader rejected that supported streamed response before hashing, `CanonicalEvidenceLocalVault` converted the read failure into unknown evidence, LOCAL completeness became partial, and the planner correctly emitted `blocked-unsafe`.

The directly relevant Obsidian `1.13.1` declarations confirm that mobile `CapacitorAdapter` implements the vault-relative `DataAdapter` contract, exposes `getResourcePath()`, and offers only whole-file `readBinary()` rather than a bounded binary-read API. The repair therefore continues to use the browser-readable resource URI but consumes its response stream incrementally; it does not adopt whole-file `readBinary()` buffering.

## Implementation approach

The mobile-neutral resource reader now supports two fail-closed response modes:

1. A valid `206` response retains the existing exact `Content-Range` and bounded-range checks.
2. A first-request `200` response is treated as one full streamed representation, without buffering the complete file.

For both modes the reader:

- requires a trustworthy non-negative observed `stat.size`;
- validates `Content-Length` against the expected response byte count when the header is present;
- consumes `ReadableStream` bytes incrementally;
- rechunks upstream stream values so every yielded chunk is at most the configured bound;
- rejects premature EOF and any byte beyond the observed size;
- verifies the observation token before fetch/body consumption, at configured chunk boundaries during consumption, and after exact completion;
- cancels failed response bodies on a best-effort basis;
- retains the existing zero-byte no-fetch path;
- never calls `readBinary()` for this production read path.

No planner, completeness, path validation, mobile adapter-boundary, desktop reader, desktop external-reference guard, Drive, OAuth, conflict, deletion-authority, state-commit, or verification semantics were weakened or redesigned.

## Changed files in the verified implementation commit

Modified:

- `manifest.json` — prepared version `0.1.5`.
- `package.json` — prepared version `0.1.5`.
- `package-lock.json` — prepared root/package version `0.1.5`.
- `src/local/obsidian-local-vault.ts` — accepts and incrementally consumes exact-size streamed HTTP `200` resource responses while retaining validated HTTP `206` behavior and stale/size checks.
- `test/obsidian-local-vault.test.ts` — replaces the obsolete HTTP-200 rejection expectation with bounded streamed acceptance.

Created:

- `test/phase6-alpha-ios-content-reader.test.ts` — focused reader and production-chain regressions.

Deleted: none.

Evidence-only changes after the implementation commit:

- created `dev/evidence/_ca-output-agt-CA-P6-IOS-CONTENT-READER-01.md`;
- appended `dev/evidence/_ca-output.md`.

Ignored/generated verification artifacts such as `main.js` and `.test-build/**` are not Git changes.

## Focused verification

Focused suite: `test/phase6-alpha-ios-content-reader.test.ts`

Result: **6/6 PASS**.

It proves:

- a non-empty HTTP `200` mobile resource stream reconstructs exact bytes and produces bounded chunks;
- a file larger than one configured read chunk is consumed incrementally from one streamed response;
- premature EOF and excess bytes fail closed;
- mismatched `Content-Length` fails closed;
- a file changed during streaming fails with `LocalStaleObservationError`;
- zero-byte files retain no-fetch behavior;
- `readBinary()` is never used;
- the actual `ObsidianLocalVaultAdapter → ScopedLocalVault → CanonicalEvidenceLocalVault` chain produces canonical SHA-256 for non-empty ordinary and portable configuration files;
- production-chain LOCAL enumeration is `complete`;
- healthy first-sync assembly and planning produce non-destructive `upload-create` operations without HTTP-200-induced `blocked-unsafe` operations.

The existing HTTP `206` bounded-range tests, desktop bounded-reader tests, unsafe-path tests, mobile adapter-confinement tests, and desktop external-reference tests also passed in the full suite.

## Complete verification

- `npm run typecheck`: **PASS**
- focused iOS content-reader suite: **6/6 PASS**
- `npm test`: **321/323 PASS**, with exactly the two previously qualified Windows drive-prefix assertions and no additional failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS** (informational LF-to-CRLF working-copy warnings only)

Qualified pre-existing Windows assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
   - actual: `D:\vault\__brain_sync_portable_config__`
   - expected: `\vault\__brain_sync_portable_config__`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`
   - actual: `D:\vault\notes\missing.md`
   - expected: `\vault\notes\missing.md`

Package verifiers:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Artifact:

```text
main.js byte size: 358620
main.js SHA-256: e467de6c96c76c1006897926a98f63e0dec0acc67354553560b00b4edf3cb478
```

## Remaining limitation and explicit non-actions

`Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`

The next independently reviewed physical build must confirm that healthy non-empty ordinary and portable files produce `localCompleteness=complete` on the iPhone and no `blocked-unsafe` operation attributable to the former HTTP-206 assumption.

- PR #27 was not merged.
- PR #26 was not merged.
- `phase6-integration` and `master` were not modified.
- no tag or GitHub release was created.
- no Drive or OAuth behavior changed.
- no synchronization redesign, performance optimization, Phase 6 closure, or Stage 3 work began.
