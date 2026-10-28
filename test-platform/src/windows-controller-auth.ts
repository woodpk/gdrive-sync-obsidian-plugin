/** Windows-only, validation-only Google Drive OAuth PKCE. No imports from shipping
 * production sources and no tokens in argv, URLs, logs or unencrypted files. */
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import type { AuthenticatedDriveRequest } from "./live-device/drive-mailbox";

const KEY="brain-gdrive-oauth-tokens";
const SCOPE="https://www.googleapis.com/auth/drive.file";
const TOKEN_URL="https://oauth2.googleapis.com/token";
interface Tokens {accessToken:string;refreshToken?:string;expiresAtMs:number;scope:string;}
export interface WindowsOAuthOptions {readonly clientId:string;readonly tokenFile:string;readonly port?:number;readonly fetcher?:typeof fetch;}
function dpapi(value:string,mode:"Protect"|"Unprotect"):string {
  const script=`$ErrorActionPreference='Stop';$b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());$o=[Security.Cryptography.ProtectedData]::${mode}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($o))`;
  const child=spawnSync("pwsh.exe",["-NoLogo","-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from(script,"utf16le").toString("base64")],{
    input:mode==="Protect"?Buffer.from(value,"utf8").toString("base64"):value,
    encoding:"utf8",windowsHide:true,maxBuffer:1048576,timeout:10000
  });
  if(child.status!==0||child.error||!child.stdout.trim()||!/^[A-Za-z0-9+/=]+$/.test(child.stdout.trim()))throw new Error("controller-dpapi-unavailable");
  return mode==="Protect"?child.stdout.trim():Buffer.from(child.stdout.trim(),"base64").toString("utf8");
}
export class WindowsDpapiSecrets {
  constructor(private readonly file:string){if(process.platform!=="win32"||!isAbsolute(file))throw new Error("controller-token-location-invalid");}
  private check(id:string){if(id!==KEY)throw new Error("controller-token-id-invalid");}
  getSecret(id:string):string|null {
    this.check(id);if(!existsSync(this.file))return null;
    try{return dpapi(readFileSync(this.file,"utf8"),"Unprotect");}
    catch{throw new Error("controller-token-unprotect-failed");}
  }
  setSecret(id:string,value:string):void {
    this.check(id);mkdirSync(dirname(this.file),{recursive:true});
    const temp=this.file+"."+randomBytes(8).toString("hex")+".tmp";
    try{writeFileSync(temp,dpapi(value,"Protect"),{encoding:"utf8",mode:0o600,flag:"wx"});renameSync(temp,this.file);}
    finally{rmSync(temp,{force:true});}
  }
  deleteSecret(id:string):void {this.check(id);rmSync(this.file,{force:true});}
}
function config(options:WindowsOAuthOptions){
  if(!/^[A-Za-z0-9._:-]{4,200}$/.test(options.clientId)||!Number.isSafeInteger(options.port??0)||
    (options.port??0)<0||(options.port??0)>65535)throw new Error("controller-oauth-config-invalid");
  return new WindowsDpapiSecrets(options.tokenFile);
}
function tokens(store:WindowsDpapiSecrets):Tokens|undefined {
  const raw=store.getSecret(KEY);if(!raw)return undefined;
  let value:Partial<Tokens>;
  try{value=JSON.parse(raw) as Partial<Tokens>;}catch{throw new Error("controller-token-invalid");}
  if(typeof value.accessToken!=="string"||!Number.isFinite(value.expiresAtMs)||
    value.scope!==SCOPE||(value.refreshToken!==undefined&&typeof value.refreshToken!=="string"))
    throw new Error("controller-token-invalid");
  return value as Tokens;
}
async function exchange(fetcher:typeof fetch,body:URLSearchParams):Promise<Record<string,unknown>> {
  let response:Response;
  try{response=await fetcher(TOKEN_URL,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});}
  catch{throw new Error("controller-oauth-transport-unavailable");}
  if(!response.ok)throw new Error("controller-oauth-token-rejected");
  let value:unknown;
  try{value=await response.json();}catch{throw new Error("controller-oauth-token-invalid");}
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
export function createWindowsControllerRequest(options:WindowsOAuthOptions):AuthenticatedDriveRequest {
  const store=config(options),fetcher=options.fetcher??fetch;
  let refresh:Promise<Tokens>|undefined;
  async function current():Promise<Tokens>{
    const old=tokens(store);
    if(!old)throw new Error("controller-authentication-required");
    if(old.accessToken&&old.expiresAtMs>Date.now()+60000)return old;
    if(!old.refreshToken)throw new Error("controller-authentication-required");
    if(!refresh)refresh=(async()=>{
      const result=await exchange(fetcher,new URLSearchParams({client_id:options.clientId,refresh_token:old.refreshToken!,grant_type:"refresh_token"}));
      const next=validated(result,old);store.setSecret(KEY,JSON.stringify(next));return next;
    })().finally(()=>{refresh=undefined;});
    return refresh;
  }
  return async(url,init={})=>{
    const target=new URL(url);
    if(target.origin!=="https://www.googleapis.com"||
      !/^\/(?:upload\/)?drive\/v3(?:\/|$)/.test(target.pathname))throw new Error("controller-drive-target-rejected");
    const token=await current(),headers=new Headers(init.headers);headers.set("authorization","Bearer "+token.accessToken);
    let response:Response;
    try{response=await fetcher(url,{...init,headers});}
    catch{throw new Error("controller-drive-unavailable");}
    if(response.status===401)throw new Error("controller-authentication-required");
    if(!response.ok)throw new Error("controller-drive-unavailable");
    return response;
  };
}
export async function authorizeWindowsController(options:WindowsOAuthOptions&{
  readonly onAuthorizationUrl:(url:string)=>void;readonly timeoutMs?:number;
}):Promise<void> {
  const store=config(options),timeout=options.timeoutMs??120000,fetcher=options.fetcher??fetch;
  if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>600000)throw new Error("controller-oauth-timeout-invalid");
  const state=randomBytes(32).toString("base64url"),verifier=randomBytes(64).toString("base64url"),
    challenge=createHash("sha256").update(verifier).digest("base64url");
  let resolveResult!:(value:void)=>void,rejectResult!:(error:Error)=>void;
  const result=new Promise<void>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  let done=false,handling=false,redirect="";
  const complete=(error?:Error)=>{if(done)return;done=true;if(error)rejectResult(error);else resolveResult();};
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
        store.setSecret(KEY,JSON.stringify(validated(await exchange(fetcher,body))));
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
