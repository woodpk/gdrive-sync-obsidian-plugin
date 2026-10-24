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
const compiledProbe = resolve(__dirname, "fixtures/dec351-cli-failure-preload.js");
function probe(args: readonly string[], scenarioCase?: string, marker?: string) {
  const child = spawnSync(process.execPath, ["--require", compiledProbe, compiledCli, ...args], {
    cwd: process.cwd(), encoding: "utf8", timeout: 120_000,
    env: { ...process.env, NODE_TEST_CONTEXT: undefined,
      BVP_DEC351_TEST_CASE: scenarioCase, BVP_DEC351_TEST_DISPATCH_MARKER: marker },
  });
  if (child.error) throw child.error;
  return child;
}
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

test("DEC-351 rejects malformed, repeated and invalid path arguments without output", () => {
  withScratch(root => {
    const destination = join(root, "forbidden.json");
    const bad: readonly string[][] = [
      [], ["--scenario"], ["--scenario", ""],
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

test("DEC351 F02 valid output path yields durable safe selection rejection without runner dispatch", () => {
  withScratch(root => {
    for (const id of ["not-a-scenario", "battery-s09a-ios-initial-sync-01"]) {
      const dest = join(root, id + ".json"), marker = join(root, id + ".dispatched");
      const child = probe(["--scenario", id, "--result-file", dest], undefined, marker);
      strictEqual(child.status, 1);
      match(child.stderr, /BVP_DIAGNOSTIC/);
      strictEqual(child.stdout, "");
      strictEqual(existsSync(marker), false, "selection must not invoke runner");
      strictEqual(existsSync(dest), true, "known valid output path must contain rejection");
      const record = JSON.parse(readFileSync(dest, "utf8"));
      strictEqual(record.schemaVersion, 1);
      strictEqual(record.requestedScenarioId, id);
      strictEqual(record.executionMode, "deterministic");
      strictEqual(record.requestStatus, "rejected");
      strictEqual(record.result, null, "unexecuted request must never fabricate canonical verdict");
      strictEqual(record.diagnostic.classification, "scenario-cli-selection-unavailable");
      strictEqual(record.diagnostic.effect, "none-confirmed");
      strictEqual(JSON.stringify(record).includes('"captures"'), false);
      strictEqual(JSON.stringify(record).includes('"verdict"'), false);
    }
  });
});

test("DEC351 F02 reserves output before scenario dispatch; collision cannot replay", () => {
  withScratch(root => {
    const dest = join(root, "existing.json"), marker = join(root, "unexpected-dispatch.txt");
    strictEqual(invoke(["--scenario", "s06a-fresh-local-only", "--result-file", dest]).status, 0);
    const original = readFileSync(dest, "utf8");
    const child = probe(["--scenario", "s06a-fresh-local-only", "--result-file", dest], "failed", marker);
    strictEqual(child.status, 1);
    match(child.stderr, /BVP_DIAGNOSTIC/);
    strictEqual(child.stdout, "");
    strictEqual(existsSync(marker), false, "existing output must be detected before run()");
    strictEqual(readFileSync(dest, "utf8"), original, "exclusive reservation must never replace results");
  });
});

test("DEC351 F01 canonical failed, blocked and unsupported scenarios propagate through compiled CLI", () => {
  withScratch(root => {
    const cases = [
      { status: "failed", classification: "assertion-mismatch", step: "assert-size" },
      { status: "blocked", classification: "missing-required-result", step: "execute" },
      { status: "unsupported", classification: "production-input-reference-unsupported", step: "preview" },
    ] as const;
    for (const testCase of cases) {
      const dest = join(root, testCase.status + ".json"), marker = join(root, testCase.status + ".dispatched");
      const child = probe(["--scenario", "s06a-fresh-local-only", "--result-file", dest],
        testCase.status, marker);
      strictEqual(child.status, 1, testCase.status + " " + child.stderr);
      strictEqual(existsSync(marker), true, testCase.status + " did not invoke real runner");
      const observed = JSON.parse(readFileSync(dest, "utf8"));
      strictEqual(observed.requestedScenarioId, "s06a-fresh-local-only");
      strictEqual(observed.executionMode, "deterministic");
      strictEqual(observed.result.scenarioId, "s06a-fresh-local-only");
      strictEqual(observed.result.status, testCase.status);
      strictEqual(observed.result.classification, testCase.classification);
      strictEqual(observed.result.diagnostic.classification, testCase.classification);
      strictEqual(observed.result.evidence.verdict.status, testCase.status);
      strictEqual(observed.result.evidence.verdict.classification, testCase.classification);
      strictEqual(observed.result.evidence.verdict.diagnostic.classification, testCase.classification);
      strictEqual(observed.result.evidence.verdict.diagnostic.identity.executionMode, "deterministic");
      strictEqual(observed.result.evidence.verdict.diagnostic.identity.stepIndex,
        testCase.status === "failed" ? 7 : testCase.status === "blocked" ? 4 : 1);
      strictEqual(observed.result.evidence.verdict.diagnostic.phase, "simulated-step-result");
      strictEqual(observed.result.evidence.verdict.diagnostic.effect, "unknown");
      strictEqual(observed.result.evidence.executionMode, "deterministic");
      strictEqual(observed.result.evidence.traceability.length > 0, true);
      if (testCase.status === "blocked") {
        const earlier = observed.result.evidence.assertions.find(
          (x: { stepId: string }) => x.stepId === "assert-upload");
        strictEqual(earlier?.status, "completed", "real prior assertion should be preserved");
        strictEqual(earlier?.matchedExpectation, true);
      }
      if (testCase.status === "unsupported") {
        strictEqual(observed.result.evidence.assertions.length, 0,
          "unsupported preview must stop before later assertions");
      }
      if (testCase.status === "failed") {
        const assertion = observed.result.evidence.assertions.find(
          (x: { stepId: string }) => x.stepId === testCase.step);
        strictEqual(assertion?.status, "failed");
        strictEqual(assertion?.matchedExpectation, false);
      }
      const summary = JSON.parse(child.stdout.trim());
      strictEqual(summary.status, testCase.status);
      strictEqual(summary.classification, testCase.classification);
      strictEqual(child.stderr.includes('"status":"completed"'), false);
      strictEqual(readFileSync(dest, "utf8").includes('"captures"'), false);
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


test("BVP result-close failure cannot print completed before actual file finalization", () => {
  withScratch(root => {
    const failedDestination = join(root, "close-failed.json");
    const compiledCloseFault = resolve(__dirname, "fixtures/bvp-cli-close-fault-preload.js");
    const child = spawnSync(process.execPath, [
      "--require", compiledCloseFault, compiledCli,
      "--scenario", "s06a-fresh-local-only", "--result-file", failedDestination,
    ], {
      cwd: process.cwd(), encoding: "utf8", timeout: 120_000,
      env: { ...process.env, NODE_TEST_CONTEXT: undefined },
    });
    if (child.error) throw child.error;
    strictEqual(child.status, 1, "close failure must override an otherwise completed scenario");
    strictEqual(child.stdout, "", "no completed or other success-looking summary before successful close");
    match(child.stderr, /BVP_DIAGNOSTIC/);
    match(child.stderr, /"phase":"result-close"/);
    strictEqual(existsSync(failedDestination), true,
      "a syntactically completed record can still be unqualified when its handle close failed");
    const original = JSON.parse(readFileSync(failedDestination, "utf8"));
    strictEqual(original.result.status, "completed");
    strictEqual(original.result.evidence.verdict.status, "completed");
    strictEqual(original.requestedScenarioId, "s06a-fresh-local-only");
    const safeTerminal = child.stdout + child.stderr;
    strictEqual(safeTerminal.includes("fresh-local.bin"), false);
    strictEqual(safeTerminal.includes(root), false, "operator diagnostic must not leak output path");

    const successfulDestination = join(root, "close-ok.json");
    const normal = invoke([
      "--scenario", "s06a-fresh-local-only", "--result-file", successfulDestination,
    ]);
    strictEqual(normal.status, 0, normal.stderr);
    strictEqual(normal.stderr, "");
    const summary = JSON.parse(normal.stdout.trim());
    const finished = JSON.parse(readFileSync(successfulDestination, "utf8"));
    strictEqual(summary.scenarioId, "s06a-fresh-local-only");
    strictEqual(summary.status, "completed");
    strictEqual(finished.result.status, summary.status);
    strictEqual(finished.result.evidence.verdict.status, summary.status);
  });
});


test("BVP result-close fault across all canonical noncompleted statuses preserves fail-closed terminal semantics", () => {
  withScratch(root => {
    const closeFault = resolve(__dirname, "fixtures/bvp-cli-close-fault-preload.js");
    for (const expectedStatus of ["failed", "blocked", "unsupported"] as const) {
      const withoutFaultFile = join(root, expectedStatus + "-normal.json");
      const withoutFault = probe([
        "--scenario", "s06a-fresh-local-only", "--result-file", withoutFaultFile,
      ], expectedStatus);
      strictEqual(withoutFault.status, 1, expectedStatus + " normal exit");
      strictEqual(withoutFault.stderr, "", expectedStatus + " should be a canonical scenario verdict");
      const normalSummary = JSON.parse(withoutFault.stdout.trim());
      const normalResult = JSON.parse(readFileSync(withoutFaultFile, "utf8"));
      strictEqual(normalSummary.status, expectedStatus);
      strictEqual(normalResult.result.status, expectedStatus);
      strictEqual(normalResult.result.evidence.verdict.status, expectedStatus);

      const failedCloseFile = join(root, expectedStatus + "-close-failed.json");
      const withCloseFault = spawnSync(process.execPath, [
        "--require", compiledProbe,
        "--require", closeFault,
        compiledCli, "--scenario", "s06a-fresh-local-only", "--result-file", failedCloseFile,
      ], {
        cwd: process.cwd(), encoding: "utf8", timeout: 120_000,
        env: { ...process.env, NODE_TEST_CONTEXT: undefined, BVP_DEC351_TEST_CASE: expectedStatus },
      });
      if (withCloseFault.error) throw withCloseFault.error;
      strictEqual(withCloseFault.status, 1, expectedStatus + " close fault exit");
      strictEqual(withCloseFault.stdout, "",
        expectedStatus + ": no canonical summary before successful close");
      match(withCloseFault.stderr, /BVP_DIAGNOSTIC/);
      match(withCloseFault.stderr, /"phase":"result-close"/);
      match(withCloseFault.stderr, /"effect":"unknown"/);
      strictEqual(withCloseFault.stderr.includes(root), false,
        expectedStatus + ": no sensitive absolute output path");
      const record = JSON.parse(readFileSync(failedCloseFile, "utf8"));
      strictEqual(record.requestedScenarioId, "s06a-fresh-local-only");
      strictEqual(record.result.status, expectedStatus);
      strictEqual(record.result.evidence.verdict.status, expectedStatus);
      strictEqual(record.result.captures, undefined);
    }
  });
});

test("BVP result-close failure during unexecuted catalog rejection stays rejected and never reports success", () => {
  withScratch(root => {
    const closeFault = resolve(__dirname, "fixtures/bvp-cli-close-fault-preload.js");
    for (const id of ["unregistered-cli-id", "battery-s09a-ios-initial-sync-01"]) {
      const dest = join(root, id + ".json");
      const child = spawnSync(process.execPath, [
        "--require", closeFault, compiledCli,
        "--scenario", id, "--result-file", dest,
      ], {
        cwd: process.cwd(), encoding: "utf8", timeout: 120_000,
        env: { ...process.env, NODE_TEST_CONTEXT: undefined },
      });
      if (child.error) throw child.error;
      strictEqual(child.status, 1);
      strictEqual(child.stdout, "", id + " cannot report a successful canonical run");
      match(child.stderr, /"classification":"scenario-cli-selection-unavailable"/);
      match(child.stderr, /"phase":"result-close"/);
      strictEqual(child.stderr.includes(dest), false, id + " path must be private");
      const rejection = JSON.parse(readFileSync(dest, "utf8"));
      strictEqual(rejection.requestedScenarioId, id);
      strictEqual(rejection.requestStatus, "rejected");
      strictEqual(rejection.result, null);
      strictEqual(rejection.diagnostic.effect, "none-confirmed");
      strictEqual(JSON.stringify(rejection).includes('"verdict"'), false);
    }
  });
});
