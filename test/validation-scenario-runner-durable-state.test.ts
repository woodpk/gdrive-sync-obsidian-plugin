import assert from "node:assert/strict";
import test from "node:test";
import {
  HumanCheckpointResumeController,
  type HumanCheckpointDurableState,
  type HumanCheckpointStateStore,
} from "../src/validation/human-checkpoint-resume-controller";
import {
  VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
  type ValidationRunnerPersistentState,
  type ValidationRunnerStateStore,
} from "../src/validation/scenario-runner-contracts";
import {
  VALIDATION_RUNNER_RESUME_ADOPTION_SCHEMA_VERSION,
  ValidationRunnerDurableStateController,
  ValidationRunnerPersistedStateError,
  reconstructValidationRunnerResumeAdoptions,
  reconstructValidationRunnerState,
  type ValidationRunnerResumeAdoptionJournal,
  type ValidationRunnerResumeAdoptionStore,
} from "../src/validation/scenario-runner-durable-state";
import {
  humanCheckpoint,
  validationDeviceIdentity,
  validationRunIdentity,
  validationStepId,
} from "../src/validation/run-sandbox-checkpoint-contracts";

class MemoryRunnerStore implements ValidationRunnerStateStore {
  value: unknown = null;
  writes = 0;
  failNextWrite = false;
  readonly events: string[];

  constructor(initial: unknown = null, events: string[] = []) {
    this.value = structuredClone(initial);
    this.events = events;
  }

  async load(): Promise<unknown> {
    return structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerPersistentState | null,
  ): Promise<boolean> {
    const current = this.value as { readonly revision?: unknown } | null;
    const actualRevision = current?.revision ?? null;
    if (actualRevision !== expectedRevision) return false;
    if (this.failNextWrite) {
      this.failNextWrite = false;
      return false;
    }
    const previousLifecycle = (this.value as { readonly lifecycle?: { readonly kind?: unknown } } | null)?.lifecycle;
    if (previousLifecycle?.kind === "resumable" && next?.lifecycle.kind === "running") {
      this.events.push("runner-state-adopted");
    }
    this.value = structuredClone(next);
    this.writes += 1;
    return true;
  }
}

class MemoryAdoptionStore implements ValidationRunnerResumeAdoptionStore {
  value: unknown = null;
  writes = 0;
  failWrites = false;
  readonly events: string[];

  constructor(events: string[] = []) {
    this.events = events;
  }

  async load(): Promise<unknown> {
    return structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: ValidationRunnerResumeAdoptionJournal,
  ): Promise<boolean> {
    const current = this.value as { readonly revision?: unknown } | null;
    if ((current?.revision ?? null) !== expectedRevision || this.failWrites) return false;
    this.events.push("runner-adoption");
    this.value = structuredClone(next);
    this.writes += 1;
    return true;
  }
}

class MemoryCheckpointStore implements HumanCheckpointStateStore {
  readonly durability = "external-coordination" as const;
  value: unknown = null;
  failNextCleanup = false;
  readonly events: string[];

  constructor(events: string[] = []) {
    this.events = events;
  }

  async load(): Promise<unknown> {
    return structuredClone(this.value);
  }

  async compareAndSet(
    expectedRevision: number | null,
    next: HumanCheckpointDurableState | null,
  ): Promise<boolean> {
    const current = this.value as { readonly revision?: unknown } | null;
    if ((current?.revision ?? null) !== expectedRevision) return false;
    if (next === null && this.failNextCleanup) {
      this.failNextCleanup = false;
      this.events.push("checkpoint-cleanup-interrupted");
      return false;
    }
    if (next === null) this.events.push("checkpoint-cleanup");
    this.value = structuredClone(next);
    return true;
  }
}

const run = validationRunIdentity("vh14-c-run", "D05");
const resumeStepId = validationStepId("d05-after-reconnect");
const checkpoint = humanCheckpoint({
  checkpointId: "d05-reconnect",
  run,
  deviceId: "iphone-c",
  requestedAction: "restore-mobile-connectivity",
  instruction: "Restore mobile network connectivity for the selected validation device, then acknowledge this checkpoint.",
});

function resumableState(revision = 3): ValidationRunnerPersistentState {
  return {
    schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
    revision,
    run,
    execution: {
      kind: "suite",
      suiteId: "vh14-c-suite",
      scenarioIds: ["C03", "D05", "F03"],
      currentScenarioIndex: 1,
    },
    lifecycle: {
      kind: "resumable",
      resume: {
        state: "resumable",
        checkpoint,
        acknowledgement: "Operator restored connectivity.",
        verification: "Independent observation verified connectivity.",
        resumeStepId,
      },
    },
    currentStep: { scenarioId: "D05", stepId: resumeStepId, stepIndex: 4 },
    completedStepIds: [validationStepId("d05-offline-edit")],
    completedScenarioIds: ["C03"],
    proofs: { verificationPassed: false, evidenceRecorded: false },
  };
}

function pendingState(): ValidationRunnerPersistentState {
  return {
    schemaVersion: VALIDATION_RUNNER_STATE_SCHEMA_VERSION,
    revision: 1,
    run,
    execution: { kind: "single", scenarioId: "D05" },
    lifecycle: { kind: "pending" },
    currentStep: { scenarioId: "D05", stepId: validationStepId("d05-first-step"), stepIndex: 0 },
    completedStepIds: [],
    completedScenarioIds: [],
    proofs: { verificationPassed: false, evidenceRecorded: false },
  };
}

function durable(
  runnerStore = new MemoryRunnerStore(resumableState()),
  adoptionStore = new MemoryAdoptionStore(),
): ValidationRunnerDurableStateController {
  return new ValidationRunnerDurableStateController(runnerStore, adoptionStore);
}

test("VH14-C reconstructs exact run/suite/step state after controller restart", async () => {
  const runnerStore = new MemoryRunnerStore(resumableState());
  const first = durable(runnerStore);
  const reconstructed = await first.reconstruct({
    run,
    execution: resumableState().execution,
  });
  assert.deepEqual(reconstructed, resumableState());

  const restarted = durable(runnerStore);
  const afterRestart = await restarted.load();
  assert.equal(afterRestart?.run.runId, run.runId);
  assert.equal(afterRestart?.run.scenarioId, "D05");
  assert.equal(afterRestart?.execution.kind, "suite");
  if (afterRestart?.execution.kind !== "suite") throw new Error("expected suite reconstruction");
  assert.equal(afterRestart.execution.currentScenarioIndex, 1);
  assert.equal(afterRestart.currentStep?.stepId, resumeStepId);
  assert.equal(afterRestart.lifecycle.kind, "resumable");
});

test("VH14-C rejects malformed and identity-mismatched persistence instead of treating it as empty", async () => {
  const malformed = { ...resumableState(), currentStep: { scenarioId: "C03", stepId: resumeStepId, stepIndex: 4 } };
  assert.throws(
    () => reconstructValidationRunnerState(malformed),
    (error: unknown) => error instanceof ValidationRunnerPersistedStateError
      && error.reason === "persisted-state-mismatch",
  );
  assert.throws(
    () => reconstructValidationRunnerState({ schemaVersion: 1, revision: 1 }),
    (error: unknown) => error instanceof ValidationRunnerPersistedStateError
      && error.reason === "persisted-state-invalid",
  );

  await assert.rejects(
    durable(new MemoryRunnerStore(resumableState())).reconstruct({
      run: validationRunIdentity("different-run", "D05"),
    }),
    (error: unknown) => error instanceof ValidationRunnerPersistedStateError
      && error.reason === "persisted-state-mismatch",
  );
});

test("VH14-C validates monotonic revisions and preserves CAS stale-write protection", async () => {
  const runnerStore = new MemoryRunnerStore(resumableState());
  const controller = durable(runnerStore);
  const next = { ...resumableState(), revision: 4 };
  assert.equal(await controller.compareAndSet(2, next), false, "stale writer must lose");
  assert.equal(runnerStore.writes, 0);
  assert.equal(await controller.compareAndSet(3, next), true);
  assert.equal((await controller.load())?.revision, 4);
  await assert.rejects(
    controller.compareAndSet(4, { ...next, revision: 6 }),
    /Next runner revision must be 5/,
  );
});

test("VH14-C accepts Package B's pending cursor and exact pending-to-running start writes", async () => {
  const runnerStore = new MemoryRunnerStore();
  const controller = durable(runnerStore);
  const pending = pendingState();
  assert.equal(await controller.compareAndSet(null, pending), true);
  assert.deepEqual(await controller.load(), pending);

  const running: ValidationRunnerPersistentState = {
    ...pending,
    revision: 2,
    lifecycle: { kind: "running", stepId: pending.currentStep!.stepId },
  };
  assert.equal(await controller.compareAndSet(1, running), true);
  assert.deepEqual(await controller.load(), running);
});

test("VH14-C durably adopts the exact VH13 tuple once and reconstructs the adoption journal", async () => {
  const adoptionStore = new MemoryAdoptionStore();
  const controller = durable(new MemoryRunnerStore(resumableState()), adoptionStore);
  const input = { run, checkpointId: checkpoint.checkpointId, resumeStepId };

  await controller.commitResume(input);
  await controller.commitResume(input);
  assert.equal(adoptionStore.writes, 1, "identical retry must be a durable no-op");
  const adopted = await controller.load();
  assert.equal(adopted?.revision, 4);
  assert.deepEqual(adopted?.lifecycle, { kind: "running", stepId: resumeStepId });
  assert.deepEqual(await controller.reconstructResumeAdoptions(), {
    schemaVersion: VALIDATION_RUNNER_RESUME_ADOPTION_SCHEMA_VERSION,
    revision: 1,
    entries: [input],
  });

  const recoveredRunnerStore = new MemoryRunnerStore(resumableState());
  const restarted = durable(recoveredRunnerStore, adoptionStore);
  await restarted.commitResume(input);
  assert.equal(adoptionStore.writes, 1, "restart must retain idempotent adoption authority");
  assert.equal((await restarted.load())?.lifecycle.kind, "running");
});

test("VH14-C invokes durable adoption before VH13 cleanup and safely retries interrupted cleanup", async () => {
  const events: string[] = [];
  const checkpointStore = new MemoryCheckpointStore(events);
  const vh13 = new HumanCheckpointResumeController(checkpointStore, () => new Date("2026-09-17T12:00:00.000Z"));
  const device = validationDeviceIdentity("iphone-c", "iphone");
  await vh13.begin({
    run,
    checkpointId: String(checkpoint.checkpointId),
    device,
    action: checkpoint.requestedAction,
    resumeStepId: String(resumeStepId),
  });
  await vh13.acknowledge(run, String(checkpoint.checkpointId));
  const verified = await vh13.verify(run, String(checkpoint.checkpointId), device, {
    observe: async () => ({ status: "verified" }),
  });
  assert.equal(verified.status, "resumable");

  const adoptionStore = new MemoryAdoptionStore(events);
  const runnerStore = new MemoryRunnerStore(resumableState(), events);
  const controller = durable(runnerStore, adoptionStore);
  checkpointStore.failNextCleanup = true;
  const interrupted = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, controller);
  assert.equal(interrupted.status, "paused");
  if (interrupted.status !== "paused") throw new Error("expected interrupted cleanup pause");
  assert.equal(interrupted.reason, "state-changed");
  assert.deepEqual(events, ["runner-adoption", "runner-state-adopted", "checkpoint-cleanup-interrupted"]);
  assert.deepEqual((await controller.load())?.lifecycle, { kind: "running", stepId: resumeStepId });

  const restarted = durable(runnerStore, adoptionStore);
  const retried = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, restarted);
  assert.equal(retried.status, "resumed");
  assert.deepEqual(events, [
    "runner-adoption",
    "runner-state-adopted",
    "checkpoint-cleanup-interrupted",
    "checkpoint-cleanup",
  ]);
  assert.equal(adoptionStore.writes, 1);
  assert.equal(await checkpointStore.load(), null);
});

test("VH14-C cleanup success followed by process loss reconstructs the already-running resume step", async () => {
  const checkpointStore = new MemoryCheckpointStore();
  const vh13 = new HumanCheckpointResumeController(checkpointStore, () => new Date("2026-09-17T12:00:00.000Z"));
  const device = validationDeviceIdentity("iphone-c", "iphone");
  await vh13.begin({
    run,
    checkpointId: String(checkpoint.checkpointId),
    device,
    action: checkpoint.requestedAction,
    resumeStepId: String(resumeStepId),
  });
  await vh13.acknowledge(run, String(checkpoint.checkpointId));
  await vh13.verify(run, String(checkpoint.checkpointId), device, {
    observe: async () => ({ status: "verified" }),
  });

  const runnerStore = new MemoryRunnerStore(resumableState());
  const adoptionStore = new MemoryAdoptionStore();
  const beforeCrash = durable(runnerStore, adoptionStore);
  const consumed = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, beforeCrash);
  assert.equal(consumed.status, "resumed");
  assert.equal(await checkpointStore.load(), null, "VH13 cleanup completed");

  // A new controller has no process memory from consumeResume. Git/runtime
  // orchestration can recover solely from the two durable stores.
  const afterCrash = durable(runnerStore, adoptionStore);
  const reconstructed = await afterCrash.reconstruct({ run });
  assert.equal(reconstructed?.revision, 4);
  assert.deepEqual(reconstructed?.currentStep, {
    scenarioId: "D05",
    stepId: resumeStepId,
    stepIndex: 4,
  });
  assert.deepEqual(reconstructed?.lifecycle, { kind: "running", stepId: resumeStepId });
  assert.deepEqual((await afterCrash.reconstructResumeAdoptions())?.entries, [{
    run,
    checkpointId: checkpoint.checkpointId,
    resumeStepId,
  }]);
});

test("VH14-C adoption failure or tuple mismatch leaves the VH13 checkpoint intact", async () => {
  const checkpointStore = new MemoryCheckpointStore();
  const vh13 = new HumanCheckpointResumeController(checkpointStore, () => new Date("2026-09-17T12:00:00.000Z"));
  const device = validationDeviceIdentity("iphone-c", "iphone");
  await vh13.begin({
    run,
    checkpointId: String(checkpoint.checkpointId),
    device,
    action: checkpoint.requestedAction,
    resumeStepId: String(resumeStepId),
  });
  await vh13.acknowledge(run, String(checkpoint.checkpointId));
  await vh13.verify(run, String(checkpoint.checkpointId), device, {
    observe: async () => ({ status: "verified" }),
  });

  const adoptionStore = new MemoryAdoptionStore();
  adoptionStore.failWrites = true;
  const controller = durable(new MemoryRunnerStore(resumableState()), adoptionStore);
  const failed = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, controller);
  assert.equal(failed.status, "paused");
  if (failed.status !== "paused") throw new Error("expected adoption failure pause");
  assert.equal(failed.reason, "resume-adoption-failed");
  assert.notEqual(await checkpointStore.load(), null);

  await assert.rejects(
    controller.commitResume({
      run,
      checkpointId: checkpoint.checkpointId,
      resumeStepId: validationStepId("wrong-resume-step"),
    }),
    (error: unknown) => error instanceof ValidationRunnerPersistedStateError
      && error.reason === "persisted-state-mismatch",
  );
  assert.equal(adoptionStore.writes, 0);
});

test("VH14-C runner-CAS interruption after tuple journaling retains checkpoint and is retryable", async () => {
  const checkpointStore = new MemoryCheckpointStore();
  const vh13 = new HumanCheckpointResumeController(checkpointStore, () => new Date("2026-09-17T12:00:00.000Z"));
  const device = validationDeviceIdentity("iphone-c", "iphone");
  await vh13.begin({
    run,
    checkpointId: String(checkpoint.checkpointId),
    device,
    action: checkpoint.requestedAction,
    resumeStepId: String(resumeStepId),
  });
  await vh13.acknowledge(run, String(checkpoint.checkpointId));
  await vh13.verify(run, String(checkpoint.checkpointId), device, {
    observe: async () => ({ status: "verified" }),
  });

  const runnerStore = new MemoryRunnerStore(resumableState());
  runnerStore.failNextWrite = true;
  const adoptionStore = new MemoryAdoptionStore();
  const controller = durable(runnerStore, adoptionStore);
  const interrupted = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, controller);
  assert.equal(interrupted.status, "paused");
  if (interrupted.status !== "paused") throw new Error("expected adoption interruption pause");
  assert.equal(interrupted.reason, "resume-adoption-failed");
  assert.equal((await controller.load())?.lifecycle.kind, "resumable");
  assert.equal((await controller.reconstructResumeAdoptions())?.entries.length, 1);
  assert.notEqual(await checkpointStore.load(), null);

  const restarted = durable(runnerStore, adoptionStore);
  const retried = await vh13.consumeResume(run, String(checkpoint.checkpointId), device, restarted);
  assert.equal(retried.status, "resumed");
  assert.equal((await restarted.load())?.lifecycle.kind, "running");
  assert.equal(adoptionStore.writes, 1);
  assert.equal(await checkpointStore.load(), null);
});

test("VH14-C fails closed on a malformed adoption journal", async () => {
  assert.throws(
    () => reconstructValidationRunnerResumeAdoptions({
      schemaVersion: VALIDATION_RUNNER_RESUME_ADOPTION_SCHEMA_VERSION,
      revision: 1,
      entries: [{ run, checkpointId: "", resumeStepId }],
    }),
    (error: unknown) => error instanceof ValidationRunnerPersistedStateError
      && error.reason === "persisted-state-invalid",
  );
});
