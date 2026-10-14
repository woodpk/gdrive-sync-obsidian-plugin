import { defineScenario } from "../src/scenario/scenario-contract";

export const multiDeviceConflictScenario = defineScenario({
  id: "s05e-multi-device-text-conflict",
  description: "Two devices establish one base, diverge on the same text line, and the second device observes an unresolved production conflict.",
  traceability: {
    targets: [
      { kind: "requirement", id: "CONFLICT-001" },
      { kind: "requirement", id: "CONFLICT-003" },
      { kind: "requirement", id: "PLAN-003" },
    ],
  },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "shared-conflict.md", content: { encoding: "utf8", value: "base line\n" } },
    { id: "sync-a-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "sync-b-base", kind: "production", device: "device-b", operation: "synchronize" },
    { id: "edit-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "shared-conflict.md", content: { encoding: "utf8", value: "device A edit\n" } },
    { id: "edit-b", kind: "fixture", operation: "put-local-file", device: "device-b", path: "shared-conflict.md", content: { encoding: "utf8", value: "device B edit\n" } },
    { id: "sync-a-change", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "preview-b-conflict", kind: "production", device: "device-b", operation: "preview", captureAs: "conflict-plan" },
    { id: "observe-conflict-plan", kind: "observe", subject: "production-plan", inputRef: "conflict-plan", captureAs: "conflict-plan-observation" },
    { id: "assert-conflict", kind: "assert", assertion: "contains", observationRef: "conflict-plan-observation", field: "operationKinds", expected: "unresolved-conflict" },
  ],
});
