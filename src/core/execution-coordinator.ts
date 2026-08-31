import type {
  AuthoritativeSuccessCommitter,
  CommitResult,
  ExecutionResult,
  OperationPrecondition,
  PlannedOperation,
  PreconditionValidationResult,
  StateRevision,
  SynchronizationExecutor,
} from "../contracts";
import type { StateCommitCoordinator } from "./commit-coordinator";

export type CoordinatedExecutionResult =
  | { readonly status: "committed"; readonly commit: Extract<CommitResult, { status: "committed" }> }
  | { readonly status: "stale-precondition"; readonly reason: string; readonly failed?: readonly OperationPrecondition[] }
  | { readonly status: "blocked" | "recovery-required" | "cancelled" | "retryable-failure" | "uncertain"; readonly reason: string }
  | { readonly status: "stale-state"; readonly actualRevision?: StateRevision };

export type ExecutionLifecycleStage =
  | "operation-start"
  | "operation-precondition-validation-start"
  | "operation-precondition-validated"
  | "operation-precondition-validation-failed"
  | "pending-journal-start"
  | "pending-journal-complete"
  | "pending-journal-failed"
  | "pending-journal-discard-start"
  | "pending-journal-discard-complete"
  | "pending-journal-discard-failed"
  | "content-mutation-start"
  | "content-mutation-complete"
  | "content-mutation-failed"
  | "uncertain-state-journal-failed"
  | "integrity-verification-complete"
  | "state-commit-start"
  | "state-commit-complete"
  | "state-commit-failed"
  | "operation-complete";
export type ExecutionLifecycleObserver = (operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown, failedPreconditions?: readonly OperationPrecondition[]) => void;

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
      this.observe(operation, "operation-precondition-validation-failed", preconditionResult.status, undefined, preconditions.status === "stale" ? preconditions.failed : undefined);
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

    this.observe(operation, "content-mutation-failed", execution.status, undefined, execution.status === "stale-precondition" ? execution.failed : undefined);
    if (execution.status === "stale-precondition") {
      this.observe(operation, "pending-journal-discard-start");
      let discarded: CommitResult;
      try { discarded = await this.journal.discardPending(operation, pending.newStateRevision); }
      catch (error) { this.observe(operation, "pending-journal-discard-failed", "threw", error); throw error; }
      this.observe(operation, "pending-journal-discard-complete", discarded.status);
      if (discarded.status === "committed") return this.complete(operation, { status: "stale-precondition", reason: execution.reason, failed: execution.failed });
      this.observe(operation, "pending-journal-discard-failed", discarded.status);
      if (discarded.status === "stale-state") return this.complete(operation, { status: "stale-state", actualRevision: discarded.actualRevision });
      return this.complete(operation, { status: "recovery-required", reason: discarded.reason });
    }
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
  private observe(operation: PlannedOperation, stage: ExecutionLifecycleStage, result?: string, error?: unknown, failedPreconditions?: readonly OperationPrecondition[]): void {
    try { this.observer?.(operation, stage, result, error, failedPreconditions); } catch { /* Diagnostics must never influence synchronization. */ }
  }

  private mapPreconditionFailure(result: PreconditionValidationResult): CoordinatedExecutionResult | undefined {
    if (result.status === "valid") return undefined;
    if (result.status === "stale") return { status: "stale-precondition", reason: "planned operation preconditions changed; affected work must be re-planned", failed: result.failed };
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

import {
  folderCreateEligibleForAuthoritativeCommit,
  recoverRemoteFolderCreate,
} from "../contracts";
import type {
  ExactBaseAuthority,
  ExecutableOperationPrecondition,
  ExecutablePlannedOperation,
  IdentityAuthorityProof,
  PathConvergenceState,
  RecoverableMutationEffectV1_1,
  RemoteFolderCreatePhysicalMutationDescriptor,
  RemoteFolderCreateRecoveryReadPort,
  SynchronizationAuthorityMetadataV1_1,
} from "../contracts";

export type AuthorityResolutionResult =
  | { readonly status: "ready"; readonly operation: ExecutablePlannedOperation }
  | { readonly status: "incomplete-authority"; readonly reason: string };

function operationBaseAuthorityPath(operation: PlannedOperation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath
    ? operation.fromPath
    : operation.path;
}

/**
 * Replace compatibility-only planner markers with exact frozen authority.
 * No nominal `base-trusted` / `identity-unambiguous` marker is permitted to
 * cross the authoritative execution boundary.
 */
export function resolveAuthorityCompleteOperation(
  operation: PlannedOperation,
  authority: SynchronizationAuthorityMetadataV1_1,
): AuthorityResolutionResult {
  const preconditions: ExecutableOperationPrecondition[] = [];
  for (const precondition of operation.preconditions) {
    if (precondition.kind === "base-trusted") {
      const authorityPath = operationBaseAuthorityPath(operation);
      const convergence = authority.pathConvergence.find(entry => entry.path === authorityPath)?.state;
      if (!convergence || convergence.status !== "converged") {
        return { status: "incomplete-authority", reason: `exact BASE authority unavailable for ${String(authorityPath)}` };
      }
      const exact: ExactBaseAuthority = {
        generation: authority.semanticGeneration,
        path: authorityPath,
        fingerprint: convergence.baseFingerprint,
      };
      preconditions.push({ kind: "base-authority", authority: exact });
      continue;
    }
    if (precondition.kind === "identity-unambiguous") {
      const remoteObjectId = operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
      if (!remoteObjectId) {
        return { status: "incomplete-authority", reason: `exact remote identity unavailable for ${String(precondition.path)}` };
      }
      const proof: IdentityAuthorityProof = {
        generation: authority.semanticGeneration,
        status: "unique",
        path: precondition.path,
        remoteObjectId,
      };
      preconditions.push({ kind: "identity-authority", proof });
      continue;
    }
    preconditions.push(precondition);
  }
  return {
    status: "ready",
    operation: { ...operation, authorityComplete: true, preconditions },
  };
}

export type RemoteFolderRestartDecision =
  | { readonly status: "already-committed" }
  | { readonly status: "retire-unattempted" }
  | { readonly status: "safe-retry-eligible"; readonly reason: string }
  | { readonly status: "effect-verified-awaiting-convergence"; readonly reason: string }
  | { readonly status: "authoritative-commit-eligible"; readonly verificationEvidenceRef?: string }
  | { readonly status: "conflict-preserved"; readonly reason: string }
  | { readonly status: "recovery-pending"; readonly reason: string };

function remoteFolderDescriptor(effect: RecoverableMutationEffectV1_1): RemoteFolderCreatePhysicalMutationDescriptor | undefined {
  return effect.descriptor.kind === "remote-folder-create" ? effect.descriptor : undefined;
}

/**
 * Restart classifier for one persisted REMOTE folder-create effect.
 *
 * `dispatch-authorized` and `outcome-unknown` always reconstruct Drive reality
 * through the frozen read-only v1.2 seam before any retry can become eligible.
 * Physical existence alone is never treated as ordinary logical convergence.
 */
export async function recoverRemoteFolderEffectV1_2(
  effect: RecoverableMutationEffectV1_1,
  pathConvergence: PathConvergenceState,
  reader: RemoteFolderCreateRecoveryReadPort,
): Promise<RemoteFolderRestartDecision> {
  const descriptor = remoteFolderDescriptor(effect);
  if (!descriptor) return { status: "recovery-pending", reason: "effect-is-not-a-remote-folder-create" };
  if (effect.stage === "state-committed") return { status: "already-committed" };
  if (effect.stage === "intent-persisted") return { status: "retire-unattempted" };
  if (effect.stage === "effect-verified") {
    return pathConvergence.status === "converged"
      ? { status: "authoritative-commit-eligible", verificationEvidenceRef: effect.verificationEvidenceRef }
      : { status: "effect-verified-awaiting-convergence", reason: "physical folder effect is verified but logical path is not converged" };
  }

  const outcome = await recoverRemoteFolderCreate(descriptor, reader);
  if (outcome.status === "verified-not-applied") {
    return { status: "safe-retry-eligible", reason: outcome.reason };
  }
  if (outcome.status === "conflict-preserved") {
    return { status: "conflict-preserved", reason: outcome.reason };
  }
  if (outcome.status === "outcome-unknown") {
    return { status: "recovery-pending", reason: outcome.reason };
  }
  if (!folderCreateEligibleForAuthoritativeCommit(outcome, pathConvergence)) {
    return { status: "effect-verified-awaiting-convergence", reason: "physical folder effect is verified but logical path is not converged" };
  }
  return { status: "authoritative-commit-eligible", verificationEvidenceRef: effect.verificationEvidenceRef };
}

export interface RemoteFolderIntentRecoveryResult {
  readonly effectId: string;
  readonly operationId: string;
  readonly decision: RemoteFolderRestartDecision;
}

/**
 * Recover every persisted remote-folder effect independently. One conflicted or
 * unknown logical path never prevents an unrelated sibling effect from being
 * classified and progressed according to its own durable evidence.
 */
export async function recoverRemoteFolderIntentsV1_2(
  authority: SynchronizationAuthorityMetadataV1_1,
  reader: RemoteFolderCreateRecoveryReadPort,
): Promise<readonly RemoteFolderIntentRecoveryResult[]> {
  const results: RemoteFolderIntentRecoveryResult[] = [];
  for (const intent of authority.operationIntents) {
    for (const effect of intent.effects) {
      if (effect.descriptor.kind !== "remote-folder-create") continue;
      const pathConvergence = authority.pathConvergence.find(entry => entry.path === effect.descriptor.targetPath)?.state
        ?? { status: "unknown" as const, reasonCode: "path-convergence-unavailable" };
      results.push({
        effectId: effect.effectId,
        operationId: String(intent.operationId),
        decision: await recoverRemoteFolderEffectV1_2(effect, pathConvergence, reader),
      });
    }
  }
  return results;
}
