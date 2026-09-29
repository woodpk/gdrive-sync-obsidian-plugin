import { defineScenario } from "../../src/scenario/scenario-contract";

export const trueTextConflictScenario = defineScenario({
  id: "s06b-true-text-conflict",
  description: "Overlapping incompatible edits from one trustworthy text base remain an unresolved production conflict while both complete versions stay preserved.",
  traceability: { targets: [
    { kind: "requirement", id: "CONFLICT-001" },
    { kind: "requirement", id: "CONFLICT-003" },
    { kind: "requirement", id: "CONFLICT-004" },
    { kind: "invariant", id: "INV-005" },
    { kind: "invariant", id: "INV-008" },
  ] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "device-a", path: "true-conflict.md", content: { encoding: "utf8", value: "alpha\nbeta\n" } },
    { id: "establish-base", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "edit-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "true-conflict.md", content: { encoding: "utf8", value: "alpha\nLOCAL\n" } },
    { id: "edit-remote", kind: "fixture", operation: "put-remote-file", path: "true-conflict.md", content: { encoding: "utf8", value: "alpha\nREMOTE\n" } },
    { id: "preview-conflict", kind: "production", device: "device-a", operation: "preview", captureAs: "conflict-plan" },
    { id: "observe-plan", kind: "observe", subject: "production-plan", inputRef: "conflict-plan", captureAs: "plan-view" },
    { id: "assert-unresolved", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "unresolved-conflict" },
    { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "true-conflict.md", captureAs: "local-version" },
    { id: "assert-local-preserved", kind: "assert", assertion: "field-equals", observationRef: "local-version", field: "hash", expected: "sha256:a018ca0660b8e335b66769aae9a78f9e1047e5aa3c9cc79534a3a7a589d571f0" },
    { id: "observe-remote", kind: "observe", subject: "remote-entry", path: "true-conflict.md", captureAs: "remote-version" },
    { id: "assert-remote-preserved", kind: "assert", assertion: "field-equals", observationRef: "remote-version", field: "hash", expected: "sha256:93f93626aab55601bc843d9a4d4842ec8a868bc6408fcac7a939168ab1bbae88" },
  ],
});
