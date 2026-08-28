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
  | "pending-journal-start"
  | "pending-journal-complete"
  | "content-mutation-start"
  | "content-mutation-complete"
  | "content-mutation-failed"
  | "integrity-verification-complete"
  | "state-commit-start"
  | "state-commit-complete"
  | "operation-complete";
export type ExecutionLifecycleObserver = (operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string) => void;

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
    const preconditions = await this.executor.validatePreconditions(operation);
    this.observe(operation, "operation-precondition-validated", preconditions.status);
    const preconditionResult = this.mapPreconditionFailure(preconditions);
    if (preconditionResult) return this.complete(operation, preconditionResult);

    this.observe(operation, "pending-journal-start");
    const pending = await this.journal.markPending(operation, expectedStateRevision);
    this.observe(operation, "pending-journal-complete", pending.status);
    if (pending.status === "stale-state") return this.complete(operation, { status: "stale-state", actualRevision: pending.actualRevision });
    if (pending.status === "recovery-required") return this.complete(operation, { status: "recovery-required", reason: pending.reason });

    this.observe(operation, "content-mutation-start");
    const execution = await this.executor.execute(operation);
    if (execution.status === "durable-verified-success") {
      this.observe(operation, "content-mutation-complete", execution.status);
      this.observe(operation, "integrity-verification-complete", "verified");
      this.observe(operation, "state-commit-start");
      const committed = await this.successCommitter.commitVerifiedSuccess(operation, execution.receipt, pending.newStateRevision);
      this.observe(operation, "state-commit-complete", committed.status);
      if (committed.status === "committed") return this.complete(operation, { status: "committed", commit: committed });
      if (committed.status === "stale-state") return this.complete(operation, { status: "stale-state", actualRevision: committed.actualRevision });
      return this.complete(operation, { status: "recovery-required", reason: committed.reason });
    }

    this.observe(operation, "content-mutation-failed", execution.status);
    if (execution.status === "uncertain") {
      const marked = await this.journal.markUncertain(operation, pending.newStateRevision);
      if (marked.status === "stale-state") return this.complete(operation, { status: "stale-state", actualRevision: marked.actualRevision });
      if (marked.status === "recovery-required") return this.complete(operation, { status: "recovery-required", reason: marked.reason });
      return this.complete(operation, { status: "uncertain", reason: execution.reason });
    }

    return this.complete(operation, this.mapExecutionFailure(execution));
  }

  private complete(operation: PlannedOperation, result: CoordinatedExecutionResult): CoordinatedExecutionResult {
    this.observe(operation, "operation-complete", result.status);
    return result;
  }
  private observe(operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string): void {
    try { this.observer?.(operation, stage, result); } catch { /* Diagnostics must never influence synchronization. */ }
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
