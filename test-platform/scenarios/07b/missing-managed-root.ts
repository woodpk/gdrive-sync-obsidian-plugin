import { defineScenario } from "../../src/scenario/scenario-contract";

export const missingManagedRootScenario = defineScenario({
  id: "s07b-missing-managed-root",
  description: "A missing paired remote root enters recovery and is never treated as an empty valid remote.",
  traceability: { targets: [{ kind: "requirement", id: "REM-008" }, { kind: "requirement", id: "REM-002" }, { kind: "invariant", id: "INV-001" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "missing-root.bin", content: { encoding: "bytes", value: [13] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "fault-root", kind: "external-state", transition: "fault-managed-root", state: "missing" },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize", expect: { status: "blocked", classification: "missing-production-plan" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "missing-root.bin", captureAs: "local" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
  ],
});
