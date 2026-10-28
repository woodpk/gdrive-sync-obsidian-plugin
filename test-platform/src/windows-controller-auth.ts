/** Windows-only BVP OAuth. Token bytes are encrypted by Windows DPAPI for the
 * current account. Browser/mobile artifacts must never import this module. */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { GoogleOAuthSession, ObsidianSecretStore, type FetchLike } from "../../src/drive/auth";
import { GoogleHttpTransport } from "../../src/drive/transport";
import type { AuthenticatedDriveRequest } from "./live-device/drive-mailbox";

function dpapi(value:string,mode:"Protect"|"Unprotect"):string {
  const script=`$ErrorActionPreference='Stop';$b=[Convert]::FromBase64String([Console]::In.ReadToEnd().Trim());$o=[Security.Cryptography.ProtectedData]::${mode}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($o))`;
  const child=spawnSync("pwsh.exe",["-NoLogo","-NoProfile","-NonInteractive","-EncodedCommand",Buffer.from(script,"utf16le").toString("base64")],{
    input:Buffer.from(value,"utf8").toString("base64"),encoding:"utf8",windowsHide:true,
    maxBuffer:1048576,timeout:10000
  });
  if(child.status!==0||child.error||!child.stdout.trim()||!/^[A-Za-z0-9+/=]+$/.test(child.stdout.trim()))throw new Error("controller-dpapi-unavailable");
  return Buffer.from(child.stdout.trim(),"base64").toString("utf8");
}
export class WindowsDpapiSecrets {
  constructor(private readonly file:string){if(process.platform!=="win32"||!isAbsolute(file))throw new Error("controller-token-location-invalid");}
  private check(id:string){if(id!==GoogleOAuthSession.TOKEN_SECRET_ID)throw new Error("controller-token-id-invalid");}
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
export interface WindowsOAuthOptions {
  readonly clientId:string;readonly tokenFile:string;readonly port?:number;
  readonly fetcher?:FetchLike;
}
function session(options:WindowsOAuthOptions,port:number):GoogleOAuthSession {
  if(!/^[A-Za-z0-9._:-]{4,200}$/.test(options.clientId)||!Number.isSafeInteger(port)||port<0||port>65535)
    throw new Error("controller-oauth-config-invalid");
  return new GoogleOAuthSession({clientId:options.clientId,redirectUri:`http://127.0.0.1:${port}/callback`},
    new ObsidianSecretStore(new WindowsDpapiSecrets(options.tokenFile)),options.fetcher??fetch);
}
export function createWindowsControllerRequest(options:WindowsOAuthOptions):AuthenticatedDriveRequest {
  const oauth=session(options,options.port??0);
  const transport=new GoogleHttpTransport(oauth,options.fetcher??fetch);
  return async(url,init)=>{
    const outcome=await transport.request(url,init);
    if(!outcome.ok)throw new Error(outcome.signal.kind==="authentication-required"?"controller-authentication-required":"controller-drive-unavailable");
    return outcome.value;
  };
}
export async function authorizeWindowsController(options:WindowsOAuthOptions&{
  readonly onAuthorizationUrl:(url:string)=>void;
  readonly timeoutMs?:number;
}):Promise<void> {
  const timeout=options.timeoutMs??120000;
  if(!Number.isSafeInteger(timeout)||timeout<1000||timeout>600000)throw new Error("controller-oauth-timeout-invalid");
  let resolveResult!:(value:void)=>void,rejectResult!:(error:Error)=>void;
  const result=new Promise<void>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  let auth:GoogleOAuthSession|undefined,done=false;
  const complete=(error?:Error)=>{if(done)return;done=true;if(error)rejectResult(error);else resolveResult();};
  const server=createServer((req,res)=>{
    if(req.method!=="GET"||!req.url||req.url.length>2048){res.writeHead(400);res.end("Rejected");return;}
    const url=new URL(req.url,"http://127.0.0.1");
    if(url.pathname!=="/callback"||done){res.writeHead(404);res.end("Unavailable");return;}
    void (async()=>{
      try{
        const completed=await auth!.completeAuthorization({code:url.searchParams.get("code")??undefined,
          state:url.searchParams.get("state")??undefined,error:url.searchParams.get("error")??undefined});
        if(!completed.ok)throw new Error("controller-oauth-callback-rejected");
        res.writeHead(200,{"content-type":"text/plain","cache-control":"no-store"});res.end("BVP Windows controller authorized.");
        complete();
      }catch{res.writeHead(400,{"cache-control":"no-store"});res.end("Authorization rejected.");complete(new Error("controller-oauth-callback-rejected"));}
    })();
  });
  try{
    await new Promise<void>((resolve,reject)=>{server.once("error",reject);server.listen(options.port??0,"127.0.0.1",()=>{server.off("error",reject);resolve();});});
    const address=server.address();if(!address||typeof address==="string")throw new Error("controller-oauth-listener-invalid");
    auth=session(options,address.port);
    const authorization=await auth.beginAuthorization();
    options.onAuthorizationUrl(authorization.url);
    const timer=setTimeout(()=>complete(new Error("controller-oauth-timeout")),timeout);
    try{await result;}finally{clearTimeout(timer);}
  }finally{server.close();auth?.retirePendingOperations();}
}
