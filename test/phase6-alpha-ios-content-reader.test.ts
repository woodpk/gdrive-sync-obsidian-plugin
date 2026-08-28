import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter } from "obsidian";
import { contractId, type ManagedRemoteIdentity, type VaultPath } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { MobileVaultAccessBoundary } from "../src/local/mobile-vault-access-boundary";
import {
  LocalPlatformCapabilityError,
  LocalStaleObservationError,
  ObsidianLocalVaultAdapter,
} from "../src/local/obsidian-local-vault";
import { CanonicalEvidenceLocalVault } from "../src/product/canonical-local-vault";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope, ScopedLocalVault } from "../src/product/path-scope";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";
import { sha256Bytes } from "../src/util/sha256";

interface Entry {
  readonly type: "file" | "folder";
  bytes?: Uint8Array;
  mtime: number;
}

interface ResponseOptions {
  readonly responseBytes?: (path: string, observed: Uint8Array) => Uint8Array;
  readonly contentLength?: "actual" | number | null;
  readonly upstreamChunkBytes?: number;
}

const vp = (value: string): VaultPath => value as VaultPath;
const id = <T extends string>(value: string) => contractId<T>(value);
const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

function mobileFixture(
  initial: Record<string, { readonly type: "file" | "folder"; readonly bytes?: Uint8Array; readonly mtime?: number }>,
  readChunkSizeBytes: number,
  responseOptions: ResponseOptions = {},
) {
  const entries = new Map<string, Entry>([["", { type: "folder", mtime: 1 }]]);
  const ensureParents = (entryPath: string): void => {
    const parts = entryPath.split("/");
    parts.pop();
    let parent = "";
    for (const part of parts) {
      parent = parent ? `${parent}/${part}` : part;
      if (!entries.has(parent)) entries.set(parent, { type: "folder", mtime: 1 });
    }
  };
  for (const [entryPath, entry] of Object.entries(initial)) {
    ensureParents(entryPath);
    entries.set(entryPath, { type: entry.type, bytes: entry.bytes?.slice(), mtime: entry.mtime ?? 2 });
  }

  const adapterCalls: string[] = [];
  const fetchCalls: Array<{ readonly path: string; readonly range: string | null }> = [];
  const list = async (folder: string) => {
    const prefix = folder ? `${folder}/` : "";
    const files: string[] = [];
    const folders: string[] = [];
    for (const [entryPath, entry] of entries) {
      if (!entryPath || entryPath === folder || !entryPath.startsWith(prefix)) continue;
      if (entryPath.slice(prefix.length).includes("/")) continue;
      (entry.type === "file" ? files : folders).push(entryPath);
    }
    return { files: files.sort(), folders: folders.sort() };
  };
  const adapter = {
    getName: () => "fake-capacitor",
    exists: async (entryPath: string) => { adapterCalls.push(`exists:${entryPath}`); return entries.has(entryPath); },
    stat: async (entryPath: string) => {
      adapterCalls.push(`stat:${entryPath}`);
      const entry = entries.get(entryPath);
      return entry ? { type: entry.type, ctime: 1, mtime: entry.mtime, size: entry.bytes?.byteLength ?? 0 } : null;
    },
    list,
    getResourcePath: (entryPath: string) => {
      adapterCalls.push(`getResourcePath:${entryPath}`);
      return `memory://${encodeURIComponent(entryPath)}`;
    },
    readBinary: async (entryPath: string) => {
      adapterCalls.push(`readBinary:${entryPath}`);
      return (entries.get(entryPath)?.bytes ?? new Uint8Array()).slice().buffer;
    },
  } as unknown as DataAdapter;
  const vault = {
    adapter,
    configDir: ".obsidian",
    on: () => ({ id: "event" }),
    offref: () => undefined,
    getAbstractFileByPath: () => null,
  };
  const app = {
    vault,
    fileManager: {},
    workspace: { onLayoutReady: () => undefined },
  } as unknown as App;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = decodeURIComponent(raw.slice("memory://".length));
    const observed = entries.get(path)?.bytes;
    if (!observed) return new Response(null, { status: 404 });
    fetchCalls.push({ path, range: new Headers(init?.headers).get("Range") });
    const payload = (responseOptions.responseBytes?.(path, observed) ?? observed).slice();
    const upstreamChunkBytes = responseOptions.upstreamChunkBytes ?? Math.max(1, payload.byteLength);
    let offset = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= payload.byteLength) { controller.close(); return; }
        const chunk = payload.slice(offset, Math.min(offset + upstreamChunkBytes, payload.byteLength));
        offset += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const headers = new Headers();
    if (responseOptions.contentLength === "actual") headers.set("Content-Length", String(payload.byteLength));
    else if (typeof responseOptions.contentLength === "number") headers.set("Content-Length", String(responseOptions.contentLength));
    return new Response(body, { status: 200, headers });
  }) as typeof fetch;
  const local = new ObsidianLocalVaultAdapter(app, {
    accessBoundary: new MobileVaultAccessBoundary(),
    adapterMutationFallback: true,
    stabilityDelayMs: 0,
    readChunkSizeBytes,
    fetchImpl,
  });
  return { local, entries, adapterCalls, fetchCalls };
}

async function collect(source: { openChunks(): AsyncIterable<Uint8Array> }): Promise<{ bytes: number[]; chunkSizes: number[] }> {
  const result: number[] = [];
  const chunkSizes: number[] = [];
  for await (const chunk of source.openChunks()) {
    result.push(...chunk);
    chunkSizes.push(chunk.byteLength);
  }
  return { bytes: result, chunkSizes };
}

test("iOS HTTP 200 resource stream yields a non-empty file incrementally in bounded chunks", async () => {
  const fixture = mobileFixture({ "test-file-1.md": { type: "file", bytes: bytes(1, 2, 3, 4, 5, 6, 7, 8, 9) } }, 4, {
    contentLength: "actual",
    upstreamChunkBytes: 9,
  });
  const read = await fixture.local.readFile(vp("test-file-1.md"));
  const result = await collect(read.content);
  assert.deepEqual(result.bytes, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(result.chunkSizes, [4, 4, 1]);
  assert.deepEqual(fixture.fetchCalls, [{ path: "test-file-1.md", range: "bytes=0-3" }]);
  assert.equal(fixture.adapterCalls.some(call => call.startsWith("readBinary:")), false);
});

test("iOS HTTP 200 resource stream rejects premature EOF and excess bytes", async () => {
  for (const scenario of [
    { name: "premature EOF", payload: bytes(1, 2, 3) },
    { name: "excess bytes", payload: bytes(1, 2, 3, 4, 5) },
  ]) {
    const fixture = mobileFixture({ "sized.bin": { type: "file", bytes: bytes(1, 2, 3, 4) } }, 2, {
      contentLength: null,
      responseBytes: () => scenario.payload,
      upstreamChunkBytes: 5,
    });
    const read = await fixture.local.readFile(vp("sized.bin"));
    await assert.rejects(() => collect(read.content), (error: unknown) => {
      assert.ok(error instanceof LocalPlatformCapabilityError, scenario.name);
      assert.equal(error.capability, "bounded-local-read", scenario.name);
      return true;
    });
  }
});

test("iOS HTTP 200 resource stream validates Content-Length when present", async () => {
  const fixture = mobileFixture({ "length.bin": { type: "file", bytes: bytes(1, 2, 3, 4) } }, 2, {
    contentLength: 5,
    upstreamChunkBytes: 2,
  });
  const read = await fixture.local.readFile(vp("length.bin"));
  await assert.rejects(() => collect(read.content), (error: unknown) =>
    error instanceof LocalPlatformCapabilityError && error.capability === "bounded-local-read");
});

test("iOS HTTP 200 resource stream fails stale when the file changes during reading", async () => {
  const fixture = mobileFixture({ "changing.md": { type: "file", bytes: bytes(1, 2, 3, 4, 5, 6) } }, 2, {
    contentLength: "actual",
    upstreamChunkBytes: 6,
  });
  const read = await fixture.local.readFile(vp("changing.md"));
  const iterator = read.content.openChunks()[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.deepEqual([...(first.value ?? [])], [1, 2]);
  fixture.entries.get("changing.md")!.mtime += 1;
  await assert.rejects(() => iterator.next(), LocalStaleObservationError);
});

test("zero-byte mobile files preserve no-fetch canonical read behavior", async () => {
  const fixture = mobileFixture({ "empty.md": { type: "file", bytes: bytes() } }, 2, { contentLength: "actual" });
  const read = await fixture.local.readFile(vp("empty.md"));
  assert.deepEqual(await collect(read.content), { bytes: [], chunkSizes: [] });
  assert.deepEqual(fixture.fetchCalls, []);
  assert.equal(fixture.adapterCalls.some(call => call.startsWith("getResourcePath:")), false);
  assert.equal(fixture.adapterCalls.some(call => call.startsWith("readBinary:")), false);
});

test("production mobile canonical chain keeps ordinary and portable non-empty content complete under HTTP 200", async () => {
  const ordinary = bytes(10, 20, 30, 40, 50, 60);
  const appearance = bytes(1, 3, 5, 7, 9);
  const corePlugins = bytes(2, 4, 6, 8);
  const fixture = mobileFixture({
    "test-file-1.md": { type: "file", bytes: ordinary },
    ".obsidian/appearance.json": { type: "file", bytes: appearance },
    ".obsidian/core-plugins.json": { type: "file", bytes: corePlugins },
  }, 3, { contentLength: "actual", upstreamChunkBytes: 2 });
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const local = new CanonicalEvidenceLocalVault(new ScopedLocalVault(fixture.local, scope));
  const listing = await local.enumerate();
  assert.equal(listing.completeness.status, "complete");
  const expectedHashes = new Map([
    ["test-file-1.md", sha256Bytes(ordinary)],
    [`${CONFIG_REMOTE_NAMESPACE}/appearance.json`, sha256Bytes(appearance)],
    [`${CONFIG_REMOTE_NAMESPACE}/core-plugins.json`, sha256Bytes(corePlugins)],
  ]);
  for (const [path, hash] of expectedHashes) {
    const observation = listing.entries.find(entry => String(entry.path) === path);
    assert.equal(observation?.status, "present", path);
    if (observation?.status === "present") assert.equal(observation.content?.hash, hash, path);
  }

  const managed: ManagedRemoteIdentity = {
    rootId: id<"RemoteObjectId">("root:ios-content-reader"),
    vaultIdentity: id<"VaultIdentity">("vault:ios-content-reader"),
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:ios-content-reader") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
  };
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const assembler = new ProductSnapshotAssembler(
    local,
    drive as never,
    state,
    { expectation: "new-installation", expectedVaultIdentity: managed.vaultIdentity },
    async () => managed,
    path => scope.isManagedLogical(path),
  );
  const assembly = await assembler.assembleFull();
  assert.equal(assembly.localEnumeration?.status, "complete");
  assert.equal(assembly.remoteEnumeration.status, "complete");
  const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async () => undefined }));
  const plan = await planner.plan(assembly.input);
  assert.equal(plan.operations.some(operation => operation.kind === "blocked-unsafe"), false);
  for (const path of expectedHashes.keys()) {
    assert.equal(plan.operations.some(operation => String(operation.path) === path && operation.kind === "upload-create"), true, path);
  }
  assert.equal(fixture.adapterCalls.some(call => call.startsWith("readBinary:")), false);
});
