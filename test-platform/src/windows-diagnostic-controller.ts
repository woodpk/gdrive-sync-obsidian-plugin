/** Validation-only Windows BVP controller assembly. No credential acquisition is performed
 * here: the trusted Windows operator must inject an already authenticated BVP request
 * from the existing approved transport. This is not a browser bundle or a new CLI.
 */
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { createDriveCommandMailbox, type AuthenticatedDriveRequest } from "./live-device/drive-mailbox";
import { createWindowsMailboxRelayWithOSLock } from "./live-device/live-scenario-executor";

export interface WindowsDiagnosticControllerOptions {
  readonly relayRoot: string;
  readonly deviceId: string;
}
export interface WindowsDiagnosticControllerResult {
  readonly status: "ok" | "unavailable";
  readonly reason?: string;
}

/** One bounded cycle, not a physical run, scheduler, OAuth provider or PHX-CI substitute. */
export async function runWindowsDiagnosticControllerOnce(
  request: AuthenticatedDriveRequest,
  options: WindowsDiagnosticControllerOptions,
): Promise<WindowsDiagnosticControllerResult> {
  if (process.platform !== "win32") throw new Error("bvp-windows-controller-host-required");
  if (!request || typeof request !== "function" ||
      !isAbsolute(options.relayRoot) ||
      !/[\\/]\.bvp-relay$/.test(options.relayRoot) ||
      !/^[a-zA-Z0-9._:-]{1,128}$/.test(options.deviceId))
    throw new Error("bvp-windows-controller-configuration-invalid");
  const adapter = {
    exists: async (path:string) => stat(path).then(()=>true,()=>false),
    mkdir: async (path:string) => {await mkdir(path,{recursive:true});},
    list: async (path:string) => {
      const entries=await readdir(path,{withFileTypes:true});
      return {files:entries.filter(e=>e.isFile()).map(e=>join(path,e.name)),
        folders:entries.filter(e=>e.isDirectory()).map(e=>join(path,e.name))};
    },
    read: (path:string) => readFile(path,"utf8"),
    write: async (path:string,value:string) => {await writeFile(path,value,"utf8");},
    rename: async (from:string,to:string) => {await rename(from,to);},
    remove: async (path:string) => {await rm(path,{force:true});},
  };
  // The relay wrapper supplies the real Node OS-exclusive lock. Browser adapters
  // must never receive or emulate this capability.
  const mailbox=createDriveCommandMailbox(request);
  const relay=createWindowsMailboxRelayWithOSLock(mailbox,adapter,options.relayRoot);
  const observed=await relay.pumpOnce();
  return {status:observed.status,...(observed.reason?{reason:observed.reason}:{})};
}
