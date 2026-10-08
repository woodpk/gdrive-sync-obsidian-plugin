import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { deepEqual, equal, match, notEqual, ok } from "node:assert/strict";
import { test } from "node:test";
import { Script } from "node:vm";

import {
  buildValidationArtifact,
  type ValidationArtifactBuildResult,
} from "../src/live-device/build-validation-artifact";
import {
  BVP_MAILBOX_RUNTIME_GLOBAL,
  BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL,
  BVP_VALIDATION_BUILD_GLOBAL,
} from "../src/live-device/validation-entrypoint";

const repositoryRoot = resolve(process.cwd());
const acceptedProductionSha256 =
  "c139115f8eb9b83792818ed0ec832240fdf0b0aa6dbf593ada54e68b7fc29390";

function sha256(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function runNodeScript(relativePath: string): string {
  const result = spawnSync(process.execPath, [relativePath], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function readIdentity(result: ValidationArtifactBuildResult): any {
  return JSON.parse(readFileSync(result.identityPath, "utf8"));
}

function evaluateValidationArtifact(result: ValidationArtifactBuildResult): any {
  const source = readFileSync(result.artifactPath, "utf8");
  const requested: string[] = [];
  function Placeholder() {}
  const obsidianStub = new Proxy(
    {
      Platform: { isDesktopApp: false, isMobile: true },
      Plugin: class {},
      PluginSettingTab: class {},
      Modal: class {},
      Notice: class {},
      requestUrl: async () => ({ status: 200, json: {}, text: "", headers: {} }),
    },
    { get: (target, property) => (property in target ? target[property as keyof typeof target] : Placeholder) },
  );
  const moduleBox: { exports: any } = { exports: {} };
  const context: any = {
    module: moduleBox,
    exports: moduleBox.exports,
    require(specifier: string) {
      requested.push(specifier);
      if (specifier === "obsidian") return obsidianStub;
      throw new Error(`unexpected eager validation-artifact external: ${specifier}`);
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    TextEncoder,
    TextDecoder,
    URL,
    URLSearchParams,
    AbortController,
    crypto: globalThis.crypto,
  };
  context.globalThis = context;
  new Script(source, { filename: result.artifactPath }).runInNewContext(context);
  ok(requested.length > 0);
  equal(requested.every(specifier => specifier === "obsidian"), true);
  equal(typeof moduleBox.exports.default, "function");
  return { context, exports: moduleBox.exports };
}


async function exerciseInstalledAgent(result: ValidationArtifactBuildResult, desktop: boolean): Promise<void> {
  const source=readFileSync(result.artifactPath,"utf8"), values=new Map<string,string>(), dirs=new Set<string>(), storage=new Map<string,string>();
  const root=".obsidian/plugins/brain-google-drive-sync/.bvp-relay",runId=desktop?"run-desktop":"run-mobile",deviceId=desktop?"device-desktop":"device-mobile";
  dirs.add(".obsidian");dirs.add(".obsidian/plugins");dirs.add(".obsidian/plugins/brain-google-drive-sync");dirs.add(root);
  let fixtureWrites=0,productionCalls=0,replacementCalls=0,listCalls=0,intervalCallback:(()=>void)|undefined;
  const adapter:any={
    async exists(p:string){return dirs.has(p)||values.has(p);},async mkdir(p:string){dirs.add(p);},async read(p:string){const v=values.get(p);if(v===undefined)throw new Error("missing");return v;},
    async write(p:string,v:string){values.set(p,v);if(p.includes("BVP-VALIDATION/"))fixtureWrites++;},async readBinary(p:string){return new TextEncoder().encode(values.get(p)??"").buffer;},
    async writeBinary(p:string,v:ArrayBuffer){values.set(p,new TextDecoder().decode(v));if(p.includes("BVP-VALIDATION/"))fixtureWrites++;},async remove(p:string){values.delete(p);},
    async stat(p:string){const v=values.get(p);return v===undefined?null:{type:"file",size:new TextEncoder().encode(v).byteLength};},
    async list(){listCalls++;await Promise.resolve();return{files:[],folders:[]};},async rename(a:string,b:string){const v=values.get(a);if(v!==undefined){values.set(b,v);values.delete(a);}}
  };
  const localStorage={getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>void storage.set(k,v),removeItem:(k:string)=>void storage.delete(k),clear:()=>storage.clear(),key:(i:number)=>[...storage.keys()][i]??null,get length(){return storage.size;}};
  class PluginStub{app:any;manifest:any;constructor(app:any,manifest:any){this.app=app;this.manifest=manifest;}}
  function Placeholder(){}
  const obsidianStub=new Proxy({Platform:{isDesktopApp:desktop,isMobile:!desktop,isMobileApp:!desktop},Plugin:PluginStub,PluginSettingTab:class{},Modal:class{},Notice:class{},requestUrl:async()=>({status:200,json:{},text:"",headers:{}})},{get:(target,property)=>(property in target?target[property as keyof typeof target]:Placeholder)});
  const box:{exports:any}={exports:{}},context:any={module:box,exports:box.exports,require:(specifier:string)=>specifier==="obsidian"?obsidianStub:(()=>{throw new Error("unexpected external "+specifier)})(),console,TextEncoder,TextDecoder,URL,URLSearchParams,AbortController,crypto:globalThis.crypto,localStorage,setTimeout,clearTimeout,setInterval:(callback:()=>void)=>{intervalCallback=callback;return 1;},clearInterval:()=>undefined};context.globalThis=context;context.window=context;
  new Script(source,{filename:result.artifactPath}).runInNewContext(context);
  const PluginClass=box.exports.default,base=Object.getPrototypeOf(PluginClass.prototype),app={vault:{configDir:".obsidian",adapter},secretStorage:{getSecret(){return undefined;},setSecret(){},deleteSecret(){}}},manifest={id:"brain-google-drive-sync"};
  const production={async previewManual(){return undefined;},async previewVerifyReconcile(){return undefined;},async executePlan(){return{status:"accepted"};},async pause(){productionCalls++;return{status:"accepted"};},async resume(){return{status:"accepted"};},async cancelActiveSync(){return{status:"accepted"};},currentStatus(){return{kind:"idle-ready"};},latestProductionRunReceipt(){return undefined;}};
  base.onload=async function(){};base.onunload=async function(){};base.loadData=async function(){return{settings:{oauthClientId:"client",oauthRedirectUri:"https://example.invalid/callback",deviceIdentity:deviceId}}};base.productionVerificationControl=function(){return production};
  const fixture={runId,deviceId,sequence:1,commandId:"cmd-1",kind:"fixture-put",path:"artifact.md",content:{type:"text",text:"hello"}},control={runId,deviceId,sequence:2,commandId:"cmd-2",kind:"production-control",action:"pause"};
  const plugin=new PluginClass(app,manifest);await plugin.onload();const runtime:any=context[BVP_MAILBOX_RUNTIME_GLOBAL];ok(runtime);equal(runtime.deviceId,deviceId);ok(intervalCallback);intervalCallback!();intervalCallback!();await new Promise(resolve=>setTimeout(resolve,0));equal(listCalls,desktop?2:0);runtime.mailbox.activeRun=async()=>runId;runtime.mailbox.resultFor=async()=>undefined;
  let current:any=fixture,last:any,published=0;runtime.mailbox.commands=async()=>[current];runtime.mailbox.publishResult=async(value:any)=>{last=value;published++;};await Promise.all([runtime.pollDeviceOnce(),runtime.pollDeviceOnce()]);equal(runtime.currentRunId(),runId);equal(last.classification,"fixture-verified");equal(last.validationBuild.sourceCommit,result.sourceCommit);equal(fixtureWrites,1);equal(published,1);
  current=control;await runtime.pollDeviceOnce();equal(last.classification,"production-control-accepted");equal(productionCalls,1);
  // The production controller can be replaced after initial mailbox installation.
  // The next real mailbox command must reach the current controller, not the stale one.
  const replacement={...production,async pause(){replacementCalls++;return{status:"accepted"};}};
  base.productionVerificationControl=function(){return replacement};
  const swappedControl={...control,sequence:3,commandId:"cmd-3"};
  current=swappedControl;await runtime.pollDeviceOnce();equal(last.classification,"production-control-accepted");equal(replacementCalls,1);equal(productionCalls,1);
  await plugin.onunload();
  const restarted=new PluginClass(app,manifest);await restarted.onload();const after:any=context[BVP_MAILBOX_RUNTIME_GLOBAL];after.mailbox.activeRun=async()=>runId;after.mailbox.resultFor=async()=>undefined;let replay:any;after.mailbox.commands=async()=>[swappedControl];after.mailbox.publishResult=async(value:any)=>{replay=value};await after.pollDeviceOnce();equal(replay.replayed,true);equal(productionCalls,1);equal(replacementCalls,1);equal(fixtureWrites,1);await restarted.onunload();
}

test("S08B validation artifact is separate, production-faithful, traceable, and disposable", async () => {
  runNodeScript("scripts/build.mjs");
  runNodeScript("scripts/verify-build.mjs");

  const productionPath = resolve(repositoryRoot, "main.js");
  const productionBytes = readFileSync(productionPath);
  const productionText = productionBytes.toString("utf8");
  const productionHash = sha256(productionBytes);
  equal(productionHash, acceptedProductionSha256);
  equal(productionText.includes(BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL), false);
  equal(productionText.includes(BVP_MAILBOX_RUNTIME_GLOBAL), false);
  equal(productionText.includes("BRAIN BVP Mailbox"), false);

  const first = await buildValidationArtifact(repositoryRoot);
  ok(existsSync(first.artifactPath));
  ok(existsSync(first.manifestPath));
  ok(existsSync(first.identityPath));
  match(first.sourceCommit, /^[0-9a-f]{40}$/);
  notEqual(first.artifactSha256, productionHash);
  const validationText = readFileSync(first.artifactPath, "utf8");
  equal(validationText.includes(BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL), true);
  equal(validationText.includes(BVP_MAILBOX_RUNTIME_GLOBAL), true);
  equal(validationText.includes("BRAIN BVP Mailbox"), true);
  equal(readFileSync(first.manifestPath, "utf8"), readFileSync(resolve(repositoryRoot, "manifest.json"), "utf8"));
  deepEqual(first.testPlatformInputs, [
    "test-platform/src/live-device/device-command-agent.ts",
    "test-platform/src/live-device/drive-mailbox.ts",
    "test-platform/src/live-device/validation-entrypoint.ts",
  ]);

  const identity = readIdentity(first);
  equal(identity.sourceCommit, first.sourceCommit);
  equal(identity.artifactSha256, first.artifactSha256);
  equal(identity.artifactSize, first.artifactSize);
  equal(identity.productionEntrypoint, "src/main.ts");
  equal(identity.validationEntrypoint, "test-platform/src/live-device/validation-entrypoint.ts");
  deepEqual(identity.testPlatformInputs, first.testPlatformInputs);

  const evaluated = evaluateValidationArtifact(first);
  const runtimeIdentity = evaluated.context[BVP_VALIDATION_BUILD_GLOBAL];
  ok(runtimeIdentity);
  equal(runtimeIdentity.schemaVersion, 1);
  equal(runtimeIdentity.sourceCommit, first.sourceCommit);
  equal(runtimeIdentity.sentinel, BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL);
  equal(evaluated.context[BVP_MAILBOX_RUNTIME_GLOBAL], undefined);
  ok(evaluated.exports);
  await exerciseInstalledAgent(first,false);
  await exerciseInstalledAgent(first,true);

  rmSync(first.outputDirectory, { recursive: true, force: true });
  equal(existsSync(first.outputDirectory), false);
  runNodeScript("scripts/verify-build.mjs");
  equal(sha256(readFileSync(productionPath)), productionHash);

  const second = await buildValidationArtifact(repositoryRoot);
  equal(second.sourceCommit, first.sourceCommit);
  equal(second.artifactSha256, first.artifactSha256);
  equal(second.manifestSha256, first.manifestSha256);
  deepEqual(second.testPlatformInputs, first.testPlatformInputs);
});
