import { defineScenario } from "../../src/scenario/scenario-contract";

export const bothDeletedScenario = defineScenario({
  id: "s06c-both-deleted",
  description: "After a trusted synchronized base, reliable absence on both sides converges as a no-op content action while recording a durable both-sides tombstone.",
  traceability: { targets: [
    { kind: "requirement", id: "DELETE-001" },
    { kind: "requirement", id: "STATE-005" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "both-deleted.bin", content: { encoding: "bytes", value: [7, 8, 9] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "delete-local", kind: "fixture", operation: "remove-local", device: "device-a", path: "both-deleted.bin" },
    { id: "delete-remote", kind: "fixture", operation: "remove-remote", path: "both-deleted.bin" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-noop", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "noop" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state-after" },
    { id: "assert-base-cleared", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "baseCount", expected: 0 },
    { id: "assert-tombstone", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "tombstoneCount", expected: 1 },
  ],
});
