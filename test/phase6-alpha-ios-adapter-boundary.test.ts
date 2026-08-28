import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { App, DataAdapter, ListedFiles } from "obsidian";
import { contractId, type BinaryContentSource, type ManagedRemoteIdentity, type VaultPath } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { DesktopExternalReferenceGuard, type DesktopFilesystemOps } from "../src/local/desktop-external-reference-guard";
import { MobileVaultAccessBoundary } from "../src/local/mobile-vault-access-boundary";
import { ObsidianLocalVaultAdapter } from "../src/local/obsidian-local-vault";
import { presentManualSyncPreview } from "../src/diagnostics/sync-diagnostics";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";

interface Entry { type: "file" | "folder"; bytes?: Uint8Array; mtime: number; }
interface FixtureOptions {
  readonly listing?: (folder: string, ordinary: ListedFiles) => ListedFiles;
  readonly hiddenFromVaultTree?: boolean;
}

const vp = (value: string): VaultPath => value as VaultPath;
const id = <T extends string>(value: string) => contractId<T>(value);

function binary(...values: number[]): BinaryContentSource {
  return {
    sizeBytes: values.length,
    async *openChunks() { yield new Uint8Array(values); },
  };
}

function mobileFixture(initial: Record<string, Omit<Entry, "mtime"> & { mtime?: number }>, options: FixtureOptions = {}) {
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
    entries.set(entryPath, { ...entry, bytes: entry.bytes?.slice(), mtime: entry.mtime ?? 2 });
  }

  const calls: string[] = [];
  const fileManagerCalls: string[] = [];
  const ordinaryList = (folder: string): ListedFiles => {
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
    exists: async (entryPath: string) => { calls.push(`exists:${entryPath}`); return entries.has(entryPath); },
    stat: async (entryPath: string) => {
      calls.push(`stat:${entryPath}`);
      const entry = entries.get(entryPath);
      return entry ? { type: entry.type, ctime: 1, mtime: entry.mtime, size: entry.bytes?.byteLength ?? 0 } : null;
    },
    list: async (folder: string) => {
      calls.push(`list:${folder}`);
      const ordinary = ordinaryList(folder);
      return options.listing?.(folder, ordinary) ?? ordinary;
    },
    getResourcePath: (entryPath: string) => `memory://${encodeURIComponent(entryPath)}`,
    writeBinary: async (entryPath: string, data: ArrayBuffer) => {
      calls.push(`writeBinary:${entryPath}`);
      ensureParents(entryPath);
      entries.set(entryPath, { type: "file", bytes: new Uint8Array(data), mtime: 3 });
    },
    appendBinary: async (entryPath: string, data: ArrayBuffer) => {
      calls.push(`appendBinary:${entryPath}`);
      const entry = entries.get(entryPath);
      if (!entry || entry.type !== "file") throw new Error("append target missing");
      const oldBytes = entry.bytes ?? new Uint8Array();
      const next = new Uint8Array(oldBytes.byteLength + data.byteLength);
      next.set(oldBytes); next.set(new Uint8Array(data), oldBytes.byteLength);
      entry.bytes = next; entry.mtime += 1;
    },
    rename: async (from: string, to: string) => {
      calls.push(`rename:${from}->${to}`);
      const entry = entries.get(from);
      if (!entry) throw new Error("rename source missing");
      ensureParents(to); entries.set(to, entry); entries.delete(from);
    },
    mkdir: async (entryPath: string) => { calls.push(`mkdir:${entryPath}`); ensureParents(entryPath); entries.set(entryPath, { type: "folder", mtime: 3 }); },
    remove: async (entryPath: string) => { calls.push(`remove:${entryPath}`); entries.delete(entryPath); },
    trashLocal: async (entryPath: string) => { calls.push(`trashLocal:${entryPath}`); entries.delete(entryPath); },
  } as unknown as DataAdapter;
  const getAbstractFileByPath = (entryPath: string): { path: string } | null => {
    if (!entries.has(entryPath) || (options.hiddenFromVaultTree && entryPath.split("/").some(part => part.startsWith(".")))) return null;
    return { path: entryPath };
  };
  const vault = {
    adapter,
    configDir: ".obsidian",
    on: () => ({ id: "event" }),
    offref: () => undefined,
    createFolder: async (entryPath: string) => { ensureParents(entryPath); entries.set(entryPath, { type: "folder", mtime: 3 }); },
    getAbstractFileByPath,
  };
  const fileManager = {
    renameFile: async (file: { path: string }, to: string) => {
      fileManagerCalls.push(`renameFile:${file.path}->${to}`);
      const entry = entries.get(file.path);
      if (!entry) throw new Error("rename source missing");
      entries.set(to, entry); entries.delete(file.path); file.path = to;
    },
    trashFile: async (file: { path: string }) => { fileManagerCalls.push(`trashFile:${file.path}`); entries.delete(file.path); },
  };
  const app = { vault, fileManager, workspace: { onLayoutReady: () => undefined } } as unknown as App;
  const local = new ObsidianLocalVaultAdapter(app, {
    accessBoundary: new MobileVaultAccessBoundary(),
    adapterMutationFallback: true,
    stabilityDelayMs: 0,
  });
  return { local, calls, fileManagerCalls, entries };
}

test("mobile adapter boundary completely enumerates visible, nested, empty, and non-excluded hidden content", async () => {
  const fixture = mobileFixture({
    "10-Notes": { type: "folder" },
    "10-Notes/example.md": { type: "file", bytes: new Uint8Array([1]) },
    "10-Notes/nested": { type: "folder" },
    "10-Notes/nested/deep.bin": { type: "file", bytes: new Uint8Array([2]) },
    ".private-sync-test": { type: "folder" },
    ".private-sync-test/nested.md": { type: "file", bytes: new Uint8Array([3]) },
    "empty": { type: "folder" },
    ".obsidian": { type: "folder" },
    ".obsidian/workspace.json": { type: "file", bytes: new Uint8Array([4]) },
  }, { hiddenFromVaultTree: true });
  const listing = await fixture.local.enumerate();
  assert.equal(listing.completeness.status, "complete");
  const paths = listing.entries.filter(entry => entry.status === "present").map(entry => String(entry.path));
  for (const expected of ["10-Notes", "10-Notes/example.md", "10-Notes/nested", "10-Notes/nested/deep.bin", ".private-sync-test", ".private-sync-test/nested.md", "empty"]) {
    assert.ok(paths.includes(expected), expected);
  }
  assert.equal(paths.some(path => path.startsWith(".obsidian")), false);
});

test("mobile boundary blocks traversal, absolute, drive-qualified, and URI paths before adapter I/O", async () => {
  const fixture = mobileFixture({ "safe.md": { type: "file" } });
  for (const unsafe of ["../outside.md", "/some/absolute/path", "C:\\outside.md", "https://example.invalid/file", "file:///outside"]) {
    fixture.calls.length = 0;
    const observation = await fixture.local.observe(vp(unsafe));
    assert.equal(observation.status, "inaccessible", unsafe);
    await assert.rejects(() => fixture.local.readFile(vp(unsafe)), unsafe);
    await assert.rejects(() => fixture.local.createFile(vp(unsafe), binary(1)), unsafe);
    await assert.rejects(() => fixture.local.replaceFile(vp(unsafe), binary(1)), unsafe);
    await assert.rejects(() => fixture.local.createFolder(vp(unsafe)), unsafe);
    await assert.rejects(() => fixture.local.move(vp("safe.md"), vp(unsafe)), unsafe);
    await assert.rejects(() => fixture.local.trash(vp(unsafe)), unsafe);
    assert.deepEqual(fixture.calls, [], unsafe);
  }
});

test("malformed, colliding, and cyclic adapter children are rejected without access while safe siblings remain inspectable", async () => {
  const injected = ["../outside", "/absolute", "C:\\outside", "https://example.invalid/file", "file:///outside", "safe/nested"];
  const fixture = mobileFixture({ "safe": { type: "folder" }, "safe/note.md": { type: "file" }, "good.md": { type: "file" } }, {
    listing: (folder, ordinary) => folder === ""
      ? { folders: ["safe", ...injected, "SAFE"], files: ["good.md", "good.md"] }
      : folder === "safe" ? { folders: ["safe"], files: ordinary.files } : ordinary,
  });
  const listing = await fixture.local.enumerate();
  assert.equal(listing.completeness.status, "partial");
  assert.ok(listing.entries.some(entry => String(entry.path) === "good.md" && entry.status === "present"));
  assert.ok(listing.entries.some(entry => String(entry.path) === "safe/note.md" && entry.status === "present"));
  for (const unsafe of injected) {
    assert.equal(fixture.calls.some(call => call === `exists:${unsafe}` || call === `stat:${unsafe}` || call === `list:${unsafe}`), false, unsafe);
  }
  assert.equal(fixture.calls.includes("list:safe"), true);
  assert.equal(fixture.calls.filter(call => call === "stat:good.md").length, 2);
});

test("mobile adapter mutations validate temporary paths and handle hidden files absent from the Vault tree", async () => {
  const fixture = mobileFixture({
    ".private-sync-test": { type: "folder" },
    ".private-sync-test/existing.bin": { type: "file", bytes: new Uint8Array([9]) },
  }, { hiddenFromVaultTree: true });
  await fixture.local.createFile(vp(".private-sync-test/new.bin"), binary(1, 2, 3));
  await fixture.local.replaceFile(vp(".private-sync-test/existing.bin"), binary(4, 5));
  await fixture.local.move(vp(".private-sync-test/new.bin"), vp(".private-sync-test/moved.bin"));
  await fixture.local.trash(vp(".private-sync-test/moved.bin"));
  assert.deepEqual(fixture.fileManagerCalls, []);
  assert.equal(fixture.entries.has(".private-sync-test/moved.bin"), false);
  assert.deepEqual([...(fixture.entries.get(".private-sync-test/existing.bin")?.bytes ?? [])], [4, 5]);
  const mutationCalls = fixture.calls.filter(call => /^(writeBinary|appendBinary|rename|remove|trashLocal|mkdir):/.test(call));
  assert.ok(mutationCalls.some(call => call.includes("brain-sync-stage")));
  assert.ok(mutationCalls.some(call => call.includes("brain-sync-backup")));
  assert.equal(mutationCalls.every(call => !call.includes("../") && !call.includes(":\\") && !call.includes("://")), true);

  fixture.calls.length = 0;
  await assert.rejects(() => fixture.local.createFile(vp("../escape.bin"), binary(7)));
  assert.deepEqual(fixture.calls, []);
});

test("mobile preserves FileManager semantics for visible moves while retaining adapter fallback for hidden content", async () => {
  const fixture = mobileFixture({ "visible.md": { type: "file", bytes: new Uint8Array([1]) } });
  await fixture.local.move(vp("visible.md"), vp("renamed.md"));
  await fixture.local.trash(vp("renamed.md"));
  assert.deepEqual(fixture.fileManagerCalls, ["renameFile:visible.md->renamed.md", "trashFile:renamed.md"]);
  assert.equal(fixture.calls.some(call => call.startsWith("trashLocal:renamed.md")), false);
});

test("desktop retains physical external-reference rejection independently of the mobile adapter boundary", async () => {
  const ops: DesktopFilesystemOps = {
    realpath: async value => value,
    lstat: async value => ({ isSymbolicLink: () => value.endsWith("linked") }),
  };
  const guard = new DesktopExternalReferenceGuard("C:\\vault", ops);
  await guard.assertSafe(vp("safe.md"), "observe");
  await assert.rejects(() => guard.assertSafe(vp("linked/outside.md"), "observe"));
});

test("production mobile composition explicitly selects the adapter boundary without Node or Electron", () => {
  const runtime = readFileSync("src/product/runtime.ts", "utf8");
  const boundary = readFileSync("src/local/mobile-vault-access-boundary.ts", "utf8");
  assert.match(runtime, /accessBoundary:\s*new MobileVaultAccessBoundary\(\)/);
  assert.match(runtime, /adapterMutationFallback:\s*true/);
  assert.match(runtime, /mobile-vault-boundary-selected/);
  assert.doesNotMatch(`${runtime}\n${boundary}`, /(?:node:|from\s+["'](?:fs|path|electron)["']|require\s*\()/);
});

test("healthy mobile first sync produces complete LOCAL evidence and a non-destructive previewable safe-union plan", async () => {
  const fixture = mobileFixture({
    "Inbox": { type: "folder" },
    "Inbox/mobile.md": { type: "file", bytes: new Uint8Array([1, 2]) },
    ".private-sync-test": { type: "folder" },
    ".private-sync-test/nested.md": { type: "file", bytes: new Uint8Array([3]) },
  }, { hiddenFromVaultTree: true });
  const managed: ManagedRemoteIdentity = {
    rootId: id<"RemoteObjectId">("root:adapter-boundary"),
    vaultIdentity: id<"VaultIdentity">("vault:adapter-boundary"),
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:adapter-boundary") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
  };
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const assembler = new ProductSnapshotAssembler(
    fixture.local,
    drive as never,
    state,
    { expectation: "new-installation", expectedVaultIdentity: managed.vaultIdentity },
    async () => managed,
  );
  const assembly = await assembler.assembleFull();
  assert.equal(assembly.localEnumeration?.status, "complete");
  assert.equal(assembly.remoteEnumeration?.status, "complete");
  const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async () => undefined }));
  const plan = await planner.plan(assembly.input);
  assert.notEqual(plan.executionDisposition, "blocked");
  assert.equal(plan.operations.some(operation => operation.kind === "upload-create"), true);
  assert.equal(plan.operations.some(operation => operation.destructive), false);
  let presented = false;
  presentManualSyncPreview(() => undefined, () => { presented = true; }, () => undefined);
  assert.equal(presented, true);
});
