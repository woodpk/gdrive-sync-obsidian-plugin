import { defineScenario } from "../../src/scenario/scenario-contract";

export const transientRemoteFailureScenario = defineScenario({
  id: "s07d-transient-remote-failure",
  description: "A retryable remote mutation failure is surfaced without fabricating success and later reconciliation can safely retry.",
  traceability: { targets: [{ kind: "requirement", id: "XFER-004" }, { kind: "requirement", id: "FAIL-002" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "transient.bin", content: { encoding: "bytes", value: [30] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "fault", kind: "external-state", transition: "inject-remote-mutation-fault", operation: "create", effect: "not-applied", classification: "s07d-transient" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
    { id: "remote-before", kind: "observe", subject: "remote-entry", path: "transient.bin", captureAs: "remote-before" },
    { id: "assert-not-fabricated", kind: "assert", assertion: "exists", observationRef: "remote-before", expected: false },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "transient.bin", captureAs: "remote-after" },
    { id: "assert-retried", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
