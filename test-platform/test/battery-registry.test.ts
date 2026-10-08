import { deepStrictEqual, strictEqual } from "node:assert";
import { test } from "node:test";

import { getLiveBattery, listLiveBatteryNames } from "../src/batteries/battery-registry";
import {
  WINDOWS_LIVE_SMOKE_CANARY_SHA256,
  createWindowsLiveSmokeScenario,
} from "../src/batteries/windows-live-smoke";

test("live battery registry exposes the Windows smoke battery", () => {
  deepStrictEqual(listLiveBatteryNames(), ["windows-live-smoke"]);
  strictEqual(getLiveBattery("windows-live-smoke")?.name, "windows-live-smoke");
  strictEqual(getLiveBattery("missing"), undefined);
});

test("Windows live smoke battery remains bounded to the proven live fixture path", () => {
  const scenario = createWindowsLiveSmokeScenario();

  strictEqual(scenario.id, "battery-windows-live-smoke-01");
  deepStrictEqual(scenario.executionModes, ["live"]);
  strictEqual(scenario.steps.length, 6);
  deepStrictEqual(
    scenario.steps.map(step => step.id),
    [
      "observe-windows-product",
      "create-canary",
      "observe-canary",
      "assert-canary-exists",
      "assert-canary-size",
      "assert-canary-hash",
    ],
  );

  const hashAssertion = scenario.steps[5];
  strictEqual(hashAssertion.kind, "assert");
  if (hashAssertion.kind === "assert" && "expected" in hashAssertion) {
    strictEqual(hashAssertion.expected, WINDOWS_LIVE_SMOKE_CANARY_SHA256);
  } else {
    throw new Error("expected final step to be a hash assertion");
  }
});
