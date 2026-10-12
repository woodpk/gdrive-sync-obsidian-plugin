/** D339-07C matched optimizer comparison. Diagnostic timings are NOT performance acceptance. */
import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type InventoryReadLease, type InventoryIdentityFence,
  type InventoryRemoteEntity, type RemoteEntry, type TrustedSynchronizationState } from "../src/contracts";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { InventoryBackedSnapshotAssembler } from "../src/product/inventory-backed-snapshot-assembler";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";

const cid = <T extends string>(s: string) => contractId<T>(s);
const root = cid<"RemoteObjectId">("managed"), content = cid<"RemoteObjectId">("content");
const config = cid<"RemoteObjectId">("config"), cursor = cid<"ChangeCursor">("token:07C");
const rev = cid<"StateRevision">("rev:07C"), gen = "inventory:07C" as import("../src/contracts").InventoryGeneration;
const fence: InventoryIdentityFence = { vaultIdentity: cid<"VaultIdentity">("vault:07C"),
  deviceIdentity: cid<"DeviceIdentity">("device:07C"), pairedAccountKey: "opaque:07C",
  managedRootId: root, protocolVersion: cid<"ProtocolVersion">("1"),
  contentDomainRootId: content, configDomainRootId: config, scopePolicyFingerprint: "scope:07C",
  inventorySchemaVersion: 2 };
const identity = { rootId: root, vaultIdentity: fence.vaultIdentity, protocolVersion: fence.protocolVersion };
const proof = { sizeBytes: 7, revision: "2" };
const rootRow = (domain: "content" | "portable-config"): InventoryRemoteEntity => ({
  generation: gen, domain, name: domain, kind: "folder", pathValidity: "verified",
  remoteObjectId: domain === "content" ? content : config, parentRemoteObjectId: null,
  managedRootId: root, provenanceDomain: domain, access: "visible", trashed: false,
});
function fixtures(count: number, nested = false) {
  const folderId = cid<"RemoteObjectId">("nested-id"), folderPath = cid<"VaultPath">("nested");
  const folder: InventoryRemoteEntity = { generation: gen, remoteObjectId: folderId,
    parentRemoteObjectId: content, domain: "content", name: "nested", kind: "folder",
    logicalPath: folderPath, pathValidity: "verified", managedRootId: root,
    provenanceDomain: "content", access: "visible", trashed: false };
  const files: InventoryRemoteEntity[] = Array.from({ length: count }, (_, i) => {
    const name = "file-" + String(i).padStart(4, "0") + ".md";
    return { generation: gen, remoteObjectId: cid<"RemoteObjectId">("file:" + i),
      parentRemoteObjectId: nested ? folderId : content, domain: "content", name,
      kind: "file", logicalPath: cid<"VaultPath">((nested ? "nested/" : "") + name),
      pathValidity: "verified", managedRootId: root, provenanceDomain: "content",
      access: "visible", trashed: false, content: proof };
  });
  const nodes = [rootRow("content"), rootRow("portable-config"), ...(nested ? [folder] : []), ...files];
  const listing: RemoteEntry[] = nodes.filter(n => n.logicalPath !== undefined)
    .map(n => ({ path: n.logicalPath!, entityKind: n.kind,
      remoteObjectId: n.remoteObjectId, content: n.content, trashed: false }));
  const first = files[0]!, deleted = cid<"VaultPath">("deleted.md");
  const state: TrustedSynchronizationState = { schemaVersion: 1, stateRevision: rev,
    vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
    base: [{ path: first.logicalPath!, entityKind: "file", remoteExisted: true,
      localExisted: true, remoteObjectId: first.remoteObjectId, content: proof }],
    remoteMappings: [], operations: [], knownDevices: [], changeCursor: cursor,
    tombstones: [{ path: deleted, entityKind: "file", deletedOn: "local" }] };
  return { nodes, listing, first, deleted, state,
    estimatedSerializedBytes: Buffer.byteLength(JSON.stringify(nodes), "utf8") };
}
type Metrics = { fullLists: number; rootValidations: number; cursorReads: number;
  localEnumerations: number; stateLoads: number; pointerReads: number; leaseOpens: number;
  byId: number; byParent: number; coverageReads: number; mutationCalls: number };
function instance(f: ReturnType<typeof fixtures>) {
  const stats: Metrics = { fullLists: 0, rootValidations: 0, cursorReads: 0,
    localEnumerations: 0, stateLoads: 0, pointerReads: 0, leaseOpens: 0,
    byId: 0, byParent: 0, coverageReads: 0, mutationCalls: 0 };
  const rows = new Map(f.nodes.map(n => [String(n.remoteObjectId), n]));
  const lease: InventoryReadLease = {
    generation: gen, fence,
    getById: async key => { stats.byId++; const row = rows.get(String(key));
      return row ? { status: "verified-observation" as const, generation: gen, value: row } :
        { status: "unknown" as const, reason: "no-row" }; },
    listByParent: async (domain, key) => { stats.byParent++;
      return { status: "verified-observation" as const, generation: gen,
        value: f.nodes.filter(row => row.domain === domain && row.parentRemoteObjectId === key) }; },
    listByPath: async () => ({ status: "unknown" as const, reason: "unused" }),
    coverage: async (domain, key) => { stats.coverageReads++;
      return { status: "verified-observation" as const, generation: gen, value: {
        generation: gen, domain, scopeId: key,
        scopeKind: key === content || key === config ? "domain" as const : "parent" as const,
        state: "complete" as const, visibility: "app-visible" as const, allPagesRead: true,
        incompleteSearch: false, provenanceVerified: true, terminalCursor: cursor } }; },
    release: async () => undefined,
  };
  const local = { enumerate: async () => { stats.localEnumerations++;
    return { entries: [{ side: "local" as const, status: "present" as const,
      path: f.first.logicalPath!, entityKind: "file" as const,
      stability: "stable" as const, content: proof }], completeness: { status: "complete" as const } }; } };
  const drive = {
    validateManagedRoot: async () => { stats.rootValidations++;
      return { ok: true as const, value: { status: "valid" as const, identity } }; },
    getStartCursor: async () => { stats.cursorReads++; return { ok: true as const, value: cursor }; },
    verifyRootWideManagedProvenance: async () => ({ ok: true as const, value: undefined }),
    listForReconciliation: async () => { stats.fullLists++;
      return { ok: true as const, value: { entries: f.listing,
        completeness: { status: "complete" as const } } }; },
    create: async () => { stats.mutationCalls++; throw new Error("benchmark must not dispatch"); },
  };
  const store = {
    publicationSnapshot: async () => { stats.pointerReads++;
      return { status: "trusted-fence" as const, value: { activeGeneration: gen,
        canonicalCursor: cursor, persistenceRevision: rev,
        semanticGeneration: cid<"SemanticStateGeneration">("sem:07C"),
        activeManifest: { generation: gen, terminalCursor: cursor } } }; },
    openRead: async () => { stats.leaseOpens++;
      return { status: "verified-observation" as const, generation: gen, value: lease }; },
  };
  const state = { load: async () => { stats.stateLoads++;
    return { status: "trusted" as const, state: f.state }; } };
  const common = { local: local as never, drive: drive as never, state: state as never,
    stateContext: { expectation: "existing-pairing" as const,
      expectedVaultIdentity: fence.vaultIdentity, expectedDeviceIdentity: fence.deviceIdentity },
    remoteIdentity: async () => identity };
  return { stats,
    off: new ProductSnapshotAssembler(common.local, common.drive,
      common.state, common.stateContext, common.remoteIdentity),
    on: new InventoryBackedSnapshotAssembler({ ...common, inventory: store as never,
      currentFence: async () => fence }) };
}
async function sample(f: ReturnType<typeof fixtures>, mode: "OFF" | "ON") {
  const i = instance(f), startHeap = process.memoryUsage(), start = performance.now();
  const result = mode === "OFF" ? await i.off.assembleFull() : await i.on.assemble();
  const end = performance.now(), afterHeap = process.memoryUsage();
  return { mode, result, stats: { ...i.stats }, wallMs: end - start,
    observedHeapBytes: [startHeap.heapUsed, afterHeap.heapUsed],
    observedRssBytes: [startHeap.rss, afterHeap.rss] };
}
for (const { workload, size, nested } of [
  { workload: "flat-small", size: 1, nested: false },
  { workload: "nested-medium", size: 24, nested: true },
  { workload: "flat-large", size: 128, nested: false },
]) {
  test("D339-07C matched " + workload + " exactly preserves snapshots and saves a full listing", async () => {
    const f = fixtures(size, nested), off = await sample(f, "OFF"), on = await sample(f, "ON");
    assert.deepEqual(on.result.input, off.result.input);
    assert.deepEqual(on.result.managedRemote, off.result.managedRemote);
    assert.equal(on.result.nextCursor, off.result.nextCursor);
    const planner = new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner({
      assess: async () => { throw new Error("matched fixture unexpectedly required conflict adjudication"); },
    } as never));
    const offPlan = await planner.plan(off.result.input);
    const onPlan = await planner.plan(on.result.input);
    assert.deepEqual(onPlan, offPlan);
    assert.ok(onPlan.operations.length >= size);
    assert.equal(on.result.mode, "full"); assert.equal(off.result.mode, "full");
    assert.equal(on.result.input.snapshots.find(x => x.path === f.deleted)?.base.status, "trusted");
    assert.equal(off.stats.fullLists, 1); assert.equal(on.stats.fullLists, 0);
    assert.equal(off.stats.leaseOpens, 0); assert.equal(on.stats.leaseOpens, 1);
    assert.ok(on.stats.byParent >= (nested ? 3 : 2));
    // The unified walker checks each distinct scope once: the two domain
    // roots plus the optional nested folder. The prior double-read of each
    // domain root provided no additional coverage or independent proof.
    assert.equal(on.stats.coverageReads, nested ? 3 : 2);
    assert.equal(off.stats.mutationCalls + on.stats.mutationCalls, 0);
    for (const x of [off, on]) {
      console.log("D339_07C_METRIC=" + JSON.stringify({ workload, scale: size, nested,
        mode: x.mode, semanticEqual: true, exactPlanEqual: true,
        plannedOperations: offPlan.operations.length, localVsRemoteInput: "same-controlled-fixture",
        logicalReconciliationLists: x.stats.fullLists, inventoryReads: x.stats,
        wallMs: x.wallMs, observedHeapBytes: x.observedHeapBytes,
        observedRssBytes: x.observedRssBytes,
        serializedInventoryBytesEstimate: f.estimatedSerializedBytes,
        providerHTTPCounts: "UNMEASURED", providerHTTPMs: "UNMEASURED",
        perOperationLatency: "UNMEASURED", attributedRequestCoverage: "UNMEASURED",
        durableIndexedDbBytes: "UNMEASURED", actualProcessPeakMemory: "UNMEASURED" }));
    }
  });
}
