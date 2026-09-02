import type { RecoverablePhysicalMutationDescriptorV1_1, RemoteEntry } from "../contracts";

type RemoteFileDescriptor = Extract<RecoverablePhysicalMutationDescriptorV1_1, { readonly kind: "remote-file" }>;

export type PreservedRemoteUpdateConvergence =
  | { readonly status: "converged"; readonly predecessor: RemoteEntry; readonly candidate: RemoteEntry }
  | { readonly status: "not-converged"; readonly reason: string };

/**
 * D-C13 compatibility rule for Workstream A's immutable-candidate-preservation
 * existing-file update. This is intentionally operation-specific: no other
 * same-path multi-object topology is accepted here.
 */
export function verifyPreservedRemoteUpdateConvergence(
  descriptor: RemoteFileDescriptor,
  entries: readonly RemoteEntry[],
): PreservedRemoteUpdateConvergence {
  const mutation = descriptor.remoteMutation;
  if (descriptor.mutationKind !== "update" || mutation.kind !== "existing-file-content-update") {
    return { status: "not-converged", reason: "descriptor is not an existing-file-content-update" };
  }
  if (descriptor.targetPath !== mutation.path
    || descriptor.intendedContent.algorithm !== "sha256"
    || mutation.intendedContent.algorithm !== "sha256"
    || descriptor.intendedContent.hash !== mutation.intendedContent.hash
    || descriptor.intendedContent.sizeBytes !== mutation.intendedContent.sizeBytes
    || mutation.identityAuthority.status !== "unique"
    || mutation.identityAuthority.path !== descriptor.targetPath
    || mutation.identityAuthority.remoteObjectId !== mutation.remoteObjectId) {
    return { status: "not-converged", reason: "persisted REMOTE update descriptor authority is inconsistent" };
  }
  if (mutation.remoteObjectId === mutation.candidateRemoteObjectId) {
    return { status: "not-converged", reason: "predecessor and candidate identities are not distinct" };
  }

  const samePath = entries.filter(entry => !entry.trashed && entry.path === descriptor.targetPath);
  if (samePath.length !== 2) {
    return { status: "not-converged", reason: "REMOTE update path does not contain exactly predecessor plus candidate" };
  }

  const predecessors = samePath.filter(entry => entry.remoteObjectId === mutation.remoteObjectId);
  const candidates = samePath.filter(entry => entry.remoteObjectId === mutation.candidateRemoteObjectId);
  if (predecessors.length !== 1 || candidates.length !== 1) {
    return { status: "not-converged", reason: "REMOTE update path lacks the exact persisted predecessor/candidate identities" };
  }
  const predecessor = predecessors[0]!;
  const candidate = candidates[0]!;
  if (predecessor.entityKind !== "file" || candidate.entityKind !== "file") {
    return { status: "not-converged", reason: "REMOTE update predecessor/candidate are not both files" };
  }
  if (predecessor.content?.revision !== String(mutation.expectedRevision)) {
    return { status: "not-converged", reason: "REMOTE update predecessor revision does not match persisted expectedRevision" };
  }
  if (candidate.content?.hash !== descriptor.intendedContent.hash
    || candidate.content.sizeBytes !== descriptor.intendedContent.sizeBytes) {
    return { status: "not-converged", reason: "REMOTE update candidate does not match persisted intended content" };
  }

  return { status: "converged", predecessor, candidate };
}
