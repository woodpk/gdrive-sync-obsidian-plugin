import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { multiDeviceConflictScenario } from "../scenarios/multi-device-conflict";
import { ordinaryOneSidedSyncScenario } from "../scenarios/ordinary-one-sided-sync";

test("first declarative canary observes a real multi-device unresolved text conflict", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(multiDeviceConflictScenario);
  strictEqual(result.status, "completed");
  const observation = result.evidence?.machine.observations.find(value => value.captureAs === "conflict-plan-observation");
  strictEqual(Array.isArray(observation?.value.operationKinds), true);
  strictEqual((observation?.value.operationKinds as readonly unknown[]).includes("unresolved-conflict"), true);
});

test("inverting the conflict expectation fails deterministically", async () => {
  const steps = [
    ...multiDeviceConflictScenario.steps.slice(0, -1),
    {
      id: "assert-conflict",
      kind: "assert",
      assertion: "contains",
      observationRef: "conflict-plan-observation",
      field: "operationKinds",
      expected: "upload-create",
    },
  ] as unknown as ScenarioDefinition["steps"];
  const inverted = {
    ...multiDeviceConflictScenario,
    id: "s05e-multi-device-text-conflict-inverted",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(inverted);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("second ordinary declarative canary synchronizes through the frozen core", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(ordinaryOneSidedSyncScenario);
  strictEqual(result.status, "completed");
  const local = result.evidence?.machine.observations.find(value => value.captureAs === "local-b");
  strictEqual(local?.value.exists, true);
  strictEqual(local?.value.sizeBytes, 3);
});
