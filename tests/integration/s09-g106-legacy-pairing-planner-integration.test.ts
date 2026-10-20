import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type PathSnapshot, type StateLoadResult, type TrustedSynchronizationState, type VaultPath } from "../../src/contracts";
import { ThreeWayConflictResolver } from "../../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../../src/core/planner";
import { DEFAULT_SETTINGS, PluginDataRepository, pairingStorageKey } from "../../src/product/plugin-data";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore } from "../../src/state/persistent-state-store";

const id = <T extends string>(value: string) => contractId<T>(value);
const path = id<"VaultPath">("unchanged.md") as VaultPath;
const vaultIdentity = id<"VaultIdentity">("vault:shared");
const deviceIdentity = id<"DeviceIdentity">("device:legacy");
const hash = id<"ContentHash">("unchanged-content");
const baseEntry = {
  path, entityKind: "file" as const, localExisted: true, remoteExisted: true,
  content: { hash, revision: "unchanged" },
};

function snapshot(state: StateLoadResult): PathSnapshot {
  const priorBase = state.status === "trusted" ? state.state.base.find(entry => entry.path === path) : undefined;
  return {
    path,
    local: {
      status: "present", side: "local", path, entityKind: "file",
      content: { hash, revision: "unchanged" }, stability: "stable",
    },
    remote: { status: "absent", side: "remote", path },
    base: priorBase ? { status: "trusted", entry: priorBase } : { status: "uninitialized" },
    remoteEnumeration: { status: "complete" },
    identity: { status: "unambiguous" },
  };
}

test("G1-06 trusted R1 BASE cannot become destructive authority over fresh empty R2", async () => {
  const legacy = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: String(deviceIdentity),
    vaultIdentity: String(vaultIdentity),
    remoteRootId: "root:R1",
    pairingStateNamespace: "",
    firstSyncCompleted: false,
  };
  let persisted: unknown = { settings: legacy, audit: [] };
  const settingsRepository = new PluginDataRepository({
    loadData: async () => persisted,
    dataFileExists: async () => true,
    saveData: async value => { persisted = structuredClone(value); },
  });

  // Model IndexedDB persistence by the exact production pairingStorageKey.
  const databases = new Map<string, MemoryStateByteStorage>();
  const storageFor = (settings: Parameters<typeof pairingStorageKey>[1]): MemoryStateByteStorage => {
    const key = pairingStorageKey("brain-google-drive-sync", settings);
    let storage = databases.get(key);
    if (!storage) { storage = new MemoryStateByteStorage(); databases.set(key, storage); }
    return storage;
  };
  const prior: TrustedSynchronizationState = {
    schemaVersion: 1,
    stateRevision: id<"StateRevision">("revision:r1"),
    vaultIdentity,
    deviceIdentity,
    base: [baseEntry],
    remoteMappings: [],
    tombstones: [],
    operations: [],
    knownDevices: [{ deviceId: deviceIdentity, stale: false }],
  };
  const priorStore = new PersistentSynchronizationStateStore(storageFor(legacy));
  assert.equal((await priorStore.saveTrusted(prior)).status, "saved");
  const context = {
    expectation: "new-installation" as const,
    expectedVaultIdentity: vaultIdentity,
    expectedDeviceIdentity: deviceIdentity,
  };
  const oldLoaded = await priorStore.load(context);
  assert.equal(oldLoaded.status, "trusted");

  const planner = new DeterministicSynchronizationPlanner(
    new ThreeWayConflictResolver({ readText: async () => undefined }),
  );
  const wrongPlan = await planner.plan({ snapshots: [snapshot(oldLoaded)], state: oldLoaded });
  assert.equal(wrongPlan.operations[0]?.kind, "trash-local",
    "reusing R1 BASE against empty R2 would incorrectly attest a remote deletion");

  const current = await settingsRepository.loadSettings();
  await assert.rejects(() => settingsRepository.saveSettings({
    ...current, remoteRootId: "root:R2",
  }), /Existing remote pairing/u);
  await assert.rejects(() => settingsRepository.saveSettings({
    ...current, remoteRootId: "root:R2", pairingStateNamespace: "epoch:attempted-bypass",
  }), /Existing remote pairing/u);

  // Only deliberate deauthorization can clear R1; subsequent validated
  // R2 pairing installs a distinct namespace before opening state storage.
  await settingsRepository.saveSettings({
    ...current, remoteRootId: "", pairingStateNamespace: "epoch:deauthorized",
    firstSyncCompleted: false, startupResumeEnabled: false,
    localChangeEnabled: false, periodicEnabled: false,
  });
  const unpaired = await settingsRepository.loadSettings();
  await settingsRepository.saveSettings({
    ...unpaired, remoteRootId: "root:R2", pairingStateNamespace: "epoch:validated-R2",
  });
  const newPair = await settingsRepository.loadSettings();
  const newStateKey = pairingStorageKey("brain-google-drive-sync", newPair);
  const oldStateKey = pairingStorageKey("brain-google-drive-sync", legacy);
  assert.notEqual(newStateKey, oldStateKey);
  assert.notEqual(
    pairingStorageKey("brain-google-drive-sync-text", newPair),
    pairingStorageKey("brain-google-drive-sync-text", legacy),
  );
  const r2Loaded = await new PersistentSynchronizationStateStore(storageFor(newPair)).load(context);
  assert.equal(r2Loaded.status, "uninitialized");
  const safePlan = await planner.plan({ snapshots: [snapshot(r2Loaded)], state: r2Loaded });
  assert.equal(safePlan.operations[0]?.kind, "upload-create",
    "fresh empty remote must be safe-union upload-create, never trash-local");
  assert.equal((await priorStore.load(context)).status, "trusted",
    "historical R1 authority remains preserved under its original key");
});
