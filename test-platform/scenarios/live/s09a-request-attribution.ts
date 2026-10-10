import { defineScenario } from "../../src/scenario/scenario-contract";

// Reuses the immutable canary verified by S09A live02. Read-only Google Drive
// inspection established its one missing remote parent folder; the allowlist
// below permits exactly that folder creation plus the canary file upload.
// No new local or remote fixture is created before the production plan gate.
export const s09aRequestAttributionScenario = defineScenario({
  id: "battery-s09a-request-attribution-03",
  description: "Execute only the exact verified canary file upload and its missing parent-folder creation, with no other non-noop operations, retaining per-request attribution.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-REQUEST-ATTRIBUTION" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-ready-before", kind: "observe", subject: "device-state", device: "windows", captureAs: "before" },
    { id: "assert-ready-before", kind: "assert", assertion: "field-equals", observationRef: "before", field: "kind", expected: "idle-ready" },
    { id: "review-existing-canary-plan", kind: "production", operation: "preview", device: "windows", captureAs: "canary-plan" },
    { id: "require-two-allowlisted-creates", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "nonNoopOperationCount", expected: 2 },
    { id: "require-no-other-kinds", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "operationKinds", expected: ["noop", "upload-create"] },
    { id: "require-exact-canary-and-parent-targets", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "uploadCreatePathKeys", expected: ["path-sha256:788c8a656d7aab99f9283b50a9ade906fb04a66e6daf50ca79fae6788970940e", "path-sha256:ed8bb613e5cec385af7e7ec055e08fd01d98209270b2f4fe93ff425bb70758d1"] },
    { id: "require-eligible", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "executionDisposition", expected: "safe-auto-eligible" },
    { id: "require-open-gate", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "globalExecutionGate", expected: "none" },
    { id: "require-no-recovery-checkpoint", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "recoveryCheckpointRequired", expected: false },
    { id: "execute-exact-reviewed-canary-once", kind: "production", operation: "execute-reviewed-plan", device: "windows", inputRef: "canary-plan", captureAs: "attribution-result" },
    { id: "observe-ready-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "after" },
    { id: "assert-ready-after", kind: "assert", assertion: "field-equals", observationRef: "after", field: "kind", expected: "idle-ready" },
  ],
});
