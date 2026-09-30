import {
  BoundedAuditHistory,
  CanonicalEvidenceLocalVault,
  DeterministicSynchronizationPlanner,
  InMemoryRunLeasePort,
  MemoryAuditPersistence,
  MemoryTextVersionPersistence,
  ProductController,
  ProductPathScope,
  ScopedLocalTransactionalMutationPort,
  ScopedLocalVault,
  ProductSnapshotAssembler,
  ProductSynchronizationExecutor,
  ProductTextVersionStore,
  ProductionSynchronizationPlanner,
  ThreeWayConflictResolver,
  type BinaryContentSource,
  type CanonicalFileContentProof,
  type DriveResult,
  type ManagedRemoteIdentity,
  type MutationIntentId,
  type ReliableRemoteMutationPort,
  type RemoteFolderCreateObservation,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteMutationIdentity,
  type RemoteMutationOutcome,
  type RemoteObjectId,
  type RemoteUpdateFinalizationPort,
  type SynchronizationCancellationSignal,
  type VaultPath,
} from "../../../src/product/local-vault-boundary-seam";

type ReservedCreateIdentity = Extract<RemoteMutationIdentity, { readonly kind: "reserved-file-create" | "reserved-folder-create" }>;
type UpdateIdentity = Extract<RemoteMutationIdentity, { readonly kind: "existing-file-content-update" }>;
type MoveIdentity = Extract<RemoteMutationIdentity, { readonly kind: "identity-preserving-move" }>;
type TrashIdentity = Extract<RemoteMutationIdentity, { readonly kind: "trash" }>;
type DriveFailure = Extract<DriveResult<never>, { readonly ok: false }>;

import {
  InMemoryGoogleDriveCore,
  type InMemoryRemoteObjectSnapshot,
  virtualDrivePath,
  virtualProtocolVersion,
} from "./in-memory-google-drive";
import {
  InMemoryLocalVault,
  virtualVaultPath,
} from "./in-memory-local-vault";
import {
  DeterministicOrderGate,
  VirtualDeviceBacking,
  VirtualDeviceRuntime,
  deterministicDeviceIdentity,
  virtualDeviceVaultIdentity,
} from "./per-device-runtime";

function cancelled(signal?: SynchronizationCancellationSignal): boolean {
  return signal?.cancelled === true;
}

function binarySource(bytes: Uint8Array): BinaryContentSource {
  const retained = Uint8Array.from(bytes);
  return {
    sizeBytes: retained.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield Uint8Array.from(retained);
    },
  };
}

async function collect(source: BinaryContentSource): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of source.openChunks()) {
    const copy = Uint8Array.from(chunk);
    chunks.push(copy);
    total += copy.byteLength;
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return all;
}

function canonicalMatches(
  snapshot: InMemoryRemoteObjectSnapshot | undefined,
  expected: CanonicalFileContentProof,
): boolean {
  return Boolean(
    snapshot &&
      !snapshot.trashed &&
      snapshot.entityKind === "file" &&
      snapshot.evidence?.hash === expected.hash &&
      snapshot.evidence.sizeBytes === expected.sizeBytes,
  );
}

function pathKey(path: VaultPath): string {
  return String(path)
    .replace(/\\/g, "/")
    .normalize("NFC")
    .toLocaleLowerCase("en-US");
}

function parentPath(path: VaultPath): VaultPath {
  const value = String(path).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const slash = value.lastIndexOf("/");
  return virtualDrivePath(slash < 0 ? "" : value.slice(0, slash));
}

export type VirtualCrashBoundary = "before-remote-dispatch" | "after-remote-effect" | "before-canonical-state-write" | "after-canonical-state-write";

class VirtualCrashController {
  private armed?: VirtualCrashBoundary;

  arm(boundary: VirtualCrashBoundary): void { this.armed = boundary; }

  private hit(boundary: VirtualCrashBoundary): void {
    if (this.armed !== boundary) return;
    this.armed = undefined;
    throw new Error(`virtual-crash:${boundary}`);
  }

  wrapRemote<T extends object>(target: T): T {
    const physical = new Set(["createReserved", "updateExisting", "moveExisting", "trashExisting"]);
    return new Proxy(target, { get: (inner, property) => {
      const value = Reflect.get(inner, property, inner);
      if (typeof value !== "function") return value;
      const call = value.bind(inner) as (...args: unknown[]) => unknown;
      if (!physical.has(String(property))) return call;
      return async (...args: unknown[]) => {
        this.hit("before-remote-dispatch");
        const result = await call(...args);
        if ((result as { status?: string } | undefined)?.status === "verified-effect") this.hit("after-remote-effect");
        return result;
      };
    } }) as T;
  }

  wrapStateStore<T extends object>(target: T): T {
    return new Proxy(target, { get: (inner, property) => {
      const value = Reflect.get(inner, property, inner);
      if (typeof value !== "function") return value;
      const call = value.bind(inner) as (...args: unknown[]) => unknown;
      if (property !== "saveTrusted") return call;
      return async (...args: unknown[]) => {
        const canonicalCommit = this.isCanonicalCompletionCandidate(args[0]);
        if (canonicalCommit) this.hit("before-canonical-state-write");
        const result = await call(...args);
        if (canonicalCommit && (result as { status?: string } | undefined)?.status === "saved") this.hit("after-canonical-state-write");
        return result;
      };
    } }) as T;
  }

  private isCanonicalCompletionCandidate(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const state = value as {
      readonly operations?: readonly { readonly operationId?: unknown; readonly status?: unknown }[];
      readonly operationIntents?: readonly {
        readonly operationId?: unknown;
        readonly effects?: readonly { readonly stage?: unknown }[];
      }[];
    };
    if (!Array.isArray(state.operations) || !Array.isArray(state.operationIntents)) return false;
    const completed = new Set(
      state.operations
        .filter(operation => operation.status === "completed" && operation.operationId !== undefined)
        .map(operation => String(operation.operationId)),
    );
    return state.operationIntents.some(intent =>
      intent.operationId !== undefined &&
      completed.has(String(intent.operationId)) &&
      Array.isArray(intent.effects) &&
      intent.effects.some((effect: { readonly stage?: unknown }) => effect.stage === "effect-verified"),
    );
  }
}

export class InMemoryReliableRemoteMutationPort implements ReliableRemoteMutationPort, RemoteUpdateFinalizationPort, RemoteFolderCreateRecoveryReadPort {
  private readonly postMutationObservationFailures: string[] = [];

  constructor(
    private readonly drive: InMemoryGoogleDriveCore,
    private readonly managedRemote: ManagedRemoteIdentity,
  ) {}

  queuePostMutationObservationFailure(reason = "simulated-post-mutation-observation-failure"): void {
    this.postMutationObservationFailures.push(reason);
  }

  async reserveFileCreateIdentity(
    root: ManagedRemoteIdentity,
    intentId: MutationIntentId,
    path: VaultPath,
    intendedContent: CanonicalFileContentProof,
  ): ReturnType<ReliableRemoteMutationPort["reserveFileCreateIdentity"]> {
    const validation = await this.validateRoot(root);
    if (validation) return validation;
    if (
      intendedContent.algorithm !== "sha256" ||
      !String(intendedContent.hash).startsWith("sha256:") ||
      intendedContent.sizeBytes < 0
    ) {
      return {
        ok: false,
        signal: {
          kind: "conflict",
          detail: "canonical-create-content-proof-required",
        },
      };
    }
    return {
      ok: true,
      value: {
        kind: "reserved-file-create",
        intentId,
        reservedRemoteObjectId: this.drive.reserveProviderObjectId(),
        path,
        intendedContent,
      },
    };
  }

  async reserveFolderCreateIdentity(
    root: ManagedRemoteIdentity,
    intentId: MutationIntentId,
    path: VaultPath,
  ): ReturnType<ReliableRemoteMutationPort["reserveFolderCreateIdentity"]> {
    const validation = await this.validateRoot(root);
    if (validation) return validation;
    return {
      ok: true,
      value: {
        kind: "reserved-folder-create",
        intentId,
        reservedRemoteObjectId: this.drive.reserveProviderObjectId(),
        path,
      },
    };
  }

  async createReserved(identity: ReservedCreateIdentity, content?: BinaryContentSource, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome> {
    if (cancelled(cancellation)) {
      return {
        status: "verified-not-applied",
        reason: "synchronization-cancelled-before-dispatch",
      };
    }

    const prior = this.drive.inspectObject(identity.reservedRemoteObjectId);
    if (prior) return this.verifyReserved(identity, prior);

    const parent = this.parentRemoteObjectId(identity.path);
    if (!parent) {
      return {
        status: "verified-not-applied",
        reason: "reserved-create-parent-absent",
      };
    }
    if (identity.kind === "reserved-file-create" && !content) {
      return {
        status: "verified-not-applied",
        reason: "reserved-file-create-content-required",
      };
    }
    if (
      identity.kind === "reserved-file-create" &&
      content?.sizeBytes !== undefined &&
      content.sizeBytes !== identity.intendedContent.sizeBytes
    ) {
      return {
        status: "verified-not-applied",
        reason: "reserved-file-create-size-precondition-mismatch",
      };
    }

    const dispatched = await this.drive.createWithRemoteObjectId(
      this.managedRemote.rootId,
      identity.reservedRemoteObjectId,
      {
        path: identity.path,
        entityKind:
          identity.kind === "reserved-folder-create" ? "folder" : "file",
        ...(content ? { content } : {}),
        ...(identity.kind === "reserved-file-create"
          ? {
              expectedEvidence: {
                hash: identity.intendedContent.hash,
                sizeBytes: identity.intendedContent.sizeBytes,
              },
            }
          : {}),
      },
    );

    const observationFailure = this.takePostMutationObservationFailure();
    if (observationFailure) {
      return { status: "outcome-unknown", reason: observationFailure };
    }

    const observed = this.drive.inspectObject(identity.reservedRemoteObjectId);
    if (observed) return this.verifyReserved(identity, observed);

    return dispatched.ok
      ? {
          status: "outcome-unknown",
          reason: "reserved-create-post-observation-missing",
        }
      : {
          status: "outcome-unknown",
          reason: `reserved-create-ambiguous:${dispatched.signal.kind}`,
        };
  }

  async updateExisting(identity: UpdateIdentity, content: BinaryContentSource, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome> {
    if (identity.updateProtocol !== "immutable-candidate-preservation") {
      return { status: "outcome-unknown", reason: "unsupported-update-protocol" };
    }
    if (cancelled(cancellation)) {
      return {
        status: "verified-not-applied",
        reason: "synchronization-cancelled-before-dispatch",
      };
    }

    const predecessor = this.drive.inspectObject(identity.remoteObjectId);
    const precondition = this.validateUpdatePredecessor(identity, predecessor);
    if (precondition) return precondition;

    let candidate = this.drive.inspectObject(identity.candidateRemoteObjectId);
    if (!candidate) {
      const dispatched = await this.drive.createWithRemoteObjectId(
        this.managedRemote.rootId,
        identity.candidateRemoteObjectId,
        {
          path: identity.path,
          entityKind: "file",
          content,
          expectedEvidence: {
            hash: identity.intendedContent.hash,
            sizeBytes: identity.intendedContent.sizeBytes,
          },
        },
      );
      const observationFailure = this.takePostMutationObservationFailure();
      if (observationFailure) {
        return { status: "outcome-unknown", reason: observationFailure };
      }
      candidate = this.drive.inspectObject(identity.candidateRemoteObjectId);
      if (!candidate) {
        return {
          status: "outcome-unknown",
          reason: dispatched.ok
            ? "update-candidate-post-observation-missing"
            : `candidate-dispatch-ambiguous:${dispatched.signal.kind}`,
        };
      }
    }
    return this.finalizeExistingUpdate(identity, cancellation);
  }

  async finalizeExistingUpdate(identity: UpdateIdentity, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome> {
    if (cancelled(cancellation)) {
      return {
        status: "outcome-unknown",
        reason: "synchronization-cancelled-before-update-finalization",
      };
    }

    const predecessor = this.drive.inspectObject(identity.remoteObjectId);
    const precondition = this.validateUpdatePredecessor(identity, predecessor);
    if (precondition) return precondition;

    const candidate = this.drive.inspectObject(identity.candidateRemoteObjectId);
    const preserved = [
      identity.remoteObjectId,
      identity.candidateRemoteObjectId,
    ] as const;
    if (!canonicalMatches(candidate, identity.intendedContent)) {
      return {
        status: "conflict-preserved",
        reason: "candidate-content-not-authoritatively-verified",
        preservedRemoteObjectIds: preserved,
      };
    }
    if (String(candidate?.path) !== String(identity.path)) {
      return {
        status: "conflict-preserved",
        reason: "candidate-observed-at-unintended-path",
        preservedRemoteObjectIds: preserved,
      };
    }

    const before = this.drive.inspectObjectsAtPath(
      this.managedRemote.rootId,
      identity.path,
    );
    const allowed = new Set(preserved.map(String));
    const independent = before.filter(
      object => !allowed.has(String(object.remoteObjectId)),
    );
    if (
      !before.some(
        object => object.remoteObjectId === identity.candidateRemoteObjectId,
      ) ||
      independent.length > 0
    ) {
      return {
        status: "conflict-preserved",
        reason: "update-path-contains-independent-candidate",
        preservedRemoteObjectIds: before.map(object => object.remoteObjectId),
      };
    }

    if (predecessor && !predecessor.trashed) {
      if (
        before.length !== 2 ||
        !before.some(object => object.remoteObjectId === identity.remoteObjectId)
      ) {
        return {
          status: "outcome-unknown",
          reason: "update-predecessor-live-state-is-not-exactly-resumable",
        };
      }
      const retired = await this.drive.trash(identity.remoteObjectId);
      const observationFailure = this.takePostMutationObservationFailure();
      if (observationFailure) {
        return { status: "outcome-unknown", reason: observationFailure };
      }
      const afterRetirement = this.drive.inspectObject(identity.remoteObjectId);
      if (!afterRetirement?.trashed) {
        return {
          status: "outcome-unknown",
          reason: retired.ok
            ? "update-predecessor-retirement-not-verified"
            : `update-predecessor-retirement-${retired.signal.kind}`,
        };
      }
    }

    const after = this.drive.inspectObjectsAtPath(
      this.managedRemote.rootId,
      identity.path,
    );
    if (
      after.length !== 1 ||
      after[0]?.remoteObjectId !== identity.candidateRemoteObjectId ||
      !canonicalMatches(after[0], identity.intendedContent)
    ) {
      return {
        status: "outcome-unknown",
        reason: "update-candidate-is-not-sole-live-path-occupant-after-retirement",
      };
    }

    return {
      status: "verified-effect",
      receipt: {
        remoteObjectId: identity.candidateRemoteObjectId,
        path: identity.path,
        evidence: after[0].evidence,
      },
      applicationProof: {
        kind: "immutable-candidate-preservation",
        candidateRemoteObjectId: identity.candidateRemoteObjectId,
        predecessorRemoteObjectId: identity.remoteObjectId,
        predecessorRevision: identity.expectedRevision,
        intendedContent: identity.intendedContent,
        verifiedContent: identity.intendedContent,
        preservedRemoteObjectIds: preserved,
      },
    };
  }

  async moveExisting(identity: MoveIdentity, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome> {
    if (cancelled(cancellation)) {
      return {
        status: "verified-not-applied",
        reason: "synchronization-cancelled-before-dispatch",
      };
    }
    if (
      identity.identityAuthority.remoteObjectId !== identity.remoteObjectId ||
      identity.identityAuthority.path !== identity.fromPath
    ) {
      return { status: "outcome-unknown", reason: "move-identity-authority-inconsistent" };
    }

    const before = this.drive.inspectObject(identity.remoteObjectId);
    if (!before) {
      return { status: "verified-not-applied", reason: "move-object:not-found" };
    }
    if (before.trashed) {
      return { status: "verified-not-applied", reason: "move-object-trashed" };
    }
    if (String(before.path) === String(identity.toPath)) {
      return this.moveVerified(identity, before);
    }
    if (String(before.path) !== String(identity.fromPath)) {
      return {
        status: "conflict-preserved",
        reason: "move-source-no-longer-at-authorized-path",
        preservedRemoteObjectIds: [identity.remoteObjectId],
      };
    }
    if (!this.parentRemoteObjectId(identity.toPath)) {
      return { status: "verified-not-applied", reason: "move-parent-absent" };
    }
    const occupied = this.drive
      .inspectObjectsAtPath(this.managedRemote.rootId, identity.toPath)
      .filter(object => object.remoteObjectId !== identity.remoteObjectId);
    if (occupied.length) {
      return {
        status: "conflict-preserved",
        reason: "move-target-occupied-or-ambiguous",
        preservedRemoteObjectIds: occupied.map(object => object.remoteObjectId),
      };
    }

    const dispatched = await this.drive.move(
      identity.remoteObjectId,
      identity.fromPath,
      identity.toPath,
    );
    const observationFailure = this.takePostMutationObservationFailure();
    if (observationFailure) {
      return { status: "outcome-unknown", reason: observationFailure };
    }
    const after = this.drive.inspectObject(identity.remoteObjectId);
    if (after && !after.trashed && String(after.path) === String(identity.toPath)) {
      return this.moveVerified(identity, after);
    }
    if (after && !after.trashed && String(after.path) === String(identity.fromPath)) {
      return {
        status: "verified-not-applied",
        reason: dispatched.ok
          ? "move-post-observation-still-at-source"
          : `move-${dispatched.signal.kind}-still-at-source`,
      };
    }
    return {
      status: "outcome-unknown",
      reason: "move-effect-not-verifiable",
    };
  }

  async trashExisting(identity: TrashIdentity, cancellation?: SynchronizationCancellationSignal): Promise<RemoteMutationOutcome> {
    if (cancelled(cancellation)) {
      return {
        status: "verified-not-applied",
        reason: "synchronization-cancelled-before-dispatch",
      };
    }
    if (
      identity.identityAuthority.remoteObjectId !== identity.remoteObjectId ||
      identity.identityAuthority.path !== identity.path ||
      identity.baseAuthority.path !== identity.path
    ) {
      return { status: "outcome-unknown", reason: "trash-authority-inconsistent" };
    }
    const before = this.drive.inspectObject(identity.remoteObjectId);
    if (!before) {
      return { status: "verified-not-applied", reason: "trash-object:not-found" };
    }
    if (before.trashed) return this.trashVerified(identity);
    if (String(before.path) !== String(identity.path)) {
      return {
        status: "conflict-preserved",
        reason: "trash-object-no-longer-at-authorized-path",
        preservedRemoteObjectIds: [identity.remoteObjectId],
      };
    }

    const dispatched = await this.drive.trash(identity.remoteObjectId);
    const observationFailure = this.takePostMutationObservationFailure();
    if (observationFailure) {
      return { status: "outcome-unknown", reason: observationFailure };
    }
    const after = this.drive.inspectObject(identity.remoteObjectId);
    if (after?.trashed) return this.trashVerified(identity);
    return dispatched.ok
      ? { status: "verified-not-applied", reason: "trash-post-observation-not-trashed" }
      : { status: "outcome-unknown", reason: `trash-${dispatched.signal.kind}` };
  }

  async observeFolderCreateRecovery(
    descriptor: RemoteFolderCreatePhysicalMutationDescriptor,
    cancellation?: SynchronizationCancellationSignal,
  ): Promise<RemoteFolderCreateObservation> {
    if (cancelled(cancellation)) {
      return { status: "unobservable", reason: "synchronization-cancelled" };
    }
    const reservedId = descriptor.remoteMutation.reservedRemoteObjectId;
    const reserved = this.drive.inspectObject(reservedId);
    if (reserved) {
      if (reserved.trashed) {
        return { status: "unobservable", reason: "reserved-object-is-trashed" };
      }
      if (reserved.entityKind !== "folder") {
        return {
          status: "occupied",
          targetPath: reserved.path,
          pathComparisonKey: pathKey(reserved.path),
          remoteObjectId: reserved.remoteObjectId,
          entityKind: reserved.entityKind,
        };
      }
      const parent = this.parentRemoteObjectId(reserved.path);
      if (!parent) {
        return {
          status: "unobservable",
          reason: "reserved-object-parent-identity-incomplete",
        };
      }
      return {
        status: "folder",
        targetPath: reserved.path,
        pathComparisonKey: pathKey(reserved.path),
        remoteObjectId: reserved.remoteObjectId,
        parentRemoteObjectId: parent,
      };
    }

    const occupants = this.drive.inspectObjectsAtPath(
      this.managedRemote.rootId,
      descriptor.targetPath,
    );
    if (occupants.length === 0) {
      return { status: "authoritative-absent", reservedRemoteObjectId: reservedId };
    }
    if (occupants.length !== 1) {
      return { status: "unobservable", reason: "target-path-ambiguous" };
    }
    const occupant = occupants[0]!;
    return {
      status: "occupied",
      targetPath: occupant.path,
      pathComparisonKey: pathKey(occupant.path),
      remoteObjectId: occupant.remoteObjectId,
      entityKind: occupant.entityKind,
    };
  }

  private async validateRoot(root: ManagedRemoteIdentity): Promise<DriveFailure | undefined> {
    if (
      root.rootId !== this.managedRemote.rootId ||
      root.vaultIdentity !== this.managedRemote.vaultIdentity ||
      root.protocolVersion !== this.managedRemote.protocolVersion
    ) {
      return {
        ok: false,
        signal: { kind: "recovery-required", detail: "managed-remote-identity-mismatch" },
      };
    }
    const validation = await this.drive.validateManagedRoot(root);
    if (!validation.ok) return validation;
    return validation.value.status === "valid"
      ? undefined
      : {
          ok: false,
          signal: {
            kind: "recovery-required",
            detail: `managed-remote-${validation.value.status}`,
          },
        };
  }

  private verifyReserved(identity: ReservedCreateIdentity, observed: InMemoryRemoteObjectSnapshot): RemoteMutationOutcome {
    if (
      observed.trashed ||
      observed.remoteObjectId !== identity.reservedRemoteObjectId ||
      String(observed.path) !== String(identity.path)
    ) {
      return {
        status: "conflict-preserved",
        reason: "reserved-create-observed-object-mismatch",
        preservedRemoteObjectIds: [observed.remoteObjectId],
      };
    }
    if (identity.kind === "reserved-folder-create") {
      if (observed.entityKind !== "folder") {
        return {
          status: "conflict-preserved",
          reason: "reserved-folder-create-kind-mismatch",
          preservedRemoteObjectIds: [observed.remoteObjectId],
        };
      }
      return {
        status: "verified-effect",
        receipt: { remoteObjectId: observed.remoteObjectId, path: observed.path },
        applicationProof: {
          kind: "reserved-create",
          remoteObjectId: observed.remoteObjectId,
          path: observed.path,
        },
      };
    }
    if (!canonicalMatches(observed, identity.intendedContent)) {
      return {
        status: "conflict-preserved",
        reason: "reserved-file-create-content-mismatch",
        preservedRemoteObjectIds: [observed.remoteObjectId],
      };
    }
    return {
      status: "verified-effect",
      receipt: {
        remoteObjectId: observed.remoteObjectId,
        path: observed.path,
        evidence: observed.evidence,
      },
      applicationProof: {
        kind: "reserved-create",
        remoteObjectId: observed.remoteObjectId,
        path: observed.path,
        verifiedContent: identity.intendedContent,
      },
    };
  }

  private validateUpdatePredecessor(identity: UpdateIdentity, predecessor: InMemoryRemoteObjectSnapshot | undefined): RemoteMutationOutcome | undefined {
    if (!predecessor) {
      return { status: "verified-not-applied", reason: "update-predecessor:not-found" };
    }
    if (
      identity.identityAuthority.remoteObjectId !== identity.remoteObjectId ||
      identity.identityAuthority.path !== identity.path ||
      String(predecessor.path) !== String(identity.path)
    ) {
      return {
        status: "conflict-preserved",
        reason: "update-identity-authority-mismatch",
        preservedRemoteObjectIds: [identity.remoteObjectId],
      };
    }
    if (
      !predecessor.trashed &&
      predecessor.revision !== String(identity.expectedRevision)
    ) {
      return {
        status: "conflict-preserved",
        reason: "remote-revision-precondition-failed",
        preservedRemoteObjectIds: [identity.remoteObjectId],
      };
    }
    return undefined;
  }

  private moveVerified(identity: MoveIdentity, observed: InMemoryRemoteObjectSnapshot): RemoteMutationOutcome {
    return {
      status: "verified-effect",
      receipt: {
        remoteObjectId: identity.remoteObjectId,
        path: identity.toPath,
        ...(observed.evidence ? { evidence: observed.evidence } : {}),
      },
      applicationProof: {
        kind: "identity-preserving-move",
        remoteObjectId: identity.remoteObjectId,
        fromPath: identity.fromPath,
        toPath: identity.toPath,
      },
    };
  }

  private trashVerified(identity: TrashIdentity): RemoteMutationOutcome {
    return {
      status: "verified-effect",
      applicationProof: {
        kind: "trash",
        remoteObjectId: identity.remoteObjectId,
        path: identity.path,
        trashed: true,
      },
    };
  }

  private parentRemoteObjectId(path: VaultPath): RemoteObjectId | undefined {
    const parent = parentPath(path);
    if (!String(parent)) return this.managedRemote.rootId;
    const matches = this.drive
      .inspectObjectsAtPath(this.managedRemote.rootId, parent)
      .filter(object => object.entityKind === "folder");
    return matches.length === 1 ? matches[0]?.remoteObjectId : undefined;
  }

  private takePostMutationObservationFailure(): string | undefined {
    return this.postMutationObservationFailures.shift();
  }
}

function localAdapterFacade(local: InMemoryLocalVault) {
  const exists = async (rawPath: string) =>
    (await local.observe(virtualVaultPath(rawPath))).status === "present";

  const write = async (rawPath: string, bytes: Uint8Array) => {
    const path = virtualVaultPath(rawPath);
    const observed = await local.observe(path);
    if (observed.status === "present") {
      await local.replaceFile(path, binarySource(bytes));
    } else if (observed.status === "absent") {
      await local.createFile(path, binarySource(bytes));
    } else {
      throw new Error(`cannot write local transaction path in state ${observed.status}`);
    }
  };

  return {
    exists: async (rawPath: string) => exists(rawPath),
    writeBinary: async (rawPath: string, value: ArrayBuffer) =>
      write(rawPath, new Uint8Array(value)),
    appendBinary: async (rawPath: string, value: ArrayBuffer) => {
      const path = virtualVaultPath(rawPath);
      const observed = await local.observe(path);
      let previous = new Uint8Array();
      if (observed.status === "present") {
        previous = Uint8Array.from(await collect((await local.readFile(path)).content));
      } else if (observed.status !== "absent") {
        throw new Error(`cannot append local transaction path in state ${observed.status}`);
      }
      const incoming = new Uint8Array(value);
      const combined = new Uint8Array(previous.length + incoming.length);
      combined.set(previous);
      combined.set(incoming, previous.length);
      await write(rawPath, combined);
    },
    rename: async (from: string, to: string) => {
      await local.move(virtualVaultPath(from), virtualVaultPath(to));
    },
    remove: async (rawPath: string) => {
      const path = virtualVaultPath(rawPath);
      if ((await local.observe(path)).status === "present") await local.trash(path);
    },
    trashLocal: async (rawPath: string) => {
      const path = virtualVaultPath(rawPath);
      if ((await local.observe(path)).status === "present") await local.trash(path);
    },
  };
}

export class VirtualProductionDevice {
  constructor(
    readonly backing: VirtualDeviceBacking,
    readonly runtime: VirtualDeviceRuntime,
    readonly controller: ProductController,
    readonly remoteMutations: InMemoryReliableRemoteMutationPort,
    readonly productionLocal: CanonicalEvidenceLocalVault,
  ) {}

  async dispose(): Promise<void> {
    await this.controller.beginRuntimeDisposal();
    this.runtime.destroy();
  }
}

export class VirtualSynchronizationWorld {
  readonly managedRemote: ManagedRemoteIdentity;
  private readonly devices = new Map<string, VirtualDeviceBacking>();
  private readonly textVersionPersistence = new Map<string, MemoryTextVersionPersistence>();
  private readonly crashControllers = new Map<string, VirtualCrashController>();
  readonly orderGate = new DeterministicOrderGate();
  private readonly leasePort = new InMemoryRunLeasePort();

  private constructor(
    readonly drive: InMemoryGoogleDriveCore,
    managedRemote: ManagedRemoteIdentity,
  ) {
    this.managedRemote = managedRemote;
  }

  static async create(
    deviceNames: readonly string[] = ["device-a", "device-b"],
  ): Promise<VirtualSynchronizationWorld> {
    if (deviceNames.length < 2) {
      throw new Error("virtual synchronization world requires at least two devices");
    }
    if (new Set(deviceNames).size !== deviceNames.length) {
      throw new Error("virtual synchronization device names must be unique");
    }

    const vaultIdentity = virtualDeviceVaultIdentity("virtual-world-vault");
    const temporaryDrive = new InMemoryGoogleDriveCore();
    const root = await temporaryDrive.createManagedRoot(
      vaultIdentity,
      virtualProtocolVersion("1"),
    );
    if (!root.ok) throw new Error(root.signal.kind);

    const world = new VirtualSynchronizationWorld(
      temporaryDrive,
      root.value,
    );

    for (const [index, name] of deviceNames.entries()) {
      const backing = new VirtualDeviceBacking({
        deviceIdentity: deterministicDeviceIdentity(index + 1),
        vaultIdentity,
      });
      await backing.initializeAuthority();
      world.devices.set(name, backing);
    }
    return world;
  }

  deviceBacking(name: string): VirtualDeviceBacking {
    const backing = this.devices.get(name);
    if (!backing) throw new Error(`unknown virtual device: ${name}`);
    return backing;
  }

  armCrashBoundary(name: string, boundary: VirtualCrashBoundary): void {
    this.deviceBacking(name);
    this.crashController(name).arm(boundary);
  }

  private crashController(name: string): VirtualCrashController {
    let controller = this.crashControllers.get(name);
    if (!controller) { controller = new VirtualCrashController(); this.crashControllers.set(name, controller); }
    return controller;
  }

  async reconstructDevice(name: string): Promise<VirtualProductionDevice> {
    const backing = this.deviceBacking(name);
    const runtime = backing.reconstruct(this.drive);
    const crash = this.crashController(name);
    const state = crash.wrapStateStore(runtime.stateStore());
    const context = runtime.loadContext();
    const remoteMutations = crash.wrapRemote(new InMemoryReliableRemoteMutationPort(
      this.drive,
      this.managedRemote,
    ));
    const configurationDirectory = await backing.local.activeConfigurationDirectory();
    const scope = new ProductPathScope(configurationDirectory, () => ({
      userExclusionPatterns: [],
    }));
    const scopedLocal = new ScopedLocalVault(backing.local, scope);
    const localTransactions = new ScopedLocalTransactionalMutationPort(
      localAdapterFacade(backing.local) as never,
      backing.local,
      scope,
    );
    const canonicalLocal = new CanonicalEvidenceLocalVault(
      scopedLocal,
      { staleRetryDelayMs: 0 },
      localTransactions,
    );
    const snapshots = new ProductSnapshotAssembler(
      canonicalLocal,
      this.drive,
      state,
      context,
      async () => this.managedRemote,
      path => scope.isManagedLogical(path),
      () => false,
      undefined,
      this.drive,
      state,
    );
    let textPersistence = this.textVersionPersistence.get(name);
    if (!textPersistence) {
      textPersistence = new MemoryTextVersionPersistence();
      this.textVersionPersistence.set(name, textPersistence);
    }
    const textVersions = new ProductTextVersionStore(
      textPersistence,
      canonicalLocal,
      this.drive,
    );
    const conflicts = new ThreeWayConflictResolver(
      textVersions,
      textVersions,
      backing.deviceIdentity,
    );

    let controller!: ProductController;
    const executor = new ProductSynchronizationExecutor(
      canonicalLocal,
      this.drive,
      state,
      context,
      () => controller.currentRunEvidence(),
      textVersions,
    );
    controller = new ProductController({
      vaultIdentity: this.managedRemote.vaultIdentity,
      deviceIdentity: backing.deviceIdentity,
      stateContext: context,
      stateStore: state,
      authorityStore: state,
      snapshotAssembler: snapshots,
      executor,
      conflictResolver: conflicts,
      reliableRemoteMutationPort: remoteMutations,
      localTransactionalMutationPort: canonicalLocal,
      remoteFolderCreateRecoveryReadPort: remoteMutations,
      plannerForTrigger: trigger =>
        new ProductionSynchronizationPlanner(
          new DeterministicSynchronizationPlanner(
            conflicts,
            undefined,
            { trigger },
          ),
        ),
      leasePort: this.leasePort,
      audit: new BoundedAuditHistory(new MemoryAuditPersistence()),
      holderId: `virtual-world:${name}`,
      firstSyncActive: () => false,
      onFullReconciliationCompleted: async () => undefined,
    });
    return new VirtualProductionDevice(
      backing,
      runtime,
      controller,
      remoteMutations,
      canonicalLocal,
    );
  }


}
