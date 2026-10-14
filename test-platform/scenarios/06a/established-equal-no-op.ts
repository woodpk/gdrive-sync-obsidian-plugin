import { defineScenario } from "../../src/scenario/scenario-contract";

export const establishedEqualNoOpScenario = defineScenario({
  id: "s06a-established-equal-no-op",
  description: "After a trusted synchronized base, unchanged equal local and remote content produces a no-op plan.",
  traceability: { targets: [
    { kind: "requirement", id: "STATE-001" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
    { kind: "requirement", id: "CHANGE-002" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "equal-noop.bin", content: { encoding: "bytes", value: [9, 9, 9] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-noop", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "noop" },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
    { id: "assert-base", kind: "assert", assertion: "field-equals", observationRef: "state", field: "baseCount", expected: 1 },
  ],
});
