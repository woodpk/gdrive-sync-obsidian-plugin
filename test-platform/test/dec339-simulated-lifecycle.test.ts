import assert from "node:assert/strict";
import { test } from "node:test";
import { VirtualSynchronizationWorld, type VirtualProductionDevice } from "../src/virtual-world/virtual-world";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { IndexedDbInventoryObservationStore } from "../../src/product/local-vault-boundary-seam";
import { lifecycleFixture } from "./dec339-lifecycle-provider-fixture";

const path = virtualVaultPath("note.bin");
function source(text: string) {
  const bytes = new TextEncoder().encode(text);
  return { sizeBytes: bytes.byteLength, async *openChunks() { yield bytes; } };
}
async function contents(device: VirtualProductionDevice): Promise<string> {
  const read = await device.backing.local.readFile(path);
  const bytes: number[] = [];
  for await (const part of read.content.openChunks()) bytes.push(...part);
  return new TextDecoder().decode(Uint8Array.from(bytes));
}
async function manual(device: VirtualProductionDevice, full = false) {
  const plan = await (full ? device.controller.previewVerifyReconcile() : device.controller.previewManual());
  assert.ok(plan, JSON.stringify(device.controller.currentSurface().status));
  const result = await device.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "accepted");
  const receipt = device.controller.latestProductionRunReceipt();
  assert.equal(receipt?.terminal, "complete");
  assert.equal(receipt?.requiredEffectsCommittedAndVerified, true);
  return { plan, receipt };
}
async function automatic(device: VirtualProductionDevice, periodic = false) {
  await device.controller.runAutomatic(periodic ? "periodic" : "local-change");
  const receipt = device.controller.latestProductionRunReceipt();
  assert.equal(receipt?.terminal, "complete", JSON.stringify(device.controller.currentSurface().status));
  assert.equal(receipt?.requiredEffectsCommittedAndVerified, true);
  return receipt;
}
async function publication(device: VirtualProductionDevice) {
  const backing = device.backing;
  assert.ok(backing.inventory);
  const inventory = new IndexedDbInventoryObservationStore(backing.databaseName, backing.inventory.indexedDb, { allowSchemaUpgrade: false });
  const fence = await inventory.continuityRootHint();
  assert.ok(fence, "actual enabled planning must publish the inventory");
  const value = await inventory.publicationSnapshot(fence);
  assert.equal(value.status, "trusted-fence");
  if (value.status !== "trusted-fence") throw new Error(value.reason);
  assert.ok(value.value.activeGeneration);
  assert.equal(fence.deviceIdentity, backing.deviceIdentity);
  assert.equal(value.value.canonicalCursor, value.value.activeManifest?.terminalCursor);
  const authority = await backing.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("canonical authority unavailable");
  assert.equal(value.value.canonicalCursor, authority.state.changeCursor);
  assert.equal(value.value.persistenceRevision, authority.state.persistenceRevision);
  return { inventory, fence, value: value.value, authority: authority.state };
}
async function established(enabled: boolean) {
  const fixture = lifecycleFixture(enabled);
  const world = await VirtualSynchronizationWorld.create(["device-a", "device-b"], fixture.forDevice);
  const a = await world.reconstructDevice("device-a"), b = await world.reconstructDevice("device-b");
  // This represents explicitly completed empty first-sync, not a seeded
  // trusted BASE, injected cursor or fake inventory receipt.
  await manual(a, true); await manual(b, true);
  await automatic(a); await automatic(b);
  return { world, fixture, a, b };
}
async function remoteId(world: VirtualSynchronizationWorld) {
  const seen = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(String(path)));
  assert.ok(seen.ok && seen.value.status === "present");
  return seen.value.remoteObjectId!;
}
async function measure<T>(fixture: ReturnType<typeof lifecycleFixture>, action: () => Promise<T>) {
  const offset = fixture.samples().length, wall = performance.now(), cpu = process.cpuUsage(), memory = process.memoryUsage();
  const result = await action();
  const observed = fixture.samples().slice(offset);
  const cpuUsed = process.cpuUsage(cpu), finalMemory = process.memoryUsage();
  return { result, metrics: {
    requests: observed.length, categories: Object.fromEntries([...new Set(observed.map(x => x.purpose))].map(p => [p, observed.filter(x => x.purpose === p).length])),
    responsePayloadBytes: observed.reduce((n, x) => n + x.responseBytes, 0),
    requestUrlBytes: observed.reduce((n, x) => n + x.urlBytes, 0),
    providerElapsedMs: observed.reduce((n, x) => n + x.elapsedMs, 0), wallMs: performance.now() - wall,
    cpuMs: (cpuUsed.user + cpuUsed.system) / 1000, heapBefore: memory.heapUsed, heapAfter: finalMemory.heapUsed,
    rssBefore: memory.rss, rssAfter: finalMemory.rss, storage: fixture.storageBytes(),
    wireBytesMeasured: false, simulatedMutationCallsIncludedInHttpCount: false,
  } };
}

test("BU02 actual enabled multi-device lifecycle: upload, download, same-ID edit, restart, no-op, legacy parity", async t => {
  const outcomes = [];
  for (const enabled of [false, true]) {
    const { world, fixture, a, b } = await established(enabled);
    try {
      const setupStorage = fixture.storageBytes();
      if (enabled) {
        const x = await publication(a), y = await publication(b);
        assert.notEqual(x.fence.deviceIdentity, y.fence.deviceIdentity);
        assert.notEqual(x.value.activeGeneration, y.value.activeGeneration);
        assert.notEqual(a.backing.inventory?.indexedDb, b.backing.inventory?.indexedDb);
      } else assert.equal(setupStorage.every(x => x.inventory === 0), true);
      const steady = await measure(fixture, () => automatic(a));
      await a.backing.local.createFile(path, source("first"));
      const upload = await measure(fixture, () => automatic(a));
      const id = await remoteId(world);
      const download = await measure(fixture, () => automatic(b));
      assert.equal(await contents(b), "first");
      assert.equal(upload.result.committedOperationCount, 1);
      assert.equal(download.result.committedOperationCount, 1);
      await automatic(a); // consume the actual provider's post-effect Changes
      await b.backing.local.replaceFile(path, source("second"));
      const edit = await measure(fixture, () => automatic(b));
      assert.equal(await remoteId(world), id);
      assert.equal(edit.result.committedOperationCount, 1);
      await a.dispose();
      const reopened = await world.reconstructDevice("device-a");
      try {
        const receive = await measure(fixture, () => automatic(reopened));
        assert.equal(await contents(reopened), "second");
        assert.equal(await remoteId(world), id);
        await automatic(b);
        const final = await measure(fixture, () => automatic(reopened));
        assert.equal(final.result.committedOperationCount, 0);
        if (enabled) {
          const persisted = await publication(reopened), other = await publication(b);
          assert.equal(persisted.authority.remoteMappings.find(row => row.path === path)?.remoteObjectId, id);
          assert.equal(other.authority.remoteMappings.find(row => row.path === path)?.remoteObjectId, id);
          assert.ok(reopened.localInventory);
          const hint = await reopened.localInventory.refresh(persisted.fence);
          assert.equal(hint.status, "recorded");
          assert.equal((await reopened.localInventory.readAdvisoryHint(persisted.fence, path)).status, "verified-observation");
          assert.equal(steady.metrics.categories["marked-census"] ?? 0, 0);
          assert.equal(steady.metrics.categories["parent-list"] ?? 0, 0);
          assert.equal(steady.metrics.categories.changes, 1);
          assert.equal(final.metrics.categories["marked-census"] ?? 0, 0);
        }
        outcomes.push({ stableIdentity: (await remoteId(world)) === id, contents: await contents(reopened),
          committed: [upload.result.committedOperationCount, download.result.committedOperationCount, edit.result.committedOperationCount, receive.result.committedOperationCount, final.result.committedOperationCount] });
        t.diagnostic("BU02_SIMULATED_LIFECYCLE " + JSON.stringify({ enabled, setupStorage, steady: steady.metrics, upload: upload.metrics,
          download: download.metrics, edit: edit.metrics, receive: receive.metrics, final: final.metrics }));
      } finally { await reopened.dispose(); }
    } finally { await a.dispose(); await b.dispose(); }
  }
  assert.deepEqual(outcomes[0], outcomes[1]);
});

test("BU02 incomplete Changes blocks actual enabled planning without advancing authority or deleting copies", async () => {
  const { world, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("safe"));
    await automatic(a); await automatic(b); await automatic(a);
    const before = await publication(b), id = await remoteId(world);
    world.drive.scriptNextChangePage({ completeness: { status: "partial", reason: "synthetic-incomplete-feed" } });
    assert.equal(await b.controller.previewManual(), undefined);
    assert.equal(b.controller.currentSurface().status.kind, "recovery-required");
    const after = await publication(b);
    assert.equal(after.value.activeGeneration, before.value.activeGeneration);
    assert.equal(after.value.canonicalCursor, before.value.canonicalCursor);
    assert.equal(await contents(b), "safe");
    assert.equal(await remoteId(world), id);
    await automatic(b);
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 periodic and reviewed explicit reconciliation actually enumerate the provider", async () => {
  const { fixture, a, b } = await established(true);
  try {
    for (const run of [() => automatic(a, true), () => manual(a, true)]) {
      const observed = await measure(fixture, run);
      assert.ok((observed.metrics.categories["parent-list"] ?? 0) > 0);
      assert.ok((observed.metrics.categories["marked-census"] ?? 0) > 0);
    }
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 independent account/root proof refuses changed pairing; no new remote effect", async () => {
  const { fixture, world, a, b } = await established(true);
  try {
    const prior = await publication(a);
    await a.backing.local.createFile(path, source("not-uploaded"));
    fixture.changeAccount("different-synthetic-account");
    assert.equal(await a.controller.previewManual(), undefined);
    const unchanged = await publication(a);
    assert.equal(unchanged.value.canonicalCursor, prior.value.canonicalCursor);
    const observed = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(String(path)));
    assert.ok(observed.ok && observed.value.status === "absent");
    assert.equal(await contents(a), "not-uploaded");
  } finally { await a.dispose(); await b.dispose(); }
});
