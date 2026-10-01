import { defineScenario } from "../../src/scenario/scenario-contract";

export const downloadIntegrityScenario = defineScenario({
  id: "s07d-download-integrity",
  description: "A completed download preserves content identity and materializes a valid local final file.",
  traceability: { targets: [{ kind: "requirement", id: "XFER-001" }, { kind: "requirement", id: "XFER-003" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-remote-file", path: "download-integrity.bin", content: { encoding: "bytes", value: [6, 7, 8, 9] } },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "download-integrity.bin", captureAs: "remote" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "download-integrity.bin", captureAs: "local" },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
  ],
});
