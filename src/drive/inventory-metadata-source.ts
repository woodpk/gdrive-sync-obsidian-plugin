/** DEC-339 D339-03: dormant read-only Drive v3 metadata provider; no mutation or global absence authority. */
import type { InventoryIdentityFence } from "../contracts/verified-metadata-inventory";
import type { DriveResult } from "../contracts/google-drive";
import type { GoogleDriveAdapter } from "./google-drive-port";
import type { GoogleHttpTransport } from "./transport";

const API = "https://www.googleapis.com/drive/v3";
const FIELDS = "id,name,mimeType,parents,trashed,size,sha256Checksum,version,appProperties";
const FOLDER = "application/vnd.google-apps.folder";
const valid = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.trim() === x;
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const escaped = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export interface InventoryDriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly parents: readonly string[];
  readonly trashed: boolean;
  readonly version?: string;
  readonly sha256Checksum?: string;
  readonly size?: string;
  readonly appProperties: Readonly<Record<string, string>>;
}
export interface InventoryDriveListPage {
  readonly files: readonly InventoryDriveFile[];
  readonly incompleteSearch: boolean;
  readonly nextPageToken?: string;
}
export interface InventoryDriveChange {
  readonly fileId: string;
  readonly removed: boolean;
  readonly file?: InventoryDriveFile;
}
export interface InventoryDriveChangesPage {
  readonly changes: readonly InventoryDriveChange[];
  readonly nextPageToken?: string;
  readonly newStartPageToken?: string;
}
export type InventoryDriveFetch<T> =
  | { readonly status: "ok"; readonly value: T }
  | { readonly status: "unknown" | "partial" | "incompatible" | "stale" | "recovery-required"; readonly reason: string };
const fail = (reason: string, status: "unknown" | "partial" | "incompatible" | "stale" | "recovery-required" = "unknown"):
  InventoryDriveFetch<never> => ({ status, reason });

export interface InventoryMetadataSource {
  verifyFence(fence: InventoryIdentityFence): Promise<InventoryDriveFetch<void>>;
  getStartToken(): Promise<InventoryDriveFetch<string>>;
  getFile(id: string): Promise<InventoryDriveFetch<InventoryDriveFile>>;
  listChildren(parentId: string, token?: string, name?: string): Promise<InventoryDriveFetch<InventoryDriveListPage>>;
  listMarked(rootId: string, token?: string): Promise<InventoryDriveFetch<InventoryDriveListPage>>;
  listChanges(token: string): Promise<InventoryDriveFetch<InventoryDriveChangesPage>>;
}
function parseFile(value: unknown): InventoryDriveFile | undefined {
  if (!object(value) || !valid(value.id) || typeof value.name !== "string" || value.name.length === 0 ||
      !valid(value.mimeType) || !Array.isArray(value.parents) || !value.parents.every(valid) ||
      typeof value.trashed !== "boolean") return undefined;
  if (value.version !== undefined && !valid(value.version)) return undefined;
  if (value.sha256Checksum !== undefined && !valid(value.sha256Checksum)) return undefined;
  if (value.size !== undefined && (!valid(value.size) || !/^\d+$/.test(value.size) ||
      !Number.isSafeInteger(Number(value.size)))) return undefined;
  if (value.appProperties !== undefined && (!object(value.appProperties) ||
      !Object.values(value.appProperties).every(x => typeof x === "string"))) return undefined;
  return { id: value.id, name: value.name, mimeType: value.mimeType,
    parents: value.parents as string[], trashed: value.trashed,
    ...(value.version !== undefined ? { version: value.version as string } : {}),
    ...(value.sha256Checksum !== undefined ? { sha256Checksum: value.sha256Checksum as string } : {}),
    ...(value.size !== undefined ? { size: value.size as string } : {}),
    appProperties: (value.appProperties ?? {}) as Record<string, string> };
}

/** The account-key callback must return an opaque, non-PII identity binding, never a token or email. */
export class GoogleDriveInventoryMetadataSource implements InventoryMetadataSource {
  constructor(
    private readonly drive: Pick<GoogleDriveAdapter, "validateManagedRoot">,
    private readonly http: Pick<GoogleHttpTransport, "request">,
    private readonly pairedAccountKey: () => Promise<string | undefined>,
  ) {}

  private async get(url: string): Promise<InventoryDriveFetch<unknown>> {
    let response: DriveResult<Response>;
    try { response = await this.http.request(url, {}, true); }
    catch { return fail("metadata-transport-exception"); }
    if (!response.ok) {
      const kind = response.signal.kind;
      return fail(kind === "not-found" ? "metadata-inaccessible-or-absent" : "metadata-" + kind,
        kind === "authentication-required" ? "incompatible" :
        kind === "recovery-required" ? "recovery-required" : "unknown");
    }
    try { return { status: "ok", value: await response.value.json() as unknown }; }
    catch { return fail("invalid-provider-json", "recovery-required"); }
  }

  async getFile(id: string): Promise<InventoryDriveFetch<InventoryDriveFile>> {
    if (!valid(id)) return fail("invalid-object-id", "recovery-required");
    const response = await this.get(API + "/files/" + encodeURIComponent(id) +
      "?" + new URLSearchParams({ fields: FIELDS }));
    if (response.status !== "ok") return response;
    const value = parseFile(response.value);
    return !value ? fail("incomplete-file-metadata", "partial") : value.id !== id ?
      fail("exact-id-provider-response-mismatch", "recovery-required") : { status: "ok", value };
  }

  private async list(q: string, token?: string): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    if (token !== undefined && !valid(token)) return fail("invalid-page-token", "recovery-required");
    const params = new URLSearchParams({
      q, spaces: "drive", pageSize: "1000",
      fields: "nextPageToken,incompleteSearch,files(" + FIELDS + ")",
      ...(token ? { pageToken: token } : {}),
    });
    const response = await this.get(API + "/files?" + params);
    if (response.status !== "ok") return response;
    const body = response.value;
    if (!object(body) || !Array.isArray(body.files) ||
        typeof body.incompleteSearch !== "boolean" ||
        (body.nextPageToken !== undefined && !valid(body.nextPageToken)))
      return fail("missing-provider-page-or-completeness-field", "partial");
    const files = body.files.map(parseFile);
    if (files.some(x => !x)) return fail("malformed-file-in-provider-page", "partial");
    if (body.incompleteSearch) return fail("drive-incompleteSearch", "partial");
    return { status: "ok", value: {
      files: files as InventoryDriveFile[], incompleteSearch: false,
      ...(body.nextPageToken ? { nextPageToken: body.nextPageToken as string } : {}),
    } };
  }

  listChildren(parentId: string, token?: string, name?: string): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    if (!valid(parentId) || (name !== undefined && !valid(name)))
      return Promise.resolve(fail("invalid-parent-or-name", "recovery-required"));
    return this.list("'" + escaped(parentId) + "' in parents and trashed=false" +
      (name !== undefined ? " and name='" + escaped(name) + "'" : ""), token);
  }
  listMarked(rootId: string, token?: string): Promise<InventoryDriveFetch<InventoryDriveListPage>> {
    if (!valid(rootId)) return Promise.resolve(fail("invalid-root", "recovery-required"));
    return this.list("appProperties has { key='brainManagedRootId' and value='" + escaped(rootId) +
      "' } and trashed=false", token);
  }

  async listChanges(token: string): Promise<InventoryDriveFetch<InventoryDriveChangesPage>> {
    if (!valid(token)) return fail("invalid-changes-token", "recovery-required");
    const params = new URLSearchParams({
      pageToken: token, spaces: "drive", pageSize: "1000", includeRemoved: "true",
      fields: "nextPageToken,newStartPageToken,changes(fileId,removed,file(" + FIELDS + "))",
    });
    const response = await this.get(API + "/changes?" + params);
    if (response.status !== "ok") return response;
    const body = response.value;
    if (!object(body) || !Array.isArray(body.changes) ||
        (body.nextPageToken !== undefined && !valid(body.nextPageToken)) ||
        (body.newStartPageToken !== undefined && !valid(body.newStartPageToken)) ||
        Boolean(body.nextPageToken) === Boolean(body.newStartPageToken))
      return fail("discontinuous-or-malformed-changes-page", "recovery-required");
    const changes: InventoryDriveChange[] = [];
    for (const change of body.changes) {
      if (!object(change) || !valid(change.fileId) ||
          (change.removed !== undefined && typeof change.removed !== "boolean"))
        return fail("malformed-change-identity", "partial");
      const f = change.file === undefined ? undefined : parseFile(change.file);
      if (change.file !== undefined && !f) return fail("malformed-change-file-metadata", "partial");
      if (f && f.id !== change.fileId) return fail("change-id-file-id-mismatch", "recovery-required");
      changes.push({ fileId: change.fileId, removed: change.removed === true, ...(f ? { file: f } : {}) });
    }
    return { status: "ok", value: {
      changes, ...(body.nextPageToken ? { nextPageToken: body.nextPageToken as string } : {}),
      ...(body.newStartPageToken ? { newStartPageToken: body.newStartPageToken as string } : {}),
    } };
  }

  async getStartToken(): Promise<InventoryDriveFetch<string>> {
    const result = await this.get(API + "/changes/startPageToken?supportsAllDrives=false");
    if (result.status !== "ok") return result;
    if (!object(result.value) || !valid(result.value.startPageToken))
      return fail("missing-start-page-token", "recovery-required");
    return { status: "ok", value: result.value.startPageToken };
  }

  async verifyFence(fence: InventoryIdentityFence): Promise<InventoryDriveFetch<void>> {
    let key: string | undefined;
    try { key = await this.pairedAccountKey(); }
    catch { return fail("account-binding-unavailable", "incompatible"); }
    if (!valid(key) || key !== fence.pairedAccountKey)
      return fail("account-binding-mismatch-or-unavailable", "incompatible");
    const result = await this.drive.validateManagedRoot({
      rootId: fence.managedRootId, vaultIdentity: fence.vaultIdentity, protocolVersion: fence.protocolVersion,
    });
    if (!result.ok || result.value.status !== "valid")
      return fail("paired-managed-root-not-valid", "incompatible");
    if (result.value.identity.rootId !== fence.managedRootId ||
        result.value.identity.vaultIdentity !== fence.vaultIdentity ||
        result.value.identity.protocolVersion !== fence.protocolVersion)
      return fail("managed-root-identity-not-exact", "incompatible");
    const ids = [String(fence.managedRootId), String(fence.contentDomainRootId),
      String(fence.configDomainRootId)];
    if (new Set(ids).size !== 3) return fail("duplicate-managed-root-ids", "incompatible");
    const responses = await Promise.all(ids.map(id => this.getFile(id)));
    if (responses.some(r => r.status !== "ok"))
      return fail("managed-roots-not-independently-observed", "incompatible");
    const roots = responses.map(r => (r as { status: "ok"; value: InventoryDriveFile }).value);
    const [root, content, config] = roots;
    if (root.trashed || root.mimeType !== FOLDER ||
        root.appProperties.brainSyncRole !== "brain-sync-root" ||
        root.appProperties.brainVaultIdentity !== String(fence.vaultIdentity) ||
        root.appProperties.brainProtocolVersion !== String(fence.protocolVersion) ||
        content.trashed || config.trashed || content.mimeType !== FOLDER || config.mimeType !== FOLDER ||
        content.parents.length !== 1 || config.parents.length !== 1 ||
        content.parents[0] !== root.id || config.parents[0] !== root.id ||
        content.appProperties.brainSyncRole !== "brain-sync-content" ||
        config.appProperties.brainSyncRole !== "brain-sync-portable-config")
      return fail("managed-domain-root-role-or-parent-mismatch", "incompatible");
    return { status: "ok", value: undefined };
  }
}
