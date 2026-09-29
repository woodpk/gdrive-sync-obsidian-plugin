import { defineScenario } from "../../src/scenario/scenario-contract";

export const unreadableLocalPathScenario = defineScenario({
  id: "s06c-unreadable-local-path",
  description: "A previously synchronized LOCAL path that becomes unreadable remains uncertainty, not deletion evidence, so destructive propagation is blocked.",
  traceability: { targets: [
    { kind: "requirement", id: "FILE-015" },
    { kind: "requirement", id: "DELETE-001" },
    { kind: "requirement", id: "PLAN-008" },
    { kind: "invariant", id: "INV-003" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "unreadable.bin", content: { encoding: "bytes", value: [13, 14, 15] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "make-unreadable", kind: "external-state", transition: "set-local-access", device: "device-a", path: "unreadable.bin", state: "unreadable" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-blocked", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "blocked-unsafe" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "unreadable.bin", captureAs: "local-observation" },
    { id: "assert-unreadable", kind: "assert", assertion: "status", observationRef: "local-observation", expectedStatus: "unreadable" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "unreadable.bin", captureAs: "remote-after" },
    { id: "assert-remote-preserved", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
