import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09cIosInterruptionResumeScenario = defineScenario({
  id: "battery-s09c-ios-interruption-resume-01",
  description: "Prove an actual iOS Obsidian foreground/termination/reopen transition preserves a pending local edit and safely reconciles it through production.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09C-IOS-INTERRUPTION-RESUME" },
    { kind: "invariant", id: "INV-009" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-ios-base", kind: "fixture", operation: "put-local-file", device: "ios", path: "ios-interruption-resume.md", content: { encoding: "utf8", value: "# BVP interruption/resume\n\nVersion: established base\n" } },
    { id: "sync-ios-base", kind: "production", operation: "synchronize", device: "ios" },
    { id: "sync-windows-base", kind: "production", operation: "synchronize", device: "windows" },
    { id: "edit-ios-before-termination", kind: "fixture", operation: "put-local-file", device: "ios", path: "ios-interruption-resume.md", content: { encoding: "utf8", value: "# BVP interruption/resume\n\nVersion: changed before application restart\n" } },
    { id: "physical-ios-app-restart", kind: "checkpoint", operation: "restart-device", device: "ios", checkpointRef: "ios-physical-app-restart" },
    { id: "observe-ios-after-restart", kind: "observe", subject: "local-entry", device: "ios", path: "ios-interruption-resume.md", captureAs: "ios-after-restart" },
    { id: "assert-ios-edit-survived", kind: "assert", assertion: "field-equals", observationRef: "ios-after-restart", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
    { id: "reconcile-ios-after-restart", kind: "production", operation: "reconcile", device: "ios", captureAs: "ios-restart-receipt" },
    { id: "reconcile-windows-after-restart", kind: "production", operation: "reconcile", device: "windows", captureAs: "windows-restart-receipt" },
    { id: "observe-windows-final", kind: "observe", subject: "local-entry", device: "windows", path: "ios-interruption-resume.md", captureAs: "windows-final" },
    { id: "assert-windows-final", kind: "assert", assertion: "field-equals", observationRef: "windows-final", field: "hash", expected: "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362" },
  ],
});
