import type {
  AuthoritativeSuccessCommitter,
  CommitResult,
  ExecutionResult,
  PlannedOperation,
  PreconditionValidationResult,
  StateRevision,
  SynchronizationExecutor,
} from "../contracts";
import type { StateCommitCoordinator } from "./commit-coordinator";

export type CoordinatedExecutionResult =
  | { readonly status: "committed"; readonly commit: Extract<CommitResult, { status: "committed" }> }
  | { readonly status: "stale-precondition" | "blocked" | "recovery-required" | "cancelled" | "retryable-failure" | "uncertain"; readonly reason: string }
  | { readonly status: "stale-state"; readonly actualRevision?: StateRevision };

export type ExecutionLifecycleStage =
  | "operation-start"
  | "operation-precondition-validation-start"
  | "operation-precondition-validated"
  | "operation-precondition-validation-failed"
  | "pending-journal-start"
  | "pending-journal-complete"
  | "pending-journal-failed"
  | "content-mutation-start"
  | "content-mutation-complete"
  | "content-mutation-failed"
  | "uncertain-state-journal-failed"
  | "integrity-verification-complete"
  | "state-commit-start"
  | "state-commit-complete"
  | "state-commit-failed"
  | "operation-complete";
export type ExecutionLifecycleObserver = (operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown) => void;

/**
 * Phase-2 ordering policy for one planned operation.
 *
 * Mutation mechanics stay behind SynchronizationExecutor (Phase 5 composes real adapters),
 * while this coordinator guarantees: precondition validation -> durable pending journal ->
 * mutation/verification -> authoritative verified-success commit. Stale intent is never run.
 */
export class CrashSafeExecutionCoordinator {
  constructor(
    private readonly executor: SynchronizationExecutor,
    private readonly journal: StateCommitCoordinator,
    private readonly successCommitter: AuthoritativeSuccessCommitter = journal,
    private readonly observer?: ExecutionLifecycleObserver,
  ) {}

  async executeOperation(operation: PlannedOperation, expectedStateRevision?: StateRevision): Promise<CoordinatedExecutionResult> {
    this.observe(operation, "operation-start");
    this.observe(operation, "operation-precondition-validation-start");
    let preconditions: PreconditionValidationResult;
    try { preconditions = await this.executor.validatePreconditions(operation); }
    catch (error) { this.observe(operation, "operation-precondition-validation-failed", "threw", error); throw error; }
    this.observe(operation, "operation-precondition-validated", preconditions.status);
    const preconditionResult = this.mapPreconditionFailure(preconditions);
    if (preconditionResult) {
      this.observe(operation, "operation-precondition-validation-failed", preconditionResult.status);
      return this.complete(operation, preconditionResult);
    }

    this.observe(operation, "pending-journal-start");
    let pending: CommitResult;
    try { pending = await this.journal.markPending(operation, expectedStateRevision); }
    catch (error) { this.observe(operation, "pending-journal-failed", "threw", error); throw error; }
    this.observe(operation, "pending-journal-complete", pending.status);
    if (pending.status === "stale-state") {
      this.observe(operation, "pending-journal-failed", pending.status);
      return this.complete(operation, { status: "stale-state", actualRevision: pending.actualRevision });
    }
    if (pending.status === "recovery-required") {
      this.observe(operation, "pending-journal-failed", pending.status);
      return this.complete(operation, { status: "recovery-required", reason: pending.reason });
    }

    this.observe(operation, "content-mutation-start");
    let execution: ExecutionResult;
    try { execution = await this.executor.execute(operation); }
    catch (error) { this.observe(operation, "content-mutation-failed", "threw", error); throw error; }
    if (execution.status === "durable-verified-success") {
      this.observe(operation, "content-mutation-complete", execution.status);
      this.observe(operation, "integrity-verification-complete", "verified");
      this.observe(operation, "state-commit-start");
      let committed: CommitResult;
      try { committed = await this.successCommitter.commitVerifiedSuccess(operation, execution.receipt, pending.newStateRevision); }
      catch (error) { this.observe(operation, "state-commit-failed", "threw", error); throw error; }
      this.observe(operation, "state-commit-complete", committed.status);
      if (committed.status === "committed") return this.complete(operation, { status: "committed", commit: committed });
      if (committed.status === "stale-state") {
        this.observe(operation, "state-commit-failed", committed.status);
        return this.complete(operation, { status: "stale-state", actualRevision: committed.actualRevision });
      }
      this.observe(operation, "state-commit-failed", committed.status);
      return this.complete(operation, { status: "recovery-required", reason: committed.reason });
    }

    this.observe(operation, "content-mutation-failed", execution.status);
    if (execution.status === "uncertain") {
      let marked: CommitResult;
      try { marked = await this.journal.markUncertain(operation, pending.newStateRevision); }
      catch (error) { this.observe(operation, "uncertain-state-journal-failed", "threw", error); throw error; }
      if (marked.status === "stale-state") {
        this.observe(operation, "uncertain-state-journal-failed", marked.status);
        return this.complete(operation, { status: "stale-state", actualRevision: marked.actualRevision });
      }
      if (marked.status === "recovery-required") {
        this.observe(operation, "uncertain-state-journal-failed", marked.status);
        return this.complete(operation, { status: "recovery-required", reason: marked.reason });
      }
      return this.complete(operation, { status: "uncertain", reason: execution.reason });
    }

    return this.complete(operation, this.mapExecutionFailure(execution));
  }

  private complete(operation: PlannedOperation, result: CoordinatedExecutionResult): CoordinatedExecutionResult {
    this.observe(operation, "operation-complete", result.status);
    return result;
  }
  private observe(operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown): void {
    try { this.observer?.(operation, stage, result, error); } catch { /* Diagnostics must never influence synchronization. */ }
  }

  private mapPreconditionFailure(result: PreconditionValidationResult): CoordinatedExecutionResult | undefined {
    if (result.status === "valid") return undefined;
    if (result.status === "stale") return { status: "stale-precondition", reason: "planned operation preconditions changed; affected work must be re-planned" };
    if (result.status === "blocked") return { status: "blocked", reason: result.reason };
    return { status: "recovery-required", reason: result.reason };
  }

  private mapExecutionFailure(result: Exclude<ExecutionResult, { status: "durable-verified-success" | "uncertain" }>): CoordinatedExecutionResult {
    if (result.status === "stale-precondition") return { status: "stale-precondition", reason: result.reason };
    if (result.status === "blocking-failure") return { status: "blocked", reason: result.reason };
    if (result.status === "recovery-required") return { status: "recovery-required", reason: result.reason };
    if (result.status === "retryable-failure") return { status: "retryable-failure", reason: result.reason };
    return { status: "cancelled", reason: result.reason ?? "cancelled" };
  }
}
