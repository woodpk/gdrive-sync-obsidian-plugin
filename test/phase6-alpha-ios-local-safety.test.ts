import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { App } from "obsidian";
import { contractId, type ManagedRemoteIdentity, type VaultPath } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { DiagnosticLogger, type DiagnosticPersistence, type DiagnosticStoreState } from "../src/diagnostics/diagnostic-logger";
import { DesktopExternalReferenceGuard, type DesktopFilesystemOps } from "../src/local/desktop-external-reference-guard";
import { ObsidianLocalVaultAdapter } from "../src/local/obsidian-local-vault";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";

interface Entry { readonly type: "file" | "folder"; readonly bytes?: Uint8Array; }

const vp = (value: string): VaultPath => value as VaultPath;
const id = <T extends string>(value: string) => contractId<T>(value);

function mobileFixture(initial: Record<string, Entry>, configDir = ".obsidian") {
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
  const vault = {
    adapter,
    configDir,
    on: () => ({ id: "event" }),
    offref: () => undefined,
    createFolder: async () => undefined,
    getAbstractFileByPath: () => null,
  };
  const app = {
    vault,
    fileManager: { renameFile: async () => undefined, trashFile: async () => undefined },
    workspace: { onLayoutReady: () => undefined },
  } as unknown as App;
  return { local: new ObsidianLocalVaultAdapter(app, { stabilityDelayMs: 0 }), calls };
}

function capabilityReason(status: Awaited<ReturnType<ObsidianLocalVaultAdapter["observe"]>>): string {
  return status.status === "inaccessible" ? status.reason : "";
}

test("mobile visible-file access remains explicitly fail-closed without a supported external-reference authority", async () => {
  const fixture = mobileFixture({ "note.md": { type: "file", bytes: new Uint8Array([1, 2, 3]) } });
  const observed = await fixture.local.observe(vp("note.md"));
  assert.equal(observed.status, "inaccessible");
  assert.match(capabilityReason(observed), /cannot prove.*external filesystem reference/i);
  assert.equal(fixture.calls.includes("stat:note.md"), false);
});

test("nested visible enumeration remains partial rather than manufacturing complete LOCAL evidence", async () => {
  const fixture = mobileFixture({
    "Projects": { type: "folder" },
    "Projects/Alpha": { type: "folder" },
    "Projects/Alpha/plan.md": { type: "file", bytes: new Uint8Array([1]) },
  });
  const listing = await fixture.local.enumerate();
  assert.equal(listing.completeness.status, "partial");
  assert.equal(listing.entries.some(entry => String(entry.path) === "Projects" && entry.status === "inaccessible"), true);
  assert.equal(fixture.calls.includes("list:Projects"), false);
});

test("non-excluded hidden content is not rejected by a false Vault-tree visibility comparison", async () => {
  const fixture = mobileFixture({
    ".private-sync-test": { type: "folder" },
    ".private-sync-test/nested.md": { type: "file", bytes: new Uint8Array([1]) },
  });
  const listing = await fixture.local.enumerate();
  assert.equal(listing.completeness.status, "partial");
  const hidden = listing.entries.find(entry => String(entry.path) === ".private-sync-test");
  assert.equal(hidden?.status, "inaccessible");
  assert.doesNotMatch(hidden?.status === "inaccessible" ? hidden.reason : "", /vault tree disagree/i);
  assert.match(hidden?.status === "inaccessible" ? hidden.reason : "", /cannot prove.*external filesystem reference/i);
  assert.equal(fixture.calls.includes("list:.private-sync-test"), false);
});

test("active configuration directory remains excluded while other hidden content remains in managed scope", async () => {
  const fixture = mobileFixture({
    ".profile": { type: "folder" },
    ".profile/plugin.json": { type: "file" },
    ".private-sync-test": { type: "folder" },
  }, ".profile");
  const listing = await fixture.local.enumerate();
  assert.equal(listing.entries.some(entry => String(entry.path).startsWith(".profile")), false);
  assert.equal(listing.entries.some(entry => String(entry.path) === ".private-sync-test"), true);
});

test("traversal, absolute, drive-qualified, and URL paths all remain blocked before adapter metadata access", async () => {
  const fixture = mobileFixture({ "safe.md": { type: "file" } });
  for (const unsafe of ["../outside.md", "/outside.md", "C:\\outside.md", "https://example.invalid/outside.md"]) {
    const observed = await fixture.local.observe(vp(unsafe));
    assert.equal(observed.status, "inaccessible");
  }
  assert.equal(fixture.calls.some(call => call.startsWith("stat:")), false);
});

test("production mobile composition relies on the explicit unavailable-capability guard, not a fake tree proof", () => {
  const adapterSource = readFileSync("src/local/obsidian-local-vault.ts", "utf8");
  const runtimeSource = readFileSync("src/product/runtime.ts", "utf8");
  assert.match(adapterSource, /class UnavailableExternalReferenceGuard/);
  assert.match(adapterSource, /options\.externalReferenceGuard \?\? new UnavailableExternalReferenceGuard\(\)/);
  assert.match(runtimeSource, /return new ObsidianLocalVaultAdapter\(this\.host\.app\);/);
  assert.doesNotMatch(runtimeSource, /MobileVaultReferenceGuard/);
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

test("mobile production path introduces no Node or Electron dependency", () => {
  const runtimeSource = readFileSync("src/product/runtime.ts", "utf8");
  const adapterSource = readFileSync("src/local/obsidian-local-vault.ts", "utf8");
  assert.doesNotMatch(`${runtimeSource}\n${adapterSource}`, /(?:node:|from\s+["'](?:fs|path|electron)["']|require\s*\()/);
  assert.match(runtimeSource, /if\s*\(Platform\.isDesktopApp\)[\s\S]*?import\(["']\.\.\/local\/desktop-local-vault["']\)/);
});

class MemoryDiagnostics implements DiagnosticPersistence {
  state?: DiagnosticStoreState;
  async loadDiagnostics(): Promise<unknown> { return this.state; }
  async saveDiagnostics(state: DiagnosticStoreState): Promise<void> { this.state = structuredClone(state); }
}

test("manual first-sync assembly preserves partial truth and cannot plan destructive work", async () => {
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
  const assembly = await assembler.assembleFull(1);
  assert.equal(assembly.localEnumeration?.status, "partial");
  const diagnostic = diagnostics.snapshot().find(event => event.event === "local-observation-complete");
  assert.equal(diagnostic?.fields?.localCompleteness, "partial");

  const planner = new DeterministicSynchronizationPlanner(new ThreeWayConflictResolver({ readText: async () => undefined }));
  const plan = await planner.plan(assembly.input);
  assert.equal(plan.executionDisposition, "blocked");
  assert.equal(plan.operations.every(operation => operation.kind === "blocked-unsafe"), true);
  assert.equal(plan.operations.some(operation => operation.destructive), false);
});
