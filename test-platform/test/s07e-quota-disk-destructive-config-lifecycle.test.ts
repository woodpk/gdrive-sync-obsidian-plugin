import { equal, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";
import { remoteQuotaExhaustionScenario } from "../scenarios/07e/remote-quota-exhaustion";
import { localDiskFullScenario } from "../scenarios/07e/local-disk-full";
import { destructiveBelowThresholdScenario } from "../scenarios/07e/destructive-below-threshold";
import { destructiveThresholdBlockedScenario } from "../scenarios/07e/destructive-threshold-blocked";
import { portableConfigChangeScenario } from "../scenarios/07e/portable-config-change";
import { lifecycleReconstructionScenario } from "../scenarios/07e/lifecycle-reconstruction";

const scenarios = [
  remoteQuotaExhaustionScenario,
  localDiskFullScenario,
  destructiveBelowThresholdScenario,
  destructiveThresholdBlockedScenario,
  portableConfigChangeScenario,
  lifecycleReconstructionScenario,
];

const source = (values: readonly number[]) => ({
  sizeBytes: values.length,
  async *openChunks(): AsyncIterable<Uint8Array> { yield Uint8Array.from(values); },
});

for (const scenario of scenarios) {
  test(`${scenario.id} executes S07E semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    equal(result.status, "completed", JSON.stringify(result, null, 2));
    equal(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("resource failures preserve the authoritative surviving side instead of fabricating destructive fallback", async () => {
  const quota = await DeterministicScenarioRunner.canonical().run(remoteQuotaExhaustionScenario);
  equal(quota.status, "completed", JSON.stringify(quota, null, 2));
  equal((quota.captures.local as { sizeBytes?: number }).sizeBytes, 3);
  equal((quota.captures.remote as { exists?: boolean }).exists, false);

  const disk = await DeterministicScenarioRunner.canonical().run(localDiskFullScenario);
  equal(disk.status, "completed", JSON.stringify(disk, null, 2));
  const local = disk.captures.local as { hash?: string; sizeBytes?: number };
  const remote = disk.captures.remote as { hash?: string; sizeBytes?: number };
  equal(local.sizeBytes, 1);
  equal(remote.sizeBytes, 2);
  notEqual(local.hash, remote.hash);
});

test("production destructive thresholds block the 25-delete plan and require the real recovery checkpoint", async () => {
  const declarative = await DeterministicScenarioRunner.canonical().run(destructiveThresholdBlockedScenario);
  equal(declarative.status, "completed", JSON.stringify(declarative, null, 2));
  const capturedPlan = declarative.captures.plan as {
    operations?: readonly unknown[];
    recoveryCheckpointRequired?: boolean;
    executionDisposition?: string;
    globalExecutionGate?: string;
  };
  equal(capturedPlan.operations?.length, 25);
  equal(capturedPlan.recoveryCheckpointRequired, true);
  equal(capturedPlan.executionDisposition, "requires-user-approval");
  equal(capturedPlan.globalExecutionGate, "destructive-approval-required");

  const world = await VirtualSynchronizationWorld.create();
  const device = await world.reconstructDevice("device-a");
  const paths = Array.from({ length: 25 }, (_, index) => `checkpoint-delete-${index}.bin`);

  for (const [index, path] of paths.entries()) {
    await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath(path), source([index]));
  }
  const establish = await device.controller.previewManual();
  ok(establish);
  const established = await device.controller.request({ kind: "execute-plan", planId: establish.planId });
  equal(established.status, "accepted");

  for (const path of paths) await world.deviceBacking("device-a").local.trash(virtualVaultPath(path));
  const plan = await device.controller.previewManual();
  ok(plan);
  equal(plan.operations.length, 25);
  equal(plan.recoveryCheckpointRequired, true);
  equal(plan.executionDisposition, "requires-user-approval");
  equal(plan.globalExecutionGate, "destructive-approval-required");

  const checkpoint = device.controller.pendingDestructiveCheckpoint();
  ok(checkpoint);

  const unapproved = await device.controller.request({ kind: "execute-plan", planId: plan.planId });
  equal(unapproved.status, "rejected");
  for (const path of paths) {
    const observed = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
    equal(observed.ok, true);
    if (observed.ok) equal(observed.value.status, "present");
  }

  const wrongCheckpoint = `${checkpoint}:wrong` as typeof checkpoint;
  const wrong = await device.controller.request({
    kind: "approve-destructive-plan",
    planId: plan.planId,
    recoveryCheckpointId: wrongCheckpoint,
  });
  equal(wrong.status, "rejected");

  const approved = await device.controller.request({
    kind: "approve-destructive-plan",
    planId: plan.planId,
    recoveryCheckpointId: checkpoint,
  });
  equal(approved.status, "accepted");
  for (const path of paths) {
    const observed = await world.drive.observe(world.managedRemote.rootId, virtualDrivePath(path));
    equal(observed.ok, true);
    if (observed.ok) equal(observed.value.status, "absent");
  }
  await device.dispose();
});

test("portable configuration change converges through the dedicated logical namespace", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(portableConfigChangeScenario);
  equal(result.status, "completed", JSON.stringify(result, null, 2));
  const local = result.captures.local as { hash?: string; sizeBytes?: number };
  const remote = result.captures.remote as { hash?: string; sizeBytes?: number };
  equal(local.hash, remote.hash);
  equal(local.sizeBytes, remote.sizeBytes);
  ok((local.sizeBytes ?? 0) > 2);
});

test("deterministic reconstruction retains trusted state and resumes synchronization without deleting shared data", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(lifecycleReconstructionScenario);
  equal(result.status, "completed", JSON.stringify(result, null, 2));
  const state = result.captures.state as { status?: string; baseCount?: number; mappingCount?: number };
  equal(state.status, "trusted");
  equal(state.baseCount, 1);
  equal(state.mappingCount, 1);
  equal((result.captures["remote-before"] as { exists?: boolean }).exists, true);
  equal((result.captures["remote-after"] as { sizeBytes?: number }).sizeBytes, 2);
});

test("wrong unsafe expectation fails deterministically instead of weakening the breaker proof", async () => {
  const steps = destructiveThresholdBlockedScenario.steps.map(step =>
    step.id === "assert-remote-0" ? { ...step, expected: false } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...destructiveThresholdBlockedScenario, id: "s07e-wrong-unsafe-expectation", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  equal(result.status, "failed");
  equal(result.classification, "assertion-mismatch");
});
