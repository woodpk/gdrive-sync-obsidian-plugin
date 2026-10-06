import type { BoundedDeviceCommandAgent, DeviceCommand, DeviceCommandResult } from "./device-command-agent";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ROOT_NAME = "BRAIN BVP Mailbox";
const MAX_RECORD_BYTES = 128 * 1024;

export type AuthenticatedDriveRequest = (url: string, init?: RequestInit) => Promise<Response>;
export class MailboxUnavailableError extends Error { constructor(message = "mailbox-unavailable") { super(message); this.name = "MailboxUnavailableError"; } }

interface MailboxFile { id: string; size?: string; appProperties?: Record<string,string>; }
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
  return {validationBuild:{schemaVersion:1,sourceCommit:build.sourceCommit.toLowerCase()},...h,kind:v.kind as DeviceCommandResult["kind"],status:v.status as DeviceCommandResult["status"],classification:v.classification,...(v.replayed===true?{replayed:true as const}:{}),...(v.plan?{plan:structuredClone(v.plan)}:{}),...(v.actionResult?{actionResult:structuredClone(v.actionResult)}:{}),...(v.receipt?{receipt:structuredClone(v.receipt)}:{}),...(v.productStatus?{productStatus:structuredClone(v.productStatus)}:{}),...(v.fixture?{fixture:structuredClone(v.fixture)}:{})};
}
function same(a: Header,b: Header): boolean { return a.runId===b.runId&&a.deviceId===b.deviceId&&a.sequence===b.sequence&&a.commandId===b.commandId; }
function sensitive(value:unknown):boolean{if(!value||typeof value!=="object")return false;if(Array.isArray(value))return value.some(sensitive);return Object.entries(value as Record<string,unknown>).some(([k,v])=>/^(access[_-]?token|refresh[_-]?token|authorization[_-]?code|client[_-]?secret|code[_-]?verifier|password|passcode|token)$/i.test(k)||sensitive(v));}
function jsonBytes(value: unknown): { text:string; bytes:number } { const text=JSON.stringify(value); return {text,bytes:new TextEncoder().encode(text).byteLength}; }
function escapeQuery(value:string):string{return value.replace(/\\/g,"\\\\").replace(/'/g,"\\'");}
function baseName(path:string):string{return path.split("/").filter(Boolean).at(-1)??"record.json";}

export interface DriveCommandMailbox {
  publishCommand(value: DeviceCommand): Promise<void>;
  publishResult(value: DeviceCommandResult): Promise<void>;
  commands(runId: string, deviceId: string): Promise<DeviceCommand[]>;
  resultFor(value: DeviceCommand): Promise<DeviceCommandResult | undefined>;
  activeRun(deviceId: string): Promise<string | undefined>;
  cleanup(runId: string, deviceId: string): Promise<number>;
}

export function createDriveCommandMailbox(request: AuthenticatedDriveRequest): DriveCommandMailbox {
  let root: Promise<string> | undefined;
  async function call(url:string,init?:RequestInit):Promise<Response>{try{const r=await request(url,init);if(!r.ok)throw new Error("http-"+r.status);return r;}catch(e){throw e instanceof MailboxUnavailableError?e:new MailboxUnavailableError("mailbox-drive-unavailable");}}
  async function rootId():Promise<string>{return root??=(async()=>{const q=encodeURIComponent("trashed = false and appProperties has { key='brainBvpMailbox' and value='1' }");const found=await call(`${API}/files?q=${q}&spaces=drive&pageSize=10&fields=files(id,name,appProperties)`);const files=((await found.json()) as FileList).files??[];if(files.length>1)throw new Error("mailbox-root-ambiguous");if(files[0])return files[0].id;const created=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:ROOT_NAME,mimeType:FOLDER_MIME,appProperties:{brainBvpMailbox:"1"}})});const value=await created.json() as {id?:string};if(!value.id)throw new Error("mailbox-root-create-invalid");return value.id;})();}
  async function bindingListing(deviceId:string):Promise<FileList>{const parent=await rootId();const q=encodeURIComponent(`'${escapeQuery(parent)}' in parents and trashed = false and appProperties has { key='brainBvpRecord' and value='1' } and appProperties has { key='brainBvpKind' and value='run-binding' } and appProperties has { key='brainBvpDeviceId' and value='${escapeQuery(deviceId)}' }`);const response=await call(`${API}/files?q=${q}&spaces=drive&pageSize=20&fields=nextPageToken,files(id,appProperties)`);const page=await response.json() as FileList;if(page.nextPageToken)throw new MailboxUnavailableError("mailbox-run-binding-overflow");return page;}
  async function activeRun(deviceId:string):Promise<string|undefined>{const runs=[...new Set((await bindingListing(deviceId)).files?.map(file=>file.appProperties?.brainBvpRunId).filter((value):value is string=>Boolean(value))??[])];if(runs.length>1)throw new MailboxUnavailableError("mailbox-run-binding-ambiguous");return runs[0];}
  async function deleteFile(id:string):Promise<void>{await call(`${API}/files/${encodeURIComponent(id)}`,{method:"DELETE"});}
  async function ensureRunBinding(runId:string,deviceId:string):Promise<void>{const current=await activeRun(deviceId);if(current===runId)return;if(current)throw new MailboxUnavailableError("mailbox-device-run-conflict");const parent=await rootId();await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`bvp-run-binding-${crypto.randomUUID()}.json`,parents:[parent],mimeType:"application/json",appProperties:{brainBvpRecord:"1",brainBvpKind:"run-binding",brainBvpRunId:runId,brainBvpDeviceId:deviceId}})});}
  async function publish(kind:"command"|"result",value:unknown):Promise<void>{const safe=kind==="command"?command(value):result(value);if(!safe)throw new Error("mailbox-record-invalid");if(sensitive(safe))throw new Error("mailbox-sensitive-field");const encoded=jsonBytes(safe);if(encoded.bytes>MAX_RECORD_BYTES)throw new Error("mailbox-record-too-large");if(kind==="command")await ensureRunBinding(safe.runId,safe.deviceId);const parent=await rootId();const meta=await call(`${API}/files?fields=id`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`bvp-${kind}-${crypto.randomUUID()}.json`,parents:[parent],mimeType:"application/json",appProperties:{brainBvpRecord:"1",brainBvpKind:kind,brainBvpRunId:safe.runId,brainBvpDeviceId:safe.deviceId}})});const m=await meta.json() as {id?:string};if(!m.id)throw new Error("mailbox-record-create-invalid");await call(`${UPLOAD}/files/${encodeURIComponent(m.id)}?uploadType=media`,{method:"PATCH",headers:{"content-type":"application/json"},body:encoded.text});}
  async function listing(kind:"command"|"result"|"run-binding",runId:string,deviceId:string):Promise<FileList>{const parent=await rootId();const q=encodeURIComponent(`'${escapeQuery(parent)}' in parents and trashed = false and appProperties has { key='brainBvpRecord' and value='1' } and appProperties has { key='brainBvpKind' and value='${kind}' } and appProperties has { key='brainBvpRunId' and value='${escapeQuery(runId)}' } and appProperties has { key='brainBvpDeviceId' and value='${escapeQuery(deviceId)}' }`);const response=await call(`${API}/files?q=${q}&spaces=drive&pageSize=200&fields=nextPageToken,files(id,size,appProperties)`);return await response.json() as FileList;}
  async function records(kind:"command"|"result",runId:string,deviceId:string):Promise<{file:MailboxFile;value:unknown}[]>{const page=await listing(kind,runId,deviceId);if(page.nextPageToken)throw new MailboxUnavailableError("mailbox-current-run-overflow");const output:{file:MailboxFile;value:unknown}[]=[];for(const file of page.files??[]){if(file.size&&Number(file.size)>MAX_RECORD_BYTES)continue;const media=await call(`${API}/files/${encodeURIComponent(file.id)}?alt=media`);const text=await media.text();if(new TextEncoder().encode(text).byteLength>MAX_RECORD_BYTES)continue;try{output.push({file,value:JSON.parse(text)});}catch{}}return output;}
  return {
    publishCommand:value=>publish("command",value),
    publishResult:value=>publish("result",value),
    async commands(runId,deviceId){const values=(await records("command",runId,deviceId)).map(v=>command(v.value)).filter((v):v is DeviceCommand=>Boolean(v&&v.runId===runId&&v.deviceId===deviceId));return values.sort((a,b)=>a.sequence-b.sequence);},
    async resultFor(value){const target=header(value)!;const values=(await records("result",target.runId,target.deviceId)).map(v=>result(v.value)).filter((v):v is DeviceCommandResult=>Boolean(v&&same(v,target)));if(!values.length)return undefined;const first=JSON.stringify(values[0]);if(values.some(v=>JSON.stringify(v)!==first))throw new Error("mailbox-conflicting-result");return values[0];},
    activeRun,
    async cleanup(runId,deviceId){let removed=0;for(const kind of ["command","result","run-binding"] as const){let done=false;for(let batch=0;batch<20&&!done;batch++){const page=await listing(kind,runId,deviceId),files=page.files??[];for(const file of files){await call(`${API}/files/${encodeURIComponent(file.id)}`,{method:"DELETE"});removed++;}done=!page.nextPageToken;if(!done&&batch===19)throw new MailboxUnavailableError("mailbox-cleanup-limit");}}return removed;},
  };
}

export async function pollDeviceMailboxOnce(mailbox:DriveCommandMailbox,agent:BoundedDeviceCommandAgent,runId:string,deviceId:string):Promise<{status:"ok";processed:number}|{status:"unavailable";processed:number;reason:string}>{
  let processed=0;try{for(const cmd of await mailbox.commands(runId,deviceId)){if(await mailbox.resultFor(cmd))continue;const response=await agent.execute(cmd);await mailbox.publishResult(response);processed++;}return{status:"ok",processed};}catch(e){if(e instanceof MailboxUnavailableError)return{status:"unavailable",processed,reason:e.message};throw e;}
}

export function createWindowsMailboxRelay(mailbox:DriveCommandMailbox,adapter:RelayAdapter,root:string){
  const out=`${root}/outbox`,sent=`${root}/sent`,inside=`${root}/inbox`;
  type PumpResult={status:"ok"|"unavailable";published:number;completed:number};
  let pumping:Promise<PumpResult>|undefined;
  async function ensure(){for(const p of [root,out,sent,inside])if(!await adapter.exists(p))await adapter.mkdir(p);}
  async function pumpCore():Promise<PumpResult>{let published=0,completed=0;try{await ensure();for(const path of (await adapter.list(out)).files){const raw=await adapter.read(path),cmd=command(JSON.parse(raw));if(!cmd)throw new Error("relay-command-invalid");await mailbox.publishCommand(cmd);await adapter.rename(path,`${sent}/${baseName(path)}`);published++;}for(const path of (await adapter.list(sent)).files){const cmd=command(JSON.parse(await adapter.read(path)));if(!cmd)throw new Error("relay-pending-invalid");const res=await mailbox.resultFor(cmd);if(!res)continue;await adapter.write(`${inside}/${baseName(path)}.result.json`,JSON.stringify(res));await adapter.remove(path);completed++;}return{status:"ok",published,completed};}catch(e){if(e instanceof MailboxUnavailableError)return{status:"unavailable",published,completed};throw e;}}
  function pumpOnce():Promise<PumpResult>{if(pumping)return pumping;pumping=pumpCore().finally(()=>{pumping=undefined;});return pumping;}
  return{pumpOnce};
}
