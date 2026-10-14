import { defineScenario } from "../../src/scenario/scenario-contract";

export const clockSkewScenario = defineScenario({
  id: "s06c-clock-skew",
  description: "Extreme device-clock skew cannot select a winner when LOCAL and REMOTE independently change from the same recognized-text BASE; production still surfaces the true conflict.",
  traceability: { targets: [
    { kind: "requirement", id: "CHANGE-001" },
    { kind: "requirement", id: "CHANGE-002" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clock-skew.md", content: { encoding: "utf8", value: "base\n" } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "advance-clock", kind: "external-state", transition: "advance-device-time", device: "device-a", deltaMs: 315360000000 },
    { id: "modify-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clock-skew.md", content: { encoding: "utf8", value: "LOCAL\n" } },
    { id: "modify-remote", kind: "fixture", operation: "put-remote-file", path: "clock-skew.md", content: { encoding: "utf8", value: "REMOTE\n" } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-conflict", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "clock-skew.md", captureAs: "local-after" },
    { id: "assert-local-present", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "clock-skew.md", captureAs: "remote-after" },
    { id: "assert-remote-present", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
