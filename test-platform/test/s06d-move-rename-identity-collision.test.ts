import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { ambiguousLocalMoveScenario } from "../scenarios/06d/ambiguous-local-move";
import { caseCollisionScenario } from "../scenarios/06d/case-collision";
import { destinationCollisionScenario } from "../scenarios/06d/destination-collision";
import { invalidTargetPathScenario } from "../scenarios/06d/invalid-target-path";
import { localRenameScenario } from "../scenarios/06d/local-rename";
import { remoteRenameScenario } from "../scenarios/06d/remote-rename";
import { unicodeCollisionScenario } from "../scenarios/06d/unicode-collision";

const scenarios = [
  localRenameScenario,
  remoteRenameScenario,
  ambiguousLocalMoveScenario,
  destinationCollisionScenario,
  caseCollisionScenario,
  unicodeCollisionScenario,
  invalidTargetPathScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes through production move/path semantics`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify({ scenarioId: result.scenarioId, classification: result.classification, reason: result.reason, steps: result.steps }, null, 2));
    strictEqual(result.evidence?.machine.verdict.status, "completed");
  });
}

test("local rename preserves the existing remote object identity", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(localRenameScenario);
  strictEqual(result.status, "completed");
  const before = result.captures["remote-before"] as { readonly remoteObjectId?: string };
  const after = result.captures["remote-after"] as { readonly remoteObjectId?: string };
  strictEqual(typeof before.remoteObjectId, "string");
  strictEqual(after.remoteObjectId, before.remoteObjectId);
});

test("external remote rename preserves Drive identity before production applies it locally", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(remoteRenameScenario);
  strictEqual(result.status, "completed");
  const before = result.captures["remote-before"] as { readonly remoteObjectId?: string };
  const moved = result.captures["remote-moved"] as { readonly remoteObjectId?: string };
  strictEqual(typeof before.remoteObjectId, "string");
  strictEqual(moved.remoteObjectId, before.remoteObjectId);
});

test("ambiguous local rename never becomes an identity-preserving move", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(ambiguousLocalMoveScenario);
  strictEqual(result.status, "completed");
  const plan = result.captures.plan as { readonly operations?: readonly { readonly kind?: string }[] };
  strictEqual(plan.operations?.some(operation => operation.kind === "blocked-unsafe"), true);
  strictEqual(plan.operations?.some(operation => operation.kind === "identity-preserving-move"), false);
});

test("wrong expected rename destination fails deterministically", async () => {
  const steps = localRenameScenario.steps.map(step =>
    step.id === "assert-new-remote" ? { ...step, expected: false } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...localRenameScenario, id: "s06d-local-rename-wrong-destination", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("remote rename evidence is deterministic across repeated runs", async () => {
  const first = await DeterministicScenarioRunner.canonical().run(remoteRenameScenario);
  const second = await DeterministicScenarioRunner.canonical().run(remoteRenameScenario);
  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});
