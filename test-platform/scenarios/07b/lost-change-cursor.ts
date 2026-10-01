import { defineScenario } from "../../src/scenario/scenario-contract";

export const lostChangeCursorScenario = defineScenario({
  id: "s07b-lost-change-cursor",
  description: "A lost persisted Drive cursor blocks incremental synchronization until an explicit full reconcile safely re-baselines.",
  traceability: { targets: [{ kind: "requirement", id: "CHANGE-005" }, { kind: "requirement", id: "CHANGE-006" }, { kind: "invariant", id: "INV-002" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cursor.bin", content: { encoding: "bytes", value: [10] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "before", kind: "observe", subject: "device-state", device: "device-a", captureAs: "before" },
    { id: "invalidate", kind: "external-state", transition: "invalidate-change-cursor", device: "device-a", reason: "lost" },
    { id: "incremental", kind: "production", device: "device-a", operation: "automatic-sync", expect: { status: "blocked", classification: "recovery-required" } },
    { id: "preserved-local", kind: "observe", subject: "local-entry", device: "device-a", path: "cursor.bin", captureAs: "local" },
    { id: "preserved-remote", kind: "observe", subject: "remote-entry", path: "cursor.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "after", kind: "observe", subject: "device-state", device: "device-a", captureAs: "after" },
    { id: "assert-trusted", kind: "assert", assertion: "status", observationRef: "after", expectedStatus: "trusted" },
    { id: "incremental-after", kind: "production", device: "device-a", operation: "automatic-sync" },
  ],
});
