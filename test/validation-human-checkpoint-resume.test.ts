import assert from "node:assert/strict";
import test from "node:test";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointResumeCommitPort,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
import {
  validationDeviceIdentity,
  validationRunIdentity,
  type HumanCheckpointAction,
  type ValidationDeviceIdentity,
  type ValidationRunIdentity,
} from "../src/validation/run-sandbox-checkpoint-contracts";

class MemoryCheckpointStore implements HumanCheckpointStateStore {
  private value: unknown = null;
  failNextWrite = false;

  constructor(readonly durability: "device-local" | "external-coordination" = "external-coordination") {}

  async load(): Promise<unknown> {
    return this.value === null ? null : structuredClone(this.value);
  }

  async compareAndSet(expectedRevision: number | null, next: HumanCheckpointDurableState | null): Promise<boolean> {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      return false;
    }
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

class IdempotentResumeCommitPort implements HumanCheckpointResumeCommitPort {
  readonly attempts: string[] = [];
  readonly committed = new Set<string>();
  fail = false;

  async commitResume(input: Parameters<HumanCheckpointResumeCommitPort["commitResume"]>[0]): Promise<void> {
    const key = `${String(input.run.runId)}|${input.run.scenarioId}|${String(input.checkpointId)}|${String(input.resumeStepId)}`;
    this.attempts.push(key);
    if (this.fail) throw new Error("resume adoption failed");
    this.committed.add(key);
  }
}

const runE01 = validationRunIdentity("vh13-run-e01", "E01");
const iphone = validationDeviceIdentity("iphone-installation-a", "iphone");
const ipad = validationDeviceIdentity("ipad-installation-b", "ipad");
const windows = validationDeviceIdentity("windows-installation-a", "windows-desktop");

function statusOf(result: Awaited<ReturnType<HumanCheckpointResumeController["current"]>>): string {
  return result.status;
}

async function prepareResumable(input: {
  readonly controller: HumanCheckpointResumeController;
  readonly run: ValidationRunIdentity;
  readonly checkpointId: string;
  readonly device: ValidationDeviceIdentity;
  readonly action: HumanCheckpointAction;
  readonly resumeStepId: string;
}): Promise<HumanCheckpointDurableState> {
  const opened = await input.controller.begin(input);
  assert.equal(opened.status, "paused");
  const acknowledged = await input.controller.acknowledge(input.run, input.checkpointId);
  assert.equal(acknowledged.status, "paused");
  const verified = await input.controller.verify(input.run, input.checkpointId, input.device, {
    observe: async () => ({ status: "verified" }),
  });
  assert.equal(verified.status, "resumable");
  if (verified.status !== "resumable") throw new Error("expected resumable checkpoint");
  return verified.state;
}

test("VH13 restart-safe resume reloads one durable checkpoint and resumes only after observed postcondition and durable adoption", async () => {
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
  if (restored.status !== "paused" || !restored.state) throw new Error("expected durable paused checkpoint");
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

  const commit = new IdempotentResumeCommitPort();
  const resumed = await afterRestart.consumeResume(runE01, "e01-terminate", iphone, commit);
  assert.equal(resumed.status, "resumed");
  if (resumed.status !== "resumed") throw new Error("expected resume consumption");
  assert.equal(resumed.resumeStepId, "e01-post-restart-verify");
  assert.equal(commit.committed.size, 1);
  assert.equal(statusOf(await afterRestart.current()), "empty");
});

test("VH13 verified checkpoint remains durable until resume adoption actually succeeds", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  const state = await prepareResumable({
    controller,
    run: runE01,
    checkpointId: "e01-adoption-order",
    device: iphone,
    action: "restart-obsidian",
    resumeStepId: "e01-after-restart",
  });

  let enterCommit!: () => void;
  let releaseCommit!: () => void;
  const entered = new Promise<void>(resolve => { enterCommit = resolve; });
  const release = new Promise<void>(resolve => { releaseCommit = resolve; });
  const commit: HumanCheckpointResumeCommitPort = {
    commitResume: async input => {
      assert.equal(input.resumeStepId, state.resumeStepId);
      enterCommit();
      await release;
    },
  };

  const consuming = controller.consumeResume(runE01, "e01-adoption-order", iphone, commit);
  await entered;
  const whileAdopting = store.snapshot() as HumanCheckpointDurableState;
  assert.equal(whileAdopting.status, "resumable");
  assert.equal(whileAdopting.checkpoint.checkpointId, "e01-adoption-order");

  releaseCommit();
  const result = await consuming;
  assert.equal(result.status, "resumed");
  assert.equal(store.snapshot(), null);
});

test("VH13 resume-adoption failure leaves the verified checkpoint durably resumable", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  await prepareResumable({
    controller,
    run: runE01,
    checkpointId: "e01-adoption-failure",
    device: iphone,
    action: "restart-obsidian",
    resumeStepId: "e01-after-adoption-failure",
  });
  const before = store.snapshot();
  const commit = new IdempotentResumeCommitPort();
  commit.fail = true;

  const result = await controller.consumeResume(runE01, "e01-adoption-failure", iphone, commit);
  assert.equal(result.status, "paused");
  if (result.status !== "paused") throw new Error("expected failed adoption pause");
  assert.equal(result.reason, "resume-adoption-failed");
  assert.deepEqual(store.snapshot(), before);
  const current = await controller.current();
  assert.equal(current.status, "resumable");
});

test("VH13 adoption followed by interrupted checkpoint cleanup is restart-safe and idempotently retryable", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  await prepareResumable({
    controller,
    run: runE01,
    checkpointId: "e01-cleanup-interruption",
    device: iphone,
    action: "restart-obsidian",
    resumeStepId: "e01-after-cleanup-interruption",
  });

  const commit = new IdempotentResumeCommitPort();
  store.failNextWrite = true;
  const interrupted = await controller.consumeResume(runE01, "e01-cleanup-interruption", iphone, commit);
  assert.equal(interrupted.status, "paused");
  if (interrupted.status !== "paused") throw new Error("expected cleanup CAS interruption pause");
  assert.equal(interrupted.reason, "state-changed");
  assert.equal(commit.attempts.length, 1);
  assert.equal(commit.committed.size, 1);
  assert.equal((store.snapshot() as HumanCheckpointDurableState).status, "resumable");

  const afterRestart = new HumanCheckpointResumeController(store);
  const restored = await afterRestart.current();
  assert.equal(restored.status, "resumable");

  const retried = await afterRestart.consumeResume(runE01, "e01-cleanup-interruption", iphone, commit);
  assert.equal(retried.status, "resumed");
  assert.equal(commit.attempts.length, 2);
  assert.equal(commit.committed.size, 1, "idempotent adoption must represent one durable resume identity");
  assert.equal(statusOf(await afterRestart.current()), "empty");
});

test("VH13 wrong run, checkpoint, or device cannot invoke resume adoption", async () => {
  const store = new MemoryCheckpointStore();
  const controller = new HumanCheckpointResumeController(store);
  await prepareResumable({
    controller,
    run: runE01,
    checkpointId: "e01-identity-guard",
    device: iphone,
    action: "restart-obsidian",
    resumeStepId: "e01-after-identity-guard",
  });
  const commit = new IdempotentResumeCommitPort();

  const wrongRun = await controller.consumeResume(
    validationRunIdentity("vh13-run-e01-other", "E01"),
    "e01-identity-guard",
    iphone,
    commit,
  );
  assert.equal(wrongRun.status, "rejected");
  if (wrongRun.status !== "rejected") throw new Error("expected run mismatch rejection");
  assert.equal(wrongRun.reason, "run-mismatch");

  const wrongCheckpoint = await controller.consumeResume(runE01, "e01-other-checkpoint", iphone, commit);
  assert.equal(wrongCheckpoint.status, "rejected");
  if (wrongCheckpoint.status !== "rejected") throw new Error("expected checkpoint mismatch rejection");
  assert.equal(wrongCheckpoint.reason, "checkpoint-mismatch");

  const wrongDevice = await controller.consumeResume(runE01, "e01-identity-guard", ipad, commit);
  assert.equal(wrongDevice.status, "rejected");
  if (wrongDevice.status !== "rejected") throw new Error("expected device mismatch rejection");
  assert.equal(wrongDevice.reason, "device-mismatch");

  assert.equal(commit.attempts.length, 0);
  assert.equal((store.snapshot() as HumanCheckpointDurableState).status, "resumable");
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
  if (second.status !== "rejected") throw new Error("expected checkpoint collision rejection");
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
  if (duplicate.status !== "rejected") throw new Error("expected duplicate acknowledgement rejection");
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
  if (switched.status !== "paused" || !switched.state) throw new Error("expected switched checkpoint");
  assert.equal(switched.state.checkpoint.deviceId, ipad.deviceId);
  assert.equal(switched.state.devicePlatform, "ipad");

  const sameDevice = await controller.switchMobileDevice(run, "d06-stale-wait", ipad);
  assert.equal(sameDevice.status, "rejected");
  if (sameDevice.status !== "rejected") throw new Error("expected same-device rejection");
  assert.equal(sameDevice.reason, "device-switch-not-safe");

  const desktopSwitch = await controller.switchMobileDevice(run, "d06-stale-wait", windows);
  assert.equal(desktopSwitch.status, "rejected");

  await controller.acknowledge(run, "d06-stale-wait");
  const afterAcknowledgement = await controller.switchMobileDevice(run, "d06-stale-wait", iphone);
  assert.equal(afterAcknowledgement.status, "rejected");
  if (afterAcknowledgement.status !== "rejected") throw new Error("expected post-ack switch rejection");
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
  if (ambiguous.status !== "paused") throw new Error("expected ambiguous pause");
  assert.equal(ambiguous.reason, "postcondition-ambiguous");

  const failedProbe = await controller.verify(run, "d05-reconnect", iphone, {
    observe: async () => { throw new Error("network probe unavailable"); },
  });
  assert.equal(failedProbe.status, "paused");
  if (failedProbe.status !== "paused") throw new Error("expected failed-probe pause");
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
  if (timedOut.status !== "paused") throw new Error("expected timeout pause");
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
    if (rejected.status !== "rejected") throw new Error("expected external persistence requirement");
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
  if (current.status !== "paused") throw new Error("expected fail-closed pause");
  assert.equal(current.reason, "persisted-state-invalid");
});

test("VH13 concurrent stale writes fail closed through revision CAS", async () => {
  const store = new MemoryCheckpointStore();
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
  if (result.status !== "paused") throw new Error("expected fail-closed CAS pause");
  assert.equal(result.reason, "state-changed");
  assert.equal((store.snapshot() as HumanCheckpointDurableState).status, "awaiting-human-action");
});
