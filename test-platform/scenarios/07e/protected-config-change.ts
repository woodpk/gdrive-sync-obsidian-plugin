import { defineScenario } from "../../src/scenario/scenario-contract";

export const protectedConfigChangeScenario = defineScenario({
  id: "s07e-protected-config-change",
  description: "A protected authentication configuration artifact remains local across repeated changes and synchronization.",
  traceability: { targets: [{ kind: "requirement", id: "CONFIG-001" }, { kind: "requirement", id: "CONFIG-003" }, { kind: "requirement", id: "CONFIG-005" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: ".obsidian/oauth-token.json", content: { encoding: "utf8", value: "{\"token\":\"one\"}" } },
    { id: "sync-initial", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "change", kind: "fixture", operation: "put-local-file", device: "device-a", path: ".obsidian/oauth-token.json", content: { encoding: "utf8", value: "{\"token\":\"two-updated\"}" } },
    { id: "sync-change", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: ".obsidian/oauth-token.json", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: ".obsidian/oauth-token.json", captureAs: "remote" },
    { id: "local-present", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "remote-absent", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
  ],
});
