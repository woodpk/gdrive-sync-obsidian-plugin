import assert from "node:assert/strict";
import test from "node:test";
import type {
  BinaryContentSource,
  ContentEvidence,
  LocalMutationTransaction,
  LocalTransactionalMutationPort,
  ManagedRemoteIdentity,
  ObservationToken,
  PersistenceRevision,
  ReliableRemoteMutationPort,
  RemoteObjectId,
  SemanticStateGeneration,
  StateLoadContext,
  VaultPath,
} from "../src/contracts";
import { contractId } from "../src/contracts";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ProductionSynchronizationPlanner } from "../src/core/production-planner";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import { IntegratedSynchronizationStateStore } from "../src/product/phase6-sync-integration";
import { ProductSynchronizationExecutor } from "../src/product/production-executor";
import { ProductSnapshotAssembler } from "../src/product/snapshot-assembler";
import { MemoryTextVersionPersistence, ProductTextVersionStore } from "../src/product/text-version-store";
import {
  createInitialAuthorityState,
  type DurableSynchronizationAuthorityState,
  MemoryStateByteStorage,
  PersistentSynchronizationStateStore,
} from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id=<T extends string>(v:string)=>contractId<T>(v), vp=(v:string)=>id<"VaultPath">(v) as VaultPath, rid=(v:string)=>id<"RemoteObjectId">(v) as RemoteObjectId;
const gen=(v:string)=>id<"SemanticStateGeneration">(v) as SemanticStateGeneration;
const prev=(v:string)=>id<"StateRevision">(v) as unknown as PersistenceRevision;
const ev=(t:string,revision?:string):ContentEvidence=>({hash:sha256Text(t),sizeBytes:new TextEncoder().encode(t).byteLength,...(revision?{revision}:{})});
const src=(t:string):BinaryContentSource=>({sizeBytes:new TextEncoder().encode(t).byteLength,async *openChunks(){yield new TextEncoder().encode(t);}});
async function txt(s:BinaryContentSource){let r="";const d=new TextDecoder();for await(const c of s.openChunks())r+=d.decode(c,{stream:true});return r+d.decode();}

type F={text:string;evidence:ContentEvidence;token:ObservationToken;rid?:RemoteObjectId};
class Boundary{
  local=new Map<string,F>(); remote=new Map<string,F>(); localTrash:string[]=[];remoteTrash:string[]=[];localMoves:string[]=[];remoteMoves:string[]=[]; token=0; rev=0;
  private stagedLocalTransactions=new Map<string,string>();
  private preservedRemotePredecessors=new Map<string,F>();
  constructor(readonly identity:ManagedRemoteIdentity){}
  setLocal(p:VaultPath,t:string){this.local.set(String(p),{text:t,evidence:ev(t),token:id<"ObservationToken">(`t:${++this.token}:${String(p)}`) as ObservationToken});}
  setRemote(p:VaultPath,t:string,r:RemoteObjectId){this.remote.set(String(p),{text:t,evidence:ev(t,`r${++this.rev}`),token:id<"ObservationToken">("unused") as ObservationToken,rid:r});}
  readonly l={
    activeConfigurationDirectory:async()=>vp(".obsidian"), enumerate:async()=>({entries:[...this.local].map(([p,f])=>({status:"present" as const,side:"local" as const,path:vp(p),entityKind:"file" as const,content:f.evidence,stability:"stable" as const,observationToken:f.token})),completeness:{status:"complete" as const}}),
    observe:async(p:VaultPath)=>{const f=this.local.get(String(p));return f?{status:"present" as const,side:"local" as const,path:p,entityKind:"file" as const,content:f.evidence,stability:"stable" as const,observationToken:f.token}:{status:"absent" as const,side:"local" as const,path:p};},
    readFile:async(p:VaultPath)=>{const f=this.local.get(String(p));if(!f)throw new Error("missing local");return{content:src(f.text),evidence:f.evidence,stability:"stable" as const,observationToken:f.token};},
    createFile:async(p:VaultPath,c:BinaryContentSource)=>{const t=await txt(c);this.setLocal(p,t);const f=this.local.get(String(p))!;return{path:p,evidence:f.evidence,observationToken:f.token};},
    replaceFile:async(p:VaultPath,c:BinaryContentSource)=>{const t=await txt(c);this.setLocal(p,t);const f=this.local.get(String(p))!;return{path:p,evidence:f.evidence,observationToken:f.token};},
    createFolder:async(p:VaultPath)=>({path:p}), move:async(a:VaultPath,b:VaultPath)=>{const f=this.local.get(String(a));if(!f)throw new Error("missing local move");this.local.delete(String(a));this.local.set(String(b),f);this.localMoves.push(`${String(a)}->${String(b)}`);return{path:b,evidence:f.evidence};},
    trash:async(p:VaultPath)=>{this.localTrash.push(String(p));this.local.delete(String(p));},validatePath:async(p:VaultPath)=>({status:"compatible" as const,normalizedComparisonPath:String(p)}),classifyConfiguration:async()=>({classification:"unknown" as const,reason:"test"}),onChange:()=>()=>undefined,onLifecycle:()=>()=>undefined,
  };
  readonly d={
    authenticationState:async()=>({status:"authenticated" as const}),validateManagedRoot:async()=>({ok:true as const,value:{status:"valid" as const,identity:this.identity}}),getStartCursor:async()=>({ok:true as const,value:id<"ChangeCursor">(`c:${++this.rev}`)}),listForReconciliation:async()=>({ok:true as const,value:{entries:[...this.remote].map(([p,f])=>({path:vp(p),entityKind:"file" as const,remoteObjectId:f.rid!,content:f.evidence,trashed:false})),completeness:{status:"complete" as const}}}),readChanges:async()=>({ok:true as const,value:{changes:[],nextCursor:id<"ChangeCursor">(`c:${++this.rev}`),completeness:{status:"complete" as const}}}),
    observe:async(_r:RemoteObjectId,p:VaultPath)=>{const f=this.remote.get(String(p));return f?{ok:true as const,value:{status:"present" as const,side:"remote" as const,path:p,entityKind:"file" as const,remoteObjectId:f.rid!,content:f.evidence,stability:"stable" as const}}:{ok:true as const,value:{status:"absent" as const,side:"remote" as const,path:p}};},
    download:async(r:RemoteObjectId)=>{const e=[...this.remote.entries()].find(([,f])=>f.rid===r)??[...this.preservedRemotePredecessors.entries()].find(([,f])=>f.rid===r);if(!e)return{ok:false as const,signal:{kind:"not-found" as const,remoteObjectId:r}};return{ok:true as const,value:{remoteObjectId:r,content:src(e[1].text),evidence:e[1].evidence}};},
    create:async(_r:RemoteObjectId,q:{path:VaultPath;content?:BinaryContentSource;expectedEvidence?:ContentEvidence})=>{const t=q.content?await txt(q.content):"",r=rid(`new:${String(q.path)}`),e=q.expectedEvidence??ev(t);this.remote.set(String(q.path),{text:t,evidence:e,token:id<"ObservationToken">("u") as ObservationToken,rid:r});return{ok:true as const,value:{remoteObjectId:r,path:q.path,evidence:e}};},
    update:async(q:{remoteObjectId:RemoteObjectId;path:VaultPath;content:BinaryContentSource;expectedEvidence?:ContentEvidence})=>{const t=await txt(q.content),e=q.expectedEvidence??ev(t);this.remote.set(String(q.path),{text:t,evidence:e,token:id<"ObservationToken">("u") as ObservationToken,rid:q.remoteObjectId});return{ok:true as const,value:{remoteObjectId:q.remoteObjectId,path:q.path,evidence:e}};},
    move:async(r:RemoteObjectId,a:VaultPath,b:VaultPath)=>{const f=this.remote.get(String(a));if(!f)return{ok:false as const,signal:{kind:"not-found" as const,remoteObjectId:r}};this.remote.delete(String(a));this.remote.set(String(b),{...f,rid:r});this.remoteMoves.push(`${String(a)}->${String(b)}`);return{ok:true as const,value:{remoteObjectId:r,path:b,evidence:f.evidence}};},
    trash:async(r:RemoteObjectId)=>{const e=[...this.remote.entries()].find(([,f])=>f.rid===r);if(e){this.remoteTrash.push(e[0]);this.remote.delete(e[0]);}return{ok:true as const,value:undefined};},
  };
  readonly localTransactionalMutationPort:LocalTransactionalMutationPort={
    stageAndVerify:async(transaction,content)=>{
      const text=await txt(content),actual=ev(text);
      if(actual.hash!==transaction.expectedNewEvidence.hash||actual.sizeBytes!==transaction.expectedNewEvidence.sizeBytes)return{status:"blocked" as const,reason:"fixture staged bytes do not match intended content",transaction};
      this.stagedLocalTransactions.set(String(transaction.transactionId),text);
      return{status:"staged-verified" as const,transaction:{...transaction,stage:"staged-verified"} as LocalMutationTransaction};
    },
    commitVerifiedStage:async transaction=>{
      const text=this.stagedLocalTransactions.get(String(transaction.transactionId));
      if(text===undefined)return{status:"outcome-unknown" as const,reason:"fixture stage is missing",transaction};
      this.setLocal(transaction.path,text);this.stagedLocalTransactions.delete(String(transaction.transactionId));
      const f=this.local.get(String(transaction.path))!;
      return{status:"committed" as const,transaction:{...transaction,stage:"completed"} as LocalMutationTransaction,resultingObservationToken:f.token};
    },
    recover:async transaction=>({status:"blocked" as const,reason:"fixture has no interrupted local transaction",transaction}),
  };
  readonly reliableRemoteMutationPort:ReliableRemoteMutationPort={
    reserveFileCreateIdentity:async(_root,intentId,path,intendedContent)=>({ok:true as const,value:{kind:"reserved-file-create" as const,intentId,reservedRemoteObjectId:rid(`reserved:${++this.rev}:${String(path)}`),path,intendedContent}}),
    reserveFolderCreateIdentity:async(_root,intentId,path)=>({ok:true as const,value:{kind:"reserved-folder-create" as const,intentId,reservedRemoteObjectId:rid(`reserved-folder:${++this.rev}:${String(path)}`),path}}),
    createReserved:async(identity,content)=>{
      if(identity.kind==="reserved-folder-create")return{status:"verified-effect" as const,applicationProof:{kind:"reserved-create" as const,remoteObjectId:identity.reservedRemoteObjectId,path:identity.path}};
      if(!content)return{status:"outcome-unknown" as const,reason:"fixture reserved file create requires content"};
      const text=await txt(content),actual=ev(text);
      if(actual.hash!==identity.intendedContent.hash||actual.sizeBytes!==identity.intendedContent.sizeBytes)return{status:"verified-not-applied" as const,reason:"fixture create content does not match reserved identity"};
      const evidence=ev(text,`r${++this.rev}`);
      this.remote.set(String(identity.path),{text,evidence,token:id<"ObservationToken">("u") as ObservationToken,rid:identity.reservedRemoteObjectId});
      return{status:"verified-effect" as const,applicationProof:{kind:"reserved-create" as const,remoteObjectId:identity.reservedRemoteObjectId,path:identity.path,verifiedContent:identity.intendedContent}};
    },
    updateExisting:async(identity,content)=>{
      const predecessor=this.remote.get(String(identity.path));
      if(!predecessor||predecessor.rid!==identity.remoteObjectId||predecessor.evidence.revision!==String(identity.expectedRevision))return{status:"verified-not-applied" as const,reason:"fixture predecessor authority changed before update"};
      const text=await txt(content),actual=ev(text);
      if(actual.hash!==identity.intendedContent.hash||actual.sizeBytes!==identity.intendedContent.sizeBytes)return{status:"verified-not-applied" as const,reason:"fixture update content does not match intended identity"};
      this.preservedRemotePredecessors.set(String(predecessor.rid),predecessor);
      this.remote.set(String(identity.path),{text,evidence:ev(text,`r${++this.rev}`),token:id<"ObservationToken">("u") as ObservationToken,rid:identity.candidateRemoteObjectId});
      return{status:"verified-effect" as const,applicationProof:{kind:"immutable-candidate-preservation" as const,candidateRemoteObjectId:identity.candidateRemoteObjectId,predecessorRemoteObjectId:identity.remoteObjectId,predecessorRevision:identity.expectedRevision,intendedContent:identity.intendedContent,verifiedContent:identity.intendedContent,preservedRemoteObjectIds:[identity.remoteObjectId,identity.candidateRemoteObjectId]}};
    },
    moveExisting:async identity=>{
      const e=[...this.remote.entries()].find(([,f])=>f.rid===identity.remoteObjectId);
      if(!e)return{status:"verified-not-applied" as const,reason:"fixture move source no longer matches durable identity"};
      this.remote.delete(e[0]);this.remote.set(String(identity.toPath),e[1]);this.remoteMoves.push(`${String(identity.fromPath)}->${String(identity.toPath)}`);
      return{status:"verified-effect" as const,applicationProof:{kind:"identity-preserving-move" as const,remoteObjectId:identity.remoteObjectId,fromPath:identity.fromPath,toPath:identity.toPath}};
    },
    trashExisting:async identity=>{
      const e=[...this.remote.entries()].find(([,f])=>f.rid===identity.remoteObjectId);
      if(e){this.remoteTrash.push(e[0]);this.remote.delete(e[0]);}
      return{status:"verified-effect" as const,applicationProof:{kind:"trash" as const,remoteObjectId:identity.remoteObjectId,path:identity.path,trashed:true as const}};
    },
  };
}

function state(vault:any,device:any,entries:readonly {path:VaultPath;remoteObjectId:RemoteObjectId;text:string}[],stale=false):DurableSynchronizationAuthorityState{
  const semanticGeneration=gen("semantic:g2:conflict:0"),s=createInitialAuthorityState({persistenceRevision:prev("persistence:g2:conflict:0"),semanticGeneration,vaultIdentity:vault,deviceIdentity:device});
  return{...s,base:entries.map(x=>({path:x.path,entityKind:"file" as const,localExisted:true,remoteExisted:true,content:ev(x.text),remoteObjectId:x.remoteObjectId})),remoteMappings:entries.map(x=>({path:x.path,entityKind:"file" as const,remoteObjectId:x.remoteObjectId})),baseAuthority:entries.map(x=>({path:x.path,fingerprint:id<"BaseFingerprint">(`base:g2:conflict:${String(x.path)}`)})),pathConvergence:entries.map(x=>({path:x.path,state:{status:"converged" as const,generation:semanticGeneration,baseFingerprint:id<"BaseFingerprint">(`base:g2:conflict:${String(x.path)}`)}})),knownDevices:[{deviceId:device,stale}],changeCursor:id<"ChangeCursor">("cursor:0")};
}
async function make(entries:readonly {path:string;base:string;local?:string;remote?:string;remotePath?:string;remoteObjectId?:string}[],opts:{stale?:boolean}={}){
  const vault=id<"VaultIdentity">("vault:g2:conflict"),device=id<"DeviceIdentity">("device:g2:conflict"),identity={rootId:rid("root:g2:conflict"),vaultIdentity:vault,protocolVersion:id<"ProtocolVersion">("1")} as ManagedRemoteIdentity,b=new Boundary(identity);const bases=[] as {path:VaultPath;remoteObjectId:RemoteObjectId;text:string}[];
  for(const x of entries){const p=vp(x.path),r=rid(x.remoteObjectId??`rid:${x.path}`);bases.push({path:p,remoteObjectId:r,text:x.base});if(x.local!==undefined)b.setLocal(p,x.local);if(x.remote!==undefined)b.setRemote(vp(x.remotePath??x.path),x.remote,r);}
  const rawStore=new PersistentSynchronizationStateStore(new MemoryStateByteStorage()),st=state(vault,device,bases,opts.stale);await rawStore.saveTrusted(st);const store=new IntegratedSynchronizationStateStore(rawStore),context:StateLoadContext={expectation:"existing-pairing",expectedVaultIdentity:vault,expectedDeviceIdentity:device};
  const assembler=new ProductSnapshotAssembler(b.l as never,b.d as never,store,context,async()=>identity);
  const versions=new ProductTextVersionStore(new MemoryTextVersionPersistence(),b.l as never,b.d as never);for(const x of entries)await versions.persistText({path:vp(x.path),entityKind:"file",content:ev(x.base),remoteObjectId:rid(x.remoteObjectId??`rid:${x.path}`)},x.base);
  const conflicts=new ThreeWayConflictResolver(versions,versions,device);let controller!:IntegratedProductController;const executor=new ProductSynchronizationExecutor(b.l as never,b.d as never,store,context,()=>controller.currentRunEvidence(),versions);
  controller=new IntegratedProductController({vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:store,authorityStore:store,snapshotAssembler:assembler,executor,reliableRemoteMutationPort:b.reliableRemoteMutationPort,localTransactionalMutationPort:b.localTransactionalMutationPort,conflictResolver:conflicts,plannerForTrigger:t=>new ProductionSynchronizationPlanner(new DeterministicSynchronizationPlanner(conflicts,undefined,{trigger:t})),leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,audit:new BoundedAuditHistory(new MemoryAuditPersistence(),100),holderId:"g2-conflict"});
  return{b,store,context,controller};
}
async function preview(h:Awaited<ReturnType<typeof make>>){const p=await h.controller.previewManual();assert.ok(p);return p;}

test("G2 scenario 10 clean three-way text merge executes through controller and commits merged authority",async()=>{const h=await make([{path:"merge.md",base:"a\nb\nc\n",local:"a\nLOCAL\nc\n",remote:"a\nb\nREMOTE\n"}]);const p=await preview(h);assert.equal(p.operations[0]?.kind,"clean-text-merge");assert.equal((await h.controller.request({kind:"execute-plan",planId:p.planId})).status,"accepted");assert.equal(h.b.local.get("merge.md")?.text,"a\nLOCAL\nREMOTE\n");assert.equal(h.b.remote.get("merge.md")?.text,"a\nLOCAL\nREMOTE\n");});

test("G2 scenario 11 true text conflict preserves local and remote alternates without mutation",async()=>{const h=await make([{path:"conflict.md",base:"base\n",local:"LOCAL\n",remote:"REMOTE\n"}]);const p=await preview(h);assert.equal(p.operations[0]?.kind,"unresolved-conflict");assert.equal(h.controller.currentSurface().status.kind,"conflict-present");await h.controller.request({kind:"execute-plan",planId:p.planId});assert.equal(h.b.local.get("conflict.md")?.text,"LOCAL\n");assert.equal(h.b.remote.get("conflict.md")?.text,"REMOTE\n");});

test("G2 scenario 12 binary conflict preserves both opaque versions",async()=>{const h=await make([{path:"blob.bin",base:"BASE",local:"LOCAL",remote:"REMOTE"}]);const p=await preview(h);assert.equal(p.operations[0]?.kind,"unresolved-conflict");await h.controller.request({kind:"execute-plan",planId:p.planId});assert.equal(h.b.local.get("blob.bin")?.text,"LOCAL");assert.equal(h.b.remote.get("blob.bin")?.text,"REMOTE");});

test("G2 scenario 14 stable Drive identity produces and executes identity-preserving remote move",async()=>{const r="rid:move";const h=await make([{path:"old.md",base:"same",local:"same",remote:"same",remotePath:"new.md",remoteObjectId:r}]);const p=await preview(h);assert.equal(p.operations.some(o=>o.kind==="identity-preserving-move"&&String(o.path)==="new.md"),true);assert.equal((await h.controller.request({kind:"execute-plan",planId:p.planId})).status,"accepted");assert.equal(h.b.local.has("old.md"),false);assert.equal(h.b.local.get("new.md")?.text,"same");assert.equal(h.b.remote.get("new.md")?.rid,rid(r));});

test("G2 scenarios 15 and 18 attested deletion is recoverable and exact checkpoint approval gates suspicious destruction",async()=>{const entries=Array.from({length:6},(_,i)=>({path:`delete-${i}.md`,base:`v${i}`,remote:`v${i}`,remoteObjectId:`rid:delete:${i}`}));const h=await make(entries);const p=await preview(h);assert.equal(p.operations.every(o=>o.kind==="trash-remote"),true);assert.equal(p.recoveryCheckpointRequired,true);assert.equal(h.b.remoteTrash.length,0);assert.equal((await h.controller.request({kind:"execute-plan",planId:p.planId})).status,"rejected");const cp=h.controller.pendingDestructiveCheckpoint();assert.ok(cp);assert.equal((await h.controller.request({kind:"approve-destructive-plan",planId:p.planId,recoveryCheckpointId:id<"CheckpointId">("wrong")})).status,"rejected");assert.equal(h.b.remoteTrash.length,0);assert.equal((await h.controller.request({kind:"approve-destructive-plan",planId:p.planId,recoveryCheckpointId:cp})).status,"accepted");assert.equal(h.b.remoteTrash.length,6);});

test("G2 scenario 16 delete-vs-modify remains a preservation conflict",async()=>{const h=await make([{path:"delete-modify.md",base:"base",remote:"changed",remoteObjectId:"rid:dm"}]);const p=await preview(h);assert.equal(p.operations[0]?.kind,"unresolved-conflict");assert.equal(h.b.remote.get("delete-modify.md")?.text,"changed");assert.equal(h.b.remoteTrash.length,0);});

test("G2 scenario 17 suspicious bulk destruction is circuit-broken before any mutation",async()=>{const entries=Array.from({length:10},(_,i)=>({path:`bulk-${i}.md`,base:`v${i}`,remote:`v${i}`,remoteObjectId:`rid:bulk:${i}`}));const h=await make(entries);const p=await preview(h);assert.equal(p.recoveryCheckpointRequired,true);assert.equal(p.executionDisposition,"requires-user-approval");assert.equal(h.controller.currentSurface().status.kind,"destructive-plan-blocked");assert.equal(h.b.remoteTrash.length,0);});
