/**
 * Reviewer-F05: REAL BRIDGE+RUNNER / SIMULATED DEVICE, PHX-CI ONLY.
 *
 * This is test-only glue, NEVER a production/physical launcher. The worker
 * executes actual BVP device-command-agent fixture commands on disposable
 * C:\temp files and cannot open a live vault, network or Drive. PHX-CI
 * owns all authoritative verification and Git evidence publication.
 *
 * Phase 1: checkpoint -> exit3 BLOCKED original publication.
 * Phase 2: immutable original source+PHX report -> same run resumed, only
 * post-checkpoint action executed -> exit0 eligible PASS.
 */
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, win32 } from "node:path";
import { getLiveBattery } from "./battery-registry";
import { scenarioDefinitionDigest } from "../../src/scenario/scenario-checkpoint";
import { createBoundedDeviceCommandAgent, type DeviceCommand, type DeviceFixturePort, type DeviceSequenceState, type DeviceSequenceStateStore } from "../../src/live-device/device-command-agent";
import type { BridgeAttempt, BridgeExpectation, BridgePredecessor } from "./phxci-physical-bridge";

const NAME = "s09-br02-simulated-checkpoint";
let RUN = "bvp-br02-actual-runner-no-physical-devices";
const DEVICE = "device:simulated-windows";
const GUID = /^[a-f0-9]{32}$/i;
const SHA = /^[a-f0-9]{40}$/i;
const HEX64 = /^[a-f0-9]{64}$/i;
function fault(code: string): never { throw new Error("br02-actual-runner-" + code); }
function digest(bytes: Buffer|string): string { return createHash("sha256").update(bytes).digest("hex"); }
function opt(name: string): string {
  const index = process.argv.indexOf(name);
  const val = index >= 0 ? process.argv[index+1] : undefined;
  if (!val || val.startsWith("--")) fault("missing-"+name.slice(2));
  return val;
}
function git(...args: string[]): string {
  const x=spawnSync("git",args,{encoding:"utf8",timeout:15000,windowsHide:true,maxBuffer:1024*1024});
  if(x.error||x.status!==0||!x.stdout)fault("git-read-unavailable");
  return x.stdout.trim();
}
function phxIdentity(): {id:string;head:string} {
  if(!process.env.PHX_VERIFICATION_CONTEXT_PATH_INTERNAL)fault("phx-context-required");
  const x=JSON.parse(readFileSync(".phx-ci/run.json","utf8"));
  const t=JSON.parse(readFileSync(".phx-ci/records/typecheck.json","utf8"));
  if(typeof x.runId!=="string"||t.runId!==x.runId||t.result!=="PASS")fault("phx-stage-identity");
  return {id:x.runId,head:git("rev-parse","HEAD")};
}
function safeRoot(value: string): string {
  const p=win32.normalize(value);
  if(process.platform!=="win32"||!/^C:\\temp\\[a-f0-9]{32}$/i.test(p)||
    value.includes("..")||value.startsWith("\\\\"))fault("nonphysical-scratch-invalid");
  return p;
}
function storePaths(root: string) {
  return {
    installed:join(root,"installed"),relay:join(root,"relay"),
    log:join(root,"simulated-device-events.jsonl"),
    identity:join(root,"installed","build-identity.json"),
    source:join(root,"installed","source-identity.txt"),
  };
}
function proof(root:string,source:string) {
  const p=storePaths(root);
  mkdirSync(p.installed,{recursive:true});mkdirSync(p.relay,{recursive:true});
  if(!existsSync(p.source)) {
    writeFileSync(p.source,source+"\n",{flag:"wx"});
    writeFileSync(join(p.installed,"main.js"),"SIMULATED_DEVICE_BINARY_SOURCE="+source+"\n",{flag:"wx"});
    writeFileSync(join(p.installed,"manifest.json"),'{"id":"br02-disposable-only","version":"0.0.0-synthetic"}\n',{flag:"wx"});
  }
  if(readFileSync(p.source,"utf8").trim()!==source)fault("original-source-changed");
  const artifactSha256=digest(readFileSync(join(p.installed,"main.js")));
  const manifestSha256=digest(readFileSync(join(p.installed,"manifest.json")));
  const identity={schemaVersion:1,sourceCommit:source,artifactSha256,manifestSha256};
  if(existsSync(p.identity)){
    if(JSON.stringify(JSON.parse(readFileSync(p.identity,"utf8")))!==JSON.stringify(identity))fault("installed-proof-changed");
  }else writeFileSync(p.identity,JSON.stringify(identity)+"\n",{flag:"wx"});
  return identity;
}
function effects(root:string): string[] {
  const p=storePaths(root).log;
  return existsSync(p)?readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean):[];
}
async function worker(): Promise<void> {
  const root=safeRoot(opt("--root"));
  RUN="bvp-br02-"+win32.basename(root);
  const source=opt("--source");
  if(!SHA.test(source))fault("worker-source-invalid");
  const identity=proof(root,source);
  const relay=storePaths(root).relay;
  const deviceDir=join(root,"simulated-device-only");
  mkdirSync(deviceDir,{recursive:true});
  const stateFile=join(root,"simulated-sequence-state.json");
  const fixture:DeviceFixturePort={
    async putText(path,text){
      if(!/^BVP-VALIDATION\/[a-zA-Z0-9._:-]+\/br02-sim-(?:before|after)\.txt$/.test(path))fault("fixture-path-outside");
      writeFileSync(join(deviceDir,basename(path)),text,{flag:"wx"});
      appendFileSync(storePaths(root).log,basename(path)+"\n");
    },
    async putPattern(){fault("pattern-operation-forbidden");},
    async remove(){fault("delete-operation-forbidden");},
    async observe(path){
      const f=join(deviceDir,basename(path));
      if(!existsSync(f))return{exists:false};
      const bytes=readFileSync(f);
      return{exists:true,sizeBytes:bytes.byteLength,sha256:digest(bytes)};
    },
  };
  const state:DeviceSequenceStateStore={
    async load(){return existsSync(stateFile)?JSON.parse(readFileSync(stateFile,"utf8")) as DeviceSequenceState:undefined;},
    async compareAndSave(_r,_d,expected,next){
      const current=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,"utf8")):undefined;
      if(JSON.stringify(current)!==JSON.stringify(expected))return false;
      writeFileSync(stateFile,JSON.stringify(next)+"\n");
      return true;
    },
  };
  const agent=createBoundedDeviceCommandAgent({
    runId:RUN,deviceId:DEVICE,fixtureRoot:"BVP-VALIDATION/"+RUN,
    fixtures:fixture,sequenceState:state,
    validationBuild:{schemaVersion:1,sourceCommit:source,
      artifactSha256:identity.artifactSha256,manifestSha256:identity.manifestSha256},
  });
  const out=join(relay,"outbox"),sent=join(relay,"sent"),inbox=join(relay,"inbox");
  for(const p of [out,sent,inbox])mkdirSync(p,{recursive:true});
  const until=Date.now()+115000;
  while(Date.now()<until){
    for(const name of readdirSync(out).filter(x=>/^bvp-[a-f0-9]{32}\.json$/.test(x))){
      const src=join(out,name),processing=join(sent,name);
      if(!existsSync(src))continue;
      renameSync(src,processing);
      const command=JSON.parse(readFileSync(processing,"utf8")) as DeviceCommand;
      const result=await agent.execute(command);
      writeFileSync(join(inbox,name+".result.json"),JSON.stringify(result)+"\n",{flag:"wx"});
      rmSync(processing);
    }
    await new Promise<void>(resolve=>setTimeout(resolve,20));
  }
}
async function main():Promise<void> {
  const phase=process.argv[2];
  if(phase==="worker"){await worker();return;}
  if(phase!=="checkpoint"&&phase!=="continue")fault("phase-invalid");
  const {id:phxRun,head}=phxIdentity();
  const root=safeRoot(opt("--root"));
  RUN="bvp-br02-"+win32.basename(root);
  const prior=phase==="continue"?{
    sha:opt("--prior-commit"),path:opt("--prior-path"),
    id:opt("--prior-run-id"),source:opt("--original-source"),
  }:undefined;
  if(prior && (!SHA.test(prior.sha)||!SHA.test(prior.source)||
    !prior.path.startsWith("dev/test-results/")||!prior.path.endsWith(".json")||
    !/^[a-f0-9-]{36}$/i.test(prior.id)||prior.id===phxRun))fault("prior-identity-invalid");
  const source=prior?.source??head;
  const installed=proof(root,source),paths=storePaths(root);
  // The test-only registry is inaccessible absent BOTH PHX-CI and this
  // explicit simulation scope; it is never enumerated as a physical battery.
  process.env.BVP_NONPHYSICAL_SIMULATION="YES";
  const definition=getLiveBattery(NAME);
  if(!definition)fault("registered-simulation-missing");
  const expected:BridgeExpectation={
    bvpRunId:RUN,phxRunId:phxRun,attemptIndex:prior?2:1,
    battery:NAME,scenarioId:definition.createScenario().id,
    scenarioDigest:scenarioDefinitionDigest(definition.createScenario()),
    sourceCommit:source,artifactSha256:installed.artifactSha256,
    deviceIds:{windows:DEVICE},mode:prior?"checkpoint-resume":"initial",
    ...(prior?{predecessor:{
      commitSha:prior.sha,historyPath:prior.path,phxRunId:prior.id,attemptIndex:1,
    } as BridgePredecessor}:{}),
  };
  const before=effects(root);
  if(phase==="continue"&&(before.length!==1||before[0]!=="br02-sim-before.txt"))fault("first-effect-record-unexpected");
  const request={
    schemaVersion:1,executionClass:"nonphysical-simulation",expectation:expected,
    paths:{
      relayRoot:paths.relay,
      checkpointFile:join(root,prior?"checkpoint-second.json":"checkpoint-first.json"),
      resultFile:join(root,prior?"result-second.json":"result-first.json"),
      buildIdentityFile:paths.identity,
    },
    ...(prior?{prior:{
      commitSha:prior.sha,historyPath:prior.path,currentHead:head,
    },resumeEvidence:["human-confirmation"]}:{}),
  };
  const requestFile=join(root,prior?"request-second.json":"request-first.json");
  writeFileSync(requestFile,JSON.stringify(request)+"\n",{flag:"wx"});
  const workerChild=spawn(process.execPath,[__filename,"worker","--root",root,"--source",source],{
    cwd:process.cwd(),windowsHide:true,stdio:"ignore",detached:false,
  });
  try {
    const bridge=join(__dirname,"phxci-physical-bridge.js");
    const child=spawnSync(process.execPath,[bridge,"--bridge-request-file",requestFile],{
      cwd:process.cwd(),encoding:"utf8",maxBuffer:1024*1024,
      timeout:100000,windowsHide:true,
      env:{...process.env,BVP_NONPHYSICAL_SIMULATION:"YES",BVP_OWNER_PHYSICAL_APPROVAL:""},
    });
    if(child.error||child.status!==(prior?0:3))fault("bridge-or-runner-verdict-invalid");
    const frames=(child.stdout??"").split(/\r?\n/).filter(x=>x.startsWith("BVP-PHXCI-BRIDGE-V1 "));
    if(frames.length!==1)fault("bridge-did-not-emit-frame");
    const frame=JSON.parse(Buffer.from(frames[0]!.split(" ")[1]??"","base64url").toString("utf8")) as BridgeAttempt;
    if(frame.phxRunId!==phxRun||frame.sourceCommit!==source||
      frame.attemptIndex!==(prior?2:1)||frame.exitCode!==(prior?0:3)||
      frame.bvpRunId!==RUN)fault("bridge-attempt-identity-invalid");
    const after=effects(root);
    if(after.length!==(prior?2:1)||after[0]!=="br02-sim-before.txt"||
      (prior&&after[1]!=="br02-sim-after.txt"))fault("device-effect-replay-or-missing");
    process.stdout.write(frames[0]+"\n");
    process.exitCode=prior?0:3;
  } finally {workerChild.kill();}
}
main().catch(e=>{
  const label=e instanceof Error&&/^br02-actual-runner-[a-z-]+$/.test(e.message)?e.message:"br02-actual-runner-unclassified";
  process.stderr.write("BR02_ACTUAL_RUNNER_BLOCKED "+label+"\n");
  process.exitCode=1;
});
