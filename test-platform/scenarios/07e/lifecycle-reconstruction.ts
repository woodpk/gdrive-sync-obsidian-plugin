import { defineScenario } from "../../src/scenario/scenario-contract";

export const lifecycleReconstructionScenario = defineScenario({
  id: "s07e-lifecycle-reconstruction",
  description: "Deterministic runtime disposal/reconstruction preserves trusted state and synchronized user data without lifecycle deletion side effects.",
  traceability: { targets: [{ kind: "requirement", id: "LIFE-001" }, { kind: "requirement", id: "LIFE-002" }, { kind: "invariant", id: "INV-020" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "lifecycle.bin", content: { encoding: "bytes", value: [7] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "restart", kind: "checkpoint", operation: "restart-device", device: "device-a" },
    { id: "state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
    { id: "trusted", kind: "assert", assertion: "status", observationRef: "state", expectedStatus: "trusted" },
    { id: "base-retained", kind: "assert", assertion: "field-equals", observationRef: "state", field: "baseCount", expected: 1 },
    { id: "remote-before", kind: "observe", subject: "remote-entry", path: "lifecycle.bin", captureAs: "remote-before" },
    { id: "remote-retained", kind: "assert", assertion: "exists", observationRef: "remote-before", expected: true },
    { id: "change", kind: "fixture", operation: "put-local-file", device: "device-a", path: "lifecycle.bin", content: { encoding: "bytes", value: [8, 9] } },
    { id: "resync", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "lifecycle.bin", captureAs: "remote-after" },
    { id: "updated", kind: "assert", assertion: "field-equals", observationRef: "remote-after", field: "sizeBytes", expected: 2 },
  ],
});
