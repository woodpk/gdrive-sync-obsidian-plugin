import { contractId, type ContentEvidence, type RemoteObjectId, type VaultPath } from "../contracts/common";
import type { DriveResult, DriveSignal, RemoteEntry, RemoteListing } from "../contracts/google-drive";
import type { SafeDiagnosticFields } from "../diagnostics/diagnostic-logger";
import type { GoogleHttpTransport } from "./transport";
import { GoogleDriveAdapter as CoreGoogleDriveAdapter } from "./google-drive-port-core";

export {
  DriveContentStreamError,
  REMOTE_PROTOCOL_VERSION,
  isDriveContentStreamError,
  remoteMutationOutcomeWithDriveSignalV1_3,
} from "./google-drive-port-core";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_ROLE = "brain-sync-root";
const PORTABLE_CONFIG_NAME = "__brain_sync_portable_config__";
const APP_ROLE = "brainSyncRole";
const APP_DOMAIN = "brainSyncDomain";
const CONTENT_DOMAIN = "content";
const CONFIG_DOMAIN = "portable-config";
const FIELDS = "id,name,mimeType,parents,trashed,size,sha256Checksum,md5Checksum,modifiedTime,version,appProperties";

type DomainKind = typeof CONTENT_DOMAIN | typeof CONFIG_DOMAIN;
interface DriveFile { id: string; name?: string; mimeType?: string; parents?: string[]; trashed?: boolean; size?: string; sha256Checksum?: string; md5Checksum?: string; modifiedTime?: string; version?: string; appProperties?: Record<string,string>; }
interface FileListResponse { files?: DriveFile[]; nextPageToken?: string; }
interface DomainRoots { content: DriveFile; config: DriveFile; }
interface DomainProvenance { readonly managedRootId: RemoteObjectId; readonly domain: DomainKind; }
interface DomainReadResult { readonly result: DriveResult<void>; readonly entries: RemoteEntry[]; readonly pathCache: Map<string,VaultPath>; }

interface PlanningInternals {
  readonly transport: GoogleHttpTransport;
  readonly pathCache: Map<string,VaultPath>;
  semantic(event: string, fields?: SafeDiagnosticFields): void;
  guardPairedAccount(): Promise<DriveResult<void>>;
  getFile(id: RemoteObjectId): Promise<DriveResult<DriveFile>>;
  contentRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile>>;
  portableConfigRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile>>;
  validateFileProvenance(file: DriveFile, expected: DomainProvenance, allowLegacyMissing?: boolean): DriveResult<void>;
  managedObjectsForRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile[]>>;
}

const rid = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const vpath = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const escaped = (value: string) => value.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const joinPath = (parent: string, name: string) => vpath(parent ? `${parent}/${name}` : name);
function evidence(file: DriveFile): ContentEvidence {
  return {
    ...(file.sha256Checksum ? { hash: contractId<"ContentHash">(`sha256:${file.sha256Checksum.toLowerCase()}`) } : {}),
    ...(file.size !== undefined ? { sizeBytes: Number(file.size) } : {}),
    ...(file.version ? { revision: file.version } : {}),
    ...(file.modifiedTime ? { advisoryModifiedTimeMs: Date.parse(file.modifiedTime) } : {}),
  };
}
function entry(path: VaultPath, file: DriveFile): RemoteEntry {
  return { path, entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file", remoteObjectId: rid(file.id), content: file.mimeType === FOLDER_MIME ? undefined : evidence(file), trashed: Boolean(file.trashed) };
}
async function json<T>(response: Response): Promise<T> { return await response.json() as T; }
function partialReason(signal: DriveSignal, fallback: string): string { return "detail" in signal && signal.detail ? signal.detail : signal.kind || fallback; }
function isPartialSignal(signal: DriveSignal): boolean { return signal.kind === "transient-failure" || signal.kind === "rate-limited"; }

/**
 * LAT-05 keeps mutation semantics in the established adapter and narrows optimization to
 * read-only reconciliation planning plus invalid-cursor fallback. The assembly-local
 * metadata map never survives this method call.
 */
export class GoogleDriveAdapter extends CoreGoogleDriveAdapter {
  override async listForReconciliation(rootId: RemoteObjectId): Promise<DriveResult<RemoteListing>> {
    const internals = this as unknown as PlanningInternals;
    internals.semantic("drive-reconciliation-enumeration-started", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), stage: "start" });
    const guard = await internals.guardPairedAccount();
    if (!guard.ok) {
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", driveSignal: guard.signal.kind });
      return guard;
    }

    const roots = await this.planningDomainRoots(rootId, internals);
    if (!roots.ok) {
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", driveSignal: roots.signal.kind });
      return roots;
    }

    internals.pathCache.clear();
    const [ordinary, config] = await Promise.all([
      this.listPlanningDomain(roots.value.content.id, "", { managedRootId: rootId, domain: CONTENT_DOMAIN }, internals),
      this.listPlanningDomain(roots.value.config.id, `${PORTABLE_CONFIG_NAME}/`, { managedRootId: rootId, domain: CONFIG_DOMAIN }, internals),
    ]);

    // Preserve the serial baseline's deterministic failure/partial priority while allowing both reads to overlap.
    if (!ordinary.result.ok) {
      this.commitPlanningPathCache(internals.pathCache, ordinary.pathCache);
      if (isPartialSignal(ordinary.result.signal)) {
        internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "partial", remoteCompleteness: "partial", count: ordinary.entries.length, driveSignal: ordinary.result.signal.kind });
        return { ok:true, value:{ entries:ordinary.entries, completeness:{ status:"partial", reason:partialReason(ordinary.result.signal,"ordinary remote listing interrupted") } } };
      }
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", count: ordinary.entries.length, driveSignal: ordinary.result.signal.kind });
      return ordinary.result;
    }
    if (!config.result.ok) {
      this.commitPlanningPathCache(internals.pathCache, ordinary.pathCache, config.pathCache);
      const partialEntries = [...ordinary.entries,...config.entries];
      if (isPartialSignal(config.result.signal)) {
        internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "partial", remoteCompleteness: "partial", count: partialEntries.length, driveSignal: config.result.signal.kind });
        return { ok:true, value:{ entries:partialEntries, completeness:{ status:"partial", reason:partialReason(config.result.signal,"portable configuration listing interrupted") } } };
      }
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", count: partialEntries.length, driveSignal: config.result.signal.kind });
      return config.result;
    }

    const entries = [...ordinary.entries,...config.entries];
    const ambiguity = this.validateMergedPlanningEntries(entries);
    if (!ambiguity.ok) {
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", count: entries.length, driveSignal: ambiguity.signal.kind });
      return ambiguity;
    }
    this.commitPlanningPathCache(internals.pathCache,ordinary.pathCache,config.pathCache);
    const provenance = await this.validateManagedObjectProvenanceForPlanning(rootId,roots.value,internals);
    if (!provenance.ok) {
      internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "failure", count: entries.length, driveSignal: provenance.signal.kind });
      return provenance;
    }
    internals.semantic("drive-reconciliation-enumeration-result", { operation: "reconciliation-enumeration", remoteObjectId: String(rootId), result: "complete", remoteCompleteness: "complete", count: entries.length });
    return { ok:true, value:{ entries, completeness:{ status:"complete" } } };
  }

  override async readChangePage(...args: Parameters<CoreGoogleDriveAdapter["readChangePage"]>): ReturnType<CoreGoogleDriveAdapter["readChangePage"]> {
    const result = await super.readChangePage(...args);
    if (!result.ok && result.signal.kind === "recovery-required" && /cursor|token/i.test(result.signal.detail)) {
      // ProductSnapshotAssembler already treats conflict as the conservative full-reconciliation fallback seam.
      return { ok:false, signal:{ kind:"conflict", detail:result.signal.detail } };
    }
    return result;
  }

  private async planningDomainRoots(rootId: RemoteObjectId, internals: PlanningInternals): Promise<DriveResult<DomainRoots>> {
    const root = await internals.getFile(rootId);
    if (!root.ok) return root;
    if (root.value.trashed || root.value.appProperties?.[APP_ROLE] !== ROOT_ROLE) {
      return { ok:false, signal:{ kind:"recovery-required", detail:"managed-remote-root-missing-or-invalid" } };
    }
    const [content,config] = await Promise.all([internals.contentRoot(rootId),internals.portableConfigRoot(rootId)]);
    if (!content.ok) return content;
    if (!config.ok) return config;
    return { ok:true, value:{ content:content.value, config:config.value } };
  }

  private async listPlanningDomain(rootId: string, prefix: string, provenance: DomainProvenance, internals: PlanningInternals): Promise<DomainReadResult> {
    const entries: RemoteEntry[] = [];
    const pathCache = new Map<string,VaultPath>();
    const queue: Array<{id:string;path:string}> = [{ id:rootId, path:"" }];
    while (queue.length) {
      const current = queue.shift()!;
      let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({ q:`'${escaped(current.id)}' in parents and trashed=false`, fields:`nextPageToken,files(${FIELDS})`, spaces:"drive", pageSize:"1000" });
        if (pageToken) params.set("pageToken",pageToken);
        const response = await internals.transport.request(`${DRIVE_API}/files?${params}`);
        if (!response.ok) return { result:response, entries, pathCache };
        const page = await json<FileListResponse>(response.value);
        for (const file of page.files ?? []) {
          const validation = internals.validateFileProvenance(file,provenance,true);
          if (!validation.ok) return { result:validation, entries, pathCache };
          const relative = joinPath(current.path,file.name ?? "");
          if (provenance.domain === CONTENT_DOMAIN && current.id === rootId && file.name === PORTABLE_CONFIG_NAME) {
            const collision = vpath(PORTABLE_CONFIG_NAME);
            entries.push(entry(collision,file)); pathCache.set(file.id,collision); continue;
          }
          const logical = vpath(`${prefix}${String(relative)}`);
          entries.push(entry(logical,file)); pathCache.set(file.id,logical);
          if (file.mimeType === FOLDER_MIME) queue.push({ id:file.id, path:String(relative) });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return { result:{ ok:true, value:undefined }, entries, pathCache };
  }

  private validateMergedPlanningEntries(entries: readonly RemoteEntry[]): DriveResult<void> {
    const identities = new Map<string,string>();
    const paths = new Map<string,string>();
    for (const value of entries) {
      const objectId = String(value.remoteObjectId), path = String(value.path);
      if (identities.has(objectId)) return { ok:false, signal:{ kind:"recovery-required", detail:`remote-listing-duplicate-identity:${objectId}` } };
      const prior = paths.get(path);
      if (prior !== undefined && prior !== objectId) return { ok:false, signal:{ kind:"conflict", detail:`remote-listing-duplicate-path:${path}` } };
      identities.set(objectId,path); paths.set(path,objectId);
    }
    return { ok:true, value:undefined };
  }

  private commitPlanningPathCache(target: Map<string,VaultPath>, ordinary: Map<string,VaultPath>, config?: Map<string,VaultPath>): void {
    target.clear();
    for (const [id,path] of ordinary) target.set(id,path);
    if (config) for (const [id,path] of config) target.set(id,path);
  }

  private async validateManagedObjectProvenanceForPlanning(rootId: RemoteObjectId, roots: DomainRoots, internals: PlanningInternals): Promise<DriveResult<void>> {
    const managed = await internals.managedObjectsForRoot(rootId);
    if (!managed.ok) return managed;
    const exactParentMetadata = new Map<string,DriveFile>();
    for (const file of managed.value) {
      const established = file.appProperties?.[APP_DOMAIN];
      if (established !== CONTENT_DOMAIN && established !== CONFIG_DOMAIN) return { ok:false, signal:{ kind:"recovery-required", detail:`managed-object-domain-provenance-invalid:${file.id}` } };
      const actual = await this.findDomainAncestorForPlanning(file,roots,internals,exactParentMetadata);
      if (!actual.ok) return { ok:false, signal:{ kind:"recovery-required", detail:`managed-object-left-remote-domain:${file.id}` } };
      const expectedRoot = established === CONTENT_DOMAIN ? roots.content.id : roots.config.id;
      if (actual.value.id !== expectedRoot) return { ok:false, signal:{ kind:"recovery-required", detail:`managed-object-cross-domain-reclassification:${file.id}:${established}` } };
    }
    return { ok:true, value:undefined };
  }

  private async findDomainAncestorForPlanning(file: DriveFile, roots: DomainRoots, internals: PlanningInternals, exactParentMetadata: Map<string,DriveFile>): Promise<DriveResult<DriveFile>> {
    let current = file;
    const visited = new Set<string>();
    while (current.parents?.length === 1) {
      const parentId = current.parents[0];
      if (parentId === roots.content.id) return { ok:true, value:roots.content };
      if (parentId === roots.config.id) return { ok:true, value:roots.config };
      if (visited.has(parentId)) return { ok:false, signal:{ kind:"recovery-required", detail:"remote-parent-cycle" } };
      visited.add(parentId);
      let parent = exactParentMetadata.get(parentId);
      if (!parent) {
        const observed = await internals.getFile(rid(parentId));
        if (!observed.ok) return observed;
        parent = observed.value; exactParentMetadata.set(parentId,parent);
      }
      current = parent;
    }
    return { ok:false, signal:{ kind:"recovery-required", detail:"managed-object-domain-unprovable" } };
  }
}
