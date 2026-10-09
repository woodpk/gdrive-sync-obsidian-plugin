import { deepStrictEqual, rejects, strictEqual } from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { s09aWindowsInitialSyncScenario as scenario } from "../scenarios/live/s09a-windows-initial-sync";
import { loadLateCompletionRecovery } from "../src/live-device/late-completion-recovery";
import { createLiveScenarioExecutor, liveCommandId, liveSequenceFor } from "../src/live-device/live-scenario-executor";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import type { DeviceCommand, DeviceCommandResult } from "../src/live-device/device-command-agent";

const sourceCommit = "d".repeat(40);
const runId = "s09a-late-recovery-test";
const deviceId = "device:test-windows";
const deviceIds = { windows: deviceId };
const hash = "fd07d9a82b6662d6ce7f2c192fec419481fb082065a86c2b73bd629aef59a82f";
const validationBuild = { schemaVersion: 1 as const, sourceCommit };

function prior(): any {
  return {
    scenarioId: scenario.id, status: "blocked", classification: "device-result-unavailable",
    steps: scenario.steps.slice(0, 6).map((step, index) => ({
      index, stepId: step.id, kind: step.kind,
      status: index === 5 ? "blocked" : "completed",
      matchedExpectation: index !== 5,
      ...(index === 5 ? { classification: "device-result-unavailable" } : {}),
    })),
    captures: {
      "windows-before": { kind: "idle-ready" },
      "windows-canary": { status: "present", exists: true, sizeBytes: 53, hash },
    },
    evidence: { machine: { schemaVersion: 1, executionMode: "live", deviceIdentities: [deviceId],
      liveIdentity: { runId, sourceCommit } } },
  };
}

function completion(): DeviceCommandResult {
  return {
    validationBuild, runId, deviceId,
    sequence: liveSequenceFor(scenario, "windows", 5, 1),
    commandId: liveCommandId(runId, scenario.id, 5, 1),
    kind: "production-execute", status: "completed", classification: "production-complete",
    actionResult: { status: "accepted" } as any,
    receipt: { runId: "production-run", planId: "plan", trigger: "manual", terminal: "complete",
      requiredEffectsCommittedAndVerified: true, committedOperationCount: 23, skippedOperationCount: 0 } as any,
  };
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "bvp-late-"));
  const relayRoot = join(directory, "relay");
  const resultFile = join(directory, "prior.json");
  const inbox = join(relayRoot, "inbox");
  await mkdir(inbox, { recursive: true });
  for (const folder of ["outbox", "sent"]) await mkdir(join(relayRoot, folder));
  const priorResult = prior();
  const lateResult = completion();
  await writeFile(resultFile, JSON.stringify({ battery: { name: "s09a-windows-initial-sync" }, result: priorResult }));
  await writeFile(join(inbox, lateResult.commandId + ".json.result.json"), JSON.stringify(lateResult));
  const options = { scenario, runId, deviceIds, sourceCommit, relayRoot, previousResultFile: resultFile };
  return { directory, relayRoot, resultFile, priorResult, lateResult, options };
}

async function respond(relay: string, handler: (command: DeviceCommand) => DeviceCommandResult): Promise<DeviceCommand> {
  const out = join(relay, "outbox");
  for (let i = 0; i < 5000; i++) {
    const names = await readdir(out);
    if (names.length) {
      const name = names[0]!;
      const cmd = JSON.parse(await readFile(join(out, name), "utf8")) as DeviceCommand;
      await rename(join(out, name), join(relay, "sent", name));
      await writeFile(join(relay, "inbox", name + ".result.json"), JSON.stringify(handler(cmd)));
      await rm(join(relay, "sent", name));
      return cmd;
    }
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  throw new Error("observation-command-timeout");
}

function response(command: DeviceCommand): DeviceCommandResult {
  return {
    validationBuild, runId, deviceId, sequence: command.sequence, commandId: command.commandId,
    kind: command.kind, status: "completed", classification: "completed",
    ...(command.kind === "observe-file"
      ? { fixture: { exists: true, sizeBytes: 53, sha256: hash } }
      : { productStatus: { kind: "idle-ready" } }),
  } as DeviceCommandResult;
}

test("late receipt resumes the exact run with read-only observations, never redispatching synchronization", async () => {
  const f = await fixture();
  try {
    const recovery = await loadLateCompletionRecovery(f.options);
    strictEqual(recovery.completedStepIndex, 5);
    deepStrictEqual(recovery.result, f.lateResult);
    const executor = await createLiveScenarioExecutor({
      scenario, runId, deviceIds, relayRoot: f.relayRoot,
      checkpointFile: join(f.directory, "checkpoint.json"),
      expectedValidationSourceCommit: sourceCommit, lateCompletionRecovery: recovery,
      resultTimeoutMs: 5000, pollIntervalMs: 1,
    });
    const running = new DeterministicScenarioRunner({}, executor).run(scenario);
    const first = await respond(f.relayRoot, response);
    const second = await respond(f.relayRoot, response);
    const result = await running;
    strictEqual(result.status, "completed");
    strictEqual(result.steps.length, scenario.steps.length);
    deepStrictEqual([first.kind, second.kind], ["observe-file", "observe-product"]);
    deepStrictEqual([first.sequence, second.sequence], [6, 7]);
    strictEqual((result.captures["windows-initial-result"] as DeviceCommandResult).receipt?.terminal, "complete");
    strictEqual((result.captures["windows-canary-after-sync"] as any).hash, hash);
    strictEqual((result.captures["windows-after"] as any).kind, "idle-ready");
    const leaseKey = createHash("sha256").update(deviceId).digest("hex");
    const lease = JSON.parse(await readFile(join(f.relayRoot, "controller-authority", leaseKey + ".json"), "utf8"));
    strictEqual(lease.runId, null);
    strictEqual((await readdir(join(f.relayRoot, "outbox"))).length, 0);
    strictEqual((await readdir(join(f.relayRoot, "sent"))).length, 0);
    strictEqual((JSON.parse(await readFile(f.resultFile, "utf8")) as any).result.status, "blocked");
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("invalid late receipts, mismatched provenance and pending commands fail closed before a lease", async () => {
  const f = await fixture();
  try {
    const resultPath = join(f.relayRoot, "inbox", f.lateResult.commandId + ".json.result.json");
    const good = completion();
    for (const altered of [
      { ...good, commandId: "wrong" },
      { ...good, sequence: 4 },
      { ...good, validationBuild: { schemaVersion: 1 as const, sourceCommit: "e".repeat(40) } },
      { ...good, receipt: { ...good.receipt!, terminal: "uncertain" as const } },
      { ...good, receipt: { ...good.receipt!, requiredEffectsCommittedAndVerified: false } },
    ]) {
      await writeFile(resultPath, JSON.stringify(altered));
      await rejects(loadLateCompletionRecovery(f.options), /late-completion-recovery-receipt-not-authoritative-complete/);
    }
    await writeFile(resultPath, JSON.stringify(good));
    await writeFile(f.resultFile, JSON.stringify({ result: { ...f.priorResult, scenarioId: "wrong-scenario" } }));
    await rejects(loadLateCompletionRecovery(f.options), /late-completion-recovery-prior-verdict-invalid/);
    await writeFile(f.resultFile, JSON.stringify({ result: f.priorResult }));
    await writeFile(join(f.relayRoot, "sent", "unresolved.json"), "{}");
    await rejects(loadLateCompletionRecovery(f.options), /late-completion-recovery-pending-relay-command/);
    strictEqual(await readdir(join(f.relayRoot, "controller-authority")).then(() => true, () => false), false);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});
