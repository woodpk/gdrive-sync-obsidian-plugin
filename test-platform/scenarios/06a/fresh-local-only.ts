import { defineScenario } from "../../src/scenario/scenario-contract";

export const freshLocalOnlyScenario = defineScenario({
  id: "s06a-fresh-local-only",
  description: "Fresh stable local-only content is planned as upload/create and copied to managed remote state without a prior base.",
  traceability: { targets: [
    { kind: "requirement", id: "FIRST-001" },
    { kind: "requirement", id: "FIRST-002" },
    { kind: "requirement", id: "FIRST-005" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "fresh-local.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-upload", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "upload-create" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "fresh-local.bin", captureAs: "remote" },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    { id: "assert-size", kind: "assert", assertion: "field-equals", observationRef: "remote", field: "sizeBytes", expected: 3 },
  ],
});
