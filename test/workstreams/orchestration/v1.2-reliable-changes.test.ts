import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type ChangeCursor,
  type DeviceIdentity,
  type GoogleDrivePort,
  type LocalVaultPort,
  type ManagedRemoteIdentity,
  type ReliableRemoteChangePort,
  type RemoteObjectId,
  type StateLoadContext,
  type StateRevision,
  type SynchronizationStateStore,
  type TrustedSynchronizationState,
  type VaultIdentity,
  type VaultPath,
} from "../../../src/contracts";
import { ProductSnapshotAssembler, SnapshotAssemblyError } from "../../../src/product/snapshot-assembler";

const id = <T extends string>(value: string) => contractId<T>(value);
const cursor = (value: string) => id<"ChangeCursor">(value) as ChangeCursor;
const path = (value: string) => id<"VaultPath">(value) as VaultPath;
const remoteId = (value: string) => id<"RemoteObjectId">(value) as RemoteObjectId;
const identity: ManagedRemoteIdentity = {
  rootId: remoteId("root"),
  vaultIdentity: id<"VaultIdentity">("vault") as VaultIdentity,
  protocolVersion: id<"ProtocolVersion">("1"),
};
const context: StateLoadContext = {
  expectation: "existing-pairing",
  expectedVaultIdentity: identity.vaultIdentity,
  expectedDeviceIdentity: id<"DeviceIdentity">("device") as DeviceIdentity,
};

function trustedState(): TrustedSynchronizationState {
  return {
    schemaVersion: 1,
    stateRevision: id<"StateRevision">("state:1") as StateRevision,
    vaultIdentity: identity.vaultIdentity,
    deviceIdentity: context.expectedDeviceIdentity!,
    base: [{ path: path("old.md"), entityKind: "file", localExisted: false, remoteExisted: true, remoteObjectId: remoteId("old") }],
    remoteMappings: [{ path: path("old.md"), entityKind: "file", remoteObjectId: remoteId("old") }],
    tombstones: [],
    changeCursor: cursor("cursor:0"),
    operations: [],
    knownDevices: [],
  };
}

function local(): LocalVaultPort {
  return {
    enumerate: async () => ({ entries: [], completeness: { status: "complete" } }),
  } as unknown as LocalVaultPort;
}

function drive(): GoogleDrivePort {
  return {
    validateManagedRoot: async () => ({ ok: true, value: { status: "valid", identity } }),
    readChanges: async () => { throw new Error("legacy cursor-collapsing readChanges must never be called"); },
    getStartCursor: async () => ({ ok: true, value: cursor("full:cursor") }),
    listForReconciliation: async () => ({ ok: true, value: { entries: [], completeness: { status: "complete" } } }),
  } as unknown as GoogleDrivePort;
}

function stateStore(state = trustedState()): SynchronizationStateStore & { saves: number } {
  return {
    saves: 0,
    load: async () => ({ status: "trusted", state }),
    saveTrusted: async function () { this.saves += 1; return { status: "saved", stateRevision: state.stateRevision }; },
  } as unknown as SynchronizationStateStore & { saves: number };
}

function assembler(changes: ReliableRemoteChangePort, state = stateStore()): ProductSnapshotAssembler {
  return new ProductSnapshotAssembler(local(), drive(), state, context, async () => identity, () => true, () => false, undefined, changes);
}

test("D reliable Changes traversal retains prior-page removals and exposes only terminal newStartPageToken", async () => {
  const calls: string[] = [];
  const changes: ReliableRemoteChangePort = {
    async readChangePage(_identity, requestedToken) {
      calls.push(String(requestedToken));
      if (requestedToken === cursor("cursor:0")) return {
        ok: true,
        value: {
          kind: "intermediate",
          requestedToken,
          changes: [{ kind: "removed", remoteObjectId: remoteId("old"), lastKnownPath: path("old.md") }],
          nextPageToken: cursor("cursor:page-2"),
        },
      };
      assert.equal(requestedToken, cursor("cursor:page-2"));
      return {
        ok: true,
        value: {
          kind: "terminal",
          requestedToken,
          changes: [{ kind: "upsert", entry: { path: path("new.md"), entityKind: "file", remoteObjectId: remoteId("new"), trashed: false } }],
          newStartPageToken: cursor("cursor:terminal"),
        },
      };
    },
  };
  const result = await assembler(changes).assemble(true);
  assert.equal(result.mode, "incremental");
  assert.equal(result.nextCursor, cursor("cursor:terminal"), "intermediate nextPageToken is never durable cursor authority");
  assert.deepEqual(calls, ["cursor:0", "cursor:page-2"]);
  const oldSnapshot = result.input.snapshots.find(snapshot => snapshot.path === path("old.md"));
  const newSnapshot = result.input.snapshots.find(snapshot => snapshot.path === path("new.md"));
  assert.equal(oldSnapshot?.remote.status, "absent", "removal learned on an earlier page must survive terminal assembly");
  assert.equal(newSnapshot?.remote.status, "present");
});

test("D failure before terminal Changes page cannot advance durable cursor authority", async () => {
  const state = stateStore();
  const changes: ReliableRemoteChangePort = {
    async readChangePage(_identity, requestedToken) {
      if (requestedToken === cursor("cursor:0")) return {
        ok: true,
        value: { kind: "intermediate", requestedToken, changes: [], nextPageToken: cursor("cursor:not-durable") },
      };
      return { ok: false, signal: { kind: "transient-failure", detail: "page-2-failed" } };
    },
  };
  await assert.rejects(() => assembler(changes, state).assemble(true), (error: unknown) => {
    assert.ok(error instanceof SnapshotAssemblyError);
    assert.equal(error.code, "transient-failure");
    return true;
  });
  assert.equal(state.saves, 0, "snapshot ingestion never persists an intermediate page token");
});

test("D absence of ReliableRemoteChangePort falls back to full reconciliation instead of legacy readChanges", async () => {
  const result = await new ProductSnapshotAssembler(local(), drive(), stateStore(), context, async () => identity).assemble(true);
  assert.equal(result.mode, "full");
  assert.equal(result.nextCursor, cursor("full:cursor"));
});
