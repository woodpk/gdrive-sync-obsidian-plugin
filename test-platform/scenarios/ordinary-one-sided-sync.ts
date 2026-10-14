import { defineScenario } from "../src/scenario/scenario-contract";

export const ordinaryOneSidedSyncScenario = defineScenario({
  id: "s05e-ordinary-one-sided-sync",
  description: "An ordinary local-only file synchronizes to shared remote reality and then to the second device without any platform-core change.",
  traceability: {
    targets: [
      { kind: "requirement", id: "SYNC-013" },
      { kind: "requirement", id: "PLAN-003" },
    ],
  },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "ordinary.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "sync-a", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "ordinary.bin", captureAs: "remote" },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    { id: "sync-b", kind: "production", device: "device-b", operation: "synchronize" },
    { id: "observe-b", kind: "observe", subject: "local-entry", device: "device-b", path: "ordinary.bin", captureAs: "local-b" },
    { id: "assert-b", kind: "assert", assertion: "exists", observationRef: "local-b", expected: true },
    { id: "assert-size", kind: "assert", assertion: "field-equals", observationRef: "local-b", field: "sizeBytes", expected: 3 },
  ],
});
