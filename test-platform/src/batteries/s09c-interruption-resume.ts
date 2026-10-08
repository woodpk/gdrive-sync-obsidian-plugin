import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export const S09C_INTERRUPT_PATH = "interruption-resume.md";
export const S09C_INTERRUPT_BASE = "# BVP interruption/resume\n\nVersion: established base\n";
export const S09C_INTERRUPT_UPDATE = "# BVP interruption/resume\n\nVersion: changed before application restart\n";
export const S09C_INTERRUPT_UPDATE_SHA256 = "8cecad3c924b8e7fe6656981512f308188a52cf385532b7195fba29c04ebd362";

export function createS09cInterruptionResumeScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09c-interruption-resume-01",
    description: "Terminate and restart the real Windows Obsidian runtime at an external checkpoint, then prove the unsynchronized local change survives and later converges without duplicate effects.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09C-INTERRUPTION-RESUME" },
      { kind: "invariant", id: "INV-009" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-base", kind: "fixture", operation: "put-local-file", device: "windows", path: S09C_INTERRUPT_PATH, content: { encoding: "utf8", value: S09C_INTERRUPT_BASE } },
      { id: "sync-base-windows", kind: "production", operation: "synchronize", device: "windows" },
      { id: "sync-base-ios", kind: "production", operation: "synchronize", device: "ios" },
      { id: "edit-before-restart", kind: "fixture", operation: "put-local-file", device: "windows", path: S09C_INTERRUPT_PATH, content: { encoding: "utf8", value: S09C_INTERRUPT_UPDATE } },
      { id: "physical-runtime-restart", kind: "checkpoint", operation: "restart-device", device: "windows", checkpointRef: "windows-physical-runtime-restart" },
      { id: "observe-after-restart", kind: "observe", subject: "local-entry", device: "windows", path: S09C_INTERRUPT_PATH, captureAs: "after-restart" },
      { id: "assert-change-survived", kind: "assert", assertion: "field-equals", observationRef: "after-restart", field: "hash", expected: S09C_INTERRUPT_UPDATE_SHA256 },
      { id: "reconcile-after-restart", kind: "production", operation: "reconcile", device: "windows", captureAs: "restart-reconcile-result" },
      { id: "observe-restart-result", kind: "observe", subject: "production-result", inputRef: "restart-reconcile-result", captureAs: "restart-reconcile-receipt" },
      { id: "assert-restart-terminal", kind: "assert", assertion: "field-equals", observationRef: "restart-reconcile-receipt", field: "terminal", expected: "complete" },
      { id: "reconcile-ios", kind: "production", operation: "reconcile", device: "ios" },
      { id: "observe-ios-final", kind: "observe", subject: "local-entry", device: "ios", path: S09C_INTERRUPT_PATH, captureAs: "ios-final" },
      { id: "assert-ios-final", kind: "assert", assertion: "field-equals", observationRef: "ios-final", field: "hash", expected: S09C_INTERRUPT_UPDATE_SHA256 },
    ],
  });
}
