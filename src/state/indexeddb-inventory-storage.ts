/**
 * DEC-339 D339-02. Dormant, per-device IndexedDB v2 observation storage.
 * Not wired into product execution; stored inventory cannot authorize a Drive mutation.
 */
import type {
  ChangeCursor, DurableRemoteChangeBatch, InventoryCoverage, InventoryDomain,
  InventoryGeneration, InventoryGenerationManifest, InventoryIdentityFence,
  InventoryObservationStore, InventoryOverlayRecord, InventoryPublishRequest,
  InventoryPublishResult, InventoryReadLease, InventoryReadResult,
  InventoryRemoteEntity, InventoryStageRequest, RemoteObjectId, VaultPath,
} from "../contracts";
import { inventoryFenceMatches } from "./verified-metadata-inventory-validation";
import { prepareInventoryAuthorityPublication } from "./persistent-state-store";

const DB_VERSION = 2;
const AUTHORITY = "sync-state";
const AUTHORITY_KEY = "current-state";
const CONTROL = "inventory-control";
const MANIFESTS = "inventory-generations";
const ENTITIES = "inventory-entities";
const COVERAGE = "inventory-coverage";
const LOCAL = "inventory-local";
const STAGES = "inventory-stage";
const POINTER = "active";
const BATCH = 128;
const MAX_DEPTH = 32;
const DEFAULT_PAGE_SIZE = 256;

interface InventoryControl {
  readonly status: "ready" | "invalid";
  readonly activeGeneration: InventoryGeneration;
  readonly terminalCursor: ChangeCursor;
  readonly fence: InventoryIdentityFence;
  readonly authorityPersistenceRevisionAtPublish: string;
  readonly authoritySemanticGenerationAtPublish: string;
  readonly reason?: string;
}
interface StagedManifest {
  readonly manifest: InventoryGenerationManifest;
  readonly sealed: boolean;
  readonly count: number;
  readonly coverageCount: number;
}
interface EntityRow {
  readonly generation: InventoryGeneration;
  readonly remoteObjectId: RemoteObjectId;
  readonly kind: "upsert" | "mask";
  readonly domain?: InventoryDomain;
  readonly parentRemoteObjectId?: RemoteObjectId | null;
  readonly normalizedName?: string;
  readonly normalizedPath?: string;
  readonly entity?: InventoryRemoteEntity;
}
interface StagedCounter {
  readonly generation: InventoryGeneration;
  readonly count: number;
  readonly coverageCount: number;
  readonly sealed: boolean;
}

type InventoryError = { readonly status: "unknown" | "partial" | "stale" | "invalid" | "incompatible" | "recovery-required"; readonly reason: string };
const error = (status: InventoryError["status"], reason: string): InventoryError => ({ status, reason });
const norm = (value: string) => value.normalize("NFC").toLocaleLowerCase("en-US");
const valid = (s: unknown): s is string => typeof s === "string" && s.length > 0;

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error("inventory-indexeddb-request-error"));
  });
}
function finished(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("inventory-indexeddb-aborted"));
    tx.onerror = () => reject(tx.error ?? new Error("inventory-indexeddb-error"));
  });
}
function stores(db: IDBDatabase, names: readonly string[], mode: IDBTransactionMode): IDBTransaction {
  return db.transaction([...names], mode);
}
function createSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(AUTHORITY)) db.createObjectStore(AUTHORITY);
  if (!db.objectStoreNames.contains(CONTROL)) db.createObjectStore(CONTROL);
  if (!db.objectStoreNames.contains(MANIFESTS)) db.createObjectStore(MANIFESTS);
  if (!db.objectStoreNames.contains(STAGES)) db.createObjectStore(STAGES);
  if (!db.objectStoreNames.contains(LOCAL)) db.createObjectStore(LOCAL, { keyPath: ["generation", "path"] });
  if (!db.objectStoreNames.contains(COVERAGE))
    db.createObjectStore(COVERAGE, { keyPath: ["generation", "domain", "scopeId"] });
  if (!db.objectStoreNames.contains(ENTITIES)) {
    const entities = db.createObjectStore(ENTITIES, { keyPath: ["generation", "remoteObjectId"] });
    entities.createIndex("by-parent", ["generation", "domain", "parentRemoteObjectId"], { unique: false });
    entities.createIndex("by-path", ["generation", "domain", "normalizedPath"], { unique: false });
    entities.createIndex("by-id", "remoteObjectId", { unique: false });
  }
}
function entityRecord(row: InventoryOverlayRecord): EntityRow {
  if (row.kind === "mask")
    return { generation: row.generation, remoteObjectId: row.remoteObjectId, kind: "mask" };
  const e = row.entity;
  return {
    generation: row.generation, remoteObjectId: e.remoteObjectId, kind: "upsert",
    domain: e.domain, parentRemoteObjectId: e.parentRemoteObjectId,
    normalizedName: norm(e.name),
    ...(e.logicalPath ? { normalizedPath: norm(String(e.logicalPath)) } : {}),
    entity: e,
  };
}
function validRow(row: InventoryOverlayRecord, generation: InventoryGeneration): boolean {
  if (row.generation !== generation) return false;
  if (row.kind === "mask") return valid(row.remoteObjectId);
  const e = row.entity;
  return e.generation === generation && valid(e.remoteObjectId) &&
    valid(e.name) && !e.name.includes("/") &&
    (e.parentRemoteObjectId === null || valid(e.parentRemoteObjectId)) &&
    (e.domain === "content" || e.domain === "portable-config") &&
    (e.provenanceDomain === e.domain);
}
function goodCoverage(value: InventoryCoverage, manifest: InventoryGenerationManifest): boolean {
  return value.generation === manifest.generation &&
    value.terminalCursor === manifest.terminalCursor &&
    (value.domain === "content" || value.domain === "portable-config") &&
    valid(value.scopeId) && (value.scopeKind === "domain" || value.scopeKind === "parent") &&
    (value.state === "complete" || value.state === "partial" || value.state === "unknown" || value.state === "invalid");
}
function contentDomainRoot(f: InventoryIdentityFence, domain: InventoryDomain): RemoteObjectId {
  return domain === "content" ? f.contentDomainRootId : f.configDomainRootId;
}

/**
 * This store performs an additive v1->v2 IndexedDB upgrade; it never edits the
 * canonical envelope on opening, staging, or schema upgrade. Older v1 readers
 * require a version-aware rollback build; reinstalling one is not a safe rollback.
 */
export class IndexedDbInventoryObservationStore implements InventoryObservationStore {
  private database?: Promise<IDBDatabase>;
  private readonly readers = new Map<string, number>();
  constructor(
    private readonly databaseName: string,
    private readonly indexedDb: IDBFactory = globalThis.indexedDB,
  ) {
    if (!indexedDb) throw new Error("indexeddb-unavailable");
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      const promise = new Promise<IDBDatabase>((resolve, reject) => {
        const action = this.indexedDb.open(this.databaseName, DB_VERSION);
        action.onupgradeneeded = () => createSchema(action.result);
        action.onsuccess = () => {
          const db = action.result;
          db.onversionchange = () => { db.close(); this.database = undefined; };
          resolve(db);
        };
        action.onerror = () => reject(action.error ?? new Error("inventory-indexeddb-open-failed"));
        action.onblocked = () => reject(new Error("inventory-indexeddb-upgrade-blocked"));
      });
      this.database = promise.catch(e => { this.database = undefined; throw e; });
    }
    return this.database;
  }

  async stage(input: InventoryStageRequest): Promise<InventoryReadResult<InventoryGeneration>> {
    const m = input.candidate;
    if (!valid(m.generation) || !valid(m.validationReceipt) || m.status !== "complete" ||
        !Number.isSafeInteger(m.recordCount) || m.recordCount < 0 ||
        !Number.isSafeInteger(m.overlayDepth) || m.overlayDepth > MAX_DEPTH)
      return error("invalid", "candidate-stage-manifest-invalid");
    try {
      const db = await this.open();
      // Reserve the candidate key, rejecting concurrent/retried/previously published identities.
      const reserve = stores(db, [MANIFESTS, STAGES, CONTROL], "readwrite");
      const done = finished(reserve);
      const found = await request(reserve.objectStore(MANIFESTS).get(String(m.generation)));
      const active = await request(reserve.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      if (found || active?.activeGeneration === m.generation ||
          (active?.status === "ready" &&
           (m.parentGeneration !== active.activeGeneration || m.inputCursor !== active.terminalCursor ||
            !inventoryFenceMatches(m.fence, active.fence))) ||
          (!active && m.parentGeneration !== null)) {
        reserve.abort();
        await done.catch(() => undefined);
        return error("stale", "candidate-generation-parent-or-cursor-conflict");
      }
      reserve.objectStore(MANIFESTS).add({ manifest: { ...m, status: "staging" }, sealed: false,
        count: 0, coverageCount: 0 } satisfies StagedManifest, String(m.generation));
      reserve.objectStore(STAGES).add({ generation: m.generation, count: 0,
        coverageCount: 0, sealed: false } satisfies StagedCounter, String(m.generation));
      await done;

      let count = 0;
      let coverageCount = 0;
      // Each batch is its own short transaction; unfinished generations are invisible to readers.
      let batch: EntityRow[] = [];
      const flushEntities = async (): Promise<void> => {
        if (batch.length === 0) return;
        const tx = stores(db, [ENTITIES, STAGES], "readwrite");
        const complete = finished(tx);
        const target = tx.objectStore(ENTITIES);
        for (const item of batch) target.add(item); // duplicate IDs fail rather than overwrite
        count += batch.length;
        tx.objectStore(STAGES).put({ generation: m.generation, count, coverageCount, sealed: false }, String(m.generation));
        await complete;
        batch = [];
      };
      for await (const item of input.overlays) {
        if (!validRow(item, m.generation)) return error("invalid", "invalid-overlay-row-staging-incomplete");
        batch.push(entityRecord(item));
        if (batch.length >= BATCH) await flushEntities();
      }
      await flushEntities();
      if (count !== m.recordCount) return error("invalid", "overlay-row-count-mismatch-staging-incomplete");

      let coverageBatch: InventoryCoverage[] = [];
      const flushCoverage = async (): Promise<void> => {
        if (coverageBatch.length === 0) return;
        const tx = stores(db, [COVERAGE, STAGES], "readwrite");
        const complete = finished(tx);
        const target = tx.objectStore(COVERAGE);
        for (const item of coverageBatch) target.add(item);
        coverageCount += coverageBatch.length;
        tx.objectStore(STAGES).put({ generation: m.generation, count, coverageCount, sealed: false }, String(m.generation));
        await complete;
        coverageBatch = [];
      };
      for await (const item of input.coverage) {
        if (!goodCoverage(item, m)) return error("invalid", "invalid-coverage-row-staging-incomplete");
        coverageBatch.push(item);
        if (coverageBatch.length >= BATCH) await flushCoverage();
      }
      await flushCoverage();

      // A seal is a crash-consistent receipt, not provider-completeness proof.
      const seal = stores(db, [STAGES, MANIFESTS], "readwrite");
      const sealDone = finished(seal);
      seal.objectStore(STAGES).put({ generation: m.generation, count, coverageCount, sealed: true }, String(m.generation));
      seal.objectStore(MANIFESTS).put({ manifest: m, sealed: true, count, coverageCount } satisfies StagedManifest,
        String(m.generation));
      await sealDone;
      return { status: "verified-observation", generation: m.generation, value: m.generation };
    } catch (cause) {
      return error("recovery-required", cause instanceof Error ? cause.message : "inventory-stage-failed");
    }
  }

  private pin(chain: readonly InventoryGenerationManifest[]): void {
    for (const m of chain) this.readers.set(String(m.generation), (this.readers.get(String(m.generation)) ?? 0) + 1);
  }
  private unpin(chain: readonly InventoryGenerationManifest[]): void {
    for (const m of chain) {
      const name = String(m.generation);
      const count = this.readers.get(name) ?? 0;
      if (count <= 1) this.readers.delete(name);
      else this.readers.set(name, count - 1);
    }
  }
