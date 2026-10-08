import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import { getLiveBattery, listLiveBatteryNames } from "../src/batteries/battery-registry";
import {
  WINDOWS_LIVE_SMOKE_CANARY_SHA256,
  createWindowsLiveSmokeScenario,
} from "../src/batteries/windows-live-smoke";
import { validateScenarioDefinition } from "../src/scenario/scenario-contract";

const EXPECTED_BATTERIES = [
  "s09a-dual-device-readiness",
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
      .map(step =>
        step.kind === "checkpoint" && step.operation === "capture"
          ? step.checkpointId
          : step.kind === "checkpoint"
            ? step.checkpointRef ?? step.id
            : "",
      )
      .sort();
    deepStrictEqual(keys, Object.keys(battery.checkpoints ?? {}).sort());
  }
});

test("Windows live smoke battery remains bounded to the proven live fixture path", () => {
  const scenario = createWindowsLiveSmokeScenario();
  strictEqual(scenario.id, "battery-windows-live-smoke-01");
  deepStrictEqual(scenario.executionModes, ["live"]);
  strictEqual(scenario.steps.length, 6);

  const hashAssertion = scenario.steps[5];
  strictEqual(hashAssertion.kind, "assert");
  if (hashAssertion.kind === "assert" && "expected" in hashAssertion) {
    strictEqual(hashAssertion.expected, WINDOWS_LIVE_SMOKE_CANARY_SHA256);
  } else {
    throw new Error("expected final step to be a hash assertion");
  }
});
