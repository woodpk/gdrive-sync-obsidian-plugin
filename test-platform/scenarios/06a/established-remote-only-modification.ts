import { defineScenario } from "../../src/scenario/scenario-contract";

export const establishedRemoteOnlyModificationScenario = defineScenario({
  id: "s06a-established-remote-only-modification",
  description: "After a trusted synchronized base, a remote-only change is planned as download/update and propagated locally.",
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
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "remote-update.bin", content: { encoding: "bytes", value: [6, 7, 8] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "modify-remote", kind: "fixture", operation: "put-remote-file", path: "remote-update.bin", content: { encoding: "bytes", value: [6, 7, 8, 9, 10, 11] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-update", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "download-update" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "remote-update.bin", captureAs: "local" },
    { id: "assert-size", kind: "assert", assertion: "field-equals", observationRef: "local", field: "sizeBytes", expected: 6 },
  ],
});
