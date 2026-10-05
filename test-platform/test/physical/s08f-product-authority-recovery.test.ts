import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

const repositoryEvidence = "dev/evidence/2026-10-02-BVP-S08F-4f9c69c/S08F-BLOCKED.json";
const implementationSha = "57e5be079ded16ba50b4f95c49f78a9d90b47f3f";
const expectedValidationHash = "6c676900aaaf4aaa3417215d1eda2c16e578822715536ef1ffc0ca8741ffc9cf";
const expectedCanaryHash = "db03eedf8f43902405abdc0f893649a3d9b3e166e3e21d35a3e06e3c6a6e259d";
const vaultPath = "D:\\bvp-s08f-vault-0f4c76d5c20b4aad80f69109c852c93b";
const retryRunId = "s08f-desktop-canary-4f9c69c-r2";
const deviceId = "windows-brain-patrick";
const fixtureRoot = "BVP-VALIDATION/s08f-desktop-canary-4f9c69c";
const canaryPath = path.join(vaultPath, ...fixtureRoot.split("/"), "canary.md");
const pluginDir = path.join(vaultPath, ".obsidian", "plugins", "brain-google-drive-sync");
const retryStatePath = path.join(pluginDir, ".bvp-relay", "device-state", `${retryRunId}--${deviceId}.json`);
const configuredDebugPort = 63311;

type Json = Record<string, any>;

const normalize = (value: unknown): string => String(value ?? "").replace(/\\/g, "/").toLowerCase();
const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex");
const readJson = async (file: string): Promise<Json> => JSON.parse(await readFile(file, "utf8")) as Json;
const fileHash = async (file: string): Promise<string> => sha256(await readFile(file));

function pwshPath(): string {
  return process.env.ProgramFiles ? path.join(process.env.ProgramFiles, "PowerShell", "7", "pwsh.exe") : "pwsh";
}

function inspectObsidianRuntime(): Json {
  const script = [
    "$ErrorActionPreference='SilentlyContinue'",
    "$items=@(Get-CimInstance Win32_Process -Filter \"Name='Obsidian.exe'\" | Select-Object ProcessId,ParentProcessId,CommandLine)",
    "$pids=@($items | ForEach-Object { [int]$_.ProcessId })",
    "$windows=@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object Id,MainWindowTitle)",
    "$listeners=@()",
    "if(Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue){ $listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $pids -contains [int]$_.OwningProcess } | Select-Object LocalAddress,LocalPort,OwningProcess) }",
    "[pscustomobject]@{processes=$items;windows=$windows;listeners=$listeners}|ConvertTo-Json -Depth 6 -Compress",
  ].join(";");
  const result = spawnSync(pwshPath(), ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`Unable to inspect Obsidian runtime: ${String(result.stderr || result.stdout || "").trim()}`);
  const parsed = JSON.parse(String(result.stdout || "{}").trim() || "{}") as Json;
  const asArray = (value: unknown): any[] => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
  return { processes: asArray(parsed.processes), windows: asArray(parsed.windows), listeners: asArray(parsed.listeners) };
}

function discoverDebugPorts(runtime: Json): number[] {
  const ports = new Set<number>([configuredDebugPort]);
  for (const item of runtime.processes ?? []) {
    const commandLine = String(item.CommandLine ?? item.commandLine ?? "");
    for (const match of commandLine.matchAll(/--remote-debugging-port(?:=|\\s+)(\\d{2,5})/g)) ports.add(Number(match[1]));
  }
  for (const listener of runtime.listeners ?? []) ports.add(Number(listener.LocalPort ?? listener.localPort));
  return [...ports].filter(value => Number.isInteger(value) && value > 0 && value <= 65535).sort((a, b) => a - b);
}

async function cdpEval(webSocketUrl: string, expression: string, timeoutMs = 120_000): Promise<any> {
  const WebSocketCtor = (globalThis as any).WebSocket;
  if (typeof WebSocketCtor !== "function") throw new Error("Node WebSocket support is unavailable.");
  return await new Promise((resolve, reject) => {
    const ws = new WebSocketCtor(webSocketUrl);
    const requestId = 1;
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error("CDP Runtime.evaluate timed out."));
    }, timeoutMs);
    ws.addEventListener("open", () => ws.send(JSON.stringify({
      id: requestId,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true },
    })));
    ws.addEventListener("message", (event: any) => {
      let payload: any;
      try { payload = JSON.parse(String(event.data)); } catch { return; }
      if (payload.id !== requestId) return;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (payload.error) return reject(new Error(`CDP error: ${JSON.stringify(payload.error)}`));
      if (payload.result?.exceptionDetails) return reject(new Error(`Renderer exception: ${payload.result.exceptionDetails.text ?? "unknown"}`));
      resolve(payload.result?.result?.value);
    });
    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("CDP WebSocket error."));
    });
  });
}

async function rendererSnapshot(candidate: Json): Promise<Json> {
  return await cdpEval(candidate.webSocketDebuggerUrl, `(() => ({
    vault: typeof globalThis.app?.vault?.adapter?.getBasePath === "function" ? globalThis.app.vault.adapter.getBasePath() : "",
    visibility: globalThis.document?.visibilityState ?? "unknown",
    sourceCommit: globalThis.__BRAIN_BVP_VALIDATION_BUILD__?.sourceCommit ?? null
  }))()`);
}

async function findRenderer(): Promise<Json> {
  const runtime = inspectObsidianRuntime();
  const matches: Json[] = [];
  const attempts: Json[] = [];
  for (const port of discoverDebugPorts(runtime)) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2500) });
      if (!response.ok) {
        attempts.push({ port, status: `http-${response.status}` });
        continue;
      }
      const candidates = (await response.json()) as Json[];
      let found = 0;
      for (const candidate of candidates.filter(value => value?.type === "page" && value.webSocketDebuggerUrl)) {
        const snapshot = await rendererSnapshot(candidate).catch(() => null);
        if (snapshot && normalize(snapshot.vault) === normalize(vaultPath)) {
          matches.push({ candidate, snapshot, debugPort: port });
          found += 1;
        }
      }
      attempts.push({ port, status: "reachable", disposableMatches: found });
    } catch (error) {
      attempts.push({ port, status: "unreachable", error: error instanceof Error ? error.message : String(error) });
    }
  }
  if (matches.length !== 1) throw new Error(`Expected exactly one disposable-vault renderer; observed ${matches.length}. Attempts=${JSON.stringify(attempts)}`);
  return matches[0]!;
}

function restoreVisibleWindow(): void {
  const token = path.basename(vaultPath).replace(/'/g, "''");
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class S08FWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@;
$token='${token}';
$windows=@(Get-Process -Name Obsidian -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like ("*" + $token + "*") });
if ($windows.Count -ne 1) { Write-Error ('Expected exactly one disposable S08F window; observed ' + $windows.Count); [Environment]::ExitCode=41; return };
$p=$windows[0];
[void][S08FWindow]::ShowWindowAsync($p.MainWindowHandle,6);
Start-Sleep -Milliseconds 900;
[void][S08FWindow]::ShowWindowAsync($p.MainWindowHandle,9);
[void][S08FWindow]::SetForegroundWindow($p.MainWindowHandle);
Start-Sleep -Milliseconds 1200;
`;
  const result = spawnSync(pwshPath(), ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8", windowsHide: false });
  if (result.status !== 0) throw new Error(`Unable to restore disposable Obsidian window: ${String(result.stderr || result.stdout || "").trim()}`);
}

function exactUncertainReceipt(receipt: any, retryCommand: any): boolean {
  return Boolean(receipt && retryCommand &&
    String(receipt.planId) === String(retryCommand.planId) &&
    receipt.trigger === "manual" &&
    receipt.terminal === "uncertain" &&
    receipt.requiredEffectsCommittedAndVerified === false &&
    receipt.committedOperationCount === 0 &&
    receipt.skippedOperationCount === 0 &&
    receipt.reasonCode === "uncertain-physical-outcome");
}

test("S08F preserved r2 product authority recovers through the repaired production path", { timeout: 300_000 }, async () => {
  equal(process.platform, "win32", "S08F physical recovery requires Windows.");
  equal(process.env.BVP_S08F_PRODUCT_AUTHORITY_RECOVERY, "AUTHORIZED", "Explicit S08F product-authority recovery authorization is required.");

  const prior = await readJson(path.resolve(repositoryEvidence));
  equal(prior.status, "BLOCKED");
  equal(prior.classification, "r2-product-recovery-precondition-blocked");
  equal(prior.sourceCommit, implementationSha);
  equal(prior.retryRunId, retryRunId);

  const authorityStage = (prior.stages ?? []).find((stage: any) => stage?.name === "r2recovery-uncertain-production-authority");
  ok(authorityStage, "Prior uncertain-authority stage is required.");
  const retryCommand = authorityStage.details?.retryCommand ?? authorityStage.details?.uncertainAuthority?.historicalCommand;
  const historicalReceipt = authorityStage.details?.uncertainAuthority?.historicalReceipt ?? authorityStage.details?.latestReceipt;
  ok(exactUncertainReceipt(historicalReceipt, retryCommand), "Historical evidence must preserve the exact uncertain r2 receipt.");

  const retryState = await readJson(retryStatePath);
  equal(retryState.sequence, 3);
  equal(retryState.phase, "completed");
  equal(retryState.result?.kind, "production-execute");
  equal(retryState.result?.status, "rejected");
  equal(retryState.result?.classification, "production-action-rejected");

  const canaryBytes = await readFile(canaryPath);
  equal(canaryBytes.length, 77);
  equal(sha256(canaryBytes), expectedCanaryHash);
  equal(await fileHash(path.join(pluginDir, "main.js")), expectedValidationHash);

  let renderer = await findRenderer();
  equal(renderer.snapshot.sourceCommit, implementationSha, "Disposable renderer must run the exact repaired validation source.");
  if (renderer.snapshot.visibility !== "visible") {
    restoreVisibleWindow();
    renderer = await findRenderer();
  }
  equal(renderer.snapshot.visibility, "visible", "Disposable renderer must be visible before product recovery.");

  const observation = await cdpEval(renderer.candidate.webSocketDebuggerUrl, `(() => {
    const plugin=globalThis.app?.plugins?.plugins?.["brain-google-drive-sync"];
    const production=plugin?.productionVerificationControl?.();
    if(!production)return{ok:false,reason:"production-control-unavailable"};
    return{ok:true,status:production.currentStatus(),receipt:production.latestProductionRunReceipt()??null};
  })()`);
  equal(observation?.ok, true);
  ok(observation.status?.kind === "idle-ready" || observation.status?.kind === "recovery-required",
    `Unexpected pre-preview product status: ${JSON.stringify(observation.status)}`);
  ok(observation.receipt == null || exactUncertainReceipt(observation.receipt, retryCommand),
    `Live receipt conflicts with preserved uncertain authority: ${JSON.stringify(observation.receipt)}`);

  const preview = await cdpEval(renderer.candidate.webSocketDebuggerUrl, `(async()=>{
    try{
      const plugin=globalThis.app?.plugins?.plugins?.["brain-google-drive-sync"];
      const production=plugin?.productionVerificationControl?.();
      if(!production)return{ok:false,reason:"production-control-unavailable"};
      const beforeStatus=production.currentStatus();
      const beforeReceipt=production.latestProductionRunReceipt()??null;
      const plan=await production.previewManual();
      return{ok:true,beforeStatus,beforeReceipt,plan:plan?structuredClone(plan):null,afterStatus:production.currentStatus(),afterReceipt:production.latestProductionRunReceipt()??null};
    }catch(error){return{ok:false,reason:"preview-exception",error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`);
  equal(preview?.ok, true, `Product recovery preview failed: ${JSON.stringify(preview)}`);
  ok(preview.plan && Array.isArray(preview.plan.operations), `Recovery preview returned no executable plan: ${JSON.stringify(preview)}`);

  const forbiddenKinds = new Set(["trash-local", "trash-remote", "blocked-unsafe", "unresolved-conflict", "recovery-required"]);
  const unsafeOperations = preview.plan.operations.filter((operation: any) => operation?.destructive === true || forbiddenKinds.has(operation?.kind));
  equal(preview.plan.trigger, "manual");
  equal(preview.plan.globalExecutionGate, "none");
  equal(preview.plan.recoveryCheckpointRequired, false);
  ok(["safe-auto-eligible", "requires-user-approval"].includes(preview.plan.executionDisposition));
  equal(unsafeOperations.length, 0, `Recovery plan is not safe: ${JSON.stringify(unsafeOperations)}`);

  const planId = String(preview.plan.planId);
  const execution = await cdpEval(renderer.candidate.webSocketDebuggerUrl, `(async()=>{
    try{
      const plugin=globalThis.app?.plugins?.plugins?.["brain-google-drive-sync"];
      const production=plugin?.productionVerificationControl?.();
      if(!production)return{ok:false,reason:"production-control-unavailable"};
      const beforeReceipt=production.latestProductionRunReceipt()??null;
      const actionResult=await production.executePlan(${JSON.stringify(planId)});
      return{ok:true,beforeReceipt,actionResult,afterStatus:production.currentStatus(),afterReceipt:production.latestProductionRunReceipt()??null};
    }catch(error){return{ok:false,reason:"execute-exception",error:error instanceof Error?(error.stack??error.message):String(error)}}
  })()`);
  equal(execution?.ok, true, `Product recovery execution failed: ${JSON.stringify(execution)}`);
  equal(execution.actionResult?.status, "accepted");
  ok(execution.afterReceipt, "Recovery execution must produce a new production receipt.");
  ok(execution.afterReceipt.runId !== execution.beforeReceipt?.runId, "Recovery receipt must be fresh.");
  equal(String(execution.afterReceipt.planId), planId);
  equal(execution.afterReceipt.terminal, "complete");
  equal(execution.afterReceipt.requiredEffectsCommittedAndVerified, true);
  equal(execution.afterStatus?.kind, "idle-ready");

  const canaryAfter = await readFile(canaryPath);
  equal(canaryAfter.length, 77);
  equal(sha256(canaryAfter), expectedCanaryHash);

  console.log(JSON.stringify({
    result: "S08F_PRODUCT_AUTHORITY_RECOVERY_PASS",
    implementationSha,
    retryRunId,
    historicalReceipt,
    prePreviewStatus: observation.status,
    recoveryPlan: { planId, operationCount: preview.plan.operations.length, executionDisposition: preview.plan.executionDisposition },
    recoveryReceipt: execution.afterReceipt,
    finalStatus: execution.afterStatus,
    canarySha256: sha256(canaryAfter),
    nextAction: "READY FOR FRESH S08F CANARY IDENTITY BINDING",
  }));
});
