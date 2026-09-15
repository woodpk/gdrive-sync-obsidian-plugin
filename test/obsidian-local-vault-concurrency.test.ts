import assert from "node:assert/strict";
import test from "node:test";
import type { App, DataAdapter, ListedFiles, Stat } from "obsidian";
import type { VaultPath } from "../src/contracts/common";
import { ObsidianLocalVaultAdapter, type ExternalReferenceGuard } from "../src/local/obsidian-local-vault";

interface Entry {
  readonly type: "file" | "folder";
  readonly mtime: number;
  readonly size?: number;
}

interface Deferred<T = void> {
  readonly promise: Promise<T>;
  resolve(value: T extends void ? undefined : T): void;
  reject(reason?: unknown): void;
}

interface Fixture {
  readonly app: App;
  readonly adapter: DataAdapter;
  readonly entries: Map<string, Entry>;
  readonly calls: string[];
  readonly mutationCalls: string[];
}

function deferred<T = void>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return {
    promise,
    resolve: value => resolve(value as T),
    reject
  };
}

function ordinaryList(entries: Map<string, Entry>, folder: string): ListedFiles {
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
}

function fixture(
  initial: Record<string, Entry>,
  listing?: (folder: string, ordinary: ListedFiles) => ListedFiles
): Fixture {
  const entries = new Map<string, Entry>([["", { type: "folder", mtime: 1 }]]);
  for (const [path, entry] of Object.entries(initial)) entries.set(path, entry);
  const calls: string[] = [];
  const mutationCalls: string[] = [];

  const adapter = {
    getName: () => "lat02-fake",
    exists: async (path: string) => {
      calls.push(`exists:${path}`);
      return entries.has(path);
    },
    stat: async (path: string): Promise<Stat | null> => {
      calls.push(`stat:${path}`);
      const entry = entries.get(path);
      if (!entry) return null;
      return {
        type: entry.type,
        ctime: 1,
        mtime: entry.mtime,
        size: entry.type === "file" ? (entry.size ?? 1) : 0
      };
    },
    list: async (folder: string) => {
      calls.push(`list:${folder}`);
      const ordinary = ordinaryList(entries, folder);
      return listing?.(folder, ordinary) ?? ordinary;
    },
    getResourcePath: (path: string) => `memory://${encodeURIComponent(path)}`,
    writeBinary: async () => { mutationCalls.push("writeBinary"); },
    appendBinary: async () => { mutationCalls.push("appendBinary"); },
    rename: async () => { mutationCalls.push("rename"); },
    remove: async () => { mutationCalls.push("remove"); },
    trashLocal: async () => { mutationCalls.push("trashLocal"); },
    trashSystem: async () => { mutationCalls.push("trashSystem"); return false; },
    mkdir: async () => { mutationCalls.push("mkdir"); },
    rmdir: async () => { mutationCalls.push("rmdir"); },
    read: async () => "",
    readBinary: async () => new ArrayBuffer(0),
    write: async () => { mutationCalls.push("write"); },
    append: async () => { mutationCalls.push("append"); },
    process: async () => { mutationCalls.push("process"); return ""; },
    copy: async () => { mutationCalls.push("copy"); },
    getFullPath: (path: string) => path
  } as unknown as DataAdapter;

  const vault = {
    adapter,
    configDir: ".cfg",
    on: () => ({ id: "event" }),
    offref: () => undefined,
    createFolder: async () => { mutationCalls.push("vault.createFolder"); },
    getAbstractFileByPath: () => null
  };
  const fileManager = {
    renameFile: async () => { mutationCalls.push("fileManager.renameFile"); },
    trashFile: async () => { mutationCalls.push("fileManager.trashFile"); }
  };
  const app = { vault, fileManager, workspace: { onLayoutReady: () => undefined } } as unknown as App;
  return { app, adapter, entries, calls, mutationCalls };
}

const safeGuard: ExternalReferenceGuard = {
  async assertSafe(): Promise<void> {
    // The focused fixture has no external references unless a test injects one.
  }
};

function localAdapter(value: Fixture, guard: ExternalReferenceGuard = safeGuard): ObsidianLocalVaultAdapter {
  return new ObsidianLocalVaultAdapter(value.app, {
    externalReferenceGuard: guard,
    stabilityDelayMs: 0,
    fetchImpl: (async () => new Response()) as typeof fetch
  });
}

function mutableAdapter(value: Fixture): {
  stat(path: string): Promise<Stat | null>;
  exists(path: string, sensitive?: boolean): Promise<boolean>;
} {
  return value.adapter as unknown as {
    stat(path: string): Promise<Stat | null>;
    exists(path: string, sensitive?: boolean): Promise<boolean>;
  };
}

test("enumeration overlaps independent file observations under one cap of four", { timeout: 3000 }, async () => {
  const files = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`file-${index}.md`, { type: "file" as const, mtime: 2 }]));
  const value = fixture(files);
  const adapter = mutableAdapter(value);
  const baseStat = adapter.stat.bind(adapter);
  const release = deferred();
  const fourStarted = deferred();
  const firstSeen = new Set<string>();
  let active = 0;
  let maxActive = 0;

  adapter.stat = async path => {
    if (path.endsWith(".md") && !firstSeen.has(path)) {
      firstSeen.add(path);
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (firstSeen.size === 4) fourStarted.resolve(undefined);
      await release.promise;
      active -= 1;
    }
    return baseStat(path);
  };

  const local = localAdapter(value);
  const enumeration = local.enumerate();
  await fourStarted.promise;
  assert.equal(maxActive, 4);
  assert.equal(firstSeen.size, 4, "the fifth observation must not start while four workers are blocked");
  release.resolve(undefined);
  const listing = await enumeration;
  assert.equal(listing.completeness.status, "complete");
  assert.equal(maxActive, 4);
  assert.equal(listing.entries.length, 8);
  local.dispose();
});

test("every file still receives the second metadata observation and mid-window change remains unstable", async () => {
  const value = fixture({
    "stable-a.md": { type: "file", mtime: 2 },
    "stable-b.md": { type: "file", mtime: 3 },
    "changing.md": { type: "file", mtime: 4 }
  });
  const adapter = mutableAdapter(value);
  const baseStat = adapter.stat.bind(adapter);
  const counts = new Map<string, number>();

  adapter.stat = async path => {
    const count = (counts.get(path) ?? 0) + 1;
    counts.set(path, count);
    if (path === "changing.md") {
      return { type: "file", ctime: 1, mtime: count === 1 ? 4 : 5, size: 1 };
    }
    return baseStat(path);
  };

  const local = localAdapter(value);
  const listing = await local.enumerate();
  for (const path of ["stable-a.md", "stable-b.md", "changing.md"]) assert.equal(counts.get(path), 2, path);
  const changing = listing.entries.find(entry => String(entry.path) === "changing.md");
  assert.equal(changing?.status, "present");
  if (changing?.status === "present") assert.equal(changing.stability, "unstable");
  local.dispose();
});

test("result ordering follows logical traversal order even when observations finish in reverse", { timeout: 3000 }, async () => {
  const order = ["third.md", "first.md", "second.md"];
  const value = fixture({
    "third.md": { type: "file", mtime: 2 },
    "first.md": { type: "file", mtime: 2 },
    "second.md": { type: "file", mtime: 2 }
  }, folder => folder === "" ? { folders: [], files: order } : { folders: [], files: [] });
  const adapter = mutableAdapter(value);
  const baseStat = adapter.stat.bind(adapter);
  const releases = new Map(order.map(path => [path, deferred()]));
  const completed = new Map(order.map(path => [path, deferred()]));
  const counts = new Map<string, number>();
  const allStarted = deferred();
  let started = 0;

  adapter.stat = async path => {
    const count = (counts.get(path) ?? 0) + 1;
    counts.set(path, count);
    if (count === 1) {
      started += 1;
      if (started === order.length) allStarted.resolve(undefined);
      await releases.get(path)!.promise;
    }
    const result = await baseStat(path);
    if (count === 2) completed.get(path)!.resolve(undefined);
    return result;
  };

  const local = localAdapter(value);
  const enumeration = local.enumerate();
  await allStarted.promise;
  for (const path of ["second.md", "first.md", "third.md"]) {
    releases.get(path)!.resolve(undefined);
    await completed.get(path)!.promise;
  }
  const listing = await enumeration;
  assert.deepEqual(listing.entries.map(entry => String(entry.path)), order);
  local.dispose();
});

test("uncertainty ordering remains deterministic when different failures finish in reverse", { timeout: 3000 }, async () => {
  const listed = ["denied.md", "vanished.md", "wrongkind.md"];
  const value = fixture({
    "denied.md": { type: "file", mtime: 2 },
    "vanished.md": { type: "file", mtime: 2 },
    "wrongkind.md": { type: "folder", mtime: 2 }
  }, folder => folder === "" ? { folders: [], files: listed } : { folders: [], files: [] });
  const releases = new Map(listed.map(path => [path, deferred()]));
  const finished = new Map(listed.map(path => [path, deferred()]));
  const started = deferred();
  let waiting = 0;
  const guard: ExternalReferenceGuard = {
    async assertSafe(path: VaultPath, access): Promise<void> {
      const raw = String(path);
      if (access !== "enumerate" || !releases.has(raw)) return;
      waiting += 1;
      if (waiting === listed.length) started.resolve(undefined);
      await releases.get(raw)!.promise;
      if (raw === "denied.md") {
        finished.get(raw)!.resolve(undefined);
        throw new Error("permission denied by test boundary");
      }
    }
  };
  const adapter = mutableAdapter(value);
  const baseExists = adapter.exists.bind(adapter);
  const baseStat = adapter.stat.bind(adapter);
  adapter.exists = async (path, sensitive) => {
    if (path === "vanished.md") {
      value.entries.delete(path);
      finished.get(path)!.resolve(undefined);
    }
    return baseExists(path, sensitive);
  };
  adapter.stat = async path => {
    const result = await baseStat(path);
    if (path === "wrongkind.md") finished.get(path)!.resolve(undefined);
    return result;
  };

  const local = localAdapter(value, guard);
  const enumeration = local.enumerate();
  await started.promise;
  for (const path of ["wrongkind.md", "vanished.md", "denied.md"]) {
    releases.get(path)!.resolve(undefined);
    await finished.get(path)!.promise;
  }
  const listing = await enumeration;
  assert.equal(listing.completeness.status, "partial");
  assert.deepEqual(listing.uncertainties?.map(item => item.scope === "all" ? "/" : String(item.path)), listed);
  if (listing.completeness.status === "partial") {
    const denied = listing.completeness.reason.indexOf("denied.md");
    const vanished = listing.completeness.reason.indexOf("vanished.md");
    const wrongkind = listing.completeness.reason.indexOf("wrongkind.md");
    assert.ok(denied >= 0 && denied < vanished && vanished < wrongkind);
  }
  local.dispose();
});

test("nested directory traversal shares the same global cap instead of multiplying concurrency", { timeout: 3000 }, async () => {
  const initial: Record<string, Entry> = {};
  for (let folder = 0; folder < 4; folder += 1) {
    initial[`dir-${folder}`] = { type: "folder", mtime: 1 };
    for (let file = 0; file < 3; file += 1) initial[`dir-${folder}/file-${file}.md`] = { type: "file", mtime: 2 };
  }
  const value = fixture(initial);
  const adapter = mutableAdapter(value);
  const baseStat = adapter.stat.bind(adapter);
  const release = deferred();
  const fourStarted = deferred();
  const firstSeen = new Set<string>();
  let active = 0;
  let maxActive = 0;

  adapter.stat = async path => {
    if (path.endsWith(".md") && !firstSeen.has(path)) {
      firstSeen.add(path);
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (firstSeen.size === 4) fourStarted.resolve(undefined);
      await release.promise;
      active -= 1;
    }
    return baseStat(path);
  };

  const local = localAdapter(value);
  const enumeration = local.enumerate();
  await fourStarted.promise;
  assert.equal(maxActive, 4);
  release.resolve(undefined);
  const listing = await enumeration;
  assert.equal(listing.completeness.status, "complete");
  assert.equal(maxActive, 4);
  assert.equal(listing.entries.filter(entry => entry.status === "present" && entry.entityKind === "file").length, 12);
  local.dispose();
});

test("enumeration still blocks unsafe children, excludes protected subtrees, and invokes no mutation API", async () => {
  const value = fixture({
    ".git": { type: "folder", mtime: 1 },
    ".git/config": { type: "file", mtime: 2 },
    ".cfg": { type: "folder", mtime: 1 },
    ".cfg/app.json": { type: "file", mtime: 2 },
    "safe-folder": { type: "folder", mtime: 1 },
    "safe-folder/note.md": { type: "file", mtime: 2 },
    "safe.md": { type: "file", mtime: 2 }
  }, (folder, ordinary) => folder === ""
    ? { folders: [".git", ".cfg", "safe-folder", "../escape"], files: ["safe.md"] }
    : ordinary);

  const local = localAdapter(value);
  const listing = await local.enumerate();
  assert.equal(listing.completeness.status, "partial");
  assert.ok(listing.entries.some(entry => String(entry.path) === "safe.md" && entry.status === "present"));
  assert.ok(listing.entries.some(entry => String(entry.path) === "safe-folder/note.md" && entry.status === "present"));
  assert.equal(listing.entries.some(entry => String(entry.path).startsWith(".git")), false);
  assert.equal(listing.entries.some(entry => String(entry.path).startsWith(".cfg")), false);
  assert.equal(value.calls.some(call => call.includes(".git") || call.includes(".cfg") || call.includes("../escape")), false);
  assert.deepEqual(value.mutationCalls, []);
  local.dispose();
});
