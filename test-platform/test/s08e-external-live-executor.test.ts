import { doesNotMatch, deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { decodeScenarioCheckpoint } from "../src/scenario/scenario-checkpoint";
import { defineScenario, type ScenarioDefinition } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import type { DeviceCommand, DeviceCommandResult } from "../src/live-device/device-command-agent";
import { createLiveScenarioExecutor, type HumanCheckpointInstruction } from "../src/live-device/live-scenario-executor";

const sourceCommit="a".repeat(40),validationBuild={schemaVersion:1 as const,sourceCommit};
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const scenario=(id:string,steps:ScenarioDefinition["steps"]):ScenarioDefinition=>defineScenario({id,description:"S08E live executor fixture",traceability:{targets:[{kind:"requirement",id:"REQ-S08E-LIVE"}]},executionModes:["live"],steps});
async function root(){return mkdtemp(join(tmpdir(),"brain-s08e-"));}
async function nextCommand(relay:string):Promise<{command:DeviceCommand;name:string}>{
  const out=join(relay,"outbox");for(let i=0;i<1000;i++){const names=await readdir(out).catch(()=>[]);const name=names.find(v=>v.endsWith(".json"));if(name){const command=JSON.parse(await readFile(join(out,name),"utf8")) as DeviceCommand;await mkdir(join(relay,"sent"),{recursive:true});await rename(join(out,name),join(relay,"sent",name));return{command,name};}await delay(1);}throw new Error("command-timeout");
}
async function respond(relay:string,build:(command:DeviceCommand)=>DeviceCommandResult):Promise<DeviceCommand>{
  const {command,name}=await nextCommand(relay),result=build(command);await mkdir(join(relay,"inbox"),{recursive:true});await writeFile(join(relay,"inbox",name+".result.json"),JSON.stringify(result),"utf8");await rm(join(relay,"sent",name),{force:true});return command;
}
const baseResult=(command:DeviceCommand,extra:Partial<DeviceCommandResult>={}):DeviceCommandResult=>({validationBuild,runId:command.runId,deviceId:command.deviceId,sequence:command.sequence,commandId:command.commandId,kind:command.kind,status:"completed",classification:"completed",...extra});
const options=(s:ScenarioDefinition,r:string,relay:string,checkpoint:string,extra:Record<string,unknown>={})=>({scenario:s,runId:r,deviceIds:{"device-a":"physical-a","device-b":"physical-b"},relayRoot:relay,checkpointFile:checkpoint,expectedValidationSourceCommit:sourceCommit,resultTimeoutMs:1000,pollIntervalMs:1,...extra});

test("external controller atomically serializes competing device runs and advances generation",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("lease-race",[{id:"observe",kind:"observe",subject:"device-state",device:"device-a",captureAs:"state"}]),make=(runId:string)=>createLiveScenarioExecutor(options(s,runId,relay,join(dir,runId+".json")));
  const attempts=await Promise.allSettled([make("run-a"),make("run-b")]),fulfilled=attempts.filter((value):value is PromiseFulfilledResult<Awaited<ReturnType<typeof createLiveScenarioExecutor>>>=>value.status==="fulfilled"),rejected=attempts.filter((value):value is PromiseRejectedResult=>value.status==="rejected");
  strictEqual(fulfilled.length,1);strictEqual(rejected.length,1);strictEqual(/live-controller-(?:authority-busy|device-run-conflict)/.test(String(rejected[0]!.reason)),true);
  const authority=join(relay,"controller-authority",createHash("sha256").update("physical-a").digest("hex")+".json"),active=JSON.parse(await readFile(authority,"utf8"));strictEqual(active.generation,1);strictEqual(["run-a","run-b"].includes(active.runId),true);strictEqual((await readdir(join(relay,"outbox"))).length,0);
  await fulfilled[0]!.value.dispose?.();const released=JSON.parse(await readFile(authority,"utf8"));strictEqual(released.runId,null);strictEqual(released.generation,1);
  const next=await make("run-c"),generation2=JSON.parse(await readFile(authority,"utf8"));strictEqual(generation2.runId,"run-c");strictEqual(generation2.generation,2);await next.dispose?.();await rm(dir,{recursive:true,force:true});
});

test("live executor maps local fixture, production preview/execute, observation, and assertion in exact sequence",async()=>{const dir=await root(),relay=join(dir,"relay"),cp=join(dir,"state","cp.json"),s=scenario("flow",[
  {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"note.md",content:{encoding:"utf8",value:"hello"}},
  {id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},
  {id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan",captureAs:"result"},
  {id:"observe",kind:"observe",subject:"local-entry",device:"device-a",path:"note.md",captureAs:"local"},
  {id:"assert",kind:"assert",assertion:"exists",observationRef:"local",expected:true},
]);const executor=await createLiveScenarioExecutor(options(s,"run-flow",relay,cp)),run=new DeterministicScenarioRunner({},executor).run(s);
  const c1=await respond(relay,c=>baseResult(c,{classification:"fixture-verified",fixture:{exists:true,sizeBytes:5,sha256:"a".repeat(64)}}));
  const c2=await respond(relay,c=>baseResult(c,{classification:"production-preview-ready",plan:{planId:"plan-1",trigger:"manual",operationCount:1,executionDisposition:"reviewable",recoveryCheckpointRequired:false,globalExecutionGate:"open"}}));
  const c3=await respond(relay,c=>baseResult(c,{classification:"production-complete",receipt:{runId:"prod-1",trigger:"manual",planId:"plan-1",terminal:"complete",physicalEffectsCommittedAndVerified:true,committedOperationCount:1,skippedOperationCount:0,reasonCode:"completed"} as any}));
  const c4=await respond(relay,c=>baseResult(c,{classification:"fixture-observed",fixture:{exists:true,sizeBytes:5,sha256:"a".repeat(64)}}));
  const result=await run;strictEqual(result.status,"completed");deepStrictEqual([c1.kind,c2.kind,c3.kind,c4.kind],["fixture-put","production-preview","production-execute","observe-file"]);deepStrictEqual([c1.sequence,c2.sequence,c3.sequence,c4.sequence],[1,2,3,4]);strictEqual(c1.deviceId,"physical-a");strictEqual(result.evidence?.machine.executionMode,"live");deepStrictEqual(result.evidence?.machine.liveIdentity,{runId:"run-flow",sourceCommit});strictEqual((result.captures.local as any).exists,true);await rm(dir,{recursive:true,force:true});
});

test("production uncertainty propagates as failure rather than transport success",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("uncertain",[{id:"sync",kind:"production",device:"device-a",operation:"synchronize"}]),executor=await createLiveScenarioExecutor(options(s,"run-u",relay,join(dir,"cp.json"))),run=new DeterministicScenarioRunner({},executor).run(s);
  await respond(relay,c=>baseResult(c,{classification:"production-preview-ready",plan:{planId:"p",trigger:"manual",operationCount:1,executionDisposition:"reviewable",recoveryCheckpointRequired:false,globalExecutionGate:"open"}}));
  await respond(relay,c=>baseResult(c,{classification:"production-uncertain",receipt:{runId:"prod-u",trigger:"manual",planId:"p",terminal:"uncertain",physicalEffectsCommittedAndVerified:false,committedOperationCount:0,skippedOperationCount:0,reasonCode:"uncertain"} as any}));
  const result=await run;strictEqual(result.status,"failed");strictEqual(result.classification,"production-uncertain");await rm(dir,{recursive:true,force:true});
});

test("wrong-device result fails correlation and missing result blocks",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("correlation",[{id:"observe",kind:"observe",subject:"local-entry",device:"device-a",path:"x.md",captureAs:"x"}]),executor=await createLiveScenarioExecutor(options(s,"run-c",relay,join(dir,"cp.json"))),run=new DeterministicScenarioRunner({},executor).run(s);
  await respond(relay,c=>({...baseResult(c,{classification:"fixture-observed",fixture:{exists:false}}),deviceId:"wrong"}));const bad=await run;strictEqual(bad.status,"failed");strictEqual(bad.classification,"result-correlation-mismatch");
  const missingRelay=join(dir,"relay2"),missingExec=await createLiveScenarioExecutor({...options(s,"run-missing",missingRelay,join(dir,"cp2.json")),resultTimeoutMs:5});const missing=await new DeterministicScenarioRunner({},missingExec).run(s);strictEqual(missing.status,"blocked");strictEqual(missing.classification,"device-result-unavailable");await rejects(()=>createLiveScenarioExecutor(options(s,"run-after-timeout",missingRelay,join(dir,"cp3.json"))),/live-controller-device-run-conflict/);await rm(dir,{recursive:true,force:true});
});

test("result from a different validation source fails exact correlation",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("wrong-build",[{id:"observe",kind:"observe",subject:"local-entry",device:"device-a",path:"x.md",captureAs:"x"}]),executor=await createLiveScenarioExecutor(options(s,"run-build",relay,join(dir,"cp.json"))),run=new DeterministicScenarioRunner({},executor).run(s);
  await respond(relay,c=>baseResult(c,{validationBuild:{schemaVersion:1,sourceCommit:"b".repeat(40)},classification:"fixture-observed",fixture:{exists:false}}));const result=await run;strictEqual(result.status,"failed");strictEqual(result.classification,"result-correlation-mismatch");await rm(dir,{recursive:true,force:true});
});

test("stale-sequence result also fails exact correlation",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("stale-sequence",[{id:"observe",kind:"observe",subject:"local-entry",device:"device-a",path:"x.md",captureAs:"x"}]),executor=await createLiveScenarioExecutor(options(s,"run-s",relay,join(dir,"cp.json"))),run=new DeterministicScenarioRunner({},executor).run(s);
  await respond(relay,c=>({...baseResult(c,{classification:"fixture-observed",fixture:{exists:false}}),sequence:c.sequence+1}));const result=await run;strictEqual(result.status,"failed");strictEqual(result.classification,"result-correlation-mismatch");await rm(dir,{recursive:true,force:true});
});

test("iOS termination checkpoint resumes with no device-local runner state",async()=>{const dir=await root(),relay=join(dir,"relay"),cp=join(dir,"ios.json"),s=scenario("ios-lifecycle",[{id:"restart",kind:"checkpoint",operation:"restart-device",device:"device-b",checkpointRef:"ios-restart"}]),instruction:HumanCheckpointInstruction={action:"Terminate and relaunch Obsidian on iOS",device:"physical-b",stopCondition:"Obsidian process is terminated",requiredEvidence:["human-confirmation"],nextSafeAction:"Resume the external runner"};
  const firstExec=await createLiveScenarioExecutor(options(s,"run-ios",relay,cp,{checkpoints:{"ios-restart":instruction}}));const first=await new DeterministicScenarioRunner({},firstExec).run(s);strictEqual(first.status,"blocked");strictEqual(first.classification,"human-checkpoint-required");
  const resumedExec=await createLiveScenarioExecutor(options(s,"run-ios",relay,cp,{checkpoints:{"ios-restart":instruction},resumeEvidence:["human-confirmation"]}));const resumed=await new DeterministicScenarioRunner({},resumedExec).run(s);strictEqual(resumed.status,"completed");strictEqual((await readdir(join(relay,"outbox"))).length,0);await rm(dir,{recursive:true,force:true});
});

test("human checkpoint persists only S05D state and resumes in a new executor without replaying mutation",async()=>{const dir=await root(),relay=join(dir,"relay"),cp=join(dir,"state","checkpoint.json"),s=scenario("resume",[
  {id:"seed",kind:"fixture",operation:"put-local-file",device:"device-a",path:"resume.md",content:{encoding:"utf8",value:"v1"}},
  {id:"offline",kind:"checkpoint",operation:"capture",checkpointId:"network-offline"},
  {id:"observe",kind:"observe",subject:"local-entry",device:"device-a",path:"resume.md",captureAs:"local"},
]);const instruction:HumanCheckpointInstruction={action:"Disable network access",device:"physical-a",stopCondition:"Device is offline",requiredEvidence:["human-confirmation"],nextSafeAction:"Observe local fixture after resume"};
  const firstExec=await createLiveScenarioExecutor(options(s,"run-r",relay,cp,{checkpoints:{"network-offline":instruction}})),firstRun=new DeterministicScenarioRunner({},firstExec).run(s);const firstCommand=await respond(relay,c=>baseResult(c,{classification:"fixture-verified",fixture:{exists:true,sizeBytes:2,sha256:"b".repeat(64)}}));strictEqual(firstCommand.sequence,1);const first=await firstRun;strictEqual(first.status,"blocked");strictEqual(first.classification,"human-checkpoint-required");deepStrictEqual(firstExec.pendingCheckpoint(),instruction);
  const encoded=await readFile(cp,"utf8");doesNotMatch(encoded,/Disable network|Device is offline|Observe local fixture/);const decoded=decodeScenarioCheckpoint(encoded);strictEqual(decoded.ok,true);if(decoded.ok)strictEqual(decoded.value.nextStepIndex,2);
  const waitingExec=await createLiveScenarioExecutor(options(s,"run-r",relay,cp,{checkpoints:{"network-offline":instruction}}));const waiting=await new DeterministicScenarioRunner({},waitingExec).run(s);strictEqual(waiting.status,"blocked");strictEqual(waiting.classification,"human-checkpoint-awaiting-evidence");strictEqual((await readdir(join(relay,"outbox"))).length,0);
  const resumedExec=await createLiveScenarioExecutor(options(s,"run-r",relay,cp,{checkpoints:{"network-offline":instruction},resumeEvidence:["human-confirmation"]})),resumedRun=new DeterministicScenarioRunner({},resumedExec).run(s);const resumedCommand=await respond(relay,c=>baseResult(c,{classification:"fixture-observed",fixture:{exists:true,sizeBytes:2,sha256:"b".repeat(64)}}));strictEqual(resumedCommand.kind,"observe-file");strictEqual(resumedCommand.sequence,2);const resumed=await resumedRun;strictEqual(resumed.status,"completed");strictEqual((resumed.captures.local as any).exists,true);await rm(dir,{recursive:true,force:true});
});

test("stale checkpoint identity and cross-checkpoint capture dependency fail closed",async()=>{const dir=await root(),relay=join(dir,"relay"),cp=join(dir,"cp.json"),simple=scenario("cp-id",[{id:"cp",kind:"checkpoint",operation:"capture",checkpointId:"cp"}]),instruction:HumanCheckpointInstruction={action:"Restart app",device:"physical-a",stopCondition:"App stopped",requiredEvidence:["human-confirmation"],nextSafeAction:"Resume"};
  const creator=await createLiveScenarioExecutor(options(simple,"run-a",relay,cp,{checkpoints:{cp:instruction}}));const blocked=await new DeterministicScenarioRunner({},creator).run(simple);strictEqual(blocked.classification,"human-checkpoint-required");
  await rejects(()=>createLiveScenarioExecutor(options(simple,"run-b",relay,cp,{checkpoints:{cp:instruction},resumeEvidence:["human-confirmation"]})),/live-controller-device-run-conflict/);
  const dep=scenario("dep",[{id:"preview",kind:"production",device:"device-a",operation:"preview",captureAs:"plan"},{id:"cp",kind:"checkpoint",operation:"capture",checkpointId:"cp"},{id:"execute",kind:"production",device:"device-a",operation:"execute-reviewed-plan",inputRef:"plan"}]),depRelay=join(dir,"relay-dep"),depFile=join(dir,"dep.json"),depExec=await createLiveScenarioExecutor(options(dep,"run-dep",depRelay,depFile,{checkpoints:{cp:instruction}})),depRun=new DeterministicScenarioRunner({},depExec).run(dep);await respond(depRelay,c=>baseResult(c,{classification:"production-preview-ready",plan:{planId:"p",trigger:"manual",operationCount:0,executionDisposition:"reviewable",recoveryCheckpointRequired:false,globalExecutionGate:"open"}}));const depResult=await depRun;strictEqual(depResult.status,"unsupported");strictEqual(depResult.classification,"checkpoint-crosses-capture-dependency");strictEqual(await readFile(depFile,"utf8").then(()=>true,()=>false),false);await rm(dir,{recursive:true,force:true});
});

test("cancellation maps to production control",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("cancel",[
  {id:"cancel",kind:"external-state",transition:"request-cancellation",device:"device-a"},
]);const executor=await createLiveScenarioExecutor(options(s,"run-x",relay,join(dir,"cp.json"))),run=new DeterministicScenarioRunner({},executor).run(s);const command=await respond(relay,c=>baseResult(c,{classification:"production-control-accepted"}));strictEqual(command.kind,"production-control");strictEqual((command as any).action,"cancel-active-sync");strictEqual(command.sequence,1);const result=await run;strictEqual(result.status,"completed");await rm(dir,{recursive:true,force:true});
});

test("arbitrary bytes remain unsupported without emitting a device command",async()=>{const dir=await root(),relay=join(dir,"relay"),s=scenario("bytes",[
  {id:"bytes",kind:"fixture",operation:"put-local-file",device:"device-a",path:"binary.bin",content:{encoding:"bytes",value:[0,1]}},
]);const executor=await createLiveScenarioExecutor(options(s,"run-b",relay,join(dir,"cp.json"))),result=await new DeterministicScenarioRunner({},executor).run(s);strictEqual(result.status,"unsupported");strictEqual(result.classification,"live-capability-unsupported");strictEqual((await readdir(join(relay,"outbox"))).length,0);await rm(dir,{recursive:true,force:true});
});
