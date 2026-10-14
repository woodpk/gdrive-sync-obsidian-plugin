import {
  deepStrictEqual,
  notStrictEqual,
  strictEqual,
  throws,
} from "node:assert/strict";
import { test } from "node:test";

import {
  DeterministicClock,
  DeterministicOrderGate,
  VirtualDeviceBacking,
  deterministicDeviceIdentity,
  virtualDeviceVaultIdentity,
  virtualStateChangeCursor,
} from "../src/virtual-world/per-device-runtime";
import {
  InMemoryGoogleDriveCore,
  virtualDrivePath,
  virtualProtocolVersion,
} from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";

function source(bytes: readonly number[]) {
  const retained = Uint8Array.from(bytes);
  return {
    sizeBytes: retained.byteLength,
    async *openChunks(): AsyncIterable<Uint8Array> {
      yield Uint8Array.from(retained);
    },
  };
}

test("deterministic device identities are stable and distinct while per-device state and cursors remain isolated", async () => {
  const vaultIdentity = virtualDeviceVaultIdentity("vault-shared");
  const deviceA = deterministicDeviceIdentity(1);
  const deviceB = deterministicDeviceIdentity(2);

  strictEqual(deviceA, deterministicDeviceIdentity(1));
  notStrictEqual(deviceA, deviceB);

  const a = new VirtualDeviceBacking({
    deviceIdentity: deviceA,
    vaultIdentity,
  });
  const b = new VirtualDeviceBacking({
    deviceIdentity: deviceB,
    vaultIdentity,
  });

  await a.initializeAuthority();
  await b.initializeAuthority();

  const bBytesBefore = b.persistedBytes();
  await a.setChangeCursor(virtualStateChangeCursor("cursor-a"));

  const aLoaded = await a.load();
  const bLoaded = await b.load();
  strictEqual(aLoaded.status, "trusted");
  strictEqual(bLoaded.status, "trusted");
  if (aLoaded.status !== "trusted" || bLoaded.status !== "trusted") return;

  strictEqual(aLoaded.state.deviceIdentity, deviceA);
  strictEqual(bLoaded.state.deviceIdentity, deviceB);
  strictEqual(String(aLoaded.state.changeCursor), "cursor-a");
  strictEqual(bLoaded.state.changeCursor, undefined);
  deepStrictEqual(b.persistedBytes(), bBytesBefore);
  notStrictEqual(a.storage, b.storage);
  notStrictEqual(a.local, b.local);
});

test("two devices can share one Drive reality while local vault and production state authority stay device-local", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const vaultIdentity = virtualDeviceVaultIdentity("vault-shared-reality");
  const a = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(3),
    vaultIdentity,
  });
  const b = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(4),
    vaultIdentity,
  });
  await a.initializeAuthority();
  await b.initializeAuthority();

  const rootResult = await drive.createManagedRoot(
    vaultIdentity,
    virtualProtocolVersion("1"),
  );
  if (!rootResult.ok) throw new Error(rootResult.signal.kind);

  const remote = await drive.create(rootResult.value.rootId, {
    path: virtualDrivePath("shared.md"),
    entityKind: "file",
    content: source([1, 2, 3]),
  });
  if (!remote.ok) throw new Error(remote.signal.kind);

  await a.local.createFile(virtualVaultPath("a-only.md"), source([7]));
  await b.local.createFile(virtualVaultPath("b-only.md"), source([8]));

  const runtimeA = a.reconstruct(drive);
  const runtimeB = b.reconstruct(drive);

  strictEqual(runtimeA.drive, runtimeB.drive);
  notStrictEqual(runtimeA.local, runtimeB.local);
  notStrictEqual(runtimeA.rawStateStore(), runtimeB.rawStateStore());

  const sharedFromA = await runtimeA.drive.observe(
    rootResult.value.rootId,
    virtualDrivePath("shared.md"),
  );
  const sharedFromB = await runtimeB.drive.observe(
    rootResult.value.rootId,
    virtualDrivePath("shared.md"),
  );
  strictEqual(sharedFromA.ok, true);
  strictEqual(sharedFromB.ok, true);

  const aLocal = await runtimeA.local.observe(virtualVaultPath("a-only.md"));
  const bDoesNotSeeA = await runtimeB.local.observe(virtualVaultPath("a-only.md"));
  strictEqual(aLocal.status, "present");
  strictEqual(bDoesNotSeeA.status, "absent");

  runtimeA.destroy();
  runtimeB.destroy();
});

test("runtime destruction and reconstruction create fresh production state objects over retained durable local and remote reality", async () => {
  const drive = new InMemoryGoogleDriveCore();
  const vaultIdentity = virtualDeviceVaultIdentity("vault-restart");
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(5),
    vaultIdentity,
  });
  await backing.initializeAuthority(virtualStateChangeCursor("cursor-before-restart"));

  await backing.local.createFile(
    virtualVaultPath("retained-local.bin"),
    source([4, 5, 6]),
  );
  const rootResult = await drive.createManagedRoot(
    vaultIdentity,
    virtualProtocolVersion("1"),
  );
  if (!rootResult.ok) throw new Error(rootResult.signal.kind);
  const remoteResult = await drive.create(rootResult.value.rootId, {
    path: virtualDrivePath("retained-remote.bin"),
    entityKind: "file",
    content: source([9, 9]),
  });
  if (!remoteResult.ok) throw new Error(remoteResult.signal.kind);

  const first = backing.reconstruct(drive);
  const firstRaw = first.rawStateStore();
  const firstAuthority = first.stateStore();
  strictEqual(first.snapshot().generation, 1);

  first.destroy();
  strictEqual(first.isDestroyed(), true);
  throws(() => first.rawStateStore(), /destroyed/i);
  throws(() => first.stateStore(), /destroyed/i);

  const second = backing.reconstruct(drive);
  strictEqual(second.snapshot().generation, 2);
  notStrictEqual(second.rawStateStore(), firstRaw);
  notStrictEqual(second.stateStore(), firstAuthority);
  strictEqual(second.local, backing.local);
  strictEqual(second.drive, drive);

  const loaded = await second.stateStore().load(second.loadContext());
  strictEqual(loaded.status, "trusted");
  if (loaded.status === "trusted") {
    strictEqual(String(loaded.state.changeCursor), "cursor-before-restart");
    strictEqual(loaded.state.deviceIdentity, backing.deviceIdentity);
  }

  strictEqual(
    (await second.local.observe(virtualVaultPath("retained-local.bin"))).status,
    "present",
  );
  const remoteObserved = await second.drive.observe(
    rootResult.value.rootId,
    virtualDrivePath("retained-remote.bin"),
  );
  strictEqual(remoteObserved.ok, true);
  if (remoteObserved.ok) strictEqual(remoteObserved.value.status, "present");

  second.destroy();
});

test("deterministic clock drives real production device-aging and tombstone-retention policies without wall-clock sleeps", async () => {
  const clock = new DeterministicClock(1_000);
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(6),
    vaultIdentity: virtualDeviceVaultIdentity("vault-time"),
    clock,
  });
  await backing.initializeAuthority();

  const loaded = await backing.load();
  if (loaded.status !== "trusted") throw new Error(loaded.status);

  const peer = deterministicDeviceIdentity(7);
  const registered = backing.registerDevice(loaded.state, peer);
  strictEqual(
    registered.knownDevices.find(device => device.deviceId === peer)?.stale,
    true,
  );

  const reconciled = backing.markDeviceReconciled(registered, peer);
  const reconciledPeer = reconciled.knownDevices.find(
    device => device.deviceId === peer,
  );
  strictEqual(reconciledPeer?.stale, false);
  strictEqual(reconciledPeer?.advisoryLastReconciledAtMs, 1_000);

  clock.advanceBy(99);
  const notYetStale = backing.ageKnownDevices(reconciled, 100);
  strictEqual(
    notYetStale.knownDevices.find(device => device.deviceId === peer)?.stale,
    false,
  );

  clock.advanceBy(1);
  const nowStale = backing.ageKnownDevices(reconciled, 100);
  strictEqual(
    nowStale.knownDevices.find(device => device.deviceId === peer)?.stale,
    true,
  );

  const tombstone = {
    path: virtualVaultPath("deleted.md"),
    entityKind: "file" as const,
    deletedOn: "local" as const,
    advisoryRecordedAtMs: 1_000,
  };
  const retention = backing.tombstoneRetention(200);

  strictEqual(
    retention.canExpire(tombstone, reconciled.knownDevices, clock.nowMs()),
    false,
  );
  clock.advanceBy(100);
  strictEqual(
    retention.canExpire(tombstone, reconciled.knownDevices, clock.nowMs()),
    true,
  );
  strictEqual(
    retention.canExpire(tombstone, nowStale.knownDevices, clock.nowMs()),
    false,
  );
});

test("deterministic order gate releases external observations in explicitly selected order", async () => {
  const gate = new DeterministicOrderGate();
  const observed: string[] = [];

  const a = gate.defer("a", () => {
    observed.push("a");
    return "result-a";
  });
  const b = gate.defer("b", () => {
    observed.push("b");
    return "result-b";
  });

  deepStrictEqual(gate.pendingLabels(), ["a", "b"]);
  await gate.release("b");
  deepStrictEqual(observed, ["b"]);
  await gate.release("a");
  deepStrictEqual(observed, ["b", "a"]);
  strictEqual(await a, "result-a");
  strictEqual(await b, "result-b");
  deepStrictEqual(gate.pendingLabels(), []);
});

test("controlled cursor loss preserves trusted state while removing only cursor authority", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(8),
    vaultIdentity: virtualDeviceVaultIdentity("vault-cursor-loss"),
  });
  await backing.initializeAuthority(virtualStateChangeCursor("cursor-present"));

  const before = await backing.loadAuthority();
  strictEqual(before.status, "trusted");
  if (before.status !== "trusted") return;

  await backing.setChangeCursor(undefined);

  const after = await backing.loadAuthority();
  strictEqual(after.status, "trusted");
  if (after.status !== "trusted") return;

  strictEqual(after.state.changeCursor, undefined);
  strictEqual(after.state.deviceIdentity, before.state.deviceIdentity);
  strictEqual(after.state.vaultIdentity, before.state.vaultIdentity);
  notStrictEqual(after.state.semanticGeneration, before.state.semanticGeneration);
});

test("truncated persisted state is classified by the real production loader as recovery-required truncated", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(9),
    vaultIdentity: virtualDeviceVaultIdentity("vault-truncated"),
  });
  await backing.initializeAuthority();
  backing.truncateStateBytes();

  const loaded = await backing.load();
  strictEqual(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") {
    strictEqual(loaded.reason, "truncated");
  }
});

test("checksum corruption is classified by the real production loader as integrity-check-failed", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(10),
    vaultIdentity: virtualDeviceVaultIdentity("vault-corrupt"),
  });
  await backing.initializeAuthority();
  backing.corruptChecksum();

  const loaded = await backing.load();
  strictEqual(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") {
    strictEqual(loaded.reason, "integrity-check-failed");
  }
});

test("incompatible persisted schema is classified by the real production loader without BVP-side reinterpretation", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(11),
    vaultIdentity: virtualDeviceVaultIdentity("vault-version"),
  });
  await backing.initializeAuthority();
  await backing.installIncompatibleSchemaVersion(2);

  const loaded = await backing.load();
  strictEqual(loaded.status, "recovery-required");
  if (loaded.status === "recovery-required") {
    strictEqual(loaded.reason, "incompatible-version");
  }
});

test("missing expected durable state fails closed instead of becoming an empty trusted base", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(12),
    vaultIdentity: virtualDeviceVaultIdentity("vault-missing"),
  });
  await backing.initializeAuthority();
  backing.clearStateBytes();

  const existing = await backing.load("existing-pairing");
  strictEqual(existing.status, "recovery-required");
  if (existing.status === "recovery-required") {
    strictEqual(existing.reason, "expected-state-missing");
  }

  const newInstall = await backing.load("new-installation");
  strictEqual(newInstall.status, "uninitialized");
});

test("device identity mismatch is classified as clone-or-restore suspicion by production state loading", async () => {
  const backing = new VirtualDeviceBacking({
    deviceIdentity: deterministicDeviceIdentity(13),
    vaultIdentity: virtualDeviceVaultIdentity("vault-device-mismatch"),
  });
  await backing.initializeAuthority();

  const mismatched = await backing.loadWithExpectedDevice(
    deterministicDeviceIdentity(14),
  );
  strictEqual(mismatched.status, "recovery-required");
  if (mismatched.status === "recovery-required") {
    strictEqual(mismatched.reason, "clone-or-restore-suspected");
  }

  const correct = await backing.load();
  strictEqual(correct.status, "trusted");
});
