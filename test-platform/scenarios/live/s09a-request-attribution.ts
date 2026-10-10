import { defineScenario } from "../../src/scenario/scenario-contract";

// Reuses the immutable canary verified by S09A live02 before its fail-closed
// plan gate. No new local or remote fixture is created by this scenario.
export const s09aRequestAttributionScenario = defineScenario({
  id: "battery-s09a-request-attribution-03",
  description: "Observe and execute at most one exact previously verified canary upload, with no other non-noop operations, while retaining per-request S09A attribution.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-REQUEST-ATTRIBUTION" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-ready-before", kind: "observe", subject: "device-state", device: "windows", captureAs: "before" },
    { id: "assert-ready-before", kind: "assert", assertion: "field-equals", observationRef: "before", field: "kind", expected: "idle-ready" },
    { id: "review-existing-canary-plan", kind: "production", operation: "preview", device: "windows", captureAs: "canary-plan" },
    { id: "require-one-nonnoop", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "nonNoopOperationCount", expected: 1 },
    { id: "require-no-other-kinds", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "operationKinds", expected: ["noop", "upload-create"] },
    { id: "require-exact-canary-target", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "uploadCreatePathKeys", expected: ["path-sha256:788c8a656d7aab99f9283b50a9ade906fb04a66e6daf50ca79fae6788970940e"] },
    { id: "require-eligible", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "executionDisposition", expected: "safe-auto-eligible" },
    { id: "require-open-gate", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "globalExecutionGate", expected: "none" },
    { id: "require-no-recovery-checkpoint", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "recoveryCheckpointRequired", expected: false },
    { id: "execute-exact-reviewed-canary-once", kind: "production", operation: "execute-reviewed-plan", device: "windows", inputRef: "canary-plan", captureAs: "attribution-result" },
    { id: "observe-ready-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "after" },
    { id: "assert-ready-after", kind: "assert", assertion: "field-equals", observationRef: "after", field: "kind", expected: "idle-ready" },
  ],
});
