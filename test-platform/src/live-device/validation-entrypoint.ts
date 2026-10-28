import { createBoundedDeviceCommandAgent, type DeviceFixturePort, type DeviceSequenceState, type DeviceSequenceStateStore, type ValidationBuildIdentity } from "./device-command-agent";
import { createDriveCommandMailbox, createWindowsMailboxRelay, pollDeviceMailboxOnce, type AuthenticatedDriveRequest } from "./drive-mailbox";
import { bvpDiagnostic, diagnosticCode, type BvpDiagnostic } from "./diagnostic-contract";
import { BvpRuntimeErrorJournal } from "../bvp-runtime-error-journal";
import { MailboxUnavailableError } from "./drive-mailbox";

export const BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL = "BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL";
export const BVP_VALIDATION_BUILD_GLOBAL = "__BRAIN_BVP_VALIDATION_BUILD__";
export const BVP_MAILBOX_RUNTIME_GLOBAL = "__BRAIN_BVP_MAILBOX_RUNTIME__";

export interface BvpValidationBuildIdentity extends ValidationBuildIdentity { readonly sentinel: typeof BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL; }
interface ValidationAdapter { exists(path:string):Promise<boolean>; mkdir(path:string):Promise<void>; list(path:string):Promise<{files:string[];folders:string[]}>; read(path:string):Promise<string>; write(path:string,value:string):Promise<void>; readBinary(path:string):Promise<ArrayBuffer>; writeBinary(path:string,value:ArrayBuffer):Promise<void>; rename(from:string,to:string):Promise<void>; remove(path:string):Promise<void>; stat(path:string):Promise<{type:string;size:number}|null>; }
interface ValidationRuntimeOptions { readonly adapter:ValidationAdapter; readonly root:string; readonly deviceId:string; readonly validationBuild:ValidationBuildIdentity; readonly production?:()=>Parameters<typeof createBoundedDeviceCommandAgent>[0]["production"]; readonly relay:boolean; }
const stateKey=(root:string,runId:string,deviceId:string)=>"brain-bvp-sequence:"+encodeURIComponent(root+"|"+runId+"|"+deviceId);
const sameState=(a:DeviceSequenceState|undefined,b:DeviceSequenceState|undefined)=>JSON.stringify(a)===JSON.stringify(b);
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value)) as T;
async function ensureParent(adapter:ValidationAdapter,path:string){const parts=path.split("/");parts.pop();let current="";for(const part of parts){current=current?current+"/"+part:part;if(!await adapter.exists(current))await adapter.mkdir(current);}}
async function sha256(bytes:ArrayBuffer):Promise<string>{const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");}

class LocalStorageSequenceStore implements DeviceSequenceStateStore {
  constructor(private readonly key:string,private readonly storage:Storage){}
  async load(){const raw=this.storage.getItem(this.key);return raw?JSON.parse(raw) as DeviceSequenceState:undefined;}
  async compareAndSave(_run:string,_device:string,expected:DeviceSequenceState|undefined,next:DeviceSequenceState){const raw=this.storage.getItem(this.key),current=raw?JSON.parse(raw) as DeviceSequenceState:undefined;if(!sameState(current,expected))return false;this.storage.setItem(this.key,JSON.stringify(next));return true;}
}
class VaultFixturePort implements DeviceFixturePort {
  constructor(private readonly adapter:ValidationAdapter){}
  async putText(path:string,text:string){await ensureParent(this.adapter,path);await this.adapter.write(path,text);}
  async putPattern(path:string,byteLength:number,seed:string){await ensureParent(this.adapter,path);const bytes=new Uint8Array(byteLength);let x=2166136261;for(const ch of seed)x=Math.imul(x^ch.charCodeAt(0),16777619)>>>0;for(let i=0;i<bytes.length;i++){x=(Math.imul(x,1664525)+1013904223)>>>0;bytes[i]=x&255;}await this.adapter.writeBinary(path,bytes.buffer);}
  async remove(path:string){if(await this.adapter.exists(path))await this.adapter.remove(path);}
  async observe(path:string){if(!await this.adapter.exists(path))return{exists:false};const stat=await this.adapter.stat(path);if(!stat||stat.type!=="file")return{exists:true};const bytes=await this.adapter.readBinary(path);return{exists:true,sizeBytes:stat.size,sha256:await sha256(bytes)};}
}

export function installBvpValidationBuildIdentity(sourceCommit:string):BvpValidationBuildIdentity {
  if(!/^[0-9a-f]{40}$/i.test(sourceCommit))throw new Error("validation artifact source commit must be a full Git SHA");
  const identity:BvpValidationBuildIdentity=Object.freeze({schemaVersion:1,sourceCommit:sourceCommit.toLowerCase(),sentinel:BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL});
  Object.defineProperty(globalThis,BVP_VALIDATION_BUILD_GLOBAL,{value:identity,configurable:true,enumerable:false,writable:false});return identity;
}
export async function installBvpMailboxRuntime(request:AuthenticatedDriveRequest,options:ValidationRuntimeOptions){
  const mailbox=createDriveCommandMailbox(request),relay=options.relay?createWindowsMailboxRelay(mailbox,options.adapter,options.root,{mode:"reporter"}):undefined;
  let activeRunId:string|undefined,polling:Promise<Awaited<ReturnType<typeof pollDeviceMailboxOnce>>>|undefined;
  const journal=new BvpRuntimeErrorJournal(options.adapter,options.root);
  let ticking:Promise<void>|undefined;
  async function pollCore(){activeRunId=undefined;const runId=await mailbox.activeRun(options.deviceId);if(!runId)return{status:"ok" as const,processed:0};activeRunId=runId;if(!globalThis.localStorage)return{status:"unavailable" as const,processed:0,reason:"device-sequence-storage-unavailable",diagnostic:bvpDiagnostic({
      classification:"device-sequence-storage-unavailable",component:"device-agent",phase:"sequence-storage-preflight",
      lastConfirmedBoundary:"active-run-read",firstUnconfirmedBoundary:"durable-sequence-storage",effect:"none-confirmed",
      recommendedAction:"enable-device-sequence-storage"})};
    // Installed file bytes, not caller-supplied claims or controller build output.
    const installedRoot=options.root.replace(/\\/g,"/").replace(/\/\.bvp-relay$/,"");
    if(!/\/plugins\/[A-Za-z0-9._-]+$/.test(installedRoot))throw new Error("validation-installed-plugin-root-invalid");
    const artifactSha256=await sha256(await options.adapter.readBinary(installedRoot+"/main.js")),manifestSha256=await sha256(await options.adapter.readBinary(installedRoot+"/manifest.json"));
    const measuredBuild:ValidationBuildIdentity={...options.validationBuild,artifactSha256,manifestSha256};
    const agent=createBoundedDeviceCommandAgent({runId,deviceId:options.deviceId,fixtureRoot:"BVP-VALIDATION/"+runId,fixtures:new VaultFixturePort(options.adapter),sequenceState:new LocalStorageSequenceStore(stateKey(options.root,runId,options.deviceId),globalThis.localStorage),production:options.production?.(),validationBuild:measuredBuild});return pollDeviceMailboxOnce(mailbox,agent,runId,options.deviceId);}
  function pollDeviceOnce(){if(polling)return polling;polling=pollCore().finally(()=>{polling=undefined;});return polling;}
  function unexpected(component:"device-agent"|"windows-relay"|"drive-mailbox",phase:string,error:unknown):BvpDiagnostic{
    const classification=error instanceof MailboxUnavailableError?diagnosticCode(error.message):"bvp-unexpected-runtime-failure";
    return bvpDiagnostic({classification,component,phase,
      lastConfirmedBoundary:"timer-entered",firstUnconfirmedBoundary:"runtime-operation-complete",
      effect:"unknown",recommendedAction:"inspect-device-journal"});
  }
  async function tickCore():Promise<void>{
    let failed=false;
    const source=()=>({runId:activeRunId??null,deviceId:options.deviceId});
    try{const result=await pollDeviceOnce();if(result.status==="unavailable"){failed=true;await journal.record(result.diagnostic,source());}}
    catch(error){failed=true;await journal.record(unexpected("device-agent","device-poll",error),source());}
    if(relay)try{const result=await relay.pumpOnce();if(result.status==="unavailable"&&result.diagnostic){failed=true;await journal.record(result.diagnostic,{runId:null,deviceId:options.deviceId});}}
    catch(error){failed=true;await journal.record(unexpected("windows-relay","relay-pump",error),{runId:null,deviceId:options.deviceId});}
    if(!failed){
      const recovered=bvpDiagnostic({classification:"bvp-runtime-poll-recovered",component:"device-agent",
        phase:"poll-recovery",lastConfirmedBoundary:"mailbox-poll-completed",firstUnconfirmedBoundary:"none",
        effect:"none-confirmed",recommendedAction:"none"});
      await journal.recover(recovered,source());
      await journal.recover(recovered,{runId:null,deviceId:options.deviceId});
      if(await journal.acquireDeliveryWindow()){
        try{
          await journal.flush(entry=>mailbox.publishDiagnostic(entry.origin!.runId,entry.origin!.deviceId!,entry),()=>mailbox.reserveDiagnosticId());
        }catch(error){
          // A transport error is local-only to avoid recursively reporting its own failed delivery.
          await journal.record(unexpected("drive-mailbox","diagnostic-publication",error),{runId:null,deviceId:options.deviceId});
        }
      }
    }
  }
  function pollAndReportOnce():Promise<void>{if(ticking)return ticking;ticking=tickCore().finally(()=>{ticking=undefined;});return ticking;}
  const value=Object.freeze({mailbox,relay,journal,deviceId:options.deviceId,currentRunId:()=>activeRunId,pollDeviceOnce,pollAndReportOnce});
  Object.defineProperty(globalThis,BVP_MAILBOX_RUNTIME_GLOBAL,{value,configurable:true,enumerable:false,writable:false});return value;
}
