import { deepStrictEqual, doesNotMatch, rejects, strictEqual } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineScenario } from "../src/scenario/scenario-contract";
import { DeterministicScenarioRunner } from "../src/scenario/scenario-runner";
import {
  bvpDiagnostic,
  safeUnexpectedFailure,
} from "../src/scenario/scenario-diagnostics";
import { createLiveScenarioExecutor } from "../src/live-device/live-scenario-executor";
import { createDriveCommandMailbox, MailboxUnavailableError } from "../src/live-device/drive-mailbox";

const fixture = (executionMode: "live" | "deterministic") => defineScenario({
  id: "diagnostic-fixture",
  description: "BVP structured error communication contract",
  executionModes: [executionMode],
  traceability: { targets: [{ kind: "requirement", id: "BVP-EVID-005" }] },
  steps: [{
    id: "observe",
    kind: "observe" as const,
    subject: "device-state" as const,
    device: "windows",
    captureAs: "state",
  }],
});

test("diagnostics describe only observed boundaries and never imply device delivery", () => {
  const value = bvpDiagnostic({
    classification: "device-result-unavailable",
    component: "live-controller",
    phase: "response-wait",
    lastConfirmedBoundary: "relay-outbox-write",
    firstUnconfirmedBoundary: "device-result-receipt",
    effect: "unknown",
    recommendedAction: "inspect-pending-command",
    stepId: "observe",
  });
  deepStrictEqual(value, {
    schemaVersion: 1,
    classification: "device-result-unavailable",
    component: "live-controller",
    phase: "response-wait",
    lastConfirmedBoundary: "relay-outbox-write",
    firstUnconfirmedBoundary: "device-result-receipt",
    effect: "unknown",
    recommendedAction: "inspect-pending-command",
    stepId: "observe",
  });
  strictEqual(JSON.stringify(value).includes("delivered"), false);
});

test("arbitrary exceptions never leak tokens, personal paths or vault contents", () => {
  const message = "Bearer secret123 /Users/owner/PrivateVault/private-note.md";
  const failure = safeUnexpectedFailure(new Error(message), {
    component: "scenario-runner",
    phase: "step-execution",
    lastConfirmedBoundary: "scenario-step-selected",
    firstUnconfirmedBoundary: "step-execution",
    stepId: "observe",
  });
  strictEqual(failure.status, "failed");
  strictEqual(failure.classification, "step-exception");
  strictEqual(failure.diagnostic.classification, "step-exception");
  strictEqual(failure.diagnostic.effect, "unknown");
  doesNotMatch(JSON.stringify(failure), /secret123|PrivateVault|private-note|Bearer/i);
});

test("malformed external diagnostic codes are not reflected into public output", () => {
  const diagnostic = bvpDiagnostic({
    classification: "Bearer hidden-secret",
    component: "live-controller",
    phase: "response-wait",
    lastConfirmedBoundary: "relay-outbox-write",
    firstUnconfirmedBoundary: "device-result-receipt",
    effect: "unknown",
    recommendedAction: "inspect-pending-command",
    stepId: "private/path/token",
  });
  strictEqual(diagnostic.classification, "unexpected-internal-error");
  strictEqual(diagnostic.stepId, undefined);
  doesNotMatch(JSON.stringify(diagnostic), /hidden-secret|private\/path/);
});

test("scenario step exceptions persist safe structured context in result and canonical evidence", async () => {
  const definition = fixture("live");
  const runner = new DeterministicScenarioRunner({}, {
    executionMode: "live",
    deviceIdentities: ["simulated-windows"],
    async execute() { throw new Error("vault secret /home/owner/private.md Bearer sensitive"); },
  });
  const result = await runner.run(definition);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "step-exception");
  strictEqual(result.steps[0]?.diagnostic?.lastConfirmedBoundary, "scenario-step-selected");
  strictEqual(result.diagnostic?.firstUnconfirmedBoundary, "step-execution");
  strictEqual(result.evidence?.machine.verdict.diagnostic?.classification, "step-exception");
  doesNotMatch(JSON.stringify(result), /Bearer sensitive|private\.md|vault secret/);
});

test("missing live response identifies an unknown receipt rather than claiming failed delivery", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-diag-"));
  try {
    const scenario = fixture("live");
    const relay = join(root, "relay");
    const runner = await createLiveScenarioExecutor({
      scenario, runId: "diagnostics-run", deviceIds: { windows: "simulated-only-private-id" },
      relayRoot: relay, checkpointFile: join(root, "checkpoint.json"),
      expectedValidationSourceCommit: "a".repeat(40),
      resultTimeoutMs: 15, pollIntervalMs: 2,
    });
    const result = await new DeterministicScenarioRunner({}, runner).run(scenario);
    strictEqual(result.status, "blocked");
    strictEqual(result.classification, "device-result-unavailable");
    strictEqual(result.diagnostic?.phase, "response-wait");
    strictEqual(result.diagnostic?.lastConfirmedBoundary, "relay-outbox-write");
    strictEqual(result.diagnostic?.firstUnconfirmedBoundary, "device-result-receipt");
    strictEqual(result.diagnostic?.effect, "unknown");
    doesNotMatch(JSON.stringify(result), /simulated-only-private-id/);
    const files = await readdir(join(relay, "outbox"));
    strictEqual(files.length, 1);
    const record = JSON.parse(await readFile(join(relay, "outbox", files[0]!), "utf8"));
    strictEqual(record.deviceId, "simulated-only-private-id");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Drive mailbox distinguishes safe authorization, rate, provider and transport failures", async () => {
  const samples: readonly [number, string][] = [
    [401, "mailbox-drive-unauthorized"],
    [403, "mailbox-drive-forbidden"],
    [429, "mailbox-drive-rate-limited"],
    [503, "mailbox-drive-provider-unavailable"],
    [400, "mailbox-drive-request-rejected"],
  ];
  for (const [httpStatus, code] of samples) {
    const mailbox = createDriveCommandMailbox(async () => new Response(null, { status: httpStatus }));
    await rejects(() => mailbox.commands("test-run", "simulated-device"),
      (error: unknown) => error instanceof MailboxUnavailableError && error.message === code);
  }
  const network = createDriveCommandMailbox(async () => {
    throw new Error("Bearer leaked-token C:\\private\\vault");
  });
  await rejects(() => network.commands("test-run", "simulated-device"),
    (error: unknown) => error instanceof MailboxUnavailableError &&
      error.message === "mailbox-drive-transport-unavailable");
});

test("live runner top-level exceptions produce a safe failure record, no raw path or stack", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-cli-"));
  try {
    const resultPath = join(root, "result.json");
    const privatePath = join(root, "Bearer-private-credential-should-not-leak.json");
    const cli = join(__dirname, "batteries", "run-live-battery.js");
    const child = spawnSync(process.execPath, [cli,
      "--battery", "windows-live-smoke", "--result-file", resultPath,
      "--device-map-json", JSON.stringify({ windows: "synthetic-windows-id" }),
      "--run-id", "diagnostics-cli",
      "--relay-root", join(root, "relay"), "--checkpoint-file", join(root, "checkpoint.json"),
      "--validation-source-commit", "a".repeat(40),
      "--validation-build-identity-file", privatePath,
    ], { encoding: "utf8" });
    strictEqual(child.status, 1);
    const record = JSON.parse(await readFile(resultPath, "utf8"));
    strictEqual(record.result.status, "failed");
    strictEqual(record.result.classification, "battery-runner-exception");
    strictEqual(record.result.diagnostic.component, "battery-runner");
    doesNotMatch(child.stdout + child.stderr + JSON.stringify(record),
      /Bearer-private-credential|synthetic-windows-id|node:internal|at main/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("deterministic runner top-level invalid battery cannot echo untrusted arguments", async () => {
  const root = await mkdtemp(join(tmpdir(), "bvp-det-cli-"));
  try {
    const resultPath = join(root, "result.json");
    const cli = join(__dirname, "batteries", "run-deterministic-battery.js");
    const child = spawnSync(process.execPath, [cli,
      "--battery", "Bearer-private-credential", "--result-file", resultPath,
      "--tap-file", join(root, "tap.txt"),
    ], { encoding: "utf8" });
    strictEqual(child.status, 1);
    const record = JSON.parse(await readFile(resultPath, "utf8"));
    strictEqual(record.result.classification, "deterministic-battery-runner-exception");
    strictEqual(record.result.diagnostic.component, "battery-runner");
    doesNotMatch(child.stdout + child.stderr + JSON.stringify(record), /Bearer-private-credential|node:internal|at main/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("existing PHX-CI engineering operator accepts software-only feature ref without physical device dispatch", () => {
  const code = readFileSync(resolve(process.cwd(), "dev", "scripts",
    "Invoke-PHXCI-S09-WindowsRelayCorrection.ps1"), "utf8");
  strictEqual(code.includes("[string]$SoftwareOnlyBranch"), true);
  strictEqual(code.includes("$branch = $SoftwareOnlyBranch"), true);
  strictEqual(code.includes("if ($SoftwareOnlyBranch -and ("), true);
  strictEqual(code.includes("$RunWindowsPhysicalSmoke"), true);
  strictEqual(code.includes("$RunS09ADualPhysicalReadiness"), true);
  strictEqual(code.includes("'npm run test:bvp-root'"), true);
});
