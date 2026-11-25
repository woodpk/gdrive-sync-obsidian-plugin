/**
 * DEC-366 BU-02 test-only synthetic REST responses. No separate remote
 * database, synchronization decision, state authority, runner, or effect.
 */
import assert from "node:assert/strict";
import {
  type ObsidianGoogleDriveBoundaryOptions,
  type DriveSignal,
} from "../../src/product/local-vault-boundary-seam";
import { FakeDatabase, withRangeOnly } from "../../tests/fixtures/deterministic-indexeddb";
import { virtualChangeCursor, virtualDrivePath, virtualRemoteObjectId, type InMemoryRemoteObjectSnapshot } from "../src/virtual-world/in-memory-google-drive";
import type { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";
import type { VirtualInventoryDeviceOptions } from "../src/virtual-world/per-device-runtime";

const CONFIG = "__brain_sync_portable_config__";
const FOLDER = "application/vnd.google-apps.folder";
const ACCOUNT = "synthetic-bu02-account";
type FileMetadata = {
  id: string; name: string; mimeType: string; parents: string[]; trashed: boolean;
  version: string; ownedByMe: boolean; appProperties: Record<string, string>;
  size?: string; sha256Checksum?: string;
};
export type ProviderSample = {
  readonly purpose: "account" | "exact-id" | "domain-list" | "parent-list" | "marked-census" | "cursor" | "changes" | "content-range";
  readonly responseBytes: number; readonly urlBytes: number; readonly elapsedMs: number;
};
const statusFor = (signal: DriveSignal): number => {
  switch (signal.kind) {
    case "authentication-required": return 401;
    case "permission-denied": return 403;
    case "not-found": return 404;
    case "rate-limited": return 429;
    case "transient-failure": return 503;
    default: return 410;
  }
};
const quoted = (raw: string) => raw.replace(/\\(.)/g, "$1");
const json = (value: unknown, status = 200) => ({
  status, headers: { "content-type": "application/json" },
  arrayBuffer: new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer,
});
class SyntheticProvider {
  account = ACCOUNT;
  readonly samples: ProviderSample[] = [];
  constructor(private readonly world: VirtualSynchronizationWorld) {}
  private get rootId(): string { return String(this.world.managedRemote.rootId); }
  private get contentId(): string { return this.rootId + ":content-domain"; }
  private get configId(): string { return this.rootId + ":config-domain"; }

  private roots(): FileMetadata[] {
    const identity = this.world.drive.providerRoot(this.world.managedRemote.rootId);
    if (!identity) return [];
    const root = (id: string, name: string, parents: string[], appProperties: Record<string, string>): FileMetadata =>
      ({ id, name, parents, mimeType: FOLDER, trashed: false, version: "1", ownedByMe: true, appProperties });
    return [
      root(this.rootId, "BRAIN Sync", ["root"], {
        brainSyncRole: "brain-sync-root", brainVaultIdentity: String(identity.vaultIdentity),
        brainProtocolVersion: String(identity.protocolVersion),
      }),
      root(this.contentId, "vault", [this.rootId], { brainSyncRole: "brain-sync-content" }),
      root(this.configId, CONFIG, [this.rootId], { brainSyncRole: "brain-sync-portable-config" }),
    ];
  }

  private isStructuralConfig(snapshot: InMemoryRemoteObjectSnapshot): boolean {
    // Logical core creates this structural parent on demand. REST domain root
    // already exists and is not a synchronized object or a user-created file.
    return snapshot.providerStructuralConfig === true && !snapshot.trashed && snapshot.entityKind === "folder" && String(snapshot.path) === CONFIG;
  }

  private metadata(snapshot: InMemoryRemoteObjectSnapshot): FileMetadata {
    const parent = String(snapshot.parentPath);
    const parents = parent === "" ? [this.contentId] : parent === CONFIG ? [this.configId] :
      this.world.drive.inspectObjectsAtPath(snapshot.rootId, snapshot.parentPath, true)
        .filter(x => x.entityKind === "folder" && !x.trashed)
        .map(x => String(x.remoteObjectId));
    return {
      id: String(snapshot.remoteObjectId), name: String(snapshot.path).split("/").at(-1)!,
      mimeType: snapshot.entityKind === "folder" ? FOLDER : "application/octet-stream",
      parents, trashed: snapshot.trashed, version: snapshot.revision, ownedByMe: true,
      appProperties: { brainManagedRootId: String(snapshot.rootId), brainSyncDomain: snapshot.providerDomain },
      ...(snapshot.entityKind === "file" ? {
        size: String(snapshot.evidence?.sizeBytes ?? 0),
        sha256Checksum: String(snapshot.evidence?.hash ?? "").replace(/^sha256:/, ""),
      } : {}),
    };
  }

  private error(status: number) { return json({ error: { message: "synthetic provider observation refused" } }, status); }

  readonly request: ObsidianGoogleDriveBoundaryOptions["requestUrl"] = async request => {
    const url = new URL(request.url), start = performance.now();
    assert.equal(url.origin, "https://www.googleapis.com");
    assert.equal(request.method ?? "GET", "GET", "fixture must never perform an HTTP mutation");
    assert.ok(request.headers?.authorization === "Bearer bu02-synthetic-token", "synthetic authorization missing");
    const path = url.pathname, query = url.searchParams.get("q") ?? "";
    let purpose: ProviderSample["purpose"];
    let response: Awaited<ReturnType<ObsidianGoogleDriveBoundaryOptions["requestUrl"]>>;
    const rootId = this.world.managedRemote.rootId;
    if (path === "/drive/v3/about") {
      purpose = "account"; response = json({ user: { permissionId: this.account } });
    } else if (path === "/drive/v3/changes/startPageToken") {
      purpose = "cursor";
      const observed = await this.world.drive.getStartCursor(rootId);
      response = observed.ok ? json({ startPageToken: observed.value }) : this.error(statusFor(observed.signal));
    } else if (path === "/drive/v3/changes") {
      purpose = "changes";
      const observed = await this.world.drive.readChanges(rootId, virtualChangeCursor(url.searchParams.get("pageToken") ?? ""));
      if (!observed.ok || observed.value.completeness.status !== "complete") {
        response = this.error(observed.ok ? 410 : statusFor(observed.signal));
      } else {
        const latest = new Map<string, { fileId: string; removed: boolean; file?: FileMetadata }>();
        for (const change of observed.value.changes) {
          const id = change.kind === "removed" ? change.remoteObjectId : change.entry.remoteObjectId;
          const object = this.world.drive.inspectObject(id);
          if (object && this.isStructuralConfig(object)) continue;
          latest.set(String(id), object
            ? { fileId: String(id), removed: false, file: this.metadata(object) }
            : { fileId: String(id), removed: true });
        }
        response = json({ changes: [...latest.values()], newStartPageToken: observed.value.nextCursor });
      }
    } else if (path.startsWith("/drive/v3/files/")) {
      const id = decodeURIComponent(path.slice("/drive/v3/files/".length));
      if (url.searchParams.get("alt") === "media") {
        purpose = "content-range";
        const range = /^bytes=(\d+)-(\d+)$/.exec(request.headers?.range ?? "");
        assert.ok(range, "production content reads must use a bounded range");
        const observed = await this.world.drive.download(virtualRemoteObjectId(id));
        if (!observed.ok) response = this.error(statusFor(observed.signal));
        else {
          const parts: Uint8Array[] = [];
          for await (const bytes of observed.value.content.openChunks()) parts.push(bytes);
          const chunks = Buffer.concat(parts);
          const first = Number(range[1]), last = Math.min(Number(range[2]), chunks.length - 1);
          if (first > last) response = this.error(416);
          else response = { status: 206, headers: {
            "content-type": "application/octet-stream",
            "content-range": "bytes " + first + "-" + last + "/" + chunks.length,
          }, arrayBuffer: Uint8Array.from(chunks.slice(first, last + 1)).buffer as ArrayBuffer };
        }
      } else {
        purpose = "exact-id";
        const root = this.roots().find(file => file.id === id);
        if (root) response = json(root);
        else {
          const observed = this.world.drive.providerObject(rootId, virtualRemoteObjectId(id));
          response = observed.ok && !this.isStructuralConfig(observed.value)
            ? json(this.metadata(observed.value)) : this.error(observed.ok ? 404 : statusFor(observed.signal));
        }
      }
    } else if (path === "/drive/v3/files") {
      const parent = /^'((?:\\.|[^'\\])*)' in parents/.exec(query);
      const name = /(?:^| and )name='((?:\\.|[^'\\])*)'/.exec(query);
      const role = /appProperties has \{ key='brainSyncRole' and value='([^']+)' \}/.exec(query);
      const marker = /^appProperties has \{ key='brainManagedRootId' and value='([^']+)' \} and trashed=false$/.exec(query);
      assert.equal(url.searchParams.has("pageToken"), false, "fixture returns one complete page or an explicit failure");
      assert.ok(parent || marker, "unrecognized provider query");
      const parentId = parent ? quoted(parent[1]) : undefined;
      purpose = marker ? "marked-census" : parentId === this.rootId ? "domain-list" : "parent-list";
      if (parentId === this.rootId) {
        const files = this.roots().filter(file => file.parents.includes(this.rootId) &&
          (!role || file.appProperties.brainSyncRole === role[1]) && (!name || file.name === quoted(name[1])));
        response = json({ files, incompleteSearch: false });
      } else {
        const physicalParent = parentId === this.contentId ? "" : parentId === this.configId ? CONFIG :
          parentId === undefined ? undefined : this.world.drive.inspectObject(virtualRemoteObjectId(parentId))?.path;
        if ((!marker && physicalParent === undefined) || (marker && marker[1] !== this.rootId)) {
          response = this.error(404);
        } else {
          const observed = this.world.drive.providerListing(rootId, physicalParent === undefined ? undefined : virtualDrivePath(String(physicalParent)));
          response = observed.ok ? json({
            files: observed.value.filter(x => !this.isStructuralConfig(x)).map(x => this.metadata(x))
              .filter(file => (!parentId || file.parents.includes(parentId)) && (!name || file.name === quoted(name[1]))),
            incompleteSearch: false,
          }) : this.error(statusFor(observed.signal));
        }
      }
    } else throw new Error("unsupported synthetic REST path");
    this.samples.push({ purpose, responseBytes: response.arrayBuffer.byteLength,
      urlBytes: new TextEncoder().encode(request.url).byteLength, elapsedMs: performance.now() - start });
    return response;
  };
}

/** Only test setup: the existing world owns devices, controller, executor and mutations. */
export function lifecycleFixture(enabled: boolean) {
  withRangeOnly();
  const databases = new Map<string, FakeDatabase>();
  let provider: SyntheticProvider | undefined;
  const forDevice = (name: string, world: VirtualSynchronizationWorld): VirtualInventoryDeviceOptions => {
    provider ??= new SyntheticProvider(world);
    const db = new FakeDatabase(true);
    databases.set(name, db);
    const secrets = new Map<string, string>([
      ["brain-gdrive-paired-account", ACCOUNT],
      ["brain-gdrive-oauth-tokens", JSON.stringify({
        accessToken: "bu02-synthetic-token", expiresAtMs: Date.now() + 86400000,
        tokenType: "Bearer", scope: "https://www.googleapis.com/auth/drive.file",
        inventoryGrantEpoch: "b".repeat(32),
      })],
    ]);
    const records = () => {
      const table = db.tables.get("sync-state");
      assert.ok(table, "canonical store must be established");
      return table.records;
    };
    return {
      get enabled() { return enabled; }, indexedDb: db.openFactory(),
      readStateBytes: () => records().get(JSON.stringify("current-state")) as Uint8Array | undefined,
      replaceStateBytes: bytes => {
        const key = JSON.stringify("current-state");
        if (bytes) records().set(key, bytes.slice()); else records().delete(key);
      },
      boundary: {
        oauth: { clientId: "synthetic-bu02", redirectUri: "https://callback.invalid" },
        managedRemoteIdentity: () => world.managedRemote,
        secretStorage: { getSecret: key => secrets.get(key) ?? null,
          setSecret: (key, value) => { secrets.set(key, value); } },
        retryPolicy: { maxAttempts: 1, maxConcurrency: 1, baseDelayMs: 0, maxDelayMs: 0 },
        requestUrl: provider.request,
      },
    };
  };
  return { forDevice, databases, setEnabled: (value: boolean) => { enabled = value; },
    samples: () => provider!.samples,
    changeAccount: (account: string) => { provider!.account = account; },
    storageBytes: () => [...databases.values()].map(db => ({
      authority: [...(db.tables.get("sync-state")?.records.values() ?? [])].reduce<number>((n, item) => n + (item instanceof Uint8Array ? item.byteLength : 0), 0),
      inventory: [...db.tables.entries()].filter(([key]) => key !== "sync-state")
        .flatMap(([, table]) => [...table.records.values()]).reduce<number>((n, item) => n + new TextEncoder().encode(JSON.stringify(item)).byteLength, 0),
    })),
  };
}
