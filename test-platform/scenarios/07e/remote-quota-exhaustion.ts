import { defineScenario } from "../../src/scenario/scenario-contract";

export const remoteQuotaExhaustionScenario = defineScenario({
  id: "s07e-remote-quota-exhaustion",
  description: "Remote quota exhaustion blocks the remote write while preserving the local change.",
  traceability: { targets: [{ kind: "requirement", id: "FAIL-004" }, { kind: "invariant", id: "INV-001" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "quota-protected.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "quota", kind: "external-state", transition: "inject-remote-mutation-fault", operation: "create", effect: "not-applied", classification: "quota-exhausted" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "quota-protected.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "quota-protected.bin", captureAs: "remote" },
    { id: "local-stays", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "remote-not-created", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
  ],
});
