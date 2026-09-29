import { defineScenario } from "../../src/scenario/scenario-contract";

export const localDeletionScenario = defineScenario({
  id: "s06c-local-deletion",
  description: "After a trusted synchronized base, a reliably observed LOCAL deletion authorizes recoverable REMOTE trash and records deletion history.",
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
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-delete.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "delete-local", kind: "fixture", operation: "remove-local", device: "device-a", path: "local-delete.bin" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-remote-trash", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "trash-remote" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "local-delete.bin", captureAs: "remote-after" },
    { id: "assert-remote-absent", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: false },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state-after" },
    { id: "assert-tombstone", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "tombstoneCount", expected: 1 },
  ],
});
