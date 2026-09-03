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
  StateRevision,
  SynchronizationAuthorityMetadataV1_1,
  SynchronizationAuthorityStoreV1_1,
  SynchronizationStateStore,
  TrustedSynchronizationState,
  VerifiedExecutionReceipt,
} from "../contracts";
import { DurableEffectLifecycleCoordinator } from "../product/operation-isolation";
import type {
  AuthorityResolutionResult,
  CoordinatedExecutionResult,
  ExecutionLifecycleObserver,
} from "./execution-coordinator-base";

export * from "./execution-coordinator-base";

function baseAuthorityPath(operation: PlannedOperation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
}

function operationRequiresIdentityAuthority(operation: PlannedOperation): boolean {
  return ["upload-update", "trash-remote", "identity-preserving-move", "clean-text-merge"].includes(operation.kind);
}

function identityAuthorityPath(operation: PlannedOperation) {
  return operation.kind === "identity-preserving-move" && operation.fromPath ? operation.fromPath : operation.path;
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
  return mapping
    && mapping.remoteObjectId === expectedRemoteObjectId
    && byId[0]?.path === path
    && byId[0]?.remoteObjectId === mapping.remoteObjectId
    ? mapping
    : undefined;
}

function physicalOperation(operation: PlannedOperation): boolean {
  return [
    "upload-create",
    "upload-update",
    "download-create",
    "download-update",
    "identity-preserving-move",
    "clean-text-merge",
    "trash-local",
    "trash-remote",
  ].includes(operation.kind);
}

function exactContentMatches(
  actual: TrustedSynchronizationState["base"][number]["content"],
  expected: VerifiedExecutionReceipt["evidence"],
): boolean {
  if (!expected) return true;
  if (!actual) return false;
  if (expected.hash !== undefined && actual.hash !== expected.hash) return false;
  if (expected.sizeBytes !== undefined && actual.sizeBytes !== expected.sizeBytes) return false;
  return true;
}

/**
 * Prove that this exact durable physical receipt has already crossed the
 * canonical synchronization-state boundary. The completed journal binds the
 * operation to the durable aggregate verification reference; the state-shape
 * checks prevent a journal marker alone from authorizing replay suppression.
 */
function exactCanonicalCommitAlreadyApplied(
  state: TrustedSynchronizationState,
  operation: ExecutablePlannedOperation,
  receipt: VerifiedExecutionReceipt,
): boolean {
  if (!receipt.verificationEvidenceRef) return false;
  const journal = state.operations.find(entry => entry.operationId === operation.operationId);
  if (!journal
    || journal.status !== "completed"
    || journal.path !== operation.path
    || journal.verificationEvidenceRef !== receipt.verificationEvidenceRef) return false;

  const expectedEvidence = receipt.evidence ?? operation.contentVersion?.content;
  const resultingRemoteObjectId = receipt.resultingRemoteObjectId
    ?? operation.remoteObjectId
    ?? operation.contentVersion?.remoteObjectId;

  if (["upload-create", "upload-update", "download-create", "download-update", "clean-text-merge"].includes(operation.kind)) {
    const entries = state.base.filter(entry => entry.path === operation.path);
    if (entries.length !== 1) return false;
    const entry = entries[0]!;
    const entityKind = operation.contentVersion?.entityKind ?? entry.entityKind;
    const localOnlyConflictCopy = operation.kind === "download-create"
      && operation.contentVersion !== undefined
      && operation.path !== operation.contentVersion.path;
    if (entry.entityKind !== entityKind || entry.localExisted !== true || entry.remoteExisted !== !localOnlyConflictCopy) return false;
    if (!exactContentMatches(entry.content, expectedEvidence)) return false;
    if (localOnlyConflictCopy) return entry.remoteObjectId === undefined && state.remoteMappings.every(mapping => mapping.path !== operation.path);
    if (!resultingRemoteObjectId || entry.remoteObjectId !== resultingRemoteObjectId) return false;
    const byPath = state.remoteMappings.filter(mapping => mapping.path === operation.path);
    const byId = state.remoteMappings.filter(mapping => mapping.remoteObjectId === resultingRemoteObjectId);
    return byPath.length === 1
      && byId.length === 1
      && byPath[0]?.remoteObjectId === resultingRemoteObjectId
      && byId[0]?.path === operation.path
      && byPath[0]?.entityKind === entityKind;
  }

  if (operation.kind === "identity-preserving-move" && operation.fromPath && operation.toPath) {
    if (!resultingRemoteObjectId) return false;
    if (state.base.some(entry => entry.path === operation.fromPath)) return false;
    if (state.remoteMappings.some(mapping => mapping.path === operation.fromPath)) return false;
    const targetBase = state.base.filter(entry => entry.path === operation.toPath);
    const targetMapping = state.remoteMappings.filter(mapping => mapping.path === operation.toPath || mapping.remoteObjectId === resultingRemoteObjectId);
    return targetBase.length === 1
      && targetBase[0]?.remoteObjectId === resultingRemoteObjectId
      && targetMapping.length === 1
      && targetMapping[0]?.path === operation.toPath
      && targetMapping[0]?.remoteObjectId === resultingRemoteObjectId;
  }

  if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (state.base.some(entry => entry.path === operation.path)) return false;
    if (state.remoteMappings.some(mapping => mapping.path === operation.path)) return false;
    const expectedDeletedOn = operation.kind === "trash-remote" ? "local" : "remote";
    const tombstones = state.tombstones.filter(entry => entry.path === operation.path && entry.deletedOn === expectedDeletedOn);
    if (tombstones.length !== 1) return false;
    return !resultingRemoteObjectId || tombstones[0]?.remoteObjectId === resultingRemoteObjectId;
  }

  return false;
}

/** Replace compatibility-only planner markers with independently established exact frozen authority. */
export function resolveAuthorityCompleteOperation(
  operation: PlannedOperation,
  authority: SynchronizationAuthorityMetadataV1_1,
  trustedRemoteMappings: readonly RemoteObjectMapping[] = [],
): AuthorityResolutionResult {
  const preconditions: ExecutableOperationPrecondition[] = [];
  const requiresIdentity = operationRequiresIdentityAuthority(operation);
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
      continue;
    }
    if (requiresIdentity && precondition.kind === "identity-authority") {
      continue;
    }
    preconditions.push(precondition);
  }

  if (requiresIdentity) {
    const expectedRemoteObjectId = operation.remoteObjectId ?? operation.contentVersion?.remoteObjectId;
    const authorityPath = identityAuthorityPath(operation);
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
  }

  return { status: "ready", operation: { ...operation, authorityComplete: true, preconditions } };
}

/**
 * Authority-complete production boundary. The executor owns durable physical
 * intent/dispatch/verification; this coordinator alone owns the transition from
 * verified physical effects into canonical BASE/state, and only after that
 * canonical CAS succeeds may durable effects advance to state-committed.
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
    if (!this.identityStateStore || !this.stateContext) {
      return this.complete(operation, { status: "recovery-required", reason: "trusted canonical synchronization state is unavailable for exact commit CAS" });
    }

    const canonicalAtStart = await this.identityStateStore.load(this.stateContext);
    if (canonicalAtStart.status !== "trusted") {
      return this.complete(operation, { status: "recovery-required", reason: "trusted canonical synchronization state is unavailable for exact commit CAS" });
    }
    const expectedStateRevision: StateRevision = canonicalAtStart.state.stateRevision;
    const mappings = operationRequiresIdentityAuthority(operation)
      ? canonicalAtStart.state.remoteMappings
      : [];

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

      const canonicalNow = await this.identityStateStore.load(this.stateContext);
      if (canonicalNow.status !== "trusted") {
        return this.complete(executable, { status: "recovery-required", reason: "canonical state became unavailable after physical verification" });
      }
      const priorCanonicalCommit = physicalOperation(executable)
        && exactCanonicalCommitAlreadyApplied(canonicalNow.state, executable, execution.receipt);

      if (priorCanonicalCommit) {
        this.observe(executable, "state-commit-start", "already-committed");
        const finalized = await this.finalizeDurableEffects(executable);
        if (!finalized.ok) {
          this.observe(executable, "state-commit-failed", "durable-finalization-failed");
          return this.complete(executable, { status: "recovery-required", reason: finalized.reason });
        }
        const commit: CommitResult = { status: "committed", newStateRevision: canonicalNow.state.stateRevision };
        this.observe(executable, "state-commit-complete", "already-committed");
        return this.complete(executable, { status: "committed", commit });
      }

      if (physicalOperation(executable)) {
        const readiness = await this.authorityStore.loadAuthority();
        if (readiness.status !== "trusted") {
          return this.complete(executable, { status: "recovery-required", reason: "durable effect authority unavailable before canonical state commit" });
        }
        const intent = readiness.state.operationIntents.find(value => value.operationId === executable.operationId);
        if (!intent) return this.complete(executable, { status: "recovery-required", reason: "durable physical intent missing before canonical state commit" });
        if (intent.effects.some(effect => effect.stage === "state-committed")) {
          return this.complete(executable, { status: "recovery-required", reason: "state-committed durable marker lacks exact prior canonical commit proof" });
        }
        if (!intent.effects.every(effect => effect.stage === "effect-verified" && Boolean(effect.verificationEvidenceRef))) {
          return this.complete(executable, { status: "recovery-required", reason: "canonical state commit requires every durable physical effect to remain effect-verified" });
        }
      }

      this.observe(executable, "state-commit-start");
      let commit: CommitResult;
      try { commit = await this.committer.commitVerifiedSuccess(executable, execution.receipt, expectedStateRevision); }
      catch (error) { this.observe(executable, "state-commit-failed", "threw", error); throw error; }
      this.observe(executable, "state-commit-complete", commit.status);
      if (commit.status === "committed") {
        const finalized = await this.finalizeDurableEffects(executable);
        if (!finalized.ok) {
          this.observe(executable, "state-commit-failed", "durable-finalization-failed");
          return this.complete(executable, { status: "recovery-required", reason: finalized.reason });
        }
        return this.complete(executable, { status: "committed", commit });
      }
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

  private async finalizeDurableEffects(operation: ExecutablePlannedOperation): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
    if (!physicalOperation(operation)) return { ok: true };
    const lifecycle = new DurableEffectLifecycleCoordinator(this.authorityStore);
    const loaded = await lifecycle.loadAuthority();
    if (loaded.status !== "trusted") return { ok: false, reason: loaded.reason };
    const intent = loaded.state.operationIntents.find(value => value.operationId === operation.operationId);
    if (!intent) return { ok: false, reason: "canonical state committed but durable physical intent is missing" };
    for (const effect of intent.effects) {
      if (effect.stage === "state-committed") continue;
      if (effect.stage !== "effect-verified" || !effect.verificationEvidenceRef) {
        return { ok: false, reason: `canonical state committed but durable effect ${effect.effectId} is ${effect.stage}` };
      }
      const finalized = await lifecycle.markEffectStateCommitted(String(operation.operationId), effect.effectId, effect.verificationEvidenceRef);
      if (finalized.status !== "state-committed") {
        return { ok: false, reason: `canonical state committed but durable effect ${effect.effectId} finalization failed (${finalized.status})` };
      }
    }
    return { ok: true };
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