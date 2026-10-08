import { defineScenario } from "../../src/scenario/scenario-contract";

export const s09dUnicodePathRoundtripScenario = defineScenario({
  id: "battery-s09d-unicode-path-roundtrip-01",
  description: "Exercise representative real Windows/iOS Unicode and space-containing paths in both synchronization directions and verify exact content identity.",
  traceability: { targets: [
    { kind: "completion-evidence", id: "BVP-S09D-PLATFORM-PATH" },
    { kind: "requirement", id: "PATH-001" },
  ] },
  executionModes: ["live"],
  steps: [
    { id: "seed-windows-unicode", kind: "fixture", operation: "put-local-file", device: "windows", path: "paths/Windows Ångström 東京 😀.md", content: { encoding: "utf8", value: "# Unicode path from Windows\n\nÅngström / 東京 / 😀\n" } },
    { id: "observe-windows-unicode-source", kind: "observe", subject: "local-entry", device: "windows", path: "paths/Windows Ångström 東京 😀.md", captureAs: "windows-unicode-source" },
    { id: "assert-windows-unicode-source", kind: "assert", assertion: "field-equals", observationRef: "windows-unicode-source", field: "hash", expected: "ad0b575ae2a9d2efcb8511576d97502c8b62ab69ae6d97b691de1d2555ac7076" },
    { id: "sync-windows-unicode", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-unicode-upload" },
    { id: "sync-ios-receive-windows", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-unicode-download" },
    { id: "observe-ios-windows-path", kind: "observe", subject: "local-entry", device: "ios", path: "paths/Windows Ångström 東京 😀.md", captureAs: "ios-windows-path" },
    { id: "assert-ios-windows-path", kind: "assert", assertion: "field-equals", observationRef: "ios-windows-path", field: "hash", expected: "ad0b575ae2a9d2efcb8511576d97502c8b62ab69ae6d97b691de1d2555ac7076" },
    { id: "seed-ios-unicode", kind: "fixture", operation: "put-local-file", device: "ios", path: "paths/iOS café école 東京.md", content: { encoding: "utf8", value: "# Unicode path from iOS\n\ncafé / école / 東京\n" } },
    { id: "sync-ios-unicode", kind: "production", operation: "synchronize", device: "ios", captureAs: "ios-unicode-upload" },
    { id: "sync-windows-receive-ios", kind: "production", operation: "synchronize", device: "windows", captureAs: "windows-unicode-download" },
    { id: "observe-windows-ios-path", kind: "observe", subject: "local-entry", device: "windows", path: "paths/iOS café école 東京.md", captureAs: "windows-ios-path" },
    { id: "assert-windows-ios-path", kind: "assert", assertion: "field-equals", observationRef: "windows-ios-path", field: "hash", expected: "75c1a961442808b9384284e64b150ab2a3a0a40f619779388454e47f88103369" },
  ],
});
