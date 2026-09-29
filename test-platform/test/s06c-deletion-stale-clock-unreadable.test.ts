import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { bothDeletedScenario } from "../scenarios/06c/both-deleted";
import { clockSkewScenario } from "../scenarios/06c/clock-skew";
import { localDeletionScenario } from "../scenarios/06c/local-deletion";
import { noBaseAbsenceScenario } from "../scenarios/06c/no-base-absence";
import { remoteDeletionScenario } from "../scenarios/06c/remote-deletion";
import { staleDeviceReturnScenario } from "../scenarios/06c/stale-device-return";
import { unreadableLocalPathScenario } from "../scenarios/06c/unreadable-local-path";

const scenarios = [
  localDeletionScenario,
  remoteDeletionScenario,
  bothDeletedScenario,
  noBaseAbsenceScenario,
  unreadableLocalPathScenario,
  clockSkewScenario,
  staleDeviceReturnScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes through the frozen scenario platform`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed");
    strictEqual(result.evidence?.machine.verdict.status, "completed");
    strictEqual((result.evidence?.machine.traceability.length ?? 0) > 0, true);
  });
}

test("wrong destructive expectation fails deterministically", async () => {
  const steps = localDeletionScenario.steps.map(step =>
    step.id === "assert-remote-trash"
      ? { ...step, expected: "upload-create" }
      : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...localDeletionScenario,
    id: "s06c-local-deletion-wrong-expectation",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("stale-device return evidence is deterministic across repeated runs", async () => {
  const first = await DeterministicScenarioRunner.canonical().run(staleDeviceReturnScenario);
  const second = await DeterministicScenarioRunner.canonical().run(staleDeviceReturnScenario);
  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});
