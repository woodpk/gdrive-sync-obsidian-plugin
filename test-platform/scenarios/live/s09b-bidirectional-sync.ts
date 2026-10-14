import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09bBidirectionalSyncScenario = defineScenario({
  id: "battery-s09b-bidirectional-sync-01",
  description: "Prove Windows-to-iOS create propagation and reciprocal iOS-to-Windows update propagation through production synchronization.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09B-BIDIRECTIONAL" },
    { kind: "requirement", id: "SYNC-013" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-windows", kind: "fixture", operation: "put-local-file", device: "windows", path: "bidirectional.md", content: { encoding: "utf8", value: "# BVP bidirectional sync\n\nOrigin: Windows\nVersion: 1\n" } },
    { id: "observe-windows-source", kind: "observe", subject: "local-entry", device: "windows", path: "bidirectional.md", captureAs: "windows-source" },
    { id: "assert-windows-source-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "hash", expected: "fa01e32a83e8942ac814f017e823fcc0286243f0d4e3785bdce17092a074c42c" },
    { id: "sync-windows-upload", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-upload" },
    { id: "sync-ios-download", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-download" },
    { id: "observe-ios-first", kind: "observe", subject: "local-entry", device: "ios", path: "bidirectional.md", captureAs: "ios-first" },
    { id: "assert-ios-first-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-first", field: "hash", expected: "fa01e32a83e8942ac814f017e823fcc0286243f0d4e3785bdce17092a074c42c" },
    { id: "edit-ios", kind: "fixture", operation: "put-local-file", device: "ios", path: "bidirectional.md", content: { encoding: "utf8", value: "# BVP bidirectional sync\n\nOrigin: iOS\nVersion: 2\n" } },
    { id: "observe-ios-edited-source", kind: "observe", subject: "local-entry", device: "ios", path: "bidirectional.md", captureAs: "ios-edited-source" },
    { id: "assert-ios-edited-source", kind: "assert", assertion: "field-equals", observationRef: "ios-edited-source", field: "hash", expected: "cb157ccba60236182b868a9d0abef28e3875bb3d3d2f9fe4ee3787e9259e5c32" },
    { id: "sync-ios-upload", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-upload" },
    { id: "sync-windows-download", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-download" },
    { id: "observe-windows-final", kind: "observe", subject: "local-entry", device: "windows", path: "bidirectional.md", captureAs: "windows-final" },
    { id: "assert-windows-final-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-final", field: "hash", expected: "cb157ccba60236182b868a9d0abef28e3875bb3d3d2f9fe4ee3787e9259e5c32" },
    { id: "observe-ios-final", kind: "observe", subject: "local-entry", device: "ios", path: "bidirectional.md", captureAs: "ios-final" },
    { id: "assert-ios-final-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-final", field: "hash", expected: "cb157ccba60236182b868a9d0abef28e3875bb3d3d2f9fe4ee3787e9259e5c32" },
  ],
});
