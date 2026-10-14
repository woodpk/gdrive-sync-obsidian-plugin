import { defineScenario } from "../../src/scenario/scenario-contract";

export const incompatibleRootProtocolScenario = defineScenario({
  id: "s07b-incompatible-root-protocol",
  description: "An incompatible managed-root protocol version blocks synchronization rather than treating the root as continuous authority.",
  traceability: { targets: [{ kind: "requirement", id: "REM-007" }, { kind: "requirement", id: "REM-008" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "protocol-root.bin", content: { encoding: "bytes", value: [15] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "fault-root", kind: "external-state", transition: "fault-managed-root", state: "incompatible-protocol" },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize", expect: { status: "blocked", classification: "missing-production-plan" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "protocol-root.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "protocol-root.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
