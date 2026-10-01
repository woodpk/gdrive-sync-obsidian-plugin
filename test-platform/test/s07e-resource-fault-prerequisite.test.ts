import { notStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import { virtualDrivePath } from "../src/virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";

const source = (values: readonly number[]) => ({
  sizeBytes: values.length,
  async *openChunks(): AsyncIterable<Uint8Array> { yield Uint8Array.from(values); },
});

test("quota-exhausted mutation fault reaches production as a blocking resource failure without creating remote content", async () => {
  const scenario = defineScenario({
    id: "s07e-prereq-quota-exhausted",
    description: "The generic remote mutation fault preserves quota-exhausted rather than collapsing it to transient failure.",
    traceability: { targets: [{ kind: "requirement", id: "FAIL-004" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "quota.bin", content: { encoding: "bytes", value: [1, 2, 3] } },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "fault", kind: "external-state", transition: "inject-remote-mutation-fault", operation: "create", effect: "not-applied", classification: "quota-exhausted" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
      { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "quota.bin", captureAs: "local" },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "quota.bin", captureAs: "remote" },
      { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
      { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
});

test("disk-full local write fault leaves prior local bytes intact while the newer remote version remains authoritative reality", async () => {
  const scenario = defineScenario({
    id: "s07e-prereq-local-disk-full",
    description: "The generic local access fault can model device-level disk-full on the production staging path without making reads unavailable.",
    traceability: { targets: [{ kind: "requirement", id: "FAIL-005" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed-local", kind: "fixture", operation: "put-local-file", device: "device-a", path: "disk-full.bin", content: { encoding: "bytes", value: [4] } },
      { id: "establish", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "remote-newer", kind: "fixture", operation: "put-remote-file", path: "disk-full.bin", content: { encoding: "bytes", value: [5, 6] } },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "disk-full", kind: "external-state", transition: "set-local-access", device: "device-a", path: "disk-full.bin", state: "disk-full" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
      { id: "local", kind: "observe", subject: "local-entry", device: "device-a", path: "disk-full.bin", captureAs: "local" },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "disk-full.bin", captureAs: "remote" },
      { id: "assert-local", kind: "assert", assertion: "exists", observationRef: "local", expected: true },
      { id: "assert-remote", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const local = result.captures.local as { hash?: string; sizeBytes?: number };
  const remote = result.captures.remote as { hash?: string; sizeBytes?: number };
  strictEqual(local.sizeBytes, 1);
  strictEqual(remote.sizeBytes, 2);
  notStrictEqual(local.hash, remote.hash);
});


test("quota-exhausted provenance reaches the V1.3 production disposition as a blocking resource failure", async () => {
  const world = await VirtualSynchronizationWorld.create();
  await world.deviceBacking("device-a").local.replaceFile(virtualVaultPath("quota-surface.bin"), source([9]));
  const device = await world.reconstructDevice("device-a");
  const plan = await device.controller.previewManual();
  if (!plan) throw new Error("expected quota prerequisite plan");
  world.drive.queueBoundaryFault({
    boundary: "create",
    signal: { kind: "quota-exhausted", detail: "quota-exhausted" },
    mutationEffect: "not-applied",
  });
  const result = await device.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
  strictEqual(result.status, "rejected");
  strictEqual(device.controller.currentSurface().status.kind, "error");
  strictEqual(world.drive.inspectObjectsAtPath(world.managedRemote.rootId, virtualDrivePath("quota-surface.bin")).length, 0);
  await device.dispose();
});
