import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09eAuthRevocationRestoreScenario = defineScenario({
  id: "battery-s09e-auth-revocation-restore-01",
  description: "Establish managed data, require a real provider authorization revocation/non-success observation and same-device restoration, then prove production state and data remain valid.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09E-AUTH-REVOCATION-RESTORE" }] },
  executionModes: ["live"],
  steps: [
    { id: "seed-auth-preservation", kind: "fixture", operation: "put-local-file", device: "windows", path: "lifecycle/auth-revocation.md", content: { encoding: "utf8", value: "# BVP auth lifecycle\n\nThis managed file must survive revocation and restoration.\n" } },
    { id: "sync-auth-base-windows", kind: "production", operation: "synchronize", device: "windows" },
    { id: "sync-auth-base-ios", kind: "production", operation: "synchronize", device: "ios" },
    { id: "physical-auth-revocation-restore", kind: "checkpoint", operation: "capture", checkpointId: "windows-auth-revocation-restore" },
    { id: "observe-windows-restored-status", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-restored-status" },
    { id: "assert-windows-restored-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-restored-status", field: "kind", expected: "idle-ready" },
    { id: "reconcile-windows-after-auth", kind: "production", operation: "reconcile", device: "windows", captureAs: "windows-auth-result" },
    { id: "reconcile-ios-after-auth", kind: "production", operation: "reconcile", device: "ios", captureAs: "ios-auth-result" },
    { id: "observe-windows-auth-file", kind: "observe", subject: "local-entry", device: "windows", path: "lifecycle/auth-revocation.md", captureAs: "windows-auth-file" },
    { id: "assert-windows-auth-file", kind: "assert", assertion: "field-equals", observationRef: "windows-auth-file", field: "hash", expected: "f2a4b8cddd414486a2b2e81f217ba7505c9e18209a4f98aa8053a03abb6117db" },
    { id: "observe-ios-auth-file", kind: "observe", subject: "local-entry", device: "ios", path: "lifecycle/auth-revocation.md", captureAs: "ios-auth-file" },
    { id: "assert-ios-auth-file", kind: "assert", assertion: "field-equals", observationRef: "ios-auth-file", field: "hash", expected: "f2a4b8cddd414486a2b2e81f217ba7505c9e18209a4f98aa8053a03abb6117db" },
  ],
});
