import { defineScenario } from "../../src/scenario/scenario-contract";

export const localDiskFullScenario = defineScenario({
  id: "s07e-local-disk-full",
  description: "Local disk exhaustion blocks replacement without destroying the previously valid local file.",
  traceability: { targets: [{ kind: "requirement", id: "FAIL-005" }, { kind: "invariant", id: "INV-001" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "disk-protected.bin", content: { encoding: "bytes", value: [4] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "remote-newer", kind: "fixture", operation: "put-remote-file", path: "disk-protected.bin", content: { encoding: "bytes", value: [5, 6] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "disk-full", kind: "external-state", transition: "set-local-access", device: "device-a", path: "disk-protected.bin", state: "disk-full" },
    { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "disk-protected.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "disk-protected.bin", captureAs: "remote" },
    { id: "local-valid", kind: "assert", assertion: "field-equals", observationRef: "local", field: "sizeBytes", expected: 1 },
    { id: "remote-newer-stays", kind: "assert", assertion: "field-equals", observationRef: "remote", field: "sizeBytes", expected: 2 },
  ],
});
