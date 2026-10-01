import { strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario, validateScenarioDefinition, type ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";

const traceability = { targets: [{ kind: "requirement", id: "STATE-011" }] } as const;

const stateFaultScenario = (id: string, fault: "corrupt-checksum" | "truncate" | "incompatible-schema") => defineScenario({
  id,
  description: "prerequisite state-fault routing proof",
  traceability,
  executionModes: ["deterministic"],
  steps: [
    { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "control.bin", content: { encoding: "bytes", value: [1] } },
    { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
    { id: "fault", kind: "external-state", transition: "fault-device-state", device: "device-a", fault, ...(fault === "incompatible-schema" ? { schemaVersion: 2 } : {}) },
    { id: "state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
    { id: "assert-recovery", kind: "assert", assertion: "status", observationRef: "state", expectedStatus: "recovery-required" },
  ],
});

for (const fault of ["corrupt-checksum", "truncate", "incompatible-schema"] as const) {
  test(`fault-device-state routes ${fault} through persisted device state`, async () => {
    const result = await DeterministicScenarioRunner.canonical().run(stateFaultScenario(`s07b-prereq-${fault}`, fault));
    strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  });
}

test("invalidate-change-cursor targets the device's persisted cursor", async () => {
  const scenario = defineScenario({
    id: "s07b-prereq-cursor",
    description: "persisted cursor invalidation routing proof",
    traceability: { targets: [{ kind: "requirement", id: "CHANGE-005" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cursor.bin", content: { encoding: "bytes", value: [2] } },
      { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "invalidate", kind: "external-state", transition: "invalidate-change-cursor", device: "device-a", reason: "lost" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
});

for (const [state, expected] of [
  ["missing", "missing-root"],
  ["identity-mismatch", "identity-mismatch"],
  ["incompatible-protocol", "incompatible-protocol"],
] as const) {
  test(`managed-root fault exposes ${expected} through existing validation`, async () => {
    const world = await VirtualSynchronizationWorld.create(["device-a", "device-b"]);
    world.drive.faultManagedRoot(world.managedRemote.rootId, state);
    const validation = await world.drive.validateManagedRoot(world.managedRemote);
    strictEqual(validation.ok, true);
    if (validation.ok) strictEqual(validation.value.status, expected);

    const scenario = defineScenario({
      id: `s07b-prereq-root-${state}`,
      description: "managed-root external-state routing proof",
      traceability: { targets: [{ kind: "requirement", id: "REM-008" }] },
      executionModes: ["deterministic"],
      steps: [{ id: "fault", kind: "external-state", transition: "fault-managed-root", state }],
    });
    strictEqual((await DeterministicScenarioRunner.canonical().run(scenario)).status, "completed");
  });
}

test("new controls reject malformed declarative inputs and existing completeness controls remain valid", async () => {
  const malformed = {
    id: "s07b-prereq-invalid",
    description: "invalid state schema fault",
    traceability,
    executionModes: ["deterministic"],
    steps: [{ id: "fault", kind: "external-state", transition: "fault-device-state", device: "device-a", fault: "incompatible-schema", schemaVersion: 1 }],
  } as unknown as ScenarioDefinition;
  strictEqual(validateScenarioDefinition(malformed).ok, false);

  const existing = defineScenario({
    id: "s07b-prereq-existing-completeness",
    description: "existing completeness controls remain executable",
    traceability: { targets: [{ kind: "requirement", id: "CHANGE-007" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "listing", kind: "external-state", transition: "set-remote-listing-completeness", completeness: "partial" },
      { id: "changes", kind: "external-state", transition: "set-remote-change-completeness", completeness: "partial" },
    ],
  });
  strictEqual((await DeterministicScenarioRunner.canonical().run(existing)).status, "completed");
});
