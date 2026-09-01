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
  readonly recoverableProductionMutationDependencies?: RecoverableProductionMutationDependencies;
};
type PreparedEffect = {
  readonly effect: RecoverableMutationEffectV1_1;
  readonly content?: BinaryContentSource;
  readonly localTransaction?: LocalMutationTransaction;
};
type Convergence = { readonly ok: true } | { readonly ok: false; readonly reason: string };

const cid = <T extends string>(value: string) => contractId<T>(value);
const internal = (legacy: ProductSynchronizationExecutor) => legacy as unknown as LegacyReads;
const intentIdFor = (operation: ExecutablePlannedOperation) => cid<"MutationIntentId">(`intent:${String(operation.operationId)}`) as MutationIntentId;
const effectIdFor = (operation: ExecutablePlannedOperation, suffix: string) => `effect:${String(operation.operationId)}:${suffix}`;

function canonical(evidence?: ContentEvidence): CanonicalFileContentProof | undefined {
  if (!evidence?.hash || evidence.sizeBytes === undefined) return undefined;
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
function parentPath(target: VaultPath): VaultPath {
  const raw = String(target).replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const split = raw.lastIndexOf("/");
  return cid<"VaultPath">(split < 0 ? "" : raw.slice(0, split)) as VaultPath;
}
function comparisonKey(target: VaultPath): string {
  return String(target).replace(/\\/g, "/").normalize("NFC").toLocaleLowerCase("en-US");
}
function transactionPath(operation: ExecutablePlannedOperation, role: "stage" | "backup"): VaultPath {
  const token = String(sha256Text(`${String(operation.operationId)}\u0000${role}\u0000${String(operation.path)}`)).slice(0, 24);
  return cid<"VaultPath">(`.brain-sync/${role}/${token}`) as VaultPath;
}
function evidenceRef(prefix: string, value: unknown): string {
  return `${prefix}:${String(sha256Text(JSON.stringify(value)))}`;
}
function success(operation: ExecutablePlannedOperation, resultingRemoteObjectId?: RemoteObjectId): ExecutionResult {
  const receipt: VerifiedExecutionReceipt = {
    operationId: operation.operationId,
    durable: true,
    integrityVerified: true,
    evidence: operation.contentVersion?.content,
    resultingRemoteObjectId,
    verificationEvidenceRef: `durable-effects:${String(operation.operationId)}`,
  };
  return { status: "durable-verified-success", receipt };
}
function physicalOperation(operation: ExecutablePlannedOperation): boolean {
  return ["upload-create", "upload-update", "download-create", "download-update", "identity-preserving-move", "clean-text-merge", "trash-local", "trash-remote"].includes(operation.kind);
}
function mapRemoteOutcome(outcome: RemoteMutationOutcome): PhysicalEffectDispatchResult {
  if (outcome.status === "verified-effect") return { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-effect", outcome.applicationProof) };
  return { status: outcome.status, reason: outcome.reason };
}
function resultReason(value: unknown, fallback: string): string {
  return typeof value === "object" && value !== null && "reason" in value && typeof (value as { reason?: unknown }).reason === "string"
    ? (value as { reason: string }).reason
    : fallback;
}

async function localOrRetainedSource(legacy: ProductSynchronizationExecutor, version: VersionReference): Promise<{ content: BinaryContentSource; evidence: ContentEvidence } | undefined> {
  const reads = internal(legacy);
  if (version.observationToken) {
    const read = await reads.local.readFile(version.path, version.observationToken);
    if (version.content?.hash && read.evidence.hash !== version.content.hash) return undefined;
    return { content: reads.textVersions?.capture(version, read.content) ?? read.content, evidence: read.evidence };
  }
  const content = await reads.textVersions?.sourceForRetained(version);
  return content && version.content ? { content, evidence: version.content } : undefined;
}
async function remoteSource(legacy: ProductSynchronizationExecutor, version: VersionReference, remoteObjectId: RemoteObjectId): Promise<{ content: BinaryContentSource; evidence: ContentEvidence } | undefined> {
  const read = await internal(legacy).drive.download(remoteObjectId);
  if (!read.ok || (version.content?.hash && read.value.evidence.hash !== version.content.hash)) return undefined;
  return { content: read.value.content, evidence: read.value.evidence };
}
async function folderParentId(operation: ExecutablePlannedOperation, stateStore: SynchronizationStateStore, context: StateLoadContext, root: ManagedRemoteIdentity): Promise<RemoteObjectId | undefined> {
  const parent = parentPath(operation.path);
  if (String(parent) === "") return root.rootId;
  const loaded = await stateStore.load(context);
  if (loaded.status !== "trusted") return undefined;
  const matches = loaded.state.remoteMappings.filter(value => value.path === parent && value.entityKind === "folder");
  return matches.length === 1 ? matches[0]?.remoteObjectId : undefined;
}
function localTransaction(operation: ExecutablePlannedOperation, intended: CanonicalFileContentProof, suffix: string, mutationKind: "create" | "replace"): LocalMutationTransaction | undefined {
  const transactionId = cid<"LocalMutationTransactionId">(`local-tx:${String(operation.operationId)}:${suffix}`) as LocalMutationTransactionId;
  const common = {
    transactionId,
    operationId: operation.operationId,
    path: operation.path,
    stagePath: transactionPath(operation, "stage"),
    backupPath: transactionPath(operation, "backup"),
    stage: "staging" as const,
    expectedEntityKind: "file" as const,
    expectedNewEvidence: intended,
  };
  if (mutationKind === "create") return { ...common, mutationKind, expectedTarget: { status: "expected-absent" } };
  const present = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "path-observation" }> => value.kind === "path-observation" && value.side === "local" && value.path === operation.path && value.expected === "present");
  const priorEvidence = operation.preconditions.find((value): value is Extract<ExecutableOperationPrecondition, { kind: "content-evidence" }> => value.kind === "content-evidence" && value.side === "local" && value.path === operation.path)?.expected;
  const prior = canonical(priorEvidence);
  if (!present?.observationToken || !prior) return undefined;
  return {
    ...common,
    mutationKind,
    expectedTarget: {
      status: "expected-present",
      observationToken: cid<"ObservationToken">(present.observationToken) as ObservationToken,
      entityKind: "file",
      canonicalContent: prior,
    },
  };
}

async function prepareIntent(
  operation: ExecutablePlannedOperation,
  authority: SynchronizationAuthorityMetadataV1_1,
  legacy: ProductSynchronizationExecutor,
  deps: RecoverableProductionMutationDependencies,
  stateStore: SynchronizationStateStore,
  context: StateLoadContext,
  root: ManagedRemoteIdentity,
): Promise<{ status: "ready"; intent: RecoverableOperationIntentV1_1; prepared: PreparedEffect[] } | { status: "blocked"; reason: string }> {
  const intentId = intentIdFor(operation);
  const prepared: PreparedEffect[] = [];
  const add = (suffix: string, descriptor: RecoverablePhysicalMutationDescriptorV1_1, content?: BinaryContentSource, tx?: LocalMutationTransaction) => {
    prepared.push({ effect: { effectId: effectIdFor(operation, suffix), descriptor, stage: "intent-persisted" }, content, localTransaction: tx });
  };
  const identity = identityAuthority(operation);
  const base = baseAuthority(operation);
  const remote = deps.reliableRemoteMutationPort;

  if (operation.kind === "upload-create") {
    const version = operation.contentVersion;
    if (!version || !remote) return { status: "blocked", reason: "REMOTE create lacks planned version or ReliableRemoteMutationPort" };
    if (version.entityKind === "folder") {
      const reserved = await remote.reserveFolderCreateIdentity(root, intentId, operation.path);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE folder identity reservation failed: ${reserved.signal.kind}` };
      const parentRemoteObjectId = await folderParentId(operation, stateStore, context, root);
      if (!parentRemoteObjectId) return { status: "blocked", reason: "REMOTE folder create lacks unique durable parent identity" };
      add("remote-folder", {
        kind: "remote-folder-create",
        targetSide: "remote",
        mutationKind: "create",
        intentId,
        targetPath: operation.path,
        parentRemoteObjectId,
        pathAuthority: {
          generation: authority.semanticGeneration,
          targetPath: operation.path,
          parentPath: parentPath(operation.path),
          pathComparisonKey: comparisonKey(operation.path),
          expectedTarget: "absent",
        },
        remoteMutation: reserved.value,
      });
    } else {
      const source = await localOrRetainedSource(legacy, version);
      const intended = canonical(source?.evidence ?? version.content);
      if (!source || !intended) return { status: "blocked", reason: "REMOTE file create requires canonical SHA-256 source" };
      const reserved = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
      if (!reserved.ok) return { status: "blocked", reason: `REMOTE file identity reservation failed: ${reserved.signal.kind}` };
      add("remote-file", { kind: "remote-file", targetSide: "remote", mutationKind: "create", targetPath: operation.path, remoteMutation: reserved.value, intendedContent: intended }, source.content);
    }
  } else if (operation.kind === "upload-update") {
    if (!operation.remoteObjectId || !operation.contentVersion || !identity || !remote) return { status: "blocked", reason: "REMOTE update lacks exact identity/reliable mutation authority" };
    const source = await localOrRetainedSource(legacy, operation.contentVersion);
    const intended = canonical(source?.evidence ?? operation.contentVersion.content);
    const revision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !revision) return { status: "blocked", reason: "REMOTE update requires canonical source and exact REMOTE revision" };
    const candidate = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `REMOTE update candidate reservation failed: ${candidate.signal.kind}` };
    add("remote-file", {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "update",
      targetPath: operation.path,
      remoteMutation: {
        kind: "existing-file-content-update",
        intentId,
        remoteObjectId: operation.remoteObjectId,
        expectedRevision: revision,
        path: operation.path,
        updateProtocol: "immutable-candidate-preservation",
        candidateRemoteObjectId: candidate.value.reservedRemoteObjectId,
        intendedContent: intended,
        identityAuthority: identity,
      },
      intendedContent: intended,
    }, source.content);
  } else if (operation.kind === "download-create" || operation.kind === "download-update") {
    const version = operation.contentVersion;
    const remoteObjectId = version?.remoteObjectId ?? operation.remoteObjectId;
    if (!version || !remoteObjectId) return { status: "blocked", reason: "LOCAL mutation lacks exact REMOTE version identity" };
    if (version.entityKind === "folder") {
      if (operation.kind !== "download-create") return { status: "blocked", reason: "LOCAL folder replacement is not a valid synchronization mutation" };
      add("local-folder", {
        kind: "local-folder-create",
        targetSide: "local",
        mutationKind: "create",
        intentId,
        targetPath: operation.path,
        pathAuthority: {
          generation: authority.semanticGeneration,
          targetPath: operation.path,
          parentPath: parentPath(operation.path),
          pathComparisonKey: comparisonKey(operation.path),
          expectedTarget: "absent",
        },
      });
    } else {
      const source = await remoteSource(legacy, version, remoteObjectId);
      const intended = canonical(source?.evidence ?? version.content);
      if (!source || !intended) return { status: "blocked", reason: "LOCAL file mutation requires canonical downloaded evidence" };
      const kind = operation.kind === "download-create" ? "create" as const : "replace" as const;
      const tx = localTransaction(operation, intended, "file", kind);
      if (!tx) return { status: "blocked", reason: "LOCAL replace lacks exact pre-mutation observation/content authority" };
      add("local-file", { kind: "local-file", targetSide: "local", mutationKind: kind, targetPath: operation.path, localTransactionId: tx.transactionId, intendedContent: intended }, source.content, tx);
    }
  } else if (operation.kind === "identity-preserving-move") {
    if (!operation.fromPath || !operation.toPath || !identity) return { status: "blocked", reason: "move lacks exact identity/from/to authority" };
    add(operation.targetSide === "remote" ? "remote-move" : "local-move", {
      kind: "move",
      targetSide: operation.targetSide ?? "local",
      fromPath: operation.fromPath,
      toPath: operation.toPath,
      remoteObjectId: operation.remoteObjectId,
      identityAuthority: identity,
    });
  } else if (operation.kind === "trash-local" || operation.kind === "trash-remote") {
    if (!base || (operation.kind === "trash-remote" && (!operation.remoteObjectId || !identity))) return { status: "blocked", reason: "trash lacks exact BASE/identity authority" };
    add(operation.kind === "trash-remote" ? "remote-trash" : "local-trash", {
      kind: "trash",
      targetSide: operation.kind === "trash-remote" ? "remote" : "local",
      path: operation.path,
      remoteObjectId: operation.remoteObjectId,
      baseAuthority: base,
      identityAuthority: identity,
    });
  } else if (operation.kind === "clean-text-merge") {
    const version = operation.contentVersion;
    if (!version || version.entityKind !== "file" || !operation.remoteObjectId || !identity || !remote) return { status: "blocked", reason: "clean merge lacks exact merged/REMOTE authority" };
    const source = await localOrRetainedSource(legacy, version);
    const intended = canonical(version.content);
    const revision = expectedRemoteRevision(operation, operation.remoteObjectId);
    if (!source || !intended || !revision) return { status: "blocked", reason: "clean merge lacks canonical retained bytes or REMOTE revision" };
    const tx = localTransaction(operation, intended, "merge", "replace");
    if (!tx) return { status: "blocked", reason: "clean merge LOCAL side lacks exact prior authority" };
    add("local-merge", { kind: "local-file", targetSide: "local", mutationKind: "replace", targetPath: operation.path, localTransactionId: tx.transactionId, intendedContent: intended }, source.content, tx);
    const candidate = await remote.reserveFileCreateIdentity(root, intentId, operation.path, intended);
    if (!candidate.ok) return { status: "blocked", reason: `clean merge candidate reservation failed: ${candidate.signal.kind}` };
    add("remote-merge", {
      kind: "remote-file",
      targetSide: "remote",
      mutationKind: "update",
      targetPath: operation.path,
      remoteMutation: {
        kind: "existing-file-content-update",
        intentId,
        remoteObjectId: operation.remoteObjectId,
        expectedRevision: revision,
        path: operation.path,
        updateProtocol: "immutable-candidate-preservation",
        candidateRemoteObjectId: candidate.value.reservedRemoteObjectId,
        intendedContent: intended,
        identityAuthority: identity,
      },
      intendedContent: intended,
    }, source.content);
  }

  if (!prepared.length) return { status: "blocked", reason: `unsupported recoverable operation ${operation.kind}` };
  return {
    status: "ready",
    intent: {
      logicalKind: operation.kind === "clean-text-merge" ? "clean-text-merge" : "single-effect",
      operationId: operation.operationId,
      intentId,
      semanticAuthority: { generation: authority.semanticGeneration },
      effects: prepared.map(value => value.effect),
    } as unknown as RecoverableOperationIntentV1_1,
    prepared,
  };
}

async function verifyRemote(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<Convergence> {
  const reads = internal(legacy);
  const result = await reads.drive.listForReconciliation(reads.runEvidence().managedRemote.rootId);
  if (!result.ok || result.value.completeness.status !== "complete") return { ok: false, reason: "complete current REMOTE listing unavailable for logical convergence" };
  const active = result.value.entries.filter(value => !value.trashed);
  if (descriptor.kind === "remote-file") {
    const expected = descriptor.remoteMutation.kind === "reserved-file-create" ? descriptor.remoteMutation.reservedRemoteObjectId : descriptor.remoteMutation.candidateRemoteObjectId;
    const matches = active.filter(value => value.path === descriptor.targetPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === expected ? { ok: true } : { ok: false, reason: "REMOTE file physical effect lacks independent conflict-free path convergence" };
  }
  if (descriptor.kind === "remote-folder-create") {
    const matches = active.filter(value => value.path === descriptor.targetPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === descriptor.remoteMutation.reservedRemoteObjectId && matches[0]?.entityKind === "folder"
      ? { ok: true }
      : { ok: false, reason: "REMOTE folder physical effect lacks independent conflict-free path convergence" };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    const matches = active.filter(value => value.path === descriptor.toPath);
    return matches.length === 1 && matches[0]?.remoteObjectId === descriptor.remoteObjectId ? { ok: true } : { ok: false, reason: "REMOTE move destination is not uniquely converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    return active.some(value => value.remoteObjectId === descriptor.remoteObjectId) ? { ok: false, reason: "REMOTE trash target remains present" } : { ok: true };
  }
  return { ok: true };
}
async function verifyLocal(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<Convergence> {
  const local = internal(legacy).local;
  if (descriptor.kind === "local-file") {
    const observed = await local.observe(descriptor.targetPath);
    return observed.status === "present" && observed.entityKind === "file" && observed.content?.hash === descriptor.intendedContent.hash && observed.content.sizeBytes === descriptor.intendedContent.sizeBytes
      ? { ok: true }
      : { ok: false, reason: "LOCAL file exact intended content is not observable" };
  }
  if (descriptor.kind === "local-folder-create") {
    const observed = await local.observe(descriptor.targetPath);
    const folderObservation: LocalFolderCreateObservation = observed.status === "present" && observed.entityKind === "folder" && observed.observationToken
      ? { status: "folder", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, observationToken: observed.observationToken }
      : observed.status === "absent"
        ? { status: "authoritative-absent", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey }
        : observed.status === "present"
          ? { status: "occupied", targetPath: descriptor.targetPath, pathComparisonKey: descriptor.pathAuthority.pathComparisonKey, entityKind: observed.entityKind }
          : { status: "unobservable", reason: "LOCAL folder observation incomplete" };
    const result = verifyLocalFolderCreate(descriptor, folderObservation);
    return result.status === "verified-effect" ? { ok: true } : { ok: false, reason: result.reason };
  }
  if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    const [from, to] = await Promise.all([local.observe(descriptor.fromPath), local.observe(descriptor.toPath)]);
    return from.status === "absent" && to.status === "present" ? { ok: true } : { ok: false, reason: "LOCAL move is not converged" };
  }
  if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    return (await local.observe(descriptor.path)).status === "absent" ? { ok: true } : { ok: false, reason: "LOCAL trash target remains present" };
  }
  return { ok: true };
}
async function convergenceFor(legacy: ProductSynchronizationExecutor, descriptor: RecoverablePhysicalMutationDescriptorV1_1): Promise<Convergence> {
  return descriptor.targetSide === "remote" ? verifyRemote(legacy, descriptor) : verifyLocal(legacy, descriptor);
}

async function recoverEffect(
  lifecycle: DurableEffectLifecycleCoordinator,
  operation: ExecutablePlannedOperation,
  effect: RecoverableMutationEffectV1_1,
  legacy: ProductSynchronizationExecutor,
  deps: RecoverableProductionMutationDependencies,
): Promise<ExecutionResult | undefined> {
  if (effect.stage === "state-committed") return undefined;
  if (effect.stage === "intent-persisted") return { status: "recovery-required", reason: "restart found unattempted durable intent; retire/replan before dispatch" };
  if (effect.stage === "dispatch-authorized" || effect.stage === "outcome-unknown") {
    let physical: PhysicalEffectDispatchResult;
    if (effect.descriptor.kind === "remote-folder-create") {
      if (!deps.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "RemoteFolderCreateRecoveryReadPort unavailable" };
      const observation = await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(effect.descriptor);
      const verified = verifyRemoteFolderCreate(effect.descriptor, observation);
      physical = verified.status === "verified-effect"
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder-recovery", verified.proof) }
        : verified;
    } else if (effect.descriptor.kind === "local-file") {
      if (!deps.localTransactionalMutationPort) return { status: "recovery-required", reason: "LocalTransactionalMutationPort unavailable" };
      const loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
      const localDescriptor = effect.descriptor;
      const tx = loaded.state.localTransactions.find(value => value.transactionId === localDescriptor.localTransactionId);
      if (!tx) return { status: "recovery-required", reason: "LOCAL recovery transaction missing" };
      const recovered = await deps.localTransactionalMutationPort.recover(tx);
      const persisted = await lifecycle.persistLocalTransaction(recovered.transaction);
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: "LOCAL recovery transaction progress was not durable" };
      const converged = await verifyLocal(legacy, localDescriptor);
      physical = recovered.status === "recovered" && converged.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file-recovery", String(tx.transactionId)) }
        : { status: "outcome-unknown", reason: recovered.status === "recovered" ? (converged.ok ? "LOCAL recovery convergence unavailable" : converged.reason) : resultReason(recovered, "LOCAL recovery unresolved") };
    } else {
      const converged = await convergenceFor(legacy, effect.descriptor);
      physical = converged.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("restart-observation", effect.effectId) }
        : { status: "outcome-unknown", reason: converged.reason };
    }
    const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), effect.effectId, physical);
    if (recorded.status !== "effect-verified" && recorded.status !== "already-progressed") {
      return recorded.status === "conflict-preserved"
        ? { status: "blocking-failure", reason: recorded.reason }
        : { status: "uncertain", reason: resultReason(recorded, "physical recovery unresolved") };
    }
  }
  const loaded = await lifecycle.loadAuthority();
  if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
  const current = loaded.state.operationIntents.find(value => value.operationId === operation.operationId)?.effects.find(value => value.effectId === effect.effectId);
  if (!current || (current.stage !== "effect-verified" && current.stage !== "state-committed")) return { status: "uncertain", reason: "recovered effect lacks durable verification" };
  if (current.stage === "state-committed") return undefined;
  const converged = await convergenceFor(legacy, current.descriptor);
  if (!converged.ok) return { status: "blocking-failure", reason: converged.reason };
  if (!current.verificationEvidenceRef) return { status: "recovery-required", reason: "verified effect lacks evidence reference" };
  const committed = await lifecycle.markEffectStateCommitted(String(operation.operationId), current.effectId, current.verificationEvidenceRef);
  return committed.status === "state-committed" ? undefined : { status: "recovery-required", reason: "verified effect could not reach state-committed" };
}

async function dispatchEffect(
  lifecycle: DurableEffectLifecycleCoordinator,
  operation: ExecutablePlannedOperation,
  prepared: PreparedEffect,
  legacy: ProductSynchronizationExecutor,
  deps: RecoverableProductionMutationDependencies,
): Promise<ExecutionResult | undefined> {
  const authorized = await lifecycle.authorizePersistedEffect(String(operation.operationId), prepared.effect.effectId);
  if (authorized.status !== "dispatch-authorized") return { status: "recovery-required", reason: `dispatch authority not durably persisted (${authorized.status})` };
  const descriptor = prepared.effect.descriptor;
  let physical: PhysicalEffectDispatchResult;

  if (descriptor.kind === "remote-file") {
    if (!deps.reliableRemoteMutationPort || !prepared.content) return { status: "recovery-required", reason: "REMOTE durable descriptor lacks frozen mutation port/content" };
    const outcome = descriptor.mutationKind === "create"
      ? await deps.reliableRemoteMutationPort.createReserved(descriptor.remoteMutation as Extract<typeof descriptor.remoteMutation, { kind: "reserved-file-create" }>, prepared.content)
      : await deps.reliableRemoteMutationPort.updateExisting(descriptor.remoteMutation as Extract<typeof descriptor.remoteMutation, { kind: "existing-file-content-update" }>, prepared.content);
    physical = mapRemoteOutcome(outcome);
  } else if (descriptor.kind === "remote-folder-create") {
    if (!deps.reliableRemoteMutationPort || !deps.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "REMOTE folder frozen mutation/recovery port unavailable" };
    await deps.reliableRemoteMutationPort.createReserved(descriptor.remoteMutation);
    const observed = await deps.remoteFolderCreateRecoveryReadPort.observeFolderCreateRecovery(descriptor);
    const verified = verifyRemoteFolderCreate(descriptor, observed);
    physical = verified.status === "verified-effect"
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("remote-folder", verified.proof) }
      : verified;
  } else if (descriptor.kind === "move" && descriptor.targetSide === "remote") {
    if (!deps.reliableRemoteMutationPort || !descriptor.remoteObjectId) return { status: "recovery-required", reason: "REMOTE move frozen port/identity unavailable" };
    physical = mapRemoteOutcome(await deps.reliableRemoteMutationPort.moveExisting({
      kind: "identity-preserving-move",
      intentId: intentIdFor(operation),
      remoteObjectId: descriptor.remoteObjectId,
      fromPath: descriptor.fromPath,
      toPath: descriptor.toPath,
      identityAuthority: descriptor.identityAuthority,
    }));
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "remote") {
    if (!deps.reliableRemoteMutationPort || !descriptor.remoteObjectId || !descriptor.identityAuthority) return { status: "recovery-required", reason: "REMOTE trash frozen port/identity unavailable" };
    physical = mapRemoteOutcome(await deps.reliableRemoteMutationPort.trashExisting({
      kind: "trash",
      intentId: intentIdFor(operation),
      remoteObjectId: descriptor.remoteObjectId,
      path: descriptor.path,
      baseAuthority: descriptor.baseAuthority,
      identityAuthority: descriptor.identityAuthority,
    }));
  } else if (descriptor.kind === "local-file") {
    if (!deps.localTransactionalMutationPort || !prepared.content || !prepared.localTransaction) return { status: "recovery-required", reason: "LOCAL file frozen transaction port/intent unavailable" };
    const staged = await deps.localTransactionalMutationPort.stageAndVerify(prepared.localTransaction, prepared.content);
    let saved = await lifecycle.persistLocalTransaction(staged.transaction);
    if (saved.status !== "persisted") return { status: "recovery-required", reason: "LOCAL staged progress not durable" };
    if (staged.status !== "staged-verified") {
      physical = { status: "outcome-unknown", reason: resultReason(staged, "LOCAL stage unresolved") };
    } else {
      const committed = await deps.localTransactionalMutationPort.commitVerifiedStage(staged.transaction);
      saved = await lifecycle.persistLocalTransaction(committed.transaction);
      if (saved.status !== "persisted") return { status: "recovery-required", reason: "LOCAL commit progress not durable" };
      const converged = await verifyLocal(legacy, descriptor);
      physical = committed.status === "committed" && converged.ok
        ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-file", String(committed.transaction.transactionId)) }
        : { status: "outcome-unknown", reason: committed.status === "committed" ? (converged.ok ? "LOCAL convergence unavailable" : converged.reason) : resultReason(committed, "LOCAL transaction unresolved") };
    }
  } else if (descriptor.kind === "local-folder-create") {
    await internal(legacy).local.createFolder(descriptor.targetPath);
    const converged = await verifyLocal(legacy, descriptor);
    physical = converged.ok
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-folder", String(descriptor.targetPath)) }
      : { status: "outcome-unknown", reason: converged.reason };
  } else if (descriptor.kind === "move" && descriptor.targetSide === "local") {
    await internal(legacy).local.move(descriptor.fromPath, descriptor.toPath);
    const converged = await verifyLocal(legacy, descriptor);
    physical = converged.ok
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-move", [String(descriptor.fromPath), String(descriptor.toPath)]) }
      : { status: "outcome-unknown", reason: converged.reason };
  } else if (descriptor.kind === "trash" && descriptor.targetSide === "local") {
    await internal(legacy).local.trash(descriptor.path);
    const converged = await verifyLocal(legacy, descriptor);
    physical = converged.ok
      ? { status: "verified-effect", verificationEvidenceRef: evidenceRef("local-trash", String(descriptor.path)) }
      : { status: "outcome-unknown", reason: converged.reason };
  } else {
    return { status: "recovery-required", reason: "unsupported durable descriptor" };
  }

  const recorded = await lifecycle.recordPhysicalResult(String(operation.operationId), prepared.effect.effectId, physical);
  if (recorded.status !== "effect-verified") {
    return recorded.status === "conflict-preserved"
      ? { status: "blocking-failure", reason: recorded.reason }
      : { status: "uncertain", reason: resultReason(recorded, `physical effect remained ${recorded.status}`) };
  }
  const converged = await convergenceFor(legacy, descriptor);
  if (!converged.ok) return { status: "blocking-failure", reason: converged.reason };
  const current = recorded.authority.operationIntents.find(value => value.operationId === operation.operationId)?.effects.find(value => value.effectId === prepared.effect.effectId);
  if (!current?.verificationEvidenceRef) return { status: "recovery-required", reason: "durable verification evidence missing" };
  const committed = await lifecycle.markEffectStateCommitted(String(operation.operationId), current.effectId, current.verificationEvidenceRef);
  return committed.status === "state-committed" ? undefined : { status: "recovery-required", reason: "effect could not reach state-committed" };
}

export function createAuthoritativeProductExecutor(
  legacy: ProductSynchronizationExecutor,
  authorityStore: SynchronizationAuthorityStoreV1_1,
  identityStateStore: SynchronizationStateStore,
  stateContext: StateLoadContext,
  managedRemote: ManagedRemoteIdentity,
  explicitDependencies?: RecoverableProductionMutationDependencies,
): AuthoritativeSynchronizationExecutor {
  const dependencies = explicitDependencies ?? internal(legacy).recoverableProductionMutationDependencies ?? {};

  async function validateExact(operation: ExecutablePlannedOperation): Promise<AuthorityCompletePreconditionValidationResult> {
    const [authorityLoad, identityLoad] = await Promise.all([authorityStore.loadAuthority(), identityStateStore.load(stateContext)]);
    if (authorityLoad.status !== "trusted") return { status: "recovery-required", reason: "current authoritative synchronization metadata unavailable" };
    if (identityLoad.status !== "trusted") return { status: "recovery-required", reason: "current trusted remote identity mappings unavailable" };
    const failed: ExecutableOperationPrecondition[] = [];
    for (const precondition of operation.preconditions) {
      if (precondition.kind === "base-authority") {
        const current = authorityLoad.state.pathConvergence.find(value => value.path === precondition.authority.path)?.state;
        if (!current || current.status !== "converged" || authorityLoad.state.semanticGeneration !== current.generation || !exactBaseAuthorityMatches(precondition.authority, { generation: current.generation, path: precondition.authority.path, fingerprint: current.baseFingerprint })) failed.push(precondition);
      } else if (precondition.kind === "identity-authority") {
        const proof = precondition.proof;
        const currentPath = authorityLoad.state.pathConvergence.find(value => value.path === proof.path)?.state;
        const byPath = identityLoad.state.remoteMappings.filter(value => value.path === proof.path);
        const byId = identityLoad.state.remoteMappings.filter(value => value.remoteObjectId === proof.remoteObjectId);
        const mapping = byPath.length === 1 && byId.length === 1 && byPath[0] === byId[0] ? byPath[0] : undefined;
        if (!mapping || !currentPath || currentPath.status !== "converged" || currentPath.generation !== authorityLoad.state.semanticGeneration || proof.generation !== authorityLoad.state.semanticGeneration) {
          failed.push(precondition);
        } else {
          const observedPath = operation.kind === "identity-preserving-move" && operation.targetSide === "local" && operation.toPath ? operation.toPath : mapping.path;
          if (!await legacy.versionStillCurrent("remote", { path: observedPath, entityKind: mapping.entityKind, remoteObjectId: mapping.remoteObjectId }, managedRemote)) failed.push(precondition);
        }
      }
    }
    if (failed.length) return { status: "stale", failed };
    const ordinary = await legacy.validatePreconditions(operation);
    if (ordinary.status === "valid") return { status: "valid" };
    if (ordinary.status === "stale") {
      return { status: "stale", failed: ordinary.failed.filter((value): value is ExecutableOperationPrecondition => value.kind !== "base-trusted" && value.kind !== "identity-unambiguous") };
    }
    return ordinary;
  }

  return {
    validatePreconditions: validateExact,
    async execute(operation) {
      const validation = await validateExact(operation);
      if (validation.status === "stale") return { status: "stale-precondition", reason: "exact authority changed at production mutation boundary", failed: validation.failed };
      if (validation.status === "blocked") return { status: "blocking-failure", reason: validation.reason };
      if (validation.status === "recovery-required") return { status: "recovery-required", reason: validation.reason };
      if (!physicalOperation(operation)) return legacy.execute(operation);

      const needsRemote = operation.targetSide === "remote" || operation.kind.startsWith("upload-") || operation.kind === "trash-remote" || operation.kind === "clean-text-merge";
      const needsLocalFile = (operation.kind === "download-create" || operation.kind === "download-update") && operation.contentVersion?.entityKind !== "folder" || operation.kind === "clean-text-merge";
      if (needsRemote && !dependencies.reliableRemoteMutationPort) return { status: "recovery-required", reason: "ReliableRemoteMutationPort unavailable; physical mutation disabled" };
      if (needsLocalFile && !dependencies.localTransactionalMutationPort) return { status: "recovery-required", reason: "LocalTransactionalMutationPort unavailable; physical mutation disabled" };
      if (operation.kind === "upload-create" && operation.contentVersion?.entityKind === "folder" && !dependencies.remoteFolderCreateRecoveryReadPort) return { status: "recovery-required", reason: "RemoteFolderCreateRecoveryReadPort unavailable; REMOTE folder mutation disabled" };

      const lifecycle = new DurableEffectLifecycleCoordinator(authorityStore);
      const loaded = await lifecycle.loadAuthority();
      if (loaded.status !== "trusted") return { status: "recovery-required", reason: loaded.reason };
      const existing = loaded.state.operationIntents.find(value => value.operationId === operation.operationId);
      if (existing) {
        if (existing.semanticAuthority.generation !== loaded.state.semanticGeneration) return { status: "recovery-required", reason: "persisted intent belongs to stale semantic authority" };
        for (const effect of existing.effects) {
          const result = await recoverEffect(lifecycle, operation, effect, legacy, dependencies);
          if (result) return result;
        }
        const final = await lifecycle.loadAuthority();
        if (final.status !== "trusted") return { status: "recovery-required", reason: final.reason };
        const complete = final.state.operationIntents.find(value => value.operationId === operation.operationId);
        if (!complete?.effects.every(value => value.stage === "state-committed")) return { status: "recovery-required", reason: "restart did not complete every required effect" };
        const remoteDescriptor = complete.effects.map(value => value.descriptor).find(value => value.kind === "remote-file");
        const resulting = remoteDescriptor?.kind === "remote-file"
          ? (remoteDescriptor.remoteMutation.kind === "reserved-file-create" ? remoteDescriptor.remoteMutation.reservedRemoteObjectId : remoteDescriptor.remoteMutation.candidateRemoteObjectId)
          : operation.remoteObjectId;
        return success(operation, resulting);
      }

      const prepared = await prepareIntent(operation, loaded.state, legacy, dependencies, identityStateStore, stateContext, managedRemote);
      if (prepared.status === "blocked") return { status: "recovery-required", reason: prepared.reason };
      const persisted = await lifecycle.persistIntent(prepared.intent, prepared.prepared.flatMap(value => value.localTransaction ? [value.localTransaction] : []));
      if (persisted.status !== "persisted") return { status: "recovery-required", reason: `physical intent not durably persisted (${persisted.status})` };
      for (const effect of prepared.prepared) {
        const result = await dispatchEffect(lifecycle, operation, effect, legacy, dependencies);
        if (result) return result;
      }
      const final = await lifecycle.loadAuthority();
      if (final.status !== "trusted") return { status: "recovery-required", reason: final.reason };
      const complete = final.state.operationIntents.find(value => value.operationId === operation.operationId);
      if (!complete?.effects.every(value => value.stage === "state-committed")) return { status: "recovery-required", reason: "logical operation incomplete: required effect not state-committed" };
      const remoteDescriptor = complete.effects.map(value => value.descriptor).find(value => value.kind === "remote-file");
      const resulting = remoteDescriptor?.kind === "remote-file"
        ? (remoteDescriptor.remoteMutation.kind === "reserved-file-create" ? remoteDescriptor.remoteMutation.reservedRemoteObjectId : remoteDescriptor.remoteMutation.candidateRemoteObjectId)
        : operation.remoteObjectId;
      return success(operation, resulting);
    },
  };
}
