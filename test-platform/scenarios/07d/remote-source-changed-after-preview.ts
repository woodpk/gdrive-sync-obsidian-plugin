import { defineScenario } from "../../src/scenario/scenario-contract";

export const remoteSourceChangedAfterPreviewScenario = defineScenario({
  id: "s07d-remote-source-changed-after-preview",
  description: "A remote source changed after planning is not silently installed as the stale planned revision.",
  traceability: { targets: [{ kind: "requirement", id: "XFER-001" }, { kind: "requirement", id: "XFER-003" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-remote-file", path: "remote-race.bin", content: { encoding: "bytes", value: [20] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "mutate-remote", kind: "fixture", operation: "put-remote-file", path: "remote-race.bin", content: { encoding: "bytes", value: [21, 22] } },
    { id: "execute-stale-plan", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "local-before", kind: "observe", subject: "local-entry", device: "device-a", path: "remote-race.bin", captureAs: "local-before" },
    { id: "assert-no-stale-install", kind: "assert", assertion: "exists", observationRef: "local-before", expected: false },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "remote-race.bin", captureAs: "remote-after" },
    { id: "local-after", kind: "observe", subject: "local-entry", device: "device-a", path: "remote-race.bin", captureAs: "local-after" },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
  ],
});
