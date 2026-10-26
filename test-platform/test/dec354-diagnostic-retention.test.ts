import { createHash, randomUUID } from "node:crypto";
import { test } from "node:test";
import { strictEqual as equal, rejects } from "node:assert";
import { createDriveCommandMailbox, createWindowsMailboxRelay, type AuthenticatedDriveRequest } from "../src/live-device/drive-mailbox";
import { bvpDiagnostic, opaqueDiagnosticId } from "../src/diagnostic-contract";
import type { RuntimeErrorRecord } from "../src/bvp-runtime-error-journal";

class Fake {
  files=new Map<string,{meta:any;content:string;createdTime:string}>(); next=0; uploadFails=false;
  request:AuthenticatedDriveRequest=async(input,init={})=>{
    const url=new URL(input),method=(init.method??"GET").toUpperCase(),path=url.pathname;
    if(path==="/drive/v3/files"&&method==="GET"){
      const q=decodeURIComponent(url.searchParams.get("q")??""),prop=(k:string)=>q.match(new RegExp(k+"' and value='([^']+)'"))?.[1],
        kind=prop("brainBvpKind"),device=prop("brainBvpDeviceId"),event=prop("brainBvpEventId");
      const root=q.includes("brainBvpMailbox");
      const matched=[...this.files].filter(([,f])=>root?f.meta.appProperties?.brainBvpMailbox==="1":
        (!kind||f.meta.appProperties?.brainBvpKind===kind)&&(!device||f.meta.appProperties?.brainBvpDeviceId===device)&&(!event||f.meta.appProperties?.brainBvpEventId===event));
      const offset=Number(url.searchParams.get("pageToken")??"0"),size=Number(url.searchParams.get("pageSize")??"100");
      if(!Number.isSafeInteger(offset)||offset<0||size>200)return new Response("",{status:400});
      return Response.json({files:matched.slice(offset,offset+size).map(([id,v])=>({id,createdTime:v.createdTime,
        size:String(new TextEncoder().encode(v.content).byteLength),appProperties:v.meta.appProperties})),
        ...(matched.length>offset+size?{nextPageToken:String(offset+size)}:{})});
    }
    if(path==="/drive/v3/files/generateIds")return Response.json({ids:["a"+ ++this.next]});
    if(path==="/drive/v3/files"&&method==="POST"){const meta=JSON.parse(String(init.body??"{}")),id=meta.id??"f"+ ++this.next;
      if(this.files.has(id))return new Response("",{status:409});this.files.set(id,{meta,content:"",createdTime:new Date().toISOString()});return Response.json({id});}
    const upload=path.match(/^\/upload\/drive\/v3\/files\/([^/]+)$/);
    if(upload&&method==="PATCH"){if(this.uploadFails)return new Response("",{status:503});
      const f=this.files.get(upload[1]);if(!f)return new Response("",{status:404});f.content=String(init.body??"");return new Response("",{status:200});}
    const id=path.match(/^\/drive\/v3\/files\/([^/]+)$/)?.[1],file=id?this.files.get(id):undefined;
    if(!file)return new Response("",{status:404});
    if(method==="GET"&&url.searchParams.get("alt")==="media")return new Response(file.content);
    if(method==="GET")return Response.json({id,appProperties:file.meta.appProperties,
      createdTime:file.createdTime,size:String(new TextEncoder().encode(file.content).byteLength)});
    if(method==="PATCH"){const meta=JSON.parse(String(init.body??"{}"));file.meta.appProperties={...file.meta.appProperties,...meta.appProperties};return Response.json({id});}
    if(method==="DELETE"){this.files.delete(id!);return new Response(null,{status:204});}
    return new Response("",{status:400});
  };
  seed(v:RuntimeErrorRecord,days=0,run="run-a"){const id="seed"+ ++this.next;this.files.set(id,{
    meta:{appProperties:{brainBvpKind:"diagnostic",brainBvpRecord:"1",brainBvpRunId:run,brainBvpDeviceId:"device-a",brainBvpEventId:v.eventId}},
    content:JSON.stringify(v),createdTime:new Date(Date.now()-days*86400000).toISOString()});return id;}
}
async function sample():Promise<RuntimeErrorRecord>{
  const diagnostic=bvpDiagnostic({classification:"device-result-unavailable",component:"device-agent",phase:"poll",
    lastConfirmedBoundary:"poll-entered",firstUnconfirmedBoundary:"result-unknown",effect:"unknown",
    recommendedAction:"inspect-run-evidence",identity:{runId:await opaqueDiagnosticId("run-a","run"),scenarioId:"unavailable",stepIndex:null,executionMode:"unknown",correlationToken:"unavailable"}});
  return{schemaVersion:1,eventId:randomUUID(),firstAt:new Date().toISOString(),lastAt:new Date().toISOString(),occurrences:1,diagnostic};
}
test("DEC354 capacity: new event 5001 blocked; all 5000 unresolved originals retained",async()=>{
  const drive=new Fake(),v=await sample();for(let i=0;i<5000;i++)drive.seed({...v,eventId:randomUUID()});
  const mailbox=createDriveCommandMailbox(drive.request),remoteFileId=await mailbox.reserveDiagnosticId(),pending=await sample();
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...pending,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId}),/mailbox-diagnostic-active-capacity/);
  equal([...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic").length,5000);
});
test("DEC354 age: 91-day unresolved source blocks new unique remote event without deletion",async()=>{
  const drive=new Fake(),v=await sample(),id=drive.seed(v,91),mailbox=createDriveCommandMailbox(drive.request);
  const remoteFileId=await mailbox.reserveDiagnosticId(),pending=await sample();
  await rejects(()=>mailbox.publishDiagnostic("run-a","device-a",{...pending,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId}),/mailbox-diagnostic-active-expired/);
  equal(drive.files.get(id)?.content,JSON.stringify(v));equal([...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic").length,1);
});
test("DEC354 archive: verified SHA-256 content, source retained and idempotent",async()=>{
  const drive=new Fake(),v=await sample(),id=drive.seed(v,91),mailbox=createDriveCommandMailbox(drive.request),archiveId=await mailbox.reserveDiagnosticId();
  const one=await mailbox.archiveVerifiedDiagnostic("device-a",v.eventId,archiveId);
  equal(one.status,"verified");equal(one.sha256,createHash("sha256").update(JSON.stringify(v)).digest("hex"));
  equal(drive.files.get(id)?.content,JSON.stringify(v));
  const two=await mailbox.archiveVerifiedDiagnostic("device-a",v.eventId,archiveId);
  equal(one.sha256,two.sha256);
  equal((await mailbox.archiveVerifiedDiagnostic("device-a",v.eventId,await mailbox.reserveDiagnosticId())).sha256,one.sha256,"reconstructed caller reconciles existing archive ID");
  equal(drive.files.get(id)?.content,JSON.stringify(v),"successful archive never retires unresolved original");
  equal([...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,1);
});
test("DEC354 archive: ambiguous remote upload fails closed without touching original",async()=>{
  const drive=new Fake(),v=await sample(),id=drive.seed(v,91),mailbox=createDriveCommandMailbox(drive.request);
  drive.uploadFails=true;
  const archiveId=await mailbox.reserveDiagnosticId();
  await rejects(()=>mailbox.archiveVerifiedDiagnostic("device-a",v.eventId,archiveId),/mailbox-drive-provider-unavailable/);
  equal(drive.files.get(id)?.content,JSON.stringify(v));
});
test("DEC354 archive: falsified run metadata is rejected before copied evidence is trusted",async()=>{
  const drive=new Fake(),v=await sample(),id=drive.seed(v,91);
  drive.files.get(id)!.meta.appProperties.brainBvpRunId="run-b";
  const mailbox=createDriveCommandMailbox(drive.request),archiveId=await mailbox.reserveDiagnosticId();
  await rejects(()=>mailbox.archiveVerifiedDiagnostic("device-a",v.eventId,archiveId),/mailbox-diagnostic-origin-conflict/);
  equal([...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,0);
});

test("DEC354 89-day active history permits new publication without changing older record",async()=>{
  const drive=new Fake(),old=await sample(),id=drive.seed(old,89),mailbox=createDriveCommandMailbox(drive.request);
  const item=await sample(),remoteFileId=await mailbox.reserveDiagnosticId();
  await mailbox.publishDiagnostic("run-a","device-a",{...item,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId});
  equal(drive.files.get(id)?.content,JSON.stringify(old));
  equal([...drive.files.values()].filter(v=>v.meta.appProperties?.brainBvpKind==="diagnostic").length,2);
});
test("DEC354 ambiguous archive create is reconciled with the identical reserved ID after restart",async()=>{
  const drive=new Fake(),old=await sample(),source=drive.seed(old,91);let drop=true;
  const request:AuthenticatedDriveRequest=async(url,init={})=>{
    const isArchive=new URL(url).pathname==="/drive/v3/files"&&(init.method??"GET")==="POST"&&
      String(init.body??"").includes('diagnostic-archive');
    const response=await drive.request(url,init);
    if(isArchive&&drop){drop=false;return new Response("",{status:503});}
    return response;
  };
  const mailbox=createDriveCommandMailbox(request),archiveId=await mailbox.reserveDiagnosticId();
  await rejects(()=>mailbox.archiveVerifiedDiagnostic("device-a",old.eventId,archiveId),/mailbox-drive-provider-unavailable/);
  const recovered=createDriveCommandMailbox(request),result=await recovered.archiveVerifiedDiagnostic("device-a",old.eventId,archiveId);
  equal(result.status,"verified");equal(drive.files.get(source)?.content,JSON.stringify(old));
  equal([...drive.files.values()].filter(v=>v.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,1);
});

class RelayFiles{
  dirs=new Set<string>();values=new Map<string,string>();
  async exists(p:string){return this.dirs.has(p)||this.values.has(p);}
  async mkdir(p:string){this.dirs.add(p);}
  async list(p:string){const prefix=p+"/";return{files:[...this.values.keys()].filter(v=>v.startsWith(prefix)&&!v.slice(prefix.length).includes("/")),folders:[]};}
  async read(p:string){const v=this.values.get(p);if(v===undefined)throw Error("missing");return v;}
  async write(p:string,v:string){this.values.set(p,v);}
  async rename(a:string,b:string){this.values.set(b,await this.read(a));this.values.delete(a);}
  async remove(p:string){this.values.delete(p);}
}
test("DEC354 Windows relay autonomously archives one aged diagnostic without deleting unresolved source",async()=>{
  const drive=new Fake(),v=await sample(),id=drive.seed(v,91),mailbox=createDriveCommandMailbox(drive.request),files=new RelayFiles();
  const root=".obsidian/plugins/brain/.bvp-relay";
  files.dirs.add(root+"/controller-authority");
  const key=createHash("sha256").update("device-a").digest("hex");
  await files.write(root+"/controller-authority/"+key+".json",JSON.stringify({schemaVersion:1,generation:2,runId:"run-b",deviceId:"device-a"}));
  const relay=createWindowsMailboxRelay(mailbox,files,root);
  const result=await relay.pumpOnce();
  equal(result.status,"ok");
  equal([...drive.files.values()].filter(x=>x.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,1);
  equal(drive.files.get(id)?.content,JSON.stringify(v));
  equal(await files.exists(root+"/inbox/bvp-diagnostic-"+v.eventId+".error.json"),true);
});

test("DEC354 archives all aged records by durable one-per-cycle checkpoint across relay reconstruction",async()=>{
  const drive=new Fake(),ids:string[]=[];
  for(let i=0;i<4;i++)ids.push(drive.seed(await sample(),91));
  const mailbox=createDriveCommandMailbox(drive.request),files=new RelayFiles(),root=".obsidian/plugins/brain/.bvp-relay";
  files.dirs.add(root+"/controller-authority");
  const key=createHash("sha256").update("device-a").digest("hex");
  await files.write(root+"/controller-authority/"+key+".json",JSON.stringify({schemaVersion:1,generation:2,runId:"run-b",deviceId:"device-a"}));
  for(let i=0;i<4;i++){
    const relay=createWindowsMailboxRelay(mailbox,files,root);
    equal((await relay.pumpOnce()).status,"ok");
    equal([...drive.files.values()].filter(x=>x.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,i+1);
  }
  for(const id of ids)equal(drive.files.has(id),true,"all unresolved originals remain active");
  equal((await createWindowsMailboxRelay(mailbox,files,root).pumpOnce()).status,"ok");
  equal([...drive.files.values()].filter(x=>x.meta.appProperties?.brainBvpKind==="diagnostic-archive").length,4);
});

test("DEC354-R4-F02 two independent publishers cannot exceed 5000 under stale 4999 preflight snapshots",async()=>{
  const drive=new Fake(),v=await sample();
  for(let i=0;i<4999;i++)drive.seed({...v,eventId:randomUUID()});
  const originalIds=[...drive.files].filter(([,file])=>file.meta.appProperties?.brainBvpKind==="diagnostic").map(([id])=>id);
  const baseline=new Map(originalIds.map(id=>[id,drive.files.get(id)!]));
  // Both distinct authorized clients may read the SAME consistent pre-creation history.
  // No safe quota design may rely on the listing alone as an atomic reservation.
  const concurrent:AuthenticatedDriveRequest=async(url,init={})=>{
    const u=new URL(url),q=decodeURIComponent(u.searchParams.get("q")??"");
    if(u.pathname==="/drive/v3/files"&&(init.method??"GET")==="GET"&&
      q.includes("key='brainBvpKind' and value='diagnostic'")&&
      q.includes("key='brainBvpDeviceId' and value='device-a'")&&
      !q.includes("brainBvpEventId")){
      const start=Number(u.searchParams.get("pageToken")??"0"),size=Number(u.searchParams.get("pageSize")??"200");
      return Response.json({files:[...baseline].slice(start,start+size).map(([id,item])=>({
        id,createdTime:item.createdTime,
        size:String(new TextEncoder().encode(item.content).byteLength),
        appProperties:item.meta.appProperties
      })),...(start+size<baseline.size?{nextPageToken:String(start+size)}:{})});
    }
    return drive.request(url,init);
  };
  const first=createDriveCommandMailbox(concurrent),second=createDriveCommandMailbox(concurrent);
  const a=await sample(),b=await sample(),fileA=await first.reserveDiagnosticId(),fileB=await second.reserveDiagnosticId();
  const results=await Promise.allSettled([
    first.publishDiagnostic("run-a","device-a",{...a,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:fileA}),
    second.publishDiagnostic("run-a","device-a",{...b,origin:{runId:"run-a",deviceId:"device-a"},remoteFileId:fileB})
  ]);
  const active=[...drive.files.values()].filter(f=>f.meta.appProperties?.brainBvpKind==="diagnostic");
  equal(active.length<=5000,true,"concurrent admissions must never exceed 5000 ACTIVE objects");
  equal(results.some(r=>r.status==="rejected"),true,"one publisher must fail closed under contested last slot");
  for(const id of originalIds)equal(drive.files.has(id),true,"protected originals must never be deleted");
});
