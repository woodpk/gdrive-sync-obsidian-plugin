import type {
  AuthorityCompletePreconditionValidationResult,
  AuthorityCompleteSuccessCommitter,
  AuthoritativeSynchronizationExecutor,
  CommitResult,
  ExactBaseAuthority,
  ExecutableOperationPrecondition,
  ExecutablePlannedOperation,
  ExecutionResult,
  IdentityAuthorityProof,
  OperationPrecondition,
  PlannedOperation,
  RemoteObjectMapping,
  StateLoadContext,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
} from "../contracts";
import type {
  AuthorityResolutionResult,
  CoordinatedExecutionResult,
  ExecutionLifecycleObserver,
} from "./execution-coordinator-base";

export * from "./execution-coordinator-base";

function baseAuthorityPath(operation: PlannedOperation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
}

function identityAuthorityPath(operation: PlannedOperation, nominalPath: PlannedOperation["path"]) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : nominalPath;
}

function uniqueTrustedIdentityMapping(
  path: PlannedOperation["path"],
  expectedRemoteObjectId: PlannedOperation["remoteObjectId"],
  mappings: readonly RemoteObjectMapping[],
): RemoteObjectMapping | undefined {
  if (!expectedRemoteObjectId) return undefined;
  const byPath = mappings.filter(mapping => mapping.path === path);
  const byId = mappings.filter(mapping => mapping.remoteObjectId === expectedRemoteObjectId);
  if (byPath.length !== 1 || byId.length !== 1) return undefined;
  const mapping = byPath[0];
  return mapping && mapping.remoteObjectId === expectedRemoteObjectId && byId[0]?.path === path ? mapping : undefined;
}

/** Replace compatibility-only planner markers with independently established exact frozen authority. */
export function resolveAuthorityCompleteOperation(
  operation: PlannedOperation,
  authority: SynchronizationAuthorityMetadataV1_1,
  trustedRemoteMappings: readonly RemoteObjectMapping[] = [],
): AuthorityResolutionResult {
  const preconditions: ExecutableOperationPrecondition[] = [];
  for (const precondition of operation.preconditions) {
    if (precondition.kind === "base-trusted") {
      const authorityPath = baseAuthorityPath(operation);
      const pathAuthority = authority.pathConvergence.find(entry => entry.path === authorityPath)?.state;
      if (!pathAuthority || pathAuthority.status !== "converged" || pathAuthority.generation !== authority.semanticGeneration) {
        return { status: "incomplete-authority", reason: `exact BASE authority unavailable for ${String(authorityPath)}` };
      }
      const exact: ExactBaseAuthority = { generation: authority.semanticGeneration, path: authorityPath, fingerprint: pathAuthority.baseFingerprint };
      preconditions.push({ kind: "base-authority", authority: exact });
      continue;
    }
    if (precondition.kind === "identity-unambiguous") {
      const expectedRemoteObjectId = operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
      const authorityPath = identityAuthorityPath(operation, precondition.path);
      const pathAuthority = authority.pathConvergence.find(entry => entry.path === authorityPath)?.state;
      if (!pathAuthority || pathAuthority.status !== "converged" || pathAuthority.generation !== authority.semanticGeneration) {
        return { status: "incomplete-authority", reason: `current-generation path authority unavailable for ${String(authorityPath)}` };
      }
      const mapping = uniqueTrustedIdentityMapping(authorityPath, expectedRemoteObjectId, trustedRemoteMappings);
      if (!mapping) return { status: "incomplete-authority", reason: `unique trusted remote identity mapping unavailable for ${String(authorityPath)}` };
      const proof: IdentityAuthorityProof = {
        generation: authority.semanticGeneration,
        status: "unique",
        path: mapping.path,
        remoteObjectId: mapping.remoteObjectId,
      };
      preconditions.push({ kind: "identity-authority", proof });
      continue;
    }
    preconditions.push(precondition);
  }
  return { status: "ready", operation: { ...operation, authorityComplete: true, preconditions } };
}

/**
 * Authority-complete production boundary. The executor owns the frozen durable
 * physical-effect lifecycle; this coordinator performs semantic resolution,
 * independently revalidates executable authority, and commits canonical state
 * only after the executor proves every required physical effect is durably
 * verified/state-committed and logically eligible.
 *
 * Legacy OperationJournalEntry pending/uncertain writes are intentionally not
 * used as physical-dispatch authority here.
 */
export class AuthorityCompleteExecutionCoordinator {
  private readonly observer?: ExecutionLifecycleObserver;

  constructor(
    private readonly authorityStore: SynchronizationAuthorityStoreV1_1,
    private readonly executor: AuthoritativeSynchronizationExecutor,
    private readonly committer: AuthorityCompleteSuccessCommitter,
    private readonly identityStateStore?: SynchronizationStateStore,
    private readonly stateContext?: StateLoadContext,
  ) {
    this.observer = (authorityStore as SynchronizationAuthorityStoreV1_1 & { readonly executionLifecycleObserver?: ExecutionLifecycleObserver }).executionLifecycleObserver;
  }

  async executeOperation(operation: PlannedOperation): Promise<CoordinatedExecutionResult> {
    this.observe(operation, "operation-start");
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status === "uninitialized") return this.complete(operation, { status: "recovery-required", reason: "authoritative synchronization metadata is uninitialized" });
    if (loaded.status === "recovery-required") return this.complete(operation, { status: "recovery-required", reason: "authoritative synchronization metadata requires recovery" });

    let mappings: readonly RemoteObjectMapping[] = [];
    if (operation.preconditions.some(precondition => precondition.kind === "identity-unambiguous")) {
      if (!this.identityStateStore || !this.stateContext) return this.complete(operation, { status: "recovery-required", reason: "trusted remote identity mapping state is unavailable" });
      const identityState = await this.identityStateStore.load(this.stateContext);
      if (identityState.status !== "trusted") return this.complete(operation, { status: "recovery-required", reason: "trusted remote identity mapping state is unavailable" });
      mappings = identityState.state.remoteMappings;
    }

    const resolved = resolveAuthorityCompleteOperation(operation, loaded.state, mappings);
    if (resolved.status !== "ready") return this.complete(operation, { status: "recovery-required", reason: resolved.reason });
    const executable = resolved.operation;

    this.observe(executable, "operation-precondition-validation-start");
    let validation: AuthorityCompletePreconditionValidationResult;
    try { validation = await this.executor.validatePreconditions(executable); }
    catch (error) { this.observe(executable, "operation-precondition-validation-failed", "threw", error); throw error; }
    this.observe(executable, "operation-precondition-validated", validation.status);
    const invalid = this.mapAuthoritativeValidation(validation);
    if (invalid) {
      this.observe(executable, "operation-precondition-validation-failed", invalid.status, undefined, validation.status === "stale" ? validation.failed : undefined);
      return this.complete(executable, invalid);
    }

    this.observe(executable, "content-mutation-start");
    let execution: ExecutionResult;
    try { execution = await this.executor.execute(executable); }
    catch (error) { this.observe(executable, "content-mutation-failed", "threw", error); throw error; }

    if (execution.status === "durable-verified-success") {
      this.observe(executable, "content-mutation-complete", execution.status);
      this.observe(executable, "integrity-verification-complete", "verified");
      this.observe(executable, "state-commit-start");
      let commit: CommitResult;
      try { commit = await this.committer.commitVerifiedSuccess(executable, execution.receipt); }
      catch (error) { this.observe(executable, "state-commit-failed", "threw", error); throw error; }
      this.observe(executable, "state-commit-complete", commit.status);
      if (commit.status === "committed") return this.complete(executable, { status: "committed", commit });
      if (commit.status === "stale-state") {
        this.observe(executable, "state-commit-failed", commit.status);
        return this.complete(executable, { status: "stale-state", actualRevision: commit.actualRevision });
      }
      this.observe(executable, "state-commit-failed", commit.status);
      return this.complete(executable, { status: "recovery-required", reason: commit.reason });
    }

    this.observe(executable, "content-mutation-failed", execution.status, undefined, execution.status === "stale-precondition" ? execution.failed : undefined);
    return this.complete(executable, this.mapAuthoritativeExecution(execution));
  }

  private complete(operation: PlannedOperation, result: CoordinatedExecutionResult): CoordinatedExecutionResult {
    this.observe(operation, "operation-complete", result.status);
    return result;
  }

  private observe(operation: PlannedOperation, stage: Parameters<NonNullable<ExecutionLifecycleObserver>>[1], result?: string, error?: unknown, failed?: readonly OperationPrecondition[]): void {
    try { this.observer?.(operation, stage, result, error, failed); } catch { /* diagnostics are non-authoritative */ }
  }

  private mapAuthoritativeValidation(result: AuthorityCompletePreconditionValidationResult): CoordinatedExecutionResult | undefined {
    if (result.status === "valid") return undefined;
    if (result.status === "stale") return { status: "stale-precondition", reason: "exact executable authority changed before mutation", failed: result.failed };
    if (result.status === "blocked") return { status: "blocked", reason: result.reason };
    return { status: "recovery-required", reason: result.reason };
  }

  private mapAuthoritativeExecution(result: Exclude<ExecutionResult, { status: "durable-verified-success" }>): CoordinatedExecutionResult {
    if (result.status === "stale-precondition") return { status: "stale-precondition", reason: result.reason, failed: result.failed };
    if (result.status === "blocking-failure") return { status: "blocked", reason: result.reason };
    if (result.status === "recovery-required") return { status: "recovery-required", reason: result.reason };
    if (result.status === "retryable-failure") return { status: "retryable-failure", reason: result.reason };
    if (result.status === "uncertain") return { status: "uncertain", reason: result.reason };
    return { status: "cancelled", reason: result.reason ?? "cancelled" };
  }
}
