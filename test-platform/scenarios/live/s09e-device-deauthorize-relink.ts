import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09eDeviceDeauthorizeRelinkScenario = defineScenario({
  id: "battery-s09e-device-deauthorize-relink-01",
  description: "Physically deauthorize this device and restore same-device pairing without deleting shared managed content.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09E-DEVICE-DEAUTHORIZE-RELINK" },
    { kind: "requirement", id: "STATE-017" },
    { kind: "requirement", id: "LIFE-002" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-preserved-file", kind: "fixture", operation: "put-local-file", device: "windows", path: "lifecycle/device-removal-preservation.md", content: { encoding: "utf8", value: "# BVP auth lifecycle\n\nThis managed file must survive revocation and restoration.\n" } },
    { id: "sync-preserved-windows", kind: "production", operation: "synchronize", device: "windows" },
    { id: "sync-preserved-ios", kind: "production", operation: "synchronize", device: "ios" },
    { id: "physically-deauthorize-relink", kind: "checkpoint", operation: "capture", checkpointId: "windows-device-deauthorize-relink" },
    { id: "observe-windows-relinked", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-relinked" },
    { id: "assert-relinked-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-relinked", field: "kind", expected: "idle-ready" },
    { id: "reconcile-windows", kind: "production", operation: "reconcile", device: "windows", captureAs: "relink-windows-receipt" },
    { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios", captureAs: "relink-ios-receipt" },
    { id: "observe-windows-file", kind: "observe", subject: "local-entry", device: "windows", path: "lifecycle/device-removal-preservation.md", captureAs: "windows-file" },
    { id: "assert-windows-file", kind: "assert", assertion: "field-equals", observationRef: "windows-file", field: "hash", expected: "f2a4b8cddd414486a2b2e81f217ba7505c9e18209a4f98aa8053a03abb6117db" },
    { id: "observe-ios-file", kind: "observe", subject: "local-entry", device: "ios", path: "lifecycle/device-removal-preservation.md", captureAs: "ios-file" },
    { id: "assert-ios-file", kind: "assert", assertion: "field-equals", observationRef: "ios-file", field: "hash", expected: "f2a4b8cddd414486a2b2e81f217ba7505c9e18209a4f98aa8053a03abb6117db" },
  ],
});
