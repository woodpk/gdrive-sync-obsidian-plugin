import { defineScenario } from "../../src/scenario/scenario-contract";

export const partialChangePageScenario = defineScenario({
  id: "s07b-partial-change-page",
  description: "An incomplete remote change page blocks incremental authority and requires explicit full reconciliation.",
  traceability: { targets: [{ kind: "requirement", id: "CHANGE-005" }, { kind: "requirement", id: "CHANGE-007" }, { kind: "invariant", id: "INV-002" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "partial-change.bin", content: { encoding: "bytes", value: [12] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "partial", kind: "external-state", transition: "set-remote-change-completeness", completeness: "partial", reason: "s07b-partial-change-page" },
    { id: "incremental", kind: "production", device: "device-a", operation: "automatic-sync", expect: { status: "blocked", classification: "recovery-required" } },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "partial-change.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "partial-change.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "incremental-after", kind: "production", device: "device-a", operation: "automatic-sync" },
  ],
});
