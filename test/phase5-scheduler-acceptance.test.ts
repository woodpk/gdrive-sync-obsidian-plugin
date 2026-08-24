import assert from "node:assert/strict";
import test from "node:test";
import type { LocalLifecycleEvent, LocalVaultChange, Unsubscribe } from "../src/contracts";
import { ProductSyncScheduler } from "../src/product/scheduler";

interface Harness {
  scheduler: ProductSyncScheduler;
  emitChange(change: LocalVaultChange): void;
  emitLifecycle(event: LocalLifecycleEvent): void;
  calls: string[];
  requests: string[];
}
function harness(settings:()=>{startupResumeEnabled:boolean;localChangeEnabled:boolean;periodicEnabled:boolean;periodicIntervalMs:number;localDebounceMs:number}):Harness{
  let changeListener:(change:LocalVaultChange)=>void=()=>undefined;
  let lifecycleListener:(event:LocalLifecycleEvent)=>void=()=>undefined;
  const local={onChange(listener:(change:LocalVaultChange)=>void):Unsubscribe{changeListener=listener;return()=>undefined;},onLifecycle(listener:(event:LocalLifecycleEvent)=>void):Unsubscribe{lifecycleListener=listener;return()=>undefined;}} as never;
  const calls:string[]=[],requests:string[]=[];
  const controller={runAutomatic:async(trigger:string)=>{calls.push(trigger);},request:async(action:{kind:string})=>{requests.push(action.kind);return{status:"accepted" as const};},noteChangeDuringRun:()=>undefined} as never;
  return{scheduler:new ProductSyncScheduler(local,controller,settings),emitChange:change=>changeListener(change),emitLifecycle:event=>lifecycleListener(event),calls,requests};
}

test("Phase5 scenario 31 local-change debounce coalesces repeated events into one automatic pass",async()=>{
  const originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
  const callbacks=new Map<number,()=>void>();let next=1;
  globalThis.setTimeout=((callback:()=>void)=>{const id=next++;callbacks.set(id,callback);return id as never;}) as typeof setTimeout;
  globalThis.clearTimeout=((id:ReturnType<typeof setTimeout>)=>{callbacks.delete(Number(id));}) as typeof clearTimeout;
  try{
    const h=harness(()=>({startupResumeEnabled:false,localChangeEnabled:true,periodicEnabled:false,periodicIntervalMs:60000,localDebounceMs:1000}));h.scheduler.start();
    h.emitChange({kind:"modified",path:"a.md" as never});h.emitChange({kind:"modified",path:"a.md" as never});
    assert.equal(callbacks.size,1);const callback=[...callbacks.values()][0];callback();await Promise.resolve();assert.deepEqual(h.calls,["local-change"]);h.scheduler.stop();
  }finally{globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout;}
});

test("Phase5 scenario 33 refresh replaces periodic timer with live cadence",()=>{
  const originalSetInterval=globalThis.setInterval,originalClearInterval=globalThis.clearInterval;
  const created:Array<{id:number;delay:number}>=[],cleared:number[]=[];let next=1;
  globalThis.setInterval=((_callback:()=>void,delay?:number)=>{const id=next++;created.push({id,delay:Number(delay)});return id as never;}) as typeof setInterval;
  globalThis.clearInterval=((id:ReturnType<typeof setInterval>)=>{cleared.push(Number(id));}) as typeof clearInterval;
  try{
    let interval=60000;const h=harness(()=>({startupResumeEnabled:false,localChangeEnabled:false,periodicEnabled:true,periodicIntervalMs:interval,localDebounceMs:1000}));h.scheduler.start();assert.equal(created.at(-1)?.delay,60000);
    interval=180000;h.scheduler.refresh();assert.equal(cleared.includes(created[0].id),true);assert.equal(created.at(-1)?.delay,180000);h.scheduler.stop();
  }finally{globalThis.setInterval=originalSetInterval;globalThis.clearInterval=originalClearInterval;}
});

test("Phase5 scenario 32 startup/resume dispatches through automatic controller path",async()=>{
  const h=harness(()=>({startupResumeEnabled:true,localChangeEnabled:false,periodicEnabled:false,periodicIntervalMs:60000,localDebounceMs:1000}));h.scheduler.start();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(h.calls.includes("startup-resume"),true);h.emitLifecycle({kind:"resume"});await Promise.resolve();assert.equal(h.calls.filter(call=>call==="startup-resume").length>=2,true);h.scheduler.stop();
});

test("Phase5 scenario 50 unload requests cancellation and scheduler teardown is non-mutating",async()=>{
  const h=harness(()=>({startupResumeEnabled:false,localChangeEnabled:false,periodicEnabled:false,periodicIntervalMs:60000,localDebounceMs:1000}));h.scheduler.start();h.emitLifecycle({kind:"unload"});await Promise.resolve();assert.deepEqual(h.requests,["cancel-active-sync"]);assert.deepEqual(h.calls,[]);h.scheduler.stop();
});
