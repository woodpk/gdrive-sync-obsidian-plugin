import assert from "node:assert/strict";
import test from "node:test";
import type { BinaryContentSource, ContentEvidence, DriveSignal, ManagedRemoteIdentity, PathSnapshot, RemoteObjectId, VaultPath } from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import type { DriveResult } from "../src/contracts/google-drive";
import { GoogleOAuthSession, ObsidianSecretStore } from "../src/drive/auth";
import { GoogleDriveAdapter } from "../src/drive/google-drive-port";
import { GoogleHttpTransport, type PortableRequestInit } from "../src/drive/transport";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { CONFIG_REMOTE_NAMESPACE, ProductPathScope, ScopedLocalVault } from "../src/product/path-scope";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler, type AssembledPlanningInput } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id=<T extends string>(value:string)=>contractId<T>(value);
const vp=(value:string)=>id<"VaultPath">(value) as VaultPath;
const remoteId=(value:string)=>id<"RemoteObjectId">(value) as RemoteObjectId;
const vault=id<"VaultIdentity">("vault:group-b");
const device=id<"DeviceIdentity">("device:group-b");
const managed:ManagedRemoteIdentity={rootId:remoteId("root"),vaultIdentity:vault,protocolVersion:id<"ProtocolVersion">("1")};
const context={expectation:"existing-pairing" as const,expectedVaultIdentity:vault,expectedDeviceIdentity:device};
const resolver=new ThreeWayConflictResolver({readText:async()=>undefined});
const canonical=(text:string):ContentEvidence=>({hash:sha256Text(text),sizeBytes:new TextEncoder().encode(text).byteLength});

class MemorySecrets {
  readonly values=new Map<string,string>();
  getSecret(key:string){return this.values.get(key)??null;}
  setSecret(key:string,value:string){this.values.set(key,value);}
  deleteSecret(key:string){this.values.delete(key);}
}
class StubTransport extends GoogleHttpTransport {
  constructor(private readonly handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>) {
    const memory=new MemorySecrets();
    super(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},new ObsidianSecretStore(memory)));
  }
  override request(url:string,init:PortableRequestInit={}):Promise<DriveResult<Response>>{return this.handler(url,init);}
}
const ok=(body:unknown,status=200)=>Promise.resolve({ok:true,value:new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}})} as DriveResult<Response>);
function googleAdapter(handler:(url:string,init?:PortableRequestInit)=>Promise<DriveResult<Response>>){
  const backing=new MemorySecrets(); backing.setSecret("brain-gdrive-paired-account","acct"); const store=new ObsidianSecretStore(backing);
  return new GoogleDriveAdapter(new GoogleOAuthSession({clientId:"c",redirectUri:"https://cb"},store),new StubTransport(handler),store);
}

test("B3 reserved configuration collision remains path-local while unrelated upload/download work stays executable",async()=>{
  const scope=new ProductPathScope(vp(".obsidian"),()=>({userExclusionPatterns:[]}));
  const safeUpload=vp("safe-upload.md"),safeDownload=vp("safe-download.md"),collision=vp(CONFIG_REMOTE_NAMESPACE);
  const inner={
    enumerate:async()=>({entries:[
      {status:"present" as const,side:"local" as const,path:safeUpload,entityKind:"file" as const,content:canonical("upload"),stability:"stable" as const,observationToken:id<"ObservationToken">("tok:upload")},
      {status:"present" as const,side:"local" as const,path:collision,entityKind:"folder" as const,stability:"stable" as const},
    ],completeness:{status:"complete" as const}}),
    observe:async(path:VaultPath)=>String(path)===CONFIG_REMOTE_NAMESPACE
      ? {status:"present" as const,side:"local" as const,path:collision,entityKind:"folder" as const,stability:"stable" as const}
      : {status:"absent" as const,side:"local" as const,path},
  } as never;
  const local=new ScopedLocalVault(inner,scope);
  const state=new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const assembler=new ProductSnapshotAssembler(
    local,
    {
      validateManagedRoot:async()=>({ok:true as const,value:{status:"valid" as const,identity:managed}}),
      getStartCursor:async()=>({ok:true as const,value:id<"ChangeCursor">("cursor:new")}),
      listForReconciliation:async()=>({ok:true as const,value:{entries:[{path:safeDownload,entityKind:"file" as const,remoteObjectId:remoteId("remote-download"),content:{revision:"1",sizeBytes:8},trashed:false}],completeness:{status:"complete" as const}}}),
    } as never,
    state,
    {expectation:"new-installation"},
    async()=>managed,
    path=>scope.isManagedLogical(path),
  );
  const assembled=await assembler.assembleFull();
  assert.equal(assembled.input.snapshots.find(s=>s.path===safeUpload)?.local.status,"present");
  assert.equal(assembled.input.snapshots.find(s=>s.path===safeDownload)?.remote.status,"present");
  const collisionSnapshot=assembled.input.snapshots.find(s=>String(s.path)===CONFIG_REMOTE_NAMESPACE);
  assert.ok(collisionSnapshot); assert.equal(collisionSnapshot!.identity.status,"ambiguous");
  const plan=await new DeterministicSynchronizationPlanner(resolver).plan(assembled.input);
  assert.ok(plan.operations.some(op=>op.kind==="upload-create"&&op.path===safeUpload));
  assert.ok(plan.operations.some(op=>op.kind==="download-create"&&op.path===safeDownload));
  assert.ok(plan.operations.some(op=>op.kind==="blocked-unsafe"&&String(op.path).startsWith(CONFIG_REMOTE_NAMESPACE)));
  assert.equal(plan.executionDisposition,"requires-user-approval");
});

interface StreamHarnessResult {
  readonly controller: IntegratedProductController;
  readonly action: Awaited<ReturnType<IntegratedProductController["request"]>>;
  readonly state: PersistentSynchronizationStateStore;
  readonly downloadStarts: number;
  readonly replaceStarts: number;
  readonly mediaCalls: number;
  readonly localA: string;
  readonly localB: string;
}

async function runLazyFailure(signal:DriveSignal):Promise<StreamHarnessResult>{
  const first=vp("a.bin"),second=vp("b.bin"),firstId=remoteId("remote-a"),secondId=remoteId("remote-b");
  const firstBase=canonical("old-a"),secondBase=canonical("old-b"),remoteEvidence:ContentEvidence={revision:"7",sizeBytes:300000};
  let mediaCalls=0;
  const adapter=googleAdapter(async url=>{
    if(url.includes("/about")) return ok({user:{permissionId:"acct"}});
    if(url.includes("/files/remote-a?")&&!url.includes("alt=media")) return ok({id:"remote-a",name:"a.bin",mimeType:"application/octet-stream",parents:["content"],size:"300000",version:"7",appProperties:{brainManagedRootId:"root",brainSyncDomain:"content"}});
    if(url.includes("alt=media")){
      mediaCalls++;
      if(mediaCalls===1) return Promise.resolve({ok:true,value:new Response(new Uint8Array(256*1024).slice().buffer,{status:206})} as DriveResult<Response>);
      return Promise.resolve({ok:false,signal} as DriveResult<Response>);
    }
    throw new Error(url);
  });
  const prepared=await adapter.download(firstId); assert.equal(prepared.ok,true); if(!prepared.ok) throw new Error("download preparation failed");

  const values=new Map<string,string>([[String(first),"old-a"],[String(second),"old-b"]]);
  const evidences=new Map<string,ContentEvidence>([[String(first),firstBase],[String(second),secondBase]]);
  const tokens=new Map<string,string>([[String(first),"tok:a"],[String(second),"tok:b"]]);
  let replaceStarts=0;
  const local={
    observe:async(path:VaultPath)=>({status:"present" as const,side:"local" as const,path,entityKind:"file" as const,content:evidences.get(String(path))!,stability:"stable" as const,observationToken:id<"ObservationToken">(tokens.get(String(path))!)}),
    validatePath:async(path:VaultPath)=>({status:"compatible" as const,normalizedComparisonPath:String(path).toLowerCase()}),
    replaceFile:async(path:VaultPath,source:BinaryContentSource)=>{
      replaceStarts++;
      let length=0;
      for await(const chunk of source.openChunks()) length+=chunk.length;
      values.set(String(path),`replaced:${length}`); evidences.set(String(path),remoteEvidence);
      return {path,evidence:remoteEvidence,observationToken:id<"ObservationToken">(`tok:replaced:${String(path)}`)};
    },
  } as never;
  let downloadStarts=0;
  const drive={
    observe:async(_root:RemoteObjectId,path:VaultPath)=>({ok:true as const,value:{status:"present" as const,side:"remote" as const,path,entityKind:"file" as const,remoteObjectId:path===first?firstId:secondId,content:remoteEvidence,stability:"stable" as const}}),
    download:async(remoteObjectId:RemoteObjectId)=>{
      downloadStarts++;
      if(remoteObjectId===firstId) return prepared;
      throw new Error("later operation must not start");
    },
  } as never;

  const state=new PersistentSynchronizationStateStore(new MemoryStateByteStorage());
  const initial=createInitialTrustedState({stateRevision:id<"StateRevision">("state:0"),vaultIdentity:vault,deviceIdentity:device});
  const firstBaseEntry={path:first,entityKind:"file" as const,localExisted:true,remoteExisted:true,content:firstBase,remoteObjectId:firstId};
  const secondBaseEntry={path:second,entityKind:"file" as const,localExisted:true,remoteExisted:true,content:secondBase,remoteObjectId:secondId};
  await state.saveTrusted({...initial,changeCursor:id<"ChangeCursor">("cursor:old"),base:[firstBaseEntry,secondBaseEntry],remoteMappings:[{path:first,entityKind:"file",remoteObjectId:firstId},{path:second,entityKind:"file",remoteObjectId:secondId}]});
  const loaded=await state.load(context); assert.equal(loaded.status,"trusted");
  const snapshot=(path:VaultPath,baseEntry:typeof firstBaseEntry,localEvidence:ContentEvidence,objectId:RemoteObjectId):PathSnapshot=>({
    path,
    local:{status:"present",side:"local",path,entityKind:"file",content:localEvidence,stability:"stable",observationToken:id<"ObservationToken">(tokens.get(String(path))!)},
    remote:{status:"present",side:"remote",path,entityKind:"file",remoteObjectId:objectId,content:remoteEvidence,stability:"stable"},
    base:{status:"trusted",entry:baseEntry},remoteEnumeration:{status:"complete"},identity:{status:"unambiguous"},
  });
  const assembly:AssembledPlanningInput={input:{snapshots:[snapshot(first,firstBaseEntry,firstBase,firstId),snapshot(second,secondBaseEntry,secondBase,secondId)],state:loaded},managedRemote:managed,remoteEnumeration:{status:"complete"},mode:"full",nextCursor:id<"ChangeCursor">("cursor:new")};
  const executor=new ProductSynchronizationExecutor(local,drive,state,context,()=>({managedRemote:managed,remoteEnumerationComplete:true}));
  const controller=new IntegratedProductController({
    vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:state,
    snapshotAssembler:{assembleFull:async()=>assembly} as never,
    executor,conflictResolver:resolver,
    plannerForTrigger:trigger=>new DeterministicSynchronizationPlanner(resolver,undefined,{trigger}),
    leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,
    audit:new BoundedAuditHistory(new MemoryAuditPersistence(),50),holderId:`group-b:${signal.kind}`,
  });
  const plan=await controller.previewManual(); assert.ok(plan); assert.equal(plan!.operations.filter(op=>op.kind==="download-update").length,2);
  const action=await controller.request({kind:"execute-plan",planId:plan!.planId});
  return{controller,action,state,downloadStarts,replaceStarts,mediaCalls,localA:values.get(String(first))!,localB:values.get(String(second))!};
}

test("B4 authentication revoked after lazy transfer begins surfaces authentication-required and stops without cursor/local commit",async()=>{
  const h=await runLazyFailure({kind:"authentication-required",detail:"revoked-during-stream"});
  assert.equal(h.action.status,"rejected");
  assert.deepEqual(h.controller.currentSurface().status,{kind:"authentication-required",reason:"revoked-during-stream"});
  assert.equal(h.mediaCalls,2); assert.equal(h.downloadStarts,1); assert.equal(h.replaceStarts,1);
  assert.equal(h.localA,"old-a"); assert.equal(h.localB,"old-b");
  const loaded=await h.state.load(context); assert.equal(loaded.status,"trusted"); if(loaded.status==="trusted") assert.equal(String(loaded.state.changeCursor),"cursor:old");
});

test("B4 transient failure after lazy transfer begins becomes offline-deferred and stops without cursor/local commit",async()=>{
  const h=await runLazyFailure({kind:"transient-failure",detail:"network-during-stream"});
  assert.equal(h.action.status,"rejected");
  assert.deepEqual(h.controller.currentSurface().status,{kind:"offline-deferred",reason:"network-during-stream"});
  assert.equal(h.mediaCalls,2); assert.equal(h.downloadStarts,1); assert.equal(h.replaceStarts,1);
  assert.equal(h.localA,"old-a"); assert.equal(h.localB,"old-b");
  const loaded=await h.state.load(context); assert.equal(loaded.status,"trusted"); if(loaded.status==="trusted") assert.equal(String(loaded.state.changeCursor),"cursor:old");
});

test("B4 rate limit after lazy transfer begins stays retryable/offline-deferred with retry taxonomy",async()=>{
  const h=await runLazyFailure({kind:"rate-limited",retryAfterMs:5000});
  assert.equal(h.action.status,"rejected");
  assert.deepEqual(h.controller.currentSurface().status,{kind:"offline-deferred",reason:"rate-limited"});
  assert.equal(h.mediaCalls,2); assert.equal(h.downloadStarts,1); assert.equal(h.localA,"old-a"); assert.equal(h.localB,"old-b");
});
