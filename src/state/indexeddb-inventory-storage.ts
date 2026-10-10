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

  /** No inferred absence: a missing ID returns unknown, never a verified undefined. */
  async openRead(): Promise<InventoryReadResult<InventoryReadLease>> {
    try {
      const db = await this.open();
      const tx = stores(db, [AUTHORITY, CONTROL, MANIFESTS], "readonly");
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
            m.generation !== id || m.overlayDepth > MAX_DEPTH) {
          await done;
          return error("invalid", "unsealed-or-missing-generation-ancestor");
        }
        history.unshift(m);
        id = m.parentGeneration;
      }
      await done;
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
        const scope = await getCoverage(domain, contentDomainRoot(control.fence, domain));
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
        domain: InventoryDomain, scopeId: RemoteObjectId,
      ): Promise<InventoryReadResult<InventoryCoverage>> => {
        if (released) return deny();
        const tx = stores(db, [COVERAGE], "readonly");
        const complete = finished(tx);
        const c = await request(tx.objectStore(COVERAGE).get([String(active.generation), domain, "domain", String(scopeId)])) as InventoryCoverage | undefined;
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
        coverage: getCoverage,
        release: async () => { if (!released) { released = true; this.unpin(history); } },
      };
      return { status: "verified-observation", generation: active.generation, value: lease };
    } catch (cause) {
      return error("recovery-required", cause instanceof Error ? cause.message : "inventory-open-read-failed");
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
          staged.count !== m.recordCount || count.count !== m.recordCount ||
          count.coverageCount !== staged.coverageCount ||
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
    }
  }
}
