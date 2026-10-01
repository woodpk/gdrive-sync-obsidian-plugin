import { defineScenario } from "../../src/scenario/scenario-contract";

export const cancelBeforeEffectScenario = defineScenario({
  id: "s07c-cancel-before-effect",
  description: "Cancellation before remote dispatch prevents the effect and later reconciliation safely resumes.",
  traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-before.bin", content: { encoding: "bytes", value: [20] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "arm-cancel", kind: "external-state", transition: "request-cancellation", device: "device-a", boundary: "before-remote-dispatch" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
    { id: "remote-before", kind: "observe", subject: "remote-entry", path: "cancel-before.bin", captureAs: "remote-before" },
    { id: "assert-no-effect", kind: "assert", assertion: "exists", observationRef: "remote-before", expected: false },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "cancel-before.bin", captureAs: "remote-after" },
    { id: "assert-resumed", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
