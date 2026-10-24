import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { bvpDiagnostic, safeUnexpectedFailure } from "../../src/scenario/scenario-diagnostics";

import {
  getDeterministicBattery,
  listDeterministicBatteryNames,
} from "./deterministic-battery-registry";

function requiredArg(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`missing required argument ${name}`);
  return value;
}

function optionalArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith("--") ? value : undefined;
}

async function persist(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

/** Public TAP is a strict structural projection, never raw child-authored text.
 * Test numbers and counts retain objective failure evidence; error strings,
 * titles, fixture names and raw stack traces remain excluded. */
function publicTapLine(line:string):string{
  if(/^TAP version 13\r?$/.test(line))return "TAP version 13\n";
  const item=/^(\s*)(not ok|ok) (\d+)(?: .*)?\r?$/.exec(line);
  if(item)return item[1]+item[2]+" "+item[3]+" - test-case-"+item[3]+"\n";
  const count=/^(\s*)# (tests|pass|fail|cancelled|skipped|todo|duration_ms) (\d+(?:\.\d+)?)\r?$/.exec(line);
  if(count)return count[1]+"# "+count[2]+" "+count[3]+"\n";
  const plan=/^(\s*)(\d+)\.\.(\d+)\r?$/.exec(line);
  return plan?plan[1]+plan[2]+".."+plan[3]+"\n":"";
}

async function main(): Promise<void> {
  const resultFile = requiredArg("--result-file");
  const tapFile = requiredArg("--tap-file");
  const batteryName = requiredArg("--battery");
  const battery = getDeterministicBattery(batteryName);
  if (!battery) {
    throw new Error(
      `unknown deterministic battery '${batteryName}'. available batteries: ${listDeterministicBatteryNames().join(", ")}`,
    );
  }

  const compiledTestRoot = resolve(__dirname, "..");
  const testPaths = battery.testFiles.map(file => resolve(compiledTestRoot, file));
  await mkdir(dirname(tapFile), { recursive: true });
  const started = performance.now();
  const outcome = await new Promise<{ exitCode: number; signal: string | null; error?: string }>((resolveRun, rejectRun) => {
    const tap = createWriteStream(tapFile, { encoding: "utf8" });
    // Node's outer test runner sets NODE_TEST_CONTEXT. Passing that flag to a
    // nested --test command makes Node skip test execution and exit zero.
    const childEnv = {...process.env};
    delete childEnv.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, ["--test", "--test-reporter=tap", ...testPaths], {
      cwd: process.cwd(),
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let launchError: Error | undefined;
    tap.on("error", error => {
      child.kill();
      rejectRun(error);
    });
    const stdout = child.stdout;
    const stderr = child.stderr;
    if (!stdout || !stderr) {
      child.kill();
      rejectRun(new Error("deterministic battery subprocess has no output streams"));
      return;
    }
    let pending="",stderrObserved=false;
    const publishSafe=(value:string)=>{if(!value)return;process.stdout.write(value);
      if(!tap.write(value)){stdout.pause();tap.once("drain",()=>stdout.resume());}};
    stdout.on("data", (chunk: Buffer) => {
      pending+=chunk.toString("utf8");
      let end:number;
      while((end=pending.indexOf("\n"))>=0){
        publishSafe(publicTapLine(pending.slice(0,end)));
        pending=pending.slice(end+1);
      }
      // Bound memory if a child prints an untrusted multiline-free secret.
      if(pending.length>8192)pending="";
    });
    stderr.on("data", () => {stderrObserved=true;});
    child.on("error", error => { launchError = error; });
    child.on("close", (code, signal) => {
      publishSafe(publicTapLine(pending));if(stderrObserved)publishSafe("# child-stderr-suppressed\n");
      tap.end(() => resolveRun({
        exitCode: code ?? 1,
        signal,
        ...(launchError ? { error: launchError.message } : {}),
      }));
    });
  });
  const durationMs = Math.round(performance.now() - started);
  const failed = outcome.exitCode !== 0 || Boolean(outcome.signal || outcome.error);
  // Never turn an observed nonzero child exit into a synthetic success.
  const exitCode = failed && outcome.exitCode === 0 ? 1 : outcome.exitCode;
  const boundary = outcome.error ? "test-subprocess-start" : "battery-success-verdict";
  const lastConfirmed = outcome.error ? "battery-selected" : "test-subprocess-exited";
  const attempt = failed ? randomUUID() : undefined;
  const hashedId = (kind: "run" | "corr", value: string) =>
    kind + "-sha256:" + createHash("sha256").update(value).digest("hex").slice(0, 24);
  // A normal test failure is a failed BVP operation, not an exception:
  // record the same privacy-safe machine diagnosis in result and CLI summary.
  const diagnostic = failed && attempt ? bvpDiagnostic({
    classification: outcome.error ? "deterministic-subprocess-launch-failed"
      : outcome.signal ? "deterministic-subprocess-interrupted" : "deterministic-battery-failed",
    component: "battery-runner",
    phase: outcome.error ? "test-subprocess-launch" : "test-verdict",
    lastConfirmedBoundary: lastConfirmed,
    firstUnconfirmedBoundary: boundary,
    effect: "unknown",
    recommendedAction: "inspect-sanitized-test-evidence",
    causeClass: outcome.error ? "subprocess-launch-error"
      : outcome.signal ? "subprocess-interrupted" : "nonzero-test-exit",
    identity: {
      runId: hashedId("run", attempt),
      scenarioId: battery.name,
      stepIndex: null,
      executionMode: "deterministic",
      correlationToken: hashedId("corr", attempt + "\0" + battery.name),
    },
  }) : undefined;
  const status = failed ? "failed" : "completed";
  const envelope = {
    battery: {
      name: battery.name,
      description: battery.description,
      kind: "deterministic-node-test",
      testFiles: battery.testFiles,
    },
    result: {
      status,
      exitCode,
      durationMs,
      ...(outcome.signal ? { signal: outcome.signal } : {}),
      ...(outcome.error ? { error: "subprocess-execution-failed" } : {}),
      ...(diagnostic ? { diagnostic } : {}),
    },
  };

  await persist(resultFile, JSON.stringify(envelope, null, 2) + "\n");
  console.log("\nBVP deterministic battery summary:");
  // Never print subprocess error text or untrusted test output into shared logs.
  console.log(JSON.stringify({
    battery: battery.name, status, exitCode, durationMs,
    ...(diagnostic ? { diagnostic } : {}),
  }));
  process.exitCode = exitCode;
}

main().catch(async error => {
  const failure = safeUnexpectedFailure(error, {
    component: "battery-runner", phase: "battery-preflight",
    lastConfirmedBoundary: "battery-entrypoint",
    firstUnconfirmedBoundary: "battery-execution",
  }, "deterministic-battery-runner-exception");
  const resultFile = optionalArg("--result-file");
  if (resultFile) {
    try {
      await persist(resultFile, JSON.stringify({ result: failure }, null, 2) + "\n");
    } catch {
      const diagnostic=bvpDiagnostic({
        classification:"result-persistence-failed",component:"battery-runner",
        phase:"result-persistence",lastConfirmedBoundary:"battery-failure-classified",
        firstUnconfirmedBoundary:"result-file-write",effect:"unknown",
        recommendedAction:"inspect-output-path",
      });
      console.error("BVP_DIAGNOSTIC "+JSON.stringify(diagnostic));
    }
  }
  console.error("BVP_DIAGNOSTIC " + JSON.stringify(failure.diagnostic));
  process.exitCode = 1;
});
