import assert from "node:assert/strict";
import test from "node:test";
import { contractId, remoteUpdateWasSafelyMaterialized, type RemoteEntry, type RemoteObjectId, type VaultPath } from "../../src/contracts";
import { verifyStableRemoteUpdateConvergence } from "../../src/product/remote-update-convergence";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = id<"VaultPath">("notes/stable.md") as VaultPath;
const established = id<"RemoteObjectId">("drive-established-A") as RemoteObjectId;
const rogue = id<"RemoteObjectId">("drive-unrelated-B") as RemoteObjectId;
const beforeRevision = id<"RemoteRevisionId">("17");
const intended = { algorithm: "sha256" as const, hash: id<"ContentHash">("sha256:updated"), sizeBytes: 11 };
const original = { algorithm: "sha256" as const, hash: id<"ContentHash">("sha256:original"), sizeBytes: 8 };

const descriptor = {
  kind: "remote-file" as const,
  targetSide: "remote" as const,
  mutationKind: "update" as const,
  targetPath: path,
  intendedContent: intended,
  remoteMutation: {
    kind: "existing-file-content-update" as const,
    intentId: id<"MutationIntentId">("intent:stable-update"),
    remoteObjectId: established,
    expectedRevision: beforeRevision,
    path,
    updateProtocol: "stable-object-in-place" as const,
    intendedContent: intended,
    identityAuthority: {
      status: "unique" as const,
      generation: id<"SemanticStateGeneration">("generation:1"),
      path,
      remoteObjectId: established,
    },
  },
};
function remote(remoteObjectId: RemoteObjectId, proof = intended, revision = "18", filePath = path): RemoteEntry {
  return { path: filePath, remoteObjectId, entityKind: "file", trashed: false, content: { hash: proof.hash, sizeBytes: proof.sizeBytes, revision } };
}

test("DEC362 identity remains exactly A after a content update", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(established)]);
  assert.equal(result.status, "converged");
  if (result.status === "converged") {
    assert.equal(result.observed.remoteObjectId, established);
    assert.equal(result.observed.content?.revision, "18");
  }
});

test("DEC362 same-path replacement B is never adopted", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(rogue)]);
  assert.equal(result.status, "not-converged");
});

test("DEC362 duplicate live sibling never qualifies as an update", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(established), remote(rogue)]);
  assert.equal(result.status, "not-converged");
});

test("DEC362 wrong content cannot commit authoritative state", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(established, original)]);
  assert.equal(result.status, "not-converged");
});

test("DEC362 absent revision evidence cannot prove successful update", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(established, intended, "")]);
  assert.equal(result.status, "not-converged");
});

test("DEC362 unchanged pre-update revision cannot prove content mutation", () => {
  const result = verifyStableRemoteUpdateConvergence(descriptor, [remote(established, intended, String(beforeRevision))]);
  assert.equal(result.status, "not-converged");
});

test("DEC362 wrong path or trashed identity cannot prove convergence", () => {
  assert.equal(verifyStableRemoteUpdateConvergence(descriptor, [remote(established, intended, "18", id<"VaultPath">("elsewhere.md") as VaultPath)]).status, "not-converged");
  assert.equal(verifyStableRemoteUpdateConvergence(descriptor, [{ ...remote(established), trashed: true }]).status, "not-converged");
});

test("DEC362 contradictory mutation identity authority is refused", () => {
  const contradicting = {
    ...descriptor,
    remoteMutation: { ...descriptor.remoteMutation, identityAuthority: { ...descriptor.remoteMutation.identityAuthority, remoteObjectId: rogue } },
  };
  assert.equal(verifyStableRemoteUpdateConvergence(contradicting, [remote(established)]).status, "not-converged");
});

test("DEC362 same-object application proof is bound to identity, revision and content", () => {
  const proof = {
    kind: "same-object-content-update" as const,
    remoteObjectId: established,
    expectedRevision: beforeRevision,
    verifiedRevision: id<"RemoteRevisionId">("18"),
    intendedContent: intended,
    verifiedContent: intended,
  };
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "same-object-content-update", finalContentMatchesExpected: true, proof }), true);
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "same-object-content-update", finalContentMatchesExpected: false, proof }), false);
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "same-object-content-update", finalContentMatchesExpected: true, proof: { ...proof, verifiedContent: original } }), false);
  assert.equal(remoteUpdateWasSafelyMaterialized({ kind: "same-object-content-update", finalContentMatchesExpected: true, proof: { ...proof, verifiedRevision: beforeRevision } }), false);
});
