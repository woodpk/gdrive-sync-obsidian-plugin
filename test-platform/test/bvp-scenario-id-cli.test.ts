import { deepStrictEqual, match, notStrictEqual, strictEqual } from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { test } from "node:test";
import {
  deterministicScenarioSourceFiles, getDeterministicScenario, listDeterministicScenarios,
} from "./batteries/deterministic-scenario-registry";
import { exitCodeForScenarioStatus } from "./batteries/run-deterministic-scenario";

const compiledCli = resolve(__dirname, "batteries/run-deterministic-scenario.js");
const allNames = () => {
  const walk = (at: string): string[] => readdirSync(resolve(process.cwd(), "test-platform/scenarios", at),
    { withFileTypes: true }).flatMap(entry => {
    const next = [at, entry.name].filter(Boolean).join("/");
    return entry.isDirectory() ? (entry.name === "live" ? [] : walk(next))
      : entry.isFile() && entry.name.endsWith(".ts") ? [next] : [];
  });
  return walk("").sort();
};
function invoke(args: readonly string[]) {
  const child = spawnSync(process.execPath, [compiledCli, ...args], {
    cwd: process.cwd(), encoding: "utf8", timeout: 120_000,
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  });
  if (child.error) throw child.error;
  return child;
}
function withScratch(work: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "bvp-dec351-"));
  try { work(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

test("DEC-351 static catalog covers every deterministic scenario module exactly once", () => {
  const actual = [...deterministicScenarioSourceFiles()].sort();
  deepStrictEqual(actual, allNames());
  strictEqual(new Set(actual).size, actual.length);
  const listed = listDeterministicScenarios();
  strictEqual(listed.length, actual.length);
  strictEqual(new Set(listed.map(s => s.id)).size, listed.length);
  strictEqual(listed.every(s => s.mode === "deterministic" && s.id.length > 0 && s.description.length > 0), true);
  for (const row of listed) {
    const definition = getDeterministicScenario(row.id);
    strictEqual(definition?.id, row.id);
    strictEqual(definition?.description, row.description);
    strictEqual(definition?.executionModes.includes("deterministic"), true);
  }
  strictEqual(getDeterministicScenario("battery-s09a-ios-initial-sync-01"), undefined);
  strictEqual(getDeterministicScenario("s06a-fresh-local-only-fake"), undefined);
});

test("DEC-351 read-only discovery exposes exact IDs without execution or output files", () => {
  withScratch(root => {
    const result = invoke(["--list-scenarios"]);
    strictEqual(result.status, 0, result.stderr);
    strictEqual(result.stderr, "");
    const parsed = JSON.parse(result.stdout) as { schemaVersion: number; scenarios: readonly { id: string; mode: string; description: string }[] };
    strictEqual(parsed.schemaVersion, 1);
    deepStrictEqual(parsed.scenarios, listDeterministicScenarios());
    deepStrictEqual(readdirSync(root), []);
  });
});

test("DEC-351 exact scenario ID dispatches one existing canonical BVP scenario", () => {
  withScratch(root => {
    const resultFile = join(root, "only-one.json");
    const child = invoke(["--scenario", "s06a-fresh-local-only", "--result-file", resultFile]);
    strictEqual(child.status, 0, child.stderr);
    strictEqual(existsSync(resultFile), true);
    const body = JSON.parse(readFileSync(resultFile, "utf8")) as Record<string, any>;
    strictEqual(body.schemaVersion, 1);
    strictEqual(body.requestedScenarioId, "s06a-fresh-local-only");
    strictEqual(body.executionMode, "deterministic");
    strictEqual(body.result.scenarioId, "s06a-fresh-local-only");
    strictEqual(body.result.status, "completed");
    strictEqual(body.result.evidence?.scenarioId, "s06a-fresh-local-only");
    strictEqual(body.result.evidence?.executionMode, "deterministic");
    strictEqual(body.result.evidence?.verdict?.status, "completed");
    strictEqual(body.result.captures, undefined);
    strictEqual(body.result.evidence?.traceability?.length > 0, true);
    strictEqual(child.stdout.includes("s06a-fresh-remote-only"), false);
    strictEqual(child.stdout.includes("fresh-local.bin"), false);
    strictEqual(readdirSync(root).length, 1);
  });
});

test("DEC-351 rejects malformed, unknown, repeated and live-only args before dispatch", () => {
  withScratch(root => {
    const destination = join(root, "forbidden.json");
    const bad: readonly string[][] = [
      [], ["--scenario"], ["--scenario", ""],
      ["--scenario", "not-a-scenario", "--result-file", destination],
      ["--scenario", "battery-s09a-ios-initial-sync-01", "--result-file", destination],
      ["--scenario", "../s06a-fresh-local-only", "--result-file", destination],
      ["--scenario", "s06a-fresh-local-only", "--result-file", "../output.json"],
      ["--scenario", "s06a-fresh-local-only", "--result-file", destination, "--unexpected", "yes"],
      ["--scenario", "s06a-fresh-local-only", "--scenario", "s06a-fresh-local-only", "--result-file", destination],
      ["--scenario", "s06a-fresh-local-only", "--result-file", destination, "--result-file", destination],
      ["--list-scenarios", "--scenario", "s06a-fresh-local-only", "--result-file", destination],
      ["--list-scenarios", "--list-scenarios"],
      ["--result-file", destination],
    ];
    for (const argv of bad) {
      const result = invoke(argv);
      notStrictEqual(result.status, 0, JSON.stringify(argv));
      match(result.stderr, /BVP_DIAGNOSTIC/);
      strictEqual(result.stdout.includes('"status":"completed"'), false);
      strictEqual(existsSync(destination), false, JSON.stringify(argv));
    }
  });
});

test("DEC-351 does not overwrite an earlier completed result or falsely report PASS", () => {
  withScratch(root => {
    const destination = join(root, "once.json");
    strictEqual(invoke(["--scenario", "s06a-fresh-local-only", "--result-file", destination]).status, 0);
    const original = readFileSync(destination, "utf8");
    const duplicate = invoke(["--scenario", "s06a-fresh-local-only", "--result-file", destination]);
    notStrictEqual(duplicate.status, 0);
    match(duplicate.stderr, /BVP_DIAGNOSTIC/);
    strictEqual(readFileSync(destination, "utf8"), original);
  });
});

test("DEC-351 independent invocation isolation and status mapping", () => {
  withScratch(root => {
    const one = join(root, "one.json"), two = join(root, "two.json");
    strictEqual(invoke(["--scenario", "s06a-fresh-local-only", "--result-file", one]).status, 0);
    strictEqual(invoke(["--result-file", two, "--scenario", "s06a-fresh-local-only"]).status, 0);
    const a = JSON.parse(readFileSync(one, "utf8"));
    const b = JSON.parse(readFileSync(two, "utf8"));
    deepStrictEqual(a.result.evidence, b.result.evidence);
    for (const status of ["failed", "blocked", "unsupported"] as const) strictEqual(exitCodeForScenarioStatus(status), 1);
    strictEqual(exitCodeForScenarioStatus("completed"), 0);
    strictEqual(isAbsolute(one), true);
    strictEqual(basename(two), "two.json");
  });
});

test("DEC-351 concurrent isolated runs cannot exchange results or overwrite collision winner", async () => {
  const root = mkdtempSync(join(tmpdir(), "bvp-dec351-concurrent-"));
  const run = (file: string) => new Promise<number>((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [compiledCli,
      "--scenario", "s06a-fresh-local-only", "--result-file", file],
      { cwd: process.cwd(), env: { ...process.env, NODE_TEST_CONTEXT: undefined },
        stdio: ["ignore", "ignore", "pipe"] });
    child.stderr?.resume();
    child.on("error", rejectRun);
    child.on("close", code => resolveRun(code ?? 1));
  });
  try {
    const first = join(root, "first.json"), second = join(root, "second.json");
    deepStrictEqual(await Promise.all([run(first), run(second)]), [0, 0]);
    const a = JSON.parse(readFileSync(first, "utf8"));
    const b = JSON.parse(readFileSync(second, "utf8"));
    deepStrictEqual(a.result.evidence, b.result.evidence);
    const shared = join(root, "shared.json");
    const statuses = await Promise.all([run(shared), run(shared)]);
    deepStrictEqual([...statuses].sort(), [0, 1]);
    strictEqual(JSON.parse(readFileSync(shared, "utf8")).result.status, "completed");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("DEC-351 result file is a sanitized canonical evidence projection", () => {
  withScratch(root => {
    const destination = join(root, "privacy.json");
    strictEqual(invoke(["--scenario", "s05e-ordinary-one-sided-sync", "--result-file", destination]).status, 0);
    const record = JSON.parse(readFileSync(destination, "utf8"));
    strictEqual(record.result.status, "completed");
    strictEqual(record.result.evidence.schemaVersion, 1);
    strictEqual(record.result.captures, undefined);
    const raw = readFileSync(destination, "utf8");
    strictEqual(raw.includes('"captures"'), false);
    strictEqual(raw.includes('"fixtureContent"'), false);
    strictEqual(raw.includes('"runId":"'), false);
  });
});
