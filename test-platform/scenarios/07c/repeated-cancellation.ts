import { defineScenario } from "../../src/scenario/scenario-contract";

export const repeatedCancellationScenario = defineScenario({
  id: "s07c-repeated-cancellation",
  description: "Repeated cancellation requests outside active work are deterministic and do not poison the next run.",
  traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "cancel-1", kind: "external-state", transition: "request-cancellation", device: "device-a" },
    { id: "cancel-2", kind: "external-state", transition: "request-cancellation", device: "device-a" },
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "repeat-cancel.bin", content: { encoding: "bytes", value: [40] } },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "repeat-cancel.bin", captureAs: "remote" },
    { id: "assert-present", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
