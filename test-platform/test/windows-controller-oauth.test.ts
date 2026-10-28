import { strictEqual, rejects, match, notStrictEqual } from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { GOOGLE_TOKEN_ENDPOINT, GoogleOAuthSession } from "../../src/drive/auth";
import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets } from "../src/windows-controller-auth";
import { runWindowsControllerCycle, withWindowsControllerProcessLock } from "../src/run-windows-diagnostic-controller";

test("Option A Windows DPAPI token storage binds secrets to local user and never writes plaintext token",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-"));
  try{
    const file=join(root,"tokens.dat"),store=new WindowsDpapiSecrets(file);
    strictEqual(store.getSecret("absent"),null);
    store.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID,"sensitive-token-12345");
    const encrypted=await readFile(file,"utf8");
    strictEqual(encrypted.includes("sensitive-token-12345"),false);
    strictEqual(store.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID),"sensitive-token-12345");
    const second=new WindowsDpapiSecrets(file);
    strictEqual(second.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID),"sensitive-token-12345");
    store.deleteSecret(GoogleOAuthSession.TOKEN_SECRET_ID);
    strictEqual(second.getSecret(GoogleOAuthSession.TOKEN_SECRET_ID),null);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A previously authenticated Windows request refreshes Google tokens without any local IPC",async()=>{
  const root=await mkdtemp(join(tmpdir(),"brain-bvp-oauth-refresh-"));
  try{
    const tokenFile=join(root,"tokens.dat"),secrets=new WindowsDpapiSecrets(tokenFile);
    secrets.setSecret(GoogleOAuthSession.TOKEN_SECRET_ID,JSON.stringify({
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
