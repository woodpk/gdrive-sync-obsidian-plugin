import { strictEqual, rejects, match, ok } from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets } from "../src/windows-controller-auth";
import { runWindowsControllerCycle } from "../src/run-windows-diagnostic-controller";

const TOKEN_KEY="brain-gdrive-oauth-tokens";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const never:typeof fetch=async()=>new Promise<Response>(()=>{});
const protectedPath=()=>join(process.env.LOCALAPPDATA!,"BRAIN-BVP","controller","bvp-test-"+randomUUID()+".dat");
async function fixture(refresh:boolean){
  const dir=await mkdtemp(join(tmpdir(),"bvp-bounded-cycle-")),root=join(dir,".bvp-relay"),deviceId="device-a";
  const tokenFile=protectedPath(),leaseDir=join(root,"controller-authority");
  await mkdir(leaseDir,{recursive:true});
  await writeFile(join(leaseDir,createHash("sha256").update(deviceId).digest("hex")+".json"),
    JSON.stringify({schemaVersion:1,generation:2,runId:"run-a",deviceId}));
  new WindowsDpapiSecrets(tokenFile).setSecret(TOKEN_KEY,JSON.stringify({
    accessToken:refresh?"expired":"cached",refreshToken:"fake-only-refresh",
    expiresAtMs:refresh?0:Date.now()+600000,scope:SCOPE
  }));
  return{dir,root,deviceId,tokenFile,
    cleanup:async()=>{await rm(dir,{recursive:true,force:true});await rm(tokenFile,{force:true});}};
}

test("WCO-R1-F01 nonsettling OAuth refresh terminates a bounded cycle and releases owner lock",async()=>{
  const f=await fixture(true);
  try{
    const start=Date.now();
    const result=await runWindowsControllerCycle({clientId:"desktop",tokenFile:f.tokenFile,relayRoot:f.root,
      deviceId:f.deviceId,fetcher:never,requestTimeoutMs:120,cycleTimeoutMs:1500});
    strictEqual(result.status,"unavailable");strictEqual(result.reason,"controller-io-timeout");
    ok(Date.now()-start<5000,"hung refresh must not retain owner indefinitely");
    await rejects(()=>stat(join(f.root,"controller-owner.lock")),{code:"ENOENT"});
    const next=await runWindowsControllerCycle({clientId:"desktop",tokenFile:f.tokenFile,relayRoot:f.root,
      deviceId:f.deviceId,requestTimeoutMs:150,cycleTimeoutMs:1500,
      fetcher:async url=>String(url).includes("oauth2.googleapis.com/token")
        ?Response.json({access_token:"recovered-access",expires_in:3600,scope:SCOPE})
        :Response.json({files:[]})});
    strictEqual(next.reason==="controller-owner-busy",false,"restart must reacquire owner lock");
    await rejects(()=>stat(join(f.root,"controller-owner.lock")),{code:"ENOENT"});
  }finally{await f.cleanup();}
});

test("WCO-R1-F01 nonsettling Drive request becomes unknown/unavailable and cannot create an inbox acknowledgment",async()=>{
  const f=await fixture(false);
  try{
    const result=await runWindowsControllerCycle({clientId:"desktop",tokenFile:f.tokenFile,relayRoot:f.root,
      deviceId:f.deviceId,fetcher:never,requestTimeoutMs:100,cycleTimeoutMs:1500});
    strictEqual(result.status,"unavailable");
    match(result.reason??"",/controller-io-timeout|mailbox-controller-io-timeout/);
    await rejects(()=>stat(join(f.root,"controller-owner.lock")),{code:"ENOENT"});
    await rejects(()=>stat(join(f.root,"inbox","acknowledged.json")),{code:"ENOENT"});
  }finally{await f.cleanup();}
});

test("WCO-R1-F01 late OAuth response cannot persist a timed-out refresh token",async()=>{
  const f=await fixture(true);
  try{
    let release!:(response:Response)=>void,started!:()=>void;
    const entered=new Promise<void>(resolve=>started=resolve);
    const fetcher:typeof fetch=async()=>{started();return new Promise<Response>(resolve=>release=resolve);};
    const request=createWindowsControllerRequest({clientId:"desktop",tokenFile:f.tokenFile,fetcher,requestTimeoutMs:100});
    const pending=rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/controller-io-timeout/);
    await entered;await pending;
    release(Response.json({access_token:"late-access",refresh_token:"late-refresh",expires_in:3600,scope:SCOPE}));
    await Promise.resolve();
    const stored=JSON.parse(new WindowsDpapiSecrets(f.tokenFile).getSecret(TOKEN_KEY)!);
    strictEqual(stored.accessToken,"expired");strictEqual(stored.refreshToken,"fake-only-refresh");
  }finally{await f.cleanup();}
});

test("WCO-R1-F01 hung PKCE token exchange expires callback without persisting credentials",async()=>{
  const file=protectedPath();let authUrl="";
  try{
    const pending=authorizeWindowsController({clientId:"desktop",tokenFile:file,port:0,timeoutMs:1200,
      requestTimeoutMs:120,fetcher:never,onAuthorizationUrl:url=>authUrl=url});
    const assertion=rejects(pending,/controller-oauth-callback-rejected|controller-oauth-timeout/);
    for(let i=0;i<300&&!authUrl;i++)await new Promise(resolve=>setTimeout(resolve,5));
    const url=new URL(authUrl),callback=new URL(url.searchParams.get("redirect_uri")!);
    callback.searchParams.set("code","stalled");callback.searchParams.set("state",url.searchParams.get("state")!);
    const result=await fetch(callback);strictEqual(result.status,400);
    await assertion;await rejects(()=>stat(file),{code:"ENOENT"});
  }finally{await rm(file,{force:true});}
});

test("WCO-R1-F01 actual compiled --once process exits after a nonsettling fake Google request",async()=>{
  const f=await fixture(false);
  try{
    const inject=join(f.dir,"nonsettling-fetch.cjs");
    await writeFile(inject,"globalThis.fetch=async()=>new Promise(()=>{});\n");
    const entry=resolve(__dirname,"../src/run-windows-diagnostic-controller.js");
    const started=Date.now();
    const child=spawnSync(process.execPath,[entry,"--once","--client-id","desktop",
      "--token-file",f.tokenFile,"--relay-root",f.root,"--device-id",f.deviceId,
      "--request-timeout-ms","150","--cycle-timeout-ms","1500"],{
      encoding:"utf8",timeout:8000,env:{...process.env,NODE_OPTIONS:'--require "'+inject+'"'}
    });
    strictEqual(child.error,undefined,"compiled process must finish before operating-system test timeout");
    strictEqual(child.status,1);
    ok(Date.now()-started<7500);
    strictEqual(child.stdout.includes("BVP_WINDOWS_CONTROLLER=unavailable"),true);
    strictEqual(child.stdout.includes(f.tokenFile),false);
    await rejects(()=>stat(join(f.root,"controller-owner.lock")),{code:"ENOENT"});
  }finally{await f.cleanup();}
});

test("WCO-R1-F01 explicit shutdown cancels a hanging Drive request and releases the singleton owner",async()=>{
  const f=await fixture(false);
  try{
    const shutdown=new AbortController();
    let entered!:()=>void;const started=new Promise<void>(r=>entered=r);
    const stalled:typeof fetch=async()=>{entered();return new Promise<Response>(()=>{});};
    const pending=runWindowsControllerCycle({clientId:"desktop",tokenFile:f.tokenFile,relayRoot:f.root,
      deviceId:f.deviceId,fetcher:stalled,requestTimeoutMs:60000,cycleTimeoutMs:120000,signal:shutdown.signal});
    await started;shutdown.abort();
    const result=await pending;
    strictEqual(result.status,"unavailable");
    match(result.reason??"",/controller-io-cancelled|mailbox-controller-io-cancelled/);
    await rejects(()=>stat(join(f.root,"controller-owner.lock")),{code:"ENOENT"});
  }finally{await f.cleanup();}
});
