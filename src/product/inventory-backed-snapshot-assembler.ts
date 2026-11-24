/**
 * DEC-339 D339-05 / Step 6: opt-in verified inventory planning.
 * Ordinary enabled planning never delegates to legacy incremental Changes.
 * Full and recovery observations remain explicit canonical safety paths.
 */
import type {
  ChangeCursor, GoogleDrivePort, InventoryIdentityFence,
  InventoryReadLease, LocalVaultPort, ManagedRemoteIdentity,
  RemoteListing, RemoteObjectId, StateLoadContext, SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore, VaultPath, ReliableRemoteChangePort,
  TrustedSynchronizationState, PersistenceRevision, SemanticStateGeneration,
  InventoryGeneration, RemoteIngestionBatchId,
} from "../contracts";
import { contractId, inventoryContinuityGrant } from "../contracts";
import type { DurableSynchronizationAuthorityState } from "../state/persistent-state-store";
import type { VerifiedInventoryBaselineCoordinator } from "../state/verified-inventory-integration";
import { semanticStateRevision } from "./synchronization-adapters";
import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import type { IndexedDbInventoryObservationStore } from "../state/indexeddb-inventory-storage";
import { inventoryFenceMatches } from "../state/verified-metadata-inventory-validation";
import { readVerifiedInventoryListing } from "./verified-inventory-planning-projection";
import type { VerifiedMetadataInventoryReader } from "../drive/verified-metadata-inventory-reader";
import { ProductSnapshotAssembler, SnapshotAssemblyError, type AssembledPlanningInput } from "./snapshot-assembler";
import type { InventoryPlanningBoundary } from "./inventory-planning-cutover";

type InventoryStore = Pick<IndexedDbInventoryObservationStore, "publicationSnapshot" | "openRead"> &
  Partial<Pick<IndexedDbInventoryObservationStore, "prepareRemoteRebaseline">>;

type Publication = Extract<Awaited<ReturnType<InventoryStore["publicationSnapshot"]>>,
  { status: "trusted-fence" }>["value"];
type DurableFence = { readonly persistenceRevision: PersistenceRevision;
  readonly semanticGeneration: SemanticStateGeneration; readonly canonicalCursor: ChangeCursor | null };

/** The public planner CAS token and durable persistence revision are distinct.
 * Read both durable fields from the SAME context-checked state observation.
 * Legacy/raw-store fixtures retain their existing persistence-CAS contract. */
function durableFence(state: TrustedSynchronizationState): DurableFence | undefined {
  const durable = state as Partial<DurableSynchronizationAuthorityState>;
  if (durable.authoritySchemaVersion !== 2 ||
      !durable.persistenceRevision || !durable.semanticGeneration ||
      (state.stateRevision !== durable.persistenceRevision &&
       state.stateRevision !== semanticStateRevision(durable.semanticGeneration))) return undefined;
  return { persistenceRevision: durable.persistenceRevision,
    semanticGeneration: durable.semanticGeneration, canonicalCursor: state.changeCursor ?? null };
}
function matchesPublication(state: TrustedSynchronizationState, publication: Publication): boolean {
  const durable = durableFence(state);
  if (durable) return durable.persistenceRevision === publication.persistenceRevision &&
    durable.semanticGeneration === publication.semanticGeneration &&
    durable.canonicalCursor === publication.canonicalCursor;
  // A malformed authority marker must never be treated as a legacy DTO.
  if ("authoritySchemaVersion" in state || "persistenceRevision" in state ||
      "semanticGeneration" in state) return false;
  return state.stateRevision === publication.persistenceRevision &&
    state.changeCursor === publication.canonicalCursor;
}
function samePublication(a: Publication, b: Publication): boolean {
  return a.activeGeneration === b.activeGeneration && a.canonicalCursor === b.canonicalCursor &&
    a.persistenceRevision === b.persistenceRevision && a.semanticGeneration === b.semanticGeneration;
}

type ContinuityReceipt = { readonly fence: InventoryIdentityFence; readonly generation: InventoryGeneration;
  readonly terminalCursor: ChangeCursor };
type InventoryAttempt =
  | { readonly kind: "ready"; readonly assembly: AssembledPlanningInput }
  | { readonly kind: "refresh" | "rebuild"; readonly fence: InventoryIdentityFence;
      readonly authority: DurableFence | undefined; readonly reason: string }
  | { readonly kind: "blocked"; readonly reason: string };


export interface InventorySnapshotAssemblyOptions {
  readonly local: LocalVaultPort;
  readonly drive: GoogleDrivePort;
  readonly state: SynchronizationStateStore;
  readonly stateContext: StateLoadContext;
  readonly remoteIdentity: () => Promise<ManagedRemoteIdentity>;
  readonly inventory: InventoryStore;
  /** Historical census path for legacy namespaces; never used by DEC-365 normal planning. */
  readonly provenanceReader?: Pick<VerifiedMetadataInventoryReader, "verifyRootWideManagedProvenance"> &
    Partial<Pick<VerifiedMetadataInventoryReader, "observeRootWidePlanningCensus">>;
  /** Fresh combined provider boundary independently observed before and after planning. */
  readonly observePlanningBoundary?: () => Promise<InventoryPlanningBoundary>;
  readonly refresh?: Pick<VerifiedInventoryBaselineCoordinator, "publishBaseline" | "publishIncremental">;
  /** Calculated from the current paired account, root, device and effective scope policy. */
  readonly currentFence: () => Promise<InventoryIdentityFence>;
  readonly pathIncluded?: (path: VaultPath) => boolean;
  readonly fullReconcileRequired?: () => boolean;
  readonly diagnostics?: DiagnosticLogger;
  readonly reliableChanges?: ReliableRemoteChangePort;
  readonly authorityStore?: SynchronizationAuthorityStoreV1_1;
}

/** Single conservative lease projection shared with D339-09A. No second graph walker. */
export async function readInventoryRemoteListing(
  lease: InventoryReadLease, expectedFence: InventoryIdentityFence, expectedCursor: ChangeCursor,
): Promise<RemoteListing | undefined> {
  const result = await readVerifiedInventoryListing(lease, expectedFence, expectedCursor);
  return result.status === "ok"
    ? { entries: result.entries, completeness: { status: "complete" } }
    : undefined;
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
    // Explicit full/recovery, first-pairing bootstrap and outstanding-intent
    // recovery are existing authoritative safety workflows, not incremental fallback.
    if (!preferIncremental || this.options.fullReconcileRequired?.())
      return super.assembleFull(runId);
    const initial = await this.options.state.load(this.options.stateContext);
    if (initial.status === "uninitialized") return super.assembleFull(runId);
    if (initial.status !== "trusted" || initial.state.operations.some(op => op.status !== "completed"))
      throw new SnapshotAssemblyError("recovery-required", "canonical synchronization authority untrusted; use explicit recovery");

    let attempt = await this.attemptInventory(runId);
    let replayed = false, rebuilt = false;
    let receipt: ContinuityReceipt | undefined;
    // Bound each observation/rebuild independently. No silent legacy fallback.
    for (let transitions = 0; transitions < 3; transitions++) {
      if (attempt.kind === "ready") return attempt.assembly;
      if (attempt.kind === "refresh" && !replayed && attempt.authority && this.options.refresh) {
        replayed = true;
        const refreshed = await this.options.refresh.publishIncremental(attempt.fence,
          globalThis.crypto.randomUUID() as InventoryGeneration,
          contractId<"RemoteIngestionBatchId">(globalThis.crypto.randomUUID()) as RemoteIngestionBatchId);
        if (refreshed.status !== "published" && refreshed.status !== "unchanged")
          throw new SnapshotAssemblyError("recovery-required", "verified inventory refresh failed: " + refreshed.reason);
        if (inventoryContinuityGrant(attempt.fence.scopePolicyFingerprint))
          receipt = { fence: attempt.fence, generation: refreshed.generation, terminalCursor: refreshed.terminalCursor };
        attempt = await this.attemptInventory(runId, receipt);
        continue;
      }
      if (attempt.kind === "rebuild" && !rebuilt && !replayed && attempt.authority && this.options.refresh &&
          this.options.inventory.prepareRemoteRebaseline) {
        rebuilt = true;
        const prepared = await this.options.inventory.prepareRemoteRebaseline(attempt.fence, attempt.authority);
        if (prepared.status !== "prepared")
          throw new SnapshotAssemblyError("recovery-required", "verified inventory rebuild refused: " + prepared.reason);
        // A baseline cannot advance an existing cursor without durably learned history.
        const baseline = await this.options.refresh.publishBaseline(attempt.fence,
          globalThis.crypto.randomUUID() as InventoryGeneration, { preserveCanonicalCursor: true });
        if (baseline.status !== "published")
          throw new SnapshotAssemblyError("recovery-required", "verified inventory rebuild failed: " +
            (baseline.status === "unchanged" ? "unexpected-no-advance-baseline" : baseline.reason));
        if (inventoryContinuityGrant(attempt.fence.scopePolicyFingerprint)) {
          // Baseline already replayed its scan-window feed through the verified horizon.
          receipt = { fence: attempt.fence, generation: baseline.generation, terminalCursor: baseline.terminalCursor };
          replayed = true;
        }
        attempt = await this.attemptInventory(runId, receipt);
        continue;
      }
      break;
    }
    if (attempt.kind === "ready") return attempt.assembly;
    throw new SnapshotAssemblyError("recovery-required",
      "metadata-enabled synchronization blocked: " + attempt.reason);
  }

  private async attemptInventory(runId?: number, receipt?: ContinuityReceipt): Promise<InventoryAttempt> {
    const blocked = (reason: string): InventoryAttempt => ({ kind: "blocked", reason });
    try {
      const { inventory, state, stateContext, drive } = this.options;
      const loaded = await state.load(stateContext);
      if (loaded.status !== "trusted" ||
          loaded.state.operations.some(op => op.status !== "completed"))
        return blocked("canonical synchronization state requires recovery");
      const authority = durableFence(loaded.state);
      const initialBoundary = await this.options.observePlanningBoundary?.();
      if (this.options.observePlanningBoundary && !initialBoundary)
        return blocked("combined inventory planning boundary unavailable");
      const fence = initialBoundary?.fence ?? await this.options.currentFence();
      const continuity = inventoryContinuityGrant(fence.scopePolicyFingerprint) !== undefined;
      if (continuity && (!initialBoundary || !authority))
        return blocked("continuity requires combined provider and durable authority fences");
      if (receipt && (!continuity || !inventoryFenceMatches(receipt.fence, fence)))
        return blocked("metadata continuity fence changed after replay");
      const rebuild = (reason: string): InventoryAttempt => ({ kind: "rebuild", fence, authority, reason });
      if (loaded.state.vaultIdentity !== fence.vaultIdentity ||
          loaded.state.deviceIdentity !== fence.deviceIdentity)
        return blocked("metadata identity fence differs from trusted state");
      const remote = await this.options.remoteIdentity();
      if (remote.rootId !== fence.managedRootId || remote.vaultIdentity !== fence.vaultIdentity ||
          remote.protocolVersion !== fence.protocolVersion)
        return blocked("metadata fence differs from current remote pairing");
      if (!initialBoundary) {
        const validation = await drive.validateManagedRoot(remote);
        if (!validation.ok || validation.value.status !== "valid")
          return blocked("managed remote identity is not verified");
      }
      const before = await inventory.publicationSnapshot(fence);
      if (before.status !== "trusted-fence") {
        return before.status === "stale" || before.status === "invalid" || before.status === "unknown"
          ? rebuild(before.reason) : blocked(before.reason);
      }
      if (!matchesPublication(loaded.state, before.value))
        return blocked("planning state and durable inventory publication revisions differ");
      if (!before.value.activeManifest || !before.value.activeGeneration || !before.value.canonicalCursor ||
          before.value.activeManifest.terminalCursor !== before.value.canonicalCursor)
        return rebuild("no coherent verified active inventory");
      const liveCursor = initialBoundary ? { ok: true as const, value: initialBoundary.cursor } :
        await drive.getStartCursor(remote.rootId);
      if (!liveCursor.ok) return blocked("current provider Changes cursor unavailable");
      if (receipt && (receipt.generation !== before.value.activeGeneration ||
          receipt.terminalCursor !== before.value.canonicalCursor || liveCursor.value !== receipt.terminalCursor))
        return blocked("metadata generation or provider horizon changed after replay");
      if ((continuity && !receipt) || liveCursor.value !== before.value.canonicalCursor)
        return { kind: "refresh", fence, authority, reason: "complete Changes continuity required" };
      const read = await inventory.openRead();
      if (read.status !== "verified-observation") return rebuild(read.reason);
      let listing: RemoteListing | undefined;
      try {
        if (read.generation === before.value.activeGeneration &&
            read.value.generation === before.value.activeGeneration)
          listing = await readInventoryRemoteListing(read.value, fence, before.value.canonicalCursor);
      } finally {
        await read.value.release();
      }
      if (!listing) return rebuild("inventory coverage or identity projection is unproven");
      const after = await inventory.publicationSnapshot(fence);
      if (after.status !== "trusted-fence" || !samePublication(after.value, before.value))
        return blocked("inventory or canonical authority changed during lease projection");

      // Use the existing snapshot assembler, substituting only the fenced
      // remote listing. LOCAL enumeration, BASE and planning CAS are unchanged.
      const fencedDrive = new Proxy(drive, {
        get(target, prop) {
          if (prop === "validateManagedRoot" && initialBoundary) return async (identity: ManagedRemoteIdentity) =>
            identity.rootId === remote.rootId && identity.vaultIdentity === remote.vaultIdentity &&
              identity.protocolVersion === remote.protocolVersion
              ? { ok: true as const, value: { status: "valid" as const, identity: remote } }
              : { ok: false as const, signal: { kind: "recovery-required" as const, detail: "planning-proof-identity-mismatch" } };
          if (prop === "getStartCursor") return async (rootId: RemoteObjectId) =>
            rootId === remote.rootId ? liveCursor :
              { ok: false as const, signal: { kind: "recovery-required" as const, detail: "planning-proof-root-mismatch" } };
          if (prop === "listForReconciliation") return async (rootId: RemoteObjectId) =>
            rootId === remote.rootId ? { ok: true as const, value: listing! } :
              { ok: false as const, signal: { kind: "recovery-required" as const, detail: "planning-proof-root-mismatch" } };
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
      if (assembled.input.state.status !== "trusted" ||
          assembled.input.state.state.stateRevision !== loaded.state.stateRevision ||
          !matchesPublication(assembled.input.state.state, before.value) ||
          assembled.managedRemote.rootId !== remote.rootId ||
          assembled.managedRemote.vaultIdentity !== remote.vaultIdentity ||
          assembled.managedRemote.protocolVersion !== remote.protocolVersion ||
          assembled.nextCursor !== liveCursor.value)
        return blocked("planning inputs changed while consuming inventory");
      if (!continuity) {
        const provenance = initialBoundary
          ? await this.options.provenanceReader?.observeRootWidePlanningCensus?.(fence)
          : await this.options.provenanceReader?.verifyRootWideManagedProvenance(fence);
        if (provenance?.status !== "ok")
          return blocked("root-wide managed provenance unproven");
      }
      // Check AFTER the final asynchronous provider proof, not merely before it.
      const finalBoundary = initialBoundary ? await this.options.observePlanningBoundary!() : undefined;
      if (initialBoundary && !finalBoundary)
        return blocked("final combined inventory planning boundary unavailable");
      const finalFence = finalBoundary?.fence ?? await this.options.currentFence();
      const finalCursor = finalBoundary ? { ok: true as const, value: finalBoundary.cursor } :
        await drive.getStartCursor(remote.rootId);
      const final = await inventory.publicationSnapshot(fence);
      if (!inventoryFenceMatches(finalFence, fence) || !finalCursor.ok ||
          finalCursor.value !== liveCursor.value || final.status !== "trusted-fence" ||
          !samePublication(final.value, before.value) || this.options.fullReconcileRequired?.())
        return blocked("metadata fence or provider horizon changed during final proof");
      return { kind: "ready", assembly: continuity ? { ...assembled, mode: "incremental", inventoryContinuity: true } : assembled };
    } catch {
      return blocked("verified inventory observation or provider proof failed");
    }
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
