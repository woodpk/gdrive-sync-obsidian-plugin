import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, PluginDataRepository, assertNewPairingAllowed, pairingStorageKey } from "../../src/product/plugin-data";

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


test("G1 existing partial or null settings cannot regenerate identity or overwrite data.json", async () => {
  for (const raw of [
    {},
    { settings: {} },
    { settings: null },
    { settings: { deviceIdentity: "device:survived" } },
    { settings: { deviceIdentity: "device:survived", vaultIdentity: "vault:survived" } },
    { settings: { deviceIdentity: "", vaultIdentity: "", remoteRootId: "", firstSyncCompleted: false } },
    { settings: { deviceIdentity: "device:survived", vaultIdentity: "", remoteRootId: "" } },
    { settings: { deviceIdentity: "device:survived", vaultIdentity: "", remoteRootId: "", firstSyncCompleted: true } },
  ]) {
    let saves = 0;
    const repository = new PluginDataRepository({
      loadData: async () => raw,
      dataFileExists: async () => true,
      saveData: async () => { saves++; },
    });
    await assert.rejects(() => repository.loadSettings(), /Existing BRAIN data\.json .*refusing identity reset/u);
    await assert.rejects(() => repository.saveSettings(DEFAULT_SETTINGS), /refusing identity reset/u);
    assert.equal(saves, 0, "invalid existing data must never be overwritten");
  }
});

test("G1 valid persisted identities survive migration of missing optional settings", async () => {
  let persisted: unknown;
  const repository = new PluginDataRepository({
    loadData: async () => ({
      settings: {
        deviceIdentity: "device:survived",
        vaultIdentity: "vault:survived",
        remoteRootId: "remote:survived",
        firstSyncCompleted: false,
      },
      audit: [{ id: "prior-audit", event: "plan-created", advisoryAtMs: 1 }],
    }),
    dataFileExists: async () => true,
    saveData: async data => { persisted = structuredClone(data); },
  });
  const loaded = await repository.loadSettings();
  assert.equal(loaded.deviceIdentity, "device:survived");
  assert.equal(loaded.vaultIdentity, "vault:survived");
  assert.equal(loaded.remoteRootId, "remote:survived");
  assert.equal(loaded.localDebounceMs, DEFAULT_SETTINGS.localDebounceMs);
  await repository.saveSettings({ ...loaded, localDebounceMs: 2500 });
  const stored = persisted as { settings: { deviceIdentity: string; vaultIdentity: string; remoteRootId: string }; audit: unknown[] };
  assert.equal(stored.settings.deviceIdentity, "device:survived");
  assert.equal(stored.settings.vaultIdentity, "vault:survived");
  assert.equal(stored.settings.remoteRootId, "remote:survived");
  assert.equal(stored.audit.length, 1);
});
test("G1-02 whitespace-only completed-sync identities block all plugin-data writes", async () => {
  const invalidIdentities: ReadonlyArray<readonly [string, string]> = [
    [" ", "root:survived"],
    ["vault:survived", "\t\n"],
    ["\u2003", "root:survived"],
    ["vault:survived", "\u00a0"],
    ["  ", "\u00a0"],
  ];
  for (const [vaultIdentity, remoteRootId] of invalidIdentities) {
    let writes = 0;
    const repository = new PluginDataRepository({
      loadData: async () => ({
        settings: {
          ...DEFAULT_SETTINGS,
          deviceIdentity: "device:survived",
          vaultIdentity,
          remoteRootId,
          firstSyncCompleted: true,
        },
        audit: [{ id: "prior-audit", event: "plan-created", advisoryAtMs: 1 }],
        diagnostics: { records: [], nextSequence: 42, nextAttemptId: 3 },
        syncAttention: [],
      }),
      dataFileExists: async () => true,
      saveData: async () => { writes++; },
    });
    await assert.rejects(() => repository.loadSettings(), /inconsistent completed-sync identity/u);
    await assert.rejects(() => repository.saveSettings({ ...DEFAULT_SETTINGS, deviceIdentity: "device:replacement" }), /inconsistent completed-sync identity/u);
    await assert.rejects(() => repository.save([]), /inconsistent completed-sync identity/u);
    await assert.rejects(() => repository.saveSyncAttention([]), /inconsistent completed-sync identity/u);
    assert.equal(writes, 0, "corrupt completed-sync identity must not be persisted or reset");
  }
});

test("G1-02 legitimate existing pre-pairing identity states remain writable", async () => {
  for (const [vaultIdentity, remoteRootId] of [
    ["", ""],
    ["vault:remembered", ""],
    ["", "root:remembered"],
  ]) {
    let persisted: unknown;
    let writes = 0;
    const repository = new PluginDataRepository({
      loadData: async () => ({
        settings: { deviceIdentity: "device:survived", vaultIdentity, remoteRootId, firstSyncCompleted: false },
        audit: [{ id: "prior-audit", event: "plan-created", advisoryAtMs: 1 }],
      }),
      dataFileExists: async () => true,
      saveData: async data => { persisted = structuredClone(data); writes++; },
    });
    const settings = await repository.loadSettings();
    assert.equal(settings.deviceIdentity, "device:survived");
    assert.equal(settings.vaultIdentity, vaultIdentity);
    assert.equal(settings.remoteRootId, remoteRootId);
    assert.equal(settings.firstSyncCompleted, false);
    await repository.saveSettings({ ...settings, localDebounceMs: 2000 });
    assert.equal(writes, 1);
    const saved = persisted as { settings: typeof settings; audit: unknown[] };
    assert.equal(saved.settings.deviceIdentity, "device:survived");
    assert.equal(saved.settings.vaultIdentity, vaultIdentity);
    assert.equal(saved.settings.remoteRootId, remoteRootId);
    assert.equal(saved.settings.firstSyncCompleted, false);
    assert.equal(saved.audit.length, 1);
  }
});

test("G1-02 valid completed-sync identities survive optional-setting migration", async () => {
  let persisted: unknown;
  const repository = new PluginDataRepository({
    loadData: async () => ({
      settings: {
        deviceIdentity: "device:survived",
        vaultIdentity: "vault:survived",
        remoteRootId: "root:survived",
        firstSyncCompleted: true,
      },
    }),
    dataFileExists: async () => true,
    saveData: async data => { persisted = structuredClone(data); },
  });
  const settings = await repository.loadSettings();
  assert.equal(settings.localDebounceMs, DEFAULT_SETTINGS.localDebounceMs);
  await repository.saveSettings(settings);
  const saved = persisted as { settings: typeof settings };
  assert.equal(saved.settings.deviceIdentity, "device:survived");
  assert.equal(saved.settings.vaultIdentity, "vault:survived");
  assert.equal(saved.settings.remoteRootId, "root:survived");
  assert.equal(saved.settings.firstSyncCompleted, true);
});

test("G1-03 completed pairing cannot be cleared or rebound by settings writes", async () => {
  const initial = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:stable",
    vaultIdentity: "vault:stable",
    remoteRootId: "root:stable",
    firstSyncCompleted: true,
  };
  let stored: unknown = {
    settings: initial,
    audit: [{ id: "prior-audit", event: "plan-created", advisoryAtMs: 1 }],
    diagnostics: { records: [], nextSequence: 7, nextAttemptId: 1 },
    syncAttention: [],
  };
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => stored,
    dataFileExists: async () => true,
    saveData: async data => { stored = structuredClone(data); writes++; },
  });
  const settings = await repository.loadSettings();
  for (const patch of [
    { vaultIdentity: "" },
    { vaultIdentity: " \u2003 " },
    { remoteRootId: "" },
    { remoteRootId: "\t" },
    { deviceIdentity: "" },
  ]) {
    await assert.rejects(
      () => repository.saveSettings({ ...settings, ...patch }),
      /Cannot persist incomplete completed-sync identity/u,
    );
    assert.equal(writes, 0, "invalid UI edit must not write data.json");
  }
  for (const patch of [
    { vaultIdentity: "vault:different" },
    { remoteRootId: "root:different" },
    { deviceIdentity: "device:different" },
  ]) {
    await assert.rejects(
      () => repository.saveSettings({ ...settings, ...patch }),
      /Existing remote pairing/u,
    );
    assert.equal(writes, 0, "completed authority cannot be silently rebound");
  }
  await repository.save([{ id: "retained-audit", event: "plan-created", advisoryAtMs: 2 }]);
  assert.equal(writes, 1);
  const recovered = (stored as { settings: typeof initial; diagnostics: unknown; audit: unknown[] }).settings;
  assert.equal(recovered.vaultIdentity, initial.vaultIdentity);
  assert.equal(recovered.remoteRootId, initial.remoteRootId);
  assert.equal(recovered.deviceIdentity, initial.deviceIdentity);
  assert.equal(recovered.firstSyncCompleted, true);
  assert.deepEqual((stored as { diagnostics: unknown }).diagnostics, { records: [], nextSequence: 7, nextAttemptId: 1 });
  const restart = new PluginDataRepository({
    loadData: async () => stored,
    dataFileExists: async () => true,
    saveData: async () => { writes++; },
  });
  assert.equal((await restart.loadSettings()).firstSyncCompleted, true, "a rejected UI edit must leave restart viable");
});

test("G1-03 deliberate deauthorization and re-pairing reset authority before clearing IDs", async () => {
  let stored: unknown = {
    settings: {
      ...DEFAULT_SETTINGS,
      deviceIdentity: "device:stable",
      vaultIdentity: "vault:stable",
      remoteRootId: "root:stable",
      firstSyncCompleted: true,
    },
  };
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => stored,
    dataFileExists: async () => true,
    saveData: async data => { stored = structuredClone(data); writes++; },
  });
  const paired = await repository.loadSettings();
  await repository.saveSettings({
    ...paired, remoteRootId: "", pairingStateNamespace: "pairing-test-deauth", firstSyncCompleted: false,
    startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
  });
  const afterDeauth = await repository.loadSettings();
  assert.equal(afterDeauth.firstSyncCompleted, false);
  assert.equal(afterDeauth.remoteRootId, "");
  assert.equal(afterDeauth.deviceIdentity, paired.deviceIdentity);
  await repository.saveSettings({ ...afterDeauth, vaultIdentity: "vault:repaired", remoteRootId: "root:repaired", pairingStateNamespace: "pairing-test-repaired" });
  await repository.saveSettings({ ...await repository.loadSettings(), firstSyncCompleted: true });
  const restart = new PluginDataRepository({
    loadData: async () => stored,
    dataFileExists: async () => true,
    saveData: async () => { writes++; },
  });
  const reloaded = await restart.loadSettings();
  assert.equal(reloaded.firstSyncCompleted, true);
  assert.equal(reloaded.deviceIdentity, "device:stable");
  assert.equal(reloaded.vaultIdentity, "vault:repaired");
  assert.equal(reloaded.remoteRootId, "root:repaired");
  assert.equal(writes, 3);
});

test("G1-04 completed pairing refuses new remote actions until deauthorization", () => {
  const completed = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:established",
    vaultIdentity: "vault:established",
    remoteRootId: "root:established",
    firstSyncCompleted: true,
  };
  assert.throws(() => assertNewPairingAllowed(completed), /Deauthorize the existing remote pairing/u);
  assert.throws(() => assertNewPairingAllowed({ ...completed, firstSyncCompleted: false }), /Deauthorize the existing remote pairing/u);
  assert.doesNotThrow(() => assertNewPairingAllowed({ ...completed, remoteRootId: "", firstSyncCompleted: false }));
});

test("G1-04 deauthorization and re-pairing cannot reuse legacy trusted state or text namespace", async () => {
  let onDisk: unknown = {
    settings: {
      ...DEFAULT_SETTINGS,
      deviceIdentity: "device:stable",
      vaultIdentity: "vault:stable",
      remoteRootId: "root:old",
      firstSyncCompleted: true,
      startupResumeEnabled: true,
      localChangeEnabled: true,
      periodicEnabled: true,
    },
  };
  const repository = new PluginDataRepository({
    loadData: async () => onDisk,
    dataFileExists: async () => true,
    saveData: async next => { onDisk = structuredClone(next); },
  });
  const legacy = await repository.loadSettings();
  const oldState = pairingStorageKey("brain-google-drive-sync", legacy);
  const oldText = pairingStorageKey("brain-google-drive-sync-text", legacy);
  assert.equal(oldState, "brain-google-drive-sync:vault:stable:device:stable");
  assert.equal(oldText, "brain-google-drive-sync-text:vault:stable:device:stable");
  await assert.rejects(() => repository.saveSettings({
    ...legacy, remoteRootId: "", firstSyncCompleted: false,
    startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
  }), /Existing remote pairing/u);
  const unpaired = {
    ...legacy, remoteRootId: "", pairingStateNamespace: "pairing-deauth-1",
    firstSyncCompleted: false, startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
  };
  await repository.saveSettings(unpaired);
  const newPair = {
    ...unpaired,
    remoteRootId: "root:new",
    pairingStateNamespace: "pairing-paired-2",
  };
  await repository.saveSettings(newPair);
  for (const prefix of ["brain-google-drive-sync", "brain-google-drive-sync-text"] as const) {
    const previous = pairingStorageKey(prefix, legacy);
    const replacement = pairingStorageKey(prefix, newPair);
    assert.notEqual(replacement, previous, "fresh remote must not read legacy trusted BASE");
    assert.notEqual(pairingStorageKey(prefix, { ...newPair, remoteRootId: "root:other" }), replacement, "namespace must also bind remote root");
    assert.notEqual(pairingStorageKey(prefix, { ...newPair, pairingStateNamespace: "pairing-next-3" }), replacement, "explicit re-pair must isolate state");
  }
  await repository.saveSettings({ ...newPair, firstSyncCompleted: true });
  const resumed = new PluginDataRepository({
    loadData: async () => onDisk,
    dataFileExists: async () => true,
    saveData: async () => { throw new Error("unexpected write"); },
  });
  assert.equal((await resumed.loadSettings()).remoteRootId, "root:new");
});

test("G1-05 failed deauthorization cannot be committed by later audit, diagnostics or attention writes", async () => {
  const initial = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:stable",
    vaultIdentity: "vault:stable",
    remoteRootId: "root:stable",
    firstSyncCompleted: true,
    localChangeEnabled: true,
  };
  let persisted: unknown = {
    settings: initial,
    audit: [{ id: "prior-audit", event: "plan-created", advisoryAtMs: 1 }],
    diagnostics: { records: [], nextSequence: 7, nextAttemptId: 3 },
    syncAttention: [],
  };
  let attempts = 0;
  const repository = new PluginDataRepository({
    loadData: async () => persisted,
    dataFileExists: async () => true,
    saveData: async next => {
      attempts++;
      if (attempts === 1) throw new Error("injected storage failure");
      persisted = structuredClone(next);
    },
  });
  const before = await repository.loadSettings();
  await assert.rejects(() => repository.saveSettings({
    ...before, remoteRootId: "", firstSyncCompleted: false,
    pairingStateNamespace: "pairing-failed",
    startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
  }), /injected storage failure/u);
  assert.deepEqual(await repository.loadSettings(), before, "failed save must leave cached authority unchanged");
  // Storage still equals the last confirmed document: unrelated writers may recover safely.
  await repository.save([{ id: "after-failure-audit", event: "plan-created", advisoryAtMs: 2 }]);
  await repository.saveDiagnostics({ records: [], nextSequence: 8, nextAttemptId: 4 });
  await repository.saveSyncAttention([]);
  assert.equal(attempts, 4, "reconciled recovery must permit subsequent metadata writes");
  const actual = persisted as { settings: typeof initial; audit: Array<{ id: string }>; diagnostics: { nextSequence: number } };
  assert.equal(actual.settings.remoteRootId, "root:stable");
  assert.equal(actual.settings.firstSyncCompleted, true);
  assert.equal(actual.settings.pairingStateNamespace, "");
  assert.equal(actual.audit[0]?.id, "after-failure-audit");
  assert.equal(actual.diagnostics.nextSequence, 8);
  const restarted = new PluginDataRepository({
    loadData: async () => persisted,
    dataFileExists: async () => true,
    saveData: async () => { throw new Error("unexpected write"); },
  });
  assert.equal((await restarted.loadSettings()).firstSyncCompleted, true);
});

test("G1-05 failed save that altered disk blocks every later persistence writer", async () => {
  const initial = {
    ...DEFAULT_SETTINGS, deviceIdentity: "device:stable",
    vaultIdentity: "vault:stable", remoteRootId: "root:stable",
    firstSyncCompleted: true,
  };
  let disk: unknown = { settings: initial, audit: [], syncAttention: [] };
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async payload => {
      writes++;
      disk = structuredClone(payload);
      throw new Error("saveData threw after mutation");
    },
  });
  const baseline = await repository.loadSettings();
  await assert.rejects(
    () => repository.saveSettings({
      ...baseline, remoteRootId: "", firstSyncCompleted: false,
      pairingStateNamespace: "pairing-uncertain",
      startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
    }),
    /saveData threw after mutation/u,
  );
  assert.deepEqual(await repository.loadSettings(), baseline, "unconfirmed write does not become cached authority");
  await assert.rejects(() => repository.save([{ id: "audit", event: "plan-created", advisoryAtMs: 1 }]), /save is uncertain/u);
  await assert.rejects(() => repository.saveDiagnostics({ records: [], nextSequence: 1, nextAttemptId: 1 }), /save is uncertain/u);
  await assert.rejects(() => repository.saveSyncAttention([]), /save is uncertain/u);
  assert.equal(writes, 1, "a failed but physically applied write must not be followed by an implicit overwrite");
});

test("G1-05 unreadable post-failure storage remains blocked", async () => {
  let readable = true;
  const repository = new PluginDataRepository({
    loadData: async () => {
      if (!readable) throw new Error("adapter read unavailable");
      return { settings: { deviceIdentity: "device:stable", vaultIdentity: "", remoteRootId: "", firstSyncCompleted: false } };
    },
    dataFileExists: async () => true,
    saveData: async () => { readable = false; throw new Error("disk write failed"); },
  });
  const baseline = await repository.loadSettings();
  await assert.rejects(() => repository.saveSettings({ ...baseline, oauthClientId: "changed" }), /disk write failed/u);
  await assert.rejects(() => repository.save([]), /save is uncertain/u);
});

test("G1-05 concurrent successful writes serialize without losing other persistence sections", async () => {
  let disk: unknown = {
    settings: { ...DEFAULT_SETTINGS, deviceIdentity: "device:stable", vaultIdentity: "", remoteRootId: "", firstSyncCompleted: false },
    audit: [],
  };
  const repository = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async payload => { await Promise.resolve(); disk = structuredClone(payload); },
  });
  const settings = await repository.loadSettings();
  await Promise.all([
    repository.saveSettings({ ...settings, localDebounceMs: 2800 }),
    repository.save([{ id: "concurrent-audit", event: "plan-created", advisoryAtMs: 3 }]),
    repository.saveDiagnostics({ records: [], nextSequence: 9, nextAttemptId: 5 }),
  ]);
  const durable = disk as { settings: typeof settings; audit: unknown[]; diagnostics: { nextSequence: number } };
  assert.equal(durable.settings.localDebounceMs, 2800);
  assert.equal(durable.audit.length, 1);
  assert.equal(durable.diagnostics.nextSequence, 9);
});

test("G1-06 legacy incomplete remote cannot change root or vault before deauthorization", async () => {
  const original = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:legacy",
    vaultIdentity: "vault:legacy",
    remoteRootId: "root:R1",
    firstSyncCompleted: false,
    pairingStateNamespace: "",
  };
  let disk: unknown = { settings: original, audit: [] };
  let writes = 0;
  const repository = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async value => { disk = structuredClone(value); writes++; },
  });
  const existing = await repository.loadSettings();
  for (const malicious of [
    { ...existing, remoteRootId: "root:R2" },
    { ...existing, remoteRootId: "root:R2", pairingStateNamespace: "rotated-without-deauthorize" },
    { ...existing, vaultIdentity: "vault:other" },
    { ...existing, pairingStateNamespace: "rotated-same-root" },
  ]) {
    await assert.rejects(() => repository.saveSettings(malicious), /Existing remote pairing/u);
  }
  await assert.rejects(
    () => repository.patchSettings({ remoteRootId: "root:R2" }),
    /Existing remote pairing/u,
  );
  assert.equal(writes, 0);
  assert.throws(() => assertNewPairingAllowed(existing), /Deauthorize the existing remote pairing/u);

  await repository.saveSettings({
    ...existing, remoteRootId: "", pairingStateNamespace: "epoch:deauthorized",
    startupResumeEnabled: false, localChangeEnabled: false, periodicEnabled: false,
  });
  const deauthorized = await repository.loadSettings();
  assert.doesNotThrow(() => assertNewPairingAllowed(deauthorized));
  await assert.rejects(
    () => repository.saveSettings({ ...deauthorized, remoteRootId: "root:R2" }),
    /fresh isolated state/u,
  );
  await repository.saveSettings({
    ...deauthorized, remoteRootId: "root:R2", pairingStateNamespace: "epoch:validated-R2",
  });
  const paired = await repository.loadSettings();
  assert.notEqual(
    pairingStorageKey("brain-google-drive-sync", paired),
    pairingStorageKey("brain-google-drive-sync", existing),
  );
  assert.notEqual(
    pairingStorageKey("brain-google-drive-sync-text", paired),
    pairingStorageKey("brain-google-drive-sync-text", existing),
  );
  assert.equal(writes, 2);
});

test("G1-06 empty-root legacy state cannot be silently rebound to old state keys", async () => {
  let disk: unknown = {
    settings: {
      ...DEFAULT_SETTINGS,
      deviceIdentity: "device:legacy",
      vaultIdentity: "vault:legacy",
      remoteRootId: "",
      pairingStateNamespace: "",
      firstSyncCompleted: false,
    },
  };
  const repo = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async value => { disk = structuredClone(value); },
  });
  const legacy = await repo.loadSettings();
  await assert.rejects(
    () => repo.saveSettings({ ...legacy, remoteRootId: "root:new" }),
    /fresh isolated state/u,
  );
  await repo.saveSettings({ ...legacy, remoteRootId: "root:new", pairingStateNamespace: "epoch:fresh" });
  const current = await repo.loadSettings();
  assert.notEqual(pairingStorageKey("brain-google-drive-sync", current), pairingStorageKey("brain-google-drive-sync", legacy));
});

test("G1-07 competing settings patches commit both fields from the latest durable snapshot", async () => {
  let disk: unknown = {
    settings: { ...DEFAULT_SETTINGS, deviceIdentity: "device:stable", firstSyncCompleted: false },
    audit: [],
  };
  const repo = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async value => { await Promise.resolve(); disk = structuredClone(value); },
  });
  await repo.loadSettings();
  await Promise.all([
    repo.patchSettings({ localDebounceMs: 2900 }),
    repo.patchSettings({ diagnosticConsoleMirror: true }),
    repo.patchSettings({ periodicIntervalMinutes: 31 }),
  ]);
  const settings = await repo.loadSettings();
  assert.equal(settings.localDebounceMs, 2900);
  assert.equal(settings.diagnosticConsoleMirror, true);
  assert.equal(settings.periodicIntervalMinutes, 31);
  const restart = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async () => { throw new Error("unexpected write"); },
  });
  const durable = await restart.loadSettings();
  assert.equal(durable.localDebounceMs, 2900);
  assert.equal(durable.diagnosticConsoleMirror, true);
  assert.equal(durable.periodicIntervalMinutes, 31);
});

test("G1-07 rejected runtime mutation cannot leak into later UI patch or restart", async () => {
  const initial = {
    ...DEFAULT_SETTINGS, deviceIdentity: "device:mutation",
    vaultIdentity: "vault:mutation", remoteRootId: "root:mutation",
    firstSyncCompleted: true, periodicEnabled: true, scopeReconcileRequired: true,
  };
  let disk: unknown = { settings: initial, audit: [] };
  let writes = 0;
  const repo = new PluginDataRepository({
    loadData: async () => disk, dataFileExists: async () => true,
    saveData: async next => {
      writes++;
      if (writes === 1) throw new Error("injected failed-before-write runtime transition");
      disk = structuredClone(next);
    },
  });
  await repo.loadSettings();
  await assert.rejects(
    () => repo.mutateSettings(latest => ({ ...latest, scopeReconcileRequired: false })),
    /injected failed-before-write/u,
  );
  await repo.patchSettings({ periodicEnabled: false });
  const restarted = new PluginDataRepository({
    loadData: async () => disk, dataFileExists: async () => true,
    saveData: async () => { throw new Error("unexpected restart write"); },
  });
  const current = await restarted.loadSettings();
  assert.equal(current.scopeReconcileRequired, true, "failed runtime update must stay rejected");
  assert.equal(current.periodicEnabled, false, "subsequent UI edit must persist independently");
  assert.equal(writes, 2);
});

test("G1-07 uncertain runtime mutation blocks subsequent settings patches", async () => {
  let disk: unknown = { settings: {
    ...DEFAULT_SETTINGS, deviceIdentity: "device:uncertain", vaultIdentity: "vault:uncertain",
    remoteRootId: "root:uncertain", firstSyncCompleted: true,
    scopeReconcileRequired: true,
  } };
  let writes = 0;
  const repo = new PluginDataRepository({
    loadData: async () => disk, dataFileExists: async () => true,
    saveData: async next => {
      writes++;
      disk = structuredClone(next);
      throw new Error("injected failed-after-write runtime transition");
    },
  });
  await repo.loadSettings();
  await assert.rejects(
    () => repo.mutateSettings(latest => ({ ...latest, scopeReconcileRequired: false })),
    /injected failed-after-write/u,
  );
  await assert.rejects(
    () => repo.patchSettings({ periodicIntervalMinutes: 47 }),
    /save is uncertain/u,
  );
  assert.equal(writes, 1, "uncertain runtime write must not be overwritten by a later UI edit");
});
