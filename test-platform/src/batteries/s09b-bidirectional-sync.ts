import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export const S09B_BIDIRECTIONAL_PATH = "bidirectional.md";
export const S09B_WINDOWS_CONTENT = "# BVP bidirectional sync\n\nOrigin: Windows\nVersion: 1\n";
export const S09B_IOS_CONTENT = "# BVP bidirectional sync\n\nOrigin: iOS\nVersion: 2\n";
export const S09B_WINDOWS_SHA256 = "fa01e32a83e8942ac814f017e823fcc0286243f0d4e3785bdce17092a074c42c";
export const S09B_IOS_SHA256 = "cb157ccba60236182b868a9d0abef28e3875bb3d3d2f9fe4ee3787e9259e5c32";

export function createS09bBidirectionalSyncScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09b-bidirectional-sync-01",
    description: "Prove Windows-to-iOS create propagation and reciprocal iOS-to-Windows update propagation through production synchronization.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09B-BIDIRECTIONAL" },
      { kind: "requirement", id: "SYNC-013" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: S09B_BIDIRECTIONAL_PATH, content: { encoding: "utf8", value: S09B_WINDOWS_CONTENT } },
      { id: "observe-windows-source", kind: "observe", subject: "local-entry", device: "windows", path: S09B_BIDIRECTIONAL_PATH, captureAs: "windows-source" },
      { id: "assert-windows-source-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "hash", expected: S09B_WINDOWS_SHA256 },
      { id: "sync-windows-upload", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-upload" },
      { id: "observe-windows-upload", kind: "observe", subject: "production-result", inputRef: "windows-upload", captureAs: "windows-upload-receipt" },
      { id: "assert-windows-upload-terminal", kind: "assert", assertion: "field-equals", observationRef: "windows-upload-receipt", field: "terminal", expected: "complete" },
      { id: "assert-windows-upload-verified", kind: "assert", assertion: "field-equals", observationRef: "windows-upload-receipt", field: "requiredEffectsCommittedAndVerified", expected: true },
      { id: "sync-ios-download", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-download" },
      { id: "observe-ios-download", kind: "observe", subject: "production-result", inputRef: "ios-download", captureAs: "ios-download-receipt" },
      { id: "assert-ios-download-terminal", kind: "assert", assertion: "field-equals", observationRef: "ios-download-receipt", field: "terminal", expected: "complete" },
      { id: "observe-ios-first", kind: "observe", subject: "local-entry", device: "ios", path: S09B_BIDIRECTIONAL_PATH, captureAs: "ios-first" },
      { id: "assert-ios-first-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-first", field: "hash", expected: S09B_WINDOWS_SHA256 },
      { id: "edit-ios", kind: "fixture", operation: "put-local-file", device: "ios", path: S09B_BIDIRECTIONAL_PATH, content: { encoding: "utf8", value: S09B_IOS_CONTENT } },
      { id: "sync-ios-upload", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-upload" },
      { id: "observe-ios-upload", kind: "observe", subject: "production-result", inputRef: "ios-upload", captureAs: "ios-upload-receipt" },
      { id: "assert-ios-upload-terminal", kind: "assert", assertion: "field-equals", observationRef: "ios-upload-receipt", field: "terminal", expected: "complete" },
      { id: "assert-ios-upload-verified", kind: "assert", assertion: "field-equals", observationRef: "ios-upload-receipt", field: "requiredEffectsCommittedAndVerified", expected: true },
      { id: "sync-windows-download", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-download" },
      { id: "observe-windows-download", kind: "observe", subject: "production-result", inputRef: "windows-download", captureAs: "windows-download-receipt" },
      { id: "assert-windows-download-terminal", kind: "assert", assertion: "field-equals", observationRef: "windows-download-receipt", field: "terminal", expected: "complete" },
      { id: "observe-windows-final", kind: "observe", subject: "local-entry", device: "windows", path: S09B_BIDIRECTIONAL_PATH, captureAs: "windows-final" },
      { id: "assert-windows-final-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-final", field: "hash", expected: S09B_IOS_SHA256 },
      { id: "observe-ios-final", kind: "observe", subject: "local-entry", device: "ios", path: S09B_BIDIRECTIONAL_PATH, captureAs: "ios-final" },
      { id: "assert-ios-final-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-final", field: "hash", expected: S09B_IOS_SHA256 },
    ],
  });
}
