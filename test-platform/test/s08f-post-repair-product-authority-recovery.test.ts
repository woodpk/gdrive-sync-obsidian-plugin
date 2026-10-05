// @ts-nocheck
import { test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';

const require = createRequire(__filename);

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && index + 1 < process.argv.length ? process.argv[index + 1] : fallback;
}

const vaultPath = process.env.BVP_S08F_VAULT_PATH || 'D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b';
const repoWorktree = process.cwd();
const evidenceDir = path.join(repoWorktree, '.phx-ci', 's08f-physical-authority-recovery');
const configuredDebugPort = Number(process.env.BVP_S08F_DEBUG_PORT || '63311');
const sourceCommit = process.env.BVP_S08F_SOURCE_COMMIT || '57e5be079ded16ba50b4f95c49f78a9d90b47f3f';
const branchHead = process.env.BVP_S08F_BRANCH_HEAD || '';
const oldRunId = 's08f-desktop-canary-4f9c69c';
const retryRunId = 's08f-desktop-canary-4f9c69c-r2';
const scenarioId = 's08f-desktop-live-canary-r2';
const deviceId = 'windows-brain-patrick';
const fixtureRoot = 'BVP-VALIDATION/s08f-desktop-canary-4f9c69c';
const canaryRelative = 'canary.md';
const originalCanarySourceCommit = 'e1067f5159a316f328c492837b8c6ff59e08d226';
const canaryText = `BVP S08F desktop live canary\nsource=${originalCanarySourceCommit}\n`;
const canaryBytes = Buffer.from(canaryText, 'utf8');
const canaryHash = createHash('sha256').update(canaryBytes).digest('hex');
const expectedCanaryHash = 'db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d';
const expectedValidationHash = '6c676900aaaf4aaa3417215d1eda2c16e578822715536ef1ffc0ca8741ffc9cf';
const expectedProductionHash = '550ea2de0b0db90b52270bb770818cf5cd2c2ea560636cb34af0fa3138a43477';
const expectedProductionSize = 886635;
const pluginDir = vaultPath ? path.join(vaultPath, '.obsidian', 'plugins', 'brain-google-drive-sync') : '';
const relayRoot = pluginDir ? path.join(pluginDir, '.bvp-relay') : '';
const stateDir = relayRoot ? path.join(relayRoot, 'device-state') : '';
const oldStatePath = stateDir ? path.join(stateDir, `${oldRunId}--${deviceId}.json`) : '';
const retryStatePath = stateDir ? path.join(stateDir, `${retryRunId}--${deviceId}.json`) : '';
const canaryPath = vaultPath ? path.join(vaultPath, ...fixtureRoot.split('/'), canaryRelative) : '';
const probeRelative = 'duplicate-probe.md';
const probePath = vaultPath ? path.join(vaultPath, ...fixtureRoot.split('/'), probeRelative) : '';
const probeText = 'S08F duplicate replay probe\n';
const probeHash = createHash('sha256').update(Buffer.from(probeText, 'utf8')).digest('hex');

const stages = [];
let target;
let physicalStatus = 'BLOCKED';
let classification = 'precondition-blocked';
let primaryReason = '';
let attempt1SafeState = null;
let lifecycleEvidence = null;
let scenarioResult = null;
let safetyResults = null;
let buildIdentity = null;
let validationIdentity = null;
let restoredProduction = null;

function record(name, status, classificationValue, summary, details = undefined) {
  const stage = { name, status, classification: classificationValue, summary, ...(details === undefined ? {} : { details }) };
  stages.push(stage);
  console.log(`[${status}] ${name}: ${summary}`);
  return stage;
}

function fail(status, cls, reason) {
  physicalStatus = status;
  classification = cls;
  primaryReason = reason;
  throw new Error(`S08F_STOP:${status}:${cls}:${reason}`);
}

async function exists(file) {
  try { await fs.stat(file); return true; } catch { return false; }
}

async function sha256File(file) {
  const bytes = await fs.readFile(file);
  return createHash('sha256').update(bytes).digest('hex');
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalized(value) {
  return String(value ?? '').replace(/\\/g, '/').toLowerCase();
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}


function pwshPath() {
  return process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe') : 'pwsh';
}

function obsidianExeCandidates() {
  return [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs', 'Obsidian', 'Obsidian.exe') : '',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Obsidian', 'Obsidian.exe') : '',
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Obsidian', 'Obsidian.exe') : '',
  ].filter(Boolean);
}

async function findObsidianExe() {
  for (const candidate of obsidianExeCandidates()) if (await exists(candidate)) return candidate;
  return undefined;
}

function inspectObsidianRuntime() {
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "$items=@(Get-CimInstance Win32_Process -Filter \"Name='Obsidian.exe'\" | Select-Object ProcessId,ParentProcessId,CommandLine)",
    "$pids=@($items | ForEach-Object { [int]$_.ProcessId })",
    "$windows=@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object Id,MainWindowTitle)",
    "$listeners=@()",
    "if(Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue){ $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $pids -contains [int]$_.OwningProcess } | Select-Object LocalAddress,LocalPort,OwningProcess) }",
    "[pscustomobject]@{processes=$items;windows=$windows;listeners=$listeners}|ConvertTo-Json -Depth 6 -Compress"
  ].join(';');
  const result = spawnSync(pwshPath(), ['-NoProfile','-NonInteractive','-Command',script], { encoding:'utf8', windowsHide:true });
  if (result.status !== 0) {
    return { ok:false, error:String(result.stderr || result.stdout || '').trim(), processes:[], windows:[], listeners:[] };
  }
  try {
    const value = JSON.parse(String(result.stdout || '{}').trim() || '{}');
    const asArray = input => input === undefined || input === null ? [] : Array.isArray(input) ? input : [input];
    return { ok:true, processes:asArray(value.processes), windows:asArray(value.windows), listeners:asArray(value.listeners) };
  } catch (error) {
    return { ok:false, error:`Unable to parse Obsidian runtime snapshot: ${error}`, processes:[], windows:[], listeners:[] };
  }
}

async function allocateLoopbackPort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function launchDebugEnabledDisposableObsidian() {
  const executable = await findObsidianExe();
  if (!executable) return { ok:false, classification:'obsidian-executable-unavailable', reason:'Obsidian.exe was not found in approved install locations.' };
  const port = await allocateLoopbackPort();
  let child;
  try {
    child = spawn(executable, ['--remote-debugging-address=127.0.0.1', `--remote-debugging-port=${port}`], {
      detached:true, stdio:'ignore', windowsHide:false,
    });
    const launchError = await new Promise(resolve => {
      let settled = false;
      const finish = value => { if (!settled) { settled = true; resolve(value); } };
      child.once('error', error => finish(error));
      child.once('spawn', () => globalThis.setTimeout(() => finish(null), 250));
    });
    if (launchError) {
      return { ok:false, classification:'obsidian-process-launch-failed', reason:launchError instanceof Error?launchError.message:String(launchError), executable, port };
    }
    child.unref();
  } catch (error) {
    return { ok:false, classification:'obsidian-process-launch-failed', reason:error instanceof Error?error.message:String(error), executable, port };
  }
  await new Promise(resolve => setTimeout(resolve, 1200));
  const vaultUri = `obsidian://open?path=${encodeURIComponent(vaultPath)}`;
  const openResult = spawnSync(pwshPath(), ['-NoProfile','-NonInteractive','-Command',`Start-Process ${psQuote(vaultUri)}`], { encoding:'utf8', windowsHide:true });
  if (openResult.status !== 0) {
    return { ok:false, classification:'disposable-vault-open-failed', reason:String(openResult.stderr || openResult.stdout || '').trim(), executable, port, pid:child.pid };
  }
  const deadline = Date.now() + 45000;
  let lastError = '';
  while (Date.now() < deadline) {
    try {
      const match = await findRenderer([port]);
      return { ok:true, executable, port, pid:child.pid, target:match };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
  return { ok:false, classification:'devtools-bootstrap-timeout', reason:lastError || 'No disposable-vault renderer became reachable.', executable, port, pid:child.pid };
}

async function cdpEval(webSocketUrl, expression, timeoutMs = 20000) {
  return await new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketUrl);
    const requestId = 1;
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('CDP Runtime.evaluate timed out.'));
    }, timeoutMs);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ id: requestId, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
    });
    ws.addEventListener('message', event => {
      let payload;
      try { payload = JSON.parse(String(event.data)); } catch { return; }
      if (payload.id !== requestId) return;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (payload.error) return reject(new Error(`CDP error: ${JSON.stringify(payload.error)}`));
      if (payload.result?.exceptionDetails) return reject(new Error(`Renderer exception: ${payload.result.exceptionDetails.text ?? 'unknown'}`));
      resolve(payload.result?.result?.value);
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error('CDP WebSocket error.'));
    });
  });
}

async function rendererSnapshot(candidate) {
  const expression = `(() => ({ vault: typeof globalThis.app?.vault?.adapter?.getBasePath === 'function' ? globalThis.app.vault.adapter.getBasePath() : '', visibility: globalThis.document?.visibilityState ?? 'unknown', sourceCommit: globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit ?? null, identity: globalThis.__BRAIN_BVP_VALIDATION_BUILD__ ?? null }))()`;
  return await cdpEval(candidate.webSocketDebuggerUrl, expression);
}

function discoverObsidianDebugPorts(runtime = inspectObsidianRuntime()) {
  const ports = new Set();
  for (const item of runtime.processes ?? []) {
    const line = String(item.CommandLine ?? item.commandLine ?? '');
    for (const match of line.matchAll(/--remote-debugging-port(?:=|\\s+)(\\d{2,5})/g)) ports.add(Number(match[1]));
  }
  for (const listener of runtime.listeners ?? []) ports.add(Number(listener.LocalPort ?? listener.localPort));
  return [...ports].filter(value => Number.isInteger(value) && value > 0 && value <= 65535).sort((a,b) => a-b);
}

async function findRenderer(extraPorts = []) {
  const runtime = inspectObsidianRuntime();
  const ports = [...new Set([configuredDebugPort, ...extraPorts, ...discoverObsidianDebugPorts(runtime)].filter(value => Number.isInteger(value) && value > 0 && value <= 65535))];
  const attempts = [];
  const matches = [];
  for (const port of ports) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) {
        attempts.push({ port, status: `http-${response.status}` });
        continue;
      }
      const candidates = (await response.json()).filter(item => item?.type === 'page' && item.webSocketDebuggerUrl);
      let portMatches = 0;
      for (const candidate of candidates) {
        const snapshot = await rendererSnapshot(candidate).catch(() => null);
        if (snapshot && normalized(snapshot.vault) === normalized(vaultPath)) {
          matches.push({ candidate, snapshot, debugPort: port });
          portMatches += 1;
        }
      }
      attempts.push({ port, status: 'reachable', pageTargets: candidates.length, disposableMatches: portMatches });
    } catch (error) {
      attempts.push({ port, status: 'unreachable', error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one reachable disposable-vault renderer; observed ${matches.length}. Runtime=${JSON.stringify(runtime)} DevTools attempts=${JSON.stringify(attempts)}`);
  }
  return { ...matches[0], runtime, attempts };
}

function realSuspendResumeTransition() {
  const vaultWindowToken = path.basename(vaultPath);
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class S08FWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$token=${psQuote(path.basename(vaultPath))};
$windows=@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like ("*" + $token + "*") });
if ($windows.Count -ne 1) { Write-Error ('Expected exactly one disposable S08F Obsidian window containing title token ' + $token + '; observed ' + $windows.Count + '.'); [Environment]::ExitCode=41; return };
$p=$windows[0];
[void][S08FWindow]::ShowWindowAsync($p.MainWindowHandle,6);
Start-Sleep -Milliseconds 900;
[void][S08FWindow]::ShowWindowAsync($p.MainWindowHandle,9);
[void][S08FWindow]::SetForegroundWindow($p.MainWindowHandle);
Start-Sleep -Milliseconds 1200;
Write-Output ('Disposable S08F Obsidian window transitioned: ' + $p.Id + ' / ' + $p.MainWindowTitle);
`;
  const pwsh = process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe') : 'pwsh';
  const result = spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', windowsHide: false });
  if (result.status !== 0) throw new Error(`Unable to perform real Obsidian suspend/resume transition: ${(result.stderr || result.stdout || '').trim()}`);
  return { stdout: String(result.stdout || '').trim(), exitCode: result.status };
}

function agentBootstrapExpression(runId, controlKey, requireFreshState, recoveryDirectPollFirst = false) {
  return `(async () => {
    const out={ok:false};
    try {
      const expectedSource=${JSON.stringify(sourceCommit)};
      const expectedVault=${JSON.stringify(normalized(vaultPath))};
      const runId=${JSON.stringify(runId)};
      const deviceId=${JSON.stringify(deviceId)};
      const fixtureRoot=${JSON.stringify(fixtureRoot)};
      const controlKey=${JSON.stringify(controlKey)};
      const recoveryDirectPollFirst=${recoveryDirectPollFirst ? 'true' : 'false'};
      const pluginId='brain-google-drive-sync';
      const actualVaultRaw=typeof globalThis.app?.vault?.adapter?.getBasePath==='function'?globalThis.app.vault.adapter.getBasePath():'';
      const actualVault=String(actualVaultRaw).replace(/\\\\/g,'/').toLowerCase();
      if(actualVault!==expectedVault)return{...out,reason:'vault-mismatch',actualVault};
      const identity=globalThis.__BRAIN_BVP_VALIDATION_BUILD__;
      if(!identity||identity.sourceCommit!==expectedSource)return{...out,reason:'validation-identity-mismatch',sourceCommit:identity?.sourceCommit??null};
      const prior=globalThis[controlKey];
      if(prior&&typeof prior.stop==='function')try{prior.stop()}catch{}
      try{delete globalThis[controlKey]}catch{}
      const factory=globalThis.__BRAIN_BVP_DEVICE_AGENT_FACTORY__;
      const runtime=globalThis.__BRAIN_BVP_MAILBOX_RUNTIME__;
      if(typeof factory!=='function')return{...out,reason:'device-agent-factory-unavailable'};
      if(!runtime||typeof runtime.pollDeviceOnce!=='function')return{...out,reason:'mailbox-runtime-unavailable'};
      if(!runtime.relay||typeof runtime.relay.pumpOnce!=='function')return{...out,reason:'desktop-relay-unavailable'};
      const plugin=globalThis.app?.plugins?.plugins?.[pluginId];
      if(!plugin||typeof plugin.productionVerificationControl!=='function')return{...out,reason:'production-control-surface-unavailable'};
      const production=plugin.productionVerificationControl();
      if(!production)return{...out,reason:'production-control-unavailable'};
      const adapter=globalThis.app.vault.adapter;
      const relayRoot=\`${'${globalThis.app.vault.configDir}'}/plugins/${'${pluginId}'}/.bvp-relay\`;
      const stateDir=\`${'${relayRoot}'}/device-state\`;
      const statePath=\`${'${stateDir}'}/${'${runId}'}--${'${deviceId}'}.json\`;
      async function ensureDir(p){let current='';for(const part of p.split('/').filter(Boolean)){current=current?\`${'${current}'}/${'${part}'}\`:part;if(!(await adapter.exists(current,true)))await adapter.mkdir(current)}}
      async function ensureParent(p){const slash=p.lastIndexOf('/');if(slash>0)await ensureDir(p.slice(0,slash))}
      async function sha256(buffer){const digest=await crypto.subtle.digest('SHA-256',buffer);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')}
      const fixtures={
        async putText(p,text){await ensureParent(p);await adapter.write(p,text)},
        async putPattern(p,byteLength,seed){await ensureParent(p);const seedBytes=new TextEncoder().encode(seed);if(!seedBytes.length)throw new Error('empty-pattern-seed');const bytes=new Uint8Array(byteLength);for(let i=0;i<bytes.length;i+=1)bytes[i]=seedBytes[i%seedBytes.length]^(i&0xff);await adapter.writeBinary(p,bytes.buffer)},
        async remove(p){if(await adapter.exists(p,true))await adapter.remove(p)},
        async observe(p){if(!(await adapter.exists(p,true)))return{exists:false};const stat=await adapter.stat(p);if(!stat||stat.type!=='file')return{exists:false};const bytes=await adapter.readBinary(p);return{exists:true,sizeBytes:stat.size,sha256:await sha256(bytes)}}
      };
      await ensureDir(stateDir);
      if(${requireFreshState ? 'true' : 'false'}&&await adapter.exists(statePath,true))return{...out,reason:'sequence-state-already-exists',statePath};
      const sequenceState={
        async load(requestRunId,requestDeviceId){if(requestRunId!==runId||requestDeviceId!==deviceId)throw new Error('sequence-state-identity-mismatch');if(!(await adapter.exists(statePath,true)))return undefined;return JSON.parse(await adapter.read(statePath))},
        async save(requestRunId,requestDeviceId,state){if(requestRunId!==runId||requestDeviceId!==deviceId)throw new Error('sequence-state-identity-mismatch');await adapter.write(statePath,JSON.stringify(state))}
      };
      const agent=factory({runId,deviceId,fixtureRoot,fixtures,sequenceState,production});
      let stopped=false,busy=false,timer,lastPoll={status:'not-run',processed:0};
      async function pump(){
        if(stopped||busy)return lastPoll;
        if(globalThis.document?.visibilityState!=='visible')return{status:'deferred-hidden',processed:0};
        busy=true;
        try{await runtime.relay.pumpOnce();lastPoll=await runtime.pollDeviceOnce(agent,runId,deviceId);await runtime.relay.pumpOnce();return lastPoll}
        catch(error){lastPoll={status:'error',processed:0,error:error instanceof Error?error.message:String(error)};return lastPoll}
        finally{busy=false}
      }
      const visibility=()=>{if(globalThis.document?.visibilityState==='visible')globalThis.setTimeout(()=>void pump(),300)};
      globalThis.document?.addEventListener?.('visibilitychange',visibility);
      const control=Object.freeze({
        runId,deviceId,fixtureRoot,relayRoot,statePath,
        status:()=>({stopped,busy,visibility:globalThis.document?.visibilityState??'unknown',lastPoll:structuredClone(lastPoll),productStatus:production.currentStatus()}),
        pumpNow:()=>pump(),
        pollDeviceNow:()=>runtime.pollDeviceOnce(agent,runId,deviceId),
        pumpRelayNow:()=>runtime.relay.pumpOnce(),
        executeDirect:input=>agent.execute(input),
        observe:relative=>fixtures.observe(\`${'${fixtureRoot}'}/${'${relative}'}\`),
        stop:()=>{stopped=true;if(timer!==undefined)globalThis.clearInterval(timer);globalThis.document?.removeEventListener?.('visibilitychange',visibility)}
      });
      Object.defineProperty(globalThis,controlKey,{value:control,configurable:true,enumerable:false,writable:false});
      let firstPoll={status:'deferred-recovery',processed:0};
      if(!recoveryDirectPollFirst){timer=globalThis.setInterval(()=>void pump(),400);firstPoll=await pump()}
      return{ok:true,runId,deviceId,fixtureRoot,statePath,visibility:globalThis.document?.visibilityState??'unknown',productStatus:production.currentStatus(),firstPoll,recoveryDirectPollFirst,identity};
    }catch(error){return{...out,reason:'bootstrap-exception',error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`;
}

async function injectAgent(runId, controlKey, requireFreshState = true, recoveryDirectPollFirst = false) {
  const expression = agentBootstrapExpression(runId, controlKey, requireFreshState, recoveryDirectPollFirst);
  try { new Function(`return ${expression};`); } catch (error) { throw new Error(`Generated agent bootstrap failed syntax validation: ${error}`); }
  const result = await cdpEval(target.candidate.webSocketDebuggerUrl, expression, 30000);
  if (!result?.ok) throw new Error(`Renderer rejected S08F agent bootstrap: ${result?.reason ?? 'unknown'}${result?.error ? ` - ${result.error}` : ''}`);
  return result;
}

async function invokeControlMethod(controlKey, method) {
  const expression = `(async()=>{const c=globalThis[${JSON.stringify(controlKey)}];if(!c||typeof c[${JSON.stringify(method)}]!=='function')return{__error:'control-method-unavailable'};try{return await c[${JSON.stringify(method)}]()}catch(error){return{__error:error instanceof Error?(error.stack??error.message):String(error)}}})()`;
  const result = await cdpEval(target.candidate.webSocketDebuggerUrl, expression, 120000);
  if (result?.__error) throw new Error(result.__error);
  return result;
}
async function quiesceControlAndObserve(renderer, controlKey) {
  const expression = `(()=>{
    const plugin=globalThis.app?.plugins?.plugins?.['brain-google-drive-sync'];
    const production=plugin&&typeof plugin.productionVerificationControl==='function'?plugin.productionVerificationControl():undefined;
    const prior=globalThis[${JSON.stringify(controlKey)}];
    let controlStatus=null;
    try{controlStatus=prior&&typeof prior.status==='function'?prior.status():null}catch(error){controlStatus={error:error instanceof Error?error.message:String(error)}}
    try{if(prior&&typeof prior.stop==='function')prior.stop()}catch{}
    try{delete globalThis[${JSON.stringify(controlKey)}]}catch{}
    return{
      vault:typeof globalThis.app?.vault?.adapter?.getBasePath==='function'?globalThis.app.vault.adapter.getBasePath():'',
      visibility:globalThis.document?.visibilityState??'unknown',
      sourceCommit:globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit??null,
      controlStatus,
      productStatus:production?.currentStatus?.()??null,
      latestReceipt:production?.latestProductionRunReceipt?.()??null,
    };
  })()`;
  return await cdpEval(renderer.candidate.webSocketDebuggerUrl, expression, 30000);
}

async function installMailboxResultRecoveryShim(renderer, known) {
  const markerKey='__BRAIN_BVP_S08F_R2_MAILBOX_RESULT_RECOVERY__';
  const expression = `(()=>{
    const runtime=globalThis.__BRAIN_BVP_MAILBOX_RUNTIME__;
    if(!runtime?.mailbox||typeof runtime.mailbox.resultFor!=='function')return{ok:false,reason:'mailbox-runtime-unavailable'};
    const markerKey=${JSON.stringify(markerKey)};
    const known=${JSON.stringify(known)};
    const prior=globalThis[markerKey];
    if(prior?.installed===true)return{ok:true,alreadyInstalled:true,knownCommandIds:Object.keys(known)};
    const original=runtime.mailbox.resultFor.bind(runtime.mailbox);
    const headerExact=(a,b)=>a&&b&&a.runId===b.runId&&a.deviceId===b.deviceId&&a.sequence===b.sequence&&a.commandId===b.commandId&&a.kind===b.kind;
    runtime.mailbox.resultFor=async command=>{
      try{return await original(command)}
      catch(error){
        if(!(error instanceof Error)||error.message!=='mailbox-conflicting-result')throw error;
        const entry=known[command?.commandId];
        if(!entry||!headerExact(command,entry.command))throw error;
        return structuredClone(entry.result);
      }
    };
    Object.defineProperty(globalThis,markerKey,{value:{installed:true,original,mailbox:runtime.mailbox},configurable:true,enumerable:false,writable:false});
    return{ok:true,alreadyInstalled:false,knownCommandIds:Object.keys(known)};
  })()`;
  const result=await cdpEval(renderer.candidate.webSocketDebuggerUrl, expression, 30000);
  if(!result?.ok)throw new Error(`Mailbox result recovery shim rejected: ${result?.reason??'unknown'}`);
  return result;
}

async function restoreMailboxResultRecoveryShim(renderer) {
  if(!renderer?.candidate?.webSocketDebuggerUrl)return {ok:true,restored:false,reason:'renderer-unavailable'};
  const markerKey='__BRAIN_BVP_S08F_R2_MAILBOX_RESULT_RECOVERY__';
  const expression = `(()=>{
    const markerKey=${JSON.stringify(markerKey)};
    const prior=globalThis[markerKey];
    if(!prior?.installed)return{ok:true,restored:false};
    try{prior.mailbox.resultFor=prior.original}catch(error){return{ok:false,restored:false,error:error instanceof Error?error.message:String(error)}}
    try{delete globalThis[markerKey]}catch{}
    return{ok:true,restored:true};
  })()`;
  return await cdpEval(renderer.candidate.webSocketDebuggerUrl, expression, 30000).catch(error=>({ok:false,restored:false,error:error instanceof Error?error.message:String(error)}));
}

async function directExecute(controlKey, command) {
  const expression = `(async()=>{const c=globalThis[${JSON.stringify(controlKey)}];if(!c||typeof c.executeDirect!=='function')return{__error:'control-unavailable'};return await c.executeDirect(${JSON.stringify(command)})})()`;
  const result = await cdpEval(target.candidate.webSocketDebuggerUrl, expression, 30000);
  if (result?.__error) throw new Error(result.__error);
  return result;
}

async function stopControl(controlKey) {
  const expression = `(()=>{const c=globalThis[${JSON.stringify(controlKey)}];if(c&&typeof c.stop==='function')c.stop();try{delete globalThis[${JSON.stringify(controlKey)}]}catch{};return true})()`;
  await cdpEval(target.candidate.webSocketDebuggerUrl, expression).catch(() => undefined);
}

function commandCorrelates(command, result) {
  return result && command.runId === result.runId && command.deviceId === result.deviceId && command.sequence === result.sequence && command.commandId === result.commandId && command.kind === result.kind;
}

async function relayRoundTrip(command, timeoutMs = 90000) {
  const outbox = path.join(relayRoot, 'outbox');
  const sent = path.join(relayRoot, 'sent');
  const inbox = path.join(relayRoot, 'inbox');
  await Promise.all([fs.mkdir(outbox,{recursive:true}),fs.mkdir(sent,{recursive:true}),fs.mkdir(inbox,{recursive:true})]);
  const name = `${command.commandId}.json`;
  const outPath = path.join(outbox, name);
  const sentPath = path.join(sent, name);
  const resultPath = path.join(inbox, `${name}.result.json`);
  for (const file of [outPath, sentPath, resultPath]) if (await exists(file)) throw new Error(`Relay collision before command ${command.commandId}: ${file}`);
  const temp = path.join(relayRoot, `.${name}.${randomUUID()}.tmp`);
  await fs.writeFile(temp, JSON.stringify(command), 'utf8');
  await fs.rename(temp, outPath);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {

    if (await exists(resultPath)) {
      let result;
      try { result = JSON.parse(await fs.readFile(resultPath, 'utf8')); }
      catch (error) { throw new Error(`Unable to parse relay result for ${command.commandId}: ${error}`); }
      await fs.rm(resultPath, { force: true });
      const sentDeadline = Date.now() + 5000;
      while (Date.now() <= sentDeadline && await exists(sentPath)) await new Promise(resolve => setTimeout(resolve, 100));
      if (await exists(sentPath)) throw new Error(`Sent relay record remained after result correlation for ${command.commandId}.`);
      if (!commandCorrelates(command, result)) throw new Error(`Result correlation mismatch for ${command.commandId}.`);
      return result;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for relay result for ${command.commandId}.`);
}

async function relayEmpty() {
  const result = {};
  for (const dir of ['outbox','sent','inbox']) {
    const full = path.join(relayRoot, dir);
    result[dir] = await fs.readdir(full).catch(() => []);
  }
  return result;
}

async function writeEvidenceFile(name, content) {
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(path.join(evidenceDir, name), content, 'utf8');
}

async function persistVerdict() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const opposite = physicalStatus === 'PASS'
    ? ['S08F-BLOCKED.json','S08F-BLOCKED.md']
    : ['S08F-PASS.json','S08F-PASS.md'];
  for (const name of opposite) await fs.rm(path.join(evidenceDir, name), { force: true });
  const summary = {
    schemaVersion: 1,
    status: physicalStatus,
    classification,
    primaryReason: primaryReason || null,
    sourceCommit,
    branchHead,
    vaultPath,
    deviceId,
    oldRunId,
    retryRunId,
    scenarioId,
    fixtureRoot,
    canary: { path: `${fixtureRoot}/${canaryRelative}`, sizeBytes: canaryBytes.length, sha256: canaryHash },
    stages,
  };
  await writeJson(path.join(evidenceDir, physicalStatus === 'PASS' ? 'S08F-PASS.json' : 'S08F-BLOCKED.json'), summary);
  const lines = [
    `# S08F ${physicalStatus}`,
    '',
    `- classification: \`${classification}\``,
    `- source commit: \`${sourceCommit}\``,
    `- branch head at execution start: \`${branchHead}\``,
    `- disposable vault: \`${vaultPath}\``,
    `- device: \`${deviceId}\``,
    `- attempt-1 run: \`${oldRunId}\``,
    `- retry run: \`${retryRunId}\``,
    `- scenario: \`${scenarioId}\``,
    `- fixture: \`${fixtureRoot}/${canaryRelative}\``,
    `- fixture SHA-256: \`${canaryHash}\``,
    `- primary reason: ${primaryReason || 'none'}`,
    '',
    '## Stage results',
    '',
    ...stages.map(stage => `- **${stage.name}** — ${stage.status} / ${stage.classification}: ${stage.summary}`),
    '',
  ];
  await writeEvidenceFile(physicalStatus === 'PASS' ? 'S08F-PASS.md' : 'S08F-BLOCKED.md', lines.join('\n'));

}



async function inspectRendererCapabilities(renderer) {
  const expression = `(() => {
    const pluginId='brain-google-drive-sync';
    const runtime=globalThis.__BRAIN_BVP_MAILBOX_RUNTIME__;
    const plugin=globalThis.app?.plugins?.plugins?.[pluginId];
    let productionStatus=null;
    let productionError=null;
    try {
      const production=plugin&&typeof plugin.productionVerificationControl==='function'?plugin.productionVerificationControl():undefined;
      productionStatus=production?production.currentStatus():null;
    } catch(error) {
      productionError=error instanceof Error?error.message:String(error);
    }
    return {
      vault:typeof globalThis.app?.vault?.adapter?.getBasePath==='function'?globalThis.app.vault.adapter.getBasePath():'',
      visibility:globalThis.document?.visibilityState??'unknown',
      sourceCommit:globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit??null,
      deviceAgentFactory:typeof globalThis.__BRAIN_BVP_DEVICE_AGENT_FACTORY__==='function',
      mailboxPoll:!!runtime&&typeof runtime.pollDeviceOnce==='function',
      relayPump:!!runtime?.relay&&typeof runtime.relay.pumpOnce==='function',
      pluginPresent:!!plugin,
      productionControl:!!plugin&&typeof plugin.productionVerificationControl==='function',
      productionStatus,
      productionError,
    };
  })()`;
  return await cdpEval(renderer.candidate.webSocketDebuggerUrl, expression);
}

async function collectPreMutationPreflight() {
  const blockers = [];
  const observedDefects = [];
  let initialRenderer = null;
  let installedDataHash = null;
  let productionBaseline = null;
  let attempt1 = null;
  let runtimeSnapshot = inspectObsidianRuntime();

  const finding = (name, pass, classificationValue, summary, details = undefined, blocking = true) => {
    record(`preflight-${name}`, pass ? 'PASS' : 'FAIL', classificationValue, summary, details);
    if (!pass) observedDefects.push({ name, classification: classificationValue, summary, details, blocking });
    if (!pass && blocking) blockers.push({ name, classification: classificationValue, summary, details });
  };

  finding('input-identity',
    Boolean(vaultPath && repoWorktree && evidenceDir && branchHead),
    'input-identity',
    'Required helper identities are present.',
    { vaultPath, repoWorktree, evidenceDir, branchHead });

  finding('canary-identity',
    canaryHash === expectedCanaryHash && canaryBytes.length === 77,
    'harness-integrity',
    canaryHash === expectedCanaryHash && canaryBytes.length === 77
      ? 'Canary content identity is exact.'
      : `Canary identity mismatch: size=${canaryBytes.length} hash=${canaryHash}`,
    { sizeBytes:canaryBytes.length, sha256:canaryHash });

  const mainJs = path.join(pluginDir, 'main.js');
  const manifest = path.join(pluginDir, 'manifest.json');
  const dataJson = path.join(pluginDir, 'data.json');
  const installPresence = {
    mainJs:await exists(mainJs),
    manifest:await exists(manifest),
    dataJson:await exists(dataJson),
  };
  finding('validation-install',
    installPresence.mainJs && installPresence.manifest && installPresence.dataJson,
    'validation-install',
    installPresence.mainJs && installPresence.manifest && installPresence.dataJson
      ? 'Disposable validation plugin files are present.'
      : 'Disposable validation plugin installation is incomplete.',
    installPresence);
  if (installPresence.mainJs) {
    const hash = await sha256File(mainJs);
    const size = (await fs.stat(mainJs)).size;
    finding('validation-artifact',
      hash === expectedValidationHash,
      'validation-artifact-identity',
      hash === expectedValidationHash
        ? `Installed validation artifact is exact at ${size} bytes.`
        : `Installed validation main.js hash ${hash} does not match ${expectedValidationHash}.`,
      { sizeBytes:size, sha256:hash, expectedSha256:expectedValidationHash });
  }
  if (installPresence.dataJson) installedDataHash = await sha256File(dataJson);

  const productionMainSource = path.join(repoWorktree, 'main.js');
  const productionManifestSource = path.join(repoWorktree, 'manifest.json');
  const productionPresence = {
    mainJs:await exists(productionMainSource),
    manifest:await exists(productionManifestSource),
  };
  finding('production-restore-artifacts',
    productionPresence.mainJs && productionPresence.manifest,
    'production-restoration-precondition',
    productionPresence.mainJs && productionPresence.manifest
      ? 'Ordinary production restoration artifacts are present in the exact-SHA worktree.'
      : 'Ordinary production restoration artifacts are missing.',
    productionPresence);
  if (productionPresence.mainJs) {
    const hash = await sha256File(productionMainSource);
    const size = (await fs.stat(productionMainSource)).size;
    const text = await fs.readFile(productionMainSource,'utf8');
    const forbiddenMarkers = ['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'];
    const markerHits = forbiddenMarkers.filter(value => text.includes(value));
    productionBaseline = { sizeBytes:size, sha256:hash, forbiddenMarkerHits:markerHits };
    finding('production-baseline',
      hash === expectedProductionHash && size === expectedProductionSize && markerHits.length === 0,
      'production-bundle-isolation',
      hash === expectedProductionHash && size === expectedProductionSize && markerHits.length === 0
        ? 'Ordinary production bundle baseline and validation-code exclusion are exact.'
        : `Production baseline mismatch or forbidden markers present: size=${size} hash=${hash} markers=${JSON.stringify(markerHits)}`,
      productionBaseline);
  }

  const oldState = await readJson(oldStatePath).catch(error => ({ __readError:error instanceof Error?error.message:String(error) }));
  const oldStateExact = oldState && !oldState.__readError && oldState.sequence === 3 && oldState.phase === 'completed' &&
    oldState.result?.kind === 'production-execute' && oldState.result?.status === 'rejected' &&
    oldState.result?.classification === 'production-action-rejected';
  finding('attempt1-sequence-state',
    oldStateExact,
    'attempt1-state',
    oldStateExact
      ? 'Attempt-1 sequence state is the exact completed rejected sequence-3 state.'
      : 'Attempt-1 sequence state is missing or does not match the bound rejected sequence-3 state.',
    oldState);
  attempt1 = oldStateExact ? oldState : null;

  const fixtureExists = await exists(canaryPath);
  const fixtureState = fixtureExists
    ? { exists:true, sizeBytes:(await fs.stat(canaryPath)).size, sha256:await sha256File(canaryPath) }
    : { exists:false };
  finding('attempt1-fixture',
    fixtureState.exists === true && fixtureState.sizeBytes === 77 && fixtureState.sha256 === expectedCanaryHash,
    'attempt1-fixture',
    fixtureState.exists === true && fixtureState.sizeBytes === 77 && fixtureState.sha256 === expectedCanaryHash
      ? 'Attempt-1 fixture is present with exact size/hash.'
      : 'Attempt-1 fixture identity does not match the bound safe state.',
    fixtureState);

  const relayState = await relayEmpty();
  const relayClean = Object.values(relayState).every(files => files.length === 0);
  finding('relay-cleanliness',
    relayClean,
    'relay-state',
    relayClean ? 'Protected local relay is drained.' : 'Protected local relay contains stale records.',
    relayState);

  const retryStateExists = await exists(retryStatePath);
  finding('retry-sequence-freshness',
    !retryStateExists,
    'retry-state',
    retryStateExists ? `Retry sequence state already exists at ${retryStatePath}.` : 'Retry sequence state is fresh.',
    { path:retryStatePath, exists:retryStateExists });

  const probeExists = await exists(probePath);
  finding('probe-fixture-freshness',
    !probeExists,
    'retry-fixture-state',
    probeExists ? `Duplicate-replay probe fixture already exists at ${probePath}.` : 'Duplicate-replay probe fixture is absent.',
    { path:probePath, exists:probeExists });

  const passJson = await exists(path.join(evidenceDir,'S08F-PASS.json'));
  const passMd = await exists(path.join(evidenceDir,'S08F-PASS.md'));
  const blockedJson = await exists(path.join(evidenceDir,'S08F-BLOCKED.json'));
  const blockedMd = await exists(path.join(evidenceDir,'S08F-BLOCKED.md'));
  const priorPass = passJson || passMd;
  const contradictory = priorPass && (blockedJson || blockedMd);
  finding('evidence-state',
    !priorPass && !contradictory,
    'evidence-state',
    priorPass
      ? 'Prior S08F PASS evidence already exists; retry mutation is not authorized.'
      : 'No prior PASS evidence exists; prior BLOCKED evidence may be superseded by a successful retry.',
    { passJson,passMd,blockedJson,blockedMd },
    true);

  finding('obsidian-runtime-inspection',
    runtimeSnapshot.ok === true,
    'environment-inspection',
    runtimeSnapshot.ok
      ? `Observed ${runtimeSnapshot.processes.length} Obsidian processes, ${runtimeSnapshot.windows.length} top-level windows, and ${runtimeSnapshot.listeners.length} owned listeners.`
      : `Unable to inspect Obsidian runtime: ${runtimeSnapshot.error}`,
    runtimeSnapshot,
    false);

  const obsidianExe = await findObsidianExe();
  finding('obsidian-executable',
    Boolean(obsidianExe),
    'environment-precondition',
    obsidianExe ? `Obsidian executable located at ${obsidianExe}.` : 'Obsidian executable was not found in approved install locations; this matters only if a renderer must be bootstrapped.',
    { executable:obsidianExe ?? null },
    false);

  try {
    initialRenderer = await findRenderer();
    record('preflight-renderer','PASS','exact-disposable-renderer','A reachable renderer already matches the disposable vault.',{
      debugPort:initialRenderer.debugPort,
      snapshot:initialRenderer.snapshot,
      attempts:initialRenderer.attempts,
      runtime:initialRenderer.runtime,
    });
  } catch (error) {
    const summary = error instanceof Error?error.message:String(error);
    record('preflight-renderer','FAIL','devtools-environment-not-ready',summary,runtimeSnapshot);
    observedDefects.push({ name:'renderer', classification:'devtools-environment-not-ready', summary, details:runtimeSnapshot, blocking:false });
  }

  if (initialRenderer) {
    let capabilities;
    try {
      capabilities = await inspectRendererCapabilities(initialRenderer);
    } catch (error) {
      capabilities = { __error:error instanceof Error?error.message:String(error) };
    }
    const capabilityPass = !capabilities.__error &&
      normalized(capabilities.vault) === normalized(vaultPath) &&
      capabilities.sourceCommit === sourceCommit &&
      capabilities.deviceAgentFactory === true &&
      capabilities.mailboxPoll === true &&
      capabilities.relayPump === true &&
      capabilities.pluginPresent === true &&
      capabilities.productionControl === true;
    finding('renderer-capabilities',
      capabilityPass,
      'renderer-capabilities',
      capabilityPass
        ? 'Disposable renderer exposes the accepted validation identity, device-agent factory, mailbox/relay runtime, and production-control seam.'
        : 'Disposable renderer is reachable but one or more required validation/runtime capabilities are unavailable.',
      capabilities);
  }

  record('preflight-summary',
    observedDefects.length === 0 ? 'PASS' : 'FAIL',
    observedDefects.length === 0 ? 'preflight-clean' : 'preflight-defects-observed',
    `Pre-mutation diagnostics observed ${observedDefects.length} defect(s), including ${blockers.length} unresolved mutation blocker(s).`,
    { defectCount:observedDefects.length, blockerCount:blockers.length, defects:observedDefects });
  return { blockers, observedDefects, initialRenderer, installedDataHash, productionBaseline, attempt1, runtimeSnapshot };
}

async function ensureRendererEnvironment(initialRenderer) {
  if (initialRenderer) return { ok:true, target:initialRenderer, repaired:false };
  const repair = await launchDebugEnabledDisposableObsidian();
  if (!repair.ok) {
    record('environment-repair','FAIL',repair.classification,'Unable to establish a debug-enabled disposable Obsidian renderer.',repair);
    return repair;
  }
  record('environment-repair','PASS','debug-enabled-disposable-renderer','Established a debug-enabled Obsidian renderer for the disposable S08F vault.',{
    executable:repair.executable, port:repair.port, pid:repair.pid,
    snapshot:repair.target.snapshot, runtime:repair.target.runtime, attempts:repair.target.attempts,
  });
  return { ok:true, target:repair.target, repaired:true, port:repair.port, pid:repair.pid };
}


const controlKey = '__BRAIN_BVP_S08F_PROTOCOL_R2__';

function canonicalValue(value) {
  if (value === undefined) return 'undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return '[' + value.map(canonicalValue).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalValue(value[key])).join(',') + '}';
}

function expectedRetrySequenceOne() {
  const commandId = 'bvp-' + createHash('sha256').update([retryRunId,scenarioId,'0','0'].join(String.fromCharCode(0))).digest('hex').slice(0,32);
  return {
    runId: retryRunId,
    deviceId,
    sequence: 1,
    commandId,
    kind: 'fixture-put',
    path: canaryRelative,
    content: { type:'text', text:canaryText },
  };
}

function exactSequenceOneResult(result, command) {
  return Boolean(result &&
    result.runId === command.runId &&
    result.deviceId === command.deviceId &&
    result.sequence === command.sequence &&
    result.commandId === command.commandId &&
    result.kind === command.kind &&
    result.status === 'completed' &&
    result.classification === 'fixture-verified' &&
    result.fixture?.exists === true &&
    result.fixture?.sizeBytes === 77 &&
    result.fixture?.sha256 === expectedCanaryHash);
}

async function relayRecoverySnapshot(command) {
  const dirs = {
    outbox:path.join(relayRoot,'outbox'),
    sent:path.join(relayRoot,'sent'),
    inbox:path.join(relayRoot,'inbox'),
  };
  const output = {};
  for (const [name,dir] of Object.entries(dirs)) {
    const files = await fs.readdir(dir).catch(() => []);
    output[name] = files.sort();
  }
  const commandName = `${command.commandId}.json`;
  const resultName = `${commandName}.result.json`;
  const locations = {
    outbox:path.join(dirs.outbox,commandName),
    sent:path.join(dirs.sent,commandName),
    inbox:path.join(dirs.inbox,resultName),
  };
  for (const [name,file] of Object.entries(locations)) {
    if (await exists(file)) {
      try { output[`${name}Record`] = JSON.parse(await fs.readFile(file,'utf8')); }
      catch (error) { output[`${name}ReadError`] = error instanceof Error ? error.message : String(error); }
    }
  }
  return output;
}

async function mailboxRecoverySnapshot(renderer, command) {
  const expression = `(async()=>{
    const out={ok:false};
    try{
      const runtime=globalThis.__BRAIN_BVP_MAILBOX_RUNTIME__;
      const plugin=globalThis.app?.plugins?.plugins?.['brain-google-drive-sync'];
      out.vault=typeof globalThis.app?.vault?.adapter?.getBasePath==='function'?globalThis.app.vault.adapter.getBasePath():'';
      out.visibility=globalThis.document?.visibilityState??'unknown';
      out.sourceCommit=globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit??null;
      out.controlStatus=globalThis[${JSON.stringify(controlKey)}]?.status?.()??null;
      out.productStatus=(()=>{try{return plugin?.productionVerificationControl?.()?.currentStatus?.()??null}catch(error){return{error:error instanceof Error?error.message:String(error)}}})();
      if(!runtime?.mailbox){out.reason='mailbox-runtime-unavailable';return out;}
      const commands=await runtime.mailbox.commands(${JSON.stringify(retryRunId)},${JSON.stringify(deviceId)});
      out.commands=commands;
      out.commandResults=[];
      for(const item of commands){
        try{out.commandResults.push({command:item,result:await runtime.mailbox.resultFor(item)??null});}
        catch(error){out.commandResults.push({command:item,resultError:error instanceof Error?error.message:String(error)});}
      }
      out.ok=true;
      return out;
    }catch(error){return{...out,reason:'mailbox-inspection-failed',error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`;
  return await cdpEval(renderer.candidate.webSocketDebuggerUrl, expression, 45000);
}

async function recoverRetrySequenceOne(priorVerdict) {
  const command = expectedRetrySequenceOne();
  const expectedCommandKey = canonicalValue(command);
  const defects = [];
  const note = (name, pass, classificationValue, summary, details = undefined, blocking = true) => {
    record(`recovery-${name}`, pass ? 'PASS' : 'FAIL', classificationValue, summary, details);
    if (!pass) defects.push({name,classification:classificationValue,summary,details,blocking});
  };

  const mainJs = path.join(pluginDir,'main.js');
  const manifest = path.join(pluginDir,'manifest.json');
  const dataJson = path.join(pluginDir,'data.json');
  const productionMainSource = path.join(repoWorktree,'main.js');
  const productionManifestSource = path.join(repoWorktree,'manifest.json');

  const installPresence = {mainJs:await exists(mainJs),manifest:await exists(manifest),dataJson:await exists(dataJson)};
  note('validation-install',installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson,'validation-install',
    installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson?'Disposable validation installation remains present.':'Disposable validation installation is incomplete.',installPresence);
  if (installPresence.mainJs) {
    const hash=await sha256File(mainJs),size=(await fs.stat(mainJs)).size;
    note('validation-artifact',hash===expectedValidationHash,'validation-artifact-identity',
      hash===expectedValidationHash?`Installed validation artifact remains exact at ${size} bytes.`:`Installed validation artifact mismatch: size=${size} hash=${hash}`,
      {sizeBytes:size,sha256:hash,expectedSha256:expectedValidationHash});
  }

  const productionPresence={mainJs:await exists(productionMainSource),manifest:await exists(productionManifestSource)};
  note('production-restoration-artifacts',productionPresence.mainJs&&productionPresence.manifest,'production-restoration-precondition',
    productionPresence.mainJs&&productionPresence.manifest?'Exact-SHA production restoration artifacts remain available.':'Production restoration artifacts are unavailable.',productionPresence);
  if (productionPresence.mainJs) {
    const hash=await sha256File(productionMainSource),size=(await fs.stat(productionMainSource)).size;
    const text=await fs.readFile(productionMainSource,'utf8');
    const hits=['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'].filter(marker=>text.includes(marker));
    note('production-baseline',hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0,'production-bundle-isolation',
      hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0?'Production restoration baseline remains exact and validation-code-free.':`Production baseline mismatch: size=${size} hash=${hash} markers=${JSON.stringify(hits)}`,
      {sizeBytes:size,sha256:hash,forbiddenMarkerHits:hits});
  }

  const oldState=await readJson(oldStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const oldStateExact=oldState&&!oldState.__error&&oldState.sequence===3&&oldState.phase==='completed'&&oldState.result?.kind==='production-execute'&&oldState.result?.status==='rejected'&&oldState.result?.classification==='production-action-rejected';
  note('attempt1-state',oldStateExact,'attempt1-state',oldStateExact?'Attempt-1 terminal rejected sequence-3 state remains preserved.':'Attempt-1 terminal state no longer matches its frozen safe identity.',oldState);

  const retryStatePresent=await exists(retryStatePath);
  const retryState=retryStatePresent?await readJson(retryStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)})):null;
  const fixtureExists=await exists(canaryPath);
  const fixture=fixtureExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
  const relayBefore=await relayRecoverySnapshot(command);
  note('retry-state-readable',!retryState?.__error,'retry-state',
    retryState?.__error?'Retry state exists but could not be read.':retryStatePresent?'Retry sequence state was read successfully.':'Retry sequence state file is absent.',
    {present:retryStatePresent,state:retryState});

  const allowedRelayNames = {
    outbox:new Set([`${command.commandId}.json`]),
    sent:new Set([`${command.commandId}.json`]),
    inbox:new Set([`${command.commandId}.json.result.json`]),
  };
  const unexpectedRelay={};
  for(const name of ['outbox','sent','inbox']) unexpectedRelay[name]=(relayBefore[name]??[]).filter(file=>!allowedRelayNames[name].has(file));
  const relayBounded=Object.values(unexpectedRelay).every(items=>items.length===0);
  note('relay-bounded',relayBounded,'relay-state',relayBounded?'Local relay contains only sequence-1 recovery records, if any.':'Local relay contains unexpected records.',{relay:relayBefore,unexpected:unexpectedRelay});
  const outboxExact=!relayBefore.outboxRecord||canonicalValue(relayBefore.outboxRecord)===expectedCommandKey;
  const sentExact=!relayBefore.sentRecord||canonicalValue(relayBefore.sentRecord)===expectedCommandKey;
  const inboxExactBefore=!relayBefore.inboxRecord||exactSequenceOneResult(relayBefore.inboxRecord,command);
  const relayRecordsExact=outboxExact&&sentExact&&inboxExactBefore&&!relayBefore.outboxReadError&&!relayBefore.sentReadError&&!relayBefore.inboxReadError;
  note('relay-record-identity',relayRecordsExact,'relay-record-identity',
    relayRecordsExact?'All present sequence-1 relay records exactly match the deterministic command/result contract.':'One or more sequence-1 relay records are malformed or do not match the deterministic contract.',
    {outboxExact,sentExact,inboxExact:inboxExactBefore,relay:relayBefore});

  let retryStateSafe=false;
  if (!retryState) {
    retryStateSafe=!fixture.exists;
    note('sequence-state-safety',retryStateSafe,'retry-sequence-state',
      retryStateSafe?'No retry sequence state exists and the retry fixture is absent; sequence 1 has not durably executed locally.':'Retry state is absent but the fixture exists, so prior outcome is ambiguous.',
      {retryState:null,fixture});
  } else if (retryState?.__error) {
    note('sequence-state-safety',false,'retry-sequence-state','Retry sequence state is unreadable.',{retryState,fixture});
  } else if (retryState.sequence!==1) {
    note('sequence-state-safety',false,'recovery-state-beyond-sequence1',`Retry sequence state is already at sequence ${retryState.sequence}; this recovery path will not replay earlier commands.`,{retryState,fixture});
  } else if (retryState.phase==='claimed') {
    note('sequence-state-safety',false,'prior-outcome-uncertain','Retry sequence 1 remains claimed without a terminal result; mutation outcome is uncertain.',{retryState,fixture});
  } else {
    const exact=retryState.phase==='completed'&&retryState.commandKey===expectedCommandKey&&exactSequenceOneResult(retryState.result,command)&&fixture.exists&&fixture.sizeBytes===77&&fixture.sha256===expectedCanaryHash;
    retryStateSafe=exact;
    note('sequence-state-safety',exact,'retry-sequence-state',
      exact?'Retry sequence 1 is durably completed with the exact fixture result and exact current fixture identity.':'Retry sequence 1 state/result/current fixture do not exactly match the deterministic sequence-1 contract.',
      {retryState,fixture,expectedCommandKey});
  }

  let renderer;
  try { renderer=await findRenderer(); }
  catch { renderer=null; }
  const rendererEnvironment=await ensureRendererEnvironment(renderer);
  if(!rendererEnvironment.ok) note('renderer-environment',false,rendererEnvironment.classification??'devtools-environment-repair-failed',rendererEnvironment.reason??'Disposable renderer unavailable.',rendererEnvironment);
  else {
    renderer=rendererEnvironment.target;
    note('renderer-environment',true,'exact-disposable-renderer',rendererEnvironment.repaired?'Disposable renderer was re-established for recovery.':'Existing disposable renderer is reachable.',{repaired:rendererEnvironment.repaired,snapshot:renderer.snapshot,debugPort:renderer.debugPort});
  }

  let capabilities=null,mailboxBefore=null;
  if(renderer){
    try{capabilities=await inspectRendererCapabilities(renderer);}
    catch(error){capabilities={__error:error instanceof Error?error.message:String(error)};}
    const capPass=!capabilities.__error&&normalized(capabilities.vault)===normalized(vaultPath)&&capabilities.sourceCommit===sourceCommit&&capabilities.deviceAgentFactory===true&&capabilities.mailboxPoll===true&&capabilities.relayPump===true&&capabilities.pluginPresent===true&&capabilities.productionControl===true;
    note('renderer-capabilities',capPass,'renderer-capabilities',capPass?'Renderer exposes all accepted recovery capabilities.':'Renderer is missing one or more required recovery capabilities.',capabilities);
    try{mailboxBefore=await mailboxRecoverySnapshot(renderer,command);}
    catch(error){mailboxBefore={ok:false,error:error instanceof Error?error.message:String(error)};}
    note('mailbox-inspection',mailboxBefore?.ok===true,'drive-mailbox-state',mailboxBefore?.ok===true?'Drive mailbox state was inspected without mutation.':'Drive mailbox inspection failed.',mailboxBefore);
  }

  let exactDriveCommandCount=0;
  let exactDriveResultCount=0;
  if(mailboxBefore?.ok){
    const addressed=mailboxBefore.commands??[];
    const later=addressed.filter(item=>Number(item.sequence)>1);
    const seq1=addressed.filter(item=>Number(item.sequence)===1);
    const exactCommands=seq1.filter(item=>canonicalValue(item)===expectedCommandKey);
    const conflictingSeq1=seq1.filter(item=>canonicalValue(item)!==expectedCommandKey);
    const resultErrors=(mailboxBefore.commandResults??[]).filter(item=>item.resultError);
    const exactResults=(mailboxBefore.commandResults??[]).filter(item=>canonicalValue(item.command)===expectedCommandKey&&exactSequenceOneResult(item.result,command));
    const wrongResults=(mailboxBefore.commandResults??[]).filter(item=>item.result&&canonicalValue(item.command)===expectedCommandKey&&!exactSequenceOneResult(item.result,command));
    exactDriveCommandCount=exactCommands.length;
    exactDriveResultCount=exactResults.length;
    note('mailbox-command-bounds',later.length===0&&conflictingSeq1.length===0,'drive-mailbox-command-state',
      later.length===0&&conflictingSeq1.length===0?`Mailbox has ${exactCommands.length} exact sequence-1 command record(s) and no later/conflicting retry commands.`:'Mailbox contains later-sequence or conflicting sequence-1 commands.',
      {exactCommandCount:exactCommands.length,laterCommands:later,conflictingSequenceOne:conflictingSeq1});
    note('mailbox-result-bounds',resultErrors.length===0&&wrongResults.length===0,'drive-mailbox-result-state',
      resultErrors.length===0&&wrongResults.length===0?`Mailbox has ${exactResults.length} exact sequence-1 result view(s) and no conflicting result.`:'Mailbox result state is conflicting or unreadable.',
      {exactResultCount:exactResults.length,resultErrors,wrongResults});
    if(!retryState&&exactResults.length>0) note('result-without-state',false,'sequence-state-result-inconsistency','Drive contains a sequence-1 result but no durable retry sequence state exists.',{exactResults});
  }

  const blockers=defects.filter(item=>item.blocking);
  record('recovery-diagnostic-summary',blockers.length===0?'PASS':'FAIL',blockers.length===0?'recovery-diagnostics-safe':'recovery-diagnostics-blocked',
    `Sequence-1 recovery diagnostics found ${defects.length} defect(s), including ${blockers.length} blocker(s).`,{defectCount:defects.length,blockerCount:blockers.length,defects});
  if(blockers.length>0) fail('BLOCKED','device-result-recovery-precondition-blocked',`Recovery diagnostics found ${blockers.length} blocker(s): ${blockers.map(item=>item.name+'='+item.summary).join(' | ')}`);

  const commandName=`${command.commandId}.json`;
  const localHasCommand=(relayBefore.outbox??[]).includes(commandName)||(relayBefore.sent??[]).includes(commandName);
  const localHasResult=(relayBefore.inbox??[]).includes(`${commandName}.result.json`);
  if(exactDriveCommandCount>0&&!localHasCommand&&!localHasResult){
    const sentDir=path.join(relayRoot,'sent');
    await fs.mkdir(sentDir,{recursive:true});
    await fs.writeFile(path.join(sentDir,commandName),JSON.stringify(command),'utf8');
    record('relay-sent-reconstitution','PASS','exact-transport-state-repair',
      exactDriveResultCount>0?'Reconstituted only the exact local sent record so the accepted relay can retrieve the already-existing Drive result.':'Reconstituted only the exact local sent record for an already-published Drive command; the accepted agent may safely publish/replay its terminal result.',
      {command,exactDriveCommandCount,exactDriveResultCount});
  }

  target=renderer;
  const agentBootstrap=await injectAgent(retryRunId,controlKey,false);
  record('retry-agent-recovery-bootstrap','PASS','accepted-device-agent','Accepted retry agent was reattached using the existing retry sequence state.',agentBootstrap);

  const hadPriorSequenceOne=Boolean(retryState)||(relayBefore.outbox?.length??0)>0||(relayBefore.sent?.length??0)>0||(relayBefore.inbox?.length??0)>0||((mailboxBefore?.commands??[]).some(item=>Number(item.sequence)===1));
  if(hadPriorSequenceOne){
    const deadline=Date.now()+30000;
    let finalState=null,finalFixture=null,finalRelay=null,finalMailbox=null;
    while(Date.now()<=deadline){
      finalState=await readJson(retryStatePath).catch(()=>null);
      const currentFixtureExists=await exists(canaryPath);
      finalFixture=currentFixtureExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
      finalRelay=await relayRecoverySnapshot(command);
      finalMailbox=await mailboxRecoverySnapshot(target,command).catch(()=>null);
      const inboxExact=exactSequenceOneResult(finalRelay?.inboxRecord,command);
      const stateExact=finalState?.sequence===1&&finalState?.phase==='completed'&&finalState?.commandKey===expectedCommandKey&&exactSequenceOneResult(finalState?.result,command);
      const fixtureExact=finalFixture.exists&&finalFixture.sizeBytes===77&&finalFixture.sha256===expectedCanaryHash;
      const localPending=(finalRelay?.outbox??[]).includes(`${command.commandId}.json`)||(finalRelay?.sent??[]).includes(`${command.commandId}.json`);
      if(inboxExact&&stateExact&&fixtureExact&&!localPending) break;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    const inboxExact=exactSequenceOneResult(finalRelay?.inboxRecord,command);
    const stateExact=finalState?.sequence===1&&finalState?.phase==='completed'&&finalState?.commandKey===expectedCommandKey&&exactSequenceOneResult(finalState?.result,command);
    const fixtureExact=finalFixture?.exists&&finalFixture?.sizeBytes===77&&finalFixture?.sha256===expectedCanaryHash;
    const localPending=(finalRelay?.outbox??[]).includes(`${command.commandId}.json`)||(finalRelay?.sent??[]).includes(`${command.commandId}.json`);
    if(!(inboxExact&&stateExact&&fixtureExact&&!localPending)){
      fail('BLOCKED','device-result-recovery-incomplete',`Sequence-1 recovery did not reach the exact resumable state. stateExact=${stateExact} fixtureExact=${fixtureExact} inboxExact=${inboxExact} localPending=${localPending} state=${JSON.stringify(finalState)} relay=${JSON.stringify(finalRelay)} mailbox=${JSON.stringify(finalMailbox)}`);
    }
    record('device-result-recovery','PASS','sequence1-result-return-restored','Exact sequence-1 terminal result is durable, fixture identity is exact, and the verified result is present in local inbox for deterministic executor consumption.',{state:finalState,fixture:finalFixture,relay:finalRelay,mailbox:finalMailbox});
  } else {
    record('device-result-recovery','PASS','sequence1-not-yet-executed','No durable/local/Drive evidence of sequence-1 execution exists; canonical executor may safely issue deterministic sequence 1.',{retryState,fixture,relayBefore,mailboxBefore});
  }

  const validationHash=await sha256File(mainJs);
  const validationSize=(await fs.stat(mainJs)).size;
  const dataHashBeforeRestore=await sha256File(dataJson);
  validationIdentity=target.snapshot.identity;
  buildIdentity=validationIdentity;
  attempt1SafeState={sequenceState:oldState,fixture:{historicallyVerified:true,sizeBytes:77,sha256:expectedCanaryHash},relay:'attempt1 previously drained'};
  lifecycleEvidence=priorVerdict?.stages?.find(stage=>stage.name==='lifecycle-recovery')?.details??null;
  return {validationHash,validationSize,dataHashBeforeRestore};
}


function retryCommandId(stepIndex, sub) {
  return 'bvp-' + createHash('sha256').update([retryRunId,scenarioId,String(stepIndex),String(sub)].join(String.fromCharCode(0))).digest('hex').slice(0,32);
}

async function recoverRetrySequenceThree(priorVerdict) {
  const defects=[];
  const note=(name,pass,classificationValue,summary,details=undefined,blocking=true)=>{
    record(`recovery3-${name}`,pass?'PASS':'FAIL',classificationValue,summary,details);
    if(!pass)defects.push({name,classification:classificationValue,summary,details,blocking});
  };
  const mainJs=path.join(pluginDir,'main.js');
  const manifest=path.join(pluginDir,'manifest.json');
  const dataJson=path.join(pluginDir,'data.json');
  const productionMainSource=path.join(repoWorktree,'main.js');
  const productionManifestSource=path.join(repoWorktree,'manifest.json');

  const installPresence={mainJs:await exists(mainJs),manifest:await exists(manifest),dataJson:await exists(dataJson)};
  note('validation-install',installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson,'validation-install',
    installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson?'Disposable validation installation remains present.':'Disposable validation installation is incomplete.',installPresence);
  if(installPresence.mainJs){
    const hash=await sha256File(mainJs),size=(await fs.stat(mainJs)).size;
    note('validation-artifact',hash===expectedValidationHash,'validation-artifact-identity',
      hash===expectedValidationHash?`Installed validation artifact remains exact at ${size} bytes.`:`Installed validation artifact mismatch: size=${size} hash=${hash}`,
      {sizeBytes:size,sha256:hash,expectedSha256:expectedValidationHash});
  }
  const productionPresence={mainJs:await exists(productionMainSource),manifest:await exists(productionManifestSource)};
  note('production-restoration-artifacts',productionPresence.mainJs&&productionPresence.manifest,'production-restoration-precondition',
    productionPresence.mainJs&&productionPresence.manifest?'Exact-SHA production restoration artifacts remain available.':'Production restoration artifacts are unavailable.',productionPresence);
  if(productionPresence.mainJs){
    const hash=await sha256File(productionMainSource),size=(await fs.stat(productionMainSource)).size;
    const text=await fs.readFile(productionMainSource,'utf8');
    const hits=['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'].filter(value=>text.includes(value));
    note('production-baseline',hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0,'production-bundle-isolation',
      hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0?'Production restoration baseline remains exact and validation-code-free.':`Production baseline mismatch: size=${size} hash=${hash} markers=${JSON.stringify(hits)}`,
      {sizeBytes:size,sha256:hash,forbiddenMarkerHits:hits});
  }

  const oldState=await readJson(oldStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const oldStateExact=oldState&&!oldState.__error&&oldState.sequence===3&&oldState.phase==='completed'&&oldState.result?.kind==='production-execute'&&oldState.result?.status==='rejected'&&oldState.result?.classification==='production-action-rejected';
  note('attempt1-state',oldStateExact,'attempt1-state',oldStateExact?'Attempt-1 terminal rejected sequence-3 state remains preserved.':'Attempt-1 terminal state no longer matches its frozen safe identity.',oldState);

  const retryState=await readJson(retryStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const seq1=expectedRetrySequenceOne();
  const seq2={runId:retryRunId,deviceId,sequence:2,commandId:retryCommandId(1,0),kind:'production-preview',mode:'manual'};
  const seq2Key=canonicalValue(seq2);
  const seq2StateExact=retryState&&!retryState.__error&&retryState.sequence===2&&retryState.phase==='completed'&&retryState.commandKey===seq2Key&&
    retryState.result?.runId===retryRunId&&retryState.result?.deviceId===deviceId&&retryState.result?.sequence===2&&retryState.result?.commandId===seq2.commandId&&
    retryState.result?.kind==='production-preview'&&retryState.result?.status==='completed'&&retryState.result?.classification==='production-preview-ready'&&
    retryState.result?.plan?.trigger==='manual'&&retryState.result?.plan?.operationCount===7&&retryState.result?.plan?.executionDisposition==='safe-auto-eligible'&&
    retryState.result?.plan?.recoveryCheckpointRequired===false&&retryState.result?.plan?.globalExecutionGate==='none'&&typeof retryState.result?.plan?.planId==='string';
  note('sequence2-state',seq2StateExact,'retry-sequence-state',
    seq2StateExact?'Retry sequence 2 is durably completed with the exact manual-preview contract and seven-operation safe plan.':'Retry sequence 2 is not the exact completed preview state required for sequence-3 recovery.',
    retryState);
  const plan=seq2StateExact?retryState.result.plan:null;
  const seq3=plan?{runId:retryRunId,deviceId,sequence:3,commandId:retryCommandId(1,1),kind:'production-execute',planId:plan.planId}:null;
  const seq3Key=seq3?canonicalValue(seq3):null;

  const fixtureExists=await exists(canaryPath);
  const fixture=fixtureExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
  const fixtureExact=fixture.exists&&fixture.sizeBytes===77&&fixture.sha256===expectedCanaryHash;
  note('fixture-state',fixtureExact,'retry-fixture-state',fixtureExact?'Retry canary fixture remains exact before production execution.':'Retry canary fixture identity is not exact.',fixture);

  let renderer;
  try{renderer=await findRenderer();}catch{renderer=null;}
  const rendererEnvironment=await ensureRendererEnvironment(renderer);
  if(!rendererEnvironment.ok)note('renderer-environment',false,rendererEnvironment.classification??'devtools-environment-repair-failed',rendererEnvironment.reason??'Disposable renderer unavailable.',rendererEnvironment);
  else{
    renderer=rendererEnvironment.target;
    note('renderer-environment',true,'exact-disposable-renderer',rendererEnvironment.repaired?'Disposable renderer was re-established for recovery.':'Existing disposable renderer is reachable.',{repaired:rendererEnvironment.repaired,snapshot:renderer.snapshot,debugPort:renderer.debugPort});
  }

  let capabilities=null,mailboxBefore=null;
  if(renderer){
    try{capabilities=await inspectRendererCapabilities(renderer);}catch(error){capabilities={__error:error instanceof Error?error.message:String(error)};}
    const capPass=!capabilities.__error&&normalized(capabilities.vault)===normalized(vaultPath)&&capabilities.sourceCommit===sourceCommit&&capabilities.deviceAgentFactory===true&&capabilities.mailboxPoll===true&&capabilities.relayPump===true&&capabilities.pluginPresent===true&&capabilities.productionControl===true;
    note('renderer-capabilities',capPass,'renderer-capabilities',capPass?'Renderer exposes all accepted recovery capabilities.':'Renderer is missing one or more required recovery capabilities.',capabilities);
    note('product-ready',capabilities?.productionStatus?.kind==='idle-ready','production-lifecycle',
      capabilities?.productionStatus?.kind==='idle-ready'?'Production lifecycle is idle-ready before sequence-3 execution.':`Production lifecycle is not idle-ready: ${JSON.stringify(capabilities?.productionStatus)}`,
      capabilities?.productionStatus);
    note('renderer-visible',capabilities?.visibility==='visible','renderer-visibility',
      capabilities?.visibility==='visible'?'Renderer is already visible.':`Renderer is currently ${capabilities?.visibility??'unknown'}; a real restore transition is required before sequence-3 execution.`,
      {visibility:capabilities?.visibility},false);
    if(seq3){
      try{mailboxBefore=await mailboxRecoverySnapshot(renderer,seq3);}catch(error){mailboxBefore={ok:false,error:error instanceof Error?error.message:String(error)};}
      note('mailbox-inspection',mailboxBefore?.ok===true,'drive-mailbox-state',mailboxBefore?.ok===true?'Drive mailbox state was inspected without mutation.':'Drive mailbox inspection failed.',mailboxBefore);
    }
  }

  function exactSeq2Result(result){
    return Boolean(result&&result.runId===retryRunId&&result.deviceId===deviceId&&result.sequence===2&&result.commandId===seq2.commandId&&result.kind==='production-preview'&&result.status==='completed'&&result.classification==='production-preview-ready'&&
      result.plan?.planId===plan?.planId&&result.plan?.trigger==='manual'&&result.plan?.operationCount===7&&result.plan?.executionDisposition==='safe-auto-eligible'&&result.plan?.recoveryCheckpointRequired===false&&result.plan?.globalExecutionGate==='none');
  }
  function exactSeq3Result(result){
    return Boolean(result&&seq3&&result.runId===retryRunId&&result.deviceId===deviceId&&result.sequence===3&&result.commandId===seq3.commandId&&result.kind==='production-execute'&&
      result.status==='completed'&&result.classification==='production-complete'&&result.actionResult?.status==='accepted'&&result.receipt?.terminal==='complete'&&
      result.receipt?.requiredEffectsCommittedAndVerified===true&&String(result.receipt?.planId)===seq3.planId);
  }

  const expectedKeys=new Map([[canonicalValue(seq1),1],[seq2Key,2],...(seq3Key?[[seq3Key,3]]:[])]);
  let mailboxGroups={seq1:[],seq2:[],seq3:[],unexpected:[],results:[]};
  if(mailboxBefore?.ok){
    for(const item of mailboxBefore.commands??[]){
      const sequence=expectedKeys.get(canonicalValue(item));
      if(sequence===1)mailboxGroups.seq1.push(item);
      else if(sequence===2)mailboxGroups.seq2.push(item);
      else if(sequence===3)mailboxGroups.seq3.push(item);
      else mailboxGroups.unexpected.push(item);
    }
    mailboxGroups.results=mailboxBefore.commandResults??[];
    const badResults=mailboxGroups.results.filter(entry=>{
      const key=canonicalValue(entry.command),sequence=expectedKeys.get(key);
      if(entry.result==null)return false;
      if(sequence===1)return !exactSequenceOneResult(entry.result,seq1);
      if(sequence===2)return !exactSeq2Result(entry.result);
      if(sequence===3)return !exactSeq3Result(entry.result);
      return true;
    });
    const seq1Results=mailboxGroups.results.filter(entry=>expectedKeys.get(canonicalValue(entry.command))===1&&exactSequenceOneResult(entry.result,seq1));
    const seq2Results=mailboxGroups.results.filter(entry=>expectedKeys.get(canonicalValue(entry.command))===2&&exactSeq2Result(entry.result));
    const seq3Results=mailboxGroups.results.filter(entry=>expectedKeys.get(canonicalValue(entry.command))===3&&entry.result!=null);
    note('mailbox-command-contract',mailboxGroups.unexpected.length===0&&mailboxGroups.seq1.length>0&&mailboxGroups.seq2.length>0&&mailboxGroups.seq3.length>0,'drive-mailbox-command-state',
      mailboxGroups.unexpected.length===0&&mailboxGroups.seq1.length>0&&mailboxGroups.seq2.length>0&&mailboxGroups.seq3.length>0?
        `Drive contains only expected logical retry commands through sequence 3 (duplicates: seq1=${mailboxGroups.seq1.length}, seq2=${mailboxGroups.seq2.length}, seq3=${mailboxGroups.seq3.length}).`:
        'Drive mailbox is missing an expected command or contains an unexpected retry command.',
      {counts:{seq1:mailboxGroups.seq1.length,seq2:mailboxGroups.seq2.length,seq3:mailboxGroups.seq3.length},unexpected:mailboxGroups.unexpected});
    note('mailbox-result-contract',badResults.length===0&&seq1Results.length>0&&seq2Results.length>0&&seq3Results.length===0,'drive-mailbox-result-state',
      badResults.length===0&&seq1Results.length>0&&seq2Results.length>0&&seq3Results.length===0?
        'Sequence 1 and 2 have exact Drive results; sequence 3 has no result yet; no conflicting result exists.':
        'Drive result state is not the exact safe pre-execution sequence-3 state.',
      {seq1ExactResultViews:seq1Results.length,seq2ExactResultViews:seq2Results.length,seq3NonNullResults:seq3Results,badResults});
  }

  const relayDirs={outbox:path.join(relayRoot,'outbox'),sent:path.join(relayRoot,'sent'),inbox:path.join(relayRoot,'inbox')};
  const relayFiles={};
  for(const [name,dir] of Object.entries(relayDirs))relayFiles[name]=(await fs.readdir(dir).catch(()=>[])).sort();
  const allowedNames=new Set([
    `${seq1.commandId}.json`,`${seq1.commandId}.json.result.json`,
    `${seq2.commandId}.json`,`${seq2.commandId}.json.result.json`,
    ...(seq3?[`${seq3.commandId}.json`,`${seq3.commandId}.json.result.json`]:[]),
  ]);
  const unexpectedRelay=Object.fromEntries(Object.entries(relayFiles).map(([name,files])=>[name,files.filter(file=>!allowedNames.has(file))]));
  note('relay-name-bounds',Object.values(unexpectedRelay).every(files=>files.length===0),'relay-state',
    Object.values(unexpectedRelay).every(files=>files.length===0)?'Local relay contains only expected retry command/result names through sequence 3.':'Local relay contains unexpected command/result names.',
    {relayFiles,unexpectedRelay});

  const relayRecordProblems=[];
  async function inspectCommandRecord(dirName,command){
    const file=path.join(relayDirs[dirName],`${command.commandId}.json`);
    if(!(await exists(file)))return;
    try{const value=JSON.parse(await fs.readFile(file,'utf8'));if(canonicalValue(value)!==canonicalValue(command))relayRecordProblems.push({dirName,file,reason:'command-mismatch',value});}
    catch(error){relayRecordProblems.push({dirName,file,reason:'command-unreadable',error:error instanceof Error?error.message:String(error)});}
  }
  async function inspectResultRecord(command,validator){
    const file=path.join(relayDirs.inbox,`${command.commandId}.json.result.json`);
    if(!(await exists(file)))return;
    try{const value=JSON.parse(await fs.readFile(file,'utf8'));if(!validator(value))relayRecordProblems.push({dirName:'inbox',file,reason:'result-mismatch',value});}
    catch(error){relayRecordProblems.push({dirName:'inbox',file,reason:'result-unreadable',error:error instanceof Error?error.message:String(error)});}
  }
  for(const command of [seq1,seq2,...(seq3?[seq3]:[])])for(const dir of ['outbox','sent'])await inspectCommandRecord(dir,command);
  await inspectResultRecord(seq1,value=>exactSequenceOneResult(value,seq1));
  await inspectResultRecord(seq2,exactSeq2Result);
  if(seq3)await inspectResultRecord(seq3,exactSeq3Result);
  note('relay-record-identity',relayRecordProblems.length===0,'relay-record-identity',
    relayRecordProblems.length===0?'All present local relay records exactly match their deterministic command/result identities.':'One or more local relay records are malformed or identity-conflicting.',
    {problems:relayRecordProblems,relayFiles});

  const blockers=defects.filter(item=>item.blocking);
  record('recovery3-diagnostic-summary',blockers.length===0?'PASS':'FAIL',blockers.length===0?'sequence3-recovery-safe':'sequence3-recovery-blocked',
    `Sequence-3 recovery diagnostics observed ${defects.length} issue(s), including ${blockers.length} blocker(s).`,{defectCount:defects.length,blockerCount:blockers.length,defects});
  if(blockers.length>0)fail('BLOCKED','sequence3-recovery-precondition-blocked',`Sequence-3 recovery diagnostics found ${blockers.length} blocker(s): ${blockers.map(item=>item.name+'='+item.summary).join(' | ')}`);

  if(capabilities?.visibility!=='visible'){
    const transition=realSuspendResumeTransition();
    await new Promise(resolve=>setTimeout(resolve,500));
    target=await findRenderer();
    const after=await inspectRendererCapabilities(target);
    lifecycleEvidence={transition,after};
    if(after.visibility!=='visible'||after.productionStatus?.kind!=='idle-ready')fail('BLOCKED','sequence3-lifecycle-recovery-failed',`Renderer/product not ready after real restore: ${JSON.stringify(after)}`);
    record('sequence3-lifecycle-recovery','PASS','real-suspend-resume','Real Windows restore returned the disposable renderer visible and production lifecycle idle-ready before sequence-3 execution.',lifecycleEvidence);
  }else{
    target=renderer;
    lifecycleEvidence={transition:'already-visible',after:capabilities};
  }

  const recoveryBootstrap=await injectAgent(retryRunId,controlKey,false,true);
  if(recoveryBootstrap.visibility!=='visible')fail('BLOCKED','sequence3-agent-hidden',`Recovery agent attached while renderer visibility is ${recoveryBootstrap.visibility}.`);
  record('sequence3-agent-reattach','PASS','accepted-device-agent','Accepted retry agent reattached without automatic relay-first pumping.',recoveryBootstrap);

  const devicePoll=await invokeControlMethod(controlKey,'pollDeviceNow');
  record('sequence3-device-poll','PASS','direct-drive-device-poll','Accepted device mailbox poll was invoked before any recovery relay pump.',devicePoll);
  if(devicePoll?.status!=='ok')fail('BLOCKED','sequence3-device-poll-unavailable',`Device poll did not complete successfully: ${JSON.stringify(devicePoll)}`);

  const stateAfter=await readJson(retryStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const mailboxAfter=await mailboxRecoverySnapshot(target,seq3);
  const seq3Entries=(mailboxAfter.commandResults??[]).filter(entry=>canonicalValue(entry.command)===seq3Key);
  const seq3ExactResults=seq3Entries.filter(entry=>exactSeq3Result(entry.result));
  const seq3WrongResults=seq3Entries.filter(entry=>entry.result!=null&&!exactSeq3Result(entry.result));
  const stateAfterExact=stateAfter&&!stateAfter.__error&&stateAfter.sequence===3&&stateAfter.phase==='completed'&&stateAfter.commandKey===seq3Key&&exactSeq3Result(stateAfter.result);
  if(stateAfter?.phase==='claimed')fail('BLOCKED','prior-outcome-uncertain',`Sequence 3 remains claimed after device polling; production outcome is uncertain. state=${JSON.stringify(stateAfter)} mailbox=${JSON.stringify(mailboxAfter)}`);
  if(!stateAfterExact||seq3ExactResults.length===0||seq3WrongResults.length>0){
    fail('BLOCKED','sequence3-terminal-result-invalid',`Sequence 3 did not reach one exact complete terminal result. stateExact=${stateAfterExact} exactDriveResults=${seq3ExactResults.length} wrongResults=${JSON.stringify(seq3WrongResults)} state=${JSON.stringify(stateAfter)}`);
  }
  record('sequence3-terminal-result','PASS','production-complete','Sequence 3 executed exactly once through durable sequence authority and produced an exact complete production receipt.',{state:stateAfter,exactDriveResultViews:seq3ExactResults.length,devicePoll});

  const expectedCommands=[seq1,seq2,seq3];
  const expectedValidators=new Map([[seq1.commandId,value=>exactSequenceOneResult(value,seq1)],[seq2.commandId,exactSeq2Result],[seq3.commandId,exactSeq3Result]]);
  const mailboxResultById=new Map();
  for(const entry of mailboxAfter.commandResults??[]){
    const validator=expectedValidators.get(entry.command?.commandId);
    if(validator&&validator(entry.result)&&!mailboxResultById.has(entry.command.commandId))mailboxResultById.set(entry.command.commandId,entry.result);
  }
  for(const command of expectedCommands){
    const outFile=path.join(relayDirs.outbox,`${command.commandId}.json`);
    if(await exists(outFile)){
      const value=JSON.parse(await fs.readFile(outFile,'utf8'));
      if(canonicalValue(value)!==canonicalValue(command))fail('BLOCKED','relay-outbox-conflict',`Outbox record conflicts for ${command.commandId}.`);
      await fs.rm(outFile,{force:true});
      record(`sequence${command.sequence}-outbox-dedup`,'PASS','exact-transport-dedup','Removed only an exact already-published outbox duplicate before relay-result recovery.',command);
    }
    const inboxFile=path.join(relayDirs.inbox,`${command.commandId}.json.result.json`);
    if(await exists(inboxFile)){
      const value=JSON.parse(await fs.readFile(inboxFile,'utf8'));
      const validator=expectedValidators.get(command.commandId);
      if(!validator(value))fail('BLOCKED','relay-inbox-conflict',`Inbox result conflicts for ${command.commandId}.`);
      continue;
    }
    const result=mailboxResultById.get(command.commandId);
    if(!result)fail('BLOCKED','drive-result-missing-for-relay-recovery',`No exact Drive result is available for sequence ${command.sequence}.`);
    const sentFile=path.join(relayDirs.sent,`${command.commandId}.json`);
    if(await exists(sentFile)){
      const value=JSON.parse(await fs.readFile(sentFile,'utf8'));
      if(canonicalValue(value)!==canonicalValue(command))fail('BLOCKED','relay-sent-conflict',`Sent record conflicts for ${command.commandId}.`);
    }else{
      await fs.writeFile(sentFile,JSON.stringify(command),'utf8');
      record(`sequence${command.sequence}-sent-reconstitution`,'PASS','exact-transport-state-repair','Reconstituted only the exact local sent record for an already-published Drive command/result.',command);
    }
  }

  const relayPump=await invokeControlMethod(controlKey,'pumpRelayNow');
  if(relayPump?.status!=='ok')fail('BLOCKED','relay-result-return-unavailable',`Accepted relay pump did not complete successfully: ${JSON.stringify(relayPump)}`);
  record('result-return-relay-pump','PASS','accepted-relay-result-return','Accepted relay retrieved existing Drive results after sequence-3 device execution.',relayPump);

  const relayAfter={};
  for(const [name,dir] of Object.entries(relayDirs))relayAfter[name]=(await fs.readdir(dir).catch(()=>[])).sort();
  const finalProblems=[];
  for(const command of expectedCommands){
    const resultFile=path.join(relayDirs.inbox,`${command.commandId}.json.result.json`);
    if(!(await exists(resultFile))){finalProblems.push({sequence:command.sequence,reason:'inbox-result-missing'});continue;}
    try{
      const value=JSON.parse(await fs.readFile(resultFile,'utf8'));
      if(!expectedValidators.get(command.commandId)(value))finalProblems.push({sequence:command.sequence,reason:'inbox-result-mismatch',value});
    }catch(error){finalProblems.push({sequence:command.sequence,reason:'inbox-result-unreadable',error:error instanceof Error?error.message:String(error)});}
    for(const dir of ['outbox','sent'])if(await exists(path.join(relayDirs[dir],`${command.commandId}.json`)))finalProblems.push({sequence:command.sequence,reason:`${dir}-still-present`});
  }
  if(finalProblems.length)fail('BLOCKED','relay-result-return-incomplete',`Exact local result recovery is incomplete: ${JSON.stringify({finalProblems,relayAfter})}`);
  record('sequence1-3-local-results','PASS','canonical-resume-ready','Exact sequence 1, 2, and 3 results are now present in local inbox with no corresponding pending outbox/sent records.',relayAfter);

  await stopControl(controlKey);
  const normalBootstrap=await injectAgent(retryRunId,controlKey,false,false);
  if(normalBootstrap.visibility!=='visible')fail('BLOCKED','normal-agent-resume-hidden',`Normal retry agent resumed while renderer visibility is ${normalBootstrap.visibility}.`);
  record('normal-agent-resume','PASS','accepted-device-agent','Accepted retry agent resumed its normal visibility-aware relay/device polling after sequence-3 recovery.',normalBootstrap);

  const validationHash=await sha256File(mainJs);
  const validationSize=(await fs.stat(mainJs)).size;
  const dataHashBeforeRestore=await sha256File(dataJson);
  validationIdentity=target.snapshot.identity;
  buildIdentity=validationIdentity;
  attempt1SafeState={sequenceState:oldState,fixture:{historicallyVerified:true,sizeBytes:77,sha256:expectedCanaryHash},relay:'attempt1 previously drained'};
  return{validationHash,validationSize,dataHashBeforeRestore};
}


async function recoverPostMailboxConflict(priorVerdict) {
  const defects=[];
  const note=(name,pass,classificationValue,summary,details=undefined,blocking=true)=>{
    record(`postconflict-${name}`,pass?'PASS':'FAIL',classificationValue,summary,details);
    if(!pass)defects.push({name,classification:classificationValue,summary,details,blocking});
  };
  const mainJs=path.join(pluginDir,'main.js');
  const manifest=path.join(pluginDir,'manifest.json');
  const dataJson=path.join(pluginDir,'data.json');
  const productionMainSource=path.join(repoWorktree,'main.js');
  const productionManifestSource=path.join(repoWorktree,'manifest.json');

  const installPresence={mainJs:await exists(mainJs),manifest:await exists(manifest),dataJson:await exists(dataJson)};
  note('validation-install',installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson,'validation-install',
    installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson?'Disposable validation installation remains present.':'Disposable validation installation is incomplete.',installPresence);
  if(installPresence.mainJs){
    const hash=await sha256File(mainJs),size=(await fs.stat(mainJs)).size;
    note('validation-artifact',hash===expectedValidationHash,'validation-artifact-identity',
      hash===expectedValidationHash?`Installed validation artifact remains exact at ${size} bytes.`:`Installed validation artifact mismatch: size=${size} hash=${hash}`,
      {sizeBytes:size,sha256:hash,expectedSha256:expectedValidationHash});
  }
  const productionPresence={mainJs:await exists(productionMainSource),manifest:await exists(productionManifestSource)};
  note('production-restoration-artifacts',productionPresence.mainJs&&productionPresence.manifest,'production-restoration-precondition',
    productionPresence.mainJs&&productionPresence.manifest?'Exact-SHA production restoration artifacts remain available.':'Production restoration artifacts are unavailable.',productionPresence);
  if(productionPresence.mainJs){
    const hash=await sha256File(productionMainSource),size=(await fs.stat(productionMainSource)).size;
    const text=await fs.readFile(productionMainSource,'utf8');
    const hits=['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'].filter(value=>text.includes(value));
    note('production-baseline',hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0,'production-bundle-isolation',
      hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0?'Production restoration baseline remains exact and validation-code-free.':`Production baseline mismatch: size=${size} hash=${hash} markers=${JSON.stringify(hits)}`,
      {sizeBytes:size,sha256:hash,forbiddenMarkerHits:hits});
  }

  const oldState=await readJson(oldStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const oldStateExact=oldState&&!oldState.__error&&oldState.sequence===3&&oldState.phase==='completed'&&oldState.result?.kind==='production-execute'&&oldState.result?.status==='rejected'&&oldState.result?.classification==='production-action-rejected';
  note('attempt1-state',oldStateExact,'attempt1-state',oldStateExact?'Attempt-1 terminal rejected sequence-3 state remains preserved.':'Attempt-1 terminal state no longer matches its frozen safe identity.',oldState);

  let renderer;
  try{renderer=await findRenderer();}catch{renderer=null;}
  const rendererEnvironment=await ensureRendererEnvironment(renderer);
  if(!rendererEnvironment.ok)note('renderer-environment',false,rendererEnvironment.classification??'devtools-environment-repair-failed',rendererEnvironment.reason??'Disposable renderer unavailable.',rendererEnvironment);
  else{
    renderer=rendererEnvironment.target;
    target=renderer;
    note('renderer-environment',true,'exact-disposable-renderer',rendererEnvironment.repaired?'Disposable renderer was re-established for recovery.':'Existing disposable renderer is reachable.',{repaired:rendererEnvironment.repaired,snapshot:renderer.snapshot,debugPort:renderer.debugPort});
  }

  let quiesced=null;
  if(renderer){
    quiesced=await quiesceControlAndObserve(renderer,controlKey).catch(error=>({error:error instanceof Error?error.message:String(error)}));
    const quiescePass=!quiesced?.error&&normalized(quiesced?.vault)===normalized(vaultPath);
    note('control-quiesce',quiescePass,'recovery-agent-quiesced',
      quiescePass?'Any prior S08F control was stopped before post-conflict inspection and before any visibility transition.':'Unable to quiesce/inspect the prior S08F control safely.',
      quiesced);
  }

  const retryState=await readJson(retryStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const seq1=expectedRetrySequenceOne();
  const priorSeq2Stage=priorVerdict?.stages?.find(stage=>stage.name==='recovery3-sequence2-state');
  const priorSeq2State=priorSeq2Stage?.details;
  const seq2={runId:retryRunId,deviceId,sequence:2,commandId:retryCommandId(1,0),kind:'production-preview',mode:'manual'};
  const priorSeq2Result=priorSeq2State?.result;
  const seq2ResultExact=Boolean(priorSeq2Result&&priorSeq2Result.runId===retryRunId&&priorSeq2Result.deviceId===deviceId&&priorSeq2Result.sequence===2&&priorSeq2Result.commandId===seq2.commandId&&
    priorSeq2Result.kind==='production-preview'&&priorSeq2Result.status==='completed'&&priorSeq2Result.classification==='production-preview-ready'&&
    priorSeq2Result.plan?.trigger==='manual'&&priorSeq2Result.plan?.operationCount===7&&priorSeq2Result.plan?.executionDisposition==='safe-auto-eligible'&&
    priorSeq2Result.plan?.recoveryCheckpointRequired===false&&priorSeq2Result.plan?.globalExecutionGate==='none'&&typeof priorSeq2Result.plan?.planId==='string');
  note('prior-sequence2-evidence',seq2ResultExact,'retry-sequence2-evidence',
    seq2ResultExact?'Prior evidence contains the exact completed sequence-2 seven-operation preview result.':'Prior evidence does not contain an exact recoverable sequence-2 preview result.',
    priorSeq2Stage??null);
  const plan=seq2ResultExact?priorSeq2Result.plan:null;
  const seq3=plan?{runId:retryRunId,deviceId,sequence:3,commandId:retryCommandId(1,1),kind:'production-execute',planId:plan.planId}:null;
  const seq3Key=seq3?canonicalValue(seq3):null;

  function exactSeq3Result(result){
    return Boolean(result&&seq3&&result.runId===retryRunId&&result.deviceId===deviceId&&result.sequence===3&&result.commandId===seq3.commandId&&result.kind==='production-execute'&&
      result.status==='completed'&&result.classification==='production-complete'&&result.actionResult?.status==='accepted'&&result.receipt?.terminal==='complete'&&
      result.receipt?.requiredEffectsCommittedAndVerified===true&&String(result.receipt?.planId)===seq3.planId);
  }
  const stateCompletedExact=retryState&&!retryState.__error&&retryState.sequence===3&&retryState.phase==='completed'&&retryState.commandKey===seq3Key&&exactSeq3Result(retryState.result);
  const stateClaimed=retryState&&!retryState.__error&&retryState.sequence===3&&retryState.phase==='claimed';
  note('sequence3-durable-state',stateCompletedExact,'retry-sequence3-state',
    stateCompletedExact?'Retry sequence 3 is durably completed with the exact production-complete result.':
      stateClaimed?'Retry sequence 3 is claimed without a terminal result; production outcome is uncertain.':
      `Retry durable state is not the exact completed sequence-3 state: ${JSON.stringify(retryState)}`,
    retryState);

  const latestReceipt=quiesced?.latestReceipt??null;
  const receiptExact=Boolean(stateCompletedExact&&latestReceipt&&String(latestReceipt.planId)===seq3.planId&&latestReceipt.terminal==='complete'&&latestReceipt.requiredEffectsCommittedAndVerified===true&&
    latestReceipt.runId===retryState.result.receipt?.runId&&latestReceipt.committedOperationCount===retryState.result.receipt?.committedOperationCount&&latestReceipt.skippedOperationCount===retryState.result.receipt?.skippedOperationCount);
  note('production-receipt-authority',receiptExact,'production-receipt',
    receiptExact?'Production latest-receipt authority independently matches the durable sequence-3 complete result.':'Production latest receipt does not independently confirm the durable sequence-3 complete result.',
    {latestReceipt,durableReceipt:retryState?.result?.receipt??null});

  const fixtureExists=await exists(canaryPath);
  const fixture=fixtureExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
  const fixtureExact=fixture.exists&&fixture.sizeBytes===77&&fixture.sha256===expectedCanaryHash;
  note('fixture-state',fixtureExact,'retry-fixture-state',fixtureExact?'Retry canary fixture remains exact after sequence-3 race recovery.':'Retry canary fixture identity is not exact.',fixture);

  let mailbox=null;
  if(renderer&&seq3){
    mailbox=await mailboxRecoverySnapshot(renderer,seq3).catch(error=>({ok:false,error:error instanceof Error?error.message:String(error)}));
    note('mailbox-inspection',mailbox?.ok===true,'drive-mailbox-state',mailbox?.ok===true?'Drive mailbox command/result state was inspected without mutation.':'Drive mailbox inspection failed.',mailbox);
  }
  if(mailbox?.ok){
    const expectedKeys=new Map([[canonicalValue(seq1),1],[canonicalValue(seq2),2],[canonicalValue(seq3),3]]);
    const groups={seq1:[],seq2:[],seq3:[],unexpected:[]};
    for(const command of mailbox.commands??[]){
      const sequence=expectedKeys.get(canonicalValue(command));
      if(sequence===1)groups.seq1.push(command);else if(sequence===2)groups.seq2.push(command);else if(sequence===3)groups.seq3.push(command);else groups.unexpected.push(command);
    }
    const nonConflictErrors=(mailbox.commandResults??[]).filter(entry=>entry.resultError&&entry.resultError!=='mailbox-conflicting-result');
    const successfulUnexpected=(mailbox.commandResults??[]).filter(entry=>{
      if(!entry.result)return false;
      const sequence=expectedKeys.get(canonicalValue(entry.command));
      if(sequence===1)return !exactSequenceOneResult(entry.result,seq1);
      if(sequence===2)return !(entry.result.runId===priorSeq2Result?.runId&&entry.result.deviceId===priorSeq2Result?.deviceId&&entry.result.sequence===2&&entry.result.commandId===seq2.commandId&&entry.result.kind==='production-preview'&&entry.result.status==='completed'&&entry.result.classification==='production-preview-ready'&&entry.result.plan?.planId===plan?.planId);
      if(sequence===3)return !exactSeq3Result(entry.result);
      return true;
    });
    note('mailbox-command-bounds',groups.unexpected.length===0&&groups.seq1.length>0&&groups.seq2.length>0&&groups.seq3.length>0,'drive-mailbox-command-state',
      groups.unexpected.length===0&&groups.seq1.length>0&&groups.seq2.length>0&&groups.seq3.length>0?
        `Drive contains only expected logical r2 commands through sequence 3 (records: seq1=${groups.seq1.length}, seq2=${groups.seq2.length}, seq3=${groups.seq3.length}).`:
        'Drive contains an unexpected command or is missing an expected logical command.',
      groups);
    note('mailbox-conflict-scope',nonConflictErrors.length===0&&successfulUnexpected.length===0,'drive-mailbox-result-state',
      nonConflictErrors.length===0&&successfulUnexpected.length===0?'Any mailbox lookup failures are confined to strict same-header result conflicts; no successfully decoded conflicting payload was observed.':'Mailbox contains a non-conflict lookup failure or a successfully decoded result inconsistent with authoritative state.',
      {nonConflictErrors,successfulUnexpected,resultViews:mailbox.commandResults});
  }

  const relayDirs={outbox:path.join(relayRoot,'outbox'),sent:path.join(relayRoot,'sent'),inbox:path.join(relayRoot,'inbox')};
  const relayProblems=[];
  const expectedCommands=[seq1,seq2,...(seq3?[seq3]:[])];
  const expectedById=new Map(expectedCommands.map(command=>[command.commandId,command]));
  for(const [dirName,dir] of Object.entries(relayDirs)){
    for(const file of await fs.readdir(dir).catch(()=>[])){
      const isResult=file.endsWith('.result.json');
      const commandId=isResult?file.slice(0,-'.json.result.json'.length):file.slice(0,-'.json'.length);
      const command=expectedById.get(commandId);
      if(!command){relayProblems.push({dirName,file,reason:'unexpected-name'});continue;}
      const full=path.join(dir,file);
      try{
        const value=JSON.parse(await fs.readFile(full,'utf8'));
        if(isResult){
          const ok=command.sequence===1?exactSequenceOneResult(value,seq1):command.sequence===2?
            (value.runId===priorSeq2Result?.runId&&value.deviceId===priorSeq2Result?.deviceId&&value.sequence===2&&value.commandId===seq2.commandId&&value.kind==='production-preview'&&value.status==='completed'&&value.classification==='production-preview-ready'&&value.plan?.planId===plan?.planId):
            exactSeq3Result(value);
          if(!ok)relayProblems.push({dirName,file,reason:'result-mismatch',value});
        }else if(canonicalValue(value)!==canonicalValue(command))relayProblems.push({dirName,file,reason:'command-mismatch',value});
      }catch(error){relayProblems.push({dirName,file,reason:'unreadable',error:error instanceof Error?error.message:String(error)});}
    }
  }
  note('relay-state',relayProblems.length===0,'relay-record-identity',
    relayProblems.length===0?'All present local relay records are bounded to exact expected r2 commands/results through sequence 3.':'Local relay contains an unexpected or conflicting record.',
    {relayProblems});

  const blockers=defects.filter(item=>item.blocking);
  record('postconflict-diagnostic-summary',blockers.length===0?'PASS':'FAIL',blockers.length===0?'postconflict-recovery-safe':'postconflict-recovery-blocked',
    `Post-conflict diagnostics observed ${defects.length} issue(s), including ${blockers.length} blocker(s).`,{defectCount:defects.length,blockerCount:blockers.length,defects});
  if(blockers.length>0)fail('BLOCKED',stateClaimed?'prior-outcome-uncertain':'postconflict-recovery-precondition-blocked',
    `Post-conflict recovery found ${blockers.length} blocker(s): ${blockers.map(item=>item.name+'='+item.summary).join(' | ')}`);

  const seq1Result={runId:retryRunId,deviceId,sequence:1,commandId:seq1.commandId,kind:'fixture-put',status:'completed',classification:'fixture-verified',fixture:{exists:true,sizeBytes:77,sha256:expectedCanaryHash}};
  const known=[
    {command:seq1,result:seq1Result},
    {command:seq2,result:priorSeq2Result},
    {command:seq3,result:retryState.result},
  ];
  const knownById=Object.fromEntries(known.map(entry=>[entry.command.commandId,entry]));

  for(const {command,result} of known){
    for(const dirName of ['outbox','sent']){
      const file=path.join(relayDirs[dirName],`${command.commandId}.json`);
      if(await exists(file)){
        const value=JSON.parse(await fs.readFile(file,'utf8'));
        if(canonicalValue(value)!==canonicalValue(command))fail('BLOCKED','relay-command-conflict',`Cannot remove conflicting ${dirName} record for ${command.commandId}.`);
        await fs.rm(file,{force:true});
        record(`postconflict-seq${command.sequence}-${dirName}-cleanup`,'PASS','exact-transport-dedup',`Removed only an exact already-published ${dirName} record for recovered sequence ${command.sequence}.`,command);
      }
    }
    const inboxFile=path.join(relayDirs.inbox,`${command.commandId}.json.result.json`);
    if(await exists(inboxFile)){
      const value=JSON.parse(await fs.readFile(inboxFile,'utf8'));
      const exact=command.sequence===1?exactSequenceOneResult(value,seq1):command.sequence===2?
        (value.runId===priorSeq2Result.runId&&value.deviceId===priorSeq2Result.deviceId&&value.sequence===2&&value.commandId===seq2.commandId&&value.kind==='production-preview'&&value.status==='completed'&&value.classification==='production-preview-ready'&&value.plan?.planId===plan.planId):
        exactSeq3Result(value);
      if(!exact)fail('BLOCKED','relay-result-conflict',`Existing inbox result conflicts for sequence ${command.sequence}.`);
    }else{
      await fs.writeFile(inboxFile,JSON.stringify(result),'utf8');
      record(`postconflict-seq${command.sequence}-inbox-reconstitution`,'PASS','authoritative-result-recovery',`Reconstituted exact local inbox result for already-completed sequence ${command.sequence} from verified authoritative state/evidence.`,result);
    }
  }

  const shim=await installMailboxResultRecoveryShim(target,knownById);
  record('postconflict-mailbox-shim','PASS','scoped-result-conflict-recovery','Installed a temporary mailbox result shim scoped only to exact already-completed r2 sequences 1-3; later commands retain original strict mailbox behavior.',shim);

  const currentCaps=await inspectRendererCapabilities(target);
  if(currentCaps.visibility!=='visible'){
    const transition=realSuspendResumeTransition();
    await new Promise(resolve=>setTimeout(resolve,500));
    target=await findRenderer();
    const after=await inspectRendererCapabilities(target);
    lifecycleEvidence={transition,after};
    if(after.visibility!=='visible'||after.productionStatus?.kind!=='idle-ready')fail('BLOCKED','postconflict-lifecycle-recovery-failed',`Renderer/product not ready after restore: ${JSON.stringify(after)}`);
    record('postconflict-lifecycle-recovery','PASS','real-suspend-resume','After the old control was quiesced, a real Windows restore returned the disposable renderer visible and idle-ready.',lifecycleEvidence);
  }else{
    lifecycleEvidence={transition:'already-visible-after-quiesce',after:currentCaps};
  }

  const normalBootstrap=await injectAgent(retryRunId,controlKey,false,false);
  if(normalBootstrap.visibility!=='visible')fail('BLOCKED','postconflict-agent-hidden',`Normal retry agent resumed while renderer visibility is ${normalBootstrap.visibility}.`);
  record('postconflict-normal-agent-resume','PASS','accepted-device-agent','Accepted retry agent resumed normal visibility-aware relay/device polling with the scoped historical-result shim active.',normalBootstrap);

  const validationHash=await sha256File(mainJs);
  const validationSize=(await fs.stat(mainJs)).size;
  const dataHashBeforeRestore=await sha256File(dataJson);
  validationIdentity=target.snapshot.identity;
  buildIdentity=validationIdentity;
  attempt1SafeState={sequenceState:oldState,fixture:{historicallyVerified:true,sizeBytes:77,sha256:expectedCanaryHash},relay:'attempt1 previously drained'};
  return{validationHash,validationSize,dataHashBeforeRestore};
}


function exactR2UncertainReceipt(receipt,retryCommand) {
  return Boolean(
    receipt &&
    retryCommand &&
    String(receipt.planId)===String(retryCommand.planId) &&
    receipt.trigger==='manual' &&
    receipt.terminal==='uncertain' &&
    receipt.requiredEffectsCommittedAndVerified===false &&
    receipt.committedOperationCount===0 &&
    receipt.skippedOperationCount===0 &&
    receipt.reasonCode==='uncertain-physical-outcome'
  );
}

function evaluateR2UncertainAuthority(priorVerdict,retryCommand,liveObservation) {
  const priorStage=(priorVerdict?.stages??[]).find(stage=>
    stage?.name==='r2recovery-uncertain-production-authority' &&
    stage?.status==='PASS' &&
    stage?.classification==='uncertain-physical-outcome'
  );
  const historicalReceipt=priorStage?.details?.latestReceipt??null;
  const historicalStatus=priorStage?.details?.productStatus??null;
  const historicalCommand=priorStage?.details?.retryCommand??null;
  const historicalExact=Boolean(
    priorStage &&
    historicalStatus?.kind==='recovery-required' &&
    historicalCommand &&
    retryCommand &&
    canonicalValue(historicalCommand)===canonicalValue(retryCommand) &&
    exactR2UncertainReceipt(historicalReceipt,retryCommand)
  );
  const liveStatus=liveObservation?.productStatus??null;
  const liveReceipt=liveObservation?.latestReceipt??null;
  const liveRecoveryRequired=liveStatus?.kind==='recovery-required';
  const liveReceiptCompatible=liveReceipt==null || exactR2UncertainReceipt(liveReceipt,retryCommand);
  return {
    pass: historicalExact && liveRecoveryRequired && liveReceiptCompatible,
    historicalExact,
    liveRecoveryRequired,
    liveReceiptCompatible,
    historicalStatus,
    historicalReceipt,
    historicalCommand,
    liveStatus,
    liveReceipt,
  };
}

async function recoverR2ProductAuthority(priorVerdict) {
  const defects=[];
  const note=(name,pass,classificationValue,summary,details=undefined,blocking=true)=>{
    record(`r2recovery-${name}`,pass?'PASS':'FAIL',classificationValue,summary,details);
    if(!pass)defects.push({name,classification:classificationValue,summary,details,blocking});
  };
  const mainJs=path.join(pluginDir,'main.js');
  const manifest=path.join(pluginDir,'manifest.json');
  const dataJson=path.join(pluginDir,'data.json');
  const productionMainSource=path.join(repoWorktree,'main.js');
  const productionManifestSource=path.join(repoWorktree,'manifest.json');

  const installPresence={mainJs:await exists(mainJs),manifest:await exists(manifest),dataJson:await exists(dataJson)};
  note('validation-install',installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson,'validation-install',
    installPresence.mainJs&&installPresence.manifest&&installPresence.dataJson?'Disposable validation installation remains present.':'Disposable validation installation is incomplete.',installPresence);
  if(installPresence.mainJs){
    const hash=await sha256File(mainJs),size=(await fs.stat(mainJs)).size;
    note('validation-artifact',hash===expectedValidationHash,'validation-artifact-identity',
      hash===expectedValidationHash?`Installed validation artifact remains exact at ${size} bytes.`:`Installed validation artifact mismatch: size=${size} hash=${hash}`,
      {sizeBytes:size,sha256:hash,expectedSha256:expectedValidationHash});
  }
  const productionPresence={mainJs:await exists(productionMainSource),manifest:await exists(productionManifestSource)};
  note('production-restoration-artifacts',productionPresence.mainJs&&productionPresence.manifest,'production-restoration-precondition',
    productionPresence.mainJs&&productionPresence.manifest?'Exact-SHA production restoration artifacts remain available.':'Production restoration artifacts are unavailable.',productionPresence);
  if(productionPresence.mainJs){
    const hash=await sha256File(productionMainSource),size=(await fs.stat(productionMainSource)).size;
    const text=await fs.readFile(productionMainSource,'utf8');
    const hits=['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'].filter(value=>text.includes(value));
    note('production-baseline',hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0,'production-bundle-isolation',
      hash===expectedProductionHash&&size===expectedProductionSize&&hits.length===0?'Production restoration baseline remains exact and validation-code-free.':`Production baseline mismatch: size=${size} hash=${hash} markers=${JSON.stringify(hits)}`,
      {sizeBytes:size,sha256:hash,forbiddenMarkerHits:hits});
  }

  const oldState=await readJson(oldStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  const oldStateExact=oldState&&!oldState.__error&&oldState.sequence===3&&oldState.phase==='completed'&&oldState.result?.kind==='production-execute'&&oldState.result?.status==='rejected'&&oldState.result?.classification==='production-action-rejected';
  note('attempt1-state',oldStateExact,'attempt1-state',oldStateExact?'Attempt-1 terminal rejected sequence-3 state remains preserved.':'Attempt-1 terminal state no longer matches its frozen safe identity.',oldState);

  const retryState=await readJson(retryStatePath).catch(error=>({__error:error instanceof Error?error.message:String(error)}));
  let retryCommand=null;
  try{retryCommand=retryState?.commandKey?JSON.parse(retryState.commandKey):null;}catch{}
  const retryRejectedExact=Boolean(retryState&&!retryState.__error&&retryState.sequence===3&&retryState.phase==='completed'&&retryCommand&&
    retryCommand.runId===retryRunId&&retryCommand.deviceId===deviceId&&retryCommand.sequence===3&&retryCommand.kind==='production-execute'&&
    retryState.result?.runId===retryRunId&&retryState.result?.deviceId===deviceId&&retryState.result?.sequence===3&&retryState.result?.commandId===retryCommand.commandId&&
    retryState.result?.kind==='production-execute'&&retryState.result?.status==='rejected'&&retryState.result?.classification==='production-action-rejected'&&
    retryState.result?.actionResult?.status==='rejected'&&retryState.result?.actionResult?.reason==='reviewed plan failed before safe progress could complete');
  note('r2-terminal-state',retryRejectedExact,'r2-terminal-rejected',
    retryRejectedExact?'Retry r2 sequence 3 is durably terminal as the exact rejected production execution; it will not be replayed.':'Retry r2 durable state is not the exact terminal rejected sequence-3 state required for bounded authority recovery.',
    {retryState,retryCommand});

  const fixtureExists=await exists(canaryPath);
  const fixture=fixtureExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
  const fixtureExact=fixture.exists&&fixture.sizeBytes===77&&fixture.sha256===expectedCanaryHash;
  note('fixture-state',fixtureExact,'retry-fixture-state',fixtureExact?'Retry canary fixture remains exact before product-authority recovery.':'Retry canary fixture identity is not exact.',fixture);

  let renderer;
  try{renderer=await findRenderer();}catch{renderer=null;}
  const rendererEnvironment=await ensureRendererEnvironment(renderer);
  if(!rendererEnvironment.ok)note('renderer-environment',false,rendererEnvironment.classification??'devtools-environment-repair-failed',rendererEnvironment.reason??'Disposable renderer unavailable.',rendererEnvironment);
  else{
    renderer=rendererEnvironment.target;
    target=renderer;
    note('renderer-environment',true,'exact-disposable-renderer',rendererEnvironment.repaired?'Disposable renderer was re-established for recovery.':'Existing disposable renderer is reachable.',{repaired:rendererEnvironment.repaired,snapshot:renderer.snapshot,debugPort:renderer.debugPort});
  }

  let quiesced=null;
  if(renderer){
    const beforeReload=await quiesceControlAndObserve(renderer,controlKey).catch(error=>({error:error instanceof Error?error.message:String(error)}));
    const beforeReloadPass=!beforeReload?.error&&normalized(beforeReload?.vault)===normalized(vaultPath);
    note('control-quiesce-before-reload',beforeReloadPass,'recovery-agent-quiesced',
      beforeReloadPass?'Any prior S08F control was stopped before repaired validation reload.':'Unable to quiesce/inspect the prior S08F control safely before reload.',beforeReload);
    if(!beforeReloadPass){
      renderer=null;
      target=null;
    }
  }

  if(renderer){
    const beforeSource=renderer.snapshot?.sourceCommit??null;
    if(beforeSource!==sourceCommit){
      const reloadExpression=`(async()=>{
        try{
          const id='brain-google-drive-sync';
          const app=globalThis.app;
          if(!app?.plugins)return{ok:false,reason:'plugin-manager-unavailable'};
          if(typeof app.plugins.disablePlugin==='function')await app.plugins.disablePlugin(id);
          if(typeof app.plugins.enablePlugin!=='function')return{ok:false,reason:'plugin-enable-unavailable'};
          await app.plugins.enablePlugin(id);
          await new Promise(resolve=>setTimeout(resolve,750));
          return{ok:true,sourceCommit:globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit??null};
        }catch(error){return{ok:false,reason:'plugin-reload-exception',error:error instanceof Error?(error.stack??error.message):String(error)}}
      })()`;
      const reload=await cdpEval(renderer.candidate.webSocketDebuggerUrl,reloadExpression,45000).catch(error=>({ok:false,reason:'plugin-reload-cdp-failed',error:error instanceof Error?error.message:String(error)}));
      await new Promise(resolve=>setTimeout(resolve,500));
      try{renderer=await findRenderer();target=renderer;}catch{renderer=null;target=null;}
      const reloadedCaps=renderer?await inspectRendererCapabilities(renderer).catch(error=>({error:error instanceof Error?error.message:String(error)})):null;
      const reloadPass=reload?.ok===true&&reloadedCaps?.sourceCommit===sourceCommit&&reloadedCaps?.productionControl===true;
      note('validation-plugin-reload',reloadPass,'repaired-validation-loaded',
        reloadPass?`Repaired validation artifact loaded from exact source ${sourceCommit}.`:'Repaired validation artifact did not load with the exact expected identity.',
        {beforeSource,reload,reloadedCaps,expectedSource:sourceCommit});
      if(!reloadPass){
        renderer=null;
        target=null;
      }
    }else{
      note('validation-plugin-reload',true,'repaired-validation-already-loaded',
        `Disposable renderer already runs repaired validation source ${sourceCommit}.`,{sourceCommit:beforeSource});
    }
  }

  if(renderer){
    quiesced=await quiesceControlAndObserve(renderer,controlKey).catch(error=>({error:error instanceof Error?error.message:String(error)}));
    const quiescePass=!quiesced?.error&&normalized(quiesced?.vault)===normalized(vaultPath)&&quiesced?.sourceCommit===sourceCommit;
    note('control-quiesce',quiescePass,'recovery-agent-quiesced',
      quiescePass?'Repaired validation renderer is exact and any S08F control is quiesced before product recovery.':'Unable to establish the repaired validation renderer/control state safely.',quiesced);
  }else{
    note('control-quiesce',false,'recovery-agent-quiesced','Repaired validation renderer is unavailable after reload.',null);
  }

  const uncertainAuthority=evaluateR2UncertainAuthority(priorVerdict,retryCommand,quiesced);
  const uncertainReceipt=uncertainAuthority.historicalReceipt;
  const uncertainExact=uncertainAuthority.pass;
  note('uncertain-production-authority',uncertainExact,'uncertain-physical-outcome',
    uncertainExact?'Repository-preserved prior physical evidence proves the exact uncertain r2 receipt, while the repaired live controller independently remains recovery-required; an absent live receipt after plugin reload is expected because receipts are in-memory only.':'Historical uncertain-receipt evidence and live repaired-controller recovery authority do not reconcile safely.',
    {retryCommand,uncertainAuthority});

  let mailbox=null;
  if(renderer&&retryCommand){
    mailbox=await mailboxRecoverySnapshot(renderer,retryCommand).catch(error=>({ok:false,error:error instanceof Error?error.message:String(error)}));
    note('mailbox-inspection',mailbox?.ok===true,'drive-mailbox-state',mailbox?.ok===true?'Drive mailbox was inspected without mutation.':'Drive mailbox inspection failed.',mailbox);
  }
  if(mailbox?.ok){
    const expectedSeq1=expectedRetrySequenceOne();
    const expectedSeq2={runId:retryRunId,deviceId,sequence:2,commandId:retryCommandId(1,0),kind:'production-preview',mode:'manual'};
    const keys=new Set([canonicalValue(expectedSeq1),canonicalValue(expectedSeq2),canonicalValue(retryCommand)]);
    const unexpected=(mailbox.commands??[]).filter(command=>!keys.has(canonicalValue(command)));
    note('mailbox-command-bounds',unexpected.length===0,'drive-mailbox-command-state',
      unexpected.length===0?'Drive mailbox contains no logical r2 command outside expected sequences 1-3.':'Drive mailbox contains an unexpected r2 command.',
      {unexpected,commandCount:(mailbox.commands??[]).length});
  }

  const expectedIds=new Set([
    expectedRetrySequenceOne().commandId,
    retryCommandId(1,0),
    ...(retryCommand?.commandId?[retryCommand.commandId]:[]),
  ]);
  const relayProblems=[];
  for(const dirName of ['outbox','sent','inbox']){
    const dir=path.join(relayRoot,dirName);
    for(const file of await fs.readdir(dir).catch(()=>[])){
      const commandId=file.endsWith('.json.result.json')?file.slice(0,-'.json.result.json'.length):file.endsWith('.json')?file.slice(0,-'.json'.length):'';
      if(!expectedIds.has(commandId)){relayProblems.push({dirName,file,reason:'unexpected-name'});continue;}
      if(dirName==='inbox'&&retryCommand&&commandId===retryCommand.commandId){
        try{
          const value=JSON.parse(await fs.readFile(path.join(dir,file),'utf8'));
          if(canonicalValue(value)!==canonicalValue(retryState.result))relayProblems.push({dirName,file,reason:'r2-terminal-result-mismatch',value});
        }catch(error){relayProblems.push({dirName,file,reason:'unreadable',error:error instanceof Error?error.message:String(error)});}
      }
    }
  }
  note('relay-bounds',relayProblems.length===0,'relay-record-identity',
    relayProblems.length===0?'Local relay contains only bounded r2 transport records; the sequence-3 inbox record matches the durable rejected result when present.':'Local relay contains an unexpected or conflicting record.',
    {relayProblems});

  const blockers=defects.filter(item=>item.blocking);
  record('r2recovery-diagnostic-summary',blockers.length===0?'PASS':'FAIL',blockers.length===0?'product-recovery-preconditions-safe':'product-recovery-preconditions-blocked',
    `R2 product-authority recovery diagnostics observed ${defects.length} issue(s), including ${blockers.length} blocker(s).`,{defectCount:defects.length,blockerCount:blockers.length,defects});
  if(blockers.length>0)fail('BLOCKED','r2-product-recovery-precondition-blocked',
    `R2 product recovery found ${blockers.length} blocker(s): ${blockers.map(item=>item.name+'='+item.summary).join(' | ')}`);

  let currentCaps=await inspectRendererCapabilities(target);
  if(currentCaps.visibility!=='visible'){
    const transition=realSuspendResumeTransition();
    await new Promise(resolve=>setTimeout(resolve,500));
    target=await findRenderer();
    currentCaps=await inspectRendererCapabilities(target);
    lifecycleEvidence={transition,after:currentCaps};
    if(currentCaps.visibility!=='visible')fail('BLOCKED','r2-product-recovery-renderer-hidden',`Renderer remained ${currentCaps.visibility} after real restore.`);
    record('r2recovery-lifecycle','PASS','real-suspend-resume','After quiescing the old control, a real Windows restore returned the disposable renderer visible for product recovery.',lifecycleEvidence);
  }else{
    lifecycleEvidence={transition:'already-visible-after-quiesce',after:currentCaps};
  }

  const previewExpression=`(async()=>{
    try{
      const plugin=globalThis.app?.plugins?.plugins?.['brain-google-drive-sync'];
      const production=plugin?.productionVerificationControl?.();
      if(!production)return{ok:false,reason:'production-control-unavailable'};
      const beforeStatus=production.currentStatus();
      const beforeReceipt=production.latestProductionRunReceipt();
      const plan=await production.previewManual();
      return{ok:true,beforeStatus,beforeReceipt,plan:plan?structuredClone(plan):null,afterStatus:production.currentStatus(),afterReceipt:production.latestProductionRunReceipt()??null};
    }catch(error){return{ok:false,reason:'preview-exception',error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`;
  const preview=await cdpEval(target.candidate.webSocketDebuggerUrl,previewExpression,120000);
  if(!preview?.ok)fail('BLOCKED','r2-product-recovery-preview-failed',`Product recovery preview failed: ${JSON.stringify(preview)}`);
  record('r2recovery-preview','PASS','product-recovery-preview','Accepted production preview invoked the product recovery path and returned a full reviewed recovery plan.',preview);

  const plan=preview.plan;
  if(!plan||!Array.isArray(plan.operations))fail('BLOCKED','r2-product-recovery-plan-unavailable',`Recovery preview returned no executable plan: ${JSON.stringify(preview)}`);
  const forbiddenKinds=new Set(['trash-local','trash-remote','blocked-unsafe','unresolved-conflict','recovery-required']);
  const unsafeOperations=plan.operations.filter(operation=>operation?.destructive===true||forbiddenKinds.has(operation?.kind));
  const planSafe=plan.trigger==='manual'&&plan.globalExecutionGate==='none'&&plan.recoveryCheckpointRequired===false&&
    ['safe-auto-eligible','requires-user-approval'].includes(plan.executionDisposition)&&unsafeOperations.length===0;
  record('r2recovery-plan-gate',planSafe?'PASS':'FAIL','reviewed-recovery-plan-safety',
    planSafe?`Recovery plan is reviewed, ungated, non-destructive, conflict-free, and contains ${plan.operations.length} operation(s).`:
      'Recovery plan is not safe for bounded automatic execution by this harness.',
    {plan,unsafeOperations});
  if(!planSafe)fail('BLOCKED','r2-product-recovery-plan-not-safe',`Recovery plan failed safety gate: ${JSON.stringify({plan,unsafeOperations})}`);

  const executeExpression=`(async()=>{
    try{
      const plugin=globalThis.app?.plugins?.plugins?.['brain-google-drive-sync'];
      const production=plugin?.productionVerificationControl?.();
      if(!production)return{ok:false,reason:'production-control-unavailable'};
      const beforeReceipt=production.latestProductionRunReceipt();
      const actionResult=await production.executePlan(${JSON.stringify(String(plan.planId))});
      return{ok:true,beforeReceipt,actionResult,afterStatus:production.currentStatus(),afterReceipt:production.latestProductionRunReceipt()??null};
    }catch(error){return{ok:false,reason:'execute-exception',error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`;
  const execution=await cdpEval(target.candidate.webSocketDebuggerUrl,executeExpression,120000);
  if(!execution?.ok)fail('BLOCKED','r2-product-recovery-execute-failed',`Product recovery execution failed: ${JSON.stringify(execution)}`);
  record('r2recovery-execution','PASS','product-recovery-execution','Executed only the exact reviewed recovery plan through the accepted production-control seam.',execution);

  const recoveredReceipt=execution.afterReceipt;
  const recoveryComplete=execution.actionResult?.status==='accepted'&&recoveredReceipt&&
    recoveredReceipt.runId!==execution.beforeReceipt?.runId&&String(recoveredReceipt.planId)===String(plan.planId)&&
    recoveredReceipt.terminal==='complete'&&recoveredReceipt.requiredEffectsCommittedAndVerified===true&&execution.afterStatus?.kind==='idle-ready';
  record('r2recovery-authority-restored',recoveryComplete?'PASS':'FAIL','product-authority-recovered',
    recoveryComplete?'Product recovery completed authoritatively: new complete receipt, required effects verified, and recovery gate cleared to idle-ready.':'Product recovery did not reach the exact authoritative complete/idle-ready state.',
    {execution,planId:plan.planId});
  if(!recoveryComplete)fail('BLOCKED','r2-product-recovery-incomplete',`Product recovery did not complete authoritatively: ${JSON.stringify(execution)}`);

  const fixtureAfterExists=await exists(canaryPath);
  const fixtureAfter=fixtureAfterExists?{exists:true,sizeBytes:(await fs.stat(canaryPath)).size,sha256:await sha256File(canaryPath)}:{exists:false};
  const fixtureAfterExact=fixtureAfter.exists&&fixtureAfter.sizeBytes===77&&fixtureAfter.sha256===expectedCanaryHash;
  record('r2recovery-fixture-postcondition',fixtureAfterExact?'PASS':'FAIL','retry-fixture-state',
    fixtureAfterExact?'Retry canary fixture remained exact throughout product authority recovery.':'Retry canary fixture changed during product recovery.',
    fixtureAfter);
  if(!fixtureAfterExact)fail('BLOCKED','r2-product-recovery-fixture-changed',`Canary changed during product recovery: ${JSON.stringify(fixtureAfter)}`);

  await writeJson(path.join(evidenceDir,'r2-product-authority-recovery.json'),{
    retryRunId,
    scenarioId,
    rejectedSequenceState:retryState,
    uncertainReceipt,
    recoveryPlan:plan,
    recoveryExecution:execution,
    fixtureBefore:fixture,
    fixtureAfter,
  });
  record('r2recovery-evidence','PASS','recovery-evidence-recorded','Recorded exact r2 rejected state, uncertain receipt, reviewed recovery plan, authoritative recovery receipt, and fixture preservation.');

  fail('BLOCKED','r2-terminal-product-authority-recovered',
    'Retry r2 remains terminal and must not be replayed. Product authority is recovered and idle-ready; bind a fresh supervisor-authorized retry identity before any new canary mutation.');
}

async function executePhysicalAuthorityRecoveryGate() {
try {
  const mainJs = path.join(pluginDir, 'main.js');
  const manifest = path.join(pluginDir, 'manifest.json');
  const dataJson = path.join(pluginDir, 'data.json');
  let validationHash;
  let validationSize;
  let dataHashBeforeRestore;
  const priorVerdictPath = path.join(repoWorktree,'dev/evidence/2026-10-02-BVP-S08F-4f9c69c','S08F-BLOCKED.json');
  const priorVerdict = await readJson(priorVerdictPath).catch(()=>null);
  const productAuthorityRecovery = (
    (priorVerdict?.classification === 'postconflict-recovery-precondition-blocked' &&
      String(priorVerdict?.primaryReason??'').includes('production-action-rejected')) ||
    priorVerdict?.classification === 'r2-product-recovery-plan-unavailable'
  ) &&
    priorVerdict?.retryRunId === retryRunId &&
    priorVerdict?.scenarioId === scenarioId;
  const mailboxConflictRecovery = priorVerdict?.classification === 'harness-error' &&
    String(priorVerdict?.primaryReason??'').includes('mailbox-conflicting-result') &&
    priorVerdict?.retryRunId === retryRunId &&
    priorVerdict?.scenarioId === scenarioId;
  const recoveryMode = productAuthorityRecovery || mailboxConflictRecovery || (['device-result-unavailable','device-result-recovery-precondition-blocked'].includes(priorVerdict?.classification) &&
    priorVerdict?.retryRunId === retryRunId &&
    priorVerdict?.scenarioId === scenarioId);

  if (recoveryMode) {
    record('continuation-mode','PASS','device-result-recovery','Prior evidence binds this execution to safe continuation of the existing attempt-2 transport/result recovery.',{
      priorBranchHead:priorVerdict.branchHead,
      priorClassification:priorVerdict.classification,
      retryRunId:priorVerdict.retryRunId,
      scenarioId:priorVerdict.scenarioId,
    });
    const recovered = productAuthorityRecovery
      ? await recoverR2ProductAuthority(priorVerdict)
      : mailboxConflictRecovery
        ? await recoverPostMailboxConflict(priorVerdict)
        : priorVerdict.classification === 'device-result-recovery-precondition-blocked'
          ? await recoverRetrySequenceThree(priorVerdict)
          : await recoverRetrySequenceOne(priorVerdict);
    validationHash = recovered.validationHash;
    validationSize = recovered.validationSize;
    dataHashBeforeRestore = recovered.dataHashBeforeRestore;
  } else {
    const preflight = await collectPreMutationPreflight();
    const staticBlockers = preflight.blockers.filter(item => item.name !== 'renderer-capabilities');
    if (staticBlockers.length > 0) {
      fail('BLOCKED','pre-mutation-preflight-blocked',`Pre-mutation diagnostics found ${staticBlockers.length} blocking defect(s): ${staticBlockers.map(item => item.name + '=' + item.summary).join(' | ')}`);
    }

    const rendererEnvironment = await ensureRendererEnvironment(preflight.initialRenderer);
    if (!rendererEnvironment.ok) {
      fail('BLOCKED',rendererEnvironment.classification ?? 'devtools-environment-repair-failed',rendererEnvironment.reason ?? 'Unable to establish the disposable renderer.');
    }
    target = rendererEnvironment.target;

    let capabilities;
    try {
      capabilities = await inspectRendererCapabilities(target);
    } catch (error) {
      fail('BLOCKED','renderer-capability-inspection-failed',error instanceof Error?error.message:String(error));
    }
    const capabilityIssues = [];
    if (normalized(capabilities.vault) !== normalized(vaultPath)) capabilityIssues.push('vault-mismatch');
    if (capabilities.sourceCommit !== sourceCommit) capabilityIssues.push('validation-source-mismatch');
    if (capabilities.deviceAgentFactory !== true) capabilityIssues.push('device-agent-factory-unavailable');
    if (capabilities.mailboxPoll !== true) capabilityIssues.push('mailbox-poll-unavailable');
    if (capabilities.relayPump !== true) capabilityIssues.push('relay-pump-unavailable');
    if (capabilities.pluginPresent !== true) capabilityIssues.push('plugin-unavailable');
    if (capabilities.productionControl !== true) capabilityIssues.push('production-control-unavailable');
    if (capabilityIssues.length > 0) {
      fail('BLOCKED','renderer-capability-precondition-failed',`Renderer capability defects: ${capabilityIssues.join(', ')}. Details=${JSON.stringify(capabilities)}`);
    }
    record('pre-mutation-gate','PASS','all-required-preconditions-satisfied','All independently observable pre-mutation checks passed or were repaired; physical mutation is now authorized.',{
      repairedRenderer:rendererEnvironment.repaired,
      renderer:capabilities,
      preflightStageCount:stages.length,
      initialDefectCount:preflight.observedDefects.length,
      unresolvedBlockerCount:0,
    });

    validationHash = await sha256File(mainJs);
    validationSize = (await fs.stat(mainJs)).size;
    dataHashBeforeRestore = await sha256File(dataJson);
    record('validation-artifact-identity','PASS','exact-validation-artifact',`Validation artifact verified at ${validationSize} bytes / ${validationHash}.`);

    validationIdentity = target.snapshot.identity;
    if (target.snapshot.sourceCommit !== sourceCommit) fail('BLOCKED','validation-source-mismatch',`Renderer source ${target.snapshot.sourceCommit ?? '<missing>'} does not match ${sourceCommit}.`);
    buildIdentity = validationIdentity;
    record('renderer-identity','PASS','exact-disposable-renderer',`Disposable renderer matched ${vaultPath}.`,target.snapshot);

    const oldState = await readJson(oldStatePath).catch(() => null);
    if (!oldState || oldState.sequence !== 3 || oldState.phase !== 'completed' || oldState.result?.kind !== 'production-execute' || oldState.result?.status !== 'rejected' || oldState.result?.classification !== 'production-action-rejected') {
      fail('BLOCKED','attempt1-state-mismatch','Attempt-1 sequence state is not the exact completed rejected sequence-3 state.');
    }
    const fixtureExists = await exists(canaryPath);
    const fixtureSize = fixtureExists ? (await fs.stat(canaryPath)).size : 0;
    const fixtureHash = fixtureExists ? await sha256File(canaryPath) : null;
    if (!fixtureExists || fixtureSize !== 77 || fixtureHash !== expectedCanaryHash) fail('BLOCKED','attempt1-fixture-mismatch',`Attempt-1 fixture identity mismatch: exists=${fixtureExists} size=${fixtureSize} hash=${fixtureHash}`);
    const relayBefore = await relayEmpty();
    if (Object.values(relayBefore).some(files => files.length !== 0)) fail('BLOCKED','attempt1-relay-not-drained',`Attempt-1 relay is not drained: ${JSON.stringify(relayBefore)}`);
    attempt1SafeState = { sequenceState: oldState, fixture: { exists:true,sizeBytes:fixtureSize,sha256:fixtureHash }, relay: relayBefore };
    record('attempt1-safe-state','PASS','exact-failed-run-state','Attempt 1 re-proved: sequence 3 rejected, exact fixture present, relay drained, no replay performed.');

    await fs.rm(canaryPath, { force: false });
    if (await exists(canaryPath)) fail('FAIL','attempt1-cleanup-failed','Attempt-1 canary fixture remained after bounded host cleanup.');
    record('attempt1-bounded-cleanup','PASS','canary-owned-cleanup','Removed only the exact attempt-1 disposable fixture; attempt-1 sequence state was preserved.');

    const transition = realSuspendResumeTransition();
    await new Promise(resolve => setTimeout(resolve, 500));
    target = await findRenderer();
    lifecycleEvidence = { transition, after: target.snapshot };
    if (target.snapshot.visibility !== 'visible') fail('BLOCKED','renderer-not-visible-after-resume',`Renderer visibility is ${target.snapshot.visibility}.`);
    record('lifecycle-recovery','PASS','real-suspend-resume','Real Windows minimize/restore transition completed and renderer returned visible.',lifecycleEvidence);

    if (await exists(retryStatePath)) fail('BLOCKED','retry-sequence-state-not-fresh',`Retry state already exists: ${retryStatePath}`);
    if (await exists(canaryPath)) fail('BLOCKED','retry-fixture-not-fresh','Canary fixture unexpectedly exists before retry.');
    const relayRetry = await relayEmpty();
    if (Object.values(relayRetry).some(files => files.length !== 0)) fail('BLOCKED','retry-relay-not-empty',`Retry relay is not empty: ${JSON.stringify(relayRetry)}`);

    const agentBootstrap = await injectAgent(retryRunId, controlKey, true);
    if (agentBootstrap.visibility !== 'visible') fail('BLOCKED','agent-bootstrap-hidden','Retry agent bootstrapped while renderer was not visible.');
    record('retry-agent-bootstrap','PASS','accepted-device-agent','Fresh attempt-2 bounded device agent composed from accepted validation artifact.',agentBootstrap);
  }

  const compiledRoot = path.join(repoWorktree, '.test-build', 'bvp');
  const { defineScenario } = require(path.join(compiledRoot, 'test-platform', 'src', 'scenario', 'scenario-contract.js'));
  const { DeterministicScenarioRunner } = require(path.join(compiledRoot, 'test-platform', 'src', 'scenario', 'scenario-runner.js'));
  const { createLiveScenarioExecutor } = require(path.join(compiledRoot, 'test-platform', 'src', 'live-device', 'live-scenario-executor.js'));
  const scenario = defineScenario({
    id: scenarioId,

    description: 'S08F disposable Windows live canary retry after lifecycle-safe recovery',
    traceability: { targets: [{ kind: 'completion-evidence', id: 'BVP-S08F' }] },
    executionModes: ['live'],
    steps: [
      { id:'put-canary',kind:'fixture',operation:'put-local-file',device:'desktop',path:canaryRelative,content:{encoding:'utf8',value:canaryText} },
      { id:'initial-sync',kind:'production',device:'desktop',operation:'synchronize',captureAs:'initialSync' },
      { id:'observe-after-sync',kind:'observe',subject:'local-entry',device:'desktop',path:canaryRelative,captureAs:'afterInitial' },
      { id:'assert-after-sync',kind:'assert',assertion:'exists',observationRef:'afterInitial',expected:true },
      { id:'remove-canary',kind:'fixture',operation:'remove-local',device:'desktop',path:canaryRelative },
      { id:'cleanup-sync',kind:'production',device:'desktop',operation:'synchronize',captureAs:'cleanupSync' },
      { id:'observe-after-cleanup',kind:'observe',subject:'local-entry',device:'desktop',path:canaryRelative,captureAs:'afterCleanup' },
      { id:'assert-after-cleanup',kind:'assert',assertion:'exists',observationRef:'afterCleanup',expected:false },
    ],
  });
  const checkpointFile = path.join(evidenceDir, '.s08f-r2-checkpoint.json');
  const executor = await createLiveScenarioExecutor({ scenario, runId: retryRunId, deviceIds: { desktop: deviceId }, relayRoot, checkpointFile, resultTimeoutMs: 90000, pollIntervalMs: 100 });
  scenarioResult = await new DeterministicScenarioRunner({}, executor).run(scenario);
  if (scenarioResult.status !== 'completed') fail(scenarioResult.status === 'blocked' ? 'BLOCKED' : 'FAIL', scenarioResult.classification ?? 'live-scenario-failed', scenarioResult.reason ?? `Scenario ended ${scenarioResult.status}.`);
  const afterInitial = scenarioResult.captures?.afterInitial;
  const afterCleanup = scenarioResult.captures?.afterCleanup;
  const initialSync = scenarioResult.captures?.initialSync;
  const cleanupSync = scenarioResult.captures?.cleanupSync;
  if (!afterInitial || afterInitial.exists !== true || afterInitial.sizeBytes !== 77 || afterInitial.hash !== expectedCanaryHash) fail('FAIL','initial-objective-observation-mismatch',`Initial observation mismatch: ${JSON.stringify(afterInitial)}`);
  if (!afterCleanup || afterCleanup.exists !== false) fail('FAIL','cleanup-objective-observation-mismatch',`Cleanup observation mismatch: ${JSON.stringify(afterCleanup)}`);
  if (initialSync?.receipt?.terminal !== 'complete' || initialSync.receipt.requiredEffectsCommittedAndVerified !== true) fail('FAIL','initial-production-receipt-not-complete',`Initial production receipt invalid: ${JSON.stringify(initialSync?.receipt)}`);
  if (cleanupSync?.receipt?.terminal !== 'complete' || cleanupSync.receipt.requiredEffectsCommittedAndVerified !== true) fail('FAIL','cleanup-production-receipt-not-complete',`Cleanup production receipt invalid: ${JSON.stringify(cleanupSync?.receipt)}`);
  record('canonical-live-scenario','PASS','s08e-live-scenario-complete','Accepted S08E live runner completed fixture → production sync → observation → cleanup sync → absence proof.');

  const retryStateAfterScenario = await readJson(retryStatePath);
  if (retryStateAfterScenario.sequence !== 8 || retryStateAfterScenario.phase !== 'completed') fail('FAIL','scenario-sequence-state-mismatch',`Expected completed sequence 8 after canonical scenario; got ${JSON.stringify(retryStateAfterScenario)}`);

  const probePut = { runId:retryRunId,deviceId,sequence:9,commandId:'bvp-s08f-r2-duplicate-probe-put',kind:'fixture-put',path:probeRelative,content:{type:'text',text:probeText} };
  const probePutResult = await directExecute(controlKey, probePut);
  if (probePutResult.status !== 'completed' || probePutResult.classification !== 'fixture-verified') fail('FAIL','duplicate-probe-put-failed',JSON.stringify(probePutResult));
  const probeBeforeDuplicate = { exists:await exists(probePath),sizeBytes:(await fs.stat(probePath)).size,sha256:await sha256File(probePath) };
  if (!probeBeforeDuplicate.exists || probeBeforeDuplicate.sha256 !== probeHash) fail('FAIL','duplicate-probe-identity-mismatch',JSON.stringify(probeBeforeDuplicate));
  const duplicateResult = await directExecute(controlKey, probePut);
  const probeAfterDuplicate = { exists:await exists(probePath),sizeBytes:(await fs.stat(probePath)).size,sha256:await sha256File(probePath) };
  if (duplicateResult.replayed !== true || duplicateResult.status !== 'completed' || probeAfterDuplicate.sha256 !== probeBeforeDuplicate.sha256 || probeAfterDuplicate.sizeBytes !== probeBeforeDuplicate.sizeBytes) fail('FAIL','duplicate-replay-proof-failed',JSON.stringify({duplicateResult,probeBeforeDuplicate,probeAfterDuplicate}));

  const probeRemove = { runId:retryRunId,deviceId,sequence:10,commandId:'bvp-s08f-r2-duplicate-probe-remove',kind:'fixture-remove',path:probeRelative };
  const probeRemoveResult = await directExecute(controlKey, probeRemove);
  if (probeRemoveResult.status !== 'completed' || probeRemoveResult.classification !== 'fixture-removal-verified' || await exists(probePath)) fail('FAIL','duplicate-probe-cleanup-failed',JSON.stringify(probeRemoveResult));
  const staleResult = await directExecute(controlKey, probePut);
  if (staleResult.status !== 'rejected' || staleResult.classification !== 'stale-sequence') fail('FAIL','stale-sequence-proof-failed',JSON.stringify(staleResult));
  const wrongRun = { runId:`${retryRunId}-wrong`,deviceId,sequence:11,commandId:'bvp-s08f-r2-wrong-run',kind:'observe-product' };
  const wrongRunResult = await directExecute(controlKey, wrongRun);
  if (wrongRunResult.status !== 'rejected' || wrongRunResult.classification !== 'run-mismatch') fail('FAIL','wrong-run-proof-failed',JSON.stringify(wrongRunResult));
  const wrongDevice = { runId:retryRunId,deviceId:'wrong-device',sequence:11,commandId:'bvp-s08f-r2-wrong-device',kind:'observe-product' };
  const wrongDeviceResult = await directExecute(controlKey, wrongDevice);
  if (wrongDeviceResult.status !== 'rejected' || wrongDeviceResult.classification !== 'device-mismatch') fail('FAIL','wrong-device-proof-failed',JSON.stringify(wrongDeviceResult));
  const finalObserve = { runId:retryRunId,deviceId,sequence:11,commandId:'bvp-s08f-r2-final-observe',kind:'observe-file',path:canaryRelative };
  const finalObserveResult = await directExecute(controlKey, finalObserve);
  if (finalObserveResult.status !== 'completed' || finalObserveResult.fixture?.exists !== false) fail('FAIL','final-fixture-absence-proof-failed',JSON.stringify(finalObserveResult));
  safetyResults = { probePut:probePutResult, duplicate:duplicateResult, probeBeforeDuplicate, probeAfterDuplicate, probeRemove:probeRemoveResult, stale:staleResult, wrongRun:wrongRunResult, wrongDevice:wrongDeviceResult, finalObserve:finalObserveResult };
  record('command-identity-safety','PASS','duplicate-stale-identity-safe','Exact duplicate replayed without repeating mutation; stale, wrong-run, and wrong-device inputs rejected; probe fixture cleaned.');

  const shimRestore = await restoreMailboxResultRecoveryShim(target);
  if (!shimRestore?.ok) fail('FAIL','mailbox-recovery-shim-restore-failed',`Unable to restore original mailbox result behavior: ${JSON.stringify(shimRestore)}`);
  record('mailbox-recovery-shim-restore','PASS','original-mailbox-restored','Temporary historical-result recovery shim removed; original strict mailbox result behavior restored.',shimRestore);
  await stopControl(controlKey);
  const relayAfter = await relayEmpty();
  if (Object.values(relayAfter).some(files => files.length !== 0)) fail('FAIL','relay-not-drained-after-canary',`Relay not drained after canary: ${JSON.stringify(relayAfter)}`);
  if (await exists(canaryPath) || await exists(probePath)) fail('FAIL','local-fixture-remained-after-canary','One or more disposable fixtures remain after cleanup.');
  record('post-canary-cleanliness','PASS','disposable-state-clean','Local canary/probe absent and local relay drained.');

  await writeJson(path.join(evidenceDir, 'build-identity.json'), buildIdentity ?? {});
  await writeJson(path.join(evidenceDir, 'canary-scenario-evidence.json'), scenarioResult.evidence ?? {});
  await writeJson(path.join(evidenceDir, 'canary-command-results.json'), { retryRunId, safetyResults, finalSequenceState:await readJson(retryStatePath) });
  await writeJson(path.join(evidenceDir, 'canary-production-receipts.json'), { initial:initialSync.receipt, cleanup:cleanupSync.receipt });
  await writeJson(path.join(evidenceDir, 'canary-observations.json'), { attempt1SafeState, lifecycleEvidence, afterInitial, afterCleanup, safetyProbe:{beforeDuplicate:probeBeforeDuplicate,afterDuplicate:probeAfterDuplicate}, finalObserve:finalObserveResult.fixture });
  const identityMd = [
    '# Installed Validation Identity', '',

    `- branch head: \`${branchHead}\``,
    `- accepted runtime source: \`${sourceCommit}\``,
    `- disposable vault: \`${vaultPath}\``,
    `- installed main.js size: ${validationSize}`,
    `- installed main.js SHA-256: \`${validationHash}\``,
    `- expected validation SHA-256: \`${expectedValidationHash}\``,
    `- renderer validation source: \`${validationIdentity?.sourceCommit ?? '<missing>'}\``,
    `- data.json SHA-256 before production-bundle restoration: \`${dataHashBeforeRestore}\``,
    '- working BRAIN vault was not used.', '',
  ].join('\n');
  await writeEvidenceFile('installed-validation-identity.md', identityMd);

  const productionMainSource = path.join(repoWorktree, 'main.js');
  const productionManifestSource = path.join(repoWorktree, 'manifest.json');
  const productionHash = await sha256File(productionMainSource);
  const productionSize = (await fs.stat(productionMainSource)).size;
  if (productionHash !== expectedProductionHash || productionSize !== expectedProductionSize) fail('FAIL','production-baseline-mismatch',`Worktree production artifact mismatch: size=${productionSize} hash=${productionHash}`);
  const productionText = await fs.readFile(productionMainSource, 'utf8');
  const forbiddenMarkers = ['BVP_TEST_PLATFORM_NONSHIPPING_SENTINEL','__BRAIN_BVP_MAILBOX_RUNTIME__','__BRAIN_BVP_DEVICE_AGENT_FACTORY__','BRAIN BVP Mailbox'];
  const markerHits = forbiddenMarkers.filter(marker => productionText.includes(marker));
  if (markerHits.length) fail('FAIL','production-bundle-validation-code-present',`Production artifact contains forbidden validation markers: ${markerHits.join(', ')}`);
  await fs.copyFile(productionMainSource, mainJs);
  await fs.copyFile(productionManifestSource, manifest);
  const installedBuildIdentity = path.join(pluginDir, 'build-identity.json');
  if (await exists(installedBuildIdentity)) await fs.rm(installedBuildIdentity, { force:true });
  const restoredHash = await sha256File(mainJs);
  const restoredSize = (await fs.stat(mainJs)).size;
  const dataHashAfterRestore = await sha256File(dataJson);
  if (restoredHash !== expectedProductionHash || restoredSize !== expectedProductionSize || dataHashAfterRestore !== dataHashBeforeRestore) fail('FAIL','production-restore-verification-failed',`Restore mismatch: size=${restoredSize} hash=${restoredHash} dataBefore=${dataHashBeforeRestore} dataAfter=${dataHashAfterRestore}`);
  restoredProduction = { sizeBytes:restoredSize, sha256:restoredHash, forbiddenMarkerHits:markerHits, dataJsonHashBefore:dataHashBeforeRestore, dataJsonHashAfter:dataHashAfterRestore, buildIdentityRemoved:!(await exists(installedBuildIdentity)) };
  const isolationMd = [
    '# Production Bundle Isolation', '',
    `- restored ordinary production main.js size: ${restoredSize}`,
    `- restored ordinary production main.js SHA-256: \`${restoredHash}\``,
    `- accepted ordinary production baseline SHA-256: \`${expectedProductionHash}\``,
    `- forbidden validation marker hits: ${markerHits.length}`, 
    `- data.json unchanged by artifact restoration: ${dataHashBeforeRestore === dataHashAfterRestore}`,
    `- validation build-identity.json removed from installed disposable plugin: ${!(await exists(installedBuildIdentity))}`,
    '- final repository architecture guard and source-boundary verification are delegated to authoritative PHX-CI after physical evidence publication.', '',
  ].join('\n');
  await writeEvidenceFile('production-bundle-isolation.md', isolationMd);
  record('production-bundle-restoration','PASS','ordinary-production-restored',`Ordinary production artifact restored at ${restoredSize} bytes / ${restoredHash}; validation markers absent; data.json unchanged by restore.`);

  physicalStatus = 'PASS';
  classification = 'physical-canary-complete';
  primaryReason = '';
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.startsWith('S08F_STOP:')) {
    if (physicalStatus === 'BLOCKED' && classification === 'precondition-blocked') classification = 'harness-error';
    primaryReason ||= message;
    record('harness-terminal','FAIL',classification,primaryReason);
  }
} finally {
  if (target) {
    const shimCleanup = await restoreMailboxResultRecoveryShim(target).catch(error => ({ok:false,restored:false,error:error instanceof Error?error.message:String(error)}));
    if (shimCleanup?.restored) record('mailbox-recovery-shim-finally','PASS','original-mailbox-restored','Finally path removed the temporary mailbox result recovery shim.',shimCleanup);
    await stopControl(controlKey).catch(() => undefined);
  }
  await persistVerdict().catch(error => console.error('Unable to persist final S08F verdict evidence:', error));
  console.log('============================================================');
  console.log('S08F PHYSICAL CANARY SUMMARY');
  console.log('============================================================');
  console.log(`STATUS: ${physicalStatus}`);
  console.log(`CLASSIFICATION: ${classification}`);
  console.log(`SOURCE COMMIT: ${sourceCommit}`);
  console.log(`BRANCH HEAD: ${branchHead}`);
  console.log(`RETRY RUN: ${retryRunId}`);
  console.log(`SCENARIO: ${scenarioId}`);
  console.log(`STAGE COUNT: ${stages.length}`);
  console.log(`PRIMARY REASON: ${primaryReason || 'none'}`);
  console.log('============================================================');
}

return { physicalStatus, classification, primaryReason, stages, evidenceDir };
}


test('S08F post-repair product-authority recovery reaches the fresh-canary binding boundary', { timeout: 600_000 }, async (t) => {
  if (process.env.BVP_S08F_PHYSICAL_EXECUTION !== '1') {
    t.skip('S08F physical recovery is enabled only by the explicitly bound PHX-CI focused gate.');
    return;
  }

  if (!branchHead) {
    throw new Error('BVP_S08F_BRANCH_HEAD is required for the PHX-CI physical recovery gate.');
  }

  const expectedVault = 'D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b';
  if (normalized(vaultPath) !== normalized(expectedVault)) {
    throw new Error(`S08F physical recovery is bound only to the disposable vault ${expectedVault}; received ${vaultPath}.`);
  }

  const productionArtifact = path.join(repoWorktree, 'main.js');
  if (!(await exists(productionArtifact))) {
    throw new Error('Focused gate requires the PHX-CI focused command to build ordinary production main.js before physical recovery.');
  }

  await fs.rm(evidenceDir, { recursive: true, force: true });
  await fs.mkdir(evidenceDir, { recursive: true });

  const result = await executePhysicalAuthorityRecoveryGate();

  const evidenceNames = (await fs.readdir(evidenceDir).catch(() => [])).sort();
  console.log('S08F_PHYSICAL_EVIDENCE_MANIFEST=' + JSON.stringify(evidenceNames));
  for (const name of ['r2-product-authority-recovery.json','S08F-BLOCKED.json','S08F-BLOCKED.md']) {
    const file = path.join(evidenceDir, name);
    if (!(await exists(file))) continue;
    const value = await fs.readFile(file, 'utf8');
    console.log(`S08F_PHYSICAL_EVIDENCE_BEGIN ${name}`);
    console.log(value.trimEnd());
    console.log(`S08F_PHYSICAL_EVIDENCE_END ${name}`);
  }

  if (result.physicalStatus !== 'BLOCKED' || result.classification !== 'r2-terminal-product-authority-recovered') {
    throw new Error(
      `S08F product-authority recovery did not reach the required fresh-canary binding boundary: status=${result.physicalStatus} classification=${result.classification} reason=${result.primaryReason}`
    );
  }

  console.log('S08F_PRODUCT_AUTHORITY_RECOVERY_GATE=PASS');
  console.log('S08F_NEXT_BOUNDARY=READY FOR FRESH S08F CANARY IDENTITY BINDING');
});
