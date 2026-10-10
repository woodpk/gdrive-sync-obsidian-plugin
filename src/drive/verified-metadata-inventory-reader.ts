/**
 * DEC-339 D339-03 — dormant metadata observation assembly.
 * These are provider observations for future WS-02 validation, never mutation,
 * BASE, deletion, recovery or cursor-commit authority. All absence is app-visible.
 */
import { contractId, type ChangeCursor, type RemoteObjectId, type VaultPath } from "../contracts/common";
import type {
  InventoryCoverage, InventoryDomain, InventoryGeneration, InventoryIdentityFence,
  InventoryOverlayRecord, InventoryRemoteEntity, InventoryTargetedProof,
} from "../contracts/verified-metadata-inventory";
import type {
  InventoryDriveChange, InventoryDriveFile, InventoryDriveFetch, InventoryDriveListPage,
  InventoryMetadataSource,
} from "./inventory-metadata-source";

const FOLDER = "application/vnd.google-apps.folder";
const rid = (s: string) => contractId<"RemoteObjectId">(s) as RemoteObjectId;
const pathId = (s: string) => contractId<"VaultPath">(s) as VaultPath;
const cursorId = (s: string) => contractId<"ChangeCursor">(s) as ChangeCursor;
const error = (reason: string, status: "unknown" | "partial" | "incompatible" | "stale" | "recovery-required" = "unknown"):
  InventoryDriveFetch<never> => ({ status, reason });
const norm = (value: string) => value.normalize("NFC").toLocaleLowerCase("en-US");

export interface InventoryProviderBaseline {
  readonly inputCursor: ChangeCursor;
  readonly terminalCursor: ChangeCursor;
  readonly entities: readonly InventoryRemoteEntity[];
  readonly coverage: readonly InventoryCoverage[];
  readonly normalizedSiblingCollisions: readonly string[];
  readonly replayedEvents: number;
  /** Explicitly cannot be published without independent WS-02 validation and CAS. */
  readonly publishAuthorized: false;
}
export interface InventoryProviderDelta {
  readonly inputCursor: ChangeCursor;
  readonly terminalCursor: ChangeCursor;
  readonly overlays: readonly InventoryOverlayRecord[];
  readonly invalidatedParentIds: readonly RemoteObjectId[];
  readonly publishAuthorized: false;
}
export interface InventoryTargetedReadRequest {
  readonly remoteObjectId: RemoteObjectId;
  readonly parentRemoteObjectId: RemoteObjectId;
  readonly domain: InventoryDomain;
  readonly name: string;
  readonly purpose: InventoryTargetedProof["purpose"];
  readonly expectedRevision?: string;
  readonly expectedSizeBytes?: number;
  readonly expectedSha256?: string;
}
export interface InventoryTargetedReadObservation {
  readonly object: InventoryRemoteEntity;
  readonly siblingIds: readonly RemoteObjectId[];
  readonly parentChain: readonly RemoteObjectId[];
  readonly appVisibleOnly: true;
  readonly rootWideMarkedProvenanceRechecked: true;
  /** This is NOT a physical convergence proof or an executor authorization. */
  readonly executorProofAuthorized: false;
}
interface RawManaged {
  readonly file: InventoryDriveFile;
  readonly domain: InventoryDomain;
  readonly parentId: string | null;
}
const domainRoot = (f: InventoryIdentityFence, d: InventoryDomain) =>
  String(d === "content" ? f.contentDomainRootId : f.configDomainRootId);
const live = (file: InventoryDriveFile) => !file.trashed;
function suitableName(name: string): boolean {
  return name.length > 0 && name !== "." && name !== ".." &&
    !name.includes("/") && !/[\u0000-\u001f]/.test(name);
}

export class VerifiedMetadataInventoryReader {
  constructor(private readonly source: InventoryMetadataSource,
    private readonly maximumObjects = 20000, private readonly maximumPages = 2000) {}

  private async allPages(
    read: (token?: string) => Promise<InventoryDriveFetch<InventoryDriveListPage>>,
  ): Promise<InventoryDriveFetch<readonly InventoryDriveFile[]>> {
    const files: InventoryDriveFile[] = [];
    const seen = new Set<string>();
    let token: string | undefined;
    for (let page = 0; page < this.maximumPages; page++) {
      const result = await read(token);
      if (result.status !== "ok") return result;
      if (result.value.incompleteSearch) return error("incomplete-provider-list", "partial");
      if (files.length + result.value.files.length > this.maximumObjects)
        return error("inventory-page-resource-bound-exceeded", "partial");
      files.push(...result.value.files);
      const next = result.value.nextPageToken;
      if (!next) return { status: "ok", value: files };
      if (next === token || seen.has(next)) return error("repeated-provider-page-token", "recovery-required");
      seen.add(next); token = next;
    }
    return error("provider-page-count-exceeded", "partial");
  }

  /** A missing marker on an otherwise reachable legacy file is uncertainty, not a permission to heal/stamp it. */
  private provenance(file: InventoryDriveFile, fence: InventoryIdentityFence,
    domain: InventoryDomain): boolean {
    return file.appProperties.brainManagedRootId === String(fence.managedRootId) &&
      file.appProperties.brainSyncDomain === domain;
  }

  private async collectMarked(fence: InventoryIdentityFence,
    graph: ReadonlyMap<string, RawManaged>): Promise<InventoryDriveFetch<void>> {
    const marked = await this.allPages(token => this.source.listMarked(String(fence.managedRootId), token));
    if (marked.status !== "ok") return marked;
    const seen = new Set<string>();
    for (const file of marked.value) {
      if (seen.has(file.id)) return error("duplicate-root-marked-object-id", "recovery-required");
      seen.add(file.id);
      const entry = graph.get(file.id);
      if (!entry || !live(file) || !this.provenance(file, fence, entry.domain) ||
          entry.parentId !== file.parents[0] || file.parents.length !== 1)
        return error("root-wide-managed-object-outside-known-domain", "recovery-required");
    }
    return { status: "ok", value: undefined };
  }

  private async outsideDomain(file: InventoryDriveFile, fence: InventoryIdentityFence,
    tracked: ReadonlySet<string>): Promise<InventoryDriveFetch<boolean>> {
    const visited = new Set<string>();
    let current = file;
    for (let depth = 0; depth < 128; depth++) {
      if (visited.has(current.id)) return error("unclassifiable-parent-cycle", "recovery-required");
      visited.add(current.id);
      if (tracked.has(current.id) ||
          current.id === String(fence.managedRootId) ||
          current.appProperties.brainManagedRootId === String(fence.managedRootId))
        return { status: "ok", value: false };
      if (current.parents.length === 0) return { status: "ok", value: true };
      if (current.parents.length !== 1) return error("unclassifiable-multiple-parents");
      const parent = await this.source.getFile(current.parents[0]);
      if (parent.status !== "ok") return error("unknown-ancestor-for-account-wide-change");
      current = parent.value;
    }
    return error("ancestry-depth-limit", "recovery-required");
  }

  private async changes(
    fence: InventoryIdentityFence, start: ChangeCursor,
    apply: (change: InventoryDriveChange) => Promise<InventoryDriveFetch<void>>,
  ): Promise<InventoryDriveFetch<{ readonly terminal: ChangeCursor; readonly count: number }>> {
    const seen = new Set<string>();
    let token = String(start), count = 0;
    for (let n = 0; n < this.maximumPages; n++) {
      if (seen.has(token)) return error("cyclic-changes-pagination", "recovery-required");
      seen.add(token);
      const page = await this.source.listChanges(token);
      if (page.status !== "ok") return page;
      for (const change of page.value.changes) {
        count++;
        if (count > this.maximumObjects) return error("changes-resource-bound-exceeded", "partial");
        const handled = await apply(change);
        if (handled.status !== "ok") return handled;
      }
      if (page.value.newStartPageToken) {
        if (page.value.nextPageToken) return error("changes-ambiguous-terminal", "recovery-required");
        return { status: "ok", value: {
          terminal: cursorId(page.value.newStartPageToken), count,
        } };
      }
      const next = page.value.nextPageToken;
      if (!next || next === token) return error("changes-terminal-or-progress-missing", "recovery-required");
      token = next;
    }
    return error("changes-page-count-exceeded", "partial");
  }

  private toEntity(file: InventoryDriveFile, domain: InventoryDomain,
    parent: string | null, logicalPath: string | undefined,
    generation: InventoryGeneration, fence: InventoryIdentityFence): InventoryRemoteEntity {
    return {
      generation, remoteObjectId: rid(file.id), parentRemoteObjectId: parent === null ? null : rid(parent),
      domain, name: file.name, kind: file.mimeType === FOLDER ? "folder" : "file",
      ...(logicalPath === undefined ? {} : { logicalPath: pathId(logicalPath) }),
      pathValidity: logicalPath === undefined && parent !== null ? "unknown" : "verified",
      access: "visible", trashed: file.trashed,
      managedRootId: fence.managedRootId, provenanceDomain: domain,
      ...(file.version ? { revision: contractId<"RemoteRevisionId">(file.version) } : {}),
      ...(file.mimeType !== FOLDER ? { content: {
        ...(file.size ? { sizeBytes: Number(file.size) } : {}),
        ...(file.sha256Checksum ? { hash: contractId<"ContentHash">(
          "sha256:" + file.sha256Checksum.toLowerCase()) } : {}),
        ...(file.version ? { revision: file.version } : {}),
      } } : {}),
    };
  }

  /** Full scoped baseline with scan-window Changes replay and fresh root-wide marked-object census. */
  async baseline(fence: InventoryIdentityFence,
    generation: InventoryGeneration): Promise<InventoryDriveFetch<InventoryProviderBaseline>> {
    const verified = await this.source.verifyFence(fence);
    if (verified.status !== "ok") return verified;
    const start = await this.source.getStartToken();
    if (start.status !== "ok") return start;
    const roots = [fence.contentDomainRootId, fence.configDomainRootId];
    const graph = new Map<string, RawManaged>();
    const scanned = new Map<string, Set<string>>();
    for (const domain of ["content", "portable-config"] as const) {
      const rootId = domainRoot(fence, domain);
      const root = await this.source.getFile(rootId);
      if (root.status !== "ok") return root;
      if (!live(root.value) || root.value.mimeType !== FOLDER)
        return error("missing-managed-domain-root", "incompatible");
      graph.set(rootId, { file: root.value, domain, parentId: null });
      const queue = [rootId];
      let index = 0;
      while (index < queue.length) {
        const parent = queue[index++];
        const listing = await this.allPages(token => this.source.listChildren(parent, token));
        if (listing.status !== "ok") return listing;
        const ids = new Set<string>();
        for (const child of listing.value) {
          if (!live(child) || child.parents.length !== 1 || child.parents[0] !== parent ||
              !suitableName(child.name) || !this.provenance(child, fence, domain))
            return error("invalid-or-unmarked-scoped-child", "recovery-required");
          if (graph.has(child.id) || ids.has(child.id)) return error("duplicate-scoped-object-id", "recovery-required");
          ids.add(child.id);
          graph.set(child.id, { file: child, domain, parentId: parent });
          if (child.mimeType === FOLDER) queue.push(child.id);
          if (graph.size > this.maximumObjects) return error("inventory-object-bound-exceeded", "partial");
        }
        scanned.set(parent, ids);
      }
    }
    const changedParents = new Set<string>();
    const replay = await this.changes(fence, cursorId(start.value), async change => {
      const id = change.fileId;
      if (id === String(fence.managedRootId) ||
          roots.some(root => String(root) === id))
        return error("managed-root-changed-during-baseline", "recovery-required");
      const existing = graph.get(id);
      if (change.removed || !change.file || change.file.trashed)
        return existing ? error("tracked-id-removed-or-inaccessible-during-baseline") :
          error("unclassifiable-removed-account-change");
      const file = change.file;
      if (!existing) {
        const parent = file.parents[0];
        const trackedParent = parent ? graph.get(parent) : undefined;
        if (!trackedParent) {
          const outside = await this.outsideDomain(file, fence, new Set(graph.keys()));
          return outside.status !== "ok" ? outside :
            outside.value ? { status: "ok", value: undefined } :
            error("unclassifiable-managed-domain-entry");
        }
        if (file.parents.length !== 1 || trackedParent.file.mimeType !== FOLDER ||
            !this.provenance(file, fence, trackedParent.domain) || !suitableName(file.name))
          return error("unproven-entering-object-provenance");
        graph.set(id, { file, parentId: parent, domain: trackedParent.domain });
        changedParents.add(parent);
        return { status: "ok", value: undefined };
      }
      if (file.parents.length !== 1 || file.parents[0] !== existing.parentId ||
          !this.provenance(file, fence, existing.domain))
        return error("tracked-object-parent-or-provenance-change-needs-rebaseline");
      if (existing.file.mimeType === FOLDER && existing.file.name !== file.name)
        return error("folder-rename-needs-descendant-rebaseline");
      if (!suitableName(file.name)) return error("invalid-managed-change-name");
      graph.set(id, { ...existing, file });
      if (existing.parentId) changedParents.add(existing.parentId);
      return { status: "ok", value: undefined };
    });
    if (replay.status !== "ok") return replay;
    // Re-observe every affected parent. Never silently drop a concurrent sibling.
    for (const parent of changedParents) {
      const current = await this.allPages(token => this.source.listChildren(parent, token));
      if (current.status !== "ok") return current;
      const expected = [...graph.values()].filter(e => e.parentId === parent)
        .map(e => e.file.id).sort();
      const observed = current.value.map(e => e.id).sort();
      if (JSON.stringify(expected) !== JSON.stringify(observed))
        return error("post-changes-parent-occupancy-disagreement");
      for (const child of current.value) {
        const earlier = graph.get(child.id);
        if (!earlier || !this.provenance(child, fence, earlier.domain) ||
            child.name !== earlier.file.name || child.version !== earlier.file.version)
          return error("post-changes-parent-metadata-disagreement");
      }
    }
    const marked = await this.collectMarked(fence, graph);
    if (marked.status !== "ok") return marked;
    const renewed = await this.source.verifyFence(fence);
    if (renewed.status !== "ok") return renewed;
    // Rebuild full ancestry paths after Changes. Duplicate names are retained by stable ID.
    const resolved = new Map<string, string>();
    const visiting = new Set<string>();
    const resolvePath = (id: string): string | undefined => {
      if (roots.some(root => String(root) === id)) return "";
      const cached = resolved.get(id);
      if (cached !== undefined) return cached;
      if (visiting.has(id)) return undefined;
      visiting.add(id);
      const entry = graph.get(id);
      const parent = entry?.parentId ? graph.get(entry.parentId) : undefined;
      const prefix = parent ? resolvePath(parent.file.id) : undefined;
      visiting.delete(id);
      if (!entry || !parent || parent.domain !== entry.domain ||
          parent.file.mimeType !== FOLDER || prefix === undefined) return undefined;
      const path = prefix ? prefix + "/" + entry.file.name : entry.file.name;
      resolved.set(id, path);
      return path;
    };
    const entities: InventoryRemoteEntity[] = [];
    const occupancy = new Map<string, number>();
    for (const [id, item] of graph) {
      const p = resolvePath(id);
      if (p === undefined || (!roots.some(r => String(r) === id) && !suitableName(item.file.name)))
        return error("unrooted-or-cyclic-remote-path", "recovery-required");
      entities.push(this.toEntity(item.file, item.domain, item.parentId,
        item.parentId === null ? undefined :
        item.domain === "portable-config" ? "__brain_sync_portable_config__/" + p : p,
        generation, fence));
      if (item.parentId) {
        const key = JSON.stringify([item.domain, item.parentId, norm(item.file.name)]);
        occupancy.set(key, (occupancy.get(key) ?? 0) + 1);
      }
    }
    const terminal = replay.value.terminal;
    const coverage: InventoryCoverage[] = [];
    for (const domain of ["content", "portable-config"] as const) {
      const root = domainRoot(fence, domain);
      coverage.push({
        generation, domain, scopeId: rid(root), scopeKind: "domain", state: "complete",
        visibility: "app-visible", allPagesRead: true, incompleteSearch: false,
        provenanceVerified: true, terminalCursor: terminal,
      });
      for (const [id, item] of graph) if (item.domain === domain && item.file.mimeType === FOLDER) {
        coverage.push({
          generation, domain, scopeId: rid(id), scopeKind: "parent", state: "complete",
          visibility: "app-visible", allPagesRead: true, incompleteSearch: false,
          provenanceVerified: true, terminalCursor: terminal,
        });
      }
    }
    return { status: "ok", value: {
      inputCursor: cursorId(start.value), terminalCursor: terminal, entities, coverage,
      normalizedSiblingCollisions: [...occupancy].filter(([, count]) => count > 1).map(([key]) => key),
      replayedEvents: replay.value.count, publishAuthorized: false,
    } };
  }

  /** Fail-closed account-wide Changes translation; no cursor or inventory write. */
  async incremental(fence: InventoryIdentityFence, generation: InventoryGeneration,
    inputCursor: ChangeCursor, tracked: readonly InventoryRemoteEntity[]):
    Promise<InventoryDriveFetch<InventoryProviderDelta>> {
    const verify = await this.source.verifyFence(fence);
    if (verify.status !== "ok") return verify;
    const entities = new Map<string, InventoryRemoteEntity>();
    for (const e of tracked) {
      if (entities.has(String(e.remoteObjectId)) ||
          e.managedRootId !== fence.managedRootId) return error("untrusted-incremental-predecessor");
      entities.set(String(e.remoteObjectId), e);
    }
    const affected = new Set<string>();
    const rows = new Map<string, InventoryOverlayRecord>();
    const processed = await this.changes(fence, inputCursor, async change => {
      const original = entities.get(change.fileId);
      if (change.removed || !change.file || change.file.trashed)
        return error(original ? "tracked-id-disappearance-needs-scoped-reobservation" :
          "unclassifiable-account-wide-loss-of-access");
      const file = change.file;
      if (file.id === String(fence.managedRootId) ||
          file.id === String(fence.contentDomainRootId) ||
          file.id === String(fence.configDomainRootId))
        return error("root-changed-during-incremental");
      const parent = file.parents.length === 1 ? entities.get(file.parents[0]) : undefined;
      if (!parent) {
        const outside = await this.outsideDomain(file, fence, new Set(entities.keys()));
        return outside.status !== "ok" ? outside :
          outside.value && !original ? { status: "ok", value: undefined } :
          error("tracked-id-left-domain-or-unclassifiable-new-entry");
      }
      if (parent.kind !== "folder" || !this.provenance(file, fence, parent.domain) ||
          !suitableName(file.name) || (original && original.domain !== parent.domain))
        return error("invalid-changed-object-provenance-or-parent");
      if (original && original.kind === "folder" &&
          (original.name !== file.name || original.parentRemoteObjectId !== rid(file.parents[0])))
        return error("folder-relocation-requires-full-descendant-recompute");
      const logical = parent.logicalPath ?
        String(parent.logicalPath) + "/" + file.name :
        (parent.remoteObjectId === fence.configDomainRootId ?
          "__brain_sync_portable_config__/" + file.name : file.name);
      const entity = this.toEntity(file, parent.domain, file.parents[0],
        logical, generation, fence);
      if (original?.parentRemoteObjectId) affected.add(String(original.parentRemoteObjectId));
      affected.add(file.parents[0]);
      rows.set(file.id, { kind: "upsert", generation, entity });
      entities.set(file.id, entity);
      return { status: "ok", value: undefined };
    });
    if (processed.status !== "ok") return processed;
    const checked = await this.source.verifyFence(fence);
    if (checked.status !== "ok") return checked;
    return { status: "ok", value: {
      inputCursor, terminalCursor: processed.value.terminal,
      overlays: [...rows.values()], invalidatedParentIds: [...affected].map(rid),
      publishAuthorized: false,
    } };
  }

  /** Fresh targeted observation only, not a mutation or recovery proof. */
  async targeted(fence: InventoryIdentityFence, generation: InventoryGeneration,
    request: InventoryTargetedReadRequest):
    Promise<InventoryDriveFetch<InventoryTargetedReadObservation>> {
    const valid = await this.source.verifyFence(fence);
    if (valid.status !== "ok") return valid;
    const root = domainRoot(fence, request.domain);
    const exact = await this.source.getFile(String(request.remoteObjectId));
    if (exact.status !== "ok") return exact;
    const f = exact.value;
    if (f.trashed || f.parents.length !== 1 ||
        f.parents[0] !== String(request.parentRemoteObjectId) ||
        f.name !== request.name || !this.provenance(f, fence, request.domain))
      return error("target-object-identity-not-current");
    if (request.expectedRevision !== undefined && f.version !== request.expectedRevision)
      return error("target-revision-mismatch", "stale");
    if (request.expectedSizeBytes !== undefined && Number(f.size) !== request.expectedSizeBytes)
      return error("target-size-mismatch", "stale");
    if (request.expectedSha256 !== undefined &&
        f.sha256Checksum?.toLowerCase() !== request.expectedSha256.toLowerCase())
      return error("target-hash-mismatch", "stale");
    const ancestors: string[] = [];
    const seen = new Set<string>([f.id]);
    let parent = f.parents[0];
    for (let depth = 0; depth < 128; depth++) {
      if (seen.has(parent)) return error("target-parent-cycle");
      seen.add(parent); ancestors.push(parent);
      if (parent === root) break;
      const meta = await this.source.getFile(parent);
      if (meta.status !== "ok" || meta.value.trashed ||
          meta.value.mimeType !== FOLDER || meta.value.parents.length !== 1 ||
          !this.provenance(meta.value, fence, request.domain))
        return error("target-parent-ancestry-unproven");
      parent = meta.value.parents[0];
    }
    if (ancestors.at(-1) !== root) return error("target-not-under-expected-domain");
    const siblings = await this.allPages(token =>
      this.source.listChildren(String(request.parentRemoteObjectId), token, request.name));
    if (siblings.status !== "ok") return siblings;
    const matches = siblings.value.filter(x => !x.trashed);
    if (matches.length !== 1 || matches[0].id !== f.id)
      return error("nonunique-or-missing-target-sibling", "unknown");
    // Same-parent occupancy never substitutes for the root-wide provenance requirement.
    const marked = await this.allPages(token => this.source.listMarked(String(fence.managedRootId), token));
    if (marked.status !== "ok") return marked;
    for (const candidate of marked.value) {
      if (candidate.trashed || !candidate.appProperties.brainSyncDomain)
        return error("marked-object-provenance-unproven");
      const d = candidate.appProperties.brainSyncDomain;
      if (d !== "content" && d !== "portable-config") return error("marked-object-domain-invalid");
      const expectedRoot = domainRoot(fence, d);
      const visited = new Set<string>();
      let item = candidate, reached = false;
      for (let depth = 0; depth < 128; depth++) {
        if (visited.has(item.id)) return error("marked-object-parent-cycle");
        visited.add(item.id);
        if (item.parents.length !== 1) return error("marked-object-parent-ambiguous");
        if (item.parents[0] === expectedRoot) { reached = true; break; }
        const prev = await this.source.getFile(item.parents[0]);
        if (prev.status !== "ok") return error("marked-object-ancestry-unavailable");
        item = prev.value;
      }
      if (!reached) return error("marked-object-outside-domain");
    }
    const confirmed = await this.source.verifyFence(fence);
    if (confirmed.status !== "ok") return confirmed;
    const entity = this.toEntity(f, request.domain, f.parents[0], undefined, generation, fence);
    return { status: "ok", value: {
      object: entity, siblingIds: matches.map(x => rid(x.id)),
      parentChain: ancestors.map(rid), appVisibleOnly: true,
      rootWideMarkedProvenanceRechecked: true, executorProofAuthorized: false,
    } };
  }
}
