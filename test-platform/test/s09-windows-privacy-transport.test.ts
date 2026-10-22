/** One-way privacy boundary for physical Windows command routing; PHX-CI-owned tests only. */
import { strictEqual, deepStrictEqual, throws } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicPhysicalDeviceId, projectPhysicalResultForEvidence,
  buildLiveRunnerArguments, validateOriginalWindowsTimeoutReconciliation, type BridgeAttempt, type LiveRunnerPaths } from "./batteries/phxci-physical-bridge";
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
  // Previously observed live Drive propagation exceeded the default 60s.
  // The physical exception is bounded and does not change simulations.
  strictEqual(args[args.indexOf("--result-timeout-ms")+1],"240000");
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

test("timed-out Windows smoke with zero device measurements retains BLOCKED evidence instead of masking failure",()=>{
  const obj=JSON.parse(sample());
  obj.result.status="blocked";
  obj.result.evidence.machine.verdict.status="blocked";
  obj.result.evidence.machineJson=JSON.stringify(obj.result.evidence.machine);
  obj.result.classification="device-result-unavailable";
  obj.installationObservation.devices={};
  const projected=projectPhysicalResultForEvidence(JSON.stringify(obj),raw,hashed);
  const found=JSON.parse(projected);
  strictEqual(found.result.status,"blocked");
  strictEqual(found.result.classification,"device-result-unavailable");
  deepStrictEqual(found.installationObservation.devices,{});
  deepStrictEqual(found.result.evidence.machine.deviceIdentities,[hashed]);
  strictEqual(projected.includes(raw),false);
});
test("completed Windows smoke with zero device measurements remains a hard privacy and verification failure",()=>{
  const obj=JSON.parse(sample());
  obj.installationObservation.devices={};
  throws(()=>projectPhysicalResultForEvidence(JSON.stringify(obj),raw,hashed),/privacy|installation|measurement/i);
});

test("original live timeout reconciles only the exact first read-only observed reply",()=>{
  const old=JSON.parse(sample());
  old.result.status="blocked";
  old.result.classification="device-result-unavailable";
  old.result.steps=[{index:0,stepId:"observe-windows-product",kind:"observe",status:"blocked",classification:"device-result-unavailable",matchedExpectation:false}];
  old.installationObservation.devices={};
  const expected={runId:"bvp-win-12345678-1234-4234-8234-1234567890ab",
    deviceId:raw,sourceCommit,artifactSha256:artifact,manifestSha256:manifest,
    scenarioId:scenario.id,commandId:"bvp-0123456789abcdef0123456789abcdef"};
  const reply={runId:expected.runId,deviceId:raw,sequence:1,commandId:expected.commandId,
    kind:"observe-product",status:"completed",classification:"product-observed",
    productStatus:{state:"idle"},validationBuild:{schemaVersion:1,sourceCommit,
      artifactSha256:artifact,manifestSha256:manifest}};
  validateOriginalWindowsTimeoutReconciliation(old,reply,expected);
  throws(()=>validateOriginalWindowsTimeoutReconciliation(old,{...reply,status:"failed"},expected),/reconcile/);
  throws(()=>validateOriginalWindowsTimeoutReconciliation(old,{...reply,deviceId:"device:ffffffffffffffffffffffffffffffff"},expected),/reconcile/);
  throws(()=>validateOriginalWindowsTimeoutReconciliation(old,{...reply,validationBuild:{...reply.validationBuild,artifactSha256:"d".repeat(64)}},expected),/reconcile/);
  throws(()=>validateOriginalWindowsTimeoutReconciliation({...old,result:{...old.result,status:"completed"}},reply,expected),/reconcile/);
  throws(()=>validateOriginalWindowsTimeoutReconciliation({...old,result:{...old.result,steps:[...old.result.steps,{stepId:"create-canary",status:"completed"}]}},reply,expected),/reconcile/);
});

test("Windows live captures are derived privately and omitted from PHX-CI transport without weakening machine evidence",()=>{
  const obj=JSON.parse(sample());
  obj.result.captures={
    product:{status:"idle",deviceIdentity:raw,vaultName:"PRIVATE_VAULT_NAME"},
    canary:{status:"present",exists:true,sizeBytes:77,hash:"8dcbdff420cef7b5075d718b025a3a0ee66c375bff66535741adb31282d53895",
      noteBody:"PRIVATE_NOTE_TEXT"},
  };
  obj.result.evidence.machine.observations=[
    {stepId:"observe-windows-product",captureAs:"product",value:{status:"idle"}},
    {stepId:"observe-canary",captureAs:"canary",value:{status:"present",exists:true,sizeBytes:77,
      hash:"8dcbdff420cef7b5075d718b025a3a0ee66c375bff66535741adb31282d53895"}},
  ];
  obj.result.evidence.machineJson=JSON.stringify(obj.result.evidence.machine);
  const projected=projectPhysicalResultForEvidence(JSON.stringify(obj),raw,hashed);
  const actual=JSON.parse(projected);
  deepStrictEqual(actual.result.captures,{});
  deepStrictEqual(actual.result.evidence.machine.observations,obj.result.evidence.machine.observations);
  strictEqual(actual.result.evidence.machineJson,JSON.stringify(actual.result.evidence.machine));
  strictEqual(projected.includes(raw),false);
  strictEqual(projected.includes("PRIVATE_VAULT_NAME"),false);
  strictEqual(projected.includes("PRIVATE_NOTE_TEXT"),false);
});
test("Windows capture projection fails closed on unsourced keys, divergent observed values and missing canonical proof",()=>{
  const obj=JSON.parse(sample());
  obj.result.captures={product:{status:"idle",privateData:"not publishable"}};
  obj.result.evidence.machine.observations=[
    {stepId:"observe-windows-product",captureAs:"product",value:{status:"idle"}},
  ];
  obj.result.evidence.machineJson=JSON.stringify(obj.result.evidence.machine);
  const tamper=(edit:(x:any)=>void):void=>{
    const candidate=JSON.parse(JSON.stringify(obj));
    edit(candidate);
    throws(()=>projectPhysicalResultForEvidence(JSON.stringify(candidate),raw,hashed),/privacy|capture|observation/);
  };
  tamper(x=>{x.result.captures.unregistered={secret:"hello"};});
  tamper(x=>{x.result.captures.product.status="failed";});
  tamper(x=>{x.result.evidence.machine.observations=[];});
  tamper(x=>{x.battery.name="unregistered";});
  tamper(x=>{x.result.scenarioId="not-registered";});
});
test("the latest physical attempt uses a PHX-only recovery path, not a second physical dispatch",()=>{
  const root=resolve(__dirname,"../../../..");
  const bridge=readFileSync(resolve(root,"test-platform/test/batteries/phxci-physical-bridge.ts"),"utf8");
  strictEqual(bridge.includes("--recover-privacy-blocked-windows-smoke"),true);
  strictEqual(bridge.includes('const oldPhx="9103e8af-eb3d-4579-bff9-6230ff0a6bec"'),true);
  strictEqual(bridge.includes('const evidenceSha="18d12ee3d3cd67dd36824ed78356da4d4e94d75a"'),true);
  strictEqual(bridge.includes('BVP_S09_ORIGINAL_PHYSICAL_EVIDENCE_RECOVERED status='),true);
  strictEqual(bridge.includes('rawCaptures=REDACTED'),true);
});

test("PHX-CI Windows operator resolves origin/master even from single-branch clones",()=>{
  const root=resolve(__dirname,"../../../..");
  const ps=readFileSync(resolve(root,"dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"),"utf8");
  strictEqual(ps.includes("'+refs/heads/master:refs/remotes/origin/master'"),true);
  strictEqual(ps.includes("'refs/remotes/origin/master^{commit}'"),true);
  strictEqual(ps.includes("-BaseRef 'origin/master'"),true);
  strictEqual(ps.includes("--reconcile-second-windows-timeout"),true);
  strictEqual(ps.includes("--run-approved-windows-smoke"),true);
});

test("PHX-CI Windows operator is singular, complete, and source-drift guarded", () => {
  const root = resolve(__dirname, "../../../..");
  const ps = readFileSync(resolve(root, "dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"), "utf8");
  const count = (pattern: RegExp): number => [...ps.matchAll(pattern)].length;
  strictEqual(count(/^\s*&\s*\$phxFrontDoor\s+-RepoRoot\b/gm), 2, "one software and one gated physical PHX invocation");
  strictEqual(count(/^\s*\$qualifiedCommand\s*=/gm), 1, "qualification command assigned once");
  strictEqual(count(/^\s*\$physicalCommand\s*=/gm), 1, "physical command assigned once");
  strictEqual(count(/^\s*\$remote\s*=\s*@\(/gm), 1, "remote identity is verified once");
  strictEqual(count(/^\s*\$base\s*=\s*@\(/gm), 1, "baseline identity is verified once");
  strictEqual(count(/^\s*\$unexpectedPublishedPaths\s*=/gm), 1, "physical dispatch is guarded against unqualified source drift");
  strictEqual(count(/^\s*\$confirmation\s*=\s*Read-Host\b/gm), 1, "only one owner authorization prompt");
  strictEqual(count(/^\s*if \(\$LASTEXITCODE -ne 0 -or \$base\.Count -ne 1 -or \$base\[0\]\.Trim\(\) -notmatch '\^\[a-f0-9\]\{40\}\$'\) \{$/gm), 1,
    "baseline SHA check must be complete and closed");
  strictEqual(count(/--reconcile-second-windows-timeout/g), 1, "prior timeout reconciled exactly once");
  strictEqual(count(/--run-approved-windows-smoke/g), 1, "new bounded smoke dispatched at most once");
  strictEqual(ps.trimEnd().endsWith("if ($code -ne 0) { Write-Warning 'PHX-CI did not pass; physical effects may be uncertain if a live run began. Do not retry without reconciling its original evidence.' }"), true,
    "no orphan tail after the final operator status");
});

test("PHX-CI Windows operator parses with the real PowerShell 7 AST without executing it", { skip: process.platform !== "win32" }, () => {
  const root = resolve(__dirname, "../../../..");
  const script = resolve(root, "dev/scripts/Invoke-PHXCI-S09-WindowsRelayCorrection.ps1");
  const quoted = script.replaceAll("'", "''");
  const parseOnly = [
    "$tokens = $null; $parseErrors = $null;",
    "[void][System.Management.Automation.Language.Parser]::ParseFile('" + quoted + "', [ref]$tokens, [ref]$parseErrors);",
    "if ($parseErrors.Count -ne 0) { foreach ($issue in $parseErrors) { [Console]::Error.WriteLine($issue.Message) }; exit 2 };",
  ].join(" ");
  const parsed = spawnSync("pwsh.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", parseOnly], {
    encoding: "utf8", windowsHide: true, timeout: 30000,
  });
  strictEqual(parsed.error, undefined, "PowerShell 7 AST parser must be available during Windows PHX-CI verification");
  strictEqual(parsed.status, 0, "PowerShell syntax errors: " + (parsed.stderr ?? "") + (parsed.stdout ?? ""));
});
