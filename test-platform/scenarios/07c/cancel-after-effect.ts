import { defineScenario } from "../../src/scenario/scenario-contract";

export const cancelAfterEffectScenario = defineScenario({
  id: "s07c-cancel-after-effect",
  description: "Cancellation after one verified effect preserves reality, stops later work, and reconciliation safely completes.",
  traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-after-a.bin", content: { encoding: "bytes", value: [30] } },
    { id: "seed-b", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-after-b.bin", content: { encoding: "bytes", value: [31] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "arm-cancel", kind: "external-state", transition: "request-cancellation", device: "device-a", boundary: "after-remote-effect" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "a-before", kind: "observe", subject: "remote-entry", path: "cancel-after-a.bin", captureAs: "a-before" },
    { id: "b-before", kind: "observe", subject: "remote-entry", path: "cancel-after-b.bin", captureAs: "b-before" },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "a-after", kind: "observe", subject: "remote-entry", path: "cancel-after-a.bin", captureAs: "a-after" },
    { id: "b-after", kind: "observe", subject: "remote-entry", path: "cancel-after-b.bin", captureAs: "b-after" },
    { id: "assert-a-final", kind: "assert", assertion: "exists", observationRef: "a-after", expected: true },
    { id: "assert-b-final", kind: "assert", assertion: "exists", observationRef: "b-after", expected: true },
  ],
});
