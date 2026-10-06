import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { createScenarioCheckpoint, decodeScenarioCheckpoint, encodeScenarioCheckpoint, validateScenarioCheckpointForResume, type ScenarioCheckpoint, type ScenarioResumeEvidence } from "../scenario/scenario-checkpoint";
import type { ScenarioAssertionStep, ScenarioCheckpointStep, ScenarioDefinition, ScenarioStep } from "../scenario/scenario-contract";
import { assertScenarioObservation } from "../scenario/scenario-evidence";
import type { ScenarioCapabilityResult, ScenarioExecutorContext, ScenarioStepExecution, ScenarioStepExecutor } from "../scenario/scenario-runner";
import type { DeviceCommand, DeviceCommandResult } from "./device-command-agent";

export interface HumanCheckpointInstruction {
  readonly action: string; readonly device: string; readonly stopCondition: string;
  readonly requiredEvidence: readonly ScenarioResumeEvidence[]; readonly nextSafeAction: string;
}
export interface LiveScenarioExecutorOptions {
  readonly scenario: ScenarioDefinition; readonly runId: string; readonly deviceIds: Readonly<Record<string, string>>;
  readonly relayRoot: string; readonly checkpointFile: string;
  readonly checkpoints?: Readonly<Record<string, HumanCheckpointInstruction>>;
  readonly resumeEvidence?: readonly ScenarioResumeEvidence[];
  readonly expectedValidationSourceCommit: string;
  readonly resultTimeoutMs?: number; readonly pollIntervalMs?: number;
}
export interface LiveScenarioExecutor extends ScenarioStepExecutor { pendingCheckpoint(): HumanCheckpointInstruction | undefined; }

type RelayResult = DeviceCommandResult | null | undefined;
const sleep=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const fail=(status:"failed"|"blocked"|"unsupported",classification:string,reason?:string):ScenarioCapabilityResult=>({status,classification,...(reason===undefined?{}:{reason})});
const exists=async(path:string):Promise<boolean>=>stat(path).then(()=>true,()=>false);
const authorityPath=(root:string,deviceId:string)=>join(root,"controller-authority",createHash("sha256").update(deviceId).digest("hex")+".json");
interface ControllerAuthority { readonly schemaVersion:1; readonly generation:number; readonly runId:string|null; readonly deviceId:string; }
function authority(value:unknown,deviceId:string):ControllerAuthority|undefined{const v=value as Partial<ControllerAuthority>|null;return v&&v.schemaVersion===1&&v.deviceId===deviceId&&Number.isSafeInteger(v.generation)&&Number(v.generation)>=0&&(v.runId===null||typeof v.runId==="string")?v as ControllerAuthority:undefined;}
async function withAuthorityLock<T>(path:string,action:()=>Promise<T>):Promise<T>{let handle;try{handle=await open(path+".lock","wx");}catch{throw new Error("live-controller-authority-busy");}try{return await action();}finally{await handle.close();await rm(path+".lock",{force:true});}}
const checkpointKey=(step:ScenarioCheckpointStep):string=>step.operation==="capture"?step.checkpointId:step.checkpointRef??step.id;
const stepDevice=(step:ScenarioStep):string|undefined=>"device" in step&&typeof step.device==="string"?step.device:undefined;
const commandCount=(step:ScenarioStep):number=>
  step.kind==="fixture"&&((step.operation==="put-local-file"&&step.content.encoding==="utf8")||step.operation==="remove-local")?1:
  step.kind==="production"&&(step.operation==="synchronize"||step.operation==="reconcile")?2:
  step.kind==="production"&&step.operation!=="automatic-sync"?1:
  step.kind==="external-state"&&step.transition==="request-cancellation"&&!step.boundary?1:
  step.kind==="observe"&&(step.subject==="local-entry"||step.subject==="device-state")?1:0;

function sequenceFor(scenario:ScenarioDefinition,device:string,index:number,sub=0):number{
  let value=sub+1;
  for(let i=0;i<index;i++)if(stepDevice(scenario.steps[i]!)===device)value+=commandCount(scenario.steps[i]!);
  return value;
}
function commandId(runId:string,scenarioId:string,index:number,sub:number):string{
  return "bvp-"+createHash("sha256").update(`${runId}\0${scenarioId}\0${index}\0${sub}`).digest("hex").slice(0,32);
}
function correlated(command:DeviceCommand,result:DeviceCommandResult,sourceCommit:string):boolean{
  return result.validationBuild?.schemaVersion===1&&result.validationBuild.sourceCommit===sourceCommit&&command.runId===result.runId&&command.deviceId===result.deviceId&&command.sequence===result.sequence&&command.commandId===result.commandId&&command.kind===result.kind;
}
function transportFailure(value:RelayResult):ScenarioCapabilityResult|undefined{
  return value===undefined?fail("blocked","device-result-unavailable"):value===null?fail("failed","result-correlation-mismatch"):undefined;
}
function resultOutcome(result:DeviceCommandResult):ScenarioCapabilityResult{
  if(result.status!=="completed")return fail(result.status==="rejected"?"blocked":"failed",result.classification);
  if(result.kind!=="production-execute")return{status:"completed",value:result};
  const terminal=result.receipt?.terminal;
  if(terminal==="complete")return{status:"completed",value:result};
  if(terminal==="blocked"||terminal==="deferred"||terminal==="recovery-required")return fail("blocked",result.classification);
  return fail("failed",result.classification||"production-terminal-not-complete");
}
function crossCheckpointCapture(scenario:ScenarioDefinition,index:number):string|undefined{
  const prior=new Set<string>();
  for(let i=0;i<index;i++){const step=scenario.steps[i]!;if("captureAs" in step&&typeof step.captureAs==="string")prior.add(step.captureAs);}
  for(let i=index+1;i<scenario.steps.length;i++){const step=scenario.steps[i]!;if("inputRef" in step&&typeof step.inputRef==="string"&&prior.has(step.inputRef))return step.inputRef;if("observationRef" in step&&typeof step.observationRef==="string"&&prior.has(step.observationRef))return step.observationRef;}
  return undefined;
}

export async function createLiveScenarioExecutor(options:LiveScenarioExecutorOptions):Promise<LiveScenarioExecutor>{
  const labels=Object.keys(options.deviceIds),deviceIdentities=labels.map(label=>options.deviceIds[label]!).sort();
  if(!options.scenario.executionModes.includes("live"))throw new Error("live-execution-mode-unavailable");
  if(!options.runId||options.runId.length>128||!/^[0-9a-f]{40}$/i.test(options.expectedValidationSourceCommit)||deviceIdentities.some(value=>!value||value.length>128)||new Set(deviceIdentities).size!==deviceIdentities.length)throw new Error("live-executor-identity-invalid");
  const timeout=options.resultTimeoutMs??30_000,poll=options.pollIntervalMs??250;
  if(timeout<0||poll<=0)throw new Error("live-executor-timing-invalid");
  const out=join(options.relayRoot,"outbox"),sent=join(options.relayRoot,"sent"),inbox=join(options.relayRoot,"inbox");
  await mkdir(out,{recursive:true});await mkdir(join(options.relayRoot,"controller-authority"),{recursive:true});
  const leasedDevices=[...new Set(options.scenario.steps.map(stepDevice).filter((label):label is string=>Boolean(label)).map(label=>options.deviceIds[label]).filter((value):value is string=>Boolean(value)))].sort(),authorityFiles=new Map<string,string>(),activated=new Set<string>();
  try{for(const deviceId of leasedDevices){const path=authorityPath(options.relayRoot,deviceId);authorityFiles.set(deviceId,path);await withAuthorityLock(path,async()=>{let current:ControllerAuthority|undefined;if(await exists(path)){try{current=authority(JSON.parse(await readFile(path,"utf8")),deviceId);}catch{}if(!current)throw new Error("live-controller-authority-invalid");}if(current?.runId&&current.runId!==options.runId)throw new Error("live-controller-device-run-conflict");if(current?.runId===options.runId)return;const next:ControllerAuthority={schemaVersion:1,generation:(current?.generation??0)+1,runId:options.runId,deviceId},temp=path+"."+options.runId+".tmp";await writeFile(temp,JSON.stringify(next),"utf8");await rename(temp,path);activated.add(deviceId);});}}catch(error){for(const deviceId of activated){const path=authorityFiles.get(deviceId)!;await withAuthorityLock(path,async()=>{const current=authority(JSON.parse(await readFile(path,"utf8")),deviceId);if(current?.runId===options.runId){await writeFile(path,JSON.stringify({...current,runId:null}),"utf8");}}).catch(()=>undefined);}throw error;}
  let pending:HumanCheckpointInstruction|undefined,resume:ScenarioCheckpoint|undefined,resumeFailure:string|undefined;
  const history:ScenarioStepExecution[]=[];
  if(await exists(options.checkpointFile)){
    const decoded=decodeScenarioCheckpoint(await readFile(options.checkpointFile,"utf8"));
    if(!decoded.ok)resumeFailure=decoded.classification;
    else{const checked=validateScenarioCheckpointForResume(decoded.value,{scenario:options.scenario,runId:options.runId,executionMode:"live",deviceIdentities,sourceIdentity:options.expectedValidationSourceCommit});if(!checked.ok)resumeFailure=checked.classification;else{const i=checked.value.nextStepIndex-1,target=options.scenario.steps[i];if(i<0||target?.kind!=="checkpoint"||checkpointKey(target)!==checked.value.checkpointId)resumeFailure="checkpoint-execution-context-mismatch";else resume=checked.value;}}
  }

  async function roundTrip(command:DeviceCommand):Promise<RelayResult>{
    const name=`${command.commandId}.json`,outPath=join(out,name),sentPath=join(sent,name),resultPath=join(inbox,`${name}.result.json`);
    if(!await exists(outPath)&&!await exists(sentPath)&&!await exists(resultPath)){
      const temp=join(options.relayRoot,`.${name}.tmp`);await writeFile(temp,JSON.stringify(command),"utf8");await rename(temp,outPath);
    }
    const deadline=Date.now()+timeout;
    while(Date.now()<=deadline){
      if(await exists(resultPath)){
        let result:DeviceCommandResult;try{result=JSON.parse(await readFile(resultPath,"utf8")) as DeviceCommandResult;}catch{await rm(resultPath,{force:true});return null;}
        await rm(resultPath,{force:true});return correlated(command,result,options.expectedValidationSourceCommit.toLowerCase())?result:null;
      }
      await sleep(poll);
    }
    return undefined;
  }
  async function send(step:ScenarioStep,context:ScenarioExecutorContext,body:Record<string,unknown>,sub=0):Promise<RelayResult>{
    const label=stepDevice(step);if(!label)return null;
    const deviceId=options.deviceIds[label];if(!deviceId)return undefined;
    const command={runId:options.runId,deviceId,sequence:sequenceFor(options.scenario,label,context.stepIndex,sub),commandId:commandId(options.runId,options.scenario.id,context.stepIndex,sub),...body} as DeviceCommand;
    return roundTrip(command);
  }
  function remember(index:number,step:ScenarioStep,result:ScenarioCapabilityResult):ScenarioCapabilityResult{
    history.push({index,stepId:step.id,kind:step.kind,status:result.status,...("classification" in result?{classification:result.classification}:{}),matchedExpectation:true});return result;
  }
  function replay(index:number):ScenarioCapabilityResult{
    const prior=resume?.results.find(item=>item.index===index);if(!prior)return fail("blocked","checkpoint-prior-result-missing");if(prior.status==="completed")return{status:"completed"};return fail(prior.status,prior.classification??"checkpoint-prior-result");
  }
  async function humanCheckpoint(step:ScenarioCheckpointStep,context:ScenarioExecutorContext):Promise<ScenarioCapabilityResult>{
    const key=checkpointKey(step),instruction=options.checkpoints?.[key];
    if(!instruction)return fail("unsupported","human-checkpoint-unbound",key);
    const checkpointIndex=resume?resume.nextStepIndex-1:-1;
    if(resume&&context.stepIndex===checkpointIndex){
      const supplied=new Set(options.resumeEvidence??[]);pending=instruction;
      if(resume.checkpointId!==key||resume.requiredResumeEvidence.some(item=>!supplied.has(item)))return fail("blocked","human-checkpoint-awaiting-evidence",key);
      pending=undefined;return{status:"completed"};
    }
    const dependency=crossCheckpointCapture(options.scenario,context.stepIndex);
    if(dependency)return fail("unsupported","checkpoint-crosses-capture-dependency",dependency);
    const current:ScenarioStepExecution={index:context.stepIndex,stepId:step.id,kind:step.kind,status:"blocked",classification:"human-checkpoint-required",matchedExpectation:false};
    const created=createScenarioCheckpoint({checkpointId:key,scenario:options.scenario,runId:options.runId,executionMode:"live",nextStepIndex:context.stepIndex+1,disposition:"awaiting-resume",steps:[...history,current],deviceIdentities,requiredResumeEvidence:instruction.requiredEvidence,sourceIdentity:options.expectedValidationSourceCommit});
    if(!created.ok)return fail("failed",created.classification);
    await mkdir(dirname(options.checkpointFile),{recursive:true});await writeFile(options.checkpointFile,encodeScenarioCheckpoint(created.value),"utf8");
    pending=instruction;return fail("blocked","human-checkpoint-required",key);
  }

  return{
    executionMode:"live",deviceIdentities,runIdentity:options.runId,buildIdentity:options.expectedValidationSourceCommit.toLowerCase(),pendingCheckpoint:()=>pending,
    async dispose(){if(pending)return;for(const [deviceId,path] of authorityFiles)await withAuthorityLock(path,async()=>{let current:ControllerAuthority|undefined;try{current=authority(JSON.parse(await readFile(path,"utf8")),deviceId);}catch{}if(current?.runId===options.runId){const temp=path+".next";await writeFile(temp,JSON.stringify({...current,runId:null}),"utf8");await rename(temp,path);}});},
    async execute(step,context){
      let result:ScenarioCapabilityResult;
      if(resumeFailure)result=fail("blocked",resumeFailure);
      else if(resume&&context.stepIndex<resume.nextStepIndex-1)result=replay(context.stepIndex);
      else if(step.kind==="checkpoint")result=await humanCheckpoint(step,context);
      else if(step.kind==="assert")result=await assertScenarioObservation(step as ScenarioAssertionStep,context);
      else if(step.kind==="fixture"&&step.operation==="put-local-file"&&step.content.encoding==="utf8"){
        const r=await send(step,context,{kind:"fixture-put",path:step.path,content:{type:"text",text:step.content.value}}),f=transportFailure(r);result=f??resultOutcome(r as DeviceCommandResult);
      }else if(step.kind==="fixture"&&step.operation==="remove-local"){
        const r=await send(step,context,{kind:"fixture-remove",path:step.path}),f=transportFailure(r);result=f??resultOutcome(r as DeviceCommandResult);
      }else if(step.kind==="production"&&step.operation==="execute-reviewed-plan"){
        const plan=context.readCapture(step.inputRef) as {planId?:string}|undefined;
        if(!plan?.planId)result=fail("blocked","missing-required-result",step.inputRef);
        else{const r=await send(step,context,{kind:"production-execute",planId:plan.planId}),f=transportFailure(r);result=f??resultOutcome(r as DeviceCommandResult);}
      }else if(step.kind==="production"&&(step.operation==="preview"||step.operation==="synchronize"||step.operation==="reconcile")){
        const first=await send(step,context,{kind:"production-preview",mode:step.operation==="reconcile"?"verify-reconcile":"manual"}),f=transportFailure(first);
        if(f)result=f;else if((first as DeviceCommandResult).status!=="completed"||!(first as DeviceCommandResult).plan)result=resultOutcome(first as DeviceCommandResult);
        else if(step.operation==="preview")result={status:"completed",value:(first as DeviceCommandResult).plan};
        else{const plan=(first as DeviceCommandResult).plan!;const second=await send(step,context,{kind:"production-execute",planId:plan.planId},1),sf=transportFailure(second);result=sf??resultOutcome(second as DeviceCommandResult);}
      }else if(step.kind==="external-state"&&step.transition==="request-cancellation"&&!step.boundary){
        const r=await send(step,context,{kind:"production-control",action:"cancel-active-sync"}),f=transportFailure(r);result=f??resultOutcome(r as DeviceCommandResult);
      }else if(step.kind==="observe"&&step.subject==="local-entry"){
        const r=await send(step,context,{kind:"observe-file",path:step.path}),f=transportFailure(r);
        if(f)result=f;else if((r as DeviceCommandResult).status!=="completed")result=resultOutcome(r as DeviceCommandResult);
        else{const fixture=(r as DeviceCommandResult).fixture;result={status:"completed",value:{status:fixture?.exists?"present":"absent",exists:fixture?.exists??false,...(fixture?.sizeBytes===undefined?{}:{sizeBytes:fixture.sizeBytes}),...(fixture?.sha256?{hash:fixture.sha256}:{})}};}
      }else if(step.kind==="observe"&&step.subject==="device-state"){
        const r=await send(step,context,{kind:"observe-product"}),f=transportFailure(r);result=f??((r as DeviceCommandResult).status==="completed"?{status:"completed",value:(r as DeviceCommandResult).productStatus}:resultOutcome(r as DeviceCommandResult));
      }else if(step.kind==="observe"&&(step.subject==="production-plan"||step.subject==="production-result")){
        const value=context.readCapture(step.inputRef);result=value===undefined?fail("blocked","missing-required-result",step.inputRef):{status:"completed",value};
      }else result=fail("unsupported","live-capability-unsupported",step.kind);
      return remember(context.stepIndex,step,result);
    },
  };
}
