import { defineScenario } from "../../src/scenario/scenario-contract";

export const binaryConflictScenario = defineScenario({
  id: "s06b-binary-conflict",
  description: "Independent opaque binary changes from one trustworthy base are never text-merged or timestamp-selected; both complete versions remain preserved behind an unresolved conflict.",
  traceability: { targets: [
    { kind: "requirement", id: "CONFLICT-004" },
    { kind: "requirement", id: "CONFLICT-005" },
    { kind: "invariant", id: "INV-005" },
    { kind: "invariant", id: "INV-007" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "device-a", path: "binary-conflict.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "edit-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "binary-conflict.bin", content: { encoding: "bytes", value: [9, 2, 3] } },
    { id: "edit-remote", kind: "fixture", operation: "put-remote-file", path: "binary-conflict.bin", content: { encoding: "bytes", value: [1, 2, 8] } },
    { id: "preview-conflict", kind: "production", device: "device-a", operation: "preview", captureAs: "conflict-plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "conflict-plan", captureAs: "plan-view" },
    { id: "assert-unresolved", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "binary-conflict.bin", captureAs: "local-version" },
    { id: "assert-local-preserved", kind: "assert", assertion: "field-equals", observationRef: "local-version", field: "hash", expected: "sha256:c928c38ab25d86ad74198faaac21ea3707c9d218fc68a5fa4a80371094f5753e" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "binary-conflict.bin", captureAs: "remote-version" },
    { id: "assert-remote-preserved", kind: "assert", assertion: "field-equals", observationRef: "remote-version", field: "hash", expected: "sha256:6bf05e1c07111cea4acd7926f3f8448af61b88a39fe845aefb0ede6f09735942" },
  ],
});
