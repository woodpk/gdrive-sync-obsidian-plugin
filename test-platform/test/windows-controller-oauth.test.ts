import { strictEqual, rejects, match, notStrictEqual } from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
const GOOGLE_TOKEN_ENDPOINT="https://oauth2.googleapis.com/token";
const TOKEN_KEY="brain-gdrive-oauth-tokens";
import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets } from "../src/windows-controller-auth";
import { runWindowsControllerCycle, withWindowsControllerProcessLock } from "../src/run-windows-diagnostic-controller";

test("Option A Windows DPAPI token storage binds secrets to local user and never writes plaintext token",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-"));
  try{
    const file=join(root,"tokens.dat"),store=new WindowsDpapiSecrets(file);
    strictEqual(store.getSecret(TOKEN_KEY),null);
    await rejects(async()=>store.getSecret("other-secret-key"),/controller-token-id-invalid/);
    store.setSecret(TOKEN_KEY,"sensitive-token-12345");
    const encrypted=await readFile(file,"utf8");
    strictEqual(encrypted.includes("sensitive-token-12345"),false);
    strictEqual(store.getSecret(TOKEN_KEY),"sensitive-token-12345");
    const second=new WindowsDpapiSecrets(file);
    strictEqual(second.getSecret(TOKEN_KEY),"sensitive-token-12345");
    store.deleteSecret(TOKEN_KEY);
    strictEqual(second.getSecret(TOKEN_KEY),null);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A previously authenticated Windows request refreshes Google tokens without any local IPC",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-refresh-"));
  try{
    const tokenFile=join(root,"tokens.dat"),secrets=new WindowsDpapiSecrets(tokenFile);
    secrets.setSecret(TOKEN_KEY,JSON.stringify({
      accessToken:"expired",refreshToken:"refresh-secret",expiresAtMs:0,tokenType:"Bearer",
      scope:"https://www.googleapis.com/auth/drive.file"
    }));
    let refreshes=0,requests=0;
    const fetcher:typeof fetch=async (url,init)=>{
      if(String(url)===GOOGLE_TOKEN_ENDPOINT){
        refreshes++;
        strictEqual(String(init?.body).includes("refresh-secret"),true);
        return Response.json({access_token:"new-access",expires_in:3600,token_type:"Bearer"});
      }
      requests++;
      strictEqual(new Headers(init?.headers).get("authorization"),"Bearer new-access");
      return Response.json({files:[]});
    };
    const request=createWindowsControllerRequest({clientId:"local-desktop-client",tokenFile,fetcher});
    await request("https://www.googleapis.com/drive/v3/files");
    await request("https://www.googleapis.com/drive/v3/files");
    strictEqual(refreshes,1);strictEqual(requests,2);
    strictEqual((await readFile(tokenFile,"utf8")).includes("refresh-secret"),false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A missing or corrupt local token store fails closed before any Google Drive mutation",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-missing-"));
  try{
    let contacted=false;
    const request=createWindowsControllerRequest({clientId:"desktop",tokenFile:join(root,"missing.dat"),fetcher:async()=>{
      contacted=true;return Response.json({files:[]});
    }});
    await rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/authentication-required|oauth/);
    strictEqual(contacted,false);
    await writeFile(join(root,"missing.dat"),"corrupted-dpapi-ciphertext");
    await rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/controller-token-unprotect-failed/);
    strictEqual(contacted,false,"invalid encrypted credentials must not contact Google");
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A Windows authorization uses bounded loopback PKCE callback and persists only protected OAuth tokens",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-login-"));
  try{
    const tokenFile=join(root,"tokens.dat");
    const fetcher:typeof fetch=async(input,init)=>{
      if(String(input)===GOOGLE_TOKEN_ENDPOINT)return Response.json({
        access_token:"code-access",refresh_token:"code-refresh",expires_in:3600,
        token_type:"Bearer",scope:"https://www.googleapis.com/auth/drive.file"
      });
      return Response.json({files:[]});
    };
    let authorizationURL="";
    const finished=authorizeWindowsController({clientId:"desktop",tokenFile,port:0,fetcher,
      onAuthorizationUrl:url=>{authorizationURL=url;}});
    // onAuthorizationUrl is synchronous once the loopback is listening.
    for(let i=0;i<200&&!authorizationURL;i++)await new Promise(resolve=>setTimeout(resolve,1));
    match(authorizationURL,/code_challenge=/);
    const url=new URL(authorizationURL),callback=new URL(url.searchParams.get("redirect_uri")!);
    callback.searchParams.set("code","code-only-for-test");
    callback.searchParams.set("state",url.searchParams.get("state")!);
    const response=await fetch(callback);
    strictEqual(response.status,200);
    await finished;
    strictEqual((await readFile(tokenFile,"utf8")).includes("code-refresh"),false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A process-lifetime Windows root lock rejects competing controller and crash orphan",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-auth-lock-"));
  try{
    let entered!:()=>void,release!:()=>void;
    const entering=new Promise<void>(r=>entered=r),holding=new Promise<void>(r=>release=r);
    const first=withWindowsControllerProcessLock(root,async()=>{entered();await holding;});
    await entering;
    await rejects(()=>withWindowsControllerProcessLock(root,async()=>{}),/controller-owner-busy/);
    release();await first;
    const orphan=join(root,"controller-authority","controller-owner.lock");
    await mkdir(join(root,"controller-authority"),{recursive:true});
    await writeFile(orphan,"orphan");
    await rejects(()=>withWindowsControllerProcessLock(root,async()=>{}),/controller-owner-busy/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A actual controller cycle requires existing authority and refuses missing OAuth session",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-controller-cycle-"));
  try{
    const relayRoot=join(root,".bvp-relay"),tokenFile=join(root,"secrets.dat"),deviceId="device-a";
    const dir=join(relayRoot,"controller-authority");
    await mkdir(dir,{recursive:true});
    await writeFile(join(dir,createHash("sha256").update(deviceId).digest("hex")+".json"),
      JSON.stringify({schemaVersion:1,generation:2,runId:"run-a",deviceId}));
    const result=await runWindowsControllerCycle({clientId:"desktop",tokenFile,relayRoot,deviceId});
    strictEqual(result.status,"unavailable");
    strictEqual(result.reason,"controller-authentication-required");
    const lock=join(dir,"controller-owner.lock");
    await rejects(()=>stat(lock),/ENOENT/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A first sign-in without offline refresh grant fails without persisting temporary access token",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-no-refresh-"));
  try{
    const tokenFile=join(root,"tokens.dat");
    let authUrl="";
    const attempt=authorizeWindowsController({clientId:"desktop",tokenFile,port:0,
      onAuthorizationUrl:url=>{authUrl=url;},
      fetcher:async()=>Response.json({access_token:"transient-only",expires_in:3600,
        scope:"https://www.googleapis.com/auth/drive.file"})});
    for(let i=0;i<200&&!authUrl;i++)await new Promise(resolve=>setTimeout(resolve,1));
    const start=new URL(authUrl),callback=new URL(start.searchParams.get("redirect_uri")!);
    callback.searchParams.set("code","fake-code");
    callback.searchParams.set("state",start.searchParams.get("state")!);
    const result=await fetch(callback);
    strictEqual(result.status,400);
    await rejects(()=>attempt,/controller-oauth-callback-rejected/);
    await rejects(()=>readFile(tokenFile,"utf8"),/ENOENT/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A compiled Windows controller --once entrypoint fails closed before contacting Drive without credentials",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-windows-cli-"));
  try{
    const relayRoot=join(root,".bvp-relay"),tokenFile=join(root,"no-tokens.dat");
    const entry=resolve(__dirname,"../src/run-windows-diagnostic-controller.js");
    const result=spawnSync(process.execPath,[entry,"--once","--client-id","desktop",
      "--token-file",tokenFile,"--relay-root",relayRoot,"--device-id","device-a"],{
      encoding:"utf8",timeout:10000
    });
    strictEqual(result.status,1);
    strictEqual(result.stdout.includes("BVP_WINDOWS_CONTROLLER=unavailable"),true);
    strictEqual(result.stdout.includes("BVP_WINDOWS_CONTROLLER_REASON=controller-authentication-required"),true);
    strictEqual(result.stdout.includes("device-a"),false);
    strictEqual(result.stderr.includes(tokenFile),false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("DEC357 PKCE loopback accepts at most one code-exchange request for each authorization intent",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-replay-"));
  try{
    let authUrl="",calls=0,release!:()=>void;
    const barrier=new Promise<void>(resolve=>release=resolve);
    const pending=authorizeWindowsController({clientId:"desktop",tokenFile:join(root,"tokens.dat"),port:0,
      onAuthorizationUrl:url=>{authUrl=url;},
      fetcher:async()=>{calls++;await barrier;return Response.json({
        access_token:"one-access",refresh_token:"one-refresh",expires_in:3600,
        scope:"https://www.googleapis.com/auth/drive.file"
      });}});
    for(let i=0;i<200&&!authUrl;i++)await new Promise(resolve=>setTimeout(resolve,1));
    const authorization=new URL(authUrl),target=new URL(authorization.searchParams.get("redirect_uri")!);
    target.searchParams.set("state",authorization.searchParams.get("state")!);
    target.searchParams.set("code","first-code");
    const first=fetch(target);
    for(let i=0;i<200&&calls===0;i++)await new Promise(resolve=>setTimeout(resolve,1));
    target.searchParams.set("code","second-code");
    const replay=await fetch(target);
    strictEqual(replay.status,404,"a second callback must never exchange a code while first is in-flight");
    release();
    strictEqual((await first).status,200);
    await pending;
    strictEqual(calls,1);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("DEC357 authenticated request preserves Drive cursor-expiry HTTP status for existing mailbox recovery",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-cursor-"));
  try{
    const tokenFile=join(root,"tokens.dat");
    new WindowsDpapiSecrets(tokenFile).setSecret(TOKEN_KEY,JSON.stringify({
      accessToken:"valid",refreshToken:"refresh",expiresAtMs:Date.now()+600000,
      scope:"https://www.googleapis.com/auth/drive.file"
    }));
    const request=createWindowsControllerRequest({clientId:"desktop",tokenFile,
      fetcher:async()=>new Response("",{status:410})});
    const response=await request("https://www.googleapis.com/drive/v3/files?pageToken=expired");
    strictEqual(response.status,410,"mailbox itself must interpret expired page tokens");
  }finally{await rm(root,{recursive:true,force:true});}
});
