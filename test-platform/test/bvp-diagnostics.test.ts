import { deepStrictEqual, doesNotMatch, strictEqual } from "node:assert/strict";
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
