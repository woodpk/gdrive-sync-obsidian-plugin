import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export const S09D_LARGE_BYTES = 8 * 1024 * 1024;
export const S09D_IOS_LARGE_PATH = "large/ios-upload-8MiB.bin";
export const S09D_WINDOWS_LARGE_PATH = "large/windows-upload-8MiB.bin";
export const S09D_IOS_PATTERN_SEED = "s09d-ios-upload-v1";
export const S09D_WINDOWS_PATTERN_SEED = "s09d-windows-upload-v1";
export const S09D_IOS_PATTERN_SHA256 = "c240e45445b2b6bf499d305d67bed6b9f83a2397863f987bf55f6d2132a9321e";
export const S09D_WINDOWS_PATTERN_SHA256 = "fb942ceb36a02ab6fa759422a48745ec89412b719a2aea46209175e1d3906e8f";

export function createS09dLargeTransferScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09d-large-transfer-01",
    description: "Transfer bounded deterministic 8 MiB binary fixtures in both directions across the real iOS/Windows production path and prove source/target byte identity.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09D-LARGE-TRANSFER" },
      { kind: "requirement", id: "XFER-001" },
      { kind: "requirement", id: "XFER-004" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-ios-large", kind: "fixture", operation: "put-local-pattern", device: "ios", path: S09D_IOS_LARGE_PATH, byteLength: S09D_LARGE_BYTES, seed: S09D_IOS_PATTERN_SEED },
      { id: "observe-ios-source", kind: "observe", subject: "local-entry", device: "ios", path: S09D_IOS_LARGE_PATH, captureAs: "ios-source" },
      { id: "assert-ios-source-size", kind: "assert", assertion: "field-equals", observationRef: "ios-source", field: "sizeBytes", expected: S09D_LARGE_BYTES },
      { id: "assert-ios-source-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-source", field: "hash", expected: S09D_IOS_PATTERN_SHA256 },
      { id: "sync-ios-large-upload", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-large-upload" },
      { id: "observe-ios-upload-receipt", kind: "observe", subject: "production-result", inputRef: "ios-large-upload", captureAs: "ios-large-receipt" },
      { id: "assert-ios-upload-complete", kind: "assert", assertion: "field-equals", observationRef: "ios-large-receipt", field: "terminal", expected: "complete" },
      { id: "sync-windows-large-download", kind: "production", operation: "synchronize", device: "windows" },
      { id: "observe-windows-target", kind: "observe", subject: "local-entry", device: "windows", path: S09D_IOS_LARGE_PATH, captureAs: "windows-target" },
      { id: "assert-windows-target-size", kind: "assert", assertion: "field-equals", observationRef: "windows-target", field: "sizeBytes", expected: S09D_LARGE_BYTES },
      { id: "assert-windows-target-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-target", field: "hash", expected: S09D_IOS_PATTERN_SHA256 },
      { id: "seed-windows-large", kind: "fixture", operation: "put-local-pattern", device: "windows", path: S09D_WINDOWS_LARGE_PATH, byteLength: S09D_LARGE_BYTES, seed: S09D_WINDOWS_PATTERN_SEED },
      { id: "observe-windows-source", kind: "observe", subject: "local-entry", device: "windows", path: S09D_WINDOWS_LARGE_PATH, captureAs: "windows-source" },
      { id: "assert-windows-source-size", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "sizeBytes", expected: S09D_LARGE_BYTES },
      { id: "assert-windows-source-hash", kind: "assert", assertion: "field-equals", observationRef: "windows-source", field: "hash", expected: S09D_WINDOWS_PATTERN_SHA256 },
      { id: "sync-windows-large-upload", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-large-upload" },
      { id: "observe-windows-upload-receipt", kind: "observe", subject: "production-result", inputRef: "windows-large-upload", captureAs: "windows-large-receipt" },
      { id: "assert-windows-upload-complete", kind: "assert", assertion: "field-equals", observationRef: "windows-large-receipt", field: "terminal", expected: "complete" },
      { id: "sync-ios-large-download", kind: "production", operation: "synchronize", device: "ios" },
      { id: "observe-ios-target", kind: "observe", subject: "local-entry", device: "ios", path: S09D_WINDOWS_LARGE_PATH, captureAs: "ios-target" },
      { id: "assert-ios-target-size", kind: "assert", assertion: "field-equals", observationRef: "ios-target", field: "sizeBytes", expected: S09D_LARGE_BYTES },
      { id: "assert-ios-target-hash", kind: "assert", assertion: "field-equals", observationRef: "ios-target", field: "hash", expected: S09D_WINDOWS_PATTERN_SHA256 },
    ],
  });
}
