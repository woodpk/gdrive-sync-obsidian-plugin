import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09aWindowsInitialSyncScenario = defineScenario({
  id: "battery-s09a-windows-initial-sync-01",
  description: "Exercise the real Windows production synchronization path from the authenticated paired baseline using one bounded local canary and retain the authoritative production receipt in the run capture.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-WINDOWS-INITIAL-SYNC" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-windows-ready", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-before" },
    { id: "assert-windows-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-before", field: "kind", expected: "idle-ready" },
    { id: "seed-windows-initial", kind: "fixture", operation: "put-local-file", device: "windows", path: "initial-sync-windows.md", content: { encoding: "utf8", value: "# BVP Windows first synchronization\n\nDevice: Windows\n" } },
    { id: "observe-windows-canary", kind: "observe", subject: "local-entry", device: "windows", path: "initial-sync-windows.md", captureAs: "windows-canary" },
    { id: "assert-windows-canary", kind: "assert", assertion: "field-equals", observationRef: "windows-canary", field: "hash", expected: "fd07d9a82b6662d6ce7f2c192fec419481fb082065a86c2b73bd629aef59a82f" },
    { id: "sync-windows-initial", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-initial-result" },
    { id: "observe-windows-canary-after-sync", kind: "observe", subject: "local-entry", device: "windows", path: "initial-sync-windows.md", captureAs: "windows-canary-after-sync" },
    { id: "assert-windows-canary-preserved", kind: "assert", assertion: "field-equals", observationRef: "windows-canary-after-sync", field: "hash", expected: "fd07d9a82b6662d6ce7f2c192fec419481fb082065a86c2b73bd629aef59a82f" },
    { id: "observe-windows-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-after" },
    { id: "assert-windows-after", kind: "assert", assertion: "field-equals", observationRef: "windows-after", field: "kind", expected: "idle-ready" },
  ],
});
