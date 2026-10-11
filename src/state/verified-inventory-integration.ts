/**
 * DEC-339 D339-04: dormant, baseline-only integration of provider observations,
 * whole-graph validation, shadow IndexedDB generations and canonical cursor CAS.
 *
 * No import from the shipping entrypoint. No planner/executor/deletion authority.
 * Incremental changes are NOT yet publishable: inherited coverage, masks and
 * root-wide provenance must be proven by the later bounded integration increment.
 */
import type {
  ChangeCursor, DurableRemoteChangeBatch, InventoryCoverage, InventoryDomain,
  InventoryGeneration, InventoryGenerationManifest, InventoryIdentityFence,
  InventoryOverlayRecord, InventoryPublishRequest, InventoryReadLease,
  InventoryRemoteEntity, InventoryTrustFailure, RemoteIngestionBatchId, RemoteObjectId,
} from "../contracts";
import { validateInventoryCandidate } from "./verified-metadata-inventory-validation";
import type { IndexedDbInventoryObservationStore } from "./indexeddb-inventory-storage";
import type { VerifiedMetadataInventoryReader } from "../drive/verified-metadata-inventory-reader";

type Failure = { readonly status: InventoryTrustFailure; readonly reason: string };
export type InventoryIntegrationResult =
  | { readonly status: "published"; readonly generation: InventoryGeneration;
      readonly terminalCursor: ChangeCursor; readonly ambiguousSiblingKeys: readonly string[] }
  | Failure;
const failed = (status: InventoryTrustFailure, reason: string): Failure => ({ status, reason });
const MAX_VALIDATED_ROWS = 12000;
const MAX_VALIDATED_BYTES = 12 * 1024 * 1024;

async function* stream<T>(data: readonly T[]): AsyncIterable<T> {
  for (const value of data) yield value;
}
async function digest(value: unknown): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return undefined;
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  if (encoded.byteLength > MAX_VALIDATED_BYTES) return undefined;
  const sha = await subtle.digest("SHA-256", encoded);
  return "sha256:" + Array.from(new Uint8Array(sha), byte => byte.toString(16).padStart(2, "0")).join("");
}
function coverageComplete(
  entities: readonly InventoryRemoteEntity[], receipts: readonly InventoryCoverage[],
  fence: InventoryIdentityFence, cursor: ChangeCursor,
): boolean {
  const keys = new Set<string>();
  for (const c of receipts) {
    if (c.terminalCursor !== cursor || c.visibility !== "app-visible" ||
        c.state !== "complete" || !c.allPagesRead || c.incompleteSearch ||
        !c.provenanceVerified) return false;
    const key = JSON.stringify([c.domain, c.scopeKind, c.scopeId]);
    if (keys.has(key)) return false;
    keys.add(key);
  }
  for (const domain of ["content", "portable-config"] as const) {
    const root = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    if (!keys.has(JSON.stringify([domain, "domain", root]))) return false;
  }
  for (const e of entities) {
    if (e.kind === "folder" &&
        !keys.has(JSON.stringify([e.domain, "parent", e.remoteObjectId]))) return false;
  }
  return true;
}
function orderedRows(
  generation: InventoryGeneration, entities: readonly InventoryRemoteEntity[],
): readonly InventoryOverlayRecord[] {
  return [...entities].sort((a, b) =>
    String(a.remoteObjectId).localeCompare(String(b.remoteObjectId))).map(entity => ({
    kind: "upsert" as const, generation, entity,
  }));
}

/**
 * The operator provides an exact generation and identity fence. D339-04 owns
 * promotion only after the complete D339-03 read and D339-01 graph checks.
 * A failure anywhere before the storage CAS does not advance the canonical
 * cursor; after stage failure, untrusted shadow rows remain invisible.
 */
export class VerifiedInventoryBaselineCoordinator {
  constructor(
    private readonly reader: Pick<VerifiedMetadataInventoryReader, "baseline" | "incremental">,
    private readonly storage: Pick<IndexedDbInventoryObservationStore,
      "publicationSnapshot" | "stage" | "publishAtomically"> &
      Partial<Pick<IndexedDbInventoryObservationStore, "openRead">>,
  ) {}

  async publishBaseline(
    fence: InventoryIdentityFence, generation: InventoryGeneration,
  ): Promise<InventoryIntegrationResult> {
    if (typeof generation !== "string" || !generation.trim())
      return failed("invalid", "invalid-candidate-generation");
    const before = await this.storage.publicationSnapshot(fence);
    if (before.status !== "trusted-fence") return failed(before.status, before.reason);
    const provider = await this.reader.baseline(fence, generation);
    if (provider.status !== "ok") return failed(provider.status, provider.reason);
    const candidate = provider.value;
    if (candidate.publishAuthorized !== false ||
        candidate.terminalCursor === before.value.canonicalCursor ||
        candidate.entities.length + candidate.coverage.length + 1 > MAX_VALIDATED_ROWS)
      return failed("invalid", "unbounded-or-nonprogressing-baseline");
    if (!coverageComplete(candidate.entities, candidate.coverage, fence, candidate.terminalCursor))
      return failed("unknown", "unproven-provider-visible-parent-or-domain-coverage");
    const overlays = orderedRows(generation, candidate.entities);
    const receipts = [...candidate.coverage].sort((a, b) =>
      JSON.stringify([a.domain, a.scopeKind, a.scopeId]).localeCompare(
        JSON.stringify([b.domain, b.scopeKind, b.scopeId])));
    const coverageDigest = await digest(receipts);
    if (!coverageDigest) return failed("recovery-required", "inventory-digest-unavailable-or-too-large");
    const basis = {
      generation, parentGeneration: null, overlayDepth: 0,
      inputCursor: candidate.inputCursor, terminalCursor: candidate.terminalCursor,
      baseStartToken: candidate.inputCursor, fence,
      authorityPersistenceRevision: before.value.persistenceRevision,
      authoritySemanticGeneration: before.value.semanticGeneration,
      recordCount: overlays.length, coverageDigest, status: "complete" as const,
    };
    const receipt = await digest({ basis, overlays, coverage: receipts });
    if (!receipt) return failed("recovery-required", "inventory-validation-receipt-unavailable");
    const manifest: InventoryGenerationManifest = { ...basis, validationReceipt: receipt };
    const validation = validateInventoryCandidate({
      activeGeneration: generation,
      manifests: [manifest], overlays, coverage: receipts, expectedFence: fence,
      canonicalCursor: candidate.terminalCursor,
      authorityPersistenceRevision: before.value.persistenceRevision,
      authoritySemanticGeneration: before.value.semanticGeneration,
    }, MAX_VALIDATED_ROWS);
    if (validation.status !== "verified-observation")
      return failed(validation.status, validation.reason);
    // Recheck authority *before* touching the shadow stores. Publication also CASes.
    const again = await this.storage.publicationSnapshot(fence);
    if (again.status !== "trusted-fence") return failed(again.status, again.reason);
    if (again.value.activeGeneration !== before.value.activeGeneration ||
        again.value.canonicalCursor !== before.value.canonicalCursor ||
        again.value.persistenceRevision !== before.value.persistenceRevision ||
        again.value.semanticGeneration !== before.value.semanticGeneration)
      return failed("stale", "authority-or-active-generation-changed-during-remote-read");
    const staged = await this.storage.stage({
      candidate: manifest, overlays: stream(overlays), coverage: stream(receipts),
    });
    if (staged.status !== "verified-observation")
      return failed(staged.status, staged.reason);
    const publish: InventoryPublishRequest = {
      candidateGeneration: generation, validationReceipt: receipt,
      expectedActiveGeneration: before.value.activeGeneration,
      expectedAuthorityPersistenceRevision: before.value.persistenceRevision,
      expectedAuthoritySemanticGeneration: before.value.semanticGeneration,
      expectedCanonicalCursor: before.value.canonicalCursor,
      nextCanonicalCursor: candidate.terminalCursor, fence,
    };
    const result = await this.storage.publishAtomically(publish);
    if (result.status !== "published") return failed(result.status, result.reason);
    return {
      status: "published", generation: result.generation, terminalCursor: result.terminalCursor,
      ambiguousSiblingKeys: validation.ambiguousOccupancy,
    };
  }

  /**
   * Walk only a bounded active, coverage-verified graph. Missing/ambiguous
   * parent scopes are NOT empty; they force a full rebaseline. Reads are
   * pinned until materialization has finished, including across COW parents.
   */
  private async materialize(lease: InventoryReadLease,
    fence: InventoryIdentityFence): Promise<
      | { readonly status: "ok"; readonly entities: readonly InventoryRemoteEntity[] }
      | Failure> {
    const rows: InventoryRemoteEntity[] = [];
    const seen = new Set<string>();
    for (const domain of ["content", "portable-config"] as const) {
      const root = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
      const first = await lease.getById(root);
      if (first.status !== "verified-observation" || !first.value ||
          first.value.parentRemoteObjectId !== null || first.value.domain !== domain ||
          first.value.kind !== "folder")
        return failed("unknown", "missing-trusted-active-domain-root");
      const queue: InventoryRemoteEntity[] = [first.value];
      for (let offset = 0; offset < queue.length; offset++) {
        const parent = queue[offset];
        const id = String(parent.remoteObjectId);
        if (seen.has(id)) return failed("invalid", "cyclic-or-duplicate-active-inventory-id");
        seen.add(id); rows.push(parent);
        if (rows.length > MAX_VALIDATED_ROWS / 2)
          return failed("partial", "active-materialization-row-limit");
        const cov = await lease.coverage(domain, parent.remoteObjectId);
        if (cov.status !== "verified-observation" ||
            cov.value.scopeId !== parent.remoteObjectId ||
            (cov.value.scopeKind !== "parent" && parent.remoteObjectId !== root))
          return failed("unknown", "active-parent-coverage-unproven");
        const children = await lease.listByParent(domain, parent.remoteObjectId);
        if (children.status !== "verified-observation")
          return failed(children.status, children.reason);
        for (const child of children.value) {
          if (child.parentRemoteObjectId !== parent.remoteObjectId ||
              child.domain !== domain || child.managedRootId !== fence.managedRootId)
            return failed("invalid", "active-child-parent-or-identity-drift");
          if (seen.has(String(child.remoteObjectId)) ||
              queue.some(item => item.remoteObjectId === child.remoteObjectId))
            return failed("invalid", "repeated-active-object-id");
          if (child.kind === "folder") queue.push(child);
          else { seen.add(String(child.remoteObjectId)); rows.push(child); }
        }
        if (rows.length + queue.length > MAX_VALIDATED_ROWS / 2)
          return failed("partial", "unbounded-active-inventory");
      }
    }
    return { status: "ok", entities: rows };
  }

  /**
   * COW incremental publication is conditional on a previously accepted,
   * complete managed graph and an uninterrupted account-wide Changes horizon.
   * Each current parent is restamped at the new horizon only after WS-03's
   * root-wide census and changed-parent provider reconciliation.
   * No inventory record certifies a physical mutation or remote deletion.
   */
  async publishIncremental(
    fence?: InventoryIdentityFence, generation?: InventoryGeneration,
    batchId?: RemoteIngestionBatchId,
  ): Promise<InventoryIntegrationResult> {
    if (!fence || !generation || !batchId ||
        !String(generation).trim() || !String(batchId).trim())
      return failed("recovery-required", "complete-incremental-authority-binding-required");
    const before = await this.storage.publicationSnapshot(fence);
    if (before.status !== "trusted-fence") return failed(before.status, before.reason);
    const prior = before.value.activeManifest;
    if (!prior || !before.value.activeGeneration ||
        prior.generation !== before.value.activeGeneration ||
        prior.terminalCursor !== before.value.canonicalCursor)
      return failed("stale", "no-coherent-active-inventory-to-extend");
    if (prior.overlayDepth >= 32)
      return failed("recovery-required", "overlay-depth-requires-full-rebaseline");
    if (!this.storage.openRead) return failed("recovery-required", "active-lease-read-unavailable");
    const read = await this.storage.openRead();
    if (read.status !== "verified-observation") return failed(read.status, read.reason);
    let materialized: Awaited<ReturnType<VerifiedInventoryBaselineCoordinator["materialize"]>>;
    try {
      if (read.value.generation !== prior.generation ||
          read.value.fence.managedRootId !== fence.managedRootId)
        return failed("stale", "read-lease-does-not-match-current-authority");
      materialized = await this.materialize(read.value, fence);
    } finally {
      await read.value.release();
    }
    if (materialized.status !== "ok") return materialized;
    const delta = await this.reader.incremental(fence, generation,
      prior.terminalCursor, materialized.entities);
    if (delta.status !== "ok") return failed(delta.status, delta.reason);
    const candidate = delta.value;
    if (candidate.publishAuthorized !== false ||
        candidate.inputCursor !== prior.terminalCursor ||
        candidate.terminalCursor === prior.terminalCursor ||
        candidate.overlays.length + candidate.coverage.length > MAX_VALIDATED_ROWS)
      return failed("invalid", "unbounded-or-discontinuous-incremental-read");
    const overlayIds = new Set<string>();
    const effective = new Map<string, InventoryRemoteEntity>(
      materialized.entities.map(entity => [String(entity.remoteObjectId), entity]));
    for (const row of candidate.overlays) {
      const id = String(row.kind === "mask" ? row.remoteObjectId : row.entity.remoteObjectId);
      if (overlayIds.has(id) || row.generation !== generation)
        return failed("invalid", "duplicate-or-misaligned-delta-stable-id");
      overlayIds.add(id);
      const old = effective.get(id);
      if (row.kind === "mask") {
        if (!old || old.kind === "folder")
          return failed("unknown", "unproven-or-nonleaf-inventory-mask");
        effective.delete(id);
      } else {
        if (old && (old.domain !== row.entity.domain ||
            old.kind !== row.entity.kind))
          return failed("invalid", "illegal-stable-id-domain-or-kind-reclassification");
        effective.set(id, row.entity);
      }
    }
    const allCurrent = [...effective.values()].map(entity => ({
      ...entity, generation,
    }));
    if (!coverageComplete(allCurrent, candidate.coverage, fence, candidate.terminalCursor))
      return failed("unknown", "inherited-parent-or-domain-coverage-unproven");
    const normalized = orderedRows(generation, allCurrent);
    const coverage = [...candidate.coverage].sort((a,b) =>
      JSON.stringify([a.domain,a.scopeKind,a.scopeId]).localeCompare(
        JSON.stringify([b.domain,b.scopeKind,b.scopeId])));
    const coverageDigest = await digest(coverage);
    if (!coverageDigest) return failed("recovery-required", "incremental-coverage-digest-unavailable");
    // A synthetic fully-materialized baseline validates EVERY live entity,
    // not merely touched overlays. Only touched records enter the staged COW.
    const synthetic: InventoryGenerationManifest = {
      generation, parentGeneration: null, overlayDepth: 0,
      inputCursor: prior.terminalCursor, terminalCursor: candidate.terminalCursor,
      baseStartToken: prior.baseStartToken, fence,
      authorityPersistenceRevision: before.value.persistenceRevision,
      authoritySemanticGeneration: before.value.semanticGeneration,
      recordCount: normalized.length, coverageDigest,
      validationReceipt: "prepublication-full-graph-check", status: "complete",
    };
    const validated = validateInventoryCandidate({
      activeGeneration: generation, manifests: [synthetic],
      overlays: normalized, coverage, expectedFence: fence,
      canonicalCursor: candidate.terminalCursor,
      authorityPersistenceRevision: before.value.persistenceRevision,
      authoritySemanticGeneration: before.value.semanticGeneration,
    }, MAX_VALIDATED_ROWS);
    if (validated.status !== "verified-observation")
      return failed(validated.status, validated.reason);
    const touched = [...candidate.overlays].sort((a,b) =>
      String(a.kind === "mask" ? a.remoteObjectId : a.entity.remoteObjectId).localeCompare(
        String(b.kind === "mask" ? b.remoteObjectId : b.entity.remoteObjectId)));
    const basis = {
      generation, parentGeneration: prior.generation,
      overlayDepth: prior.overlayDepth + 1, inputCursor: prior.terminalCursor,
      terminalCursor: candidate.terminalCursor, baseStartToken: prior.baseStartToken, fence,
      authorityPersistenceRevision: before.value.persistenceRevision,
      authoritySemanticGeneration: before.value.semanticGeneration,
      recordCount: touched.length, coverageDigest, status: "complete" as const,
    };
    const receipt = await digest({ basis, touched, fullGraphDigest: await digest(normalized), coverage });
    if (!receipt) return failed("recovery-required", "delta-validation-receipt-unavailable");
    const manifest: InventoryGenerationManifest = { ...basis, validationReceipt: receipt };
    const again = await this.storage.publicationSnapshot(fence);
    if (again.status !== "trusted-fence") return failed(again.status, again.reason);
    if (again.value.activeGeneration !== prior.generation ||
        again.value.canonicalCursor !== prior.terminalCursor ||
        again.value.persistenceRevision !== before.value.persistenceRevision ||
        again.value.semanticGeneration !== before.value.semanticGeneration)
      return failed("stale", "canonical-state-or-inventory-generation-raced");
    const staged = await this.storage.stage({
      candidate: manifest, overlays: stream(touched), coverage: stream(coverage),
    });
    if (staged.status !== "verified-observation") return failed(staged.status, staged.reason);
    const learnedBatch: DurableRemoteChangeBatch = {
      checkpoint: {
        batchId, startingToken: prior.terminalCursor,
        terminalStartToken: candidate.terminalCursor,
        persistenceRevision: before.value.persistenceRevision, status: "learned",
      },
      changes: candidate.learnedChanges,
    };
    const request: InventoryPublishRequest = {
      candidateGeneration: generation, validationReceipt: receipt,
      expectedActiveGeneration: prior.generation,
      expectedAuthorityPersistenceRevision: before.value.persistenceRevision,
      expectedAuthoritySemanticGeneration: before.value.semanticGeneration,
      expectedCanonicalCursor: prior.terminalCursor,
      nextCanonicalCursor: candidate.terminalCursor, fence, learnedBatchId: String(batchId),
    };
    const committed = await this.storage.publishAtomically(request, learnedBatch);
    if (committed.status !== "published") return failed(committed.status, committed.reason);
    return {
      status: "published", generation, terminalCursor: committed.terminalCursor,
      ambiguousSiblingKeys: validated.ambiguousOccupancy,
    };
  }
}
