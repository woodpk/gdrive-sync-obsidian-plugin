import assert from "node:assert/strict";
import test from "node:test";
import { getLiveBattery, listLiveBatteryNames } from "../src/batteries/battery-registry";
import {
  WINDOWS_LIVE_SMOKE_CANARY_SHA256,
  createWindowsLiveSmokeScenario,
} from "../src/batteries/windows-live-smoke";

test("live battery registry exposes the Windows smoke battery", () => {
  assert.deepEqual(listLiveBatteryNames(), ["windows-live-smoke"]);
  assert.equal(getLiveBattery("windows-live-smoke")?.name, "windows-live-smoke");
  assert.equal(getLiveBattery("missing"), undefined);
});

test("Windows live smoke battery remains bounded to the proven live fixture path", () => {
  const scenario = createWindowsLiveSmokeScenario();

  assert.equal(scenario.id, "battery-windows-live-smoke-01");
  assert.deepEqual(scenario.executionModes, ["live"]);
  assert.equal(scenario.steps.length, 6);
  assert.deepEqual(
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
  assert.equal(hashAssertion.kind, "assert");
  if (hashAssertion.kind === "assert" && "expected" in hashAssertion) {
    assert.equal(hashAssertion.expected, WINDOWS_LIVE_SMOKE_CANARY_SHA256);
  } else {
    assert.fail("expected final step to be a hash assertion");
  }
});
