import assert from "node:assert/strict";
import test from "node:test";
import type { App } from "obsidian";
import type { BinaryContentSource, VaultPath } from "../src/contracts/common";
import { ObsidianLocalVaultAdapter, LocalStaleObservationError } from "../src/local/obsidian-local-vault";

interface Entry { type: "file" | "folder"; bytes?: Uint8Array; mtime: number; ctime: number; }
interface FakeRuntime {
  readonly app: App;
  readonly entries: Map<string, Entry>;
  readonly adapterCalls: string[];
  readonly fileManagerCalls: string[];
  readonly eventHandlers: Map<string, Array<(...args: any[]) => void>>;
  fireReady(): void;
  setRenameFailure(predicate: ((from: string, to: string) => boolean) | undefined): void;
}

const vp = (value: string): VaultPath => value as VaultPath;
const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

function content(chunks: readonly Uint8Array[]): BinaryContentSource {
  return {
    sizeBytes: chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0),
    async *openChunks() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

function fakeRuntime(initial: Record<string, Entry>): FakeRuntime {
  const entries = new Map<string, Entry>();
  entries.set("", { type: "folder", mtime: 1, ctime: 1 });
  for (const [path, entry] of Object.entries(initial)) entries.set(path, { ...entry, bytes: entry.bytes ? new Uint8Array(entry.bytes) : undefined });
  const adapterCalls: string[] = [];
  const fileManagerCalls: string[] = [];
  const eventHandlers = new Map<string, Array<(...args: any[]) => void>>();
  let ready: (() => void) | undefined;
  let renameFailure: ((from: string, to: string) => boolean) | undefined;

  const ensureParents = (path: string): void => {
    const parts = path.split("/");
    parts.pop();
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!entries.has(current)) entries.set(current, { type: "folder", mtime: 1, ctime: 1 });
    }
  };

  const stat = async (path: string) => {
    const entry = entries.get(path);
    if (!entry) return null;
    return { type: entry.type, ctime: entry.ctime, mtime: entry.mtime, size: entry.type === "file" ? (entry.bytes?.byteLength ?? 0) : 0 };
  };

  const adapter = {
    getName: () => "fake-mobile",
    exists: async (path: string) => entries.has(path),
    stat,
    list: async (folder: string) => {
      if (!entries.has(folder)) throw new Error(`missing folder ${folder}`);
      const prefix = folder ? `${folder}/` : "";
      const files: string[] = [];
      const folders: string[] = [];
      for (const [path, entry] of entries) {
        if (!path || path === folder || !path.startsWith(prefix)) continue;
        const remainder = path.slice(prefix.length);
        if (remainder.includes("/")) continue;
        (entry.type === "file" ? files : folders).push(path);
      }
      return { files, folders };
    },
    getResourcePath: (path: string) => `memory://${encodeURIComponent(path)}`,
    readBinary: async (path: string) => {
      adapterCalls.push(`readBinary:${path}`);
      const value = entries.get(path)?.bytes ?? new Uint8Array();
      return value.slice().buffer;
    },
    writeBinary: async (path: string, data: ArrayBuffer) => {
      adapterCalls.push(`writeBinary:${path}:${data.byteLength}`);
      ensureParents(path);
      entries.set(path, { type: "file", bytes: new Uint8Array(data), mtime: Date.now(), ctime: Date.now() });
    },
    appendBinary: async (path: string, data: ArrayBuffer) => {
      adapterCalls.push(`appendBinary:${path}:${data.byteLength}`);
      const existing = entries.get(path);
      if (!existing || existing.type !== "file") throw new Error("append target missing");
      const old = existing.bytes ?? new Uint8Array();
      const incoming = new Uint8Array(data);
      const combined = new Uint8Array(old.byteLength + incoming.byteLength);
      combined.set(old, 0); combined.set(incoming, old.byteLength);
      existing.bytes = combined; existing.mtime += 1;
    },
    rename: async (from: string, to: string) => {
      adapterCalls.push(`rename:${from}->${to}`);
      if (renameFailure?.(from, to)) throw new Error("injected rename failure");
      const entry = entries.get(from);
      if (!entry) throw new Error(`rename source missing: ${from}`);
      ensureParents(to); entries.set(to, entry); entries.delete(from);
    },
    remove: async (path: string) => { adapterCalls.push(`remove:${path}`); entries.delete(path); },
    trashLocal: async (path: string) => { adapterCalls.push(`trashLocal:${path}`); entries.delete(path); },
    trashSystem: async () => false,
    mkdir: async (path: string) => { ensureParents(`${path}/x`); entries.set(path, { type: "folder", mtime: 1, ctime: 1 }); },
    rmdir: async (path: string) => { entries.delete(path); },
    read: async () => "",
    write: async () => undefined,
    append: async () => undefined,
    process: async () => "",
    copy: async () => undefined,
    getFullPath: (path: string) => path
  };

  const vault = {
    adapter,
    configDir: ".cfg",
    on: (name: string, callback: (...args: any[]) => void) => {
      const list = eventHandlers.get(name) ?? []; list.push(callback); eventHandlers.set(name, list);
      return { name, callback };
    },
    offref: () => undefined,
    createFolder: async (path: string) => { ensureParents(`${path}/x`); entries.set(path, { type: "folder", mtime: 1, ctime: 1 }); },
    getAbstractFileByPath: (path: string) => entries.has(path) ? { path } : null
  };

  const fileManager = {
    renameFile: async (file: { path: string }, newPath: string) => {
      fileManagerCalls.push(`renameFile:${file.path}->${newPath}`);
      const entry = entries.get(file.path);
      if (!entry) throw new Error("missing move source");
      entries.set(newPath, entry); entries.delete(file.path); file.path = newPath;
    },
    trashFile: async (file: { path: string }) => {
      fileManagerCalls.push(`trashFile:${file.path}`);
      entries.delete(file.path);
    }
  };

  const app = {
    vault,
    fileManager,
    workspace: { onLayoutReady: (callback: () => void) => { ready = callback; } }
  } as unknown as App;

  return {
    app,
    entries,
    adapterCalls,
    fileManagerCalls,
    eventHandlers,
    fireReady: () => ready?.(),
    setRenameFailure: predicate => { renameFailure = predicate; }
  };
}

function streamingFetch(runtime: FakeRuntime, chunkSize = 2): typeof fetch {
  return (async (url: string | URL | Request) => {
    const raw = typeof url === "string" ? url : url.toString();
    const path = decodeURIComponent(raw.slice("memory://".length));
    const value = runtime.entries.get(path)?.bytes;
    if (!value) return new Response(null, { status: 404 });
    let offset = 0;
    return new Response(new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= value.byteLength) { controller.close(); return; }
        const next = value.slice(offset, Math.min(offset + chunkSize, value.byteLength));
        offset += next.byteLength; controller.enqueue(next);
      }
    }), { status: 200 });
  }) as typeof fetch;
}

test("enumeration covers text binary hidden and empty folders while separating config/noise", async () => {
  const runtime = fakeRuntime({
    "10-Notes": { type: "folder", mtime: 1, ctime: 1 },
    "10-Notes/a.md": { type: "file", bytes: bytes(1), mtime: 2, ctime: 1 },
    "00-Inbox": { type: "folder", mtime: 1, ctime: 1 },
    "00-Inbox/blob.unknown": { type: "file", bytes: bytes(2, 3), mtime: 2, ctime: 1 },
    ".hidden": { type: "file", bytes: bytes(4), mtime: 2, ctime: 1 },
    "empty": { type: "folder", mtime: 1, ctime: 1 },
    ".git": { type: "folder", mtime: 1, ctime: 1 },
    ".git/config": { type: "file", bytes: bytes(5), mtime: 2, ctime: 1 },
    ".cfg": { type: "folder", mtime: 1, ctime: 1 },
    ".cfg/app.json": { type: "file", bytes: bytes(6), mtime: 2, ctime: 1 }
  });
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  const result = await local.enumerate();
  assert.equal(result.completeness.status, "complete");
  const paths = result.entries.filter(entry => entry.status === "present").map(entry => String(entry.path)).sort();
  assert.deepEqual(paths, [".hidden", "00-Inbox", "00-Inbox/blob.unknown", "10-Notes", "10-Notes/a.md", "empty"].sort());
  local.dispose();
});

test("active configuration directory is discovered from runtime rather than assumed .obsidian", async () => {
  const runtime = fakeRuntime({});
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  assert.equal(await local.activeConfigurationDirectory(), ".cfg");
  local.dispose();
});

test("readFile is lazy and consumes resource stream without calling whole-file readBinary", async () => {
  const runtime = fakeRuntime({ "large.bin": { type: "file", bytes: bytes(1,2,3,4,5), mtime: 7, ctime: 1 } });
  let fetchCalls = 0;
  const baseFetch = streamingFetch(runtime, 2);
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: (async (...args: Parameters<typeof fetch>) => { fetchCalls += 1; return baseFetch(...args); }) as typeof fetch });
  const read = await local.readFile(vp("large.bin"));
  assert.equal(fetchCalls, 0);
  const chunks: number[][] = [];
  for await (const chunk of read.content.openChunks()) chunks.push([...chunk]);
  assert.equal(fetchCalls, 1);
  assert.deepEqual(chunks, [[1,2],[3,4],[5]]);
  assert.equal(runtime.adapterCalls.some(call => call.startsWith("readBinary:")), false);
  local.dispose();
});

test("expected observation token rejects stale local versions", async () => {
  const runtime = fakeRuntime({ "a.bin": { type: "file", bytes: bytes(1), mtime: 7, ctime: 1 } });
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  const first = await local.readFile(vp("a.bin"));
  runtime.entries.get("a.bin")!.mtime += 1;
  await assert.rejects(() => local.readFile(vp("a.bin"), first.observationToken), LocalStaleObservationError);
  local.dispose();
});

test("create consumes multi-chunk content incrementally and preserves opaque bytes", async () => {
  const runtime = fakeRuntime({});
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  await local.createFile(vp("00-Inbox/new.opaque"), content([bytes(1,2), bytes(3), bytes(4,5)]));
  assert.deepEqual([...(runtime.entries.get("00-Inbox/new.opaque")?.bytes ?? [])], [1,2,3,4,5]);
  assert.equal(runtime.adapterCalls.filter(call => call.startsWith("appendBinary:")).length, 3);
  local.dispose();
});

test("replace stages content and restores prior valid content if final commit rename fails", async () => {
  const runtime = fakeRuntime({ "keep.bin": { type: "file", bytes: bytes(9,9), mtime: 7, ctime: 1 } });
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  runtime.setRenameFailure((from, to) => from.includes("brain-sync-stage") && to === "keep.bin");
  await assert.rejects(() => local.replaceFile(vp("keep.bin"), content([bytes(1,2,3)])));
  assert.deepEqual([...(runtime.entries.get("keep.bin")?.bytes ?? [])], [9,9]);
  local.dispose();
});

test("createFolder preserves empty directory structure", async () => {
  const runtime = fakeRuntime({});
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  await local.createFolder(vp("empty-dir"));
  assert.equal(runtime.entries.get("empty-dir")?.type, "folder");
  local.dispose();
});

test("move and trash use Obsidian FileManager semantics", async () => {
  const runtime = fakeRuntime({ "a.md": { type: "file", bytes: bytes(1), mtime: 2, ctime: 1 } });
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  await local.move(vp("a.md"), vp("renamed.md"));
  assert.deepEqual(runtime.fileManagerCalls, ["renameFile:a.md->renamed.md"]);
  await local.trash(vp("renamed.md"));
  assert.deepEqual(runtime.fileManagerCalls, ["renameFile:a.md->renamed.md", "trashFile:renamed.md"]);
  assert.equal(runtime.entries.has("renamed.md"), false);
  local.dispose();
});

test("startup changes are suppressed until vault-ready and later create/rename events are truthful", async () => {
  const runtime = fakeRuntime({});
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  const changes: string[] = [];
  local.onChange(change => changes.push(change.kind));
  runtime.eventHandlers.get("create")?.[0]?.({ path: "startup.md" });
  assert.deepEqual(changes, []);
  runtime.fireReady();
  runtime.eventHandlers.get("create")?.[0]?.({ path: "after.md" });
  runtime.eventHandlers.get("rename")?.[0]?.({ path: "after2.md" }, "after.md");
  assert.deepEqual(changes, ["created", "renamed"]);
  local.dispose();
});

test("dispose emits unload without deleting local content", () => {
  const runtime = fakeRuntime({ "safe.md": { type: "file", bytes: bytes(1), mtime: 2, ctime: 1 } });
  const local = new ObsidianLocalVaultAdapter(runtime.app, { stabilityDelayMs: 0, fetchImpl: streamingFetch(runtime) });
  const lifecycle: string[] = [];
  local.onLifecycle(event => lifecycle.push(event.kind));
  local.dispose();
  assert.deepEqual(lifecycle, ["unload"]);
  assert.equal(runtime.entries.has("safe.md"), true);
  assert.equal(runtime.fileManagerCalls.length, 0);
});
