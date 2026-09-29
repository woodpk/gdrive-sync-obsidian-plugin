import {
  deepStrictEqual,
  strictEqual,
} from "node:assert/strict";
import { test } from "node:test";

import {
  defineScenario,
  type ScenarioDefinition,
} from "../src/scenario/scenario-contract";
import {
  DeterministicScenarioRunner,
  type ScenarioStepExecution,
} from "../src/scenario/scenario-runner";
import { virtualVaultPath } from "../src/virtual-world/in-memory-local-vault";

function scenario(
  id: string,
  steps: ScenarioDefinition["steps"],
): ScenarioDefinition {
  return defineScenario({
    id,
    description: "S05B deterministic runner contract fixture",
    traceability: {
      targets: [{ kind: "requirement", id: "REQ-S05B-RUNNER" }],
    },
    executionModes: ["deterministic"],
    steps,
  });
}

function stepShape(steps: readonly ScenarioStepExecution[]) {
  return steps.map(step => ({
    stepId: step.stepId,
    kind: step.kind,
    status: step.status,
    classification: step.classification,
    matchedExpectation: step.matchedExpectation,
  }));
}

test("runner executes ordered fixture preview and reviewed-plan production flow through S04", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("production-flow", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "runner.bin",
        content: { encoding: "bytes", value: [1, 2, 3] },
      },
      {
        id: "preview",
        kind: "production",
        device: "device-a",
        operation: "preview",
        captureAs: "plan",
      },
      {
        id: "execute",
        kind: "production",
        device: "device-a",
        operation: "execute-reviewed-plan",
        inputRef: "plan",
        captureAs: "result",
      },
    ]),
  );

  strictEqual(result.status, "completed");
  deepStrictEqual(
    result.steps.map(step => step.stepId),
    ["seed", "preview", "execute"],
  );
  strictEqual(result.steps.every(step => step.matchedExpectation), true);

  const plan = result.captures.plan as {
    readonly operations?: readonly { readonly kind?: string; readonly path?: unknown }[];
  };
  strictEqual(
    plan.operations?.some(
      operation =>
        operation.kind === "upload-create" &&
        String(operation.path) === "runner.bin",
    ),
    true,
  );
  strictEqual(
    (result.captures.result as { readonly status?: string }).status,
    "accepted",
  );
});

test("unknown step kinds fail closed as unsupported invalid scenarios", async () => {
  const malformed = {
    id: "unknown-step",
    description: "invalid runtime input",
    traceability: {
      targets: [{ kind: "requirement", id: "REQ-S05B-RUNNER" }],
    },
    executionModes: ["deterministic"],
    steps: [{ id: "magic", kind: "future-magic" }],
  } as unknown as ScenarioDefinition;

  const result = await new DeterministicScenarioRunner().run(malformed);
  strictEqual(result.status, "unsupported");
  strictEqual(result.classification, "invalid-scenario");
  deepStrictEqual(result.steps, []);
});

test("missing required production capture blocks instead of passing", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("missing-capture", [
      {
        id: "execute",
        kind: "production",
        device: "device-a",
        operation: "execute-reviewed-plan",
        inputRef: "not-created",
      },
    ]),
  );

  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-required-result");
  strictEqual(result.steps[0]?.matchedExpectation, false);
});

test("production rejection propagates after runtime restart makes a reviewed plan stale", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("stale-plan", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "stale.bin",
        content: { encoding: "utf8", value: "stale" },
      },
      {
        id: "preview",
        kind: "production",
        device: "device-a",
        operation: "preview",
        captureAs: "plan",
      },
      {
        id: "restart",
        kind: "checkpoint",
        operation: "restart-device",
        device: "device-a",
      },
      {
        id: "execute-old",
        kind: "production",
        device: "device-a",
        operation: "execute-reviewed-plan",
        inputRef: "plan",
      },
    ]),
  );

  strictEqual(result.status, "failed");
  strictEqual(result.classification, "production-request-rejected");
  strictEqual(result.steps.at(-1)?.status, "failed");
});

test("fixture failures propagate deterministically", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("fixture-failure", [
      {
        id: "move-missing",
        kind: "fixture",
        operation: "move-local",
        device: "device-a",
        fromPath: "missing.bin",
        toPath: "target.bin",
      },
    ]),
  );

  strictEqual(result.status, "failed");
  strictEqual(result.classification, "step-exception");
  strictEqual(result.steps[0]?.status, "failed");
});

test("arbitrary frozen S05A mutation-fault classifications are accepted as declarative fault detail", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("fault-classification", [
      {
        id: "fault",
        kind: "external-state",
        transition: "inject-remote-mutation-fault",
        operation: "create",
        effect: "applied-before-failure",
        classification: "simulated-response-loss",
      },
    ]),
  );

  strictEqual(result.status, "completed");
  strictEqual(result.steps[0]?.status, "completed");
});

test("explicitly expected blocked capability may continue without becoming a hidden PASS", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("expected-block", [
      {
        id: "offline",
        kind: "external-state",
        transition: "set-device-connectivity",
        device: "device-a",
        state: "offline",
        expect: {
          status: "blocked",
          classification: "device-connectivity-control-unavailable",
        },
      },
      {
        id: "seed-after-block",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "continued.bin",
        content: { encoding: "utf8", value: "continued" },
      },
    ]),
  );

  strictEqual(result.status, "completed");
  strictEqual(result.steps[0]?.status, "blocked");
  strictEqual(result.steps[0]?.matchedExpectation, true);
  strictEqual(result.steps[1]?.status, "completed");
});

test("observation and assertion families use fixed generic hooks and missing hooks block", async () => {
  const withoutHooks = await new DeterministicScenarioRunner().run(
    scenario("missing-hooks", [
      {
        id: "observe",
        kind: "observe",
        subject: "remote-change-state",
        captureAs: "changes",
      },
    ]),
  );
  strictEqual(withoutHooks.status, "blocked");
  strictEqual(
    withoutHooks.classification,
    "observation-capability-unavailable",
  );

  const withHooks = await new DeterministicScenarioRunner({
    observe: async () => ({ status: "completed", value: "observed-value" }),
    assert: async (step, context) => {
      if (context.readCapture(step.observationRef) === "observed-value") {
        return { status: "completed" };
      }
      return { status: "failed", classification: "assertion-mismatch" };
    },
  }).run(
    scenario("generic-hooks", [
      {
        id: "observe",
        kind: "observe",
        subject: "remote-change-state",
        captureAs: "changes",
      },
      {
        id: "assert",
        kind: "assert",
        assertion: "equals",
        observationRef: "changes",
        expected: "observed-value",
      },
    ]),
  );

  strictEqual(withHooks.status, "completed");
  strictEqual(withHooks.captures.changes, "observed-value");
});

test("generic external controls mutate retained local access and only the selected device clock", async () => {
  const result = await new DeterministicScenarioRunner({
    observe: async (_step, context) => {
      const local = await context.world.deviceBacking("device-a").local.observe(
        virtualVaultPath("controlled.md"),
      );
      return {
        status: "completed",
        value: {
          accessStatus: local.status,
          deviceATime: context.world.deviceBacking("device-a").clock.nowMs(),
          deviceBTime: context.world.deviceBacking("device-b").clock.nowMs(),
        },
      };
    },
    assert: async (_step, context) => {
      const probe = context.readCapture("probe") as {
        readonly accessStatus?: string;
        readonly deviceATime?: number;
        readonly deviceBTime?: number;
      } | undefined;
      return probe?.accessStatus === "unreadable" &&
        probe.deviceATime === 86400000 &&
        probe.deviceBTime === 0
        ? { status: "completed" }
        : { status: "failed", classification: "assertion-mismatch" };
    },
  }).run(
    scenario("generic-external-controls", [
      {
        id: "seed",
        kind: "fixture",
        operation: "put-local-file",
        device: "device-a",
        path: "controlled.md",
        content: { encoding: "utf8", value: "retained" },
      },
      {
        id: "make-unreadable",
        kind: "external-state",
        transition: "set-local-access",
        device: "device-a",
        path: "controlled.md",
        state: "unreadable",
      },
      {
        id: "advance-device-a",
        kind: "external-state",
        transition: "advance-device-time",
        device: "device-a",
        deltaMs: 86400000,
      },
      {
        id: "probe",
        kind: "observe",
        subject: "device-state",
        device: "device-a",
        captureAs: "probe",
      },
      {
        id: "assert-controls",
        kind: "assert",
        assertion: "equals",
        observationRef: "probe",
        expected: "controls-applied",
      },
    ]),
  );

  strictEqual(result.status, "completed");
  deepStrictEqual(result.captures.probe, {
    accessStatus: "unreadable",
    deviceATime: 86400000,
    deviceBTime: 0,
  });
});

test("checkpoint capture fails closed until bounded checkpoint capability is supplied", async () => {
  const result = await new DeterministicScenarioRunner().run(
    scenario("checkpoint-unavailable", [
      {
        id: "capture",
        kind: "checkpoint",
        operation: "capture",
        checkpointId: "cp-1",
      },
    ]),
  );
  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "checkpoint-capability-unavailable");
});

test("repeated runs and different scenario IDs preserve deterministic dispatch without retained runner state", async () => {
  const steps: ScenarioDefinition["steps"] = [
    {
      id: "seed",
      kind: "fixture",
      operation: "put-local-file",
      device: "device-a",
      path: "repeat.bin",
      content: { encoding: "utf8", value: "repeat" },
    },
    {
      id: "preview",
      kind: "production",
      device: "device-a",
      operation: "preview",
      captureAs: "plan",
    },
  ];
  const runner = new DeterministicScenarioRunner();
  const first = await runner.run(scenario("repeat-a", steps));
  const second = await runner.run(scenario("repeat-a", steps));
  const renamed = await runner.run(scenario("repeat-b", steps));

  strictEqual(first.status, "completed");
  strictEqual(second.status, "completed");
  strictEqual(renamed.status, "completed");
  deepStrictEqual(stepShape(first.steps), stepShape(second.steps));
  deepStrictEqual(stepShape(first.steps), stepShape(renamed.steps));
});
