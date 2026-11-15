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
const credentialRoot=join(process.env.LOCALAPPDATA!,"BRAIN-BVP","controller");
async function credentialFixture(prefix:string){await mkdir(credentialRoot,{recursive:true});return mkdtemp(join(credentialRoot,prefix));}

import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets } from "../src/windows-controller-auth";
import { runWindowsControllerCycle, withWindowsControllerProcessLock } from "../src/run-windows-diagnostic-controller";

test("Option A Windows DPAPI token storage binds secrets to local user and never writes plaintext token",async()=>{
  const root=await credentialFixture("brain-bvp-oauth-");
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

test("WCO-R2-F03 credential bootstrap creates protected user-and-SYSTEM-only NTFS ACL",async()=>{
  const root=await credentialFixture("brain-bvp-acl-bootstrap-"),file=join(root,"tokens.dat");
  try{
    const store=new WindowsDpapiSecrets(file);store.setSecret(TOKEN_KEY,"encrypted-test-only");
    const policy=String.raw`$ErrorActionPreference='Stop'
      $p=[Console]::In.ReadToEnd().Trim();$acl=Get-Acl -LiteralPath $p
      $user=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
      $system='S-1-5-18'
      if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $user){exit 2}
      if(-not $acl.AreAccessRulesProtected){exit 3}
      foreach($ace in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){
        if($ace.AccessControlType -eq 'Allow' -and $ace.IdentityReference.Value -notin @($user,$system)){exit 4}
      }`;
    const check=spawnSync("pwsh.exe",["-NoProfile","-NonInteractive","-EncodedCommand",
      Buffer.from(policy,"utf16le").toString("base64")],{input:file,encoding:"utf8",windowsHide:true,timeout:10000});
    strictEqual(check.error,undefined,"ACL validation process must execute");
    strictEqual(check.status,0,"encrypted token must have protected, owner+SYSTEM-only NTFS grants");
    strictEqual(store.getSecret(TOKEN_KEY),"encrypted-test-only");
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A previously authenticated Windows request refreshes Google tokens without any local IPC",async()=>{
  const root=await credentialFixture("brain-bvp-oauth-refresh-");
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
  const root=await credentialFixture("brain-bvp-oauth-missing-");
  try{
    let contacted=false;
    const request=createWindowsControllerRequest({clientId:"desktop",tokenFile:join(root,"missing.dat"),fetcher:async()=>{
      contacted=true;return Response.json({files:[]});
    }});
    await rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/authentication-required|oauth/);
    strictEqual(contacted,false);
    new WindowsDpapiSecrets(join(root,"missing.dat")).setSecret(TOKEN_KEY,"original-fixture");
    await writeFile(join(root,"missing.dat"),"corrupted-dpapi-ciphertext");
    await rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/controller-token-unprotect-failed/);
    strictEqual(contacted,false,"invalid encrypted credentials must not contact Google");
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A Windows authorization uses bounded loopback PKCE callback and persists only protected OAuth tokens",async()=>{
  const root=await credentialFixture("brain-bvp-oauth-login-");
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
  const temp=await credentialFixture("brain-bvp-auth-lock-");
  const root=join(temp,".bvp-relay");
  try{
    let entered!:()=>void,release!:()=>void;
    const entering=new Promise<void>(r=>entered=r),holding=new Promise<void>(r=>release=r);
    const first=withWindowsControllerProcessLock(root,async()=>{entered();await holding;});
    await entering;
    await rejects(()=>withWindowsControllerProcessLock(root,async()=>{}),/controller-owner-busy/);
    release();await first;
    const orphan=join(root,"controller-owner.lock");
    await mkdir(root,{recursive:true});
    await writeFile(orphan,"orphan");
    await rejects(()=>withWindowsControllerProcessLock(root,async()=>{}),/controller-owner-busy/);
  }finally{await rm(temp,{recursive:true,force:true});}
});

test("Option A actual controller cycle requires existing authority and refuses missing OAuth session",async()=>{
  const root=await credentialFixture("brain-bvp-controller-cycle-");
  try{
    const relayRoot=join(root,".bvp-relay"),tokenFile=join(root,"secrets.dat"),deviceId="device-a";
    const dir=join(relayRoot,"controller-authority");
    await mkdir(dir,{recursive:true});
    await writeFile(join(dir,createHash("sha256").update(deviceId).digest("hex")+".json"),
      JSON.stringify({schemaVersion:1,generation:2,runId:"run-a",deviceId}));
    const result=await runWindowsControllerCycle({clientId:"desktop",tokenFile,relayRoot,deviceId});
    strictEqual(result.status,"unavailable");
    strictEqual(result.reason,"controller-authentication-required");
    const lock=join(relayRoot,"controller-owner.lock");
    await rejects(()=>stat(lock),/ENOENT/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A first sign-in without offline refresh grant fails without persisting temporary access token",async()=>{
  const root=await credentialFixture("brain-bvp-oauth-no-refresh-");
  try{
    const tokenFile=join(root,"tokens.dat");
    let authUrl="";
    const attempt=authorizeWindowsController({clientId:"desktop",tokenFile,port:0,
      onAuthorizationUrl:url=>{authUrl=url;},
      fetcher:async()=>Response.json({access_token:"transient-only",expires_in:3600,
        scope:"https://www.googleapis.com/auth/drive.file"})});
    const expectedRejection=rejects(attempt,/controller-oauth-callback-rejected/);
    for(let i=0;i<200&&!authUrl;i++)await new Promise(resolve=>setTimeout(resolve,1));
    const start=new URL(authUrl),callback=new URL(start.searchParams.get("redirect_uri")!);
    callback.searchParams.set("code","fake-code");
    callback.searchParams.set("state",start.searchParams.get("state")!);
    const result=await fetch(callback);
    strictEqual(result.status,400);
    await expectedRejection;
    await rejects(()=>readFile(tokenFile,"utf8"),/ENOENT/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("Option A compiled Windows controller --once entrypoint fails closed before contacting Drive without credentials",async()=>{
  const root=await credentialFixture("brain-bvp-windows-cli-");
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

test("WCO-R2-F01 compiled --once reports a bounded error code on invalid controller root without disclosing secrets",async()=>{
  const root=await credentialFixture("brain-bvp-cli-invalid-root-");
  try{
    const tokenFile=join(root,"no-tokens.dat");
    const entry=resolve(__dirname,"../src/run-windows-diagnostic-controller.js");
    const result=spawnSync(process.execPath,[entry,"--once","--client-id","desktop",
      "--token-file",tokenFile,"--relay-root",root,"--device-id","device-a"],{
      encoding:"utf8",timeout:10000
    });
    strictEqual(result.error,undefined);
    strictEqual(result.status,1);
    strictEqual(result.stdout.includes("BVP_WINDOWS_CONTROLLER=unavailable"),true);
    strictEqual(result.stdout.includes("BVP_WINDOWS_CONTROLLER_REASON=controller-root-invalid"),true);
    strictEqual(result.stdout.includes(tokenFile)||result.stderr.includes(tokenFile),false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test("DEC357 PKCE loopback accepts at most one code-exchange request for each authorization intent",async()=>{
  const root=await credentialFixture("brain-bvp-oauth-replay-");
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
  const root=await credentialFixture("brain-bvp-oauth-cursor-");
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


test("WCO-R1-F03 rejects token storage outside the trusted private Windows LocalAppData controller tree",async()=>{
  const forbidden=[
    join(resolve(process.cwd()),"dev","controller-token.dat"),
    join(tmpdir(),"controller-token-unsafe.dat"),
    join(credentialRoot,"..","vault","controller-token.dat"),
  ];
  for(const path of forbidden){
    await rejects(async()=>new WindowsDpapiSecrets(path),/controller-token-location-invalid/);
  }
});

test("WCO-R1-F03 token file ACL broadening is detected before the cached credential is read",async()=>{
  const dir=await credentialFixture("brain-bvp-oauth-acl-"),file=join(dir,"tokens.dat");
  try{
    const store=new WindowsDpapiSecrets(file);
    store.setSecret(TOKEN_KEY,"encrypted-fake-token");
    strictEqual(store.getSecret(TOKEN_KEY),"encrypted-fake-token");
    const changed=spawnSync("icacls.exe",[file,"/grant","*S-1-5-32-545:(R)"],{encoding:"utf8",windowsHide:true});
    strictEqual(changed.status,0,"test fixture must successfully grant Users read on token file");
    await rejects(async()=>store.getSecret(TOKEN_KEY),/controller-token-permissions-invalid/);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test("WCO-R1-F03 async controller request refuses broad token DACL before contacting Drive",async()=>{
  const dir=await credentialFixture("brain-bvp-oauth-async-acl-"),file=join(dir,"tokens.dat");
  try{
    new WindowsDpapiSecrets(file).setSecret(TOKEN_KEY,JSON.stringify({
      accessToken:"cached",refreshToken:"refresh",expiresAtMs:Date.now()+600000,
      scope:"https://www.googleapis.com/auth/drive.file"
    }));
    const grant=spawnSync("icacls.exe",[file,"/grant","*S-1-5-32-545:(R)"],{encoding:"utf8",windowsHide:true});
    strictEqual(grant.status,0,"fixture must actually create an unauthorized Users read grant");
    let contacted=false;
    const request=createWindowsControllerRequest({clientId:"desktop",tokenFile:file,
      fetcher:async()=>{contacted=true;return Response.json({files:[]});}});
    await rejects(()=>request("https://www.googleapis.com/drive/v3/files"),/controller-token-permissions-invalid/);
    strictEqual(contacted,false,"untrusted token ACL cannot authorize even a mocked Drive request");
  }finally{await rm(dir,{recursive:true,force:true});}
});

/** DEC-359: owner-authorized live GET-only Google compatibility; mock cases cannot prove live access. */
type Dec359Request=(url:string,init?:RequestInit)=>Promise<Response>;
const DEC359_TEST_ID="existingMailbox_0123456789";
const DEC359_QUERY="trashed = false and appProperties has { key='brainBvpMailbox' and value='1' }";
const dec359Root=(id=DEC359_TEST_ID)=>({id,mimeType:"application/vnd.google-apps.folder",trashed:false,appProperties:{brainBvpMailbox:"1"}});
function dec359ReadOnly(request:Dec359Request):Dec359Request {
  return (url,init)=>{
    const parsed=new URL(url);
    if(parsed.origin!=="https://www.googleapis.com"||
      !/^\/drive\/v3\/files(?:\/[A-Za-z0-9_-]{10,180})?$/.test(parsed.pathname)||
      (init?.method??"GET").toUpperCase()!=="GET"||init?.body!==undefined)
      throw new Error("dec359-method-or-target-rejected");
    return request(url,{method:"GET"});
  };
}
function dec359ExactRoot(obj:unknown,id:string):boolean {
  if(!obj||typeof obj!=="object"||Array.isArray(obj))return false;
  const v=obj as Record<string,unknown>;
  return v.id===id&&v.mimeType==="application/vnd.google-apps.folder"&&v.trashed===false&&
    !!v.appProperties&&typeof v.appProperties==="object"&&
    (v.appProperties as Record<string,unknown>).brainBvpMailbox==="1";
}
async function dec359Json(response:Response):Promise<unknown>{
  try{return await response.json();}catch{throw new Error("dec359-provider-metadata-invalid");}
}
async function dec359Check(request:Dec359Request,expected:string):Promise<"VISIBLE">{
  if(!/^[A-Za-z0-9_-]{10,180}$/.test(expected))throw new Error("dec359-original-mailbox-id-required");
  const read=dec359ReadOnly(request);
  const direct=new URL("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(expected));
  direct.searchParams.set("fields","id,mimeType,trashed,appProperties");
  const response=await read(direct.toString());
  if(!response.ok)throw new Error("dec359-original-inaccessible");
  if(!dec359ExactRoot(await dec359Json(response),expected))throw new Error("dec359-original-identity-mismatch");
  const listing=new URL("https://www.googleapis.com/drive/v3/files");
  listing.searchParams.set("q",DEC359_QUERY);listing.searchParams.set("spaces","drive");
  listing.searchParams.set("pageSize","10");
  listing.searchParams.set("fields","nextPageToken,files(id,mimeType,trashed,appProperties)");
  const found=await read(listing.toString());
  if(!found.ok)throw new Error("dec359-query-inaccessible");
  const result=await dec359Json(found);
  if(!result||typeof result!=="object"||Array.isArray(result))
    throw new Error("dec359-provider-metadata-invalid");
  const data=result as {files?:unknown;nextPageToken?:unknown};
  if(data.nextPageToken||!Array.isArray(data.files)||data.files.length!==1)
    throw new Error("dec359-query-ambiguous-or-empty");
  if(!dec359ExactRoot(data.files[0],expected))throw new Error("dec359-query-wrong-mailbox");
  return "VISIBLE";
}
function dec359Fake(direct:Response=Response.json(dec359Root()),
  listing:Response=Response.json({files:[dec359Root()]})){
  const calls:{url:string;method:string}[]=[];
  const request:Dec359Request=async(url,init)=>{calls.push({url,method:init?.method??"GET"});
    return new URL(url).pathname==="/drive/v3/files"?listing:direct;};
  return {request,calls};
}
test("DEC-359 GET-only original mailbox exact-ID and metadata-query match",async()=>{
  const f=dec359Fake();strictEqual(await dec359Check(f.request,DEC359_TEST_ID),"VISIBLE");
  strictEqual(f.calls.length,2);strictEqual(f.calls.every(x=>x.method==="GET"),true);
  strictEqual(new URL(f.calls[1]!.url).searchParams.get("q"),DEC359_QUERY);
  for(const [url,method] of [
    ["https://www.googleapis.com/drive/v3/files","POST"],
    ["https://www.googleapis.com/upload/drive/v3/files","GET"],
    ["https://not-google.invalid/drive/v3/files","GET"]
  ] as const)await rejects(()=>dec359ReadOnly(f.request)(url,{method}),/dec359-method-or-target-rejected/);
  strictEqual(f.calls.length,2);
});
test("DEC-359 visible original but different, absent, duplicate, or paginated query blocks",async()=>{
  for(const result of [{files:[]},{files:[dec359Root("anotherMailbox_0123456789")]},
    {files:[dec359Root(),dec359Root()]},{files:[dec359Root()],nextPageToken:"more"}]){
    const f=dec359Fake(Response.json(dec359Root()),Response.json(result));
    await rejects(()=>dec359Check(f.request,DEC359_TEST_ID),/dec359-query-(?:wrong-mailbox|ambiguous-or-empty)/);
  }
});
test("DEC-359 direct 403, 404, wrong marker or wrong ID stops before query",async()=>{
  for(const original of [new Response(null,{status:403}),new Response(null,{status:404}),
    Response.json({...dec359Root(),appProperties:{}}),
    Response.json(dec359Root("anotherMailbox_0123456789")),
    new Response("{sensitive-provider-prefix", {status:200})]){
    const f=dec359Fake(original);
    await rejects(()=>dec359Check(f.request,DEC359_TEST_ID),/dec359-(?:original-(?:inaccessible|identity-mismatch)|provider-metadata-invalid)/);
    strictEqual(f.calls.length,1);
  }
  const f=dec359Fake();await rejects(()=>dec359Check(f.request,""),/dec359-original-mailbox-id-required/);
  strictEqual(f.calls.length,0);
});
if(process.env.BVP_DEC359_LIVE_RUN==="YES"){
  test("DEC-359 real Google cross-client GET-only check (Owner consent + qualified source only)",async()=>{
    const e=process.env;
    if(e.BVP_DEC359_LIVE_CONSENT!=="YES"||e.BVP_DEC359_OBSIDIAN_ID_ATTESTED!=="YES"||
      e.BVP_DEC359_SAME_ACCOUNT_ATTESTED!=="YES"||
      !/^[a-f0-9]{40}$/.test(e.BVP_DEC359_QUALIFIED_SOURCE??"")||
      e.BVP_DEC359_SOURCE_SHA!==e.BVP_DEC359_QUALIFIED_SOURCE)
      throw new Error("dec359-not-authorized-or-not-qualified");
    const expected=e.BVP_DEC359_ORIGINAL_MAILBOX_ID??"";
    const clientId=e.BVP_DEC359_DESKTOP_CLIENT_ID??"";
    const tokenFile=e.BVP_DEC359_DPAPI_TOKEN_FILE??"";
    if(!/^[A-Za-z0-9_-]{10,180}$/.test(expected)||
      !/^[A-Za-z0-9._:-]{4,200}$/.test(clientId)||!tokenFile)
      throw new Error("dec359-required-local-bindings-missing");
    const source=spawnSync("git.exe",["rev-parse","HEAD"],{
      cwd:process.cwd(),encoding:"utf8",windowsHide:true,timeout:10000
    });
    if(source.status!==0||source.stdout.trim()!==e.BVP_DEC359_QUALIFIED_SOURCE)
      throw new Error("dec359-exact-source-identity-rejected");
    const result=await dec359Check(createWindowsControllerRequest({
      clientId,tokenFile,fetcher:fetch,requestTimeoutMs:10000}),expected);
    strictEqual(result,"VISIBLE");
    process.stdout.write("BVP_DEC359_LIVE=VISIBLE_AND_DISCOVERABLE\n");
  });
}
