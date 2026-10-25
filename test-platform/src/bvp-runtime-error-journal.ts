/** BVP-only, nonshipping, browser-safe durable receiver error journal. */
import type { BvpDiagnostic } from "./diagnostic-types";

interface Store { exists(path:string):Promise<boolean>; mkdir(path:string):Promise<void>; read(path:string):Promise<string>; write(path:string,text:string):Promise<void>; }
export interface RuntimeErrorRecord {
  readonly schemaVersion:1; readonly eventId:string; readonly firstAt:string; readonly lastAt:string;
  readonly occurrences:number; readonly diagnostic:BvpDiagnostic;
}
interface Entry extends RuntimeErrorRecord { deliveredCount:number; }
interface Snapshot { schemaVersion:1; entries:Entry[]; outstanding:boolean; overflow:number; }
const MAX_EVENTS=24;
const safeEvent=(id:string)=>/^[0-9a-f-]{36}$/.test(id);
function valid(value:any):value is Snapshot {
  return value?.schemaVersion===1&&Array.isArray(value.entries)&&value.entries.length<=MAX_EVENTS&&
    typeof value.outstanding==="boolean"&&Number.isSafeInteger(value.overflow)&&value.overflow>=0&&
    value.entries.every((e:any)=>safeEvent(e?.eventId)&&e?.schemaVersion===1&&
      typeof e.firstAt==="string"&&typeof e.lastAt==="string"&&
      Number.isSafeInteger(e.occurrences)&&e.occurrences>0&&Number.isSafeInteger(e.deliveredCount)&&
      e.deliveredCount>=0&&e.deliveredCount<=e.occurrences&&
      e.diagnostic?.schemaVersion===1&&typeof e.diagnostic.classification==="string");
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
  /** Collapse identical repeated failures; never persist exception bodies or raw identities. */
  record(diagnostic:BvpDiagnostic):Promise<void>{return this.serial(async()=>{
    const state=await this.load(),now=new Date().toISOString();
    const last=state.entries.at(-1);
    const same=last&&state.outstanding&&JSON.stringify(last.diagnostic)===JSON.stringify(diagnostic);
    if(same){last.occurrences++;last.lastAt=now;}
    else{
      if(state.entries.length===MAX_EVENTS){
        const removable=state.entries.findIndex(e=>e.deliveredCount===e.occurrences);
        if(removable<0){state.overflow++;throw new BvpJournalError("bvp-journal-persistence-failed");}
        state.entries.splice(removable,1);
      }
      state.entries.push({schemaVersion:1,eventId:crypto.randomUUID(),firstAt:now,lastAt:now,
        occurrences:1,deliveredCount:0,diagnostic});
    }
    state.outstanding=true;await this.save(state);
  });}
  /** Emit one recovery boundary on the first healthy tick after an error. */
  recover(diagnostic:BvpDiagnostic):Promise<void>{return this.serial(async()=>{
    const state=await this.load();
    if(!state.outstanding)return;
    const now=new Date().toISOString();
    if(state.entries.length===MAX_EVENTS){
      const removable=state.entries.findIndex(e=>e.deliveredCount===e.occurrences);
      if(removable<0)throw new BvpJournalError("bvp-journal-persistence-failed");
      state.entries.splice(removable,1);
    }
    state.entries.push({schemaVersion:1,eventId:crypto.randomUUID(),firstAt:now,lastAt:now,
      occurrences:1,deliveredCount:0,diagnostic});
    state.outstanding=false;await this.save(state);
  });}
  /** On uncertain publication failure leave the event pending for safe idempotent replay. */
  flush(publish:(entry:RuntimeErrorRecord)=>Promise<void>):Promise<number>{return this.serial(async()=>{
    const state=await this.load();let sent=0;
    for(const entry of state.entries){
      if(entry.deliveredCount===entry.occurrences)continue;
      await publish({schemaVersion:1,eventId:entry.eventId,firstAt:entry.firstAt,
        lastAt:entry.lastAt,occurrences:entry.occurrences,diagnostic:entry.diagnostic});
      entry.deliveredCount=entry.occurrences;await this.save(state);sent++;
    }
    return sent;
  });}
  snapshot():Promise<Readonly<Snapshot>>{return this.serial(()=>this.load());}
}
