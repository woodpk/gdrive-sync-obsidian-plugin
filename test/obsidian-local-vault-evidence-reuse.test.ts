import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter, ListedFiles, Stat } from "obsidian";
import type { BinaryContentSource, ObservationToken, VaultPath } from "../src/contracts/common";
import {
  LocalStaleObservationError,
  ObsidianLocalVaultAdapter,
  type ExternalReferenceGuard,
} from "../src/local/obsidian-local-vault";

interface Entry {
  readonly type: "file" | "folder";
  bytes?: Uint8Array;
  mtime: number;
  ctime: number;
}

interface Runtime {
  readonly app: App;
  readonly entries: Map<string, Entry>;
  readonly adapterCalls: string[];
  readonly fetchCalls: string[];
  fire(kind: "create" | "modify" | "delete", path: string): void;
  fireRename(oldPath: string, newPath: string): void;
  setRenameObserver(observer: ((from: string, to: string) => void) | undefined): void;
}

const vp = (value: string): VaultPath => value as VaultPath;
const bytes = (...values: number[]): Uint8Array<ArrayBuffer> => new Uint8Array(values);
const safeGuard: ExternalReferenceGuard = { async assertSafe(): Promise<void> {} };

function source(value: Uint8Array): BinaryContentSource {
  return {
    sizeBytes: value.byteLength,
    async *openChunks() { yield new Uint8Array(value); },
  };
}

function runtime(initial: Record<string, Entry>): Runtime {
  const entries = new Map<string, Entry>([["", { type: "folder", mtime: 1, ctime: 1 }]]);
  for (const [path, entry] of Object.entries(initial)) entries.set(path, { ...entry, bytes: entry.bytes?.slice() });
  const adapterCalls: string[] = [];
  const fetchCalls: string[] = [];
  const handlers = new Map<string, Array<(...args: any[]) => void>>();
  let renameObserver: ((from: string, to: string) => void) | undefined;

  const ensureParents = (path: string): void => {
    const parts = path.split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!entries.has(current)) entries.set(current, { type: "folder", mtime: 1, ctime: 1 });
    }
  };

  const adapter = {
    getName: () => "lat03-fake",
    exists: async (path: string) => {
      adapterCalls.push(`exists:${path}`);
      return entries.has(path);
    },
    stat: async (path: string): Promise<Stat | null> => {
      adapterCalls.push(`stat:${path}`);
      const entry = entries.get(path);
      if (!entry) return null;
      return {
        type: entry.type,
        ctime: entry.ctime,
        mtime: entry.mtime,
        size: entry.type === "file" ? (entry.bytes?.byteLength ?? 0) : 0,
      };
    },
    list: async (folder: string): Promise<ListedFiles> => {
      adapterCalls.push(`list:${folder}`);
      const prefix = folder ? `${folder}/` : "";
      const files: string[] = [];
      const folders: string[] = [];
      for (const [path, entry] of entries) {
        if (!path || path === folder || !path.startsWith(prefix)) continue;
        const remainder = path.slice(prefix.length);
        if (remainder.includes("/")) continue;
        (entry.type === "file" ? files : folders).push(path);
      }
      return { files: files.sort(), folders: folders.sort() };
    },
    getResourcePath: (path: string) => `memory://${encodeURIComponent(path)}`,
    readBinary: async () => { throw new Error("readBinary must not be used"); },
    writeBinary: async (path: string, data: ArrayBuffer) => {
      adapterCalls.push(`writeBinary:${path}`);
      ensureParents(path);
      entries.set(path, { type: "file", bytes: new Uint8Array(data), mtime: 100, ctime: 100 });
    },
    appendBinary: async (path: string, data: ArrayBuffer) => {
      adapterCalls.push(`appendBinary:${path}`);
      const entry = entries.get(path);
      if (!entry || entry.type !== "file") throw new Error(`missing append target: ${path}`);
      const previous = entry.bytes ?? new Uint8Array();
      const incoming = new Uint8Array(data);
      const combined = new Uint8Array(previous.byteLength + incoming.byteLength);
      combined.set(previous);
      combined.set(incoming, previous.byteLength);
      entry.bytes = combined;
      entry.mtime += 1;
    },
    rename: async (from: string, to: string) => {
      adapterCalls.push(`rename:${from}->${to}`);
      renameObserver?.(from, to);
      const entry = entries.get(from);
      if (!entry) throw new Error(`missing rename source: ${from}`);
      ensureParents(to);
      entries.set(to, entry);
      entries.delete(from);
    },
    remove: async (path: string) => { adapterCalls.push(`remove:${path}`); entries.delete(path); },
    trashLocal: async (path: string) => { adapterCalls.push(`trashLocal:${path}`); entries.delete(path); },
    trashSystem: async () => false,
    mkdir: async (path: string) => { entries.set(path, { type: "folder", mtime: 1, ctime: 1 }); },
    rmdir: async (path: string) => { entries.delete(path); },
    read: async () => "",
    write: async () => undefined,
    append: async () => undefined,
    process: async () => "",
    copy: async () => undefined,
    getFullPath: (path: string) => path,
  } as unknown as DataAdapter;

  const vault = {
    adapter,
    configDir: ".cfg",
    on: (kind: string, callback: (...args: any[]) => void) => {
      const values = handlers.get(kind) ?? [];
      values.push(callback);
      handlers.set(kind, values);
      return { kind, callback };
    },
    offref: () => undefined,
    createFolder: async (path: string) => { entries.set(path, { type: "folder", mtime: 1, ctime: 1 }); },
    getAbstractFileByPath: (path: string) => entries.has(path) ? { path } : null,
  };
  const app = {
    vault,
    fileManager: {
      renameFile: async () => { throw new Error("fileManager rename is not used by these tests"); },
      trashFile: async () => { throw new Error("fileManager trash is not used by these tests"); },
    },
    workspace: { onLayoutReady: () => undefined },
  } as unknown as App;

  const emit = (kind: string, ...args: unknown[]): void => {
    for (const callback of handlers.get(kind) ?? []) callback(...args);
  };

  return {
    app,
    entries,
    adapterCalls,
    fetchCalls,
    fire: (kind, path) => emit(kind, { path }),
    fireRename: (oldPath, newPath) => emit("rename", { path: newPath }, oldPath),
    setRenameObserver: observer => { renameObserver = observer; },
  };
}

function fetchFor(value: Runtime, upstreamChunkBytes = 2): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const path = decodeURIComponent(raw.slice("memory://".length));
    const current = value.entries.get(path)?.bytes;
    if (!current) return new Response(null, { status: 404 });
    const range = new Headers(init?.headers).get("Range");
    value.fetchCalls.push(`${path}:${range ?? "all"}`);
    if (!range) return new Response(current.slice().buffer, { status: 200 });
    const match = /^bytes=(\d+)-(\d+)$/.exec(range);
    if (!match) return new Response(null, { status: 416 });
    const start = Number(match[1]);
    const end = Math.min(Number(match[2]), current.byteLength - 1);
    const payload = current.slice(start, end + 1);
    let offset = 0;
    return new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= payload.byteLength) { controller.close(); return; }
        const chunk = payload.slice(offset, Math.min(offset + upstreamChunkBytes, payload.byteLength));
        offset += chunk.byteLength;
        controller.enqueue(chunk);
      },
    }), {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${current.byteLength}`,
        "Content-Length": String(payload.byteLength),
      },
    });
  }) as typeof fetch;
}

function local(value: Runtime, readChunkSizeBytes = 2): ObsidianLocalVaultAdapter {
  return new ObsidianLocalVaultAdapter(value.app, {
    externalReferenceGuard: safeGuard,
    adapterMutationFallback: true,
    stabilityDelayMs: 0,
    readChunkSizeBytes,
    fetchImpl: fetchFor(value),
  });
}

function statCount(value: Runtime, path: string): number {
  return value.adapterCalls.filter(call => call === `stat:${path}`).length;
}

function tokenFrom(listing: Awaited<ReturnType<ObsidianLocalVaultAdapter["enumerate"]>>, path: string): ObservationToken {
  const observation = listing.entries.find(entry => String(entry.path) === path);
  assert.equal(observation?.status, "present");
  if (observation?.status !== "present" || !observation.observationToken) throw new Error(`missing token: ${path}`);
  return observation.observationToken;
}

async function collect(content: BinaryContentSource): Promise<number[]> {
  const result: number[] = [];
  for await (const chunk of content.openChunks()) result.push(...chunk);
  return result;
}

test("same-path same-token read-only reuse replaces each repeated stability window with one live stat", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2, 3, 4), mtime: 7, ctime: 1 } });
  const adapter = local(value);
  const listing = await adapter.enumerate();
  const token = tokenFrom(listing, "note.bin");
  assert.equal(statCount(value, "note.bin"), 2, "enumeration establishes the original two-stat stability proof");

  await adapter.readFile(vp("note.bin"), token);
  await adapter.readFile(vp("note.bin"), token);
  assert.equal(statCount(value, "note.bin"), 4,
    "two repeated expected-token reads add one live stat each; the pre-LAT-03 structure would add four stats");
  adapter.dispose();
});

test("create modify and delete events invalidate same-path reusable evidence by generation", async () => {
  for (const kind of ["create", "modify", "delete"] as const) {
    const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2), mtime: 7, ctime: 1 } });
    const adapter = local(value);
    const token = tokenFrom(await adapter.enumerate(), "note.bin");
    value.fire(kind, "note.bin");
    await assert.rejects(() => adapter.readFile(vp("note.bin"), token), LocalStaleObservationError, kind);
    adapter.dispose();
  }
});

test("rename invalidates reusable evidence for both old and new paths", async () => {
  const value = runtime({
    "old.bin": { type: "file", bytes: bytes(1), mtime: 7, ctime: 1 },
    "new.bin": { type: "file", bytes: bytes(2), mtime: 8, ctime: 1 },
  });
  const adapter = local(value);
  const listing = await adapter.enumerate();
  const oldToken = tokenFrom(listing, "old.bin");
  const newToken = tokenFrom(listing, "new.bin");
  value.fireRename("old.bin", "new.bin");
  await assert.rejects(() => adapter.readFile(vp("old.bin"), oldToken), LocalStaleObservationError);
  await assert.rejects(() => adapter.readFile(vp("new.bin"), newToken), LocalStaleObservationError);
  adapter.dispose();
});

test("changed stat cannot reuse old evidence and falls back to stale rejection", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2), mtime: 7, ctime: 1 } });
  const adapter = local(value);
  const token = tokenFrom(await adapter.enumerate(), "note.bin");
  value.entries.get("note.bin")!.mtime += 1;
  const before = statCount(value, "note.bin");
  await assert.rejects(() => adapter.readFile(vp("note.bin"), token), LocalStaleObservationError);
  assert.equal(statCount(value, "note.bin") - before, 3,
    "one cheap mismatching stat must fall back to the conservative two-stat observation before stale rejection");
  adapter.dispose();
});

test("change after read admission but before byte consumption is detected before fetch", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2, 3, 4), mtime: 7, ctime: 1 } });
  const adapter = local(value);
  const token = tokenFrom(await adapter.enumerate(), "note.bin");
  const read = await adapter.readFile(vp("note.bin"), token);
  value.entries.get("note.bin")!.mtime += 1;
  await assert.rejects(() => collect(read.content), LocalStaleObservationError);
  assert.equal(value.fetchCalls.length, 0, "stale content must be rejected before the resource fetch begins");
  adapter.dispose();
});

test("change during byte streaming remains stale-detected with read-only evidence reuse", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2, 3, 4, 5, 6), mtime: 7, ctime: 1 } });
  const adapter = local(value, 2);
  const token = tokenFrom(await adapter.enumerate(), "note.bin");
  const read = await adapter.readFile(vp("note.bin"), token);
  const iterator = read.content.openChunks()[Symbol.asyncIterator]();
  const first = await iterator.next();
  assert.deepEqual([...(first.value ?? [])], [1, 2]);
  value.entries.get("note.bin")!.mtime += 1;
  await assert.rejects(() => iterator.next(), LocalStaleObservationError);
  adapter.dispose();
});

test("replace still performs full live target checks before physical displacement", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2, 3), mtime: 7, ctime: 1 } });
  const adapter = local(value);
  const token = tokenFrom(await adapter.enumerate(), "note.bin");
  await adapter.readFile(vp("note.bin"), token); // populate/consume the read-only fast path before mutation
  value.adapterCalls.length = 0;
  let targetStatsBeforeDisplacement = -1;
  value.setRenameObserver((from) => {
    if (from === "note.bin" && targetStatsBeforeDisplacement < 0) targetStatsBeforeDisplacement = statCount(value, "note.bin");
  });

  await adapter.replaceFile(vp("note.bin"), source(bytes(9, 8, 7)), token);
  assert.equal(targetStatsBeforeDisplacement, 6,
    "validatePath enumeration plus both mutation assertToken checks must each retain their two-stat live proof before target displacement");
  adapter.dispose();
});

test("reinitialization cannot inherit reusable evidence from a disposed adapter", async () => {
  const value = runtime({ "note.bin": { type: "file", bytes: bytes(1, 2), mtime: 7, ctime: 1 } });
  const first = local(value);
  const token = tokenFrom(await first.enumerate(), "note.bin");
  await first.readFile(vp("note.bin"), token);
  first.dispose();

  value.adapterCalls.length = 0;
  const second = local(value);
  await second.readFile(vp("note.bin"), token);
  assert.equal(statCount(value, "note.bin"), 2, "new adapter instance must establish a fresh stability proof rather than reuse prior evidence");
  second.dispose();
});
