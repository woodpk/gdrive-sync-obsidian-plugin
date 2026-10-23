/** S09A first executable slice: dual-device read-only readiness through the real
 * live scenario runner/relay contract. These are simulated receipts, NOT evidence
 * of iOS installation, OAuth, pairing, or physical S09A acceptance.
 * Executed exclusively as PHX-CI's focused test command.
 */
import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
async function scratchRoot(): Promise<string> {
  const base = process.platform === "win32" ? "C:\\temp" : tmpdir();
  const dir = join(base, randomUUID().replaceAll("-", ""));
  await mkdir(dir);
  return dir;
}

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
  const dir = await scratchRoot();
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
  const dir=await scratchRoot();
  try{
    await rejects(()=>createLiveScenarioExecutor({
      scenario,runId:"s09a-collision",deviceIds:{windows:devices.windows,ios:devices.windows},
      relayRoot:join(dir,"relay"),checkpointFile:join(dir,"checkpoint.json"),
      expectedValidationSourceCommit:sourceCommit,resultTimeoutMs:100,pollIntervalMs:2,
    }),/live-executor-identity-invalid/);
  }finally{await rm(dir,{recursive:true,force:true});}
});


// Cross-device prerelease provenance tests. These are simulated installed
// device receipts; neither device nor Drive is contacted by this test.
const expectedS09A = {
  sourceCommit: "2bf51ca15aec9c752e3ac7769fcf3ac237df99df",
  artifactSha256: "90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7",
  windowsManifestSha256: "d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965",
  iosManifestSha256: "1788bcaa4a9dd05d22ec03b0ba56bd3a72d4fa4541e2e5ec74c1a43253ce54a5",
};
async function runDualInstallationReceipts(windowsManifest: string, iosManifest?: string,
    override?: Partial<DeviceCommandResult>) {
  const dir = await scratchRoot(), relay = join(dir, "relay");
  const validationBuild = (manifestSha256: string) => ({
    schemaVersion: 1 as const, sourceCommit: expectedS09A.sourceCommit,
    artifactSha256: expectedS09A.artifactSha256, manifestSha256,
  });
  try {
    const executor = await createLiveScenarioExecutor({
      scenario, runId: "s09a-pinned-prerelease-build-proof", deviceIds: devices,
      relayRoot: relay, checkpointFile: join(dir, "checkpoint.json"),
      expectedValidationSourceCommit: expectedS09A.sourceCommit,
      expectedValidationArtifactSha256: expectedS09A.artifactSha256,
      expectedValidationManifestSha256: expectedS09A.windowsManifestSha256,
      expectedValidationManifestSha256ByDevice: {
        windows: expectedS09A.windowsManifestSha256,
        ios: expectedS09A.iosManifestSha256,
      },
      resultTimeoutMs: 120, pollIntervalMs: 3,
    });
    const pending = new DeterministicScenarioRunner({}, executor).run(scenario);
    const commands = [await reply(relay, "idle-ready", {validationBuild: validationBuild(windowsManifest)})];
    if (windowsManifest === expectedS09A.windowsManifestSha256 && iosManifest) {
      commands.push(await reply(relay, "idle-ready",
        {validationBuild: validationBuild(iosManifest), ...override}));
    }
    const result = await pending;
    return {result, commands, installations: executor.observedInstalledBuilds?.()};
  } finally { await rm(dir, {recursive:true,force:true}); }
}
test("S09A accepts exact old Windows manifest and exact BRAT prerelease iOS manifest; preserves both measured hashes",async()=>{
  const run = await runDualInstallationReceipts(expectedS09A.windowsManifestSha256,
    expectedS09A.iosManifestSha256);
  strictEqual(run.result.status,"completed");
  deepStrictEqual(run.commands.map(c=>c.deviceId),[devices.windows,devices.ios]);
  deepStrictEqual(run.installations,{
    [devices.windows]: {artifactSha256:expectedS09A.artifactSha256,manifestSha256:expectedS09A.windowsManifestSha256},
    [devices.ios]: {artifactSha256:expectedS09A.artifactSha256,manifestSha256:expectedS09A.iosManifestSha256},
  });
});
test("S09A refuses spoofed Windows manifest despite correct executable",async()=>{
  const run = await runDualInstallationReceipts(expectedS09A.iosManifestSha256);
  strictEqual(run.result.status,"failed");
  strictEqual(run.result.classification,"result-correlation-mismatch");
  deepStrictEqual(run.commands.map(c=>c.deviceId),[devices.windows]);
});
test("S09A refuses stale or unrecognized iOS manifest rather than treating identical main.js as full proof",async()=>{
  for (const invalid of [expectedS09A.windowsManifestSha256,"f".repeat(64)]) {
    const run = await runDualInstallationReceipts(expectedS09A.windowsManifestSha256,invalid);
    strictEqual(run.result.status,"failed");
    strictEqual(run.result.classification,"result-correlation-mismatch");
    deepStrictEqual(run.commands.map(c=>c.deviceId),[devices.windows,devices.ios]);
    deepStrictEqual(Object.keys(run.installations??{}),[devices.windows]);
  }
});
test("S09A refuses iOS receipts with mismatched source, artifact, or device",async()=>{
  for (const invalid of [
    {validationBuild:{schemaVersion:1 as const,sourceCommit:"f".repeat(40),
      artifactSha256:expectedS09A.artifactSha256,manifestSha256:expectedS09A.iosManifestSha256}},
    {validationBuild:{schemaVersion:1 as const,sourceCommit:expectedS09A.sourceCommit,
      artifactSha256:"f".repeat(64),manifestSha256:expectedS09A.iosManifestSha256}},
    {deviceId:devices.windows},
  ]) {
    const run = await runDualInstallationReceipts(expectedS09A.windowsManifestSha256,
      expectedS09A.iosManifestSha256,invalid);
    strictEqual(run.result.status,"failed");
    strictEqual(run.result.classification,"result-correlation-mismatch");
  }
});
test("S09A expected per-device manifest map must be exact and cannot weaken absent artifact digest",async()=>{
  for (const unsafe of [
    {windows:expectedS09A.windowsManifestSha256},
    {windows:expectedS09A.windowsManifestSha256,ios:expectedS09A.iosManifestSha256,extra:"f".repeat(64)},
    {windows:expectedS09A.windowsManifestSha256,ios:"invalid"},
  ]) {
    const dir = await scratchRoot();
    try {
      await rejects(()=>createLiveScenarioExecutor({
        scenario,runId:"s09a-invalid-hash-policy",deviceIds:devices,
        relayRoot:join(dir,"relay"),checkpointFile:join(dir,"checkpoint.json"),
        expectedValidationSourceCommit:expectedS09A.sourceCommit,
        expectedValidationArtifactSha256:expectedS09A.artifactSha256,
        expectedValidationManifestSha256:expectedS09A.windowsManifestSha256,
        expectedValidationManifestSha256ByDevice:unsafe as Readonly<Record<string, string>>,
      }),/installed-build|manifest|identity/i);
    }finally{await rm(dir,{recursive:true,force:true});}
  }
});
