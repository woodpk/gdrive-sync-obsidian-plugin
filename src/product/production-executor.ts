import type {
  ContentEvidence,
  DriveSignal,
  ExecutionResult,
  GoogleDrivePort,
  LocalVaultPort,
  ManagedRemoteIdentity,
  OperationPrecondition,
  PlannedOperation,
  PreconditionValidationResult,
  StateLoadContext,
  SynchronizationExecutor,
  SynchronizationStateStore,
  VerifiedExecutionReceipt,
} from "../contracts";

function evidenceMatches(actual: ContentEvidence | undefined, expected: ContentEvidence): boolean {
  if (expected.hash) return actual?.hash === expected.hash;
  if (expected.revision) return actual?.revision === expected.revision;
  if (expected.sizeBytes !== undefined) return actual?.sizeBytes === expected.sizeBytes;
  return true;
}
function signalMessage(signal: DriveSignal): string { return "detail" in signal && signal.detail ? signal.detail : signal.kind; }
function success(operation: PlannedOperation, evidence?: ContentEvidence, ref?: string): ExecutionResult {
  const receipt: VerifiedExecutionReceipt = { operationId: operation.operationId, durable: true, integrityVerified: true, evidence, verificationEvidenceRef: ref };
  return { status: "durable-verified-success", receipt };
}

export interface ExecutorRunEvidence {
  readonly managedRemote: ManagedRemoteIdentity;
  readonly remoteEnumerationComplete: boolean;
}

export class ProductSynchronizationExecutor implements SynchronizationExecutor {
  constructor(
    private readonly local: LocalVaultPort,
    private readonly drive: GoogleDrivePort,
    private readonly state: SynchronizationStateStore,
    private readonly stateContext: StateLoadContext,
    private readonly runEvidence: () => ExecutorRunEvidence,
  ) {}

  async validatePreconditions(operation: PlannedOperation): Promise<PreconditionValidationResult> {
    const failed: OperationPrecondition[] = [];
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-trusted") {
        const loaded = await this.state.load(this.stateContext);
        if (loaded.status !== "trusted") return { status: "recovery-required", reason: "trusted synchronization base is unavailable" };
      } else if (precondition.kind === "remote-enumeration-complete") {
        if (!this.runEvidence().remoteEnumerationComplete) return { status: "blocked", reason: "remote enumeration is not complete" };
      } else if (precondition.kind === "identity-unambiguous") {
        continue;
      } else if (precondition.kind === "path-observation") {
        if (precondition.side === "local") {
          const observed = await this.local.observe(precondition.path);
          if (observed.status !== precondition.expected || (precondition.observationToken && observed.status === "present" && observed.observationToken !== precondition.observationToken)) failed.push(precondition);
        } else {
          const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, precondition.path);
          if (!observed.ok) return this.mapDrivePreconditionFailure(observed.signal);
          if (observed.value.status !== precondition.expected) failed.push(precondition);
        }
      } else if (precondition.kind === "content-evidence") {
        if (precondition.side === "local") {
          const observed = await this.local.observe(precondition.path);
          if (observed.status !== "present" || !evidenceMatches(observed.content, precondition.expected)) failed.push(precondition);
        } else {
          const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, precondition.path);
          if (!observed.ok) return this.mapDrivePreconditionFailure(observed.signal);
          if (observed.value.status !== "present" || !evidenceMatches(observed.value.content, precondition.expected)) failed.push(precondition);
        }
      } else if (precondition.kind === "file-stable") {
        const observed = await this.local.observe(precondition.path);
        if (observed.status !== "present" || observed.stability !== "stable") failed.push(precondition);
      } else if (precondition.kind === "remote-object") {
        const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
        if (!observed.ok) return this.mapDrivePreconditionFailure(observed.signal);
        if (observed.value.status !== "present" || observed.value.remoteObjectId !== precondition.remoteObjectId || (precondition.expectedRevision && observed.value.content?.revision !== precondition.expectedRevision)) failed.push(precondition);
      }
    }
    return failed.length ? { status: "stale", failed } : { status: "valid" };
  }

  async execute(operation: PlannedOperation): Promise<ExecutionResult> {
    try {
      switch (operation.kind) {
        case "noop": return success(operation, operation.contentVersion?.content, `noop:${String(operation.operationId)}`);
        case "upload-create":
          return { status: "blocking-failure", reason: "upload-create is fail-closed because the frozen VerifiedExecutionReceipt cannot carry the new Drive object ID into authoritative state" };
        case "upload-update": return await this.uploadUpdate(operation);
        case "download-create": return await this.downloadCreate(operation);
        case "download-update": return await this.downloadUpdate(operation);
        case "identity-preserving-move": return await this.move(operation);
        case "trash-local":
          await this.local.trash(operation.path);
          return success(operation, undefined, `local-trash:${String(operation.path)}`);
        case "trash-remote": {
          if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote trash requires stable remote object identity" };
          const result = await this.drive.trash(operation.remoteObjectId);
          return result.ok ? success(operation, undefined, `remote-trash:${String(operation.remoteObjectId)}`) : this.mapDriveFailure(result.signal);
        }
        case "clean-text-merge":
          return { status: "blocking-failure", reason: "clean-text-merge content cannot be materialized from the frozen PlannedOperation contract; merged bytes are not carried by the Phase 2 plan" };
        case "unresolved-conflict":
        case "blocked-unsafe":
          return { status: "blocking-failure", reason: `${operation.kind} cannot mutate content` };
        case "recovery-required":
          return { status: "recovery-required", reason: "recovery-required operation cannot mutate content" };
      }
    } catch (error) {
      return { status: "blocking-failure", reason: error instanceof Error ? error.message : String(error) };
    }
  }

  private async uploadUpdate(operation: PlannedOperation): Promise<ExecutionResult> {
    if (!operation.remoteObjectId || !operation.contentVersion) return { status: "blocking-failure", reason: "upload-update requires remote identity and content version" };
    const local = await this.local.readFile(operation.path, operation.contentVersion.observationToken);
    const result = await this.drive.update({ remoteObjectId: operation.remoteObjectId, path: operation.path, content: local.content, expectedEvidence: local.evidence });
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
    if (!observed.ok || observed.value.status !== "present" || observed.value.remoteObjectId !== operation.remoteObjectId) return { status: "uncertain", reason: "updated object could not be re-observed by stable identity" };
    return success(operation, observed.value.content ?? result.value.evidence ?? local.evidence, `remote:${String(operation.remoteObjectId)}`);
  }

  private async downloadCreate(operation: PlannedOperation): Promise<ExecutionResult> {
    const remoteObjectId = operation.contentVersion?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId || !operation.contentVersion) return { status: "blocking-failure", reason: "download-create requires remote identity and version" };
    if (operation.contentVersion.entityKind === "folder") {
      const receipt = await this.local.createFolder(operation.path);
      return success(operation, receipt.evidence, `local:${String(operation.path)}`);
    }
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    const receipt = await this.local.createFile(operation.path, downloaded.value.content);
    const observed = await this.local.observe(operation.path);
    if (observed.status !== "present") return { status: "uncertain", reason: "downloaded local file could not be re-observed" };
    return success(operation, observed.content ?? receipt.evidence ?? downloaded.value.evidence, `local:${String(operation.path)}`);
  }

  private async downloadUpdate(operation: PlannedOperation): Promise<ExecutionResult> {
    const remoteObjectId = operation.contentVersion?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId) return { status: "blocking-failure", reason: "download-update requires remote identity" };
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    const existing = await this.local.observe(operation.path);
    const expectedToken = existing.status === "present" ? existing.observationToken : undefined;
    const receipt = await this.local.replaceFile(operation.path, downloaded.value.content, expectedToken);
    const observed = await this.local.observe(operation.path);
    if (observed.status !== "present") return { status: "uncertain", reason: "replaced local file could not be re-observed" };
    return success(operation, observed.content ?? receipt.evidence ?? downloaded.value.evidence, `local:${String(operation.path)}`);
  }

  private async move(operation: PlannedOperation): Promise<ExecutionResult> {
    if (!operation.fromPath || !operation.toPath || !operation.targetSide) return { status: "blocking-failure", reason: "identity-preserving move requires explicit side and paths" };
    const compatibility = await this.local.validatePath(operation.toPath);
    if (compatibility.status === "blocked") return { status: "blocking-failure", reason: compatibility.detail ?? compatibility.reason };
    if (operation.targetSide === "local") {
      const receipt = await this.local.move(operation.fromPath, operation.toPath);
      return success(operation, receipt.evidence, `local-move:${String(operation.toPath)}`);
    }
    if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote move requires stable remote identity" };
    const result = await this.drive.move(operation.remoteObjectId, operation.fromPath, operation.toPath);
    if (!result.ok) return this.mapDriveFailure(result.signal);
    return success(operation, result.value.evidence, `remote-move:${String(operation.remoteObjectId)}`);
  }

  private mapDrivePreconditionFailure(signal: DriveSignal): PreconditionValidationResult {
    if (signal.kind === "authentication-required") return { status: "blocked", reason: signalMessage(signal) };
    if (signal.kind === "recovery-required" || signal.kind === "not-found") return { status: "recovery-required", reason: signalMessage(signal) };
    return { status: "blocked", reason: signalMessage(signal) };
  }

  private mapDriveFailure(signal: DriveSignal): ExecutionResult {
    if (signal.kind === "transient-failure") return { status: "retryable-failure", reason: signalMessage(signal) };
    if (signal.kind === "rate-limited") return { status: "retryable-failure", reason: signal.kind, retryAfterMs: signal.retryAfterMs };
    if (signal.kind === "recovery-required" || signal.kind === "not-found") return { status: "recovery-required", reason: signalMessage(signal) };
    return { status: "blocking-failure", reason: signalMessage(signal) };
  }
}
