import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

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
    const child = spawn(process.execPath, ["--test", "--test-reporter=tap", ...testPaths], {
      cwd: process.cwd(),
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
    stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      if (!tap.write(chunk)) {
        stdout.pause();
        tap.once("drain", () => stdout.resume());
      }
    });
    stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
    child.on("error", error => { launchError = error; });
    child.on("close", (code, signal) => {
      tap.end(() => resolveRun({
        exitCode: code ?? 1,
        signal,
        ...(launchError ? { error: launchError.message } : {}),
      }));
    });
  });
  const durationMs = Math.round(performance.now() - started);
  const { exitCode } = outcome;
  const envelope = {
    battery: {
      name: battery.name,
      description: battery.description,
      kind: "deterministic-node-test",
      testFiles: battery.testFiles,
    },
    result: {
      status: exitCode === 0 ? "completed" : "failed",
      exitCode,
      durationMs,
      ...(outcome.signal ? { signal: outcome.signal } : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
    },
  };

  await persist(resultFile, JSON.stringify(envelope, null, 2) + "\n");
  console.log("\nBVP deterministic battery summary:");
  console.log(JSON.stringify(envelope, null, 2));
  process.exitCode = exitCode;
}

main().catch(async error => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  const resultFile = optionalArg("--result-file");
  if (resultFile) {
    try {
      await persist(
        resultFile,
        JSON.stringify({
          result: {
            status: "failed",
            classification: "deterministic-battery-runner-exception",
            reason: message,
          },
        }, null, 2) + "\n",
      );
    } catch {}
  }
  console.error(message);
  process.exitCode = 1;
});
