import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  folderCreateDescriptorIsSelfConsistent,
  folderCreateEligibleForAuthoritativeCommit,
  folderCreateRestartRecoveryDirective,
  verifyLocalFolderCreate,
  verifyRemoteFolderCreate,
  type FolderCreatePathAuthority,
  type LocalFolderCreatePhysicalMutationDescriptor,
  type MutationIntentId,
  type ObservationToken,
  type RemoteFolderCreatePhysicalMutationDescriptor,
  type RemoteMutationIdentity,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type VaultPath,
} from "../src/contracts";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const generation = (value: string) => id<"SemanticStateGeneration">(value) as SemanticStateGeneration;
const observation = (value: string) => id<"ObservationToken">(value) as ObservationToken;
const intentId = id<"MutationIntentId">("intent:folder") as MutationIntentId;

const pathAuthority = (target = path("empty"), parent = path("")): FolderCreatePathAuthority => ({
  generation: generation("semantic:folder"),
  targetPath: target,
  parentPath: parent,
  pathComparisonKey: String(target).normalize("NFC").toLocaleLowerCase("en-US"),
  expectedTarget: "absent",
});

const localDescriptor = (): LocalFolderCreatePhysicalMutationDescriptor => ({
  kind: "local-folder-create",
  targetSide: "local",
  mutationKind: "create",
  intentId,
  targetPath: path("empty"),
  pathAuthority: pathAuthority(),
});

const remoteDescriptor = (): RemoteFolderCreatePhysicalMutationDescriptor => {
  const remoteMutation: Extract<RemoteMutationIdentity, { readonly kind: "reserved-folder-create" }> = {
    kind: "reserved-folder-create",
    intentId,
    reservedRemoteObjectId: remoteId("folder:new"),
    path: path("empty"),
  };
  return {
    kind: "remote-folder-create",
    targetSide: "remote",
    mutationKind: "create",
    intentId,
    targetPath: path("empty"),
    parentRemoteObjectId: remoteId("folder:parent"),
    pathAuthority: pathAuthority(),
    remoteMutation,
  };
};

test("folder create: local intent persisted before dispatch is safely unattempted", () => {
  const descriptor = localDescriptor();
  assert.equal(folderCreateDescriptorIsSelfConsistent(descriptor), true);
  assert.deepEqual(folderCreateRestartRecoveryDirective({ stage: "intent-persisted" }), { action: "retire-unattempted-intent" });
});

test("folder create: local dispatch authority means physical reality must be reconciled", () => {
  assert.deepEqual(folderCreateRestartRecoveryDirective({ stage: "dispatch-authorized" }), { action: "reconcile-physical-reality" });
  assert.deepEqual(folderCreateRestartRecoveryDirective({ stage: "outcome-unknown" }), { action: "reconcile-physical-reality" });
});

test("folder create: local folder requires structural path authority before verified effect", () => {
  const descriptor = localDescriptor();
  const verified = verifyLocalFolderCreate(descriptor, {
    status: "folder",
    targetPath: path("empty"),
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    observationToken: observation("local:folder"),
  });
  assert.equal(verified.status, "verified-effect");
  const collision = verifyLocalFolderCreate(descriptor, {
    status: "occupied",
    targetPath: path("empty"),
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    entityKind: "file",
  });
  assert.equal(collision.status, "conflict-preserved");
});

test("folder create: local authoritative absence is verified-not-applied", () => {
  const descriptor = localDescriptor();
  assert.equal(verifyLocalFolderCreate(descriptor, {
    status: "authoritative-absent",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
  }).status, "verified-not-applied");
});

test("folder create: remote lost response reconciles the same reserved Drive identity", () => {
  const descriptor = remoteDescriptor();
  const verified = verifyRemoteFolderCreate(descriptor, {
    status: "folder",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    remoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: descriptor.parentRemoteObjectId,
  });
  assert.equal(verified.status, "verified-effect");
  if (verified.status === "verified-effect" && verified.proof.kind === "remote-folder-create") {
    assert.equal(verified.proof.reservedRemoteObjectId, remoteId("folder:new"));
  }
});

test("folder create: remote reserved identity can prove definitely not applied and be retried with same authority", () => {
  const descriptor = remoteDescriptor();
  const result = verifyRemoteFolderCreate(descriptor, {
    status: "authoritative-absent",
    reservedRemoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId,
  });
  assert.equal(result.status, "verified-not-applied");
  assert.equal(descriptor.remoteMutation.reservedRemoteObjectId, remoteId("folder:new"));
});

test("folder create: same logical remote path with wrong object identity is conflict, not convergence", () => {
  const descriptor = remoteDescriptor();
  const result = verifyRemoteFolderCreate(descriptor, {
    status: "folder",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    remoteObjectId: remoteId("folder:other"),
    parentRemoteObjectId: descriptor.parentRemoteObjectId,
  });
  assert.equal(result.status, "conflict-preserved");
});

test("folder create: empty folder lifecycle uses structural proof and still requires path convergence before authoritative commit", () => {
  const descriptor = remoteDescriptor();
  const applied = verifyRemoteFolderCreate(descriptor, {
    status: "folder",
    targetPath: descriptor.targetPath,
    pathComparisonKey: descriptor.pathAuthority.pathComparisonKey,
    remoteObjectId: descriptor.remoteMutation.reservedRemoteObjectId,
    parentRemoteObjectId: descriptor.parentRemoteObjectId,
  });
  assert.equal(folderCreateEligibleForAuthoritativeCommit(applied, { status: "unknown", reasonCode: "convergence-not-yet-proven" }), false);
  assert.equal(folderCreateEligibleForAuthoritativeCommit(applied, { status: "converged", generation: generation("semantic:folder:next"), baseFingerprint: id<"BaseFingerprint">("base:folder") as never }), true);
  assert.equal("intendedContent" in descriptor, false);
});
