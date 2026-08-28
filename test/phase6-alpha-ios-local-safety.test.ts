import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { App, TAbstractFile, TFolder } from "obsidian";
import { contractId, type ManagedRemoteIdentity, type VaultPath } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { DesktopExternalReferenceGuard, type DesktopFilesystemOps } from "../src/local/desktop-external-reference-guard";
import { MobileVaultReferenceGuard } from "../src/local/mobile-vault-reference-guard";
import { LocalPlatformCapabilityError, ObsidianLocalVaultAdapter } from "../src/local/obsidian-local-vault";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";

interface Entry { readonly type: "file" | "folder"; readonly bytes?: Uint8Array; }

const vp = (value: string): VaultPath => value as VaultPath;
const id = <T extends string>(value: string) => contractId<T>(value);

function mobileFixture(initial: Record<string, Entry>, omitFromTree: readonly string[] = []) {
  const entries = new Map<string, Entry>([["", { type: "folder" }]]);
  for (const [entryPath, entry] of Object.entries(initial)) {
    const components = entryPath.split("/");
    components.pop();
    let parent = "";
    for (const component of components) {
      parent = parent ? `${parent}/${component}` : component;
      if (!entries.has(parent)) entries.set(parent, { type: "folder" });
    }
    entries.set(entryPath, entry);
  }

  const calls: string[] = [];
  const adapter = {
    getName: () => "fake-mobile",
    exists: async (entryPath: string) => { calls.push(`exists:${entryPath}`); return entries.has(entryPath); },
    stat: async (entryPath: string) => {
      calls.push(`stat:${entryPath}`);
      const entry = entries.get(entryPath);
      if (!entry) return null;
      return { type: entry.type, ctime: 1, mtime: 2, size: entry.type === "file" ? (entry.bytes?.byteLength ?? 0) : 0 };
    },
    list: async (folder: string) => {
      calls.push(`list:${folder}`);
      const prefix = folder ? `${folder}/` : "";
      const files: string[] = [], folders: string[] = [];
      for (const [entryPath, entry] of entries) {
        if (!entryPath || entryPath === folder || !entryPath.startsWith(prefix)) continue;
        if (entryPath.slice(prefix.length).includes("/")) continue;
        (entry.type === "file" ? files : folders).push(entryPath);
      }
      return { files: files.sort(), folders: folders.sort() };
    },
    getResourcePath: (entryPath: string) => `memory://${entryPath}`,
  };

  const nodes = new Map<string, TAbstractFile>();
  let root!: TFolder;
  const vault: any = {
    adapter,
    configDir: ".obsidian",
    on: () => ({ id: "event" }),
    offref: () => undefined,
    createFolder: async () => undefined,
    getRoot: () => root,
    getAbstractFileByPath: (entryPath: string) => nodes.get(entryPath) ?? null,
  };
  root = { vault, path: "/", name: "", parent: null, children: [], isRoot: () => true } as unknown as TFolder;
  nodes.set("", root);
  for (const [entryPath, entry] of [...entries].sort(([left], [right]) => left.split("/").length - right.split("/").length)) {
    if (!entryPath || omitFromTree.includes(entryPath)) continue;
    const slash = entryPath.lastIndexOf("/");
    const parentPath = slash < 0 ? "" : entryPath.slice(0, slash);
    const parent = nodes.get(parentPath) as TFolder | undefined;
    if (!parent) continue;
    const node: any = {
      vault,
      path: entryPath,
      name: slash < 0 ? entryPath : entryPath.slice(slash + 1),
      parent,
      ...(entry.type === "folder" ? { children: [], isRoot: () => false } : {}),
    };
    (parent.children as TAbstractFile[]).push(node);
    nodes.set(entryPath, node as TAbstractFile);
  }

  const app = {
    vault,
    fileManager: { renameFile: async () => undefined, trashFile: async () => undefined },
    workspace: { onLayoutReady: () => undefined },
  } as unknown as App;
  const local = new ObsidianLocalVaultAdapter(app, {
    externalReferenceGuard: new MobileVaultReferenceGuard(app),
    stabilityDelayMs: 0,
  });
  return { app, local, calls, nodes };
}

test("mobile vault-tree containment permits normal files to be observed safely", async () => {
  const fixture = mobileFixture({ "note.md": { type: "file", bytes: new Uint8Array([1, 2, 3]) } });
  const observed = await fixture.local.observe(vp("note.md"));
  assert.equal(observed.status, "present");
  if (observed.status === "present") {
    assert.equal(observed.entityKind, "file");
    assert.equal(observed.content?.sizeBytes, 3);
  }
});

test("mobile vault-tree containment recursively enumerates nested folders with complete evidence", async () => {
  const fixture = mobileFixture({
    "Projects": { type: "folder" },
    "Projects/Alpha": { type: "folder" },
    "Projects/Alpha/plan.md": { type: "file", bytes: new Uint8Array([1]) },
    "root.md": { type: "file", bytes: new Uint8Array([2]) },
  });
  const listing = await fixture.local.enumerate();
  assert.equal(listing.completeness.status, "complete");
  assert.deepEqual(
    listing.entries.filter(entry => entry.status === "present").map(entry => String(entry.path)).sort(),
    ["Projects", "Projects/Alpha", "Projects/Alpha/plan.md", "root.md"],
  );
  assert.ok(fixture.calls.includes("list:Projects/Alpha"));
});

test("mobile containment rejects absolute, traversal, drive-qualified, and URL path forms before adapter metadata access", async () => {
  const fixture = mobileFixture({ "safe.md": { type: "file" } });
  const guard = new MobileVaultReferenceGuard(fixture.app);
  for (const unsafe of ["../outside.md", "/outside.md", "C:\\outside.md", "https://example.invalid/outside.md"]) {
    await assert.rejects(
      () => guard.assertSafe(vp(unsafe), "observe"),
      (error: unknown) => error instanceof LocalPlatformCapabilityError && error.capability === "external-reference-detection",
    );
  }
  assert.equal(fixture.calls.some(call => call.startsWith("stat:")), false);
});

test("mobile containment remains fail-closed when adapter and Obsidian vault tree cannot agree", async () => {
  const fixture = mobileFixture({ "uncertain.md": { type: "file" } }, ["uncertain.md"]);
  const observed = await fixture.local.observe(vp("uncertain.md"));
  assert.equal(observed.status, "inaccessible");
  assert.match(observed.status === "inaccessible" ? observed.reason : "", /adapter and Obsidian vault tree disagree/i);
  assert.equal(fixture.calls.includes("stat:uncertain.md"), false);
});

test("desktop external-reference behavior remains independently Node-backed and fail-closed", async () => {
  const ops: DesktopFilesystemOps = {
    realpath: async path => path,
    lstat: async path => ({ isSymbolicLink: () => path.endsWith("linked") }),
  };
  const guard = new DesktopExternalReferenceGuard("C:\\vault", ops);
  await guard.assertSafe(vp("safe.md"), "observe");
  await assert.rejects(() => guard.assertSafe(vp("linked/secret.md"), "observe"));
});

test("mobile production path has no Node or Electron dependency and injects the mobile guard", () => {
  const guardSource = readFileSync("src/local/mobile-vault-reference-guard.ts", "utf8");
  const runtimeSource = readFileSync("src/product/runtime.ts", "utf8");
  assert.doesNotMatch(guardSource, /(?:node:|from\s+["'](?:fs|path|electron)["']|require\s*\()/);
  assert.match(runtimeSource, /externalReferenceGuard:\s*new MobileVaultReferenceGuard\(this\.host\.app\)/);
  assert.match(runtimeSource, /if\s*\(Platform\.isDesktopApp\)[\s\S]*?import\(["']\.\.\/local\/desktop-local-vault["']\)/);
});

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

test("manual-sync assembly reports complete LOCAL evidence and retains safe-union planning semantics", async () => {
  const fixture = mobileFixture({
    "Inbox": { type: "folder" },
    "Inbox/mobile.md": { type: "file", bytes: new Uint8Array([1, 2]) },
  });
  const diagnostics = new DiagnosticLogger({
    persistence: new MemoryDiagnostics(), level: "trace", retentionLimit: 100,
    consoleMirror: false, platform: "mobile",
  });
  await diagnostics.initialize();
  const managed: ManagedRemoteIdentity = {
    rootId: id<"RemoteObjectId">("root:mobile-local-safety"),
    vaultIdentity: id<"VaultIdentity">("vault:mobile-local-safety"),
    protocolVersion: id<"ProtocolVersion">("1"),
  };
  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const drive = {
    validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
    getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:mobile-local-safety") }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } }),
  };
  const assembler = new ProductSnapshotAssembler(
    fixture.local,
    drive as never,
    state,
    { expectation: "new-installation", expectedVaultIdentity: managed.vaultIdentity },
    async () => managed,
    undefined,
    undefined,
    diagnostics,
  );
  const runId = 1;
  const assembly = await assembler.assembleFull(runId);
  assert.equal(assembly.localEnumeration?.status, "complete");
  const diagnostic = diagnostics.snapshot().find(event => event.event === "local-observation-complete");
  assert.equal(diagnostic?.fields?.localCompleteness, "complete");

  const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async () => undefined }));
  const plan = await planner.plan(assembly.input);
  assert.deepEqual(plan.operations.map(operation => operation.kind).sort(), ["upload-create", "upload-create"]);
  assert.equal(plan.operations.some(operation => operation.destructive), false);
  assert.equal(plan.operations.some(operation => operation.kind === "trash-local" || operation.kind === "trash-remote"), false);
});
