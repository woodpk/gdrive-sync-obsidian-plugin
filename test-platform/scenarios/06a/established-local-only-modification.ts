import { defineScenario } from "../../src/scenario/scenario-contract";

export const establishedLocalOnlyModificationScenario = defineScenario({
  id: "s06a-established-local-only-modification",
  description: "After a trusted synchronized base, a stable local-only change is planned as upload/update and propagated remotely.",
  traceability: { targets: [
    { kind: "requirement", id: "STATE-001" },
    { kind: "requirement", id: "SYNC-013" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
    { kind: "requirement", id: "CHANGE-001" },
    { kind: "requirement", id: "CHANGE-002" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-update.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "modify-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-update.bin", content: { encoding: "bytes", value: [1, 2, 3, 4, 5] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-update", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "upload-update" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "local-update.bin", captureAs: "remote" },
    { id: "assert-size", kind: "assert", assertion: "field-equals", observationRef: "remote", field: "sizeBytes", expected: 5 },
  ],
});
