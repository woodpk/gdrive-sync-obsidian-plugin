import type { BoundedDeviceCommandAgent, DeviceCommand, DeviceCommandResult } from "./device-command-agent";
import type { RuntimeErrorRecord } from "../bvp-runtime-error-journal";
import { bvpDiagnostic, diagnosticCode, opaqueDiagnosticId, type BvpDiagnostic, type BvpDiagnosticInput } from "./diagnostic-contract";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_NAME = "BRAIN BVP Mailbox";
const MAX_RECORD_BYTES = 128 * 1024;

export type AuthenticatedDriveRequest = (url: string, init?: RequestInit) => Promise<Response>;
export class MailboxUnavailableError extends Error { constructor(message = "mailbox-unavailable") { super(message); this.name = "MailboxUnavailableError"; } }

interface MailboxFile { id: string; size?: string; createdTime?:string; appProperties?: Record<string,string>; }
interface FileList { files?: MailboxFile[]; nextPageToken?: string; }
interface Header { runId: string; deviceId: string; sequence: number; commandId: string; }
interface RelayAdapter {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  list(path: string): Promise<{ files: string[]; folders: string[] }>;
  read(path: string): Promise<string>;
  write(path: string, value: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** OS-exclusive, cross-process Windows BVP controller lock. Absent on mobile/browser. */
  withExclusiveDiagnosticDevice?<T>(deviceId:string,action:()=>Promise<T>):Promise<T>;
}

function obj(value: unknown): Record<string, any> | undefined { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : undefined; }
function header(value: unknown): Header | undefined {
  const v=obj(value); if(!v || typeof v.runId!=="string" || !v.runId || v.runId.length>128 || typeof v.deviceId!=="string" || !v.deviceId || v.deviceId.length>128 || !Number.isSafeInteger(v.sequence) || v.sequence<=0 || typeof v.commandId!=="string" || !v.commandId || v.commandId.length>128) return undefined;
  return {runId:v.runId,deviceId:v.deviceId,sequence:v.sequence,commandId:v.commandId};
}
function command(value: unknown): DeviceCommand | undefined {
  const v=obj(value), h=header(v); if(!v||!h||typeof v.kind!=="string") return undefined;
  const base={...h,kind:v.kind} as any;
  if(v.kind==="fixture-put"){ const c=obj(v.content); if(typeof v.path!=="string"||!c) return; if(c.type==="text"&&typeof c.text==="string") return {...base,path:v.path,content:{type:"text",text:c.text}}; if(c.type==="pattern"&&Number.isSafeInteger(c.byteLength)&&c.byteLength>=0&&typeof c.seed==="string") return {...base,path:v.path,content:{type:"pattern",byteLength:c.byteLength,seed:c.seed}}; return; }
  if((v.kind==="fixture-remove"||v.kind==="observe-file")&&typeof v.path==="string") return {...base,path:v.path};
  if(v.kind==="production-preview"&&(v.mode==="manual"||v.mode==="verify-reconcile")) return {...base,mode:v.mode};
  if(v.kind==="production-execute"&&typeof v.planId==="string") return {...base,planId:v.planId};
  if(v.kind==="production-control"&&["pause","resume","cancel-active-sync"].includes(v.action)) return {...base,action:v.action};
  if(v.kind==="observe-product") return base;
  return undefined;
}
const RESULT_KINDS=new Set(["fixture-put","fixture-remove","observe-file","production-preview","production-execute","production-control","observe-product","invalid"]);
function result(value: unknown): DeviceCommandResult | undefined {
  const v=obj(value), h=header(v),build=obj(v?.validationBuild); if(!v||!h||!build||build.schemaVersion!==1||typeof build.sourceCommit!=="string"||!/^[0-9a-f]{40}$/i.test(build.sourceCommit)||typeof v.kind!=="string"||!RESULT_KINDS.has(v.kind)||typeof v.status!=="string"||typeof v.classification!=="string"||!["completed","rejected","failed"].includes(v.status)) return undefined;
  // Same bounded classification allowlist applies to a remote result and its diagnosis.
  const safeClassification=diagnosticCode(v.classification);
  const rawDiagnostic=obj(v.diagnostic);
  const diagnostic=rawDiagnostic?.schemaVersion===1?bvpDiagnostic(rawDiagnostic as BvpDiagnosticInput):undefined;
  return {validationBuild:{schemaVersion:1,sourceCommit:build.sourceCommit.toLowerCase(),...(typeof build.artifactSha256==="string"&&/^[a-f0-9]{64}$/i.test(build.artifactSha256)&&typeof build.manifestSha256==="string"&&/^[a-f0-9]{64}$/i.test(build.manifestSha256)?{artifactSha256:build.artifactSha256.toLowerCase(),manifestSha256:build.manifestSha256.toLowerCase()}:{})},...h,kind:v.kind as DeviceCommandResult["kind"],status:v.status as DeviceCommandResult["status"],classification:safeClassification,...(v.replayed===true?{replayed:true as const}:{}),...(v.plan?{plan:structuredClone(v.plan)}:{}),...(v.actionResult?{actionResult:structuredClone(v.actionResult)}:{}),...(v.receipt?{receipt:structuredClone(v.receipt)}:{}),...(v.productStatus?{productStatus:structuredClone(v.productStatus)}:{}),...(v.fixture?{fixture:structuredClone(v.fixture)}:{}),...(diagnostic?{diagnostic}:{})};
}
function cleanDiagnostic(value:unknown):RuntimeErrorRecord|undefined{
  const v=obj(value),d=obj(v?.diagnostic);
  if(!v||v.schemaVersion!==1||typeof v.eventId!=="string"||!/^[0-9a-f-]{36}$/.test(v.eventId)||
    typeof v.firstAt!=="string"||typeof v.lastAt!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(v.firstAt)||
    !/^\d{4}-\d{2}-\d{2}T/.test(v.lastAt)||!Number.isSafeInteger(v.occurrences)||v.occurrences<1||!d||d.schemaVersion!==1)return undefined;
  const sanitized=bvpDiagnostic(d as BvpDiagnosticInput);
  // Untrusted diagnostic fields must match the exact reduced safe contract; never publish raw extras.
  if(JSON.stringify(d)!==JSON.stringify(sanitized))return undefined;
  return{schemaVersion:1,eventId:v.eventId,firstAt:v.firstAt,lastAt:v.lastAt,occurrences:v.occurrences,diagnostic:sanitized};
}
function same(a: Header,b: Header): boolean { return a.runId===b.runId&&a.deviceId===b.deviceId&&a.sequence===b.sequence&&a.commandId===b.commandId; }
function sensitive(value:unknown):boolean{if(!value||typeof value!=="object")return false;if(Array.isArray(value))return value.some(sensitive);return Object.entries(value as Record<string,unknown>).some(([k,v])=>/^(access[_-]?token|refresh[_-]?token|authorization[_-]?code|client[_-]?secret|code[_-]?verifier|password|passcode|token)$/i.test(k)||sensitive(v));}
function jsonBytes(value: unknown): { text:string; bytes:number } { const text=JSON.stringify(value); return {text,bytes:new TextEncoder().encode(text).byteLength}; }
function escapeQuery(value:string):string{return value.replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
function baseName(path:string):string{return path.split("/").filter(Boolean).at(-1)??"record.json";}
interface ControllerAuthority { readonly schemaVersion:1; readonly generation:number; readonly runId:string|null; readonly deviceId:string; }
function controllerAuthority(value:unknown,deviceId:string):ControllerAuthority|undefined{const v=obj(value);return v?.schemaVersion===1&&v.deviceId===deviceId&&Number.isSafeInteger(v.generation)&&v.generation>=0&&(v.runId===null||typeof v.runId==="string")?v as unknown as ControllerAuthority:undefined;}
async function controllerAuthorityPath(root:string,deviceId:string):Promise<string>{const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(deviceId)),key=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");return `${root}/controller-authority/${key}.json`;}

export interface DriveCommandMailbox {
  publishResult(value: DeviceCommandResult): Promise<void>;
  reserveDiagnosticId():Promise<string>;
  archiveVerifiedDiagnostic(deviceId:string,eventId:string,archiveId:string):Promise<{status:"verified";eventId:string;sha256:string}>;
  publishDiagnostic(runId:string|null,deviceId:string,value:RuntimeErrorRecord):Promise<void>;
  diagnosticsForDevice(deviceId:string,pageToken?:string):Promise<{entries:RuntimeErrorRecord[];agedEventIds?:string[];nextPageToken?:string}>;
  diagnostics(runId:string,deviceId:string):Promise<RuntimeErrorRecord[]>;
  commands(runId: string, deviceId: string): Promise<DeviceCommand[]>;
  resultFor(value: DeviceCommand): Promise<DeviceCommandResult | undefined>;
  activeRun(deviceId: string): Promise<string | undefined>;
  cleanup(runId: string, deviceId: string): Promise<number>;
}

interface DiagnosticAttestation {
  readonly schemaVersion:1;readonly disposition:"acknowledged"|"resolved";
  readonly deviceId:string;readonly runId:string|null;readonly eventId:string;
  readonly sha256:string;readonly controllerGeneration:number;
}
interface DiagnosticControllerOps {
  pending(deviceId:string):Promise<{runId:string|null;value:RuntimeErrorRecord}|undefined>;
  verify(proof:DiagnosticAttestation):Promise<void>;
  admit(runId:string|null,deviceId:string,value:RuntimeErrorRecord):Promise<void>;
  retire(proof:DiagnosticAttestation):Promise<void>;
}
const controllerOps=new WeakMap<DriveCommandMailbox,DiagnosticControllerOps>();

export function createDriveCommandMailbox(request: AuthenticatedDriveRequest): DriveCommandMailbox {
  let root: Promise<string> | undefined;
  async function call(url:string,init?:RequestInit,cursorRequest=false):Promise<Response>{
    try{
      const response=await request(url,init);
      if(response.ok)return response;
      if(cursorRequest&&(response.status===400||response.status===410))
        throw new MailboxUnavailableError("mailbox-diagnostic-cursor-expired");
      const code=response.status===401?"mailbox-drive-unauthorized":
        response.status===403?"mailbox-drive-forbidden":
        response.status===429?"mailbox-drive-rate-limited":
        response.status>=500?"mailbox-drive-provider-unavailable":"mailbox-drive-request-rejected";
      throw new MailboxUnavailableError(code);
    }catch(error){
      if(error instanceof MailboxUnavailableError)throw error;
      // Never interpolate the raw transport error, URL, response body or credentials.
      throw new MailboxUnavailableError("mailbox-drive-transport-unavailable");
    }
  }
  async function rootId():Promise<string>{return root??=(async()=>{const q=encodeURIComponent("trashed = false and appProperties has { key='brainBvpMailbox' and value='1' }");const found=await call(`${API}/files?q=${q}&spaces=drive&pageSize=10&fields=files(id,name,appProperties)`);const files=((await found.json()) as FileList).files??[];if(files.length>1)throw new MailboxUnavailableError("mailbox-root-ambiguous");if(files[0])return files[0].id;const created=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:ROOT_NAME,mimeType:FOLDER_MIME,appProperties:{brainBvpMailbox:"1"}})});const value=await created.json() as {id?:string};if(!value.id)throw new MailboxUnavailableError("mailbox-root-create-invalid");return value.id;})().catch(error=>{root=undefined;throw error;});}
  async function bindingListing(deviceId:string):Promise<FileList>{const parent=await rootId();const q=encodeURIComponent(`'${escapeQuery(parent)}' in parents and trashed = false and appProperties has { key='brainBvpRecord' and value='1' } and appProperties has { key='brainBvpKind' and value='run-binding' } and appProperties has { key='brainBvpDeviceId' and value='${escapeQuery(deviceId)}' }`);const response=await call(`${API}/files?q=${q}&spaces=drive&pageSize=20&fields=nextPageToken,files(id,appProperties)`);const page=await response.json() as FileList;if(page.nextPageToken)throw new MailboxUnavailableError("mailbox-run-binding-overflow");return page;}
  const bindingGeneration=(file:MailboxFile):number|undefined=>{const value=Number(file.appProperties?.brainBvpGeneration);return Number.isSafeInteger(value)&&value>0?value:undefined;};
  async function activeRun(deviceId:string):Promise<string|undefined>{const files=(await bindingListing(deviceId)).files??[];if(!files.length)return undefined;const parsed=files.map(file=>({run:file.appProperties?.brainBvpRunId,generation:bindingGeneration(file)}));if(parsed.some(value=>!value.run||value.generation===undefined))throw new MailboxUnavailableError("mailbox-run-binding-invalid");const max=Math.max(...parsed.map(value=>value.generation!)),runs=[...new Set(parsed.filter(value=>value.generation===max).map(value=>value.run!))];if(runs.length!==1)throw new MailboxUnavailableError("mailbox-run-binding-ambiguous");return runs[0];}
  async function deleteFile(id:string):Promise<void>{await call(`${API}/files/${encodeURIComponent(id)}`,{method:"DELETE"});}
  async function ensureRunBinding(runId:string,deviceId:string,generation:number):Promise<void>{let page=await bindingListing(deviceId),files=page.files??[],parsed=files.map(file=>({file,run:file.appProperties?.brainBvpRunId,generation:bindingGeneration(file)}));if(parsed.some(value=>!value.run||value.generation===undefined))throw new MailboxUnavailableError("mailbox-run-binding-invalid");if(parsed.some(value=>value.generation!>generation||(value.generation===generation&&value.run!==runId)))throw new MailboxUnavailableError("mailbox-device-run-conflict");if(parsed.some(value=>value.generation===generation&&value.run===runId))return;const parent=await rootId(),created=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`bvp-run-binding-${crypto.randomUUID()}.json`,parents:[parent],mimeType:"application/json",appProperties:{brainBvpRecord:"1",brainBvpKind:"run-binding",brainBvpRunId:runId,brainBvpDeviceId:deviceId,brainBvpGeneration:String(generation)}})}),value=await created.json() as{id?:string};if(!value.id)throw new MailboxUnavailableError("mailbox-run-binding-create-invalid");page=await bindingListing(deviceId);files=page.files??[];parsed=files.map(file=>({file,run:file.appProperties?.brainBvpRunId,generation:bindingGeneration(file)}));const own=parsed.find(value2=>value2.file.id===value.id&&value2.run===runId&&value2.generation===generation);if(!own||parsed.some(value2=>value2.generation!==undefined&&(value2.generation>generation||(value2.generation===generation&&value2.run!==runId)))){await deleteFile(value.id);throw new MailboxUnavailableError(own?"mailbox-device-run-conflict":"mailbox-run-binding-unconfirmed");}for(const stale of parsed.filter(value2=>value2.generation!==undefined&&value2.generation<generation))await deleteFile(stale.file.id);}
  async function publish(kind:"command"|"result",value:unknown,generation?:number):Promise<void>{const safe=kind==="command"?command(value):result(value);if(!safe)throw new Error("mailbox-record-invalid");if(sensitive(safe))throw new Error("mailbox-sensitive-field");const encoded=jsonBytes(safe);if(encoded.bytes>MAX_RECORD_BYTES)throw new Error("mailbox-record-too-large");if(kind==="command"){if(!Number.isSafeInteger(generation)||generation!<=0)throw new MailboxUnavailableError("mailbox-controller-generation-invalid");await ensureRunBinding(safe.runId,safe.deviceId,generation!);}const parent=await rootId(),props:{[key:string]:string}={brainBvpRecord:"1",brainBvpKind:kind,brainBvpRunId:safe.runId,brainBvpDeviceId:safe.deviceId};if(kind==="command")props.brainBvpGeneration=String(generation);const meta=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`bvp-${kind}-${crypto.randomUUID()}.json`,parents:[parent],mimeType:"application/json",appProperties:props})}),m=await meta.json() as{id?:string};if(!m.id)throw new Error("mailbox-record-create-invalid");await call(`${UPLOAD}/files/${encodeURIComponent(m.id)}?uploadType=media`,{method:"PATCH",headers:{"content-type":"application/json"},body:encoded.text});}
  async function listing(kind:"command"|"result"|"run-binding"|"diagnostic",runId:string,deviceId:string):Promise<FileList>{const parent=await rootId();const q=encodeURIComponent(`'${escapeQuery(parent)}' in parents and trashed = false and appProperties has { key='brainBvpRecord' and value='1' } and appProperties has { key='brainBvpKind' and value='${kind}' } and appProperties has { key='brainBvpRunId' and value='${escapeQuery(runId)}' } and appProperties has { key='brainBvpDeviceId' and value='${escapeQuery(deviceId)}' }`);const response=await call(`${API}/files?q=${q}&spaces=drive&pageSize=200&fields=nextPageToken,files(id,size,appProperties)`);return await response.json() as FileList;}
  async function records(kind:"command"|"result"|"diagnostic",runId:string,deviceId:string):Promise<{file:MailboxFile;value:unknown}[]>{const page=await listing(kind,runId,deviceId);if(page.nextPageToken)throw new MailboxUnavailableError("mailbox-current-run-overflow");const output:{file:MailboxFile;value:unknown}[]=[];for(const file of page.files??[]){if(file.size&&Number(file.size)>MAX_RECORD_BYTES)throw new MailboxUnavailableError("mailbox-record-too-large");const media=await call(`${API}/files/${encodeURIComponent(file.id)}?alt=media`);const text=await media.text();if(new TextEncoder().encode(text).byteLength>MAX_RECORD_BYTES)throw new MailboxUnavailableError("mailbox-record-too-large");try{output.push({file,value:JSON.parse(text)});}catch{throw new MailboxUnavailableError("mailbox-record-malformed");}}return output;}

  const ageMs=90*24*60*60*1000;
  // Read at most 5000 active remote objects; archives never count as active.
  // Both published and ambiguous reserved objects are counted to prevent silent overflow.
  async function admitActive(deviceId:string):Promise<void>{
    const parent=await rootId(),q="'"+escapeQuery(parent)+"' in parents and trashed = false and appProperties has { key='brainBvpKind' and value='diagnostic' } and appProperties has { key='brainBvpDeviceId' and value='"+escapeQuery(deviceId)+"' }";
    let count=0,token:string|undefined;const seen=new Set<string>(),tokens=new Set<string>(),cutoff=Date.now()-ageMs;
    do{
      const url=API+"/files?q="+encodeURIComponent(q)+"&spaces=drive&pageSize=200&fields=nextPageToken,files(id,size,createdTime,appProperties)"+(token?"&pageToken="+encodeURIComponent(token):"");
      const response=await call(url,undefined,Boolean(token)),page=await response.json() as FileList;
      if(!Array.isArray(page.files)||page.files.length>200)throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
      for(const file of page.files){
        if(!file.id||seen.has(file.id)||file.appProperties?.brainBvpKind!=="diagnostic"||file.appProperties?.brainBvpDeviceId!==deviceId)
          throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
        seen.add(file.id);count++;
        if(count>=5000)throw new MailboxUnavailableError("mailbox-diagnostic-active-capacity");
        // Legacy providers without createdTime require a bounded content fallback, never assumed fresh.
        let age=file.createdTime;
        if(!age){
          const media=await call(API+"/files/"+encodeURIComponent(file.id)+"?alt=media"),raw=await media.text();
          if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES)throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
          try{age=cleanDiagnostic(JSON.parse(raw))?.firstAt;}catch{}
        }
        if(!age||!Number.isFinite(Date.parse(age)))throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
        if(Date.parse(age)<cutoff)throw new MailboxUnavailableError("mailbox-diagnostic-active-expired");
      }
      token=page.nextPageToken;
      if(token&&(!token.length||token.length>1024||tokens.has(token)||count>=5000))
        throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
      if(token)tokens.add(token);
    }while(token);
  }
  const mailbox:DriveCommandMailbox={
    publishResult:value=>publish("result",value),
    async reserveDiagnosticId(){
      const response=await call(`${API}/files/generateIds?count=1&space=drive&fields=ids`);
      const body=await response.json() as {ids?:string[]};
      const id=body.ids?.[0];if(!id||!/^[A-Za-z0-9_-]{2,128}$/.test(id))throw new MailboxUnavailableError("mailbox-diagnostic-id-invalid");
      return id;
    },
    async publishDiagnostic(runId,deviceId,value){
      if((runId!==null&&!/^[a-zA-Z0-9._:-]{1,128}$/.test(runId))||!/^[a-zA-Z0-9._:-]{1,128}$/.test(deviceId))throw new Error("mailbox-diagnostic-identity-invalid");
      const safe=cleanDiagnostic(value),id=value.remoteFileId;
      if(!safe||value.origin?.runId!==runId||value.origin?.deviceId!==deviceId||!id||!/^[A-Za-z0-9_-]{2,128}$/.test(id))throw new Error("mailbox-diagnostic-invalid");
      const encoded=jsonBytes(safe);if(encoded.bytes>MAX_RECORD_BYTES)throw new Error("mailbox-record-too-large");
      const parent=await rootId();
      // Includes unpublished (brainBvpRecord=0) objects after lost POST/UPLOAD/PATCH responses.
      const q=encodeURIComponent(`'${escapeQuery(parent)}' in parents and trashed = false and appProperties has { key='brainBvpDeviceId' and value='${escapeQuery(deviceId)}' } and appProperties has { key='brainBvpEventId' and value='${safe.eventId}' }`);
      const response=await call(`${API}/files?q=${q}&spaces=drive&pageSize=200&fields=nextPageToken,files(id,size,appProperties)`);
      const page=await response.json() as FileList;
      if(page.nextPageToken)throw new MailboxUnavailableError("mailbox-diagnostic-event-conflict");
      const records=(page.files??[]).filter(f=>f.appProperties?.brainBvpKind!=="diagnostic-archive");
      if(records.length>1||records.some(f=>f.id!==id||f.appProperties?.brainBvpRunId!==(runId??undefined)||f.appProperties?.brainBvpDeviceId!==deviceId||!["diagnostic-pending","diagnostic","diagnostic-retired"].includes(f.appProperties?.brainBvpKind??"")||(runId===null?f.appProperties?.brainBvpOriginBound!=="0":f.appProperties?.brainBvpOriginBound==="0")))throw new MailboxUnavailableError("mailbox-diagnostic-event-conflict");
      let existing=records[0];
      if(!existing){
        // ACTIVE admission occurs only in the serialized Windows-controller path.
        // Drive file ID is reserved and durably journaled BEFORE this create. A lost
        // create response can only cause a retry of this SAME ID, never a second object.
        const meta=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,name:`bvp-diagnostic-${safe.eventId}.json`,parents:[parent],mimeType:"application/json",appProperties:{brainBvpRecord:"0",brainBvpKind:"diagnostic-pending",...(runId===null?{}:{brainBvpRunId:runId}),...(runId===null?{brainBvpOriginBound:"0"}:{}),brainBvpDeviceId:deviceId,brainBvpEventId:safe.eventId}})});
        const created=await meta.json() as {id?:string};
        if(created.id!==id)throw new MailboxUnavailableError("mailbox-diagnostic-create-invalid");
        existing={id,size:"0",appProperties:{brainBvpRecord:"0",brainBvpKind:"diagnostic-pending",...(runId===null?{}:{brainBvpRunId:runId}),...(runId===null?{brainBvpOriginBound:"0"}:{}),brainBvpDeviceId:deviceId,brainBvpEventId:safe.eventId}};
      }
      if(existing.appProperties?.brainBvpRecord!=="0"&&existing.appProperties?.brainBvpRecord!=="1")throw new MailboxUnavailableError("mailbox-diagnostic-event-conflict");
      if(existing.size===undefined||!/^[0-9]+$/.test(existing.size)||Number(existing.size)>MAX_RECORD_BYTES)throw new MailboxUnavailableError("mailbox-diagnostic-size-unconfirmed");
      let text="";
      if(Number(existing.size)>0){const media=await call(`${API}/files/${encodeURIComponent(id)}?alt=media`);text=await media.text();}
      if(text){
        let prior:RuntimeErrorRecord|undefined;try{prior=cleanDiagnostic(JSON.parse(text));}catch{}
        if(!prior||prior.eventId!==safe.eventId||prior.firstAt!==safe.firstAt||JSON.stringify(prior.diagnostic)!==JSON.stringify(safe.diagnostic)||prior.occurrences>safe.occurrences||prior.lastAt>safe.lastAt)
          throw new MailboxUnavailableError("mailbox-diagnostic-event-conflict");
      }
      if(text&&text!==encoded.text)throw new MailboxUnavailableError("mailbox-diagnostic-immutable");
      if(text!==encoded.text){
        if(existing.appProperties?.brainBvpKind!=="diagnostic-pending")throw new MailboxUnavailableError("mailbox-diagnostic-immutable");
        await call(`${UPLOAD}/files/${encodeURIComponent(id)}?uploadType=media`,{method:"PATCH",headers:{"content-type":"application/json"},body:encoded.text});
        const check=await call(`${API}/files/${encodeURIComponent(id)}?alt=media`);
        if(await check.text()!==encoded.text)throw new MailboxUnavailableError("mailbox-diagnostic-media-unconfirmed");
      }
      if(existing.appProperties?.brainBvpRecord!=="1"){
        // Publication is never confirmed by an ambiguous PATCH result.
        await call(`${API}/files/${encodeURIComponent(id)}?fields=id`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({appProperties:{brainBvpRecord:"1"}})});
      }
      const confirmation=await call(`${API}/files/${encodeURIComponent(id)}?fields=id,appProperties`);
      const verified=await confirmation.json() as MailboxFile;
      if(verified.id!==id||verified.appProperties?.brainBvpRecord!=="1"||verified.appProperties?.brainBvpEventId!==safe.eventId||verified.appProperties?.brainBvpRunId!==(runId??undefined)||verified.appProperties?.brainBvpDeviceId!==deviceId||(runId===null?verified.appProperties?.brainBvpOriginBound!=="0":verified.appProperties?.brainBvpOriginBound==="0"))
        throw new MailboxUnavailableError("mailbox-diagnostic-visibility-unconfirmed");
      if(verified.appProperties?.brainBvpKind==="diagnostic-pending")throw new MailboxUnavailableError("mailbox-diagnostic-awaiting-controller");
      if(!["diagnostic","diagnostic-retired"].includes(verified.appProperties?.brainBvpKind??""))
        throw new MailboxUnavailableError("mailbox-diagnostic-visibility-unconfirmed");
    },

    // Archive is non-destructive. No event can be retired by this operation:
    // a delivered inbox receipt is not a trusted event-specific resolution.
    async archiveVerifiedDiagnostic(deviceId,eventId,archiveId){
      if(!/^[a-zA-Z0-9._:-]{1,128}$/.test(deviceId)||!/^[0-9a-f-]{36}$/.test(eventId)||
        !/^[A-Za-z0-9_-]{2,128}$/.test(archiveId))throw new MailboxUnavailableError("mailbox-archive-identity-invalid");
      const parent=await rootId(),query=(kind:string)=>"'"+escapeQuery(parent)+"' in parents and trashed = false and appProperties has { key='brainBvpKind' and value='"+kind+"' } and appProperties has { key='brainBvpDeviceId' and value='"+escapeQuery(deviceId)+"' } and appProperties has { key='brainBvpEventId' and value='"+escapeQuery(eventId)+"' }";
      const fetchOne=async(kind:string)=>{
        const response=await call(API+"/files?q="+encodeURIComponent(query(kind))+"&spaces=drive&pageSize=2&fields=nextPageToken,files(id,size,appProperties)");
        const page=await response.json() as FileList;
        if(page.nextPageToken||(page.files??[]).length!==1)throw new MailboxUnavailableError("mailbox-archive-source-ambiguous");
        return page.files![0];
      };
      const source=await fetchOne("diagnostic"),props=source.appProperties;
      if(props?.brainBvpRecord!=="1"||props.brainBvpKind!=="diagnostic"||props.brainBvpDeviceId!==deviceId||props.brainBvpEventId!==eventId||
        source.size===undefined||!/^[0-9]+$/.test(source.size)||Number(source.size)>MAX_RECORD_BYTES)
        throw new MailboxUnavailableError("mailbox-archive-source-invalid");
      const raw=await (await call(API+"/files/"+encodeURIComponent(source.id)+"?alt=media")).text();
      if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES||new TextEncoder().encode(raw).byteLength!==Number(source.size))throw new MailboxUnavailableError("mailbox-archive-source-invalid");
      let safe:RuntimeErrorRecord|undefined;try{safe=cleanDiagnostic(JSON.parse(raw));}catch{}
      if(!safe||safe.eventId!==eventId)throw new MailboxUnavailableError("mailbox-archive-source-invalid");
      const bound=props.brainBvpOriginBound!=="0",run=props.brainBvpRunId;
      if(bound?(typeof run!=="string"||safe.diagnostic.identity.runId!==await opaqueDiagnosticId(run,"run")):
        (run!==undefined||safe.diagnostic.identity.runId!=="unavailable"))
        throw new MailboxUnavailableError("mailbox-diagnostic-origin-conflict");
      const sha=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))].map(x=>x.toString(16).padStart(2,"0")).join("");
      const existingResponse=await call(API+"/files?q="+encodeURIComponent(query("diagnostic-archive"))+"&spaces=drive&pageSize=2&fields=nextPageToken,files(id,size,appProperties)");
      const existingPage=await existingResponse.json() as FileList;
      if(existingPage.nextPageToken||(existingPage.files??[]).length>1)throw new MailboxUnavailableError("mailbox-archive-conflict");
      let archived=existingPage.files?.[0];
      if(archived&&(archived.appProperties?.brainBvpSourceId!==source.id||archived.appProperties?.brainBvpArchiveSha256!==sha||archived.appProperties?.brainBvpDeviceId!==deviceId||archived.appProperties?.brainBvpEventId!==eventId||archived.appProperties?.brainBvpRunId!==run||(bound?archived.appProperties?.brainBvpOriginBound==="0":archived.appProperties?.brainBvpOriginBound!=="0")||!["0","1"].includes(archived.appProperties?.brainBvpRecord??"")||!/^\d+$/.test(archived.size??"")||Number(archived.size)>MAX_RECORD_BYTES))
        throw new MailboxUnavailableError("mailbox-archive-conflict");
      if(archived)archiveId=archived.id; // Restart or lost reservation reconciles the original copy.
      if(!archived){
        const created=await call(API+"/files?fields=id",{method:"POST",headers:{"content-type":"application/json"},
          body:JSON.stringify({id:archiveId,name:"bvp-diagnostic-archive-"+eventId+".json",parents:[parent],mimeType:"application/json",
            appProperties:{brainBvpRecord:"0",brainBvpKind:"diagnostic-archive",brainBvpEventId:eventId,brainBvpDeviceId:deviceId,
              brainBvpSourceId:source.id,brainBvpArchiveSha256:sha,...(bound?{brainBvpRunId:run}:{brainBvpOriginBound:"0"})}})});
        if((await created.json() as {id?:string}).id!==archiveId)throw new MailboxUnavailableError("mailbox-archive-create-unconfirmed");
        archived={id:archiveId,size:"0",appProperties:{brainBvpRecord:"0",brainBvpKind:"diagnostic-archive",brainBvpEventId:eventId,
          brainBvpDeviceId:deviceId,brainBvpSourceId:source.id,brainBvpArchiveSha256:sha}};
      }
      let media="";
      if(archived.size&&Number(archived.size)>0)media=await (await call(API+"/files/"+encodeURIComponent(archiveId)+"?alt=media")).text();
      if(media&&media!==raw)throw new MailboxUnavailableError("mailbox-archive-conflict");
      if(media!==raw)await call(UPLOAD+"/files/"+encodeURIComponent(archiveId)+"?uploadType=media",
        {method:"PATCH",headers:{"content-type":"application/json"},body:raw});
      if(await (await call(API+"/files/"+encodeURIComponent(archiveId)+"?alt=media")).text()!==raw)
        throw new MailboxUnavailableError("mailbox-archive-integrity-unconfirmed");
      if(archived.appProperties?.brainBvpRecord!=="1")
        await call(API+"/files/"+encodeURIComponent(archiveId)+"?fields=id",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({appProperties:{brainBvpRecord:"1"}})});
      const verified=await (await call(API+"/files/"+encodeURIComponent(archiveId)+"?fields=id,appProperties")).json() as MailboxFile;
      if(verified.id!==archiveId||verified.appProperties?.brainBvpRecord!=="1"||verified.appProperties?.brainBvpArchiveSha256!==sha||
        verified.appProperties?.brainBvpSourceId!==source.id||verified.appProperties?.brainBvpDeviceId!==deviceId||
        verified.appProperties?.brainBvpEventId!==eventId||verified.appProperties?.brainBvpRunId!==run||(bound?verified.appProperties?.brainBvpOriginBound==="0":verified.appProperties?.brainBvpOriginBound!=="0"))throw new MailboxUnavailableError("mailbox-archive-visibility-unconfirmed");
      if(await (await call(API+"/files/"+encodeURIComponent(source.id)+"?alt=media")).text()!==raw)
        throw new MailboxUnavailableError("mailbox-archive-source-changed");
      return{status:"verified" as const,eventId,sha256:sha};
    },
    async diagnostics(runId,deviceId){
      const remote=await records("diagnostic",runId,deviceId),seen=new Set<string>(),values:RuntimeErrorRecord[]=[];
      for(const record of remote){
        const v=cleanDiagnostic(record.value),props=record.file.appProperties;
        if(!v||props?.brainBvpRunId!==runId||props?.brainBvpDeviceId!==deviceId||props?.brainBvpEventId!==v.eventId)throw new MailboxUnavailableError("mailbox-diagnostic-record-invalid");
        if(seen.has(v.eventId))throw new MailboxUnavailableError("mailbox-diagnostic-event-conflict");
        seen.add(v.eventId);values.push(v);
      }
      return values;
    },

    // Device-scoped validation-only read; lease/command authority is not transferred to older runs.
    async diagnosticsForDevice(deviceId,pageToken){
      if(!/^[a-zA-Z0-9._:-]{1,128}$/.test(deviceId)||(pageToken!==undefined&&(!pageToken||pageToken.length>1024)))
        throw new MailboxUnavailableError("mailbox-diagnostic-cursor-invalid");
      const parent=await rootId();
      const q="'"+escapeQuery(parent)+"' in parents and trashed = false and appProperties has { key='brainBvpRecord' and value='1' } and appProperties has { key='brainBvpKind' and value='diagnostic' } and appProperties has { key='brainBvpDeviceId' and value='"+escapeQuery(deviceId)+"' }";
      const url=API+"/files?q="+encodeURIComponent(q)+"&spaces=drive&pageSize=25&fields=nextPageToken,files(id,size,createdTime,appProperties)"+(pageToken?"&pageToken="+encodeURIComponent(pageToken):"");
      const response=await call(url,undefined,Boolean(pageToken)),page=await response.json() as FileList;
      if((page.files??[]).length>25||(page.nextPageToken!==undefined&&(!page.nextPageToken||page.nextPageToken.length>1024||page.nextPageToken===pageToken)))
        throw new MailboxUnavailableError("mailbox-diagnostic-cursor-invalid");
      const entries:RuntimeErrorRecord[]=[],agedEventIds:string[]=[],seen=new Set<string>();
      for(const file of page.files??[]){
        const props=file.appProperties,rawRun=props?.brainBvpRunId,boundRun=props?.brainBvpOriginBound!=="0";
        if(props?.brainBvpRecord!=="1"||props?.brainBvpKind!=="diagnostic"||props?.brainBvpDeviceId!==deviceId||
          (boundRun?typeof rawRun!=="string"||!/^[a-zA-Z0-9._:-]{1,128}$/.test(rawRun):rawRun!==undefined)||
          (props.brainBvpOriginBound!==undefined&&props.brainBvpOriginBound!=="0"&&props.brainBvpOriginBound!=="1")||
          file.size===undefined||!/^[0-9]+$/.test(file.size)||Number(file.size)>MAX_RECORD_BYTES)
          throw new MailboxUnavailableError("mailbox-diagnostic-record-invalid");
        const media=await call(API+"/files/"+encodeURIComponent(file.id)+"?alt=media"),raw=await media.text();
        if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES)throw new MailboxUnavailableError("mailbox-record-too-large");
        let safe:RuntimeErrorRecord|undefined;try{safe=cleanDiagnostic(JSON.parse(raw));}catch{throw new MailboxUnavailableError("mailbox-record-malformed");}
        if(!safe||safe.eventId!==props.brainBvpEventId||seen.has(safe.eventId))
          throw new MailboxUnavailableError("mailbox-diagnostic-record-invalid");
        if(boundRun?safe.diagnostic.identity.runId!==await opaqueDiagnosticId(rawRun!,"run"):
          safe.diagnostic.identity.runId!=="unavailable")
          throw new MailboxUnavailableError("mailbox-diagnostic-origin-conflict");
        seen.add(safe.eventId);
        const sourceAge=Date.parse(file.createdTime??safe.firstAt);
        if(!Number.isFinite(sourceAge))throw new MailboxUnavailableError("mailbox-diagnostic-retention-unconfirmed");
        if(sourceAge<Date.now()-ageMs)agedEventIds.push(safe.eventId);
        entries.push({...safe,origin:{runId:boundRun?rawRun!:null,deviceId}});
      }
      return{entries,...(agedEventIds.length?{agedEventIds}:{}),...(page.nextPageToken?{nextPageToken:page.nextPageToken}:{})};
    },
    async commands(runId,deviceId){const values=(await records("command",runId,deviceId)).map(v=>command(v.value));if(values.some(v=>!v))throw new MailboxUnavailableError("mailbox-command-invalid");return values.filter((v):v is DeviceCommand=>Boolean(v&&v.runId===runId&&v.deviceId===deviceId)).sort((a,b)=>a.sequence-b.sequence);},
    async resultFor(value){const target=header(value)!;const parsed=(await records("result",target.runId,target.deviceId)).map(v=>result(v.value));if(parsed.some(v=>!v))throw new MailboxUnavailableError("mailbox-result-invalid");const values=parsed.filter((v):v is DeviceCommandResult=>Boolean(v&&same(v,target)));if(!values.length)return undefined;const first=JSON.stringify(values[0]);if(values.some(v=>JSON.stringify(v)!==first))throw new Error("mailbox-conflicting-result");return values[0];},
    activeRun,
    async cleanup(runId,deviceId){let removed=0;for(const kind of ["command","result","run-binding"] as const){let done=false;for(let batch=0;batch<20&&!done;batch++){const page=await listing(kind,runId,deviceId),files=page.files??[];for(const file of files){await deleteFile(file.id);removed++;}done=!page.nextPageToken;if(!done&&batch===19)throw new MailboxUnavailableError("mailbox-cleanup-limit");}}return removed;},
  };
  async function lookupDiagnostic(kind:string,deviceId:string,eventId:string):Promise<MailboxFile>{
    const parent=await rootId(),q="'"+escapeQuery(parent)+"' in parents and trashed = false and appProperties has { key='brainBvpKind' and value='"+escapeQuery(kind)+"' } and appProperties has { key='brainBvpDeviceId' and value='"+escapeQuery(deviceId)+"' } and appProperties has { key='brainBvpEventId' and value='"+escapeQuery(eventId)+"' }";
    const r=await call(API+"/files?q="+encodeURIComponent(q)+"&spaces=drive&pageSize=2&fields=nextPageToken,files(id,size,appProperties)");
    const page=await r.json() as FileList;
    if(page.nextPageToken||(page.files??[]).length>1)throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-ambiguous");
    if((page.files??[]).length===0)throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-not-found");
    return page.files![0];
  }
  async function sourceContents(file:MailboxFile):Promise<{raw:string;value:RuntimeErrorRecord;sha:string}>{
    if(file.appProperties?.brainBvpRecord!=="1"||file.size===undefined||!/^[0-9]+$/.test(file.size)||Number(file.size)>MAX_RECORD_BYTES)
      throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-invalid");
    const raw=await (await call(API+"/files/"+encodeURIComponent(file.id)+"?alt=media")).text();
    if(new TextEncoder().encode(raw).byteLength!==Number(file.size))throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-invalid");
    let value:RuntimeErrorRecord|undefined;try{value=cleanDiagnostic(JSON.parse(raw));}catch{}
    if(!value||value.eventId!==file.appProperties?.brainBvpEventId)throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-invalid");
    const sha=[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw)))].map(x=>x.toString(16).padStart(2,"0")).join("");
    return{raw,value,sha};
  }
  const ops:DiagnosticControllerOps={
    async verify(proof){
      if(!proof||proof.schemaVersion!==1||!["acknowledged","resolved"].includes(proof.disposition)||
        !/^[a-zA-Z0-9._:-]{1,128}$/.test(proof.deviceId)||
        (proof.runId!==null&&!/^[a-zA-Z0-9._:-]{1,128}$/.test(proof.runId))||
        !/^[0-9a-f-]{36}$/.test(proof.eventId)||!/^[0-9a-f]{64}$/.test(proof.sha256)||
        !Number.isSafeInteger(proof.controllerGeneration)||proof.controllerGeneration<=0)
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-invalid");
      let source:MailboxFile;
      try{source=await lookupDiagnostic("diagnostic",proof.deviceId,proof.eventId);}
      catch(error){
        if(!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-controller-source-not-found")throw error;
        source=await lookupDiagnostic("diagnostic-retired",proof.deviceId,proof.eventId);
      }
      const props=source.appProperties;
      if(props?.brainBvpRunId!==(proof.runId??undefined)||
        (proof.runId===null?props?.brainBvpOriginBound!=="0":props?.brainBvpOriginBound==="0"))
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-origin");
      const snapshot=await sourceContents(source);
      if(snapshot.sha!==proof.sha256||
        snapshot.value.diagnostic.identity.runId!==(proof.runId===null?"unavailable":await opaqueDiagnosticId(proof.runId,"run")))
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-content");
      if(props?.brainBvpKind==="diagnostic-retired"&&(props.brainBvpAcknowledgedSha256!==proof.sha256||
        props.brainBvpAckDisposition!==proof.disposition||
        props.brainBvpControllerGeneration!==String(proof.controllerGeneration)))
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-retired-conflict");
    },
    async pending(deviceId){
      const parent=await rootId(),q="'"+escapeQuery(parent)+"' in parents and trashed = false and appProperties has { key='brainBvpKind' and value='diagnostic-pending' } and appProperties has { key='brainBvpDeviceId' and value='"+escapeQuery(deviceId)+"' }";
      const response=await call(API+"/files?q="+encodeURIComponent(q)+"&spaces=drive&pageSize=25&fields=nextPageToken,files(id,size,appProperties)");
      const page=await response.json() as FileList;
      if(!Array.isArray(page.files)||page.files.length>25)throw new MailboxUnavailableError("mailbox-diagnostic-pending-invalid");
      const file=page.files[0];if(!file)return undefined;
      if(file.appProperties?.brainBvpKind!=="diagnostic-pending"||file.appProperties?.brainBvpDeviceId!==deviceId)
        throw new MailboxUnavailableError("mailbox-diagnostic-pending-invalid");
      const contents=await sourceContents(file),rawRun=file.appProperties?.brainBvpRunId;
      const runId=file.appProperties?.brainBvpOriginBound==="0"?null:rawRun;
      if(runId===undefined||runId!==null&&!/^[a-zA-Z0-9._:-]{1,128}$/.test(runId)||
        contents.value.diagnostic.identity.runId!==(runId===null?"unavailable":await opaqueDiagnosticId(runId,"run")))
        throw new MailboxUnavailableError("mailbox-diagnostic-pending-origin");
      return{runId,value:{...contents.value,origin:{runId,deviceId},remoteFileId:file.id}};
    },
    async admit(runId,deviceId,value){
      const safe=cleanDiagnostic(value),id=value.remoteFileId;
      if(!safe||!id||!value.origin||value.origin.runId!==runId||value.origin.deviceId!==deviceId)
        throw new MailboxUnavailableError("mailbox-diagnostic-controller-input-invalid");
      // The controller may stage an operator-provided diagnostic, but never uses
      // a device-side ACTIVE allocation. The event ID remains idempotent.
      try{await mailbox.publishDiagnostic(runId,deviceId,value);}
      catch(error){if(!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-awaiting-controller")throw error;}
      let file:MailboxFile;
      try{file=await lookupDiagnostic("diagnostic-pending",deviceId,safe.eventId);}
      catch(error){
        if(!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-controller-source-not-found")throw error;
        // A lost activation response can only reconcile the same immutable ID.
        const active=await lookupDiagnostic("diagnostic",deviceId,safe.eventId);
        if(active.id!==id||(await sourceContents(active)).raw!==JSON.stringify(safe))throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-conflict");
        return;
      }
      if(file.id!==id||file.appProperties?.brainBvpRunId!==(runId??undefined)||
        (await sourceContents(file)).raw!==JSON.stringify(safe))
        throw new MailboxUnavailableError("mailbox-diagnostic-controller-source-conflict");
      // An old pending record cannot be promoted to ACTIVE with an already-expired age.
      if(!Number.isFinite(Date.parse(safe.firstAt))||Date.parse(safe.firstAt)<Date.now()-ageMs)
        throw new MailboxUnavailableError("mailbox-diagnostic-active-expired");
      await admitActive(deviceId);
      await call(API+"/files/"+encodeURIComponent(id)+"?fields=id",{method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({appProperties:{brainBvpKind:"diagnostic"}})});
      const current=await (await call(API+"/files/"+encodeURIComponent(id)+"?fields=id,size,appProperties")).json() as MailboxFile;
      if(current.id!==id||current.appProperties?.brainBvpKind!=="diagnostic"||
        (await sourceContents(current)).raw!==JSON.stringify(safe))throw new MailboxUnavailableError("mailbox-diagnostic-admission-unconfirmed");
    },
    async retire(proof){
      await ops.verify(proof);
      let retired:MailboxFile|undefined;
      try{retired=await lookupDiagnostic("diagnostic-retired",proof.deviceId,proof.eventId);}
      catch(error){if(!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-controller-source-not-found")throw error;}
      if(retired){
        try{
          await lookupDiagnostic("diagnostic",proof.deviceId,proof.eventId);
          throw new MailboxUnavailableError("mailbox-diagnostic-retirement-duplicate-active");
        }catch(error){
          if(!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-controller-source-not-found")throw error;
        }
        const copy=await lookupDiagnostic("diagnostic-archive",proof.deviceId,proof.eventId);
        if(copy.appProperties?.brainBvpSourceId!==retired.id||copy.appProperties?.brainBvpArchiveSha256!==proof.sha256||
          (await sourceContents(copy)).sha!==proof.sha256)
          throw new MailboxUnavailableError("mailbox-diagnostic-retirement-replay-invalid");
        return;
      }
      // Input provenance was validated before the durable receipt and again by ops.verify.
      const source=await lookupDiagnostic("diagnostic",proof.deviceId,proof.eventId);
      const props=source.appProperties;
      if(props?.brainBvpRunId!==(proof.runId??undefined)||
        (proof.runId===null?props?.brainBvpOriginBound!=="0":props?.brainBvpOriginBound==="0"))
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-origin");
      const snapshot=await sourceContents(source);
      if(snapshot.sha!==proof.sha256||
        snapshot.value.diagnostic.identity.runId!==(proof.runId===null?"unavailable":await opaqueDiagnosticId(proof.runId,"run")))
        throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-content");
      // Archive is verified independently before any change to ACTIVE status.
      const archived=await mailbox.archiveVerifiedDiagnostic(proof.deviceId,proof.eventId,await mailbox.reserveDiagnosticId());
      if(archived.sha256!==proof.sha256)throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-archive");
      if((await sourceContents(source)).sha!==proof.sha256)throw new MailboxUnavailableError("mailbox-diagnostic-acknowledgment-drift");
      await call(API+"/files/"+encodeURIComponent(source.id)+"?fields=id",{method:"PATCH",headers:{"content-type":"application/json"},
        body:JSON.stringify({appProperties:{brainBvpKind:"diagnostic-retired",brainBvpAcknowledgedSha256:proof.sha256,
          brainBvpAckDisposition:proof.disposition,brainBvpControllerGeneration:String(proof.controllerGeneration)}})});
      const after=await (await call(API+"/files/"+encodeURIComponent(source.id)+"?fields=id,size,appProperties")).json() as MailboxFile;
      if(after.appProperties?.brainBvpKind!=="diagnostic-retired"||
        after.appProperties?.brainBvpAcknowledgedSha256!==proof.sha256||
        after.appProperties?.brainBvpControllerGeneration!==String(proof.controllerGeneration)||
        (await sourceContents(after)).raw!==snapshot.raw)
        throw new MailboxUnavailableError("mailbox-diagnostic-retirement-unconfirmed");
    }
  };
  controllerOps.set(mailbox,ops);
commandPublishers.set(mailbox,(value,generation)=>publish("command",value,generation));return mailbox;
}

export async function pollDeviceMailboxOnce(mailbox:DriveCommandMailbox,agent:BoundedDeviceCommandAgent,runId:string,deviceId:string):Promise<{status:"ok";processed:number}|{status:"unavailable";processed:number;reason:string;diagnostic:BvpDiagnostic}>{
  let processed=0,phase="command-fetch",current:DeviceCommand|undefined;
  try{
    for(const cmd of await mailbox.commands(runId,deviceId)){
      current=cmd;phase="result-lookup";if(await mailbox.resultFor(cmd))continue;
      phase="device-execution";const response=await agent.execute(cmd);
      phase="result-publication";await mailbox.publishResult(response);processed++;
    }
    return{status:"ok",processed};
  }catch(e){
    const reason=e instanceof MailboxUnavailableError?e.message:
      phase==="device-execution"?"device-command-execution-failed":"device-"+phase+"-failed";
    const diagnostic=bvpDiagnostic({classification:reason,component:"device-agent",phase,
      lastConfirmedBoundary:phase==="command-fetch"?"device-poll-started":phase==="result-publication"?"device-handler-returned":"device-command-read",
      firstUnconfirmedBoundary:phase==="result-lookup"?"previous-result-observation":
        phase==="device-execution"?"device-command-outcome":phase==="result-publication"?"drive-result-publication":"drive-command-list",
      effect:"unknown",recommendedAction:"reconcile-device-state",
      identity:await diagnosticIdentity(runId,current?.commandId)});
    return{status:"unavailable",processed,reason:diagnostic.classification,diagnostic};
  }
}

async function diagnosticIdentity(runId?:string,commandId?:string):Promise<BvpDiagnostic["identity"]>{
  return{runId:runId?await opaqueDiagnosticId(runId,"run"):"unavailable",
    scenarioId:"unavailable",stepIndex:null,executionMode:"unknown",
    correlationToken:commandId?await opaqueDiagnosticId(commandId,"corr"):"unavailable"};
}

const commandPublishers=new WeakMap<DriveCommandMailbox,(value:DeviceCommand,generation:number)=>Promise<void>>();
export function createWindowsMailboxRelay(mailbox:DriveCommandMailbox,adapter:RelayAdapter,root:string,scope?:{mode:"reporter"|"controller";deviceId?:string}){
  const out=`${root}/outbox`,sent=`${root}/sent`,inside=`${root}/inbox`,publisher=commandPublishers.get(mailbox),controller=controllerOps.get(mailbox);
  if(!publisher)throw new Error("relay-mailbox-publisher-unavailable");
  const publishCommand=publisher;
  async function withController<T>(deviceId:string,action:(lease:ControllerAuthority)=>Promise<T>):Promise<T>{
    if(!controller||!adapter.withExclusiveDiagnosticDevice)throw new MailboxUnavailableError("relay-controller-exclusive-unavailable");
    return adapter.withExclusiveDiagnosticDevice(deviceId,async()=>{
      const path=await controllerAuthorityPath(root,deviceId);
      if(!await adapter.exists(path))throw new MailboxUnavailableError("relay-controller-run-unleased");
      let lease:ControllerAuthority|undefined;try{lease=controllerAuthority(JSON.parse(await adapter.read(path)),deviceId);}catch{}
      if(!lease||lease.generation<=0)throw new MailboxUnavailableError("relay-controller-run-unleased");
      return action(lease);
    });
  }
  async function admitDiagnostic(runId:string|null,deviceId:string,value:RuntimeErrorRecord):Promise<void>{
    return withController(deviceId,async()=>controller!.admit(runId,deviceId,value));
  }
  async function acknowledgeDiagnostic(proof:DiagnosticAttestation):Promise<void>{
    return withController(proof.deviceId,async lease=>{
      if(lease.generation!==proof.controllerGeneration)throw new MailboxUnavailableError("relay-diagnostic-acknowledgment-stale-controller");
      // Reject forged, mismatched or stale content BEFORE a durable receipt is created.
      await controller!.verify(proof);
      const dir=root+"/diagnostic-acknowledgments";
      if(!await adapter.exists(dir))await adapter.mkdir(dir);
      const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(proof.deviceId+"|"+proof.eventId));
      const name=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
      const path=dir+"/"+name+".json",text=JSON.stringify(proof);
      if(await adapter.exists(path)){if(await adapter.read(path)!==text)throw new MailboxUnavailableError("relay-diagnostic-acknowledgment-conflict");}
      else await adapter.write(path,text);
      if(await adapter.read(path)!==text)throw new MailboxUnavailableError("relay-diagnostic-acknowledgment-not-durable");
      await controller!.retire(proof);
    });
  }
  type PumpResult={status:"ok"|"unavailable";published:number;completed:number;reason?:string;diagnostic?:BvpDiagnostic};
  let pumping:Promise<PumpResult>|undefined;
  async function ensure(){for(const p of [root,out,sent,inside,root+"/diagnostic-cursors",root+"/diagnostic-archive-receipts"])if(!await adapter.exists(p))await adapter.mkdir(p);}
  async function authorityGeneration(cmd:DeviceCommand):Promise<number>{const path=await controllerAuthorityPath(root,cmd.deviceId);if(!await adapter.exists(path))throw new MailboxUnavailableError("relay-controller-run-unleased");let value:ControllerAuthority|undefined;try{value=controllerAuthority(JSON.parse(await adapter.read(path)),cmd.deviceId);}catch{}if(!value||value.runId!==cmd.runId||value.generation<=0)throw new MailboxUnavailableError("relay-controller-run-unleased");return value.generation;}
  async function pumpCore():Promise<PumpResult>{
    let published=0,completed=0,phase="relay-preflight",last="relay-entry",
      first="relay-directory-preflight",failureClass="relay-preflight-failed",context:DeviceCommand|undefined;
    const readCommand=async(path:string,scope:"outbox"|"sent"):Promise<DeviceCommand>=>{
      failureClass="relay-file-read-failed";first="relay-file-read";
      const raw=await adapter.read(path);
      failureClass=scope==="outbox"?"relay-outbox-malformed":"relay-sent-malformed";
      first="relay-command-decoding";
      let cmd:DeviceCommand|undefined;try{cmd=command(JSON.parse(raw));}catch{}
      if(!cmd)throw new Error(failureClass);
      context=cmd;last="relay-command-read";return cmd;
    };
    try{
      await ensure();last="relay-directories-ready";
      if(scope?.mode!=="controller")for(const path of (await adapter.list(out)).files){
        phase="command-parse";const cmd=await readCommand(path,"outbox");
        phase="command-authorization";first="command-lease-validation";failureClass="relay-command-lease-failed";
        const generation=await authorityGeneration(cmd);
        phase="command-publication";first="drive-command-publication";failureClass="relay-command-publication-failed";
        await publishCommand(cmd,generation);
        last="drive-publish-acknowledged";first="sent-record-persistence";failureClass="relay-file-rename-failed";
        await adapter.rename(path,`${sent}/${baseName(path)}`);published++;
      }
      if(scope?.mode!=="controller")for(const path of (await adapter.list(sent)).files){
        phase="result-fetch";const cmd=await readCommand(path,"sent");
        first="drive-receipt-observation";failureClass="relay-result-lookup-failed";
        const res=await mailbox.resultFor(cmd);if(!res)continue;
        last="device-result-observed";phase="result-persistence";first="relay-inbox-persistence";failureClass="relay-inbox-write-failed";
        await adapter.write(`${inside}/${baseName(path)}.result.json`,JSON.stringify(res));
        first="sent-record-removal";failureClass="relay-file-remove-failed";
        await adapter.remove(path);completed++;
      }
      // Pull diagnostics using controller-owned, exact device/run leases; never infer a device from a filename.
      phase="diagnostic-ingest";first="remote-diagnostic-observation";failureClass="relay-diagnostic-ingest-failed";
      const leases=root+"/controller-authority";
      if(await adapter.exists(leases))for(const file of (await adapter.list(leases)).files){
        let v:Record<string,unknown>|undefined;try{v=obj(JSON.parse(await adapter.read(file)));}catch{throw new MailboxUnavailableError("relay-controller-authority-invalid");}
        if(!v||typeof v.deviceId!=="string")throw new MailboxUnavailableError("relay-controller-authority-invalid");
        const lease=controllerAuthority(v,v.deviceId);
        if(!lease||lease.generation<=0)throw new MailboxUnavailableError("relay-controller-authority-invalid");
        if(scope?.mode==="controller"&&lease.deviceId!==scope.deviceId)continue;
        const cursorPath=(await controllerAuthorityPath(root,lease.deviceId)).replace("/controller-authority/","/diagnostic-cursors/");
        let token:string|undefined;
        if(await adapter.exists(cursorPath)){
          let saved:Record<string,unknown>|undefined;try{saved=obj(JSON.parse(await adapter.read(cursorPath)));}catch{}
          if(!saved||saved.schemaVersion!==1||saved.deviceId!==lease.deviceId||
            (saved.pageToken!==null&&(typeof saved.pageToken!=="string"||!saved.pageToken||saved.pageToken.length>1024)))
            throw new MailboxUnavailableError("relay-diagnostic-cursor-invalid");
          token=(saved.pageToken??undefined) as string|undefined;
        }
        // Drive may reject a previously issued token; restart one bounded page from the
        // beginning without advancing the durable cursor until inbox reconciliation succeeds.
        let page:Awaited<ReturnType<DriveCommandMailbox["diagnosticsForDevice"]>>;
        try{page=await mailbox.diagnosticsForDevice(lease.deviceId,token);}
        catch(error){
          if(!token||!(error instanceof MailboxUnavailableError)||error.message!=="mailbox-diagnostic-cursor-expired")throw error;
          page=await mailbox.diagnosticsForDevice(lease.deviceId);
        }
        for(const entry of page.entries){
          const path=`${inside}/bvp-diagnostic-${entry.eventId}.error.json`;
          if(await adapter.exists(path)){
            let old:RuntimeErrorRecord|undefined,oldOrigin:unknown;
            try{const parsed=JSON.parse(await adapter.read(path));old=cleanDiagnostic(parsed);oldOrigin=obj(parsed)?.origin;}catch{}
            if(!old||old.eventId!==entry.eventId||old.firstAt!==entry.firstAt||
              JSON.stringify(old.diagnostic)!==JSON.stringify(entry.diagnostic)||
              JSON.stringify(oldOrigin)!==JSON.stringify(entry.origin)||
              (old.occurrences>entry.occurrences&&old.lastAt<entry.lastAt)||
              (old.occurrences<entry.occurrences&&old.lastAt>entry.lastAt))
              throw new MailboxUnavailableError("relay-diagnostic-inbox-conflict");
            if(old.occurrences>=entry.occurrences)continue;
          }
          await adapter.write(path,JSON.stringify(entry));
        }
        // Durable per-device receipts allow one verified archive per cycle across restarts.
        const archiveReceiptPath=cursorPath.replace("/diagnostic-cursors/","/diagnostic-archive-receipts/");
        let archivedIds:string[]=[];
        if(await adapter.exists(archiveReceiptPath)){
          let saved:Record<string,unknown>|undefined;try{saved=obj(JSON.parse(await adapter.read(archiveReceiptPath)));}catch{}
          if(!saved||saved.schemaVersion!==1||saved.deviceId!==lease.deviceId||!Array.isArray(saved.ids)||
            saved.ids.length>5000||saved.ids.some((id:unknown)=>typeof id!=="string"||!/^[0-9a-f-]{36}$/.test(id))||
            new Set(saved.ids).size!==saved.ids.length)
            throw new MailboxUnavailableError("relay-archive-receipts-invalid");
          archivedIds=saved.ids as string[];
        }
        const agedId=page.agedEventIds?.find(id=>!archivedIds.includes(id));
        if(agedId){
          phase="diagnostic-archive";first="archive-integrity-confirmation";failureClass="relay-diagnostic-archive-failed";
          await mailbox.archiveVerifiedDiagnostic(lease.deviceId,agedId,await mailbox.reserveDiagnosticId());
          archivedIds.push(agedId);
          if(archivedIds.length>5000)archivedIds.shift();
          await adapter.write(archiveReceiptPath,JSON.stringify({schemaVersion:1,deviceId:lease.deviceId,ids:archivedIds}));
        }
        // Admit at most one staged device event per pump through the OS-exclusive
        // controller. Never silently promote from an ordinary device publisher.
        const pending=scope?.mode==="reporter"?undefined:await controller?.pending(lease.deviceId);
        if(pending){
          phase="diagnostic-admission";first="controller-exclusive-capacity-admission";failureClass="relay-diagnostic-admission-failed";
          await withController(lease.deviceId,async()=>controller!.admit(pending.runId,lease.deviceId,pending.value));
        }
        // Advance only after all 25-or-fewer inbox records are durable; restart replays safely.
        await adapter.write(cursorPath,JSON.stringify({schemaVersion:1,deviceId:lease.deviceId,pageToken:page.nextPageToken??null}));
      }
      return{status:"ok",published,completed};
    }catch(e){
      const reason=e instanceof MailboxUnavailableError?e.message:
        e instanceof Error&&["mailbox-record-too-large","mailbox-record-invalid","mailbox-sensitive-field"].includes(e.message)?e.message:failureClass;
      const diagnostic=bvpDiagnostic({
        classification:reason,component:"windows-relay",phase,lastConfirmedBoundary:last,
        firstUnconfirmedBoundary:first,effect:"unknown",recommendedAction:"reconcile-relay-state",
        identity:await diagnosticIdentity(context?.runId,context?.commandId),
      });
      return{status:"unavailable",published,completed,reason:diagnostic.classification,diagnostic};
    }
  }
  function pumpOnce():Promise<PumpResult>{if(pumping)return pumping;pumping=pumpCore().finally(()=>{pumping=undefined;});return pumping;}
  return{pumpOnce,admitDiagnostic,acknowledgeDiagnostic};
}
