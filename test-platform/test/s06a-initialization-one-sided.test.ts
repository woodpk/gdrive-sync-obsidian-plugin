import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario, type ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { divergentNoBaseCollisionScenario } from "../scenarios/06a/divergent-no-base-collision";
import { establishedEqualNoOpScenario } from "../scenarios/06a/established-equal-no-op";
import { establishedLocalOnlyModificationScenario } from "../scenarios/06a/established-local-only-modification";
import { establishedRemoteOnlyModificationScenario } from "../scenarios/06a/established-remote-only-modification";
import { freshEqualCollisionScenario } from "../scenarios/06a/fresh-equal-collision";
import { freshLocalOnlyScenario } from "../scenarios/06a/fresh-local-only";
import { freshRemoteOnlyScenario } from "../scenarios/06a/fresh-remote-only";

const scenarios = [
  freshLocalOnlyScenario,
  freshRemoteOnlyScenario,
  freshEqualCollisionScenario,
  divergentNoBaseCollisionScenario,
  establishedLocalOnlyModificationScenario,
  establishedRemoteOnlyModificationScenario,
  establishedEqualNoOpScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes through the frozen scenario platform`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed");
    strictEqual(result.evidence?.machine.verdict.status, "completed");
    strictEqual(result.evidence?.machine.traceability.length > 0, true);
  });
}

test("wrong fresh-local expectation fails deterministically", async () => {
  const steps = freshLocalOnlyScenario.steps.map(step =>
    step.id === "assert-upload"
      ? { ...step, expected: "download-create" }
      : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...freshLocalOnlyScenario,
    id: "s06a-fresh-local-only-wrong-expectation",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("missing required observation cannot pass", async () => {
  const scenario = defineScenario({
    id: "s06a-missing-observation-fails-closed",
    description: "An assertion over an observation that was never captured must fail closed.",
    traceability: { targets: [{ kind: "completion-evidence", id: "S06A-MISSING-OBSERVATION" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "assert-missing", kind: "assert", assertion: "exists", observationRef: "never-captured", expected: true },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-observation");
});
