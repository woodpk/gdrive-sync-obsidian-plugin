import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { test } from "node:test";

import { defineScenario, type ScenarioDefinition, type ScenarioStep } from "../src/scenario/scenario-contract";
import {
  DeterministicScenarioRunner,
  type ScenarioCapabilityResult,
  type ScenarioExecutorContext,
  type ScenarioStepExecutor,
} from "../src/scenario/scenario-runner";

function liveScenario(steps: ScenarioDefinition["steps"]): ScenarioDefinition {
  return defineScenario({
    id: "live-executor-seam",
    description: "S08E prerequisite single-runner executor seam fixture",
    traceability: { targets: [{ kind: "requirement", id: "REQ-S08E-EXECUTOR-SEAM" }] },
    executionModes: ["live"],
    steps,
  });
}

class RecordingExecutor implements ScenarioStepExecutor {
  readonly executionMode = "live" as const;
  readonly deviceIdentities = ["device:ios", "device:windows"];
  readonly seen: string[] = [];
  readonly indexes: number[] = [];
  disposed = 0;
  constructor(private readonly results: Record<string, ScenarioCapabilityResult>) {}
  async execute(step: ScenarioStep, context: ScenarioExecutorContext): Promise<ScenarioCapabilityResult> {
    this.seen.push(step.id);
    this.indexes.push(context.stepIndex);
    if (step.kind === "assert") {
      strictEqual(context.readCapture(step.observationRef) !== undefined, true);
    }
    return this.results[step.id] ?? { status: "completed" };
  }
  async dispose(): Promise<void> { this.disposed += 1; }
}

test("same runner owns live step order, captures, verdict, evidence mode, and disposal", async () => {
  const executor = new RecordingExecutor({
    observe: { status: "completed", value: { status: "present", exists: true } },
    assert: { status: "completed" },
  });
  const runner = new DeterministicScenarioRunner({}, executor);
  const result = await runner.run(liveScenario([
    { id: "fixture", kind: "fixture", operation: "put-local-file", device: "device-a", path: "live.md", content: { encoding: "utf8", value: "x" } },
    { id: "observe", kind: "observe", subject: "local-entry", device: "device-a", path: "live.md", captureAs: "observed" },
    { id: "assert", kind: "assert", assertion: "exists", observationRef: "observed", expected: true },
  ]));
  strictEqual(result.status, "completed");
  deepStrictEqual(executor.seen, ["fixture", "observe", "assert"]);
  deepStrictEqual(executor.indexes, [0, 1, 2]);
  deepStrictEqual(result.captures.observed, { status: "present", exists: true });
  strictEqual(executor.disposed, 1);
  strictEqual(result.evidence?.machine.executionMode, "live");
  deepStrictEqual(result.evidence?.machine.deviceIdentities, ["device:ios", "device:windows"]);
});

test("runner applies existing expected-outcome rules to executor results and terminates centrally", async () => {
  const expected = new RecordingExecutor({ first: { status: "blocked", classification: "human-checkpoint" }, second: { status: "completed" } });
  const continued = await new DeterministicScenarioRunner({}, expected).run(liveScenario([
    { id: "first", kind: "checkpoint", operation: "capture", checkpointId: "cp", expect: { status: "blocked", classification: "human-checkpoint" } },
    { id: "second", kind: "observe", subject: "remote-change-state", captureAs: "after" },
  ]));
  strictEqual(continued.status, "completed");
  deepStrictEqual(expected.seen, ["first", "second"]);
  strictEqual(expected.disposed, 1);

  const failure = new RecordingExecutor({ first: { status: "failed", classification: "device-unavailable" }, second: { status: "completed" } });
  const stopped = await new DeterministicScenarioRunner({}, failure).run(liveScenario([
    { id: "first", kind: "observe", subject: "remote-change-state", captureAs: "missing" },
    { id: "second", kind: "observe", subject: "remote-change-state", captureAs: "never" },
  ]));
  strictEqual(stopped.status, "failed");
  strictEqual(stopped.classification, "device-unavailable");
  deepStrictEqual(failure.seen, ["first"]);
  strictEqual(failure.disposed, 1);
  strictEqual("missing" in stopped.captures, false);

  const unsupported = new RecordingExecutor({ first: { status: "unsupported", classification: "live-capability-unsupported" } });
  const unsupportedResult = await new DeterministicScenarioRunner({}, unsupported).run(liveScenario([
    { id: "first", kind: "external-state", transition: "set-device-connectivity", device: "device-a", state: "offline" },
  ]));
  strictEqual(unsupportedResult.status, "unsupported");
  strictEqual(unsupportedResult.classification, "live-capability-unsupported");
  strictEqual(unsupported.disposed, 1);
});

test("execution mode applicability remains runner-owned", async () => {
  const executor = new RecordingExecutor({});
  const deterministicOnly = defineScenario({
    id: "deterministic-only",
    description: "mode mismatch fixture",
    traceability: { targets: [{ kind: "requirement", id: "REQ-S08E-MODE" }] },
    executionModes: ["deterministic"],
    steps: [{ id: "observe", kind: "observe", subject: "remote-change-state", captureAs: "probe" }],
  });
  const result = await new DeterministicScenarioRunner({}, executor).run(deterministicOnly);
  strictEqual(result.status, "unsupported");
  strictEqual(result.classification, "execution-mode-not-applicable");
  strictEqual(executor.seen.length, 0);
  strictEqual(executor.disposed, 1);
  strictEqual(result.evidence?.machine.executionMode, "live");
});


test("deterministic path retains deterministic evidence mode and observation capture ownership", async () => {
  const deterministic = defineScenario({
    id: "deterministic-mode-proof",
    description: "deterministic mode preservation",
    traceability: { targets: [{ kind: "requirement", id: "REQ-S08E-DETERMINISTIC" }] },
    executionModes: ["deterministic"],
    steps: [{ id: "observe", kind: "observe", subject: "remote-change-state", captureAs: "empty" }],
  });
  const result = await new DeterministicScenarioRunner({ observe: async () => ({ status: "completed" }) }).run(deterministic);
  strictEqual(result.status, "completed");
  strictEqual(result.evidence?.machine.executionMode, "deterministic");
  strictEqual(Object.prototype.hasOwnProperty.call(result.captures, "empty"), true);
  strictEqual(result.captures.empty, undefined);
});


test("invalid scenario input disposes an injected executor without dispatching a step", async () => {
  const executor = new RecordingExecutor({});
  const malformed = { id: "bad", executionModes: ["live"], steps: [{ id: "bad", kind: "unknown" }] } as unknown as ScenarioDefinition;
  const result = await new DeterministicScenarioRunner({}, executor).run(malformed);
  strictEqual(result.status, "unsupported");
  strictEqual(result.classification, "invalid-scenario");
  strictEqual(executor.seen.length, 0);
  strictEqual(executor.disposed, 1);
});
