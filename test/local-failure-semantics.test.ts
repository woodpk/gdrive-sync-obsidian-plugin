import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter, Stat } from "obsidian";
import type { BinaryContentSource, VaultPath } from "../src/contracts/common";
import { ObsidianLocalVaultAdapter } from "../src/local/obsidian-local-vault";

const vp = (value: string): VaultPath => value as VaultPath;

interface MinimalAdapterState {
  readonly files: Map<string, Uint8Array>;
  stat?: (path: string) => Promise<Stat | null>;
  list?: (path: string) => Promise<{ files: string[]; folders: string[] }>;
  appendBinary?: (path: string, data: ArrayBuffer) => Promise<void>;
}

function createApp(state: MinimalAdapterState): App {
  const eventHandlers = new Map<string, Array<(...args: any[]) => void>>();
  const adapter = {
    getName: () => "test-mobile",
    exists: async (path: string) => path === "" || state.files.has(path),
    stat: state.stat ?? (async (path: string) => {
      const value = state.files.get(path);
      return value ? { type: "file", ctime: 1, mtime: 1, size: value.byteLength } : path === "" ? { type: "folder", ctime: 1, mtime: 1, size: 0 } : null;
    }),
    list: state.list ?? (async () => ({ files: [...state.files.keys()], folders: [] })),
    getResourcePath: (path: string) => `memory://${encodeURIComponent(path)}`,
    writeBinary: async (path: string, data: ArrayBuffer) => { state.files.set(path, new Uint8Array(data)); },
    appendBinary: state.appendBinary ?? (async (path: string, data: ArrayBuffer) => {
      const old = state.files.get(path) ?? new Uint8Array();
      const incoming = new Uint8Array(data);
      const joined = new Uint8Array(old.byteLength + incoming.byteLength);
      joined.set(old); joined.set(incoming, old.byteLength); state.files.set(path, joined);
    }),
    rename: async (from: string, to: string) => {
      const value = state.files.get(from); if (!value) throw new Error("missing source");
      state.files.set(to, value); state.files.delete(from);
    },
    remove: async (path: string) => { state.files.delete(path); },
    trashLocal: async (path: string) => { state.files.delete(path); },
    trashSystem: async () => false,
    mkdir: async () => undefined,
    rmdir: async () => undefined,
    read: async () => "",
    readBinary: async (path: string) => (state.files.get(path) ?? new Uint8Array()).buffer,
    write: async () => undefined,
    append: async () => undefined,
    process: async () => "",
    copy: async () => undefined,
    getFullPath: (path: string) => path
  } as unknown as DataAdapter;
  return {
    vault: {
      adapter,
      configDir: ".cfg",
      on: (name: string, cb: (...args: any[]) => void) => { const handlers = eventHandlers.get(name) ?? []; handlers.push(cb); eventHandlers.set(name, handlers); return { name, cb }; },
      offref: () => undefined,
      createFolder: async () => undefined,
      getAbstractFileByPath: (path: string) => state.files.has(path) ? ({ path } as any) : null
    },
    fileManager: {
      renameFile: async () => undefined,
      trashFile: async () => undefined
    },
    workspace: { onLayoutReady: () => undefined }
  } as unknown as App;
}

function noFetch(): typeof fetch {
  return (async () => new Response(new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } }))) as typeof fetch;
}

function source(...chunks: Uint8Array[]): BinaryContentSource {
  return { async *openChunks() { for (const chunk of chunks) yield chunk; } };
}

test("confirmed absence remains distinct from read/access failures", async () => {
  const absent = new ObsidianLocalVaultAdapter(createApp({ files: new Map() }), { stabilityDelayMs: 0, fetchImpl: noFetch() });
  assert.equal((await absent.observe(vp("missing.md"))).status, "absent");
  absent.dispose();

  const inaccessibleApp = createApp({ files: new Map([["locked.md", new Uint8Array([1])]]), stat: async () => { throw new Error("permission denied"); } });
  const inaccessible = new ObsidianLocalVaultAdapter(inaccessibleApp, { stabilityDelayMs: 0, fetchImpl: noFetch() });
  assert.equal((await inaccessible.observe(vp("locked.md"))).status, "inaccessible");
  inaccessible.dispose();

  const unreadableApp = createApp({ files: new Map([["broken.md", new Uint8Array([1])]]), stat: async () => { throw new Error("I/O read failure"); } });
  const unreadable = new ObsidianLocalVaultAdapter(unreadableApp, { stabilityDelayMs: 0, fetchImpl: noFetch() });
  assert.equal((await unreadable.observe(vp("broken.md"))).status, "unreadable");
  unreadable.dispose();

  const unknownApp = createApp({ files: new Map([["odd.md", new Uint8Array([1])]]), stat: async () => null });
  const unknown = new ObsidianLocalVaultAdapter(unknownApp, { stabilityDelayMs: 0, fetchImpl: noFetch() });
  assert.equal((await unknown.observe(vp("odd.md"))).status, "unknown");
  unknown.dispose();
});

test("enumeration reports partial truthfully when a directory listing fails", async () => {
  const app = createApp({ files: new Map(), list: async () => { throw new Error("adapter listing interrupted"); } });
  const local = new ObsidianLocalVaultAdapter(app, { stabilityDelayMs: 0, fetchImpl: noFetch() });
  const listing = await local.enumerate();
  assert.equal(listing.completeness.status, "partial");
  if (listing.completeness.status === "partial") assert.match(listing.completeness.reason, /interrupted/);
  local.dispose();
});

test("mid-write metadata change is observed as unstable and cannot be read as a stable transfer", async () => {
  let call = 0;
  const app = createApp({
    files: new Map([["moving.bin", new Uint8Array([1,2,3])]]),
    stat: async () => ({ type: "file", ctime: 1, mtime: ++call, size: 3 })
  });
  const local = new ObsidianLocalVaultAdapter(app, { stabilityDelayMs: 0, fetchImpl: noFetch() });
  const observed = await local.observe(vp("moving.bin"));
  assert.equal(observed.status, "present");
  if (observed.status === "present") assert.equal(observed.stability, "unstable");
  await assert.rejects(() => local.readFile(vp("moving.bin")), /not stable/);
  local.dispose();
});

test("staging write failure leaves an existing destination byte-for-byte intact", async () => {
  const original = new Uint8Array([7,8,9]);
  let appendCalls = 0;
  const state: MinimalAdapterState = {
    files: new Map([["safe.bin", original.slice()]]),
    appendBinary: async () => { appendCalls += 1; throw new Error("No space left on device"); }
  };
  const local = new ObsidianLocalVaultAdapter(createApp(state), { stabilityDelayMs: 0, fetchImpl: noFetch() });
  await assert.rejects(() => local.replaceFile(vp("safe.bin"), source(new Uint8Array([1,2,3]))), /No space left/);
  assert.equal(appendCalls, 1);
  assert.deepEqual([...(state.files.get("safe.bin") ?? [])], [7,8,9]);
  local.dispose();
});

test("visibility lifecycle emits suspend/resume without starting synchronization or deleting content", async () => {
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const savedAdd = (globalThis as any).addEventListener;
  const savedRemove = (globalThis as any).removeEventListener;
  const documentListeners = new Map<string, () => void>();
  const pageListeners = new Map<string, () => void>();
  const fakeDocument = {
    visibilityState: "visible",
    addEventListener: (name: string, cb: () => void) => documentListeners.set(name, cb),
    removeEventListener: (name: string) => documentListeners.delete(name)
  };
  Object.defineProperty(globalThis, "document", { configurable: true, value: fakeDocument });
  (globalThis as any).addEventListener = (name: string, cb: () => void) => pageListeners.set(name, cb);
  (globalThis as any).removeEventListener = (name: string) => pageListeners.delete(name);
  try {
    const state: MinimalAdapterState = { files: new Map([["safe.md", new Uint8Array([1])]]) };
    const local = new ObsidianLocalVaultAdapter(createApp(state), { stabilityDelayMs: 0, fetchImpl: noFetch() });
    const events: string[] = [];
    local.onLifecycle(event => events.push(event.kind));
    (fakeDocument as any).visibilityState = "hidden";
    documentListeners.get("visibilitychange")?.();
    (fakeDocument as any).visibilityState = "visible";
    documentListeners.get("visibilitychange")?.();
    pageListeners.get("pagehide")?.();
    pageListeners.get("pageshow")?.();
    assert.deepEqual(events, ["suspend", "resume", "suspend", "resume"]);
    assert.equal(state.files.has("safe.md"), true);
    local.dispose();
  } finally {
    if (savedDocument) Object.defineProperty(globalThis, "document", savedDocument); else delete (globalThis as any).document;
    (globalThis as any).addEventListener = savedAdd;
    (globalThis as any).removeEventListener = savedRemove;
  }
});
