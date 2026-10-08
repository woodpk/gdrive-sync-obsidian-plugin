import { strictEqual } from "node:assert";
import { test } from "node:test";

import {
  defineScenario,
  validateScenarioDefinition,
  type ScenarioDefinition,
} from "../src/scenario/scenario-contract";
import {
  DeterministicScenarioRunner,
  type ScenarioStepExecutor,
} from "../src/scenario/scenario-runner";

function liveScenario(expect: ScenarioDefinition["steps"][number]["expect"]): ScenarioDefinition {
  return defineScenario({
    id: "battery-support-expected-non-success",
    description: "Battery support expectation fixture.",
    traceability: { targets: [{ kind: "completion-evidence", id: "BATTERY-SUPPORT" }] },
    executionModes: ["live"],
    steps: [
      {
        id: "observe",
        kind: "observe",
        subject: "device-state",
        device: "windows",
        captureAs: "status",
        expect,
      },
    ],
  });
}

test("blocked-or-failed expectation accepts a blocked live capability without fabricating success", async () => {
  const executor: ScenarioStepExecutor = {
    executionMode: "live",
    deviceIdentities: ["device:test"],
    async execute() {
      return { status: "blocked", classification: "physical-capability-unavailable" };
    },
  };
  const result = await new DeterministicScenarioRunner({}, executor).run(
    liveScenario({ status: "blocked-or-failed" }),
  );
  strictEqual(result.status, "completed");
  strictEqual(result.steps[0]?.status, "blocked");
  strictEqual(result.steps[0]?.matchedExpectation, true);
});

test("blocked-or-failed expectation rejects completed execution", async () => {
  const executor: ScenarioStepExecutor = {
    executionMode: "live",
    deviceIdentities: ["device:test"],
    async execute() {
      return { status: "completed", value: { kind: "idle-ready" } };
    },
  };
  const result = await new DeterministicScenarioRunner({}, executor).run(
    liveScenario({ status: "blocked-or-failed" }),
  );
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "expected-outcome-not-observed");
});

test("bounded live pattern fixture definition validates while preserving the 32 MiB cap", () => {
  const valid = {
    id: "pattern-live",
    description: "Pattern fixture",
    traceability: { targets: [{ kind: "completion-evidence", id: "PATTERN" }] },
    executionModes: ["live"],
    steps: [
      {
        id: "pattern",
        kind: "fixture",
        operation: "put-local-pattern",
        device: "ios",
        path: "large.bin",
        byteLength: 8 * 1024 * 1024,
        seed: "fixture-seed",
      },
    ],
  };

  strictEqual(validateScenarioDefinition(valid).ok, true);
  const invalid = structuredClone(valid) as any;
  invalid.steps[0].byteLength = 33_554_433;
  strictEqual(validateScenarioDefinition(invalid).ok, false);
});
