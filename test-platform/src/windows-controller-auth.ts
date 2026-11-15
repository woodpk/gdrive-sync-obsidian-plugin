/** Windows-only, validation-only Google Drive OAuth PKCE. No imports from shipping
 * production sources and no tokens in argv, URLs, logs or unencrypted files. */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import type { AuthenticatedDriveRequest } from "./live-device/drive-mailbox";

const KEY="brain-gdrive-oauth-tokens";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const TOKEN_URL="https://oauth2.googleapis.com/token";
interface Tokens {accessToken:string;refreshToken?:string;expiresAtMs:number;scope:string;}
export interface WindowsOAuthOptions {readonly clientId:string;readonly tokenFile:string;readonly port?:number;readonly fetcher?:typeof fetch;readonly requestTimeoutMs?:number;readonly signal?:AbortSignal;}
const ioTimeout=(value?:number)=>{const n=value??10000;if(!Number.isSafeInteger(n)||n<50||n>60000)throw new Error("controller-io-timeout-invalid");return n;};
const timedOut=(error:unknown)=>error instanceof Error&&/^controller-io-(?:timeout|cancelled)$/.test(error.message);
async function bounded<T>(work:(signal:AbortSignal)=>Promise<T>,options:WindowsOAuthOptions):Promise<T>{
  const controller=new AbortController();let reason="controller-io-timeout";
  const stop=()=>{reason="controller-io-cancelled";controller.abort();};
  options.signal?.addEventListener("abort",stop,{once:true});
  if(options.signal?.aborted)stop();
  const timer=setTimeout(()=>controller.abort(),ioTimeout(options.requestTimeoutMs));
  const cancelled=new Promise<T>((_,reject)=>{
    const fail=()=>reject(new Error(reason));
    controller.signal.addEventListener("abort",fail,{once:true});
    if(controller.signal.aborted)fail();
  });
  try{return await Promise.race([Promise.resolve().then(()=>work(controller.signal)),cancelled]);}
  finally{clearTimeout(timer);options.signal?.removeEventListener("abort",stop);}
}
const dpapiScript=(mode:"Protect"|"Unprotect")=>`$ErrorActionPreference='Stop';$b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());$o=[Security.Cryptography.ProtectedData]::${mode}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($o))`;
function dpapi(value:string,mode:"Protect"|"Unprotect"):string {
  const child=spawnSync("pwsh.exe",["-NoLogo","-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from(dpapiScript(mode),"utf16le").toString("base64")],{
    input:mode==="Protect"?Buffer.from(value,"utf8").toString("base64"):value,
    encoding:"utf8",windowsHide:true,maxBuffer:1048576,timeout:10000
  });
  if(child.status!==0||child.error||!child.stdout.trim()||!/^[A-Za-z0-9+/=]+$/.test(child.stdout.trim()))throw new Error("controller-dpapi-unavailable");
  return mode==="Protect"?child.stdout.trim():Buffer.from(child.stdout.trim(),"base64").toString("utf8");
}
function securedTokenLocation(path:string):{file:string;directories:string[]} {
  const local=process.env.LOCALAPPDATA;
  if(process.platform!=="win32"||!local||!isAbsolute(local)||!isAbsolute(path))
    throw new Error("controller-token-location-invalid");
  const root=resolve(local,"BRAIN-BVP","controller"),file=resolve(path),rel=relative(root,file);
  if(!rel||rel.startsWith("..")||isAbsolute(rel)||!/\.dat$/i.test(file))
    throw new Error("controller-token-location-invalid");
  const directories:string[]=[];let parent=dirname(file);
  while(parent.toLowerCase()!==resolve(local).toLowerCase()){
    if(parent.length<root.length-15||parent===dirname(parent))throw new Error("controller-token-location-invalid");
    directories.unshift(parent);parent=dirname(parent);
  }
  const repo=resolve(process.cwd()),within=relative(repo,file);
  if((existsSync(join(repo,".git"))||existsSync(join(repo,".obsidian")))&&within&&!within.startsWith("..")&&!isAbsolute(within))
    throw new Error("controller-token-location-invalid");
  for(const item of [...directories,file]){
    if(existsSync(item)&&lstatSync(item).isSymbolicLink())throw new Error("controller-token-location-invalid");
    if(item!==file&&(existsSync(join(item,".git"))||existsSync(join(item,".obsidian"))))
      throw new Error("controller-token-location-invalid");
  }
  return {file,directories};
}
const ACL_SCRIPT="$ErrorActionPreference='Stop'\n$stage='request-parse'\ntry {\n  $request=[Console]::In.ReadToEnd() | ConvertFrom-Json\n  $stage='identity';$user=[Security.Principal.WindowsIdentity]::GetCurrent().User\n  $system=[Security.Principal.SecurityIdentifier]::new('S-1-5-18')\n  foreach($p in $request.paths){\n    $stage='acl-read';$acl=Get-Acl -LiteralPath $p\n    $stage='owner-check';if($acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $user.Value){throw 'owner'}\n    if($request.apply){\n      $stage='acl-native'\n      # Native icacls supports Windows DACL writes without Set-Acl's provider-specific failure.\n      # Remove inherited grants, replace current-user/SYSTEM grants, then verify the on-disk DACL.\n      $flags=if((Get-Item -LiteralPath $p).PSIsContainer){'(OI)(CI)'}else{''}\n      $grantUser='*'+$user.Value+':'+$flags+'F';$grantSystem='*'+$system.Value+':'+$flags+'F'\n      & icacls.exe $p /inheritance:r /grant:r $grantUser $grantSystem 2>$null | Out-Null\n      if($LASTEXITCODE -ne 0){throw 'acl-native-failed'}\n      $stage='acl-readback';$acl=Get-Acl -LiteralPath $p\n    }\n    $stage='inheritance-check';if(-not $acl.AreAccessRulesProtected){throw 'inheritance'}\n    $stage='ace-check'\n    foreach($ace in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){\n      if($ace.AccessControlType -eq 'Allow' -and $ace.IdentityReference.Value -notin @($user.Value,$system.Value)){throw 'broad-access'}\n    }\n  }\n} catch {\n  # Print only a fixed operation class. Never print exception text, paths, ACL identities or tokens.\n  [Console]::Out.Write('BVP_ACL_STAGE='+$stage)\n  exit 70\n}";
function enforceTokenAcl(paths:readonly string[],apply:boolean):void {
  const processResult=spawnSync("pwsh.exe",["-NoLogo","-NoProfile","-NonInteractive",
    "-EncodedCommand",Buffer.from(ACL_SCRIPT,"utf16le").toString("base64")],{
      input:JSON.stringify({paths,apply}),encoding:"utf8",windowsHide:true,timeout:35000,maxBuffer:16384
    });
  if(processResult.error||processResult.status!==0){
    const stage=/^BVP_ACL_STAGE=([a-z-]+)$/.exec(processResult.stdout.trim())?.[1]??"script-failure";
    // Bounded, credential-free diagnostic is intentionally present in PHX-CI terminal evidence.
    process.stderr.write("BVP_ACL_FAILURE_STAGE="+stage+"\n");
    throw new Error("controller-token-permissions-invalid");
  }
}
async function secureShell(script:string,input:string,timeout:number,signal?:AbortSignal):Promise<string>{
  if(signal?.aborted)throw new Error("controller-io-cancelled");
  return new Promise<string>((resolve,reject)=>{
    const child=spawn("pwsh.exe",["-NoLogo","-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from(script,"utf16le").toString("base64")],{windowsHide:true,stdio:["pipe","pipe","ignore"]});
    let output="",reason="",stopped=false;
    const cancel=(why:string)=>{if(stopped)return;stopped=true;reason=why;child.kill();},onAbort=()=>cancel("controller-io-cancelled"),timer=setTimeout(()=>cancel("controller-io-timeout"),timeout);
    signal?.addEventListener("abort",onAbort,{once:true});
    child.stdout!.on("data",(data:Buffer)=>{output+=data.toString("utf8");if(output.length>1048576)cancel("controller-security-process-unavailable");});child.stdout!.on("error",()=>cancel("controller-security-process-unavailable"));
    child.on("error",()=>{if(!reason)reason="controller-security-process-unavailable";});
    child.on("close",code=>{clearTimeout(timer);signal?.removeEventListener("abort",onAbort);if(reason||code!==0)reject(new Error(reason||"controller-security-process-unavailable"));else resolve(output.trim());});
    child.stdin!.on("error",()=>{if(!reason)reason="controller-security-process-unavailable";});child.stdin!.end(input);if(signal?.aborted)onAbort();
  });
}
async function aclAsync(paths:readonly string[],apply:boolean,signal?:AbortSignal):Promise<void>{
  try{await secureShell(ACL_SCRIPT,JSON.stringify({paths,apply}),35000,signal);}catch(error){if(timedOut(error))throw error;throw new Error("controller-token-permissions-invalid");}
}
async function dpapiAsync(value:string,mode:"Protect"|"Unprotect",signal?:AbortSignal):Promise<string>{
  const raw=await secureShell(dpapiScript(mode),mode==="Protect"?Buffer.from(value,"utf8").toString("base64"):value,10000,signal);
  if(!raw||!/^[A-Za-z0-9+/=]+$/.test(raw))throw new Error("controller-dpapi-unavailable");return mode==="Protect"?raw:Buffer.from(raw,"base64").toString("utf8");
}
export class WindowsDpapiSecrets {
  private readonly secured:{file:string;directories:string[]};
  constructor(private readonly file:string){this.secured=securedTokenLocation(file);}
  private check(id:string){if(id!==KEY)throw new Error("controller-token-id-invalid");}
  getSecret(id:string):string|null {
    this.check(id);if(!existsSync(this.file))return null;
    try{securedTokenLocation(this.file);enforceTokenAcl([...this.secured.directories,this.file],false);return dpapi(readFileSync(this.file,"utf8"),"Unprotect");}
    catch(error){if(error instanceof Error&&error.message==="controller-token-permissions-invalid")throw error;throw new Error("controller-token-unprotect-failed");}
  }
  setSecret(id:string,value:string):void {
    this.check(id);mkdirSync(dirname(this.file),{recursive:true});securedTokenLocation(this.file);enforceTokenAcl(this.secured.directories,true);
    const temp=this.file+"."+randomBytes(8).toString("hex")+".tmp";
    try{writeFileSync(temp,dpapi(value,"Protect"),{encoding:"utf8",mode:0o600,flag:"wx"});
      enforceTokenAcl([temp],true);renameSync(temp,this.file);enforceTokenAcl([...this.secured.directories,this.file],false);
    }finally{rmSync(temp,{force:true});}
  }
  async getSecretAsync(id:string,signal?:AbortSignal):Promise<string|null>{
    this.check(id);if(signal?.aborted)throw new Error("controller-io-cancelled");if(!existsSync(this.file))return null;
    try{securedTokenLocation(this.file);await aclAsync([...this.secured.directories,this.file],false,signal);return await dpapiAsync(readFileSync(this.file,"utf8"),"Unprotect",signal);}
    catch(error){if(timedOut(error)||error instanceof Error&&error.message==="controller-token-permissions-invalid")throw error;throw new Error("controller-token-unprotect-failed");}
  }
  async setSecretAsync(id:string,value:string,signal?:AbortSignal):Promise<void>{
    this.check(id);if(signal?.aborted)throw new Error("controller-io-cancelled");mkdirSync(dirname(this.file),{recursive:true});securedTokenLocation(this.file);
    await aclAsync(this.secured.directories,true,signal);const temp=this.file+"."+randomBytes(8).toString("hex")+".tmp";
    try{const cipher=await dpapiAsync(value,"Protect",signal);if(signal?.aborted)throw new Error("controller-io-cancelled");
      writeFileSync(temp,cipher,{encoding:"utf8",mode:0o600,flag:"wx"});await aclAsync([temp],true,signal);if(signal?.aborted)throw new Error("controller-io-cancelled");
      renameSync(temp,this.file);await aclAsync([...this.secured.directories,this.file],false,signal);
    }finally{rmSync(temp,{force:true});}
  }
  deleteSecret(id:string):void {this.check(id);if(existsSync(this.file)){securedTokenLocation(this.file);enforceTokenAcl([...this.secured.directories,this.file],false);}rmSync(this.file,{force:true});}
}
function config(options:WindowsOAuthOptions){
  if(!/^[A-Za-z0-9._:-]{4,200}$/.test(options.clientId)||!Number.isSafeInteger(options.port??0)||
    (options.port??0)<0||(options.port??0)>65535)throw new Error("controller-oauth-config-invalid");
  return new WindowsDpapiSecrets(options.tokenFile);
}
function tokens(raw:string|null):Tokens|undefined {
  if(!raw)return undefined;let value:Partial<Tokens>;
  try{value=JSON.parse(raw) as Partial<Tokens>;}catch{throw new Error("controller-token-invalid");}
  if(typeof value.accessToken!=="string"||!Number.isFinite(value.expiresAtMs)||
    value.scope!==SCOPE||(value.refreshToken!==undefined&&typeof value.refreshToken!=="string"))throw new Error("controller-token-invalid");
  return value as Tokens;
}
async function exchange(fetcher:typeof fetch,body:URLSearchParams,options:WindowsOAuthOptions):Promise<Record<string,unknown>> {
  let response:Response,value:unknown;
  try{({response,value}=await bounded(async signal=>{
    const response=await fetcher(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body,signal});
    const value=await response.json();if(signal.aborted)throw new Error("controller-io-timeout");
    return {response,value};
  },options));}
  catch(error){if(timedOut(error))throw error;throw new Error("controller-oauth-transport-unavailable");}
  if(!response.ok)throw new Error("controller-oauth-token-rejected");
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("controller-oauth-token-invalid");
  return value as Record<string,unknown>;
}
function validated(next:Record<string,unknown>,old?:Tokens):Tokens {
  if(typeof next.access_token!=="string"||!next.access_token||
    typeof next.expires_in!=="number"||!Number.isFinite(next.expires_in)||next.expires_in<=0||
    (next.scope!==undefined&&next.scope!==SCOPE)||
    (next.refresh_token!==undefined&&(typeof next.refresh_token!=="string"||!next.refresh_token))||
    (!old&&!next.refresh_token))
    throw new Error("controller-oauth-token-invalid");
  return{accessToken:next.access_token,
    ...(next.refresh_token||old?.refreshToken?{refreshToken:String(next.refresh_token??old?.refreshToken)}:{}),
    expiresAtMs:Date.now()+next.expires_in*1000,scope:SCOPE};
}
export function createWindowsControllerRequest(options:WindowsOAuthOptions,initialTokens?:string):AuthenticatedDriveRequest {
  const store=config(options),fetcher=options.fetcher??fetch;
  let refresh:Promise<Tokens>|undefined,cached:Tokens|undefined;
  async function current():Promise<Tokens>{
    if(options.signal?.aborted)throw new Error("controller-io-cancelled");
    const old=cached??tokens(initialTokens??await store.getSecretAsync(KEY,options.signal));initialTokens=undefined;
    if(!old)throw new Error("controller-authentication-required");
    if(old.accessToken&&old.expiresAtMs>Date.now()+60000){cached=old;return old;}
    if(!old.refreshToken)throw new Error("controller-authentication-required");
    if(!refresh)refresh=(async()=>{
      const result=await exchange(fetcher,new URLSearchParams({client_id:options.clientId,refresh_token:old.refreshToken!,grant_type:"refresh_token"}),options);
      const next=validated(result,old);if(options.signal?.aborted)throw new Error("controller-io-cancelled");await store.setSecretAsync(KEY,JSON.stringify(next),options.signal);if(options.signal?.aborted)throw new Error("controller-io-cancelled");cached=next;return next;
    })().finally(()=>{refresh=undefined;});
    return refresh;
  }
  return async(url,init={})=>{
    const target=new URL(url);
    if(target.origin!=="https://www.googleapis.com"||
      !/^\/(?:upload\/)?drive\/v3(?:\/|$)/.test(target.pathname))throw new Error("controller-drive-target-rejected");
    const token=await current(),headers=new Headers(init.headers);headers.set("authorization","Bearer "+token.accessToken);
    let response:Response;
    try{response=await bounded(async signal=>{
      const received=await fetcher(url,{...init,headers,signal});
      const data=await received.arrayBuffer();if(signal.aborted)throw new Error("controller-io-timeout");
      return new Response([204,205,304].includes(received.status)?null:data,
        {status:received.status,statusText:received.statusText,headers:received.headers});
    },options);}
    catch(error){if(timedOut(error))throw error;throw new Error("controller-drive-unavailable");}
    // Preserve provider status for the existing mailbox classifier. In
    // particular a 400/410 expired page cursor needs its established replay path.
    return response;
  };
}
export async function authorizeWindowsController(options:WindowsOAuthOptions&{
  readonly onAuthorizationUrl:(url:string)=>void;readonly timeoutMs?:number;
}):Promise<void> {
  const transaction=new AbortController();const store=config({...options,signal:transaction.signal}),timeout=options.timeoutMs??120000,fetcher=options.fetcher??fetch;
  if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>600000)throw new Error("controller-oauth-timeout-invalid");
  const state=randomBytes(32).toString("base64url"),verifier=randomBytes(64).toString("base64url"),
    challenge=createHash("sha256").update(verifier).digest("base64url");
  let resolveResult!:(value:void)=>void,rejectResult!:(error:Error)=>void;
  const result=new Promise<void>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  let done=false,handling=false,redirect="";
  const complete=(error?:Error)=>{if(done)return;done=true;if(error){transaction.abort();rejectResult(error);}else resolveResult();};
  const server=createServer((req,res)=>{
    if(req.method!=="GET"||!req.url||req.url.length>2048){res.writeHead(400);res.end("Rejected");return;}
    const u=new URL(req.url,"http://127.0.0.1");
    if(u.pathname!=="/callback"||done||handling){res.writeHead(404);res.end("Unavailable");return;}
    handling=true;
    void(async()=>{
      try{
        if(u.searchParams.get("state")!==state||!u.searchParams.get("code")||u.searchParams.has("error"))
          throw new Error("callback-invalid");
        const body=new URLSearchParams({client_id:options.clientId,code:u.searchParams.get("code")!,
          code_verifier:verifier,redirect_uri:redirect,grant_type:"authorization_code"});
        const credential=validated(await exchange(fetcher,body,{...options,signal:transaction.signal}));if(transaction.signal.aborted)throw new Error("controller-io-cancelled");await store.setSecretAsync(KEY,JSON.stringify(credential),transaction.signal);
        res.writeHead(200,{"content-type":"text/plain","cache-control":"no-store"});res.end("BVP Windows controller authorized.");
        complete();
      }catch{res.writeHead(400,{"cache-control":"no-store"});res.end("Authorization rejected.");complete(new Error("controller-oauth-callback-rejected"));}
    })();
  });
  try{
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(options.port??0,"127.0.0.1",()=>{server.off("error",reject);resolve();});});
    const address=server.address();if(!address||typeof address==="string")throw new Error("controller-oauth-listener-invalid");
    redirect=`http://127.0.0.1:${address.port}/callback`;
    const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
    for(const [name,value] of Object.entries({client_id:options.clientId,redirect_uri:redirect,response_type:"code",
      scope:SCOPE,state,code_challenge:challenge,code_challenge_method:"S256",access_type:"offline",
      prompt:"consent",include_granted_scopes:"false"}))url.searchParams.set(name,value);
    options.onAuthorizationUrl(url.toString());
    const timer=setTimeout(()=>complete(new Error("controller-oauth-timeout")),timeout);
    try{await result;}finally{clearTimeout(timer);}
  }finally{server.close();}
}
