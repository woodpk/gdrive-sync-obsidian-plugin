/**
 * S09A PHX-CI test-first physical bridge contract.
 * Deliberately no real devices, Drive operations, or physical dispatch.
 * Covers the approved observation-only dual-device readiness battery.
 */
import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getLiveBattery } from "./batteries/battery-registry";
import { scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
import {
  buildLiveRunnerArguments, publicPhysicalDeviceId,
  projectPhysicalDualReadinessResultForEvidence,
  type BridgeAttempt, type LiveRunnerPaths,
} from "./batteries/phxci-physical-bridge";

const battery = getLiveBattery("s09a-dual-device-readiness");
if (!battery) throw new Error("registered S09A readiness battery missing");
const scenario = battery.createScenario();
const rawWindows = "device:0123456789abcdef0123456789abcdef";
const rawIos = "device:fedcba9876543210fedcba9876543210";
const rawByLabel = { windows: rawWindows, ios: rawIos };
const publicByLabel = { windows: publicPhysicalDeviceId(rawWindows), ios: publicPhysicalDeviceId(rawIos) };
const sourceCommit = "2bf51ca15aec9c752e3ac7769fcf3ac237df99df";
const artifact = "90508d2ff89140ee6a1af2c4190ecb0e93b265a62f92b8c02d6b5523e75721f7";
const manifest = "d4e1c6602550e5c6cbd5d233dcc993abca9955d03777a683ce4ab37b01747965";
const iosManifest = "1788bcaa4a9dd05d22ec03b0ba56bd3a72d4fa4541e2e5ec74c1a43253ce54a5";
const relayRoot = "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay";
const scratch = "C:\\temp\\0123456789abcdef0123456789abcdef";
const paths: LiveRunnerPaths = {
  relayRoot, physicalPluginRelayRoot: relayRoot,
  checkpointFile: scratch + "\\checkpoint.json",
  resultFile: scratch + "\\result.json",
  buildIdentityFile: scratch + "\\installed\\build-identity.json",
};
function attempt(): BridgeAttempt {
  return { schemaVersion: 1, battery: battery!.name, scenarioId: scenario.id,
    scenarioDigest: scenarioDefinitionDigest(scenario), sourceCommit, artifactSha256: artifact,
    bvpRunId: "bvp-s09a-dual-source", phxRunId: "12345678-1234-4234-8234-1234567890ab",
    deviceIds: publicByLabel, attemptIndex: 1, mode: "initial", exitCode: 1,
    resultJson: JSON.stringify({ battery: { name: battery!.name },
      result: { scenarioId: scenario.id, status: "failed", classification: "not-dispatched" } }),
  };
}
function sample(status: "completed" | "blocked" = "completed"): string {
  const both = status === "completed";
  const observations = [{ stepId: "observe-windows", captureAs: "windows-status",
    value: { kind: "idle-ready" } }, ...(both ? [{ stepId: "observe-ios",
      captureAs: "ios-status", value: { kind: "idle-ready" } }] : [])];
  const machine = { schemaVersion: 1, scenarioId: scenario.id, executionMode: "live",
    deviceIdentities: [rawWindows, rawIos].sort(), liveIdentity: { runId: "bvp-s09a-dual-source", sourceCommit },
    observations, verdict: { status } };
  return JSON.stringify({
    battery: { name: battery!.name },
    result: { scenarioId: scenario.id, status, classification: status === "blocked" ? "device-result-unavailable" : undefined,
      captures: { "windows-status": { kind: "idle-ready", internalMarker: "PRIVATE_WINDOW_CAPTURE" },
        ...(both ? { "ios-status": { kind: "idle-ready", internalMarker: "PRIVATE_IOS_CAPTURE" } } : {}) },
      evidence: { machine, machineJson: JSON.stringify(machine) } },
    installationObservation: { sourceCommit, artifactSha256: artifact, manifestSha256: manifest,
      devices: { [rawWindows]: { artifactSha256: artifact, manifestSha256: manifest },
        ...(both ? { [rawIos]: { artifactSha256: artifact, manifestSha256: iosManifest } } : {}) } },
  });
}

test("S09A dual-device physical route uses the existing Windows-installed relay and two correlated private IDs", () => {
  deepStrictEqual(scenario.steps.map(step => step.kind), ["observe", "assert", "observe", "assert"]);
  const args = buildLiveRunnerArguments(attempt(), paths, [], false, rawByLabel);
  strictEqual(args[args.indexOf("--relay-root") + 1], relayRoot);
  deepStrictEqual(JSON.parse(args[args.indexOf("--device-map-json") + 1]!), rawByLabel);
  strictEqual(args[args.indexOf("--result-timeout-ms") + 1], "240000");
});
test("wrong iOS digest, swapped routes, duplicate private identity and missing iOS binding are rejected", () => {
  for (const unsafe of [
    { windows: rawWindows, ios: "device:00000000000000000000000000000000" },
    { windows: rawIos, ios: rawWindows },
    { windows: rawWindows, ios: rawWindows },
    { windows: rawWindows },
    { windows: rawWindows, ios: rawIos, extra: rawIos },
  ]) throws(() => buildLiveRunnerArguments(attempt(), paths, [], false, unsafe as Readonly<Record<string, string>>),
    /privacy|mapping|identity|device|routing|scope/i);
  throws(() => buildLiveRunnerArguments(attempt(), paths), /privacy|mapping|identity|device|routing|scope/i);
});
test("S09A physical route remains confined to the existing disposable Windows relay and C temp", () => {
  const bad = [
    { ...paths, relayRoot: "D:\\private-vault\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay",
      physicalPluginRelayRoot: "D:\\private-vault\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay" },
    { ...paths, resultFile: "C:\\temp\\aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\\result.json" },
    { ...paths, buildIdentityFile: "D:\\private-vault\\build-identity.json" },
  ];
  for (const p of bad) throws(() => buildLiveRunnerArguments(attempt(), p, [], false, rawByLabel),
    /physical|relay|scratch|scope|path|root|privacy/i);
});
test("the dual-device exception does not enable S09B, initial sync, or another physical battery", () => {
  for (const name of ["s09a-ios-initial-sync", "s09b-bidirectional-sync", "s09b-clean-text-merge"]) {
    const def = getLiveBattery(name)!;
    const a = { ...attempt(), battery: name, scenarioId: def.createScenario().id,
      scenarioDigest: scenarioDefinitionDigest(def.createScenario()) };
    throws(() => buildLiveRunnerArguments(a, paths, [], false, rawByLabel),
      /physical|relay|scope|smoke|device|battery/i);
  }
});
test("dual readiness evidence contains ONLY hashed device identities and verified canonical observations", () => {
  const projected = projectPhysicalDualReadinessResultForEvidence(sample(), rawByLabel);
  for (const raw of Object.values(rawByLabel)) strictEqual(projected.includes(raw), false);
  strictEqual(projected.includes("PRIVATE_IOS_CAPTURE"), false);
  strictEqual(projected.includes("PRIVATE_WINDOW_CAPTURE"), false);
  const obj = JSON.parse(projected);
  deepStrictEqual(obj.result.captures, {});
  deepStrictEqual(obj.result.evidence.machine.deviceIdentities, Object.values(publicByLabel).sort());
  deepStrictEqual(Object.keys(obj.installationObservation.devices).sort(), Object.values(publicByLabel).sort());
  strictEqual(obj.result.evidence.machineJson, JSON.stringify(obj.result.evidence.machine));
  strictEqual(obj.result.status, "completed");
  strictEqual(obj.installationObservation.devices[publicByLabel.windows].manifestSha256, manifest);
  strictEqual(obj.installationObservation.devices[publicByLabel.ios].manifestSha256, iosManifest);
});
test("missing iOS response retains BLOCKED and does not manufacture its installation evidence", () => {
  const projected = JSON.parse(projectPhysicalDualReadinessResultForEvidence(sample("blocked"), rawByLabel));
  strictEqual(projected.result.status, "blocked");
  deepStrictEqual(Object.keys(projected.installationObservation.devices), [publicByLabel.windows]);
  deepStrictEqual(projected.result.evidence.machine.deviceIdentities, Object.values(publicByLabel).sort());
});
test("completed S09A dual readiness cannot omit physical iOS installation evidence", () => {
  const obj = JSON.parse(sample());
  delete obj.installationObservation.devices[rawIos];
  throws(() => projectPhysicalDualReadinessResultForEvidence(JSON.stringify(obj), rawByLabel),
    /physical|privacy|installation|identity|measurement|device/i);
});
test("dual readiness rejects forged capture, untrusted source evidence and stray private identities", () => {
  const variants: ((o: any) => void)[] = [
    o => { o.result.captures["ios-status"].kind = "paused"; },
    o => { o.result.captures["unregistered-capture"] = { kind: "idle-ready" }; },
    o => { o.result.evidence.machine.deviceIdentities = [rawWindows, "device:ffffffffffffffffffffffffffffffff"]; },
    o => { o.result.evidence.machineJson = "{\"unrelated\":true}"; },
    o => { o.result.reason = "raw-leak-" + rawIos; },
    o => { o.battery.name = "s09b-bidirectional-sync"; },
    o => { o.result.scenarioId = "not-the-registered-scenario"; },
    o => { o.installationObservation.devices["device:ffffffffffffffffffffffffffffffff"] = { artifactSha256: artifact, manifestSha256: manifest }; },
  ];
  for (const change of variants) {
    const obj = JSON.parse(sample()); change(obj);
    throws(() => projectPhysicalDualReadinessResultForEvidence(JSON.stringify(obj), rawByLabel),
      /privacy|identity|device|capture|source|battery|scenario|unapproved|mismatch/i);
  }
});

test("S09A dual physical operator has a distinct owner-approved PHX-CI-only entrypoint", () => {
  const bridge = readFileSync(resolve(process.cwd(), "test-platform/test/batteries/phxci-physical-bridge.ts"), "utf8");
  const operator = readFileSync(resolve(process.cwd(), "dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"), "utf8");
  strictEqual(bridge.includes("BVP_S09A_DUAL_OWNER_APPROVAL"), true);
  strictEqual(bridge.includes("BVP_IOS_VALIDATION_READY_CONFIRMED"), true);
  strictEqual(bridge.includes("--run-approved-s09a-dual-readiness"), true);
  for (const requirement of [
    "[switch]$RunS09ADualPhysicalReadiness",
    "BVP_S09A_DUAL_OWNER_APPROVAL",
    "BVP_IOS_VALIDATION_READY_CONFIRMED",
    "BVP_IOS_DEVICE_ID",
    "--run-approved-s09a-dual-readiness",
    "-FocusedTestCommand $dualPhysicalCommand",
    "-PublicationMode push",
    "Read-Host",
    "RunS09ADualPhysicalReadiness -and",
  ]) strictEqual(operator.includes(requirement), true, requirement);
  strictEqual((operator.match(/--run-approved-s09a-dual-readiness/g) ?? []).length, 1);
  strictEqual((operator.match(/--run-approved-windows-smoke/g) ?? []).length, 1);
  strictEqual(operator.includes("npm run test:bvp-root"), true);
  strictEqual(operator.includes("if ($RunS09ADualPhysicalReadiness)"), true);
  strictEqual(operator.includes("Remove-Item ('Env:' + $entry.Name)"), true);
});


test("S09A privacy projection binds each physical device to its exact pinned release manifest",()=>{
  const variants:((x:any)=>void)[]=[
    o=>{o.installationObservation.devices[rawIos].manifestSha256=manifest;},
    o=>{o.installationObservation.devices[rawIos].manifestSha256="f".repeat(64);},
    o=>{o.installationObservation.devices[rawWindows].manifestSha256=iosManifest;},
    o=>{o.installationObservation.devices[rawIos].artifactSha256="f".repeat(64);},
    o=>{o.installationObservation.sourceCommit="f".repeat(40);},
    o=>{o.installationObservation.manifestSha256=iosManifest;},
  ];
  for(const change of variants){
    const payload=JSON.parse(sample());change(payload);
    throws(()=>projectPhysicalDualReadinessResultForEvidence(JSON.stringify(payload),rawByLabel),
      /privacy|identity|artifact|manifest|source|installed|mismatch/i);
  }
});
test("S09A incomplete run preserves only genuinely measured approved device hash claims",()=>{
  const obj=JSON.parse(sample("blocked"));
  obj.installationObservation.devices[rawWindows].manifestSha256=iosManifest;
  throws(()=>projectPhysicalDualReadinessResultForEvidence(JSON.stringify(obj),rawByLabel),
    /privacy|manifest|installed|mismatch/i);
});


test("S09A operator accepts a Settings-screen bare 32-hex identity and forwards its canonical device: form only",()=>{
  const operator=readFileSync(resolve(process.cwd(),"dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"),"utf8");
  // The owner enters only what is visibly displayed in BRAIN Settings.
  // Normalize ONLY at the private operator boundary; never republish raw IDs.
  const read=operator.indexOf("$iosId = Read-Host");
  const canonical=operator.indexOf("if ($iosId -cmatch '^[a-f0-9]{32}$') { $iosId = 'device:' + $iosId }",read);
  const guard=operator.indexOf("if ($iosId -cnotmatch '^device:[a-f0-9]{32}$')",read);
  const stored=operator.indexOf("$env:BVP_IOS_DEVICE_ID = $iosId",read);
  strictEqual(read>=0,true);
  strictEqual(canonical>read,true,"Settings-screen identity must be normalized");
  strictEqual(guard>canonical,true,"canonical identity must be checked after normalization");
  strictEqual(stored>guard,true,"only checked canonical identity may be routed privately");
  strictEqual(operator.includes("Write-Output $iosId"),false);
  strictEqual(operator.includes("Write-Host $iosId"),false);
  const sampleId="fedcba9876543210fedcba9876543210";
  const canonicalize=(entry:string)=>/^[a-f0-9]{32}$/.test(entry)?"device:"+entry:entry;
  for(const input of [sampleId,"device:"+sampleId]) {
    const result=canonicalize(input);
    strictEqual(result,"device:"+sampleId);
    strictEqual(publicPhysicalDeviceId(result),publicByLabel.ios);
  }
  for(const bad of ["", "device:",sampleId.slice(1),"device:"+sampleId+"0",
    "device:00112233445566778899aabbccddeefZ",
    "DEVICE:"+sampleId,"device:"+sampleId.toUpperCase(),"x"+sampleId,
  ]) {
    const normalized=canonicalize(bad);
    strictEqual(/^device:[a-f0-9]{32}$/.test(normalized),false);
  }
});
