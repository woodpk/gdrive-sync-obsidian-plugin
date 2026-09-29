import { defineScenario } from "../../src/scenario/scenario-contract";

export const divergentNoBaseCollisionScenario = defineScenario({
  id: "s06a-divergent-no-base-collision",
  description: "Fresh divergent same-path content with no trusted base is classified as unresolved conflict and preserves both existing sides.",
  traceability: { targets: [
    { kind: "requirement", id: "FIRST-001" },
    { kind: "requirement", id: "FIRST-004" },
    { kind: "requirement", id: "FIRST-005" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "divergent.bin", content: { encoding: "bytes", value: [1, 1, 1] } },
    { id: "seed-remote", kind: "fixture", operation: "put-remote-file", path: "divergent.bin", content: { encoding: "bytes", value: [2, 2, 2, 2] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-conflict", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "execute-blocked", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "divergent.bin", captureAs: "local" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "divergent.bin", captureAs: "remote" },
    { id: "assert-local-size", kind: "assert", assertion: "field-equals", observationRef: "local", field: "sizeBytes", expected: 3 },
    { id: "assert-remote-size", kind: "assert", assertion: "field-equals", observationRef: "remote", field: "sizeBytes", expected: 4 },
  ],
});
