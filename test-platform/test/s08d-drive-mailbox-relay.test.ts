import { createHash, randomUUID } from "node:crypto";
import { BvpRuntimeErrorJournal, BvpJournalError } from "../src/bvp-runtime-error-journal";
import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { windowsDiagnosticExclusiveLock } from "../src/live-device/live-scenario-executor";
import { deepEqual, equal, rejects } from "node:assert/strict";
import { test } from "node:test";
import { bvpDiagnostic } from "../src/scenario/scenario-diagnostics";
import { opaqueDiagnosticId } from "../src/diagnostic-contract";
import {
  MailboxUnavailableError,
  createDriveCommandMailbox,
  createWindowsMailboxRelay,
  pollDeviceMailboxOnce,
  type AuthenticatedDriveRequest,
} from "../src/live-device/drive-mailbox";
import {
  createBoundedDeviceCommandAgent,
  type BoundedDeviceCommandAgent,
  type DeviceCommand,
  type DeviceCommandResult,
  type DeviceSequenceState,
} from "../src/live-device/device-command-agent";

function assertRelayUnavailable(result:{status:string;published:number;completed:number;reason?:string;diagnostic?:{component:string;phase:string;effect:string;classification:string;lastConfirmedBoundary:string;firstUnconfirmedBoundary:string}},reason?:string):void {
  deepEqual({status:result.status,published:result.published,completed:result.completed},
    {status:"unavailable",published:0,completed:0});
  equal(typeof result.reason,"string");
  equal(result.diagnostic?.component,"windows-relay");
  equal(result.diagnostic?.effect,"unknown");
  equal(result.diagnostic?.classification,result.reason);
  if(reason)equal(result.reason,reason);
}

class FakeDrive {
  next=1; files=new Map<string,{meta:any;content:string}>(); diagnosticPageSizes:number[]=[];
  request:AuthenticatedDriveRequest=async(input,init={})=>{const url=new URL(input),method=(init.method??"GET").toUpperCase(),path=url.pathname;
    if(path==="/drive/v3/files"&&method==="GET"){const q=decodeURIComponent(url.searchParams.get("q")??"");const root=q.includes("brainBvpMailbox")&&!q.includes("brainBvpRecord")&&!q.includes("brainBvpKind"),prop=(key:string)=>q.match(new RegExp(key+"' and value='([^']+)"))?.[1],kind=prop("brainBvpKind"),run=prop("brainBvpRunId"),device=prop("brainBvpDeviceId");const event=prop("brainBvpEventId");const matched=[...this.files].filter(([,v])=>root?v.meta.appProperties?.brainBvpMailbox==="1":(!q.includes("brainBvpRecord")||v.meta.appProperties?.brainBvpRecord==="1")&&(!kind||v.meta.appProperties?.brainBvpKind===kind)&&(!run||v.meta.appProperties?.brainBvpRunId===run)&&(!device||v.meta.appProperties?.brainBvpDeviceId===device)&&(!event||v.meta.appProperties?.brainBvpEventId===event));const pageSize=Math.min(200,Math.max(1,Number(url.searchParams.get("pageSize")??"100")));const rawToken=url.searchParams.get("pageToken");const start=rawToken?Number(/^page:(\d+)$/.exec(rawToken)?.[1]??NaN):0;if(!Number.isSafeInteger(start)||start<0)return new Response("",{status:400});if(kind==="diagnostic")this.diagnosticPageSizes.push(pageSize);const files=matched.slice(start,start+pageSize).map(([id,v])=>({id,name:v.meta.name,size:String(new TextEncoder().encode(v.content).byteLength),appProperties:v.meta.appProperties}));return Response.json({files,...(matched.length>start+pageSize?{nextPageToken:"page:"+(start+pageSize)}:{})});}
    if(path==="/drive/v3/files/generateIds"&&method==="GET")return Response.json({ids:["reserved-"+this.next++]});
    if(path==="/drive/v3/files"&&method==="POST"){const meta=JSON.parse(String(init.body??"{}")),id=meta.id??"f"+this.next++;if(this.files.has(id))return new Response("",{status:409});this.files.set(id,{meta,content:""});return Response.json({id});}
    const upload=path.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);if(upload&&method==="PATCH"){const file=this.files.get(upload[1]);if(!file)return new Response("",{status:404});file.content=String(init.body??"");return new Response("",{status:200});}
    const media=path.match(/^\/drive\/v3\/files\/([^/]+)$/);if(media&&method==="GET"&&url.searchParams.get("alt")!=="media"){const file=this.files.get(media[1]);return file?Response.json({id:media[1],size:String(new TextEncoder().encode(file.content).byteLength),appProperties:file.meta.appProperties}):new Response("",{status:404});}if(media&&method==="GET"&&url.searchParams.get("alt")==="media"){const file=this.files.get(media[1]);return file?new Response(file.content,{status:200}):new Response("",{status:404});}
    if(media&&method==="PATCH"){const file=this.files.get(media[1]);if(!file)return new Response("",{status:404});const update=JSON.parse(String(init.body??"{}"));file.meta.appProperties={...file.meta.appProperties,...update.appProperties};return Response.json({id:media[1]});}
    if(media&&method==="DELETE"){this.files.delete(media[1]);return new Response(null,{status:204});}
    return new Response("",{status:400});};
  folder(){return [...this.files.values()].find(v=>v.meta.appProperties?.brainBvpMailbox==="1");}
}
class Files {
  dirs=new Set<string>(); values=new Map<string,string>();
  async exists(p:string){return this.dirs.has(p)||this.values.has(p);} async mkdir(p:string){this.dirs.add(p);}
  async list(p:string){const prefix=p+"/";return{files:[...this.values.keys()].filter(v=>v.startsWith(prefix)&&!v.slice(prefix.length).includes("/")),folders:[]};}
  async read(p:string){const v=this.values.get(p);if(v===undefined)throw new Error("missing");return v;} async write(p:string,v:string){this.values.set(p,v);}
  async rename(a:string,b:string){const v=await this.read(a);this.values.set(b,v);this.values.delete(a);} async remove(p:string){this.values.delete(p);}
  private static exclusive=new Set<string>();
  async withExclusiveDiagnosticDevice<T>(deviceId:string,act:()=>Promise<T>):Promise<T>{
    if(Files.exclusive.has(deviceId))throw Error("relay-controller-exclusive-busy");
    Files.exclusive.add(deviceId);
    try{return await act();}finally{Files.exclusive.delete(deviceId);}
  }
}
const validationBuild={schemaVersion:1 as const,sourceCommit:"a".repeat(40)};
const command=(sequence=1,runId="run-a",deviceId="device-a"):DeviceCommand=>({runId,deviceId,sequence,commandId:"cmd-"+sequence,kind:"observe-product"});
const result=(c:DeviceCommand,classification="product-observed"):DeviceCommandResult=>({validationBuild,runId:c.runId,deviceId:c.deviceId,sequence:c.sequence,commandId:c.commandId,kind:c.kind,status:"completed",classification});
const authorityPath=(root:string,deviceId:string)=>root+"/controller-authority/"+createHash("sha256").update(deviceId).digest("hex")+".json";
async function authorize(files:Files,root:string,runId:string,deviceId:string,generation=1){for(const p of [root,root+"/outbox",root+"/controller-authority"])files.dirs.add(p);await files.write(authorityPath(root,deviceId),JSON.stringify({schemaVersion:1,generation,runId,deviceId}));}
function seedCommand(drive:FakeDrive,value:any,id="seed-"+drive.next++){drive.files.set(id,{meta:{appProperties:{brainBvpRecord:"1",brainBvpKind:"command",brainBvpRunId:value.runId,brainBvpDeviceId:value.deviceId,brainBvpGeneration:"1"}},content:JSON.stringify(value)});}
function seedBinding(drive:FakeDrive,runId:string,deviceId:string,generation:number,id="binding-"+drive.next++){drive.files.set(id,{meta:{appProperties:{brainBvpRecord:"1",brainBvpKind:"run-binding",brainBvpRunId:runId,brainBvpDeviceId:deviceId,brainBvpGeneration:String(generation)}},content:""});}
async function relayPublish(mailbox:ReturnType<typeof createDriveCommandMailbox>,files:Files,root:string,value:DeviceCommand,generation=1,name="cmd.json"){await authorize(files,root,value.runId,value.deviceId,generation);await files.write(root+"/outbox/"+name,JSON.stringify(value));return createWindowsMailboxRelay(mailbox,files,root).pumpOnce();}

test("Drive mailbox is separate, bounded, addressed, duplicate-tolerant, and exact-result correlated",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);equal("publishCommand" in (mailbox as any),false);const a=command(),wrongRun=command(2,"other","device-a"),wrongDevice=command(3,"run-a","other");seedCommand(drive,wrongDevice);seedCommand(drive,command(2));seedCommand(drive,{...a,accessToken:"must-not-persist"});seedCommand(drive,wrongRun,"stale-wrong-run");seedCommand(drive,a);const addressed=await mailbox.commands("run-a","device-a");deepEqual(addressed.map(v=>v.sequence),[1,1,2]);equal(addressed.some(v=>"accessToken" in (v as any)),false);const folder=drive.folder();equal(folder?.meta.name,"BRAIN BVP Mailbox");equal(folder?.meta.appProperties.brainBvpMailbox,"1");equal(folder?.meta.appProperties.brainSyncRole,undefined);await mailbox.publishResult(result(a));deepEqual(await mailbox.resultFor(a),result(a));const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",huge={...a,kind:"fixture-put",path:"huge.md",content:{type:"text",text:"x".repeat(140000)}} as any;await authorize(files,root,a.runId,a.deviceId);await files.write(root+"/outbox/huge.json",JSON.stringify(huge));{const blocked=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();equal(blocked.status,"unavailable");equal(blocked.reason,"mailbox-record-too-large");equal(blocked.diagnostic?.phase,"command-publication");equal(await files.exists(root+"/outbox/huge.json"),true);}await rejects(()=>mailbox.publishResult({...result(a),receipt:{accessToken:"secret"}} as any),/mailbox-sensitive-field/);await mailbox.publishResult(result(a,"different"));await rejects(()=>mailbox.resultFor(a),/mailbox-conflicting-result/);});

test("unavailable Drive is explicit and device pump preserves S08C typed results",async()=>{const unavailable=createDriveCommandMailbox(async()=>{throw new Error("offline");});await rejects(()=>unavailable.commands("run-a","device-a"),MailboxUnavailableError);const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),c=command();seedCommand(drive,c);let executions=0;const agent:BoundedDeviceCommandAgent={async execute(input){executions++;return result(input as DeviceCommand);}};deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:1});deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:0});equal(executions,1);});

test("Windows relay survives reconstruction using only exact sent command files",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",c=command();await authorize(files,root,c.runId,c.deviceId);await files.write(root+"/outbox/cmd.json",JSON.stringify(c));const first=createWindowsMailboxRelay(mailbox,files,root);deepEqual(await first.pumpOnce(),{status:"ok",published:1,completed:0});equal(await files.exists(root+"/sent/cmd.json"),true);await mailbox.publishResult(result(c));const restarted=createWindowsMailboxRelay(mailbox,files,root);deepEqual(await restarted.pumpOnce(),{status:"ok",published:0,completed:1});equal(await files.exists(root+"/sent/cmd.json"),false);deepEqual(JSON.parse(await files.read(root+"/inbox/cmd.json.result.json")),result(c));});

test("relay requires exact external-controller authority and unavailable Drive stays pending",async()=>{const root=".obsidian/plugins/brain-google-drive-sync/.bvp-relay",c=command(),files=new Files(),drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);for(const p of [root,root+"/outbox"])files.dirs.add(p);await files.write(root+"/outbox/cmd.json",JSON.stringify(c));let relay=createWindowsMailboxRelay(mailbox,files,root);assertRelayUnavailable(await relay.pumpOnce());await authorize(files,root,"other",c.deviceId);assertRelayUnavailable(await relay.pumpOnce());await authorize(files,root,c.runId,c.deviceId);relay=createWindowsMailboxRelay(createDriveCommandMailbox(async()=>{throw new Error("offline");}),files,root);assertRelayUnavailable(await relay.pumpOnce());equal(await files.exists(root+"/outbox/cmd.json"),true);const policy=readFileSync(resolve(process.cwd(),"src/local/config-policy.ts"),"utf8");equal(policy.includes('lower.startsWith("plugins/brain-google-drive-sync/")'),true);equal(policy.includes('{ classification: "protected", reason: "sync-operational-state" }'),true);});

test("reordered and duplicate mailbox delivery cannot bypass S08C sequence safety",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),calls:string[]=[];let state:DeviceSequenceState|undefined;const agent=createBoundedDeviceCommandAgent({runId:"run-a",deviceId:"device-a",fixtureRoot:"BVP-VALIDATION/run-a",fixtures:{async putText(path,text){calls.push("put:"+path+":"+text);},async putPattern(){throw new Error("unused");},async remove(){throw new Error("unused");},async observe(){return{exists:true,sizeBytes:1,sha256:"a".repeat(64)};}},sequenceState:{async load(){return state?structuredClone(state):undefined;},async compareAndSave(_run,_device,expected,value){if(JSON.stringify(state)!==JSON.stringify(expected))return false;state=structuredClone(value);return true;}},validationBuild});const one={runId:"run-a",deviceId:"device-a",sequence:1,commandId:"one",kind:"fixture-put",path:"one.md",content:{type:"text",text:"1"}} as DeviceCommand,two={runId:"run-a",deviceId:"device-a",sequence:2,commandId:"two",kind:"fixture-put",path:"two.md",content:{type:"text",text:"2"}} as DeviceCommand;seedCommand(drive,two);seedCommand(drive,one);seedCommand(drive,one);deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:2});deepEqual(calls,["put:BVP-VALIDATION/run-a/one.md:1","put:BVP-VALIDATION/run-a/two.md:2"]);deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:0});equal(calls.length,2);});

test("mailbox history is isolated by run/device and cleanup cannot touch unrelated records",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);for(let i=0;i<201;i++)seedCommand(drive,command(i+1,"old-run","old-device"),"old-"+i);const current=command();seedCommand(drive,current);await mailbox.publishResult(result(current));seedCommand(drive,command(1,"other-run","other-device"));equal(await mailbox.cleanup("run-a","device-a"),2);equal((await mailbox.commands("other-run","other-device")).length,1);for(let i=0;i<201;i++)seedCommand(drive,command(i+1,"overflow-run","device-a"),"current-"+i);await rejects(()=>mailbox.commands("overflow-run","device-a"),/mailbox-current-run-overflow/);});

test("generation-stamped bindings ignore stale lower generations and reject same-generation ambiguity",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);seedBinding(drive,"run-a","device-a",1,"a");seedBinding(drive,"run-b","device-a",2,"b");equal(await mailbox.activeRun("device-a"),"run-b");seedBinding(drive,"run-c","device-a",2,"c");await rejects(()=>mailbox.activeRun("device-a"),/mailbox-run-binding-ambiguous/);});

test("selective Drive omission cannot authorize a competing run while controller authority remains A",async()=>{const drive=new FakeDrive();seedBinding(drive,"run-a","device-a",1,"old-a");const request:AuthenticatedDriveRequest=async(input,init={})=>{const response=await drive.request(input,init),url=new URL(input),q=decodeURIComponent(url.searchParams.get("q")??"");if(url.pathname!=="/drive/v3/files"||(init.method??"GET").toUpperCase()!=="GET"||!q.includes("brainBvpKind' and value='run-binding'"))return response;const data=await response.json() as any;data.files=(data.files??[]).filter((file:any)=>file.appProperties?.brainBvpRunId!=="run-a");return Response.json(data);};const mailbox=createDriveCommandMailbox(request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",b=command(1,"run-b","device-a");await authorize(files,root,"run-a","device-a",1);await files.write(root+"/outbox/b.json",JSON.stringify(b));assertRelayUnavailable(await createWindowsMailboxRelay(mailbox,files,root).pumpOnce());equal([...drive.files.values()].some(value=>value.meta.appProperties?.brainBvpRunId==="run-b"),false);equal(await files.exists(root+"/outbox/b.json"),true);});

test("selectively delayed stale binding cannot override a newer controller generation",async()=>{const drive=new FakeDrive();seedBinding(drive,"run-a","device-a",1,"old-a");let hideA=true;const request:AuthenticatedDriveRequest=async(input,init={})=>{const response=await drive.request(input,init),url=new URL(input),q=decodeURIComponent(url.searchParams.get("q")??"");if(!hideA||url.pathname!=="/drive/v3/files"||(init.method??"GET").toUpperCase()!=="GET"||!q.includes("brainBvpKind' and value='run-binding'"))return response;const data=await response.json() as any;data.files=(data.files??[]).filter((file:any)=>file.appProperties?.brainBvpRunId!=="run-a");return Response.json(data);};const mailbox=createDriveCommandMailbox(request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",b=command(1,"run-b","device-a");await relayPublish(mailbox,files,root,b,2);hideA=false;equal(await mailbox.activeRun("device-a"),"run-b");deepEqual((await mailbox.commands("run-b","device-a")).map(value=>value.commandId),["cmd-1"]);});

test("own binding must become visible before relay publishes the command",async()=>{const drive=new FakeDrive();let hideBindings=true;const request:AuthenticatedDriveRequest=async(input,init={})=>{const response=await drive.request(input,init),url=new URL(input),q=decodeURIComponent(url.searchParams.get("q")??"");if(!hideBindings||url.pathname!=="/drive/v3/files"||(init.method??"GET").toUpperCase()!=="GET"||!q.includes("brainBvpKind' and value='run-binding'"))return response;return Response.json({files:[]});};const mailbox=createDriveCommandMailbox(request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",a=command();await authorize(files,root,a.runId,a.deviceId,1);await files.write(root+"/outbox/a.json",JSON.stringify(a));assertRelayUnavailable(await createWindowsMailboxRelay(mailbox,files,root).pumpOnce());equal([...drive.files.values()].some(value=>value.meta.appProperties?.brainBvpKind==="command"),false);hideBindings=false;deepEqual(await createWindowsMailboxRelay(mailbox,files,root).pumpOnce(),{status:"ok",published:1,completed:0});});

test("Windows relay pump is non-reentrant while a publish is in flight",async()=>{const drive=new FakeDrive();let release!:()=>void,entered!:()=>void,publishes=0;const gate=new Promise<void>(resolve=>{release=resolve;}),atPublish=new Promise<void>(resolve=>{entered=resolve;}),request:AuthenticatedDriveRequest=async(input,init={})=>{const url=new URL(input),method=(init.method??"GET").toUpperCase();if(url.pathname==="/drive/v3/files"&&method==="POST"){const meta=JSON.parse(String(init.body??"{}"));if(meta.appProperties?.brainBvpKind==="command"){publishes++;entered();await gate;}}return drive.request(input,init);};const mailbox=createDriveCommandMailbox(request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",cmd=command();await authorize(files,root,cmd.runId,cmd.deviceId);await files.write(root+"/outbox/cmd.json",JSON.stringify(cmd));const relay=createWindowsMailboxRelay(mailbox,files,root),first=relay.pumpOnce();await atPublish;const second=relay.pumpOnce();equal(publishes,1);release();deepEqual(await first,{status:"ok",published:1,completed:0});deepEqual(await second,{status:"ok",published:1,completed:0});equal(publishes,1);equal(await files.exists(root+"/sent/cmd.json"),true);});

test("relay makes missing controller lease explicit without falsely claiming publication",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files();
  const root=".obsidian/plugins/brain/.bvp-relay",cmd=command();
  await files.write(root+"/outbox/missing-lease.json",JSON.stringify(cmd));
  const outcome=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();
  assertRelayUnavailable(outcome,"relay-controller-run-unleased");
  equal(outcome.diagnostic?.phase,"command-authorization");
  equal(outcome.diagnostic?.lastConfirmedBoundary,"relay-command-read");
  equal(outcome.diagnostic?.firstUnconfirmedBoundary,"command-lease-validation");
  equal(await files.exists(root+"/outbox/missing-lease.json"),true);
});

test("mailbox roundtrip preserves bounded handler uncertainty while sanitizing forged diagnostic fields",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),cmd=command();
  const diagnostic=bvpDiagnostic({
    classification:"command-handler-failed",component:"device-agent",phase:"command-execution",
    lastConfirmedBoundary:"sequence-claim-persisted",firstUnconfirmedBoundary:"command-handler-outcome",
    effect:"unknown",recommendedAction:"reconcile-claimed-command",
  });
  const failure={...result(cmd),status:"failed" as const,classification:"command-handler-failed",diagnostic};
  await mailbox.publishResult(failure);
  deepEqual(await mailbox.resultFor(cmd),failure);
  const corrupt=command(2),privateResult={...result(corrupt),status:"failed" as const,
    classification:"Bearer oauth-hidden-secret",diagnostic:{...diagnostic,phase:"C:\\private\\vault"}};
  await mailbox.publishResult(privateResult as any);
  const recovered=await mailbox.resultFor(corrupt);
  equal(recovered?.classification,"unexpected-internal-error");
  equal(recovered?.diagnostic?.phase,"unknown-phase");
  equal(JSON.stringify(recovered).includes("oauth-hidden-secret"),false);
  equal(JSON.stringify(recovered).includes("private"),false);
});

test("malformed relay outbox/sent messages return safe distinct phase and preserve original bytes",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),
    root=".obsidian/plugins/brain/.bvp-relay";
  for(const folder of ["outbox","sent"]){
    const files=new Files(),path=root+"/"+folder+"/bad.json",payload="{Bearer oauth-secret /vault.md";
    await files.write(path,payload);
    const res=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();
    equal(res.status,"unavailable");
    equal(res.reason,folder==="outbox"?"relay-outbox-malformed":"relay-sent-malformed");
    equal(res.diagnostic?.effect,"unknown");
    equal(res.diagnostic?.firstUnconfirmedBoundary,"relay-command-decoding");
    equal(await files.read(path),payload);
    equal(JSON.stringify(res).includes("oauth-secret"),false);
  }
});

test("relay adapter read, rename and inbox-write failures are classified without deleting uncertain state",async()=>{
  const root=".obsidian/plugins/brain/.bvp-relay",drive=new FakeDrive(),
    mailbox=createDriveCommandMailbox(drive.request),c=command();
  for(const operation of ["read","rename","write"] as const){
    const files=new Files();
    await authorize(files,root,c.runId,c.deviceId);
    const path=root+(operation==="write"?"/sent/":"/outbox/")+"cmd.json";
    await files.write(path,JSON.stringify(c));
    const secret="Bearer secret-path /private/Vault/client-note.md";
    const adapter={
      exists:(p:string)=>files.exists(p),mkdir:(p:string)=>files.mkdir(p),
      list:(p:string)=>files.list(p),
      read:(p:string)=>operation==="read"&&p===path?Promise.reject(new Error(secret)):files.read(p),
      write:(p:string,v:string)=>operation==="write"&&p.startsWith(root+"/inbox/")?Promise.reject(new Error(secret)):files.write(p,v),
      rename:(a:string,b:string)=>operation==="rename"?Promise.reject(new Error(secret)):files.rename(a,b),
      remove:(p:string)=>files.remove(p),
    };
    if(operation==="write")await mailbox.publishResult(result(c));
    const res=await createWindowsMailboxRelay(mailbox,adapter,root).pumpOnce();
    equal(res.status,"unavailable");
    equal(res.reason,operation==="read"?"relay-file-read-failed":operation==="rename"?"relay-file-rename-failed":"relay-inbox-write-failed");
    equal(res.diagnostic?.effect,"unknown");
    equal(await files.exists(path),true);
    equal(JSON.stringify(res).includes("secret-path"),false);
    equal(JSON.stringify(res).includes("client-note"),false);
  }
});

test("device mailbox polling ordinary failure is classified instead of rejecting into a silent periodic catch",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),c=command();
  seedCommand(drive,c);
  const agent:BoundedDeviceCommandAgent={async execute(){throw new Error("Bearer local-device-secret");}};
  const res=await pollDeviceMailboxOnce(mailbox,agent,c.runId,c.deviceId);
  equal(res.status,"unavailable");
  equal(res.reason,"device-command-execution-failed");
  equal(res.diagnostic?.component,"device-agent");
  equal(res.diagnostic?.firstUnconfirmedBoundary,"device-command-outcome");
  equal(JSON.stringify(res).includes("local-device-secret"),false);
});

function bvpPollFailure(classification="mailbox-drive-unauthorized"){return bvpDiagnostic({
  classification,component:"drive-mailbox",phase:"active-run-read",
  lastConfirmedBoundary:"device-poll-started",firstUnconfirmedBoundary:"drive-binding-read",
  effect:"unknown",recommendedAction:"inspect-device-journal",
});}

test("DEC-352 durable journal persists offline failures, deduplicates and records one recovery",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  const first=new BvpRuntimeErrorJournal(files,root);
  await Promise.all(Array.from({length:8},()=>first.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"})));
  const restarted=new BvpRuntimeErrorJournal(files,root);
  equal((await restarted.snapshot()).entries[0]?.occurrences,8);
  await restarted.recover(bvpDiagnostic({classification:"bvp-runtime-poll-recovered",
    component:"device-agent",phase:"poll-recovery",lastConfirmedBoundary:"mailbox-poll-completed",
    firstUnconfirmedBoundary:"none",effect:"none-confirmed",recommendedAction:"none"}),{runId:"run-a",deviceId:"device-a"});
  await restarted.recover(bvpPollFailure("not-another-recovery"),{runId:"run-a",deviceId:"device-a"});
  equal((await restarted.snapshot()).entries.length,2);
  const delivered:string[]=[];
  await restarted.flush(async e=>{delivered.push(e.eventId);});
  equal(delivered.length,2);
  equal((await restarted.snapshot()).entries.every(e=>e.deliveredCount===e.occurrences),true);
  await restarted.flush(async()=>{throw new Error("unexpected duplicate");});
  equal(delivered.length,2);
});

test("DEC-352 failed delivery remains pending and journal errors are explicit",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",journal=new BvpRuntimeErrorJournal(files,root);
  await journal.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"});
  await rejects(()=>journal.flush(async()=>{throw new Error("Bearer secret /private/vault");}),/Bearer/);
  const replay=new BvpRuntimeErrorJournal(files,root);
  equal((await replay.snapshot()).entries[0]?.deliveredCount,0);
  let safe="";
  await replay.flush(async event=>{safe=JSON.stringify(event);});
  equal(/Bearer|private\/vault/.test(safe),false);
  files.values.set(root+"/runtime-errors.json",'{"invalid":true}');
  await rejects(()=>replay.record(bvpPollFailure()),e=>e instanceof BvpJournalError&&e.code==="bvp-journal-corrupt");
});

test("DEC-352 device diagnostics arrive in exact leased Windows relay inbox idempotently",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files();
  const root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-a","device-a",2);
  const event={...await r3Record("run-a"),occurrences:3};
  const first={...event,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:await mailbox.reserveDiagnosticId()};
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",first),/mailbox-diagnostic-awaiting-controller/);
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  await relay.admitDiagnostic("run-a","device-a",first);
  equal((await mailbox.diagnostics("run-a","device-a")).length,1);
  equal((await mailbox.diagnostics("other-run","device-a")).length,0);
  const dest=root+"/inbox/bvp-diagnostic-"+event.eventId+".error.json";
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  equal(JSON.parse(await files.read(dest)).occurrences,3);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  // DEC-356 freezes the acknowledged event; later occurrences acquire a new event ID.
  const more={...await r3Record("run-a"),origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:await mailbox.reserveDiagnosticId()};
  await relay.admitDiagnostic("run-a","device-a",more);
  await relay.pumpOnce();
  equal(JSON.parse(await files.read(dest)).occurrences,3);
  equal([...files.values.keys()].filter(k=>k.endsWith(".error.json")).length,2);
});

test("DEC-352 mailbox rejects unsafe diagnostic codes and forged identifiers",async()=>{
  const mailbox=createDriveCommandMailbox(new FakeDrive().request);
  const event={schemaVersion:1 as const,eventId:randomUUID(),firstAt:new Date().toISOString(),
    lastAt:new Date().toISOString(),occurrences:1,diagnostic:bvpPollFailure()};
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...event,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:"reserved-invalid",diagnostic:{
    ...event.diagnostic,classification:"Bearer hidden-token"}}),/mailbox-diagnostic-invalid/);
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...event,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:"reserved-invalid",eventId:"../../bad-path"}),/mailbox-diagnostic-invalid/);
});

test("DEC-352 addressed malformed mailbox entries are diagnosed, never silently skipped",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);
  const record=command(),badId="bad-"+randomUUID();
  seedCommand(drive,record,badId);
  drive.files.get(badId)!.content="not-valid-json";
  await rejects(()=>mailbox.commands(record.runId,record.deviceId),/mailbox-record-malformed/);
  drive.files.get(badId)!.content=JSON.stringify({...record,kind:"unknown-kind"});
  await rejects(()=>mailbox.commands(record.runId,record.deviceId),/mailbox-command-invalid/);
});

test("DEC-352 invalid addressed diagnostic blocks ingest and preserves relay status",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files();
  const root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-a","device-a");
  drive.files.set("malformed-diagnostic",{meta:{appProperties:{brainBvpRecord:"1",brainBvpKind:"diagnostic",
    brainBvpRunId:"run-a",brainBvpDeviceId:"device-a",brainBvpEventId:randomUUID()}},content:"{malformed"});
  const response=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();
  equal(response.status,"unavailable");
  equal(response.diagnostic?.component,"windows-relay");
  equal(response.diagnostic?.phase,"diagnostic-ingest");
  equal(response.reason,"mailbox-record-malformed");
});

test("DEC-352 interrupted diagnostic media upload stays hidden from the relay",async()=>{
  const drive=new FakeDrive();
  const request:AuthenticatedDriveRequest=async(url,init={})=>{
    if(url.includes("uploadType=media")&&(init.method??"GET")==="PATCH")return new Response("",{status:503});
    return drive.request(url,init);
  };
  const mailbox=createDriveCommandMailbox(request);
  const value={schemaVersion:1 as const,eventId:randomUUID(),firstAt:new Date().toISOString(),
    lastAt:new Date().toISOString(),occurrences:1,diagnostic:bvpPollFailure()};
  const reservedId=await mailbox.reserveDiagnosticId();
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...value,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:reservedId}),/mailbox-drive-provider-unavailable/);
  equal((await mailbox.diagnostics("run-a","device-a")).length,0);
  equal([...drive.files.values()].some(f=>f.meta.appProperties?.brainBvpKind==="diagnostic-pending"&&f.meta.appProperties?.brainBvpRecord==="0"),true);
});

test("DEC-352 malformed relay lease is a reported failure, never silently skipped",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files();
  const root=".obsidian/plugins/brain/.bvp-relay";
  files.dirs.add(root+"/controller-authority");
  files.values.set(root+"/controller-authority/corrupt.json","not-json");
  const result=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();
  equal(result.status,"unavailable");
  equal(result.reason,"relay-controller-authority-invalid");
  equal(result.diagnostic?.phase,"diagnostic-ingest");
  equal(result.diagnostic?.effect,"unknown");
});

test("DEC-352 saturated offline journal persists a bounded overflow counter before reporting failure",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  const journal=new BvpRuntimeErrorJournal(files,root);
  for(let i=0;i<24;i++)await journal.record(bvpPollFailure("error-class-"+i));
  await rejects(()=>journal.record(bvpPollFailure("error-class-overflow")),
    e=>e instanceof BvpJournalError&&e.code==="bvp-journal-persistence-failed");
  const restarted=new BvpRuntimeErrorJournal(files,root);
  const status=await restarted.snapshot();
  equal(status.entries.length,24);
  equal(status.overflow,1);
  equal(status.outstanding,true);
});

test("DEC352-F01 originating run survives A to B, no-run and restart; no cross-run coalescence",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",a={runId:"run-a",deviceId:"device-a"},b={runId:"run-b",deviceId:"device-a"};
  const first=new BvpRuntimeErrorJournal(files,root);
  await first.record(bvpPollFailure(),a);
  await first.record(bvpPollFailure(),b);
  await first.record(bvpPollFailure(),a);
  const restarted=new BvpRuntimeErrorJournal(files,root);
  const before=await restarted.snapshot();
  deepEqual(before.entries.map(e=>e.origin?.runId),["run-a","run-b","run-a"]);
  await restarted.recover(bvpDiagnostic({classification:"bvp-runtime-poll-recovered",component:"device-agent",phase:"poll-recovery",lastConfirmedBoundary:"mailbox-poll-completed",firstUnconfirmedBoundary:"none",effect:"none-confirmed",recommendedAction:"none"}),b);
  const emitted:{runId:string|null;deviceId:string|null;eventId:string}[]=[];
  await restarted.flush(async event=>{emitted.push({runId:event.origin?.runId??null,deviceId:event.origin?.deviceId??null,eventId:event.eventId});});
  equal(emitted.some(e=>e.runId==="run-a"),true);
  equal(emitted.some(e=>e.runId==="run-b"),true);
  await restarted.record(bvpPollFailure(),{runId:null,deviceId:"device-a"});
  const count=emitted.length;
  await restarted.flush(async entry=>{
    equal(entry.origin?.runId,null,"unbound original run remains unknown");
    equal(entry.origin?.deviceId,"device-a");
    equal(entry.diagnostic.identity.runId,"unavailable");
    emitted.push({runId:entry.origin?.runId??null,deviceId:entry.origin?.deviceId??null,eventId:entry.eventId});
  });
  deepEqual(emitted.slice(count).map(e=>e.runId),[null],"unbound delivery must never claim an active run");
  equal((await restarted.snapshot()).entries.some(e=>e.origin?.runId===null&&e.deliveredCount===e.occurrences),true);
});

test("DEC352-F02 uncertain create/media/visibility responses replay with one reserved Drive object",async()=>{
  for(const stage of ["create","upload","visible"]){
    const drive=new FakeDrive(),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
    const journal=new BvpRuntimeErrorJournal(files,root);
    await journal.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"});
    let drop=true,mutations=0;
    const request:AuthenticatedDriveRequest=async(url,init={})=>{
      const path=new URL(url).pathname,method=(init.method??"GET").toUpperCase();
      const target=stage==="create"?path==="/drive/v3/files"&&method==="POST"&&String(init.body).includes("bvp-diagnostic-"):stage==="upload"?path.includes("/upload/")&&method==="PATCH":path.startsWith("/drive/v3/files/")&&method==="PATCH"&&String(init.body).includes("brainBvpRecord");
      const response=await drive.request(url,init);
      if(target){mutations++;if(drop){drop=false;throw new Error("lost response after remote success");}}
      return response;
    };
    const mailbox=createDriveCommandMailbox(request);
    const flush=()=>journal.flush(e=>mailbox.publishDiagnostic(e.origin!.runId!,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId());
    await rejects(flush,/mailbox-drive-transport-unavailable/);
    equal((await journal.snapshot()).entries[0].deliveredCount,0);
    const restarted=new BvpRuntimeErrorJournal(files,root);
    await rejects(()=>restarted.flush(e=>mailbox.publishDiagnostic(e.origin!.runId!,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId()),/mailbox-diagnostic-awaiting-controller/);
    await authorize(files,root,"run-a","device-a");
    const pending=(await restarted.snapshot()).entries[0];
    await createWindowsMailboxRelay(mailbox,files,root).admitDiagnostic("run-a","device-a",{...pending,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:pending.remoteFileId});
    await restarted.flush(e=>mailbox.publishDiagnostic(e.origin!.runId!,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId());
    const remote=[...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic");
    equal(remote.length,1,stage);
    equal(remote[0].meta.appProperties.brainBvpRecord,"1");
    equal((await restarted.snapshot()).entries[0].deliveredCount,1);
    equal((await mailbox.diagnostics("run-a","device-a")).length,1);
    equal(mutations<=3,true);
  }
});

test("DEC352-F02 conflicting event origin or payload fails closed without second creation",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),event={schemaVersion:1 as const,eventId:randomUUID(),firstAt:new Date().toISOString(),lastAt:new Date().toISOString(),occurrences:1,diagnostic:bvpPollFailure(),origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:await mailbox.reserveDiagnosticId()};
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",event),/mailbox-diagnostic-awaiting-controller/);
  await rejects(()=>mailbox.publishDiagnostic("run-b","device-a",{...event,origin:{...event.origin,runId:"run-b"}}),/mailbox-diagnostic-event-conflict/);
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...event,diagnostic:bvpPollFailure("different-classification")}),/mailbox-diagnostic-event-conflict/);
  equal([...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic-pending").length,1);
});

test("DEC352-F03 relay refuses same-event conflicting inbox evidence and duplicate remote records",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-a","device-a",1);
  const event={...await r3Record("run-a"),origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:await mailbox.reserveDiagnosticId()};
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",event),/mailbox-diagnostic-awaiting-controller/);
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  await relay.pumpOnce(); // serialized admission
  await relay.pumpOnce(); // inbox observation
  const path=root+"/inbox/bvp-diagnostic-"+event.eventId+".error.json",old=JSON.parse(await files.read(path));
  const tampered={...old,diagnostic:bvpPollFailure("forged-origin")};
  await files.write(path,JSON.stringify(tampered));
  const blocked=await relay.pumpOnce();
  equal(blocked.status,"unavailable");
  equal(blocked.reason,"relay-diagnostic-inbox-conflict");
  deepEqual(JSON.parse(await files.read(path)),tampered);
  const duplicate=[...drive.files.entries()].find(([,v])=>v.meta.appProperties?.brainBvpEventId===event.eventId)!;
  drive.files.set("forged-duplicate",{meta:{...duplicate[1].meta},content:duplicate[1].content});
  await rejects(()=>mailbox.diagnostics("run-a","device-a"),/mailbox-diagnostic-event-conflict/);
});

test("DEC352-F03 malicious persisted journal fields are blocked without publishing leaked values",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",journal=new BvpRuntimeErrorJournal(files,root);
  await journal.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"});
  const path=root+"/runtime-errors.json",corrupt=JSON.parse(await files.read(path));
  corrupt.entries[0].diagnostic.classification="Bearer secret-path";
  const raw=JSON.stringify(corrupt);await files.write(path,raw);
  await rejects(()=>new BvpRuntimeErrorJournal(files,root).flush(async()=>{throw new Error("must not publish");}),
    e=>e instanceof BvpJournalError&&e.code==="bvp-journal-corrupt");
  equal(await files.read(path),raw);
});

test("DEC352-F01 tampered local run origin cannot launder diagnostic into a different lease",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",j=new BvpRuntimeErrorJournal(files,root);
  await j.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"});
  const path=root+"/runtime-errors.json",data=JSON.parse(await files.read(path));
  data.entries[0].origin.runId="run-b";
  await files.write(path,JSON.stringify(data));
  await rejects(()=>new BvpRuntimeErrorJournal(files,root).flush(async()=>{throw new Error("must never route");}),
    e=>e instanceof BvpJournalError&&e.code==="bvp-journal-corrupt");
});

test("DEC352-F03 diagnostic retry cooldown survives journal reconstruction and does not falsely complete pending work",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",first=new BvpRuntimeErrorJournal(files,root);
  equal(await first.acquireDeliveryWindow(),false); // Empty journal never schedules a remote retry.
  await first.record(bvpPollFailure(),{runId:"run-a",deviceId:"device-a"});
  equal(await first.acquireDeliveryWindow(),true);
  const restarted=new BvpRuntimeErrorJournal(files,root);
  equal(await restarted.acquireDeliveryWindow(),false);
  const snap=await restarted.snapshot();
  equal(snap.entries.length,1);equal(snap.entries[0].deliveredCount,0);
  equal(typeof snap.nextDeliveryAt,"number");
  equal(snap.nextDeliveryAt!>Date.now(),true);
});

test("DEC352-R2-F01 delayed run A diagnostic reaches Windows under run B lease without A command authority",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-a","device-a",1);
  const journal=new BvpRuntimeErrorJournal(files,root);
  await journal.record(bvpPollFailure("run-a-offline"),{runId:"run-a",deviceId:"device-a"});
  await authorize(files,root,"run-b","device-a",2);
  await rejects(()=>journal.flush(e=>mailbox.publishDiagnostic(e.origin!.runId!,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId()),/mailbox-diagnostic-awaiting-controller/);
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0}); // controller admission
  await journal.flush(e=>mailbox.publishDiagnostic(e.origin!.runId!,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId());
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0}); // historical-run read
  const original=(await journal.snapshot()).entries[0],inbox=root+"/inbox/bvp-diagnostic-"+original.eventId+".error.json";
  equal(await files.exists(inbox),true,"old run diagnostic must reach existing device inbox");
  const persisted=JSON.parse(await files.read(inbox));
  deepEqual(persisted.origin,{runId:"run-a",deviceId:"device-a"});
  equal(persisted.diagnostic.classification,"run-a-offline");
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  const restarted=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await restarted.pumpOnce(),{status:"ok",published:0,completed:0});
  equal([...files.values.keys()].filter(k=>k.endsWith(".error.json")).length,1);
  await files.write(root+"/outbox/old-command.json",JSON.stringify(command(1,"run-a","device-a")));
  assertRelayUnavailable(await restarted.pumpOnce(),"relay-controller-run-unleased");
  equal(await files.exists(root+"/outbox/old-command.json"),true,"historical read must not authorize commands");
});

test("DEC352-R2-F02 231 remote diagnostics ingest through bounded restart-checkpointed pages",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-b","device-a",2);
  const ids:string[]=[];
  for(let i=0;i<231;i++){
    const run=i<115?"run-a":"run-b",record=await r3Record(run,"diagnostic-batch");
    ids.push(record.eventId);
    r3Seed(drive,record,run,"device-a","history-"+i);
  }
  const first=createWindowsMailboxRelay(mailbox,files,root);
  for(let i=0;i<2;i++)deepEqual(await first.pumpOnce(),{status:"ok",published:0,completed:0});
  const prior=[...files.values.keys()].filter(p=>p.endsWith(".error.json")).length;
  equal(prior>0&&prior<231,true,"each pump must be bounded; no one-tick full-history traversal");
  const cursorFiles=[...files.values.keys()].filter(p=>p.startsWith(root+"/diagnostic-cursors/"));
  equal(cursorFiles.length,1,"cursor must be on durable relay adapter before restart");
  const resumed=createWindowsMailboxRelay(mailbox,files,root);
  for(let i=0;i<20&&ids.some(id=>!files.values.has(root+"/inbox/bvp-diagnostic-"+id+".error.json"));i++)
    deepEqual(await resumed.pumpOnce(),{status:"ok",published:0,completed:0});
  equal(ids.every(id=>files.values.has(root+"/inbox/bvp-diagnostic-"+id+".error.json")),true,"each valid historical event eventually reaches inbox");
  equal(drive.diagnosticPageSizes.every(size=>size<=25),true,"each diagnostic collection page must be bounded to 25 entries");
  equal(drive.files.size>=231,true,"unresolved remote history must not be deleted to pass pagination");
  equal([...files.values.keys()].filter(k=>k.endsWith(".error.json")).length,231);
});

test("DEC352-R2-F03 unbound offline errors coalesce and are observable by authorized device without invented run",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-b","device-a",3);
  const journal=new BvpRuntimeErrorJournal(files,root);
  for(let i=0;i<9;i++)await journal.record(bvpPollFailure("mailbox-drive-unauthorized"),{runId:null,deviceId:"device-a"});
  const pending=await journal.snapshot();
  equal(pending.entries.length,1,"unbound same-device repeated failure must not saturate local journal");
  equal(pending.entries[0].occurrences,9);
  equal(await journal.acquireDeliveryWindow(),true,"unbound known-device telemetry becomes eligible on transport recovery");
  await rejects(()=>journal.flush(e=>mailbox.publishDiagnostic(e.origin!.runId,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId()),/mailbox-diagnostic-awaiting-controller/);
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0}); // controller admission
  await journal.flush(e=>mailbox.publishDiagnostic(e.origin!.runId,e.origin!.deviceId!,e),()=>mailbox.reserveDiagnosticId());
  const delivered=await journal.snapshot();
  equal(delivered.entries[0].deliveredCount,9);
  const remote=[...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic");
  equal(remote.length,1);equal(remote[0].meta.appProperties.brainBvpOriginBound,"0");
  equal(remote[0].meta.appProperties.brainBvpRunId,undefined);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0}); // relay inbox read after admission
  const inbox=JSON.parse(await files.read(root+"/inbox/bvp-diagnostic-"+pending.entries[0].eventId+".error.json"));
  deepEqual(inbox.origin,{runId:null,deviceId:"device-a"});
  equal(inbox.diagnostic.identity.runId,"unavailable");
  equal([...drive.files.values()].some(f=>f.meta.appProperties?.brainBvpKind==="result"),false);
});

test("DEC352-R2 cross-device diagnostic retrieval and falsified remote origins fail closed",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-b","device-a",3);
  const event={...await r3Record("run-a"),origin:{runId:"run-a",deviceId:"device-other"},remoteFileId:await mailbox.reserveDiagnosticId()};
  r3Seed(drive,event,"run-a","device-other");
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  equal((await files.list(root+"/inbox")).files.length,0,"other devices' errors cannot leak into device-a");
  const other=[...drive.files.values()].find(f=>f.meta.appProperties?.brainBvpEventId===event.eventId)!;
  other.meta.appProperties.brainBvpOriginBound="0";
  await rejects(()=>mailbox.diagnosticsForDevice("device-other"),/mailbox-diagnostic-record-invalid|mailbox-diagnostic-origin-conflict/);
});

test("DEC352-R2-F03 diagnostic publication failures remain local-only without recursive retry",async()=>{
  const files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",journal=new BvpRuntimeErrorJournal(files,root);
  const publication=bvpDiagnostic({classification:"mailbox-drive-transport-unavailable",component:"drive-mailbox",phase:"diagnostic-publication",
    lastConfirmedBoundary:"timer-entered",firstUnconfirmedBoundary:"runtime-operation-complete",
    effect:"unknown",recommendedAction:"inspect-device-journal"});
  await journal.record(publication,{runId:null,deviceId:"device-a"});
  equal(await journal.acquireDeliveryWindow(),false,"publication-failure-only journal must not cause another publish");
  const sent=await journal.flush(async()=>{throw new Error("recursive publication forbidden");});
  equal(sent,0);
  await journal.recover(bvpDiagnostic({classification:"bvp-runtime-poll-recovered",component:"device-agent",phase:"poll-recovery",
    lastConfirmedBoundary:"mailbox-poll-completed",firstUnconfirmedBoundary:"none",effect:"none-confirmed",recommendedAction:"none"}),
    {runId:null,deviceId:"device-a"});
  const snap=await journal.snapshot();
  equal(snap.entries.length,1,"reporting failures must not invent a remote recovery record");
  equal(snap.entries[0].deliveredCount,0);
  equal(snap.entries[0].diagnostic.phase,"diagnostic-publication");
});

async function r3Record(runId:string|null,classification="r3-diagnostic"){
  const d=bvpPollFailure(classification);
  return {schemaVersion:1 as const,eventId:randomUUID(),firstAt:new Date().toISOString(),lastAt:new Date().toISOString(),occurrences:1,
    diagnostic:bvpDiagnostic({...d,identity:{...d.identity,runId:runId===null?"unavailable":await opaqueDiagnosticId(runId,"run")}})};
}
function r3Seed(drive:FakeDrive,record:Awaited<ReturnType<typeof r3Record>>,runId:string|null,deviceId="device-a",fileId="r3-"+drive.next++){
  drive.files.set(fileId,{meta:{appProperties:{brainBvpRecord:"1",brainBvpKind:"diagnostic",brainBvpDeviceId:deviceId,
    ...(runId===null?{brainBvpOriginBound:"0"}:{brainBvpRunId:runId}),brainBvpEventId:record.eventId}},content:JSON.stringify(record)});
}

test("DEC352-R3-F01 bound run metadata substitution A to B is rejected before inbox creation",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-b","device-a",2);
  const original=await r3Record("run-a");
  r3Seed(drive,original,"run-a");
  const filed=[...drive.files.values()][0];
  filed.meta.appProperties.brainBvpRunId="run-b"; // Valid-looking metadata, unchanged privacy-derived run A in JSON.
  await rejects(()=>mailbox.diagnosticsForDevice("device-a"),/mailbox-diagnostic-origin-conflict/);
  const result=await createWindowsMailboxRelay(mailbox,files,root).pumpOnce();
  assertRelayUnavailable(result,"mailbox-diagnostic-origin-conflict");
  equal(await files.exists(root+"/inbox/bvp-diagnostic-"+original.eventId+".error.json"),false);
  equal([...drive.files.values()].some(f=>f.meta.appProperties?.brainBvpKind==="result"),false);
});

test("DEC352-R3-F01 unbound marker contradicting hashed run rejects; genuine bound and unbound remain accepted",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request);
  const bound=await r3Record("run-a"),unbound=await r3Record(null);
  r3Seed(drive,bound,"run-a");r3Seed(drive,unbound,null);
  const legitimate=await mailbox.diagnosticsForDevice("device-a");
  equal(legitimate.entries.length,2);
  deepEqual(legitimate.entries.map(e=>e.origin?.runId),["run-a",null]);
  const spoof=[...drive.files.values()].find(f=>f.meta.appProperties?.brainBvpEventId===bound.eventId)!;
  delete spoof.meta.appProperties.brainBvpRunId;
  spoof.meta.appProperties.brainBvpOriginBound="0";
  await rejects(()=>mailbox.diagnosticsForDevice("device-a"),/mailbox-diagnostic-origin-conflict/);
  spoof.meta.appProperties.brainBvpRunId="run-b";
  spoof.meta.appProperties.brainBvpOriginBound="1";
  await rejects(()=>mailbox.diagnosticsForDevice("device-a"),/mailbox-diagnostic-origin-conflict/);
});

test("DEC352-R3-F01 same-event cross-page origin reattribution cannot overwrite durable inbox evidence",async()=>{
  const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  await authorize(files,root,"run-b","device-a",2);
  const record=await r3Record("run-a");r3Seed(drive,record,"run-a");
  for(let i=0;i<24;i++)r3Seed(drive,await r3Record("run-b"),"run-b");
  r3Seed(drive,record,"run-b","device-a","cross-page-spoof");
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  const path=root+"/inbox/bvp-diagnostic-"+record.eventId+".error.json",before=await files.read(path);
  assertRelayUnavailable(await relay.pumpOnce(),"mailbox-diagnostic-origin-conflict");
  equal(await files.read(path),before,"tampered later page must not overwrite prior evidence");
});

test("DEC352-R3-F03 rejected Drive page cursor restarts bounded read and preserves durable inbox across relay restart",async()=>{
  const drive=new FakeDrive(),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  for(let i=0;i<30;i++)r3Seed(drive,await r3Record("run-a"),"run-a");
  await authorize(files,root,"run-b","device-a",2);
  let expireOnce=true,rejected=0,requests=0;
  const request:AuthenticatedDriveRequest=async(input,init={})=>{
    const url=new URL(input),kind=decodeURIComponent(url.searchParams.get("q")??"").includes("brainBvpKind' and value='diagnostic'");
    if(kind&&(init.method??"GET").toUpperCase()==="GET"){requests++;if(url.searchParams.has("pageToken")&&expireOnce){expireOnce=false;rejected++;return new Response("",{status:400});}}
    return drive.request(input,init);
  };
  const mailbox=createDriveCommandMailbox(request),first=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await first.pumpOnce(),{status:"ok",published:0,completed:0});
  const before=[...files.values.entries()].filter(([p])=>p.endsWith(".error.json"));
  equal(before.length,25);
  const afterRestart=createWindowsMailboxRelay(mailbox,files,root);
  deepEqual(await afterRestart.pumpOnce(),{status:"ok",published:0,completed:0});
  equal(rejected,1);equal([...files.values.keys()].filter(p=>p.endsWith(".error.json")).length,25);
  for(let i=0;i<4&&[...files.values.keys()].filter(p=>p.endsWith(".error.json")).length<30;i++)
    deepEqual(await afterRestart.pumpOnce(),{status:"ok",published:0,completed:0});
  equal([...files.values.keys()].filter(p=>p.endsWith(".error.json")).length,30);
  equal(before.every(([p,content])=>files.values.get(p)===content),true,"replay must not alter already-ingested evidence");
  equal(drive.diagnosticPageSizes.every(n=>n<=25),true);equal(requests<=8,true,"cursor reconciliation must remain bounded");
});

test("DEC352-R3-F03 persistent cursor rejection fails closed without clearing checkpoint or deleting records",async()=>{
  const drive=new FakeDrive(),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay";
  for(let i=0;i<30;i++)r3Seed(drive,await r3Record("run-a"),"run-a");
  await authorize(files,root,"run-b","device-a",2);
  let reject=false;
  const request:AuthenticatedDriveRequest=async(input,init={})=>{
    const url=new URL(input),kind=decodeURIComponent(url.searchParams.get("q")??"").includes("brainBvpKind' and value='diagnostic'");
    if(reject&&kind)return new Response("",{status:400});
    return drive.request(input,init);
  };
  const relay=createWindowsMailboxRelay(createDriveCommandMailbox(request),files,root);
  deepEqual(await relay.pumpOnce(),{status:"ok",published:0,completed:0});
  const cursors=[...files.values.entries()].filter(([p])=>p.includes("/diagnostic-cursors/"));
  equal(cursors.length,1);const [cursorPath,cursor]=cursors[0];reject=true;
  assertRelayUnavailable(await relay.pumpOnce());
  equal(await files.read(cursorPath),cursor,"failed restart must keep prior durable cursor");
  equal([...files.values.keys()].filter(p=>p.endsWith(".error.json")).length,25);
  equal(drive.files.size>=30,true,"no remote evidence deletion");
});

test("DEC356 Windows OS lock serializes independent controllers; crash orphan fails closed",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-dec356-"));
  try{
    const first=windowsDiagnosticExclusiveLock(root),second=windowsDiagnosticExclusiveLock(root);
    let entered!:()=>void,release!:()=>void;
    const active=new Promise<void>(resolve=>{entered=resolve;});
    const finish=new Promise<void>(resolve=>{release=resolve;});
    const held=first("device-a",async()=>{entered();await finish;return "done";});
    await active;
    await rejects(()=>second("device-a",async()=>{throw new Error("should-not-run");}),/relay-controller-exclusive-busy/);
    equal(await second("device-b",async()=>42),42,"unrelated device can proceed while device-a is held");
    release();
    equal(await held,"done");
    equal(await second("device-a",async()=>17),17,"lock is released after confirmed completion");
    const lockPath=join(root,"controller-authority",createHash("sha256").update("device-a").digest("hex")+".json.diagnostic.lock");
    await mkdir(join(root,"controller-authority"),{recursive:true});
    await writeFile(lockPath,"orphaned-crash-lock");
    await rejects(()=>first("device-a",async()=>99),/relay-controller-exclusive-busy/);
    equal(readFileSync(lockPath,"utf8"),"orphaned-crash-lock","stale lock must require operator reconciliation");
  }finally{await rm(root,{recursive:true,force:true});}
});
