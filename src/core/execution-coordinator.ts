import type {
  AuthorityCompletePreconditionValidationResult,
  AuthorityCompleteSuccessCommitter,
  AuthoritativeSynchronizationExecutor,
  ExactBaseAuthority,
  ExecutableOperationPrecondition,
  ExecutablePlannedOperation,
  ExecutionResult,
  IdentityAuthorityProof,
  PlannedOperation,
  RemoteObjectMapping,
  StateLoadContext,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
} from "../contracts";
import type { CoordinatedExecutionResult, AuthorityResolutionResult } from "./execution-coordinator-base";

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

/** Authority-complete production boundary. No nominal planner authority reaches mutation. */
export class AuthorityCompleteExecutionCoordinator {
  constructor(
    private readonly authorityStore: SynchronizationAuthorityStoreV1_1,
    private readonly executor: AuthoritativeSynchronizationExecutor,
    private readonly committer: AuthorityCompleteSuccessCommitter,
    private readonly identityStateStore?: SynchronizationStateStore,
    private readonly stateContext?: StateLoadContext,
  ) {}

  async executeOperation(operation: PlannedOperation): Promise<CoordinatedExecutionResult> {
    const loaded = await this.authorityStore.loadAuthority();
    if (loaded.status === "uninitialized") return { status: "recovery-required", reason: "authoritative synchronization metadata is uninitialized" };
    if (loaded.status === "recovery-required") return { status: "recovery-required", reason: "authoritative synchronization metadata requires recovery" };

    let mappings: readonly RemoteObjectMapping[] = [];
    if (operation.preconditions.some(precondition => precondition.kind === "identity-unambiguous")) {
      if (!this.identityStateStore || !this.stateContext) return { status: "recovery-required", reason: "trusted remote identity mapping state is unavailable" };
      const identityState = await this.identityStateStore.load(this.stateContext);
      if (identityState.status !== "trusted") return { status: "recovery-required", reason: "trusted remote identity mapping state is unavailable" };
      mappings = identityState.state.remoteMappings;
    }

    const resolved = resolveAuthorityCompleteOperation(operation, loaded.state, mappings);
    if (resolved.status !== "ready") return { status: "recovery-required", reason: resolved.reason };

    const validation = await this.executor.validatePreconditions(resolved.operation);
    const invalid = this.mapAuthoritativeValidation(validation);
    if (invalid) return invalid;

    const execution = await this.executor.execute(resolved.operation);
    if (execution.status !== "durable-verified-success") return this.mapAuthoritativeExecution(execution);

    const commit = await this.committer.commitVerifiedSuccess(resolved.operation, execution.receipt, loaded.state.persistenceRevision);
    if (commit.status === "committed") return { status: "committed", commit };
    if (commit.status === "stale-state") return { status: "stale-state", actualRevision: commit.actualRevision };
    return { status: "recovery-required", reason: commit.reason };
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
