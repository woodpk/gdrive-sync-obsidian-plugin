import { defineScenario } from "../../src/scenario/scenario-contract";

export const restoredStaleStateReconcilesScenario = defineScenario({
  id: "s07c-restored-stale-state-reconciles",
  description: "Restored old same-device state reconciles against newer remote reality instead of overwriting it.",
  traceability: { targets: [{ kind: "requirement", id: "STATE-007" }, { kind: "requirement", id: "STATE-016" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-b", kind: "fixture", operation: "put-local-file", device: "device-b", path: "restored-stale.bin", content: { encoding: "bytes", value: [10] } },
    { id: "establish-b", kind: "production", device: "device-b", operation: "synchronize" },
    { id: "old-local", kind: "observe", subject: "local-entry", device: "device-b", path: "restored-stale.bin", captureAs: "old-local" },
    { id: "backup-state", kind: "external-state", transition: "fault-device-state", device: "device-c", fault: "copy-from-device", sourceDevice: "device-b" },
    { id: "newer-remote", kind: "fixture", operation: "put-remote-file", path: "restored-stale.bin", content: { encoding: "bytes", value: [11, 12] } },
    { id: "restore-state", kind: "external-state", transition: "fault-device-state", device: "device-b", fault: "copy-from-device", sourceDevice: "device-c" },
    { id: "restart-b", kind: "checkpoint", operation: "restart-device", device: "device-b" },
    { id: "restored-state", kind: "observe", subject: "device-state", device: "device-b", captureAs: "restored-state" },
    { id: "assert-trusted", kind: "assert", assertion: "status", observationRef: "restored-state", expectedStatus: "trusted" },
    { id: "reconcile-b", kind: "production", device: "device-b", operation: "reconcile" },
    { id: "local-after", kind: "observe", subject: "local-entry", device: "device-b", path: "restored-stale.bin", captureAs: "local-after" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "restored-stale.bin", captureAs: "remote-after" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
