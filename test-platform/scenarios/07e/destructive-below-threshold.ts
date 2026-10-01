import { defineScenario } from "../../src/scenario/scenario-contract";

export const destructiveBelowThresholdScenario = defineScenario({
  id: "s07e-destructive-below-threshold",
  description: "One confirmed deletion among ten managed paths remains below the production destructive thresholds and executes normally.",
  traceability: { targets: [{ kind: "requirement", id: "DELETE-005" }, { kind: "requirement", id: "DELETE-006" }, { kind: "requirement", id: "DELETE-010" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-0", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-0.bin", content: { encoding: "bytes", value: [0] } },
    { id: "seed-1", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-1.bin", content: { encoding: "bytes", value: [1] } },
    { id: "seed-2", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-2.bin", content: { encoding: "bytes", value: [2] } },
    { id: "seed-3", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-3.bin", content: { encoding: "bytes", value: [3] } },
    { id: "seed-4", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-4.bin", content: { encoding: "bytes", value: [4] } },
    { id: "seed-5", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-5.bin", content: { encoding: "bytes", value: [5] } },
    { id: "seed-6", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-6.bin", content: { encoding: "bytes", value: [6] } },
    { id: "seed-7", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-7.bin", content: { encoding: "bytes", value: [7] } },
    { id: "seed-8", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-8.bin", content: { encoding: "bytes", value: [8] } },
    { id: "seed-9", kind: "fixture", operation: "put-local-file", device: "device-a", path: "safe-delete-9.bin", content: { encoding: "bytes", value: [9] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "delete-one", kind: "fixture", operation: "remove-local", device: "device-a", path: "safe-delete-0.bin" },
    { id: "sync-delete", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "deleted", kind: "observe", subject: "remote-entry", path: "safe-delete-0.bin", captureAs: "deleted" },
    { id: "survivor", kind: "observe", subject: "remote-entry", path: "safe-delete-9.bin", captureAs: "survivor" },
    { id: "delete-applied", kind: "assert", assertion: "exists", observationRef: "deleted", expected: false },
    { id: "survivor-stays", kind: "assert", assertion: "exists", observationRef: "survivor", expected: true },
  ],
});
