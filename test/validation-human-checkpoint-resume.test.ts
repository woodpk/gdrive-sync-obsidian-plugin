import assert from "node:assert/strict";
import test from "node:test";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
import {
  validationDeviceIdentity,
  validationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";

class MemoryCheckpointStore implements HumanCheckpointStateStore {
  private value: unknown = null;
  constructor(readonly durability: "device-local" | "external-coordination" = "external-coordination") {}

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(expectedRevision: number | null, next: HumanCheckpointDurableState | null): Promise<boolean> {
    const currentRevision =
      this.value && typeof this.value === "object" && "revision" in this.value
        ? (this.value as { revision?: unknown }).revision
        : null;
    if (currentRevision !== expectedRevision) return false;
    this.value = next === null ? null : structuredClone(next);
    return true;
  }

  corrupt(value: unknown): void { this.value = value; }
  snapshot(): unknown { return this.value === null ? null : structuredClone(this.value); }
}

const runE01 = validationRunIdentity("vh13-run-e01", "E01");
const iphone = validationDeviceIdentity("iphone-installation-a", "iphone");
const ipad = validationDeviceIdentity("ipad-installation-b", "ipad");
const windows = validationDeviceIdentity("windows-installation-a", "windows-desktop");

function statusOf(result: Awaited<ReturnType<HumanCheckpointResumeController["current"]>>): string {
  return result.status;
}

test("VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition", async () => {
  const store = new MemoryCheckpointStore();
  const beforeRestart = new HumanCheckpointResumeController(store, () => new Date("2026-09-16T16:00:00.000Z"));

  const opened = await beforeRestart.begin({
    run: runE01,
    checkpointId: "e01-terminate",
    device: iphone,
    action: "terminate-obsidian",
    resumeStepId: "e01-post-restart-verify",
  });
  assert.equal(opened.status, "paused");

  const acknowledged = await beforeRestart.acknowledge(runE01, "e01-terminate");
  assert.equal(acknowledged.status, "paused");

  const afterRestart = new HumanCheckpointResumeController(store, () => new Date("2026-09-16T16:01:00.000Z"));
  const restored = await afterRestart.current();
  assert.equal(restored.status, "paused");
  if (restored.status !== "paused" || !restored.state) assert.fail("expected durable paused checkpoint");
  assert.equal(restored.state.status, "awaiting-verification");
  assert.equal(restored.state.checkpoint.requestedAction, "terminate-obsidian");

  const pending = await afterRestart.verify(runE01, "e01-terminate", iphone, {
    observe: async () => ({ status: "pending" }),
  });
  assert.deepEqual({ status: pending.status, reason: pending.status === "paused" ? pending.reason : undefined }, {
    status: "paused",
    reason: "postcondition-not-observed",
  });

  const verified = await afterRestart.verify(runE01, "e01-terminate", iphone, {
    observe: async input => {
      assert.equal(input.action, "terminate-obsidian");
      assert.equal(input.device.deviceId, iphone.deviceId);
      return { status: "verified" };
    },
  });
  assert.equal(verified.status, "resumable");

  const resumed = await afterRestart.consumeResume(runE01, "e01-terminate", iphone);
  assert.equal(resumed.status, "resumed");
  if (resumed.status !== "resumed") assert.fail("expected resume consumption");
  assert.equal(resumed.resumeStepId, "e01-post-restart-verify");
  assert.equal(statusOf(await afterRestart.current()), "empty");
});

test("VH13 permits exactly one active external action checkpoint", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  const run = validationRunIdentity("vh13-run-d05", "D05");

  const first = await controller.begin({
    run,
    checkpointId: "d05-offline",
    device: iphone,
    action: "disable-mobile-connectivity",
    resumeStepId: "d05-offline-edit",
  });
  assert.equal(first.status, "paused");

  const second = await controller.begin({
    run,
    checkpointId: "d05-reconnect",
    device: iphone,
    action: "restore-mobile-connectivity",
    resumeStepId: "d05-converge",
  });
  assert.equal(second.status, "rejected");
  if (second.status !== "rejected") assert.fail("expected checkpoint collision rejection");
  assert.equal(second.reason, "active-checkpoint-exists");

  const snapshot = store.snapshot() as HumanCheckpointDurableState;
  assert.equal(snapshot.checkpoint.checkpointId, "d05-offline");
  assert.equal(snapshot.checkpoint.requestedAction, "disable-mobile-connectivity");
});

test("VH13 rejects duplicate acknowledgement without advancing durable state twice", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  const run = validationRunIdentity("vh13-run-e06", "E06");

  await controller.begin({
    run,
    checkpointId: "e06-auth",
    device: iphone,
    action: "restore-google-authentication",
    resumeStepId: "e06-auth-recovered",
  });
  const first = await controller.acknowledge(run, "e06-auth");
  assert.equal(first.status, "paused");
  const stateAfterFirst = store.snapshot() as HumanCheckpointDurableState;

  const duplicate = await controller.acknowledge(run, "e06-auth");
  assert.equal(duplicate.status, "rejected");
  if (duplicate.status !== "rejected") assert.fail("expected duplicate acknowledgement rejection");
  assert.equal(duplicate.reason, "duplicate-acknowledgement");
  assert.deepEqual(store.snapshot(), stateAfterFirst);
});

test("VH13 mobile device switching is allowed only at an unacknowledged durable boundary", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  const run = validationRunIdentity("vh13-run-d06", "D06");

  await controller.begin({
    run,
    checkpointId: "d06-stale-wait",
    device: iphone,
    action: "establish-stale-device-condition",
    resumeStepId: "d06-return-device",
  });

  const switched = await controller.switchMobileDevice(run, "d06-stale-wait", ipad);
  assert.equal(switched.status, "paused");
  if (switched.status !== "paused" || !switched.state) assert.fail("expected switched checkpoint");
  assert.equal(switched.state.checkpoint.deviceId, ipad.deviceId);
  assert.equal(switched.state.devicePlatform, "ipad");

  const sameDevice = await controller.switchMobileDevice(run, "d06-stale-wait", ipad);
  assert.equal(sameDevice.status, "rejected");
  if (sameDevice.status !== "rejected") assert.fail("expected same-device rejection");
  assert.equal(sameDevice.reason, "device-switch-not-safe");

  const desktopSwitch = await controller.switchMobileDevice(run, "d06-stale-wait", windows);
  assert.equal(desktopSwitch.status, "rejected");

  await controller.acknowledge(run, "d06-stale-wait");
  const afterAcknowledgement = await controller.switchMobileDevice(run, "d06-stale-wait", iphone);
  assert.equal(afterAcknowledgement.status, "rejected");
  if (afterAcknowledgement.status !== "rejected") assert.fail("expected post-ack switch rejection");
  assert.equal(afterAcknowledgement.reason, "device-switch-not-safe");
});

test("VH13 ambiguity, probe failure, and timeout remain safely paused", async () => {
  let now = new Date("2026-09-16T17:00:00.000Z");
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store, () => now);
  const run = validationRunIdentity("vh13-run-d05-timeout", "D05");

  await controller.begin({
    run,
    checkpointId: "d05-reconnect",
    device: iphone,
    action: "restore-mobile-connectivity",
    resumeStepId: "d05-converge",
    timeoutMs: 1_000,
  });
  await controller.acknowledge(run, "d05-reconnect");

  const ambiguous = await controller.verify(run, "d05-reconnect", iphone, {
    observe: async () => ({ status: "ambiguous" }),
  });
  assert.equal(ambiguous.status, "paused");
  if (ambiguous.status !== "paused") assert.fail("expected ambiguous pause");
  assert.equal(ambiguous.reason, "postcondition-ambiguous");

  const failedProbe = await controller.verify(run, "d05-reconnect", iphone, {
    observe: async () => { throw new Error("network probe unavailable"); },
  });
  assert.equal(failedProbe.status, "paused");
  if (failedProbe.status !== "paused") assert.fail("expected failed-probe pause");
  assert.equal(failedProbe.reason, "postcondition-probe-failed");

  now = new Date("2026-09-16T17:00:01.000Z");
  let probeCalled = false;
  const timedOut = await controller.verify(run, "d05-reconnect", iphone, {
    observe: async () => {
      probeCalled = true;
      return { status: "verified" };
    },
  });
  assert.equal(timedOut.status, "paused");
  if (timedOut.status !== "paused") assert.fail("expected timeout pause");
  assert.equal(timedOut.reason, "verification-timeout");
  assert.equal(probeCalled, false);
  const persisted = store.snapshot() as HumanCheckpointDurableState;
  assert.equal(persisted.status, "awaiting-verification");
  assert.equal(persisted.verifiedAt, undefined);
});

test("VH13 uninstall and reinstall checkpoints require external coordination persistence", async () => {
  const run = validationRunIdentity("vh13-run-f03", "F03");
  for (const action of ["uninstall-plugin", "reinstall-plugin"] as const) {
    const local = new HumanCheckpointResumeController(new MemoryCheckpointStore("device-local"));
    const rejected = await local.begin({
      run,
      checkpointId: `f03-${action}`,
      device: iphone,
      action,
      resumeStepId: "f03-post-lifecycle",
    });
    assert.equal(rejected.status, "rejected");
    if (rejected.status !== "rejected") assert.fail("expected external persistence requirement");
    assert.equal(rejected.reason, "external-persistence-required");

    const externalStore = new MemoryCheckpointStore("external-coordination");
    const external = new HumanCheckpointResumeController(externalStore);
    const accepted = await external.begin({
      run,
      checkpointId: `f03-${action}`,
      device: iphone,
      action,
      resumeStepId: "f03-post-lifecycle",
    });
    assert.equal(accepted.status, "paused");
  }
});

test("VH13 persisted records contain only fixed non-secret checkpoint/run metadata", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  const run = validationRunIdentity("vh13-run-f03-privacy", "F03");

  await controller.begin({
    run,
    checkpointId: "f03-disable",
    device: iphone,
    action: "disable-plugin",
    resumeStepId: "f03-after-disable",
  });
  await controller.acknowledge(run, "f03-disable");

  const serialized = JSON.stringify(store.snapshot());
  assert.doesNotMatch(serialized, /access[_-]?token|refresh[_-]?token|client[_-]?secret|privateContent|noteContent/i);

  const persisted = store.snapshot() as HumanCheckpointDurableState;
  assert.deepEqual(Object.keys(persisted).sort(), [
    "acknowledgedAt",
    "checkpoint",
    "createdAt",
    "devicePlatform",
    "resumeStepId",
    "revision",
    "schemaVersion",
    "status",
  ]);
  assert.deepEqual(Object.keys(persisted.checkpoint).sort(), [
    "checkpointId",
    "deviceId",
    "instruction",
    "requestedAction",
    "run",
  ]);
});

test("VH13 corrupted durable checkpoint state is never treated as empty or resumable", async () => {
  const store = new MemoryCheckpointStore();
  store.corrupt({
    schemaVersion: 1,
    revision: 3,
    status: "resumable",
    checkpoint: { requestedAction: "restore-google-authentication" },
  });
  const controller = new HumanCheckpointResumeController(store);
  const current = await controller.current();
  assert.equal(current.status, "paused");
  if (current.status !== "paused") assert.fail("expected fail-closed pause");
  assert.equal(current.reason, "persisted-state-invalid");
});

test("VH13 concurrent stale writes fail closed through revision CAS", async () => {
  class RacingStore extends MemoryCheckpointStore {
    failNextWrite = false;
    override async compareAndSet(expectedRevision: number | null, next: HumanCheckpointDurableState | null): Promise<boolean> {
      if (this.failNextWrite) {
        this.failNextWrite = false;
        return false;
      }
      return super.compareAndSet(expectedRevision, next);
    }
  }

  const store = new RacingStore();
  const controller = new HumanCheckpointResumeController(store);
  const run = validationRunIdentity("vh13-run-race", "D05");
  await controller.begin({
    run,
    checkpointId: "d05-race",
    device: iphone,
    action: "disable-mobile-connectivity",
    resumeStepId: "d05-race-resume",
  });

  store.failNextWrite = true;
  const result = await controller.acknowledge(run, "d05-race");
  assert.equal(result.status, "paused");
  if (result.status !== "paused") assert.fail("expected fail-closed CAS pause");
  assert.equal(result.reason, "state-changed");
  assert.equal((store.snapshot() as HumanCheckpointDurableState).status, "awaiting-human-action");
});
