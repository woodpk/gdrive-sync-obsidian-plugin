/** One-way privacy boundary for physical Windows command routing; PHX-CI-owned tests only. */
import { strictEqual, deepStrictEqual, throws } from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { publicPhysicalDeviceId, projectPhysicalResultForEvidence,
  buildLiveRunnerArguments, type BridgeAttempt, type LiveRunnerPaths } from "./batteries/phxci-physical-bridge";
import { getLiveBattery } from "./batteries/battery-registry";
import { scenarioDefinitionDigest } from "../src/scenario/scenario-checkpoint";
const raw="device:0123456789abcdef0123456789abcdef";
const hashed="device:sha256:"+createHash("sha256").update("brain-bvp-physical-device-v1\u0000"+raw).digest("hex");
const knownVault="D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b";
const relay=knownVault+"\\.obsidian\\plugins\\brain-google-drive-sync\\.bvp-relay";
const scratch="C:\\temp\\0123456789abcdef0123456789abcdef";
const definition=getLiveBattery("windows-live-smoke")!;
const scenario=definition.createScenario();
const sourceCommit="a".repeat(40);
const artifact="b".repeat(64),manifest="c".repeat(64);
const attempt:BridgeAttempt={
  schemaVersion:1,battery:"windows-live-smoke",scenarioId:scenario.id,
  scenarioDigest:scenarioDefinitionDigest(scenario),sourceCommit,artifactSha256:artifact,
  deviceIds:{windows:hashed},bvpRunId:"bvp-windows-privacy",phxRunId:"12345678-1234-4234-8234-1234567890ab",
  attemptIndex:1,mode:"initial",exitCode:1,
  resultJson:JSON.stringify({battery:{name:"windows-live-smoke"},result:{scenarioId:scenario.id,status:"failed"}})
};
const paths:LiveRunnerPaths={relayRoot:relay,physicalPluginRelayRoot:relay,
  checkpointFile:scratch+"\\checkpoint.json",resultFile:scratch+"\\result.json",
  buildIdentityFile:scratch+"\\installed\\build-identity.json"};
function sample():string {
  const machine={schemaVersion:1,scenarioId:scenario.id,executionMode:"live",
    deviceIdentities:[raw],liveIdentity:{runId:attempt.bvpRunId,sourceCommit},
    verdict:{status:"completed"}};
  return JSON.stringify({battery:{name:"windows-live-smoke"},
    result:{scenarioId:scenario.id,status:"completed",steps:[],
      evidence:{machine,machineJson:JSON.stringify(machine)}},
    installationObservation:{sourceCommit,artifactSha256:artifact,manifestSha256:manifest,
      devices:{[raw]:{artifactSha256:artifact,manifestSha256:manifest}}}});
}
test("physical command endpoint uses stable installed ID but the public identity is a digest",()=>{
  strictEqual(publicPhysicalDeviceId(raw),hashed);
  strictEqual(publicPhysicalDeviceId(raw),publicPhysicalDeviceId(raw));
  strictEqual(publicPhysicalDeviceId("device:ffffffffffffffffffffffffffffffff")!==hashed,true);
  throws(()=>publicPhysicalDeviceId("device:Marys-Phone"),/physical|device|identity|privacy/i);
});
test("Windows smoke runner address binds private raw to the approved public PHX identity",()=>{
  const args=buildLiveRunnerArguments(attempt,paths,[],false,{windows:raw});
  strictEqual(args[args.indexOf("--device-map-json")+1],JSON.stringify({windows:raw}));
  strictEqual(args[args.indexOf("--relay-root")+1],relay);
  throws(()=>buildLiveRunnerArguments(attempt,paths,[],false,{windows:"device:ffffffffffffffffffffffffffffffff"}),/privacy|mapping|identity|device/i);
  throws(()=>buildLiveRunnerArguments(attempt,paths,[],false,{ios:raw}),/privacy|mapping|identity|device/i);
});
test("evidence includes public identity only; source artifact, result and derived JSON remain consistent",()=>{
  const projected=projectPhysicalResultForEvidence(sample(),raw,hashed);
  strictEqual(projected.includes(raw),false);
  const obj=JSON.parse(projected);
  deepStrictEqual(obj.result.evidence.machine.deviceIdentities,[hashed]);
  deepStrictEqual(Object.keys(obj.installationObservation.devices),[hashed]);
  strictEqual(obj.result.evidence.machineJson,JSON.stringify(obj.result.evidence.machine));
  strictEqual(obj.result.status,"completed");
});
test("unexpected private device ID in extra observation is never silently published",()=>{
  const obj=JSON.parse(sample());
  obj.result.reason="raw-id-"+raw;
  throws(()=>projectPhysicalResultForEvidence(JSON.stringify(obj),raw,hashed),/privacy|raw|unapproved|device/i);
});
test("mismatched installed result identity cannot be attributed to the approved Windows device",()=>{
  const obj=JSON.parse(sample());
  obj.result.evidence.machine.deviceIdentities=["device:ffffffffffffffffffffffffffffffff"];
  throws(()=>projectPhysicalResultForEvidence(JSON.stringify(obj),raw,hashed),/privacy|mismatch|device/i);
});
