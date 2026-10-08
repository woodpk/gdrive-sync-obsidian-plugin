import { spawnSync } from "node:child_process";
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
  const started = performance.now();
  const child = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=tap", ...testPaths],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const durationMs = Math.round(performance.now() - started);
  const stdout = child.stdout ?? "";
  const stderr = child.stderr ?? "";
  await persist(tapFile, stdout);

  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  const exitCode = child.status ?? (child.error ? 1 : 0);
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
      ...(child.signal ? { signal: child.signal } : {}),
      ...(child.error ? { error: child.error.message } : {}),
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
