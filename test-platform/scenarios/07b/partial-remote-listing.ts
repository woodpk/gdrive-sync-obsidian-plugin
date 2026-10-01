import { defineScenario } from "../../src/scenario/scenario-contract";

export const partialRemoteListingScenario = defineScenario({
  id: "s07b-partial-remote-listing",
  description: "Partial remote enumeration cannot convert apparent remote absence into authority to delete a valid local file.",
  traceability: { targets: [{ kind: "requirement", id: "CHANGE-007" }, { kind: "invariant", id: "INV-002" }] },
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "partial-listing.bin", content: { encoding: "bytes", value: [11] } },
    { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "remove-remote", kind: "fixture", operation: "remove-remote", path: "partial-listing.bin" },
    { id: "partial", kind: "external-state", transition: "set-remote-listing-completeness", completeness: "partial", reason: "s07b-partial-listing" },
    { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
    { id: "plan-view", kind: "observe", subject: "production-plan", inputRef: "plan", captureAs: "plan-view" },
    { id: "assert-blocked", kind: "assert", assertion: "contains", observationRef: "plan-view", field: "operationKinds", expected: "blocked-unsafe" },
    { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "partial-listing.bin", captureAs: "local" },
    { id: "remote", kind: "observe", subject: "remote-entry", path: "partial-listing.bin", captureAs: "remote" },
    { id: "assert-local-preserved", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
    { id: "assert-remote-absent", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
  ],
});
