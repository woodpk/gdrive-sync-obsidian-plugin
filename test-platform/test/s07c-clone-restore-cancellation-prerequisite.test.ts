import { strictEqual, notStrictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";

test("state copy fails closed when the source backing is unavailable", async () => {
  const scenario = defineScenario({
    id: "s07c-prereq-copy-missing-source",
    description: "copying from an unavailable source backing fails closed without fabricating state",
    traceability: { targets: [{ kind: "requirement", id: "STATE-016" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "copy-missing", kind: "external-state", transition: "fault-device-state", device: "device-a", fault: "copy-from-device", sourceDevice: "missing-device", expect: { status: "failed", classification: "step-exception" } },
      { id: "target-state", kind: "observe", subject: "device-state", device: "device-a", captureAs: "target-state" },
      { id: "assert-uninitialized-recovery", kind: "assert", assertion: "status", observationRef: "target-state", expectedStatus: "recovery-required" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
});

test("copied persisted state is detected as clone/restore authority mismatch on another device", async () => {
  const scenario = defineScenario({
    id: "s07c-prereq-clone-state",
    description: "copying device A synchronization state into device B is an external clone condition that production rejects",
    traceability: { targets: [{ kind: "requirement", id: "STATE-016" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "clone.bin", content: { encoding: "bytes", value: [1] } },
      { id: "establish-a", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "copy-a-to-b", kind: "external-state", transition: "fault-device-state", device: "device-b", fault: "copy-from-device", sourceDevice: "device-a" },
      { id: "restart-b", kind: "checkpoint", operation: "restart-device", device: "device-b" },
      { id: "state-b", kind: "observe", subject: "device-state", device: "device-b", captureAs: "state-b" },
      { id: "assert-recovery", kind: "assert", assertion: "status", observationRef: "state-b", expectedStatus: "recovery-required" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  strictEqual((result.captures["state-b"] as { reason?: string }).reason, "clone-or-restore-suspected");
});

test("copied old state can model a same-device restore without changing embedded device identity", async () => {
  const scenario = defineScenario({
    id: "s07c-prereq-restored-old-state",
    description: "an old B-state backup can be preserved in C and later restored into B as external persisted reality",
    traceability: { targets: [{ kind: "requirement", id: "STATE-016" }, { kind: "requirement", id: "STATE-007" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-b", path: "restore-base.bin", content: { encoding: "bytes", value: [2] } },
      { id: "establish-b", kind: "production", device: "device-b", operation: "synchronize" },
      { id: "old-state", kind: "observe", subject: "device-state", device: "device-b", captureAs: "old-state" },
      { id: "backup-b-to-c", kind: "external-state", transition: "fault-device-state", device: "device-c", fault: "copy-from-device", sourceDevice: "device-b" },
      { id: "new-remote", kind: "fixture", operation: "put-remote-file", path: "newer.bin", content: { encoding: "bytes", value: [3] } },
      { id: "reconcile-b", kind: "production", device: "device-b", operation: "reconcile" },
      { id: "current-state", kind: "observe", subject: "device-state", device: "device-b", captureAs: "current-state" },
      { id: "restore-c-to-b", kind: "external-state", transition: "fault-device-state", device: "device-b", fault: "copy-from-device", sourceDevice: "device-c" },
      { id: "restart-b", kind: "checkpoint", operation: "restart-device", device: "device-b" },
      { id: "restored-state", kind: "observe", subject: "device-state", device: "device-b", captureAs: "restored-state" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const oldState = result.captures["old-state"] as { stateRevision?: string; deviceIdentity?: string };
  const currentState = result.captures["current-state"] as { stateRevision?: string; deviceIdentity?: string };
  const restoredState = result.captures["restored-state"] as { stateRevision?: string; deviceIdentity?: string; status?: string };
  strictEqual(restoredState.status, "trusted");
  strictEqual(restoredState.deviceIdentity, oldState.deviceIdentity);
  strictEqual(restoredState.stateRevision, oldState.stateRevision);
  notStrictEqual(currentState.stateRevision, oldState.stateRevision);
});

test("cancellation armed before remote dispatch prevents the physical effect", async () => {
  const scenario = defineScenario({
    id: "s07c-prereq-cancel-before-dispatch",
    description: "production cancellation accepted at the before-dispatch boundary prevents remote creation",
    traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-before.bin", content: { encoding: "bytes", value: [4] } },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "arm-cancel", kind: "external-state", transition: "request-cancellation", device: "device-a", boundary: "before-remote-dispatch" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "production-request-rejected" } },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "cancel-before.bin", captureAs: "remote" },
      { id: "assert-absent", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
});

test("cancellation after a verified effect preserves that effect and stops later operations", async () => {
  const scenario = defineScenario({
    id: "s07c-prereq-cancel-after-effect",
    description: "after-effect cancellation cannot roll back verified reality and prevents later plan operations from starting",
    traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed-a", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-a.bin", content: { encoding: "bytes", value: [5] } },
      { id: "seed-b", kind: "fixture", operation: "put-local-file", device: "device-a", path: "cancel-b.bin", content: { encoding: "bytes", value: [6] } },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "arm-cancel", kind: "external-state", transition: "request-cancellation", device: "device-a", boundary: "after-remote-effect" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan" },
      { id: "remote-a", kind: "observe", subject: "remote-entry", path: "cancel-a.bin", captureAs: "remote-a" },
      { id: "remote-b", kind: "observe", subject: "remote-entry", path: "cancel-b.bin", captureAs: "remote-b" },
    ],
  });
  const result = await DeterministicScenarioRunner.canonical().run(scenario);
  strictEqual(result.status, "completed", JSON.stringify(result, null, 2));
  const a = (result.captures["remote-a"] as { exists?: boolean }).exists === true;
  const b = (result.captures["remote-b"] as { exists?: boolean }).exists === true;
  strictEqual(Number(a) + Number(b), 1, JSON.stringify(result.captures, null, 2));
});

test("immediate repeated cancellation stays deterministic and crash boundaries remain crashes", async () => {
  const cancel = defineScenario({
    id: "s07c-prereq-repeat-cancel",
    description: "repeated cancellation requests outside an active run remain accepted without creating persistent cancellation authority",
    traceability: { targets: [{ kind: "requirement", id: "PLAN-009" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "cancel-1", kind: "external-state", transition: "request-cancellation", device: "device-a" },
      { id: "cancel-2", kind: "external-state", transition: "request-cancellation", device: "device-a" },
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "repeat-cancel.bin", content: { encoding: "bytes", value: [7] } },
      { id: "sync", kind: "production", device: "device-a", operation: "synchronize" },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "repeat-cancel.bin", captureAs: "remote" },
      { id: "assert-present", kind: "assert", assertion: "exists", observationRef: "remote", expected: true },
    ],
  });
  strictEqual((await DeterministicScenarioRunner.canonical().run(cancel)).status, "completed");

  const crash = defineScenario({
    id: "s07c-prereq-crash-still-crashes",
    description: "existing crash boundary semantics remain unchanged by cancellation actions",
    traceability: { targets: [{ kind: "requirement", id: "STATE-010" }] },
    executionModes: ["deterministic"],
    steps: [
      { id: "seed", kind: "fixture", operation: "put-local-file", device: "device-a", path: "crash-still.bin", content: { encoding: "bytes", value: [8] } },
      { id: "preview", kind: "production", device: "device-a", operation: "preview", captureAs: "plan" },
      { id: "arm-crash", kind: "external-state", transition: "inject-crash-boundary", device: "device-a", boundary: "before-remote-dispatch" },
      { id: "execute", kind: "production", device: "device-a", operation: "execute-reviewed-plan", inputRef: "plan", expect: { status: "failed", classification: "step-exception" } },
      { id: "remote", kind: "observe", subject: "remote-entry", path: "crash-still.bin", captureAs: "remote" },
      { id: "assert-absent", kind: "assert", assertion: "exists", observationRef: "remote", expected: false },
    ],
  });
  strictEqual((await DeterministicScenarioRunner.canonical().run(crash)).status, "completed");
});
