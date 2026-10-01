import { createHash } from "node:crypto";
import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { contractId, type BinaryContentSource, type RemoteObjectId, type VaultIdentity, type VaultPath } from "../src/contracts/common";
import type { DriveResult } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";

const LARGE_FILE_BYTES = 16 * 1024 * 1024;
const SOURCE_CHUNK_BYTES = 64 * 1024;
const DRIVE_CHUNK_BYTES = 256 * 1024;

class MemorySecrets {
  readonly values = new Map<string, string>();
  getSecret(id: string) { return this.values.get(id) ?? null; }
  setSecret(id: string, value: string) { this.values.set(id, value); }
  deleteSecret(id: string) { this.values.delete(id); }
}

class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
    const memory = new MemorySecrets();
    super(new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback.invalid" }, new ObsidianSecretStore(memory)));
  }
  override request(url: string, init: PortableRequestInit = {}): Promise<DriveResult<Response>> {
    return this.handler(url, init);
  }
}

const okResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Promise.resolve({
    ok: true,
    value: new Response(body === undefined ? undefined : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", ...headers },
    }),
  } as DriveResult<Response>);

const root = () => ({
  id: "root",
  name: "BRAIN Sync",
  mimeType: "application/vnd.google-apps.folder",
  trashed: false,
  appProperties: { brainSyncRole: "brain-sync-root", brainVaultIdentity: "vault-1", brainProtocolVersion: "1" },
});

const contentRoot = () => ({
  id: "content",
  name: "vault",
  mimeType: "application/vnd.google-apps.folder",
  parents: ["root"],
  trashed: false,
  appProperties: { brainSyncRole: "brain-sync-content" },
});

const configRoot = () => ({
  id: "config",
  name: "__brain_sync_portable_config__",
  mimeType: "application/vnd.google-apps.folder",
  parents: ["root"],
  trashed: false,
  appProperties: { brainSyncRole: "brain-sync-portable-config" },
});

const provenance = () => ({ brainManagedRootId: "root", brainSyncDomain: "content" });
const normalize = (url: string) => decodeURIComponent(url).replace(/\+/g, " ");
const isContentRootQuery = (url: string) => normalize(url).includes("'root' in parents") && normalize(url).includes("brain-sync-content");
const isConfigRootQuery = (url: string) => normalize(url).includes("'root' in parents") && normalize(url).includes("__brain_sync_portable_config__");
const isOrdinaryCollisionQuery = (url: string) => normalize(url).includes("'content' in parents") && normalize(url).includes("__brain_sync_portable_config__");

function domainFixture(url: string) {
  if (url.includes("/files/root?")) return okResponse(root());
  if (isContentRootQuery(url)) return okResponse({ files: [contentRoot()] });
  if (isConfigRootQuery(url)) return okResponse({ files: [configRoot()] });
  if (isOrdinaryCollisionQuery(url)) return okResponse({ files: [] });
  return undefined;
}

function adapter(handler: (url: string, init?: PortableRequestInit) => Promise<DriveResult<Response>>) {
  const memory = new MemorySecrets();
  memory.setSecret("brain-gdrive-paired-account", "acct");
  const store = new ObsidianSecretStore(memory);
  return new GoogleDriveAdapter(
    new GoogleOAuthSession({ clientId: "client", redirectUri: "https://callback.invalid" }, store),
    new StubTransport(handler),
    store,
  );
}

const path = (value: string) => contractId<"VaultPath">(value) as VaultPath;
const id = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const vault = (value: string) => contractId<"VaultIdentity">(value) as VaultIdentity;

function elapsedMs(started: bigint): number {
  return Number(process.hrtime.bigint() - started) / 1_000_000;
}

function memorySample() {
  const value = process.memoryUsage();
  return { rss: value.rss, heapUsed: value.heapUsed, external: value.external, arrayBuffers: value.arrayBuffers };
}

function emitMeasurement(name: string, details: Readonly<Record<string, unknown>>): void {
  console.log(`S07F_MEASUREMENT ${JSON.stringify({
    name,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    ...details,
  })}`);
}

function bodyBytes(body: PortableRequestInit["body"]): Uint8Array {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  throw new Error(`Expected binary upload body, received ${Object.prototype.toString.call(body)}`);
}

function constantHash(sizeBytes: number, value: number): string {
  const hash = createHash("sha256");
  let remaining = sizeBytes;
  while (remaining > 0) {
    const length = Math.min(SOURCE_CHUNK_BYTES, remaining);
    const bytes = new Uint8Array(length);
    bytes.fill(value);
    hash.update(bytes);
    remaining -= length;
  }
  return hash.digest("hex");
}

test("16 MiB production resumable upload stays within 256 KiB request chunks and preserves every byte", async () => {
  const uploadRanges: string[] = [];
  const receivedHash = createHash("sha256");
  let receivedBytes = 0;
  let maxRequestBodyBytes = 0;
  let sourceChunks = 0;
  const expectedHash = constantHash(LARGE_FILE_BYTES, 0x2d);
  const before = memorySample();
  const started = process.hrtime.bigint();

  const drive = adapter(async (url, init) => {
    if (url.includes("/about")) return okResponse({ user: { permissionId: "acct" } });
    const fixture = domainFixture(url);
    if (fixture) return fixture;
    if (url.startsWith("https://www.googleapis.com/upload/")) {
      return okResponse({}, 200, { location: "https://upload.example/s07f-session" });
    }
    if (url === "https://upload.example/s07f-session") {
      const bytes = bodyBytes(init?.body);
      const range = new Headers(init?.headers).get("content-range");
      if (!range) throw new Error("missing content-range");
      uploadRanges.push(range);
      maxRequestBodyBytes = Math.max(maxRequestBodyBytes, bytes.byteLength);
      receivedHash.update(bytes);
      receivedBytes += bytes.byteLength;
      if (receivedBytes < LARGE_FILE_BYTES) {
        return Promise.resolve({
          ok: true,
          value: new Response(undefined, { status: 308, headers: { range: `bytes=0-${receivedBytes - 1}` } }),
        } as DriveResult<Response>);
      }
      return okResponse({
        id: "large-file-id",
        name: "s07f-large-upload.bin",
        mimeType: "application/octet-stream",
        parents: ["content"],
        size: String(LARGE_FILE_BYTES),
        sha256Checksum: expectedHash,
        version: "1",
        appProperties: provenance(),
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const source: BinaryContentSource = {
    sizeBytes: LARGE_FILE_BYTES,
    async *openChunks() {
      let remaining = LARGE_FILE_BYTES;
      while (remaining > 0) {
        const length = Math.min(SOURCE_CHUNK_BYTES, remaining);
        const bytes = new Uint8Array(length);
        bytes.fill(0x2d);
        sourceChunks += 1;
        yield bytes;
        remaining -= length;
      }
    },
  };

  const paired = await drive.pairManagedRoot(id("root"), vault("vault-1"));
  equal(paired.ok, true);

  const result = await drive.create(id("root"), {
    path: path("s07f-large-upload.bin"),
    entityKind: "file",
    content: source,
    expectedEvidence: { sizeBytes: LARGE_FILE_BYTES },
  });
  equal(result.ok, true);
  equal(receivedBytes, LARGE_FILE_BYTES);
  equal(receivedHash.digest("hex"), expectedHash);
  equal(sourceChunks, LARGE_FILE_BYTES / SOURCE_CHUNK_BYTES);
  equal(uploadRanges.length, LARGE_FILE_BYTES / DRIVE_CHUNK_BYTES);
  equal(maxRequestBodyBytes, DRIVE_CHUNK_BYTES);
  equal(uploadRanges[0], "bytes 0-262143/*");
  equal(uploadRanges.at(-1), "bytes 16515072-16777215/16777216");

  const duration = elapsedMs(started);
  ok(Number.isFinite(duration) && duration >= 0);
  emitMeasurement("large-file-production-upload", {
    fileBytes: LARGE_FILE_BYTES,
    sourceChunkBytes: SOURCE_CHUNK_BYTES,
    productionUploadChunkBytes: DRIVE_CHUNK_BYTES,
    sourceChunkCount: sourceChunks,
    uploadRequestCount: uploadRanges.length,
    elapsedMs: duration,
    memoryBefore: before,
    memoryAfter: memorySample(),
  });
});

test("16 MiB production download remains lazy and range-bounded across the complete content stream", async () => {
  const ranges: string[] = [];
  const downloadedHash = createHash("sha256");
  const expectedHash = constantHash(LARGE_FILE_BYTES, 0x4e);
  let downloadedBytes = 0;
  let maxChunkBytes = 0;
  const before = memorySample();
  const started = process.hrtime.bigint();

  const drive = adapter(async (url, init) => {
    if (url.includes("/files/large-download-id?") && !url.includes("alt=media")) {
      return okResponse({
        id: "large-download-id",
        name: "s07f-large-download.bin",
        mimeType: "application/octet-stream",
        parents: ["content"],
        size: String(LARGE_FILE_BYTES),
        sha256Checksum: expectedHash,
        version: "7",
        appProperties: provenance(),
      });
    }
    if (url.includes("alt=media")) {
      const range = new Headers(init?.headers).get("range");
      if (!range) throw new Error("missing range header");
      ranges.push(range);
      const [start, end] = range.replace("bytes=", "").split("-").map(Number);
      const bytes = new Uint8Array(end - start + 1);
      bytes.fill(0x4e);
      return Promise.resolve({ ok: true, value: new Response(bytes, { status: 206 }) } as DriveResult<Response>);
    }
    throw new Error(`Unexpected request: ${url}`);
  });

  const result = await drive.download(id("large-download-id"));
  equal(result.ok, true);
  if (!result.ok) return;

  for await (const bytes of result.value.content.openChunks()) {
    maxChunkBytes = Math.max(maxChunkBytes, bytes.byteLength);
    downloadedBytes += bytes.byteLength;
    downloadedHash.update(bytes);
  }

  equal(downloadedBytes, LARGE_FILE_BYTES);
  equal(downloadedHash.digest("hex"), expectedHash);
  equal(ranges.length, LARGE_FILE_BYTES / DRIVE_CHUNK_BYTES);
  equal(maxChunkBytes, DRIVE_CHUNK_BYTES);
  equal(ranges[0], "bytes=0-262143");
  equal(ranges.at(-1), "bytes=16515072-16777215");

  const duration = elapsedMs(started);
  ok(Number.isFinite(duration) && duration >= 0);
  emitMeasurement("large-file-production-download", {
    fileBytes: LARGE_FILE_BYTES,
    productionRangeChunkBytes: DRIVE_CHUNK_BYTES,
    rangeRequestCount: ranges.length,
    elapsedMs: duration,
    memoryBefore: before,
    memoryAfter: memorySample(),
  });
});
