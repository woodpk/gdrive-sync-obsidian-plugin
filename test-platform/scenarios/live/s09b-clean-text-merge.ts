import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09bCleanTextMergeScenario = defineScenario({
  id: "battery-s09b-clean-text-merge-01",
  description: "Establish a shared text base, apply independent non-overlapping edits on Windows and iOS, and prove production converges both real devices to the deterministic clean-merge result.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09B-REPRESENTATIVE-CONFLICT" },
    { kind: "requirement", id: "CONFLICT-002" },
    { kind: "invariant", id: "INV-005" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-base-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: "representative-clean-merge.md", content: { encoding: "utf8", value: "alpha\nbeta\ngamma\n" } },
    { id: "sync-base-windows", kind: "production", operation: "synchronize", device: "windows" },
    { id: "sync-base-ios", kind: "production", operation: "synchronize", device: "ios" },
    { id: "observe-ios-base", kind: "observe", subject: "local-entry", device: "ios", path: "representative-clean-merge.md", captureAs: "ios-base" },
    { id: "assert-ios-base", kind: "assert", assertion: "field-equals", observationRef: "ios-base", field: "hash", expected: "4fdbc441ea7b546100e086ac1e4fc5ae6749b7314311c99db05be450eca12996" },
    { id: "edit-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: "representative-clean-merge.md", content: { encoding: "utf8", value: "ALPHA\nbeta\ngamma\n" } },
    { id: "edit-ios", kind: "fixture", operation: "put-local-file", device: "ios", path: "representative-clean-merge.md", content: { encoding: "utf8", value: "alpha\nbeta\nGAMMA\n" } },
    { id: "sync-windows-edit", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-edit-result" },
    { id: "sync-ios-merge", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-merge-result" },
    { id: "sync-windows-converge", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-converge-result" },
    { id: "observe-windows-merged", kind: "observe", subject: "local-entry", device: "windows", path: "representative-clean-merge.md", captureAs: "windows-merged" },
    { id: "assert-windows-merged", kind: "assert", assertion: "field-equals", observationRef: "windows-merged", field: "hash", expected: "37d16a23a527a146e8e5b599cb7c02a9dce955e04925dbfe9d669237cccec09d" },
    { id: "observe-ios-merged", kind: "observe", subject: "local-entry", device: "ios", path: "representative-clean-merge.md", captureAs: "ios-merged" },
    { id: "assert-ios-merged", kind: "assert", assertion: "field-equals", observationRef: "ios-merged", field: "hash", expected: "37d16a23a527a146e8e5b599cb7c02a9dce955e04925dbfe9d669237cccec09d" },
  ],
});
