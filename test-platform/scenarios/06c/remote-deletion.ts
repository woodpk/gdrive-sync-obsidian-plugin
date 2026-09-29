import { defineScenario } from "../../src/scenario/scenario-contract";

export const remoteDeletionScenario = defineScenario({
  id: "s06c-remote-deletion",
  description: "After a trusted synchronized base, complete REMOTE absence authorizes recoverable LOCAL trash and records deletion history.",
  traceability: { targets: [
    { kind: "requirement", id: "DELETE-001" },
    { kind: "requirement", id: "DELETE-002" },
    { kind: "requirement", id: "DELETE-003" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
    { kind: "requirement", id: "CHANGE-002" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "remote-delete.bin", content: { encoding: "bytes", value: [4, 5, 6] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "delete-remote", kind: "fixture", operation: "remove-remote", path: "remote-delete.bin" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-local-trash", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "trash-local" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "remote-delete.bin", captureAs: "local-after" },
    { id: "assert-local-absent", kind: "assert", assertion: "exists", observationRef: "local-after", expected: false },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state-after" },
    { id: "assert-tombstone", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "tombstoneCount", expected: 1 },
  ],
});
