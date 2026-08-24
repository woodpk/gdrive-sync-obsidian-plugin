import assert from "node:assert/strict";
import test from "node:test";
import type { ConflictAssessment, ContentEvidence, ManagedRemoteIdentity, PathSnapshot, PlannedOperation, VaultPath, VersionReference } from "../src/contracts";
import { contractId } from "../src/contracts";
import { DeterministicSynchronizationPlanner } from "../src/core/planner";
import { ThreeWayConflictResolver } from "../src/core/conflict-resolver";
import { BoundedAuditHistory, MemoryAuditPersistence } from "../src/product/audit-history";
import { IntegratedProductController } from "../src/product/product-controller";
import type { AssembledPlanningInput } from "../src/product/snapshot-assembler";
import { MemoryStateByteStorage, PersistentSynchronizationStateStore, createInitialTrustedState } from "../src/state/persistent-state-store";
import { sha256Text } from "../src/util/sha256";

const id=<T extends string>(v:string)=>contractId<T>(v);
const vp=(v:string)=>id<"VaultPath">(v) as VaultPath;
const vault=id<"VaultIdentity">("vault:recovery"),device=id<"DeviceIdentity">("device:recovery");
const managed:ManagedRemoteIdentity={rootId:id<"RemoteObjectId">("root"),vaultIdentity:vault,protocolVersion:id<"ProtocolVersion">("1")};
const context={expectation:"existing-pairing" as const,expectedVaultIdentity:vault,expectedDeviceIdentity:device};
const ev=(s:string):ContentEvidence=>({hash:sha256Text(s),sizeBytes:s.length});
const resolver=new ThreeWayConflictResolver({readText:async()=>undefined});
function conflictSnapshot(name:string):PathSnapshot{const path=vp(name);return{path,local:{status:"present",side:"local",path,entityKind:"file",content:ev(`local-${name}`),stability:"stable",observationToken:id<"ObservationToken">(`tok-${name}`)},remote:{status:"present",side:"remote",path,entityKind:"file",content:{...ev(`remote-${name}`),revision:`rev-${name}`},remoteObjectId:id<"RemoteObjectId">(`rid-${name}`),stability:"stable"},base:{status:"uninitialized"},remoteEnumeration:{status:"complete"},identity:{status:"unambiguous"}};}
function recoveryAssembly(snapshots:readonly PathSnapshot[],cursor=true):AssembledPlanningInput{return{input:{snapshots,state:{status:"uninitialized"}},managedRemote:managed,remoteEnumeration:{status:"complete"},mode:"full",reconstruction:true,...(cursor?{nextCursor:id<"ChangeCursor">("cursor:recovery")}:{})};}

function fakeExecutor(){return{
  validatePreconditions:async()=>({status:"valid" as const}),
  execute:async(operation:PlannedOperation)=>({status:"durable-verified-success" as const,receipt:{operationId:operation.operationId,durable:true,integrityVerified:true,evidence:operation.contentVersion?.content,verificationEvidenceRef:`fake:${String(operation.operationId)}`}}),
  versionStillCurrent:async()=>true,
  currentLocalVersion:async(path:VaultPath):Promise<VersionReference>=>({path,entityKind:"file",content:ev("manual"),observationToken:id<"ObservationToken">("manual-token")}),
  localPathState:async()=>"absent" as const,
  failureScope:()=>"global" as const,
};}

async function seededStore(){const store=new PersistentSynchronizationStateStore(new MemoryStateByteStorage());await store.saveTrusted(createInitialTrustedState({stateRevision:id<"StateRevision">("state:0"),vaultIdentity:vault,deviceIdentity:device}));return store;}

test("C2 resolving all recovery conflicts cannot clear recovery until fresh full reconstruction commits cursor",async()=>{
  const store=await seededStore();let recovery=true;const gateEvents:boolean[]=[];let snapshots:readonly PathSnapshot[]=[conflictSnapshot("one.bin"),conflictSnapshot("two.bin")];
  const assembler={assembleRecovery:async()=>recoveryAssembly(snapshots),assembleFull:async()=>recoveryAssembly(snapshots)} as never;
  const controller=new IntegratedProductController({vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:store,snapshotAssembler:assembler,executor:fakeExecutor() as never,conflictResolver:resolver,plannerForTrigger:trigger=>new DeterministicSynchronizationPlanner(resolver,undefined,{trigger}),leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,audit:new BoundedAuditHistory(new MemoryAuditPersistence(),100),holderId:"recovery-conflicts",recoveryActive:()=>recovery,onRecoveryGateChanged:async active=>{gateEvents.push(active);recovery=active;}});
  const plan=await controller.previewVerifyReconcile();assert.ok(plan);assert.equal(controller.currentSurface().conflicts.length,2);assert.equal(recovery,true);
  const conflicts=controller.currentSurface().conflicts as Exclude<ConflictAssessment,{kind:"none"}>[];
  const first=conflicts[0];assert.ok("conflictId" in first);if("conflictId" in first){const result=await controller.request({kind:"resolve-conflict",conflictId:first.conflictId,resolution:{kind:"keep-local"}});assert.equal(result.status,"accepted");}
  assert.equal(recovery,true);assert.equal(gateEvents.includes(false),false);assert.equal(controller.currentSurface().status.kind,"recovery-required");
  const second=conflicts[1];assert.ok("conflictId" in second);if("conflictId" in second){const result=await controller.request({kind:"resolve-conflict",conflictId:second.conflictId,resolution:{kind:"keep-local"}});assert.equal(result.status,"accepted");}
  assert.equal(recovery,true);assert.equal(gateEvents.includes(false),false);assert.equal(controller.currentSurface().status.kind,"recovery-required");
  snapshots=[];
  const fresh=await controller.previewVerifyReconcile();assert.ok(fresh);const executed=await controller.request({kind:"execute-plan",planId:fresh!.planId});assert.equal(executed.status,"accepted");
  assert.equal(recovery,false);assert.deepEqual(gateEvents,[false]);const loaded=await store.load(context);assert.equal(loaded.status,"trusted");if(loaded.status==="trusted")assert.equal(String(loaded.state.changeCursor),"cursor:recovery");
  assert.equal((await controller.readAuditHistory()).some(record=>record.event==="recovery-completed"),true);
});

test("C2 cursorless recovery-derived conflict subplan has no recovery-completion authority",async()=>{
  const store=await seededStore();let recovery=true;let cleared=0;const snapshots=[conflictSnapshot("only.bin")];const controller=new IntegratedProductController({vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:store,snapshotAssembler:{assembleRecovery:async()=>recoveryAssembly(snapshots)} as never,executor:fakeExecutor() as never,conflictResolver:resolver,plannerForTrigger:trigger=>new DeterministicSynchronizationPlanner(resolver,undefined,{trigger}),leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,audit:new BoundedAuditHistory(new MemoryAuditPersistence(),50),holderId:"cursorless",recoveryActive:()=>recovery,onRecoveryGateChanged:async active=>{if(!active)cleared++;recovery=active;}});
  await controller.previewVerifyReconcile();const conflict=controller.currentSurface().conflicts[0] as Exclude<ConflictAssessment,{kind:"none"}>;assert.ok("conflictId" in conflict);if("conflictId" in conflict)await controller.request({kind:"resolve-conflict",conflictId:conflict.conflictId,resolution:{kind:"keep-local"}});assert.equal(cleared,0);assert.equal(recovery,true);assert.equal(controller.currentSurface().status.kind,"recovery-required");
});

test("C5 failed or partial full run cannot signal scope-reconcile completion",async()=>{
  const store=await seededStore();let completed=0;const blocked=conflictSnapshot("blocked.bin");blocked.local={status:"unreadable",side:"local",path:blocked.path,reason:"bad"};const assembly:AssembledPlanningInput={input:{snapshots:[blocked],state:await store.load(context)},managedRemote:managed,remoteEnumeration:{status:"complete"},mode:"full",nextCursor:id<"ChangeCursor">("candidate")};
  const controller=new IntegratedProductController({vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:store,snapshotAssembler:{assembleFull:async()=>assembly} as never,executor:fakeExecutor() as never,conflictResolver:resolver,plannerForTrigger:trigger=>new DeterministicSynchronizationPlanner(resolver,undefined,{trigger}),leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,audit:new BoundedAuditHistory(new MemoryAuditPersistence(),50),holderId:"scope-partial",onFullReconciliationCompleted:async()=>{completed++;}});
  const plan=await controller.previewVerifyReconcile();assert.ok(plan);const result=await controller.request({kind:"execute-plan",planId:plan!.planId});assert.equal(result.status,"rejected");assert.equal(completed,0);
});

test("C5 only complete full run with candidate cursor signals scope-reconcile completion",async()=>{
  const store=await seededStore();let completed=0;const assembly:AssembledPlanningInput={input:{snapshots:[],state:await store.load(context)},managedRemote:managed,remoteEnumeration:{status:"complete"},mode:"full",nextCursor:id<"ChangeCursor">("scope-new")};
  const controller=new IntegratedProductController({vaultIdentity:vault,deviceIdentity:device,stateContext:context,stateStore:store,snapshotAssembler:{assembleFull:async()=>assembly} as never,executor:fakeExecutor() as never,conflictResolver:resolver,plannerForTrigger:trigger=>new DeterministicSynchronizationPlanner(resolver,undefined,{trigger}),leasePort:{tryAcquire:async()=>({release:async()=>undefined})} as never,audit:new BoundedAuditHistory(new MemoryAuditPersistence(),50),holderId:"scope-complete",onFullReconciliationCompleted:async()=>{completed++;}});
  const plan=await controller.previewVerifyReconcile();assert.ok(plan);assert.equal((await controller.request({kind:"execute-plan",planId:plan!.planId})).status,"accepted");assert.equal(completed,1);const loaded=await store.load(context);assert.equal(loaded.status,"trusted");if(loaded.status==="trusted")assert.equal(String(loaded.state.changeCursor),"scope-new");
});
