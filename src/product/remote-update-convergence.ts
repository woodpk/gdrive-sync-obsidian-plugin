import type { RecoverablePhysicalMutationDescriptorV1_1, RemoteEntry } from "../contracts";

type RemoteFileDescriptor = Extract<RecoverablePhysicalMutationDescriptorV1_1, { readonly kind: "remote-file" }>;

export type StableRemoteUpdateConvergence =
  | { readonly status: "converged"; readonly observed: RemoteEntry }
  | { readonly status: "not-converged"; readonly reason: string };

/** DEC-362: only the established object ID at a unique live path may converge. */
export function verifyStableRemoteUpdateConvergence(
  descriptor: RemoteFileDescriptor,
  entries: readonly RemoteEntry[],
): StableRemoteUpdateConvergence {
  const mutation = descriptor.remoteMutation;
  if (descriptor.mutationKind !== "update" || mutation.kind !== "existing-file-content-update"
    || mutation.updateProtocol !== "stable-object-in-place") {
    return { status: "not-converged", reason: "descriptor is not a stable existing-file-content-update" };
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
  const live = entries.filter(entry => !entry.trashed && entry.path === descriptor.targetPath);
  if (live.length !== 1 || live[0]?.remoteObjectId !== mutation.remoteObjectId) {
    return { status: "not-converged", reason: "established remote identity is not the unique live path occupant" };
  }
  const observed = live[0]!;
  if (observed.entityKind !== "file"
    || observed.content?.hash !== descriptor.intendedContent.hash
    || observed.content.sizeBytes !== descriptor.intendedContent.sizeBytes) {
    return { status: "not-converged", reason: "established remote file does not contain intended content" };
  }
  if (!observed.content.revision || observed.content.revision === String(mutation.expectedRevision)) {
    return { status: "not-converged", reason: "established remote file lacks a verified new revision" };
  }
  return { status: "converged", observed };
}
