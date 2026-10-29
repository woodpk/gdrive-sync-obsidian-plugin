/** Validation-only BVP controller CLI. Explicit owner invocation; never dispatches
 * physical commands or creates authority leases. Real Drive calls are prohibited
 * until separate release/physical authorization. */
import { open, mkdir, rm } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { authorizeWindowsController, createWindowsControllerRequest, WindowsDpapiSecrets, type WindowsOAuthOptions } from "./windows-controller-auth";
import { runWindowsDiagnosticControllerOnce } from "./windows-diagnostic-controller";

export interface WindowsControllerCycleOptions extends WindowsOAuthOptions {
  readonly relayRoot:string;readonly deviceId:string;readonly cycleTimeoutMs?:number;
}
export async function withWindowsControllerProcessLock<T>(root:string,work:()=>Promise<T>):Promise<T>{
  if(process.platform!=="win32"||!isAbsolute(root)||!/[\\/]\.bvp-relay$/.test(root))throw new Error("controller-root-invalid");
  await mkdir(root,{recursive:true});
  const path=join(root,"controller-owner.lock");
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
async function boundedCycle(options:WindowsControllerCycleOptions){
  const timeout=options.cycleTimeoutMs??30000;
  if(!Number.isSafeInteger(timeout)||timeout<100||timeout>120000)throw new Error("controller-cycle-timeout-invalid");
  const stop=new AbortController(),cancel=()=>stop.abort();
  options.signal?.addEventListener("abort",cancel,{once:true});
  if(options.signal?.aborted)cancel();
  const timer=setTimeout(cancel,timeout);
  try{const result=await cycleCore({...options,signal:stop.signal});
    return stop.signal.aborted?{status:"unavailable" as const,reason:options.signal?.aborted?"controller-io-cancelled":"controller-io-timeout"}:result;}
  catch(error){
    if(stop.signal.aborted||error instanceof Error&&/^controller-io-(?:timeout|cancelled)$/.test(error.message))
      return {status:"unavailable" as const,reason:options.signal?.aborted?"controller-io-cancelled":"controller-io-timeout"};
    throw error;
  }finally{clearTimeout(timer);options.signal?.removeEventListener("abort",cancel);}
}
export async function runWindowsControllerCycle(options:WindowsControllerCycleOptions){
  return withWindowsControllerProcessLock(options.relayRoot,()=>boundedCycle(options));
}
function value(args:readonly string[],key:string):string {
  const position=args.indexOf(key),found=position<0?undefined:args[position+1];
  if(!found||found.startsWith("--")||args.indexOf(key,position+1)>=0)throw new Error("controller-cli-argument-invalid");
  return found;
}
function optionalMs(args:readonly string[],key:string,maximum:number):number|undefined{
  if(!args.includes(key))return undefined;
  const n=Number(value(args,key));if(!Number.isSafeInteger(n)||n<50||n>maximum)throw new Error("controller-cli-timeout-invalid");
  return n;
}
async function main(args:readonly string[]):Promise<void>{
  if(process.platform!=="win32")throw new Error("controller-host-windows-only");
  const mode=args[0];
  if(!["--authorize","--once","--serve"].includes(mode??""))throw new Error("controller-cli-mode-invalid");
  const clientId=value(args,"--client-id"),tokenFile=value(args,"--token-file"),requestTimeoutMs=optionalMs(args,"--request-timeout-ms",60000);
  if(!isAbsolute(tokenFile))throw new Error("controller-token-path-invalid");
  if(mode==="--authorize"){
    const port=Number(value(args,"--port"));
    if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error("controller-oauth-port-invalid");
    await authorizeWindowsController({clientId,tokenFile,port,requestTimeoutMs,onAuthorizationUrl:url=>{
      // PKCE URL, not an access/refresh token; only present on owner's local console.
      process.stdout.write("BVP_CONTROLLER_AUTHORIZATION_URL="+url+"\n");
    }});
    process.stdout.write("BVP_CONTROLLER_AUTHORIZED\n");
    return;
  }
  const relayRoot=value(args,"--relay-root"),deviceId=value(args,"--device-id");
  const cycleTimeoutMs=optionalMs(args,"--cycle-timeout-ms",120000),options={clientId,tokenFile,relayRoot,deviceId,requestTimeoutMs,cycleTimeoutMs};
  if(mode==="--once"){
    const outcome=await runWindowsControllerCycle(options);
    process.stdout.write("BVP_WINDOWS_CONTROLLER="+outcome.status+"\n");
    if(outcome.reason)process.stdout.write("BVP_WINDOWS_CONTROLLER_REASON="+outcome.reason+"\n");
    if(outcome.status!=="ok")process.exitCode=1;
    return;
  }
  const interval=Number(value(args,"--interval-ms"));
  if(!Number.isSafeInteger(interval)||interval<1000||interval>60000)throw new Error("controller-interval-invalid");
  let stopping=false;const shutdown=new AbortController();
  const stop=()=>{stopping=true;shutdown.abort();};
  process.once("SIGINT",stop);process.once("SIGTERM",stop);
  try{await withWindowsControllerProcessLock(relayRoot,async()=>{
    // An unleased controller may legitimately start before the live runner.
    // Fail closed for every unsuccessful cycle and keep the singleton locked
    // through bounded outage recovery. Never invent an ACTIVE admission.
    let previous="";
    while(!stopping){
      let status="unavailable";
      try{status=(await boundedCycle({...options,signal:shutdown.signal})).status;}catch{}
      if(status!==previous){
        process.stdout.write("BVP_WINDOWS_CONTROLLER="+status+"\n");
        previous=status;
      }
      if(stopping)break;
      await new Promise<void>(resolve=>{
        const done=()=>{clearTimeout(timer);shutdown.signal.removeEventListener("abort",done);resolve();};
        const timer=setTimeout(done,interval);
        shutdown.signal.addEventListener("abort",done,{once:true});
        if(shutdown.signal.aborted)done();
      });
    }
  });}finally{process.off("SIGINT",stop);process.off("SIGTERM",stop);}
}
if(require.main===module)void main(process.argv.slice(2)).catch(()=>{
  // Never disclose credential, Drive response, controller file path or device identity.
  process.stderr.write("BVP_WINDOWS_CONTROLLER_UNAVAILABLE\n");process.exitCode=1;
});
