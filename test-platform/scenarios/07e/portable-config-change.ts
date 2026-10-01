import { defineScenario } from "../../src/scenario/scenario-contract";

export const portableConfigChangeScenario = defineScenario({
  id: "s07e-portable-config-change",
  description: "An explicitly portable Obsidian configuration artifact synchronizes through the dedicated configuration namespace.",
  traceability: { targets: [{ kind: "requirement", id: "CONFIG-001" }, { kind: "requirement", id: "CONFIG-002" }, { kind: "requirement", id: "CONFIG-003" }, { kind: "requirement", id: "CONFIG-008" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: ".obsidian/app.json", content: { encoding: "utf8", value: "{}" } },
    { id: "sync-initial", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "change", kind: "fixture", operation: "put-local-file", device: "device-a", path: ".obsidian/app.json", content: { encoding: "utf8", value: "{\"theme\":\"dark\"}" } },
    { id: "sync-change", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: ".obsidian/app.json", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "__brain_sync_portable_config__/app.json", captureAs: "remote" },
    { id: "local-present", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "remote-present", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
