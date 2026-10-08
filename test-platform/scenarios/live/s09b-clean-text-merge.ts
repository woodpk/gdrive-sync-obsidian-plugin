import { defineScenario, type ScenarioDefinition } from "../../src/scenario/scenario-contract";

export const S09B_MERGE_PATH = "representative-clean-merge.md";
export const S09B_MERGE_BASE = "alpha\nbeta\ngamma\n";
export const S09B_MERGE_WINDOWS = "ALPHA\nbeta\ngamma\n";
export const S09B_MERGE_IOS = "alpha\nbeta\nGAMMA\n";
export const S09B_BASE_SHA256 = "4fdbc441ea7b546100e086ac1e4fc5ae6749b7314311c99db05be450eca12996";
export const S09B_MERGED_SHA256 = "37d16a23a527a146e8e5b599cb7c02a9dce955e04925dbfe9d669237cccec09d";

export function createS09bCleanTextMergeScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09b-clean-text-merge-01",
    description: "Establish a shared text base, apply independent non-overlapping edits on Windows and iOS, and prove production converges both real devices to the deterministic clean-merge result.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09B-REPRESENTATIVE-CONFLICT" },
      { kind: "requirement", id: "CONFLICT-002" },
      { kind: "invariant", id: "INV-005" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-base-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: S09B_MERGE_PATH, content: { encoding: "utf8", value: S09B_MERGE_BASE } },
      { id: "sync-base-windows", kind: "production", operation: "synchronize", device: "windows" },
      { id: "sync-base-ios", kind: "production", operation: "synchronize", device: "ios" },
      { id: "observe-ios-base", kind: "observe", subject: "local-entry", device: "ios", path: S09B_MERGE_PATH, captureAs: "ios-base" },
      { id: "assert-ios-base", kind: "assert", assertion: "field-equals", observationRef: "ios-base", field: "hash", expected: S09B_BASE_SHA256 },
      { id: "edit-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: S09B_MERGE_PATH, content: { encoding: "utf8", value: S09B_MERGE_WINDOWS } },
      { id: "edit-ios", kind: "fixture", operation: "put-local-file", device: "ios", path: S09B_MERGE_PATH, content: { encoding: "utf8", value: S09B_MERGE_IOS } },
      { id: "sync-windows-edit", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-edit-result" },
      { id: "observe-windows-edit-result", kind: "observe", subject: "production-result", inputRef: "windows-edit-result", captureAs: "windows-edit-receipt" },
      { id: "assert-windows-edit-terminal", kind: "assert", assertion: "field-equals", observationRef: "windows-edit-receipt", field: "terminal", expected: "complete" },
      { id: "sync-ios-merge", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-merge-result" },
      { id: "observe-ios-merge-result", kind: "observe", subject: "production-result", inputRef: "ios-merge-result", captureAs: "ios-merge-receipt" },
      { id: "assert-ios-merge-terminal", kind: "assert", assertion: "field-equals", observationRef: "ios-merge-receipt", field: "terminal", expected: "complete" },
      { id: "assert-ios-merge-verified", kind: "assert", assertion: "field-equals", observationRef: "ios-merge-receipt", field: "requiredEffectsCommittedAndVerified", expected: true },
      { id: "sync-windows-converge", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-converge-result" },
      { id: "observe-windows-converge-result", kind: "observe", subject: "production-result", inputRef: "windows-converge-result", captureAs: "windows-converge-receipt" },
      { id: "assert-windows-converge-terminal", kind: "assert", assertion: "field-equals", observationRef: "windows-converge-receipt", field: "terminal", expected: "complete" },
      { id: "observe-windows-merged", kind: "observe", subject: "local-entry", device: "windows", path: S09B_MERGE_PATH, captureAs: "windows-merged" },
      { id: "assert-windows-merged", kind: "assert", assertion: "field-equals", observationRef: "windows-merged", field: "hash", expected: S09B_MERGED_SHA256 },
      { id: "observe-ios-merged", kind: "observe", subject: "local-entry", device: "ios", path: S09B_MERGE_PATH, captureAs: "ios-merged" },
      { id: "assert-ios-merged", kind: "assert", assertion: "field-equals", observationRef: "ios-merged", field: "hash", expected: S09B_MERGED_SHA256 },
    ],
  });
}
