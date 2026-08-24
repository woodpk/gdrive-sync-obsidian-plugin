import type {
  BaseEvidence,
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
  SynchronizationStateStore,
  VaultPath,
} from "../contracts";
import { contractId } from "../contracts";

export interface AssembledPlanningInput {
  readonly input: PlanningInput;
  readonly managedRemote: ManagedRemoteIdentity;
  readonly remoteEnumeration: EnumerationCompleteness;
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

  async assembleFull(): Promise<AssembledPlanningInput> {
    const managedRemote = await this.remoteIdentity();
    const validated = await this.drive.validateManagedRoot(managedRemote);
    if (!validated.ok) throw new SnapshotAssemblyError(validated.signal.kind, validated.signal.detail ?? "managed remote validation failed");
    if (validated.value.status !== "valid") throw new SnapshotAssemblyError(validated.value.status, "managed BRAIN Sync remote is not valid for this vault");

    const [loadedState, localListing, remoteResult] = await Promise.all([
      this.state.load(this.stateContext),
      this.local.enumerate(),
      this.drive.listForReconciliation(managedRemote.rootId),
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, remoteResult.signal.detail ?? "remote reconciliation listing failed");

    const remoteListing = remoteResult.value;
    const localByPath = new Map(localListing.entries.map(entry => [String(entry.path), entry]));
    const remoteByPath = new Map(remoteListing.entries.filter(entry => !entry.trashed).map(entry => [String(entry.path), entry]));
    const paths = new Set<string>([...localByPath.keys(), ...remoteByPath.keys()]);
    if (loadedState.status === "trusted") {
      for (const entry of loadedState.state.base) paths.add(String(entry.path));
      for (const tombstone of loadedState.state.tombstones) paths.add(String(tombstone.path));
    }

    const remoteIdCounts = new Map<string, number>();
    for (const entry of remoteListing.entries) remoteIdCounts.set(String(entry.remoteObjectId), (remoteIdCounts.get(String(entry.remoteObjectId)) ?? 0) + 1);

    const snapshots: PathSnapshot[] = [...paths].sort().map(raw => {
      const p = path(raw);
      const local = localByPath.get(raw) ?? absentLocal(p);
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
      return { path: p, local, remote, base, remoteEnumeration: remoteListing.completeness, identity };
    });

    if (localListing.completeness.status !== "complete") {
      for (let i = 0; i < snapshots.length; i += 1) {
        const snapshot = snapshots[i];
        if (snapshot.local.status === "absent") {
          snapshots[i] = { ...snapshot, local: { status: "unknown", side: "local", path: snapshot.path, reason: localListing.completeness.reason } };
        }
      }
    }

    return { input: { snapshots, state: loadedState }, managedRemote, remoteEnumeration: remoteListing.completeness };
  }
}
