import type {
  BaseEvidence,
  ChangeCursor,
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
  /** Cursor may be committed only after all effects derived from this observation are durably accounted for. */
  readonly nextCursor?: ChangeCursor;
  readonly mode: "full" | "incremental";
}

function path(value: string): VaultPath { return contractId<"VaultPath">(value) as VaultPath; }
function absentLocal(p: VaultPath): LocalObservation { return { status: "absent", side: "local", path: p }; }
function absentRemote(p: VaultPath): RemoteObservation { return { status: "absent", side: "remote", path: p }; }
function remoteObservation(entry: RemoteEntry): RemoteObservation {
  return {
    status: "present",
    side: "remote",
    path: entry.path,
    entityKind: entry.entityKind,
    remoteObjectId: entry.remoteObjectId,
    content: entry.content,
    stability: "stable",
  };
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

  private async validatedRemote(): Promise<ManagedRemoteIdentity> {
    const managedRemote = await this.remoteIdentity();
    const validated = await this.drive.validateManagedRoot(managedRemote);
    if (!validated.ok) throw new SnapshotAssemblyError(validated.signal.kind, validated.signal.detail ?? "managed remote validation failed");
    if (validated.value.status !== "valid") throw new SnapshotAssemblyError(validated.value.status, "managed BRAIN Sync remote is not valid for this vault");
    return managedRemote;
  }

  private async assembleFullWith(managedRemote: ManagedRemoteIdentity, loadedState: StateLoadResult): Promise<AssembledPlanningInput> {
    const [localListing, remoteResult] = await Promise.all([
      this.local.enumerate(),
      this.drive.listForReconciliation(managedRemote.rootId),
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, remoteResult.signal.detail ?? "remote reconciliation listing failed");
    const snapshots = this.makeSnapshots(loadedState, localListing.entries, localListing.completeness, remoteResult.value.entries.filter(entry => !entry.trashed), remoteResult.value.completeness);
    return { input: { snapshots, state: loadedState }, managedRemote, remoteEnumeration: remoteResult.value.completeness, mode: "full" };
  }

  private async assembleIncremental(managedRemote: ManagedRemoteIdentity, loadedState: Extract<StateLoadResult, { status: "trusted" }>): Promise<AssembledPlanningInput | undefined> {
    const cursor = loadedState.state.changeCursor;
    if (!cursor) return undefined;
    const [localListing, changesResult] = await Promise.all([
      this.local.enumerate(),
      this.drive.readChanges(managedRemote.rootId, cursor),
    ]);
    if (!changesResult.ok) {
      // Lost/invalid cursors require safe full reconciliation; authentication/recovery failures remain explicit.
      if (changesResult.signal.kind === "not-found" || changesResult.signal.kind === "conflict") return undefined;
      throw new SnapshotAssemblyError(changesResult.signal.kind, changesResult.signal.detail ?? "incremental remote observation failed");
    }
    if (changesResult.value.completeness.status !== "complete") return undefined;

    const reconstructed = this.remoteBaseline(loadedState.state);
    for (const change of changesResult.value.changes) {
      if (change.kind === "upsert") {
        reconstructed.set(String(change.entry.remoteObjectId), change.entry);
      } else {
        reconstructed.delete(String(change.remoteObjectId));
      }
    }
    const remoteEntries = [...reconstructed.values()].filter(entry => !entry.trashed);
    const snapshots = this.makeSnapshots(loadedState, localListing.entries, localListing.completeness, remoteEntries, changesResult.value.completeness);
    return {
      input: { snapshots, state: loadedState },
      managedRemote,
      remoteEnumeration: changesResult.value.completeness,
      nextCursor: changesResult.value.nextCursor,
      mode: "incremental",
    };
  }

  private remoteBaseline(state: TrustedSynchronizationState): Map<string, RemoteEntry> {
    const byId = new Map<string, RemoteEntry>();
    for (const base of state.base) {
      if (!base.remoteExisted || !base.remoteObjectId) continue;
      byId.set(String(base.remoteObjectId), {
        path: base.path,
        entityKind: base.entityKind,
        remoteObjectId: base.remoteObjectId,
        content: base.content,
        trashed: false,
      });
    }
    return byId;
  }

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
      for (const entry of loadedState.state.base) paths.add(String(entry.path));
      for (const tombstone of loadedState.state.tombstones) paths.add(String(tombstone.path));
    }

    const remoteIdCounts = new Map<string, number>();
    for (const entry of remoteEntries) remoteIdCounts.set(String(entry.remoteObjectId), (remoteIdCounts.get(String(entry.remoteObjectId)) ?? 0) + 1);

    return [...paths].sort().map(raw => {
      const p = path(raw);
      let local = localByPath.get(raw) ?? absentLocal(p);
      if (local.status === "absent" && localCompleteness.status !== "complete") {
        local = { status: "unknown", side: "local", path: p, reason: localCompleteness.reason };
      }
      const remoteEntry = remoteByPath.get(raw);
      const remote = remoteEntry ? remoteObservation(remoteEntry) : absentRemote(p);
      let base: BaseEvidence = { status: "uninitialized" };
      if (loadedState.status === "recovery-required") base = { status: "untrusted", reason: loadedState.detail ?? loadedState.reason };
      if (loadedState.status === "trusted") {
        base = {
          status: "trusted",
          entry: loadedState.state.base.find(entry => String(entry.path) === raw),
          tombstone: loadedState.state.tombstones.find(entry => String(entry.path) === raw),
        };
      }
      let identity: IdentityAssessment = { status: "unambiguous" };
      if (remoteEntry && (remoteIdCounts.get(String(remoteEntry.remoteObjectId)) ?? 0) > 1) {
        identity = { status: "ambiguous", reason: "multiple remote entries claim the same stable Drive identity", candidateRemoteIds: [remoteEntry.remoteObjectId] };
      }
      return { path: p, local, remote, base, remoteEnumeration: remoteCompleteness, identity };
    });
  }
}
