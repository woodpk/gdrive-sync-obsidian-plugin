import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09aRequestAttributionScenario = defineScenario({
  id: "battery-s09a-request-attribution-01",
  description: "Exercise exactly one non-initial Windows production synchronization with a single isolated BVP canary, preserving all normal authority, convergence, and recovery checks while collecting bounded S09A request attribution.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-REQUEST-ATTRIBUTION" }] },
  executionModes: ["live"],
  steps: [
    { id: "observe-ready-before", kind: "observe", subject: "device-state", device: "windows", captureAs: "before" },
    { id: "assert-ready-before", kind: "assert", assertion: "field-equals", observationRef: "before", field: "kind", expected: "idle-ready" },
    { id: "seed-attribution-canary", kind: "fixture", operation: "put-local-file", device: "windows", path: "s09a-attribution-canary.md", content: { encoding: "utf8", value: "# BVP S09A request attribution\n\nSingle controlled non-initial synchronization canary.\n" } },
    { id: "observe-canary-before", kind: "observe", subject: "local-entry", device: "windows", path: "s09a-attribution-canary.md", captureAs: "canary-before" },
    { id: "assert-canary-before", kind: "assert", assertion: "field-equals", observationRef: "canary-before", field: "hash", expected: "81b4ca90a96f40bca8714cdff2c05e668f465be0e6d5daeecb2e219da19e1575" },
    { id: "review-canary-plan", kind: "production", operation: "preview", device: "windows", captureAs: "canary-plan" },
    { id: "require-single-operation", kind: "assert", assertion: "field-equals", observationRef: "canary-plan", field: "operationCount", expected: 1 },
    { id: "require-canary-upload", kind: "assert", assertion: "contains", observationRef: "canary-plan", field: "operationKinds", expected: "upload-create" },
    { id: "execute-reviewed-canary", kind: "production", operation: "execute-reviewed-plan", device: "windows", inputRef: "canary-plan", captureAs: "attribution-result" },
    { id: "observe-canary-after", kind: "observe", subject: "local-entry", device: "windows", path: "s09a-attribution-canary.md", captureAs: "canary-after" },
    { id: "assert-canary-after", kind: "assert", assertion: "field-equals", observationRef: "canary-after", field: "hash", expected: "81b4ca90a96f40bca8714cdff2c05e668f465be0e6d5daeecb2e219da19e1575" },
    { id: "observe-ready-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "after" },
    { id: "assert-ready-after", kind: "assert", assertion: "field-equals", observationRef: "after", field: "kind", expected: "idle-ready" },
  ],
});
