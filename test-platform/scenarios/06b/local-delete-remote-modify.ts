import { defineScenario } from "../../src/scenario/scenario-contract";

export const localDeleteRemoteModifyScenario = defineScenario({
  id: "s06b-local-delete-remote-modify",
  description: "After a trustworthy common base, LOCAL deletion cannot erase an independent REMOTE modification; production surfaces an unresolved delete-vs-modify conflict and preserves the REMOTE version.",
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
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-delete-remote-modify.md", content: { encoding: "utf8", value: "base\n" } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "delete-local", kind: "fixture", operation: "remove-local", device: "device-a", path: "local-delete-remote-modify.md" },
    { id: "modify-remote", kind: "fixture", operation: "put-remote-file", path: "local-delete-remote-modify.md", content: { encoding: "utf8", value: "remote modified\n" } },
    { id: "preview-conflict", kind: "production", device: "device-a", operation: "preview", captureAs: "conflict-plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "conflict-plan", captureAs: "plan-view" },
    { id: "assert-unresolved", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "local-delete-remote-modify.md", captureAs: "local-after" },
    { id: "assert-local-absent", kind: "assert", assertion: "exists", observationRef: "local-after", expected: false },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "local-delete-remote-modify.md", captureAs: "remote-after" },
    { id: "assert-remote-present", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
    { id: "assert-remote-modified", kind: "assert", assertion: "field-equals", observationRef: "remote-after", field: "hash", expected: "sha256:a94904ccb3c59acea8240f116d07fe5fcf6d703a901e7425911c76513b08ba81" },
  ],
});
