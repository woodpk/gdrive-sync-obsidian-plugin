import { defineScenario, type ScenarioDefinition } from "../scenario/scenario-contract";

export const S09D_WINDOWS_UNICODE_PATH = "paths/Windows Ångström 東京 😀.md";
export const S09D_IOS_UNICODE_PATH = "paths/iOS café école 東京.md";
export const S09D_WINDOWS_UNICODE_CONTENT = "# Unicode path from Windows\n\nÅngström / 東京 / 😀\n";
export const S09D_IOS_UNICODE_CONTENT = "# Unicode path from iOS\n\ncafé / école / 東京\n";
export const S09D_WINDOWS_UNICODE_SHA256 = "ad0b575ae2a9d2efcb8511576d97502c8b62ab69ae6d97b691de1d2555ac7076";
export const S09D_IOS_UNICODE_SHA256 = "75c1a961442808b9384284e64b150ab2a3a0a40f619779388454e47f88103369";

export function createS09dUnicodePathRoundtripScenario(): ScenarioDefinition {
  return defineScenario({
    id: "battery-s09d-unicode-path-roundtrip-01",
    description: "Exercise representative real Windows/iOS Unicode and space-containing paths in both synchronization directions and verify exact content identity.",
    traceability: { targets: [
      { kind: "completion-evidence", id: "BVP-S09D-PLATFORM-PATH" },
      { kind: "requirement", id: "PATH-001" },
    ] },
    executionModes: ["live"],
    steps: [
      { id: "seed-windows-unicode", kind: "fixture", operation: "put-local-file", device: "windows", path: S09D_WINDOWS_UNICODE_PATH, content: { encoding: "utf8", value: S09D_WINDOWS_UNICODE_CONTENT } },
      { id: "sync-windows-unicode", kind: "production", operation: "synchronize", device: "windows" },
      { id: "sync-ios-receive-windows", kind: "production", operation: "synchronize", device: "ios" },
      { id: "observe-ios-windows-path", kind: "observe", subject: "local-entry", device: "ios", path: S09D_WINDOWS_UNICODE_PATH, captureAs: "ios-windows-path" },
      { id: "assert-ios-windows-path", kind: "assert", assertion: "field-equals", observationRef: "ios-windows-path", field: "hash", expected: S09D_WINDOWS_UNICODE_SHA256 },
      { id: "seed-ios-unicode", kind: "fixture", operation: "put-local-file", device: "ios", path: S09D_IOS_UNICODE_PATH, content: { encoding: "utf8", value: S09D_IOS_UNICODE_CONTENT } },
      { id: "sync-ios-unicode", kind: "production", operation: "synchronize", device: "ios" },
      { id: "sync-windows-receive-ios", kind: "production", operation: "synchronize", device: "windows" },
      { id: "observe-windows-ios-path", kind: "observe", subject: "local-entry", device: "windows", path: S09D_IOS_UNICODE_PATH, captureAs: "windows-ios-path" },
      { id: "assert-windows-ios-path", kind: "assert", assertion: "field-equals", observationRef: "windows-ios-path", field: "hash", expected: S09D_IOS_UNICODE_SHA256 },
    ],
  });
}
