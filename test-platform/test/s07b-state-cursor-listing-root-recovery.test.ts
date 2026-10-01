import { deepStrictEqual, notStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { corruptStateScenario } from "../scenarios/07b/corrupt-state";
import { truncatedStateScenario } from "../scenarios/07b/truncated-state";
import { incompatibleStateVersionScenario } from "../scenarios/07b/incompatible-state-version";
import { lostChangeCursorScenario } from "../scenarios/07b/lost-change-cursor";
import { partialRemoteListingScenario } from "../scenarios/07b/partial-remote-listing";
import { partialChangePageScenario } from "../scenarios/07b/partial-change-page";
import { missingManagedRootScenario } from "../scenarios/07b/missing-managed-root";
import { rootIdentityMismatchScenario } from "../scenarios/07b/root-identity-mismatch";
import { incompatibleRootProtocolScenario } from "../scenarios/07b/incompatible-root-protocol";

const scenarios = [
  corruptStateScenario,
  truncatedStateScenario,
  incompatibleStateVersionScenario,
  lostChangeCursorScenario,
  partialRemoteListingScenario,
  partialChangePageScenario,
  missingManagedRootScenario,
  rootIdentityMismatchScenario,
  incompatibleRootProtocolScenario,
];

for (const scenario of scenarios) {
  test(`${scenario.id} executes fail-closed recovery semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify({
      scenarioId: result.scenarioId,
      status: result.status,
      classification: result.classification,
      reason: result.reason,
      steps: result.steps,
      captures: result.captures,
    }, null, 2));
    strictEqual(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("lost cursor is conservatively re-baselined rather than silently retained or advanced", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(lostChangeCursorScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const before = result.captures.before as { changeCursor?: string };
  const after = result.captures.after as { changeCursor?: string };
  strictEqual(typeof before.changeCursor, "string");
  strictEqual(typeof after.changeCursor, "string");
  notStrictEqual(after.changeCursor, before.changeCursor);
});

test("partial remote listing cannot become a destructive local-delete plan", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(partialRemoteListingScenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const view = result.captures["plan-view"] as { operationKinds?: readonly string[] };
  strictEqual(Array.isArray(view.operationKinds), true);
  strictEqual(view.operationKinds?.includes("blocked-unsafe"), true);
  strictEqual(view.operationKinds?.includes("trash-local"), false);
});

test("state-integrity recovery scenarios all return to trusted state with both copies preserved", async () => {
  for (const scenario of [corruptStateScenario, truncatedStateScenario, incompatibleStateVersionScenario]) {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
    deepStrictEqual((result.captures["recovered-state"] as { status?: string }).status, "trusted");
    strictEqual((result.captures.local as { exists?: boolean }).exists, true);
    strictEqual((result.captures.remote as { exists?: boolean }).exists, true);
  }
});

test("wrong optimistic deletion expectation fails deterministically", async () => {
  const steps = partialRemoteListingScenario.steps.map(step =>
    step.id === "assert-blocked"
      ? { ...step, expected: "trash-local" }
      : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...partialRemoteListingScenario,
    id: "s07b-wrong-optimistic-deletion-expectation",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-failed");
});
