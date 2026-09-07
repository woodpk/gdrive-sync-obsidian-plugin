import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type BaseEntry,
  type ContentHash,
  type DeviceIdentity,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type ObservationToken,
  type PathSnapshot,
  type PersistenceRevision,
  type RemoteObjectId,
  type SemanticStateGeneration,
  type StateLoadContext,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import { AuthorityCompleteExecutionCoordinator } from "../src/core/execution-coordinator";
import { DeterministicSynchronizationPlanner, TRANSITIVELY_CARRIED_MOVE_REASON } from "../src/core/planner";
import { createAuthoritativeProductExecutor } from "../src/product/authoritative-production-executor";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { SynchronizationStateAuthorityAdapter } from "../src/product/synchronization-adapters";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
} from "../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const vp = (value: string) => id<"VaultPath">(value) as VaultPath;
const rid = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const hash = id<"ContentHash">("sha256:folder-child") as ContentHash;
const vault = id<"VaultIdentity">("vault-folder-r1") as VaultIdentity;
const device = id<"DeviceIdentity">("device-folder-r1") as DeviceIdentity;
const generation = id<"SemanticStateGeneration">("semantic:folder-r1:1") as SemanticStateGeneration;
const persistence = id<"PersistenceRevision">("persistence:folder-r1:1") as PersistenceRevision;
const rootId = rid("root-folder-r1");
const folderId = rid("remote-folder-r1");
const childId = rid("remote-child-r1");
const childContent = { hash, sizeBytes: 17, revision: "1" };
const context: StateLoadContext = { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device };
const managedRemote: ManagedRemoteIdentity = { rootId, vaultIdentity: vault, protocolVersion: id<"ProtocolVersion">("1") };

function base(path: string, entityKind: "file" | "folder", remoteObjectId: RemoteObjectId): BaseEntry {
  return {
    path: vp(path), entityKind, localExisted: true, remoteExisted: true, remoteObjectId,
    ...(entityKind === "file" ? { content: childContent } : {}),
  };
}

async function seededState() {
  const raw = new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const initial = createInitialAuthorityState({ persistenceRevision: persistence, semanticGeneration: generation, vaultIdentity: vault, deviceIdentity: device });
  const parent = base("old", "folder", folderId);
  const child = base("old/child.md", "file", childId);
  const state: DurableSynchronizationAuthorityState = {
    ...initial,
    base: [child, parent],
    remoteMappings: [
      { path: child.path, entityKind: "file", remoteObjectId: childId },
      { path: parent.path, entityKind: "folder", remoteObjectId: folderId },
    ],
    baseAuthority: [
      { path: child.path, fingerprint: id<"BaseFingerprint">("base:child") },
      { path: parent.path, fingerprint: id<"BaseFingerprint">("base:parent") },
    ],
    pathConvergence: [
      { path: child.path, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:child") } },
      { path: parent.path, state: { status: "converged", generation, baseFingerprint: id<"BaseFingerprint">("base:parent") } },
    ],
  };
  assert.equal((await raw.saveTrusted(state)).status, "saved");
  return new SynchronizationStateAuthorityAdapter(raw);
}

function present(side: "local" | "remote", path: string, entityKind: "file" | "folder", remoteObjectId?: RemoteObjectId) {
  return {
    status: "present" as const,
    side,
    path: vp(path),
    entityKind,
    stability: "stable" as const,
    ...(remoteObjectId ? { remoteObjectId } : {}),
    ...(entityKind === "file" ? { content: childContent } : {}),
    ...(side === "local" ? { observationToken: id<"ObservationToken">(`obs:${path}`) as ObservationToken } : {}),
  };
}
function absent(side: "local" | "remote", path: string) { return { status: "absent" as const, side, path: vp(path) }; }
function snap(path: string, local: ReturnType<typeof present> | ReturnType<typeof absent>, remote: ReturnType<typeof present> | ReturnType<typeof absent>, prior?: BaseEntry): PathSnapshot {
  return { path: vp(path), local, remote, base: { status: "trusted", entry: prior }, remoteEnumeration: { status: "complete" }, identity: { status: "unambiguous" } };
}

function snapshots(direction: "local-to-remote" | "remote-to-local", parent: BaseEntry, child: BaseEntry): PathSnapshot[] {
  if (direction === "local-to-remote") return [
    snap("old/child.md", absent("local", "old/child.md"), present("remote", "old/child.md", "file", childId), child),
    snap("new/child.md", present("local", "new/child.md", "file", childId), absent("remote", "new/child.md")),
    snap("old", absent("local", "old"), present("remote", "old", "folder", folderId), parent),
    snap("new", present("local", "new", "folder", folderId), absent("remote", "new")),
  ];
  return [
    snap("old/child.md", present("local", "old/child.md", "file", childId), absent("remote", "old/child.md"), child),
    snap("new/child.md", absent("local", "new/child.md"), present("remote", "new/child.md", "file", childId)),
    snap("old", present("local", "old", "folder", folderId), absent("remote", "old"), parent),
    snap("new", absent("local", "new"), present("remote", "new", "folder", folderId)),
  ];
}

function convergedPorts(moveCounts: { local: number; remote: number }) {
  const localEntries = new Map<string, ReturnType<typeof present>>([
    ["new", present("local", "new", "folder", folderId)],
    ["new/child.md", present("local", "new/child.md", "file", childId)],
  ]);
  const remoteEntries = new Map<string, ReturnType<typeof present>>([
    ["new", present("remote", "new", "folder", folderId)],
    ["new/child.md", present("remote", "new/child.md", "file", childId)],
  ]);
  const local = {
    observe: async (path: VaultPath) => localEntries.get(String(path)) ?? absent("local", String(path)),
    move: async () => { moveCounts.local += 1; },
  } as unknown as LocalVaultPort;
  const drive = {
    observe: async (_root: RemoteObjectId, path: VaultPath) => ({ ok: true as const, value: remoteEntries.get(String(path)) ?? absent("remote", String(path)) }),
    listForReconciliation: async () => ({ ok: true as const, value: { entries: [...remoteEntries.values()], completeness: { status: "complete" as const } } }),
    move: async () => { moveCounts.remote += 1; throw new Error("descendant raw REMOTE move must not execute"); },
  };
  return { local, drive };
}

async function run(direction: "local-to-remote" | "remote-to-local") {
  const state = await seededState();
  const loaded = await state.load(context);
  assert.equal(loaded.status, "trusted");
  if (loaded.status !== "trusted") throw new Error("trusted fixture required");
  const parent = loaded.state.base.find(entry => entry.path === vp("old"))!;
  const child = loaded.state.base.find(entry => entry.path === vp("old/child.md"))!;
  const planner = new DeterministicSynchronizationPlanner({ assess: async () => ({ kind: "none" as const }) } as never);
  const plan = await planner.plan({ snapshots: snapshots(direction, parent, child), state: loaded });
  assert.equal(plan.operations.length, 2);
  const [parentMove, carriedChild] = plan.operations;
  assert.equal(parentMove?.kind, "identity-preserving-move");
  assert.equal(parentMove?.fromPath, vp("old"));
  assert.equal(parentMove?.toPath, vp("new"));
  assert.equal(parentMove?.targetSide, direction === "local-to-remote" ? "remote" : "local");
  assert.equal(carriedChild?.kind, "noop");
  assert.equal(carriedChild?.fromPath, vp("old/child.md"));
  assert.equal(carriedChild?.toPath, vp("new/child.md"));
  assert.equal(carriedChild?.reasons[0]?.code, TRANSITIVELY_CARRIED_MOVE_REASON);

  const parentCommit = await new StateCommitCoordinator(state, context).commitVerifiedSuccess(parentMove!, {
    operationId: parentMove!.operationId,
    durable: true,
    integrityVerified: true,
    resultingRemoteObjectId: folderId,
    verificationEvidenceRef: `test-parent:${direction}`,
  });
  assert.equal(parentCommit.status, "committed");

  const afterParent = await state.load(context);
  assert.equal(afterParent.status, "trusted");
  if (afterParent.status !== "trusted") throw new Error("trusted post-parent state required");
  assert.ok(afterParent.state.base.some(entry => entry.path === vp("old/child.md")), "ancestor commit alone must not fabricate descendant canonical rebasing");

  const moveCounts = { local: 0, remote: 0 };
  const ports = convergedPorts(moveCounts);
  const legacy = new ProductSynchronizationExecutor(ports.local, ports.drive as never, state, context, () => ({ managedRemote, remoteEnumerationComplete: true }));
  const authoritative = createAuthoritativeProductExecutor(legacy, state, state, context, managedRemote);
  const coordinator = new AuthorityCompleteExecutionCoordinator(state, authoritative, new StateCommitCoordinator(state, context), state, context);
  const result = await coordinator.executeOperation(carriedChild!);
  assert.equal(result.status, "committed");
  assert.deepEqual(moveCounts, { local: 0, remote: 0 }, "carried descendant must be verified and committed without a second physical move");

  const final = await state.load(context);
  assert.equal(final.status, "trusted");
  if (final.status !== "trusted") throw new Error("trusted final state required");
  assert.ok(!final.state.base.some(entry => entry.path === vp("old/child.md")));
  assert.equal(final.state.base.filter(entry => entry.path === vp("new/child.md") && entry.remoteObjectId === childId).length, 1);
  assert.ok(!final.state.remoteMappings.some(mapping => mapping.path === vp("old/child.md")));
  assert.equal(final.state.remoteMappings.filter(mapping => mapping.path === vp("new/child.md") && mapping.remoteObjectId === childId).length, 1);
}

test("C3-R1 local folder rename propagated to REMOTE completes descendant convergence without duplicate child move", async () => {
  await run("local-to-remote");
});

test("C3-R1 remote folder rename propagated to LOCAL completes descendant convergence without duplicate child move", async () => {
  await run("remote-to-local");
});
