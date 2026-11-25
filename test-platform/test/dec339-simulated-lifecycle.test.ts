import * as assert from "node:assert/strict";
import { test } from "node:test";
import { VirtualSynchronizationWorld, type VirtualProductionDevice } from "../src/virtual-world/virtual-world";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { IndexedDbInventoryObservationStore } from "../../src/product/local-vault-boundary-seam";
import { lifecycleFixture } from "./dec339-lifecycle-provider-fixture";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { remoteRenameScenario } from "../scenarios/06d/remote-rename";
import { binaryConflictScenario } from "../scenarios/06b/binary-conflict";
import { cancelBeforeEffectScenario } from "../scenarios/07c/cancel-before-effect";
import { cancelAfterEffectScenario } from "../scenarios/07c/cancel-after-effect";
import { ambiguousAppliedScenario } from "../scenarios/07a/ambiguous-applied";
import { clonedStateDetectedScenario } from "../scenarios/07c/cloned-state-detected";
import { localDeletionScenario } from "../scenarios/06c/local-deletion";
import { remoteSourceChangedAfterPreviewScenario } from "../scenarios/07d/remote-source-changed-after-preview";
import { destructiveThresholdBlockedScenario } from "../scenarios/07e/destructive-threshold-blocked";

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
  const priorRun = device.controller.latestProductionRunReceipt()?.runId;
  const plan = await (full ? device.controller.previewVerifyReconcile() : device.controller.previewManual());
  assert.ok(plan, JSON.stringify({ device: device.backing.deviceIdentity, status: device.controller.currentSurface().status }));
  const result = await device.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
  assert.equal(result.status, "accepted");
  const receipt = device.controller.latestProductionRunReceipt();
  assert.ok(receipt, "fresh terminal run receipt required");
  assert.notEqual(receipt.runId, priorRun, "a previous receipt is not proof of this run: " + JSON.stringify({ device: device.backing.deviceIdentity, status: device.controller.currentSurface().status }));
  assert.equal(receipt?.terminal, "complete");
  assert.equal(receipt?.requiredEffectsCommittedAndVerified, true);
  return { plan, receipt };
}
async function automatic(device: VirtualProductionDevice, periodic = false) {
  const priorRun = device.controller.latestProductionRunReceipt()?.runId;
  await device.controller.runAutomatic(periodic ? "periodic" : "local-change");
  const receipt = device.controller.latestProductionRunReceipt();
  assert.ok(receipt, "fresh terminal run receipt required");
  assert.notEqual(receipt.runId, priorRun, "a previous receipt is not proof of this run: " + JSON.stringify({ device: device.backing.deviceIdentity, status: device.controller.currentSurface().status }));
  assert.equal(receipt?.terminal, "complete", JSON.stringify({ device: device.backing.deviceIdentity, status: device.controller.currentSurface().status, receipt }));
  assert.equal(receipt?.requiredEffectsCommittedAndVerified, true);
  const plan = device.controller.currentSurface().planPreview;
  assert.ok(plan && plan.planId === receipt.planId, "completed receipt must bind the current exact plan");
  assert.equal(receipt.committedOperationCount, plan.operations.length, "every operation including noops must be committed");
  const effectKinds = plan.operations.filter(op => op.kind !== "noop").map(op => op.kind);
  return { ...receipt, effectKinds, physicalOperationCount: effectKinds.length };
}
async function publication(device: VirtualProductionDevice) {
  const backing = device.backing;
  assert.ok(backing.inventory);
  const inventory = new IndexedDbInventoryObservationStore(backing.databaseName, backing.inventory.indexedDb, { allowSchemaUpgrade: false });
  const fence = await inventory.continuityRootHint();
  assert.ok(fence, "actual enabled planning must publish the inventory");
  const value = await inventory.publicationSnapshot(fence);
  assert.equal(value.status, "trusted-fence", value.status !== "trusted-fence" ? value.reason : undefined);
  assert.ok(value.value.activeGeneration);
  assert.equal(fence.deviceIdentity, backing.deviceIdentity);
  assert.equal(value.value.canonicalCursor, value.value.activeManifest?.terminalCursor);
  const authority = await backing.loadAuthority();
  assert.equal(authority.status, "trusted");
  if (authority.status !== "trusted") throw new Error("canonical authority unavailable");
  assert.equal(value.value.canonicalCursor, authority.state.changeCursor);
  assert.equal(value.value.persistenceRevision, authority.state.persistenceRevision);
  for (const intent of authority.state.operationIntents) {
    assert.ok(intent.effects.every(effect => effect.stage === "state-committed"));
    assert.equal(intent.semanticAuthority.generation, authority.state.semanticGeneration, "atomic publication must retain completed journal generation consistency");
  }
  for (const convergence of authority.state.pathConvergence) {
    if (convergence.state.status === "converged") assert.equal(convergence.state.generation, authority.state.semanticGeneration);
  }
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
    contentResponseBytes: observed.filter(x => x.purpose === "content-range").reduce((n, x) => n + x.responseBytes, 0),
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
      const steadyPreview = await measure(fixture, () => a.controller.previewManual());
      assert.ok(steadyPreview.result && steadyPreview.result.operations.every(op => op.kind === "noop"));
      await a.backing.local.createFile(path, source("first"));
      const upload = await measure(fixture, () => automatic(a));
      const id = await remoteId(world);
      const download = await measure(fixture, () => automatic(b));
      assert.equal(await contents(b), "first");
      assert.deepEqual(upload.result.effectKinds, ["upload-create"]);
      assert.deepEqual(download.result.effectKinds, ["download-create"]);
      await automatic(a); // consume the actual provider's post-effect Changes
      await b.backing.local.replaceFile(path, source("second"));
      const edit = await measure(fixture, () => automatic(b));
      assert.equal(await remoteId(world), id);
      assert.deepEqual(edit.result.effectKinds, ["upload-update"]);
      await a.dispose();
      const reopened = await world.reconstructDevice("device-a");
      try {
        const receive = await measure(fixture, () => automatic(reopened));
        assert.equal(await contents(reopened), "second");
        assert.equal(await remoteId(world), id);
        await automatic(b);
        const final = await measure(fixture, () => automatic(reopened));
        assert.deepEqual(receive.result.effectKinds, ["download-update"]);
        assert.deepEqual(final.result.effectKinds, []);
        if (enabled) {
          const persisted = await publication(reopened), other = await publication(b);
          assert.equal(persisted.authority.remoteMappings.find(row => row.path === path)?.remoteObjectId, id);
          assert.equal(other.authority.remoteMappings.find(row => row.path === path)?.remoteObjectId, id);
          assert.ok(reopened.localInventory);
          // LOCAL hints are advisory and may be stale after canonical BASE commits.
          assert.notEqual((await reopened.localInventory.readAdvisoryHint(persisted.fence, path)).status, "advisory");
          assert.equal(steadyPreview.metrics.categories["marked-census"] ?? 0, 0);
          assert.equal(steadyPreview.metrics.categories["parent-list"] ?? 0, 0);
          assert.equal(steadyPreview.metrics.categories.changes, 1);
          assert.equal(final.metrics.categories["marked-census"] ?? 0, 0);
        }
        outcomes.push({ stableIdentity: (await remoteId(world)) === id, contents: await contents(reopened),
          committed: [upload.result.effectKinds, download.result.effectKinds, edit.result.effectKinds, receive.result.effectKinds, final.result.effectKinds] });
        t.diagnostic("BU02_SIMULATED_LIFECYCLE " + JSON.stringify({ enabled, setupStorage, steady: steady.metrics, steadyPreview: steadyPreview.metrics, upload: upload.metrics,
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
      const observed = await measure<unknown>(fixture, run);
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


test("BU02 fresh provider delta enables an advisory local hint; a subsequent local edit revokes it", async () => {
  const { world, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("initial"));
    await automatic(a); await automatic(b); await automatic(a);
    const id = await remoteId(world);
    const updated = await world.drive.update({ remoteObjectId: id, path, content: source("external") });
    assert.ok(updated.ok);
    const plan = await b.controller.previewManual();
    assert.ok(plan);
    const persisted = await publication(b);
    assert.ok(b.localInventory);
    const hint = await b.localInventory.refresh(persisted.fence);
    assert.equal(hint.status, "recorded");
    assert.equal((await b.localInventory.readAdvisoryHint(persisted.fence, path)).status, "advisory");
    await b.backing.local.replaceFile(path, source("new-local"));
    assert.notEqual((await b.localInventory.readAdvisoryHint(persisted.fence, path)).status, "advisory");
    await b.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
    assert.equal(await contents(b), "new-local", "stale preview cannot overwrite a changed local file");
    assert.equal(await remoteId(world), id);
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 nonempty first sync preserves strict inventory cursor gate and explicitly reconciles before rebaseline", async () => {
  const fixture = lifecycleFixture(true);
  const world = await VirtualSynchronizationWorld.create(["device-a", "device-b"], fixture.forDevice);
  const a = await world.reconstructDevice("device-a");
  try {
    await a.backing.local.createFile(path, source("first-sync"));
    await manual(a, true);
    const id = await remoteId(world);
    const first = await a.backing.loadAuthority();
    assert.equal(first.status, "trusted");
    assert.equal(await a.controller.previewManual(), undefined,
      "a full baseline cannot skip the unlearned post-effect Changes horizon");
    await manual(a, true);
    await automatic(a);
    await publication(a);
    assert.equal(await remoteId(world), id);
    assert.equal(await contents(a), "first-sync");
  } finally { await a.dispose(); }
});

for (const scenario of [remoteRenameScenario, binaryConflictScenario, cancelBeforeEffectScenario,
  cancelAfterEffectScenario, ambiguousAppliedScenario, clonedStateDetectedScenario,
  localDeletionScenario, remoteSourceChangedAfterPreviewScenario, destructiveThresholdBlockedScenario]) {
  test("BU02 paired canonical scenario " + scenario.id, async t => {
    const warm: ScenarioDefinition = { ...scenario, steps: [
      { id: "bu02-establish-empty", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "bu02-establish-observation", kind: "production", device: "device-a", operation: "synchronize" },
      ...scenario.steps,
    ] };
    for (const enabled of [false, true]) {
      const fixture = lifecycleFixture(enabled);
      const result = await DeterministicScenarioRunner.canonical().run(warm, fixture.forDevice);
      assert.equal(result.status, "completed", JSON.stringify({ enabled, classification: result.classification, reason: result.reason, steps: result.steps.map(x => ({ id: x.stepId, matched: x.matchedExpectation, classification: x.classification, reason: x.reason })), syntheticSurfaceHistory: Object.fromEntries(fixture.surfaces) }));
      assert.ok(result.steps.every(x => x.matchedExpectation));
      if (enabled) assert.ok(fixture.samples().some(x => x.purpose === "changes"), "actual enabled transport must execute");
      if (scenario === remoteRenameScenario || scenario === ambiguousAppliedScenario) {
        const first = result.captures["remote-before"] as { remoteObjectId?: string };
        const last = result.captures[scenario === remoteRenameScenario ? "remote-moved" : "remote-final"] as { remoteObjectId?: string };
        assert.ok(first.remoteObjectId); assert.equal(last.remoteObjectId, first.remoteObjectId);
      }
      t.diagnostic("BU02_PAIRED_SCENARIO " + JSON.stringify({ scenario: scenario.id, enabled, steps: result.steps.length,
        requests: fixture.samples().length, responseBytes: fixture.samples().reduce((n, x) => n + x.responseBytes, 0) }));
    }
  });
}


test("BU02 atomic inventory publication failure leaves both authority and active generation intact, then safely retries", async () => {
  const { world, fixture, a, b } = await established(true);
  try {
    const prior = await publication(a);
    const created = await world.drive.create(world.managedRemote.rootId, { path, entityKind: "file", content: source("new-remote") });
    assert.ok(created.ok);
    const db = fixture.databases.get("device-a")!;
    db.abortNextPublication = true;
    assert.equal(await a.controller.previewManual(), undefined);
    assert.equal(db.abortNextPublication, false, "fault must reach the actual atomic publication");
    assert.ok(db.abortedPublicationStores?.includes("inventory-generations"));
    const after = await publication(a);
    assert.equal(after.value.activeGeneration, prior.value.activeGeneration);
    assert.equal(after.value.canonicalCursor, prior.value.canonicalCursor);
    assert.equal(after.value.persistenceRevision, prior.value.persistenceRevision);
    assert.equal((await a.backing.local.observe(path)).status, "absent");
    await manual(a);
    assert.equal(await contents(a), "new-remote");
    await publication(a);
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 rollback to legacy and re-enable on the same established v2 device preserves synchronized identity", async () => {
  const { world, fixture, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("rollback-safe"));
    await automatic(a); await automatic(b); await automatic(a);
    const id = await remoteId(world);
    await a.dispose();
    fixture.setEnabled(false);
    const legacy = await world.reconstructDevice("device-a");
    try {
      assert.equal(legacy.localInventory, undefined);
      await automatic(legacy);
      assert.equal(await contents(legacy), "rollback-safe");
    } finally { await legacy.dispose(); }
    fixture.setEnabled(true);
    const reopened = await world.reconstructDevice("device-a");
    try {
      await automatic(reopened);
      await publication(reopened);
      assert.equal(await contents(reopened), "rollback-safe");
      assert.equal(await remoteId(world), id);
    } finally { await reopened.dispose(); }
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 a changed account after manual preview cannot authorize the simulated remote create", async () => {
  const { world, fixture, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("preserved"));
    const plan = await a.controller.previewManual();
    assert.ok(plan);
    assert.ok(plan.operations.some(op => op.kind === "upload-create"));
    fixture.changeAccount("different-synthetic-account");
    await a.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
    assert.notEqual(a.controller.latestProductionRunReceipt()?.terminal, "complete");
    const seen = await world.drive.observe(world.managedRemote.rootId, path);
    assert.ok(seen.ok && seen.value.status === "absent");
    assert.equal(await contents(a), "preserved");
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 unknown externally removed identity blocks enabled planning without authorizing local trash", async () => {
  const { world, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("preserve-copy"));
    await automatic(a); await automatic(b); await automatic(a);
    const id = await remoteId(world), before = await publication(b);
    world.drive.removeExternally(id);
    assert.equal(await b.controller.previewManual(), undefined);
    const after = await publication(b);
    assert.equal(after.value.activeGeneration, before.value.activeGeneration);
    assert.equal(after.value.canonicalCursor, before.value.canonicalCursor);
    assert.equal(await contents(b), "preserve-copy");
  } finally { await a.dispose(); await b.dispose(); }
});

test("BU02 matched nested steady-state cost scales independently of unchanged remote object count", async t => {
  const measurements: Array<{ enabled: boolean; size: number; requests: number; responseBytes: number }> = [];
  for (const size of [24, 128]) {
    for (const enabled of [false, true]) {
      const fixture = lifecycleFixture(enabled);
      const world = await VirtualSynchronizationWorld.create(["device-a", "device-b"], fixture.forDevice);
      const a = await world.reconstructDevice("device-a");
      try {
        for (let i = 0; i < size; i++) {
          const name = "folder-" + (i % 4) + "/leaf-" + i + ".bin";
          const content = "synthetic-" + i;
          const remote = await world.drive.create(world.managedRemote.rootId, { path: virtualDrivePath(name), entityKind: "file", content: source(content) });
          assert.ok(remote.ok);
          a.backing.local.seedFile(name, content);
        }
        const setup = await measure(fixture, () => manual(a, true));
        await automatic(a);
        const runs = [];
        for (let iteration = 0; iteration < 3; iteration++) {
          const result = await measure(fixture, () => automatic(a));
          assert.deepEqual(result.result.effectKinds, []);
          const preview = await measure(fixture, () => a.controller.previewManual());
          assert.ok(preview.result && preview.result.operations.every(op => op.kind === "noop"));
          if (enabled) {
            assert.equal(preview.metrics.categories["marked-census"] ?? 0, 0);
            assert.equal(preview.metrics.categories["parent-list"] ?? 0, 0);
            assert.equal(preview.metrics.categories.changes, 1);
          }
          runs.push({ completeAutomatic: result.metrics, manualPlanning: preview.metrics });
        }
        measurements.push({ enabled, size, requests: runs[0].manualPlanning.requests, responseBytes: runs[0].manualPlanning.responsePayloadBytes });
        t.diagnostic("BU02_NESTED_STEADY " + JSON.stringify({ enabled, size, setup: setup.metrics, runs }));
      } finally { await a.dispose(); }
    }
  }
  const inventory = measurements.filter(x => x.enabled);
  assert.equal(inventory[0].requests, inventory[1].requests);
  // Cursor token lengths vary with synthetic provider object counts.
  // Only inventory planning request count is the invariant; report total execution and actual response bytes separately.
});


test("BU02 completed intent evidence survives atomic post-effect Changes publication and explicit full cursor preservation", async () => {
  const { world, a, b } = await established(true);
  try {
    await a.backing.local.createFile(path, source("first"));
    await automatic(a);
    const committed = await a.backing.loadAuthority();
    assert.equal(committed.status, "trusted");
    const journal = committed.state.operationIntents.filter(intent => intent.effects.every(effect => effect.stage === "state-committed"));
    assert.ok(journal.length > 0, "exercise real persisted completed effects");
    await automatic(a);
    const before = await publication(a);
    assert.notEqual(before.authority.semanticGeneration, committed.state.semanticGeneration);
    assert.ok(before.authority.learnedRemoteBatches.length > 0);
    for (const old of journal) {
      const retained = before.authority.operationIntents.find(intent => intent.operationId === old.operationId);
      assert.ok(retained, "publication cannot silently erase completed journal evidence");
      assert.deepEqual(retained.effects.map(effect => [effect.effectId, effect.stage, effect.verificationEvidenceRef]), old.effects.map(effect => [effect.effectId, effect.stage, effect.verificationEvidenceRef]));
    }
    const id = await remoteId(world);
    assert.ok((await world.drive.update({ remoteObjectId: id, path, content: source("second") })).ok);
    await manual(a, true);
    assert.equal(await contents(a), "second");
    const reconciled = await a.backing.loadAuthority();
    assert.equal(reconciled.status, "trusted");
    assert.equal(reconciled.state.changeCursor, before.value.canonicalCursor, "full physical reconciliation cannot invent a missing Changes edge");
    assert.deepEqual(reconciled.state.learnedRemoteBatches, before.authority.learnedRemoteBatches);
    await automatic(a);
    const refreshed = await publication(a);
    assert.notEqual(refreshed.value.canonicalCursor, before.value.canonicalCursor);
    assert.equal(await remoteId(world), id);
    assert.equal(await contents(a), "second");
  } finally { await a.dispose(); await b.dispose(); }
});
