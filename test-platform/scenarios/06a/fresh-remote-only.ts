import { defineScenario } from "../../src/scenario/scenario-contract";

export const freshRemoteOnlyScenario = defineScenario({
  id: "s06a-fresh-remote-only",
  description: "Fresh managed-remote-only content is planned as download/create and copied locally without a prior base.",
  traceability: { targets: [
    { kind: "requirement", id: "FIRST-001" },
    { kind: "requirement", id: "FIRST-002" },
    { kind: "requirement", id: "FIRST-005" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-remote", kind: "fixture", operation: "put-remote-file", path: "fresh-remote.bin", content: { encoding: "bytes", value: [4, 5, 6, 7] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-download", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "download-create" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "fresh-remote.bin", captureAs: "local" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-size", kind: "assert", assertion: "field-equals", observationRef: "local", field: "sizeBytes", expected: 4 },
  ],
});
