import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export function createS09aDualDeviceReadinessScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09a-dual-device-readiness-01",
    description: "Observe both installed validation participants through the live BVP path and require each production controller to be idle-ready.",
    traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09A-DUAL-DEVICE-READINESS" }] },
    executionModes: ["live"],
    steps: [
      { id: "observe-windows", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-status" },
      { id: "assert-windows-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-status", field: "kind", expected: "idle-ready" },
      { id: "observe-ios", kind: "observe", subject: "device-state", device: "ios", captureAs: "ios-status" },
      { id: "assert-ios-ready", kind: "assert", assertion: "field-equals", observationRef: "ios-status", field: "kind", expected: "idle-ready" },
    ],
  });
}
