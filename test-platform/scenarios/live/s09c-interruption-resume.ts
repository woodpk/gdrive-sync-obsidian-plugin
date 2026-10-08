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
    { id: "observe-pending-restart-edit", kind: "observe", subject: "local-entry", device: "windows", path: "interruption-resume.md", captureAs: "pending-restart-edit" },
    { id: "assert-pending-restart-edit", kind: "assert", assertion: "field-equals", observationRef: "pending-restart-edit", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
    { id: "physical-runtime-restart", kind: "checkpoint", operation: "restart-device", device: "windows", checkpointRef: "windows-physical-runtime-restart" },
    { id: "observe-after-restart", kind: "observe", subject: "local-entry", device: "windows", path: "interruption-resume.md", captureAs: "after-restart" },
    { id: "assert-change-survived", kind: "assert", assertion: "field-equals", observationRef: "after-restart", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
    { id: "reconcile-after-restart", kind: "production", operation: "reconcile", device: "windows", captureAs: "restart-reconcile-result" },
    { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios", captureAs: "ios-resume-result" },
    { id: "observe-ios-final", kind: "observe", subject: "local-entry", device: "ios", path: "interruption-resume.md", captureAs: "ios-final" },
    { id: "assert-ios-final", kind: "assert", assertion: "field-equals", observationRef: "ios-final", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
  ],
});
