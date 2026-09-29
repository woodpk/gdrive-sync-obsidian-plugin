import { defineScenario } from "../../src/scenario/scenario-contract";

export const noBaseAbsenceScenario = defineScenario({
  id: "s06c-no-base-absence",
  description: "Without trustworthy prior BASE, LOCAL absence beside existing REMOTE content is safe-union input and cannot be inferred as a deletion.",
  traceability: { targets: [
    { kind: "requirement", id: "DELETE-001" },
    { kind: "requirement", id: "FIRST-005" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
    { kind: "invariant", id: "INV-001" },
    { kind: "invariant", id: "INV-009" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-remote", kind: "fixture", operation: "put-remote-file", path: "no-base-absence.bin", content: { encoding: "bytes", value: [10, 11, 12] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-safe-union-download", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "download-create" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "no-base-absence.bin", captureAs: "local-after" },
    { id: "assert-local-present", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "no-base-absence.bin", captureAs: "remote-after" },
    { id: "assert-remote-preserved", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
