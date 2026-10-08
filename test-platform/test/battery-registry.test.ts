import { deepStrictEqual, strictEqual } from "node:assert";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { windowsLiveSmokeScenario } from "../scenarios/live/windows-live-smoke";
import { getLiveBattery, listLiveBatteryNames } from "./batteries/battery-registry";
import { validateScenarioDefinition } from "../src/scenario/scenario-contract";

const EXPECTED_BATTERIES = [
  "s09a-dual-device-readiness",
  "s09a-ios-initial-sync",
  "s09a-windows-initial-sync",
  "s09b-bidirectional-sync",
  "s09b-clean-text-merge",
  "s09c-interruption-resume",
  "s09c-offline-reconnect",
  "s09d-large-transfer",
  "s09d-unicode-path-roundtrip",
  "s09e-auth-revocation-restore",
  "s09e-plugin-disable-reenable",
  "s09e-uninstall-reinstall",
  "windows-live-smoke",
];

test("live battery registry exposes the complete physical battery set", () => {
  deepStrictEqual(listLiveBatteryNames(), EXPECTED_BATTERIES);
  strictEqual(getLiveBattery("missing"), undefined);

  for (const name of EXPECTED_BATTERIES) {
    const battery = getLiveBattery(name);
    strictEqual(battery?.name, name);
    strictEqual((battery?.requiredDeviceLabels.length ?? 0) > 0, true);
    const scenario = battery!.createScenario();
    strictEqual(validateScenarioDefinition(scenario).ok, true);
    deepStrictEqual(scenario.executionModes, ["live"]);
  }
});

test("every compiled live scenario module is represented by one registered battery", () => {
  const compiledScenarioRoot = resolve(__dirname, "../scenarios/live");
  const scenarioModules = readdirSync(compiledScenarioRoot)
    .filter(name => name.endsWith(".js"))
    .map(name => name.slice(0, -3))
    .sort();

  deepStrictEqual(scenarioModules, [
    "s09a-dual-device-readiness",
  "s09a-ios-initial-sync",
  "s09a-windows-initial-sync",
    "s09b-bidirectional-sync",
    "s09b-clean-text-merge",
    "s09c-interruption-resume",
    "s09c-offline-reconnect",
    "s09d-large-transfer",
    "s09d-unicode-path-roundtrip",
    "s09e-auth-revocation-restore",
    "s09e-plugin-disable-reenable",
    "s09e-uninstall-reinstall",
    "windows-live-smoke",
  ]);
  strictEqual(scenarioModules.length, EXPECTED_BATTERIES.length);
});

test("checkpoint batteries bind every declared checkpoint to explicit operator instructions", () => {
  for (const name of [
    "s09c-interruption-resume",
    "s09c-offline-reconnect",
    "s09e-auth-revocation-restore",
    "s09e-plugin-disable-reenable",
    "s09e-uninstall-reinstall",
  ]) {
    const battery = getLiveBattery(name)!;
    const scenario = battery.createScenario();
    const keys = scenario.steps
      .filter(step => step.kind === "checkpoint")
      .map(step => {
        if (step.kind !== "checkpoint") return "";
        if (step.operation === "capture") return step.checkpointId;
        return step.checkpointRef ?? step.id;
      })
      .sort();
    deepStrictEqual(keys, Object.keys(battery.checkpoints ?? {}).sort());
  }
});

test("Windows live smoke battery remains bounded to the proven fixture identity", () => {
  strictEqual(windowsLiveSmokeScenario.id, "battery-windows-live-smoke-01");
  deepStrictEqual(windowsLiveSmokeScenario.executionModes, ["live"]);
  strictEqual(windowsLiveSmokeScenario.steps.length, 6);

  const hashAssertion = windowsLiveSmokeScenario.steps[5];
  strictEqual(hashAssertion.kind, "assert");
  if (hashAssertion.kind === "assert" && "expected" in hashAssertion) {
    strictEqual(
      hashAssertion.expected,
      "8dcbdff420cef7b5075d718b025a3a0ee66c375bff66535741adb31282d53895",
    );
  } else {
    throw new Error("expected final step to be a hash assertion");
  }
});
