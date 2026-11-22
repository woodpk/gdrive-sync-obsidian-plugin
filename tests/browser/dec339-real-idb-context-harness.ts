import {
  contractId,
  type DeviceIdentity,
  type InventoryIdentityFence,
  type PersistenceRevision,
  type ProtocolVersion,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type VaultIdentity,
} from "../../src/contracts";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import { IndexedDbInventoryAwareStateByteStorage } from "../../src/state/indexeddb-inventory-authority-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import {
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
} from "../../src/state/persistent-state-store";

const legacyStores = new Map<string, IndexedDbStateByteStorage>();
const inventoryStores = new Map<string, IndexedDbInventoryObservationStore>();
const blockers = new Map<string, IDBDatabase>();

function fenceFor(databaseName: string): InventoryIdentityFence {
  return {
    vaultIdentity: contractId<"VaultIdentity">(`vault:${databaseName}`) as VaultIdentity,
    deviceIdentity: contractId<"DeviceIdentity">(`device:${databaseName}`) as DeviceIdentity,
    pairedAccountKey: `account:${databaseName}`,
    managedRootId: contractId<"RemoteObjectId">(`root:${databaseName}`) as RemoteObjectId,
    protocolVersion: contractId<"ProtocolVersion">("1") as ProtocolVersion,
    contentDomainRootId: contractId<"RemoteObjectId">(`content:${databaseName}`) as RemoteObjectId,
    configDomainRootId: contractId<"RemoteObjectId">(`config:${databaseName}`) as RemoteObjectId,
    scopePolicyFingerprint: `scope:${databaseName}`,
    inventorySchemaVersion: 1,
  };
}

function bytes(value: Uint8Array | undefined): number[] | null {
  return value ? Array.from(value) : null;
}

async function seedLegacy(databaseName: string): Promise<unknown> {
  const legacy = new IndexedDbStateByteStorage(databaseName);
  const authority = new PersistentSynchronizationStateStore(legacy);
  const fence = fenceFor(databaseName);
  const state = createInitialAuthorityState({
    persistenceRevision: contractId<"StateRevision">(`state:${databaseName}:1`) as PersistenceRevision,
    semanticGeneration: contractId<"SemanticStateGeneration">(`semantic:${databaseName}:1`) as SemanticStateGeneration,
    vaultIdentity: fence.vaultIdentity,
    deviceIdentity: fence.deviceIdentity,
  });
  const saved = await authority.saveTrusted(state);
  if (saved.status !== "saved") throw new Error(`legacy-seed-failed:${saved.status}`);
  legacyStores.set(databaseName, legacy);
  return { status: "saved", canonicalBytes: bytes(await legacy.read()) };
}

async function upgradeSnapshot(databaseName: string): Promise<unknown> {
  let store = inventoryStores.get(databaseName);
  if (!store) {
    store = new IndexedDbInventoryObservationStore(databaseName);
    inventoryStores.set(databaseName, store);
  }
  const result = await store.publicationSnapshot(fenceFor(databaseName));
  return { status: result.status, reason: "reason" in result ? result.reason : null };
}

async function readLegacy(databaseName: string): Promise<unknown> {
  const legacy = legacyStores.get(databaseName) ?? new IndexedDbStateByteStorage(databaseName);
  legacyStores.set(databaseName, legacy);
  try {
    return { status: "read", canonicalBytes: bytes(await legacy.read()) };
  } catch (cause) {
    const error = cause as Error;
    return { status: "error", name: error?.name ?? "Error", message: error?.message ?? String(cause) };
  }
}

async function readCompatible(databaseName: string): Promise<unknown> {
  const compatible = new IndexedDbInventoryAwareStateByteStorage(databaseName);
  return { status: "read", canonicalBytes: bytes(await compatible.read()) };
}

async function openBlocker(databaseName: string): Promise<unknown> {
  if (blockers.has(databaseName)) return { status: "open" };
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("blocker-open-failed"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("sync-state")) request.result.createObjectStore("sync-state");
    };
  });
  // Intentionally refuse to close: this context models a stale pre-fix WebView.
  database.onversionchange = () => undefined;
  blockers.set(databaseName, database);
  return { status: "open", version: database.version };
}

async function closeBlocker(databaseName: string): Promise<unknown> {
  const blocker = blockers.get(databaseName);
  if (blocker) {
    blocker.close();
    blockers.delete(databaseName);
  }
  return { status: "closed" };
}

async function databaseVersion(databaseName: string): Promise<unknown> {
  const version = await new Promise<number>((resolve, reject) => {
    const request = indexedDB.open(databaseName);
    request.onsuccess = () => {
      const db = request.result;
      const value = db.version;
      db.close();
      resolve(value);
    };
    request.onerror = () => reject(request.error ?? new Error("version-read-failed"));
  });
  return { status: "read", version };
}

export async function run(
  command: string,
  args: { readonly databaseName: string },
): Promise<unknown> {
  switch (command) {
    case "seedLegacy": return seedLegacy(args.databaseName);
    case "upgradeSnapshot": return upgradeSnapshot(args.databaseName);
    case "readLegacy": return readLegacy(args.databaseName);
    case "readCompatible": return readCompatible(args.databaseName);
    case "openBlocker": return openBlocker(args.databaseName);
    case "closeBlocker": return closeBlocker(args.databaseName);
    case "databaseVersion": return databaseVersion(args.databaseName);
    default: throw new Error(`unknown-command:${command}`);
  }
}
