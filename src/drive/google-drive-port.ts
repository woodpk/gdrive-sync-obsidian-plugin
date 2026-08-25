import { contractId, type BinaryContentSource, type ChangeCursor, type ContentEvidence, type ContentHash, type ProtocolVersion, type RemoteObjectId, type VaultIdentity, type VaultPath } from "../contracts/common";
import type { DriveAuthenticationState, DriveResult, DriveSignal, GoogleDrivePort, ManagedRemoteIdentity, ManagedRemoteValidation, RemoteChange, RemoteChangePage, RemoteCreateRequest, RemoteDownload, RemoteEntry, RemoteListing, RemoteMutationReceipt, RemoteProtocolInfo, RemoteUpdateRequest } from "../contracts/google-drive";
import type { RemoteObservation } from "../contracts/snapshot";
import { GoogleOAuthSession, ObsidianSecretStore } from "./auth";
import { GoogleHttpTransport, withRemoteId } from "./transport";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_ROLE = "brain-sync-root";
const CONTENT_ROLE = "brain-sync-content";
const PORTABLE_CONFIG_ROLE = "brain-sync-portable-config";
const PORTABLE_CONFIG_NAME = "__brain_sync_portable_config__";
const APP_ROLE = "brainSyncRole";
const APP_VAULT = "brainVaultIdentity";
const APP_PROTOCOL = "brainProtocolVersion";
const APP_MANAGED_ROOT = "brainManagedRootId";
const APP_DOMAIN = "brainSyncDomain";
const CONTENT_DOMAIN = "content";
const CONFIG_DOMAIN = "portable-config";
const ACCOUNT_SECRET = "brain-gdrive-paired-account";
const UPLOAD_CHUNK_BYTES = 256 * 1024;
const FIELDS = "id,name,mimeType,parents,trashed,size,sha256Checksum,md5Checksum,modifiedTime,version,appProperties";

type DomainKind = typeof CONTENT_DOMAIN | typeof CONFIG_DOMAIN;
interface DriveFile { id: string; name?: string; mimeType?: string; parents?: string[]; trashed?: boolean; size?: string; sha256Checksum?: string; md5Checksum?: string; modifiedTime?: string; version?: string; appProperties?: Record<string,string>; }
interface FileListResponse { files?: DriveFile[]; nextPageToken?: string; }
interface ChangesResponse { changes?: Array<{ fileId: string; removed?: boolean; file?: DriveFile }>; nextPageToken?: string; newStartPageToken?: string; }
interface AboutResponse { user?: { displayName?: string; emailAddress?: string; permissionId?: string } }
interface DomainRoots { content: DriveFile; config: DriveFile; }
interface DomainProvenance { readonly managedRootId: RemoteObjectId; readonly domain: DomainKind; }

const rid = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const vpath = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const cursor = (value: string) => contractId<"ChangeCursor">(value) as ChangeCursor;
const pversion = (value: string) => contractId<"ProtocolVersion">(value) as ProtocolVersion;
export const REMOTE_PROTOCOL_VERSION = pversion("1");
const hash = (value: string) => contractId<"ContentHash">(value) as ContentHash;
const escaped = (value: string) => value.replace(/\\/g,"\\\\").replace(/'/g,"\\'");
const segmentName = (path: VaultPath) => String(path).split("/").filter(Boolean).at(-1) ?? "";
const parentPath = (path: VaultPath) => vpath(String(path).split("/").filter(Boolean).slice(0,-1).join("/"));
const joinPath = (parent: string, name: string) => vpath(parent ? `${parent}/${name}` : name);
const isConfigPath = (path: VaultPath | string) => String(path).startsWith(`${PORTABLE_CONFIG_NAME}/`);
const configRelativePath = (path: VaultPath) => vpath(String(path).slice(PORTABLE_CONFIG_NAME.length + 1));
const configLogicalPath = (relative: VaultPath) => vpath(`${PORTABLE_CONFIG_NAME}/${String(relative)}`);
const domainForLogicalPath = (path: VaultPath | string): DomainKind => isConfigPath(path) ? CONFIG_DOMAIN : CONTENT_DOMAIN;

function evidence(file: DriveFile): ContentEvidence {
  return {
    ...(file.sha256Checksum ? { hash: hash(`sha256:${file.sha256Checksum.toLowerCase()}`) } : {}),
    ...(file.size !== undefined ? { sizeBytes: Number(file.size) } : {}),
    ...(file.version ? { revision: file.version } : {}),
    ...(file.modifiedTime ? { advisoryModifiedTimeMs: Date.parse(file.modifiedTime) } : {}),
  };
}
function entry(path: VaultPath, file: DriveFile): RemoteEntry { return { path, entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file", remoteObjectId: rid(file.id), content: file.mimeType === FOLDER_MIME ? undefined : evidence(file), trashed: Boolean(file.trashed) }; }
async function json<T>(response: Response): Promise<T> { return await response.json() as T; }
function partialReason(signal: { readonly kind: string; readonly detail?: string }, fallback: string): string { return signal.detail ?? signal.kind ?? fallback; }
function streamSignalMessage(signal: DriveSignal): string {
  if ("detail" in signal && signal.detail) return signal.detail;
  return signal.kind;
}

/** Preserves the original Drive semantic signal across lazy BinaryContentSource consumption. */
export class DriveContentStreamError extends Error {
  readonly driveSignal: DriveSignal;
  constructor(signal: DriveSignal) {
    super(`drive-download-${signal.kind}:${streamSignalMessage(signal)}`);
    this.name = "DriveContentStreamError";
    this.driveSignal = signal;
  }
}

export function isDriveContentStreamError(error: unknown): error is DriveContentStreamError {
  return error instanceof DriveContentStreamError || Boolean(error && typeof error === "object" && "driveSignal" in error);
}

export class GoogleDriveAdapter implements GoogleDrivePort {
  private readonly pathCache = new Map<string, VaultPath>();
  constructor(private readonly oauth: GoogleOAuthSession, private readonly transport: GoogleHttpTransport, private readonly secrets: ObsidianSecretStore) {}

  async authenticationState(): Promise<DriveAuthenticationState> {
    const token = await this.oauth.accessToken();
    if (!token) return { status: "authentication-required", reason: "authorization-required" };
    const about = await this.transport.request(`${DRIVE_API}/about?fields=user(displayName,emailAddress,permissionId)`, {}, false);
    if (!about.ok) {
      if (about.signal.kind === "authentication-required") return { status: "authentication-required", reason: about.signal.detail };
      if (about.signal.kind === "transient-failure" || about.signal.kind === "rate-limited") return { status: "unavailable", reason: "service-unavailable" };
      return { status: "authentication-required", reason: "detail" in about.signal ? (about.signal.detail ?? about.signal.kind) : about.signal.kind };
    }
    const data = await json<AboutResponse>(about.value);
    const key = data.user?.permissionId ?? data.user?.emailAddress;
    const paired = this.secrets.get(ACCOUNT_SECRET);
    if (paired && key && paired !== key) return { status: "authentication-required", reason: "google-account-changed-repair-required" };
    return { status: "authenticated", ...(data.user?.emailAddress || data.user?.displayName ? { accountHint: data.user.emailAddress ?? data.user.displayName } : {}) };
  }

  async createManagedRoot(vaultIdentity: VaultIdentity, protocolVersion: ProtocolVersion): Promise<DriveResult<ManagedRemoteIdentity>> {
    if (String(protocolVersion) !== String(REMOTE_PROTOCOL_VERSION)) return { ok: false, signal: { kind: "recovery-required", detail: "unsupported-remote-protocol-version" } };
    const auth = await this.currentAccountKey(); if (!auth.ok) return auth;
    const created = await this.metadataCreate({ name: "BRAIN Sync", mimeType: FOLDER_MIME, appProperties: { [APP_ROLE]: ROOT_ROLE, [APP_VAULT]: String(vaultIdentity), [APP_PROTOCOL]: String(protocolVersion) } });
    if (!created.ok) return created;
    const rootId = rid(created.value.id);
    const content = await this.metadataCreate({ name: "vault", mimeType: FOLDER_MIME, parents: [created.value.id], appProperties: { [APP_ROLE]: CONTENT_ROLE } });
    if (!content.ok) return content;
    const config = await this.metadataCreate({ name: PORTABLE_CONFIG_NAME, mimeType: FOLDER_MIME, parents: [created.value.id], appProperties: { [APP_ROLE]: PORTABLE_CONFIG_ROLE } });
    if (!config.ok) return config;
    this.pathCache.clear(); this.secrets.set(ACCOUNT_SECRET, auth.value);
    return { ok: true, value: { rootId, vaultIdentity, protocolVersion } };
  }

  async pairManagedRoot(rootId: RemoteObjectId, expectedVaultIdentity: VaultIdentity): Promise<DriveResult<ManagedRemoteValidation>> {
    const validation = await this.validateByExpected(rootId, expectedVaultIdentity);
    if (!validation.ok || validation.value.status !== "valid") return validation;
    const account = await this.currentAccountKey(); if (!account.ok) return account;
    this.secrets.set(ACCOUNT_SECRET, account.value); return validation;
  }

  async validateManagedRoot(identity: ManagedRemoteIdentity): Promise<DriveResult<ManagedRemoteValidation>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const result = await this.validateByExpected(identity.rootId, identity.vaultIdentity);
    if (!result.ok || result.value.status !== "valid") return result;
    if (String(result.value.identity.protocolVersion) !== String(identity.protocolVersion)) return { ok: true, value: { status: "incompatible-protocol", observedVersion: result.value.identity.protocolVersion } };
    return result;
  }

  async protocolInfo(rootId: RemoteObjectId): Promise<DriveResult<RemoteProtocolInfo>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const file = await this.getFile(rootId); if (!file.ok) return file;
    const observed = file.value.appProperties?.[APP_PROTOCOL];
    if (!observed) return { ok: false, signal: { kind: "recovery-required", detail: "remote-protocol-metadata-missing" } };
    return { ok: true, value: { currentVersion: pversion(observed), compatible: observed === "1" } };
  }

  async listForReconciliation(rootId: RemoteObjectId): Promise<DriveResult<RemoteListing>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    const entries: RemoteEntry[] = []; this.pathCache.clear();
    const ordinary = await this.listDomain(roots.value.content.id, "", entries, { managedRootId: rootId, domain: CONTENT_DOMAIN });
    if (!ordinary.ok) {
      if (ordinary.signal.kind === "transient-failure" || ordinary.signal.kind === "rate-limited") {
        return { ok: true, value: { entries, completeness: { status: "partial", reason: partialReason(ordinary.signal, "ordinary remote listing interrupted") } } };
      }
      return ordinary;
    }
    const config = await this.listDomain(roots.value.config.id, `${PORTABLE_CONFIG_NAME}/`, entries, { managedRootId: rootId, domain: CONFIG_DOMAIN });
    if (!config.ok) {
      if (config.signal.kind === "transient-failure" || config.signal.kind === "rate-limited") {
        return { ok: true, value: { entries, completeness: { status: "partial", reason: partialReason(config.signal, "portable configuration listing interrupted") } } };
      }
      return config;
    }

    // The per-object root/domain provenance is stored on Drive so restart/full
    // reconciliation does not depend on an in-memory path cache. Once current
    // in-domain objects have been stamped, verify every stamped object still
    // resides in the same managed domain.
    const provenance = await this.validateManagedObjectProvenance(rootId, roots.value);
    if (!provenance.ok) return provenance;

    return { ok: true, value: { entries, completeness: { status: "complete" } } };
  }

  async getStartCursor(rootId: RemoteObjectId): Promise<DriveResult<ChangeCursor>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    const response = await this.transport.request(`${DRIVE_API}/changes/startPageToken?supportsAllDrives=false`);
    if (!response.ok) return response;
    const body = await json<{startPageToken?: string}>(response.value);
    return body.startPageToken ? { ok: true, value: cursor(body.startPageToken) } : { ok: false, signal: { kind: "recovery-required", detail: "drive-start-cursor-missing" } };
  }

  async readChanges(rootId: RemoteObjectId, changeCursor: ChangeCursor): Promise<DriveResult<RemoteChangePage>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    const params = new URLSearchParams({ pageToken: String(changeCursor), spaces: "drive", pageSize: "1000", includeRemoved: "true", fields: `nextPageToken,newStartPageToken,changes(fileId,removed,file(${FIELDS}))` });
    const response = await this.transport.request(`${DRIVE_API}/changes?${params}`); if (!response.ok) return response;
    const page = await json<ChangesResponse>(response.value); const changes: RemoteChange[] = [];
    for (const change of page.changes ?? []) {
      if ([String(rootId), roots.value.content.id, roots.value.config.id].includes(change.fileId)) {
        if (change.removed || change.file?.trashed) return { ok: false, signal: { kind: "recovery-required", detail: "managed-remote-root-structure-changed" } };
        continue;
      }
      if (change.removed || !change.file) {
        const lastKnownPath = this.pathCache.get(change.fileId);
        changes.push({ kind: "removed", remoteObjectId: rid(change.fileId), ...(lastKnownPath ? { lastKnownPath } : {}) });
        continue;
      }
      const p = await this.logicalPathForFile(change.file, roots.value);
      if (!p.ok) return p;
      if (!p.value) {
        const establishedRoot = change.file.appProperties?.[APP_MANAGED_ROOT];
        if (establishedRoot === String(rootId) || this.pathCache.has(change.fileId)) {
          return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-left-remote-domain:${change.fileId}` } };
        }
        // Under drive.file an object reported in this change stream but outside
        // both managed domains cannot safely be classified as unrelated after a
        // restart. Conservatively surface structural ambiguity instead of
        // converting it into deletion or ignoring stable identity evidence.
        return { ok: false, signal: { kind: "recovery-required", detail: `drive-change-object-domain-unprovable:${change.fileId}` } };
      }
      const expectedDomain = domainForLogicalPath(p.value);
      const stamped = await this.ensureDomainProvenance(change.file, { managedRootId: rootId, domain: expectedDomain });
      if (!stamped.ok) return stamped;
      this.pathCache.set(change.fileId, p.value); changes.push({ kind: "upsert", entry: entry(p.value, stamped.value) });
    }
    const next = page.nextPageToken ?? page.newStartPageToken;
    return next ? { ok: true, value: { changes, nextCursor: cursor(next), completeness: { status: "complete" } } } : { ok: false, signal: { kind: "recovery-required", detail: "drive-change-page-cursor-missing" } };
  }

  async observe(rootId: RemoteObjectId, path: VaultPath): Promise<DriveResult<RemoteObservation>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const resolved = await this.resolveLogicalPath(rootId, path); if (!resolved.ok) return resolved;
    if (!resolved.value) return { ok: true, value: { status: "absent", side: "remote", path } };
    const file = resolved.value;
    const expectedDomain = domainForLogicalPath(path);
    const provenance = this.validateFileProvenance(file, { managedRootId: rootId, domain: expectedDomain }, true);
    if (!provenance.ok) return provenance;
    return { ok: true, value: { status: "present", side: "remote", path, entityKind: file.mimeType === FOLDER_MIME ? "folder" : "file", remoteObjectId: rid(file.id), content: file.mimeType === FOLDER_MIME ? undefined : evidence(file), stability: "stable" } };
  }

  async download(remoteObjectId: RemoteObjectId): Promise<DriveResult<RemoteDownload>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const meta = await this.getFile(remoteObjectId); if (!meta.ok) return meta;
    if (meta.value.mimeType === FOLDER_MIME) return { ok: false, signal: { kind: "conflict", detail: "cannot-download-folder" } };
    const ev = evidence(meta.value), size = ev.sizeBytes, self = this;
    const content: BinaryContentSource = { ...(size !== undefined ? { sizeBytes: size } : {}), async *openChunks() {
      if (size === 0) return; let offset = 0;
      while (size === undefined || offset < size) {
        const end = size === undefined ? offset + UPLOAD_CHUNK_BYTES - 1 : Math.min(size - 1, offset + UPLOAD_CHUNK_BYTES - 1);
        const result = await self.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?alt=media`, { headers: { range: `bytes=${offset}-${end}` } });
        if (!result.ok) throw new DriveContentStreamError(withRemoteId(result.signal, remoteObjectId));
        const bytes = new Uint8Array(await result.value.arrayBuffer()); if (!bytes.length) break; yield bytes; offset += bytes.length;
        if (size === undefined && bytes.length < UPLOAD_CHUNK_BYTES) break;
      }
    } };
    return { ok: true, value: { content, remoteObjectId, evidence: ev } };
  }

  async create(rootId: RemoteObjectId, request: RemoteCreateRequest): Promise<DriveResult<RemoteMutationReceipt>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const domain = await this.domainForPath(rootId, request.path); if (!domain.ok) return domain;
    const domainKind = domainForLogicalPath(request.path);
    const provenance: DomainProvenance = { managedRootId: rootId, domain: domainKind };
    const relative = isConfigPath(request.path) ? configRelativePath(request.path) : request.path;
    const parent = await this.ensureParentFrom(domain.value.id, parentPath(relative), provenance); if (!parent.ok) return parent;
    if (request.entityKind === "folder") {
      const created = await this.metadataCreate({ name: segmentName(relative), mimeType: FOLDER_MIME, parents: [parent.value], appProperties: this.provenanceProperties(undefined, provenance) }); if (!created.ok) return created;
      this.pathCache.set(created.value.id, request.path); return { ok: true, value: { remoteObjectId: rid(created.value.id), path: request.path } };
    }
    if (!request.content) return { ok: false, signal: { kind: "conflict", detail: "file-create-content-required" } };
    return this.resumableUpload("create", undefined, request.path, parent.value, request.content, request.expectedEvidence, provenance);
  }

  async update(request: RemoteUpdateRequest): Promise<DriveResult<RemoteMutationReceipt>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const existing = await this.getFile(request.remoteObjectId); if (!existing.ok) return existing;
    if (request.expectedRemoteRevision && existing.value.version !== request.expectedRemoteRevision) return { ok: false, signal: { kind: "conflict", detail: "remote-revision-precondition-failed" } };
    const domain = await this.domainForPathFromExisting(request.path, existing.value); if (!domain.ok) return domain;
    return this.resumableUpload("update", request.remoteObjectId, request.path, existing.value.parents?.[0], request.content, request.expectedEvidence);
  }

  async move(remoteObjectId: RemoteObjectId, _fromPath: VaultPath, toPath: VaultPath): Promise<DriveResult<RemoteMutationReceipt>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const file = await this.getFile(remoteObjectId); if (!file.ok) return file;
    const domain = await this.domainForPathFromExisting(toPath, file.value); if (!domain.ok) return domain;
    const relative = isConfigPath(toPath) ? configRelativePath(toPath) : toPath;
    const root = await this.findManagedRootAncestor(file.value); if (!root.ok) return root as DriveResult<RemoteMutationReceipt>;
    if (!root.value) return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-outside-remote-domain" } };
    const provenance: DomainProvenance = { managedRootId: rid(root.value), domain: domainForLogicalPath(toPath) };
    const parent = await this.ensureParentFrom(domain.value.id, parentPath(relative), provenance); if (!parent.ok) return parent;
    const oldParents = (file.value.parents ?? []).join(","); const params = new URLSearchParams({ fields: FIELDS, addParents: parent.value }); if (oldParents) params.set("removeParents", oldParents);
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?${params}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: segmentName(relative), appProperties: this.provenanceProperties(file.value.appProperties, provenance) }) });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, remoteObjectId) };
    const moved = await json<DriveFile>(response.value); this.pathCache.set(moved.id, toPath);
    return { ok: true, value: { remoteObjectId: rid(moved.id), path: toPath, evidence: moved.mimeType === FOLDER_MIME ? undefined : evidence(moved) } };
  }

  async trash(remoteObjectId: RemoteObjectId): Promise<DriveResult<void>> {
    const guard = await this.guardPairedAccount(); if (!guard.ok) return guard;
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(remoteObjectId))}?fields=id,trashed`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, remoteObjectId) }; return { ok: true, value: undefined };
  }

  private async validateByExpected(rootId: RemoteObjectId, expected: VaultIdentity): Promise<DriveResult<ManagedRemoteValidation>> {
    const file = await this.getFile(rootId);
    if (!file.ok) return file.signal.kind === "not-found" ? { ok: true, value: { status: "missing-root" } } : file;
    if (file.value.trashed || file.value.mimeType !== FOLDER_MIME || file.value.appProperties?.[APP_ROLE] !== ROOT_ROLE) return { ok: true, value: { status: "missing-root" } };
    const observedVault = file.value.appProperties?.[APP_VAULT], observedProtocol = file.value.appProperties?.[APP_PROTOCOL];
    if (!observedVault) return { ok: true, value: { status: "ambiguous", reason: "managed-root-vault-identity-missing" } };
    if (observedVault !== String(expected)) return { ok: true, value: { status: "identity-mismatch", observedVaultIdentity: contractId<"VaultIdentity">(observedVault) as VaultIdentity } };
    if (!observedProtocol) return { ok: true, value: { status: "ambiguous", reason: "managed-root-protocol-version-missing" } };
    const roots = await this.domainRoots(rootId);
    if (!roots.ok) {
      const signal = roots.signal;
      if (signal.kind === "recovery-required" || signal.kind === "conflict") {
        const reason = "detail" in signal ? signal.detail : "managed-remote-domain-ambiguous";
        return { ok: true, value: { status: "ambiguous", reason } };
      }
      return roots;
    }
    const version = pversion(observedProtocol);
    if (observedProtocol !== "1") return { ok: true, value: { status: "incompatible-protocol", observedVersion: version } };
    return { ok: true, value: { status: "valid", identity: { rootId, vaultIdentity: expected, protocolVersion: version } };
  }

  private async validateRootExists(rootId: RemoteObjectId): Promise<DriveResult<void>> {
    const file = await this.getFile(rootId); if (!file.ok) return file.signal.kind === "not-found" ? { ok: false, signal: { kind: "recovery-required", detail: "managed-remote-root-missing" } } : file;
    if (file.value.trashed || file.value.appProperties?.[APP_ROLE] !== ROOT_ROLE) return { ok: false, signal: { kind: "recovery-required", detail: "managed-remote-root-missing-or-invalid" } };
    return { ok: true, value: undefined };
  }

  private async guardPairedAccount(): Promise<DriveResult<void>> {
    const paired = this.secrets.get(ACCOUNT_SECRET); if (!paired) return { ok: false, signal: { kind: "authentication-required", detail: "explicit-remote-pairing-required" } };
    const current = await this.currentAccountKey(); if (!current.ok) return current;
    return current.value === paired ? { ok: true, value: undefined } : { ok: false, signal: { kind: "authentication-required", detail: "google-account-changed-repair-required" } };
  }

  private async currentAccountKey(): Promise<DriveResult<string>> {
    const response = await this.transport.request(`${DRIVE_API}/about?fields=user(emailAddress,permissionId)`, {}, false); if (!response.ok) return response;
    const data = await json<AboutResponse>(response.value), key = data.user?.permissionId ?? data.user?.emailAddress;
    return key ? { ok: true, value: key } : { ok: false, signal: { kind: "authentication-required", detail: "google-account-identity-unavailable" } };
  }

  private async getFile(id: RemoteObjectId): Promise<DriveResult<DriveFile>> {
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(String(id))}?fields=${encodeURIComponent(FIELDS)}`);
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, id) }; return { ok: true, value: await json<DriveFile>(response.value) };
  }

  private async metadataCreate(metadata: Record<string, unknown>): Promise<DriveResult<DriveFile>> {
    const response = await this.transport.request(`${DRIVE_API}/files?fields=${encodeURIComponent(FIELDS)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(metadata) });
    if (!response.ok) return response; return { ok: true, value: await json<DriveFile>(response.value) };
  }

  private async contentRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile>> {
    const params = new URLSearchParams({ q: `'${escaped(String(rootId))}' in parents and appProperties has { key='${APP_ROLE}' and value='${CONTENT_ROLE}' }`, fields: `files(${FIELDS})`, spaces: "drive" });
    const response = await this.transport.request(`${DRIVE_API}/files?${params}`); if (!response.ok) return response;
    const files = (await json<FileListResponse>(response.value)).files ?? [];
    if (files.length !== 1 || files[0].trashed || files[0].mimeType !== FOLDER_MIME) return { ok: false, signal: { kind: "recovery-required", detail: files.length > 1 ? "managed-content-root-ambiguous" : "managed-content-root-missing" } };
    return { ok: true, value: files[0] };
  }

  private async portableConfigRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile>> {
    const matches = await this.children(String(rootId), PORTABLE_CONFIG_NAME); if (!matches.ok) return matches;
    const live = matches.value.filter(file => !file.trashed);
    if (live.some(file => file.appProperties?.[APP_ROLE] !== PORTABLE_CONFIG_ROLE)) return { ok: false, signal: { kind: "conflict", detail: "portable-config-namespace-unmarked-or-ambiguous" } };
    const marked = live.filter(file => file.appProperties?.[APP_ROLE] === PORTABLE_CONFIG_ROLE && file.mimeType === FOLDER_MIME);
    if (marked.length !== 1 || marked.length !== live.length) return { ok: false, signal: { kind: "recovery-required", detail: marked.length > 1 ? "portable-config-root-ambiguous" : "portable-config-root-missing" } };
    return { ok: true, value: marked[0] };
  }

  private async domainRoots(rootId: RemoteObjectId): Promise<DriveResult<DomainRoots>> {
    const valid = await this.validateRootExists(rootId); if (!valid.ok) return valid;
    const content = await this.contentRoot(rootId); if (!content.ok) return content;
    const config = await this.portableConfigRoot(rootId); if (!config.ok) return config;
    // An ordinary-vault child named like the synthetic configuration namespace is
    // a path-local collision, not evidence that both managed domains are globally
    // incomplete. listDomain() surfaces that child as an isolated sentinel.
    return { ok: true, value: { content: content.value, config: config.value } };
  }

  private async domainForPath(rootId: RemoteObjectId, path: VaultPath): Promise<DriveResult<DriveFile>> {
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    return { ok: true, value: isConfigPath(path) ? roots.value.config : roots.value.content };
  }

  private async domainForPathFromExisting(path: VaultPath, file: DriveFile): Promise<DriveResult<DriveFile>> {
    const root = await this.findManagedRootAncestor(file); if (!root.ok) return root as DriveResult<DriveFile>;
    if (!root.value) return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-outside-remote-domain" } };
    const rootId = rid(root.value);
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    const currentDomain = await this.findDomainAncestor(file, roots.value); if (!currentDomain.ok) return currentDomain;
    const wanted = isConfigPath(path) ? roots.value.config : roots.value.content;
    if (currentDomain.value.id !== wanted.id) return { ok: false, signal: { kind: "conflict", detail: "cross-domain-config-vault-reclassification-refused" } };
    const expectedDomain = domainForLogicalPath(path);
    const provenance = await this.ensureDomainProvenance(file, { managedRootId: rootId, domain: expectedDomain });
    if (!provenance.ok) return provenance;
    return { ok: true, value: wanted };
  }

  private async listDomain(rootId: string, prefix: string, entries: RemoteEntry[], provenance: DomainProvenance): Promise<DriveResult<void>> {
    const queue: Array<{id: string; path: string}> = [{ id: rootId, path: "" }];
    while (queue.length) {
      const current = queue.shift()!; let pageToken: string | undefined;
      do {
        const params = new URLSearchParams({ q: `'${escaped(current.id)}' in parents`, fields: `nextPageToken,files(${FIELDS})`, spaces: "drive", pageSize: "1000" }); if (pageToken) params.set("pageToken", pageToken);
        const response = await this.transport.request(`${DRIVE_API}/files?${params}`); if (!response.ok) return response;
        const page = await json<FileListResponse>(response.value);
        for (const rawFile of page.files ?? []) {
          const stamped = await this.ensureDomainProvenance(rawFile, provenance); if (!stamped.ok) return stamped;
          const file = stamped.value;
          const relative = joinPath(current.path, file.name ?? "");

          if (provenance.domain === CONTENT_DOMAIN && current.id === rootId && file.name === PORTABLE_CONFIG_NAME) {
            // This is ordinary vault content colliding with the private logical
            // namespace. Surface exactly one sentinel and never recurse through
            // it as though it were real portable configuration.
            const collisionPath = vpath(PORTABLE_CONFIG_NAME);
            entries.push(entry(collisionPath, file)); this.pathCache.set(file.id, collisionPath);
            continue;
          }

          const logical = vpath(`${prefix}${String(relative)}`);
          entries.push(entry(logical, file)); this.pathCache.set(file.id, logical);
          if (file.mimeType === FOLDER_MIME) queue.push({ id: file.id, path: String(relative) });
        }
        pageToken = page.nextPageToken;
      } while (pageToken);
    }
    return { ok: true, value: undefined };
  }

  private async children(parentId: string, name?: string): Promise<DriveResult<DriveFile[]>> {
    let q = `'${escaped(parentId)}' in parents and trashed=false`; if (name !== undefined) q += ` and name='${escaped(name)}'`;
    const params = new URLSearchParams({ q, fields: `files(${FIELDS})`, spaces: "drive", pageSize: "1000" }); const response = await this.transport.request(`${DRIVE_API}/files?${params}`);
    if (!response.ok) return response; return { ok: true, value: (await json<FileListResponse>(response.value)).files ?? [] };
  }

  private async resolveLogicalPath(rootId: RemoteObjectId, path: VaultPath): Promise<DriveResult<DriveFile | undefined>> {
    const roots = await this.domainRoots(rootId); if (!roots.ok) return roots;
    if (String(path) === PORTABLE_CONFIG_NAME) return this.resolvePathFrom(roots.value.content, path);
    if (isConfigPath(path)) return this.resolvePathFrom(roots.value.config, configRelativePath(path));
    return this.resolvePathFrom(roots.value.content, path);
  }

  private async resolvePathFrom(root: DriveFile, path: VaultPath): Promise<DriveResult<DriveFile | undefined>> {
    let parent = root; const segments = String(path).split("/").filter(Boolean); if (!segments.length) return { ok: true, value: root };
    for (const [index, segment] of segments.entries()) {
      const matches = await this.children(parent.id, segment); if (!matches.ok) return matches;
      if (matches.value.length === 0) return { ok: true, value: undefined };
      if (matches.value.length > 1) return { ok: false, signal: { kind: "conflict", detail: `ambiguous-remote-path:${String(path)}` } };
      parent = matches.value[0]; if (index < segments.length - 1 && parent.mimeType !== FOLDER_MIME) return { ok: false, signal: { kind: "conflict", detail: `non-folder-parent:${segment}` } };
    }
    return { ok: true, value: parent };
  }

  private async ensureParentFrom(rootId: string, path: VaultPath, provenance: DomainProvenance): Promise<DriveResult<string>> {
    let parent = rootId;
    for (const segment of String(path).split("/").filter(Boolean)) {
      const matches = await this.children(parent, segment); if (!matches.ok) return matches;
      const folders = matches.value.filter(file => file.mimeType === FOLDER_MIME);
      if (matches.value.length > 1 || (matches.value.length === 1 && folders.length !== 1)) return { ok: false, signal: { kind: "conflict", detail: `ambiguous-parent-path:${String(path)}` } };
      if (folders.length === 1) {
        const stamped = await this.ensureDomainProvenance(folders[0], provenance); if (!stamped.ok) return stamped;
        parent = stamped.value.id;
      } else {
        const created = await this.metadataCreate({ name: segment, mimeType: FOLDER_MIME, parents: [parent], appProperties: this.provenanceProperties(undefined, provenance) }); if (!created.ok) return created; parent = created.value.id;
      }
    }
    return { ok: true, value: parent };
  }

  private async logicalPathForFile(file: DriveFile, roots: DomainRoots): Promise<DriveResult<VaultPath | undefined>> {
    const config = await this.pathForFile(file, roots.config.id); if (!config.ok) return config;
    if (config.value) return { ok: true, value: configLogicalPath(config.value) };
    return this.pathForFile(file, roots.content.id);
  }

  private async pathForFile(file: DriveFile, domainRootId: string): Promise<DriveResult<VaultPath | undefined>> {
    const names: string[] = [file.name ?? ""]; let current = file; const visited = new Set<string>();
    while (true) {
      const parentId = current.parents?.[0]; if (!parentId) return { ok: true, value: undefined };
      if (parentId === domainRootId) return { ok: true, value: vpath(names.reverse().join("/")) };
      if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } };
      visited.add(parentId); const parent = await this.getFile(rid(parentId)); if (!parent.ok) return parent.signal.kind === "not-found" ? { ok: true, value: undefined } : parent;
      if (parent.value.appProperties?.[APP_ROLE] === ROOT_ROLE) return { ok: true, value: undefined };
      names.push(parent.value.name ?? ""); current = parent.value;
    }
  }

  private async findManagedRootAncestor(file: DriveFile): Promise<DriveResult<string | undefined>> {
    let current = file; const visited = new Set<string>();
    while (current.parents?.[0]) {
      const parentId = current.parents[0]; if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } }; visited.add(parentId);
      const parent = await this.getFile(rid(parentId)); if (!parent.ok) return parent.signal.kind === "not-found" ? { ok: true, value: undefined } : parent;
      if (parent.value.appProperties?.[APP_ROLE] === ROOT_ROLE) return { ok: true, value: parent.value.id }; current = parent.value;
    }
    return { ok: true, value: undefined };
  }

  private async findDomainAncestor(file: DriveFile, roots: DomainRoots): Promise<DriveResult<DriveFile>> {
    let current = file; const visited = new Set<string>();
    while (current.parents?.[0]) {
      const parentId = current.parents[0];
      if (parentId === roots.content.id) return { ok: true, value: roots.content };
      if (parentId === roots.config.id) return { ok: true, value: roots.config };
      if (visited.has(parentId)) return { ok: false, signal: { kind: "recovery-required", detail: "remote-parent-cycle" } }; visited.add(parentId);
      const parent = await this.getFile(rid(parentId)); if (!parent.ok) return parent as DriveResult<DriveFile>; current = parent.value;
    }
    return { ok: false, signal: { kind: "recovery-required", detail: "managed-object-domain-unprovable" } };
  }

  private provenanceProperties(existing: Record<string,string> | undefined, provenance: DomainProvenance): Record<string,string> {
    return { ...(existing ?? {}), [APP_MANAGED_ROOT]: String(provenance.managedRootId), [APP_DOMAIN]: provenance.domain };
  }

  private validateFileProvenance(file: DriveFile, expected: DomainProvenance, allowLegacyMissing = false): DriveResult<void> {
    const establishedRoot = file.appProperties?.[APP_MANAGED_ROOT];
    const establishedDomain = file.appProperties?.[APP_DOMAIN];
    if (!establishedRoot && !establishedDomain && allowLegacyMissing) return { ok: true, value: undefined };
    if (establishedRoot && establishedRoot !== String(expected.managedRootId)) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-root-provenance-mismatch:${file.id}` } };
    if (establishedDomain && establishedDomain !== expected.domain) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-cross-domain-reclassification:${file.id}:${establishedDomain}->${expected.domain}` } };
    if ((establishedRoot && !establishedDomain) || (!establishedRoot && establishedDomain)) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-domain-provenance-incomplete:${file.id}` } };
    return { ok: true, value: undefined };
  }

  private async ensureDomainProvenance(file: DriveFile, provenance: DomainProvenance): Promise<DriveResult<DriveFile>> {
    const validation = this.validateFileProvenance(file, provenance, true); if (!validation.ok) return validation;
    if (file.appProperties?.[APP_MANAGED_ROOT] === String(provenance.managedRootId) && file.appProperties?.[APP_DOMAIN] === provenance.domain) return { ok: true, value: file };
    const response = await this.transport.request(`${DRIVE_API}/files/${encodeURIComponent(file.id)}?fields=${encodeURIComponent(FIELDS)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appProperties: this.provenanceProperties(file.appProperties, provenance) }),
    });
    if (!response.ok) return { ok: false, signal: withRemoteId(response.signal, rid(file.id)) };
    return { ok: true, value: await json<DriveFile>(response.value) };
  }

  private async managedObjectsForRoot(rootId: RemoteObjectId): Promise<DriveResult<DriveFile[]>> {
    const files: DriveFile[] = []; let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        q: `appProperties has { key='${APP_MANAGED_ROOT}' and value='${escaped(String(rootId))}' } and trashed=false`,
        fields: `nextPageToken,files(${FIELDS})`,
        spaces: "drive",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const response = await this.transport.request(`${DRIVE_API}/files?${params}`); if (!response.ok) return response;
      const page = await json<FileListResponse>(response.value); files.push(...(page.files ?? [])); pageToken = page.nextPageToken;
    } while (pageToken);
    return { ok: true, value: files };
  }

  private async validateManagedObjectProvenance(rootId: RemoteObjectId, roots: DomainRoots): Promise<DriveResult<void>> {
    const managed = await this.managedObjectsForRoot(rootId); if (!managed.ok) return managed;
    for (const file of managed.value) {
      const established = file.appProperties?.[APP_DOMAIN];
      if (established !== CONTENT_DOMAIN && established !== CONFIG_DOMAIN) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-domain-provenance-invalid:${file.id}` } };
      const actual = await this.findDomainAncestor(file, roots);
      if (!actual.ok) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-left-remote-domain:${file.id}` } };
      const expectedRoot = established === CONTENT_DOMAIN ? roots.content.id : roots.config.id;
      if (actual.value.id !== expectedRoot) return { ok: false, signal: { kind: "recovery-required", detail: `managed-object-cross-domain-reclassification:${file.id}:${established}` } };
    }
    return { ok: true, value: undefined };
  }

  private async resumableUpload(mode: "create" | "update", objectId: RemoteObjectId | undefined, path: VaultPath, parentId: string | undefined, content: BinaryContentSource, expected?: ContentEvidence, provenance?: DomainProvenance): Promise<DriveResult<RemoteMutationReceipt>> {
    const logicalName = isConfigPath(path) ? configRelativePath(path) : path;
    const metadata: Record<string, unknown> = { name: segmentName(logicalName) };
    if (mode === "create" && parentId) metadata.parents = [parentId];
    if (mode === "create" && provenance) metadata.appProperties = this.provenanceProperties(undefined, provenance);
    const endpoint = mode === "create" ? `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}` : `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(String(objectId))}?uploadType=resumable&fields=${encodeURIComponent(FIELDS)}`;
    const initHeaders: Record<string,string> = { "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "application/octet-stream" }; if (content.sizeBytes !== undefined) initHeaders["x-upload-content-length"] = String(content.sizeBytes);
    const init = await this.transport.request(endpoint, { method: mode === "create" ? "POST" : "PATCH", headers: initHeaders, body: JSON.stringify(metadata) }); if (!init.ok) return init;
    const location = init.value.headers.get("location"); if (!location) return { ok: false, signal: { kind: "transient-failure", detail: "resumable-session-location-missing" } };
    let offset = 0, finalResponse: Response | undefined;
    for await (const part of rechunk(content, UPLOAD_CHUNK_BYTES)) {
      const end = offset + part.bytes.length - 1, total = part.final ? String(offset + part.bytes.length) : "*";
      const sent = await this.transport.request(location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-range": `bytes ${offset}-${end}/${total}` }, body: part.bytes }, false);
      if (!sent.ok) {
        const status = await this.queryUploadOffset(location, content.sizeBytes); if (!status.ok) return sent;
        if (status.value.completed) { finalResponse = status.value.response; break; }
        if (status.value.offset === end + 1 && !part.final) { finalResponse = new Response(null, { status: 308 }); offset += part.bytes.length; continue; }
        if (status.value.offset !== offset) return { ok: false, signal: { kind: "recovery-required", detail: "ambiguous-resumable-upload-offset" } };
        const retry = await this.transport.request(location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-range": `bytes ${offset}-${end}/${total}` }, body: part.bytes }); if (!retry.ok) return retry; finalResponse = retry.value;
      } else finalResponse = sent.value;
      if (finalResponse.status === 308) { offset += part.bytes.length; continue; } offset += part.bytes.length; break;
    }
    if (content.sizeBytes === 0) { const sent = await this.transport.request(location, { method: "PUT", headers: { "content-length": "0", "content-range": "bytes */0" }, body: new Uint8Array() }); if (!sent.ok) return sent; finalResponse = sent.value; }
    if (!finalResponse || finalResponse.status === 308) return { ok: false, signal: { kind: "transient-failure", detail: "resumable-upload-incomplete" } };
    const uploaded = await json<DriveFile>(finalResponse), ev = evidence(uploaded);
    if (expected?.sizeBytes !== undefined && ev.sizeBytes !== expected.sizeBytes) return { ok: false, signal: { kind: "recovery-required", detail: "uploaded-size-integrity-mismatch" } };
    if (expected?.hash && String(expected.hash).startsWith("sha256:") && String(expected.hash) !== String(ev.hash ?? "")) return { ok: false, signal: { kind: "recovery-required", detail: "uploaded-hash-integrity-mismatch" } };
    this.pathCache.set(uploaded.id, path); return { ok: true, value: { remoteObjectId: rid(uploaded.id), path, evidence: ev } };
  }

  private async queryUploadOffset(location: string, total?: number): Promise<DriveResult<{offset:number;completed:boolean;response?:Response}>> {
    const response = await this.transport.request(location, { method: "PUT", headers: { "content-length": "0", "content-range": `bytes */${total ?? "*"}` } }, false); if (!response.ok) return response;
    if (response.value.status !== 308) return { ok: true, value: { offset: total ?? 0, completed: true, response: response.value } };
    const range = response.value.headers.get("range"), end = range ? Number(range.split("-").at(-1)) : -1;
    return { ok: true, value: { offset: Number.isFinite(end) ? end + 1 : 0, completed: false } };
  }
}

async function* rechunk(source: BinaryContentSource, size: number): AsyncIterable<{bytes:Uint8Array;final:boolean}> {
  let pending = new Uint8Array(0);
  for await (const input of source.openChunks()) {
    if (!input.length) continue; const combined = new Uint8Array(pending.length + input.length); combined.set(pending); combined.set(input, pending.length); pending = combined;
    while (pending.length > size) { yield { bytes: pending.slice(0, size), final: false }; pending = pending.slice(size); }
  }
  if (pending.length) yield { bytes: pending, final: true };
}
