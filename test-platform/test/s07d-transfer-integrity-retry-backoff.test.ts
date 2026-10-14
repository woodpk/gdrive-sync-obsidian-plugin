import { equal } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { uploadIntegrityScenario } from "../scenarios/07d/upload-integrity";
import { downloadIntegrityScenario } from "../scenarios/07d/download-integrity";
import { localSourceChangedAfterPreviewScenario } from "../scenarios/07d/local-source-changed-after-preview";
import { remoteSourceChangedAfterPreviewScenario } from "../scenarios/07d/remote-source-changed-after-preview";
import { transientRemoteFailureScenario } from "../scenarios/07d/transient-remote-failure";

const scenarios = [
  uploadIntegrityScenario,
  downloadIntegrityScenario,
  localSourceChangedAfterPreviewScenario,
  remoteSourceChangedAfterPreviewScenario,
  transientRemoteFailureScenario,
];

for (const scenario of scenarios) {
  test(`${scenario.id} executes transfer safety semantics through production logic`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    equal(result.status, "completed", JSON.stringify(result, null, 2));
    equal(result.steps.every(step => step.matchedExpectation), true);
  });
}

test("upload and download observations prove end-to-end content identity", async () => {
  for (const scenario of [uploadIntegrityScenario, downloadIntegrityScenario]) {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    equal(result.status, "completed", JSON.stringify(result, null, 2));
    const local = result.captures.local as { hash?: string; sizeBytes?: number };
    const remote = result.captures.remote as { hash?: string; sizeBytes?: number };
    equal(typeof local.hash, "string");
    equal(local.hash, remote.hash);
    equal(local.sizeBytes, remote.sizeBytes);
  }
});

test("source changes after preview are rejected as stale and later reconcile transfers only current bytes", async () => {
  const localRace = await DeterministicScenarioRunner.canonical().run(localSourceChangedAfterPreviewScenario);
  equal(localRace.status, "completed", JSON.stringify(localRace, null, 2));
  const localAfter = localRace.captures["local-after"] as { hash?: string; sizeBytes?: number };
  const remoteAfter = localRace.captures["remote-after"] as { hash?: string; sizeBytes?: number };
  equal(localAfter.hash, remoteAfter.hash);
  equal(localAfter.sizeBytes, 2);
  equal(remoteAfter.sizeBytes, 2);

  const remoteRace = await DeterministicScenarioRunner.canonical().run(remoteSourceChangedAfterPreviewScenario);
  equal(remoteRace.status, "completed", JSON.stringify(remoteRace, null, 2));
  const remoteCurrent = remoteRace.captures["remote-after"] as { hash?: string; sizeBytes?: number };
  const localCurrent = remoteRace.captures["local-after"] as { hash?: string; sizeBytes?: number };
  equal(localCurrent.hash, remoteCurrent.hash);
  equal(localCurrent.sizeBytes, 2);
  equal(remoteCurrent.sizeBytes, 2);
});

test("wrong retry expectation fails deterministically", async () => {
  const steps = transientRemoteFailureScenario.steps.map(step =>
    step.id === "assert-not-fabricated" ? { ...step, expected: true } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...transientRemoteFailureScenario, id: "s07d-wrong-retry-expectation", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  equal(result.status, "failed");
  equal(result.classification, "assertion-mismatch");
});
