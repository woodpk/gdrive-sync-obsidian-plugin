import { defineScenario } from "../../src/scenario/scenario-contract";

export const localSourceChangedAfterPreviewScenario = defineScenario({
  id: "s07d-local-source-changed-after-preview",
  description: "A local source changed after planning is not silently uploaded as the planned version.",
  traceability: { targets: [{ kind: "requirement", id: "XFER-002" }, { kind: "requirement", id: "FILE-013" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-race.bin", content: { encoding: "bytes", value: [10] } },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "mutate-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local-race.bin", content: { encoding: "bytes", value: [11, 12] } },
    { id: "execute-stale-plan", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
    { id: "remote-before", kind: "observe", subject: "remote-entry", path: "local-race.bin", captureAs: "remote-before" },
    { id: "assert-no-stale-upload", kind: "assert", assertion: "exists", observationRef: "remote-before", expected: false },
    { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
    { id: "local-after", kind: "observe", subject: "local-entry", device: "device-a", path: "local-race.bin", captureAs: "local-after" },
    { id: "remote-after", kind: "observe", subject: "remote-entry", path: "local-race.bin", captureAs: "remote-after" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local-after", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote-after", expected: true },
  ],
});
