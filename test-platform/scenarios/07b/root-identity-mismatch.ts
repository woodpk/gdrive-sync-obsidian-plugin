import { defineScenario } from "../../src/scenario/scenario-contract";

export const rootIdentityMismatchScenario = defineScenario({
  id: "s07b-root-identity-mismatch",
  description: "A root with mismatched vault identity remains physically present but cannot be silently accepted as continuous authority.",
  traceability: { targets: [{ kind: "requirement", id: "REM-002" }, { kind: "requirement", id: "REM-003" }, { kind: "requirement", id: "REM-008" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "identity-root.bin", content: { encoding: "bytes", value: [14] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "fault-root", kind: "external-state", transition: "fault-managed-root", state: "identity-mismatch" },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize", expect: { status: "blocked", classification: "missing-production-plan" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "identity-root.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "identity-root.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
