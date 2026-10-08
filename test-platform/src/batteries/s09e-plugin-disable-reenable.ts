import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export const S09E_DISABLE_PATH = "lifecycle/plugin-disable.md";
export const S09E_DISABLE_CONTENT = "# BVP plugin disable lifecycle\n\nThis managed file must survive disable and re-enable.\n";
export const S09E_DISABLE_SHA256 = "d502e313512208ba03239dce61b950d2b0083e8c0ec5f1ab8815e050f0f45ee6";

export function createS09ePluginDisableReenableScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09e-plugin-disable-reenable-01",
    description: "Require a real plugin disable/re-enable lifecycle transition and prove managed data remains intact after the validation runtime returns.",
    traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09E-PLUGIN-DISABLE-REENABLE" }] },
    executionModes: ["live"],
    steps: [
      { id: "seed-disable-preservation", kind: "fixture", operation: "put-local-file", device: "windows", path: S09E_DISABLE_PATH, content: { encoding: "utf8", value: S09E_DISABLE_CONTENT } },
      { id: "sync-disable-base-windows", kind: "production", operation: "synchronize", device: "windows" },
      { id: "sync-disable-base-ios", kind: "production", operation: "synchronize", device: "ios" },
      { id: "physical-plugin-disable-reenable", kind: "checkpoint", operation: "restart-device", device: "windows", checkpointRef: "windows-plugin-disable-reenable" },
      { id: "observe-disable-file-after", kind: "observe", subject: "local-entry", device: "windows", path: S09E_DISABLE_PATH, captureAs: "windows-disable-file" },
      { id: "assert-disable-file-after", kind: "assert", assertion: "field-equals", observationRef: "windows-disable-file", field: "hash", expected: S09E_DISABLE_SHA256 },
      { id: "observe-disable-status-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-disable-status" },
      { id: "assert-disable-status-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-disable-status", field: "kind", expected: "idle-ready" },
      { id: "reconcile-disable-windows", kind: "production", operation: "reconcile", device: "windows" },
      { id: "reconcile-disable-ios", kind: "production", operation: "reconcile", device: "ios" },
      { id: "observe-disable-ios", kind: "observe", subject: "local-entry", device: "ios", path: S09E_DISABLE_PATH, captureAs: "ios-disable-file" },
      { id: "assert-disable-ios", kind: "assert", assertion: "field-equals", observationRef: "ios-disable-file", field: "hash", expected: S09E_DISABLE_SHA256 },
    ],
  });
}
