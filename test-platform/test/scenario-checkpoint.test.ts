import {
  deepStrictEqual,
  doesNotMatch,
  strictEqual,
} from "node:assert/strict";
import { test } from "node:test";

import {
  createScenarioCheckpoint,
  decodeScenarioCheckpoint,
  encodeScenarioCheckpoint,
  InMemoryScenarioCheckpointStore,
  validateScenarioCheckpointForResume,
} from "../src/scenario/scenario-checkpoint";
import { defineScenario, type ScenarioDefinition } from "../src/scenario/scenario-contract";
import type { CanonicalScenarioEvidence } from "../src/scenario/scenario-evidence";
import type { ScenarioStepExecution } from "../src/scenario/scenario-runner";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";
import { VirtualSynchronizationWorld } from "../src/virtual-world/virtual-world";

function scenario(id = "checkpoint-scenario"): ScenarioDefinition {
  return defineScenario({
    id,
    description: "S05D bounded checkpoint fixture",
    traceability: { targets: [{ kind: "requirement", id: "REQ-S05D-CHECKPOINT" }] },
    executionModes: ["deterministic", "live"],
    steps: [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "checkpoint.bin",
        content: { encoding: "bytes", value: [1] },
      },
      { id: "capture", kind: "checkpoint", operation: "capture", checkpointId: "cp-1" },
      { id: "observe", kind: "observe", subject: "device-state", device: "device-a", captureAs: "state" },
    ],
  });
}

const priorSteps: readonly ScenarioStepExecution[] = [
  { index: 0, stepId: "seed", kind: "fixture", status: "completed", matchedExpectation: true },
  {
    index: 1,
    stepId: "capture",
    kind: "checkpoint",
    status: "blocked",
    classification: "human-checkpoint",
    reason: "secret detail that must not persist",
    matchedExpectation: true,
  },
];

const evidence: CanonicalScenarioEvidence = {
  machine: {
    schemaVersion: 1,
    scenarioId: "checkpoint-scenario",
    executionMode: "deterministic",
    traceability: [{ kind: "requirement", id: "REQ-S05D-CHECKPOINT" }],
    fixtures: [],
    deviceIdentities: [],
    observations: [],
    assertions: [],
    verdict: { status: "blocked", classification: "human-checkpoint" },
  },
  machineJson: '{"accessToken":"secret-token-value","status":"blocked"}',
  human: "secret human detail",
};

function validCheckpoint() {
  const result = createScenarioCheckpoint({
    checkpointId: "cp-1",
    scenario: scenario(),
    runId: "run-001",
    executionMode: "deterministic",
    nextStepIndex: 2,
    disposition: "awaiting-resume",
    steps: priorSteps,
    deviceIdentities: ["device:z", "device:a", "device:a"],
    requiredResumeEvidence: ["human-confirmation", "canonical-evidence"],
    evidence,
  });
  strictEqual(result.ok, true);
  if (!result.ok) throw new Error(result.classification);
  return result.value;
}

test("valid checkpoint round-trips deterministically with bounded continuation state", () => {
  const checkpoint = validCheckpoint();
  const first = encodeScenarioCheckpoint(checkpoint);
  const decoded = decodeScenarioCheckpoint(first);
  strictEqual(decoded.ok, true);
  if (!decoded.ok) return;
  const second = encodeScenarioCheckpoint(decoded.value);

  strictEqual(second, first);
  strictEqual(decoded.value.schemaVersion, 1);
  strictEqual(decoded.value.scenarioId, "checkpoint-scenario");
  strictEqual(decoded.value.runId, "run-001");
  strictEqual(decoded.value.nextStepIndex, 2);
  strictEqual(decoded.value.disposition, "awaiting-resume");
  deepStrictEqual(decoded.value.deviceIdentities, ["device:a", "device:z"]);
  deepStrictEqual(decoded.value.requiredResumeEvidence, ["canonical-evidence", "human-confirmation"]);
  deepStrictEqual(
    decoded.value.results.map(result => ({
      index: result.index,
      stepId: result.stepId,
      status: result.status,
      classification: result.classification,
    })),
    [
      { index: 0, stepId: "seed", status: "completed", classification: undefined },
      { index: 1, stepId: "capture", status: "blocked", classification: "human-checkpoint" },
    ],
  );
  strictEqual(decoded.value.evidence?.verdictStatus, "blocked");
  strictEqual(decoded.value.evidence?.digest.startsWith("sha256:"), true);
});

test("checkpoint excludes arbitrary runner reasons, evidence bodies, and secret-like fields", () => {
  const encoded = encodeScenarioCheckpoint(validCheckpoint());
  doesNotMatch(encoded, /secret detail|secret-token-value|secret human detail|accessToken/);

  const parsed = JSON.parse(encoded) as Record<string, unknown>;
  parsed.refreshToken = "should-never-be-accepted";
  const injected = decodeScenarioCheckpoint(JSON.stringify(parsed));
  strictEqual(injected.ok, false);
  if (!injected.ok) strictEqual(injected.classification, "checkpoint-malformed");
});

test("scenario and run mismatches fail closed", () => {
  const checkpoint = validCheckpoint();

  const wrongScenario = validateScenarioCheckpointForResume(checkpoint, {
    scenario: scenario("other-scenario"),
    runId: "run-001",
    executionMode: "deterministic",
    deviceIdentities: ["device:a", "device:z"],
  });
  strictEqual(wrongScenario.ok, false);
  if (!wrongScenario.ok) strictEqual(wrongScenario.classification, "checkpoint-scenario-mismatch");

  const wrongRun = validateScenarioCheckpointForResume(checkpoint, {
    scenario: scenario(),
    runId: "run-999",
    executionMode: "deterministic",
    deviceIdentities: ["device:a", "device:z"],
  });
  strictEqual(wrongRun.ok, false);
  if (!wrongRun.ok) strictEqual(wrongRun.classification, "checkpoint-run-mismatch");
});

test("execution mode and device context mismatches fail closed", () => {
  const checkpoint = validCheckpoint();

  const wrongMode = validateScenarioCheckpointForResume(checkpoint, {
    scenario: scenario(),
    runId: "run-001",
    executionMode: "live",
    deviceIdentities: ["device:a", "device:z"],
  });
  strictEqual(wrongMode.ok, false);
  if (!wrongMode.ok) strictEqual(wrongMode.classification, "checkpoint-execution-mode-mismatch");

  const wrongDevices = validateScenarioCheckpointForResume(checkpoint, {
    scenario: scenario(),
    runId: "run-001",
    executionMode: "deterministic",
    deviceIdentities: ["device:a"],
  });
  strictEqual(wrongDevices.ok, false);
  if (!wrongDevices.ok) strictEqual(wrongDevices.classification, "checkpoint-execution-context-mismatch");
});

test("incompatible, malformed, truncated, and oversized checkpoints fail closed", () => {
  const encoded = encodeScenarioCheckpoint(validCheckpoint());
  const incompatible = JSON.parse(encoded) as Record<string, unknown>;
  incompatible.schemaVersion = 2;
  const versionResult = decodeScenarioCheckpoint(JSON.stringify(incompatible));
  strictEqual(versionResult.ok, false);
  if (!versionResult.ok) strictEqual(versionResult.classification, "checkpoint-incompatible-version");

  const truncated = decodeScenarioCheckpoint(encoded.slice(0, -7));
  strictEqual(truncated.ok, false);
  if (!truncated.ok) strictEqual(truncated.classification, "checkpoint-malformed");

  const malformed = decodeScenarioCheckpoint('{"schemaVersion":1}');
  strictEqual(malformed.ok, false);
  if (!malformed.ok) strictEqual(malformed.classification, "checkpoint-malformed");

  const oversized = decodeScenarioCheckpoint("x".repeat(33 * 1024));
  strictEqual(oversized.ok, false);
  if (!oversized.ok) strictEqual(oversized.classification, "checkpoint-malformed");
});

test("in-memory store persists encoded checkpoints without becoming runtime authority", () => {
  const checkpoint = validCheckpoint();
  const store = new InMemoryScenarioCheckpointStore();
  store.save(checkpoint);
  const loaded = store.load("cp-1");
  strictEqual(loaded.ok, true);
  if (!loaded.ok) return;
  strictEqual(encodeScenarioCheckpoint(loaded.value), encodeScenarioCheckpoint(checkpoint));

  const missing = store.load("missing");
  strictEqual(missing.ok, false);
  if (!missing.ok) strictEqual(missing.classification, "checkpoint-malformed");
});

test("restoring and validating a checkpoint cannot mutate product state by itself", async () => {
  const world = await VirtualSynchronizationWorld.create(["device-a"]);
  const path = virtualVaultPath("sentinel.bin");
  await world.deviceBacking("device-a").local.replaceFile(path, {
    sizeBytes: 3,
    async *openChunks() { yield Uint8Array.from([7, 8, 9]); },
  });
  const before = await world.deviceBacking("device-a").local.observe(path);

  const decoded = decodeScenarioCheckpoint(encodeScenarioCheckpoint(validCheckpoint()));
  strictEqual(decoded.ok, true);
  if (!decoded.ok) return;
  const resumed = validateScenarioCheckpointForResume(decoded.value, {
    scenario: scenario(),
    runId: "run-001",
    executionMode: "deterministic",
    deviceIdentities: ["device:a", "device:z"],
  });
  strictEqual(resumed.ok, true);

  const after = await world.deviceBacking("device-a").local.observe(path);
  deepStrictEqual(after, before);
});

test("awaiting-resume requires explicit resume evidence and result positions cannot cross next step", () => {
  const missingEvidence = createScenarioCheckpoint({
    checkpointId: "cp-bad",
    scenario: scenario(),
    runId: "run-001",
    executionMode: "deterministic",
    nextStepIndex: 2,
    disposition: "awaiting-resume",
    steps: priorSteps,
  });
  strictEqual(missingEvidence.ok, false);
  if (!missingEvidence.ok) strictEqual(missingEvidence.classification, "checkpoint-malformed");

  const encoded = JSON.parse(encodeScenarioCheckpoint(validCheckpoint())) as {
    results: Array<{ index: number }>;
  } & Record<string, unknown>;
  encoded.results[1]!.index = 2;
  const crossed = decodeScenarioCheckpoint(JSON.stringify(encoded));
  strictEqual(crossed.ok, false);
  if (!crossed.ok) strictEqual(crossed.classification, "checkpoint-malformed");
});
