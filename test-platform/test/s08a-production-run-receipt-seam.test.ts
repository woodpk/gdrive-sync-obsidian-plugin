import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";

import { readLatestProductionRunReceipt } from "../../src/product/run-receipt-seam";
import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";

const source = (values: readonly number[]) => ({
  sizeBytes: values.length,
  async *openChunks(): AsyncIterable<Uint8Array> { yield Uint8Array.from(values); },
});

test("authoritative completed receipt is stable, correlated, and advances run identity", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const device = await world.reconstructDevice("device-a");
  const path = "s08a-success.bin";

  equal(readLatestProductionRunReceipt(device.controller), undefined);
  await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath(path), source([1, 2, 3]));
  const firstPlan = await device.controller.previewManual();
  ok(firstPlan);
  const firstResult = await device.controller.request({ kind: "execute-plan", planId: firstPlan.planId });
  equal(firstResult.status, "accepted");

  const first = readLatestProductionRunReceipt(device.controller);
  ok(first);
  match(first.runId, /^product-run:\d+$/);
  equal(first.trigger, "manual");
  equal(String(first.planId), String(firstPlan.planId));
  equal(first.terminal, "complete");
  equal(first.requiredEffectsCommittedAndVerified, true);
  equal(first.committedOperationCount, 1);
  equal(first.skippedOperationCount, 0);
  deepEqual(readLatestProductionRunReceipt(device.controller), first);

  const remoteAfterRead = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
  equal(remoteAfterRead.ok, true);
  if (remoteAfterRead.ok) equal(remoteAfterRead.value.status, "present");

  await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath(path), source([4, 5, 6]));
  const secondPlan = await device.controller.previewManual();
  ok(secondPlan);
  const secondResult = await device.controller.request({ kind: "execute-plan", planId: secondPlan.planId });
  equal(secondResult.status, "accepted");
  const second = readLatestProductionRunReceipt(device.controller);
  ok(second);
  equal(second.terminal, "complete");
  equal(second.requiredEffectsCommittedAndVerified, true);
  notEqual(second.runId, first.runId);
  equal(String(second.planId), String(secondPlan.planId));
  await device.dispose();
});

test("quota-blocked production run cannot manufacture authoritative success", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const device = await world.reconstructDevice("device-a");
  const path = "s08a-blocked.bin";

  world.drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "quota-exhausted", detail: "s08a quota fixture" },
    mutationEffect: "not-applied",
  });
  await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath(path), source([7, 8, 9]));
  const plan = await device.controller.previewManual();
  ok(plan);
  await device.controller.request({ kind: "execute-plan", planId: plan.planId });

  const receipt = readLatestProductionRunReceipt(device.controller);
  ok(receipt);
  equal(receipt.terminal, "blocked");
  equal(receipt.requiredEffectsCommittedAndVerified, false);
  equal(receipt.committedOperationCount, 0);
  const remote = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
  equal(remote.ok, true);
  if (remote.ok) equal(remote.value.status, "absent");
  await device.dispose();
});

test("ambiguous applied physical effect remains uncertain and non-success", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const device = await world.reconstructDevice("device-a");
  const path = "s08a-uncertain.bin";

  world.drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "transient-failure", detail: "s08a ambiguous fixture" },
    mutationEffect: "applied-before-failure",
  });
  await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath(path), source([10, 11, 12]));
  const plan = await device.controller.previewManual();
  ok(plan);
  await device.controller.request({ kind: "execute-plan", planId: plan.planId });

  const receipt = readLatestProductionRunReceipt(device.controller);
  ok(receipt);
  equal(receipt.terminal, "uncertain");
  equal(receipt.requiredEffectsCommittedAndVerified, false);
  equal(receipt.committedOperationCount, 0);
  const remote = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
  equal(remote.ok, true);
  if (remote.ok) equal(remote.value.status, "present");
  await device.dispose();
});

test("read-only seam cannot create a receipt or mutate remote reality by observation", async () => {
  const world = await VirtualSynchronizationWorld.create();
  const device = await world.reconstructDevice("device-a");
  const path = virtualDrivePath("s08a-read-only.bin");

  equal(readLatestProductionRunReceipt(device.controller), undefined);
  const before = await world.drive.observe(world.managedRemote.rootId, path);
  equal(before.ok, true);
  if (before.ok) equal(before.value.status, "absent");
  equal(readLatestProductionRunReceipt(device.controller), undefined);
  const after = await world.drive.observe(world.managedRemote.rootId, path);
  equal(after.ok, true);
  if (after.ok) equal(after.value.status, "absent");
  await device.dispose();
});
