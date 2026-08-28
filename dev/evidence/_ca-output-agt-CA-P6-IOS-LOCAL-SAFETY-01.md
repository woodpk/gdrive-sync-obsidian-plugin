# Coding-Agent Evidence — Phase 6 Alpha iOS Local-Enumeration Safety

## Identity and topology

- agent ID: `agt-CA-P6-IOS-LOCAL-SAFETY-01`
- branch: `phase6-alpha-ios-local-safety-fix`
- PR: `#26`, targeting `phase6-integration`
- original starting target: `523ba96cc6e975645cfd319fa7bb62b9c1399176`
- rejected reviewed head: `6bef9eeb6f8e2942ad73f8ec302725632eb0e67f`
- both SHAs and the open PR topology were reverified unchanged before correction
- version metadata remains prepared at `0.1.4`
- no tag, release, merge, or `master` modification was performed

## Final repair outcome

```text
OUTCOME B
MOBILE EXTERNAL-REFERENCE CONTAINMENT:
NOT SAFELY ESTABLISHABLE WITH THE SUPPORTED API
```

The rejected implementation is superseded. A `TAbstractFile` parent chain is not physical external-reference containment evidence and is no longer used or claimed as such.

## Authority analysis

The supported Obsidian `1.13.1` API and current official developer documentation were inspected. They establish that:

- `DataAdapter` works with files and folders inside a vault;
- hidden-folder contents are intentionally available through Adapter APIs even when the Vault API does not expose them;
- `CapacitorAdapter` is the mobile `DataAdapter` implementation and exposes ordinary path-based data operations plus `getFullPath()`.

The supported contract does **not** expose or guarantee any mobile equivalent of:

- `lstat` or reparse/symlink inspection;
- canonical `realpath` resolution;
- alias/security-scoped-provider resolution checks;
- a documented guarantee that an adapter-visible vault-relative path cannot traverse an underlying symlink, junction, alias, or equivalent external reference outside the synchronization boundary.

`getFullPath()` is a path conversion surface without a documented canonical-containment guarantee. Lexical containment of its return value would not prove where an existing filesystem reference resolves. `Vault.getAbstractFileByPath()` and `TAbstractFile.parent` cannot supply that missing proof and also legitimately omit hidden content.

Accordingly, no supported/public mobile authority is sufficient for the frozen `ExternalReferenceGuard` invariant. Production mobile construction has been restored to the existing `UnavailableExternalReferenceGuard`, which fails closed before local metadata or mutation access. The rejected `MobileVaultReferenceGuard` file and runtime injection were removed. Desktop retains its unchanged Node-backed `lstat` plus canonical `realpath` guard.

## Hidden/dotfile result

The corrected fixture contains:

```text
.private-sync-test/
.private-sync-test/nested.md
```

The existing policy continues to include `.private-sync-test` in managed scope; hidden content was not globally excluded and the active configuration directory remains separately excluded by its existing policy. Because sufficient external-reference authority is unavailable, the hidden folder receives the same explicit capability-blocked observation as visible content. Recursion does not proceed, and LOCAL completeness truthfully remains `partial`.

This is not a hidden-tree disagreement: the rejected adapter-versus-`TAbstractFile` comparison no longer exists. The nested hidden file cannot be claimed as complete LOCAL evidence until a separately approved platform authority or product architecture supplies the frozen containment invariant.

## Complete changed-file manifest

Relative to the original `phase6-integration` target, the final PR retains these created/modified files:

Created:

- `dev/evidence/_ca-output-agt-CA-P6-IOS-LOCAL-SAFETY-01.md`
- `test/phase6-alpha-ios-local-safety.test.ts`

Modified:

- `dev/evidence/_ca-output.md`
- `manifest.json`
- `package.json`
- `package-lock.json`
- `src/local/obsidian-local-vault.ts`

Deleted: none relative to the target.

The correction pass removes the rejected branch-only `src/local/mobile-vault-reference-guard.ts` and restores `src/product/runtime.ts` to target-equivalent mobile construction. Generated `main.js` remains ignored and is not part of the Git manifest.

## Corrected focused verification

Corrected mobile-local-safety suite: **9/9 PASS**.

The tests prove:

- visible file access is explicitly capability-blocked before adapter metadata access;
- nested visible enumeration remains `partial`, never manufactured `complete`;
- non-excluded hidden content remains in managed scope and is blocked for the same missing physical authority, not Vault-tree invisibility;
- the active configuration directory remains excluded while other hidden content is not globally excluded;
- traversal, absolute, drive-qualified, and URL paths remain blocked before metadata access;
- production mobile composition actually uses the unavailable-capability guard and contains no fake tree proof;
- desktop external-reference behavior remains independently Node-backed and fail-closed;
- no Node/Electron dependency enters the mobile production path;
- manual first-sync assembly reports `localCompleteness=partial`, yields only blocked-unsafe operations, and authorizes no destructive work.

No planner interpretation of partial evidence was changed.

## Full verification

- `npm run typecheck`: **PASS**
- corrected focused mobile-local-safety suite: **9/9 PASS**
- `npm test`: **316/318 PASS**, with only the two previously qualified Windows drive-prefix assertions and no additional failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS**, with informational LF-to-CRLF warnings only

Qualified Windows assertions:

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
main.js byte size: 351475
main.js SHA-256: 32500b28f1f8e730f3ea17a43a93a8f79bf028365c0324fa03767db035bb586f
```

## Preserved boundaries and limitation

- external-reference safety remains fail-closed;
- incomplete LOCAL evidence remains partial and cannot authorize deletion;
- hidden paths remain synchronizable by policy unless explicitly excluded, but current mobile access is capability-blocked;
- first-sync safe union, BASE + LOCAL + REMOTE planning, recovery, conflicts, deletion authority, verification, and state-commit semantics are unchanged;
- OAuth behavior and exact `https://www.googleapis.com/auth/drive.file` scope are unchanged;
- no content, path, Drive ID, OAuth value, token, or credential was added to diagnostics or evidence;
- no performance work, Phase 6 closure, or Stage 3 work occurred;
- `Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`.

PR #26 must remain open and unmerged for independent rereview. A separate architectural/product decision is required before mobile synchronization can safely proceed under the frozen physical external-reference invariant.
