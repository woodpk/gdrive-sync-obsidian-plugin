import { defineScenario } from "../../src/scenario/scenario-contract";

export const uploadIntegrityScenario = defineScenario({
  id: "s07d-upload-integrity",
  description: "A completed upload preserves content identity between local and remote observations.",
  traceability: { targets: [{ kind: "requirement", id: "XFER-001" }, { kind: "requirement", id: "XFER-004" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "upload-integrity.bin", content: { encoding: "bytes", value: [1, 2, 3, 4, 5] } },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "upload-integrity.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "upload-integrity.bin", captureAs: "remote" },
    { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
  ],
});
