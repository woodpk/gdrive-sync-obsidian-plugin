import { defineScenario } from "../../src/scenario/scenario-contract";

export const freshEqualCollisionScenario = defineScenario({
  id: "s06a-fresh-equal-collision",
  description: "Fresh identical local and remote content converges through a no-op plan and establishes trusted base state.",
  traceability: { targets: [
    { kind: "requirement", id: "FIRST-001" },
    { kind: "requirement", id: "FIRST-003" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "fresh-equal.bin", content: { encoding: "bytes", value: [8, 8, 8] } },
    { id: "seed-remote", kind: "fixture", operation: "put-remote-file", path: "fresh-equal.bin", content: { encoding: "bytes", value: [8, 8, 8] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-noop", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "noop" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
    { id: "assert-base", kind: "assert", assertion: "field-equals", observationRef: "state", field: "baseCount", expected: 1 },
  ],
});
