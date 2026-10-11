/**
 * DEC-339 D339-04: dormant, baseline-only integration of provider observations,
 * whole-graph validation, shadow IndexedDB generations and canonical cursor CAS.
 *
 * No import from the shipping entrypoint. No planner/executor/deletion authority.
 * Incremental changes are NOT yet publishable: inherited coverage, masks and
 * root-wide provenance must be proven by the later bounded integration increment.
 */
import type {
  ChangeCursor, InventoryCoverage, InventoryGeneration, InventoryGenerationManifest,
  InventoryIdentityFence, InventoryOverlayRecord, InventoryPublishRequest,
  InventoryRemoteEntity, InventoryTrustFailure,
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
    private readonly reader: Pick<VerifiedMetadataInventoryReader, "baseline">,
    private readonly storage: Pick<IndexedDbInventoryObservationStore,
      "publicationSnapshot" | "stage" | "publishAtomically">,
  ) {}

  async publishBaseline(
    fence: InventoryIdentityFence, generation: InventoryGeneration,
  ): Promise<InventoryIntegrationResult> {
    if (typeof generation !== "string" || !generation.trim())
      return failed("invalid", "invalid-candidate-generation");
    const before = await this.storage.publicationSnapshot(fence);
    if (before.status !== "verified-observation") return failed(before.status, before.reason);
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
    if (again.status !== "verified-observation") return failed(again.status, again.reason);
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
   * Explicitly forbid publishing a delta with copied/inherited coverage. A
   * full rebaseline is the only admissible refresh until the delta-coverage
   * and stable-ID mask reducer are validated and atomically wired.
   */
  async publishIncremental(): Promise<Failure> {
    return failed("recovery-required", "incremental-generation-needs-validated-lineage-and-coverage-replay");
  }
}
