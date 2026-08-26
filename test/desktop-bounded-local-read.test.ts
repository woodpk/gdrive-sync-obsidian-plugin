import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { App, DataAdapter } from "obsidian";
import { contractId, type VaultPath } from "../src/contracts/common";
import type { LocalVaultPort } from "../src/contracts/local-vault";
import { DesktopExternalReferenceGuard } from "../src/local/desktop-external-reference-guard";
import {
  createDesktopLocalVaultAdapter,
  DesktopBoundedContentSourceFactory,
  type DesktopBoundedReadOps
} from "../src/local/desktop-local-vault";
import { LocalPlatformCapabilityError, LocalStaleObservationError } from "../src/local/obsidian-local-vault";
import { CanonicalEvidenceLocalVault } from "../src/product/canonical-local-vault";
import { sha256Bytes } from "../src/util/sha256";

const vp = (value: string): VaultPath => value as VaultPath;

function memoryGuard(basePath: string, events: string[] = []): DesktopExternalReferenceGuard {
  return new DesktopExternalReferenceGuard(basePath, {
    async lstat(path: string) {
      events.push(`guard:lstat:${path}`);
      return { isSymbolicLink: () => false };
    },
    async realpath(path: string): Promise<string> {
      events.push(`guard:realpath:${path}`);
      return path;
    }
  });
}

function memoryReader(
  value: Uint8Array,
  options: { readonly reportedSize?: number; readonly maxReadBytes?: number; readonly prematureEofAt?: number; readonly readErrorAt?: number; readonly mutateFinalStat?: boolean; readonly events?: string[] } = {}
): { readonly ops: DesktopBoundedReadOps; readonly reads: Array<{ position: number; length: number }>; readonly closed: () => boolean } {
  const reads: Array<{ position: number; length: number }> = [];
  let closed = false;
  let statCalls = 0;
  const status = () => ({
    size: options.reportedSize ?? value.byteLength,
    mtimeMs: 10,
    ctimeMs: options.mutateFinalStat && statCalls > 1 ? 12 : 11,
    dev: 1,
    ino: 2,
    isFile: () => true
  });
  const ops: DesktopBoundedReadOps = {
    async open(path: string) {
      options.events?.push(`reader:open:${path}`);
      return {
        async stat() { statCalls += 1; return status(); },
        async read(buffer: Uint8Array, offset: number, length: number, position: number) {
          reads.push({ position, length });
          if (options.readErrorAt !== undefined && position >= options.readErrorAt) throw new Error("injected filesystem read failure");
          if (options.prematureEofAt !== undefined && position >= options.prematureEofAt) return { bytesRead: 0 };
          const available = Math.max(0, value.byteLength - position);
          const bytesRead = Math.min(length, options.maxReadBytes ?? length, available);
          if (bytesRead > 0) buffer.set(value.subarray(position, position + bytesRead), offset);
          return { bytesRead };
        },
        async close() { closed = true; }
      };
    }
  };
  return { ops, reads, closed: () => closed };
}

async function consume(source: { openChunks(): AsyncIterable<Uint8Array> }): Promise<{ bytes: number[]; chunkSizes: number[] }> {
  const bytes: number[] = [];
  const chunkSizes: number[] = [];
  for await (const chunk of source.openChunks()) {
    bytes.push(...chunk);
    chunkSizes.push(chunk.byteLength);
  }
  return { bytes, chunkSizes };
}

test("desktop bounded reader reconstructs exact bytes with fixed-position bounded reads and closes the handle", async () => {
  const value = new Uint8Array([1,2,3,4,5,6,7,8,9,10]);
  const events: string[] = [];
  const reader = memoryReader(value, { maxReadBytes: 2, events });
  const factory = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault", events), reader.ops);
  const source = factory.create({ path: vp("folder/data.bin"), sizeBytes: value.byteLength, maxChunkBytes: 4, async assertUnchanged() { events.push("token"); } });

  const result = await consume(source);

  assert.deepEqual(result.bytes, [...value]);
  assert.deepEqual(result.chunkSizes, [4, 4, 2]);
  assert.deepEqual(reader.reads.map(read => read.position), [0, 2, 4, 6, 8]);
  assert.ok(reader.reads.every(read => read.length <= 4));
  assert.equal(reader.closed(), true);
  assert.ok(events.some(event => event.startsWith("guard:lstat:")));
  assert.ok(events.findIndex(event => event.startsWith("guard:lstat:")) < events.findIndex(event => event.startsWith("reader:open:")));
});

test("desktop bounded reader closes its file handle when a consumer stops early", async () => {
  const reader = memoryReader(new Uint8Array([1,2,3,4,5,6]));
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path: vp("data.bin"), sizeBytes: 6, maxChunkBytes: 2, async assertUnchanged() {} });
  for await (const _chunk of source.openChunks()) break;
  assert.equal(reader.closed(), true);
  assert.equal(reader.reads.length, 1);
});

test("desktop bounded reader accepts a zero-byte file without issuing a data read", async () => {
  const reader = memoryReader(new Uint8Array());
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path: vp("empty.bin"), sizeBytes: 0, maxChunkBytes: 2, async assertUnchanged() {} });
  assert.deepEqual(await consume(source), { bytes: [], chunkSizes: [] });
  assert.deepEqual(reader.reads, []);
  assert.equal(reader.closed(), true);
});

test("desktop bounded reader rejects premature EOF and still closes the file handle", async () => {
  const reader = memoryReader(new Uint8Array([1,2,3]), { reportedSize: 5, prematureEofAt: 3 });
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path: vp("short.bin"), sizeBytes: 5, maxChunkBytes: 5, async assertUnchanged() {} });
  await assert.rejects(() => consume(source), (error: unknown) =>
    error instanceof LocalPlatformCapabilityError && error.capability === "bounded-local-read"
  );
  assert.equal(reader.closed(), true);
});

test("desktop bounded reader fails closed on a filesystem read error and closes the handle", async () => {
  const reader = memoryReader(new Uint8Array([1,2,3,4]), { readErrorAt: 2 });
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path: vp("unreadable.bin"), sizeBytes: 4, maxChunkBytes: 2, async assertUnchanged() {} });
  await assert.rejects(() => consume(source), /injected filesystem read failure/);
  assert.equal(reader.closed(), true);
});

test("desktop bounded reader rejects an observation-token change between chunks", async () => {
  const reader = memoryReader(new Uint8Array([1,2,3,4]));
  let checks = 0;
  const path = vp("changing.bin");
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({
      path,
      sizeBytes: 4,
      maxChunkBytes: 2,
      async assertUnchanged() { checks += 1; if (checks === 3) throw new LocalStaleObservationError(path); }
    });
  await assert.rejects(() => consume(source), LocalStaleObservationError);
  assert.equal(reader.reads.length, 1);
  assert.equal(reader.closed(), true);
});

test("desktop bounded reader rejects file-handle metadata mutation after reading", async () => {
  const reader = memoryReader(new Uint8Array([1,2,3,4]), { mutateFinalStat: true });
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path: vp("changing.bin"), sizeBytes: 4, maxChunkBytes: 2, async assertUnchanged() {} });
  await assert.rejects(() => consume(source), LocalStaleObservationError);
  assert.equal(reader.closed(), true);
});

test("bounded desktop read failure remains unknown canonical evidence rather than trusted content", async () => {
  const path = vp("unsafe.bin");
  const token = contractId<"ObservationToken">("unsafe:1");
  const reader = memoryReader(new Uint8Array([1,2]), { reportedSize: 4, prematureEofAt: 2 });
  const source = new DesktopBoundedContentSourceFactory(memoryGuard("D:\\vault"), reader.ops)
    .create({ path, sizeBytes: 4, maxChunkBytes: 2, async assertUnchanged() {} });
  const observation = {
    status: "present" as const,
    side: "local" as const,
    path,
    entityKind: "file" as const,
    content: { sizeBytes: 4 },
    stability: "stable" as const,
    observationToken: token
  };
  const inner = {
    async observe() { return observation; },
    async readFile() { return { content: source, evidence: observation.content, stability: "stable" as const, observationToken: token }; }
  } as unknown as LocalVaultPort;

  const result = await new CanonicalEvidenceLocalVault(inner).observe(path);

  assert.equal(result.status, "unknown");
  if (result.status === "unknown") assert.match(result.reason, /canonical SHA-256 evidence unavailable.*prematurely/i);
  assert.equal(reader.closed(), true);
});

test("desktop composition hashes canonical SHA-256 through filesystem chunks without resource URL or fetch", async () => {
  const root = await mkdtemp(join(tmpdir(), "brain-sync-desktop-read-"));
  const vaultPath = "nested/content.bin";
  const value = new Uint8Array([0,1,2,3,254,255,8,9,10]);
  let resourceUrlCalls = 0;
  let fetchCalls = 0;
  try {
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "nested", "content.bin"), value);
    const physical = (path: string): string => join(root, ...path.split("/").filter(Boolean));
    const adapter = {
      getBasePath: () => root,
      getResourcePath: () => { resourceUrlCalls += 1; return "memory://prohibited"; },
      exists: async (path: string) => { try { await access(physical(path)); return true; } catch { return false; } },
      stat: async (path: string) => {
        try {
          const result = await stat(physical(path));
          return { type: result.isDirectory() ? "folder" : "file", ctime: result.ctimeMs, mtime: result.mtimeMs, size: result.size };
        } catch { return null; }
      }
    } as unknown as DataAdapter;
    const app = {
      vault: {
        adapter,
        configDir: ".obsidian",
        on: () => ({}),
        offref: () => undefined
      },
      workspace: { onLayoutReady: () => undefined }
    } as unknown as App;
    const local = createDesktopLocalVaultAdapter(app, {
      stabilityDelayMs: 0,
      readChunkSizeBytes: 3,
      fetchImpl: (async () => { fetchCalls += 1; throw new Error("resource fetch must not be used"); }) as typeof fetch
    });
    const canonical = new CanonicalEvidenceLocalVault(local);

    const observation = await canonical.observe(vp(vaultPath));

    assert.equal(observation.status, "present");
    if (observation.status === "present") assert.equal(observation.content?.hash, sha256Bytes(value));
    assert.equal(resourceUrlCalls, 0);
    assert.equal(fetchCalls, 0);
    local.dispose();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
