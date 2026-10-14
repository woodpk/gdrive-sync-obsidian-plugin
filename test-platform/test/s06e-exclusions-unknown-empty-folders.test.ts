import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import type { ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { deviceLocalConfigScenario } from "../scenarios/06e/device-local-config";
import { emptyLocalFolderScenario } from "../scenarios/06e/empty-local-folder";
import { emptyRemoteFolderScenario } from "../scenarios/06e/empty-remote-folder";
import { excludedLocalDefaultScenario } from "../scenarios/06e/excluded-local-default";
import { excludedRemoteDefaultScenario } from "../scenarios/06e/excluded-remote-default";
import { hiddenDotfileIncludedScenario } from "../scenarios/06e/hidden-dotfile-included";
import { ownPluginSettingsProtectedScenario } from "../scenarios/06e/own-plugin-settings-protected";
import { protectedConfigScenario } from "../scenarios/06e/protected-config";
import { thirdPartySettingsExcludedScenario } from "../scenarios/06e/third-party-settings-excluded";
import { unknownBinaryLocalScenario } from "../scenarios/06e/unknown-binary-local";
import { unknownBinaryRemoteScenario } from "../scenarios/06e/unknown-binary-remote";

const scenarios = [
  excludedLocalDefaultScenario,
  excludedRemoteDefaultScenario,
  hiddenDotfileIncludedScenario,
  deviceLocalConfigScenario,
  protectedConfigScenario,
  ownPluginSettingsProtectedScenario,
  thirdPartySettingsExcludedScenario,
  unknownBinaryLocalScenario,
  unknownBinaryRemoteScenario,
  emptyLocalFolderScenario,
  emptyRemoteFolderScenario,
] as const;

for (const scenario of scenarios) {
  test(`${scenario.id} executes through production scope/file/folder semantics`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(scenario);
    strictEqual(
      result.status,
      "completed",
      JSON.stringify({
        scenarioId: result.scenarioId,
        classification: result.classification,
        reason: result.reason,
        steps: result.steps,
      }, null, 2),
    );
    strictEqual(result.evidence?.machine.verdict.status, "completed");
  });
}

test("default exclusion is symmetric: excluded local content is not uploaded and excluded remote content is not downloaded", async () => {
  const local = await DeterministicScenarioRunner.canonical().run(excludedLocalDefaultScenario);
  const remote = await DeterministicScenarioRunner.canonical().run(excludedRemoteDefaultScenario);
  strictEqual(local.status, "completed");
  strictEqual(remote.status, "completed");
  strictEqual((local.captures.remote as { readonly status?: string }).status, "absent");
  strictEqual((remote.captures.local as { readonly status?: string }).status, "absent");
});

test("hidden ordinary dotfiles remain included while protected and unknown plugin configuration remains local", async () => {
  const hidden = await DeterministicScenarioRunner.canonical().run(hiddenDotfileIncludedScenario);
  const ownPlugin = await DeterministicScenarioRunner.canonical().run(ownPluginSettingsProtectedScenario);
  const thirdParty = await DeterministicScenarioRunner.canonical().run(thirdPartySettingsExcludedScenario);
  strictEqual(hidden.status, "completed");
  strictEqual(ownPlugin.status, "completed");
  strictEqual(thirdParty.status, "completed");
  strictEqual((hidden.captures.remote as { readonly status?: string }).status, "present");
  strictEqual((ownPlugin.captures.remote as { readonly status?: string }).status, "absent");
  strictEqual((thirdParty.captures.remote as { readonly status?: string }).status, "absent");
});

test("unknown extensions remain ordinary managed binary content in both directions", async () => {
  const local = await DeterministicScenarioRunner.canonical().run(unknownBinaryLocalScenario);
  const remote = await DeterministicScenarioRunner.canonical().run(unknownBinaryRemoteScenario);
  strictEqual(local.status, "completed");
  strictEqual(remote.status, "completed");
  strictEqual((local.captures.remote as { readonly sizeBytes?: number }).sizeBytes, 4);
  strictEqual((remote.captures.local as { readonly sizeBytes?: number }).sizeBytes, 5);
});

test("empty folders remain folders without marker-file substitution in both directions", async () => {
  const local = await DeterministicScenarioRunner.canonical().run(emptyLocalFolderScenario);
  const remote = await DeterministicScenarioRunner.canonical().run(emptyRemoteFolderScenario);
  strictEqual(local.status, "completed");
  strictEqual(remote.status, "completed");
  strictEqual((local.captures.remote as { readonly entityKind?: string }).entityKind, "folder");
  strictEqual((remote.captures.local as { readonly entityKind?: string }).entityKind, "folder");
  strictEqual((local.captures.marker as { readonly status?: string }).status, "absent");
  strictEqual((remote.captures.marker as { readonly status?: string }).status, "absent");
});

test("wrong expectation about excluded mutation fails deterministically", async () => {
  const steps = excludedLocalDefaultScenario.steps.map(step =>
    step.id === "assert-remote" ? { ...step, expected: true } : step,
  ) as unknown as ScenarioDefinition["steps"];
  const wrong = { ...excludedLocalDefaultScenario, id: "s06e-excluded-local-wrong-mutation", steps } as ScenarioDefinition;
  const result = await DeterministicScenarioRunner.canonical().run(wrong);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
});

test("empty-folder evidence is deterministic across repeated runs", async () => {
  const first = await DeterministicScenarioRunner.canonical().run(emptyRemoteFolderScenario);
  const second = await DeterministicScenarioRunner.canonical().run(emptyRemoteFolderScenario);
  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(first.evidence?.machineJson, second.evidence?.machineJson);
});
