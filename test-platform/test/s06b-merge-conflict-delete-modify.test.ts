import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { binaryConflictScenario } from "../scenarios/06b/binary-conflict";
import { cleanTextMergeScenario } from "../scenarios/06b/clean-text-merge";
import { localDeleteRemoteModifyScenario } from "../scenarios/06b/local-delete-remote-modify";
import { remoteDeleteLocalModifyScenario } from "../scenarios/06b/remote-delete-local-modify";
import { trueTextConflictScenario } from "../scenarios/06b/true-text-conflict";

const scenarios = [
  cleanTextMergeScenario,
  trueTextConflictScenario,
  binaryConflictScenario,
  localDeleteRemoteModifyScenario,
  remoteDeleteLocalModifyScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes through the frozen scenario platform`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed");
    strictEqual(result.evidence?.machine.verdict.status, "completed");
    strictEqual((result.evidence?.machine.traceability.length ?? 0) > 0, true);
  });
}

test("wrong expected clean-merge content fails deterministically", async () => {
  const steps = cleanTextMergeScenario.steps.map(step =>
    step.id === "assert-local-merged-hash"
      ? { ...step, expected: "sha256:96677089ce68593c0a0ab04a2348f2cca014285264531defc2afb84b0bf0b0c0" }
      : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...cleanTextMergeScenario,
    id: "s06b-clean-text-merge-wrong-content",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("true text conflict evidence is deterministic across repeated runs", async () => {
  const first = await DeterministicScenarioRunner.canonical().run(trueTextConflictScenario);
  const second = await DeterministicScenarioRunner.canonical().run(trueTextConflictScenario);
  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});

test("binary conflict evidence is deterministic across repeated runs", async () => {
  const first = await DeterministicScenarioRunner.canonical().run(binaryConflictScenario);
  const second = await DeterministicScenarioRunner.canonical().run(binaryConflictScenario);
  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});
