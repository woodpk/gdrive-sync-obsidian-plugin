import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type DeviceIdentity,
  type OperationId,
  type PlannedOperation,
  type StateRevision,
  type VaultIdentity,
  type VaultPath,
} from "../src/contracts";
import { StateCommitCoordinator } from "../src/core/commit-coordinator";
import {
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
  type StateByteStorage,
  createInitialTrustedState,
} from "../src/state/persistent-state-store";

const vault = contractId<"VaultIdentity">("vault-hardening") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device-hardening") as DeviceIdentity;
const path = contractId<"VaultPath">("10-Notes/deleted.md") as VaultPath;
const rev = (value: number) => contractId<"StateRevision">(`state-${value}`) as StateRevision;

class RacingStorage implements StateByteStorage {
  readonly backing = new MemoryStateByteStorage();
  beforeCompare?: () => Promise<void>;
  read(): Promise<Uint8Array | undefined> { return this.backing.read(); }
  write(bytes: Uint8Array): Promise<void> { return this.backing.write(bytes); }
  backup(bytes: Uint8Array): Promise<string> { return this.backing.backup(bytes); }
  async compareAndSwap(expected: Uint8Array | undefined, replacement: Uint8Array): Promise<boolean> {
    const hook = this.beforeCompare;
    this.beforeCompare = undefined;
    if (hook) await hook();
    return this.backing.compareAndSwap(expected, replacement);
  }
}

test("atomic compare-and-swap detects a writer that changes state after the caller reads it", async () => {
  const storage = new RacingStorage();
  const first = new PersistentSynchronizationStateStore(storage);
  const second = new PersistentSynchronizationStateStore(storage);
  const initial = createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device });
  assert.equal((await first.saveTrusted(initial)).status, "saved");

  storage.beforeCompare = async () => {
    const competing = { ...initial, stateRevision: rev(2) };
    const result = await second.saveTrusted(competing, rev(1));
    assert.equal(result.status, "saved");
  };

  const attempted = { ...initial, stateRevision: rev(3) };
  const result = await first.saveTrusted(attempted, rev(1));
  assert.equal(result.status, "stale-revision");
  if (result.status === "stale-revision") assert.equal(result.actualRevision, rev(2));
});

test("verified both-deleted transition removes prior base and records a durable both-side tombstone", async () => {
  const storage = new MemoryStateByteStorage();
  const store = new PersistentSynchronizationStateStore(storage);
  const initial = {
    ...createInitialTrustedState({ stateRevision: rev(1), vaultIdentity: vault, deviceIdentity: device }),
    base: [{ path, entityKind: "file" as const, localExisted: true, remoteExisted: true, content: { revision: "base" } }],
  };
  assert.equal((await store.saveTrusted(initial)).status, "saved");

  const operationId = contractId<"OperationId">("both-deleted") as OperationId;
  const operation: PlannedOperation = {
    operationId,
    kind: "noop",
    path,
    destructive: false,
    preconditions: [
      { kind: "base-trusted" },
      { kind: "path-observation", side: "local", path, expected: "absent" },
      { kind: "path-observation", side: "remote", path, expected: "absent" },
      { kind: "remote-enumeration-complete" },
    ],
    reasons: [{ code: "both-deleted", summary: "trusted both-side deletion" }],
  };
  const coordinator = new StateCommitCoordinator(store, { expectation: "existing-pairing", expectedVaultIdentity: vault, expectedDeviceIdentity: device });
  const committed = await coordinator.commitVerifiedSuccess(operation, { operationId, durable: true, integrityVerified: true, verificationEvidenceRef: "absence-verified" }, rev(1));
  assert.equal(committed.status, "committed");

  const loaded = await store.load({ expectation: "existing-pairing" });
  assert.equal(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    assert.equal(loaded.state.base.length, 0);
    assert.equal(loaded.state.tombstones.length, 1);
    assert.equal(loaded.state.tombstones[0].path, path);
    assert.equal(loaded.state.tombstones[0].deletedOn, "both");
  }
});
