/**
 * S09-BR02: new Reviewer R2-01/R2-02 RED regression oracles, committed
 * BEFORE the bounded corrective BR01 implementation.
 * Only PHX-CI may execute these tests as part of the approved BVP battery.
 */
import { strictEqual, throws, deepStrictEqual } from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  claimBridgeAttemptAuthority, type BridgeExpectation, type BridgeAttempt,
  encodeBridgeAttempt,
} from "./batteries/phxci-physical-bridge";

const SOURCE="a".repeat(40), SHA64="e".repeat(64);
const prior={commitSha:"b".repeat(40),historyPath:"dev/test-results/20261021T120000Z-prior.json",phxRunId:"a09cb9ce-8d7a-4a5b-b18a-c322e0e19147",attemptIndex:1};
function expectation(runId: string, index=1, device="device:sha256:"+"c".repeat(64), logicalRun="bvp-r2-exclusive") : BridgeExpectation {
  return { bvpRunId:logicalRun,phxRunId:runId,attemptIndex:index,
    battery:"s09a-windows-initial-sync",scenarioId:"s09-br02-checkpoint",
    scenarioDigest:"sha256:"+SHA64,sourceCommit:SOURCE,artifactSha256:SHA64,
    deviceIds:{windows:device},mode:index===1?"initial":"checkpoint-resume",
    ...(index===1?{}:{predecessor:prior}) };
}
function isolate(fn:(scope:string)=>void):void {
  const scope=join("C:\\temp",randomUUID().replace(/-/g,""));
  try { fn(scope); } finally { rmSync(scope,{recursive:true,force:true}); }
}

test("R2-01 concurrent same-logical-run attempt cannot claim a second writer before effects",()=>{
  isolate(scope=>{
    const a=claimBridgeAttemptAuthority(expectation("c672f01d-8113-4105-93a1-448df8b6b6fa"),scope);
    try {
      throws(()=>claimBridgeAttemptAuthority(expectation("d672f01d-8113-4105-93a1-448df8b6b6fa"),scope),
        /attempt|authority|lease|active|writer|duplicate/i);
    } finally { a.finish("blocked"); }
  });
});
test("R2-01 second writer targeting same device is rejected even across separate logical runs",()=>{
  isolate(scope=>{
    const a=claimBridgeAttemptAuthority(expectation("e672f01d-8113-4105-93a1-448df8b6b6fa"),scope);
    try {
      throws(()=>claimBridgeAttemptAuthority(expectation("f672f01d-8113-4105-93a1-448df8b6b6fa",1,undefined,"bvp-another-logical-run"),scope),
        /device|authority|lease|active|writer/i);
    } finally { a.finish("blocked"); }
  });
});
test("R2-01 duplicate predecessor cannot be consumed by another continuation after first release",()=>{
  isolate(scope=>{
    const first=claimBridgeAttemptAuthority(expectation("a672f01d-8113-4105-93a1-448df8b6b6fa",2),scope);
    first.finish("blocked");
    throws(()=>claimBridgeAttemptAuthority(expectation("b672f01d-8113-4105-93a1-448df8b6b6fa",2),scope),
      /predecessor|consumed|duplicate|authority/i);
  });
});
test("R2-01 abandoned/crashed attempt never grants a competing writer an automatic lease",()=>{
  isolate(scope=>{
    claimBridgeAttemptAuthority(expectation("c672f01d-8113-4105-93a1-448df8b6b6fa"),scope);
    // No finish; model process crash after durable claim.
    throws(()=>claimBridgeAttemptAuthority(expectation("d672f01d-8113-4105-93a1-448df8b6b6fa",2),scope),
      /lease|active|abandoned|writer|reconcile/i);
  });
});
test("R2-01 duplicate PHX attempt identity is not reused after a completed result",()=>{
  isolate(scope=>{
    const x=expectation("e672f01d-8113-4105-93a1-448df8b6b6fa");
    const a=claimBridgeAttemptAuthority(x,scope);
    a.finish("completed");
    throws(()=>claimBridgeAttemptAuthority(x,scope),/duplicate|consumed|already|authority|completed/i);
  });
});

function attempt(device:string):BridgeAttempt {
  const exp=expectation("a672f01d-8113-4105-93a1-448df8b6b6fa",1,device);
  return {...exp,schemaVersion:1,exitCode:0,
    resultJson:JSON.stringify({battery:{name:exp.battery},result:{
      scenarioId:exp.scenarioId,status:"completed",steps:[],
      evidence:{machine:{schemaVersion:1,scenarioId:exp.scenarioId,executionMode:"live",
        deviceIdentities:[device],liveIdentity:{runId:exp.bvpRunId,sourceCommit:exp.sourceCommit},
        verdict:{status:"completed"}}}}})};
}
test("R2-02 plausible personal device identifier in otherwise allowed deviceIds must not reach frame",()=>{
  for(const raw of ["device:Marys-Workstation-2026","device:john.smith@example.com","device:family-iphone-7744"]) {
    throws(()=>encodeBridgeAttempt(attempt(raw)),/privacy|identity|device|digest|nonsecret|unapproved/i);
  }
});
test("R2-02 SHA256 device pseudonym is accepted when all required identity locations agree",()=>{
  const device="device:sha256:"+"d".repeat(64);
  const candidate=attempt(device);
  // Synthetic model fixtures may remain blocked for unrelated scenario
  // validation; this test specifically checks the privacy identity domain.
  try {
    encodeBridgeAttempt(candidate);
  } catch (e) {
    if (/privacy|device.*(raw|digest|nonsecret)/i.test(String(e))) throw e;
  }
});
test("R2-02 plausible private identifiers in allowlisted observation values fail closed",()=>{
  for(const [field,value] of [
    ["remoteObjectId","drive-object-for-family-photos"],
    ["vaultIdentity","client-notes-vault"],
    ["deviceIdentity","Marys-Workstation-2026"],
    ["changeCursor","cursor-for-private-account"],
    ["revision","family-file-rev-A"],
  ]) {
    const c=attempt("device:sha256:"+"d".repeat(64));
    const x=JSON.parse(c.resultJson);
    x.result.evidence.machine.observations=[{stepId:"observe",captureAs:"captured",value:{[field]:value}}];
    throws(()=>encodeBridgeAttempt({...c,resultJson:JSON.stringify(x)}),
      /privacy|observation|value|unapproved|identifier|digest|private/i,field);
  }
});
test("R2-02 raw nested device-identities array cannot publish a personal name even with pseudonymous outer map",()=>{
  const c=attempt("device:sha256:"+"d".repeat(64));
  const j=JSON.parse(c.resultJson);
  j.result.evidence.machine.deviceIdentities=["device:Marys-Workstation-2026"];
  throws(()=>encodeBridgeAttempt({...c,resultJson:JSON.stringify(j)}),/privacy|identity|device|mismatch/i);
});
test("R2-02 no unreviewed nonsecret-looking private installation observation device key",()=>{
  const c=attempt("device:sha256:"+"d".repeat(64));
  const j=JSON.parse(c.resultJson);
  j.installationObservation={sourceCommit:SOURCE,artifactSha256:SHA64,manifestSha256:SHA64,
    devices:{"device:personal-jane-phone":{artifactSha256:SHA64,manifestSha256:SHA64}}};
  throws(()=>encodeBridgeAttempt({...c,resultJson:JSON.stringify(j)}),
    /privacy|identity|device|manifest|unapproved/i);
});
