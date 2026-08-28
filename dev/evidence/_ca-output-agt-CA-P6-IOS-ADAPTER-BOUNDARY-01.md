# Coding-Agent Evidence — Phase 6 Alpha iOS Adapter-Boundary Vault Access Refactor

## Identity and branch control

- agent ID: `agt-CA-P6-IOS-ADAPTER-BOUNDARY-01`
- repository: `woodpk/gdrive-sync-obsidian-plugin`
- branch: `phase6-alpha-ios-adapter-boundary-refactor`
- required and verified starting SHA: `523ba96cc6e975645cfd319fa7bb62b9c1399176`
- dynamically verified implementation/governance SHA: `410f252bf5fa35e4abfb12fc47df5db1e710066c`
- PR #26 was not branched from, merged, or released; its physical-canonicalization investigation remains evidence, while its blanket mobile unavailable-guard outcome is superseded by later product authority
- version metadata is prepared consistently at `0.1.4`; no tag or release was created

## Governing product-authority clarification

`DEC-299` records the later user decision that local containment may use different platform mechanisms while preserving one safety outcome:

- Windows retains desktop-only `lstat` plus canonical-`realpath` physical external-reference containment.
- iOS uses the active Obsidian mobile `DataAdapter` namespace plus strict vault-relative path validation and enumeration-child provenance as its approved filesystem capability boundary.
- mobile code may not construct arbitrary native paths or import Node/Electron/desktop filesystem facilities.
- malformed, escaping, unsupported, or unprovable individual paths remain blocked and make affected evidence incomplete.
- the absence of the Windows mechanism is not grounds to block every normal iOS vault path.

`project-state.yaml` and the Phase 6 supervisor handoff now identify this adapter-boundary refactor as the active repair, identify PR #26 Outcome B as superseded architecture, and retain physical iPhone validation as pending.

## Official and donor engineering grounding

Official Obsidian sources inspected:

- `obsidian` API `1.13.1` declarations: `CapacitorAdapter` is the mobile `DataAdapter` implementation and exposes vault-relative `exists`, `stat`, `list`, `getResourcePath`, `mkdir`, `writeBinary`, `appendBinary`, `rename`, `remove`, and `trashLocal` operations.
- [Obsidian Vault documentation](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Vault.md): Vault API visibility omits hidden-folder contents; Adapter API is the supported surface for those paths.
- [official Obsidian API declarations](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts): `DataAdapter` works directly with files and folders inside a vault and accepts normalized paths.

Requested donor repositories inspected as engineering evidence only:

- [Remotely Save `fsLocal.ts`](https://github.com/remotely-save/remotely-save/blob/master/src/fsLocal.ts) uses `vault.adapter` for binary read/write, rename, and local/system trash; [its hidden-folder lister](https://github.com/remotely-save/remotely-save/blob/master/src/obsFolderLister.ts) recursively uses `adapter.list()` for Obsidian configuration content.
- [Self-hosted LiveSync `ObsidianStorageAdapter.ts`](https://github.com/vrtmrz/obsidian-livesync/blob/main/src/serviceModules/FileSystemAdapters/ObsidianStorageAdapter.ts) confines storage operations to the Obsidian adapter, while [its `ObsidianVaultAdapter.ts`](https://github.com/vrtmrz/obsidian-livesync/blob/main/src/serviceModules/FileSystemAdapters/ObsidianVaultAdapter.ts) preserves Vault/FileManager behavior for visible `TFile`/`TFolder` objects.

No donor code was copied. These sources supported the project-specific hybrid: preserve FileManager semantics for visible objects, and use supported adapter rename/trash when hidden content is legitimately absent from the Vault object tree.

## Implemented architecture

- Introduced the private semantic `LocalVaultAccessBoundary`: prove an operation is safe to submit through the current platform's approved vault boundary.
- Desktop `DesktopExternalReferenceGuard` now implements that semantic boundary without weakening its existing Node-backed physical checks.
- Production mobile runtime explicitly installs `MobileVaultAccessBoundary` and adapter mutation fallback; it no longer falls through to the unavailable boundary.
- Every public local operation validates and normalizes its path before adapter/Vault/FileManager I/O.
- Invalid traversal, absolute, drive-qualified, URI-like, invalid-name, reserved-name, collision, and path-length cases remain blocked by the existing cross-platform policy.
- Every `adapter.list(parent)` child is treated as untrusted: it must be a normalized, valid immediate descendant of the requested parent. Duplicate/case/Unicode-colliding, cyclic, malformed, and parent-escaping children are rejected without subsequent metadata or recursion access. Safe siblings remain inspectable, and any material rejection makes LOCAL enumeration `partial`.
- Listed file/folder kind must match the observed adapter object. An explicitly unsupported adapter object kind is `unknown`, not silently treated as a file.
- Create/replace stage and backup names pass the same boundary validation before I/O.
- On mobile, visible move/trash retains FileManager behavior when a `TAbstractFile` exists; hidden managed content falls back to `DataAdapter.rename()` / `trashLocal()` when the Vault tree legitimately omits it. Mobile folder creation uses `DataAdapter.mkdir()`.
- Existing safe structured diagnostics retain `runId` correlation and LOCAL completeness metadata; runtime now emits the path-free event `mobile-vault-boundary-selected` with result `mobile-adapter`.
- BASE + LOCAL + REMOTE planning, first-sync safe union, deletion authority, conflict semantics, durable verification/state commit, Drive identity, OAuth, and exact `drive.file` scope are unchanged.

The implementation does not claim to inspect an iOS symlink/alias physically. It prevents plugin-controlled escape by submitting only validated vault-relative operations to the active mobile adapter boundary, and it blocks any individual unsupported object the adapter explicitly exposes.

## Focused acceptance result

Focused suite: `test/phase6-alpha-ios-adapter-boundary.test.ts`

Result: **8/8 PASS**.

It proves:

- complete visible, nested, empty-folder, and non-excluded hidden enumeration;
- active configuration-directory exclusion remains intact;
- traversal, absolute, drive-qualified, HTTPS, and file-URI inputs are rejected before observe/read/create/replace/create-folder/move/trash adapter I/O;
- malformed, duplicate/colliding, cyclic, and parent-escaping list children are isolated while safe siblings remain observable and completeness is truthful `partial`;
- valid create/replace stage/backup paths remain confined;
- hidden rename/trash works without `TAbstractFile` through adapter fallback;
- visible rename/trash retains FileManager semantics;
- desktop physical external-reference rejection remains intact;
- production mobile composition has no Node/Electron dependency;
- a healthy first-sync fixture produces complete LOCAL and REMOTE evidence, a non-destructive safe-union upload plan, and reaches preview presentation handling.

## Complete verification

- `npm run typecheck`: **PASS**
- focused iOS adapter-boundary suite: **8/8 PASS**
- `npm test`: **315/317 PASS**, with exactly the two previously qualified Windows drive-prefix assertions and no additional failure
- `npm run build`: **PASS**
- `npm run verify:build`: **PASS**
- `git diff --check`: **PASS** (informational LF-to-CRLF working-copy warnings only)

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
main.js byte size: 357076
main.js SHA-256: 047dd456a6ed2894bbbf8bd921572d38695fbe85790ca9c7a15260900572e8d8
```

## Complete base-to-evidence-tree manifest

Created:

- `dev/evidence/_ca-output-agt-CA-P6-IOS-ADAPTER-BOUNDARY-01.md`
- `src/local/local-vault-access-boundary.ts`
- `src/local/mobile-vault-access-boundary.ts`
- `test/phase6-alpha-ios-adapter-boundary.test.ts`

Modified:

- `dev/evidence/_ca-output.md`
- `dev/planning-and-building/decision-register.yaml`
- `dev/planning-and-building/phase-6-supervisor-handoff.md`
- `dev/planning-and-building/project-state.yaml`
- `manifest.json`
- `package.json`
- `package-lock.json`
- `src/local/desktop-external-reference-guard.ts`
- `src/local/desktop-local-vault.ts`
- `src/local/obsidian-local-vault.ts`
- `src/product/runtime.ts`

Deleted: none.

Generated `.test-build/**` and ignored `main.js` are verification artifacts and are not Git changes.

## Remaining boundary and explicit non-actions

`Physical iPhone validation: NOT AVAILABLE IN THIS SESSION`

The next reviewed iPhone build must verify that `Sync now` reaches `localCompleteness=complete`, remote observation, planning completion, and plan-preview presentation before the user considers Execute.

- no tag or GitHub release was created;
- no PR was merged;
- PR #26 was not merged or released;
- `master` and `phase6-integration` were not modified;
- no pairing or synchronization was performed;
- no performance optimization was begun;
- Phase 6 was not closed;
- Stage 3 was not begun.
