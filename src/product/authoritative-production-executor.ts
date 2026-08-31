import type {
  AuthoritativeSynchronizationExecutor,
  AuthorityCompletePreconditionValidationResult,
  ExecutableOperationPrecondition,
  ExecutablePlannedOperation,
  ExecutionResult,
  ManagedRemoteIdentity,
  StateLoadContext,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
} from "../contracts";
import { exactBaseAuthorityMatches } from "../contracts";
import type { ProductSynchronizationExecutor } from "./production-executor";

/**
 * Production adapter for the frozen authority-complete executor seam.
 *
 * It deliberately reloads both authoritative metadata and trusted identity
 * mappings at the mutation boundary. Exact authority is therefore validated
 * independently of coordinator resolution and current remote reality is
 * re-observed before any legacy physical implementation is invoked.
 */
export function createAuthoritativeProductExecutor(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
): AuthoritativeSynchronizationExecutor {
  async function validateExact(
    operation: ExecutablePlannedOperation,
  ): Promise<AuthorityCompletePreconditionValidationResult> {
    const [authorityLoad, identityLoad] = await Promise.all([
      authorityStore.loadAuthority(),
      identityStateStore.load(stateContext),
    ]);
    if (authorityLoad.status !== "trusted") {
      return { status: "recovery-required", reason: "current authoritative synchronization metadata is unavailable" };
    }
    if (identityLoad.status !== "trusted") {
      return { status: "recovery-required", reason: "current trusted remote identity mapping state is unavailable" };
    }

    const failed: ExecutableOperationPrecondition[] = [];
    const authority: SynchronizationAuthorityMetadataV1_1 = authorityLoad.state;
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-authority") {
        const current = authority.pathConvergence.find(entry => entry.path === precondition.authority.path)?.state;
        if (!current || current.status !== "converged") { failed.push(precondition); continue; }
        const actual = {
          generation: current.generation,
          path: precondition.authority.path,
          fingerprint: current.baseFingerprint,
        };
        if (authority.semanticGeneration !== current.generation || !exactBaseAuthorityMatches(precondition.authority, actual)) failed.push(precondition);
        continue;
      }
      if (precondition.kind === "identity-authority") {
        const proof = precondition.proof;
        const currentPath = authority.pathConvergence.find(entry => entry.path === proof.path)?.state;
        const byPath = identityLoad.state.remoteMappings.filter(mapping => mapping.path === proof.path);
        const byId = identityLoad.state.remoteMappings.filter(mapping => mapping.remoteObjectId === proof.remoteObjectId);
        const mapping = byPath.length === 1 && byId.length === 1 && byPath[0] === byId[0] ? byPath[0] : undefined;
        if (!mapping || !currentPath || currentPath.status !== "converged" || currentPath.generation !== authority.semanticGeneration || proof.generation !== authority.semanticGeneration) {
          failed.push(precondition);
          continue;
        }
        const remoteObservationPath = operation.kind === "identity-preserving-move" && operation.targetSide === "local" && operation.toPath
          ? operation.toPath
          : mapping.path;
        const currentRemote = await legacy.versionStillCurrent("remote", {
          path: remoteObservationPath,
          entityKind: mapping.entityKind,
          remoteObjectId: mapping.remoteObjectId,
        }, managedRemote);
        if (!currentRemote) failed.push(precondition);
      }
    }
    if (failed.length) return { status: "stale", failed };

    const ordinary = await legacy.validatePreconditions(operation);
    if (ordinary.status === "valid") return { status: "valid" };
    if (ordinary.status === "stale") {
      const executableFailed = ordinary.failed.filter(
        (value): value is ExecutableOperationPrecondition => value.kind !== "base-trusted" && value.kind !== "identity-unambiguous",
      );
      return { status: "stale", failed: executableFailed };
    }
    return ordinary;
  }

  return {
    validatePreconditions: validateExact,
    async execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult> {
      const validation = await validateExact(operation);
      if (validation.status === "stale") return { status: "stale-precondition", reason: "exact authority changed at the production mutation boundary", failed: validation.failed };
      if (validation.status === "blocked") return { status: "blocking-failure", reason: validation.reason };
      if (validation.status === "recovery-required") return { status: "recovery-required", reason: validation.reason };
      return legacy.execute(operation);
    },
  };
}
