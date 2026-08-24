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
  ) {}

  async executeOperation(operation: PlannedOperation, expectedStateRevision?: StateRevision): Promise<CoordinatedExecutionResult> {
    const preconditions = await this.executor.validatePreconditions(operation);
    const preconditionResult = this.mapPreconditionFailure(preconditions);
    if (preconditionResult) return preconditionResult;

    const pending = await this.journal.markPending(operation, expectedStateRevision);
    if (pending.status === "stale-state") return { status: "stale-state", actualRevision: pending.actualRevision };
    if (pending.status === "recovery-required") return { status: "recovery-required", reason: pending.reason };

    const execution = await this.executor.execute(operation);
    if (execution.status === "durable-verified-success") {
      const committed = await this.successCommitter.commitVerifiedSuccess(operation, execution.receipt, pending.newStateRevision);
      if (committed.status === "committed") return { status: "committed", commit: committed };
      if (committed.status === "stale-state") return { status: "stale-state", actualRevision: committed.actualRevision };
      return { status: "recovery-required", reason: committed.reason };
    }

    if (execution.status === "uncertain") {
      const marked = await this.journal.markUncertain(operation, pending.newStateRevision);
      if (marked.status === "stale-state") return { status: "stale-state", actualRevision: marked.actualRevision };
      if (marked.status === "recovery-required") return { status: "recovery-required", reason: marked.reason };
      return { status: "uncertain", reason: execution.reason };
    }

    return this.mapExecutionFailure(execution);
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
