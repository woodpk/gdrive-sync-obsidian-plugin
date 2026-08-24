import type {
  ContentEvidence,
  DriveSignal,
  ExecutionResult,
  GoogleDrivePort,
  LocalVaultPort,
  ManagedRemoteIdentity,
  ObservationToken,
  OperationPrecondition,
  PlannedOperation,
  PreconditionValidationResult,
  RemoteObjectId,
  StateLoadContext,
  SyncSide,
  SynchronizationExecutor,
  SynchronizationStateStore,
  VaultPath,
  VerifiedExecutionReceipt,
  VersionReference,
} from "../contracts";
import { isSafelyRecognizedTextPath } from "../core/conflict-resolver";
import type { ProductTextVersionStore } from "./text-version-store";

function evidenceMatches(actual: ContentEvidence | undefined, expected: ContentEvidence | undefined): boolean {
  if (!expected) return true;
  if (expected.hash) return actual?.hash === expected.hash;
  if (expected.revision) return actual?.revision === expected.revision;
  return false;
}
function signalMessage(signal: DriveSignal): string {
  const detail = "detail" in signal && signal.detail ? signal.detail : signal.kind;
  return signal.kind === "authentication-required" ? `authentication-required:${detail}` : detail;
}
function success(operation: PlannedOperation, evidence?: ContentEvidence, ref?: string, resultingRemoteObjectId?: RemoteObjectId): ExecutionResult {
  const receipt: VerifiedExecutionReceipt = { operationId: operation.operationId, durable: true, integrityVerified: true, evidence, resultingRemoteObjectId, verificationEvidenceRef: ref };
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
    private readonly textVersions?: ProductTextVersionStore,
  ) {}

  async validatePreconditions(operation: PlannedOperation): Promise<PreconditionValidationResult> {
    const failed: OperationPrecondition[] = [];
    const moveRemoteObservationPath = operation.kind === "identity-preserving-move" && operation.targetSide === "remote" && operation.fromPath ? operation.fromPath : undefined;
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
          const remotePath = moveRemoteObservationPath && precondition.path === operation.fromPath ? moveRemoteObservationPath : precondition.path;
          const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, remotePath);
          if (!observed.ok) return this.mapDrivePreconditionFailure(observed.signal);
          if (observed.value.status !== "present" || !evidenceMatches(observed.value.content, precondition.expected)) failed.push(precondition);
        }
      } else if (precondition.kind === "file-stable") {
        const observed = await this.local.observe(precondition.path);
        if (observed.status !== "present" || observed.stability !== "stable") failed.push(precondition);
      } else if (precondition.kind === "remote-object") {
        const remoteObjectPath = moveRemoteObservationPath
          ?? (operation.contentVersion?.remoteObjectId === precondition.remoteObjectId ? operation.contentVersion.path : operation.path);
        const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, remoteObjectPath);
        if (!observed.ok) return this.mapDrivePreconditionFailure(observed.signal);
        if (observed.value.status !== "present" || observed.value.remoteObjectId !== precondition.remoteObjectId || (precondition.expectedRevision && observed.value.content?.revision !== precondition.expectedRevision)) failed.push(precondition);
      }
    }
    return failed.length ? { status: "stale", failed } : { status: "valid" };
  }

  async versionStillCurrent(side: SyncSide, version: VersionReference, remote: ManagedRemoteIdentity): Promise<boolean> {
    if (side === "local") {
      const observed = await this.local.observe(version.path);
      return observed.status === "present" && observed.entityKind === version.entityKind && evidenceMatches(observed.content, version.content) && (!version.observationToken || observed.observationToken === version.observationToken);
    }
    const observed = await this.drive.observe(remote.rootId, version.path);
    return observed.ok && observed.value.status === "present" && observed.value.entityKind === version.entityKind && (!version.remoteObjectId || observed.value.remoteObjectId === version.remoteObjectId) && evidenceMatches(observed.value.content, version.content);
  }

  async currentLocalVersion(path: VaultPath): Promise<VersionReference | undefined> {
    const observed = await this.local.observe(path);
    if (observed.status !== "present" || observed.stability !== "stable") return undefined;
    return { path: observed.path, entityKind: observed.entityKind, content: observed.content, observationToken: observed.observationToken };
  }

  async localPathState(path: VaultPath): Promise<"absent" | "present" | "blocked"> {
    const observed = await this.local.observe(path);
    if (observed.status === "absent") return "absent";
    if (observed.status === "present") return "present";
    return "blocked";
  }

  failureScope(_operation: PlannedOperation, reason: string): "path" | "global" {
    return reason.startsWith("path-local:") ? "path" : "global";
  }

  async execute(operation: PlannedOperation): Promise<ExecutionResult> {
    try {
      const boundary = await this.validatePreconditions(operation);
      if (boundary.status === "stale") return { status: "stale-precondition", reason: "planned versions changed after pending journal; mutation refused" };
      if (boundary.status === "blocked") return { status: "blocking-failure", reason: boundary.reason };
      if (boundary.status === "recovery-required") return { status: "recovery-required", reason: boundary.reason };

      switch (operation.kind) {
        case "noop": {
          if (operation.reasons.some(reason => reason.code === "safe-union-identical") && operation.contentVersion && this.textVersions && isSafelyRecognizedTextPath(operation.contentVersion.path)) {
            if (!await this.textVersions.retainVersion(operation.contentVersion)) return { status: "blocking-failure", reason: "recognized-text first-sync BASE could not be materialized exactly" };
          }
          return success(operation, operation.contentVersion?.content, `noop:${String(operation.operationId)}`);
        }
        case "upload-create": return await this.uploadCreate(operation);
        case "upload-update": return await this.uploadUpdate(operation);
        case "download-create": return await this.downloadCreate(operation);
        case "download-update": return await this.downloadUpdate(operation);
        case "identity-preserving-move": return await this.move(operation);
        case "trash-local": await this.local.trash(operation.path); return success(operation, undefined, `local-trash:${String(operation.path)}`);
        case "trash-remote": {
          if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote trash requires stable remote object identity" };
          const result = await this.drive.trash(operation.remoteObjectId);
          return result.ok ? success(operation, undefined, `remote-trash:${String(operation.remoteObjectId)}`) : this.mapDriveFailure(result.signal);
        }
        case "clean-text-merge": return await this.cleanTextMerge(operation);
        case "unresolved-conflict":
        case "blocked-unsafe": return { status: "blocking-failure", reason: `path-local:${operation.kind} cannot mutate content` };
        case "recovery-required": return { status: "recovery-required", reason: "recovery-required operation cannot mutate content" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const pathLocal = /Blocked local path|invalid-name|reserved-name|case-collision|unicode-collision|path-too-long|unsupported-object/i.test(message);
      return { status: "blocking-failure", reason: pathLocal ? `path-local:${message}` : message };
    }
  }

  private plannedLocalToken(operation: PlannedOperation, path = operation.path): ObservationToken | undefined {
    const value = operation.preconditions.find((precondition): precondition is Extract<OperationPrecondition, { kind: "path-observation" }> => precondition.kind === "path-observation" && precondition.side === "local" && precondition.path === path && precondition.expected === "present");
    return value?.observationToken as ObservationToken | undefined;
  }
  private expectedRemoteRevision(operation: PlannedOperation): string | undefined {
    return operation.preconditions.find((precondition): precondition is Extract<OperationPrecondition, { kind: "remote-object" }> => precondition.kind === "remote-object" && (!operation.remoteObjectId || precondition.remoteObjectId === operation.remoteObjectId))?.expectedRevision;
  }
  private async ensureLocalTargetCompatible(path: VaultPath): Promise<ExecutionResult | undefined> {
    const compatibility = await this.local.validatePath(path);
    return compatibility.status === "blocked" ? { status: "blocking-failure", reason: `path-local:${compatibility.detail ?? compatibility.reason}` } : undefined;
  }

  private async uploadCreate(operation: PlannedOperation): Promise<ExecutionResult> {
    const version = operation.contentVersion;
    if (!version) return { status: "blocking-failure", reason: "upload-create requires a planned content version" };
    if (version.entityKind === "folder") {
      const result = await this.drive.create(this.runEvidence().managedRemote.rootId, { path: operation.path, entityKind: "folder" });
      if (!result.ok) return this.mapDriveFailure(result.signal);
      const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
      if (!observed.ok || observed.value.status !== "present" || observed.value.remoteObjectId !== result.value.remoteObjectId || observed.value.entityKind !== "folder") return { status: "uncertain", reason: "created remote folder could not be re-observed by its allocated stable identity" };
      return success(operation, observed.value.content ?? result.value.evidence, `remote-create:${String(result.value.remoteObjectId)}`, result.value.remoteObjectId);
    }
    const local = await this.local.readFile(version.path, version.observationToken);
    if (!evidenceMatches(local.evidence, version.content)) return { status: "stale-precondition", reason: "planned local upload-create source content changed before transfer" };
    const content = this.textVersions?.capture(version, local.content) ?? local.content;
    const result = await this.drive.create(this.runEvidence().managedRemote.rootId, { path: operation.path, entityKind: "file", content, expectedEvidence: version.content ?? local.evidence });
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
    if (!observed.ok || observed.value.status !== "present" || observed.value.remoteObjectId !== result.value.remoteObjectId) return { status: "uncertain", reason: "created remote file could not be re-observed by its allocated stable identity" };
    const finalEvidence = observed.value.content ?? result.value.evidence;
    if (!evidenceMatches(finalEvidence, version.content)) return { status: "uncertain", reason: "created remote file evidence does not match the planned stable source" };
    if (this.textVersions && isSafelyRecognizedTextPath(version.path)) {
      const finalVersion: VersionReference = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId: result.value.remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "created recognized-text version could not be retained as future BASE" };
    }
    return success(operation, finalEvidence, `remote-create:${String(result.value.remoteObjectId)}`, result.value.remoteObjectId);
  }

  private async uploadUpdate(operation: PlannedOperation): Promise<ExecutionResult> {
    if (!operation.remoteObjectId || !operation.contentVersion) return { status: "blocking-failure", reason: "upload-update requires remote identity and content version" };
    const version = operation.contentVersion;
    const local = await this.local.readFile(version.path, version.observationToken);
    if (!evidenceMatches(local.evidence, version.content)) return { status: "stale-precondition", reason: "planned local upload-update source content changed before transfer" };
    const content = this.textVersions?.capture(version, local.content) ?? local.content;
    const result = await this.drive.update({ remoteObjectId: operation.remoteObjectId, path: operation.path, content, expectedEvidence: version.content ?? local.evidence, expectedRemoteRevision: this.expectedRemoteRevision(operation) });
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
    if (!observed.ok || observed.value.status !== "present" || observed.value.remoteObjectId !== operation.remoteObjectId) return { status: "uncertain", reason: "updated object could not be re-observed by stable identity" };
    const finalEvidence = observed.value.content ?? result.value.evidence;
    if (!evidenceMatches(finalEvidence, version.content)) return { status: "uncertain", reason: "updated remote content does not match canonical planned source evidence" };
    if (this.textVersions && isSafelyRecognizedTextPath(version.path)) {
      const finalVersion: VersionReference = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId: operation.remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "updated recognized-text version could not be retained as future BASE" };
    }
    return success(operation, finalEvidence, `remote:${String(operation.remoteObjectId)}`);
  }

  private async downloadCreate(operation: PlannedOperation): Promise<ExecutionResult> {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId || !version) return { status: "blocking-failure", reason: "download-create requires remote identity and version" };
    const blocked = await this.ensureLocalTargetCompatible(operation.path); if (blocked) return blocked;
    if (version.entityKind === "folder") {
      const receipt = await this.local.createFolder(operation.path);
      return success(operation, receipt.evidence, `local:${String(operation.path)}`);
    }
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    if (!evidenceMatches(downloaded.value.evidence, version.content)) return { status: "stale-precondition", reason: "planned remote download-create source content changed before transfer" };
    const content = this.textVersions?.capture(version, downloaded.value.content) ?? downloaded.value.content;
    const receipt = await this.local.createFile(operation.path, content);
    const observed = await this.local.observe(operation.path);
    if (observed.status !== "present" || !evidenceMatches(observed.content, version.content)) return { status: "uncertain", reason: "downloaded local file could not be verified against canonical remote evidence" };
    const finalEvidence = observed.content ?? receipt.evidence;
    if (this.textVersions && isSafelyRecognizedTextPath(operation.path)) {
      const finalVersion: VersionReference = { path: operation.path, entityKind: "file", content: finalEvidence, observationToken: observed.observationToken };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "downloaded recognized-text version could not be retained as future BASE" };
    }
    return success(operation, finalEvidence, `local:${String(operation.path)}`);
  }

  private async downloadUpdate(operation: PlannedOperation): Promise<ExecutionResult> {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!remoteObjectId || !version) return { status: "blocking-failure", reason: "download-update requires remote identity and version" };
    const blocked = await this.ensureLocalTargetCompatible(operation.path); if (blocked) return blocked;
    const downloaded = await this.drive.download(remoteObjectId);
    if (!downloaded.ok) return this.mapDriveFailure(downloaded.signal);
    if (!evidenceMatches(downloaded.value.evidence, version.content)) return { status: "stale-precondition", reason: "planned remote download-update source content changed before transfer" };
    const expectedToken = this.plannedLocalToken(operation);
    const content = this.textVersions?.capture(version, downloaded.value.content) ?? downloaded.value.content;
    const receipt = await this.local.replaceFile(operation.path, content, expectedToken);
    const observed = await this.local.observe(operation.path);
    if (observed.status !== "present" || !evidenceMatches(observed.content, version.content)) return { status: "uncertain", reason: "replaced local file could not be verified against canonical remote evidence" };
    const finalEvidence = observed.content ?? receipt.evidence;
    if (this.textVersions && isSafelyRecognizedTextPath(operation.path)) {
      const finalVersion: VersionReference = { path: operation.path, entityKind: "file", content: finalEvidence, observationToken: observed.observationToken };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "replaced recognized-text version could not be retained as future BASE" };
    }
    return success(operation, finalEvidence, `local:${String(operation.path)}`);
  }

  private async cleanTextMerge(operation: PlannedOperation): Promise<ExecutionResult> {
    const version = operation.contentVersion;
    const remoteObjectId = operation.remoteObjectId ?? version?.remoteObjectId;
    if (!version || !remoteObjectId || version.entityKind !== "file" || !this.textVersions) return { status: "blocking-failure", reason: "clean-text-merge requires a materialized recognized-text version and stable remote identity" };
    const expectedLocalToken = this.plannedLocalToken(operation);
    if (!expectedLocalToken) return { status: "stale-precondition", reason: "clean merge lacks the exact planned local observation token" };
    const sourceLocal = await this.textVersions.sourceForRetained(version);
    const sourceRemote = await this.textVersions.sourceForRetained(version);
    if (!sourceLocal || !sourceRemote) return { status: "blocking-failure", reason: "clean merge materialization is unavailable or corrupt under its exact canonical evidence" };
    try {
      await this.local.replaceFile(operation.path, sourceLocal, expectedLocalToken);
      const localAfter = await this.local.observe(operation.path);
      if (localAfter.status !== "present" || !evidenceMatches(localAfter.content, version.content)) return { status: "uncertain", reason: "clean merge local result could not be verified against merged evidence" };
      const remoteResult = await this.drive.update({ remoteObjectId, path: operation.path, content: sourceRemote, expectedEvidence: version.content, expectedRemoteRevision: this.expectedRemoteRevision(operation) });
      if (!remoteResult.ok) return { status: "uncertain", reason: `clean merge local side was written but remote outcome was not durably verified: ${signalMessage(remoteResult.signal)}` };
      const remoteAfter = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.path);
      if (!remoteAfter.ok || remoteAfter.value.status !== "present" || remoteAfter.value.remoteObjectId !== remoteObjectId || !evidenceMatches(remoteAfter.value.content, version.content)) return { status: "uncertain", reason: "clean merge remote result could not be verified against merged evidence" };
      const finalEvidence = version.content;
      const finalVersion: VersionReference = { path: operation.path, entityKind: "file", content: finalEvidence, remoteObjectId };
      if (!await this.textVersions.aliasText(version, finalVersion)) return { status: "uncertain", reason: "verified clean merge could not be retained as future BASE" };
      return success(operation, finalEvidence, `clean-merge:${String(remoteObjectId)}`);
    } catch (error) {
      return { status: "uncertain", reason: `clean merge mutation may be partial: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  private async move(operation: PlannedOperation): Promise<ExecutionResult> {
    if (!operation.fromPath || !operation.toPath || !operation.targetSide) return { status: "blocking-failure", reason: "identity-preserving move requires explicit side and paths" };
    const compatibility = await this.local.validatePath(operation.toPath);
    if (compatibility.status === "blocked") return { status: "blocking-failure", reason: `path-local:${compatibility.detail ?? compatibility.reason}` };
    if (operation.targetSide === "local") {
      const receipt = await this.local.move(operation.fromPath, operation.toPath);
      const observed = await this.local.observe(operation.toPath);
      if (observed.status !== "present") return { status: "uncertain", reason: "local move destination could not be re-observed" };
      return success(operation, observed.content ?? receipt.evidence, `local-move:${String(operation.toPath)}`);
    }
    if (!operation.remoteObjectId) return { status: "blocking-failure", reason: "remote move requires stable remote identity" };
    const result = await this.drive.move(operation.remoteObjectId, operation.fromPath, operation.toPath);
    if (!result.ok) return this.mapDriveFailure(result.signal);
    const observed = await this.drive.observe(this.runEvidence().managedRemote.rootId, operation.toPath);
    if (!observed.ok || observed.value.status !== "present" || observed.value.remoteObjectId !== operation.remoteObjectId) return { status: "uncertain", reason: "remote move destination did not preserve the planned stable Drive identity" };
    return success(operation, observed.value.content ?? result.value.evidence, `remote-move:${String(operation.remoteObjectId)}`);
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
