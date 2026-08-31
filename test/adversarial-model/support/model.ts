import {
  verifyRemoteFolderCreate,
  type FolderCreateRecoveryOutcome,
  type RemoteFolderCreateObservation,
  type RemoteFolderCreatePhysicalMutationDescriptor,
} from "../../../src/contracts/synchronization-folder-create-foundation";

export type DeviceId = "A" | "B";
export type NetworkState = "online" | "offline" | "rate-limited" | "auth-lost";
export type LifecycleState = "active" | "suspended" | "dead";
export type WatcherState = "delivered" | "lost";
export type PathState = "converged" | "conflict" | "recovery" | "unknown";
export type EffectStage = "intent-persisted" | "dispatch-authorized" | "outcome-unknown" | "effect-verified" | "state-committed";

export interface RemoteObject {
  id: string;
  path: string;
  content?: string;
  kind: "file" | "folder";
  revision: number;
  parentId?: string;
  trashed: boolean;
}

export interface BaseRecord {
  path: string;
  hash: string;
  remoteId: string;
  exactBaseAuthority: boolean;
  exactIdentityAuthority: boolean;
}

export interface LearnedBatch {
  id: string;
  requestedCursor: number;
  entries: string[];
  terminalCursor?: number;
}

export type EffectKind =
  | "remote-create"
  | "remote-update-candidate"
  | "remote-trash"
  | "local-write"
  | "local-trash"
  | "local-move"
  | "remote-folder-create";

export interface JournalEffect {
  id: string;
  kind: EffectKind;
  stage: EffectStage;
  path: string;
  targetPath?: string;
  intendedContent?: string;
  remoteId?: string;
  predecessorRemoteId?: string;
  verificationRef?: string;
  dispatchCount: number;
}

export type JournalKind = "upload" | "download" | "move" | "trash" | "merge" | "folder-create";

export interface Journal {
  id: string;
  kind: JournalKind;
  path: string;
  intendedHash?: string;
  baseHash?: string;
  baseRemoteId?: string;
  requiredBaseAuthority: boolean;
  requiredIdentityAuthority: boolean;
  effects: JournalEffect[];
  folderDescriptor?: RemoteFolderCreatePhysicalMutationDescriptor;
}

export interface DurableDeviceState {
  base: Map<string, BaseRecord>;
  history: Map<string, Set<string>>;
  tombstones: Map<string, BaseRecord>;
  semanticGeneration: number;
  persistenceRevision: number;
  learnedBatches: LearnedBatch[];
  cursor: number;
  journals: Journal[];
  pathState: Map<string, PathState>;
  stale: boolean;
  remoteCoverageComplete: boolean;
  localUnreadable: Set<string>;
  starvationCycles: Map<string, number>;
  verificationLog: Set<string>;
}

interface PlannedAction {
  id: string;
  kind:
    | "upload-create"
    | "upload-update"
    | "download-create"
    | "download-update"
    | "trash-remote"
    | "trash-local"
    | "move-local"
    | "merge"
    | "establish-base"
    | "conflict"
    | "blocked";
  path: string;
  targetPath?: string;
  intendedHash?: string;
  remoteId?: string;
  baseHash?: string;
  baseRemoteId?: string;
  snapshotLocal?: string;
  snapshotRemoteSignature: string;
  reason?: string;
}

interface InFlightEffect {
  journalId: string;
  effectId: string;
}

export interface VolatileDeviceState {
  lifecycle: LifecycleState;
  network: NetworkState;
  cancellationRequested: boolean;
  cancellationDelivered: boolean;
  watcherState: Map<string, WatcherState>;
  cachedEvidence: Map<string, string | undefined>;
  dirtyPaths: Set<string>;
  plan: PlannedAction[];
  inFlight?: InFlightEffect;
}

export interface DeviceState {
  local: Map<string, string>;
  durable: DurableDeviceState;
  volatile: VolatileDeviceState;
}

export interface InitialDeviceState {
  local?: Array<[string, string]>;
  base?: BaseRecord[];
  semanticGeneration?: number;
  persistenceRevision?: number;
  stale?: boolean;
  remoteCoverageComplete?: boolean;
}

export interface InitialModelState {
  A?: InitialDeviceState;
  B?: InitialDeviceState;
  remote?: RemoteObject[];
}

export interface TraceFailure {
  code: string;
  message: string;
  eventIndex: number;
}

export interface TraceResult {
  seed?: number;
  initial: SerializedModelState;
  events: ModelEvent[];
  final: SerializedModelState;
  failure?: TraceFailure;
}

export interface SerializedModelState {
  devices: Record<DeviceId, {
    local: Array<[string, string]>;
    base: BaseRecord[];
    tombstones: BaseRecord[];
    semanticGeneration: number;
    persistenceRevision: number;
    cursor: number;
    learnedBatches: LearnedBatch[];
    journals: Journal[];
    pathState: Array<[string, PathState]>;
    stale: boolean;
    lifecycle: LifecycleState;
    network: NetworkState;
    dirtyPaths: string[];
  }>;
  remote: RemoteObject[];
  folderRecovery?: FolderCreateRecoveryOutcome;
  recoveryReads: number;
}

export type ModelEvent =
  | { type: "local-write"; device: DeviceId; path: string; content: string; watcher?: WatcherState }
  | { type: "local-delete"; device: DeviceId; path: string; watcher?: WatcherState }
  | { type: "local-move"; device: DeviceId; fromPath: string; toPath: string; watcher?: WatcherState }
  | { type: "local-readability"; device: DeviceId; path: string; readable: boolean }
  | { type: "external-remote-create"; id: string; path: string; content?: string; kind?: "file" | "folder"; parentId?: string }
  | { type: "external-remote-update"; id: string; content: string }
  | { type: "external-remote-move"; id: string; path: string; parentId?: string }
  | { type: "external-remote-trash"; id: string }
  | { type: "start-reconcile"; device: DeviceId; paths?: string[] }
  | { type: "advance"; device: DeviceId }
  | { type: "dispatch"; device: DeviceId }
  | { type: "transport-success"; device: DeviceId }
  | { type: "transport-lost"; device: DeviceId }
  | { type: "ingest-page"; device: DeviceId; batchId: string; requestedCursor: number; entries: string[]; terminalCursor?: number }
  | { type: "crash"; device: DeviceId }
  | { type: "restart"; device: DeviceId }
  | { type: "recover"; device: DeviceId }
  | { type: "suspend"; device: DeviceId }
  | { type: "resume"; device: DeviceId }
  | { type: "cancel-request"; device: DeviceId; delivered: boolean }
  | { type: "network"; device: DeviceId; state: NetworkState }
  | { type: "mark-stale"; device: DeviceId; stale: boolean }
  | { type: "remote-coverage"; device: DeviceId; complete: boolean }
  | { type: "integrity-reconcile"; device: DeviceId; path: string }
  | { type: "begin-folder-create"; device: DeviceId; descriptor: RemoteFolderCreatePhysicalMutationDescriptor }
  | { type: "recover-folder-create"; device: DeviceId };

export interface ModelOptions {
  negativeControlCollapseAmbiguity?: boolean;
}

function makeDurable(initial: InitialDeviceState = {}): DurableDeviceState {
  const base = new Map<string, BaseRecord>();
  const history = new Map<string, Set<string>>();
  for (const record of initial.base ?? []) {
    base.set(record.path, { ...record });
    history.set(record.path, new Set([record.hash]));
  }
  return {
    base,
    history,
    tombstones: new Map(),
    semanticGeneration: initial.semanticGeneration ?? 1,
    persistenceRevision: initial.persistenceRevision ?? 1,
    learnedBatches: [],
    cursor: 0,
    journals: [],
    pathState: new Map(),
    stale: initial.stale ?? false,
    remoteCoverageComplete: initial.remoteCoverageComplete ?? true,
    localUnreadable: new Set(),
    starvationCycles: new Map(),
    verificationLog: new Set(),
  };
}

function makeVolatile(): VolatileDeviceState {
  return {
    lifecycle: "active",
    network: "online",
    cancellationRequested: false,
    cancellationDelivered: false,
    watcherState: new Map(),
    cachedEvidence: new Map(),
    dirtyPaths: new Set(),
    plan: [],
  };
}

function cloneRemote(remote: RemoteObject): RemoteObject {
  return { ...remote };
}

export class AdversarialSyncModel {
  readonly devices: Record<DeviceId, DeviceState>;
  readonly remote = new Map<string, RemoteObject>();
  readonly trace: ModelEvent[] = [];
  readonly initial: SerializedModelState;
  folderRecovery?: FolderCreateRecoveryOutcome;
  recoveryReads = 0;
  private nextOperation = 1;
  private readonly options: ModelOptions;

  constructor(initial: InitialModelState = {}, options: ModelOptions = {}) {
    this.options = options;
    this.devices = {
      A: { local: new Map(initial.A?.local ?? []), durable: makeDurable(initial.A), volatile: makeVolatile() },
      B: { local: new Map(initial.B?.local ?? []), durable: makeDurable(initial.B), volatile: makeVolatile() },
    };
    for (const object of initial.remote ?? []) this.remote.set(object.id, cloneRemote(object));
    this.initial = this.serialize();
  }

  apply(event: ModelEvent): void {
    this.trace.push(structuredClone(event));
    switch (event.type) {
      case "local-write": this.localWrite(event.device, event.path, event.content, event.watcher ?? "delivered"); break;
      case "local-delete": this.localDelete(event.device, event.path, event.watcher ?? "delivered"); break;
      case "local-move": this.localMove(event.device, event.fromPath, event.toPath, event.watcher ?? "delivered"); break;
      case "local-readability": this.setLocalReadability(event.device, event.path, event.readable); break;
      case "external-remote-create": this.externalRemoteCreate(event); break;
      case "external-remote-update": this.externalRemoteUpdate(event.id, event.content); break;
      case "external-remote-move": this.externalRemoteMove(event.id, event.path, event.parentId); break;
      case "external-remote-trash": this.externalRemoteTrash(event.id); break;
      case "start-reconcile": this.startReconcile(event.device, event.paths); break;
      case "advance": this.advance(event.device); break;
      case "dispatch": this.dispatch(event.device); break;
      case "transport-success": this.transport(event.device, true); break;
      case "transport-lost": this.transport(event.device, false); break;
      case "ingest-page": this.ingestPage(event); break;
      case "crash": this.crash(event.device); break;
      case "restart": this.restart(event.device); break;
      case "recover": this.recover(event.device); break;
      case "suspend": this.suspend(event.device); break;
      case "resume": this.resume(event.device); break;
      case "cancel-request": this.cancel(event.device, event.delivered); break;
      case "network": this.devices[event.device].volatile.network = event.state; break;
      case "mark-stale": this.devices[event.device].durable.stale = event.stale; break;
      case "remote-coverage": this.devices[event.device].durable.remoteCoverageComplete = event.complete; break;
      case "integrity-reconcile": this.integrityReconcile(event.device, event.path); break;
      case "begin-folder-create": this.beginFolderCreate(event.device, event.descriptor); break;
      case "recover-folder-create": this.recoverFolderCreate(event.device); break;
    }
    this.assertInvariants();
  }

  run(events: readonly ModelEvent[]): void {
    for (const event of events) this.apply(event);
  }

  settle(device: DeviceId, maxTransitions = 80): number {
    let transitions = 0;
    while (transitions < maxTransitions) {
      const d = this.devices[device];
      if (d.volatile.lifecycle !== "active") break;
      const before = this.digest();
      if (d.durable.journals.some(j => j.effects.some(e => e.stage === "dispatch-authorized" || e.stage === "outcome-unknown"))) {
        this.apply({ type: "recover", device });
      } else if (d.durable.journals.some(j => j.effects.some(e => e.stage !== "state-committed"))) {
        this.apply({ type: "advance", device });
        const effect = this.currentDispatchableEffect(device);
        if (effect && d.volatile.network === "online" && !d.volatile.cancellationDelivered) {
          this.apply({ type: "dispatch", device });
          this.apply({ type: "transport-success", device });
        }
      } else if (d.volatile.plan.length > 0) {
        this.apply({ type: "advance", device });
      } else if (d.volatile.dirtyPaths.size > 0) {
        this.apply({ type: "start-reconcile", device });
      } else {
        this.apply({ type: "start-reconcile", device });
        if (d.volatile.plan.length === 0) break;
      }
      transitions++;
      if (this.digest() === before) break;
    }
    return transitions;
  }

  assertQuiescentOrExplicit(device: DeviceId, paths: readonly string[]): void {
    const d = this.devices[device];
    for (const path of paths) {
      const state = d.durable.pathState.get(path);
      if (state === "conflict" || state === "recovery") continue;
      const base = d.durable.base.get(path);
      const local = d.local.get(path);
      const candidates = this.remoteAtPath(path);
      if (!base && local === undefined && candidates.length === 0) continue;
      if (!base || local !== base.hash || candidates.length !== 1 || candidates[0].id !== base.remoteId || candidates[0].content !== base.hash) {
        throw new Error(`quiescence-failed:${device}:${path}`);
      }
    }
  }

  serialize(): SerializedModelState {
    const serializeDevice = (id: DeviceId) => {
      const d = this.devices[id];
      return {
        local: [...d.local.entries()].sort(([a], [b]) => a.localeCompare(b)),
        base: [...d.durable.base.values()].map(v => ({ ...v })).sort((a, b) => a.path.localeCompare(b.path)),
        tombstones: [...d.durable.tombstones.values()].map(v => ({ ...v })).sort((a, b) => a.path.localeCompare(b.path)),
        semanticGeneration: d.durable.semanticGeneration,
        persistenceRevision: d.durable.persistenceRevision,
        cursor: d.durable.cursor,
        learnedBatches: d.durable.learnedBatches.map(batch => ({ ...batch, entries: [...batch.entries] })),
        journals: d.durable.journals.map(journal => this.cloneJournal(journal)),
        pathState: [...d.durable.pathState.entries()].sort(([a], [b]) => a.localeCompare(b)),
        stale: d.durable.stale,
        lifecycle: d.volatile.lifecycle,
        network: d.volatile.network,
        dirtyPaths: [...d.volatile.dirtyPaths].sort(),
      };
    };
    return {
      devices: { A: serializeDevice("A"), B: serializeDevice("B") },
      remote: [...this.remote.values()].map(cloneRemote).sort((a, b) => a.id.localeCompare(b.id)),
      folderRecovery: this.folderRecovery ? structuredClone(this.folderRecovery) : undefined,
      recoveryReads: this.recoveryReads,
    };
  }

  digest(): string {
    return JSON.stringify(this.serialize());
  }

  private localWrite(device: DeviceId, path: string, content: string, watcher: WatcherState): void {
    const d = this.devices[device];
    d.local.set(path, content);
    d.volatile.watcherState.set(path, watcher);
    if (watcher === "delivered") d.volatile.dirtyPaths.add(path);
  }

  private localDelete(device: DeviceId, path: string, watcher: WatcherState): void {
    const d = this.devices[device];
    d.local.delete(path);
    d.volatile.watcherState.set(path, watcher);
    if (watcher === "delivered") d.volatile.dirtyPaths.add(path);
  }

  private localMove(device: DeviceId, fromPath: string, toPath: string, watcher: WatcherState): void {
    const d = this.devices[device];
    const value = d.local.get(fromPath);
    if (value !== undefined) {
      d.local.delete(fromPath);
      d.local.set(toPath, value);
    }
    d.volatile.watcherState.set(fromPath, watcher);
    d.volatile.watcherState.set(toPath, watcher);
    if (watcher === "delivered") {
      d.volatile.dirtyPaths.add(fromPath);
      d.volatile.dirtyPaths.add(toPath);
    }
  }

  private setLocalReadability(device: DeviceId, path: string, readable: boolean): void {
    const set = this.devices[device].durable.localUnreadable;
    if (readable) set.delete(path); else set.add(path);
  }

  private externalRemoteCreate(event: Extract<ModelEvent, { type: "external-remote-create" }>): void {
    if (this.remote.has(event.id)) return;
    this.remote.set(event.id, {
      id: event.id,
      path: event.path,
      content: event.content,
      kind: event.kind ?? "file",
      revision: 1,
      parentId: event.parentId,
      trashed: false,
    });
  }

  private externalRemoteUpdate(id: string, content: string): void {
    const object = this.remote.get(id);
    if (!object || object.trashed || object.kind !== "file") return;
    object.content = content;
    object.revision++;
  }

  private externalRemoteMove(id: string, path: string, parentId?: string): void {
    const object = this.remote.get(id);
    if (!object || object.trashed) return;
    object.path = path;
    object.parentId = parentId;
    object.revision++;
  }

  private externalRemoteTrash(id: string): void {
    const object = this.remote.get(id);
    if (!object) return;
    object.trashed = true;
    object.revision++;
  }

  private startReconcile(device: DeviceId, requestedPaths?: string[]): void {
    const d = this.devices[device];
    if (d.volatile.lifecycle !== "active") return;
    if (d.volatile.cancellationDelivered) return;
    const paths = new Set<string>(requestedPaths ?? []);
    if (!requestedPaths) {
      for (const path of d.local.keys()) paths.add(path);
      for (const path of d.durable.base.keys()) paths.add(path);
      for (const object of this.remote.values()) if (!object.trashed) paths.add(object.path);
      for (const path of d.volatile.dirtyPaths) paths.add(path);
    }
    d.volatile.plan = [];
    for (const path of [...paths].sort()) {
      const action = this.derivePlan(device, path);
      if (action) d.volatile.plan.push(action);
      if (d.volatile.dirtyPaths.has(path)) {
        const next = (d.durable.starvationCycles.get(path) ?? 0) + 1;
        d.durable.starvationCycles.set(path, next);
      }
    }
  }

  private derivePlan(device: DeviceId, path: string): PlannedAction | undefined {
    const d = this.devices[device];
    const base = d.durable.base.get(path);
    const localUnreadable = d.durable.localUnreadable.has(path);
    const local = localUnreadable ? undefined : d.local.get(path);
    const candidates = this.remoteAtPath(path);
    const signature = this.remoteSignature(path);
    const id = `plan-${device}-${this.nextOperation++}`;

    if (localUnreadable) return { id, kind: "blocked", path, snapshotRemoteSignature: signature, reason: "local-observation-incomplete" };
    if (candidates.length > 1) {
      if (this.options.negativeControlCollapseAmbiguity) {
        d.durable.pathState.set(path, "converged");
      }
      return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "duplicate-logical-path" };
    }

    if (!base) {
      if (local === undefined && candidates.length === 0) return undefined;
      if (local !== undefined && candidates.length === 0) {
        return { id, kind: "upload-create", path, intendedHash: local, snapshotLocal: local, snapshotRemoteSignature: signature };
      }
      if (local === undefined && candidates.length === 1) {
        return { id, kind: "download-create", path, intendedHash: candidates[0].content, remoteId: candidates[0].id, snapshotRemoteSignature: signature };
      }
      if (local !== undefined && candidates.length === 1 && candidates[0].content === local) {
        return { id, kind: "establish-base", path, intendedHash: local, remoteId: candidates[0].id, snapshotLocal: local, snapshotRemoteSignature: signature };
      }
      return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "divergent-no-base" };
    }

    const mapped = this.remote.get(base.remoteId);
    const mappedPresent = !!mapped && !mapped.trashed;
    const independent = candidates.filter(candidate => candidate.id !== base.remoteId);
    if (independent.length > 0) return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "independent-remote-candidate" };
    if (!base.exactBaseAuthority) return { id, kind: "blocked", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "exact-base-authority-required" };

    if (mappedPresent && mapped!.path !== path) {
      if (!base.exactIdentityAuthority) return { id, kind: "blocked", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "exact-identity-authority-required" };
      if (local === base.hash) {
        return { id, kind: "move-local", path, targetPath: mapped!.path, intendedHash: base.hash, remoteId: mapped!.id, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotLocal: local, snapshotRemoteSignature: signature };
      }
      return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "move-vs-local-change" };
    }

    const remoteContent = mappedPresent ? mapped!.content : undefined;
    const localChanged = local !== base.hash;
    const remoteChanged = !mappedPresent || remoteContent !== base.hash;

    if (!localChanged && !remoteChanged) return undefined;
    if (!base.exactIdentityAuthority && mappedPresent) return { id, kind: "blocked", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "exact-identity-authority-required" };

    if (localChanged && !remoteChanged) {
      if (local === undefined) {
        if (!d.durable.remoteCoverageComplete || d.durable.stale) return { id, kind: "blocked", path, snapshotRemoteSignature: signature, reason: "destructive-authority-gated" };
        return { id, kind: "trash-remote", path, remoteId: base.remoteId, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotRemoteSignature: signature };
      }
      return { id, kind: "upload-update", path, intendedHash: local, remoteId: base.remoteId, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotLocal: local, snapshotRemoteSignature: signature };
    }

    if (!localChanged && remoteChanged) {
      if (!mappedPresent) {
        if (!d.durable.remoteCoverageComplete || d.durable.stale) return { id, kind: "blocked", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "destructive-authority-gated" };
        return { id, kind: "trash-local", path, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotLocal: local, snapshotRemoteSignature: signature };
      }
      return { id, kind: "download-update", path, intendedHash: remoteContent, remoteId: mapped!.id, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotLocal: local, snapshotRemoteSignature: signature };
    }

    if (local === undefined || !mappedPresent) {
      return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "delete-vs-modify" };
    }

    const merged = this.tryCleanMerge(base.hash, local, remoteContent ?? "");
    if (merged !== undefined) {
      return { id, kind: "merge", path, intendedHash: merged, remoteId: mapped!.id, baseHash: base.hash, baseRemoteId: base.remoteId, snapshotLocal: local, snapshotRemoteSignature: signature };
    }
    return { id, kind: "conflict", path, snapshotLocal: local, snapshotRemoteSignature: signature, reason: "concurrent-change" };
  }

  private tryCleanMerge(base: string, local: string, remote: string): string | undefined {
    const localPrefix = `${base}|L:`;
    const remotePrefix = `${base}|R:`;
    if (local.startsWith(localPrefix) && remote.startsWith(remotePrefix)) {
      return `${base}|M:${local.slice(localPrefix.length)}+${remote.slice(remotePrefix.length)}`;
    }
    return undefined;
  }

  private advance(device: DeviceId): void {
    const d = this.devices[device];
    if (d.volatile.lifecycle !== "active" || d.volatile.cancellationDelivered) return;
    const journal = d.durable.journals.find(candidate => candidate.effects.some(effect => effect.stage !== "state-committed"));
    if (journal) {
      const effect = journal.effects.find(candidate => candidate.stage !== "state-committed");
      if (!effect) return;
      if (effect.stage === "intent-persisted") {
        effect.stage = "dispatch-authorized";
        d.durable.persistenceRevision++;
        return;
      }
      if (effect.stage === "effect-verified") {
        effect.stage = "state-committed";
        d.durable.persistenceRevision++;
        if (journal.effects.every(candidate => candidate.stage === "state-committed")) this.finalizeJournal(device, journal);
      }
      return;
    }

    const action = d.volatile.plan.shift();
    if (!action) return;
    if (action.snapshotLocal !== undefined && d.local.get(action.path) !== action.snapshotLocal) {
      d.volatile.dirtyPaths.add(action.path);
      return;
    }
    if (this.remoteSignature(action.path) !== action.snapshotRemoteSignature) {
      d.volatile.dirtyPaths.add(action.path);
      return;
    }
    if (action.kind === "conflict") {
      d.durable.pathState.set(action.path, "conflict");
      d.volatile.dirtyPaths.delete(action.path);
      return;
    }
    if (action.kind === "blocked") {
      d.durable.pathState.set(action.path, "recovery");
      return;
    }
    if (action.kind === "establish-base") {
      if (action.intendedHash === undefined || !action.remoteId) throw new Error("invalid-establish-base");
      this.commitBase(device, action.path, action.intendedHash, action.remoteId);
      d.volatile.dirtyPaths.delete(action.path);
      return;
    }
    const created = this.journalFromPlan(device, action);
    d.durable.journals.push(created);
    d.durable.persistenceRevision++;
  }

  private journalFromPlan(device: DeviceId, action: PlannedAction): Journal {
    const opId = `op-${device}-${this.nextOperation++}`;
    const candidateId = `candidate-${opId}`;
    const effect = (values: Omit<JournalEffect, "stage" | "dispatchCount">): JournalEffect => ({ ...values, stage: "intent-persisted", dispatchCount: 0 });
    const baseRequired = ["upload-update", "download-update", "trash-remote", "trash-local", "move-local", "merge"].includes(action.kind);
    const identityRequired = ["upload-update", "download-update", "trash-remote", "move-local", "merge"].includes(action.kind);
    const effects: JournalEffect[] = [];
    if (action.kind === "upload-create") effects.push(effect({ id: `${opId}:remote`, kind: "remote-create", path: action.path, intendedContent: action.intendedHash, remoteId: candidateId }));
    if (action.kind === "upload-update") effects.push(effect({ id: `${opId}:remote`, kind: "remote-update-candidate", path: action.path, intendedContent: action.intendedHash, remoteId: candidateId, predecessorRemoteId: action.remoteId }));
    if (action.kind === "download-create" || action.kind === "download-update") effects.push(effect({ id: `${opId}:local`, kind: "local-write", path: action.path, intendedContent: action.intendedHash, remoteId: action.remoteId }));
    if (action.kind === "trash-remote") effects.push(effect({ id: `${opId}:remote-trash`, kind: "remote-trash", path: action.path, remoteId: action.remoteId }));
    if (action.kind === "trash-local") effects.push(effect({ id: `${opId}:local-trash`, kind: "local-trash", path: action.path }));
    if (action.kind === "move-local") effects.push(effect({ id: `${opId}:local-move`, kind: "local-move", path: action.path, targetPath: action.targetPath, remoteId: action.remoteId }));
    if (action.kind === "merge") {
      effects.push(effect({ id: `${opId}:local-merge`, kind: "local-write", path: action.path, intendedContent: action.intendedHash, remoteId: action.remoteId }));
      effects.push(effect({ id: `${opId}:remote-merge`, kind: "remote-update-candidate", path: action.path, intendedContent: action.intendedHash, remoteId: candidateId, predecessorRemoteId: action.remoteId }));
    }
    const base = this.devices[device].durable.base.get(action.path);
    if (baseRequired && (!base || !base.exactBaseAuthority)) throw new Error(`journal-without-exact-base:${action.path}`);
    if (identityRequired && (!base || !base.exactIdentityAuthority)) throw new Error(`journal-without-exact-identity:${action.path}`);
    return {
      id: opId,
      kind: action.kind === "merge" ? "merge" : action.kind.startsWith("upload") ? "upload" : action.kind.startsWith("download") ? "download" : action.kind === "move-local" ? "move" : "trash",
      path: action.path,
      intendedHash: action.intendedHash,
      baseHash: action.baseHash,
      baseRemoteId: action.baseRemoteId,
      requiredBaseAuthority: baseRequired,
      requiredIdentityAuthority: identityRequired,
      effects,
    };
  }

  private currentDispatchableEffect(device: DeviceId): { journal: Journal; effect: JournalEffect } | undefined {
    const d = this.devices[device];
    for (const journal of d.durable.journals) {
      const effect = journal.effects.find(candidate => candidate.stage === "dispatch-authorized");
      if (effect) return { journal, effect };
    }
    return undefined;
  }

  private dispatch(device: DeviceId): void {
    const d = this.devices[device];
    if (d.volatile.lifecycle !== "active" || d.volatile.network !== "online" || d.volatile.cancellationDelivered || d.volatile.inFlight) return;
    const current = this.currentDispatchableEffect(device);
    if (!current) return;
    this.applyPhysicalEffect(device, current.effect);
    current.effect.dispatchCount++;
    d.volatile.inFlight = { journalId: current.journal.id, effectId: current.effect.id };
  }

  private transport(device: DeviceId, success: boolean): void {
    const d = this.devices[device];
    const inFlight = d.volatile.inFlight;
    if (!inFlight) return;
    const found = this.findEffect(device, inFlight.journalId, inFlight.effectId);
    d.volatile.inFlight = undefined;
    if (!found) return;
    if (!success) {
      found.effect.stage = "outcome-unknown";
      d.durable.persistenceRevision++;
      return;
    }
    if (!this.physicalMatches(device, found.effect)) {
      d.durable.pathState.set(found.journal.path, "conflict");
      found.effect.stage = "outcome-unknown";
      d.durable.persistenceRevision++;
      return;
    }
    this.markVerified(device, found.effect, "transport-observation");
  }

  private applyPhysicalEffect(device: DeviceId, effect: JournalEffect): void {
    const d = this.devices[device];
    switch (effect.kind) {
      case "remote-create":
      case "remote-update-candidate":
        if (!effect.remoteId) throw new Error("remote-effect-without-id");
        if (!this.remote.has(effect.remoteId)) {
          this.remote.set(effect.remoteId, { id: effect.remoteId, path: effect.path, content: effect.intendedContent, kind: "file", revision: 1, trashed: false });
        }
        break;
      case "remote-folder-create":
        if (!effect.remoteId) throw new Error("folder-effect-without-id");
        if (!this.remote.has(effect.remoteId)) {
          const journal = d.durable.journals.find(candidate => candidate.effects.some(item => item.id === effect.id));
          const descriptor = journal?.folderDescriptor;
          this.remote.set(effect.remoteId, { id: effect.remoteId, path: effect.path, kind: "folder", revision: 1, parentId: descriptor?.parentRemoteObjectId as string | undefined, trashed: false });
        }
        break;
      case "remote-trash": {
        const object = effect.remoteId ? this.remote.get(effect.remoteId) : undefined;
        if (object) { object.trashed = true; object.revision++; }
        break;
      }
      case "local-write":
        if (effect.intendedContent !== undefined) d.local.set(effect.path, effect.intendedContent);
        break;
      case "local-trash":
        d.local.delete(effect.path);
        break;
      case "local-move": {
        const value = d.local.get(effect.path);
        if (value !== undefined && effect.targetPath) {
          d.local.delete(effect.path);
          d.local.set(effect.targetPath, value);
        }
        break;
      }
    }
  }

  private recover(device: DeviceId): void {
    const d = this.devices[device];
    if (d.volatile.lifecycle !== "active" || d.volatile.network !== "online") return;
    for (const journal of [...d.durable.journals]) {
      for (const effect of journal.effects) {
        if (effect.stage === "intent-persisted") {
          d.durable.journals = d.durable.journals.filter(candidate => candidate.id !== journal.id);
          d.volatile.dirtyPaths.add(journal.path);
          d.durable.persistenceRevision++;
          break;
        }
        if (effect.stage === "dispatch-authorized" || effect.stage === "outcome-unknown") {
          if (this.physicalMatches(device, effect)) {
            this.markVerified(device, effect, "restart-physical-observation");
          } else if (this.effectAuthoritativelyNotApplied(device, effect)) {
            d.durable.journals = d.durable.journals.filter(candidate => candidate.id !== journal.id);
            d.volatile.dirtyPaths.add(journal.path);
            d.durable.persistenceRevision++;
            break;
          } else {
            d.durable.pathState.set(journal.path, "recovery");
          }
        }
      }
    }
  }

  private effectAuthoritativelyNotApplied(device: DeviceId, effect: JournalEffect): boolean {
    const d = this.devices[device];
    if (effect.kind === "remote-create" || effect.kind === "remote-update-candidate" || effect.kind === "remote-folder-create") {
      return d.durable.remoteCoverageComplete && !!effect.remoteId && !this.remote.has(effect.remoteId);
    }
    if (effect.kind === "remote-trash") {
      const object = effect.remoteId ? this.remote.get(effect.remoteId) : undefined;
      return !!object && !object.trashed;
    }
    if (effect.kind === "local-write") return d.local.get(effect.path) !== effect.intendedContent;
    if (effect.kind === "local-trash") return d.local.has(effect.path);
    if (effect.kind === "local-move") return d.local.has(effect.path) && !!effect.targetPath && !d.local.has(effect.targetPath);
    return false;
  }

  private physicalMatches(device: DeviceId, effect: JournalEffect): boolean {
    const d = this.devices[device];
    if (effect.kind === "remote-create" || effect.kind === "remote-update-candidate") {
      const object = effect.remoteId ? this.remote.get(effect.remoteId) : undefined;
      return !!object && !object.trashed && object.path === effect.path && object.content === effect.intendedContent;
    }
    if (effect.kind === "remote-folder-create") {
      const object = effect.remoteId ? this.remote.get(effect.remoteId) : undefined;
      return !!object && !object.trashed && object.kind === "folder" && object.path === effect.path;
    }
    if (effect.kind === "remote-trash") {
      const object = effect.remoteId ? this.remote.get(effect.remoteId) : undefined;
      return !!object && object.trashed;
    }
    if (effect.kind === "local-write") return d.local.get(effect.path) === effect.intendedContent;
    if (effect.kind === "local-trash") return !d.local.has(effect.path);
    if (effect.kind === "local-move") return !!effect.targetPath && !d.local.has(effect.path) && d.local.has(effect.targetPath);
    return false;
  }

  private markVerified(device: DeviceId, effect: JournalEffect, source: string): void {
    const d = this.devices[device];
    const ref = `${source}:${effect.id}:${d.durable.persistenceRevision + 1}`;
    effect.stage = "effect-verified";
    effect.verificationRef = ref;
    d.durable.verificationLog.add(ref);
    d.durable.persistenceRevision++;
  }

  private finalizeJournal(device: DeviceId, journal: Journal): void {
    const d = this.devices[device];
    if (journal.kind === "folder-create") return;
    const activeAtPath = this.remoteAtPath(journal.path);
    if (journal.kind === "upload" || journal.kind === "merge") {
      const remoteEffect = journal.effects.find(effect => effect.kind === "remote-create" || effect.kind === "remote-update-candidate");
      if (!remoteEffect?.remoteId || journal.intendedHash === undefined) throw new Error("invalid-upload-finalization");
      const allowed = new Set([remoteEffect.remoteId, remoteEffect.predecessorRemoteId].filter((value): value is string => !!value));
      const independent = activeAtPath.filter(object => !allowed.has(object.id));
      if (independent.length > 0) {
        d.durable.pathState.set(journal.path, "conflict");
        d.durable.journals = d.durable.journals.filter(candidate => candidate.id !== journal.id);
        d.volatile.dirtyPaths.delete(journal.path);
        return;
      }
      if (remoteEffect.predecessorRemoteId) {
        const predecessor = this.remote.get(remoteEffect.predecessorRemoteId);
        if (predecessor) predecessor.trashed = true;
      }
      this.commitBase(device, journal.path, journal.intendedHash, remoteEffect.remoteId);
    } else if (journal.kind === "download") {
      const effect = journal.effects[0];
      if (!effect.remoteId || journal.intendedHash === undefined) throw new Error("invalid-download-finalization");
      const current = this.remote.get(effect.remoteId);
      if (!current || current.trashed || current.path !== journal.path || current.content !== journal.intendedHash || activeAtPath.length !== 1) {
        d.durable.pathState.set(journal.path, "conflict");
      } else {
        this.commitBase(device, journal.path, journal.intendedHash, effect.remoteId);
      }
    } else if (journal.kind === "trash") {
      const remoteTrash = journal.effects.find(effect => effect.kind === "remote-trash");
      const localTrash = journal.effects.find(effect => effect.kind === "local-trash");
      if ((remoteTrash && this.physicalMatches(device, remoteTrash)) || (localTrash && this.physicalMatches(device, localTrash))) {
        const prior = d.durable.base.get(journal.path);
        if (prior) d.durable.tombstones.set(journal.path, { ...prior });
        d.durable.base.delete(journal.path);
        d.durable.pathState.set(journal.path, "converged");
        d.durable.semanticGeneration++;
      }
    } else if (journal.kind === "move") {
      const effect = journal.effects[0];
      if (!effect.targetPath || !journal.baseHash || !journal.baseRemoteId) throw new Error("invalid-move-finalization");
      d.durable.base.delete(journal.path);
      this.commitBase(device, effect.targetPath, journal.baseHash, journal.baseRemoteId);
      d.durable.pathState.set(journal.path, "converged");
    }
    d.durable.journals = d.durable.journals.filter(candidate => candidate.id !== journal.id);
    d.volatile.dirtyPaths.delete(journal.path);
    d.durable.starvationCycles.set(journal.path, 0);
  }

  private commitBase(device: DeviceId, path: string, hash: string, remoteId: string): void {
    const d = this.devices[device];
    d.durable.base.set(path, { path, hash, remoteId, exactBaseAuthority: true, exactIdentityAuthority: true });
    const history = d.durable.history.get(path) ?? new Set<string>();
    history.add(hash);
    d.durable.history.set(path, history);
    d.durable.pathState.set(path, "converged");
    d.durable.semanticGeneration++;
    d.durable.persistenceRevision++;
    d.durable.starvationCycles.set(path, 0);
  }

  private ingestPage(event: Extract<ModelEvent, { type: "ingest-page" }>): void {
    const d = this.devices[event.device];
    if (d.durable.learnedBatches.some(batch => batch.id === event.batchId)) return;
    d.durable.learnedBatches.push({ id: event.batchId, requestedCursor: event.requestedCursor, entries: [...event.entries], terminalCursor: event.terminalCursor });
    d.durable.persistenceRevision++;
    if (event.terminalCursor !== undefined) d.durable.cursor = event.terminalCursor;
  }

  private crash(device: DeviceId): void {
    const d = this.devices[device];
    d.volatile.lifecycle = "dead";
    d.volatile.plan = [];
    d.volatile.inFlight = undefined;
    d.volatile.cachedEvidence = new Map();
    d.volatile.watcherState = new Map();
    d.volatile.dirtyPaths = new Set();
    d.volatile.cancellationRequested = false;
    d.volatile.cancellationDelivered = false;
  }

  private restart(device: DeviceId): void {
    const d = this.devices[device];
    d.volatile = makeVolatile();
  }

  private suspend(device: DeviceId): void {
    const d = this.devices[device];
    d.volatile.lifecycle = "suspended";
    if (d.volatile.cancellationRequested) d.volatile.cancellationDelivered = true;
  }

  private resume(device: DeviceId): void {
    const d = this.devices[device];
    if (d.volatile.lifecycle !== "dead") d.volatile.lifecycle = "active";
  }

  private cancel(device: DeviceId, delivered: boolean): void {
    const d = this.devices[device];
    d.volatile.cancellationRequested = true;
    d.volatile.cancellationDelivered = delivered;
  }

  private integrityReconcile(device: DeviceId, path: string): void {
    const d = this.devices[device];
    if (d.durable.localUnreadable.has(path)) {
      d.durable.pathState.set(path, "recovery");
      return;
    }
    const actual = d.local.get(path);
    const cached = d.volatile.cachedEvidence.get(path);
    d.volatile.cachedEvidence.set(path, actual);
    if (cached !== actual || d.durable.base.get(path)?.hash !== actual) d.volatile.dirtyPaths.add(path);
  }

  private beginFolderCreate(device: DeviceId, descriptor: RemoteFolderCreatePhysicalMutationDescriptor): void {
    const d = this.devices[device];
    const opId = `folder-${device}-${this.nextOperation++}`;
    const effect: JournalEffect = {
      id: `${opId}:remote-folder`,
      kind: "remote-folder-create",
      stage: "intent-persisted",
      path: descriptor.targetPath as string,
      remoteId: descriptor.remoteMutation.reservedRemoteObjectId as string,
      dispatchCount: 0,
    };
    d.durable.journals.push({
      id: opId,
      kind: "folder-create",
      path: descriptor.targetPath as string,
      requiredBaseAuthority: false,
      requiredIdentityAuthority: false,
      effects: [effect],
      folderDescriptor: descriptor,
    });
    d.durable.persistenceRevision++;
  }

  private recoverFolderCreate(device: DeviceId): void {
    const d = this.devices[device];
    const journal = d.durable.journals.find(candidate => candidate.kind === "folder-create" && candidate.folderDescriptor);
    if (!journal?.folderDescriptor) return;
    const effect = journal.effects[0];
    if (effect.stage !== "dispatch-authorized" && effect.stage !== "outcome-unknown") return;
    this.recoveryReads++;
    const observation = this.observeFolderRecovery(device, journal.folderDescriptor);
    this.folderRecovery = verifyRemoteFolderCreate(journal.folderDescriptor, observation);
    if (this.folderRecovery.status === "verified-effect") {
      this.markVerified(device, effect, "folder-recovery-read");
    } else if (this.folderRecovery.status === "verified-not-applied") {
      d.durable.journals = d.durable.journals.filter(candidate => candidate.id !== journal.id);
      d.volatile.dirtyPaths.add(journal.path);
    } else if (this.folderRecovery.status === "conflict-preserved") {
      d.durable.pathState.set(journal.path, "conflict");
    } else {
      d.durable.pathState.set(journal.path, "recovery");
    }
  }

  private observeFolderRecovery(device: DeviceId, descriptor: RemoteFolderCreatePhysicalMutationDescriptor): RemoteFolderCreateObservation {
    const d = this.devices[device];
    if (d.volatile.network !== "online" || !d.durable.remoteCoverageComplete) return { status: "unobservable", reason: "remote-observation-incomplete" };
    const reservedId = descriptor.remoteMutation.reservedRemoteObjectId as string;
    const targetPath = descriptor.targetPath as string;
    const reserved = this.remote.get(reservedId);
    const occupants = this.remoteAtPath(targetPath);
    if (occupants.length > 1) return { status: "unobservable", reason: "duplicate-logical-path" };
    if (reserved && !reserved.trashed) {
      if (reserved.kind !== "folder" || !reserved.parentId) return { status: "unobservable", reason: "reserved-folder-structure-incomplete" };
      return {
        status: "folder",
        targetPath: reserved.path as never,
        pathComparisonKey: reserved.path,
        remoteObjectId: reserved.id as never,
        parentRemoteObjectId: reserved.parentId as never,
      };
    }
    if (occupants.length === 1) {
      const occupant = occupants[0];
      return {
        status: "occupied",
        targetPath: occupant.path as never,
        pathComparisonKey: occupant.path,
        remoteObjectId: occupant.id as never,
        entityKind: occupant.kind,
      };
    }
    return { status: "authoritative-absent", reservedRemoteObjectId: reservedId as never };
  }

  private remoteAtPath(path: string): RemoteObject[] {
    return [...this.remote.values()].filter(object => !object.trashed && object.path === path).sort((a, b) => a.id.localeCompare(b.id));
  }

  private remoteSignature(path: string): string {
    return JSON.stringify(this.remoteAtPath(path).map(object => [object.id, object.path, object.content, object.kind, object.revision, object.parentId]));
  }

  private findEffect(device: DeviceId, journalId: string, effectId: string): { journal: Journal; effect: JournalEffect } | undefined {
    const journal = this.devices[device].durable.journals.find(candidate => candidate.id === journalId);
    const effect = journal?.effects.find(candidate => candidate.id === effectId);
    return journal && effect ? { journal, effect } : undefined;
  }

  private cloneJournal(journal: Journal): Journal {
    return {
      ...journal,
      effects: journal.effects.map(effect => ({ ...effect })),
      folderDescriptor: journal.folderDescriptor ? structuredClone(journal.folderDescriptor) : undefined,
    };
  }

  private assertInvariants(): void {
    for (const id of ["A", "B"] as const) {
      const d = this.devices[id];
      for (const [path, history] of d.durable.history) {
        if (history.size === 0) throw new Error(`acknowledged-version-lost:${id}:${path}`);
      }
      for (const journal of d.durable.journals) {
        if (journal.requiredBaseAuthority) {
          const base = d.durable.base.get(journal.path);
          if (!base?.exactBaseAuthority) throw new Error(`history-work-without-exact-base:${id}:${journal.path}`);
        }
        if (journal.requiredIdentityAuthority) {
          const base = d.durable.base.get(journal.path);
          if (!base?.exactIdentityAuthority) throw new Error(`identity-work-without-exact-authority:${id}:${journal.path}`);
        }
        for (const effect of journal.effects) {
          if ((effect.stage === "effect-verified" || effect.stage === "state-committed") && (!effect.verificationRef || !d.durable.verificationLog.has(effect.verificationRef))) {
            throw new Error(`fabricated-physical-success:${id}:${effect.id}`);
          }
        }
      }
      for (const [path, cycles] of d.durable.starvationCycles) {
        if (cycles > 10 && d.volatile.dirtyPaths.has(path) && d.durable.pathState.get(path) !== "conflict" && d.durable.pathState.get(path) !== "recovery") {
          throw new Error(`safe-path-starvation:${id}:${path}`);
        }
      }
      if (d.durable.stale) {
        for (const journal of d.durable.journals) {
          if (journal.effects.some(effect => effect.kind === "remote-trash" || effect.kind === "local-trash")) throw new Error(`stale-destructive-authority:${id}:${journal.path}`);
        }
      }
    }
    const paths = new Set([...this.remote.values()].filter(object => !object.trashed).map(object => object.path));
    for (const path of paths) {
      const candidates = this.remoteAtPath(path);
      if (candidates.length > 1) {
        for (const id of ["A", "B"] as const) {
          if (this.devices[id].durable.pathState.get(path) === "converged") throw new Error(`duplicate-ambiguous-winner:${id}:${path}`);
        }
      }
    }
  }
}

export function runTrace(initial: InitialModelState, events: readonly ModelEvent[], seed?: number, options: ModelOptions = {}): TraceResult {
  const model = new AdversarialSyncModel(initial, options);
  let failure: TraceFailure | undefined;
  for (let index = 0; index < events.length; index++) {
    try {
      model.apply(events[index]);
    } catch (error) {
      failure = { code: error instanceof Error ? error.message.split(":")[0] : "unknown", message: String(error), eventIndex: index };
      break;
    }
  }
  return { seed, initial: model.initial, events: events.map(event => structuredClone(event)), final: model.serialize(), failure };
}

export function replayTrace(trace: TraceResult, initial: InitialModelState, options: ModelOptions = {}): TraceResult {
  return runTrace(initial, trace.events, trace.seed, options);
}

export function minimizeFailingTrace(initial: InitialModelState, events: readonly ModelEvent[], failureCode: string, options: ModelOptions): ModelEvent[] {
  let candidate = [...events];
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < candidate.length; index++) {
      const reduced = candidate.slice(0, index).concat(candidate.slice(index + 1));
      if (runTrace(initial, reduced, undefined, options).failure?.code === failureCode) {
        candidate = reduced;
        changed = true;
        break;
      }
    }
  }
  return candidate;
}

export function seededEvents(seed: number, count = 100): ModelEvent[] {
  let state = seed >>> 0;
  const random = () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const paths = ["a.md", "b.md", "c.md"];
  const events: ModelEvent[] = [];
  for (let index = 0; index < count; index++) {
    const device: DeviceId = random() < 0.5 ? "A" : "B";
    const path = paths[Math.floor(random() * paths.length)];
    const choice = Math.floor(random() * 14);
    if (choice === 0) events.push({ type: "local-write", device, path, content: `${device}-${index}`, watcher: random() < 0.2 ? "lost" : "delivered" });
    else if (choice === 1) events.push({ type: "local-delete", device, path, watcher: random() < 0.2 ? "lost" : "delivered" });
    else if (choice === 2) events.push({ type: "external-remote-create", id: `seed-${seed}-r-${index}`, path, content: `R-${index}` });
    else if (choice === 3) events.push({ type: "start-reconcile", device });
    else if (choice === 4) events.push({ type: "advance", device });
    else if (choice === 5) events.push({ type: "dispatch", device });
    else if (choice === 6) events.push({ type: random() < 0.5 ? "transport-success" : "transport-lost", device });
    else if (choice === 7) events.push({ type: "crash", device });
    else if (choice === 8) events.push({ type: "restart", device });
    else if (choice === 9) events.push({ type: "recover", device });
    else if (choice === 10) events.push({ type: "network", device, state: ["online", "offline", "rate-limited", "auth-lost"][Math.floor(random() * 4)] as NetworkState });
    else if (choice === 11) events.push({ type: "integrity-reconcile", device, path });
    else if (choice === 12) events.push({ type: "ingest-page", device, batchId: `seed-${seed}-b-${index}`, requestedCursor: index, entries: [`${path}:${index}`], terminalCursor: random() < 0.4 ? index + 1 : undefined });
    else events.push({ type: "cancel-request", device, delivered: random() < 0.5 });
  }
  return events;
}
