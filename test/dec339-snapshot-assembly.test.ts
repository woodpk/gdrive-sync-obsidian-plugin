import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type InventoryIdentityFence, type InventoryRemoteEntity,
  type InventoryReadLease, type RemoteEntry, type TrustedSynchronizationState } from "../src/contracts";
import { InventoryBackedSnapshotAssembler, readInventoryRemoteListing } from "../src/product/inventory-backed-snapshot-assembler";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const vault = id<"VaultIdentity">("vault:d339-05");
const device = id<"DeviceIdentity">("device:d339-05");
const root = id<"RemoteObjectId">("drive:managed");
const content = id<"RemoteObjectId">("drive:content");
const config = id<"RemoteObjectId">("drive:config");
const cursor = id<"ChangeCursor">("cursor:5");
const revision = id<"StateRevision">("rev:7");
const generation = "inventory:5" as import("../src/contracts").InventoryGeneration;
const fence: InventoryIdentityFence = {
  vaultIdentity: vault, deviceIdentity: device, pairedAccountKey: "opaque:paired",
  managedRootId: root, protocolVersion: id<"ProtocolVersion">("1"),
  contentDomainRootId: content, configDomainRootId: config,
  scopePolicyFingerprint: "scope:stable", inventorySchemaVersion: 2,
};
const identity = { rootId: root, vaultIdentity: vault, protocolVersion: fence.protocolVersion };
const path = id<"VaultPath">("alpha.md");
const fileId = id<"RemoteObjectId">("drive:alpha");
const contentProof = { sizeBytes: 9, revision: "7" };
const entries: RemoteEntry[] = [{ path, entityKind: "file", remoteObjectId: fileId, content: contentProof, trashed: false }];
const state: TrustedSynchronizationState = {
  schemaVersion: 1, stateRevision: revision, vaultIdentity: vault, deviceIdentity: device,
  base: [{ path, entityKind: "file", remoteExisted: true, localExisted: true, remoteObjectId: fileId, content: contentProof }],
  remoteMappings: [], tombstones: [{ path: id<"VaultPath">("deleted.md"), entityKind: "file", deletedOn: "local" }],
  changeCursor: cursor, operations: [], knownDevices: [],
};
const rootEntity = (domain: "content" | "portable-config"): InventoryRemoteEntity => ({
  generation, remoteObjectId: domain === "content" ? content : config,
  parentRemoteObjectId: null, domain, name: domain === "content" ? "vault" : "__brain_sync_portable_config__",
  kind: "folder", pathValidity: "verified", access: "visible", trashed: false,
  managedRootId: root, provenanceDomain: domain,
});
const fileEntity = (values: Partial<InventoryRemoteEntity> = {}): InventoryRemoteEntity => ({
  generation, remoteObjectId: fileId, parentRemoteObjectId: content,
  domain: "content", name: "alpha.md", kind: "file", logicalPath: path,
  pathValidity: "verified", access: "visible", trashed: false,
  managedRootId: root, provenanceDomain: "content", content: contentProof,
  ...values,
});
function fixture(options: {
  readonly rows?: readonly InventoryRemoteEntity[];
  readonly coverageValid?: boolean;
  readonly fence?: InventoryIdentityFence;
  readonly cursor?: typeof cursor;
  readonly storeThrows?: boolean;
  readonly provenanceFailure?: boolean;
  readonly provenanceMissing?: boolean;
  readonly provenanceThrows?: boolean;
  readonly emptyIncrementalChanges?: boolean;
  readonly fullListingFailure?: boolean;
  readonly fullListingPartial?: boolean;
  readonly state?: TrustedSynchronizationState;
} = {}) {
  const rows = options.rows ?? [rootEntity("content"), rootEntity("portable-config"), fileEntity()];
  const expected = options.fence ?? fence;
  const activeCursor = options.cursor ?? cursor;
  let releases = 0, remoteLists = 0, localReads = 0, invReads = 0, provenanceReads = 0, changesReads = 0;
  const lease: InventoryReadLease = {
    generation, fence: expected,
    getById: async remoteObjectId => {
      const value = rows.find(row => row.remoteObjectId === remoteObjectId);
      return value
        ? { status: "verified-observation" as const, generation, value }
        : { status: "unknown" as const, reason: "no-id" };
    },
    listByParent: async (domain, parent) => ({
      status: "verified-observation" as const, generation,
      value: rows.filter(row => row.domain === domain && row.parentRemoteObjectId === parent),
    }),
    listByPath: async () => ({ status: "unknown" as const, reason: "unused" }),
    coverage: async (domain, scope) => ({
      status: "verified-observation" as const, generation,
      value: {
        generation, domain, scopeId: scope,
        scopeKind: scope === content || scope === config ? "domain" as const : "parent" as const,
        state: options.coverageValid === false ? "partial" as const : "complete" as const,
        visibility: "app-visible" as const, allPagesRead: true, incompleteSearch: false,
        provenanceVerified: true, terminalCursor: activeCursor,
      },
    }),
    release: async () => { releases++; },
  };
  const inventory = {
    publicationSnapshot: async () => {
      if (options.storeThrows) throw new Error("indexeddb-not-available");
      return { status: "trusted-fence" as const, value: {
        activeGeneration: generation, canonicalCursor: activeCursor,
        persistenceRevision: revision, semanticGeneration: id<"SemanticStateGeneration">("semantic:7"),
        activeManifest: { generation, terminalCursor: activeCursor },
      } };
    },
    openRead: async () => { invReads++; return { status: "verified-observation" as const, generation, value: lease }; },
  };
  const local = {
    enumerate: async () => { localReads++; return {
      entries: [{ side: "local" as const, status: "present" as const, path,
        entityKind: "file" as const, stability: "stable" as const, content: contentProof }],
      completeness: { status: "complete" as const },
    }; },
  };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity } }),
    getStartCursor: async () => ({ ok: true as const, value: cursor }),
    listForReconciliation: async () => {
      remoteLists++;
      if (options.fullListingFailure) return { ok: false as const,
        signal: { kind: "recovery-required" as const, detail: "managed-object-left-remote-domain" } };
      return { ok: true as const, value: { entries,
        completeness: options.fullListingPartial
          ? { status: "partial" as const, reason: "incomplete-full-listing" }
          : { status: "complete" as const } } };
    },
  };
  const store = { load: async () => ({ status: "trusted" as const, state: options.state ?? state }) };
  const settings = {
    local: local as never, drive: drive as never, state: store as never,
    stateContext: { expectation: "existing-pairing" as const,
      expectedVaultIdentity: vault, expectedDeviceIdentity: device },
    remoteIdentity: async () => identity,
  };
  const optimized = new InventoryBackedSnapshotAssembler({
    ...settings, inventory: inventory as never, currentFence: async () => fence,
    ...(options.emptyIncrementalChanges ? { reliableChanges: {
      readChangePage: async (_identity: unknown, requestedToken: typeof cursor) => {
        changesReads++;
        return { ok: true as const, value: {
          kind: "terminal" as const, requestedToken, changes: [], newStartPageToken: cursor,
        } };
      },
    } } : {}),
    ...(!options.provenanceMissing ? { provenanceReader: {
      verifyRootWideManagedProvenance: async () => {
        provenanceReads++;
        if (options.provenanceThrows) throw new Error("provenance-census-unavailable");
        return options.provenanceFailure
          ? { status: "recovery-required" as const, reason: "managed-object-left-remote-domain" }
          : { status: "ok" as const, value: undefined };
      },
    } } : {}),
  });
  const ordinary = new ProductSnapshotAssembler(
    settings.local, settings.drive, settings.state, settings.stateContext,
    settings.remoteIdentity,
  );
  return { lease, optimized, ordinary, settings,
    get releases() { return releases; },
    get remoteLists() { return remoteLists; },
    get localReads() { return localReads; },
    get invReads() { return invReads; },
    get provenanceReads() { return provenanceReads; },
    get changesReads() { return changesReads; },
  };
}

test("D339-05 coherent inventory yields exactly the established LOCAL/REMOTE/BASE snapshots without full listing", async () => {
  const actual = fixture();
  const projection = await actual.optimized.assemble();
  assert.equal(actual.remoteLists, 0);
  assert.equal(actual.provenanceReads, 1, "the optimized result requires a fresh Drive provenance census");
  assert.equal(actual.releases, 1);
  assert.equal(actual.localReads, 1);
  assert.equal(projection.nextCursor, cursor);
  assert.equal(projection.mode, "full");
  assert.deepEqual(projection.input.snapshots.map(item => String(item.path)), ["alpha.md", "deleted.md"]);
  const alpha = projection.input.snapshots[0]!;
  assert.equal(alpha.remote.status, "present");
  assert.equal(alpha.local.status, "present");
  assert.equal(alpha.base.status, "trusted");
  const deleted = projection.input.snapshots[1]!;
  assert.equal(deleted.remote.status, "absent");
  assert.equal(deleted.base.status, "trusted");
  if (deleted.base.status === "trusted") assert.equal(deleted.base.tombstone?.deletedOn, "local");
  const canonical = fixture();
  assert.deepEqual(projection.input.snapshots, (await canonical.ordinary.assembleFull()).input.snapshots);
});

test("D339-05 portable namespace is preserved with one existing snapshot assembler", async () => {
  const portable = id<"VaultPath">("__brain_sync_portable_config__/appearance.json");
  const row = fileEntity({
    remoteObjectId: id<"RemoteObjectId">("drive:portable"),
    parentRemoteObjectId: config, domain: "portable-config", provenanceDomain: "portable-config",
    name: "appearance.json", logicalPath: portable,
  });
  const sample = fixture({ rows: [rootEntity("content"), rootEntity("portable-config"), row] });
  const result = await sample.optimized.assemble();
  assert.equal(sample.remoteLists, 0);
  assert.equal(result.input.snapshots.find(entry => entry.path === portable)?.remote.status, "present");
});

test("D339-05 missing, stale, wrong-scope and invalid coverage always fall back to ordinary reconciliation", async () => {
  const incorrect = { ...fence, pairedAccountKey: "other-account" };
  const conditions = [
    { fence: incorrect },
    { cursor: id<"ChangeCursor">("cursor:old") },
    { coverageValid: false },
    { storeThrows: true },
    { rows: [rootEntity("content"), fileEntity()] },
    { rows: [rootEntity("content"), rootEntity("portable-config"), fileEntity({ pathValidity: "unknown" })] },
  ];
  for (const condition of conditions) {
    const sample = fixture(condition);
    const result = await sample.optimized.assemble();
    assert.equal(sample.remoteLists, 1, JSON.stringify(condition));
    assert.equal(result.input.snapshots.find(entry => entry.path === path)?.remote.status, "present");
    assert.equal(sample.releases, sample.invReads, "every acquired read lease must be released");
  }
});

test("D339-10 missing or invalid root-wide provenance proof forces full reconciliation", async () => {
  for (const condition of [{ provenanceFailure: true }, { provenanceMissing: true }]) {
    const sample = fixture(condition);
    const result = await sample.optimized.assemble();
    assert.equal(sample.remoteLists, 1, "cached inventory must not authorize planning without proof");
    assert.equal(result.input.snapshots[0]?.remote.status, "present");
    assert.equal(sample.provenanceReads, condition.provenanceMissing ? 0 : 1);
  }
});

test("D339-10 managed-marked object outside domain blocks optimized and fallback planning", async () => {
  const sample = fixture({ provenanceFailure: true, fullListingFailure: true });
  await assert.rejects(sample.optimized.assemble(), /managed-object-left-remote-domain/);
  assert.equal(sample.provenanceReads, 1, "cached observations require a fresh provenance check");
  assert.equal(sample.remoteLists, 1, "unsafe cached result must fall through to the real listing");
});

test("D339-11 failed, missing or throwing provenance census cannot use empty incremental Changes", async () => {
  for (const unsafe of [
    { provenanceFailure: true }, { provenanceMissing: true }, { provenanceThrows: true },
  ]) {
    const sample = fixture({ ...unsafe, emptyIncrementalChanges: true });
    const result = await sample.optimized.assemble();
    assert.equal(result.mode, "full", "unproven census requires physical reconciliation");
    assert.equal(result.remoteEnumeration.status, "complete");
    assert.equal(sample.remoteLists, 1, "fresh full listing must run");
    assert.equal(sample.changesReads, 0, "empty incremental Changes must not bypass census");
  }
});

test("D339-11 failed census with empty Changes cannot bypass unsafe or incomplete full listing", async () => {
  for (const failure of [{ fullListingFailure: true }, { fullListingPartial: true }]) {
    const sample = fixture({ provenanceFailure: true, emptyIncrementalChanges: true, ...failure });
    await assert.rejects(sample.optimized.assemble(), /managed-object-left-remote-domain|root-wide managed provenance unproven/);
    assert.equal(sample.remoteLists, 1);
    assert.equal(sample.changesReads, 0, "incremental reconciliation may not replace failed full proof");
  }
});

test("D339-05 same-name duplicates never become a false unique or empty occupancy", async () => {
  const duplicate = fileEntity({ remoteObjectId: id<"RemoteObjectId">("drive:other") });
  const sample = fixture({ rows: [
    rootEntity("content"), rootEntity("portable-config"), fileEntity(), duplicate,
  ] });
  const assembled = await sample.optimized.assemble();
  assert.equal(sample.remoteLists, 1);
  assert.equal(assembled.input.snapshots[0]?.remote.status, "present");
});

test("D339-05 explicit full and recovery paths never consult inventory", async () => {
  const sample = fixture();
  await sample.optimized.assembleFull();
  assert.equal(sample.remoteLists, 1);
  assert.equal(sample.invReads, 0);
  const recovered = await sample.optimized.assembleRecovery();
  assert.equal(sample.remoteLists, 2);
  assert.equal(sample.invReads, 0);
  assert.equal(recovered.reconstruction, true);
  assert.equal(recovered.input.state.status, "uninitialized");
});

test("D339-05 incomplete local observation and trusted tombstones remain existing semantics", async () => {
  const sample = fixture();
  const sampleState = { ...state, base: state.base };
  const local = { enumerate: async () => ({ entries: [], completeness: {
    status: "partial" as const, reason: "path-unreadable",
  } }) };
  const optimized = new InventoryBackedSnapshotAssembler({
    ...sample.settings, local: local as never, state: {
      load: async () => ({ status: "trusted" as const, state: sampleState }),
    } as never,
    inventory: {
      publicationSnapshot: async () => ({ status: "trusted-fence" as const, value: {
        activeGeneration: generation, canonicalCursor: cursor,
        persistenceRevision: revision, semanticGeneration: id<"SemanticStateGeneration">("s"),
        activeManifest: { generation, terminalCursor: cursor },
      } }),
      openRead: async () => ({ status: "verified-observation" as const, generation, value: sample.lease }),
    } as never,
    currentFence: async () => fence,
  });
  const assembled = await optimized.assemble();
  const existing = assembled.input.snapshots.find(item => item.path === path);
  assert.equal(existing?.local.status, "unknown");
  assert.equal(existing?.base.status, "trusted");
  assert.equal(assembled.localEnumeration?.status, "partial");
});

test("D339-05 uninitialized first sync retains the authoritative safe-union full path", async () => {
  const sample = fixture();
  const candidate = new InventoryBackedSnapshotAssembler({
    ...sample.settings,
    state: { load: async () => ({ status: "uninitialized" as const }) } as never,
    inventory: {
      publicationSnapshot: async () => { throw new Error("inventory must not be read"); },
      openRead: async () => { throw new Error("inventory must not be read"); },
    } as never,
    currentFence: async () => fence,
  });
  const result = await candidate.assemble();
  assert.equal(result.input.state.status, "uninitialized");
  assert.equal(result.mode, "full");
  assert.equal(result.input.snapshots.find(entry => entry.path === path)?.remote.status, "present");
});

test("D339-05 outstanding operation intent disables cached observations", async () => {
  const pending: TrustedSynchronizationState = {
    ...state, operations: [{
      operationId: id<"OperationId">("op:pending"),
      status: "uncertain", path,
    }],
  };
  const sample = fixture({ state: pending });
  const result = await sample.optimized.assemble();
  assert.equal(sample.remoteLists, 1);
  assert.equal(sample.invReads, 0);
  assert.equal(result.input.state.status, "trusted");
});
