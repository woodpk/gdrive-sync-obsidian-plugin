/**
 * DEC-339 D339-06. Dormant, opt-in remote convergence-read boundary.
 *
 * A targeted read can replace only the independent positive CREATE convergence
 * observation. It cannot authorize dispatch, mutation, BASE commit, effect
 * retirement, retry, absence, moves, updates, trash or durable recovery.
 * The existing authoritative executor remains the sole lifecycle owner.
 *
 * This module is intentionally not imported by the shipping entrypoint. The
 * feature-wide safety-equivalence and rollout gates own eventual activation.
 */
import type {
  InventoryGeneration, InventoryIdentityFence, OperationId,
  RecoverablePhysicalMutationDescriptorV1_1, RemoteFileCreatePhysicalMutationDescriptor,
  RemoteFolderCreatePhysicalMutationDescriptor, RemoteObjectId,
  SynchronizationAuthorityStoreV1_1, VaultPath,
} from "../contracts";
import type { InventoryMetadataSource } from "../drive/inventory-metadata-source";
import type {
  InventoryTargetedReadRequest, VerifiedMetadataInventoryReader,
} from "../drive/verified-metadata-inventory-reader";

type Descriptor = RecoverablePhysicalMutationDescriptorV1_1;
type CreateDescriptor = RemoteFileCreatePhysicalMutationDescriptor | RemoteFolderCreatePhysicalMutationDescriptor;

export type TargetedConvergenceRead =
  | { readonly status: "verified-convergence-read"; readonly remoteObjectId: RemoteObjectId;
      readonly targetPath: VaultPath; readonly operationId: OperationId; readonly effectId: string }
  | { readonly status: "fallback-required"; readonly reason: string };

export interface TargetedConvergenceContext {
  readonly operationId: OperationId;
  readonly effectId: string;
  readonly descriptor: Descriptor;
  readonly expectedFence: InventoryIdentityFence;
  readonly generation: InventoryGeneration;
  /** Explicitly false in production until feature-level safety equivalence is accepted. */
  readonly enabled: boolean;
}

export interface TargetedConvergenceDependencies {
  readonly reader: Pick<VerifiedMetadataInventoryReader, "targeted">;
  readonly metadata: Pick<InventoryMetadataSource, "getFile">;
  readonly authorityStore: Pick<SynchronizationAuthorityStoreV1_1, "loadAuthority">;
  readonly currentFence: () => Promise<InventoryIdentityFence>;
}

const fallback = (reason: string): TargetedConvergenceRead => ({ status: "fallback-required", reason });
const forbidden = (path: string) =>
  !path || path.startsWith("/") || path.endsWith("/") || path.includes("\\") ||
  path.split("/").some(piece => !piece || piece === "." || piece === "..");
const sameFence = (a: InventoryIdentityFence, b: InventoryIdentityFence): boolean =>
  a.vaultIdentity === b.vaultIdentity && a.deviceIdentity === b.deviceIdentity &&
  a.pairedAccountKey === b.pairedAccountKey && a.managedRootId === b.managedRootId &&
  a.protocolVersion === b.protocolVersion &&
  a.contentDomainRootId === b.contentDomainRootId &&
  a.configDomainRootId === b.configDomainRootId &&
  a.scopePolicyFingerprint === b.scopePolicyFingerprint &&
  a.inventorySchemaVersion === b.inventorySchemaVersion;

function reservedCreate(descriptor: Descriptor): descriptor is CreateDescriptor {
  return (descriptor.kind === "remote-file" &&
    descriptor.mutationKind === "create" &&
    descriptor.remoteMutation.kind === "reserved-file-create") ||
    descriptor.kind === "remote-folder-create";
}
function descriptorIdentity(descriptor: CreateDescriptor) {
  return descriptor.remoteMutation;
}
function requestFrom(
  descriptor: CreateDescriptor, parent: RemoteObjectId,
): InventoryTargetedReadRequest | undefined {
  const remote = descriptorIdentity(descriptor);
  if (descriptor.targetPath !== remote.path ||
      descriptor.kind === "remote-folder-create" &&
        descriptor.parentRemoteObjectId !== parent)
    return undefined;
  const logical = String(descriptor.targetPath);
  if (forbidden(logical) || logical === "__brain_sync_portable_config__") return undefined;
  const prefix = "__brain_sync_portable_config__/";
  const domain = logical.startsWith(prefix) ? "portable-config" as const : "content" as const;
  const relative = domain === "portable-config" ? logical.slice(prefix.length) : logical;
  if (forbidden(relative)) return undefined;
  const name = relative.split("/").at(-1)!;
  return {
    remoteObjectId: remote.reservedRemoteObjectId,
    parentRemoteObjectId: parent,
    domain, name, purpose: "effect-convergence",
    ...(descriptor.kind === "remote-file" ? {
      expectedSizeBytes: descriptor.intendedContent.sizeBytes,
      expectedSha256: String(descriptor.intendedContent.hash).replace(/^sha256:/, ""),
    } : {}),
  };
}

/**
 * Read-only targeted proof consumption: current account/root/scope, durable
 * effect-verified receipt, exact reserved identity, current name/parent chain,
 * full same-name occupancy, root-wide marked provenance and current content.
 * A rejection is a request to run the established complete reconciliation,
 * never a positive no-effect or deletion conclusion.
 */
export class InventoryTargetedConvergenceReader {
  constructor(private readonly deps: TargetedConvergenceDependencies) {}

  async observe(context: TargetedConvergenceContext): Promise<TargetedConvergenceRead> {
    if (!context.enabled) return fallback("targeted-convergence-capability-disabled");
    const descriptor = context.descriptor;
    if (!reservedCreate(descriptor))
      return fallback("effect-not-covered-by-equivalent-positive-targeted-proof");
    if (descriptor.targetSide !== "remote" || descriptor.mutationKind !== "create")
      return fallback("only-positive-remote-create-convergence-is-eligible");

    try {
      const fence = await this.deps.currentFence();
      if (!sameFence(fence, context.expectedFence))
        return fallback("paired-identity-or-scope-fence-changed");
      const original = await this.deps.authorityStore.loadAuthority();
      if (original.status !== "trusted") return fallback("canonical-authority-not-trusted");
      const authority = original.state;
      const matching = authority.operationIntents.filter(intent => intent.operationId === context.operationId);
      if (matching.length !== 1 || matching[0]!.intentId !== descriptor.remoteMutation.intentId ||
          matching[0]!.semanticAuthority.generation !== authority.semanticGeneration)
        return fallback("current-durable-intent-missing-or-mismatched");
      if (authority.operationIntents.some(intent => intent.operationId !== context.operationId &&
          intent.effects.some(effect => effect.stage !== "state-committed")))
        return fallback("unrelated-outstanding-effect-blocks-optimization");
      const effect = matching[0]!.effects.filter(item => item.effectId === context.effectId);
      if (effect.length !== 1 || effect[0]!.stage !== "effect-verified" ||
          !effect[0]!.verificationEvidenceRef ||
          JSON.stringify(effect[0]!.descriptor) !== JSON.stringify(descriptor))
        return fallback("effect-not-independently-verified-by-existing-lifecycle");
      if (descriptor.kind === "remote-file" &&
          (descriptor.remoteMutation.intendedContent.hash !== descriptor.intendedContent.hash ||
            descriptor.remoteMutation.intendedContent.sizeBytes !== descriptor.intendedContent.sizeBytes))
        return fallback("file-descriptor-content-contradiction");

      const remote = descriptorIdentity(descriptor);
      const provisional = await this.deps.metadata.getFile(String(remote.reservedRemoteObjectId));
      if (provisional.status !== "ok" || provisional.value.trashed ||
          provisional.value.id !== remote.reservedRemoteObjectId ||
          provisional.value.parents.length !== 1)
        return fallback("exact-remote-identity-or-parent-unavailable");
      const parent = provisional.value.parents[0]! as RemoteObjectId;
      const request = requestFrom(descriptor, parent);
      if (!request) return fallback("path-parent-or-reserved-identity-contradiction");
      const observed = await this.deps.reader.targeted(fence, context.generation, request);
      if (observed.status !== "ok") return fallback("provider-targeted-proof-unavailable");
      const proof = observed.value;
      if (proof.executorProofAuthorized !== false ||
          !proof.rootWideMarkedProvenanceRechecked ||
          !proof.appVisibleOnly ||
          proof.object.remoteObjectId !== remote.reservedRemoteObjectId ||
          proof.object.parentRemoteObjectId !== parent ||
          proof.object.domain !== request.domain ||
          proof.object.provenanceDomain !== request.domain ||
          proof.object.managedRootId !== fence.managedRootId ||
          proof.object.name !== request.name ||
          proof.object.trashed || proof.object.access !== "visible" ||
          proof.object.pathValidity === "invalid" ||
          proof.observedLogicalPath !== descriptor.targetPath ||
          proof.siblingIds.length !== 1 ||
          proof.siblingIds[0] !== remote.reservedRemoteObjectId ||
          proof.parentChain[0] !== parent ||
          proof.parentChain.at(-1) !== (request.domain === "content" ?
            fence.contentDomainRootId : fence.configDomainRootId))
        return fallback("targeted-object-identity-ancestry-or-occupancy-unproved");
      if (descriptor.kind === "remote-folder-create") {
        if (proof.object.kind !== "folder") return fallback("expected-created-folder-not-observed");
      } else {
        if (proof.object.kind !== "file" ||
            proof.object.content?.hash !== descriptor.intendedContent.hash ||
            proof.object.content?.sizeBytes !== descriptor.intendedContent.sizeBytes)
          return fallback("created-file-intended-content-unproved");
      }

      const latestFence = await this.deps.currentFence();
      const latest = await this.deps.authorityStore.loadAuthority();
      if (!sameFence(latestFence, fence) ||
          latest.status !== "trusted" ||
          latest.state.persistenceRevision !== authority.persistenceRevision ||
          latest.state.semanticGeneration !== authority.semanticGeneration)
        return fallback("current-identity-or-authority-changed-during-targeted-read");
      return {
        status: "verified-convergence-read",
        remoteObjectId: remote.reservedRemoteObjectId,
        targetPath: descriptor.targetPath,
        operationId: context.operationId,
        effectId: context.effectId,
      };
    } catch {
      return fallback("targeted-read-failed-closed");
    }
  }
}

/**
 * The sole opt-in substitution boundary for a future authorized executor wire.
 * Any unsupported/untrusted proof invokes the existing remote reconciliation
 * callback. Nothing here changes dispatch, recovery, or final state commitment.
 */
export async function observeRemoteConvergenceWithFallback(
  reader: InventoryTargetedConvergenceReader | undefined,
  context: TargetedConvergenceContext,
  completeReconciliation: () => Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }>,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }> {
  if (reader) {
    const result = await reader.observe(context);
    if (result.status === "verified-convergence-read") return { ok: true };
  }
  return completeReconciliation();
}
