/**
 * DEC-339 D339-09A: dormant read-only bridge from a sealed inventory to the
 * existing RemoteListing planning shape. It does not open Google Drive, poll
 * Changes, authorize writes, alter BASE, or mint deletion evidence.
 *
 * The caller MUST prove Changes continuity from observedThroughCursor before
 * using a projection for a new planning horizon. No shipping runtime imports
 * this module yet.
 */
import type {
  ChangeCursor, InventoryDomain, InventoryGeneration, InventoryIdentityFence,
  InventoryReadLease, InventoryRemoteEntity, InventoryTrustFailure,
  RemoteEntry, RemoteObjectId, RemoteListing, VaultPath,
} from "../contracts";
import type { IndexedDbInventoryObservationStore } from "../state/indexeddb-inventory-storage";
import { inventoryFenceMatches } from "../state/verified-metadata-inventory-validation";

const MAX_ENTITIES = 6000;
const MAX_CHILDREN_PER_PARENT = 256;
type InventorySource = Pick<IndexedDbInventoryObservationStore, "publicationSnapshot" | "openRead">;

export type InventoryPlanningProjectionResult =
  | {
      readonly status: "verified-observation";
      readonly generation: InventoryGeneration;
      readonly observedThroughCursor: ChangeCursor;
      readonly purpose: "planning-only";
      readonly listing: RemoteListing;
    }
  | { readonly status: InventoryTrustFailure; readonly reason: string };

function failed(status: InventoryTrustFailure, reason: string): InventoryPlanningProjectionResult {
  return { status, reason };
}

function completeAt(
  c: Awaited<ReturnType<InventoryReadLease["coverage"]>>,
  domain: InventoryDomain, scopeId: RemoteObjectId,
  kind: "parent" | "domain", cursor: ChangeCursor,
): boolean {
  return c.status === "verified-observation" &&
    c.value.domain === domain && c.value.scopeId === scopeId &&
    c.value.scopeKind === kind && c.value.terminalCursor === cursor &&
    c.value.state === "complete" && c.value.visibility === "app-visible" &&
    c.value.allPagesRead && !c.value.incompleteSearch && c.value.provenanceVerified;
}

function usableEntity(entity: InventoryRemoteEntity, domain: InventoryDomain,
  fence: InventoryIdentityFence): boolean {
  return entity.domain === domain && entity.provenanceDomain === domain &&
    entity.managedRootId === fence.managedRootId &&
    entity.access === "visible" && !entity.trashed &&
    entity.pathValidity === "verified";
}

/**
 * Entire provider-visible graph must be validated before a complete listing
 * can be returned; a truncated sibling set, inaccessible path, corrupt parent,
 * duplicate ID, or incomplete coverage rejects the WHOLE projection.
 */
async function materialize(
  lease: InventoryReadLease, fence: InventoryIdentityFence, cursor: ChangeCursor,
): Promise<InventoryPlanningProjectionResult | { readonly status: "ok"; readonly entries: readonly RemoteEntry[] }> {
  const registeredIds = new Set<string>();
  const entries: RemoteEntry[] = [];
  for (const domain of ["content", "portable-config"] as const) {
    const rootId = domain === "content" ? fence.contentDomainRootId : fence.configDomainRootId;
    const root = await lease.getById(rootId);
    if (root.status !== "verified-observation" || !root.value ||
        !usableEntity(root.value, domain, fence) ||
        root.value.kind !== "folder" || root.value.parentRemoteObjectId !== null ||
        root.value.remoteObjectId !== rootId)
      return failed("unknown", "unproven-inventory-domain-root");
    if (registeredIds.has(String(rootId))) return failed("invalid", "duplicate-cross-domain-root-id");
    registeredIds.add(String(rootId));
    const queue: InventoryRemoteEntity[] = [root.value];
    for (let next = 0; next < queue.length; next++) {
      const parent = queue[next]!;
      const parentId = String(parent.remoteObjectId);
      if (!registeredIds.has(parentId)) return failed("invalid", "unregistered-inventory-parent");
      if (registeredIds.size > MAX_ENTITIES) return failed("partial", "bounded-inventory-projection-exceeded");

      const receipt = await lease.coverage(domain, parent.remoteObjectId);
      if (!completeAt(receipt, domain, parent.remoteObjectId,
          parent.remoteObjectId === rootId ? "domain" : "parent", cursor))
        return failed("unknown", "unproven-parent-or-domain-coverage");

      const children = await lease.listByParent(domain, parent.remoteObjectId,
        undefined, MAX_CHILDREN_PER_PARENT);
      if (children.status !== "verified-observation")
        return failed(children.status, children.reason);
      for (const child of children.value) {
        const id = String(child.remoteObjectId);
        if (!usableEntity(child, domain, fence) ||
            child.parentRemoteObjectId !== parent.remoteObjectId ||
            !child.logicalPath || !String(child.logicalPath).trim())
          return failed("unknown", "uncertain-inventory-child-or-ancestry");
        if (registeredIds.has(id))
          return failed("invalid", "duplicate-stable-id-in-projected-graph");
        if (registeredIds.size >= MAX_ENTITIES)
          return failed("partial", "bounded-inventory-projection-exceeded");
        registeredIds.add(id);
        entries.push({
          path: child.logicalPath as VaultPath,
          remoteObjectId: child.remoteObjectId,
          entityKind: child.kind,
          content: child.content,
          trashed: false,
        });
        if (child.kind === "folder") queue.push(child);
      }
    }
  }
  return { status: "ok", entries };
}

/**
 * A point-in-time planning projection, not a present-day remote-state claim.
 * A successful read does NOT permit planning without fresh Changes traversal
 * and does NOT replace execution preconditions or effect verification.
 */
export class VerifiedInventoryPlanningProjection {
  constructor(private readonly storage: InventorySource) {}

  async read(
    fence: InventoryIdentityFence, expectedCanonicalCursor: ChangeCursor,
  ): Promise<InventoryPlanningProjectionResult> {
    try {
      const before = await this.storage.publicationSnapshot(fence);
      if (before.status !== "trusted-fence") return failed(before.status, before.reason);
      if (!before.value.activeGeneration || !before.value.activeManifest ||
          before.value.activeManifest.terminalCursor !== expectedCanonicalCursor ||
          before.value.canonicalCursor !== expectedCanonicalCursor)
        return failed("stale", "no-matching-canonical-inventory-generation");

      const current = await this.storage.openRead();
      if (current.status !== "verified-observation")
        return failed(current.status, current.reason);
      let projection: Awaited<ReturnType<typeof materialize>>;
      try {
        if (current.value.generation !== before.value.activeGeneration ||
            !inventoryFenceMatches(current.value.fence, fence))
          return failed("stale", "inventory-read-fence-mismatch");
        projection = await materialize(current.value, fence, expectedCanonicalCursor);
      } finally {
        await current.value.release();
      }
      if (projection.status !== "ok") return projection;

      const after = await this.storage.publicationSnapshot(fence);
      if (after.status !== "trusted-fence") return failed(after.status, after.reason);
      if (after.value.activeGeneration !== before.value.activeGeneration ||
          after.value.canonicalCursor !== before.value.canonicalCursor ||
          after.value.persistenceRevision !== before.value.persistenceRevision ||
          after.value.semanticGeneration !== before.value.semanticGeneration)
        return failed("stale", "inventory-authority-changed-during-planning-projection");

      return {
        status: "verified-observation",
        generation: before.value.activeGeneration,
        observedThroughCursor: expectedCanonicalCursor,
        purpose: "planning-only",
        listing: { entries: projection.entries, completeness: { status: "complete" } },
      };
    } catch {
      return failed("recovery-required", "inventory-planning-projection-unavailable");
    }
  }
}
