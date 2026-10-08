import { defineScenario, type ScenarioDefinition } from "../../src/scenario/scenario-contract";

export const S09C_OFFLINE_PATH = "offline-reconnect.md";
export const S09C_OFFLINE_BASE = "# BVP offline/reconnect\n\nVersion: online base\n";
export const S09C_OFFLINE_UPDATE = "# BVP offline/reconnect\n\nVersion: changed before offline sync attempt\n";
export const S09C_OFFLINE_UPDATE_SHA256 = "5eda9daba2b58418cdf110f226ef73294e2c2af91512d42c1b71da029309b152";

export function createS09cOfflineReconnectScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09c-offline-reconnect-01",
    description: "Use a human checkpoint for a physically real Windows offline sync attempt, then prove reconnect/reconciliation converges the pending change without data loss.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09C-OFFLINE-RECONNECT" },
      { kind: "requirement", id: "FAIL-002" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-online-base", kind: "fixture", operation: "put-local-file", device: "windows", path: S09C_OFFLINE_PATH, content: { encoding: "utf8", value: S09C_OFFLINE_BASE } },
      { id: "sync-online-base-windows", kind: "production", operation: "synchronize", device: "windows" },
      { id: "sync-online-base-ios", kind: "production", operation: "synchronize", device: "ios" },
      { id: "edit-before-offline", kind: "fixture", operation: "put-local-file", device: "windows", path: S09C_OFFLINE_PATH, content: { encoding: "utf8", value: S09C_OFFLINE_UPDATE } },
      { id: "physical-offline-cycle", kind: "checkpoint", operation: "capture", checkpointId: "windows-physical-offline-cycle" },
      { id: "reconcile-windows", kind: "production", operation: "reconcile", device: "windows", captureAs: "windows-reconnect-result" },
      { id: "observe-windows-reconnect-result", kind: "observe", subject: "production-result", inputRef: "windows-reconnect-result", captureAs: "windows-reconnect-receipt" },
      { id: "assert-windows-reconnect-complete", kind: "assert", assertion: "field-equals", observationRef: "windows-reconnect-receipt", field: "terminal", expected: "complete" },
      { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios" },
      { id: "observe-windows-after", kind: "observe", subject: "local-entry", device: "windows", path: S09C_OFFLINE_PATH, captureAs: "windows-after" },
      { id: "assert-windows-after", kind: "assert", assertion: "field-equals", observationRef: "windows-after", field: "hash", expected: S09C_OFFLINE_UPDATE_SHA256 },
      { id: "observe-ios-after", kind: "observe", subject: "local-entry", device: "ios", path: S09C_OFFLINE_PATH, captureAs: "ios-after" },
      { id: "assert-ios-after", kind: "assert", assertion: "field-equals", observationRef: "ios-after", field: "hash", expected: S09C_OFFLINE_UPDATE_SHA256 },
    ],
  });
}
