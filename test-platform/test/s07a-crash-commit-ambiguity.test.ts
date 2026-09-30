import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { afterCanonicalStateWriteScenario } from "../scenarios/07a/after-canonical-state-write";
import { afterRemoteEffectScenario } from "../scenarios/07a/after-remote-effect";
import { ambiguousAppliedScenario } from "../scenarios/07a/ambiguous-applied";
import { ambiguousNotAppliedScenario } from "../scenarios/07a/ambiguous-not-applied";
import { beforeCanonicalStateWriteScenario } from "../scenarios/07a/before-canonical-state-write";
import { beforeRemoteDispatchScenario } from "../scenarios/07a/before-remote-dispatch";

const scenarios = [
  beforeRemoteDispatchScenario,
  afterRemoteEffectScenario,
  beforeCanonicalStateWriteScenario,
  afterCanonicalStateWriteScenario,
  ambiguousAppliedScenario,
  ambiguousNotAppliedScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes crash/recovery semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(
      result.status,
      "completed",
      JSON.stringify({
        scenarioId: result.scenarioId,
        classification: result.classification,
        reason: result.reason,
        steps: result.steps,
        captures: result.captures,
      }, null, 2),
    );
    strictEqual(result.evidence?.machine.verdict.status, "completed");
  });
}

const remoteId = (result: Awaited<ReturnType<DeterministicScenarioRunner["run"]>>, ref: string): string | undefined =>
  (result.captures[ref] as { readonly remoteObjectId?: string } | undefined)?.remoteObjectId;

test("pre-effect crash eventually creates exactly one stable REMOTE identity", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(beforeRemoteDispatchScenario);
  strictEqual(result.status, "completed");
  strictEqual(remoteId(result, "remote-before"), undefined);
  strictEqual(remoteId(result, "remote-after"), remoteId(result, "remote-final"));
});

for (const scenario of [
  afterRemoteEffectScenario,
  beforeCanonicalStateWriteScenario,
  afterCanonicalStateWriteScenario,
  ambiguousAppliedScenario,
] as const) {
  test(`${scenario.id} preserves the existing physical REMOTE identity across recovery and repeated restart`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(result.status, "completed");
    const before = remoteId(result, "remote-before");
    strictEqual(typeof before, "string");
    strictEqual(remoteId(result, "remote-after"), before);
    strictEqual(remoteId(result, "remote-final"), before);
  });
}

test("ambiguous not-applied remains absent initially then creates one stable REMOTE identity", async () => {
  const result = await DeterministicScenarioRunner.canonical().run(ambiguousNotAppliedScenario);
  strictEqual(result.status, "completed");
  strictEqual(remoteId(result, "remote-before"), undefined);
  const after = remoteId(result, "remote-after");
  strictEqual(typeof after, "string");
  strictEqual(remoteId(result, "remote-final"), after);
});

test("wrong expected recovery state fails deterministically", async () => {
  const steps = beforeCanonicalStateWriteScenario.steps.map(step =>
    step.id === "assert-base" ? { ...step, expected: 99 } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = {
    ...beforeCanonicalStateWriteScenario,
    id: "s07a-wrong-recovery-state",
    steps,
  } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});
