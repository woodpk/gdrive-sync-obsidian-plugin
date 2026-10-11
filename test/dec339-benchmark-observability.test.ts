/** D339-07C fallback cost controls. Report observed calls; never invent HTTP attribution. */
import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type InventoryIdentityFence, type InventoryRemoteEntity,
  type InventoryReadLease, type RemoteEntry, type TrustedSynchronizationState } from "../src/contracts";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { InventoryBackedSnapshotAssembler } from "../src/product/inventory-backed-snapshot-assembler";

const id = <T extends string>(s: string) => contractId<T>(s);
const root = id<"RemoteObjectId">("root"), content = id<"RemoteObjectId">("content");
const config = id<"RemoteObjectId">("config"), fileId = id<"RemoteObjectId">("file");
const path = id<"VaultPath">("note.md"), cursor = id<"ChangeCursor">("cursor:07C");
const rev = id<"StateRevision">("revision:07C");
const gen = "generation:07C" as import("../src/contracts").InventoryGeneration;
const fence: InventoryIdentityFence = {
  vaultIdentity: id<"VaultIdentity">("vault:07C"),
  deviceIdentity: id<"DeviceIdentity">("device:07C"),
  pairedAccountKey: "opaque:07C", managedRootId: root,
  protocolVersion: id<"ProtocolVersion">("1"), contentDomainRootId: content,
  configDomainRootId: config, scopePolicyFingerprint: "scope:07C", inventorySchemaVersion: 2,
};
const identity = { rootId: root, vaultIdentity: fence.vaultIdentity, protocolVersion: fence.protocolVersion };
const proof = { sizeBytes: 8, revision: "3" };
const rows: InventoryRemoteEntity[] = [
  ...(["content", "portable-config"] as const).map(domain => ({
    generation: gen, domain, name: domain, remoteObjectId: domain === "content" ? content : config,
    parentRemoteObjectId: null, kind: "folder" as const, pathValidity: "verified" as const,
    access: "visible" as const, trashed: false,
    provenanceDomain: domain, managedRootId: root })),
  { generation: gen, domain: "content", name: "note.md", remoteObjectId: fileId,
    parentRemoteObjectId: content, kind: "file", logicalPath: path, content: proof,
    pathValidity: "verified", access: "visible", trashed: false, managedRootId: root,
    provenanceDomain: "content" },
];
const canonical: RemoteEntry[] = [
  { path, entityKind: "file", remoteObjectId: fileId, content: proof, trashed: false },
];
const normalState: TrustedSynchronizationState = {
  schemaVersion: 1, stateRevision: rev, vaultIdentity: fence.vaultIdentity,
  deviceIdentity: fence.deviceIdentity,
  base: [{ path, entityKind: "file", remoteExisted: true, localExisted: true,
    remoteObjectId: fileId, content: proof }],
  remoteMappings: [], operations: [], knownDevices: [], changeCursor: cursor,
  tombstones: [],
};
type Scenario = "full-required" | "pending-effect" | "stale-cursor" | "partial-coverage" | "fence-race";
function fixture(scenario: Scenario) {
  const calls = { lists: 0, rootValidations: 0, cursorReads: 0, pointerReads: 0,
    leaseOpens: 0, leaseReleases: 0, byParent: 0, local: 0, mutations: 0, fenceReads: 0 };
  const state = scenario === "pending-effect" ? { ...normalState, operations: [
    { operationId: id<"OperationId">("unfinished"), status: "uncertain" as const, path },
  ] } : normalState;
  const lease: InventoryReadLease = {
    generation: gen, fence,
    getById: async key => {
      const row = rows.find(x => x.remoteObjectId === key);
      return row ? { status: "verified-observation" as const, generation: gen, value: row } :
        { status: "unknown" as const, reason: "missing" };
    },
    listByParent: async (domain, parent) => { calls.byParent++;
      return { status: "verified-observation" as const, generation: gen,
        value: rows.filter(x => x.domain === domain && x.parentRemoteObjectId === parent) }; },
    listByPath: async () => ({ status: "unknown" as const, reason: "unused" }),
    coverage: async (domain, key) => ({ status: "verified-observation" as const, generation: gen,
      value: { generation: gen, domain, scopeId: key,
        scopeKind: key === content || key === config ? "domain" as const : "parent" as const,
        state: scenario === "partial-coverage" ? "partial" as const : "complete" as const,
        visibility: "app-visible" as const, allPagesRead: true, incompleteSearch: false,
        provenanceVerified: true, terminalCursor: cursor } }),
    release: async () => { calls.leaseReleases++; },
  };
  const drive = {
    validateManagedRoot: async () => { calls.rootValidations++;
      return { ok: true as const, value: { status: "valid" as const, identity } }; },
    getStartCursor: async () => { calls.cursorReads++;
      return { ok: true as const, value: cursor }; },
    listForReconciliation: async () => { calls.lists++;
      return { ok: true as const, value: {
        entries: canonical, completeness: { status: "complete" as const } } }; },
    create: async () => { calls.mutations++; throw new Error("no writes authorized"); },
  };
  const local = { enumerate: async () => { calls.local++;
    return { entries: [{ side: "local" as const, status: "present" as const,
      path, entityKind: "file" as const, stability: "stable" as const, content: proof }],
      completeness: { status: "complete" as const } }; } };
  const sync = { load: async () => ({ status: "trusted" as const, state }) };
  const inventory = {
    publicationSnapshot: async () => { calls.pointerReads++;
      return { status: "trusted-fence" as const, value: {
        activeGeneration: gen, canonicalCursor: scenario === "stale-cursor" ?
          id<"ChangeCursor">("stale") : cursor,
        persistenceRevision: rev, semanticGeneration: id<"SemanticStateGeneration">("semantic:07C"),
        activeManifest: { generation: gen, terminalCursor: cursor },
      } }; },
    openRead: async () => { calls.leaseOpens++;
      return { status: "verified-observation" as const, generation: gen, value: lease }; },
  };
  const common = { drive: drive as never, local: local as never, state: sync as never,
    stateContext: { expectation: "existing-pairing" as const,
      expectedVaultIdentity: fence.vaultIdentity, expectedDeviceIdentity: fence.deviceIdentity },
    remoteIdentity: async () => identity };
  return {
    calls,
    off: new ProductSnapshotAssembler(common.local, common.drive,
      common.state, common.stateContext, common.remoteIdentity),
    on: new InventoryBackedSnapshotAssembler({
      ...common, inventory: inventory as never, currentFence: async () => {
        calls.fenceReads++;
        return scenario === "fence-race" && calls.fenceReads > 1 ?
          { ...fence, scopePolicyFingerprint: "changed:07C" } : fence;
      }, fullReconcileRequired: () => scenario === "full-required",
    }),
  };
}
for (const scenario of ["full-required", "pending-effect", "stale-cursor",
  "partial-coverage", "fence-race"] as const) {
  test("D339-07C matched fallback " + scenario + " retains canonical safety and costs", async () => {
    const on = fixture(scenario), off = fixture(scenario);
    const before = process.memoryUsage(), startOn = performance.now();
    const actual = await on.on.assemble();
    const elapsedOn = performance.now() - startOn, afterOn = process.memoryUsage();
    const startOff = performance.now(), expected = await off.off.assembleFull();
    const elapsedOff = performance.now() - startOff, afterOff = process.memoryUsage();
    assert.deepEqual(actual.input, expected.input);
    assert.equal(actual.nextCursor, expected.nextCursor);
    assert.deepEqual(actual.managedRemote, expected.managedRemote);
    assert.equal(on.calls.lists, 1);
    assert.equal(off.calls.lists, 1);
    assert.equal(on.calls.mutations + off.calls.mutations, 0);
    assert.ok(scenario === "partial-coverage" || scenario === "fence-race" ?
      on.calls.leaseOpens === 1 : on.calls.leaseOpens === 0);
    assert.equal(on.calls.leaseReleases, on.calls.leaseOpens);
    console.log("D339_07C_METRIC=" + JSON.stringify({ workload: "fallback:" + scenario,
      semanticEqual: true, OFF: off.calls, ON: on.calls,
      wallMs: { OFF: elapsedOff, ON: elapsedOn },
      observedHeapBytes: [before.heapUsed, afterOn.heapUsed, afterOff.heapUsed],
      observedRssBytes: [before.rss, afterOn.rss, afterOff.rss],
      serializedInventoryBytesEstimate: Buffer.byteLength(JSON.stringify(rows), "utf8"),
      providerHTTPCounts: "UNMEASURED", providerHTTPMs: "UNMEASURED",
      perOperationLatency: "UNMEASURED", attributedRequestCoverage: "UNMEASURED",
      durableIndexedDbBytes: "UNMEASURED", actualProcessPeakMemory: "UNMEASURED",
      conclusion: "FALLBACK_NO_SPEEDUP_CLAIM" }));
  });
}
