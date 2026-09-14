import assert from "node:assert/strict";
import test from "node:test";
import { contractId, type ChangeCursor, type DeviceIdentity, type RemoteObjectId, type StateRevision, type VaultIdentity } from "../src/contracts/common";
import type { DriveResult, ManagedRemoteIdentity } from "../src/contracts/google-drive";
import type { ReliableRemoteChangePort, StateLoadContext, TrustedSynchronizationState } from "../src/contracts";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";

class MemorySecrets {
  readonly values=new Map<string,string>();
  getSecret(id:string){return this.values.get(id)??null;}
  setSecret(id:string,value:string){this.values.set(id,value);}
  deleteSecret(id:string){this.values.delete(id);}
}
class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>) {
    const memory=new MemorySecrets();
    super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(memory)));
  }
  override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>>{return this.handler(url,init);}
}
function deferred<T=void>() { let resolve!:(value:T|PromiseLike<T>)=>void; const promise=new Promise<T>(r=>{resolve=r;}); return {promise,resolve}; }
const ok=(body:unknown,status=200)=>Promise.resolve({ok:true,value:new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})} as DriveResult<Response>);
const id=(value:string)=>contractId<"RemoteObjectId">(value) as RemoteObjectId;
const cursor=(value:string)=>contractId<"ChangeCursor">(value) as ChangeCursor;
const vault=(value:string)=>contractId<"VaultIdentity">(value) as VaultIdentity;
const root=()=>({id:"root",name:"BRAIN Sync",mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainSyncRole:"brain-sync-root",brainVaultIdentity:"vault-1",brainProtocolVersion:"1"}});
const content=()=>({id:"content",name:"vault",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-content"}});
const config=()=>({id:"config",name:"__brain_sync_portable_config__",mimeType:"application/vnd.google-apps.folder",parents:["root"],trashed:false,appProperties:{brainSyncRole:"brain-sync-portable-config"}});
const provenance=(domain:"content"|"portable-config")=>({brainManagedRootId:"root",brainSyncDomain:domain});
const norm=(url:string)=>decodeURIComponent(url).replace(/\+/g," ");
const isContentRootQuery=(url:string)=>{const u=norm(url);return u.includes("'root' in parents")&&u.includes("brainSyncRole")&&u.includes("brain-sync-content");};
const isConfigRootQuery=(url:string)=>{const u=norm(url);return u.includes("'root' in parents")&&u.includes("name='__brain_sync_portable_config__'");};
const isChildrenOf=(url:string,parent:string)=>norm(url).includes(`'${parent}' in parents`);
const isManagedQuery=(url:string)=>norm(url).includes("brainManagedRootId");
function adapter(handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){
  const backing=new MemorySecrets(); backing.setSecret("brain-gdrive-paired-account","acct"); const store=new ObsidianSecretStore(backing);
  return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store),new StubTransport(handler),store);
}

test("LAT-05 validates managed root before overlapping independent root discovery and domain listings",async()=>{
  const rootReadStarted=deferred(),rootReadRelease=deferred();
  const contentDiscoveryStarted=deferred(),contentDiscoveryRelease=deferred(),contentListStarted=deferred(),contentListRelease=deferred();
  let contentDiscoveryInFlight=false,configDiscoveryStarted=false,configListStarted=false;
  const configDiscoveryRelease=deferred(),configListRelease=deferred();
  const methods:string[]=[]; let contentPage=0;
  const a=adapter(async(url,init)=>{
    methods.push((init?.method??"GET").toUpperCase());
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}});
    if(url.includes("/files/root?")){rootReadStarted.resolve();await rootReadRelease.promise;return ok(root());}
    if(isContentRootQuery(url)){contentDiscoveryInFlight=true;contentDiscoveryStarted.resolve();await contentDiscoveryRelease.promise;return ok({files:[content()]});}
    if(isConfigRootQuery(url)){configDiscoveryStarted=true;await configDiscoveryRelease.promise;return ok({files:[config()]});}
    if(isChildrenOf(url,"content")){
      contentPage++;
      if(contentPage===1){contentListStarted.resolve();await contentListRelease.promise;return ok({files:[{id:"c1",name:"b.md",mimeType:"text/plain",parents:["content"],trashed:false,version:"1",appProperties:provenance("content")}],nextPageToken:"p2"});}
      assert.match(url,/pageToken=p2/); return ok({files:[{id:"c2",name:"a.md",mimeType:"text/plain",parents:["content"],trashed:false,version:"1",appProperties:provenance("content")}]});
    }
    if(isChildrenOf(url,"config")){configListStarted=true;await configListRelease.promise;return ok({files:[{id:"cfg",name:"app.json",mimeType:"application/json",parents:["config"],trashed:false,version:"1",appProperties:provenance("portable-config")}]});}
    if(isManagedQuery(url)) return ok({files:[]});
    throw new Error(url);
  });
  const pending=a.listForReconciliation(id("root"));
  await rootReadStarted.promise; await Promise.resolve();
  assert.equal(contentDiscoveryInFlight,false,"content discovery must wait for managed-root authority");
  assert.equal(configDiscoveryStarted,false,"config discovery must wait for managed-root authority");
  rootReadRelease.resolve();
  await contentDiscoveryStarted.promise; await Promise.resolve(); const discoveryOverlapped=configDiscoveryStarted;
  contentDiscoveryRelease.resolve(); configDiscoveryRelease.resolve();
  await contentListStarted.promise; await Promise.resolve(); const listingOverlapped=configListStarted;
  configListRelease.resolve(); await Promise.resolve(); contentListRelease.resolve();
  const result=await pending;
  assert.equal(discoveryOverlapped,true); assert.equal(listingOverlapped,true);
  assert.equal(result.ok,true);
  if(result.ok){assert.equal(result.value.completeness.status,"complete");assert.deepEqual(result.value.entries.map(e=>String(e.path)),["b.md","a.md","__brain_sync_portable_config__/app.json"]);}
  assert.equal(contentPage,2,"all ordinary-domain pages must be exhausted");
  assert.equal(methods.every(method=>method==="GET"),true,"planning fast path must not call mutation methods");
});

test("LAT-05 domain-root validation remains fail-closed for missing, duplicate, unmarked, trashed, and ambiguous roots",async()=>{
  const cases=[
    {name:"missing-content",contentFiles:[] as unknown[],configFiles:[config()]},
    {name:"duplicate-content",contentFiles:[content(),{...content(),id:"content-2"}],configFiles:[config()]},
    {name:"unmarked-config",contentFiles:[content()],configFiles:[{...config(),appProperties:{}}]},
    {name:"trashed-config",contentFiles:[content()],configFiles:[{...config(),trashed:true}]},
    {name:"duplicate-config",contentFiles:[content()],configFiles:[config(),{...config(),id:"config-2"}]},
  ];
  for(const scenario of cases){
    const a=adapter(async url=>{
      if(url.includes("/about")) return ok({user:{permissionId:"acct"}});
      if(url.includes("/files/root?")) return ok(root());
      if(isContentRootQuery(url)) return ok({files:scenario.contentFiles});
      if(isConfigRootQuery(url)) return ok({files:scenario.configFiles});
      throw new Error(`${scenario.name}:${url}`);
    });
    const result=await a.listForReconciliation(id("root"));
    assert.equal(result.ok,false,scenario.name);
    if(!result.ok) assert.ok(result.signal.kind==="recovery-required"||result.signal.kind==="conflict",scenario.name);
  }
});

test("LAT-05 interruption in either domain stays partial and merged duplicate identity/path stays fail-closed",async()=>{
  const ordinaryPartial=adapter(async url=>{
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root());
    if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]});
    if(isChildrenOf(url,"content")) return {ok:false,signal:{kind:"transient-failure",detail:"ordinary-interrupted"}};
    if(isChildrenOf(url,"config")) return ok({files:[{id:"cfg",name:"app.json",mimeType:"application/json",parents:["config"],trashed:false,appProperties:provenance("portable-config")}]});
    throw new Error(url);
  });
  const ordinaryResult=await ordinaryPartial.listForReconciliation(id("root")); assert.equal(ordinaryResult.ok,true); if(ordinaryResult.ok){assert.equal(ordinaryResult.value.completeness.status,"partial");assert.equal(ordinaryResult.value.entries.length,0);}

  const configPartial=adapter(async url=>{
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root());
    if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]});
    if(isChildrenOf(url,"content")) return ok({files:[{id:"c1",name:"note.md",mimeType:"text/plain",parents:["content"],trashed:false,appProperties:provenance("content")}]});
    if(isChildrenOf(url,"config")) return {ok:false,signal:{kind:"rate-limited",detail:"config-interrupted"}};
    throw new Error(url);
  });
  const configResult=await configPartial.listForReconciliation(id("root")); assert.equal(configResult.ok,true); if(configResult.ok){assert.equal(configResult.value.completeness.status,"partial");assert.deepEqual(configResult.value.entries.map(e=>String(e.path)),["note.md"]);}

  for(const kind of ["identity","path"] as const){
    const sameId=kind==="identity"?"dup":"cfg";
    const a=adapter(async url=>{
      if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root());
      if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]});
      if(isChildrenOf(url,"content")) return ok({files:[{id:kind==="identity"?"dup":"one",name:kind==="path"?"same.md":"note.md",mimeType:"text/plain",parents:["content"],trashed:false,appProperties:provenance("content")},{...(kind==="path"?{id:"two",name:"same.md",mimeType:"text/plain",parents:["content"],trashed:false,appProperties:provenance("content")}:{})}].filter(f=>"id" in f)});
      if(isChildrenOf(url,"config")) return ok({files:kind==="identity"?[{id:sameId,name:"app.json",mimeType:"application/json",parents:["config"],trashed:false,appProperties:provenance("portable-config")}]:[]});
      if(isManagedQuery(url)) return ok({files:[]}); throw new Error(url);
    });
    const result=await a.listForReconciliation(id("root")); assert.equal(result.ok,false,kind);
  }
});

test("LAT-05 reuses exact parent metadata only inside one provenance assembly",async()=>{
  let parentExactReads=0;
  const folder={id:"folder",name:"dir",mimeType:"application/vnd.google-apps.folder",parents:["content"],trashed:false};
  const child=(n:number)=>({id:`child-${n}`,name:`${n}.md`,mimeType:"text/plain",parents:["folder"],trashed:false,appProperties:provenance("content")});
  const a=adapter(async url=>{
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root());
    if(url.includes("/files/folder?")){parentExactReads++;return ok(folder);}
    if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]});
    if(isChildrenOf(url,"content")) return ok({files:[folder]}); if(isChildrenOf(url,"folder")) return ok({files:[child(1),child(2)]}); if(isChildrenOf(url,"config")) return ok({files:[]});
    if(isManagedQuery(url)) return ok({files:[child(1),child(2)]}); throw new Error(url);
  });
  let result=await a.listForReconciliation(id("root")); assert.equal(result.ok,true); assert.equal(parentExactReads,1,"siblings share one exact parent observation inside an assembly");
  result=await a.listForReconciliation(id("root")); assert.equal(result.ok,true); assert.equal(parentExactReads,2,"a second run must reacquire remote metadata");
});

const managed:ManagedRemoteIdentity={rootId:id("root"),vaultIdentity:vault("vault-1"),protocolVersion:contractId<"ProtocolVersion">("1")};
const device=contractId<"DeviceIdentity">("device") as DeviceIdentity;
const stateRevision=contractId<"StateRevision">("state:1") as StateRevision;
const stateContext:StateLoadContext={expectation:"existing-pairing",expectedVaultIdentity:managed.vaultIdentity,expectedDeviceIdentity:device};
function trusted(changeCursor?:ChangeCursor):TrustedSynchronizationState{return {schemaVersion:1,stateRevision,vaultIdentity:managed.vaultIdentity,deviceIdentity:device,base:[],remoteMappings:[],tombstones:[],...(changeCursor?{changeCursor}:{}),operations:[],knownDevices:[]};}
function assemblerFor(state:TrustedSynchronizationState,reliable:ReliableRemoteChangePort,counters:{list:number;start:number}){
  const local={enumerate:async()=>({entries:[],completeness:{status:"complete" as const}})} as never;
  const drive={validateManagedRoot:async()=>({ok:true as const,value:{status:"valid" as const,identity:managed}}),getStartCursor:async()=>{counters.start++;return {ok:true as const,value:cursor("full:new")};},listForReconciliation:async()=>{counters.list++;return {ok:true as const,value:{entries:[],completeness:{status:"complete" as const}}};}} as never;
  const store={load:async()=>({status:"trusted" as const,state})} as never;
  return new ProductSnapshotAssembler(local,drive,store,stateContext,async()=>managed,()=>true,()=>false,undefined,reliable);
}

test("LAT-05 trusted cursor stays incremental; conflicting or missing cursor state falls back full",async()=>{
  const counters={list:0,start:0};
  const reliable:ReliableRemoteChangePort={readChangePage:async(_identity,requestedToken)=>({ok:true,value:{kind:"terminal",requestedToken,changes:[],newStartPageToken:cursor("cursor:new")}})};
  const incremental=await assemblerFor(trusted(cursor("cursor:old")),reliable,counters).assemble(true); assert.equal(incremental.mode,"incremental"); assert.deepEqual(counters,{list:0,start:0});
  const conflictCounters={list:0,start:0};
  const conflict:ReliableRemoteChangePort={readChangePage:async()=>({ok:false,signal:{kind:"conflict",detail:"cursor-conflict"}})};
  const fallback=await assemblerFor(trusted(cursor("cursor:old")),conflict,conflictCounters).assemble(true); assert.equal(fallback.mode,"full"); assert.deepEqual(conflictCounters,{list:1,start:1});
  const missingCounters={list:0,start:0};
  const missing=await assemblerFor(trusted(),reliable,missingCounters).assemble(true); assert.equal(missing.mode,"full"); assert.deepEqual(missingCounters,{list:1,start:1});
});

test("LAT-05 leaves native reliable Changes cursor failure classification unchanged",async()=>{
  const a=adapter(async url=>{
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}}); if(url.includes("/files/root?")) return ok(root());
    if(isContentRootQuery(url)) return ok({files:[content()]}); if(isConfigRootQuery(url)) return ok({files:[config()]});
    if(url.includes("/changes?")) return {ok:false,signal:{kind:"recovery-required",detail:"drive-change-cursor-invalid"}};
    throw new Error(url);
  });
  const result=await a.readChangePage(managed,cursor("cursor:invalid")); assert.equal(result.ok,false); if(!result.ok){assert.equal(result.signal.kind,"recovery-required");assert.match("detail" in result.signal?result.signal.detail:"",/cursor-invalid/);}
});
