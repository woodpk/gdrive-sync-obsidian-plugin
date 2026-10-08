import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09cOfflineReconnectScenario = defineScenario({
  id: "battery-s09c-offline-reconnect-01",
  description: "Use a human checkpoint for a physically real Windows offline sync attempt, then prove reconnect/reconciliation converges the pending change without data loss.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09C-OFFLINE-RECONNECT" },
    { kind: "requirement", id: "FAIL-002" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-online-base", kind: "fixture", operation: "put-local-file", device: "windows", path: "offline-reconnect.md", content: { encoding: "utf8", value: "# BVP offline/reconnect\n\nVersion: online base\n" } },
    { id: "sync-online-base-windows", kind: "production", operation: "synchronize", device: "windows" },
    { id: "sync-online-base-ios", kind: "production", operation: "synchronize", device: "ios" },
    { id: "edit-before-offline", kind: "fixture", operation: "put-local-file", device: "windows", path: "offline-reconnect.md", content: { encoding: "utf8", value: "# BVP offline/reconnect\n\nVersion: changed before offline sync attempt\n" } },
    { id: "physical-offline-cycle", kind: "checkpoint", operation: "capture", checkpointId: "windows-physical-offline-cycle" },
    { id: "reconcile-windows", kind: "production", operation: "reconcile", device: "windows", captureAs: "windows-reconnect-result" },
    { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios", captureAs: "ios-reconnect-result" },
    { id: "observe-windows-after", kind: "observe", subject: "local-entry", device: "windows", path: "offline-reconnect.md", captureAs: "windows-after" },
    { id: "assert-windows-after", kind: "assert", assertion: "field-equals", observationRef: "windows-after", field: "hash", expected: "5eda9daba2b58418cdf110f226ef73294e2c2af91512d42c1b71da029309b152" },
    { id: "observe-ios-after", kind: "observe", subject: "local-entry", device: "ios", path: "offline-reconnect.md", captureAs: "ios-after" },
    { id: "assert-ios-after", kind: "assert", assertion: "field-equals", observationRef: "ios-after", field: "hash", expected: "5eda9daba2b58418cdf110f226ef73294e2c2af91512d42c1b71da029309b152" },
  ],
});
