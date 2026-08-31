import type {
  BaseEvidence,
  ChangeCursor,
  DriveSignal,
  EnumerationCompleteness,
  GoogleDrivePort,
  IdentityAssessment,
  LocalEnumerationUncertainty,
  LocalObservation,
  LocalVaultPort,
  ManagedRemoteIdentity,
  PathSnapshot,
  PlanningInput,
  ReliableRemoteChangePort,
  RemoteChange,
  RemoteEntry,
  RemoteObservation,
  StateLoadContext,
  StateLoadResult,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VaultPath,
} from "../contracts";
import { contractId } from "../contracts";
import type { DiagnosticLogger } from "../diagnostics/diagnostic-logger";
import { CONFIG_REMOTE_NAMESPACE } from "./path-scope";

export interface AssembledPlanningInput {
  readonly input: PlanningInput;
  readonly managedRemote: ManagedRemoteIdentity;
  readonly remoteEnumeration: EnumerationCompleteness;
  readonly localEnumeration?: EnumerationCompleteness;
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
    private readonly fullReconcileRequired: () => boolean = () => false,
    private readonly diagnostics?: DiagnosticLogger,
    private readonly reliableChanges?: ReliableRemoteChangePort,
  ) {}

  async assemble(preferIncremental = true, runId?: number): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote(runId);
    const loadedState = await this.loadState(runId);
    const incrementalAllowed = preferIncremental && !this.fullReconcileRequired() && Boolean(this.reliableChanges);
    if (incrementalAllowed && loadedState.status === "trusted" && loadedState.state.changeCursor) {
      const incremental = await this.assembleIncremental(managedRemote, loadedState, runId);
      if (incremental) return incremental;
    }
    return this.assembleFullWith(managedRemote, loadedState, runId);
  }

  async assembleFull(runId?: number): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote(runId);
    return this.assembleFullWith(managedRemote, await this.loadState(runId), runId);
  }

  /** Recovery deliberately projects current reality as an uninitialized safe union, never an empty authoritative BASE. */
  async assembleRecovery(reason?: string, runId?: number): Promise<AssembledPlanningInput> {
    const managedRemote = await this.validatedRemote(runId);
    this.trace(runId, "remote-cursor-observation-start", { stage: "remote-observation", runMode: "full-recovery" });
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) {
      const error = new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "recovery cursor acquisition failed"));
      this.failure(runId, "remote-observation-failed", error, "remote-observation");
      throw error;
    }
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "full-recovery" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "full-recovery" });
    const [localListing, remoteResult] = await Promise.all([
      this.local.enumerate().then(value => { this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value.entries.length, localCompleteness: value.completeness.status }); return value; }).catch(error => { this.failure(runId, "local-observation-failed", error, "local-observation"); throw error; }),
      this.drive.listForReconciliation(managedRemote.rootId).then(value => { if (value.ok) this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: value.value.entries.length, remoteCompleteness: value.value.completeness.status }); else this.failure(runId, "remote-observation-failed", new SnapshotAssemblyError(value.signal.kind, signalMessage(value.signal, "remote observation failed")), "remote-observation"); return value; }).catch(error => { this.failure(runId, "remote-observation-failed", error, "remote-observation"); throw error; }),
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "recovery remote observation failed"));
    if (localListing.completeness.status !== "complete" || remoteResult.value.completeness.status !== "complete") {
      throw new SnapshotAssemblyError("recovery-required", `Recovery reconstruction requires complete LOCAL and REMOTE observation. LOCAL=${localListing.completeness.status}; REMOTE=${remoteResult.value.completeness.status}`);
    }
    const uninitialized: StateLoadResult = { status: "uninitialized" };
    const snapshots = this.makeSnapshots(uninitialized, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: uninitialized }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full", reconstruction: true, recoveryReason: reason };
  }

  private async validatedRemote(runId?: number): Promise<ManagedRemoteIdentity> {
    this.trace(runId, "managed-remote-validation-start", { stage: "remote-precondition" });
    try {
      const managedRemote = await this.remoteIdentity();
      const validated = await this.drive.validateManagedRoot(managedRemote);
      if (!validated.ok) throw new SnapshotAssemblyError(validated.signal.kind, signalMessage(validated.signal, "managed remote validation failed"));
      if (validated.value.status !== "valid") throw new SnapshotAssemblyError(validated.value.status, "managed BRAIN Sync remote is not valid for this vault");
      this.trace(runId, "managed-remote-validation-complete", { stage: "remote-precondition", result: "valid" });
      return managedRemote;
    } catch (error) {
      this.failure(runId, "managed-remote-validation-failed", error, "remote-precondition");
      throw error;
    }
  }

  private async assembleFullWith(managedRemote: ManagedRemoteIdentity, loadedState: StateLoadResult, runId?: number): Promise<AssembledPlanningInput> {
    this.trace(runId, "remote-cursor-observation-start", { stage: "remote-observation", runMode: "full" });
    const cursorResult = await this.drive.getStartCursor(managedRemote.rootId);
    if (!cursorResult.ok) {
      const error = new SnapshotAssemblyError(cursorResult.signal.kind, signalMessage(cursorResult.signal, "remote start cursor acquisition failed"));
      this.failure(runId, "remote-observation-failed", error, "remote-observation");
      throw error;
    }
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "full" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "full" });
    const [localListing, remoteResult] = await Promise.all([
      this.local.enumerate().then(value => { this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value.entries.length, localCompleteness: value.completeness.status }); return value; }).catch(error => { this.failure(runId, "local-observation-failed", error, "local-observation"); throw error; }),
      this.drive.listForReconciliation(managedRemote.rootId).then(value => { if (value.ok) this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: value.value.entries.length, remoteCompleteness: value.value.completeness.status }); else this.failure(runId, "remote-observation-failed", new SnapshotAssemblyError(value.signal.kind, signalMessage(value.signal, "remote observation failed")), "remote-observation"); return value; }).catch(error => { this.failure(runId, "remote-observation-failed", error, "remote-observation"); throw error; }),
    ]);
    if (!remoteResult.ok) throw new SnapshotAssemblyError(remoteResult.signal.kind, signalMessage(remoteResult.signal, "remote reconciliation listing failed"));
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, this.filterRemote(remoteResult.value.entries), remoteResult.value.completeness);
    return { input: { snapshots, state: loadedState }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteResult.value.completeness, nextCursor: cursorResult.value, mode: "full" };
  }

  private async assembleIncremental(managedRemote: ManagedRemoteIdentity, loadedState: Extract<StateLoadResult, { status: "trusted" }>, runId?: number): Promise<AssembledPlanningInput | undefined> {
    const startingCursor = loadedState.state.changeCursor;
    const reliableChanges = this.reliableChanges;
    if (!startingCursor || !reliableChanges) return undefined;
    this.trace(runId, "local-observation-start", { stage: "local-observation", runMode: "incremental" });
    this.trace(runId, "remote-observation-start", { stage: "remote-observation", runMode: "incremental" });
    const localPromise = this.local.enumerate().then(value => { this.debug(runId, "local-observation-complete", { stage: "local-observation", localCount: value.entries.length, localCompleteness: value.completeness.status }); return value; }).catch(error => { this.failure(runId, "local-observation-failed", error, "local-observation"); throw error; });
    const changes: RemoteChange[] = [];
    let requestedToken = startingCursor;
    let terminalCursor: ChangeCursor | undefined;

    while (!terminalCursor) {
      const result = await reliableChanges.readChangePage(managedRemote, requestedToken).catch(error => {
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      });
      if (!result.ok) {
        if (result.signal.kind === "not-found" || result.signal.kind === "conflict") return undefined;
        const error = new SnapshotAssemblyError(result.signal.kind, signalMessage(result.signal, "incremental remote observation failed before terminal Changes authority"));
        this.failure(runId, "remote-observation-failed", error, "remote-observation");
        throw error;
      }
      if (result.value.requestedToken !== requestedToken) {
        throw new SnapshotAssemblyError("recovery-required", "reliable Changes page did not prove the requested pagination token");
      }
      changes.push(...result.value.changes);
      if (result.value.kind === "intermediate") {
        requestedToken = result.value.nextPageToken;
        continue;
      }
      terminalCursor = result.value.newStartPageToken;
    }

    const localListing = await localPromise;
    this.debug(runId, "remote-observation-complete", { stage: "remote-observation", remoteCount: changes.length, remoteCompleteness: "complete" });
    const reconstructed = this.remoteBaseline(loadedState.state);
    for (const change of changes) {
      if (change.kind === "upsert") {
        if (this.pathIncluded(change.entry.path)) reconstructed.set(String(change.entry.remoteObjectId), change.entry);
        else reconstructed.delete(String(change.entry.remoteObjectId));
      } else reconstructed.delete(String(change.remoteObjectId));
    }
    const remoteEntries = this.filterRemote([...reconstructed.values()]);
    const remoteCompleteness: EnumerationCompleteness = { status: "complete" };
    const snapshots = this.makeSnapshots(loadedState, this.filterLocal(localListing.entries), localListing.completeness, localListing.uncertainties, remoteEntries, remoteCompleteness);
    return { input: { snapshots, state: loadedState }, managedRemote, localEnumeration: localListing.completeness, remoteEnumeration: remoteCompleteness, nextCursor: terminalCursor, mode: "incremental" };
  }

  private async loadState(runId?: number): Promise<StateLoadResult> {
    this.trace(runId, "base-state-load-start", { stage: "base-load" });
    let loaded: StateLoadResult;
    try { loaded = await this.state.load(this.stateContext); }
    catch (error) { this.failure(runId, "base-state-load-failed", error, "base-load"); throw error; }
    this.debug(runId, "base-state-load-complete", {
      stage: "base-load",
      stateStatus: loaded.status,
      count: loaded.status === "trusted" ? loaded.state.base.length : 0,
      cursorPresent: loaded.status === "trusted" && Boolean(loaded.state.changeCursor),
    });
    return loaded;
  }

  private trace(runId: number | undefined, event: string, fields: Parameters<DiagnosticLogger["syncTrace"]>[3]): void {
    if (runId !== undefined) this.diagnostics?.syncTrace("sync.plan", event, runId, fields);
  }
  private debug(runId: number | undefined, event: string, fields: Parameters<DiagnosticLogger["syncDebug"]>[3]): void {
    if (runId !== undefined) this.diagnostics?.syncDebug("sync.plan", event, runId, fields);
  }
  private failure(runId: number | undefined, event: string, error: unknown, stage: string): void {
    if (runId !== undefined) this.diagnostics?.syncFailure("sync.plan", event, runId, error, { stage, classification: "planning-boundary-failure", result: "failed" });
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
    localUncertainties: readonly LocalEnumerationUncertainty[] | undefined,
    remoteEntries: readonly RemoteEntry[],
    remoteCompleteness: EnumerationCompleteness,
  ): PathSnapshot[] {
    const localByPath = new Map(localEntries.map(entry => [String(entry.path), entry]));
    const remoteEntriesByPath = new Map<string, RemoteEntry[]>();
    for (const entry of remoteEntries) {
      const key = String(entry.path);
      const values = remoteEntriesByPath.get(key) ?? [];
      values.push(entry);
      remoteEntriesByPath.set(key, values);
    }
    const paths = new Set<string>([...localByPath.keys(), ...remoteEntriesByPath.keys()]);
    if (loadedState.status === "trusted") {
      for (const entry of loadedState.state.base) if (this.pathIncluded(entry.path)) paths.add(String(entry.path));
      for (const tombstone of loadedState.state.tombstones) if (this.pathIncluded(tombstone.path)) paths.add(String(tombstone.path));
    }

    const remoteIdCounts = new Map<string, number>();
    for (const entry of remoteEntries) remoteIdCounts.set(String(entry.remoteObjectId), (remoteIdCounts.get(String(entry.remoteObjectId)) ?? 0) + 1);

    const namespaceCollision = localByPath.has(CONFIG_REMOTE_NAMESPACE) || remoteEntriesByPath.has(CONFIG_REMOTE_NAMESPACE);
    const inCollisionScope = (raw: string) => namespaceCollision && (raw === CONFIG_REMOTE_NAMESPACE || raw.startsWith(`${CONFIG_REMOTE_NAMESPACE}/`));

    return [...paths].sort().map(raw => {
      const p = path(raw);
      let local = localByPath.get(raw) ?? absentLocal(p);
      if (local.status === "absent" && localCompleteness.status !== "complete") {
        const matching = localUncertainties?.filter(uncertainty => {
          if (uncertainty.scope === "all") return true;
          const uncertainPath = String(uncertainty.path);
          return uncertainty.scope === "path"
            ? raw === uncertainPath
            : raw === uncertainPath || raw.startsWith(`${uncertainPath}/`);
        });
        if (!localUncertainties?.length || matching?.length) {
          local = { status: "unknown", side: "local", path: p, reason: matching?.map(item => item.reason).join("; ") || localCompleteness.reason };
        }
      }
      if (raw === CONFIG_REMOTE_NAMESPACE && namespaceCollision && local.status === "absent") {
        local = { status: "unknown", side: "local", path: p, reason: "remote ordinary-vault content collides with the reserved portable-configuration namespace" };
      }
      const remoteCandidates = [...new Map((remoteEntriesByPath.get(raw) ?? []).map(entry => [String(entry.remoteObjectId), entry])).values()];
      const remote: RemoteObservation = remoteCandidates.length === 0
        ? absentRemote(p)
        : remoteCandidates.length === 1
          ? remoteObservation(remoteCandidates[0]!)
          : { status: "unknown", side: "remote", path: p, reason: "multiple distinct remote objects occupy the same logical path" };
      let base: BaseEvidence = { status: "uninitialized" };
      if (loadedState.status === "recovery-required") base = { status: "untrusted", reason: loadedState.detail ?? loadedState.reason };
      if (loadedState.status === "trusted") base = { status: "trusted", entry: loadedState.state.base.find(entry => String(entry.path) === raw), tombstone: loadedState.state.tombstones.find(entry => String(entry.path) === raw) };
      let identity: IdentityAssessment = { status: "unambiguous" };
      const candidateRemoteIds = remoteCandidates.map(entry => entry.remoteObjectId);
      if (remoteCandidates.length > 1) {
        identity = { status: "ambiguous", reason: "multiple distinct remote objects occupy the same logical path", candidateRemoteIds };
      } else if (remoteCandidates[0] && (remoteIdCounts.get(String(remoteCandidates[0].remoteObjectId)) ?? 0) > 1) {
        identity = { status: "ambiguous", reason: "multiple remote entries claim the same stable Drive identity", candidateRemoteIds };
      }
      if (inCollisionScope(raw)) {
        identity = {
          status: "ambiguous",
          reason: `reserved portable-configuration namespace collision isolates ${CONFIG_REMOTE_NAMESPACE} from ordinary vault synchronization`,
          candidateRemoteIds,
        };
      }
      return { path: p, local, remote, base, remoteEnumeration: remoteCompleteness, identity };
    });
  }
}
