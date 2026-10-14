import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09dLargeTransferScenario = defineScenario({
  id: "battery-s09d-large-transfer-01",
  description: "Transfer bounded deterministic 8 MiB binary fixtures in both directions across the real iOS/Windows production path and prove source/target byte identity.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09D-LARGE-TRANSFER" },
    { kind: "requirement", id: "XFER-001" },
    { kind: "requirement", id: "XFER-004" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-ios-large", kind: "fixture", operation: "put-local-pattern", device: "ios", path: "large/ios-upload-8MiB.bin", byteLength: 8388608, seed: "s09d-ios-upload-v1" },
    { id: "observe-ios-source", kind: "observe", subject: "local-entry", device: "ios", path: "large/ios-upload-8MiB.bin", captureAs: "ios-source" },
    { id: "assert-ios-source-size", kind: "assert", assertion: "field-equals", observationRef: "ios-source", field: "sizeBytes", expected: 8388608 },
    { id: "assert-ios-source-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-source", field: "hash", expected: "c240e45445b2b6bf499d305d67bed6b9f83a2397863f987bf55f6d2132a9321e" },
    { id: "sync-ios-large-upload", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-large-upload" },
    { id: "sync-windows-large-download", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-large-download" },
    { id: "observe-windows-target", kind: "observe", subject: "local-entry", device: "windows", path: "large/ios-upload-8MiB.bin", captureAs: "windows-target" },
    { id: "assert-windows-target-size", kind: "assert", assertion: "field-equals", observationRef: "windows-target", field: "sizeBytes", expected: 8388608 },
    { id: "assert-windows-target-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-target", field: "hash", expected: "c240e45445b2b6bf499d305d67bed6b9f83a2397863f987bf55f6d2132a9321e" },
    { id: "seed-windows-large", kind: "fixture", operation: "put-local-pattern", device: "windows", path: "large/windows-upload-8MiB.bin", byteLength: 8388608, seed: "s09d-windows-upload-v1" },
    { id: "observe-windows-source", kind: "observe", subject: "local-entry", device: "windows", path: "large/windows-upload-8MiB.bin", captureAs: "windows-source" },
    { id: "assert-windows-source-size", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "sizeBytes", expected: 8388608 },
    { id: "assert-windows-source-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "hash", expected: "fb942ceb36a02ab6fa759422a48745ec89412b719a2aea46209175e1d3906e8f" },
    { id: "sync-windows-large-upload", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-large-upload" },
    { id: "sync-ios-large-download", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-large-download" },
    { id: "observe-ios-target", kind: "observe", subject: "local-entry", device: "ios", path: "large/windows-upload-8MiB.bin", captureAs: "ios-target" },
    { id: "assert-ios-target-size", kind: "assert", assertion: "field-equals", observationRef: "ios-target", field: "sizeBytes", expected: 8388608 },
    { id: "assert-ios-target-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-target", field: "hash", expected: "fb942ceb36a02ab6fa759422a48745ec89412b719a2aea46209175e1d3906e8f" },
  ],
});
