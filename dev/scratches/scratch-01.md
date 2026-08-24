REJECTION

Build rejected for C1.

SCOPE

Correct C1 and only the directly necessary contract, fake, test, documentation, and evidence fallout.

Apply the correction against the current `master` state and preserve unrelated repository changes. Do not implement Phase 2, Phase 3, or Phase 4 production behavior and do not perform unrelated refactoring or cleanup.

CORRECTIONS

C1 — Frozen transfer contracts require whole-file in-memory buffering

FILE

- `src/contracts/common.ts`
- `src/contracts/local-vault.ts`
- `src/contracts/google-drive.ts`

LOCATION

- shared binary-content representation in `src/contracts/common.ts`
- `LocalReadResult`, `LocalVaultPort.createFile`, and `LocalVaultPort.replaceFile` in `src/contracts/local-vault.ts`
- `RemoteDownload`, `RemoteCreateRequest`, and `RemoteUpdateRequest` in `src/contracts/google-drive.ts`

DEFECT

The frozen Phase 1 local and Google Drive boundaries currently represent transferred file content as complete `Uint8Array` values:

- `LocalReadResult.bytes`
- `LocalVaultPort.createFile(..., bytes: Uint8Array)`
- `LocalVaultPort.replaceFile(..., bytes: Uint8Array, ...)`
- `RemoteDownload.bytes`
- `RemoteCreateRequest.bytes`
- `RemoteUpdateRequest.bytes`

These public frozen contracts require or strongly encode whole-file materialization at the cross-workstream boundary.

Phases 3 and 4 are required to implement large-file transfer with bounded memory suitable for iOS/mobile operation while consuming the Phase 1 contracts without independently redefining them. The current contracts therefore cannot serve as the frozen boundary required for the Phase 2/3/4 parallel wave.

AUTHORITY

- `XFER-006`
- `XFER-007`
- `SYS-004`
- `INV-014`
- `DEC-185`
- `dev/stage-1-build-decomposition.md` §§4.3, 4.4, 5.3, 5.6

REQUIRED CHANGE

Introduce a platform-neutral lazy/chunked binary-content source in `src/contracts/common.ts` and use that source throughout the frozen local and Drive transfer signatures instead of whole-file `Uint8Array` payloads.

Add this public contract to `src/contracts/common.ts`:

```typescript
/**
 * Platform-neutral binary content source.
 *
 * Implementations provide content incrementally and must not require the
 * complete file to be materialized in memory before consumption begins.
 */
export interface BinaryContentSource {
  readonly sizeBytes?: number;
  openChunks(): AsyncIterable<Uint8Array>;
}
```

Replace the affected local-vault transfer declarations with:

```typescript
import type {
  BinaryContentSource,
  ContentEvidence,
  ObservationToken,
  VaultPath
} from "./common";

export interface LocalReadResult {
  readonly content: BinaryContentSource;
  readonly evidence: ContentEvidence;
  readonly stability: "stable";
  readonly observationToken?: ObservationToken;
}
```

and within `LocalVaultPort`:

```typescript
readFile(
  path: VaultPath,
  expectedToken?: ObservationToken
): Promise<LocalReadResult>;

createFile(
  path: VaultPath,
  content: BinaryContentSource
): Promise<LocalMutationReceipt>;

replaceFile(
  path: VaultPath,
  content: BinaryContentSource,
  expectedToken?: ObservationToken
): Promise<LocalMutationReceipt>;
```

Replace the affected Google Drive transfer declarations with:

```typescript
import type {
  BinaryContentSource,
  ChangeCursor,
  ContentEvidence,
  EntityKind,
  ProtocolVersion,
  RemoteObjectId,
  VaultIdentity,
  VaultPath
} from "./common";
```

```typescript
export interface RemoteDownload {
  readonly content: BinaryContentSource;
  readonly remoteObjectId: RemoteObjectId;
  readonly evidence: ContentEvidence;
}

export interface RemoteCreateRequest {
  readonly path: VaultPath;
  readonly entityKind: EntityKind;
  readonly content?: BinaryContentSource;
  readonly expectedEvidence?: ContentEvidence;
}

export interface RemoteUpdateRequest {
  readonly remoteObjectId: RemoteObjectId;
  readonly path: VaultPath;
  readonly content: BinaryContentSource;
  readonly expectedRemoteRevision?: string;
  readonly expectedEvidence?: ContentEvidence;
}
```

RELATED CHANGES

Update only the directly affected compile/test/documentation surfaces:

- `src/testing/fakes.ts`
- `test/contracts.test.ts`
- `dev/phase-1-shared-contracts.md`
- `dev/evidence/_ca-output.md`

Any other file may be changed only if mechanically required by the corrected signatures.

In `test/contracts.test.ts`, add a contract test that constructs a `BinaryContentSource` whose `openChunks()` async iterable yields multiple separate `Uint8Array` chunks and demonstrates that the corrected local/Drive contract types accept that source without requiring construction of one complete-file buffer.

Update `dev/phase-1-shared-contracts.md` so its descriptions of the shared value types, Local Vault boundary, Google Drive boundary, and large-file/mobile transfer capability match the corrected actual contracts.

CONSTRAINTS

- Do not replace `Uint8Array` whole-file payloads with Node.js streams, filesystem handles, Electron APIs, or another desktop-only abstraction.
- Individual chunks MAY be `Uint8Array`; the defect is requiring the entire file to exist as one `Uint8Array`.
- The shared contract must permit lazy incremental production/consumption of chunks without requiring all chunks to be accumulated in memory.
- Do not implement the production streaming/upload/download engine in this correction.
- Do not alter synchronization semantics, conflict semantics, persistence policy, OAuth behavior, or other later-phase functionality.

ACCEPTANCE

C1 is complete only when:

1. `BinaryContentSource` exists as a frozen exported shared contract.
2. Local file reads return `BinaryContentSource` rather than whole-file `bytes`.
3. Local create/replace operations accept `BinaryContentSource` rather than whole-file `Uint8Array`.
4. Drive downloads return `BinaryContentSource` rather than whole-file `bytes`.
5. Drive create/update content uses `BinaryContentSource` rather than whole-file `Uint8Array`.
6. No affected frozen transfer signature requires complete-file materialization in memory.
7. The fake/test seams compile against the corrected contracts.
8. A test exercises a multi-chunk lazy `BinaryContentSource`.
9. `dev/phase-1-shared-contracts.md` accurately records the corrected frozen boundary.
10. The complete Phase 1 test/build gate passes.

VERIFICATION

Run:

- `npm ci`
- `npm run typecheck`
- `npm test`
- `npm run build`

Confirm:

- the new multi-chunk transfer-contract test executes and passes;
- all existing Phase 1 tests continue to pass;
- TypeScript compilation succeeds with all affected fakes and contracts;
- the production plugin build succeeds;
- the corrected local/Drive frozen contracts no longer require complete-file `Uint8Array` transfer payloads.

CHANGE_MANIFEST

Report every file created, modified, or deleted by this correction pass.

EVIDENCE_RECEIPT

Update:

`dev/evidence/_ca-output.md`

The updated evidence MUST include, at minimum:

- correction/build-session identification;
- repository `woodpk/gdrive-sync-obsidian-plugin`;
- branch/ref used;
- base commit SHA for this correction pass;
- corrections implemented;
- verification commands actually executed and observed results;
- acceptance-criteria status;
- every repository-relative file path created;
- every repository-relative file path modified;
- every repository-relative file path deleted;
- any deviation, remaining blocker, or verification limitation.

Derive the Created / Modified / Deleted inventories from the actual Git change set, not from memory.

Commit the correction and evidence artifact and push the completed correction to:

`https://github.com/woodpk/gdrive-sync-obsidian-plugin.git`

Authoritative branch:

`master`

Verify that the push succeeds and that the correction commit is reachable on remote `master`.

COMPLETION_RESPONSE

Return:

- correction IDs completed;
- verification commands/checks actually run and their results;
- complete Created / Modified / Deleted change manifest;
- pushed repository branch and correction commit SHA;
- status of `dev/evidence/_ca-output.md`;
- any remaining blocker or verification limitation.

Do not claim supervisory approval.

STOP

Stop after C1 and its directly necessary consequential edits are implemented, verified, committed, evidenced, and pushed.

Do not continue into Phase 2, Phase 3, Phase 4, or unrelated work.