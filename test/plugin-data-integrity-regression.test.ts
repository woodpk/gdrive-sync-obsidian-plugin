import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../src/product/plugin-data";

test("G1 existing data.json with null or missing parse result fails closed without overwrite", async () => {
  for (const raw of [null, undefined]) {
    let saves = 0;
    const repository = new PluginDataRepository({
      loadData: async () => raw,
      dataFileExists: async () => true,
      saveData: async () => { saves++; },
    });
    await assert.rejects(() => repository.loadSettings(), /Existing BRAIN data\.json could not be loaded/);
    await assert.rejects(() => repository.saveSettings(DEFAULT_SETTINGS), /Existing BRAIN data\.json could not be loaded/);
    assert.equal(saves, 0);
  }
});

test("G1 existing invalid root shape cannot silently rebaseline plugin data", async () => {
  for (const raw of [[], "malformed", 42, true]) {
    let saves = 0;
    const repository = new PluginDataRepository({
      loadData: async () => raw,
      dataFileExists: async () => true,
      saveData: async () => { saves++; },
    });
    await assert.rejects(() => repository.loadSettings(), /invalid top-level structure/);
    assert.equal(saves, 0);
  }
});

test("G1 fresh installation permits defaults only when data.json is proven absent", async () => {
  let writes = 0;
  let last: unknown;
  const repository = new PluginDataRepository({
    loadData: async () => null,
    dataFileExists: async () => false,
    saveData: async data => { last = structuredClone(data); writes++; },
  });
  assert.equal((await repository.loadSettings()).deviceIdentity, "");
  await repository.saveSettings({ ...DEFAULT_SETTINGS, deviceIdentity: "device:new" });
  assert.equal(writes, 1);
  assert.equal((last as { settings: { deviceIdentity: string } }).settings.deviceIdentity, "device:new");
});

test("G1 existing valid plugin data retains its device identity and custom settings", async () => {
  let last: unknown;
  const existing = {
    settings: { ...DEFAULT_SETTINGS, deviceIdentity: "device:preserved", vaultIdentity: "vault:preserved", remoteRootId: "root:preserved" },
    audit: [],
    diagnostics: { records: [], nextSequence: 99, nextAttemptId: 2 },
    syncAttention: [],
  };
  const repository = new PluginDataRepository({
    loadData: async () => existing,
    dataFileExists: async () => true,
    saveData: async data => { last = structuredClone(data); },
  });
  const settings = await repository.loadSettings();
  assert.equal(settings.deviceIdentity, "device:preserved");
  await repository.saveSettings({ ...settings, localDebounceMs: 2500 });
  const stored = last as typeof existing;
  assert.equal(stored.settings.deviceIdentity, "device:preserved");
  assert.equal(stored.settings.remoteRootId, "root:preserved");
  assert.deepEqual(stored.diagnostics, existing.diagnostics);
});

test("G1 inability to establish data.json absence blocks default initialization", async () => {
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => null,
    dataFileExists: async () => { throw new Error("device storage inaccessible"); },
    saveData: async () => { writes++; },
  });
  await assert.rejects(() => repository.loadSettings(), /device storage inaccessible/);
  assert.equal(writes, 0);
});
