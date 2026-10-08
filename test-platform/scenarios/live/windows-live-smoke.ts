import { defineScenario } from "../../src/scenario/scenario-contract";

export const windowsLiveSmokeScenario = defineScenario({
  id: "battery-windows-live-smoke-01",
  description: "Prove the live Windows BVP control path by observing product state and round-tripping one bounded local fixture.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-WINDOWS-LIVE-SMOKE" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-windows-product", kind: "observe", subject: "device-state", device: "windows", captureAs: "product" },
    { id: "create-canary", kind: "fixture", operation: "put-local-file", device: "windows", path: "windows-first-sync-canary.md", content: { encoding: "utf8", value: "# BVP Windows first-sync canary\n\nCreated by the BRAIN Verification Platform.\n" } },
    { id: "observe-canary", kind: "observe", subject: "local-entry", device: "windows", path: "windows-first-sync-canary.md", captureAs: "canary" },
    { id: "assert-canary-exists", kind: "assert", assertion: "exists", observationRef: "canary", expected: true },
    { id: "assert-canary-size", kind: "assert", assertion: "field-equals", observationRef: "canary", field: "sizeBytes", expected: 77 },
    { id: "assert-canary-hash", kind: "assert", assertion: "field-equals", observationRef: "canary", field: "hash", expected: "8dcbdff420cef7b5075d718b025a3a0ee66c375bff66535741adb31282d53895" },
  ],
});
