import assert from "node:assert/strict";
import { access, mkdtemp, rm, stat as fsStat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { App, DataAdapter, Stat } from "obsidian";
import type { ContentEvidence, ManagedRemoteIdentity, RemoteObjectId, VaultPath } from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import {
  DesktopExternalReferenceGuard,
  ExternalFilesystemReferenceError,
  type DesktopFilesystemOps
} from "../src/local/desktop-external-reference-guard";
import { createDesktopLocalVaultAdapter } from "../src/local/desktop-local-vault";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope, ScopedLocalVault } from "../src/product/path-scope";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const canonical = (text: string): ContentEvidence => ({
  hash: sha256Text(text),
  sizeBytes: new TextEncoder().encode(text).byteLength
});

function missing(code: "ENOENT" | "ENOTDIR"): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

function containedOps(missingAt: (path: string) => boolean, missingCode: "ENOENT" | "ENOTDIR" = "ENOENT"): DesktopFilesystemOps {
  return {
    async lstat(path: string) {
      if (missingAt(path)) throw missing(missingCode);
      return { isSymbolicLink: () => false };
    },
    async realpath(path: string) { return path; }
  };
}

test("Phase 6 Alpha portable collision: direct missing child is safe containment evidence, not an external-reference failure", async () => {
  const base = "/vault";
  const guard = new DesktopExternalReferenceGuard(base, containedOps(path => path.endsWith(CONFIG_REMOTE_NAMESPACE)));
  assert.equal(await guard.resolveSafePath(vp(CONFIG_REMOTE_NAMESPACE), "observe"), join(base, CONFIG_REMOTE_NAMESPACE));
});

test("Phase 6 Alpha portable collision: nested missing target and missing intermediate component remain truthful absence candidates", async () => {
  const base = "/vault";
  const missingTarget = new DesktopExternalReferenceGuard(base, containedOps(path => path.endsWith("notes/missing.md")));
  assert.equal(await missingTarget.resolveSafePath(vp("notes/missing.md"), "observe"), join(base, "notes", "missing.md"));

  const missingIntermediate = new DesktopExternalReferenceGuard(base, containedOps(path => path.endsWith("missing-dir"), "ENOTDIR"));
  assert.equal(await missingIntermediate.resolveSafePath(vp("missing-dir/child.md"), "observe"), join(base, "missing-dir", "child.md"));
});

test("Phase 6 Alpha portable collision: permission uncertainty is not converted into absence", async () => {
  const base = "/vault";
  const denied = Object.assign(new Error("permission denied"), { code: "EACCES" });
  const guard = new DesktopExternalReferenceGuard(base, {
    async lstat() { throw denied; },
    async realpath(path: string) { return path; }
  });
  await assert.rejects(() => guard.resolveSafePath(vp("locked.md"), "observe"), error => error === denied);
});

test("Phase 6 Alpha portable collision: canonical-resolution failure on an existing component remains fail-closed", async () => {
  const base = "/vault";

  for (const code of ["ENOENT", "ENOTDIR"] as const) {
    const failure = missing(code);
    const guard = new DesktopExternalReferenceGuard(base, {
      async lstat() {
        return { isSymbolicLink: () => false };
      },
      async realpath(path: string) {
        if (path === base) return path;
        throw failure;
      }
    });

    await assert.rejects(
      () => guard.resolveSafePath(vp("existing-but-unresolved"), "observe"),
      error => error === failure
    );
  }
});

test("Phase 6 Alpha portable collision: lexical and external-reference containment remain fail-closed", async () => {
  const base = "/vault";
  const guard = new DesktopExternalReferenceGuard(base, containedOps(() => false));
  await assert.rejects(() => guard.resolveSafePath(vp("../outside.md"), "observe"), ExternalFilesystemReferenceError);

  const linked = new DesktopExternalReferenceGuard(base, {
    async lstat(path: string) { return { isSymbolicLink: () => path.endsWith("linked") }; },
    async realpath(path: string) { return path; }
  });
  await assert.rejects(() => linked.resolveSafePath(vp("linked/child.md"), "observe"), ExternalFilesystemReferenceError);
});

function desktopApp(basePath: string): App {
  const adapter = {
    getName: () => "desktop-test",
    getBasePath: () => basePath,
    exists: async (path: string) => {
      try { await access(join(basePath, path)); return true; }
      catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "ENOENT" || code === "ENOTDIR") return false;
        throw error;
      }
    },
    stat: async (path: string): Promise<Stat | null> => {
      try {
        const value = await fsStat(join(basePath, path));
        return {
          type: value.isDirectory() ? "folder" : "file",
          ctime: value.ctimeMs,
          mtime: value.mtimeMs,
          size: value.size
        };
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "ENOENT" || code === "ENOTDIR") return null;
        throw error;
      }
    },
    list: async () => ({ files: [], folders: [] }),
    getResourcePath: (path: string) => `file://${path}`,
    writeBinary: async () => undefined,
    appendBinary: async () => undefined,
    rename: async () => undefined,
    remove: async () => undefined,
    trashLocal: async () => undefined,
    trashSystem: async () => false,
    mkdir: async () => undefined,
    rmdir: async () => undefined,
    read: async () => "",
    readBinary: async () => new ArrayBuffer(0),
    write: async () => undefined,
    append: async () => undefined,
    process: async () => "",
    copy: async () => undefined,
    getFullPath: (path: string) => join(basePath, path)
  } as unknown as DataAdapter;
  return {
    vault: {
      adapter,
      configDir: ".obsidian",
      on: () => ({} as never),
      offref: () => undefined,
      createFolder: async () => undefined,
      getAbstractFileByPath: () => null
    },
    fileManager: { renameFile: async () => undefined, trashFile: async () => undefined },
    workspace: { onLayoutReady: () => undefined }
  } as unknown as App;
}

test("Phase 6 Alpha portable collision: production desktop composition observes a safely missing reserved root as absent", async () => {
  const root = await mkdtemp(join(tmpdir(), "brain-sync-portable-collision-"));
  try {
    const local = createDesktopLocalVaultAdapter(desktopApp(root), { stabilityDelayMs: 0 });
    const observed = await local.observe(vp(CONFIG_REMOTE_NAMESPACE));
    assert.equal(observed.status, "absent");
    local.dispose();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Phase 6 Alpha portable collision: unknown, inaccessible, unreadable, and real occupancy all remain fail-closed collisions", async () => {
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const logical = vp(`${CONFIG_REMOTE_NAMESPACE}/app.json`);
  for (const status of ["unknown", "inaccessible", "unreadable", "present"] as const) {
    const inner = {
      observe: async (path: VaultPath) => String(path) === CONFIG_REMOTE_NAMESPACE
        ? status === "present"
          ? { status: "present" as const, side: "local" as const, path, entityKind: "folder" as const, stability: "stable" as const }
          : { status, side: "local" as const, path, reason: `synthetic ${status}` }
        : { status: "absent" as const, side: "local" as const, path },
      validatePath: async () => ({ status: "compatible" as const, normalizedComparisonPath: "x" })
    } as never;
    const local = new ScopedLocalVault(inner, scope);
    assert.equal((await local.observe(logical)).status, "unknown", status);
    assert.equal((await local.validatePath(logical)).status, "blocked", status);
  }
});

test("Phase 6 Alpha portable collision: absent physical reserved root permits portable first-sync safe-union uploads", async () => {
  const vaultIdentity = id<"VaultIdentity">("vault:portable-collision");
  const managed: ManagedRemoteIdentity = {
    rootId: remoteId("root:portable-collision"),
    vaultIdentity,
    protocolVersion: id<"ProtocolVersion">("1")
  };
  const scope = new ProductPathScope(vp(".obsidian"), () => ({ userExclusionPatterns: [] }));
  const contents = new Map([
    [".obsidian/app.json", canonical("app")],
    [".obsidian/appearance.json", canonical("appearance")],
    [".obsidian/hotkeys.json", canonical("hotkeys")],
    [".obsidian/core-plugins.json", canonical("core-plugins")]
  ]);
  const inner = {
    enumerate: async () => ({ entries: [], completeness: { status: "complete" as const } }),
    observe: async (path: VaultPath) => {
      if (String(path) === CONFIG_REMOTE_NAMESPACE) return { status: "absent" as const, side: "local" as const, path };
      const evidence = contents.get(String(path));
      return evidence
        ? { status: "present" as const, side: "local" as const, path, entityKind: "file" as const, content: evidence, stability: "stable" as const, observationToken: id<"ObservationToken">(`tok:${String(path)}`) }
        : { status: "absent" as const, side: "local" as const, path };
    }
  } as never;
  const local = new ScopedLocalVault(inner, scope);

  assert.equal(String(scope.logicalToPhysical(vp(`${CONFIG_REMOTE_NAMESPACE}/app.json`))), ".obsidian/app.json");
  assert.deepEqual(scope.portableLogicalPaths().map(String).sort(), [
    `${CONFIG_REMOTE_NAMESPACE}/app.json`,
    `${CONFIG_REMOTE_NAMESPACE}/appearance.json`,
    `${CONFIG_REMOTE_NAMESPACE}/core-plugins.json`,
    `${CONFIG_REMOTE_NAMESPACE}/hotkeys.json`
  ].sort());

  const state = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const assembler = new ProductSnapshotAssembler(
    local,
    {
      validateManagedRoot: async () => ({ ok: true as const, value: { status: "valid" as const, identity: managed } }),
      getStartCursor: async () => ({ ok: true as const, value: id<"ChangeCursor">("cursor:portable") }),
      listForReconciliation: async () => ({ ok: true as const, value: { entries: [], completeness: { status: "complete" as const } } })
    } as never,
    state,
    { expectation: "new-installation" },
    async () => managed,
    path => scope.isManagedLogical(path)
  );
  const assembled = await assembler.assembleFull();
  const resolver = new ThreeWayConflictResolver({ readText: async () => undefined });
  const plan = await new DeterministicSynchronizationPlanner(resolver).plan(assembled.input);
  const portableOps = plan.operations.filter(operation => String(operation.path).startsWith(`${CONFIG_REMOTE_NAMESPACE}/`));

  assert.equal(portableOps.length, 4);
  assert.equal(portableOps.every(operation => operation.kind === "upload-create"), true);
  assert.equal(portableOps.some(operation => operation.kind === "blocked-unsafe"), false);
  assert.equal(plan.operations.some(operation => operation.kind.includes("delete")), false);
});
