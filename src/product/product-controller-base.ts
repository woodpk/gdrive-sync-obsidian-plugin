import type {
  AuditRecord,
  AuthoritativeSynchronizationExecutor,
  CheckpointId,
  ConflictAssessment,
  ConflictId,
  ConflictProvenance,
  ConflictResolution,
  ConflictResolver,
  DeviceIdentity,
  ExecutionResult,
  ExecutionResultV1_3,
  OperationPrecondition,
  PathSnapshot,
  PlannedOperation,
  ProductControlPort,
  ProductSurfaceState,
  StateLoadContext,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationPlan,
  PlanGlobalExecutionGate,
  SynchronizationPlanner,
  SynchronizationStatus,
  UserAction,
  UserActionResult,
  VaultIdentity,
  VaultPath,
  VersionReference,
} from "../contracts";
import { contractId, executionDispositionV1_3 } from "../contracts";
import { StateCommitCoordinator } from "../core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator, type ExecutionLifecycleStage } from "../core/execution-coordinator";
import { CoreRunCoordinator, type RunLeasePort } from "../core/run-coordinator";
import { semanticPlanId, withSemanticOperationId } from "../core/semantic-identifiers";
import type { DiagnosticLogger, SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";
import { createInitialTrustedState, PersistentSynchronizationStateStore } from "../state/persistent-state-store";
import { sha256Text } from "../util/sha256";
import { BoundedAuditHistory } from "./audit-history";
import { createAuthoritativeProductExecutorV1_3, type RecoverableProductionMutationDependenciesV1_3 } from "./authoritative-production-executor";
import { ProductSnapshotAssembler, SnapshotAssemblyError, type AssembledPlanningInput } from "./snapshot-assembler";
import { ProductSynchronizationExecutor, type ExecutorRunEvidence } from "./production-executor";
import { dependsOnSkippedOperation } from "./operation-isolation";
import type { SkippedPathAttention, SyncAttentionLedger } from "./sync-attention-ledger";

export type PlannerFactory = (trigger: SynchronizationPlan["trigger"]) => SynchronizationPlanner;
export interface AutomaticExecutionDecision { readonly allowed: boolean; readonly reason?: string; }
export interface ProductControllerOptions {
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly stateContext: StateLoadContext;
  readonly stateStore: PersistentSynchronizationStateStore;
  readonly authorityStore?: SynchronizationAuthorityStoreV1_1;
  readonly snapshotAssembler: ProductSnapshotAssembler;
  readonly executor: ProductSynchronizationExecutor;
  readonly conflictResolver: ConflictResolver;
  readonly plannerForTrigger: PlannerFactory;
  readonly leasePort: RunLeasePort;
  readonly audit: BoundedAuditHistory;
  readonly holderId: string;
  readonly automaticExecutionAllowed?: (plan: SynchronizationPlan) => AutomaticExecutionDecision;
  readonly onTrustedBaselineEstablished?: () => Promise<void>;
  readonly recoveryActive?: () => boolean;
  readonly onRecoveryGateChanged?: (active: boolean, backupId?: string) => Promise<void>;
  readonly onFullReconciliationCompleted?: () => Promise<void>;
  readonly diagnostics?: DiagnosticLogger;
  readonly attentionLedger?: SyncAttentionLedger;
}
interface PlannedRun {
  readonly plan: SynchronizationPlan;
  readonly assembly: AssembledPlanningInput;
  readonly checkpointId?: CheckpointId;
  readonly reviewed: boolean;
  readonly diagnosticRunId?: number;
  attentionPersistenceFailed: boolean;
}
type RunOutcome = "complete" | "partial" | "failed";
type AutomaticTrigger = "startup-resume" | "local-change" | "periodic";

const AUTOMATIC_TRIGGER_PRIORITY: Readonly<Record<AutomaticTrigger, number>> = { periodic: 1, "startup-resume": 2, "local-change": 3 };

const cid = <T extends string>(value: string) => contractId<T>(value);
const auditId = () => globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random()}`;

function observedVersion(snapshot: PathSnapshot, side: "local" | "remote"): VersionReference | undefined {
  const value = snapshot[side];
  return value.status === "present"
    ? { path: value.path, entityKind: value.entityKind, content: value.content, remoteObjectId: value.remoteObjectId, observationToken: value.observationToken }
    : undefined;
}
function baseVersion(snapshot: PathSnapshot): VersionReference | undefined {
  const value = snapshot.base.status === "trusted" ? snapshot.base.entry : undefined;
  return value ? { path: value.path, entityKind: value.entityKind, content: value.content, remoteObjectId: value.remoteObjectId } : undefined;
}
function assessmentKey(assessment: ConflictAssessment): ConflictId | undefined {
  if (assessment.kind === "none") return undefined;
  return assessment.kind === "clean-merge"
    ? cid<"ConflictId">(`conflict:clean:${String(assessment.path)}`) as ConflictId
    : assessment.conflictId;
}
function localExact(version: VersionReference): OperationPrecondition[] {
  const preconditions: OperationPrecondition[] = [{
    kind: "path-observation",
    side: "local",
    path: version.path,
    expected: "present",
    ...(version.observationToken ? { observationToken: String(version.observationToken) } : {}),
  }];
  if (version.content) preconditions.push({ kind: "content-evidence", side: "local", path: version.path, expected: version.content });
  return preconditions;
}
function remoteExact(version: VersionReference): OperationPrecondition[] {
  const preconditions: OperationPrecondition[] = [];
  if (version.remoteObjectId) preconditions.push({
    kind: "remote-object",
    remoteObjectId: version.remoteObjectId,
    ...(version.content?.revision ? { expectedRevision: version.content.revision } : {}),
  });
  if (version.content) preconditions.push({ kind: "content-evidence", side: "remote", path: version.path, expected: version.content });
  return preconditions;
}
function safeToken(value: string | undefined): string {
  return (value ?? "na").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 32);
}
function conflictCopyBase(path: VaultPath, provenance: ConflictProvenance): VaultPath {
  const raw = String(path);
  const slash = raw.lastIndexOf("/");
  const dir = slash >= 0 ? raw.slice(0, slash + 1) : "";
  const name = slash >= 0 ? raw.slice(slash + 1) : raw;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  const identity = provenance.deviceId
    ? `device-${safeToken(String(provenance.deviceId))}`
    : provenance.remoteObjectId
      ? `remote-${safeToken(String(provenance.remoteObjectId))}`
      : "identity-na";
  const version = provenance.version.content?.hash
    ? String(provenance.version.content.hash)
    : provenance.version.content?.revision
      ? `revision-${provenance.version.content.revision}`
      : "version-na";
  const observedAt = provenance.advisoryObservedAtMs ?? provenance.version.content?.advisoryModifiedTimeMs;
  return cid<"VaultPath">(`${dir}${stem} (conflict ${provenance.source} ${identity} at-${observedAt ?? "na"} ${safeToken(version)})${ext}`) as VaultPath;
}
function numbered(path: VaultPath, number: number): VaultPath {
  if (number === 1) return path;
  const raw = String(path);
  const slash = raw.lastIndexOf("/");
  const dot = raw.lastIndexOf(".");
  return cid<"VaultPath">(`${dot > slash ? raw.slice(0, dot) : raw} (${number})${dot > slash ? raw.slice(dot) : ""}`) as VaultPath;
}
function authenticationReason(reason: string): string | undefined {
  const prefix = "authentication-required:";
  return reason.startsWith(prefix) ? reason.slice(prefix.length) || "authorization-required" : undefined;
}
function predecessorExecutionResult(result: ExecutionResultV1_3): ExecutionResult {
  switch (result.status) {
    case "durable-verified-success":
    case "stale-precondition":
    case "recovery-required":
    case "uncertain":
    case "cancelled":
      return result;
    case "authentication-required":
    case "blocking-failure":
      return { status: "blocking-failure", reason: result.reason };
    case "retryable-failure":
      return { status: "retryable-failure", reason: result.reason };
  }
}

function globalExecutionGate(plan: SynchronizationPlan): PlanGlobalExecutionGate { return plan.globalExecutionGate; }

function attentionOperations(plan: SynchronizationPlan): readonly PlannedOperation[] {
  return plan.operations.filter(operation => operation.kind === "blocked-unsafe" || operation.kind === "unresolved-conflict");
}

function planDiagnosticFields(plan: SynchronizationPlan, assembly: AssembledPlanningInput): SafeDiagnosticFields {
  const operations = plan.operations;
  const count = (predicate: (operation: PlannedOperation) => boolean) => operations.filter(predicate).length;
  return {
    trigger: plan.trigger,
    runMode: assembly.mode,
    planDisposition: plan.executionDisposition,
    stateStatus: assembly.input.state.status,
    classification: assembly.reconstruction ? "recovery" : assembly.input.state.status === "uninitialized" ? "first-sync" : "normal",
    snapshotCount: assembly.input.snapshots.length,
    localCount: assembly.input.snapshots.filter(snapshot => snapshot.local.status === "present").length,
    remoteCount: assembly.input.snapshots.filter(snapshot => snapshot.remote.status === "present").length,
    operationCount: operations.length,
    conflictCount: count(operation => operation.kind === "unresolved-conflict"),
    blockedCount: count(operation => operation.kind === "blocked-unsafe" || operation.kind === "recovery-required"),
    attentionCount: count(operation => operation.kind === "blocked-unsafe" || operation.kind === "unresolved-conflict"),
    destructiveCount: count(operation => operation.destructive),
    uploadCount: count(operation => operation.kind.startsWith("upload-")),
    downloadCount: count(operation => operation.kind.startsWith("download-")),
    moveCount: count(operation => operation.kind === "identity-preserving-move"),
    trashCount: count(operation => operation.kind.startsWith("trash-")),
    noopCount: count(operation => operation.kind === "noop"),
    remoteCompleteness: assembly.remoteEnumeration.status,
    ...(assembly.localEnumeration ? { localCompleteness: assembly.localEnumeration.status } : {}),
    reviewed: plan.trigger === "manual" || plan.trigger === "verify-reconcile",
    reconstruction: Boolean(assembly.reconstruction),
    cursorPresent: Boolean(assembly.nextCursor),
  };
}

function executionFailureBoundary(stage: ExecutionLifecycleStage): { readonly stage: string; readonly classification: string } | undefined {
  switch (stage) {
    case "operation-precondition-validation-failed": return { stage: "operation-precondition-validation", classification: "operation-precondition-validation-failure" };
    case "pending-journal-failed": return { stage: "pending-journal", classification: "pending-journal-failure" };
    case "pending-journal-discard-failed": return { stage: "pending-journal-discard", classification: "pending-journal-discard-failure" };
    case "content-mutation-failed": return { stage: "content-mutation", classification: "content-mutation-failure" };
    case "uncertain-state-journal-failed": return { stage: "uncertain-state-journal", classification: "uncertain-state-journal-failure" };
    case "state-commit-failed": return { stage: "state-commit", classification: "state-commit-failure" };
    default: return undefined;
  }
}

export class IntegratedProductController implements ProductControlPort {
  private surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  private readonly listeners = new Set<(surface: ProductSurfaceState) => void>();
  private readonly runs: CoreRunCoordinator;
  private readonly conflictRegistry = new Map<string, ConflictAssessment>();
  private planned?: PlannedRun;
  private runEvidence?: ExecutorRunEvidence;
  private pendingAutomaticTrigger?: AutomaticTrigger;
  private automaticDrain?: Promise<void>;

  constructor(private readonly options: ProductControllerOptions) {
    this.runs = new CoreRunCoordinator(options.vaultIdentity, options.deviceIdentity, options.leasePort, options.holderId);
  }

  currentSurface(): ProductSurfaceState { return this.surface; }
  onSurface(listener: (surface: ProductSurfaceState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  readAuditHistory(): Promise<readonly AuditRecord[]> { return this.options.audit.read(); }
  currentRunEvidence(): ExecutorRunEvidence { if (!this.runEvidence) throw new Error("no active synchronization run evidence"); return this.runEvidence; }
  pendingDestructiveCheckpoint(): CheckpointId | undefined { return this.planned?.checkpointId; }
  async previewManual(runId = this.options.diagnostics?.beginSyncRun("controller")): Promise<SynchronizationPlan | undefined> {
    this.syncInfo(runId, "manual-sync-request-enter", { operation: "preview-manual", trigger: "manual" });
    return this.createPlan("manual", true, true, runId);
  }
  async previewVerifyReconcile(): Promise<SynchronizationPlan | undefined> { return this.createPlan("verify-reconcile", true, true); }
  noteChangeDuringRun(): void { this.runs.noteLocalOrRemoteChangeDuringRun(); }
  recordPreviewPresented(planId: SynchronizationPlan["planId"], diagnosticRunId?: number): void {
    const planned = this.planned;
    if (planned?.plan.planId === planId) this.syncInfo(diagnosticRunId, "plan-preview-presented", { stage: "preview-presented", ...planDiagnosticFields(planned.plan, planned.assembly) });
  }
  recordPreviewPresentationFailure(_planId: SynchronizationPlan["planId"], error: unknown, diagnosticRunId?: number): void {
    this.syncFailure(diagnosticRunId, "sync-run-failed", error, { stage: "preview-presentation", classification: "preview-presentation-failure", result: "failed" });
    this.endDiagnosticRun(diagnosticRunId);
  }
  recordExecuteClick(planId: SynchronizationPlan["planId"], diagnosticRunId?: number): void {
    const planned = this.planned;
    this.syncInfo(diagnosticRunId, "execute-click-handler-enter", { stage: "execute-click", ...(planned?.plan.planId === planId ? { operationCount: planned.plan.operations.length } : {}) });
  }
  recordPreviewDismissed(_planId: SynchronizationPlan["planId"], diagnosticRunId?: number): void {
    if (diagnosticRunId === undefined) return;
    this.syncInfo(diagnosticRunId, "sync-run-cancelled", { stage: "preview-dismissed", result: "cancelled" });
    this.endDiagnosticRun(diagnosticRunId);
  }

  runAutomatic(trigger: AutomaticTrigger): Promise<void> {
    this.queueAutomaticTrigger(trigger);
    const drain = this.automaticDrain ?? this.startAutomaticDrain();
    return this.awaitAutomaticQuiescence(drain);
  }

  private queueAutomaticTrigger(trigger: AutomaticTrigger): void {
    if (!this.pendingAutomaticTrigger || AUTOMATIC_TRIGGER_PRIORITY[trigger] > AUTOMATIC_TRIGGER_PRIORITY[this.pendingAutomaticTrigger]) this.pendingAutomaticTrigger = trigger;
  }

  private startAutomaticDrain(): Promise<void> {
    const drain = Promise.resolve().then(() => this.drainAutomaticRuns());
    this.automaticDrain = drain;
    void drain.finally(() => {
      if (this.automaticDrain !== drain) return;
      this.automaticDrain = undefined;
      if (this.pendingAutomaticTrigger) this.startAutomaticDrain();
    }).catch(() => undefined);
    return drain;
  }

  private async awaitAutomaticQuiescence(initial: Promise<void>): Promise<void> {
    let drain: Promise<void> | undefined = initial;
    while (drain) {
      await drain;
      drain = this.automaticDrain;
    }
  }

  private async drainAutomaticRuns(): Promise<void> {
    while (this.pendingAutomaticTrigger) {
      const trigger = this.pendingAutomaticTrigger;
      this.pendingAutomaticTrigger = undefined;
      await this.runAutomaticLifecycle(trigger);
    }
  }

  private async runAutomaticLifecycle(trigger: AutomaticTrigger): Promise<void> {
    const runId = this.options.diagnostics?.beginSyncRun(`automatic:${trigger}`);
    this.syncInfo(runId, "automatic-sync-attempt-started", { trigger, stage: "automatic-entry" });
    if (this.options.recoveryActive?.()) {
      this.setStatus({ kind: "recovery-required", reason: "recovery reconstruction is incomplete" });
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "automatic-precondition", trigger, result: "globally-blocked", classification: "recovery-active" });
      this.endDiagnosticRun(runId);
      return;
    }
    const plan = await this.createPlan(trigger, false, false, runId);
    if (!plan) return;
    const planned = this.planned;
    if (!planned || planned.plan.planId !== plan.planId) {
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "execution-authority", trigger, result: "globally-blocked", classification: "automatic-plan-not-current" });
      this.endDiagnosticRun(runId);
      return;
    }
    if (planned.assembly.reconstruction || globalExecutionGate(plan) !== "none") {
      this.syncInfo(runId, "sync-run-globally-blocked", { stage: "execution-authority", trigger, result: "globally-blocked", classification: globalExecutionGate(plan) });
      this.endDiagnosticRun(runId);
      return;
    }
    const gate = this.options.automaticExecutionAllowed?.(plan) ?? { allowed: true };
    if (!gate.allowed) {
      this.setStatus({ kind: "offline-deferred", reason: gate.reason ?? "automatic synchronization deferred by device policy" });
      this.syncInfo(runId, "sync-run-deferred", { stage: "automatic-policy", trigger, result: "deferred" });
      this.endDiagnosticRun(runId);
      return;
    }
    await this.executePlanned(false, undefined, runId, planned);
  }

  async request(action: UserAction): Promise<UserActionResult> { return this.requestWithDiagnosticRun(action); }
  async requestPreviewAction(
    action: Extract<UserAction, { readonly kind: "execute-plan" | "approve-destructive-plan" }>,
    diagnosticRunId?: number,
  ): Promise<UserActionResult> { return this.requestWithDiagnosticRun(action, diagnosticRunId); }

  private async requestWithDiagnosticRun(action: UserAction, diagnosticRunId?: number): Promise<UserActionResult> {
    switch (action.kind) {
      case "pause":
        this.runs.pause(); this.setStatus({ kind: "paused" }); return { status: "accepted" };
      case "resume":
        this.runs.resume();
        this.setStatus(this.options.recoveryActive?.() ? { kind: "recovery-required", reason: "recovery reconstruction is incomplete" } : { kind: "idle-ready" });
        return { status: "accepted" };
      case "cancel-active-sync":
        this.runs.requestCancellation(); await this.audit("sync-cancelled"); return { status: "accepted" };
      case "verify-reconcile-vault":
        await this.previewVerifyReconcile(); return { status: "accepted" };
      case "execute-plan": {
        const runId = diagnosticRunId ?? this.planned?.diagnosticRunId;
        if (!this.planned || this.planned.plan.planId !== action.planId) return this.rejectExecute("plan is stale or no longer current", "stale-plan", runId);
        if (!this.planned.reviewed) return this.rejectExecute("manual plan has not been reviewed", "unreviewed-plan", runId);
        if (this.planned.plan.recoveryCheckpointRequired) return this.rejectExecute("destructive plan requires exact checkpoint approval", "checkpoint-approval-required", runId);
        const outcome = await this.executePlanned(true, undefined, runId);
        return outcome !== "failed" ? { status: "accepted" } : this.rejectExecute("reviewed plan failed before safe progress could complete", "execution-failed", runId);
      }
      case "approve-destructive-plan": {
        const runId = diagnosticRunId ?? this.planned?.diagnosticRunId;
        if (!this.planned || this.planned.plan.planId !== action.planId) return this.rejectExecute("destructive plan is stale", "stale-destructive-plan", runId);
        if (!this.planned.checkpointId || this.planned.checkpointId !== action.recoveryCheckpointId) return this.rejectExecute("approval is not tied to the current recovery checkpoint", "checkpoint-mismatch", runId);
        await this.audit("destructive-plan-approved", { planId: action.planId });
        const outcome = await this.executePlanned(true, action.recoveryCheckpointId, runId);
        return outcome !== "failed" ? { status: "accepted" } : this.rejectExecute("approved destructive plan failed", "execution-failed", runId);
      }
      case "resolve-conflict":
        return this.resolveConflict(action.conflictId, action.resolution);
    }
  }

  async resolveWithCurrentLocal(id: ConflictId): Promise<UserActionResult> {
    const assessment = this.conflictRegistry.get(String(id));
    if (!assessment || assessment.kind === "none") return { status: "rejected", reason: "conflict is stale or unavailable" };
    const version = await this.options.executor.currentLocalVersion(assessment.path);
    if (!version || version.entityKind !== "file") return { status: "rejected", reason: "a stable current local file is required for manual resolution" };
    return this.resolveConflict(id, { kind: "manual", resolvedVersion: version });
  }

  private async createPlan(trigger: SynchronizationPlan["trigger"], full: boolean, reviewed: boolean, diagnosticRunId?: number): Promise<SynchronizationPlan | undefined> {
    if (this.runs.isPaused()) {
      this.setStatus({ kind: "paused" });
      this.syncInfo(diagnosticRunId, "sync-run-deferred", { stage: "planning-precondition", result: "paused" });
      this.endDiagnosticRun(diagnosticRunId);
      return undefined;
    }
    this.setStatus({ kind: "planning", trigger });
    this.syncInfo(diagnosticRunId, "planning-start", { stage: "planning", trigger, runMode: full ? "full" : "incremental-preferred" });
    try {
      let assembly: AssembledPlanningInput;
      if (this.options.recoveryActive?.()) {
        assembly = await this.options.snapshotAssembler.assembleRecovery("persisted recovery gate", diagnosticRunId);
      } else {
        assembly = full ? await this.options.snapshotAssembler.assembleFull(diagnosticRunId) : await this.options.snapshotAssembler.assemble(true, diagnosticRunId);
        if (assembly.input.state.status === "recovery-required") {
          await this.options.onRecoveryGateChanged?.(true);
          await this.audit("recovery-entered", { reasonCode: assembly.input.state.reason });
          assembly = await this.options.snapshotAssembler.assembleRecovery(assembly.input.state.detail ?? assembly.input.state.reason, diagnosticRunId);
        }
      }

      this.syncDebug(diagnosticRunId, "planning-input-assembled", { stage: "planning-input", runMode: assembly.mode, stateStatus: assembly.input.state.status, snapshotCount: assembly.input.snapshots.length, remoteCompleteness: assembly.remoteEnumeration.status, reconstruction: Boolean(assembly.reconstruction), cursorPresent: Boolean(assembly.nextCursor) });
      this.syncTrace(diagnosticRunId, "planner-start", { stage: "planning" });
      const plan = await this.options.plannerForTrigger(trigger).plan(assembly.input);
      this.syncTrace(diagnosticRunId, "planning-complete", { stage: "planning", operationCount: plan.operations.length, planDisposition: plan.executionDisposition, attentionCount: attentionOperations(plan).length });
      await this.refreshConflicts(plan, assembly);
      let checkpointId: CheckpointId | undefined;
      if (plan.recoveryCheckpointRequired && !assembly.reconstruction) {
        const backup = await this.options.stateStore.createRecoveryBackup();
        checkpointId = cid<"CheckpointId">(backup.backupId) as CheckpointId;
      }
      let attentionPersistenceFailed = false;
      if (!await this.recordAttentionEntries(attentionOperations(plan).map(operation => this.attentionFor(operation, plan, diagnosticRunId)))) attentionPersistenceFailed = true;
      this.planned = { plan, assembly, checkpointId, reviewed, diagnosticRunId, attentionPersistenceFailed };
      await this.audit("plan-created", { planId: plan.planId, count: plan.operations.length });
      this.surface = { ...this.surface, planPreview: plan, conflicts: [...this.conflictRegistry.values()].filter(value => value.kind !== "clean-merge") };

      if (assembly.reconstruction) this.setStatus({ kind: "recovery-required", reason: "review and execute this non-destructive reconstruction before recovery can complete" });
      else if (plan.operations.some(operation => operation.kind === "recovery-required")) this.setStatus({ kind: "recovery-required", reason: "synchronization state or remote relationship requires recovery" });
      else if (this.surface.conflicts.length && !plan.operations.some(operation => !["blocked-unsafe", "unresolved-conflict"].includes(operation.kind))) this.setStatus({ kind: "conflict-present", conflictCount: this.surface.conflicts.length });
      else if (plan.recoveryCheckpointRequired) this.setStatus({ kind: "destructive-plan-blocked", planId: plan.planId });
      else if (attentionOperations(plan).length) this.setStatus({ kind: "attention-required", attentionCount: attentionOperations(plan).length, attentionIdentity: await this.attentionIdentityFor(plan, !attentionPersistenceFailed), conflictCount: this.surface.conflicts.length, safeOperationsCommitted: 0, phase: "planned", ledgerAvailable: !attentionPersistenceFailed });
      else this.setStatus({ kind: "idle-ready" });
      this.syncInfo(diagnosticRunId, "plan-preview-preparation-start", { stage: "preview-prepared", ...planDiagnosticFields(plan, assembly) });
      return plan;
    } catch (error) {
      this.mapPlanningError(error);
      if (diagnosticRunId !== undefined) this.options.diagnostics?.syncFailure("sync.plan", "sync-run-failed", diagnosticRunId, error, { stage: "planning", classification: "planning-failure", result: "failed" });
      this.endDiagnosticRun(diagnosticRunId);
      return undefined;
    }
  }

  private async refreshConflicts(plan: SynchronizationPlan, assembly: AssembledPlanningInput): Promise<void> {
    const fresh = new Map<string, ConflictAssessment>();
    for (const operation of plan.operations) {
      if (operation.kind !== "unresolved-conflict" && operation.kind !== "clean-text-merge") continue;
      const snapshot = assembly.input.snapshots.find(candidate => candidate.path === operation.path);
      if (!snapshot) continue;
      const assessment = await this.options.conflictResolver.assess(snapshot.path, baseVersion(snapshot), observedVersion(snapshot, "local"), observedVersion(snapshot, "remote"));
      const key = assessmentKey(assessment);
      if (key) fresh.set(String(key), assessment);
      if (assessment.kind !== "none" && assessment.kind !== "clean-merge") await this.audit("conflict-created", { path: assessment.path, reasonCode: assessment.kind });
    }
    this.conflictRegistry.clear();
    for (const [key, value] of fresh) this.conflictRegistry.set(key, value);
  }

  private async executePlanned(userInitiated: boolean, approvedCheckpoint?: CheckpointId, diagnosticRunId?: number, automaticPlanned?: PlannedRun): Promise<RunOutcome> {
    const planned = automaticPlanned ?? this.planned;
    if (!planned) return "failed";
    if (!userInitiated && globalExecutionGate(planned.plan) !== "none") return "failed";
    if (globalExecutionGate(planned.plan) === "globally-blocked") return "failed";
    if (planned.plan.recoveryCheckpointRequired && approvedCheckpoint !== planned.checkpointId) return "failed";
    const runId = diagnosticRunId ?? planned.diagnosticRunId;
    this.syncInfo(runId, "execution-start", { stage: "execution", operationCount: planned.plan.operations.length, planDisposition: planned.plan.executionDisposition });
    let begun: Awaited<ReturnType<CoreRunCoordinator["beginRun"]>>;
    try { begun = await this.runs.beginRun(); }
    catch (error) {
      this.syncFailure(runId, "sync-run-failed", error, { stage: "run-lease", classification: "run-lease-acquisition-failure", result: "failed" });
      this.endDiagnosticRun(runId);
      throw error;
    }
    if (begun.status !== "started") {
      if (begun.status === "paused") this.setStatus({ kind: "paused" });
      this.syncInfo(runId, "sync-run-deferred", { stage: "run-lease", result: begun.status });
      this.endDiagnosticRun(runId);
      return "failed";
    }

    this.setStatus({ kind: "syncing", planId: planned.plan.planId });
    let outcome: RunOutcome = "failed";
    let anyCommitted = false;
    let partial = false;
    let stageFailureReported = false;
    let committedCount = 0;
    let skippedCount = 0;
    const skippedOperations: PlannedOperation[] = [...attentionOperations(planned.plan)];
    const skippedReasonCodes = new Set<string>();
    try {
      await this.ensureTrustedState(planned.assembly);
      this.runEvidence = { managedRemote: planned.assembly.managedRemote, remoteEnumerationComplete: planned.assembly.remoteEnumeration.status === "complete" };
      const operationIndexes = new Map(planned.plan.operations.map((operation, index) => [String(operation.operationId), index + 1]));
      let needsReplan = false;
      let globalFailure = false;
      const authorityStore = this.options.authorityStore;
      const v1_3Dependencies = (this.options.executor as unknown as { recoverableProductionMutationDependencies?: RecoverableProductionMutationDependenciesV1_3 }).recoverableProductionMutationDependencies;
      const v1_3Capture: { result?: ExecutionResultV1_3 } = {};
      const v1_3Executor = authorityStore && v1_3Dependencies
        ? createAuthoritativeProductExecutorV1_3(this.options.executor, authorityStore, this.options.stateStore, this.options.stateContext, planned.assembly.managedRemote, v1_3Dependencies)
        : undefined;
      const coordinatorExecutor: AuthoritativeSynchronizationExecutor | undefined = v1_3Executor ? {
        validatePreconditions: operation => v1_3Executor.validatePreconditions(operation),
        execute: async operation => {
          const exact = await v1_3Executor.execute(operation);
          v1_3Capture.result = exact;
          return predecessorExecutionResult(exact);
        },
      } : undefined;
      const coordinator = authorityStore && coordinatorExecutor ? new AuthorityCompleteExecutionCoordinator(
        authorityStore,
        coordinatorExecutor,
        new StateCommitCoordinator(this.options.stateStore, this.options.stateContext),
        this.options.stateStore,
        this.options.stateContext,
      ) : undefined;
      if (!coordinator) {
        this.setStatus({ kind: "recovery-required", reason: "V1.3 authoritative synchronization execution dependencies are unavailable; ordinary mutation is disabled" });
        this.syncError(runId, "authority-complete-execution-unavailable", { stage: "execution-authority", classification: "authoritative-store-unavailable", result: "blocked" });
        globalFailure = true;
      }

      for (const operation of planned.plan.operations) {
        if (globalFailure || !coordinator) break;
        if (!this.runs.canStartNextOperation()) { partial = true; break; }
        if (operation.kind === "unresolved-conflict" || operation.kind === "blocked-unsafe") { partial = true; skippedCount += 1; for (const reason of operation.reasons) skippedReasonCodes.add(reason.code); continue; }
        if (operation.kind === "recovery-required") { globalFailure = true; break; }
        if (operation.destructive && planned.plan.recoveryCheckpointRequired && !approvedCheckpoint) { partial = true; continue; }
        if (dependsOnSkippedOperation(operation, skippedOperations)) {
          partial = true; skippedCount += 1; skippedOperations.push(operation); skippedReasonCodes.add("dependency-on-skipped-operation");
          if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "dependency-on-skipped-operation", "Operation depends on a path that was skipped earlier in this plan.")])) planned.attentionPersistenceFailed = true;
          continue;
        }

        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, "operation-start");
        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, "operation-precondition-validation-start");
        delete v1_3Capture.result;
        const result = await coordinator.executeOperation(operation);
        this.recordExecutionStage(runId, operation, operationIndexes.get(String(operation.operationId)) ?? 0, result.status === "committed" ? "operation-complete" : "operation-precondition-validation-failed", result.status);
        if (result.status === "committed") {
          anyCommitted = true;
          committedCount += 1;
          await this.audit(operation.kind.startsWith("trash-") ? "trash-action" : "operation-completed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path });
          if (!await this.resolveAttentionFor(operation)) planned.attentionPersistenceFailed = true;
          continue;
        }
        await this.audit("operation-failed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path, reasonCode: result.status });
        const exactV1_3 = v1_3Capture.result;
        if (exactV1_3 && exactV1_3.status !== "durable-verified-success") {
          const disposition = executionDispositionV1_3(exactV1_3);
          if (disposition.primary === "authentication-required") {
            this.setStatus({ kind: "authentication-required", reason: exactV1_3.reason ?? "authorization-required" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "deferred") {
            this.setStatus({ kind: "offline-deferred", reason: exactV1_3.reason ?? "remote synchronization deferred" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "recovery-required") {
            this.setStatus({ kind: "recovery-required", reason: exactV1_3.reason ?? "physical reconciliation is required" });
            globalFailure = true;
            break;
          }
          if (disposition.primary === "blocking-failure") {
            this.setStatus({ kind: "error", code: "operation-blocked", message: exactV1_3.reason ?? "operation blocked" });
            globalFailure = true;
            break;
          }
        }
        if (result.status === "blocked") {
          const auth = authenticationReason(result.reason);
          if (auth) { this.setStatus({ kind: "authentication-required", reason: auth }); globalFailure = true; break; }
          if (this.options.executor.failureScope(operation, result.reason) === "path") {
            partial = true; skippedCount += 1; skippedOperations.push(operation); skippedReasonCodes.add("runtime-path-blocked");
            if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "runtime-path-blocked", result.reason.replace(/^path-local:/, ""))])) planned.attentionPersistenceFailed = true;
            continue;
          }
        }
        if (result.status === "stale-precondition") {
          partial = true;
          skippedCount += 1;
          skippedOperations.push(operation);
          skippedReasonCodes.add("runtime-stale-precondition");
          if (!await this.recordAttentionEntries([this.attentionFor(operation, planned.plan, runId, "runtime-stale-precondition", result.reason)])) planned.attentionPersistenceFailed = true;
          continue;
        }
        if (result.status === "stale-state") {
          needsReplan = true; globalFailure = true; this.runs.noteLocalOrRemoteChangeDuringRun(); break;
        }
        if (result.status === "recovery-required" || result.status === "uncertain") {
          this.setStatus({ kind: "recovery-required", reason: result.reason }); globalFailure = true; break;
        }
        if (result.status === "retryable-failure") {
          this.setStatus({ kind: "offline-deferred", reason: result.reason }); globalFailure = true; break;
        }
        if (result.status === "blocked") {
          this.setStatus({ kind: "error", code: "operation-blocked", message: result.reason }); globalFailure = true; break;
        }
        partial = true; break;
      }

      if (!globalFailure && !needsReplan && !partial) {
        const cursorCommitted = planned.assembly.nextCursor ? await this.commitCursor(planned.assembly.nextCursor) : true;
        if (cursorCommitted) {
          const trusted = await this.options.stateStore.load(this.options.stateContext);
          if (trusted.status === "trusted") {
            outcome = "complete";
            const completeReviewedRecovery = Boolean(planned.assembly.reconstruction && planned.reviewed && planned.assembly.nextCursor);
            if (completeReviewedRecovery) {
              await this.options.onRecoveryGateChanged?.(false);
              await this.audit("recovery-completed");
            }
            if (planned.assembly.mode === "full" && planned.assembly.nextCursor) await this.options.onFullReconciliationCompleted?.();
            if (planned.reviewed) await this.options.onTrustedBaselineEstablished?.();
          }
        }
      } else if (!globalFailure && (partial || anyCommitted)) {
        outcome = "partial";
        const conflicts = this.surface.conflicts.length;
        const attentionCount = Math.max(skippedCount, attentionOperations(planned.plan).length);
        if (planned.assembly.reconstruction || this.options.recoveryActive?.()) this.setStatus({ kind: "recovery-required", reason: "reconstruction remains incomplete; destructive authority remains disabled" });
        else this.setStatus({ kind: "attention-required", attentionCount: attentionCount || 1, attentionIdentity: await this.attentionIdentityFor(planned.plan, !planned.attentionPersistenceFailed), conflictCount: conflicts, safeOperationsCommitted: committedCount, phase: "completed", ledgerAvailable: !planned.attentionPersistenceFailed });
      } else if (!globalFailure && planned.attentionPersistenceFailed) {
        this.setStatus({ kind: "attention-required", attentionCount: 0, attentionIdentity: await this.attentionIdentityFor(planned.plan, false), conflictCount: 0, safeOperationsCommitted: committedCount, phase: "completed", ledgerAvailable: false });
      }
    } catch (error) {
      if (!stageFailureReported) this.syncFailure(runId, "sync-run-failed", error, { stage: "execution", classification: "execution-failure", result: "failed" });
      throw error;
    } finally {
      const cancelled = this.runs.isCancellationRequested();
      this.runEvidence = undefined;
      try {
        const finished = await this.runs.finishRun();
        if (finished.reconcileAgain && !this.options.recoveryActive?.()) void this.runAutomatic("local-change");
        else if (this.surface.status.kind === "syncing") this.setStatus(this.options.recoveryActive?.() ? { kind: "recovery-required", reason: "recovery reconstruction is incomplete" } : { kind: "idle-ready" });
      } catch (error) {
        this.syncFailure(runId, "sync-run-failed", error, { stage: "run-lease-release", classification: "run-lease-release-failure", result: "failed" });
        throw error;
      } finally {
        this.syncInfo(runId, cancelled ? "sync-run-cancelled" : outcome === "failed" ? "sync-run-failed" : "sync-run-complete", { stage: "terminal", result: cancelled ? "cancelled" : outcome, safeCommittedCount: committedCount, skippedCount, attentionReasonCodes: [...skippedReasonCodes].sort().join(","), ...planDiagnosticFields(planned.plan, planned.assembly) });
        this.endDiagnosticRun(runId);
      }
    }
    return outcome;
  }

  private async resolveConflict(id: ConflictId, resolution: ConflictResolution): Promise<UserActionResult> {
    const assessment = this.conflictRegistry.get(String(id));
    const current = this.planned;
    if (!assessment || assessment.kind === "none" || !current) return { status: "rejected", reason: "conflict is stale or no longer present in the current plan" };
    if (!await this.assessmentStillCurrent(assessment, current.assembly)) {
      await this.createPlan("manual", true, true);
      return { status: "rejected", reason: "conflict evidence changed; a fresh plan is required before resolution" };
    }
    const operations = await this.resolutionOperations(id, assessment, resolution);
    if (!operations.length) return { status: "rejected", reason: "requested conflict resolution is not applicable to the current preserved versions" };
    const executionDisposition = "requires-user-approval" as const;
    const recoveryCheckpointRequired = false;
    const resolutionPlan: SynchronizationPlan = {
      planId: semanticPlanId({ trigger: "manual", operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: "none" }),
      trigger: "manual", operations, executionDisposition, recoveryCheckpointRequired, globalExecutionGate: "none",
    };
    const resolutionAssembly: AssembledPlanningInput = { ...current.assembly, nextCursor: undefined, reconstruction: false };
    this.planned = { plan: resolutionPlan, assembly: resolutionAssembly, reviewed: false, attentionPersistenceFailed: false };
    if (await this.executePlanned(true) !== "complete") return { status: "rejected", reason: "conflict resolution did not complete authoritatively" };
    this.conflictRegistry.delete(String(id));
    this.surface = { ...this.surface, conflicts: [...this.conflictRegistry.values()].filter(value => value.kind !== "clean-merge") };
    await this.audit("conflict-resolved", { path: assessment.path, reasonCode: resolution.kind });
    if (this.options.recoveryActive?.()) this.setStatus({ kind: "recovery-required", reason: "conflict resolution was preserved; run a fresh reviewed Verify/Reconcile before recovery can complete" });
    else {
      const currentAttention = await this.options.attentionLedger?.current() ?? [];
      this.setStatus(currentAttention.length
        ? { kind: "attention-required", attentionCount: currentAttention.length, attentionIdentity: await this.attentionIdentityFor(current.plan), conflictCount: this.surface.conflicts.length, safeOperationsCommitted: operations.length, phase: "completed", ledgerAvailable: true }
        : this.surface.conflicts.length ? { kind: "conflict-present", conflictCount: this.surface.conflicts.length } : { kind: "idle-ready" });
    }
    return { status: "accepted" };
  }

  private async assessmentStillCurrent(assessment: Exclude<ConflictAssessment, { kind: "none" }>, assembly: AssembledPlanningInput): Promise<boolean> {
    if (assessment.kind === "clean-merge") return await this.options.executor.versionStillCurrent("local", assessment.provenance.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", assessment.provenance.remote.version, assembly.managedRemote);
    if (assessment.kind === "delete-vs-modify") return this.options.executor.versionStillCurrent(assessment.modifiedSide, assessment.modifiedVersion.version, assembly.managedRemote);
    return await this.options.executor.versionStillCurrent("local", assessment.preserved.local.version, assembly.managedRemote) && await this.options.executor.versionStillCurrent("remote", assessment.preserved.remote.version, assembly.managedRemote);
  }

  private operation(index: number, intent: Omit<PlannedOperation, "operationId">): PlannedOperation { return withSemanticOperationId(intent, index); }

  private async freeConflictPath(path: VaultPath, provenance: ConflictProvenance): Promise<VaultPath> {
    const base = conflictCopyBase(path, provenance);
    for (let number = 1; number <= 999; number += 1) {
      const candidate = numbered(base, number);
      const state = await this.options.executor.localPathState(candidate);
      if (state === "absent") return candidate;
      if (state === "blocked") throw new Error(`conflict copy path cannot be safely inspected: ${String(candidate)}`);
    }
    throw new Error("unable to allocate a collision-free conflict-copy path");
  }

  private async resolutionOperations(_id: ConflictId, assessment: Exclude<ConflictAssessment, { kind: "none" }>, resolution: ConflictResolution): Promise<readonly PlannedOperation[]> {
    const path = assessment.path;
    if (assessment.kind === "clean-merge") {
      if (resolution.kind !== "accept-clean-merge") return [];
      const remote = assessment.provenance.remote.version;
      return [this.operation(0, {
        kind: "clean-text-merge", path, remoteObjectId: remote.remoteObjectId, contentVersion: assessment.mergedVersion,
        destructive: false,
        preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...localExact(assessment.provenance.local.version), ...remoteExact(remote)],
        reasons: [{ code: "user-accept-clean-merge", summary: "User accepted the exact materialized clean merge." }],
      })];
    }
    if (assessment.kind === "delete-vs-modify") {
      const modified = assessment.modifiedVersion.version;
      if (assessment.modifiedSide === "local" && (resolution.kind === "keep-local" || resolution.kind === "keep-both" || resolution.kind === "manual")) {
        const chosen = resolution.kind === "manual" ? resolution.resolvedVersion : modified;
        return [this.operation(0, {
          kind: "upload-create", path, targetSide: "remote", contentVersion: chosen, destructive: false,
          preconditions: [{ kind: "path-observation", side: "remote", path, expected: "absent" }, ...localExact(chosen), { kind: "file-stable", path: chosen.path }],
          reasons: [{ code: "user-preserve-modified", summary: "Preserve the exact local modified version over the deletion." }],
        })];
      }
      if (assessment.modifiedSide === "remote" && (resolution.kind === "keep-remote" || resolution.kind === "keep-both")) return [this.operation(0, {
        kind: "download-create", path, targetSide: "local", contentVersion: modified, remoteObjectId: modified.remoteObjectId, destructive: false,
        preconditions: [{ kind: "path-observation", side: "local", path, expected: "absent" }, ...remoteExact(modified)],
        reasons: [{ code: "user-preserve-modified", summary: "Preserve the exact remote modified version over the deletion." }],
      })];
      if (assessment.modifiedSide === "local" && resolution.kind === "keep-remote") return [this.operation(0, {
        kind: "trash-local", path, targetSide: "local", destructive: true,
        preconditions: [{ kind: "base-trusted" }, ...localExact(modified)],
        reasons: [{ code: "user-keep-deletion", summary: "User chose the remote deletion after exact-version revalidation." }],
      })];
      if (assessment.modifiedSide === "remote" && resolution.kind === "keep-local") return [this.operation(0, {
        kind: "trash-remote", path, targetSide: "remote", remoteObjectId: modified.remoteObjectId, destructive: true,
        preconditions: [{ kind: "base-trusted" }, ...remoteExact(modified)],
        reasons: [{ code: "user-keep-deletion", summary: "User chose the local deletion after exact-version revalidation." }],
      })];
      return [];
    }

    const local = assessment.preserved.local.version;
    const remote = assessment.preserved.remote.version;
    const remoteId = remote.remoteObjectId;
    if (!remoteId) return [];
    const keepLocal = this.operation(1, {
      kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteId, contentVersion: local, destructive: false,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...localExact(local), ...remoteExact(remote), { kind: "file-stable", path: local.path }],
      reasons: [{ code: "user-keep-local", summary: "User selected the exact preserved local version." }],
    });
    if (resolution.kind === "keep-local") return [keepLocal];
    if (resolution.kind === "keep-remote") return [this.operation(0, {
      kind: "download-update", path, targetSide: "local", remoteObjectId: remoteId, contentVersion: remote, destructive: false,
      preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...localExact(local), ...remoteExact(remote)],
      reasons: [{ code: "user-keep-remote", summary: "User selected the exact preserved remote version." }],
    })];
    if (resolution.kind === "keep-both") {
      const copy = await this.freeConflictPath(path, assessment.preserved.remote);
      return [this.operation(0, {
        kind: "download-create", path: copy, targetSide: "local", remoteObjectId: remoteId, contentVersion: remote, destructive: false,
        preconditions: [{ kind: "path-observation", side: "local", path: copy, expected: "absent" }, ...remoteExact(remote)],
        reasons: [{ code: "user-keep-both-copy", summary: "Preserve the attributable remote alternate without overwriting an existing conflict copy." }],
      }), keepLocal];
    }
    if (resolution.kind === "manual") {
      if (!await this.options.executor.versionStillCurrent("local", resolution.resolvedVersion, this.planned!.assembly.managedRemote)) return [];
      return [this.operation(0, {
        kind: "upload-update", path, targetSide: "remote", remoteObjectId: remoteId, contentVersion: resolution.resolvedVersion, destructive: false,
        preconditions: [{ kind: "base-trusted" }, { kind: "identity-unambiguous", path }, ...localExact(resolution.resolvedVersion), ...remoteExact(remote), { kind: "file-stable", path: resolution.resolvedVersion.path }],
        reasons: [{ code: "user-manual-resolution", summary: "Use the exact current local file as manual resolution." }],
      })];
    }
    return [];
  }

  private async ensureTrustedState(assembly: AssembledPlanningInput): Promise<void> {
    const persisted = await this.options.stateStore.load(this.options.stateContext);
    if (persisted.status === "trusted") return;

    if (assembly.reconstruction) {
      if (persisted.status !== "recovery-required") throw new Error("recovery replacement requires an objectively recovery-required source");
      const initial = createInitialTrustedState({ stateRevision: cid<"StateRevision">("state:recovery:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
      const replaced = await this.options.stateStore.replaceRecoveryState(initial, this.options.stateContext);
      if (replaced.status !== "replaced") throw new Error(`recovery state replacement refused: ${replaced.reason}`);
      await this.options.onRecoveryGateChanged?.(true, replaced.backup.backupId);
      await this.audit("recovery-entered", { reasonCode: assembly.recoveryReason ?? persisted.reason });
      return;
    }

    if (persisted.status === "recovery-required") throw new Error("cannot initialize trusted state while persisted state requires recovery");
    const initial = createInitialTrustedState({ stateRevision: cid<"StateRevision">("state:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
    const saved = await this.options.stateStore.saveTrusted(initial);
    if (saved.status !== "saved") throw new Error(`unable to establish initial trusted state: ${saved.status}`);
  }

  private async commitCursor(cursor: AssembledPlanningInput["nextCursor"]): Promise<boolean> {
    if (!cursor) return true;
    const loaded = await this.options.stateStore.load(this.options.stateContext);
    if (loaded.status !== "trusted") return false;
    const current = String(loaded.state.stateRevision);
    const match = /^(.*?)(\d+)$/.exec(current);
    const next = cid<"StateRevision">(match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`);
    const saved = await this.options.stateStore.saveTrusted({ ...loaded.state, stateRevision: next, changeCursor: cursor }, loaded.state.stateRevision);
    if (saved.status !== "saved") {
      this.setStatus({ kind: "recovery-required", reason: "incremental Drive cursor could not be committed atomically" });
      return false;
    }
    return true;
  }

  private mapPlanningError(error: unknown): void {
    if (error instanceof SnapshotAssemblyError) {
      if (error.code === "authentication-required") this.setStatus({ kind: "authentication-required", reason: error.message });
      else if (error.code === "transient-failure" || error.code === "rate-limited") this.setStatus({ kind: "offline-deferred", reason: error.message });
      else if (["missing-root", "identity-mismatch", "incompatible-protocol", "ambiguous", "recovery-required", "not-found"].includes(error.code)) this.setStatus({ kind: "recovery-required", reason: error.message });
      else this.setStatus({ kind: "error", code: error.code, message: error.message });
      return;
    }
    this.setStatus({ kind: "error", code: "planning-failed", message: error instanceof Error ? error.message : String(error) });
  }
  private recordExecutionStage(runId: number | undefined, operation: PlannedOperation, operationIndex: number, stage: ExecutionLifecycleStage, result?: string, error?: unknown, failedPreconditions?: readonly OperationPrecondition[]): boolean {
    const failure = executionFailureBoundary(stage);
    const failedFields: SafeDiagnosticFields = failedPreconditions?.length ? {
      failedPreconditionCount: failedPreconditions.length,
      failedPreconditionKinds: [...new Set(failedPreconditions.map(precondition => precondition.kind))].sort().join(","),
      failedPreconditionSides: [...new Set(failedPreconditions.map(precondition => {
        if ("side" in precondition) return precondition.side;
        if (precondition.kind === "file-stable") return "local";
        if (precondition.kind === "remote-object" || precondition.kind === "remote-enumeration-complete") return "remote";
        if (precondition.kind === "base-trusted" || precondition.kind === "base-authority") return "state";
        return "identity";
      }))].sort().join(","),
    } : {};
    this.syncTrace(runId, stage, {
      stage,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      preconditionCount: operation.preconditions.length,
      destructiveCount: operation.destructive ? 1 : 0,
      ...failedFields,
      ...(result ? { result } : {}),
    });
    if (!failure) return false;
    const fields: SafeDiagnosticFields = {
      stage: failure.stage,
      classification: failure.classification,
      operationIndex,
      operationKind: operation.kind,
      direction: operation.kind.startsWith("upload-") ? "local-to-remote" : operation.kind.startsWith("download-") ? "remote-to-local" : operation.targetSide ?? "none",
      ...failedFields,
      ...(result ? { result } : {}),
    };
    if (error !== undefined) this.syncFailure(runId, stage, error, fields);
    else this.syncError(runId, stage, fields);
    return true;
  }
  private attentionFor(operation: PlannedOperation, plan: SynchronizationPlan, runId?: number, reasonCode?: string, humanReason?: string): SkippedPathAttention {
    const reason = operation.reasons[0];
    return {
      runId,
      trigger: plan.trigger,
      path: operation.path,
      category: operation.kind,
      reasonCode: reasonCode ?? reason?.code ?? operation.kind,
      humanReason: humanReason ?? reason?.summary ?? "The operation could not be safely executed for this path.",
    };
  }
  private async attentionIdentityFor(plan: SynchronizationPlan, ledgerReliable = true): Promise<string> {
    try {
      if (ledgerReliable && this.options.attentionLedger) return await this.options.attentionLedger.currentIdentity();
    } catch {
      // Persistence availability is already surfaced separately; notification identity remains fail-safe and path-free.
    }
    const identities = attentionOperations(plan).map(operation => {
      const reason = operation.reasons[0];
      return [String(operation.path), operation.kind, reason?.code ?? operation.kind, reason?.summary ?? ""].join("\u0000");
    }).sort();
    return String(sha256Text(JSON.stringify(identities)));
  }
  private async recordAttentionEntries(entries: readonly SkippedPathAttention[]): Promise<boolean> {
    if (!entries.length || !this.options.attentionLedger) return true;
    try { await this.options.attentionLedger.recordSkipped(entries); return true; }
    catch {
      this.syncError(entries[0]?.runId, "attention-ledger-write-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      return false;
    }
  }
  private async resolveAttentionFor(operation: PlannedOperation): Promise<boolean> {
    if (!this.options.attentionLedger) return true;
    try {
      const paths = new Set([operation.path, operation.fromPath, operation.toPath].filter((path): path is VaultPath => path !== undefined));
      for (const path of paths) await this.options.attentionLedger.resolvePath(path);
      return true;
    } catch {
      this.syncError(this.planned?.diagnosticRunId, "attention-ledger-write-failed", { stage: "attention-ledger", classification: "attention-ledger-persistence-failure", result: "failed" });
      return false;
    }
  }
  private syncInfo(runId: number | undefined, event: string, fields?: SafeDiagnosticFields): void {
    if (runId !== undefined) this.options.diagnostics?.syncInfo("sync.controller", event, runId, fields);
  }
  private syncDebug(runId: number | undefined, event: string, fields?: SafeDiagnosticFields): void {
    if (runId !== undefined) this.options.diagnostics?.syncDebug("sync.plan", event, runId, fields);
  }
  private syncTrace(runId: number | undefined, event: string, fields?: SafeDiagnosticFields): void {
    if (runId !== undefined) this.options.diagnostics?.syncTrace("sync.execute", event, runId, fields);
  }
  private syncError(runId: number | undefined, event: string, fields?: SafeDiagnosticFields): void {
    if (runId !== undefined) this.options.diagnostics?.syncError("sync.execute", event, runId, fields);
  }
  private syncFailure(runId: number | undefined, event: string, error: unknown, fields?: SafeDiagnosticFields): void {
    if (runId !== undefined) this.options.diagnostics?.syncFailure("sync.execute", event, runId, error, fields);
  }
  private rejectExecute(reason: string, classification: string, runId?: number): UserActionResult {
    this.syncError(runId, "execute-request-rejected", { stage: "execute-request", classification, result: "rejected" });
    return { status: "rejected", reason };
  }
  private endDiagnosticRun(runId?: number): void {
    if (runId === undefined) return;
    this.options.diagnostics?.endSyncRun(runId);
  }
  private setStatus(status: SynchronizationStatus): void {
    this.surface = { ...this.surface, status };
    for (const listener of this.listeners) listener(this.surface);
  }
  private async audit(event: AuditRecord["event"], values: Partial<Omit<AuditRecord, "id" | "event" | "advisoryAtMs">> = {}): Promise<void> {
    await this.options.audit.append({ id: auditId(), event, advisoryAtMs: Date.now(), ...values });
  }
}
