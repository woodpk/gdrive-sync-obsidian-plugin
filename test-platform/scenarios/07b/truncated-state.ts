import { defineScenario } from "../../src/scenario/scenario-contract";

export const truncatedStateScenario = defineScenario({
  id: "s07b-truncated-state",
  description: "Truncated authoritative state is untrusted and recovery reconstructs without discarding valid user content.",
  traceability: { targets: [{ kind: "requirement", id: "STATE-011" }, { kind: "requirement", id: "STATE-012" }, { kind: "requirement", id: "STATE-013" }, { kind: "invariant", id: "INV-001" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "truncated.bin", content: { encoding: "bytes", value: [4, 5, 6] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "fault", kind: "external-state", transition: "fault-device-state", device: "device-a", fault: "truncate" },
    { id: "faulted-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "faulted-state" },
    { id: "assert-recovery", kind: "assert", assertion: "status", observationRef: "faulted-state", expectedStatus: "recovery-required" },
    { id: "preview-recovery", kind: "production", device: "device-a", operation: "preview", captureAs: "recovery-plan" },
    { id: "execute-recovery", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "recovery-plan" },
    { id: "recovered-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "recovered-state" },
    { id: "assert-trusted", kind: "assert", assertion: "status", observationRef: "recovered-state", expectedStatus: "trusted" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "truncated.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "truncated.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
