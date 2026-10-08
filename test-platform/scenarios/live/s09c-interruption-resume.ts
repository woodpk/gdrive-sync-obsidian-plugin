import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09cInterruptionResumeScenario = defineScenario({
  id: "battery-s09c-interruption-resume-01",
  description: "Terminate and restart the real Windows Obsidian runtime at an external checkpoint, then prove the unsynchronized local change survives and later converges without duplicate effects.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09C-INTERRUPTION-RESUME" },
    { kind: "invariant", id: "INV-009" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "windows", path: "interruption-resume.md", content: { encoding: "utf8", value: "# BVP interruption/resume\n\nVersion: established base\n" } },
    { id: "sync-base-windows", kind: "production", operation: "synchronize", device: "windows" },
    { id: "sync-base-ios", kind: "production", operation: "synchronize", device: "ios" },
    { id: "edit-before-restart", kind: "fixture", operation: "put-local-file", device: "windows", path: "interruption-resume.md", content: { encoding: "utf8", value: "# BVP interruption/resume\n\nVersion: changed before application restart\n" } },
    { id: "physical-runtime-restart", kind: "checkpoint", operation: "restart-device", device: "windows", checkpointRef: "windows-physical-runtime-restart" },
    { id: "observe-after-restart", kind: "observe", subject: "local-entry", device: "windows", path: "interruption-resume.md", captureAs: "after-restart" },
    { id: "assert-change-survived", kind: "assert", assertion: "field-equals", observationRef: "after-restart", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
    { id: "reconcile-after-restart", kind: "production", operation: "reconcile", device: "windows", captureAs: "restart-reconcile-result" },
    { id: "observe-restart-result", kind: "observe", subject: "production-result", inputRef: "restart-reconcile-result", captureAs: "restart-reconcile-receipt" },
    { id: "assert-restart-terminal", kind: "assert", assertion: "field-equals", observationRef: "restart-reconcile-receipt", field: "terminal", expected: "complete" },
    { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios" },
    { id: "observe-ios-final", kind: "observe", subject: "local-entry", device: "ios", path: "interruption-resume.md", captureAs: "ios-final" },
    { id: "assert-ios-final", kind: "assert", assertion: "field-equals", observationRef: "ios-final", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
  ],
});
