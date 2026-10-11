/** D339-07B2: production fallback, recovery and fresh physical proof boundaries. */
import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type InventoryReadLease, type InventoryIdentityFence,
  type InventoryRemoteEntity, type RemoteEntry, type TrustedSynchronizationState } from "../src/contracts";
import { InventoryBackedSnapshotAssembler } from "../src/product/inventory-backed-snapshot-assembler";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { VerifiedMetadataInventoryReader } from "../src/drive/verified-metadata-inventory-reader";
import { verifyPostDispatchConvergenceRead } from "../src/product/authoritative-production-executor-base";
import type { InventoryMetadataSource, InventoryDriveFile } from "../src/drive/inventory-metadata-source";

const id = <T extends string>(s: string) => contractId<T>(s);
const root = id<"RemoteObjectId">("managed"), contentRoot = id<"RemoteObjectId">("content");
const configRoot = id<"RemoteObjectId">("config"), doc = id<"RemoteObjectId">("doc");
const path = id<"VaultPath">("note.md"), removed = id<"VaultPath">("deleted.md");
const cursor = id<"ChangeCursor">("cursor:B2"), rev = id<"StateRevision">("revision:B2");
const gen = "generation:B2" as import("../src/contracts").InventoryGeneration;
const fence: InventoryIdentityFence = {
  vaultIdentity: id<"VaultIdentity">("vault:B2"), deviceIdentity: id<"DeviceIdentity">("device:B2"),
  pairedAccountKey: "opaque:B2", managedRootId: root, protocolVersion: id<"ProtocolVersion">("1"),
  contentDomainRootId: contentRoot, configDomainRootId: configRoot,
  scopePolicyFingerprint: "policy:B2", inventorySchemaVersion: 2,
};
const identity = { rootId: root, vaultIdentity: fence.vaultIdentity, protocolVersion: fence.protocolVersion };
const proof = { sizeBytes: 5, revision: "2" };
const row = (domain: "content" | "portable-config"): InventoryRemoteEntity => ({
  generation: gen, remoteObjectId: domain === "content" ? contentRoot : configRoot,
  parentRemoteObjectId: null, name: domain, domain, kind: "folder",
  pathValidity: "verified", access: "visible", trashed: false,
  managedRootId: root, provenanceDomain: domain,
});
const file: InventoryRemoteEntity = {
  generation: gen, remoteObjectId: doc, parentRemoteObjectId: contentRoot, domain: "content",
  name: "note.md", logicalPath: path, kind: "file", pathValidity: "verified",
  access: "visible", trashed: false, managedRootId: root, provenanceDomain: "content", content: proof,
};
const base: TrustedSynchronizationState = {
  schemaVersion: 1, stateRevision: rev, vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
  base: [{ path, entityKind: "file", remoteExisted: true, localExisted: true,
    remoteObjectId: doc, content: proof }],
  remoteMappings: [], operations: [], knownDevices: [], changeCursor: cursor,
  tombstones: [{ path: removed, entityKind: "file", deletedOn: "local" }],
};
const canonical: RemoteEntry[] = [{ path, entityKind: "file", remoteObjectId: doc, content: proof, trashed: false }];
function comparison(options: { drift?: "authority" | "fence"; full?: boolean } = {}) {
  const nodes = [row("content"), row("portable-config"), file];
  let physicalLists = 0, opens = 0, snapshots = 0, fenceReads = 0, mutationAttempts = 0;
  const lease: InventoryReadLease = {
    generation: gen, fence,
    getById: async key => {
      const found = nodes.find(x => x.remoteObjectId === key);
      return found ? { status: "verified-observation" as const, generation: gen, value: found } :
        { status: "unknown" as const, reason: "unobserved" };
    },
    listByParent: async (domain, parent) => ({ status: "verified-observation" as const,
      generation: gen, value: nodes.filter(x => x.domain === domain && x.parentRemoteObjectId === parent) }),
    listByPath: async () => ({ status: "unknown" as const, reason: "unused" }),
    coverage: async (domain, scope) => ({ status: "verified-observation" as const,
      generation: gen, value: { generation: gen, domain, scopeId: scope,
        scopeKind: scope === contentRoot || scope === configRoot ? "domain" as const : "parent" as const,
        state: "complete" as const, visibility: "app-visible" as const,
        allPagesRead: true, incompleteSearch: false, provenanceVerified: true, terminalCursor: cursor } }),
    release: async () => undefined,
  };
  const local = { enumerate: async () => ({ entries: [{
    side: "local" as const, status: "present" as const, path, entityKind: "file" as const,
    stability: "stable" as const, content: proof,
  }], completeness: { status: "complete" as const } }) };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: cursor }),
    listForReconciliation: async () => {
      physicalLists++;
      return { ok: true as const, value: { entries: canonical, completeness: { status: "complete" as const } } };
    },
    create: async () => { mutationAttempts++; throw new Error("read-only test"); },
  };
  const state = { load: async () => ({ status: "trusted" as const, state: base }) };
  const common = { local: local as never, drive: drive as never, state: state as never,
    stateContext: { expectation: "existing-pairing" as const,
      expectedVaultIdentity: fence.vaultIdentity, expectedDeviceIdentity: fence.deviceIdentity },
    remoteIdentity: async () => identity };
  const inventory = {
    publicationSnapshot: async () => {
      snapshots++;
      return { status: "trusted-fence" as const, value: {
        activeGeneration: gen, canonicalCursor: cursor, persistenceRevision: rev,
        semanticGeneration: id<"SemanticStateGeneration">(
          options.drift === "authority" && snapshots >= 2 ? "semantic:changed" : "semantic:base"),
        activeManifest: { generation: gen, terminalCursor: cursor },
      } };
    },
    openRead: async () => { opens++; return { status: "verified-observation" as const, generation: gen, value: lease }; },
  };
  return {
    full: new ProductSnapshotAssembler(common.local, common.drive, common.state,
      common.stateContext, common.remoteIdentity),
    optimized: new InventoryBackedSnapshotAssembler({ ...common, inventory: inventory as never,
      currentFence: async () => {
        fenceReads++;
        return options.drift === "fence" && fenceReads >= 2 ?
          { ...fence, scopePolicyFingerprint: "changed" } : fence;
      }, fullReconcileRequired: () => options.full === true }),
    get physicalLists() { return physicalLists; }, get opens() { return opens; },
    get snapshots() { return snapshots; }, get mutationAttempts() { return mutationAttempts; },
  };
}
test("B2-A07 authority publication race after inventory read delegates to real full reconciliation", async () => {
  const fixture = comparison({ drift: "authority" });
  const result = await fixture.optimized.assemble();
  const full = await fixture.full.assembleFull();
  assert.deepEqual(result.input.snapshots, full.input.snapshots);
  assert.equal(fixture.opens, 1);
  assert.ok(fixture.snapshots >= 2);
  assert.equal(fixture.physicalLists, 2);
  assert.equal(result.input.snapshots.find(x => x.path === removed)?.base.status, "trusted");
  assert.equal(fixture.mutationAttempts, 0);
});
test("B2-A07 changed scope fence after snapshot prevents cached REMOTE planning input", async () => {
  const fixture = comparison({ drift: "fence" });
  const result = await fixture.optimized.assemble();
  assert.equal(fixture.opens, 1);
  assert.equal(fixture.physicalLists, 1);
  assert.equal(result.mode, "full");
  assert.equal(result.input.snapshots.find(x => x.path === path)?.remote.status, "present");
});
test("B2-A09 explicit full-reconcile request never opens the inventory lease", async () => {
  const fixture = comparison({ full: true });
  const result = await fixture.optimized.assemble();
  assert.equal(result.mode, "full");
  assert.equal(fixture.opens, 0);
  assert.equal(fixture.snapshots, 0);
  assert.equal(fixture.physicalLists, 1);
  assert.equal(fixture.mutationAttempts, 0);
});
test("B2-A09 recovery reconstruction must enumerate physical REMOTE, never trust cached BASE", async () => {
  const fixture = comparison();
  const result = await fixture.optimized.assembleRecovery("uncertain-dispatch");
  assert.equal(fixture.opens, 0);
  assert.equal(fixture.physicalLists, 1);
  assert.equal(result.reconstruction, true);
  assert.equal(result.input.state.status, "uninitialized");
  assert.equal(result.input.snapshots.find(x => x.path === path)?.remote.status, "present");
  assert.equal(fixture.mutationAttempts, 0);
});
test("B2-A03 unrelated escaped marked object fails fresh targeted proof despite unique siblings", async () => {
  const FOLDER = "application/vnd.google-apps.folder";
  const dir: InventoryDriveFile = { id: "dir", name: "A", mimeType: FOLDER, parents: ["content"],
    trashed: false, appProperties: { brainManagedRootId: "managed", brainSyncDomain: "content" } };
  const target: InventoryDriveFile = { id: "doc", name: "note.md", mimeType: "text/plain",
    parents: ["dir"], trashed: false, version: "2",
    appProperties: { brainManagedRootId: "managed", brainSyncDomain: "content" } };
  const escaped: InventoryDriveFile = { ...target, id: "escaped", name: "unrelated.md", parents: ["outside"] };
  const reads: string[] = [];
  const source: InventoryMetadataSource = {
    verifyFence: async () => ({ status: "ok", value: undefined }),
    getStartToken: async () => ({ status: "ok", value: "t0" }),
    getFile: async key => {
      reads.push("get:" + key);
      const value = key === "doc" ? target : key === "dir" ? dir : undefined;
      return value ? { status: "ok", value } : { status: "unknown", reason: "outside-unproven" };
    },
    listChildren: async (parent, token) => {
      reads.push("list:" + parent + ":" + (token ?? ""));
      return { status: "ok", value: { files: [target], incompleteSearch: false } };
    },
    listMarked: async () => {
      reads.push("marked");
      return { status: "ok", value: { files: [dir, target, escaped], incompleteSearch: false } };
    },
    listChanges: async () => ({ status: "ok", value: { changes: [], newStartPageToken: "t1" } }),
  };
  const request = { remoteObjectId: doc, parentRemoteObjectId: id<"RemoteObjectId">("dir"),
    domain: "content" as const, name: "note.md", purpose: "effect-convergence" as const };
  const outcome = await new VerifiedMetadataInventoryReader(source).targeted(fence, gen, request);
  assert.equal(outcome.status, "unknown");
  if (outcome.status !== "ok") assert.equal(outcome.reason, "marked-object-ancestry-unavailable");
  assert.deepEqual(reads, ["get:doc", "get:dir", "list:dir:", "marked", "get:dir", "get:outside"]);
});
test("B2-A03 enabled targeted convergence with wrong effect ID delegates to canonical result", async () => {
  const effectId = "effect:B2";
  const descriptor = {
    kind: "remote-file" as const, targetSide: "remote" as const, mutationKind: "create" as const,
    targetPath: path, intendedContent: { algorithm: "sha256" as const,
      hash: id<"ContentHash">("sha256:B2"), sizeBytes: 5 },
    remoteMutation: { kind: "reserved-file-create" as const, intentId: id<"MutationIntentId">("intent:B2"),
      reservedRemoteObjectId: doc, path, intendedContent: { algorithm: "sha256" as const,
        hash: id<"ContentHash">("sha256:B2"), sizeBytes: 5 } },
  };
  let targeted = 0, canonicalReads = 0;
  const result = await verifyPostDispatchConvergenceRead(id<"OperationId">("op:B2"), effectId,
    descriptor, { targetedConvergence: { enabled: true, expectedFence: fence, generation: gen,
      reader: { observe: async () => {
        targeted++;
        return { status: "verified-convergence-read" as const, operationId: id<"OperationId">("op:B2"),
          effectId: "wrong-effect", remoteObjectId: doc, targetPath: path };
      } } } }, async () => { canonicalReads++; return { ok: false as const, reason: "physical-conflict" }; });
  assert.deepEqual(result, { ok: false, reason: "physical-conflict" });
  assert.equal(targeted, 1);
  assert.equal(canonicalReads, 1);
});
