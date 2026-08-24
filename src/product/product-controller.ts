import type {
  AuditRecord, CheckpointId, ConflictAssessment, ConflictId, ConflictResolution, ConflictResolver,
  DeviceIdentity, PathSnapshot, PlannedOperation, ProductControlPort, ProductSurfaceState,
  StateLoadContext, SynchronizationPlan, SynchronizationPlanner, SynchronizationStateStore,
  SynchronizationStatus, UserAction, UserActionResult, VaultIdentity, VaultPath, VersionReference,
} from "../contracts";
import { contractId } from "../contracts";
import { StateCommitCoordinator } from "../core/commit-coordinator";
import { CrashSafeExecutionCoordinator } from "../core/execution-coordinator";
import { CoreRunCoordinator, type RunLeasePort } from "../core/run-coordinator";
import { createInitialTrustedState } from "../state/persistent-state-store";
import { BoundedAuditHistory } from "./audit-history";
import { ProductSnapshotAssembler, SnapshotAssemblyError, type AssembledPlanningInput } from "./snapshot-assembler";
import { ProductSynchronizationExecutor, type ExecutorRunEvidence } from "./production-executor";

export type PlannerFactory = (trigger: SynchronizationPlan["trigger"]) => SynchronizationPlanner;
export interface AutomaticExecutionDecision { readonly allowed: boolean; readonly reason?: string; }
export interface ProductControllerOptions {
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly stateContext: StateLoadContext;
  readonly stateStore: SynchronizationStateStore;
  readonly snapshotAssembler: ProductSnapshotAssembler;
  readonly executor: ProductSynchronizationExecutor;
  readonly conflictResolver: ConflictResolver;
  readonly plannerForTrigger: PlannerFactory;
  readonly leasePort: RunLeasePort;
  readonly audit: BoundedAuditHistory;
  readonly holderId: string;
  readonly automaticExecutionAllowed?: (plan: SynchronizationPlan) => AutomaticExecutionDecision;
  readonly onTrustedBaselineEstablished?: () => Promise<void>;
}
interface PlannedRun { readonly plan: SynchronizationPlan; readonly assembly: AssembledPlanningInput; readonly checkpointId?: CheckpointId; readonly reviewed: boolean; }

const cid = <T extends string>(value: string) => contractId<T>(value);
const auditId = () => globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random()}`;
function observedVersion(snapshot: PathSnapshot, side: "local" | "remote"): VersionReference | undefined {
  const v = snapshot[side];
  return v.status === "present" ? { path: v.path, entityKind: v.entityKind, content: v.content, remoteObjectId: v.remoteObjectId, observationToken: v.observationToken } : undefined;
}
function baseVersion(snapshot: PathSnapshot): VersionReference | undefined {
  const v = snapshot.base.status === "trusted" ? snapshot.base.entry : undefined;
  return v ? { path: v.path, entityKind: v.entityKind, content: v.content, remoteObjectId: v.remoteObjectId } : undefined;
}
function assessmentKey(a: ConflictAssessment): ConflictId | undefined {
  if (a.kind === "none") return undefined;
  return a.kind === "clean-merge" ? cid<"ConflictId">(`conflict:clean:${String(a.path)}`) as ConflictId : a.conflictId;
}
function conflictCopyPath(path: VaultPath, id: ConflictId): VaultPath {
  const raw = String(path); const slash = raw.lastIndexOf("/"); const dir = slash >= 0 ? raw.slice(0, slash + 1) : ""; const name = slash >= 0 ? raw.slice(slash + 1) : raw;
  const dot = name.lastIndexOf("."); const stem = dot > 0 ? name.slice(0, dot) : name; const ext = dot > 0 ? name.slice(dot) : "";
  const token = String(id).replace(/[^a-zA-Z0-9]+/g, "-").slice(-20);
  return cid<"VaultPath">(`${dir}${stem} (conflict ${token})${ext}`) as VaultPath;
}

export class IntegratedProductController implements ProductControlPort {
  private surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  private readonly listeners = new Set<(surface: ProductSurfaceState) => void>();
  private readonly runs: CoreRunCoordinator;
  private readonly conflictRegistry = new Map<string, ConflictAssessment>();
  private planned?: PlannedRun;
  private runEvidence?: ExecutorRunEvidence;

  constructor(private readonly options: ProductControllerOptions) { this.runs = new CoreRunCoordinator(options.vaultIdentity, options.deviceIdentity, options.leasePort, options.holderId); }
  currentSurface(): ProductSurfaceState { return this.surface; }
  onSurface(listener: (surface: ProductSurfaceState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  readAuditHistory(): Promise<readonly AuditRecord[]> { return this.options.audit.read(); }
  currentRunEvidence(): ExecutorRunEvidence { if (!this.runEvidence) throw new Error("no active synchronization run evidence"); return this.runEvidence; }
  pendingDestructiveCheckpoint(): CheckpointId | undefined { return this.planned?.checkpointId; }
  async previewManual(): Promise<SynchronizationPlan | undefined> { return this.createPlan("manual", true, true); }
  async previewVerifyReconcile(): Promise<SynchronizationPlan | undefined> { return this.createPlan("verify-reconcile", true, true); }
  noteChangeDuringRun(): void { this.runs.noteLocalOrRemoteChangeDuringRun(); }

  async runAutomatic(trigger: "startup-resume" | "local-change" | "periodic"): Promise<void> {
    const plan = await this.createPlan(trigger, false, false);
    if (!plan || plan.executionDisposition !== "safe-auto-eligible") return;
    const gate = this.options.automaticExecutionAllowed?.(plan) ?? { allowed: true };
    if (!gate.allowed) { this.setStatus({ kind: "offline-deferred", reason: gate.reason ?? "automatic synchronization deferred by device policy" }); return; }
    await this.executePlanned(false);
  }

  async request(action: UserAction): Promise<UserActionResult> {
    switch (action.kind) {
      case "pause": this.runs.pause(); this.setStatus({ kind: "paused" }); return { status: "accepted" };
      case "resume": this.runs.resume(); this.setStatus({ kind: "idle-ready" }); return { status: "accepted" };
      case "cancel-active-sync": this.runs.requestCancellation(); await this.audit("sync-cancelled"); return { status: "accepted" };
      case "verify-reconcile-vault": await this.previewVerifyReconcile(); return { status: "accepted" };
      case "execute-plan":
        if (!this.planned || this.planned.plan.planId !== action.planId) return { status: "rejected", reason: "plan is stale or no longer current" };
        if (!this.planned.reviewed) return { status: "rejected", reason: "manual plan has not been reviewed" };
        if (this.planned.plan.recoveryCheckpointRequired) return { status: "rejected", reason: "destructive plan requires exact checkpoint approval" };
        return await this.executePlanned(true) ? { status: "accepted" } : { status: "rejected", reason: "reviewed plan did not complete authoritatively" };
      case "approve-destructive-plan":
        if (!this.planned || this.planned.plan.planId !== action.planId) return { status: "rejected", reason: "destructive plan is stale" };
        if (!this.planned.checkpointId || this.planned.checkpointId !== action.recoveryCheckpointId) return { status: "rejected", reason: "approval is not tied to the current recovery checkpoint" };
        await this.audit("destructive-plan-approved", { planId: action.planId });
        return await this.executePlanned(true, action.recoveryCheckpointId) ? { status: "accepted" } : { status: "rejected", reason: "approved destructive plan did not complete authoritatively" };
      case "resolve-conflict": return this.resolveConflict(action.conflictId, action.resolution);
    }
  }

  private async createPlan(trigger: SynchronizationPlan["trigger"], full: boolean, reviewed: boolean): Promise<SynchronizationPlan | undefined> {
    if (this.runs.isPaused()) { this.setStatus({ kind: "paused" }); return undefined; }
    this.setStatus({ kind: "planning", trigger });
    try {
      const assembly = full ? await this.options.snapshotAssembler.assembleFull() : await this.options.snapshotAssembler.assemble(true);
      const plan = await this.options.plannerForTrigger(trigger).plan(assembly.input);
      await this.refreshConflicts(plan, assembly);
      let checkpointId: CheckpointId | undefined;
      if (plan.recoveryCheckpointRequired) { const backup = await this.options.stateStore.createRecoveryBackup(); checkpointId = cid<"CheckpointId">(backup.backupId) as CheckpointId; }
      this.planned = { plan, assembly, checkpointId, reviewed };
      await this.audit("plan-created", { planId: plan.planId, count: plan.operations.length });
      this.surface = { ...this.surface, planPreview: plan, conflicts: [...this.conflictRegistry.values()].filter(a => a.kind !== "clean-merge") };
      if (plan.operations.some(o => o.kind === "recovery-required")) this.setStatus({ kind: "recovery-required", reason: "synchronization state or remote relationship requires recovery" });
      else if (this.surface.conflicts.length) this.setStatus({ kind: "conflict-present", conflictCount: this.surface.conflicts.length });
      else if (plan.recoveryCheckpointRequired) this.setStatus({ kind: "destructive-plan-blocked", planId: plan.planId });
      else this.setStatus({ kind: "idle-ready" });
      return plan;
    } catch (error) { this.mapPlanningError(error); return undefined; }
  }

  private async refreshConflicts(plan: SynchronizationPlan, assembly: AssembledPlanningInput): Promise<void> {
    const fresh = new Map<string, ConflictAssessment>();
    for (const operation of plan.operations) {
      if (operation.kind !== "unresolved-conflict" && operation.kind !== "clean-text-merge") continue;
      const snapshot = assembly.input.snapshots.find(s => s.path === operation.path); if (!snapshot) continue;
      const a = await this.options.conflictResolver.assess(snapshot.path, baseVersion(snapshot), observedVersion(snapshot, "local"), observedVersion(snapshot, "remote"));
      const key = assessmentKey(a); if (key) fresh.set(String(key), a);
      if (a.kind !== "none" && a.kind !== "clean-merge") await this.audit("conflict-created", { path: a.path, reasonCode: a.kind });
    }
    this.conflictRegistry.clear(); for (const [key, value] of fresh) this.conflictRegistry.set(key, value);
  }

  private async executePlanned(userInitiated: boolean, approvedCheckpoint?: CheckpointId): Promise<boolean> {
    const planned = this.planned; if (!planned) return false;
    if (!userInitiated && planned.plan.executionDisposition !== "safe-auto-eligible") return false;
    if (planned.plan.executionDisposition === "blocked") return false;
    if (planned.plan.recoveryCheckpointRequired && approvedCheckpoint !== planned.checkpointId) return false;
    const begun = await this.runs.beginRun(); if (begun.status !== "started") { if (begun.status === "paused") this.setStatus({ kind: "paused" }); return false; }
    this.setStatus({ kind: "syncing", planId: planned.plan.planId });
    let completed = false;
    try {
      await this.ensureTrustedState(planned.assembly);
      this.runEvidence = { managedRemote: planned.assembly.managedRemote, remoteEnumerationComplete: planned.assembly.remoteEnumeration.status === "complete" };
      const coordinator = new CrashSafeExecutionCoordinator(this.options.executor, new StateCommitCoordinator(this.options.stateStore, this.options.stateContext));
      let needsReplan = false, allAccounted = true;
      for (const operation of planned.plan.operations) {
        if (!this.runs.canStartNextOperation()) { allAccounted = false; break; }
        if (["unresolved-conflict", "blocked-unsafe", "recovery-required"].includes(operation.kind)) { allAccounted = false; continue; }
        if (operation.destructive && planned.plan.recoveryCheckpointRequired && !approvedCheckpoint) { allAccounted = false; continue; }
        const result = await coordinator.executeOperation(operation);
        if (result.status === "committed") { await this.audit(operation.kind.startsWith("trash-") ? "trash-action" : "operation-completed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path }); continue; }
        allAccounted = false; await this.audit("operation-failed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path, reasonCode: result.status });
        if (result.status === "stale-precondition" || result.status === "stale-state") { needsReplan = true; this.runs.noteLocalOrRemoteChangeDuringRun(); break; }
        if (result.status === "recovery-required" || result.status === "uncertain") { this.setStatus({ kind: "recovery-required", reason: result.reason }); break; }
        if (result.status === "retryable-failure") { this.setStatus({ kind: "offline-deferred", reason: result.reason }); break; }
        if (result.status === "blocked") { this.setStatus({ kind: "error", code: "operation-blocked", message: result.reason }); break; }
      }
      if (allAccounted && !needsReplan) {
        const cursorCommitted = planned.assembly.nextCursor ? await this.commitCursor(planned.assembly.nextCursor) : true;
        if (cursorCommitted) { const trusted = await this.options.stateStore.load(this.options.stateContext); completed = trusted.status === "trusted"; if (completed && planned.reviewed) await this.options.onTrustedBaselineEstablished?.(); }
      }
    } finally {
      this.runEvidence = undefined;
      const finished = await this.runs.finishRun();
      if (finished.reconcileAgain) void this.runAutomatic("local-change"); else if (this.surface.status.kind === "syncing") this.setStatus({ kind: "idle-ready" });
    }
    return completed;
  }

  private async resolveConflict(id: ConflictId, resolution: ConflictResolution): Promise<UserActionResult> {
    const assessment = this.conflictRegistry.get(String(id)), current = this.planned;
    if (!assessment || !current) return { status: "rejected", reason: "conflict is stale or no longer present in the current plan" };
    if (!await this.assessmentStillCurrent(assessment, current.assembly)) { await this.createPlan("manual", true, true); return { status: "rejected", reason: "conflict evidence changed; a fresh plan is required before resolution" }; }
    const operations = await this.resolutionOperations(id, assessment, resolution);
    if (!operations.length) return { status: "rejected", reason: "requested conflict resolution is not applicable to the current preserved versions" };
    const resolutionPlan: SynchronizationPlan = { planId: cid<"PlanId">(`plan:resolve:${String(id)}:${resolution.kind}`), trigger: "manual", operations, executionDisposition: "requires-user-approval", recoveryCheckpointRequired: false };
    this.planned = { plan: resolutionPlan, assembly: { ...current.assembly, nextCursor: undefined }, reviewed: false };
    if (!await this.executePlanned(true)) return { status: "rejected", reason: "conflict resolution did not complete authoritatively" };
    this.conflictRegistry.delete(String(id)); this.surface = { ...this.surface, conflicts: [...this.conflictRegistry.values()].filter(a => a.kind !== "clean-merge") };
    await this.audit("conflict-resolved", { path: assessment.kind === "none" ? undefined : assessment.path, reasonCode: resolution.kind });
    this.setStatus(this.surface.conflicts.length ? { kind: "conflict-present", conflictCount: this.surface.conflicts.length } : { kind: "idle-ready" });
    return { status: "accepted" };
  }

  private async assessmentStillCurrent(a: ConflictAssessment, assembly: AssembledPlanningInput): Promise<boolean> {
    if (a.kind === "none") return false;
    if (a.kind === "clean-merge") return await this.options.executor.versionStillCurrent("local", a.provenance.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", a.provenance.remote.version, assembly.managedRemote);
    if (a.kind === "delete-vs-modify") return this.options.executor.versionStillCurrent(a.modifiedSide, a.modifiedVersion.version, assembly.managedRemote);
    return await this.options.executor.versionStillCurrent("local", a.preserved.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", a.preserved.remote.version, assembly.managedRemote);
  }

  private async resolutionOperations(id: ConflictId, assessment: ConflictAssessment, resolution: ConflictResolution): Promise<readonly PlannedOperation[]> {
    if (assessment.kind === "none") return [];
    const path = assessment.path;
    if (assessment.kind === "clean-merge") {
      if (resolution.kind !== "accept-clean-merge") return [];
      return [{ operationId: cid<"OperationId">(`op:resolve:clean:${String(id)}`), kind: "clean-text-merge", path, remoteObjectId: assessment.mergedVersion.remoteObjectId, contentVersion: assessment.mergedVersion, destructive: false, preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }], reasons: [{ code: "user-accept-clean-merge", summary: "User accepted the materialized clean three-way merge." }] }];
    }
    if (assessment.kind === "delete-vs-modify") {
      const modified = assessment.modifiedVersion.version;
      const keepModified = (assessment.modifiedSide === "local" && resolution.kind === "keep-local") || (assessment.modifiedSide === "remote" && resolution.kind === "keep-remote") || resolution.kind === "keep-both";
      if (keepModified && assessment.modifiedSide === "local") return [{ operationId: cid<"OperationId">(`op:resolve:delete-upload:${String(id)}`), kind: modified.remoteObjectId ? "upload-update" : "upload-create", path, targetSide: "remote", remoteObjectId: modified.remoteObjectId, contentVersion: modified, destructive: false, preconditions: [{ kind: "base-trusted" }, { kind: "file-stable", path: modified.path }], reasons: [{ code: "user-preserve-modified", summary: "User chose to preserve the modified local version." }] }];
      if (keepModified && assessment.modifiedSide === "remote") return [{ operationId: cid<"OperationId">(`op:resolve:delete-download:${String(id)}`), kind: "download-create", path, targetSide: "local", contentVersion: modified, destructive: false, preconditions: [{ kind: "path-observation", side: "local", path, expected: "absent" }], reasons: [{ code: "user-preserve-modified", summary: "User chose to preserve the modified remote version." }] }];
      if (assessment.modifiedSide === "local" && resolution.kind === "keep-remote") return [{ operationId: cid<"OperationId">(`op:resolve:delete:${String(id)}`), kind: "trash-local", path, targetSide: "local", destructive: true, preconditions: [{ kind: "base-trusted" }], reasons: [{ code: "user-keep-deletion", summary: "User chose the remote deletion." }] }];
      if (assessment.modifiedSide === "remote" && resolution.kind === "keep-local") return [{ operationId: cid<"OperationId">(`op:resolve:delete:${String(id)}`), kind: "trash-remote", path, targetSide: "remote", remoteObjectId: modified.remoteObjectId, destructive: true, preconditions: [{ kind: "base-trusted" }], reasons: [{ code: "user-keep-deletion", summary: "User chose the local deletion." }] }];
      return [];
    }
    const local = assessment.preserved.local.version, remote = assessment.preserved.remote.version, remoteId = remote.remoteObjectId;
    if (!remoteId) return [];
    const keepLocal: PlannedOperation = { operationId: cid<"OperationId">(`op:resolve:local:${String(id)}`), kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteId, contentVersion: local, destructive: false, preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...(remote.content ? [{ kind: "content-evidence" as const, side: "remote" as const, path, expected: remote.content }] : []), { kind: "file-stable", path: local.path }], reasons: [{ code: "user-keep-local", summary: "User selected the preserved local version as authoritative." }] };
    if (resolution.kind === "keep-local") return [keepLocal];
    if (resolution.kind === "keep-remote") return [{ operationId: cid<"OperationId">(`op:resolve:remote:${String(id)}`), kind: "download-update", path, targetSide: "local", contentVersion: remote, destructive: false, preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...(local.content ? [{ kind: "content-evidence" as const, side: "local" as const, path, expected: local.content }] : [])], reasons: [{ code: "user-keep-remote", summary: "User selected the preserved remote version as authoritative." }] }];
    if (resolution.kind === "keep-both") return [{ operationId: cid<"OperationId">(`op:resolve:copy:${String(id)}`), kind: "download-create", path: conflictCopyPath(path, id), targetSide: "local", contentVersion: remote, destructive: false, preconditions: [{ kind: "path-observation", side: "local", path: conflictCopyPath(path, id), expected: "absent" }], reasons: [{ code: "user-keep-both-copy", summary: "Preserve the remote alternate as a deterministic local conflict copy." }] }, keepLocal];
    if (resolution.kind === "manual") {
      if (!await this.options.executor.versionStillCurrent("local", resolution.resolvedVersion, this.planned!.assembly.managedRemote)) return [];
      return [{ operationId: cid<"OperationId">(`op:resolve:manual:${String(id)}`), kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteId, contentVersion: resolution.resolvedVersion, destructive: false, preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, { kind: "file-stable", path: resolution.resolvedVersion.path }], reasons: [{ code: "user-manual-resolution", summary: "User supplied a currently observable resolved local version." }] }];
    }
    return [];
  }

  private async ensureTrustedState(assembly: AssembledPlanningInput): Promise<void> {
    if (assembly.input.state.status === "trusted") return;
    if (assembly.input.state.status === "recovery-required") throw new Error("cannot initialize trusted state from recovery-required state");
    const initial = createInitialTrustedState({ stateRevision: cid<"StateRevision">("state:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
    const saved = await this.options.stateStore.saveTrusted(initial); if (saved.status !== "saved") throw new Error(`unable to establish initial trusted state: ${saved.status}`);
  }
  private async commitCursor(cursor: AssembledPlanningInput["nextCursor"]): Promise<boolean> {
    if (!cursor) return true; const loaded = await this.options.stateStore.load(this.options.stateContext); if (loaded.status !== "trusted") return false;
    const current = String(loaded.state.stateRevision), match = /^(.*?)(\d+)$/.exec(current), next = cid<"StateRevision">(match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`);
    const saved = await this.options.stateStore.saveTrusted({ ...loaded.state, stateRevision: next, changeCursor: cursor }, loaded.state.stateRevision);
    if (saved.status !== "saved") { this.setStatus({ kind: "recovery-required", reason: "incremental Drive cursor could not be committed atomically" }); return false; } return true;
  }
  private mapPlanningError(error: unknown): void {
    if (error instanceof SnapshotAssemblyError) {
      if (error.code === "authentication-required") this.setStatus({ kind: "authentication-required", reason: error.message });
      else if (error.code === "transient-failure" || error.code === "rate-limited") this.setStatus({ kind: "offline-deferred", reason: error.message });
      else if (["missing-root", "identity-mismatch", "incompatible-protocol", "ambiguous", "recovery-required", "not-found"].includes(error.code)) this.setStatus({ kind: "recovery-required", reason: error.message });
      else this.setStatus({ kind: "error", code: error.code, message: error.message }); return;
    }
    this.setStatus({ kind: "error", code: "planning-failed", message: error instanceof Error ? error.message : String(error) });
  }
  private setStatus(status: SynchronizationStatus): void { this.surface = { ...this.surface, status }; for (const listener of this.listeners) listener(this.surface); }
  private async audit(event: AuditRecord["event"], values: Partial<Omit<AuditRecord, "id" | "event" | "advisoryAtMs">> = {}): Promise<void> { await this.options.audit.append({ id: auditId(), event, advisoryAtMs: Date.now(), ...values }); }
}
