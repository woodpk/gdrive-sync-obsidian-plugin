/** BVP-only, nonshipping, browser-safe durable receiver error journal. */
import type { BvpDiagnostic } from "./diagnostic-types";
import { bvpDiagnostic, opaqueDiagnosticId } from "./diagnostic-contract";

interface Store { exists(path:string):Promise<boolean>; mkdir(path:string):Promise<void>; read(path:string):Promise<string>; write(path:string,text:string):Promise<void>; }
export interface DiagnosticOrigin { readonly runId:string|null; readonly deviceId:string|null; }
export interface RuntimeErrorRecord {
  readonly schemaVersion:1; readonly eventId:string; readonly firstAt:string; readonly lastAt:string;
  readonly occurrences:number; readonly diagnostic:BvpDiagnostic; readonly origin?:DiagnosticOrigin; readonly remoteFileId?:string;
}
interface Entry { schemaVersion:1; eventId:string; firstAt:string; lastAt:string; occurrences:number; diagnostic:BvpDiagnostic; deliveredCount:number; origin?:DiagnosticOrigin; remoteFileId?:string; }
interface Snapshot { schemaVersion:1; entries:Entry[]; outstanding:boolean; overflow:number; nextDeliveryAt?:number; }
const MAX_EVENTS=24;
const safeEvent=(id:string)=>/^[0-9a-f-]{36}$/.test(id);
const safeRoute=(s:unknown)=>typeof s==="string"&&/^[a-zA-Z0-9._:-]{1,128}$/.test(s);
const bound=(origin?:DiagnosticOrigin):DiagnosticOrigin=>({runId:origin?.runId??null,deviceId:origin?.deviceId??null});
const sameOrigin=(a?:DiagnosticOrigin,b?:DiagnosticOrigin)=>JSON.stringify(bound(a))===JSON.stringify(bound(b));
const isRecovery=(e:Entry)=>e.diagnostic.classification==="bvp-runtime-poll-recovered";
const localOnly=(e:Entry)=>e.diagnostic.component==="drive-mailbox"&&e.diagnostic.phase==="diagnostic-publication";
function hasUnrecovered(entries:Entry[]):boolean{const newest=new Map<string,boolean>();for(const e of entries){const key=JSON.stringify(bound(e.origin));newest.set(key,!isRecovery(e));}return [...newest.values()].some(Boolean);}
function valid(value:any):value is Snapshot {
  return value?.schemaVersion===1&&Array.isArray(value.entries)&&value.entries.length<=MAX_EVENTS&&
    typeof value.outstanding==="boolean"&&Number.isSafeInteger(value.overflow)&&value.overflow>=0&&
    (value.nextDeliveryAt===undefined||(Number.isSafeInteger(value.nextDeliveryAt)&&value.nextDeliveryAt>=0))&&
    value.entries.every((e:any)=>safeEvent(e?.eventId)&&e?.schemaVersion===1&&
      typeof e.firstAt==="string"&&typeof e.lastAt==="string"&&
      Number.isSafeInteger(e.occurrences)&&e.occurrences>0&&Number.isSafeInteger(e.deliveredCount)&&
      e.deliveredCount>=0&&e.deliveredCount<=e.occurrences&&
      (e.origin===undefined||(e.origin!==null&&(e.origin.runId===null||safeRoute(e.origin.runId))&&(e.origin.deviceId===null||safeRoute(e.origin.deviceId))))&&
      (e.remoteFileId===undefined||(typeof e.remoteFileId==="string"&&/^[a-zA-Z0-9_-]{2,128}$/.test(e.remoteFileId)))&&
      e.diagnostic?.schemaVersion===1&&typeof e.diagnostic.classification==="string"&&
      JSON.stringify(bvpDiagnostic(e.diagnostic))===JSON.stringify(e.diagnostic));
}
export class BvpJournalError extends Error {
  constructor(readonly code:"bvp-journal-persistence-failed"|"bvp-journal-corrupt"){super(code);this.name="BvpJournalError";}
}
export class BvpRuntimeErrorJournal {
  private queue:Promise<void>=Promise.resolve();
  private readonly path:string;
  constructor(private readonly store:Store,root:string){this.path=root+"/runtime-errors.json";}
  private serial<T>(action:()=>Promise<T>):Promise<T>{
    const next=this.queue.then(action,action);this.queue=next.then(()=>undefined,()=>undefined);return next;
  }
  private async load():Promise<Snapshot>{
    try{
      if(!await this.store.exists(this.path))return{schemaVersion:1,entries:[],outstanding:false,overflow:0};
      const raw=JSON.parse(await this.store.read(this.path));
      if(!valid(raw))throw new Error("invalid");
      for(const entry of raw.entries)if(entry.origin?.runId&&entry.diagnostic.identity.runId!==await opaqueDiagnosticId(entry.origin.runId,"run"))
        throw new Error("origin mismatch");
      return raw;
    }catch{throw new BvpJournalError("bvp-journal-corrupt");}
  }
  private async save(snapshot:Snapshot):Promise<void>{
    try{
      const parent=this.path.slice(0,this.path.lastIndexOf("/"));
      if(!await this.store.exists(parent))await this.store.mkdir(parent);
      await this.store.write(this.path,JSON.stringify(snapshot));
    }catch{throw new BvpJournalError("bvp-journal-persistence-failed");}
  }
  /** Coalesce only proven same-run failures; local route keys never enter remote diagnostic content. */
  record(diagnostic:BvpDiagnostic,origin?:DiagnosticOrigin):Promise<void>{return this.serial(async()=>{
    const route=bound(origin);if((route.runId&&!safeRoute(route.runId))||(route.deviceId&&!safeRoute(route.deviceId)))throw new BvpJournalError("bvp-journal-corrupt");
    const state=await this.load(),now=new Date().toISOString();
    const last=state.entries.at(-1);
    if(route.runId)diagnostic=bvpDiagnostic({...diagnostic,identity:{...diagnostic.identity,runId:await opaqueDiagnosticId(route.runId,"run")}});
    const same=last&&!last.remoteFileId&&last.deliveredCount===0&&route.deviceId!==null&&!isRecovery(last)&&sameOrigin(last.origin,route)&&JSON.stringify(last.diagnostic)===JSON.stringify(diagnostic);
    if(same){last.occurrences++;last.lastAt=now;}
    else{
      if(state.entries.length===MAX_EVENTS){
        const removable=state.entries.findIndex(e=>e.deliveredCount===e.occurrences);
        if(removable<0){state.overflow++;await this.save(state);throw new BvpJournalError("bvp-journal-persistence-failed");}
        state.entries.splice(removable,1);
      }
      state.entries.push({schemaVersion:1,eventId:crypto.randomUUID(),firstAt:now,lastAt:now,
        occurrences:1,deliveredCount:0,diagnostic,origin:route});
    }
    state.outstanding=true;await this.save(state);
  });}
  /** Emit one recovery boundary on the first healthy tick after an error. */
  recover(diagnostic:BvpDiagnostic,origin?:DiagnosticOrigin):Promise<void>{return this.serial(async()=>{
    const state=await this.load(),route=bound(origin);
    if(route.runId)diagnostic=bvpDiagnostic({...diagnostic,identity:{...diagnostic.identity,runId:await opaqueDiagnosticId(route.runId,"run")}});
    const latest=[...state.entries].reverse().find(e=>sameOrigin(e.origin,route)&&!localOnly(e));
    if(!latest||isRecovery(latest))return;
    const now=new Date().toISOString();
    if(state.entries.length===MAX_EVENTS){
      const removable=state.entries.findIndex(e=>e.deliveredCount===e.occurrences);
      if(removable<0)throw new BvpJournalError("bvp-journal-persistence-failed");
      state.entries.splice(removable,1);
    }
    state.entries.push({schemaVersion:1,eventId:crypto.randomUUID(),firstAt:now,lastAt:now,
      occurrences:1,deliveredCount:0,diagnostic,origin:route});
    state.outstanding=hasUnrecovered(state.entries);await this.save(state);
  });}
  /** On uncertain publication failure leave the event pending for safe idempotent replay. */
  flush(publish:(entry:RuntimeErrorRecord)=>Promise<void>,reserve?:()=>Promise<string>):Promise<number>{return this.serial(async()=>{
    const state=await this.load();let sent=0;
    for(const entry of state.entries){
      if(entry.deliveredCount===entry.occurrences||!entry.origin?.deviceId||localOnly(entry))continue;
      if(reserve&&!entry.remoteFileId){entry.remoteFileId=await reserve();await this.save(state);}
      await publish({schemaVersion:1,eventId:entry.eventId,firstAt:entry.firstAt,
        lastAt:entry.lastAt,occurrences:entry.occurrences,diagnostic:entry.diagnostic,origin:entry.origin,remoteFileId:entry.remoteFileId});
      entry.deliveredCount=entry.occurrences;await this.save(state);sent++;
    }
    return sent;
  });}
  /** Persist cooldown before any remote mutation; restart never resets bounded retry timing. */
  acquireDeliveryWindow():Promise<boolean>{return this.serial(async()=>{
    const state=await this.load(),now=Date.now();
    if(!state.entries.some(e=>e.origin?.deviceId&&!localOnly(e)&&e.deliveredCount<e.occurrences))return false;
    if((state.nextDeliveryAt??0)>now)return false;
    state.nextDeliveryAt=now+30_000;await this.save(state);return true;
  });}
  snapshot():Promise<Readonly<Snapshot>>{return this.serial(()=>this.load());}
}
