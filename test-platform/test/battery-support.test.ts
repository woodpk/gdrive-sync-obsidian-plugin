import { strictEqual } from "node:assert";
import { test } from "node:test";

import { validateScenarioDefinition } from "../src/scenario/scenario-contract";

test("bounded live pattern fixture validates while preserving the device-agent 32 MiB cap", () => {
  const valid = {
    id: "pattern-live",
    description: "Pattern fixture",
    traceability: { targets: [{ kind: "completion-evidence", id: "PATTERN" }] },
    executionModes: ["live"],
    steps: [
      {
        id: "pattern",
        kind: "fixture",
        operation: "put-local-pattern",
        device: "ios",
        path: "large.bin",
        byteLength: 8 * 1024 * 1024,
        seed: "fixture-seed",
      },
    ],
  };

  strictEqual(validateScenarioDefinition(valid).ok, true);
  const invalid = structuredClone(valid) as any;
  invalid.steps[0].byteLength = 33_554_433;
  strictEqual(validateScenarioDefinition(invalid).ok, false);
});
