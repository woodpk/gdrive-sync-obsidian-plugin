/**
 * DEC-339 / D339-07A: existing BVP world is the baseline control, not proof
 * that the dormant inventory optimizer is active. PHX-CI owns execution.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { afterRemoteEffectScenario } from "../scenarios/07a/after-remote-effect";
import { ambiguousAppliedScenario } from "../scenarios/07a/ambiguous-applied";
import { partialRemoteListingScenario } from "../scenarios/07b/partial-remote-listing";
import { partialChangePageScenario } from "../scenarios/07b/partial-change-page";
import { rootIdentityMismatchScenario } from "../scenarios/07b/root-identity-mismatch";
import { destructiveThresholdBlockedScenario } from "../scenarios/07e/destructive-threshold-blocked";

const remoteId = (value: unknown): string | undefined =>
  (value as { remoteObjectId?: string } | undefined)?.remoteObjectId;
const exists = (value: unknown): boolean =>
  (value as { exists?: boolean } | undefined)?.exists === true;

for (const scenario of [afterRemoteEffectScenario, ambiguousAppliedScenario]) {
  test(`DEC-339 A03/A09 legacy recovery: ${scenario.id} retains one stable physical ID`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    assert.equal(result.status, "completed", JSON.stringify(result));
    assert.equal(result.steps.every(step => step.matchedExpectation), true);
    const before = remoteId(result.captures["remote-before"]);
    assert.equal(typeof before, "string", "effect must exist before restart");
    assert.equal(remoteId(result.captures["remote-after"]), before);
    assert.equal(remoteId(result.captures["remote-final"]), before);
    assert.equal((result.captures["state-after"] as { baseCount?: number }).baseCount, 1);
  });
}

test("DEC-339 A07 / CHANGE-007 baseline partial listing forbids deletion and retains LOCAL", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(partialRemoteListingScenario);
  assert.equal(result.status, "completed", JSON.stringify(result));
  const plan = result.captures["plan-view"] as { operationKinds?: readonly string[] };
  assert.equal(plan.operationKinds?.includes("blocked-unsafe"), true);
  assert.equal(plan.operationKinds?.includes("trash-local"), false);
  assert.equal(exists(result.captures.local), true);
  assert.equal((result.captures.remote as { exists?: boolean }).exists, false);
});

test("DEC-339 A05 baseline incomplete Changes page requires recovery, not invented absence", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(partialChangePageScenario);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(exists(result.captures.local), true);
  assert.equal(exists(result.captures.remote), true);
  assert.equal(result.steps.every(step => step.matchedExpectation), true);
  assert.equal(result.steps.some(step => step.stepId === "incremental"), true);
});

test("DEC-339 A03 baseline wrong managed-root identity does not erase either copy", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(rootIdentityMismatchScenario);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(exists(result.captures.local), true);
  assert.equal(exists(result.captures.remote), true);
  assert.equal(result.steps.every(step => step.matchedExpectation), true);
});

test("DEC-339 recovery/destructive baseline 25-path threshold blocks physical delete", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(destructiveThresholdBlockedScenario);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.steps.every(step => step.matchedExpectation), true);
  assert.equal(exists(result.captures["remote-0"]), true);
  assert.equal(exists(result.captures["remote-24"]), true);
  assert.equal(Object.keys(result.captures).filter(x => /^remote-\d+$/.test(x)).length, 25);
});
