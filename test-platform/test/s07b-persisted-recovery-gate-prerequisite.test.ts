import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";

test("reconstructed virtual device restores persisted recovery gate and completes reviewed reconstruction", async () => {
  const scenario = defineScenario({
    id: "s07b-prereq-persisted-recovery-gate",
    description: "virtual reconstruction initializes the production recovery gate from persisted state without changing recovery policy",
    traceability: { targets: [{ kind: "requirement", id: "STATE-012" }, { kind: "requirement", id: "STATE-013" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "recovery-gate.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
      { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "trusted-restart", kind: "checkpoint", operation: "restart-device", device: "device-a" },
      { id: "ordinary-preview", kind: "production", device: "device-a", operation: "preview", captureAs: "ordinary-plan" },
      { id: "fault", kind: "external-state", transition: "fault-device-state", device: "device-a", fault: "corrupt-checksum" },
      { id: "recovery-restart", kind: "checkpoint", operation: "restart-device", device: "device-a" },
      { id: "faulted-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "faulted-state" },
      { id: "assert-recovery", kind: "assert", assertion: "status", observationRef: "faulted-state", expectedStatus: "recovery-required" },
      { id: "recovery-preview", kind: "production", device: "device-a", operation: "preview", captureAs: "recovery-plan" },
      { id: "execute-recovery", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "recovery-plan" },
      { id: "trusted-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "trusted-state" },
      { id: "assert-trusted", kind: "assert", assertion: "status", observationRef: "trusted-state", expectedStatus: "trusted" },
      { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "recovery-gate.bin", captureAs: "local" },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "recovery-gate.bin", captureAs: "remote" },
      { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
      { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
      { id: "post-recovery-preview", kind: "production", device: "device-a", operation: "preview", captureAs: "post-recovery-plan" },
    ],
  });

  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  strictEqual(result.steps.every(step => step.matchedExpectation), true);
});
