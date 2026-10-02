import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deepEqual, equal, rejects } from "node:assert/strict";
import { test } from "node:test";
import {
  MailboxUnavailableError,
  createDriveCommandMailbox,
  createWindowsMailboxRelay,
  pollDeviceMailboxOnce,
  type AuthenticatedDriveRequest,
} from "../src/live-device/drive-mailbox";
import type { BoundedDeviceCommandAgent, DeviceCommand, DeviceCommandResult } from "../src/live-device/device-command-agent";

class FakeDrive {
  next=1; files=new Map<string,{meta:any;content:string}>();
  request:AuthenticatedDriveRequest=async(input,init={})=>{const url=new URL(input),method=(init.method??"GET").toUpperCase(),path=url.pathname;
    if(path==="/drive/v3/files"&&method==="GET"){const q=decodeURIComponent(url.searchParams.get("q")??"");const root=q.includes("brainBvpMailbox");const kind=q.match(/brainBvpKind' and value='([^']+)/)?.[1];const files=[...this.files].filter(([,v])=>root?v.meta.appProperties?.brainBvpMailbox==="1":v.meta.appProperties?.brainBvpRecord==="1"&&(!kind||v.meta.appProperties?.brainBvpKind===kind)).map(([id,v])=>({id,name:v.meta.name,size:String(new TextEncoder().encode(v.content).byteLength),appProperties:v.meta.appProperties}));return Response.json({files});}
    if(path==="/drive/v3/files"&&method==="POST"){const meta=JSON.parse(String(init.body??"{}")),id="f"+this.next++;this.files.set(id,{meta,content:""});return Response.json({id});}
    const upload=path.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);if(upload&&method==="PATCH"){const f=this.files.get(upload[1]);if(!f)return new Response("",{status:404});f.content=String(init.body??"");return new Response("",{status:200});}
    const media=path.match(/^\/drive\/v3\/files\/([^/]+)$/);if(media&&method==="GET"&&url.searchParams.get("alt")==="media"){const f=this.files.get(media[1]);return f?new Response(f.content,{status:200}):new Response("",{status:404});}
    return new Response("",{status:400});};
  folder(){return [...this.files.values()].find(v=>v.meta.appProperties?.brainBvpMailbox==="1");}
}
class Files {
  dirs=new Set<string>(); values=new Map<string,string>();
  async exists(p:string){return this.dirs.has(p)||this.values.has(p);} async mkdir(p:string){this.dirs.add(p);}
  async list(p:string){const prefix=p+"/";return{files:[...this.values.keys()].filter(v=>v.startsWith(prefix)&&!v.slice(prefix.length).includes("/")),folders:[]};}
  async read(p:string){const v=this.values.get(p);if(v===undefined)throw new Error("missing");return v;} async write(p:string,v:string){this.values.set(p,v);}
  async rename(a:string,b:string){const v=await this.read(a);this.values.set(b,v);this.values.delete(a);} async remove(p:string){this.values.delete(p);}
}
const command=(sequence=1,runId="run-a",deviceId="device-a"):DeviceCommand=>({runId,deviceId,sequence,commandId:"cmd-"+sequence,kind:"observe-product"});
const result=(c:DeviceCommand,classification="product-observed"):DeviceCommandResult=>({runId:c.runId,deviceId:c.deviceId,sequence:c.sequence,commandId:c.commandId,kind:c.kind,status:"completed",classification});

test("Drive mailbox is separate, bounded, addressed, duplicate-tolerant, and exact-result correlated",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),a=command(),wrongRun=command(2,"other","device-a"),wrongDevice=command(3,"run-a","other");await mailbox.publishCommand(wrongDevice);await mailbox.publishCommand(command(2));await mailbox.publishCommand(a);await mailbox.publishCommand(wrongRun);await mailbox.publishCommand(a);deepEqual((await mailbox.commands("run-a","device-a")).map(v=>v.sequence),[1,1,2]);const folder=drive.folder();equal(folder?.meta.name,"BRAIN BVP Mailbox");equal(folder?.meta.appProperties.brainBvpMailbox,"1");equal(folder?.meta.appProperties.brainSyncRole,undefined);await mailbox.publishResult(result(a));deepEqual(await mailbox.resultFor(a),result(a));await rejects(()=>mailbox.publishCommand({...a,kind:"fixture-put",path:"huge.md",content:{type:"text",text:"x".repeat(140000)}} as any),/mailbox-record-too-large/);await rejects(()=>mailbox.publishResult({...result(a),receipt:{accessToken:"secret"}} as any),/mailbox-sensitive-field/);await mailbox.publishResult(result(a,"different"));await rejects(()=>mailbox.resultFor(a),/mailbox-conflicting-result/);});

test("unavailable Drive is explicit and device pump preserves S08C typed results",async()=>{const unavailable=createDriveCommandMailbox(async()=>{throw new Error("offline");});await rejects(()=>unavailable.commands("run-a","device-a"),MailboxUnavailableError);const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),c=command();await mailbox.publishCommand(c);let executions=0;const agent:BoundedDeviceCommandAgent={async execute(input){executions++;return result(input as DeviceCommand);}};deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:1});deepEqual(await pollDeviceMailboxOnce(mailbox,agent,"run-a","device-a"),{status:"ok",processed:0});equal(executions,1);});

test("Windows relay survives reconstruction using only exact sent command files",async()=>{const drive=new FakeDrive(),mailbox=createDriveCommandMailbox(drive.request),files=new Files(),root=".obsidian/plugins/brain/.bvp-relay",c=command();for(const p of [root,root+"/outbox"])files.dirs.add(p);await files.write(root+"/outbox/cmd.json",JSON.stringify(c));const first=createWindowsMailboxRelay(mailbox,files,root);deepEqual(await first.pumpOnce(),{status:"ok",published:1,completed:0});equal(await files.exists(root+"/sent/cmd.json"),true);await mailbox.publishResult(result(c));const restarted=createWindowsMailboxRelay(mailbox,files,root);deepEqual(await restarted.pumpOnce(),{status:"ok",published:0,completed:1});equal(await files.exists(root+"/sent/cmd.json"),false);deepEqual(JSON.parse(await files.read(root+"/inbox/cmd.json.result.json")),result(c));});


test("unavailable relay stays pending and relay path is protected from managed synchronization",async()=>{const files=new Files(),root=".obsidian/plugins/brain-google-drive-sync/.bvp-relay",c=command();for(const p of [root,root+"/outbox"])files.dirs.add(p);await files.write(root+"/outbox/cmd.json",JSON.stringify(c));const mailbox=createDriveCommandMailbox(async()=>{throw new Error("offline");});const relay=createWindowsMailboxRelay(mailbox,files,root);deepEqual(await relay.pumpOnce(),{status:"unavailable",published:0,completed:0});equal(await files.exists(root+"/outbox/cmd.json"),true);const policy=readFileSync(resolve(process.cwd(),"src/local/config-policy.ts"),"utf8");equal(policy.includes('lower.startsWith("plugins/brain-google-drive-sync/")'),true);equal(policy.includes('{ classification: "protected", reason: "sync-operational-state" }'),true);});
