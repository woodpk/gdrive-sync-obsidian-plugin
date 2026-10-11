/**
 * DEC-339 D339-07A: true production read semantics against deterministic
 * inventory fixtures. The feature is opt-in only inside these tests.
 * PHX-CI is the sole executable validation authority.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type InventoryIdentityFence, type InventoryRemoteEntity,
  type InventoryReadLease, type RemoteEntry, type TrustedSynchronizationState,
} from "../src/contracts";
import {
  InventoryBackedSnapshotAssembler, readInventoryRemoteListing,
} from "../src/product/inventory-backed-snapshot-assembler";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { verifyPostDispatchConvergenceRead } from "../src/product/authoritative-production-executor-base";

const id = <T extends string>(s: string) => contractId<T>(s);
const vault = id<"VaultIdentity">("vault:d339-07");
const device = id<"DeviceIdentity">("device:d339-07");
const root = id<"RemoteObjectId">("managed");
const content = id<"RemoteObjectId">("content");
const config = id<"RemoteObjectId">("config");
const fileId = id<"RemoteObjectId">("file:1");
const path = id<"VaultPath">("note.md");
const deletedPath = id<"VaultPath">("deleted.md");
const cursor = id<"ChangeCursor">("cursor:07");
const rev = id<"StateRevision">("revision:07");
const gen = "inventory:07" as import("../src/contracts").InventoryGeneration;
const proof = { sizeBytes: 9, revision: "7" };
const fence: InventoryIdentityFence = {
  vaultIdentity: vault, deviceIdentity: device, pairedAccountKey: "opaque:account",
  managedRootId: root, protocolVersion: id<"ProtocolVersion">("1"),
  contentDomainRootId: content, configDomainRootId: config,
  scopePolicyFingerprint: "scope:07", inventorySchemaVersion: 2,
};
const identity = { rootId: root, vaultIdentity: vault, protocolVersion: fence.protocolVersion };
const rootRow = (domain: "content" | "portable-config"): InventoryRemoteEntity => ({
  generation: gen, remoteObjectId: domain === "content" ? content : config,
  parentRemoteObjectId: null, domain, name: domain,
  kind: "folder", pathValidity: "verified", access: "visible", trashed: false,
  managedRootId: root, provenanceDomain: domain,
});
const fileRow = (change: Partial<InventoryRemoteEntity> = {}): InventoryRemoteEntity => ({
  generation: gen, remoteObjectId: fileId, parentRemoteObjectId: content,
  domain: "content", name: "note.md", kind: "file", logicalPath: path,
  pathValidity: "verified", access: "visible", trashed: false,
  managedRootId: root, provenanceDomain: "content", content: proof, ...change,
});
const baseState: TrustedSynchronizationState = {
  schemaVersion: 1, stateRevision: rev, vaultIdentity: vault, deviceIdentity: device,
  base: [{ path, entityKind: "file", remoteExisted: true, localExisted: true,
    remoteObjectId: fileId, content: proof }],
  remoteMappings: [], operations: [], knownDevices: [], changeCursor: cursor,
  tombstones: [{ path: deletedPath, entityKind: "file", deletedOn: "local" }],
};
const canonicalEntries: RemoteEntry[] = [
  { path, entityKind: "file", remoteObjectId: fileId, content: proof, trashed: false },
];
function fixture(options: {
  rows?: readonly InventoryRemoteEntity[];
  fence?: InventoryIdentityFence;
  coverage?: "complete" | "partial";
  incompleteSearch?: boolean;
  cursor?: typeof cursor;
  state?: TrustedSynchronizationState;
} = {}) {
  const rows = options.rows ?? [rootRow("content"), rootRow("portable-config"), fileRow()];
  const lease: InventoryReadLease = {
    generation: gen, fence: options.fence ?? fence,
    getById: async remoteObjectId => {
      const row = rows.find(v => v.remoteObjectId === remoteObjectId);
      return row
        ? { status: "verified-observation" as const, generation: gen, value: row }
        : { status: "unknown" as const, reason: "unobserved" };
    },
    listByParent: async (domain, parent) => ({
      status: "verified-observation" as const, generation: gen,
      value: rows.filter(v => v.domain === domain && v.parentRemoteObjectId === parent),
    }),
    listByPath: async () => ({ status: "unknown" as const, reason: "not-used" }),
    coverage: async (domain, scope) => ({
      status: "verified-observation" as const, generation: gen,
      value: {
        generation: gen, domain, scopeId: scope,
        scopeKind: scope === content || scope === config ? "domain" as const : "parent" as const,
        state: options.coverage ?? "complete", visibility: "app-visible" as const,
        allPagesRead: true, incompleteSearch: options.incompleteSearch ?? false,
        provenanceVerified: true, terminalCursor: options.cursor ?? cursor,
      },
    }),
    release: async () => undefined,
  };
  let fullLists = 0, mutationCalls = 0;
  const local = { enumerate: async () => ({
    entries: [{ side: "local" as const, status: "present" as const, path,
      entityKind: "file" as const, stability: "stable" as const, content: proof }],
    completeness: { status: "complete" as const },
  }) };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: cursor }),
    listForReconciliation: async () => {
      fullLists++;
      return { ok: true as const, value: {
        entries: canonicalEntries, completeness: { status: "complete" as const },
      } };
    },
    create: async () => { mutationCalls++; throw new Error("read tests cannot mutate"); },
  };
  const state = { load: async () => ({ status: "trusted" as const, state: options.state ?? baseState }) };
  const settings = {
    local: local as never, drive: drive as never, state: state as never,
    stateContext: { expectation: "existing-pairing" as const,
      expectedVaultIdentity: vault, expectedDeviceIdentity: device },
    remoteIdentity: async () => identity,
  };
  const store = {
    publicationSnapshot: async () => ({ status: "trusted-fence" as const, value: {
      activeGeneration: gen, canonicalCursor: cursor, persistenceRevision: rev,
      semanticGeneration: id<"SemanticStateGeneration">("semantic:07"),
      activeManifest: { generation: gen, terminalCursor: cursor },
    } }),
    openRead: async () => ({ status: "verified-observation" as const, generation: gen, value: lease }),
  };
  return {
    lease, full: new ProductSnapshotAssembler(
      settings.local, settings.drive, settings.state, settings.stateContext, settings.remoteIdentity,
    ),
    inventory: new InventoryBackedSnapshotAssembler({
      ...settings, inventory: store as never, currentFence: async () => fence,
    }),
    get fullLists() { return fullLists; }, get mutationCalls() { return mutationCalls; },
  };
}

test("D339-07A A07 complete coherent inventory matches canonical LOCAL/REMOTE/BASE and tombstones", async () => {
  const optimized = fixture(), baseline = fixture();
  const actual = await optimized.inventory.assemble();
  const expected = await baseline.full.assembleFull();
  assert.deepEqual(actual.input.snapshots, expected.input.snapshots);
  assert.equal(actual.input.snapshots.find(x => x.path === path)?.base.status, "trusted");
  const missing = actual.input.snapshots.find(x => x.path === deletedPath);
  assert.equal(missing?.base.status, "trusted");
  assert.equal(actual.nextCursor, expected.nextCursor);
  assert.equal(optimized.fullLists, 0);
  assert.equal(baseline.fullLists, 1);
  assert.equal(optimized.mutationCalls + baseline.mutationCalls, 0);
});

test("D339-07A A04/A05 never accepts incomplete pages, stale tokens, wrong scope or inaccessible rows", async () => {
  const cases = [
    { coverage: "partial" as const }, { incompleteSearch: true },
    { cursor: id<"ChangeCursor">("cursor:stale") },
    { fence: { ...fence, pairedAccountKey: "other" } },
    { rows: [rootRow("content"), rootRow("portable-config"), fileRow({ access: "inaccessible" })] },
    { rows: [rootRow("content"), rootRow("portable-config"), fileRow({ pathValidity: "unknown" })] },
  ];
  for (const option of cases) {
    const check = fixture(option);
    const actual = await check.inventory.assemble();
    assert.equal(check.fullLists, 1, JSON.stringify(option));
    assert.equal(actual.input.snapshots.find(x => x.path === path)?.remote.status, "present");
    assert.equal(check.mutationCalls, 0);
  }
});

test("D339-07A A01/A07 same-name IDs, normalized collisions and broken ancestry force full fallback", async () => {
  const cases: readonly (readonly InventoryRemoteEntity[])[] = [
    [rootRow("content"), rootRow("portable-config"), fileRow(),
      fileRow({ remoteObjectId: id<"RemoteObjectId">("second") })],
    [rootRow("content"), rootRow("portable-config"), fileRow(),
      fileRow({ remoteObjectId: id<"RemoteObjectId">("second"), name: "NOTE.md",
        logicalPath: id<"VaultPath">("NOTE.md") })],
    [rootRow("content"), rootRow("portable-config"),
      fileRow({ parentRemoteObjectId: id<"RemoteObjectId">("orphan") })],
    [rootRow("content"), rootRow("portable-config"),
      fileRow({ provenanceDomain: "portable-config" })],
  ];
  for (const rows of cases) {
    const check = fixture({ rows });
    assert.equal(await readInventoryRemoteListing(check.lease, fence, cursor), undefined);
    await check.inventory.assemble();
    assert.equal(check.fullLists, 1);
    assert.equal(check.mutationCalls, 0);
  }
});

test("D339-07A A09 outstanding durable effects bypass cached observations", async () => {
  const pending = { ...baseState, operations: [{
    operationId: id<"OperationId">("op:unfinished"), status: "uncertain" as const, path,
  }] };
  const check = fixture({ state: pending });
  await check.inventory.assemble();
  assert.equal(check.fullLists, 1);
  assert.equal(check.mutationCalls, 0);
});

test("D339-07A A03 default-off and contradictory targeted executor claims always use canonical read", async () => {
  let targetedCalls = 0, canonicalCalls = 0;
  const descriptor = {
    kind: "remote-file" as const, targetSide: "remote" as const, mutationKind: "create" as const,
    targetPath: path, intendedContent: { algorithm: "sha256" as const,
      hash: id<"ContentHash">("sha256:abc"), sizeBytes: 9 },
    remoteMutation: {
      kind: "reserved-file-create" as const, intentId: id<"MutationIntentId">("intent:07"),
      reservedRemoteObjectId: fileId, path,
      intendedContent: { algorithm: "sha256" as const,
        hash: id<"ContentHash">("sha256:abc"), sizeBytes: 9 },
    },
  };
  const proofReader = { observe: async () => {
    targetedCalls++;
    return { status: "verified-convergence-read" as const,
      operationId: id<"OperationId">("wrong-operation"), effectId: "effect:07",
      remoteObjectId: fileId, targetPath: path };
  } };
  const fallback = async () => { canonicalCalls++; return { ok: false as const, reason: "canonical-conflict" }; };
  const opts = { targetedConvergence: {
    reader: proofReader, expectedFence: fence, generation: gen,
  } };
  const idOp = id<"OperationId">("op:07");
  assert.deepEqual(await verifyPostDispatchConvergenceRead(idOp, "effect:07", descriptor, opts, fallback),
    { ok: false, reason: "canonical-conflict" });
  assert.equal(targetedCalls, 0);
  assert.deepEqual(await verifyPostDispatchConvergenceRead(idOp, "effect:07", descriptor, {
    targetedConvergence: { ...opts.targetedConvergence, enabled: true },
  }, fallback), { ok: false, reason: "canonical-conflict" });
  assert.equal(targetedCalls, 1);
  assert.equal(canonicalCalls, 2);
});
