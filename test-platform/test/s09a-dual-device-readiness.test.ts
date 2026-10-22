/** S09A first executable slice: dual-device read-only readiness through the real
 * live scenario runner/relay contract. These are simulated receipts, NOT evidence
 * of iOS installation, OAuth, pairing, or physical S09A acceptance.
 * Executed exclusively as PHX-CI's focused test command.
 */
import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { getLiveBattery } from "./batteries/battery-registry";
import { createLiveScenarioExecutor } from "../src/live-device/live-scenario-executor";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import type { DeviceCommand, DeviceCommandResult } from "../src/live-device/device-command-agent";

const battery = getLiveBattery("s09a-dual-device-readiness");
if (!battery) throw new Error("S09A dual-device readiness scenario missing");
const scenario = battery.createScenario();
const sourceCommit = "a".repeat(40);
const devices = { windows: "device:fixture-windows-s09a", ios: "device:fixture-ios-s09a" };
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 3));

async function commandFrom(relay: string): Promise<{command: DeviceCommand; filename: string}> {
  const out = join(relay, "outbox");
  for (let attempt = 0; attempt < 1000; attempt++) {
    const names = await readdir(out).catch(() => [] as string[]);
    const filename = names.find(name => name.endsWith(".json"));
    if (filename) {
      const command = JSON.parse(await readFile(join(out, filename), "utf8")) as DeviceCommand;
      await mkdir(join(relay, "sent"), { recursive: true });
      await rename(join(out, filename), join(relay, "sent", filename));
      return { command, filename };
    }
    await pause();
  }
  throw new Error("S09A simulated command was not sent");
}
async function reply(relay: string, kind: "idle-ready"|"paused"|"authentication-required",
    override: Partial<DeviceCommandResult> = {}): Promise<DeviceCommand> {
  const { command, filename } = await commandFrom(relay);
  const result: DeviceCommandResult = {
    validationBuild: { schemaVersion: 1, sourceCommit },
    runId: command.runId, deviceId: command.deviceId, sequence: command.sequence,
    commandId: command.commandId, kind: command.kind, status: "completed",
    classification: "product-observed", productStatus: { kind }, ...override,
  };
  await mkdir(join(relay, "inbox"), { recursive: true });
  await writeFile(join(relay, "inbox", filename + ".result.json"), JSON.stringify(result), "utf8");
  await rm(join(relay, "sent", filename), { force: true });
  return command;
}
async function runStatusPair(
    windows: "idle-ready"|"paused"|"authentication-required",
    ios?: "idle-ready"|"paused"|"authentication-required",
    override?: Partial<DeviceCommandResult>) {
  const dir = await mkdtemp(join(tmpdir(), "brain-s09a-"));
  const relay = join(dir, "relay");
  try {
    const executor = await createLiveScenarioExecutor({
      scenario, runId: "s09a-simulated-readiness", deviceIds: devices,
      relayRoot: relay, checkpointFile: join(dir, "checkpoint.json"),
      expectedValidationSourceCommit: sourceCommit,
      resultTimeoutMs: 1500, pollIntervalMs: 3,
    });
    const running = new DeterministicScenarioRunner({}, executor).run(scenario);
    const commands = [await reply(relay, windows, override)];
    if (windows === "idle-ready" && override === undefined && ios) {
      commands.push(await reply(relay, ios));
    }
    return { outcome: await running, commands };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("S09A read-only battery requires distinct Windows and iOS production observations",()=>{
  strictEqual(battery?.name, "s09a-dual-device-readiness");
  deepStrictEqual(battery?.requiredDeviceLabels, ["windows", "ios"]);
  deepStrictEqual(scenario.executionModes, ["live"]);
  deepStrictEqual(scenario.steps.map(s => s.kind), ["observe","assert","observe","assert"]);
  deepStrictEqual(scenario.steps.filter(s => s.kind==="observe").map(s => "device" in s ? s.device : null),
    ["windows","ios"]);
  for(const step of scenario.steps) {
    strictEqual(step.kind==="fixture" || step.kind==="production" || step.kind==="external-state",false);
  }
});

test("S09A exact two-device live runner accepts both correlated idle-ready observations",async()=>{
  const {outcome,commands} = await runStatusPair("idle-ready","idle-ready");
  strictEqual(outcome.status,"completed");
  strictEqual(outcome.steps.length,4);
  deepStrictEqual(commands.map(c=>c.kind),["observe-product","observe-product"]);
  deepStrictEqual(commands.map(c=>c.deviceId),[devices.windows,devices.ios]);
  deepStrictEqual(commands.map(c=>c.sequence),[1,1]);
  strictEqual((outcome.captures["windows-status"] as {kind:string}).kind,"idle-ready");
  strictEqual((outcome.captures["ios-status"] as {kind:string}).kind,"idle-ready");
  strictEqual(outcome.evidence?.machine.executionMode,"live");
});

test("S09A Windows not-ready fails before commanding iOS or attempting synchronization",async()=>{
  for(const kind of ["paused","authentication-required"] as const){
    const {outcome,commands}=await runStatusPair(kind);
    strictEqual(outcome.status,"failed");
    strictEqual(outcome.classification,"assertion-mismatch");
    strictEqual(outcome.steps.length,2);
    deepStrictEqual(commands.map(c=>c.kind),["observe-product"]);
    deepStrictEqual(commands.map(c=>c.deviceId),[devices.windows]);
  }
});

test("S09A iOS not-ready does not become a successful dual-device baseline",async()=>{
  for(const kind of ["paused","authentication-required"] as const){
    const {outcome,commands}=await runStatusPair("idle-ready",kind);
    strictEqual(outcome.status,"failed");
    strictEqual(outcome.classification,"assertion-mismatch");
    strictEqual(outcome.steps.length,4);
    deepStrictEqual(commands.map(c=>c.kind),["observe-product","observe-product"]);
  }
});

test("S09A wrong-device receipt is rejected rather than attributed to Windows",async()=>{
  const {outcome,commands}=await runStatusPair("idle-ready",undefined,{deviceId: devices.ios});
  strictEqual(outcome.status,"failed");
  strictEqual(outcome.classification,"result-correlation-mismatch");
  deepStrictEqual(commands.map(c=>c.deviceId),[devices.windows]);
});

test("S09A missing iOS reply retains BLOCKED and does not infer a second participant",async()=>{
  const {outcome,commands}=await runStatusPair("idle-ready");
  strictEqual(outcome.status,"blocked");
  strictEqual(outcome.classification,"device-result-unavailable");
  deepStrictEqual(commands.map(c=>c.kind),["observe-product"]);
  strictEqual(outcome.steps.length,3);
});

test("S09A refuses a duplicate identity for both device labels before relay dispatch",async()=>{
  const dir=await mkdtemp(join(tmpdir(),"brain-s09a-"));
  try{
    await rejects(()=>createLiveScenarioExecutor({
      scenario,runId:"s09a-collision",deviceIds:{windows:devices.windows,ios:devices.windows},
      relayRoot:join(dir,"relay"),checkpointFile:join(dir,"checkpoint.json"),
      expectedValidationSourceCommit:sourceCommit,resultTimeoutMs:100,pollIntervalMs:2,
    }),/live-executor-identity-invalid/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
