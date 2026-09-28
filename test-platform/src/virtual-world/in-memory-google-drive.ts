import { createHash } from "node:crypto";

import {
  contractId,
  type BinaryContentSource,
  type ChangeCursor,
  type ContentEvidence,
  type DriveAuthenticationState,
  type DriveResult,
  type DriveSignal,
  type EnumerationCompleteness,
  type GoogleDrivePort,
  type ManagedRemoteIdentity,
  type ManagedRemoteValidation,
  type ProtocolVersion,
  type RemoteChange,
  type RemoteChangePage,
  type RemoteCreateRequest,
  type RemoteDownload,
  type RemoteEntry,
  type RemoteListing,
  type RemoteMutationReceipt,
  type RemoteObjectId,
  type RemoteObservation,
  type RemoteProtocolInfo,
  type RemoteUpdateRequest,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/product/local-vault-boundary-seam";

export type GoogleDriveCorePort = GoogleDrivePort;

type EntityKind = "file" | "folder";

interface InMemoryRemoteObject {
  readonly remoteObjectId: RemoteObjectId;
  readonly rootId: RemoteObjectId;
  path: VaultPath;
  readonly entityKind: EntityKind;
  bytes?: Uint8Array;
  revision: number;
  trashed: boolean;
}

interface ManagedRootState {
  readonly identity: ManagedRemoteIdentity;
  readonly objects: Map<string, InMemoryRemoteObject>;
  readonly changes: RemoteChange[];
}

export type InMemoryDriveBoundary =
  | "list"
  | "start-cursor"
  | "read-changes"
  | "observe"
  | "download"
  | "create"
  | "update"
  | "move"
  | "trash";

export interface InMemoryDriveBoundaryFault {
  readonly boundary: InMemoryDriveBoundary;
  readonly signal: DriveSignal;
  readonly mutationEffect?: "not-applied" | "applied-before-failure";
}

export interface InMemoryDriveListingControl {
  readonly completeness: EnumerationCompleteness;
  readonly omitRemoteObjectIds?: readonly RemoteObjectId[];
}

export interface InMemoryDriveChangePageControl {
  readonly completeness: EnumerationCompleteness;
  readonly omitRemoteObjectIds?: readonly RemoteObjectId[];
}

export type InMemoryDriveCursorInvalidation =
  | "invalid"
  | "lost"
  | "stale";

export interface InMemoryRemoteObjectSnapshot {
  readonly remoteObjectId: RemoteObjectId;
  readonly rootId: RemoteObjectId;
  readonly path: VaultPath;
  readonly parentPath: VaultPath;
  readonly entityKind: EntityKind;
  readonly revision: string;
  readonly trashed: boolean;
  readonly evidence?: ContentEvidence;
}

export const virtualRemoteObjectId = (value: string): RemoteObjectId =>
  contractId<"RemoteObjectId">(value) as RemoteObjectId;

export const virtualVaultIdentity = (value: string): VaultIdentity =>
  contractId<"VaultIdentity">(value) as VaultIdentity;

export const virtualProtocolVersion = (value: string): ProtocolVersion =>
  contractId<"ProtocolVersion">(value) as ProtocolVersion;

export const virtualChangeCursor = (value: string): ChangeCursor =>
  contractId<"ChangeCursor">(value) as ChangeCursor;

export const virtualDrivePath = (value: string): VaultPath =>
  contractId<"VaultPath">(normalizePath(value)) as VaultPath;

function normalizePath(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/{2,}/g, "/")
    .replace(/\/$/, "");
}

function parentPath(value: VaultPath | string): VaultPath {
  const parts = normalizePath(String(value)).split("/").filter(Boolean);
  return virtualDrivePath(parts.slice(0, -1).join("/"));
}

function basename(value: VaultPath | string): string {
  return normalizePath(String(value)).split("/").filter(Boolean).at(-1) ?? "";
}

function comparisonKey(value: VaultPath | string): string {
  return normalizePath(String(value))
    .normalize("NFC")
    .toLocaleLowerCase("en-US");
}

function isDescendantPath(path: VaultPath | string, parent: VaultPath | string): boolean {
  const candidate = normalizePath(String(path));
  const root = normalizePath(String(parent));
  return root.length > 0 && candidate.startsWith(`${root}/`);
}

function copyBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}

async function collectContent(source: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of source.openChunks()) {
    const copy = copyBytes(chunk);
    chunks.push(copy);
    total += copy.byteLength;
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined;
}

function contentSource(bytes: Uint8Array): BinaryContentSource {
  const retained = copyBytes(bytes);
  return {
    sizeBytes: retained.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield copyBytes(retained);
    },
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fileEvidence(object: InMemoryRemoteObject): ContentEvidence {
  const bytes = object.bytes ?? new Uint8Array();
  return {
    hash: contractId<"ContentHash">(`sha256:${sha256(bytes)}`),
    sizeBytes: bytes.byteLength,
    revision: String(object.revision),
  };
}

function evidenceMismatch(
  actual: ContentEvidence,
  expected: ContentEvidence | undefined,
): "size" | "hash" | undefined {
  if (!expected) return undefined;
  if (
    expected.sizeBytes !== undefined &&
    actual.sizeBytes !== expected.sizeBytes
  ) {
    return "size";
  }
  if (expected.hash !== undefined && actual.hash !== expected.hash) {
    return "hash";
  }
  return undefined;
}

function notFound<T>(remoteObjectId?: RemoteObjectId): DriveResult<T> {
  return {
    ok: false,
    signal: {
      kind: "not-found",
      ...(remoteObjectId === undefined ? {} : { remoteObjectId }),
    },
  };
}

function conflict<T>(detail: string): DriveResult<T> {
  return { ok: false, signal: { kind: "conflict", detail } };
}

function recoveryRequired<T>(detail: string): DriveResult<T> {
  return { ok: false, signal: { kind: "recovery-required", detail } };
}

export class InMemoryGoogleDriveCore implements GoogleDriveCorePort {
  private readonly roots = new Map<string, ManagedRootState>();
  private readonly objectsById = new Map<string, InMemoryRemoteObject>();
  private readonly boundaryFaults: InMemoryDriveBoundaryFault[] = [];
  private readonly invalidCursors = new Map<string, InMemoryDriveCursorInvalidation>();
  private nextListingControl?: InMemoryDriveListingControl;
  private nextChangePageControl?: InMemoryDriveChangePageControl;
  private nextRootId = 1;
  private nextObjectId = 1;

  async authenticationState(): Promise<DriveAuthenticationState> {
    return { status: "authenticated", accountHint: "in-memory-drive" };
  }

  queueBoundaryFault(fault: InMemoryDriveBoundaryFault): void {
    const mutationBoundaries = new Set<InMemoryDriveBoundary>([
      "create",
      "update",
      "move",
      "trash",
    ]);
    if (
      fault.mutationEffect !== undefined &&
      !mutationBoundaries.has(fault.boundary)
    ) {
      throw new Error(
        `Mutation effect mode is invalid for non-mutation boundary: ${fault.boundary}`,
      );
    }
    this.boundaryFaults.push(fault);
  }

  invalidateCursor(
    cursor: ChangeCursor,
    reason: InMemoryDriveCursorInvalidation = "invalid",
  ): void {
    this.invalidCursors.set(String(cursor), reason);
  }

  scriptNextListing(control: InMemoryDriveListingControl): void {
    this.assertIncompleteIfOmitting(
      control.completeness,
      control.omitRemoteObjectIds,
      "listing",
    );
    this.nextListingControl = control;
  }

  scriptNextChangePage(control: InMemoryDriveChangePageControl): void {
    this.assertIncompleteIfOmitting(
      control.completeness,
      control.omitRemoteObjectIds,
      "change-page",
    );
    this.nextChangePageControl = control;
  }

  removeExternally(remoteObjectId: RemoteObjectId): void {
    const object = this.objectsById.get(String(remoteObjectId));
    if (!object) {
      throw new Error(
        `Cannot externally remove unknown remote object: ${String(remoteObjectId)}`,
      );
    }
    const root = this.roots.get(String(object.rootId));
    if (!root) {
      throw new Error(
        `Cannot externally remove object with missing root: ${String(remoteObjectId)}`,
      );
    }

    const affected = [...root.objects.values()]
      .filter(
        (candidate) =>
          candidate.remoteObjectId === object.remoteObjectId ||
          isDescendantPath(candidate.path, object.path),
      )
      .sort((left, right) =>
        String(left.path) < String(right.path)
          ? -1
          : String(left.path) > String(right.path)
            ? 1
            : 0,
      );

    for (const candidate of affected) {
      root.objects.delete(String(candidate.remoteObjectId));
      this.objectsById.delete(String(candidate.remoteObjectId));
      this.recordRemoved(
        root,
        candidate.remoteObjectId,
        candidate.path,
      );
    }
  }

  async createManagedRoot(
    vaultIdentity: VaultIdentity,
    protocolVersion: ProtocolVersion,
  ): Promise<DriveResult<ManagedRemoteIdentity>> {
    if (String(protocolVersion) !== "1") {
      return recoveryRequired("unsupported-remote-protocol-version");
    }

    const rootId = virtualRemoteObjectId(`root-${this.nextRootId++}`);
    const identity: ManagedRemoteIdentity = {
      rootId,
      vaultIdentity,
      protocolVersion,
    };
    this.roots.set(String(rootId), {
      identity,
      objects: new Map<string, InMemoryRemoteObject>(),
      changes: [],
    });
    return { ok: true, value: identity };
  }

  async pairManagedRoot(
    rootId: RemoteObjectId,
    expectedVaultIdentity: VaultIdentity,
  ): Promise<DriveResult<ManagedRemoteValidation>> {
    return this.validateByExpected(rootId, expectedVaultIdentity);
  }

  async validateManagedRoot(
    identity: ManagedRemoteIdentity,
  ): Promise<DriveResult<ManagedRemoteValidation>> {
    const validation = this.validateByExpected(
      identity.rootId,
      identity.vaultIdentity,
    );
    if (!validation.ok || validation.value.status !== "valid") {
      return validation;
    }

    if (
      validation.value.identity.protocolVersion !== identity.protocolVersion
    ) {
      return {
        ok: true,
        value: {
          status: "incompatible-protocol",
          observedVersion: validation.value.identity.protocolVersion,
        },
      };
    }
    return validation;
  }

  async protocolInfo(
    rootId: RemoteObjectId,
  ): Promise<DriveResult<RemoteProtocolInfo>> {
    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);
    return {
      ok: true,
      value: {
        currentVersion: root.identity.protocolVersion,
        compatible: String(root.identity.protocolVersion) === "1",
      },
    };
  }

  async listForReconciliation(
    rootId: RemoteObjectId,
  ): Promise<DriveResult<RemoteListing>> {
    const fault = this.takeBoundaryFault("list");
    if (fault) return { ok: false, signal: fault.signal };

    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);

    let entries = [...root.objects.values()]
      .filter((object) => this.isVisible(root, object))
      .sort((left, right) => {
        const byPath =
          String(left.path) < String(right.path)
            ? -1
            : String(left.path) > String(right.path)
              ? 1
              : 0;
        if (byPath !== 0) return byPath;
        return String(left.remoteObjectId) < String(right.remoteObjectId)
          ? -1
          : String(left.remoteObjectId) > String(right.remoteObjectId)
            ? 1
            : 0;
      })
      .map((object) => this.entryFor(object));

    const control = this.nextListingControl;
    this.nextListingControl = undefined;
    if (control?.omitRemoteObjectIds?.length) {
      const omitted = new Set(control.omitRemoteObjectIds.map(String));
      entries = entries.filter(
        (entry) => !omitted.has(String(entry.remoteObjectId)),
      );
    }

    const seen = new Map<string, RemoteObjectId>();
    for (const entry of entries) {
      const key = comparisonKey(entry.path);
      const prior = seen.get(key);
      if (prior && prior !== entry.remoteObjectId) {
        return conflict(`remote-listing-duplicate-path:${String(entry.path)}`);
      }
      seen.set(key, entry.remoteObjectId);
    }

    return {
      ok: true,
      value: {
        entries,
        completeness: control?.completeness ?? { status: "complete" },
      },
    };
  }

  async getStartCursor(
    rootId: RemoteObjectId,
  ): Promise<DriveResult<ChangeCursor>> {
    const fault = this.takeBoundaryFault("start-cursor");
    if (fault) return { ok: false, signal: fault.signal };

    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);
    return {
      ok: true,
      value: this.cursorFor(rootId, root.changes.length),
    };
  }

  async readChanges(
    rootId: RemoteObjectId,
    cursor: ChangeCursor,
  ): Promise<DriveResult<RemoteChangePage>> {
    const fault = this.takeBoundaryFault("read-changes");
    if (fault) return { ok: false, signal: fault.signal };

    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);

    if (this.invalidCursors.has(String(cursor))) {
      return recoveryRequired("drive-change-cursor-invalid");
    }

    const position = this.cursorPosition(rootId, cursor);
    if (
      position === undefined ||
      position < 0 ||
      position > root.changes.length
    ) {
      return recoveryRequired("drive-change-cursor-invalid");
    }

    let changes = root.changes.slice(position);
    const control = this.nextChangePageControl;
    this.nextChangePageControl = undefined;
    if (control?.omitRemoteObjectIds?.length) {
      const omitted = new Set(control.omitRemoteObjectIds.map(String));
      changes = changes.filter((change) => {
        const id =
          change.kind === "upsert"
            ? change.entry.remoteObjectId
            : change.remoteObjectId;
        return !omitted.has(String(id));
      });
    }

    return {
      ok: true,
      value: {
        changes,
        nextCursor: this.cursorFor(rootId, root.changes.length),
        completeness: control?.completeness ?? { status: "complete" },
      },
    };
  }

  async observe(
    rootId: RemoteObjectId,
    path: VaultPath,
  ): Promise<DriveResult<RemoteObservation>> {
    const fault = this.takeBoundaryFault("observe");
    if (fault) return { ok: false, signal: fault.signal };

    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);

    const normalized = virtualDrivePath(String(path));
    const candidates = [...root.objects.values()].filter(
      (object) =>
        this.isVisible(root, object) &&
        String(object.path) === String(normalized),
    );

    if (candidates.length === 0) {
      return {
        ok: true,
        value: { status: "absent", side: "remote", path: normalized },
      };
    }
    if (candidates.length > 1) {
      return conflict(`ambiguous-remote-path:${String(normalized)}`);
    }

    const object = candidates[0];
    return {
      ok: true,
      value: {
        status: "present",
        side: "remote",
        path: normalized,
        entityKind: object.entityKind,
        remoteObjectId: object.remoteObjectId,
        ...(object.entityKind === "file"
          ? { content: fileEvidence(object) }
          : {}),
        stability: "stable",
      },
    };
  }

  async download(
    remoteObjectId: RemoteObjectId,
  ): Promise<DriveResult<RemoteDownload>> {
    const fault = this.takeBoundaryFault("download");
    if (fault) return { ok: false, signal: fault.signal };

    const object = this.objectsById.get(String(remoteObjectId));
    if (!object) return notFound(remoteObjectId);
    if (object.entityKind === "folder") {
      return conflict("cannot-download-folder");
    }

    const bytes = object.bytes ?? new Uint8Array();
    return {
      ok: true,
      value: {
        content: contentSource(bytes),
        remoteObjectId: object.remoteObjectId,
        evidence: fileEvidence(object),
      },
    };
  }

  async create(
    rootId: RemoteObjectId,
    request: RemoteCreateRequest,
  ): Promise<DriveResult<RemoteMutationReceipt>> {
    const fault = this.takeBoundaryFault("create");
    if (fault && fault.mutationEffect !== "applied-before-failure") {
      return { ok: false, signal: fault.signal };
    }

    const root = this.roots.get(String(rootId));
    if (!root) return notFound(rootId);

    const path = virtualDrivePath(String(request.path));
    const parentResult = this.ensureParentFolders(root, path);
    if (!parentResult.ok) return parentResult;

    let bytes: Uint8Array | undefined;
    if (request.entityKind === "file") {
      if (!request.content) {
        return conflict("file-create-content-required");
      }
      bytes = await collectContent(request.content);
    }

    const object = this.createObject(root, path, request.entityKind, bytes);
    const evidence =
      object.entityKind === "file" ? fileEvidence(object) : undefined;

    if (object.entityKind === "file") {
      const createMismatch = evidenceMismatch(
        evidence ?? {},
        request.expectedEvidence,
      );
      if (createMismatch) {
        return recoveryRequired(
          createMismatch === "size"
            ? "uploaded-size-integrity-mismatch"
            : "uploaded-hash-integrity-mismatch",
        );
      }
    }

    const result: DriveResult<RemoteMutationReceipt> = {
      ok: true,
      value: {
        remoteObjectId: object.remoteObjectId,
        path,
        ...(evidence ? { evidence } : {}),
      },
    };
    return fault?.mutationEffect === "applied-before-failure"
      ? { ok: false, signal: fault.signal }
      : result;
  }

  async update(
    request: RemoteUpdateRequest,
  ): Promise<DriveResult<RemoteMutationReceipt>> {
    const fault = this.takeBoundaryFault("update");
    if (fault && fault.mutationEffect !== "applied-before-failure") {
      return { ok: false, signal: fault.signal };
    }

    const object = this.objectsById.get(String(request.remoteObjectId));
    if (!object) return notFound(request.remoteObjectId);
    if (object.entityKind === "folder") {
      return conflict("cannot-update-folder");
    }
    if (
      request.expectedRemoteRevision !== undefined &&
      String(object.revision) !== request.expectedRemoteRevision
    ) {
      return conflict("remote-revision-precondition-failed");
    }

    const requestedPath = virtualDrivePath(String(request.path));
    if (
      String(parentPath(requestedPath)) !==
      String(parentPath(object.path))
    ) {
      return conflict("update-parent-change-requires-move");
    }

    const root = this.roots.get(String(object.rootId));
    if (!root) return recoveryRequired("managed-object-root-missing");

    object.path = requestedPath;
    object.bytes = await collectContent(request.content);
    object.revision += 1;
    const evidence = fileEvidence(object);
    this.recordUpsert(root, object);

    const updateMismatch = evidenceMismatch(
      evidence,
      request.expectedEvidence,
    );
    if (updateMismatch) {
      return recoveryRequired(
        updateMismatch === "size"
          ? "uploaded-size-integrity-mismatch"
          : "uploaded-hash-integrity-mismatch",
      );
    }

    const result: DriveResult<RemoteMutationReceipt> = {
      ok: true,
      value: {
        remoteObjectId: object.remoteObjectId,
        path: object.path,
        evidence,
      },
    };
    return fault?.mutationEffect === "applied-before-failure"
      ? { ok: false, signal: fault.signal }
      : result;
  }

  async move(
    remoteObjectId: RemoteObjectId,
    _fromPath: VaultPath,
    toPath: VaultPath,
  ): Promise<DriveResult<RemoteMutationReceipt>> {
    const fault = this.takeBoundaryFault("move");
    if (fault && fault.mutationEffect !== "applied-before-failure") {
      return { ok: false, signal: fault.signal };
    }

    const object = this.objectsById.get(String(remoteObjectId));
    if (!object) return notFound(remoteObjectId);

    const root = this.roots.get(String(object.rootId));
    if (!root) {
      return recoveryRequired("managed-object-root-missing");
    }

    const target = virtualDrivePath(String(toPath));
    if (
      object.entityKind === "folder" &&
      isDescendantPath(target, object.path)
    ) {
      return conflict("cannot-move-folder-into-own-subtree");
    }

    const parentResult = this.ensureParentFolders(root, target);
    if (!parentResult.ok) return parentResult;

    const previousPath = object.path;
    if (object.entityKind === "folder") {
      const descendants = [...root.objects.values()].filter(
        (candidate) =>
          candidate.remoteObjectId !== object.remoteObjectId &&
          isDescendantPath(candidate.path, previousPath),
      );
      for (const descendant of descendants) {
        const suffix = String(descendant.path).slice(String(previousPath).length);
        descendant.path = virtualDrivePath(`${String(target)}${suffix}`);
      }
    }

    object.path = target;
    object.revision += 1;
    this.recordUpsert(root, object);

    const result: DriveResult<RemoteMutationReceipt> = {
      ok: true,
      value: {
        remoteObjectId: object.remoteObjectId,
        path: object.path,
        ...(object.entityKind === "file"
          ? { evidence: fileEvidence(object) }
          : {}),
      },
    };
    return fault?.mutationEffect === "applied-before-failure"
      ? { ok: false, signal: fault.signal }
      : result;
  }

  async trash(remoteObjectId: RemoteObjectId): Promise<DriveResult<void>> {
    const fault = this.takeBoundaryFault("trash");
    if (fault && fault.mutationEffect !== "applied-before-failure") {
      return { ok: false, signal: fault.signal };
    }

    const object = this.objectsById.get(String(remoteObjectId));
    if (!object) return notFound(remoteObjectId);
    const root = this.roots.get(String(object.rootId));
    if (!root) return recoveryRequired("managed-object-root-missing");

    if (!object.trashed) {
      object.trashed = true;
      object.revision += 1;
      this.recordUpsert(root, object);
    }

    return fault?.mutationEffect === "applied-before-failure"
      ? { ok: false, signal: fault.signal }
      : { ok: true, value: undefined };
  }

  inspectObject(
    remoteObjectId: RemoteObjectId,
  ): InMemoryRemoteObjectSnapshot | undefined {
    const object = this.objectsById.get(String(remoteObjectId));
    if (!object) return undefined;
    return {
      remoteObjectId: object.remoteObjectId,
      rootId: object.rootId,
      path: object.path,
      parentPath: parentPath(object.path),
      entityKind: object.entityKind,
      revision: String(object.revision),
      trashed: object.trashed,
      ...(object.entityKind === "file"
        ? { evidence: fileEvidence(object) }
        : {}),
    };
  }

  private takeBoundaryFault(
    boundary: InMemoryDriveBoundary,
  ): InMemoryDriveBoundaryFault | undefined {
    const index = this.boundaryFaults.findIndex(
      (fault) => fault.boundary === boundary,
    );
    if (index < 0) return undefined;
    return this.boundaryFaults.splice(index, 1)[0];
  }

  private cursorFor(
    rootId: RemoteObjectId,
    position: number,
  ): ChangeCursor {
    return virtualChangeCursor(
      `in-memory-drive:${String(rootId)}:${position}`,
    );
  }

  private cursorPosition(
    rootId: RemoteObjectId,
    cursor: ChangeCursor,
  ): number | undefined {
    const prefix = `in-memory-drive:${String(rootId)}:`;
    const raw = String(cursor);
    if (!raw.startsWith(prefix)) return undefined;
    const suffix = raw.slice(prefix.length);
    if (!/^\d+$/.test(suffix)) return undefined;
    const position = Number(suffix);
    return Number.isSafeInteger(position) ? position : undefined;
  }

  private assertIncompleteIfOmitting(
    completeness: EnumerationCompleteness,
    omitted: readonly RemoteObjectId[] | undefined,
    surface: string,
  ): void {
    if (
      omitted?.length &&
      completeness.status === "complete"
    ) {
      throw new Error(
        `${surface} cannot omit remote objects while claiming complete coverage`,
      );
    }
  }

  private recordUpsert(
    root: ManagedRootState,
    object: InMemoryRemoteObject,
  ): void {
    root.changes.push({
      kind: "upsert",
      entry: this.entryFor(object),
    });
  }

  private recordRemoved(
    root: ManagedRootState,
    remoteObjectId: RemoteObjectId,
    lastKnownPath: VaultPath,
  ): void {
    root.changes.push({
      kind: "removed",
      remoteObjectId,
      lastKnownPath,
    });
  }

  private isVisible(
    root: ManagedRootState,
    object: InMemoryRemoteObject,
  ): boolean {
    if (object.trashed) return false;
    const ancestors = [...root.objects.values()].filter(
      (candidate) =>
        candidate.entityKind === "folder" &&
        candidate.trashed &&
        isDescendantPath(object.path, candidate.path),
    );
    return ancestors.length === 0;
  }

  private validateByExpected(
    rootId: RemoteObjectId,
    expectedVaultIdentity: VaultIdentity,
  ): DriveResult<ManagedRemoteValidation> {
    const root = this.roots.get(String(rootId));
    if (!root) {
      return { ok: true, value: { status: "missing-root" } };
    }
    if (root.identity.vaultIdentity !== expectedVaultIdentity) {
      return {
        ok: true,
        value: {
          status: "identity-mismatch",
          observedVaultIdentity: root.identity.vaultIdentity,
        },
      };
    }
    if (String(root.identity.protocolVersion) !== "1") {
      return {
        ok: true,
        value: {
          status: "incompatible-protocol",
          observedVersion: root.identity.protocolVersion,
        },
      };
    }
    return { ok: true, value: { status: "valid", identity: root.identity } };
  }

  private ensureParentFolders(
    root: ManagedRootState,
    path: VaultPath,
  ): DriveResult<void> {
    const segments = normalizePath(String(path)).split("/").filter(Boolean);
    let current = "";

    for (const segment of segments.slice(0, -1)) {
      current = current ? `${current}/${segment}` : segment;
      const existing = [...root.objects.values()].filter(
        (object) =>
          !object.trashed && String(object.path) === current,
      );

      if (existing.length > 1) {
        return conflict(`ambiguous-remote-parent:${current}`);
      }
      if (existing.length === 1) {
        if (existing[0].entityKind !== "folder") {
          return conflict(`remote-parent-is-file:${current}`);
        }
        continue;
      }

      this.createObject(root, virtualDrivePath(current), "folder");
    }
    return { ok: true, value: undefined };
  }

  private createObject(
    root: ManagedRootState,
    path: VaultPath,
    entityKind: EntityKind,
    bytes?: Uint8Array,
  ): InMemoryRemoteObject {
    const remoteObjectId = virtualRemoteObjectId(
      `remote-${this.nextObjectId++}`,
    );
    const object: InMemoryRemoteObject = {
      remoteObjectId,
      rootId: root.identity.rootId,
      path,
      entityKind,
      ...(entityKind === "file"
        ? { bytes: copyBytes(bytes ?? new Uint8Array()) }
        : {}),
      revision: 1,
      trashed: false,
    };
    root.objects.set(String(remoteObjectId), object);
    this.objectsById.set(String(remoteObjectId), object);
    this.recordUpsert(root, object);
    return object;
  }

  private entryFor(object: InMemoryRemoteObject): RemoteEntry {
    return {
      path: object.path,
      entityKind: object.entityKind,
      remoteObjectId: object.remoteObjectId,
      ...(object.entityKind === "file"
        ? { content: fileEvidence(object) }
        : {}),
      trashed: object.trashed,
    };
  }
}
