import assert from "node:assert/strict";
import test from "node:test";
import {
  contractId,
  type DeviceIdentity,
  type ManagedRemoteIdentity,
  type ProtocolVersion,
  type RemoteObjectId,
  type VaultIdentity,
  type VaultPath,
} from "../../src/contracts";
import {
  buildInventoryPlanningFence,
  selectPlanningAssembler,
  VERIFIED_INVENTORY_SCHEMA_VERSION,
} from "../../src/product/inventory-planning-cutover";
import { DEFAULT_SETTINGS, PluginDataRepository } from "../../src/product/plugin-data";
import { ProductPathScope } from "../../src/product/path-scope";
import { IndexedDbStateByteStorage } from "../../src/state/indexeddb-state-storage";
import { IndexedDbInventoryObservationStore } from "../../src/state/indexeddb-inventory-storage";
import { FakeDatabase, withRangeOnly } from "../fixtures/dec339-inventory-idb-fixtures";

const rid = (value: string) => contractId<"RemoteObjectId">(value) as RemoteObjectId;
const vault = contractId<"VaultIdentity">("vault:step5") as VaultIdentity;
const device = contractId<"DeviceIdentity">("device:step5") as DeviceIdentity;
const protocol = contractId<"ProtocolVersion">("1") as ProtocolVersion;
const remoteIdentity: ManagedRemoteIdentity = { rootId: rid("root:step5"), vaultIdentity: vault, protocolVersion: protocol };

test("DEC339 Step 5 default setting is off and legacy persisted settings remain off unless explicitly opted in", async () => {
  assert.equal(DEFAULT_SETTINGS.verifiedInventoryPlanningEnabled, false);

  const legacy = new PluginDataRepository({
    loadData: async () => ({
      settings: {
        deviceIdentity: String(device),
        vaultIdentity: "",
        remoteRootId: "",
        firstSyncCompleted: false,
      },
    }),
    dataFileExists: async () => true,
    saveData: async () => undefined,
  });
  assert.equal((await legacy.loadSettings()).verifiedInventoryPlanningEnabled, false);

  const optedIn = new PluginDataRepository({
    loadData: async () => ({
      settings: {
        deviceIdentity: String(device),
        vaultIdentity: String(vault),
        remoteRootId: String(remoteIdentity.rootId),
        firstSyncCompleted: true,
        verifiedInventoryPlanningEnabled: true,
      },
    }),
    dataFileExists: async () => true,
    saveData: async () => undefined,
  });
  assert.equal((await optedIn.loadSettings()).verifiedInventoryPlanningEnabled, true);
});

test("DEC339 Step 5 disabled selector never constructs or touches inventory planning dependencies", () => {
  let inventoryConstructed = 0;
  const selected = selectPlanningAssembler(
    false,
    () => ({ kind: "legacy" as const }),
    () => { inventoryConstructed += 1; return { kind: "inventory" as const }; },
  );
  assert.deepEqual(selected, { kind: "legacy" });
  assert.equal(inventoryConstructed, 0);
});

test("DEC339 Step 5 enabled selector chooses exactly one inventory-backed planning owner", () => {
  let legacyConstructed = 0;
  let inventoryConstructed = 0;
  const selected = selectPlanningAssembler(
    true,
    () => { legacyConstructed += 1; return { kind: "legacy" as const }; },
    () => { inventoryConstructed += 1; return { kind: "inventory" as const }; },
  );
  assert.deepEqual(selected, { kind: "inventory" });
  assert.equal(legacyConstructed, 0);
  assert.equal(inventoryConstructed, 1);
});

test("DEC339 Step 5 planning fence binds paired account, exact domain roots, device, root, protocol and scope", async () => {
  const fence = await buildInventoryPlanningFence({
    drive: {
      pairedInventoryAccountKey: async () => "sha256:" + "1".repeat(64),
      observeManagedDomainRootIds: async identity => {
        assert.deepEqual(identity, remoteIdentity);
        return { ok: true, value: { contentRootId: rid("content:step5"), configRootId: rid("config:step5") } };
      },
    },
    remoteIdentity,
    deviceIdentity: device,
    vaultIdentity: vault,
    scopePolicyFingerprint: "sha256:" + "2".repeat(64),
  });

  assert.deepEqual(fence, {
    vaultIdentity: vault,
    deviceIdentity: device,
    pairedAccountKey: "sha256:" + "1".repeat(64),
    managedRootId: remoteIdentity.rootId,
    protocolVersion: protocol,
    contentDomainRootId: rid("content:step5"),
    configDomainRootId: rid("config:step5"),
    scopePolicyFingerprint: "sha256:" + "2".repeat(64),
    inventorySchemaVersion: VERIFIED_INVENTORY_SCHEMA_VERSION,
  });
});

test("DEC339 Step 5 planning fence fails closed on absent account or wrong vault identity", async () => {
  await assert.rejects(() => buildInventoryPlanningFence({
    drive: {
      pairedInventoryAccountKey: async () => undefined,
      observeManagedDomainRootIds: async () => ({ ok: true, value: { contentRootId: rid("c"), configRootId: rid("p") } }),
    },
    remoteIdentity,
    deviceIdentity: device,
    vaultIdentity: vault,
    scopePolicyFingerprint: "scope",
  }), /paired-inventory-account-unavailable/);

  const otherVault = contractId<"VaultIdentity">("vault:other") as VaultIdentity;
  await assert.rejects(() => buildInventoryPlanningFence({
    drive: {
      pairedInventoryAccountKey: async () => "sha256:" + "3".repeat(64),
      observeManagedDomainRootIds: async () => ({ ok: true, value: { contentRootId: rid("c"), configRootId: rid("p") } }),
    },
    remoteIdentity,
    deviceIdentity: device,
    vaultIdentity: otherVault,
    scopePolicyFingerprint: "scope",
  }), /inventory-fence-vault-identity-mismatch/);
});

test("DEC339 Step 5 effective-scope fingerprint is deterministic and changes with exclusion policy", () => {
  const config = contractId<"VaultPath">(".obsidian") as VaultPath;
  let exclusions = ["private/**", "cache/**"];
  const operational = new Set<string>(["sync-plan-errors.csv"]);
  const scope = new ProductPathScope(config, () => ({ userExclusionPatterns: exclusions }), () => operational);

  const first = scope.inventoryScopeFingerprint();
  exclusions = ["cache/**", "private/**"];
  assert.equal(scope.inventoryScopeFingerprint(), first, "equivalent exclusion order must canonicalize identically");

  exclusions = ["private/**"];
  assert.notEqual(scope.inventoryScopeFingerprint(), first);
  exclusions = ["cache/**", "private/**"];
  operational.add("other-operational.csv");
  assert.notEqual(scope.inventoryScopeFingerprint(), first);
});

test("DEC339 Step 5 existing-only inventory access refuses v1 schema without upgrading it", async () => {
  withRangeOnly();
  const database = new FakeDatabase();
  const factory = database.openFactory();
  const legacy = new IndexedDbStateByteStorage("step5-existing-only", factory);
  await legacy.write(new TextEncoder().encode("legacy-state"));
  assert.equal(database.version, 1);

  const inventory = new IndexedDbInventoryObservationStore(
    "step5-existing-only",
    factory,
    { allowSchemaUpgrade: false },
  );
  const result = await inventory.openRead();
  assert.equal(result.status, "recovery-required");
  if (result.status === "recovery-required")
    assert.equal(result.reason, "inventory-schema-not-established");
  assert.equal(database.version, 1, "opt-in planning must never migrate a live v1 database");
});
