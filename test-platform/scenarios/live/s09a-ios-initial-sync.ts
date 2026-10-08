import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09aIosInitialSyncScenario = defineScenario({
  id: "battery-s09a-ios-initial-sync-01",
  description: "Exercise the real iOS production synchronization path from the authenticated paired baseline using one bounded local canary and retain the authoritative production receipt in the run capture.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-IOS-INITIAL-SYNC" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-ios-ready", kind: "observe", subject: "device-state", device: "ios", captureAs: "ios-before" },
    { id: "assert-ios-ready", kind: "assert", assertion: "field-equals", observationRef: "ios-before", field: "kind", expected: "idle-ready" },
    { id: "seed-ios-initial", kind: "fixture", operation: "put-local-file", device: "ios", path: "initial-sync-ios.md", content: { encoding: "utf8", value: "# BVP iOS first synchronization\n\nDevice: iOS\n" } },
    { id: "observe-ios-canary", kind: "observe", subject: "local-entry", device: "ios", path: "initial-sync-ios.md", captureAs: "ios-canary" },
    { id: "assert-ios-canary", kind: "assert", assertion: "field-equals", observationRef: "ios-canary", field: "hash", expected: "f26473879f294e5b5cc451b0ddbc829b9a5f972d1c14ea4998f3e9368906a3b5" },
    { id: "sync-ios-initial", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-initial-result" },
    { id: "observe-ios-after", kind: "observe", subject: "device-state", device: "ios", captureAs: "ios-after" },
    { id: "assert-ios-after", kind: "assert", assertion: "field-equals", observationRef: "ios-after", field: "kind", expected: "idle-ready" },
  ],
});
