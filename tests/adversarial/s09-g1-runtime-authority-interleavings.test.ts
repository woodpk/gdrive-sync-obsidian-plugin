import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import type { VaultPath } from "../../src/contracts";
import { contractId } from "../../src/contracts";
import { DEFAULT_SETTINGS, PluginDataRepository, pairingStorageKey, type BrainSyncSettings } from "../../src/product/plugin-data";

function gate(): { readonly promise: Promise<void>; release(): void } {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function waitForEntry(entry: Promise<void>, operation: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      entry,
      operation.then(
        () => { throw new Error("initializer completed before reaching controlled adapter seam"); },
        error => { throw error; },
      ),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("initializer did not reach controlled adapter seam")), 5_000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function runtimeClass() {
  // Match the existing PHX-CI-consumed Node test harness: the Obsidian API
  // is unavailable in a plain Node process; no live vault/Drive is opened.
  const location = ".test-build/node_modules/obsidian";
  mkdirSync(location, { recursive: true });
  writeFileSync(location + "/index.js",
    'class Notice { constructor(message) { this.message = message; } }\n' +
    'module.exports = { Notice, Platform: { isDesktopApp: false, isMobile: true }, requestUrl: async () => { throw new Error("Live request forbidden"); } };\n',
    "utf8");
  return (await import("../../src/product/runtime")).ProductRuntime;
}

function initialSettings(): BrainSyncSettings {
  return {
    ...DEFAULT_SETTINGS,
    oauthClientId: "client",
    oauthRedirectUri: "https://example.invalid/callback",
    deviceIdentity: "device:existing",
    vaultIdentity: "vault:existing",
    remoteRootId: "root:existing",
    pairingStateNamespace: "epoch:existing",
    firstSyncCompleted: true,
    startupResumeEnabled: false,
    localChangeEnabled: false,
    periodicEnabled: false,
  };
}

async function harness(onWrite?: (sequence: number) => Promise<void>) {
  const ProductRuntime = await runtimeClass();
  const original = initialSettings();
  let disk: unknown = { settings: original, syncAttention: [], audit: [] };
  let current = original;
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async next => {
      ++writes;
      if (onWrite) await onWrite(writes);
      disk = structuredClone(next);
    },
  });
  current = await repository.loadSettings();
  const files = new Map<string, string>();
  const folders = new Set<string>();
  const adapter = {
    exists: async (path: string) => files.has(path) || folders.has(path),
    read: async (path: string) => {
      const value = files.get(path);
      if (value === undefined) throw new Error("missing " + path);
      return value;
    },
    write: async (path: string, value: string) => { files.set(path, value); },
    rename: async (from: string, to: string) => {
      const value = files.get(from);
      if (value === undefined) throw new Error("missing " + from);
      files.delete(from); files.set(to, value);
    },
    remove: async (path: string) => { files.delete(path); },
    mkdir: async (path: string) => { folders.add(path); },
    stat: async (path: string) => folders.has(path) ?
      { type: "folder", ctime: 0, mtime: 0, size: 0 } :
      files.has(path) ? { type: "file", ctime: 0, mtime: 0, size: files.get(path)!.length } : null,
  };
  const app = {
    secretStorage: { getSecret: () => null, setSecret: () => undefined, deleteSecret: () => undefined },
    vault: { adapter, on: () => ({}), offref: () => undefined },
  };
  const host = {
    app: app as never,
    plugin: { registerObsidianProtocolHandler: () => undefined } as never,
    data: repository,
    settings: () => current,
    mutateSettings: async (update: (value: BrainSyncSettings) => BrainSyncSettings) => {
      current = await repository.mutateSettings(update);
      return current;
    },
    notify: (_message: string) => undefined,
  };
  const runtime = new ProductRuntime(host);
  return {
    runtime, host, repository, original,
    current: () => current, persisted: () => disk,
    writes: () => writes, files, adapter,
  };
}

type RuntimeInternals = Record<string, unknown>;
function localFixture(onDispose: () => void) {
  return {
    activeConfigurationDirectory: async () => contractId<"VaultPath">(".obsidian") as VaultPath,
    onLifecycle: () => () => undefined,
    onChange: () => () => undefined,
    dispose: onDispose,
  };
}

test("F02-01: deauthorization revokes entry points immediately but waits for atomic/durable completion before unpairing", async () => {
  const h = await harness();
  const events: string[] = [];
  const inFlight = gate();
  let cancellationAccepted = false;
  let localDeletes = 0;
  let remoteDeletes = 0;
  const controller = {
    beginRuntimeDisposal: () => {
      if (!cancellationAccepted) { cancellationAccepted = true; events.push("cancel"); }
      return inFlight.promise;
    },
    request: async () => cancellationAccepted ?
      { status: "rejected", reason: "runtime retired" } : { status: "accepted" },
  };
  const scheduler = { stop: () => { events.push("stop"); } };
  const oauth = { clearTokens: () => { events.push("tokens-clear"); }, retirePendingOperations: () => undefined };
  const local = { dispose: () => events.push("local-dispose"), trash: async () => { localDeletes++; } };
  const drive = { trash: async () => { remoteDeletes++; } };
  Object.assign(h.runtime as unknown as RuntimeInternals, { controller, scheduler, boundary: { oauth, drive }, local, rawLocalDisposable: local.dispose });
  const previousKey = pairingStorageKey("brain-google-drive-sync", h.original);
  const unpair = h.runtime.deauthorize();
  assert.equal(cancellationAccepted, true, "cancel intent must precede the first asynchronous wait");
  assert.ok(events.includes("stop"));
  assert.ok(events.includes("tokens-clear"));
  assert.equal(h.current().remoteRootId, "root:existing");
  assert.equal(h.writes(), 0, "durable pairing must not change while atomic operation is suspended");
  assert.equal((await controller.request()).status, "rejected", "retired run must accept no new operation");
  await Promise.resolve();
  assert.equal(h.writes(), 0);
  assert.equal(events.filter(event => event === "local-dispose").length, 0, "adapter must remain alive while the old controller is quiescing");
  assert.equal(events.filter(event => event === "stop").length, 1, "scheduler retirement must be synchronous and unique");

  events.push("atomic-mutation-verified");
  events.push("old-epoch-state-committed");
  inFlight.release();
  await unpair;
  events.push("unpair-committed");
  assert.ok(events.indexOf("cancel") < events.indexOf("old-epoch-state-committed"));
  assert.ok(events.indexOf("old-epoch-state-committed") < events.indexOf("unpair-committed"));
  assert.equal(h.current().remoteRootId, "");
  assert.notEqual(pairingStorageKey("brain-google-drive-sync", h.current()), previousKey);
  assert.equal(h.current().firstSyncCompleted, false);
  assert.equal(h.current().startupResumeEnabled, false);
  assert.equal(h.current().localChangeEnabled, false);
  assert.equal(h.current().periodicEnabled, false);
  assert.equal(localDeletes, 0);
  assert.equal(remoteDeletes, 0);
  assert.ok(events.includes("local-dispose"));
  assert.equal(events.filter(event => event === "stop").length, 1, "deauthorization must stop its scheduler exactly once");
  assert.equal(events.filter(event => event === "local-dispose").length, 1, "local adapter lifetime must end exactly once");
  const restart = new PluginDataRepository({
    loadData: async () => h.persisted(), dataFileExists: async () => true,
    saveData: async () => { throw new Error("read-only restart"); },
  });
  assert.equal((await restart.loadSettings()).remoteRootId, "", "unpair survives restart");
});

test("F02-01: failed durable unpairing does not restore old run authority or silently change persisted namespace", async () => {
  const h = await harness(async sequence => {
    if (sequence === 1) throw new Error("injected unpair persistence failure");
  });
  const events: string[] = [];
  let deleteCount = 0;
  const controller = { beginRuntimeDisposal: async () => { events.push("cancel"); } };
  const oauth = { clearTokens: () => events.push("tokens-clear"), retirePendingOperations: () => undefined };
  Object.assign(h.runtime as unknown as RuntimeInternals, {
    controller,
    scheduler: { stop: () => events.push("stop") },
    boundary: { oauth, drive: { trash: async () => { deleteCount++; } } },
    local: { dispose: () => events.push("local-dispose"), trash: async () => { deleteCount++; } },
  });
  await assert.rejects(h.runtime.deauthorize(), /injected unpair persistence failure/);
  assert.ok(events.includes("cancel"));
  assert.ok(events.includes("tokens-clear"));
  assert.equal(h.runtime.productController(), undefined, "old controller must remain retired after failed unpair");
  assert.equal(h.current().remoteRootId, "root:existing");
  assert.equal(h.current().pairingStateNamespace, "epoch:existing");
  assert.equal(deleteCount, 0);
  const restart = new PluginDataRepository({
    loadData: async () => h.persisted(), dataFileExists: async () => true,
    saveData: async () => { throw new Error("read-only restart"); },
  });
  assert.equal((await restart.loadSettings()).remoteRootId, "root:existing");
  // A separate deliberate retry may complete; failed write must not be
  // reinterpreted as having already removed the pairing.
  await h.runtime.deauthorize();
  assert.equal(h.current().remoteRootId, "");
  assert.notEqual(h.current().pairingStateNamespace, "epoch:existing");
  assert.equal(events.filter(event => event === "stop").length, 1, "retry must not stop an already detached scheduler");
  const retried = new PluginDataRepository({
    loadData: async () => h.persisted(), dataFileExists: async () => true,
    saveData: async () => { throw new Error("read-only restart"); },
  });
  assert.equal((await retried.loadSettings()).remoteRootId, "", "explicit retry must survive a subsequent restart");
});

test("F02-02: later initialize supersedes initializer suspended at adapter await, retires its adapter, and is sole runtime owner", async () => {
  const h = await harness();
  const originalIndexedDb = globalThis.indexedDB;
  Object.defineProperty(globalThis, "indexedDB", { value: {} as IDBFactory, configurable: true, writable: true });
  const firstAdapterGate = gate();
  let signalAdapterEntered!: () => void;
  const firstAdapterEntered = new Promise<void>(resolve => { signalAdapterEntered = resolve; });
  const disposed: string[] = [];
  let invoked = 0;
  Object.assign(h.runtime as unknown as RuntimeInternals, {
    createLocalAdapter: async () => {
      const iteration = ++invoked;
      if (iteration === 1) { signalAdapterEntered(); await firstAdapterGate.promise; }
      return localFixture(() => disposed.push("adapter:" + iteration));
    },
  });
  try {
    const superseded = h.runtime.initialize();
    await waitForEntry(firstAdapterEntered, superseded);
    assert.equal(invoked, 1, "first initializer must reach the controlled adapter seam");
    const latest = h.runtime.initialize();
    firstAdapterGate.release();
    await assert.rejects(superseded, /Runtime initialization was retired/);
    await latest;
    assert.equal(invoked, 2);
    assert.ok(disposed.includes("adapter:1"), "obsolete initialization must dispose its local adapter");
    assert.ok(h.runtime.productController(), "successor must own a fully constructed controller");
    assert.ok(h.runtime.googleBoundary(), "successor must own the active Google boundary");
    const current = h.runtime.productController();
    await Promise.resolve();
    assert.equal(h.runtime.productController(), current, "retired initializer cannot overwrite successor");
    assert.equal(h.current().remoteRootId, "root:existing");
  } finally {
    firstAdapterGate.release();
    await h.runtime.disposeProduct();
    await h.runtime.disposeProduct(); // disposal is idempotent across repeated shutdown requests
    Object.defineProperty(globalThis, "indexedDB", { value: originalIndexedDb, configurable: true, writable: true });
  }
  assert.deepEqual(disposed, ["adapter:1", "adapter:2"], "each adapter, including the successfully published replacement, must be disposed exactly once");
});

test("F02-02: deauthorization while initialize awaits adapter prevents publication of either stale controller or old remote boundary", async () => {
  const h = await harness();
  const firstAdapterGate = gate();
  let entered!: () => void;
  const adapterEntered = new Promise<void>(resolve => { entered = resolve; });
  let disposed = 0;
  Object.assign(h.runtime as unknown as RuntimeInternals, {
    createLocalAdapter: async () => {
      entered();
      await firstAdapterGate.promise;
      return localFixture(() => { disposed++; });
    },
  });
  const originalIndexedDb = globalThis.indexedDB;
  Object.defineProperty(globalThis, "indexedDB", { value: {} as IDBFactory, configurable: true, writable: true });
  try {
    const initialization = h.runtime.initialize();
    await waitForEntry(adapterEntered, initialization);
    const unpair = h.runtime.deauthorize();
    firstAdapterGate.release();
    await assert.rejects(initialization, /Runtime initialization was retired/);
    await unpair;
    assert.equal(disposed, 1);
    assert.equal(h.runtime.productController(), undefined);
    assert.equal(h.runtime.googleBoundary(), undefined);
    assert.equal(h.current().remoteRootId, "");
    assert.equal(h.current().firstSyncCompleted, false);
    assert.notEqual(h.current().pairingStateNamespace, "epoch:existing");
  } finally {
    firstAdapterGate.release();
    await h.runtime.disposeProduct();
    Object.defineProperty(globalThis, "indexedDB", { value: originalIndexedDb, configurable: true, writable: true });
  }
});
