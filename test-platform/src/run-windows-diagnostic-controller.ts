/** Validation-only BVP controller CLI. Explicit owner invocation; never dispatches
 * physical commands or creates authority leases. Real Drive calls are prohibited
 * until separate release/physical authorization. */
import { open, mkdir, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets, type WindowsOAuthOptions } from "./windows-controller-auth";
import { runWindowsDiagnosticControllerOnce } from "./windows-diagnostic-controller";

export interface WindowsControllerCycleOptions extends WindowsOAuthOptions {
  readonly relayRoot:string;readonly deviceId:string;
}
export async function withWindowsControllerProcessLock<T>(root:string,work:()=>Promise<T>):Promise<T>{
  if(process.platform!=="win32"||!isAbsolute(root)||!/[\\/]\.bvp-relay$/.test(root))throw new Error("controller-root-invalid");
  const dir=join(root,"controller-authority");
  await mkdir(dir,{recursive:true});
  const path=join(dir,"controller-owner.lock");
  let handle:Awaited<ReturnType<typeof open>>;
  try{handle=await open(path,"wx",0o600);}catch{throw new Error("controller-owner-busy");}
  try{return await work();}finally{await handle.close();await rm(path,{force:true});}
}
async function cycleCore(options:WindowsControllerCycleOptions){
  const tokens=new WindowsDpapiSecrets(options.tokenFile).getSecret("brain-gdrive-oauth-tokens");
  if(!tokens)return{status:"unavailable" as const,reason:"controller-authentication-required"};
  const request=createWindowsControllerRequest(options);
  return runWindowsDiagnosticControllerOnce(request,options);
}
export async function runWindowsControllerCycle(options:WindowsControllerCycleOptions){
  return withWindowsControllerProcessLock(options.relayRoot,()=>cycleCore(options));
}
function value(args:readonly string[],key:string):string {
  const position=args.indexOf(key),found=position<0?undefined:args[position+1];
  if(!found||found.startsWith("--")||args.indexOf(key,position+1)>=0)throw new Error("controller-cli-argument-invalid");
  return found;
}
async function main(args:readonly string[]):Promise<void>{
  if(process.platform!=="win32")throw new Error("controller-host-windows-only");
  const mode=args[0];
  if(!["--authorize","--once","--serve"].includes(mode??""))throw new Error("controller-cli-mode-invalid");
  const clientId=value(args,"--client-id"),tokenFile=value(args,"--token-file");
  if(!isAbsolute(tokenFile))throw new Error("controller-token-path-invalid");
  if(mode==="--authorize"){
    const port=Number(value(args,"--port"));
    if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error("controller-oauth-port-invalid");
    await authorizeWindowsController({clientId,tokenFile,port,onAuthorizationUrl:url=>{
      // PKCE URL, not an access/refresh token; only present on owner's local console.
      process.stdout.write("BVP_CONTROLLER_AUTHORIZATION_URL="+url+"\n");
    }});
    process.stdout.write("BVP_CONTROLLER_AUTHORIZED\n");
    return;
  }
  const relayRoot=value(args,"--relay-root"),deviceId=value(args,"--device-id");
  const options={clientId,tokenFile,relayRoot,deviceId};
  if(mode==="--once"){
    const outcome=await runWindowsControllerCycle(options);
    process.stdout.write("BVP_WINDOWS_CONTROLLER="+outcome.status+"\n");
    if(outcome.status!=="ok")process.exitCode=1;
    return;
  }
  const interval=Number(value(args,"--interval-ms"));
  if(!Number.isSafeInteger(interval)||interval<1000||interval>60000)throw new Error("controller-interval-invalid");
  await withWindowsControllerProcessLock(relayRoot,async()=>{
    for(;;){
      const outcome=await cycleCore(options);
      if(outcome.status!=="ok")throw new Error("controller-cycle-unavailable");
      await new Promise(resolve=>setTimeout(resolve,interval));
    }
  });
}
if(require.main===module)void main(process.argv.slice(2)).catch(()=>{
  // Never disclose credential, Drive response, controller file path or device identity.
  process.stderr.write("BVP_WINDOWS_CONTROLLER_UNAVAILABLE\n");process.exitCode=1;
});
