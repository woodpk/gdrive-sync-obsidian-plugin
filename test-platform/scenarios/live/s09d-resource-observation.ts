import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09dResourceObservationScenario = defineScenario({
  id: "battery-s09d-resource-observation-01",
  description: "Record real iOS capacity/resource observations around a bounded production transfer, without an invented resource SLA or simulated pressure.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09D-PHYSICAL-RESOURCE" },
    { kind: "requirement", id: "XFER-004" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "observe-ios-initial", kind: "observe", subject: "device-state", device: "ios", captureAs: "ios-before-resource" },
    { id: "assert-ios-initial-ready", kind: "assert", assertion: "field-equals", observationRef: "ios-before-resource", field: "kind", expected: "idle-ready" },
    { id: "record-ios-resource-preconditions", kind: "checkpoint", operation: "capture", checkpointId: "ios-resource-before-transfer" },
    { id: "seed-ios-resource-file", kind: "fixture", operation: "put-local-pattern", device: "ios", path: "resource/ios-resource-sample-8MiB.bin", byteLength: 8388608, seed: "s09d-ios-upload-v1" },
    { id: "observe-ios-resource-source", kind: "observe", subject: "local-entry", device: "ios", path: "resource/ios-resource-sample-8MiB.bin", captureAs: "resource-source" },
    { id: "assert-ios-resource-size", kind: "assert", assertion: "field-equals", observationRef: "resource-source", field: "sizeBytes", expected: 8388608 },
    { id: "assert-ios-resource-hash", kind: "assert", assertion: "field-equals", observationRef: "resource-source", field: "hash", expected: "c240e45445b2b6bf499d305d67bed6b9f83a2397863f987bf55f6d2132a9321e" },
    { id: "sync-ios-resource", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-resource-receipt" },
    { id: "sync-windows-resource", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-resource-receipt" },
    { id: "observe-windows-resource-file", kind: "observe", subject: "local-entry", device: "windows", path: "resource/ios-resource-sample-8MiB.bin", captureAs: "resource-target" },
    { id: "assert-windows-resource-size", kind: "assert", assertion: "field-equals", observationRef: "resource-target", field: "sizeBytes", expected: 8388608 },
    { id: "assert-windows-resource-hash", kind: "assert", assertion: "field-equals", observationRef: "resource-target", field: "hash", expected: "c240e45445b2b6bf499d305d67bed6b9f83a2397863f987bf55f6d2132a9321e" },
    { id: "record-ios-resource-after", kind: "checkpoint", operation: "capture", checkpointId: "ios-resource-after-transfer" },
    { id: "observe-ios-final", kind: "observe", subject: "device-state", device: "ios", captureAs: "ios-after-resource" },
    { id: "assert-ios-final-ready", kind: "assert", assertion: "field-equals", observationRef: "ios-after-resource", field: "kind", expected: "idle-ready" },
  ],
});
