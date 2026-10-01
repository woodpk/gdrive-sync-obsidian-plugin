import { notStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { clonedStateDetectedScenario } from "../scenarios/07c/cloned-state-detected";
import { restoredStaleStateReconcilesScenario } from "../scenarios/07c/restored-stale-state-reconciles";
import { cancelBeforeEffectScenario } from "../scenarios/07c/cancel-before-effect";
import { cancelAfterEffectScenario } from "../scenarios/07c/cancel-after-effect";
import { repeatedCancellationScenario } from "../scenarios/07c/repeated-cancellation";

const scenarios = [
  clonedStateDetectedScenario,
  restoredStaleStateReconcilesScenario,
  cancelBeforeEffectScenario,
  cancelAfterEffectScenario,
  repeatedCancellationScenario,
];

for (const scenario of scenarios) {
  test(`${scenario.id} executes device-authority/cancellation semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
    strictEqual(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("clone condition is classified conservatively instead of silently inheriting writer authority", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(clonedStateDetectedScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const state = result.captures["state-b"] as { status?: string; reason?: string };
  strictEqual(state.status, "recovery-required");
  strictEqual(state.reason, "clone-or-restore-suspected");
});

test("restored stale state reconciles to newer remote content instead of overwriting it", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(restoredStaleStateReconcilesScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const oldLocal = result.captures["old-local"] as { hash?: string };
  const localAfter = result.captures["local-after"] as { hash?: string };
  const remoteAfter = result.captures["remote-after"] as { hash?: string };
  strictEqual(typeof oldLocal.hash, "string");
  strictEqual(localAfter.hash, remoteAfter.hash);
  notStrictEqual(localAfter.hash, oldLocal.hash);
});

test("after-effect cancellation preserves exactly one first effect before reconciliation completes the plan", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(cancelAfterEffectScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const a = (result.captures["a-before"] as { exists?: boolean }).exists === true;
  const b = (result.captures["b-before"] as { exists?: boolean }).exists === true;
  strictEqual(Number(a) + Number(b), 1);
  strictEqual((result.captures["a-after"] as { exists?: boolean }).exists, true);
  strictEqual((result.captures["b-after"] as { exists?: boolean }).exists, true);
});

test("wrong optimistic cancellation expectation fails deterministically", async () => {
  const steps = cancelBeforeEffectScenario.steps.map(step =>
    step.id === "assert-no-effect" ? { ...step, expected: true } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...cancelBeforeEffectScenario, id: "s07c-wrong-cancellation-expectation", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});
