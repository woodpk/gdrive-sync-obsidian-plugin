import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId, type ChangeCursor, type DeviceIdentity, type InventoryCoverage,
  type InventoryGeneration, type InventoryGenerationManifest, type InventoryIdentityFence,
  type InventoryOverlayRecord, type PersistenceRevision, type ProtocolVersion,
  type RemoteObjectId, type SemanticStateGeneration, type VaultIdentity,
} from "../../src/contracts";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { PersistentSynchronizationStateStore, createInitialAuthorityState } from "../../src/state/persistent-state-store";
import { VerifiedInventoryBaselineCoordinator } from "../../src/state/verified-inventory-integration";
import type { VerifiedMetadataInventoryReader } from "../../src/drive/verified-metadata-inventory-reader";

import { FakeDatabase, withRangeOnly } from "./deterministic-indexeddb";
export { FakeDatabase, withRangeOnly } from "./deterministic-indexeddb";

export const id = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
export const c = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
export const rev = (s: string) => contractId<"StateRevision">(s) as PersistenceRevision;
export const sem = (s: string) => contractId<"SemanticStateGeneration">(s) as SemanticStateGeneration;
export const g = (s: string) => s as InventoryGeneration;
export const r0 = rev("state:1"), s0 = sem("semantic:1"), cursor0 = c("changes:0"), cursor1 = c("changes:1");
export const fence: InventoryIdentityFence = {
  vaultIdentity: contractId<"VaultIdentity">("vault:idb") as VaultIdentity,
  deviceIdentity: contractId<"DeviceIdentity">("device:idb") as DeviceIdentity,
  pairedAccountKey: "opaque", managedRootId: id("managed"),
  protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
  contentDomainRootId: id("content"), configDomainRootId: id("config"),
  scopePolicyFingerprint: "scope:idb", inventorySchemaVersion: 1,
};
export function candidate(gen = g("g1"), token = cursor1): {
  manifest: InventoryGenerationManifest; rows: InventoryOverlayRecord[]; coverage: InventoryCoverage[];
} {
  const manifest: InventoryGenerationManifest = {
    generation: gen, parentGeneration: null, overlayDepth: 0,
    inputCursor: cursor0, terminalCursor: token, baseStartToken: cursor0,
    fence, authorityPersistenceRevision: r0, authoritySemanticGeneration: s0,
    recordCount: 2, coverageDigest: "digest:stage", validationReceipt: "receipt:stage", status: "complete",
  };
  const rows = (["content", "portable-config"] as const).map(domain => {
    const remoteObjectId = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    return { kind: "upsert" as const, generation: gen, entity: {
      generation: gen, remoteObjectId, parentRemoteObjectId: null, domain,
      name: domain, kind: "folder" as const, pathValidity: "verified" as const,
      access: "visible" as const, trashed: false, managedRootId: fence.managedRootId,
      provenanceDomain: domain,
    } };
  });
  const coverage = (["content", "portable-config"] as const).map(domain => ({
    generation: gen, domain, scopeId: domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId,
    scopeKind: "domain" as const, state: "complete" as const, visibility: "app-visible" as const,
    allPagesRead: true, incompleteSearch: false, provenanceVerified: true, terminalCursor: token,
  }));
  return { manifest, rows, coverage };
}
export async function* rows<T>(items: readonly T[]): AsyncIterable<T> { for (const v of items) yield v; }
export async function seeded(factory: IDBFactory): Promise<IndexedDbInventoryObservationStore> {
  const bytes = new IndexedDbStateByteStorage("device:idb:test", factory);
  const store = new PersistentSynchronizationStateStore(bytes);
  const initial = createInitialAuthorityState({
    persistenceRevision: r0, semanticGeneration: s0,
    vaultIdentity: fence.vaultIdentity, deviceIdentity: fence.deviceIdentity,
  });
  assert.equal((await store.saveTrusted(initial)).status, "saved");
  return new IndexedDbInventoryObservationStore("device:idb:test", factory);
}

export function simulatedBaseline(c: ReturnType<typeof candidate>): Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental"> {
  return {
    incremental: async () => ({ status: "unknown" as const, reason: "incremental-not-configured" }),
    baseline: async () => ({
      status: "ok" as const,
      value: {
        inputCursor: c.manifest.inputCursor, terminalCursor: c.manifest.terminalCursor,
        entities: c.rows.filter((r): r is Extract<InventoryOverlayRecord, { readonly kind: "upsert" }> =>
          r.kind === "upsert").map(r => r.entity),
        coverage: [...c.coverage, ...c.rows.flatMap(row => {
          if (row.kind !== "upsert" || row.entity.kind !== "folder") return [];
          return [{
            generation: row.generation, domain: row.entity.domain,
            scopeId: row.entity.remoteObjectId, scopeKind: "parent" as const,
            state: "complete" as const, visibility: "app-visible" as const,
            allPagesRead: true, incompleteSearch: false, provenanceVerified: true,
            terminalCursor: c.manifest.terminalCursor,
          }];
        })], normalizedSiblingCollisions: [],
        replayedEvents: 0, publishAuthorized: false as const,
      },
    }),
  };
}

export function simulatedDelta(
  base: ReturnType<typeof candidate>,
  next: {
    readonly generation: InventoryGeneration; readonly token: ChangeCursor;
    readonly inputCursor?: ChangeCursor;
    readonly overlays: readonly InventoryOverlayRecord[];
    readonly changes: readonly import("../../src/contracts/google-drive").RemoteChange[];
    readonly partial?: boolean;
  },
): Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental"> {
  const cover = (["content", "portable-config"] as const).flatMap(domain => {
    const rootId = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    return (["domain", "parent"] as const).map(scopeKind => ({
      generation: next.generation, domain, scopeId: rootId, scopeKind,
      state: "complete" as const, visibility: "app-visible" as const,
      allPagesRead: true, incompleteSearch: false, provenanceVerified: true,
      terminalCursor: next.token,
    }));
  });
  return {
    ...simulatedBaseline(base),
    incremental: async () => ({
      status: "ok" as const, value: {
        inputCursor: next.inputCursor ?? cursor1, terminalCursor: next.token,
        overlays: [...next.overlays], invalidatedParentIds: [fence.contentDomainRootId],
        coverage: next.partial ? cover.filter(row => row.domain !== "content") : cover,
        learnedChanges: [...next.changes], publishAuthorized: false as const,
      },
    }),
  };
}

export function integratedFile(generation: InventoryGeneration, name: string): Extract<InventoryOverlayRecord, { kind: "upsert" }> {
  const remoteObjectId = id("remote:delta-file");
  const path = contractId<"VaultPath">(name);
  return { kind: "upsert", generation, entity: {
    generation, remoteObjectId, parentRemoteObjectId: fence.contentDomainRootId,
    domain: "content", name, kind: "file", logicalPath: path,
    pathValidity: "verified", access: "visible", trashed: false,
    managedRootId: fence.managedRootId, provenanceDomain: "content",
  } };
}

export async function assertDurablePair(idb: IDBFactory, generation: InventoryGeneration | null,
  cursor: ChangeCursor | null, batches = 0): Promise<void> {
  const authority = await new PersistentSynchronizationStateStore(
    new IndexedDbInventoryAwareStateByteStorage("device:idb:test", idb)).loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") return;
  assert.equal(authority.state.changeCursor ?? null, cursor);
  assert.equal(authority.state.learnedRemoteBatches.length, batches);
  const pointer = await new IndexedDbInventoryObservationStore("device:idb:test", idb)
    .publicationSnapshot(fence);
  assert.equal(pointer.status, "trusted-fence");
  if (pointer.status !== "trusted-fence") return;
  assert.equal(pointer.value.activeGeneration, generation);
  assert.equal(pointer.value.canonicalCursor, cursor);
  assert.equal(pointer.value.persistenceRevision, authority.state.persistenceRevision);
  assert.equal(pointer.value.semanticGeneration, authority.state.semanticGeneration);
}
