import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09eUninstallReinstallScenario = defineScenario({
  id: "battery-s09e-uninstall-reinstall-01",
  description: "Require a real plugin uninstall/reinstall using the exact validation artifact and prove managed local/remote data is preserved after return.",
  traceability: { targets: [{ kind: "completion-evidence", id: "BVP-S09E-UNINSTALL-REINSTALL" }] },
  executionModes: ["live"],
  steps: [
    { id: "seed-reinstall-preservation", kind: "fixture", operation: "put-local-file", device: "windows", path: "lifecycle/plugin-reinstall.md", content: { encoding: "utf8", value: "# BVP plugin reinstall lifecycle\n\nThis managed file must survive uninstall and reinstall.\n" } },
    { id: "sync-reinstall-base-windows", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-reinstall-base" },
    { id: "sync-reinstall-base-ios", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-reinstall-base" },
    { id: "physical-plugin-uninstall-reinstall", kind: "checkpoint", operation: "restart-device", device: "windows", checkpointRef: "windows-plugin-uninstall-reinstall" },
    { id: "observe-reinstall-file-after", kind: "observe", subject: "local-entry", device: "windows", path: "lifecycle/plugin-reinstall.md", captureAs: "windows-reinstall-file" },
    { id: "assert-reinstall-file-after", kind: "assert", assertion: "field-equals", observationRef: "windows-reinstall-file", field: "hash", expected: "ea7b20af00704bfd1b7e94b7b25b4098132ead8ae4124c5b66fbacb20450d803" },
    { id: "observe-reinstall-status-after", kind: "observe", subject: "device-state", device: "windows", captureAs: "windows-reinstall-status" },
    { id: "assert-reinstall-status-ready", kind: "assert", assertion: "field-equals", observationRef: "windows-reinstall-status", field: "kind", expected: "idle-ready" },
    { id: "reconcile-reinstall-windows", kind: "production", operation: "reconcile", device: "windows", captureAs: "windows-reinstall-reconcile" },
    { id: "reconcile-reinstall-ios", kind: "production", operation: "reconcile", device: "ios", captureAs: "ios-reinstall-reconcile" },
    { id: "observe-reinstall-ios", kind: "observe", subject: "local-entry", device: "ios", path: "lifecycle/plugin-reinstall.md", captureAs: "ios-reinstall-file" },
    { id: "assert-reinstall-ios", kind: "assert", assertion: "field-equals", observationRef: "ios-reinstall-file", field: "hash", expected: "ea7b20af00704bfd1b7e94b7b25b4098132ead8ae4124c5b66fbacb20450d803" },
  ],
});
