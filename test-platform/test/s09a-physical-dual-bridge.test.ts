/**
 * S09A PHX-CI test-first physical bridge contract.
 * Deliberately no real devices, Drive operations, or physical dispatch.
 * Covers the approved observation-only dual-device readiness battery.
 */
import { deepStrictEqual, strictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
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
const sourceCommit = "a".repeat(40), artifact = "b".repeat(64), manifest = "c".repeat(64);
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
        ...(both ? { [rawIos]: { artifactSha256: artifact, manifestSha256: manifest } } : {}) } },
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
