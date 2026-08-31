import {
  contractId,
  exactBaseAuthorityMatches,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type AuthoritativeSynchronizationExecutor,
  type AuthorityCompletePreconditionValidationResult,
  type BinaryContentSource,
  type CanonicalFileContentProof,
  type ContentEvidence,
  type ExecutableOperationPrecondition,
  type ExecutablePlannedOperation,
  type ExecutionResult,
  type ExactBaseAuthority,
  type GoogleDrivePort,
  type IdentityAuthorityProof,
  type LocalFolderCreateObservation,
  type LocalMutationTransaction,
  type LocalMutationTransactionId,
  type LocalTransactionalMutationPort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type MutationIntentId,
  type ObservationToken,
  type RecoverableMutationEffectV1_1,
  type RecoverableOperationIntentV1_1,
  type RecoverablePhysicalMutationDescriptorV1_1,
  type ReliableRemoteMutationPort,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteFolderCreateRecoveryReadPort,
  type RemoteMutationOutcome,
  type RemoteObjectId,
  type RemoteRevisionId,
  type StateLoadContext,
  type SynchronizationAuthorityMetadataV1_1,
  type SynchronizationAuthorityStoreV1_1,
  type SynchronizationStateStore,
  type VaultPath,
  type VersionReference,
  type VerifiedExecutionReceipt,
} from "../contracts";
import { sha256Text } from "../util/sha256";
import { DurableEffectLifecycleCoordinator, type PhysicalEffectDispatchResult } from "./operation-isolation";
import type { ExecutorRunEvidence, ProductSynchronizationExecutor } from "./production-executor";
import type { ProductTextVersionStore } from "./text-version-store";

export interface RecoverableProductionMutationDependencies {
  readonly reliableRemoteMutationPort?: ReliableRemoteMutationPort;
  readonly localTransactionalMutationPort?: LocalTransactionalMutationPort;
  readonly remoteFolderCreateRecoveryReadPort?: RemoteFolderCreateRecoveryReadPort;
}

type LegacyReads = {
  readonly local: LocalVaultPort;
  readonly drive: GoogleDrivePort;
  readonly runEvidence: () => ExecutorRunEvidence;
  readonly textVersions?: ProductTextVersionStore;
};

type PreparedEffect = {
  readonly effect: RecoverableMutationEffectV1_1;
  readonly content?: BinaryContentSource;
  readonly localTransaction?: LocalMutationTransaction;
};

const cid = <T extends string>(value: string) => contractId<T>(value);
const mutationIntentId = (operation: ExecutablePlannedOperation) => cid<"MutationIntentId">(`intent:${String(operation.operationId)}`) as MutationIntentId;
const localTransactionId = (operation: ExecutablePlannedOperation, suffix: string) => cid<"LocalMutationTransactionId">(`local-tx:${String(operation.operationId)}:${suffix}`) as LocalMutationTransactionId;
const effectId = (operation: ExecutablePlannedOperation, suffix: string) => `effect:${String(operation.operationId)}:${suffix}`;
const internal = (legacy: ProductSynchronizationExecutor) => legacy as unknown as LegacyReads;

function canonical(evidence: ContentEvidence | undefined): CanonicalFileContentProof | undefined {
  if (!evidence?.hash) return undefined;
  return { algorithm: "sha256", hash: evidence.hash, sizeBytes: evidence.sizeBytes };
}

function baseAuthority(operation: ExecutablePlannedOperation): ExactBaseAuthority | undefined {
  return operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "base-authority" }> => value.kind === "base-authority")?.authority;
}

function identityAuthority(operation: ExecutablePlannedOperation): IdentityAuthorityProof | undefined {
  return operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "identity-authority" }> => value.kind === "identity-authority")?.proof;
}

function expectedRemoteRevision(operation: ExecutablePlannedOperation, remoteObjectId: RemoteObjectId): RemoteRevisionId | undefined {
  const raw = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "remote-object" }> => value.kind === "remote-object" && value.remoteObjectId === remoteObjectId)?.expectedRevision;
  return raw ? cid<"RemoteRevisionId">(raw) as RemoteRevisionId : undefined;
}

function parentPath(path: VaultPath): VaultPath {
  const raw = String(path).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const slash = raw.lastIndexOf("/");
  return cid<"VaultPath">(slash < 0 ? "" : raw.slice(0, slash)) as VaultPath;
}

function pathComparisonKey(path: VaultPath): string {
  return String(path).replace(/\\/g, "/").normalize("NFC").toLocaleLowerCase("en-US");
}

function stablePath(path: VaultPath, role: "stage" | "backup", operation: ExecutablePlannedOperation): VaultPath {
  const digest = String(sha256Text(`${String(operation.operationId)}\u0000${role}\u0000${String(path)}`)).slice(0, 24);
  return cid<"VaultPath">(`.brain-sync/${role}/${digest}`) as VaultPath;
}

function evidenceRef(prefix: string, values: unknown): string {
  return `${prefix}:${String(sha256Text(JSON.stringify(values)))}`;
}

function mapRemoteOutcome(outcome: RemoteMutationOutcome): PhysicalEffectDispatchResult {
  if (outcome.status === "verified-effect") return { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-effect", outcome.applicationProof) };
  if (outcome.status === "verified-not-applied") return { status: "verified-not-applied", reason: outcome.reason };
  if (outcome.status === "conflict-preserved") return { status: "conflict-preserved", reason: outcome.reason };
  return { status: "outcome-unknown", reason: outcome.reason };
}

function success(operation: ExecutablePlannedOperation, evidence?: ContentEvidence, resultingRemoteObjectId?: RemoteObjectId): ExecutionResult {
  const receipt: VerifiedExecutionReceipt = {
    operationId: operation.operationId,
    durable: true,
    integrityVerified: true,
    evidence,
    resultingRemoteObjectId,
    verificationEvidenceRef: `durable-effects:${String(operation.operationId)}`,
  };
  return { status: "durable-verified-success", receipt };
}

function requiresPhysicalMutation(operation: ExecutablePlannedOperation): boolean {
  return ["upload-create", "upload-update", "download-create", "download-update", "identity-preserving-move", "clean-text-merge", "trash-local", "trash-remote"].includes(operation.kind);
}

function requiredPortsAvailable(operation: ExecutablePlannedOperation, dependencies: RecoverableProductionMutationDependencies): string | undefined {
  const remote = operation.targetSide === "remote" || operation.kind.startsWith("upload-") || operation.kind === "trash-remote" || operation.kind === "clean-text-merge";
  const localFile = operation.kind === "download-create" || operation.kind === "download-update" || operation.kind === "clean-text-merge";
  if (remote && !dependencies.reliableRemoteMutationPort) return "ReliableRemoteMutationPort is unavailable; production synchronization mutation is disabled";
  if (localFile && !dependencies.localTransactionalMutationPort) return "LocalTransactionalMutationPort is unavailable; production synchronization mutation is disabled";
  if (operation.kind === "upload-create" && operation.contentVersion?.entityKind === "folder" && !dependencies.remoteFolderCreateRecoveryReadPort) {
    return "RemoteFolderCreateRecoveryReadPort is unavailable; REMOTE folder mutation is disabled";
  }
  return undefined;
}

async function retainedOrLocalSource(legacy: ProductSynchronizationExecutor, version: VersionReference): Promise<{ readonly content: BinaryContentSource; readonly evidence: ContentEvidence } | undefined> {
  const reads = internal(legacy);
  if (version.observationToken) {
    const local = await reads.local.readFile(version.path, version.observationToken);
    if (version.content?.hash && local.evidence.hash !== version.content.hash) return undefined;
    return { content: reads.textVersions?.capture(version, local.content) ?? local.content, evidence: local.evidence };
  }
  const retained = await reads.textVersions?.sourceForRetained(version);
  return retained && version.content ? { content: retained, evidence: version.content } : undefined;
}

async function remoteSource(legacy: ProductSynchronizationExecutor, version: VersionReference, remoteObjectId: RemoteObjectId): Promise<{ readonly content: BinaryContentSource; readonly evidence: ContentEvidence } | undefined> {
  const downloaded = await internal(legacy).drive.download(remoteObjectId);
  if (!downloaded.ok) return undefined;
  if (version.content?.hash && downloaded.value.evidence.hash !== version.content.hash) return undefined;
  return { content: downloaded.value.content, evidence: downloaded.value.evidence };
}

async function parentRemoteObjectId(
  operation: ExecutablePlannedOperation,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
): Promise<RemoteObjectId | undefined> {
  const parent = parentPath(operation.path);
  if (String(parent) === "") return managedRemote.rootId;
  const loaded = await identityStateStore.load(stateContext);
  if (loaded.status !== "trusted") return undefined;
  const matches = loaded.state.remoteMappings.filter(mapping => mapping.path === parent && mapping.entityKind === "folder");
  return matches.length === 1 ? matches[0]?.remoteObjectId : undefined;
}

async function prepareEffects(
  operation: ExecutablePlannedOperation,
  authority: SynchronizationAuthorityMetadataV1_1,
  legacy: ProductSynchronizationExecutor,
  dependencies: RecoverableProductionMutationDependencies,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
): Promise<{ readonly status: "ready"; readonly intent: RecoverableOperationIntentV1_1; readonly prepared: readonly PreparedEffect[] } | { readonly status: "blocked"; readonly reason: string }> {
  const intentId = mutationIntentId(operation);
  const generation = authority.semanticGeneration;
  const identity = identityAuthority(operation);
  const base = baseAuthority(operation);
  const prepared: PreparedEffect[] = [];

  const add = (suffix: string, descriptor: RecoverablePhysicalMutationDescriptorV1_1, content?: BinaryContentSource, localTransaction?: LocalMutationTransaction) => {
    prepared.push({ effect: { effectId: effectId(operation, suffix), descriptor, stage: "intent-persisted" }, content, localTransaction });
  };

  if (operation.kind === "upload-create") {
    const version = operation.contentVersion;
    if (!version) return { status: "blocked", reason: "upload-create lacks planned content version" };
    if (!dependencies.reliableRemoteMutationPort) return { status: "blocked", reason: "ReliableRemoteMutationPort unavailable" };
    if (version.entityKind === "folder") {
      const reserved = await dependencies.reliableRemoteMutationPort.reserveFolderCreateIdentity(managedRemote, intentId, operation.path);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE folder identity reservation failed: ${reserved.signal.kind}` };
      const parent = await parentRemoteObjectId(operation, identityStateStore, stateContext, managedRemote);
      if (!parent) return { status: "blocked", reason: "REMOTE folder create lacks unique durable parent identity authority" };
      add("remote-folder", {
        kind: "remote-folder-create", targetSide: "remote", mutationKind: "create", intentId,
        targetPath: operation.path, parentRemoteObjectId: parent,
        pathAuthority: { generation, targetPath: operation.path, parentPath: parentPath(operation.path), pathComparisonKey: pathComparisonKey(operation.path), expectedTarget: "absent" },
        remoteMutation: reserved.value,
      });
    } else {
      const source = await retainedOrLocalSource(legacy, version);
      const intended = canonical(source?.evidence ?? version.content);
      if (!source || !intended) return { status: "blocked", reason: "REMOTE file create requires exact stable SHA-256 source evidence" };
      const reserved = await dependencies.reliableRemoteMutationPort.reserveFileCreateIdentity(managedRemote, intentId, operation.path, intended);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE file identity reservation failed: ${reserved.signal.kind}` };
      add("remote-file", { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: operation.path, remoteMutation: reserved.value, intendedContent: intended }, source.content);
    }
  } else if (operation.kind === "upload-update") {
    if (!operation.remoteObjectId || !operation.contentVersion || !identity || !dependencies.reliableRemoteMutationPort) return { status: "blocked", reason: "REMOTE update lacks exact identity/content/reliable mutation authority" };
    const source = await retainedOrLocalSource(legacy, operation.contentVersion);
    const intended = canonical(source?.evidence ?? operation.contentVersion.content);
    const expectedRevision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !expectedRevision) return { status: "blocked", reason: "REMOTE update requires exact stable SHA-256 source and REMOTE revision authority" };
    const candidate = await dependencies.reliableRemoteMutationPort.reserveFileCreateIdentity(managedRemote, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `REMOTE update candidate identity reservation failed: ${candidate.signal.kind}` };
    add("remote-file", {
      kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: operation.path,
      remoteMutation: {
        kind: "existing-file-content-update", intentId, remoteObjectId: operation.remoteObjectId, expectedRevision,
        path: operation.path, updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: candidate.value.reservedRemoteObjectId,
        intendedContent: intended, identityAuthority: identity,
      },
      intendedContent: intended,
    }, source.content);
  } else if (operation.kind === "download-create" || operation.kind === "download-update") {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!version || !remoteObjectId || version.entityKind !== "file") return { status: "blocked", reason: "LOCAL file materialization requires exact REMOTE file version" };
    const source = await remoteSource(legacy, version, remoteObjectId);
    const intended = canonical(source?.evidence ?? version.content);
    if (!source || !intended) return { status: "blocked", reason: "LOCAL file materialization requires exact downloaded SHA-256 evidence" };
    const transactionId = localTransactionId(operation, "file");
    const present = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "path-observation" }> => value.kind === "path-observation" && value.side === "local" && value.path === operation.path && value.expected === "present");
    const oldEvidence = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "content-evidence" }> => value.kind === "content-evidence" && value.side === "local" && value.path === operation.path)?.expected;
    const oldCanonical = canonical(oldEvidence);
    const mutationKind = operation.kind === "download-create" ? "create" as const : "replace" as const;
    if (mutationKind === "replace" && (!present?.observationToken || !oldCanonical)) return { status: "blocked", reason: "LOCAL replace requires exact pre-mutation observation token and canonical content" };
    const transaction: LocalMutationTransaction = mutationKind === "create"
      ? { transactionId, operationId: operation.operationId, path: operation.path, stagePath: stablePath(operation.path, "stage", operation), backupPath: stablePath(operation.path, "backup", operation), stage: "staging", mutationKind, expectedEntityKind: "file", expectedTarget: { status: "expected-absent" }, expectedNewEvidence: intended }
      : { transactionId, operationId: operation.operationId, path: operation.path, stagePath: stablePath(operation.path, "stage", operation), backupPath: stablePath(operation.path, "backup", operation), stage: "staging", mutationKind, expectedEntityKind: "file", expectedTarget: { status: "expected-present", observationToken: cid<"ObservationToken">(present!.observationToken!) as ObservationToken, entityKind: "file", canonicalContent: oldCanonical! }, expectedNewEvidence: intended };
    add("local-file", { kind: "local-file", targetSide: "local", mutationKind, targetPath: operation.path, localTransactionId: transactionId, intendedContent: intended }, source.content, transaction);
  } else if (operation.kind === "identity-preserving-move") {
    if (!operation.fromPath || !operation.toPath || !identity) return { status: "blocked", reason: "move lacks exact identity/from/to authority" };
    add(operation.targetSide === "remote" ? "remote-move" : "local-move", {
      kind: "move", targetSide: operation.targetSide ?? "local", fromPath: operation.fromPath, toPath: operation.toPath,
      remoteObjectId: operation.remoteObjectId, identityAuthority: identity,
    });
  } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (!base) return { status: "blocked", reason: "trash lacks exact BASE authority" };
    if (operation.kind === "trash-remote" && (!operation.remoteObjectId || !identity)) return { status: "blocked", reason: "REMOTE trash lacks exact identity authority" };
    add(operation.kind === "trash-remote" ? "remote-trash" : "local-trash", {
      kind: "trash", targetSide: operation.kind === "trash-remote" ? "remote" : "local", path: operation.path,
      remoteObjectId: operation.remoteObjectId, baseAuthority: base, identityAuthority: identity,
    });
  } else if (operation.kind === "clean-text-merge") {
    const version = operation.contentVersion;
    if (!version || version.entityKind !== "file" || !version.content || !operation.remoteObjectId || !identity || !dependencies.reliableRemoteMutationPort) return { status: "blocked", reason: "clean merge lacks exact merged version/REMOTE identity" };
    const source = await retainedOrLocalSource(legacy, version);
    const intended = canonical(version.content);
    const expectedRevision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !expectedRevision) return { status: "blocked", reason: "clean merge requires retained canonical merged bytes and exact REMOTE revision" };
    const present = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "path-observation" }> => value.kind === "path-observation" && value.side === "local" && value.path === operation.path && value.expected === "present");
    const oldEvidence = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "content-evidence" }> => value.kind === "content-evidence" && value.side === "local" && value.path === operation.path)?.expected;
    const oldCanonical = canonical(oldEvidence);
    if (!present?.observationToken || !oldCanonical) return { status: "blocked", reason: "clean merge LOCAL replace lacks exact pre-mutation authority" };
    const transactionId = localTransactionId(operation, "merge");
    const transaction: LocalMutationTransaction = {
      transactionId, operationId: operation.operationId, path: operation.path, stagePath: stablePath(operation.path, "stage", operation), backupPath: stablePath(operation.path, "backup", operation), stage: "staging", mutationKind: "replace", expectedEntityKind: "file",
      expectedTarget: { status: "expected-present", observationToken: cid<"ObservationToken">(present.observationToken) as ObservationToken, entityKind: "file", canonicalContent: oldCanonical }, expectedNewEvidence: intended,
    };
    add("local-merge", { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: operation.path, localTransactionId: transactionId, intendedContent: intended }, source.content, transaction);
    const candidate = await dependencies.reliableRemoteMutationPort.reserveFileCreateIdentity(managedRemote, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `clean merge REMOTE candidate identity reservation failed: ${candidate.signal.kind}` };
    add("remote-merge", { kind: "remote-file", targetSide: "remote", mutationKind: "update", targetPath: operation.path, remoteMutation: { kind: "existing-file-content-update", intentId, remoteObjectId: operation.remoteObjectId, expectedRevision, path: operation.path, updateProtocol: "immutable-candidate-preservation", candidateRemoteObjectId: candidate.value.reservedRemoteObjectId, intendedContent: intended, identityAuthority: identity }, intendedContent: intended }, source.content);
  }

  if (prepared.length === 0) return { status: "blocked", reason: `unsupported recoverable production operation ${operation.kind}` };
  const effects = prepared.map(value => value.effect);
  const intent = {
    logicalKind: operation.kind === "clean-text-merge" ? "clean-text-merge" : "single-effect",
    operationId: operation.operationId,
    intentId,
    semanticAuthority: { generation },
    effects,
  } as unknown as RecoverableOperationIntentV1_1;
  return { status: "ready", intent, prepared };
}

async function verifyRemoteConvergence(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  const reads = internal(legacy);
  const listing = await reads.drive.listForReconciliation(reads.runEvidence().managedRemote.rootId);
  if (!listing.ok || listing.value.completeness.status !== "complete") return { ok: false, reason: "REMOTE logical-path convergence could not be established from a complete current listing" };
  const active = listing.value.entries.filter(entry => !entry.trashed);
  if (descriptor.kind === "remote-file") {
    const expectedId = descriptor.remoteMutation.kind === "reserved-file-create" ? descriptor.remoteMutation.reservedRemoteObjectId : descriptor.remoteMutation.candidateRemoteObjectId;
    const candidates = active.filter(entry => entry.path === descriptor.targetPath);
    return candidates.length === 1 && candidates[0]?.remoteObjectId === expectedId
      ? { ok: true }
      : { ok: false, reason: "REMOTE file physical verification lacks independent conflict-free logical-path convergence authority" };
  }
  if (descriptor.kind === "remote-folder-create") {
    const candidates = active.filter(entry => entry.path === descriptor.targetPath);
    return candidates.length === 1 && candidates[0]?.remoteObjectId === descriptor.remoteMutation.reservedRemoteObjectId && candidates[0]?.entityKind === "folder"
      ? { ok: true }
      : { ok: false, reason: "REMOTE folder physical verification lacks independent conflict-free logical-path convergence authority" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const candidates = active.filter(entry => entry.path === descriptor.toPath);
    return candidates.length === 1 && candidates[0]?.remoteObjectId === descriptor.remoteObjectId
      ? { ok: true }
      : { ok: false, reason: "REMOTE move physical verification lacks conflict-free destination convergence authority" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return active.some(entry => entry.remoteObjectId === descriptor.remoteObjectId)
      ? { ok: false, reason: "REMOTE trash target remains present after physical effect" }
      : { ok: true };
  }
  return { ok: true };
}

async function verifyLocalConvergence(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  const local = internal(legacy).local;
  if (descriptor.kind === "local-file") {
    const observed = await local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { ok: true }
      : { ok: false, reason: "LOCAL file effect is not independently observable at its exact intended content" };
  }
  if (descriptor.kind === "local-folder-create") {
    const observed = await local.observe(descriptor.targetPath);
    const folderObservation: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
      ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
      : observed.status === "absent"
        ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
        : observed.status === "present"
          ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
          : { status: "unobservable", reason: "LOCAL folder current observation is not authoritative" };
    return verifyLocalFolderCreate(descriptor, folderObservation).status === "verified-effect" ? { ok: true } : { ok: false, reason: "LOCAL folder verifier did not establish the intended physical effect" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([local.observe(descriptor.fromPath), local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? { ok: true } : { ok: false, reason: "LOCAL move source/destination reality is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await local.observe(descriptor.path)).status === "absent" ? { ok: true } : { ok: false, reason: "LOCAL trash target remains present" };
  }
  return { ok: true };
}

async function reconcilePersistedEffect(
  lifecycle: DurableEffectLifecycleCoordinator,
  operation: ExecutablePlannedOperation,
  effect: RecoverableMutationEffectV1_1,
  legacy: ProductSynchronizationExecutor,
  dependencies: RecoverableProductionMutationDependencies,
): Promise<ExecutionResult | undefined> {
  if (effect.stage === "state-committed") return undefined;
  if (effect.stage === "intent-persisted") return { status: "recovery-required", reason: "restart found an unattempted durable intent; retire/replan before dispatch" };

  if (effect.stage === "dispatch-authorized" || effect.stage === "outcome-unknown") {
    let physical: PhysicalEffectDispatchResult;
    if (effect.descriptor.kind === "remote-folder-create") {
      if (!dependencies.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "REMOTE folder recovery read port unavailable" };
      const observation = await dependencies.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(effect.descriptor);
      const recovered = verifyRemoteFolderCreate(effect.descriptor, observation);
      physical = recovered.status === "verified-effect"
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder-recovery", recovered.proof) }
        : recovered;
    } else if (effect.descriptor.kind === "local-file") {
      const port = dependencies.localTransactionalMutationPort;
      if (!port) return { status: "recovery-required", reason: "LOCAL transactional recovery port unavailable" };
      const loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
      const transaction = loaded.state.localTransactions.find(value => value.transactionId === effect.descriptor.localTransactionId);
      if (!transaction) return { status: "recovery-required", reason: "persisted LOCAL file effect lacks its durable transaction" };
      const recovered = await port.recover(transaction);
      const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: "LOCAL transaction recovery progress could not be persisted" };
      const convergence = await verifyLocalConvergence(legacy, effect.descriptor);
      physical = recovered.status === "recovered" && convergence.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file-recovery", { transactionId: String(transaction.transactionId), path: String(transaction.path) }) }
        : { status: "outcome-unknown", reason: recovered.status === "recovered" ? convergence.reason : recovered.reason };
    } else {
      const convergence = effect.descriptor.targetSide === "remote"
        ? await verifyRemoteConvergence(legacy, effect.descriptor)
        : await verifyLocalConvergence(legacy, effect.descriptor);
      physical = convergence.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("restart-observation", { operationId: String(operation.operationId), effectId: effect.effectId }) }
        : { status: "outcome-unknown", reason: convergence.reason };
    }
    const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return recorded.status === "conflict-preserved"
        ? { status: "blocking-failure", reason: recorded.reason }
        : { status: "uncertain", reason: "reason" in recorded ? recorded.reason : "physical recovery remains unresolved" };
    }
  }

  const reloaded = await lifecycle.loadAuthority();
  if (reloaded.status !== "trusted") return { status: "recovery-required", reason: reloaded.reason };
  const current = reloaded.state.operationIntents.find(value => value.operationId === operation.operationId)?.effects.find(value => value.effectId === effect.effectId);
  if (!current) return { status: "recovery-required", reason: "recovered effect disappeared from durable authority" };
  if (current.stage === "state-committed") return undefined;
  if (current.stage !== "effect-verified" || !current.verificationEvidenceRef) return { status: "uncertain", reason: "recovered effect lacks durable verification evidence" };
  const convergence = current.descriptor.targetSide === "remote"
    ? await verifyRemoteConvergence(legacy, current.descriptor)
    : await verifyLocalConvergence(legacy, current.descriptor);
  if (!convergence.ok) return { status: "blocking-failure", reason: convergence.reason };
  const committed = await lifecycle.markEffectStateCommitted(String(operation.operationId), current.effectId, current.verificationEvidenceRef);
  return committed.status === "state-committed" ? undefined : { status: "recovery-required", reason: "verified physical effect could not reach durable state-committed" };
}

async function dispatchFreshEffect(
  lifecycle: DurableEffectLifecycleCoordinator,
  operation: ExecutablePlannedOperation,
  prepared: PreparedEffect,
  legacy: ProductSynchronizationExecutor,
  dependencies: RecoverableProductionMutationDependencies,
): Promise<ExecutionResult | undefined> {
  const authorized = await lifecycle.authorizePersistedEffect(String(operation.operationId), prepared.effect.effectId);
  if (authorized.status !== "dispatch-authorized") return { status: "recovery-required", reason: `physical effect dispatch authority was not durably persisted (${authorized.status})` };
  const descriptor = prepared.effect.descriptor;
  let physical: PhysicalEffectDispatchResult;

  if (descriptor.kind === "remote-file") {
    const port = dependencies.reliableRemoteMutationPort!;
    if (!prepared.content) return { status: "recovery-required", reason: "persisted REMOTE file descriptor has no exact prepared content source" };
    const outcome = descriptor.mutationKind === "create"
      ? await port.createReserved(descriptor.remoteMutation as Extract<typeof descriptor.remoteMutation, { kind: "reserved-file-create" }>, prepared.content)
      : await port.updateExisting(descriptor.remoteMutation as Extract<typeof descriptor.remoteMutation, { kind: "existing-file-content-update" }>, prepared.content);
    physical = mapRemoteOutcome(outcome);
  } else if (descriptor.kind === "remote-folder-create") {
    const port = dependencies.reliableRemoteMutationPort!;
    await port.createReserved(descriptor.remoteMutation);
    const recovery = dependencies.remoteFolderCreateRecoveryReadPort!;
    const observation = await recovery.observeFolderCreateRecovery(descriptor);
    const verified = verifyRemoteFolderCreate(descriptor, observation);
    physical = verified.status === "verified-effect"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder", verified.proof) }
      : verified;
  } else if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    if (!descriptor.remoteObjectId) return { status: "recovery-required", reason: "REMOTE move descriptor lacks remote identity" };
    const outcome = await dependencies.reliableRemoteMutationPort!.moveExisting({ kind: "identity-preserving-move", intentId: mutationIntentId(operation), remoteObjectId: descriptor.remoteObjectId, fromPath: descriptor.fromPath, toPath: descriptor.toPath, identityAuthority: descriptor.identityAuthority });
    physical = mapRemoteOutcome(outcome);
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    if (!descriptor.remoteObjectId || !descriptor.identityAuthority) return { status: "recovery-required", reason: "REMOTE trash descriptor lacks exact identity authority" };
    const outcome = await dependencies.reliableRemoteMutationPort!.trashExisting({ kind: "trash", intentId: mutationIntentId(operation), remoteObjectId: descriptor.remoteObjectId, path: descriptor.path, baseAuthority: descriptor.baseAuthority, identityAuthority: descriptor.identityAuthority });
    physical = mapRemoteOutcome(outcome);
  } else if (descriptor.kind === "local-file") {
    const port = dependencies.localTransactionalMutationPort!;
    if (!prepared.localTransaction || !prepared.content) return { status: "recovery-required", reason: "persisted LOCAL file descriptor lacks exact transaction/content" };
    const staged = await port.stageAndVerify(prepared.localTransaction, prepared.content);
    let persisted = await lifecycle.persistLocalTransaction(staged.transaction);
    if (persisted.status !== "persisted") return { status: "recovery-required", reason: "LOCAL staged transaction could not be durably persisted" };
    if (staged.status !== "staged-verified") {
      physical = { status: "outcome-unknown", reason: staged.reason };
    } else {
      const committed = await port.commitVerifiedStage(staged.transaction);
      persisted = await lifecycle.persistLocalTransaction(committed.transaction);
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: "LOCAL committed transaction could not be durably persisted" };
      const convergence = await verifyLocalConvergence(legacy, descriptor);
      physical = committed.status === "committed" && convergence.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file", { transactionId: String(committed.transaction.transactionId), path: String(committed.transaction.path) }) }
        : { status: "outcome-unknown", reason: committed.status === "committed" ? convergence.reason : committed.reason };
    }
  } else if (descriptor.kind === "local-folder-create") {
    await internal(legacy).local.createFolder(descriptor.targetPath);
    const convergence = await verifyLocalConvergence(legacy, descriptor);
    physical = convergence.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-folder", String(descriptor.targetPath)) } : { status: "outcome-unknown", reason: convergence.reason };
  } else if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    await internal(legacy).local.move(descriptor.fromPath, descriptor.toPath);
    const convergence = await verifyLocalConvergence(legacy, descriptor);
    physical = convergence.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-move", [String(descriptor.fromPath), String(descriptor.toPath)]) } : { status: "outcome-unknown", reason: convergence.reason };
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    await internal(legacy).local.trash(descriptor.path);
    const convergence = await verifyLocalConvergence(legacy, descriptor);
    physical = convergence.ok ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-trash", String(descriptor.path)) } : { status: "outcome-unknown", reason: convergence.reason };
  } else {
    return { status: "recovery-required", reason: "unsupported durable physical descriptor" };
  }

  const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), prepared.effect.effectId, physical);
  if (recorded.status !== "effect-verified") {
    if (recorded.status === "conflict-preserved") return { status: "blocking-failure", reason: recorded.reason };
    return { status: "uncertain", reason: "reason" in recorded ? recorded.reason : `physical effect remained ${recorded.status}` };
  }
  const convergence = descriptor.targetSide === "remote"
    ? await verifyRemoteConvergence(legacy, descriptor)
    : await verifyLocalConvergence(legacy, descriptor);
  if (!convergence.ok) return { status: "blocking-failure", reason: convergence.reason };
  const current = recorded.authority.operationIntents.find(value => value.operationId === operation.operationId)?.effects.find(value => value.effectId === prepared.effect.effectId);
  if (!current?.verificationEvidenceRef) return { status: "recovery-required", reason: "durable physical verification evidence disappeared before state commit" };
  const committed = await lifecycle.markEffectStateCommitted(String(operation.operationId), prepared.effect.effectId, current.verificationEvidenceRef);
  return committed.status === "state-committed" ? undefined : { status: "recovery-required", reason: "physical effect could not durably reach state-committed" };
}

/**
 * Production adapter for the frozen authority-complete executor seam.
 * Exact semantic authority is reloaded independently at the mutation boundary.
 * Ordinary production physical mutation never delegates to legacy.execute(); it
 * must traverse RecoverableOperationIntentV1_1 and frozen recovery-safe ports.
 */
export function createAuthoritativeProductExecutor(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
  dependencies: RecoverableProductionMutationDependencies = {},
): AuthoritativeSynchronizationExecutor {
  async function validateExact(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult> {
    const [authorityLoad, identityLoad] = await Promise.all([authorityStore.loadAuthority(), identityStateStore.load(stateContext)]);
    if (authorityLoad.status !== "trusted") return { status: "recovery-required", reason: "current authoritative synchronization metadata is unavailable" };
    if (identityLoad.status !== "trusted") return { status: "recovery-required", reason: "current trusted remote identity mapping state is unavailable" };

    const failed: ExecutableOperationPrecondition[] = [];
    const authority = authorityLoad.state;
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-authority") {
        const current = authority.pathConvergence.find(entry => entry.path === precondition.authority.path)?.state;
        if (!current || current.status !== "converged") { failed.push(precondition); continue; }
        const actual = { generation: current.generation, path: precondition.authority.path, fingerprint: current.baseFingerprint };
        if (authority.semanticGeneration !== current.generation || !exactBaseAuthorityMatches(precondition.authority, actual)) failed.push(precondition);
      } else if (precondition.kind === "identity-authority") {
        const proof = precondition.proof;
        const currentPath = authority.pathConvergence.find(entry => entry.path === proof.path)?.state;
        const byPath = identityLoad.state.remoteMappings.filter(mapping => mapping.path === proof.path);
        const byId = identityLoad.state.remoteMappings.filter(mapping => mapping.remoteObjectId === proof.remoteObjectId);
        const mapping = byPath.length === 1 && byId.length === 1 && byPath[0] === byId[0] ? byPath[0] : undefined;
        if (!mapping || !currentPath || currentPath.status !== "converged" || currentPath.generation !== authority.semanticGeneration || proof.generation !== authority.semanticGeneration) { failed.push(precondition); continue; }
        const observationPath = operation.kind === "identity-preserving-move" && operation.targetSide === "local" && operation.toPath ? operation.toPath : mapping.path;
        if (!await legacy.versionStillCurrent("remote", { path: observationPath, entityKind: mapping.entityKind, remoteObjectId: mapping.remoteObjectId }, managedRemote)) failed.push(precondition);
      }
    }
    if (failed.length) return { status: "stale", failed };
    const ordinary = await legacy.validatePreconditions(operation);
    if (ordinary.status === "valid") return { status: "valid" };
    if (ordinary.status === "stale") return { status: "stale", failed: ordinary.failed.filter((value): value is ExecutableOperationPrecondition => value.kind !== "base-trusted" && value.kind !== "identity-unambiguous") };
    return ordinary;
  }

  return {
    validatePreconditions: validateExact,
    async execute(operation: ExecutablePlannedOperation): Promise<ExecutionResult> {
      const validation = await validateExact(operation);
      if (validation.status === "stale") return { status: "stale-precondition", reason: "exact authority changed at the production mutation boundary", failed: validation.failed };
      if (validation.status === "blocked") return { status: "blocking-failure", reason: validation.reason };
      if (validation.status === "recovery-required") return { status: "recovery-required", reason: validation.reason };
      if (!requiresPhysicalMutation(operation)) return legacy.execute(operation);

      const missing = requiredPortsAvailable(operation, dependencies);
      if (missing) return { status: "recovery-required", reason: missing };
      const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
      const loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };

      const existing = loaded.state.operationIntents.find(value => value.operationId === operation.operationId);
      if (existing) {
        if (existing.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted physical intent belongs to stale semantic authority" };
        for (const effect of existing.effects) {
          const recovery = await reconcilePersistedEffect(lifecycle, operation, effect, legacy, dependencies);
          if (recovery) return recovery;
        }
        const final = await lifecycle.loadAuthority();
        if (final.status !== "trusted") return { status: "recovery-required", reason: final.reason };
        const complete = final.state.operationIntents.find(value => value.operationId === operation.operationId);
        if (!complete?.effects.every(effect => effect.stage === "state-committed")) return { status: "recovery-required", reason: "restart recovery did not complete every required physical effect" };
        const remoteResultId = complete.effects.map(effect => effect.descriptor).find(descriptor => descriptor.kind === "remote-file")?.remoteMutation;
        const resultingRemoteObjectId = remoteResultId?.kind === "reserved-file-create" ? remoteResultId.reservedRemoteObjectId : remoteResultId?.kind === "existing-file-content-update" ? remoteResultId.candidateRemoteObjectId : operation.remoteObjectId;
        return success(operation, operation.contentVersion?.content, resultingRemoteObjectId);
      }

      const prepared = await prepareEffects(operation, loaded.state, legacy, dependencies, identityStateStore, stateContext, managedRemote);
      if (prepared.status === "blocked") return { status: "recovery-required", reason: prepared.reason };
      const persisted = await lifecycle.persistIntent(prepared.intent, prepared.prepared.flatMap(value => value.localTransaction ? [value.localTransaction] : []));
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: `physical intent could not be durably persisted (${persisted.status})` };
      for (const effect of prepared.prepared) {
        const result = await dispatchFreshEffect(lifecycle, operation, effect, legacy, dependencies);
        if (result) return result;
      }
      const final = await lifecycle.loadAuthority();
      if (final.status !== "trusted") return { status: "recovery-required", reason: final.reason };
      const complete = final.state.operationIntents.find(value => value.operationId === operation.operationId);
      if (!complete?.effects.every(effect => effect.stage === "state-committed")) return { status: "recovery-required", reason: "logical operation cannot succeed until every physical effect is durably state-committed" };
      const remoteDescriptor = complete.effects.map(effect => effect.descriptor).find(descriptor => descriptor.kind === "remote-file");
      const resultingRemoteObjectId = remoteDescriptor?.kind === "remote-file"
        ? remoteDescriptor.remoteMutation.kind === "reserved-file-create" ? remoteDescriptor.remoteMutation.reservedRemoteObjectId : remoteDescriptor.remoteMutation.candidateRemoteObjectId
        : operation.remoteObjectId;
      return success(operation, operation.contentVersion?.content, resultingRemoteObjectId);
    },
  };
}
