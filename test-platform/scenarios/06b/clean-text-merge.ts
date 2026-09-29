import { defineScenario } from "../../src/scenario/scenario-contract";

export const cleanTextMergeScenario = defineScenario({
  id: "s06b-clean-text-merge",
  description: "A synchronized recognized-text base receives independent non-overlapping LOCAL and REMOTE edits; production plans a clean merge and converges both sides to the merged content.",
  traceability: { targets: [
    { kind: "requirement", id: "CONFLICT-001" },
    { kind: "requirement", id: "CONFLICT-002" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "PLAN-003" },
    { kind: "requirement", id: "CHANGE-002" },
    { kind: "requirement", id: "XFER-003" },
    { kind: "invariant", id: "INV-005" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clean-merge.md", content: { encoding: "utf8", value: "alpha\nbeta\ngamma\n" } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "edit-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clean-merge.md", content: { encoding: "utf8", value: "ALPHA\nbeta\ngamma\n" } },
    { id: "edit-remote", kind: "fixture", operation: "put-remote-file", path: "clean-merge.md", content: { encoding: "utf8", value: "alpha\nbeta\nGAMMA\n" } },
    { id: "preview-merge", kind: "production", device: "device-a", operation: "preview", captureAs: "merge-plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "merge-plan", captureAs: "plan-view" },
    { id: "assert-clean-merge", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "clean-text-merge" },
    { id: "execute-merge", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "merge-plan" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "clean-merge.md", captureAs: "local-after" },
    { id: "assert-local-merged-hash", kind: "assert", assertion: "field-equals", observationRef: "local-after", field: "hash", expected: "sha256:37d16a23a527a146e8e5b599cb7c02a9dce955e04925dbfe9d669237cccec09d" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "clean-merge.md", captureAs: "remote-after" },
    { id: "assert-remote-merged-hash", kind: "assert", assertion: "field-equals", observationRef: "remote-after", field: "hash", expected: "sha256:37d16a23a527a146e8e5b599cb7c02a9dce955e04925dbfe9d669237cccec09d" },
    { id: "observe-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state-after" },
    { id: "assert-base-count", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "baseCount", expected: 1 },
    { id: "assert-mapping-count", kind: "assert", assertion: "field-equals", observationRef: "state-after", field: "mappingCount", expected: 1 },
  ],
});
