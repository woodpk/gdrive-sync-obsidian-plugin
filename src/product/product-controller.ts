import type {
  AuditRecord, CheckpointId, ConflictAssessment, ConflictId, ConflictProvenance, ConflictResolution, ConflictResolver,
  DeviceIdentity, OperationPrecondition, PathSnapshot, PlannedOperation, ProductControlPort, ProductSurfaceState,
  StateLoadContext, SynchronizationPlan, SynchronizationPlanner, SynchronizationStatus, UserAction, UserActionResult,
  VaultIdentity, VaultPath, VersionReference,
} from "../contracts";
import { contractId } from "../contracts";
import { StateCommitCoordinator } from "../core/commit-coordinator";
import { CrashSafeExecutionCoordinator } from "../core/execution-coordinator";
import { CoreRunCoordinator, type RunLeasePort } from "../core/run-coordinator";
import { semanticPlanId, withSemanticOperationId } from "../core/semantic-identifiers";
import { createInitialTrustedState, PersistentSynchronizationStateStore } from "../state/persistent-state-store";
import { BoundedAuditHistory } from "./audit-history";
import { ProductSnapshotAssembler, SnapshotAssemblyError, type AssembledPlanningInput } from "./snapshot-assembler";
import { ProductSynchronizationExecutor, type ExecutorRunEvidence } from "./production-executor";

export type PlannerFactory = (trigger: SynchronizationPlan["trigger"]) => SynchronizationPlanner;
export interface AutomaticExecutionDecision { readonly allowed: boolean; readonly reason?: string; }
export interface ProductControllerOptions {
  readonly vaultIdentity: VaultIdentity;
  readonly deviceIdentity: DeviceIdentity;
  readonly stateContext: StateLoadContext;
  readonly stateStore: PersistentSynchronizationStateStore;
  readonly snapshotAssembler: ProductSnapshotAssembler;
  readonly executor: ProductSynchronizationExecutor;
  readonly conflictResolver: ConflictResolver;
  readonly plannerForTrigger: PlannerFactory;
  readonly leasePort: RunLeasePort;
  readonly audit: BoundedAuditHistory;
  readonly holderId: string;
  readonly automaticExecutionAllowed?: (plan: SynchronizationPlan) => AutomaticExecutionDecision;
  readonly onTrustedBaselineEstablished?: () => Promise<void>;
  readonly recoveryActive?: () => boolean;
  readonly onRecoveryGateChanged?: (active: boolean, backupId?: string) => Promise<void>;
}
interface PlannedRun { readonly plan: SynchronizationPlan; readonly assembly: AssembledPlanningInput; readonly checkpointId?: CheckpointId; readonly reviewed: boolean; }
type RunOutcome = "complete" | "partial" | "failed";

const cid = <T extends string>(value: string) => contractId<T>(value);
const auditId = () => globalThis.crypto?.randomUUID?.() ?? `audit-${Date.now()}-${Math.random()}`;
function observedVersion(snapshot: PathSnapshot, side: "local" | "remote"): VersionReference | undefined {
  const v = snapshot[side]; return v.status === "present" ? { path: v.path, entityKind: v.entityKind, content: v.content, remoteObjectId: v.remoteObjectId, observationToken: v.observationToken } : undefined;
}
function baseVersion(snapshot: PathSnapshot): VersionReference | undefined {
  const v = snapshot.base.status === "trusted" ? snapshot.base.entry : undefined; return v ? { path: v.path, entityKind: v.entityKind, content: v.content, remoteObjectId: v.remoteObjectId } : undefined;
}
function assessmentKey(a: ConflictAssessment): ConflictId | undefined { if (a.kind === "none") return undefined; return a.kind === "clean-merge" ? cid<"ConflictId">(`conflict:clean:${String(a.path)}`) as ConflictId : a.conflictId; }
function localExact(version: VersionReference): OperationPrecondition[] {
  const p: OperationPrecondition[] = [{ kind: "path-observation", side: "local", path: version.path, expected: "present", ...(version.observationToken ? { observationToken: String(version.observationToken) } : {}) }];
  if (version.content) p.push({ kind: "content-evidence", side: "local", path: version.path, expected: version.content }); return p;
}
function remoteExact(version: VersionReference): OperationPrecondition[] {
  const p: OperationPrecondition[] = []; if (version.remoteObjectId) p.push({ kind: "remote-object", remoteObjectId: version.remoteObjectId, ...(version.content?.revision ? { expectedRevision: version.content.revision } : {}) });
  if (version.content) p.push({ kind: "content-evidence", side: "remote", path: version.path, expected: version.content }); return p;
}
function safeToken(value: string | undefined): string { return (value ?? "na").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 32); }
function provenanceCopyBase(path: VaultPath, provenance: ConflictProvenance): VaultPath {
  const raw=String(path), slash=raw.lastIndexOf("/"), dir=slash>=0?raw.slice(0,slash+1):"", name=slash>=0?raw.slice(slash+1):raw, dot=name.lastIndexOf("."), stem=dot>0?name.slice(0,dot):name, ext=dot>0?name.slice(dot):"";
  const identity=provenance.deviceId?`device-${safeToken(String(provenance.deviceId))}`:provenance.remoteObjectId?`remote-${safeToken(String(provenance.remoteObjectId))}`:"identity-na";
  const version=provenance.version.content?.hash?String(provenance.version.content.hash):provenance.version.content?.revision?`revision-${provenance.version.content.revision}`:"version-na";
  const at=provenance.advisoryObservedAtMs??provenance.version.content?.advisoryModifiedTimeMs;
  return cid<"VaultPath">(`${dir}${stem} (conflict ${provenance.source} ${identity} at-${at??"na"} ${safeToken(version)})${ext}`) as VaultPath;
}
function numbered(path: VaultPath, n: number): VaultPath { if(n===1)return path; const raw=String(path), dot=raw.lastIndexOf("."); return cid<"VaultPath">(`${dot>raw.lastIndexOf("/")?raw.slice(0,dot):raw} (${n})${dot>raw.lastIndexOf("/")?raw.slice(dot):""}`) as VaultPath; }

export class IntegratedProductController implements ProductControlPort {
  private surface: ProductSurfaceState={status:{kind:"idle-ready"},conflicts:[]}; private readonly listeners=new Set<(surface:ProductSurfaceState)=>void>();
  private readonly runs:CoreRunCoordinator; private readonly conflictRegistry=new Map<string,ConflictAssessment>(); private planned?:PlannedRun; private runEvidence?:ExecutorRunEvidence;
  constructor(private readonly options:ProductControllerOptions){this.runs=new CoreRunCoordinator(options.vaultIdentity,options.deviceIdentity,options.leasePort,options.holderId);}
  currentSurface():ProductSurfaceState{return this.surface;} onSurface(listener:(surface:ProductSurfaceState)=>void):()=>void{this.listeners.add(listener);return()=>this.listeners.delete(listener);}
  readAuditHistory():Promise<readonly AuditRecord[]>{return this.options.audit.read();} currentRunEvidence():ExecutorRunEvidence{if(!this.runEvidence)throw new Error("no active synchronization run evidence");return this.runEvidence;}
  pendingDestructiveCheckpoint():CheckpointId|undefined{return this.planned?.checkpointId;} async previewManual(){return this.createPlan("manual",true,true);} async previewVerifyReconcile(){return this.createPlan("verify-reconcile",true,true);} noteChangeDuringRun():void{this.runs.noteLocalOrRemoteChangeDuringRun();}

  async runAutomatic(trigger:"startup-resume"|"local-change"|"periodic"):Promise<void>{
    if(this.options.recoveryActive?.()){this.setStatus({kind:"recovery-required",reason:"recovery reconstruction is incomplete"});return;}
    const plan=await this.createPlan(trigger,false,false);if(!plan||plan.executionDisposition!=="safe-auto-eligible")return;const gate=this.options.automaticExecutionAllowed?.(plan)??{allowed:true};if(!gate.allowed){this.setStatus({kind:"offline-deferred",reason:gate.reason??"automatic synchronization deferred by device policy"});return;}await this.executePlanned(false);
  }
  async request(action:UserAction):Promise<UserActionResult>{switch(action.kind){
    case"pause":this.runs.pause();this.setStatus({kind:"paused"});return{status:"accepted"}; case"resume":this.runs.resume();this.setStatus(this.options.recoveryActive?.()?{kind:"recovery-required",reason:"recovery reconstruction is incomplete"}:{kind:"idle-ready"});return{status:"accepted"};
    case"cancel-active-sync":this.runs.requestCancellation();await this.audit("sync-cancelled");return{status:"accepted"}; case"verify-reconcile-vault":await this.previewVerifyReconcile();return{status:"accepted"};
    case"execute-plan":if(!this.planned||this.planned.plan.planId!==action.planId)return{status:"rejected",reason:"plan is stale or no longer current"};if(!this.planned.reviewed)return{status:"rejected",reason:"manual plan has not been reviewed"};if(this.planned.plan.recoveryCheckpointRequired)return{status:"rejected",reason:"destructive plan requires exact checkpoint approval"};return(await this.executePlanned(true))!=="failed"?{status:"accepted"}:{status:"rejected",reason:"reviewed plan failed before safe progress could complete"};
    case"approve-destructive-plan":if(!this.planned||this.planned.plan.planId!==action.planId)return{status:"rejected",reason:"destructive plan is stale"};if(!this.planned.checkpointId||this.planned.checkpointId!==action.recoveryCheckpointId)return{status:"rejected",reason:"approval is not tied to the current recovery checkpoint"};await this.audit("destructive-plan-approved",{planId:action.planId});return(await this.executePlanned(true,action.recoveryCheckpointId))!=="failed"?{status:"accepted"}:{status:"rejected",reason:"approved destructive plan failed"};
    case"resolve-conflict":return this.resolveConflict(action.conflictId,action.resolution);
  }}
  async resolveWithCurrentLocal(id:ConflictId):Promise<UserActionResult>{const assessment=this.conflictRegistry.get(String(id));if(!assessment||assessment.kind==="none")return{status:"rejected",reason:"conflict is stale or unavailable"};const version=await this.options.executor.currentLocalVersion(assessment.path);if(!version||version.entityKind!=="file")return{status:"rejected",reason:"a stable current local file is required for manual resolution"};return this.resolveConflict(id,{kind:"manual",resolvedVersion:version});}

  private async createPlan(trigger:SynchronizationPlan["trigger"],full:boolean,reviewed:boolean):Promise<SynchronizationPlan|undefined>{
    if(this.runs.isPaused()){this.setStatus({kind:"paused"});return undefined;}this.setStatus({kind:"planning",trigger});
    try{
      let assembly:AssembledPlanningInput;
      if(this.options.recoveryActive?.()) assembly=await this.options.snapshotAssembler.assembleRecovery("persisted recovery gate");
      else { assembly=full?await this.options.snapshotAssembler.assembleFull():await this.options.snapshotAssembler.assemble(true); if(assembly.input.state.status==="recovery-required"){await this.options.onRecoveryGateChanged?.(true);await this.audit("recovery-entered",{reasonCode:assembly.input.state.reason});assembly=await this.options.snapshotAssembler.assembleRecovery(assembly.input.state.detail??assembly.input.state.reason);} }
      const plan=await this.options.plannerForTrigger(trigger).plan(assembly.input);await this.refreshConflicts(plan,assembly);let checkpointId:CheckpointId|undefined;
      if(plan.recoveryCheckpointRequired&&!assembly.reconstruction){const backup=await this.options.stateStore.createRecoveryBackup();checkpointId=cid<"CheckpointId">(backup.backupId) as CheckpointId;}
      this.planned={plan,assembly,checkpointId,reviewed};await this.audit("plan-created",{planId:plan.planId,count:plan.operations.length});this.surface={...this.surface,planPreview:plan,conflicts:[...this.conflictRegistry.values()].filter(a=>a.kind!=="clean-merge")};
      const pathBlocked=plan.operations.filter(o=>o.kind==="blocked-unsafe"); if(assembly.reconstruction)this.setStatus({kind:"recovery-required",reason:"review and execute this non-destructive reconstruction before recovery can complete"});else if(plan.operations.some(o=>o.kind==="recovery-required"))this.setStatus({kind:"recovery-required",reason:"synchronization state or remote relationship requires recovery"});else if(this.surface.conflicts.length)this.setStatus({kind:"conflict-present",conflictCount:this.surface.conflicts.length});else if(plan.recoveryCheckpointRequired)this.setStatus({kind:"destructive-plan-blocked",planId:plan.planId});else if(pathBlocked.length)this.setStatus({kind:"error",code:"path-blocked",message:`${pathBlocked.length} path(s) require attention; unrelated reviewed safe work may proceed.`});else this.setStatus({kind:"idle-ready"});return plan;
    }catch(error){this.mapPlanningError(error);return undefined;}
  }
  private async refreshConflicts(plan:SynchronizationPlan,assembly:AssembledPlanningInput):Promise<void>{const fresh=new Map<string,ConflictAssessment>();for(const operation of plan.operations){if(operation.kind!=="unresolved-conflict"&&operation.kind!=="clean-text-merge")continue;const snapshot=assembly.input.snapshots.find(s=>s.path===operation.path);if(!snapshot)continue;const a=await this.options.conflictResolver.assess(snapshot.path,baseVersion(snapshot),observedVersion(snapshot,"local"),observedVersion(snapshot,"remote"));const key=assessmentKey(a);if(key)fresh.set(String(key),a);if(a.kind!=="none"&&a.kind!=="clean-merge")await this.audit("conflict-created",{path:a.path,reasonCode:a.kind});}this.conflictRegistry.clear();for(const[key,value]of fresh)this.conflictRegistry.set(key,value);}

  private async executePlanned(userInitiated:boolean,approvedCheckpoint?:CheckpointId):Promise<RunOutcome>{
    const planned=this.planned;if(!planned)return"failed";if(!userInitiated&&planned.plan.executionDisposition!=="safe-auto-eligible")return"failed";if(planned.plan.executionDisposition==="blocked")return"failed";if(planned.plan.recoveryCheckpointRequired&&approvedCheckpoint!==planned.checkpointId)return"failed";
    const begun=await this.runs.beginRun();if(begun.status!=="started"){if(begun.status==="paused")this.setStatus({kind:"paused"});return"failed";}this.setStatus({kind:"syncing",planId:planned.plan.planId});let outcome:RunOutcome="failed";let anyCommitted=false;let partial=false;
    try{
      await this.ensureTrustedState(planned.assembly);this.runEvidence={managedRemote:planned.assembly.managedRemote,remoteEnumerationComplete:planned.assembly.remoteEnumeration.status==="complete"};const coordinator=new CrashSafeExecutionCoordinator(this.options.executor,new StateCommitCoordinator(this.options.stateStore,this.options.stateContext));let needsReplan=false,globalFailure=false;
      for(const operation of planned.plan.operations){if(!this.runs.canStartNextOperation()){partial=true;break;}if(["unresolved-conflict","blocked-unsafe"].includes(operation.kind)){partial=true;continue;}if(operation.kind==="recovery-required"){globalFailure=true;break;}if(operation.destructive&&planned.plan.recoveryCheckpointRequired&&!approvedCheckpoint){partial=true;continue;}
        const result=await coordinator.executeOperation(operation);if(result.status==="committed"){anyCommitted=true;await this.audit(operation.kind.startsWith("trash-")?"trash-action":"operation-completed",{planId:planned.plan.planId,operationId:operation.operationId,path:operation.path});continue;}
        await this.audit("operation-failed",{planId:planned.plan.planId,operationId:operation.operationId,path:operation.path,reasonCode:result.status});
        if(result.status==="blocked"&&this.options.executor.failureScope(operation,result.reason)==="path"){partial=true;continue;}
        if(result.status==="stale-precondition"||result.status==="stale-state"){needsReplan=true;this.runs.noteLocalOrRemoteChangeDuringRun();globalFailure=true;break;}
        if(result.status==="recovery-required"||result.status==="uncertain"){this.setStatus({kind:"recovery-required",reason:result.reason});globalFailure=true;break;}if(result.status==="retryable-failure"){this.setStatus({kind:"offline-deferred",reason:result.reason});globalFailure=true;break;}if(result.status==="blocked"){this.setStatus({kind:"error",code:"operation-blocked",message:result.reason});globalFailure=true;break;}partial=true;break;
      }
      if(!globalFailure&&!needsReplan&&!partial){const cursorCommitted=planned.assembly.nextCursor?await this.commitCursor(planned.assembly.nextCursor):true;if(cursorCommitted){const trusted=await this.options.stateStore.load(this.options.stateContext);if(trusted.status==="trusted"){outcome="complete";if(planned.assembly.reconstruction){await this.options.onRecoveryGateChanged?.(false);await this.audit("recovery-completed");}if(planned.reviewed)await this.options.onTrustedBaselineEstablished?.();}}}
      else if(!globalFailure&&(partial||anyCommitted)){outcome="partial";const conflicts=this.surface.conflicts.length,blocked=planned.plan.operations.filter(o=>o.kind==="blocked-unsafe").length;if(planned.assembly.reconstruction)this.setStatus({kind:"recovery-required",reason:"reconstruction remains incomplete; destructive authority remains disabled"});else if(conflicts)this.setStatus({kind:"conflict-present",conflictCount:conflicts});else this.setStatus({kind:"error",code:"path-blocked",message:`Synchronization made safe partial progress; ${blocked||1} path(s) remain blocked and the Drive cursor was not advanced.`});}
    }finally{this.runEvidence=undefined;const finished=await this.runs.finishRun();if(finished.reconcileAgain&&!this.options.recoveryActive?.())void this.runAutomatic("local-change");else if(this.surface.status.kind==="syncing")this.setStatus({kind:"idle-ready"});}return outcome;
  }

  private async resolveConflict(id:ConflictId,resolution:ConflictResolution):Promise<UserActionResult>{const assessment=this.conflictRegistry.get(String(id)),current=this.planned;if(!assessment||!current)return{status:"rejected",reason:"conflict is stale or no longer present in the current plan"};if(!await this.assessmentStillCurrent(assessment,current.assembly)){await this.createPlan("manual",true,true);return{status:"rejected",reason:"conflict evidence changed; a fresh plan is required before resolution"};}const operations=await this.resolutionOperations(id,assessment,resolution);if(!operations.length)return{status:"rejected",reason:"requested conflict resolution is not applicable to the current preserved versions"};const executionDisposition="requires-user-approval" as const,recoveryCheckpointRequired=false;const resolutionPlan:SynchronizationPlan={planId:semanticPlanId({trigger:"manual",operations,executionDisposition,recoveryCheckpointRequired}),trigger:"manual",operations,executionDisposition,recoveryCheckpointRequired};this.planned={plan:resolutionPlan,assembly:{...current.assembly,nextCursor:undefined},reviewed:false};if((await this.executePlanned(true))!=="complete")return{status:"rejected",reason:"conflict resolution did not complete authoritatively"};this.conflictRegistry.delete(String(id));this.surface={...this.surface,conflicts:[...this.conflictRegistry.values()].filter(a=>a.kind!=="clean-merge")};await this.audit("conflict-resolved",{path:assessment.path,reasonCode:resolution.kind});this.setStatus(this.surface.conflicts.length?{kind:"conflict-present",conflictCount:this.surface.conflicts.length}:{kind:"idle-ready"});return{status:"accepted"};}
  private async assessmentStillCurrent(a:ConflictAssessment,assembly:AssembledPlanningInput):Promise<boolean>{if(a.kind==="none")return false;if(a.kind==="clean-merge")return await this.options.executor.versionStillCurrent("local",a.provenance.local.version,assembly.managedRemote)&&await this.options.executor.versionStillCurrent("remote",a.provenance.remote.version,assembly.managedRemote);if(a.kind==="delete-vs-modify")return this.options.executor.versionStillCurrent(a.modifiedSide,a.modifiedVersion.version,assembly.managedRemote);return await this.options.executor.versionStillCurrent("local",a.preserved.local.version,assembly.managedRemote)&&await this.options.executor.versionStillCurrent("remote",a.preserved.remote.version,assembly.managedRemote);}
  private op(index:number,intent:Omit<PlannedOperation,"operationId">):PlannedOperation{return withSemanticOperationId(intent,index);}
  private async freeConflictPath(path:VaultPath,provenance:ConflictProvenance):Promise<VaultPath>{const base=provenanceCopyBase(path,provenance);for(let n=1;n<=999;n+=1){const candidate=numbered(base,n);if(!await this.options.executor.currentLocalVersion(candidate))return candidate;}throw new Error("unable to allocate a collision-free conflict-copy path");}
  private async resolutionOperations(id:ConflictId,a:ConflictAssessment,r:ConflictResolution):Promise<readonly PlannedOperation[]>{
    if(a.kind==="none")return[];const path=a.path;
    if(a.kind==="clean-merge"){if(r.kind!=="accept-clean-merge")return[];const remote=a.provenance.remote.version;return[this.op(0,{kind:"clean-text-merge",path,remoteObjectId:remote.remoteObjectId,contentVersion:a.mergedVersion,destructive:false,preconditions:[{kind:"base-trusted"},{kind:"identity-unambiguous",path},...localExact(a.provenance.local.version),...remoteExact(remote)],reasons:[{code:"user-accept-clean-merge",summary:"User accepted the exact materialized clean merge."}]})];}
    if(a.kind==="delete-vs-modify"){const modified=a.modifiedVersion.version;if(a.modifiedSide==="local"&&(r.kind==="keep-local"||r.kind==="keep-both"||r.kind==="manual")){const chosen=r.kind==="manual"?r.resolvedVersion:modified;return[this.op(0,{kind:"upload-create",path,targetSide:"remote",contentVersion:chosen,destructive:false,preconditions:[{kind:"path-observation",side:"remote",path,expected:"absent"},...localExact(chosen),{kind:"file-stable",path:chosen.path}],reasons:[{code:"user-preserve-modified",summary:"Preserve the exact local modified version over the deletion."}]})];}if(a.modifiedSide==="remote"&&(r.kind==="keep-remote"||r.kind==="keep-both"))return[this.op(0,{kind:"download-create",path,targetSide:"local",contentVersion:modified,remoteObjectId:modified.remoteObjectId,destructive:false,preconditions:[{kind:"path-observation",side:"local",path,expected:"absent"},...remoteExact(modified)],reasons:[{code:"user-preserve-modified",summary:"Preserve the exact remote modified version over the deletion."}]})];if(a.modifiedSide==="local"&&r.kind==="keep-remote")return[this.op(0,{kind:"trash-local",path,targetSide:"local",destructive:true,preconditions:[{kind:"base-trusted"},...localExact(modified)],reasons:[{code:"user-keep-deletion",summary:"User chose the remote deletion after exact-version revalidation."}]})];if(a.modifiedSide==="remote"&&r.kind==="keep-local")return[this.op(0,{kind:"trash-remote",path,targetSide:"remote",remoteObjectId:modified.remoteObjectId,destructive:true,preconditions:[{kind:"base-trusted"},...remoteExact(modified)],reasons:[{code:"user-keep-deletion",summary:"User chose the local deletion after exact-version revalidation."}]})];return[];}
    const local=a.preserved.local.version,remote=a.preserved.remote.version,remoteId=remote.remoteObjectId;if(!remoteId)return[];
    const keepLocal=this.op(1,{kind:"upload-update",path,targetSide:"remote",remoteObjectId:remoteId,contentVersion:local,destructive:false,preconditions:[{kind:"base-trusted"},{kind:"identity-unambiguous",path},...localExact(local),...remoteExact(remote),{kind:"file-stable",path:local.path}],reasons:[{code:"user-keep-local",summary:"User selected the exact preserved local version."}]});
    if(r.kind==="keep-local")return[keepLocal];if(r.kind==="keep-remote")return[this.op(0,{kind:"download-update",path,targetSide:"local",remoteObjectId:remoteId,contentVersion:remote,destructive:false,preconditions:[{kind:"base-trusted"},{kind:"identity-unambiguous",path},...localExact(local),...remoteExact(remote)],reasons:[{code:"user-keep-remote",summary:"User selected the exact preserved remote version."}]})];
    if(r.kind==="keep-both"){const copy=await this.freeConflictPath(path,a.preserved.remote);return[this.op(0,{kind:"download-create",path:copy,targetSide:"local",remoteObjectId:remoteId,contentVersion:remote,destructive:false,preconditions:[{kind:"path-observation",side:"local",path:copy,expected:"absent"},...remoteExact(remote)],reasons:[{code:"user-keep-both-copy",summary:"Preserve the attributable remote alternate without overwriting an existing conflict copy."}]}),keepLocal];}
    if(r.kind==="manual"){if(!await this.options.executor.versionStillCurrent("local",r.resolvedVersion,this.planned!.assembly.managedRemote))return[];return[this.op(0,{kind:"upload-update",path,targetSide:"remote",remoteObjectId:remoteId,contentVersion:r.resolvedVersion,destructive:false,preconditions:[{kind:"base-trusted"},{kind:"identity-unambiguous",path},...localExact(r.resolvedVersion),...remoteExact(remote),{kind:"file-stable",path:r.resolvedVersion.path}],reasons:[{code:"user-manual-resolution",summary:"Use the exact current local file as manual resolution."}]})];}return[];
  }

  private async ensureTrustedState(assembly:AssembledPlanningInput):Promise<void>{
    if(assembly.reconstruction){const loaded=await this.options.stateStore.load(this.options.stateContext);if(loaded.status==="trusted")return;if(loaded.status!=="recovery-required")throw new Error("recovery replacement requires an objectively recovery-required source");const initial=createInitialTrustedState({stateRevision:cid<"StateRevision">("state:recovery:0"),vaultIdentity:this.options.vaultIdentity,deviceIdentity:this.options.deviceIdentity});const replaced=await this.options.stateStore.replaceRecoveryState(initial,this.options.stateContext);if(replaced.status!=="replaced")throw new Error(`recovery state replacement refused: ${replaced.reason}`);await this.options.onRecoveryGateChanged?.(true,replaced.backup.backupId);await this.audit("recovery-entered",{reasonCode:assembly.recoveryReason??loaded.reason});return;}
    if(assembly.input.state.status==="trusted")return;if(assembly.input.state.status==="recovery-required")throw new Error("cannot initialize trusted state from recovery-required state");const initial=createInitialTrustedState({stateRevision:cid<"StateRevision">("state:0"),vaultIdentity:this.options.vaultIdentity,deviceIdentity:this.options.deviceIdentity});const saved=await this.options.stateStore.saveTrusted(initial);if(saved.status!=="saved")throw new Error(`unable to establish initial trusted state: ${saved.status}`);
  }
  private async commitCursor(cursor:AssembledPlanningInput["nextCursor"]):Promise<boolean>{if(!cursor)return true;const loaded=await this.options.stateStore.load(this.options.stateContext);if(loaded.status!=="trusted")return false;const current=String(loaded.state.stateRevision),match=/^(.*?)(\d+)$/.exec(current),next=cid<"StateRevision">(match?`${match[1]}${Number(match[2])+1}`:`${current}:1`);const saved=await this.options.stateStore.saveTrusted({...loaded.state,stateRevision:next,changeCursor:cursor},loaded.state.stateRevision);if(saved.status!=="saved"){this.setStatus({kind:"recovery-required",reason:"incremental Drive cursor could not be committed atomically"});return false;}return true;}
  private mapPlanningError(error:unknown):void{if(error instanceof SnapshotAssemblyError){if(error.code==="authentication-required")this.setStatus({kind:"authentication-required",reason:error.message});else if(error.code==="transient-failure"||error.code==="rate-limited")this.setStatus({kind:"offline-deferred",reason:error.message});else if(["missing-root","identity-mismatch","incompatible-protocol","ambiguous","recovery-required","not-found"].includes(error.code))this.setStatus({kind:"recovery-required",reason:error.message});else this.setStatus({kind:"error",code:error.code,message:error.message});return;}this.setStatus({kind:"error",code:"planning-failed",message:error instanceof Error?error.message:String(error)});}
  private setStatus(status:SynchronizationStatus):void{this.surface={...this.surface,status};for(const listener of this.listeners)listener(this.surface);}private async audit(event:AuditRecord["event"],values:Partial<Omit<AuditRecord,"id"|"event"|"advisoryAtMs">>={}):Promise<void>{await this.options.audit.append({id:auditId(),event,advisoryAtMs:Date.now(),...values});}
}
