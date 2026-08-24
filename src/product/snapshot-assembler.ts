import type {
  BaseEvidence,
  ChangeCursor,
  DriveSignal,
  EnumerationCompleteness,
  GoogleDrivePort,
  IdentityAssessment,
  LocalObservation,
  LocalVaultPort,
  ManagedRemoteIdentity,
  PathSnapshot,
  PlanningInput,
  RemoteEntry,
  RemoteObservation,
  StateLoadContext,
  StateLoadResult,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VaultPath,
} from "../contracts";
import { contractId } from "../contracts";

export interface AssembledPlanningInput {
  readonly input: PlanningInput;
  readonly managedRemote: ManagedRemoteIdentity;
  readonly remoteEnumeration: EnumerationCompleteness;
  readonly nextCursor?: ChangeCursor;
  readonly mode: "full" | "incremental";
  readonly reconstruction?: boolean;
  readonly recoveryReason?: string;
}

function path(value: string): VaultPath { return contractId<"VaultPath">(value) as VaultPath; }
function signalMessage(signal: DriveSignal, fallback: string): string { return "detail" in signal && signal.detail ? signal.detail : fallback; }
function absentLocal(p: VaultPath): LocalObservation { return { status: "absent", side: "local", path: p }; }
function absentRemote(p: VaultPath): RemoteObservation { return { status: "absent", side: "remote", path: p }; }
function remoteObservation(entry: RemoteEntry): RemoteObservation {
  return { status: "present", side: "remote", path: entry.path, entityKind: entry.entityKind, remoteObjectId: entry.remoteObjectId, content: entry.content, stability: "stable" };
}

export class SnapshotAssemblyError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "SnapshotAssemblyError"; }
}

/** Produces lossless LOCAL + REMOTE + BASE planning evidence; uncertainty is never flattened into absence. */
export class ProductSnapshotAssembler {
  constructor(
    private readonly local: LocalVaultPort,
    private readonly drive: GoogleDrivePort,
    private readonly state: SynchronizationStateStore,
    private readonly stateContext: StateLoadContext,
    private readonly remoteIdentity: () => Promise<ManagedRemoteIdentity>,
    private readonly pathIncluded: (path: VaultPath) => boolean = () => true,
  ) {}

  async assemble(preferIncremental = true): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote();
    const loadedState = await this.state.load(this.stateContext);
    if (preferIncremental && loadedState.status === "trusted" && loadedState.state.changeCursor) {
      const incremental = await this.assembleIncremental(managedRemote, loadedState);
      if (incremental) return incremental;
    }
    return this.assembleFullWith(managedRemote, loadedState);
  }

  async assembleFull(): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote();
    return this.assembleFullWith(managedRemote, await this.state.load(this.stateContext));
  }

  /** Recovery deliberately projects current reality as an uninitialized safe union, never an empty authoritative BASE. */
  async assembleRecovery(reason?: string): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote();
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) throw new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "recovery cursor acquisition failed"));
    const [localListing, remoteResult] = await Promise.all([this.local.enumerate(), this.drive.listForReconciliation(managedRemote.rootId)]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "recovery remote observation failed"));
    if (localListing.completeness.status !== "complete" || remoteResult.value.completeness.status !== "complete") {
      throw new SnapshotAssemblyError("recovery-required", `Recovery reconstruction requires complete LOCAL and REMOTE observation. LOCAL=${localListing.completeness.status}; REMOTE=${remoteResult.value.completeness.status}`);
    }
    const uninitialized: StateLoadResult = { status: "uninitialized" };
    const snapshots = this.makeSnapshots(uninitialized, this.filterLocal(localListing.entries), localListing.completeness, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: uninitialized }, managedRemote, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full", reconstruction: true, recoveryReason: reason };
  }

  private async validatedRemote(): Promise<ManagedRemoteIdentity> {
    const managedRemote = await this.remoteIdentity();
    const validated = await this.drive.validateManagedRoot(managedRemote);
    if (!validated.ok) throw new SnapshotAssemblyError(validated.signal.kind, signalMessage(validated.signal, "managed remote validation failed"));
    if (validated.value.status !== "valid") throw new SnapshotAssemblyError(validated.value.status, "managed BRAIN Sync remote is not valid for this vault");
    return managedRemote;
  }

  private async assembleFullWith(managedRemote: ManagedRemoteIdentity, loadedState: StateLoadResult): Promise<AssembledPlanningInput> {
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) throw new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "remote start cursor acquisition failed"));
    const [localListing, remoteResult] = await Promise.all([this.local.enumerate(), this.drive.listForReconciliation(managedRemote.rootId)]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "remote reconciliation listing failed"));
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: loadedState }, managedRemote, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full" };
  }

  private async assembleIncremental(managedRemote: ManagedRemoteIdentity, loadedState: Extract<StateLoadResult, { status: "trusted" }>): Promise<AssembledPlanningInput | undefined> {
    const cursor = loadedState.state.changeCursor;
    if (!cursor) return undefined;
    const [localListing, changesResult] = await Promise.all([this.local.enumerate(), this.drive.readChanges(managedRemote.rootId, cursor)]);
    if (!changesResult.ok) {
      if (changesResult.signal.kind === "not-found" || changesResult.signal.kind === "conflict") return undefined;
      throw new SnapshotAssemblyError(changesResult.signal.kind, signalMessage(changesResult.signal, "incremental remote observation failed"));
    }
    if (changesResult.value.completeness.status !== "complete") return undefined;

    const reconstructed = this.remoteBaseline(loadedState.state);
    for (const change of changesResult.value.changes) {
      if (change.kind === "upsert") {
        if (this.pathIncluded(change.entry.path)) reconstructed.set(String(change.entry.remoteObjectId), change.entry);
        else reconstructed.delete(String(change.entry.remoteObjectId));
      } else reconstructed.delete(String(change.remoteObjectId));
    }
    const remoteEntries = this.filterRemote([...reconstructed.values()]);
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, remoteEntries, changesResult.value.completeness);
    return { input: { snapshots, state: loadedState }, managedRemote, remoteEnumeration: changesResult.value.completeness, nextCursor: changesResult.value.nextCursor, mode: "incremental" };
  }

  private remoteBaseline(state: TrustedSynchronizationState): Map<string, RemoteEntry> {
    const byId = new Map<string, RemoteEntry>();
    for (const base of state.base) {
      if (!this.pathIncluded(base.path) || !base.remoteExisted || !base.remoteObjectId) continue;
      byId.set(String(base.remoteObjectId), { path: base.path, entityKind: base.entityKind, remoteObjectId: base.remoteObjectId, content: base.content, trashed: false });
    }
    return byId;
  }

  private filterLocal(entries: readonly LocalObservation[]): LocalObservation[] { return entries.filter(entry => this.pathIncluded(entry.path)); }
  private filterRemote(entries: readonly RemoteEntry[]): RemoteEntry[] { return entries.filter(entry => !entry.trashed && this.pathIncluded(entry.path)); }

  private makeSnapshots(
    loadedState: StateLoadResult,
    localEntries: readonly LocalObservation[],
    localCompleteness: EnumerationCompleteness,
    remoteEntries: readonly RemoteEntry[],
    remoteCompleteness: EnumerationCompleteness,
  ): PathSnapshot[] {
    const localByPath = new Map(localEntries.map(entry => [String(entry.path), entry]));
    const remoteByPath = new Map(remoteEntries.map(entry => [String(entry.path), entry]));
    const paths = new Set<string>([...localByPath.keys(), ...remoteByPath.keys()]);
    if (loadedState.status === "trusted") {
      for (const entry of loadedState.state.base) if (this.pathIncluded(entry.path)) paths.add(String(entry.path));
      for (const tombstone of loadedState.state.tombstones) if (this.pathIncluded(tombstone.path)) paths.add(String(tombstone.path));
    }

    const remoteIdCounts = new Map<string, number>();
    for (const entry of remoteEntries) remoteIdCounts.set(String(entry.remoteObjectId), (remoteIdCounts.get(String(entry.remoteObjectId)) ?? 0) + 1);

    return [...paths].sort().map(raw => {
      const p = path(raw);
      let local = localByPath.get(raw) ?? absentLocal(p);
      if (local.status === "absent" && localCompleteness.status !== "complete") local = { status: "unknown", side: "local", path: p, reason: localCompleteness.reason };
      const remoteEntry = remoteByPath.get(raw);
      const remote = remoteEntry ? remoteObservation(remoteEntry) : absentRemote(p);
      let base: BaseEvidence = { status: "uninitialized" };
      if (loadedState.status === "recovery-required") base = { status: "untrusted", reason: loadedState.detail ?? loadedState.reason };
      if (loadedState.status === "trusted") base = { status: "trusted", entry: loadedState.state.base.find(entry => String(entry.path) === raw), tombstone: loadedState.state.tombstones.find(entry => String(entry.path) === raw) };
      let identity: IdentityAssessment = { status: "unambiguous" };
      if (remoteEntry && (remoteIdCounts.get(String(remoteEntry.remoteObjectId)) ?? 0) > 1) identity = { status: "ambiguous", reason: "multiple remote entries claim the same stable Drive identity", candidateRemoteIds: [remoteEntry.remoteObjectId] };
      return { path: p, local, remote, base, remoteEnumeration: remoteCompleteness, identity };
    });
  }
}
