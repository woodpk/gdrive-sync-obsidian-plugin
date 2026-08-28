# Coding-Agent Evidence — Phase 6 Alpha iOS Local-Enumeration Safety Repair

## Identity and source state

- agent ID: `agt-CA-P6-IOS-LOCAL-SAFETY-01`
- branch: `phase6-alpha-ios-local-safety-fix`
- starting `phase6-integration` SHA: `523ba96cc6e975645cfd319fa7bb62b9c1399176`
- starting and remote base were verified equal before editing
- prepared test-build metadata: `0.1.4`
- no tag, release, merge, or `master` modification was performed

## Established failure mechanism

The mobile runtime created `ObsidianLocalVaultAdapter` without an `ExternalReferenceGuard`. Generic adapter construction therefore selected `UnavailableExternalReferenceGuard`, which throws before adapter metadata access because it cannot establish external-reference containment. During enumeration, each legitimate folder observation became inaccessible, recursion stopped, and the listing truthfully became `partial`. The planner correctly refused to treat that incomplete LOCAL evidence as deletion authority or as a safe first-sync input.

## Mobile safety mechanism

The installed Obsidian `1.13.1` API contract was inspected. `DataAdapter` is the vault-scoped interface documented to work directly with files and folders inside a vault; `Vault.getAbstractFileByPath()` exposes the matching logical entry; `Vault.getRoot()` exposes the current vault root; and `TAbstractFile` exposes vault identity, logical path, and parent identity.

`MobileVaultReferenceGuard` uses those mobile-safe Obsidian surfaces and introduces no Node, Electron, `fs`, `path`, realpath, or desktop-only dependency. For an existing path, it requires:

- a vault-relative path that is not absolute, drive-qualified, URL-qualified, or traversal-bearing;
- agreement between `DataAdapter.exists()` and `Vault.getAbstractFileByPath()`;
- exact logical-path agreement;
- an acyclic, internally consistent parent chain;
- every node to belong to the current `Vault`;
- termination at the exact current `Vault.getRoot()` object with a valid root identity.

For a missing observation or mutation target, adapter/tree absence must agree and the nearest existing ancestor must pass the same rooted identity proof. Enumeration and mutation sources that are missing remain blocked. Adapter/tree disagreement, existence-check failure, a broken parent chain, a cycle, or an untrustworthy root remains fail-closed.

This establishes containment within the iOS Obsidian vault API boundary without claiming unavailable physical-filesystem canonicalization. The mobile runtime injects the guard only on the non-desktop path. The existing desktop dynamic import and Node-backed external-reference guard are unchanged, and generic adapter construction still defaults to fail-closed.

## Changed-file manifest

Created:

- `src/local/mobile-vault-reference-guard.ts`
- `test/phase6-alpha-ios-local-safety.test.ts`
- `dev/evidence/_ca-output-agt-CA-P6-IOS-LOCAL-SAFETY-01.md`

Modified:

- `src/local/obsidian-local-vault.ts`
- `src/product/runtime.ts`
- `manifest.json`
- `package.json`
- `package-lock.json`
- `dev/evidence/_ca-output.md`

Deleted: none.

Generated `main.js` is ignored by the repository and is not part of the Git manifest.

## Focused behavioral verification

Focused mobile-local-safety result: **7/7 PASS**.

The focused suite proves:

- ordinary mobile files are observed safely;
- nested directories recursively enumerate;
- a representative healthy mobile vault reports `completeness.status === "complete"`;
- traversal, absolute, drive-qualified, and URL path forms are rejected;
- adapter/tree uncertainty remains fail-closed before metadata access;
- the existing desktop guard remains independently Node-backed and fail-closed;
- the mobile production path introduces no Node/Electron dependency and injects the new guard;
- the real snapshot-assembly diagnostic event reports `localCompleteness=complete` for the healthy fixture;
- first-sync planning remains safe union (`upload-create` only), with no destructive or trash operation.

No planner handling of `partial` evidence was changed.

## Full verification

- `npm run typecheck`: **PASS**
- focused mobile-local-safety suite: **7/7 PASS**
- `npm test`: **314/316 PASS**, with exactly the two previously qualified Windows drive-prefix assertions below and no additional failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS**, with informational LF-to-CRLF working-copy warnings only

Qualified pre-existing Windows assertions:

1. `Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure`
   - actual: `D:\vault\__brain_sync_portable_config__`
   - expected: `\vault\__brain_sync_portable_config__`
2. `Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates`
   - actual: `D:\vault\notes\missing.md`
   - expected: `\vault\notes\missing.md`

All package verifiers passed:

```text
BUILD_VERIFY_ENTRYPOINT=PASS
BUILD_VERIFY_SYNTAX=PASS
BUILD_VERIFY_LOCAL_RUNTIME_DEPENDENCIES=PASS
BUILD_VERIFY_MOBILE_EVALUATION=PASS
BUILD_VERIFY_PACKAGE_SHAPE=PASS
```

Artifact:

```text
main.js byte size: 355163
main.js SHA-256: 0158096224f372126b800d4c66265ef52d3877b8c3a04d866ed365b99895c8ca
```

## Preserved boundaries and remaining limitation

- first-sync safe union, incomplete-evidence handling, deletion authority, BASE + LOCAL + REMOTE planning, three-way merge, stale-device gates, recovery, transfer verification, and state-commit ordering are unchanged;
- OAuth behavior and exact `https://www.googleapis.com/auth/drive.file` scope are unchanged;
- no content paths, note contents, Drive IDs, OAuth values, tokens, or credentials were added to diagnostics or evidence;
- no physical pairing or synchronization was performed;
- no performance optimization, Phase 6 closure, or Stage 3 work was performed;
- `Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`.

The remaining acceptance step is a physical iPhone test of `0.1.4` after independent review, integration, and release. Until that test, this evidence establishes executable behavior in the mobile fixture and build, not a claim that physical iPhone synchronization is fixed.
