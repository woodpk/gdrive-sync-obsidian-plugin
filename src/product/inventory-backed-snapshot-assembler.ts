/**
 * DEC-339 D339-05: dormant inventory-backed planning observation.
 *
 * Opt-in construction only; the shipping runtime continues to construct the
 * existing ProductSnapshotAssembler. Inventory facts never authorize effects.
 * Full/recovery reconciliation bypasses this optimization deliberately.
 */
import type {
  ChangeCursor, GoogleDrivePort, InventoryIdentityFence,
  InventoryReadLease, InventoryRemoteEntity, LocalVaultPort, ManagedRemoteIdentity,
  RemoteEntry, RemoteListing, RemoteObjectId, StateLoadContext, SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore, VaultPath, ReliableRemoteChangePort,
} from "../contracts";
import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import type { IndexedDbInventoryObservationStore } from "../state/indexeddb-inventory-storage";
import { inventoryFenceMatches } from "../state/verified-metadata-inventory-validation";
import { CONFIG_REMOTE_NAMESPACE } from "./path-scope";
import { ProductSnapshotAssembler, type AssembledPlanningInput } from "./snapshot-assembler";

type InventoryStore = Pick<IndexedDbInventoryObservationStore, "publicationSnapshot" | "openRead">;
const MAX_ENTITIES = 6000;
const norm = (s: string) => s.normalize("NFC").toLocaleLowerCase("en-US");

export interface InventorySnapshotAssemblyOptions {
  readonly local: LocalVaultPort;
  readonly drive: GoogleDrivePort;
  readonly state: SynchronizationStateStore;
  readonly stateContext: StateLoadContext;
  readonly remoteIdentity: () => Promise<ManagedRemoteIdentity>;
  readonly inventory: InventoryStore;
  /** Calculated from the current paired account, root, device and effective scope policy. */
  readonly currentFence: () => Promise<InventoryIdentityFence>;
  readonly pathIncluded?: (path: VaultPath) => boolean;
  readonly fullReconcileRequired?: () => boolean;
  readonly diagnostics?: DiagnosticLogger;
  readonly reliableChanges?: ReliableRemoteChangePort;
  readonly authorityStore?: SynchronizationAuthorityStoreV1_1;
}

/** Every read is pinned to one generation; any missing coverage requires fallback. */
export async function readInventoryRemoteListing(
  lease: InventoryReadLease, expectedFence: InventoryIdentityFence, expectedCursor: ChangeCursor,
): Promise<RemoteListing | undefined> {
  if (!inventoryFenceMatches(lease.fence, expectedFence)) return undefined;
  const entries: RemoteEntry[] = [];
  const seen = new Set<string>();
  const observedPaths = new Set<string>();
  for (const domain of ["content", "portable-config"] as const) {
    const root = domain === "content" ? expectedFence.contentDomainRootId : expectedFence.configDomainRootId;
    const domainCoverage = await lease.coverage(domain, root);
    if (domainCoverage.status !== "verified-observation" ||
        domainCoverage.generation !== lease.generation ||
        domainCoverage.value.scopeKind !== "domain" ||
        domainCoverage.value.scopeId !== root ||
        domainCoverage.value.state !== "complete" ||
        domainCoverage.value.terminalCursor !== expectedCursor ||
        !domainCoverage.value.provenanceVerified || !domainCoverage.value.allPagesRead ||
        domainCoverage.value.incompleteSearch || domainCoverage.value.visibility !== "app-visible")
      return undefined;
    const rootRead = await lease.getById(root);
    if (rootRead.status !== "verified-observation" || rootRead.generation !== lease.generation ||
        !rootRead.value || rootRead.value.kind !== "folder" ||
        rootRead.value.parentRemoteObjectId !== null ||
        rootRead.value.domain !== domain || rootRead.value.managedRootId !== expectedFence.managedRootId)
      return undefined;

    const queue: Array<{ entity: InventoryRemoteEntity; prefix: string }> = [
      { entity: rootRead.value, prefix: domain === "content" ? "" : CONFIG_REMOTE_NAMESPACE },
    ];
    for (let index = 0; index < queue.length; index++) {
      const { entity: parent, prefix } = queue[index]!;
      if (seen.has(String(parent.remoteObjectId))) return undefined;
      seen.add(String(parent.remoteObjectId));
      if (seen.size > MAX_ENTITIES) return undefined;
      const coverage = await lease.coverage(domain, parent.remoteObjectId);
      if (coverage.status !== "verified-observation" || coverage.generation !== lease.generation ||
          coverage.value.scopeId !== parent.remoteObjectId ||
          coverage.value.state !== "complete" || !coverage.value.provenanceVerified ||
          !coverage.value.allPagesRead || coverage.value.incompleteSearch ||
          coverage.value.visibility !== "app-visible" || coverage.value.terminalCursor !== expectedCursor)
        return undefined;
      const children = await lease.listByParent(domain, parent.remoteObjectId);
      if (children.status !== "verified-observation" || children.generation !== lease.generation)
        return undefined;
      const occupiedNames = new Set<string>();
      for (const child of children.value) {
        const id = String(child.remoteObjectId);
        const logical = prefix ? prefix + "/" + child.name : child.name;
        const comparison = norm(child.name);
        // Same-name siblings, case/Unicode collisions and ambiguous ancestors
        // require the original authoritative reconciliation, not a collapsed map.
        if (occupiedNames.has(comparison) || observedPaths.has(norm(logical)) || seen.has(id) ||
            queue.some(item => item.entity.remoteObjectId === child.remoteObjectId) ||
            !child.name || child.name === "." || child.name === ".." || child.name.includes("/") ||
            child.pathValidity !== "verified" || child.access !== "visible" || child.trashed ||
            child.domain !== domain || child.provenanceDomain !== domain ||
            child.managedRootId !== expectedFence.managedRootId ||
            child.parentRemoteObjectId !== parent.remoteObjectId ||
            child.logicalPath === undefined || String(child.logicalPath) !== logical)
          return undefined;
        occupiedNames.add(comparison);
        observedPaths.add(norm(logical));
        entries.push({
          path: child.logicalPath, entityKind: child.kind,
          remoteObjectId: child.remoteObjectId, content: child.content, trashed: false,
        });
        if (child.kind === "folder") queue.push({ entity: child, prefix: logical });
        else {
          if (seen.has(id)) return undefined;
          seen.add(id);
        }
        if (seen.size + queue.length > MAX_ENTITIES) return undefined;
      }
    }
  }
  return { entries, completeness: { status: "complete" } };
}

/**
 * An opt-in ProductSnapshotAssembler, not a second planner/controller.
 * It delegates snapshot semantics to an unmodified, fresh instance of the
 * existing assembler, substituting only a rigorously fenced REMOTE listing.
 */
export class InventoryBackedSnapshotAssembler extends ProductSnapshotAssembler {
  private boundAuthority?: SynchronizationAuthorityStoreV1_1;

  override bindAuthorityStore(authorityStore: SynchronizationAuthorityStoreV1_1): void {
    super.bindAuthorityStore(authorityStore);
    this.boundAuthority = authorityStore;
  }

  constructor(private readonly options: InventorySnapshotAssemblyOptions) {
    super(options.local, options.drive, options.state, options.stateContext,
      options.remoteIdentity, options.pathIncluded, options.fullReconcileRequired,
      options.diagnostics, options.reliableChanges, options.authorityStore);
  }

  override async assemble(preferIncremental = true, runId?: number): Promise<AssembledPlanningInput> {
    if (!preferIncremental || this.options.fullReconcileRequired?.())
      return super.assemble(preferIncremental, runId);
    try {
      const { inventory, state, stateContext, drive } = this.options;
      const loaded = await state.load(stateContext);
      if (loaded.status !== "trusted" || !loaded.state.changeCursor ||
          loaded.state.operations.some(op => op.status !== "completed"))
        return super.assemble(preferIncremental, runId);
      const fence = await this.options.currentFence();
      if (loaded.state.vaultIdentity !== fence.vaultIdentity ||
          loaded.state.deviceIdentity !== fence.deviceIdentity)
        return super.assemble(preferIncremental, runId);
      const remote = await this.options.remoteIdentity();
      if (remote.rootId !== fence.managedRootId ||
          remote.vaultIdentity !== fence.vaultIdentity ||
          remote.protocolVersion !== fence.protocolVersion)
        return super.assemble(preferIncremental, runId);
      const validation = await drive.validateManagedRoot(remote);
      if (!validation.ok || validation.value.status !== "valid")
        return super.assemble(preferIncremental, runId);
      const before = await inventory.publicationSnapshot(fence);
      if (before.status !== "trusted-fence" || !before.value.activeManifest ||
          !before.value.canonicalCursor ||
          before.value.activeManifest.terminalCursor !== before.value.canonicalCursor ||
          before.value.persistenceRevision !== loaded.state.stateRevision ||
          before.value.canonicalCursor !== loaded.state.changeCursor)
        return super.assemble(preferIncremental, runId);
      const liveCursor = await drive.getStartCursor(remote.rootId);
      if (!liveCursor.ok || liveCursor.value !== before.value.canonicalCursor)
        return super.assemble(preferIncremental, runId);
      const read = await inventory.openRead();
      if (read.status !== "verified-observation") return super.assemble(preferIncremental, runId);
      let listing: RemoteListing | undefined;
      try {
        if (read.generation === before.value.activeGeneration &&
            read.value.generation === before.value.activeGeneration)
          listing = await readInventoryRemoteListing(read.value, fence, before.value.canonicalCursor);
      } finally {
        await read.value.release();
      }
      if (!listing) return super.assemble(preferIncremental, runId);
      const after = await inventory.publicationSnapshot(fence);
      if (after.status !== "trusted-fence" ||
          after.value.activeGeneration !== before.value.activeGeneration ||
          after.value.canonicalCursor !== before.value.canonicalCursor ||
          after.value.persistenceRevision !== before.value.persistenceRevision ||
          after.value.semanticGeneration !== before.value.semanticGeneration)
        return super.assemble(preferIncremental, runId);

      // Bind a one-use read-only observation to the *existing* snapshot maker.
      // All non-listing Drive methods remain bound to their original adapter.
      const fencedDrive = new Proxy(drive, {
        get(target, prop) {
          if (prop === "getStartCursor") return async (rootId: RemoteObjectId) =>
            rootId === remote.rootId ? liveCursor : target.getStartCursor(rootId);
          if (prop === "listForReconciliation") return async (rootId: RemoteObjectId) =>
            rootId === remote.rootId ? { ok: true as const, value: listing! } : target.listForReconciliation(rootId);
          const value: unknown = Reflect.get(target, prop, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
      const existing = new ProductSnapshotAssembler(
        this.options.local, fencedDrive, state, stateContext,
        this.options.remoteIdentity, this.options.pathIncluded, this.options.fullReconcileRequired,
        this.options.diagnostics, this.options.reliableChanges, this.boundAuthority ?? this.options.authorityStore,
      );
      const assembled = await existing.assembleFull(runId);
      if (assembled.managedRemote.rootId === remote.rootId &&
          assembled.managedRemote.vaultIdentity === remote.vaultIdentity &&
          assembled.managedRemote.protocolVersion === remote.protocolVersion &&
          assembled.nextCursor === liveCursor.value &&
          assembled.input.state.status === "trusted" &&
          assembled.input.state.state.stateRevision === loaded.state.stateRevision)
        return assembled;
    } catch {
      // Any storage, fence, coverage or verification uncertainty uses the
      // established authoritative Changes/full reconciliation behavior.
    }
    return super.assemble(preferIncremental, runId);
  }

  /** Explicit reconciliation must remain a real provider enumeration. */
  override assembleFull(runId?: number): Promise<AssembledPlanningInput> {
    return super.assembleFull(runId);
  }

  /** Reconstruction must never take absence evidence from persisted inventory. */
  override assembleRecovery(reason?: string, runId?: number): Promise<AssembledPlanningInput> {
    return super.assembleRecovery(reason, runId);
  }
}
