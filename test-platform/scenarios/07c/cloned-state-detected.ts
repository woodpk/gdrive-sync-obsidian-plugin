import { defineScenario } from "../../src/scenario/scenario-contract";

export const clonedStateDetectedScenario = defineScenario({
  id: "s07c-cloned-state-detected",
  description: "Copied authoritative state cannot silently make a second installation a current writer.",
  traceability: { targets: [{ kind: "requirement", id: "STATE-003" }, { kind: "requirement", id: "STATE-016" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clone-authority.bin", content: { encoding: "bytes", value: [1] } },
    { id: "establish-a", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "copy-state", kind: "external-state", transition: "fault-device-state", device: "device-b", fault: "copy-from-device", sourceDevice: "device-a" },
    { id: "restart-b", kind: "checkpoint", operation: "restart-device", device: "device-b" },
    { id: "state-b", kind: "observe", subject: "device-state", device: "device-b", captureAs: "state-b" },
    { id: "assert-recovery", kind: "assert", assertion: "status", observationRef: "state-b", expectedStatus: "recovery-required" },
  ],
});
