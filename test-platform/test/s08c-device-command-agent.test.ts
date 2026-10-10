import { deepEqual, equal, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";

import type { ProductionVerificationControl } from "../../src/product/live-validation-control-seam";
import {
  createBoundedDeviceCommandAgent,
  type DeviceCommand,
  type DeviceCommandResult,
  type DeviceFixturePort,
  type DeviceSequenceState,
  type DeviceSequenceStateStore,
} from "../src/live-device/device-command-agent";

const runId = "run-001";
const deviceId = "device-win";
const validationBuild = { schemaVersion: 1 as const, sourceCommit: "a".repeat(40) };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemorySequenceStore implements DeviceSequenceStateStore {
  state?: DeviceSequenceState;
  async load(): Promise<DeviceSequenceState | undefined> { return this.state ? clone(this.state) : undefined; }
  async compareAndSave(_runId:string,_deviceId:string,expected:DeviceSequenceState|undefined,next:DeviceSequenceState):Promise<boolean>{if(JSON.stringify(this.state)!==JSON.stringify(expected))return false;this.state=clone(next);return true;}
}

class FailFinalizationStore extends MemorySequenceStore {
  saves = 0;
  override async compareAndSave(run:string,device:string,expected:DeviceSequenceState|undefined,next:DeviceSequenceState):Promise<boolean>{this.saves+=1;if(this.saves===2)throw new Error("simulated completion persistence failure");return super.compareAndSave(run,device,expected,next);}
}

function fixtureHarness() {
  const files = new Map<string, { sizeBytes: number; sha256: string }>();
  const calls: string[] = [];
  const sha = "a".repeat(64);
  const port: DeviceFixturePort = {
    async putText(path, text) { calls.push("text:" + path); files.set(path, { sizeBytes: text.length, sha256: sha }); },
    async putPattern(path, byteLength, seed) { calls.push("pattern:" + path + ":" + seed); files.set(path, { sizeBytes: byteLength, sha256: sha }); },
    async remove(path) { calls.push("remove:" + path); files.delete(path); },
    async observe(path) { calls.push("observe:" + path); const value = files.get(path); return value ? { exists: true, ...value } : { exists: false }; },
  };
  return { port, calls };
}

function command(sequence: number, body: any): DeviceCommand {
  return {
    runId,
    deviceId,
    sequence,
    commandId: body.commandId ?? "cmd-" + sequence,
    ...body,
  } as DeviceCommand;
}

function productionHarness(term: "complete" | "uncertain" = "complete") {
  let receipt: any;
  const actions: string[] = [];
  const manualPlan: any = {
    planId: "plan-manual",
    trigger: "manual",
    operations: [{ operationId: "op-1", kind: "upload-create" }],
    executionDisposition: "requires-user-approval",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  };
  const verifyPlan: any = { ...manualPlan, planId: "plan-verify", trigger: "verify-reconcile" };
  const control: ProductionVerificationControl = {
    async previewManual() { return manualPlan; },
    async previewVerifyReconcile() { return verifyPlan; },
    async executePlan(planId) {
      actions.push("execute:" + String(planId));
      receipt = {
        runId: "product-run-" + actions.length,
        trigger: "manual",
        planId,
        terminal: term,
        requiredEffectsCommittedAndVerified: term === "complete",
        committedOperationCount: term === "complete" ? 1 : 0,
        skippedOperationCount: 0,
      };
      return { status: "accepted" };
    },
    async pause() { actions.push("pause"); return { status: "accepted" }; },
    async resume() { actions.push("resume"); return { status: "accepted" }; },
    async cancelActiveSync() { actions.push("cancel"); return { status: "accepted" }; },
    currentStatus() { return { kind: "idle-ready" }; },
    latestProductionRunReceipt() { return receipt; },
  };
  return { control, actions, manualPlan, verifyPlan, get receipt() { return receipt; } };
}

test("run/device/sequence safety executes one fixture command once and replays exact duplicate", async () => {
  const fixtures = fixtureHarness();
  const store = new MemorySequenceStore();
  const agent = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port, sequenceState: store,
  });
  const put = command(1, { kind: "fixture-put", path: "note.md", content: { type: "text", text: "hello" } });
  const first = await agent.execute(put);
  equal(first.status, "completed");
  equal(first.classification, "fixture-verified");
  equal(first.fixture?.exists, true);
  const callsAfterFirst = fixtures.calls.length;

  const duplicate = await agent.execute(clone(put));
  equal(duplicate.replayed, true);
  equal(fixtures.calls.length, callsAfterFirst);

  const altered = await agent.execute({ ...put, content: { type: "text", text: "changed" } });
  equal(altered.classification, "sequence-conflict");
  equal(fixtures.calls.length, callsAfterFirst);

  const gap = await agent.execute(command(3, { kind: "observe-file", path: "note.md" }));
  equal(gap.classification, "sequence-gap");

  const wrongRun = await agent.execute({ ...command(2, { kind: "observe-file", path: "note.md" }), runId: "other-run" });
  equal(wrongRun.classification, "run-mismatch");
  const wrongDevice = await agent.execute({ ...command(2, { kind: "observe-file", path: "note.md" }), deviceId: "other-device" });
  equal(wrongDevice.classification, "device-mismatch");
  equal(fixtures.calls.length, callsAfterFirst);

  const observed = await agent.execute(command(2, { kind: "observe-file", path: "note.md" }));
  equal(observed.classification, "fixture-observed");
  const callsAfterSecond = fixtures.calls.length;
  const stale = await agent.execute(command(1, { kind: "observe-file", path: "note.md", commandId: "old-different-command" }));
  equal(stale.classification, "stale-sequence");
  equal(fixtures.calls.length, callsAfterSecond);

  const removed = await agent.execute(command(3, { kind: "fixture-remove", path: "note.md" }));
  equal(removed.classification, "fixture-removal-verified");
  equal(removed.fixture?.exists, false);
});

test("write-ahead claim prevents ambiguous command replay across agent reconstruction", async () => {
  const fixtures = fixtureHarness();
  const store = new FailFinalizationStore();
  const options = { runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", validationBuild, fixtures: fixtures.port, sequenceState: store };
  const put = command(1, { kind: "fixture-put", path: "uncertain.md", content: { type: "text", text: "once" } });
  const first = await createBoundedDeviceCommandAgent(options).execute(put);
  equal(first.classification, "sequence-state-finalization-failed");
  const writes = fixtures.calls.filter(value => value.startsWith("text:")).length;
  equal(store.state?.phase, "claimed");

  const restarted = createBoundedDeviceCommandAgent(options);
  const duplicate = await restarted.execute(put);
  equal(duplicate.classification, "prior-outcome-uncertain");
  equal(fixtures.calls.filter(value => value.startsWith("text:")).length, writes);
});

test("malformed input, fixture escape, and bounded fixture sizes fail closed before mutation", async () => {
  const fixtures = fixtureHarness();
  const agent = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port,
    sequenceState: new MemorySequenceStore(), maxInlineTextChars: 5, maxPatternBytes: 16,
  });
  equal((await agent.execute({ nope: true })).classification, "invalid-command");
  equal((await agent.execute({ runId, deviceId, sequence: 1, commandId: "unsupported", kind: "unsupported-command" })).classification, "invalid-command");
  equal((await agent.execute(command(1, { kind: "fixture-put", path: "../escape.md", content: { type: "text", text: "x" } }))).classification, "fixture-path-out-of-scope");
  equal(fixtures.calls.length, 0);

  const fresh = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port,
    sequenceState: new MemorySequenceStore(), maxInlineTextChars: 5, maxPatternBytes: 16,
  });
  equal((await fresh.execute(command(1, { kind: "fixture-put", path: "large.md", content: { type: "text", text: "123456" } }))).classification, "fixture-content-too-large");

  const pattern = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port,
    sequenceState: new MemorySequenceStore(), maxPatternBytes: 16,
  });
  equal((await pattern.execute(command(1, { kind: "fixture-put", path: "large.bin", content: { type: "pattern", byteLength: 17, seed: "seed" } }))).classification, "fixture-pattern-too-large");
});

test("production commands remain bounded and terminal receipt authority is propagated", async () => {
  const fixtures = fixtureHarness();
  const production = productionHarness("uncertain");
  const store = new MemorySequenceStore();
  const agent = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port, sequenceState: store, production: production.control,
  });

  const preview = await agent.execute(command(1, { kind: "production-preview", mode: "manual" }));
  equal(preview.status, "completed");
  deepEqual(preview.plan, {
    planId: "plan-manual",
    trigger: "manual",
    operationCount: 1,
    operationKinds: ["upload-create"],
    executionDisposition: "requires-user-approval",
    recoveryCheckpointRequired: false,
    globalExecutionGate: "none",
  });

  const verify = await agent.execute(command(2, { kind: "production-preview", mode: "verify-reconcile" }));
  equal(verify.plan?.planId, "plan-verify");
  equal(verify.plan?.trigger, "verify-reconcile");

  const execute = await agent.execute(command(3, { kind: "production-execute", planId: "plan-manual" }));
  equal(execute.status, "completed");
  equal(execute.classification, "production-uncertain");
  equal(execute.receipt?.terminal, "uncertain");
  equal(execute.receipt?.requiredEffectsCommittedAndVerified, false);

  const pause = await agent.execute(command(4, { kind: "production-control", action: "pause" }));
  equal(pause.classification, "production-control-accepted");
  const resume = await agent.execute(command(5, { kind: "production-control", action: "resume" }));
  equal(resume.classification, "production-control-accepted");
  const cancel = await agent.execute(command(6, { kind: "production-control", action: "cancel-active-sync" }));
  equal(cancel.classification, "production-control-accepted");

  const observed = await agent.execute(command(7, { kind: "observe-product" }));
  equal(observed.classification, "product-observed");
  deepEqual(observed.productStatus, { kind: "idle-ready" });
  notEqual(observed.productStatus, production.control.currentStatus());
  equal(observed.receipt?.runId, production.receipt.runId);
  deepEqual(production.actions, ["execute:plan-manual", "pause", "resume", "cancel"]);
});

test("production execute rejects accepted dispatch without a new correlated receipt", async () => {
  const fixtures = fixtureHarness();
  const staleReceipt: any = {
    runId: "old-run", trigger: "manual", planId: "plan-manual", terminal: "complete",
    requiredEffectsCommittedAndVerified: true, committedOperationCount: 1, skippedOperationCount: 0,
  };
  const production: ProductionVerificationControl = {
    async previewManual() { return undefined; },
    async previewVerifyReconcile() { return undefined; },
    async executePlan() { return { status: "accepted" }; },
    async pause() { return { status: "accepted" }; },
    async resume() { return { status: "accepted" }; },
    async cancelActiveSync() { return { status: "accepted" }; },
    currentStatus() { return { kind: "idle-ready" }; },
    latestProductionRunReceipt() { return staleReceipt; },
  };
  const agent = createBoundedDeviceCommandAgent({
    validationBuild,
    runId, deviceId, fixtureRoot: "BVP-VALIDATION/run-001", fixtures: fixtures.port,
    sequenceState: new MemorySequenceStore(), production,
  });
  const result = await agent.execute(command(1, { kind: "production-execute", planId: "plan-manual" }));
  equal(result.status, "failed");
  equal(result.classification, "production-receipt-missing-or-stale");
  equal(result.receipt, undefined);
});

test("atomic durable claim permits only one concurrent physical execution", async () => {
  const fixtures=fixtureHarness(),store=new MemorySequenceStore();
  const options={runId,deviceId,fixtureRoot:"BVP-VALIDATION/run-001",validationBuild,fixtures:fixtures.port,sequenceState:store};
  const commandOne=command(1,{kind:"fixture-put",path:"race.md",content:{type:"text",text:"one"}});
  const [a,b]=await Promise.all([createBoundedDeviceCommandAgent(options).execute(commandOne),createBoundedDeviceCommandAgent(options).execute(clone(commandOne))]);
  equal(fixtures.calls.filter(value=>value.startsWith("text:")).length,1);
  equal([a,b].filter(value=>value.status==="completed").length,1);
  equal([a,b].some(value=>value.classification==="prior-outcome-uncertain"),true);

  const otherFixtures=fixtureHarness(),otherStore=new MemorySequenceStore(),otherOptions={...options,fixtures:otherFixtures.port,sequenceState:otherStore};
  const conflicting={...commandOne,commandId:"different",content:{type:"text" as const,text:"two"}};
  const [first,second]=await Promise.all([createBoundedDeviceCommandAgent(otherOptions).execute(commandOne),createBoundedDeviceCommandAgent(otherOptions).execute(conflicting)]);
  equal(otherFixtures.calls.filter(value=>value.startsWith("text:")).length,1);
  equal([first,second].some(value=>value.classification==="sequence-conflict"),true);
});
