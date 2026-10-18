import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import test from "node:test";
import { contractId, type ManagedRemoteIdentity } from "../../src/contracts";
import { DEFAULT_SETTINGS, PluginDataRepository, pairingStorageKey, type BrainSyncSettings } from "../../src/product/plugin-data";

function deferred<T>() {
  let release!: (value: T) => void;
  const promise = new Promise<T>(resolve => { release = resolve; });
  return { promise, release };
}

async function hostFixture() {
  const location = ".test-build/node_modules/obsidian";
  mkdirSync(location, { recursive: true });
  writeFileSync(location + "/index.js",
    'class Notice { constructor(message) { this.message = message; } }\n' +
    'module.exports = { Notice, Platform: { isDesktopApp: false, isMobile: true }, requestUrl: async () => { throw new Error("Real provider access prohibited"); } };\n',
    "utf8");
  const { ProductRuntime } = await import("../../src/product/runtime");
  const initial: BrainSyncSettings = {
    ...DEFAULT_SETTINGS,
    deviceIdentity: "device:stable",
    vaultIdentity: "vault:stable",
    remoteRootId: "",
    pairingStateNamespace: "epoch:pre-pair",
    firstSyncCompleted: false,
    oauthClientId: "client",
    oauthRedirectUri: "https://example.invalid/callback",
  };
  let disk: unknown = { settings: initial };
  const repository = new PluginDataRepository({
    loadData: async () => disk,
    dataFileExists: async () => true,
    saveData: async next => { disk = structuredClone(next); },
  });
  let current = await repository.loadSettings();
  const host = {
    app: {} as never, plugin: {} as never, data: repository,
    settings: () => current,
    mutateSettings: async (change: (latest: BrainSyncSettings) => BrainSyncSettings) => {
      current = await repository.mutateSettings(change);
      return current;
    },
    notify: () => undefined,
  };
  return {
    runtime: new ProductRuntime(host), host, repository,
    current: () => current, disk: () => disk,
  };
}

function identity(root: string, vault = "vault:stable"): ManagedRemoteIdentity {
  return {
    rootId: contractId<"RemoteObjectId">(root),
    vaultIdentity: contractId<"VaultIdentity">(vault),
    protocolVersion: contractId<"ProtocolVersion">("1"),
  };
}

test("F02-01/AUTH-012: delayed Pair response after deauthorization cannot relink prior authority or reuse state namespace", async () => {
  const h = await hostFixture();
  const pending = deferred<{ ok: true; value: { status: "valid"; identity: ManagedRemoteIdentity } }>();
  let tokensCleared = 0;
  Object.assign(h.runtime as unknown as Record<string, unknown>, {
    boundary: {
      oauth: { clearTokens: () => { tokensCleared++; }, retirePendingOperations: () => undefined },
      drive: { pairManagedRoot: async () => pending.promise },
    },
  });
  const oldNamespaceKey = pairingStorageKey("brain-google-drive-sync", h.current());
  const stale = h.runtime.pairManagedRemote("root:old-request");
  await h.runtime.deauthorize();
  assert.ok(tokensCleared > 0);
  assert.equal(h.current().remoteRootId, "");
  const afterUnpairKey = pairingStorageKey("brain-google-drive-sync", h.current());
  assert.notEqual(afterUnpairKey, oldNamespaceKey, "deauthorization rotates the pairing epoch before a stale provider result");
  pending.release({ ok: true, value: { status: "valid", identity: identity("root:old-request") } });
  await assert.rejects(stale, /different pairing/u);
  assert.equal(h.current().remoteRootId, "");
  assert.equal(pairingStorageKey("brain-google-drive-sync", h.current()), afterUnpairKey);
  const restart = new PluginDataRepository({
    loadData: async () => h.disk(), dataFileExists: async () => true,
    saveData: async () => { throw new Error("read-only restart"); },
  });
  assert.equal((await restart.loadSettings()).remoteRootId, "");
});

test("F02-01/REM-003: delayed Create response after deauthorization cannot silently publish its new remote root", async () => {
  const h = await hostFixture();
  const pending = deferred<{ ok: true; value: ManagedRemoteIdentity }>();
  let created = 0;
  Object.assign(h.runtime as unknown as Record<string, unknown>, {
    boundary: {
      oauth: { clearTokens: () => undefined, retirePendingOperations: () => undefined },
      drive: { createManagedRoot: async () => { created++; return pending.promise; } },
    },
  });
  const priorKey = pairingStorageKey("brain-google-drive-sync-text", h.current());
  const staleCreate = h.runtime.createManagedRemote();
  assert.equal(created, 1);
  await h.runtime.deauthorize();
  pending.release({ ok: true, value: identity("root:provider-created") });
  await assert.rejects(staleCreate, /different pairing/u);
  assert.equal(h.current().remoteRootId, "");
  assert.notEqual(pairingStorageKey("brain-google-drive-sync-text", h.current()), priorKey);
  const restart = new PluginDataRepository({
    loadData: async () => h.disk(), dataFileExists: async () => true,
    saveData: async () => { throw new Error("read-only restart"); },
  });
  assert.equal((await restart.loadSettings()).remoteRootId, "");
});

test("F02-01/STATE-008: a new explicit Pair after stale result gets a fresh state and text namespace", async () => {
  const h = await hostFixture();
  const pending = deferred<{ ok: true; value: { status: "valid"; identity: ManagedRemoteIdentity } }>();
  Object.assign(h.runtime as unknown as Record<string, unknown>, {
    boundary: {
      oauth: { clearTokens: () => undefined, retirePendingOperations: () => undefined },
      drive: { pairManagedRoot: async () => pending.promise },
    },
  });
  const stale = h.runtime.pairManagedRemote("root:retired");
  await h.runtime.deauthorize();
  pending.release({ ok: true, value: { status: "valid", identity: identity("root:retired") } });
  await assert.rejects(stale, /different pairing/u);

  const retiredEpoch = h.current().pairingStateNamespace;
  const remoteKey = pairingStorageKey("brain-google-drive-sync", h.current());
  const textKey = pairingStorageKey("brain-google-drive-sync-text", h.current());
  let initialized = 0;
  Object.assign(h.runtime as unknown as Record<string, unknown>, {
    // Real managed-remote validation and durable settings mutations are exercised.
    // Adapter initialization is a separate covered lifecycle seam.
    initialize: async () => { initialized++; },
    boundary: {
      oauth: { clearTokens: () => undefined, retirePendingOperations: () => undefined },
      drive: {
        pairManagedRoot: async () => ({ ok: true as const, value: {
          status: "valid" as const, identity: identity("root:fresh"),
        } }),
      },
    },
  });
  const accepted = await h.runtime.pairManagedRemote("root:fresh");
  assert.equal(String(accepted.rootId), "root:fresh");
  assert.equal(initialized, 1);
  assert.equal(h.current().remoteRootId, "root:fresh");
  assert.notEqual(h.current().pairingStateNamespace, retiredEpoch);
  assert.notEqual(pairingStorageKey("brain-google-drive-sync", h.current()), remoteKey);
  assert.notEqual(pairingStorageKey("brain-google-drive-sync-text", h.current()), textKey);
  assert.equal(h.current().firstSyncCompleted, false);
  assert.equal(h.current().startupResumeEnabled, false);
  assert.equal(h.current().localChangeEnabled, false);
  assert.equal(h.current().periodicEnabled, false);
});

test("G1-07/PLAN-005: stale reconciliation callback cannot clear a newer exclusion-policy generation in either ordering", async () => {
  for (const userEditsFirst of [true, false]) {
    const h = await hostFixture();
    await h.host.mutateSettings(latest => ({
      ...latest,
      remoteRootId: "root:policy",
      pairingStateNamespace: "epoch:policy",
      scopeReconcileRequired: true,
      scopeReconcileGeneration: 5,
      startupResumeEnabled: false,
      localChangeEnabled: false,
      periodicEnabled: false,
    }));
    const expected = {
      deviceIdentity: h.current().deviceIdentity,
      vaultIdentity: h.current().vaultIdentity,
      remoteRootId: h.current().remoteRootId,
      pairingStateNamespace: h.current().pairingStateNamespace,
    };
    const staleCompletion = () =>
      (h.runtime as unknown as { completeFullReconciliation(
        pairing: typeof expected, generation: number,
      ): Promise<void> }).completeFullReconciliation(expected, 5);
    const policyEdit = () => h.host.mutateSettings(latest => ({
      ...latest,
      userExclusionPatterns: ["private/**"],
      scopeReconcileRequired: true,
      scopeReconcileGeneration: 6,
    }));
    if (userEditsFirst) {
      await policyEdit();
      await staleCompletion();
    } else {
      await staleCompletion();
      await policyEdit();
    }
    assert.equal(h.current().scopeReconcileGeneration, 6);
    assert.equal(h.current().scopeReconcileRequired, true,
      "older callback cannot declare a newer exclusion policy fully reconciled");
    const reboot = new PluginDataRepository({
      loadData: async () => h.disk(), dataFileExists: async () => true,
      saveData: async () => { throw new Error("read-only restart"); },
    });
    const restored = await reboot.loadSettings();
    assert.equal(restored.scopeReconcileGeneration, 6);
    assert.equal(restored.scopeReconcileRequired, true);
    assert.deepEqual(restored.userExclusionPatterns, ["private/**"]);
  }
});
