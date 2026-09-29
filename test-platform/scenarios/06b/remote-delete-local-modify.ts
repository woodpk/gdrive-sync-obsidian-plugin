import { defineScenario } from "../../src/scenario/scenario-contract";

export const remoteDeleteLocalModifyScenario = defineScenario({
  id: "s06b-remote-delete-local-modify",
  description: "After a trustworthy common base, REMOTE deletion cannot erase an independent LOCAL modification; production surfaces an unresolved delete-vs-modify conflict and preserves the LOCAL version.",
  traceability: { targets: [
    { kind: "requirement", id: "CONFLICT-006" },
    { kind: "requirement", id: "CONFLICT-007" },
    { kind: "requirement", id: "PLAN-002" },
    { kind: "requirement", id: "CHANGE-001" },
    { kind: "requirement", id: "CHANGE-002" },
    { kind: "invariant", id: "INV-005" },
    { kind: "invariant", id: "INV-006" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "device-a", path: "remote-delete-local-modify.md", content: { encoding: "utf8", value: "base\n" } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "modify-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "remote-delete-local-modify.md", content: { encoding: "utf8", value: "local modified\n" } },
    { id: "delete-remote", kind: "fixture", operation: "remove-remote", path: "remote-delete-local-modify.md" },
    { id: "preview-conflict", kind: "production", device: "device-a", operation: "preview", captureAs: "conflict-plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "conflict-plan", captureAs: "plan-view" },
    { id: "assert-unresolved", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "remote-delete-local-modify.md", captureAs: "local-after" },
    { id: "assert-local-present", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
    { id: "assert-local-modified", kind: "assert", assertion: "field-equals", observationRef: "local-after", field: "hash", expected: "sha256:b0b4448e5d9996275e39bbe643334e2198386273090ad6bb8307028d47b7a8c2" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "remote-delete-local-modify.md", captureAs: "remote-after" },
    { id: "assert-remote-absent", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: false },
  ],
});
