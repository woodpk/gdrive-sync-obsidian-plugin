/**
 * DEC-339 D339-02. Dormant, per-device IndexedDB v2 observation storage.
 * Not wired into product execution; stored inventory cannot authorize a Drive mutation.
 */
import type {
  ChangeCursor, DurableRemoteChangeBatch, InventoryCoverage, InventoryDomain,
  InventoryGeneration, InventoryGenerationManifest, InventoryIdentityFence,
  InventoryObservationStore, InventoryOverlayRecord, InventoryPublishRequest,
  InventoryPublishResult, InventoryReadLease, InventoryReadResult,
  InventoryRemoteEntity, InventoryStageRequest, InventoryLocalObservation, RemoteObjectId, VaultPath,
} from "../contracts";
import { inventoryFenceMatches } from "./verified-metadata-inventory-validation";
import { inspectInventoryAuthorityFence, prepareInventoryAuthorityPublication } from "./persistent-state-store";

const DB_VERSION = 2;
const AUTHORITY = "sync-state";
const AUTHORITY_KEY = "current-state";
const CONTROL = "inventory-control";
const MANIFESTS = "inventory-generations";
const ENTITIES = "inventory-entities";
const COVERAGE = "inventory-coverage";
const LOCAL = "inventory-local";
const STAGES = "inventory-stage";
/** Durable reader pins are stored alongside existing v2 stage records. */
const READER_PIN_PREFIX = "reader-pin:";
const POINTER = "active";
const LOCAL_POINTER = "local-active";
const BATCH = 128;
const MAX_DEPTH = 32;
const DEFAULT_PAGE_SIZE = 256;
const GC_BATCH = 128;
const GC_MAX_PASSES = 32;
interface InventoryRuntimeActivity {
  readonly readers: Map<string, number>;
  readonly staging: Set<string>;
  acquiringReaders: number;
}
const sharedActivity = new WeakMap<IDBFactory, Map<string, InventoryRuntimeActivity>>();
function activityFor(factory: IDBFactory, name: string): InventoryRuntimeActivity {
  let databases = sharedActivity.get(factory);
  if (!databases) { databases = new Map(); sharedActivity.set(factory, databases); }
  let activity = databases.get(name);
  if (!activity) {
    activity = { readers: new Map(), staging: new Set(), acquiringReaders: 0 };
    databases.set(name, activity);
  }
  return activity;
}
const MAX_DIGEST_BYTES = 12 * 1024 * 1024;

interface InventoryControl {
  readonly status: "ready" | "invalid";
  readonly activeGeneration: InventoryGeneration;
  readonly terminalCursor: ChangeCursor;
  readonly fence: InventoryIdentityFence;
  readonly authorityPersistenceRevisionAtPublish: string;
  readonly authoritySemanticGenerationAtPublish: string;
  readonly reason?: string;
}
interface LocalSnapshotMarker {
  readonly generation: InventoryGeneration;
  readonly status: "complete" | "invalid";
  readonly count: number;
  readonly reason?: string;
}
interface StagedManifest {
  readonly manifest: InventoryGenerationManifest;
  readonly sealed: boolean;
  readonly count: number;
  readonly coverageCount: number;
  /** Hash of sealed persisted overlay rows and coverage, independent of index counts. */
  readonly persistedDigest?: string;
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
interface DurableReaderPin {
  readonly kind: "reader-pin";
  readonly generations: readonly string[];
}
function isReaderPin(value: unknown): value is DurableReaderPin {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<DurableReaderPin>;
  return row.kind === "reader-pin" && Array.isArray(row.generations) &&
    row.generations.length > 0 && row.generations.length <= MAX_DEPTH + 1 &&
    row.generations.every(valid);
}
function isStagedCounter(value: unknown): value is StagedCounter {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<StagedCounter>;
  return valid(row.generation) && Number.isSafeInteger(row.count) &&
    Number.isSafeInteger(row.coverageCount) && typeof row.sealed === "boolean";
}

type InventoryError = { readonly status: "unknown" | "partial" | "stale" | "invalid" | "incompatible" | "recovery-required"; readonly reason: string };
const error = (status: InventoryError["status"], reason: string): InventoryError => ({ status, reason });
const norm = (value: string) => value.normalize("NFC").toLocaleLowerCase("en-US");
const valid = (s: unknown): s is string => typeof s === "string" && s.length > 0;

/** Bounded integrity digest over stored records; never a provider-side mutation proof. */
async function persistedDigest(rows: readonly EntityRow[], coverage: readonly InventoryCoverage[]): Promise<string> {
  const normalizedRows = [...rows].sort((a, b) =>
    String(a.remoteObjectId).localeCompare(String(b.remoteObjectId)));
  const normalizedCoverage = [...coverage].sort((a, b) =>
    JSON.stringify([a.domain, a.scopeKind, a.scopeId]).localeCompare(
      JSON.stringify([b.domain, b.scopeKind, b.scopeId])));
  const bytes = new TextEncoder().encode(JSON.stringify({
    rows: normalizedRows, coverage: normalizedCoverage,
  }));
  if (bytes.byteLength > MAX_DIGEST_BYTES || !globalThis.crypto?.subtle)
    throw new Error("inventory-persisted-integrity-digest-unavailable-or-unbounded");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return "sha256:" + Array.from(new Uint8Array(digest),
    byte => byte.toString(16).padStart(2, "0")).join("");
}

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
    db.createObjectStore(COVERAGE, { keyPath: ["generation", "domain", "scopeKind", "scopeId"] });
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
  private readonly activity: InventoryRuntimeActivity;
  private get readers(): Map<string, number> { return this.activity.readers; }
  constructor(
    private readonly databaseName: string,
    private readonly indexedDb: IDBFactory = globalThis.indexedDB,
  ) {
    if (!indexedDb) throw new Error("indexeddb-unavailable");
    this.activity = activityFor(indexedDb, databaseName);
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

  /**
   * A consistent, integrity-checked read of canonical authority and inventory control.
   * Explicitly dormant. The subsequent multi-store CAS always rechecks these values.
   * An invalid/absent active pointer permits a fresh full baseline only.
   */
  async publicationSnapshot(expectedFence: InventoryIdentityFence): Promise<
    | { readonly status: "trusted-fence"; readonly value: {
    readonly activeGeneration: InventoryGeneration | null;
    readonly canonicalCursor: ChangeCursor | null;
    readonly persistenceRevision: import("../contracts").PersistenceRevision;
    readonly semanticGeneration: import("../contracts").SemanticStateGeneration;
    readonly activeManifest: InventoryGenerationManifest | null;
    } }
    | InventoryError
  > {
    try {
      const db = await this.open();
      const tx = stores(db, [AUTHORITY, CONTROL, MANIFESTS], "readonly");
      const done = finished(tx);
      const bytes = await request(tx.objectStore(AUTHORITY).get(AUTHORITY_KEY)) as Uint8Array | undefined;
      const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      const activeRecord = control?.status === "ready" ?
        await request(tx.objectStore(MANIFESTS).get(String(control.activeGeneration))) as StagedManifest | undefined :
        undefined;
      await done;
      const authority = inspectInventoryAuthorityFence(bytes);
      if (authority.status !== "trusted" || authority.unresolvedEffects)
        return error("recovery-required", "canonical-authority-untrusted-or-effect-outstanding");
      if (authority.vaultIdentity !== expectedFence.vaultIdentity ||
          authority.deviceIdentity !== expectedFence.deviceIdentity)
        return error("incompatible", "canonical-identity-fence-mismatch");
      if (control?.status === "ready" &&
          (!inventoryFenceMatches(control.fence, expectedFence) ||
           control.terminalCursor !== authority.canonicalCursor ||
           control.authorityPersistenceRevisionAtPublish !== authority.persistenceRevision ||
           control.authoritySemanticGenerationAtPublish !== authority.semanticGeneration))
        return error("stale", "active-control-and-canonical-authority-disagree");
      if (control?.status === "ready" && (!activeRecord?.sealed ||
          activeRecord.manifest.status !== "complete" ||
          activeRecord.manifest.generation !== control.activeGeneration ||
          activeRecord.manifest.terminalCursor !== control.terminalCursor ||
          activeRecord.manifest.authorityPersistenceRevision !== authority.persistenceRevision ||
          activeRecord.manifest.authoritySemanticGeneration !== authority.semanticGeneration))
        return error("stale", "active-manifest-is-not-coherent-with-canonical-control");
      return { status: "trusted-fence", value: {
          activeManifest: control?.status === "ready" ? activeRecord!.manifest : null,
          activeGeneration: control?.status === "ready" ? control.activeGeneration : null,
          canonicalCursor: authority.canonicalCursor,
          persistenceRevision: authority.persistenceRevision,
          semanticGeneration: authority.semanticGeneration,
        },
      };
    } catch {
      return error("recovery-required", "publication-snapshot-storage-unavailable");
    }
  }

  async stage(input: InventoryStageRequest): Promise<InventoryReadResult<InventoryGeneration>> {
    const m = input.candidate;
    if (!valid(m.generation) || !valid(m.validationReceipt) || m.status !== "complete" ||
        !Number.isSafeInteger(m.recordCount) || m.recordCount < 0 ||
        !Number.isSafeInteger(m.overlayDepth) || m.overlayDepth > MAX_DEPTH)
      return error("invalid", "candidate-stage-manifest-invalid");
    if (this.activity.staging.has(String(m.generation)))
      return error("stale", "candidate-generation-already-staging");
    this.activity.staging.add(String(m.generation));
    let sealed = false;
    try {
      const db = await this.open();
      // Reserve the candidate key, rejecting concurrent/retried/previously published identities.
      const reserve = stores(db, [MANIFESTS, STAGES, CONTROL], "readwrite");
      const done = finished(reserve);
      const found = await request(reserve.objectStore(MANIFESTS).get(String(m.generation)));
      const active = await request(reserve.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      if (found || active?.activeGeneration === m.generation ||
          (active?.status === "ready" &&
           (!inventoryFenceMatches(m.fence, active.fence) ||
            (m.parentGeneration !== null &&
             (m.parentGeneration !== active.activeGeneration || m.inputCursor !== active.terminalCursor)))) ||
          (active?.status !== "ready" && m.parentGeneration !== null)) {
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
      const sealedRows: EntityRow[] = [];
      const sealedCoverage: InventoryCoverage[] = [];
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
        const encoded = entityRecord(item);
        sealedRows.push(encoded);
        batch.push(encoded);
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
        sealedCoverage.push(item);
        coverageBatch.push(item);
        if (coverageBatch.length >= BATCH) await flushCoverage();
      }
      await flushCoverage();

      // The seal binds the durable layer to its precise staged rows. This is
      // checked again against indexed records before any trusted read is exposed.
      const integrity = await persistedDigest(sealedRows, sealedCoverage);
      const seal = stores(db, [STAGES, MANIFESTS], "readwrite");
      const sealDone = finished(seal);
      seal.objectStore(STAGES).put({ generation: m.generation, count, coverageCount, sealed: true }, String(m.generation));
      seal.objectStore(MANIFESTS).put({ manifest: m, sealed: true, count, coverageCount,
        persistedDigest: integrity } satisfies StagedManifest,
        String(m.generation));
      await sealDone;
      sealed = true;
      return { status: "verified-observation", generation: m.generation, value: m.generation };
    } catch (cause) {
      return error("recovery-required", cause instanceof Error ? cause.message : "inventory-stage-failed");
    } finally {
      // Successfully sealed stages stay reserved until publication finishes;
      // failed stages are reclaimable after this writer has stopped.
      if (!sealed) this.activity.staging.delete(String(m.generation));
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

  /** A durable pin is released only after its removal transaction commits. */
  private async releaseDurablePin(db: IDBDatabase, key: string): Promise<void> {
    const tx = stores(db, [STAGES], "readwrite");
    const done = finished(tx);
    tx.objectStore(STAGES).delete(key);
    await done;
  }

  /** No inferred absence: a missing ID returns unknown, never a verified undefined. */
  async openRead(): Promise<InventoryReadResult<InventoryReadLease>> {
    this.activity.acquiringReaders++;
    let durablePin: { readonly db: IDBDatabase; readonly key: string } | undefined;
    try {
      const db = await this.open();
      // The snapshot read and durable pin are ONE transaction. GC also writes
      // STAGES, preventing cross-context reclamation during lease acquisition.
      const tx = stores(db, [AUTHORITY, CONTROL, MANIFESTS, ENTITIES, COVERAGE, STAGES], "readwrite");
      const done = finished(tx);
      const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      const canonical = await request(tx.objectStore(AUTHORITY).get(AUTHORITY_KEY)) as Uint8Array | undefined;
      const authority = inspectInventoryAuthorityFence(canonical);
      if (control?.status !== "ready" || authority.status !== "trusted" ||
          authority.unresolvedEffects || authority.vaultIdentity !== control.fence.vaultIdentity ||
          authority.deviceIdentity !== control.fence.deviceIdentity ||
          authority.canonicalCursor !== control.terminalCursor ||
          authority.persistenceRevision !== control.authorityPersistenceRevisionAtPublish ||
          authority.semanticGeneration !== control.authoritySemanticGenerationAtPublish) {
        await done;
        return error("stale", "inactive-or-authority-mismatched-inventory");
      }
      const history: InventoryGenerationManifest[] = [];
      const layerChecks: Array<{ readonly record: StagedManifest; readonly rows: EntityRow[];
        readonly coverage: InventoryCoverage[] }> = [];
      const seen = new Set<string>();
      let id: InventoryGeneration | null = control.activeGeneration;
      while (id) {
        if (seen.has(String(id)) || history.length > MAX_DEPTH) {
          await done;
          return error("invalid", "cyclic-or-unbounded-manifest-chain");
        }
        seen.add(String(id));
        const record = await request(tx.objectStore(MANIFESTS).get(String(id))) as StagedManifest | undefined;
        const m = record?.manifest;
        if (!record?.sealed || !m || m.status !== "complete" ||
            !inventoryFenceMatches(m.fence, control.fence) ||
            m.generation !== id || m.overlayDepth > MAX_DEPTH ||
            record.count !== m.recordCount || !Number.isSafeInteger(record.coverageCount)) {
          await done;
          return error("invalid", "unsealed-or-missing-generation-ancestor");
        }
        // Count the actual durable rows in the same snapshot as the manifest.
        // A deleted indexed child must never be mistaken for an empty covered parent.
        const scope = IDBKeyRange.bound([String(id)], [String(id), []]);
        const entities = await request(tx.objectStore(ENTITIES).getAll(scope)) as EntityRow[];
        const coverage = await request(tx.objectStore(COVERAGE).getAll(scope)) as InventoryCoverage[];
        if (entities.length !== record.count || coverage.length !== record.coverageCount ||
            !record.persistedDigest) {
          await done;
          return error("invalid", "persistent-inventory-row-count-or-seal-invalid");
        }
        layerChecks.push({ record, rows: entities, coverage });
        history.unshift(m);
        id = m.parentGeneration;
      }
      await done;
      // Integrity is checked once per read lease, not on every indexed query.
      // A partial/mismatched durable row set can no longer be a complete scope.
      try {
        for (const layer of layerChecks) {
          if (await persistedDigest(layer.rows, layer.coverage) !== layer.record.persistedDigest)
            return error("invalid", "sealed-inventory-payload-integrity-mismatch");
        }
      } catch {
        return error("recovery-required", "sealed-inventory-integrity-check-unavailable");
      }
      if (!history.length || history[0].parentGeneration !== null ||
          history[0].overlayDepth !== 0 ||
          history[history.length - 1].terminalCursor !== control.terminalCursor)
        return error("invalid", "discontinuous-active-generation");
      for (let i = 1; i < history.length; i++) {
        if (history[i].parentGeneration !== history[i - 1].generation ||
            history[i].inputCursor !== history[i - 1].terminalCursor ||
            history[i].overlayDepth !== history[i - 1].overlayDepth + 1)
          return error("invalid", "discontinuous-parent-cursor-or-depth");
      }
      this.pin(history);
      let released = false;
      const active = history[history.length - 1];
      const deny = (): InventoryReadResult<never> => error("stale", "inventory-read-lease-released");
      const byId = async (id: RemoteObjectId): Promise<InventoryReadResult<InventoryRemoteEntity | undefined>> => {
        if (released) return deny();
        const tx = stores(db, [ENTITIES], "readonly");
        const complete = finished(tx);
        let result: EntityRow | undefined;
        for (let n = history.length - 1; n >= 0; n--) {
          const candidate = await request(tx.objectStore(ENTITIES).get([String(history[n].generation), String(id)])) as EntityRow | undefined;
          if (candidate) { result = candidate; break; }
        }
        await complete;
        if (!result) return error("unknown", "unmapped-id-does-not-prove-absence");
        if (result.kind === "mask") return error("unknown", "masked-id-is-not-deletion-proof");
        if (!result.entity || result.entity.access !== "visible" || result.entity.trashed ||
            result.entity.pathValidity !== "verified")
          return error("unknown", "untrusted-entity-observation");
        return { status: "verified-observation", generation: active.generation, value: result.entity };
      };
      const byScope = async (
        dimension: "parent" | "path", domain: InventoryDomain, key: RemoteObjectId | VaultPath,
        name?: string, limit = DEFAULT_PAGE_SIZE,
      ): Promise<InventoryReadResult<readonly InventoryRemoteEntity[]>> => {
        if (released) return deny();
        if (!Number.isSafeInteger(limit) || limit <= 0 || limit > DEFAULT_PAGE_SIZE)
          return error("invalid", "invalid-or-unbounded-inventory-query-limit");
        const scope = dimension === "parent"
          ? await getCoverage(domain, key as RemoteObjectId, "parent")
          : await getCoverage(domain, contentDomainRoot(control.fence, domain), "domain");
        if (scope.status !== "verified-observation") return scope;
        const tx = stores(db, [ENTITIES], "readonly");
        const complete = finished(tx);
        const store = tx.objectStore(ENTITIES);
        const candidateIds = new Set<string>();
        let overfull = false;
        for (const generation of history) {
          const prefix = dimension === "parent"
            ? [String(generation.generation), domain, String(key)]
            : [String(generation.generation), domain, norm(String(key))];
          const index = store.index(dimension === "parent" ? "by-parent" : "by-path");
          const list = await request(index.getAll(IDBKeyRange.only(prefix), limit + 1)) as EntityRow[];
          if (list.length > limit) { overfull = true; break; }
          for (const entry of list) {
            if (dimension === "parent" && name !== undefined && entry.normalizedName !== norm(name)) continue;
            candidateIds.add(String(entry.remoteObjectId));
            if (candidateIds.size > limit) { overfull = true; break; }
          }
          if (overfull) break;
        }
        if (overfull) {
          await complete;
          return error("partial", "bounded-index-query-truncated");
        }
        const result: InventoryRemoteEntity[] = [];
        for (const objectId of candidateIds) {
          let winning: EntityRow | undefined;
          for (let n = history.length - 1; n >= 0; n--) {
            const current = await request(store.get([String(history[n].generation), objectId])) as EntityRow | undefined;
            if (current) { winning = current; break; }
          }
          if (!winning || winning.kind === "mask") continue;
          const e = winning.entity;
          if (!e || e.domain !== domain) continue;
          if (dimension === "parent" && (e.parentRemoteObjectId !== key ||
              (name !== undefined && norm(e.name) !== norm(name)))) continue;
          if (dimension === "path" && norm(String(e.logicalPath ?? "")) !== norm(String(key))) continue;
          if (e.access !== "visible" || e.trashed || e.pathValidity !== "verified") {
            await complete;
            return error("unknown", "ambiguous-or-inaccessible-index-member");
          }
          result.push(e);
        }
        await complete;
        result.sort((a, b) => String(a.remoteObjectId).localeCompare(String(b.remoteObjectId)));
        if (result.length > limit) return error("partial", "bounded-index-result-exceeds-limit");
        return { status: "verified-observation", generation: active.generation, value: result };
      };
      const getCoverage = async (
        domain: InventoryDomain, scopeId: RemoteObjectId, kind: "domain" | "parent",
      ): Promise<InventoryReadResult<InventoryCoverage>> => {
        if (released) return deny();
        const tx = stores(db, [COVERAGE], "readonly");
        const complete = finished(tx);
        const c = await request(tx.objectStore(COVERAGE).get([String(active.generation), domain, kind, String(scopeId)])) as InventoryCoverage | undefined;
        await complete;
        if (!c || c.state !== "complete" || !c.allPagesRead || c.incompleteSearch ||
            !c.provenanceVerified || c.visibility !== "app-visible" ||
            c.terminalCursor !== active.terminalCursor)
          return error("unknown", "coverage-unproven-at-active-horizon");
        return { status: "verified-observation", generation: active.generation, value: c };
      };
      const lease: InventoryReadLease = {
        generation: active.generation, fence: control.fence,
        getById: byId,
        listByParent: (domain, parent, name, limit) => byScope("parent", domain, parent, name, limit),
        listByPath: (domain, path, limit) => byScope("path", domain, path, undefined, limit),
        coverage: (domain, scope) => getCoverage(domain, scope,
          scope === contentDomainRoot(control.fence, domain) ? "domain" : "parent"),
        release: async () => { if (!released) { released = true; this.unpin(history); } },
      };
      return { status: "verified-observation", generation: active.generation, value: lease };
    } catch (cause) {
      return error("recovery-required", cause instanceof Error ? cause.message : "inventory-open-read-failed");
    } finally {
      this.activity.acquiringReaders--;
    }
  }

  /**
   * Atomically replaces a complete, freshly enumerated LOCAL hint snapshot for
   * the current remote inventory generation. No local absence/deletion is stored.
   * This is advisory state only; normal planning must enumerate the vault again.
   */
  async replaceLocalSnapshot(
    fence: InventoryIdentityFence, generation: InventoryGeneration,
    observations: readonly InventoryLocalObservation[], complete: boolean,
  ): Promise<InventoryReadResult<number>> {
    if (!complete) return error("partial", "local-enumeration-is-not-complete");
    if (observations.length > 12000) return error("partial", "local-inventory-row-budget-exceeded");
    const seen = new Set<string>();
    for (const item of observations) {
      const path = String(item.path);
      const key = norm(path);
      if (item.generation !== generation || !valid(path) || path.includes("\\") ||
          seen.has(key) ||
          (item.presence === "present" && item.kind !== "file" && item.kind !== "folder") ||
          !["present", "unreadable", "unknown"].includes(item.presence))
        return error("invalid", "invalid-or-colliding-local-observation");
      seen.add(key);
    }
    try {
      const db = await this.open();
      const tx = stores(db, [AUTHORITY, CONTROL, LOCAL], "readwrite");
      const done = finished(tx);
      const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      const canonical = await request(tx.objectStore(AUTHORITY).get(AUTHORITY_KEY)) as Uint8Array | undefined;
      const authority = inspectInventoryAuthorityFence(canonical);
      if (control?.status !== "ready" || control.activeGeneration !== generation ||
          !inventoryFenceMatches(control.fence, fence) ||
          authority.status !== "trusted" || authority.unresolvedEffects ||
          authority.vaultIdentity !== fence.vaultIdentity ||
          authority.deviceIdentity !== fence.deviceIdentity ||
          authority.canonicalCursor !== control.terminalCursor ||
          authority.persistenceRevision !== control.authorityPersistenceRevisionAtPublish ||
          authority.semanticGeneration !== control.authoritySemanticGenerationAtPublish) {
        tx.abort();
        await done.catch(() => undefined);
        return error("stale", "local-snapshot-generation-or-authority-changed");
      }
      const local = tx.objectStore(LOCAL);
      const prior = (await request(local.getAll(IDBKeyRange.bound([String(generation)], [String(generation), []])))) as InventoryLocalObservation[];
      for (const item of prior) local.delete([String(generation), String(item.path)]);
      for (const item of observations) local.put(item);
      tx.objectStore(CONTROL).put({
        generation, status: "complete", count: observations.length,
      } satisfies LocalSnapshotMarker, LOCAL_POINTER);
      await done;
      return { status: "verified-observation", generation, value: observations.length };
    } catch {
      return error("recovery-required", "local-inventory-snapshot-storage-unavailable");
    }
  }

  /** A watcher, incomplete scan, or changed policy invalidates hints, not canonical BASE. */
  async invalidateLocalSnapshot(reason: string): Promise<void> {
    const db = await this.open();
    const tx = stores(db, [CONTROL], "readwrite");
    const done = finished(tx);
    const control = await request(tx.objectStore(CONTROL).get(LOCAL_POINTER)) as LocalSnapshotMarker | undefined;
    if (control) tx.objectStore(CONTROL).put({
      ...control, status: "invalid", reason: reason || "local-hints-invalidation",
    } satisfies LocalSnapshotMarker, LOCAL_POINTER);
    await done;
  }

  /** Returns an advisory hint, NEVER authoritative local absence or write stability. */
  async readLocalHint(
    fence: InventoryIdentityFence, path: VaultPath,
  ): Promise<{ readonly status: "advisory"; readonly value: InventoryLocalObservation } | InventoryError> {
    try {
      const db = await this.open();
      const tx = stores(db, [AUTHORITY, CONTROL, LOCAL], "readonly");
      const done = finished(tx);
      const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      const local = await request(tx.objectStore(CONTROL).get(LOCAL_POINTER)) as LocalSnapshotMarker | undefined;
      const bytes = await request(tx.objectStore(AUTHORITY).get(AUTHORITY_KEY)) as Uint8Array | undefined;
      const authority = inspectInventoryAuthorityFence(bytes);
      const row = control?.activeGeneration && local?.status === "complete"
        ? (await request(tx.objectStore(LOCAL).get([String(control.activeGeneration), String(path)]))) as InventoryLocalObservation | undefined
        : undefined;
      await done;
      if (control?.status !== "ready" || local?.status !== "complete" ||
          local.generation !== control.activeGeneration ||
          !inventoryFenceMatches(fence, control.fence) ||
          authority.status !== "trusted" || authority.unresolvedEffects ||
          authority.vaultIdentity !== fence.vaultIdentity || authority.deviceIdentity !== fence.deviceIdentity ||
          authority.canonicalCursor !== control.terminalCursor ||
          authority.persistenceRevision !== control.authorityPersistenceRevisionAtPublish ||
          authority.semanticGeneration !== control.authoritySemanticGenerationAtPublish)
        return error("stale", "no-current-local-observation-snapshot");
      if (!row || row.generation !== local.generation || row.path !== path)
        return error("unknown", "local-path-not-observed-no-absence-inference");
      return { status: "advisory", value: row };
    } catch {
      return error("recovery-required", "local-inventory-hint-read-unavailable");
    }
  }

  /**
   * Bounded crash-resumable cleanup of generations unreachable from both the
   * active manifest chain and pinned readers. The caller holds the vault's
   * existing cross-instance synchronization lease; otherwise defer collection.
   * Each batch commits independently: interrupted cleanup can safely resume.
   */
  async collectGarbage(exclusiveRunLeaseHeld: boolean, maxPasses = GC_MAX_PASSES): Promise<
    | { readonly status: "collected"; readonly removedRows: number; readonly removedGenerations: number }
    | InventoryError
  > {
    if (!exclusiveRunLeaseHeld) return error("stale", "garbage-collection-requires-cross-instance-lease");
    if (!Number.isSafeInteger(maxPasses) || maxPasses < 1 || maxPasses > GC_MAX_PASSES)
      return error("invalid", "invalid-garbage-collection-pass-budget");
    try {
      const db = await this.open();
      let removedRows = 0;
      let removedGenerations = 0;
      for (let pass = 0; pass < maxPasses; pass++) {
        if (this.activity.acquiringReaders) break;
        const tx = stores(db, [CONTROL, MANIFESTS, ENTITIES, COVERAGE, LOCAL, STAGES], "readwrite");
        const done = finished(tx);
        const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
        if (control?.status !== "ready" || this.activity.acquiringReaders) {
          tx.abort(); await done.catch(() => undefined);
          return error("stale", "collector-requires-ready-control-and-no-acquiring-readers");
        }
        const reachable = new Set<string>(this.readers.keys());
        const walked = new Set<string>();
        let id: InventoryGeneration | null = control.activeGeneration;
        while (id) {
          if (walked.has(String(id)) || walked.size >= MAX_DEPTH + 1) {
            tx.abort(); await done.catch(() => undefined);
            return error("invalid", "cyclic-or-unbounded-collector-ancestry");
          }
          walked.add(String(id));
          reachable.add(String(id));
          const record = await request(tx.objectStore(MANIFESTS).get(String(id))) as StagedManifest | undefined;
          if (!record?.sealed || !record.manifest || record.manifest.generation !== id) {
            tx.abort(); await done.catch(() => undefined);
            return error("invalid", "collector-missing-active-ancestor");
          }
          id = record.manifest.parentGeneration;
        }
        const manifests = await request(tx.objectStore(MANIFESTS).getAll()) as StagedManifest[];
        const victims = manifests.filter(item => item?.manifest &&
          !reachable.has(String(item.manifest.generation)) &&
          !this.activity.staging.has(String(item.manifest.generation)));
        const abandoned = await request(tx.objectStore(STAGES).getAll()) as StagedCounter[];
        const victim = victims[0]?.manifest.generation ??
          abandoned.find(item => !reachable.has(String(item.generation)) &&
            !this.activity.staging.has(String(item.generation)))?.generation;
        if (!victim) { await done; break; }
        const scope = IDBKeyRange.bound([String(victim)], [String(victim), []]);
        const entities = await request(tx.objectStore(ENTITIES).getAll(scope, GC_BATCH)) as EntityRow[];
        const coverage = await request(tx.objectStore(COVERAGE).getAll(scope, GC_BATCH)) as InventoryCoverage[];
        const local = await request(tx.objectStore(LOCAL).getAll(scope, GC_BATCH)) as InventoryLocalObservation[];
        for (const row of entities) tx.objectStore(ENTITIES).delete([String(victim), String(row.remoteObjectId)]);
        for (const row of coverage)
          tx.objectStore(COVERAGE).delete([String(victim), row.domain, row.scopeKind, String(row.scopeId)]);
        for (const row of local) tx.objectStore(LOCAL).delete([String(victim), String(row.path)]);
        // Only remove the tombstoned generation marker when all its row sets
        // fit in this batch; a crash before then leaves harmless unreachable data.
        const finishedGeneration = entities.length < GC_BATCH && coverage.length < GC_BATCH &&
          local.length < GC_BATCH;
        if (finishedGeneration) {
          tx.objectStore(MANIFESTS).delete(String(victim));
          tx.objectStore(STAGES).delete(String(victim));
        }
        await done;
        removedRows += entities.length + coverage.length + local.length;
        if (finishedGeneration) removedGenerations++;
      }
      return { status: "collected", removedRows, removedGenerations };
    } catch {
      return error("recovery-required", "inventory-garbage-collection-storage-unavailable");
    }
  }

  /**
   * Short single-transaction linearization of the canonical authority cursor and
   * the complete staged candidate. No network or vault reads are performed here.
   * An absent/rejected candidate cannot change either authoritative cursor or active pointer.
   */
  async publishAtomically(
    input: InventoryPublishRequest,
    learnedBatch?: DurableRemoteChangeBatch,
  ): Promise<InventoryPublishResult> {
    try {
      const db = await this.open();
      // Verify the sealed staged bytes before the short authority/pointer CAS.
      // No asynchronous cryptographic digest is awaited while a read-write IDB
      // transaction is open: that would risk an early IndexedDB auto-commit.
      const proofTx = stores(db, [MANIFESTS, ENTITIES, COVERAGE], "readonly");
      const proofDone = finished(proofTx);
      const preparedStage = await request(proofTx.objectStore(MANIFESTS).get(
        String(input.candidateGeneration))) as StagedManifest | undefined;
      const proofRange = IDBKeyRange.bound(
        [String(input.candidateGeneration)], [String(input.candidateGeneration), []]);
      const stagedRows = await request(proofTx.objectStore(ENTITIES).getAll(proofRange)) as EntityRow[];
      const stagedCoverage = await request(proofTx.objectStore(COVERAGE).getAll(proofRange)) as InventoryCoverage[];
      await proofDone;
      if (!preparedStage?.sealed || !preparedStage.persistedDigest ||
          stagedRows.length !== preparedStage.count ||
          stagedCoverage.length !== preparedStage.coverageCount ||
          await persistedDigest(stagedRows, stagedCoverage) !== preparedStage.persistedDigest)
        return { status: "invalid", reason: "staged-payload-does-not-match-sealed-integrity-digest" };

      const tx = stores(db, [AUTHORITY, CONTROL, MANIFESTS, STAGES, COVERAGE, ENTITIES], "readwrite");
      const done = finished(tx);
      const fail = async (status: "stale" | "invalid" | "recovery-required", reason: string):
        Promise<InventoryPublishResult> => {
        tx.abort();
        await done.catch(() => undefined);
        return { status, reason };
      };
      const control = await request(tx.objectStore(CONTROL).get(POINTER)) as InventoryControl | undefined;
      const staged = await request(tx.objectStore(MANIFESTS).get(String(input.candidateGeneration))) as StagedManifest | undefined;
      const count = await request(tx.objectStore(STAGES).get(String(input.candidateGeneration))) as StagedCounter | undefined;
      const current = await request(tx.objectStore(AUTHORITY).get(AUTHORITY_KEY)) as Uint8Array | undefined;
      const m = staged?.manifest;
      if (!m || !staged?.sealed || !count?.sealed ||
          staged.persistedDigest !== preparedStage.persistedDigest ||
          staged.count !== m.recordCount || count.count !== m.recordCount ||
          count.coverageCount !== staged.coverageCount ||
          await request(tx.objectStore(ENTITIES).count(IDBKeyRange.bound(
            [String(m.generation)], [String(m.generation), []]))) !== count.count ||
          await request(tx.objectStore(COVERAGE).count(IDBKeyRange.bound(
            [String(m.generation)], [String(m.generation), []]))) !== count.coverageCount ||
          m.status !== "complete" || m.validationReceipt !== input.validationReceipt ||
          m.terminalCursor !== input.nextCanonicalCursor ||
          !inventoryFenceMatches(m.fence, input.fence))
        return await fail("invalid", "candidate-stage-or-validation-receipt-unproven");
      if (control?.status === "ready") {
        if (control.activeGeneration !== input.expectedActiveGeneration ||
            control.terminalCursor !== input.expectedCanonicalCursor ||
            !inventoryFenceMatches(control.fence, input.fence) ||
            (m.parentGeneration !== null &&
             (m.parentGeneration !== control.activeGeneration ||
              m.inputCursor !== control.terminalCursor)))
          return await fail("stale", "active-inventory-generation-or-cursor-mismatch");
      } else if (input.expectedActiveGeneration !== null || m.parentGeneration !== null || m.overlayDepth !== 0) {
        return await fail("stale", "untrusted-control-requires-full-baseline");
      }
      if (input.learnedBatchId && (!learnedBatch ||
          String(learnedBatch.checkpoint.batchId) !== input.learnedBatchId))
        return await fail("invalid", "requested-learned-batch-not-supplied");
      if (m.parentGeneration !== null && !learnedBatch)
        return await fail("invalid", "incremental-publication-needs-continuous-learned-batch");
      if (m.parentGeneration === null && learnedBatch)
        return await fail("invalid", "baseline-cannot-commit-incremental-batch");

      for (const domain of ["content", "portable-config"] as const) {
        const rootId = contentDomainRoot(input.fence, domain);
        const root = await request(tx.objectStore(ENTITIES).get(
          [String(m.generation), String(rootId)])) as EntityRow | undefined;
        if ((m.parentGeneration === null && (root?.kind !== "upsert" ||
             root.entity?.parentRemoteObjectId !== null ||
             root.entity?.kind !== "folder" || root.entity?.domain !== domain ||
             root.entity?.managedRootId !== input.fence.managedRootId)) ||
            (m.parentGeneration !== null && root?.kind === "mask"))
          return await fail("invalid", "required-domain-root-inventory-identity-missing");
        const coverage = await request(tx.objectStore(COVERAGE).get(
          [String(m.generation), domain, "domain", String(rootId)])) as InventoryCoverage | undefined;
        if (!coverage || coverage.scopeKind !== "domain" || coverage.state !== "complete" ||
            !coverage.allPagesRead || coverage.incompleteSearch ||
            coverage.visibility !== "app-visible" || !coverage.provenanceVerified ||
            coverage.terminalCursor !== m.terminalCursor)
          return await fail("invalid", "required-managed-domain-coverage-unproven");
      }
      const prepared = prepareInventoryAuthorityPublication(current, {
        persistenceRevision: input.expectedAuthorityPersistenceRevision,
        semanticGeneration: input.expectedAuthoritySemanticGeneration,
        canonicalCursor: input.expectedCanonicalCursor,
        terminalCursor: input.nextCanonicalCursor,
        mode: m.parentGeneration === null ? "baseline" : "incremental",
        ...(learnedBatch ? { learnedBatch } : {}),
      });
      if (prepared.status !== "prepared")
        return await fail(prepared.status === "stale" ? "stale" : "recovery-required", prepared.reason);
      const publication: InventoryGenerationManifest = {
        ...m, authorityPersistenceRevision: prepared.persistenceRevision,
        authoritySemanticGeneration: prepared.semanticGeneration,
      };
      tx.objectStore(AUTHORITY).put(prepared.replacement, AUTHORITY_KEY);
      tx.objectStore(MANIFESTS).put({ ...staged, manifest: publication }, String(m.generation));
      tx.objectStore(CONTROL).put({
        status: "ready", activeGeneration: m.generation, terminalCursor: m.terminalCursor,
        fence: m.fence, authorityPersistenceRevisionAtPublish: prepared.persistenceRevision,
        authoritySemanticGenerationAtPublish: prepared.semanticGeneration,
      } satisfies InventoryControl, POINTER);
      await done;
      return { status: "published", generation: m.generation, terminalCursor: m.terminalCursor };
    } catch (cause) {
      return { status: "recovery-required",
        reason: cause instanceof Error ? cause.message : "atomic-inventory-publication-failed" };
    } finally {
      this.activity.staging.delete(String(input.candidateGeneration));
    }
  }
}
