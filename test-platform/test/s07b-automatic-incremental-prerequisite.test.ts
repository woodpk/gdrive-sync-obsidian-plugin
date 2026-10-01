import { strictEqual, notStrictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";

test("automatic-sync uses the existing incremental production path", async () => {
  const scenario = defineScenario({
    id: "s07b-prereq-automatic-incremental",
    description: "ordinary automatic synchronization consumes remote changes through production logic",
    traceability: { targets: [{ kind: "requirement", id: "CHANGE-005" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "local.bin", content: { encoding: "bytes", value: [1] } },
      { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "seed-remote", kind: "fixture", operation: "put-remote-file", path: "remote.bin", content: { encoding: "bytes", value: [2] } },
      { id: "automatic", kind: "production", device: "device-a", operation: "automatic-sync" },
      { id: "observe-local", kind: "observe", subject: "local-entry", device: "device-a", path: "remote.bin", captureAs: "remote-local" },
      { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "remote-local", expected: true },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
});

test("invalid persisted cursor blocks automatic sync until reviewed full reconcile re-baselines", async () => {
  const scenario = defineScenario({
    id: "s07b-prereq-invalid-cursor",
    description: "invalid cursor is detected by automatic production synchronization and recovered only by full reconcile",
    traceability: { targets: [{ kind: "requirement", id: "CHANGE-005" }, { kind: "invariant", id: "INV-002" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cursor.bin", content: { encoding: "bytes", value: [3] } },
      { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "before", kind: "observe", subject: "device-state", device: "device-a", captureAs: "before" },
      { id: "invalidate", kind: "external-state", transition: "invalidate-change-cursor", device: "device-a", reason: "lost" },
      { id: "automatic", kind: "production", device: "device-a", operation: "automatic-sync", expect: { status: "blocked", classification: "recovery-required" } },
      { id: "blocked-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "blocked" },
      { id: "preserved", kind: "observe", subject: "remote-entry", path: "cursor.bin", captureAs: "preserved" },
      { id: "assert-preserved", kind: "assert", assertion: "exists", observationRef: "preserved", expected: true },
      { id: "reconcile", kind: "production", device: "device-a", operation: "reconcile" },
      { id: "after", kind: "observe", subject: "device-state", device: "device-a", captureAs: "after" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const before = result.captures.before as { changeCursor?: string };
  const blocked = result.captures.blocked as { changeCursor?: string };
  const after = result.captures.after as { changeCursor?: string };
  strictEqual(blocked.changeCursor, before.changeCursor);
  notStrictEqual(after.changeCursor, before.changeCursor);
});
