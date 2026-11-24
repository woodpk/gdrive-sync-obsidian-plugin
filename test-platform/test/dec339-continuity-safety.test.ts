/**
 * DEC-365 BVP deterministic safety controls. This battery intentionally does
 * NOT pretend to execute the shipping IndexedDB/Google API adapter: real
 * composition and request-volume equality are verified by native production
 * integration tests under PHX-CI. No new production seam, no mutation runner.
 */
import * as assert from "node:assert/strict";
import { test } from "node:test";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { remoteRenameScenario } from "../scenarios/06d/remote-rename";
import { partialChangePageScenario } from "../scenarios/07b/partial-change-page";
import { partialRemoteListingScenario } from "../scenarios/07b/partial-remote-listing";
import { rootIdentityMismatchScenario } from "../scenarios/07b/root-identity-mismatch";
import { ambiguousAppliedScenario } from "../scenarios/07a/ambiguous-applied";

test("DEC365 BVP stable remote ID survives external rename with existing production behavior", async t => {
  const result = await DeterministicScenarioRunner.canonical().run(remoteRenameScenario);
  assert.equal(result.status, "completed");
  assert.equal(result.steps.every(step => step.matchedExpectation), true);
  const first = result.captures["remote-before"] as { readonly remoteObjectId?: string };
  const moved = result.captures["remote-moved"] as { readonly remoteObjectId?: string };
  assert.equal(typeof first?.remoteObjectId, "string");
  assert.equal(moved?.remoteObjectId, first?.remoteObjectId);
  t.diagnostic("DEC365_BVP_SAFETY " + JSON.stringify({
    scenario: "stable-id-rename", simulated: true, stepCount: result.steps.length, matched: result.steps.length,
  }));
});

test("DEC365 BVP incomplete feed never becomes deletion permission", async t => {
  const result = await DeterministicScenarioRunner.canonical().run(partialChangePageScenario);
  assert.equal(result.status, "completed");
  assert.equal(result.steps.every(step => step.matchedExpectation), true);
  assert.equal((result.captures.local as { exists?: boolean })?.exists, true);
  assert.equal((result.captures.remote as { exists?: boolean })?.exists, true);
  t.diagnostic("DEC365_BVP_SAFETY " + JSON.stringify({
    scenario: "partial-feed", simulated: true, stepCount: result.steps.length, matched: result.steps.length,
  }));
});

test("DEC365 BVP incomplete remote listing retains local file and blocks unsafe plan", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(partialRemoteListingScenario);
  assert.equal(result.status, "completed");
  const plan = result.captures["plan-view"] as { operationKinds?: readonly string[] };
  assert.equal(plan.operationKinds?.includes("blocked-unsafe"), true);
  assert.equal(plan.operationKinds?.includes("trash-local"), false);
});

test("DEC365 BVP root identity fault and ambiguous late effect remain fail closed", async () => {
  for (const scenario of [rootIdentityMismatchScenario, ambiguousAppliedScenario]) {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    assert.equal(result.status, "completed");
    assert.equal(result.steps.every(step => step.matchedExpectation), true);
  }
});
