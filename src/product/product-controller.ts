import type {
  AuditRecord,
  CheckpointId,
  DeviceIdentity,
  ManagedRemoteIdentity,
  PlanId,
  ProductControlPort,
  ProductSurfaceState,
  StateLoadContext,
  SynchronizationPlan,
  SynchronizationPlanner,
  SynchronizationStateStore,
  SynchronizationStatus,
  UserAction,
  UserActionResult,
  VaultIdentity,
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

export interface ProductControllerOptions {
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly stateContext: StateLoadContext;
  readonly stateStore: SynchronizationStateStore;
  readonly snapshotAssembler: ProductSnapshotAssembler;
  readonly executor: ProductSynchronizationExecutor;
  readonly plannerForTrigger: PlannerFactory;
  readonly leasePort: RunLeasePort;
  readonly audit: BoundedAuditHistory;
  readonly holderId: string;
}

interface PlannedRun {
  readonly plan: SynchronizationPlan;
  readonly assembly: AssembledPlanningInput;
  readonly checkpointId?: CheckpointId;
  readonly reviewed: boolean;
}

function auditId(): string { return globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random()}`; }
function revision(value: string) { return contractId<"StateRevision">(value); }

/** Product-level orchestration. UI consumes this controller and never mutates local/Drive ports directly. */
export class IntegratedProductController implements ProductControlPort {
  private surface: ProductSurfaceState = { status: { kind: "idle-ready" }, conflicts: [] };
  private readonly listeners = new Set<(surface: ProductSurfaceState) => void>();
  private readonly runs: CoreRunCoordinator;
  private planned?: PlannedRun;
  private runEvidence?: ExecutorRunEvidence;
  private initializedOnce = false;

  constructor(private readonly options: ProductControllerOptions) {
    this.runs = new CoreRunCoordinator(options.vaultIdentity, options.deviceIdentity, options.leasePort, options.holderId);
  }

  currentSurface(): ProductSurfaceState { return this.surface; }
  onSurface(listener: (surface: ProductSurfaceState) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  readAuditHistory(): Promise<readonly AuditRecord[]> { return this.options.audit.read(); }
  currentRunEvidence(): ExecutorRunEvidence {
    if (!this.runEvidence) throw new Error("no active synchronization run evidence");
    return this.runEvidence;
  }
  pendingDestructiveCheckpoint(): CheckpointId | undefined { return this.planned?.checkpointId; }

  async previewManual(): Promise<SynchronizationPlan | undefined> { return this.createPlan("manual", true, true); }
  async runAutomatic(trigger: "startup-resume" | "local-change" | "periodic"): Promise<void> {
    const plan = await this.createPlan(trigger, false, false);
    if (!plan || plan.executionDisposition !== "safe-auto-eligible") return;
    await this.executePlanned(false);
  }

  noteChangeDuringRun(): void { this.runs.noteLocalOrRemoteChangeDuringRun(); }

  async request(action: UserAction): Promise<UserActionResult> {
    switch (action.kind) {
      case "pause":
        this.runs.pause(); this.setStatus({ kind: "paused" }); return { status: "accepted" };
      case "resume":
        this.runs.resume(); this.setStatus({ kind: "idle-ready" }); return { status: "accepted" };
      case "cancel-active-sync":
        this.runs.requestCancellation();
        await this.audit("sync-cancelled");
        return { status: "accepted" };
      case "verify-reconcile-vault":
        await this.createPlan("verify-reconcile", true, true);
        return { status: "accepted" };
      case "execute-plan":
        if (!this.planned || this.planned.plan.planId !== action.planId) return { status: "rejected", reason: "plan is stale or no longer current" };
        if (!this.planned.reviewed) return { status: "rejected", reason: "manual plan has not been reviewed" };
        if (this.planned.plan.recoveryCheckpointRequired) return { status: "rejected", reason: "destructive plan requires exact checkpoint approval" };
        await this.executePlanned(true);
        return { status: "accepted" };
      case "approve-destructive-plan":
        if (!this.planned || this.planned.plan.planId !== action.planId) return { status: "rejected", reason: "destructive plan is stale" };
        if (!this.planned.checkpointId || this.planned.checkpointId !== action.recoveryCheckpointId) return { status: "rejected", reason: "approval is not tied to the current recovery checkpoint" };
        await this.audit("destructive-plan-approved", { planId: action.planId });
        await this.executePlanned(true, action.recoveryCheckpointId);
        return { status: "accepted" };
      case "resolve-conflict":
        return { status: "rejected", reason: "frozen Phase 1/2 contracts do not provide an authoritative resolution mutation/commit path; conflict resolution is fail-closed" };
    }
  }

  private async createPlan(trigger: SynchronizationPlan["trigger"], full: boolean, reviewed: boolean): Promise<SynchronizationPlan | undefined> {
    if (this.runs.isPaused()) { this.setStatus({ kind: "paused" }); return undefined; }
    this.setStatus({ kind: "planning", trigger });
    try {
      const assembly = full ? await this.options.snapshotAssembler.assembleFull() : await this.options.snapshotAssembler.assemble(true);
      const planner = this.options.plannerForTrigger(trigger);
      const plan = await planner.plan(assembly.input);
      let checkpointId: CheckpointId | undefined;
      if (plan.recoveryCheckpointRequired) {
        const backup = await this.options.stateStore.createRecoveryBackup();
        checkpointId = contractId<"CheckpointId">(backup.backupId) as CheckpointId;
      }
      this.planned = { plan, assembly, checkpointId, reviewed };
      await this.audit("plan-created", { planId: plan.planId, count: plan.operations.length });
      this.surface = { ...this.surface, planPreview: plan };
      if (plan.operations.some(operation => operation.kind === "recovery-required")) this.setStatus({ kind: "recovery-required", reason: "synchronization state or remote relationship requires recovery" });
      else if (plan.operations.some(operation => operation.kind === "unresolved-conflict")) this.setStatus({ kind: "conflict-present", conflictCount: plan.operations.filter(operation => operation.kind === "unresolved-conflict").length });
      else if (plan.recoveryCheckpointRequired) this.setStatus({ kind: "destructive-plan-blocked", planId: plan.planId });
      else this.setStatus({ kind: "idle-ready" });
      return plan;
    } catch (error) {
      this.mapPlanningError(error);
      return undefined;
    }
  }

  private async executePlanned(userInitiated: boolean, approvedCheckpoint?: CheckpointId): Promise<void> {
    const planned = this.planned;
    if (!planned) return;
    if (!userInitiated && planned.plan.executionDisposition !== "safe-auto-eligible") return;
    if (planned.plan.executionDisposition === "blocked") return;
    if (planned.plan.recoveryCheckpointRequired && approvedCheckpoint !== planned.checkpointId) return;

    const begun = await this.runs.beginRun();
    if (begun.status !== "started") {
      if (begun.status === "paused") this.setStatus({ kind: "paused" });
      return;
    }
    this.setStatus({ kind: "syncing", planId: planned.plan.planId });
    try {
      await this.ensureTrustedState(planned.assembly);
      this.runEvidence = { managedRemote: planned.assembly.managedRemote, remoteEnumerationComplete: planned.assembly.remoteEnumeration.status === "complete" };
      const journal = new StateCommitCoordinator(this.options.stateStore, this.options.stateContext);
      const coordinator = new CrashSafeExecutionCoordinator(this.options.executor, journal);
      let needsReplan = false;
      for (const operation of planned.plan.operations) {
        if (!this.runs.canStartNextOperation()) break;
        if (operation.kind === "unresolved-conflict" || operation.kind === "blocked-unsafe" || operation.kind === "recovery-required") continue;
        if (operation.destructive && planned.plan.recoveryCheckpointRequired && !approvedCheckpoint) continue;
        const result = await coordinator.executeOperation(operation);
        if (result.status === "committed") {
          await this.audit("operation-completed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path, ...(operation.kind.startsWith("trash-") ? { event: "trash-action" as const } : {}) });
          continue;
        }
        await this.audit("operation-failed", { planId: planned.plan.planId, operationId: operation.operationId, path: operation.path, reasonCode: result.status });
        if (result.status === "stale-precondition" || result.status === "stale-state") { needsReplan = true; this.runs.noteLocalOrRemoteChangeDuringRun(); break; }
        if (result.status === "recovery-required" || result.status === "uncertain") { this.setStatus({ kind: "recovery-required", reason: result.reason }); break; }
        if (result.status === "retryable-failure") { this.setStatus({ kind: "offline-deferred", reason: result.reason }); break; }
        if (result.status === "blocked") { this.setStatus({ kind: "error", code: "operation-blocked", message: result.reason }); break; }
      }
      if (!needsReplan && planned.assembly.nextCursor) await this.commitCursor(planned.assembly.nextCursor);
    } finally {
      this.runEvidence = undefined;
      const finished = await this.runs.finishRun();
      if (finished.reconcileAgain) void this.runAutomatic("local-change");
      else if (this.surface.status.kind === "syncing") this.setStatus({ kind: "idle-ready" });
    }
  }

  private async ensureTrustedState(assembly: AssembledPlanningInput): Promise<void> {
    if (assembly.input.state.status === "trusted") return;
    if (assembly.input.state.status === "recovery-required") throw new Error("cannot initialize trusted state from recovery-required state");
    const initial = createInitialTrustedState({ stateRevision: revision("state:0"), vaultIdentity: this.options.vaultIdentity, deviceIdentity: this.options.deviceIdentity });
    const saved = await this.options.stateStore.saveTrusted(initial);
    if (saved.status !== "saved") throw new Error(`unable to establish initial trusted state: ${saved.status}`);
    this.initializedOnce = true;
  }

  private async commitCursor(cursor: AssembledPlanningInput["nextCursor"]): Promise<void> {
    if (!cursor) return;
    const loaded = await this.options.stateStore.load(this.options.stateContext);
    if (loaded.status !== "trusted") return;
    const current = String(loaded.state.stateRevision);
    const match = /^(.*?)(\d+)$/.exec(current);
    const next = revision(match ? `${match[1]}${Number(match[2]) + 1}` : `${current}:1`);
    const saved = await this.options.stateStore.saveTrusted({ ...loaded.state, stateRevision: next, changeCursor: cursor }, loaded.state.stateRevision);
    if (saved.status !== "saved") this.setStatus({ kind: "recovery-required", reason: "incremental Drive cursor could not be committed atomically" });
  }

  private mapPlanningError(error: unknown): void {
    if (error instanceof SnapshotAssemblyError) {
      if (error.code === "authentication-required") this.setStatus({ kind: "authentication-required", reason: error.message });
      else if (error.code === "transient-failure" || error.code === "rate-limited" || error.code === "service-unavailable") this.setStatus({ kind: "offline-deferred", reason: error.message });
      else if (["missing-root", "identity-mismatch", "incompatible-protocol", "ambiguous", "recovery-required", "not-found"].includes(error.code)) this.setStatus({ kind: "recovery-required", reason: error.message });
      else this.setStatus({ kind: "error", code: error.code, message: error.message });
      return;
    }
    this.setStatus({ kind: "error", code: "planning-failed", message: error instanceof Error ? error.message : String(error) });
  }

  private setStatus(status: SynchronizationStatus): void {
    this.surface = { ...this.surface, status };
    for (const listener of this.listeners) listener(this.surface);
  }

  private async audit(event: AuditRecord["event"], values: Partial<Omit<AuditRecord, "id" | "event" | "advisoryAtMs">> & { event?: AuditRecord["event"] } = {}): Promise<void> {
    await this.options.audit.append({ id: auditId(), event: values.event ?? event, advisoryAtMs: Date.now(), ...values });
  }
}
