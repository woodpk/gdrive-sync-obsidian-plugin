import { strictEqual } from "node:assert/strict";
import { test } from "node:test";
import { s09aRequestAttributionScenario } from "../../scenarios/live/s09a-request-attribution";
import { assertScenarioObservation } from "../src/scenario/scenario-evidence";
import { DeterministicScenarioRunner, type ScenarioStepExecutor } from "../src/scenario/scenario-runner";

async function exercise(operationCount: number, operationKinds: readonly string[] | undefined) {
  let dispatchCount = 0;
  const executor: ScenarioStepExecutor = {
    executionMode: "live",
    deviceIdentities: ["isolated-windows"],
    async execute(step, context) {
      if (step.kind === "assert") return assertScenarioObservation(step, context);
      if (step.kind === "observe" && step.subject === "device-state") {
        return { status: "completed", value: { kind: "idle-ready" } };
      }
      if (step.kind === "observe" && step.subject === "local-entry") {
        return { status: "completed", value: {
          status: "present", exists: true,
          hash: "81b4ca90a96f40bca8714cdff2c05e668f465be0e6d5daeecb2e219da19e1575",
        } };
      }
      if (step.kind === "fixture") return { status: "completed" };
      if (step.kind === "production" && step.operation === "preview") {
        return { status: "completed", value: { planId: "reviewed-plan", operationCount, ...(operationKinds ? { operationKinds } : {}) } };
      }
      if (step.kind === "production" && step.operation === "execute-reviewed-plan") {
        strictEqual(context.readCapture(step.inputRef)?.["planId"], "reviewed-plan");
        dispatchCount++;
        return { status: "completed", value: { receipt: { terminal: "complete" } } };
      }
      return { status: "failed", classification: "unexpected-dispatch" };
    },
  };
  const result = await new DeterministicScenarioRunner({}, executor).run(s09aRequestAttributionScenario);
  return { result, dispatchCount };
}

test("S09A live gate blocks zero operations before any production execution", async () => {
  const { result, dispatchCount } = await exercise(0, []);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
  strictEqual(dispatchCount, 0);
});

test("S09A live gate blocks multiple operations before any production execution", async () => {
  const { result, dispatchCount } = await exercise(2, ["upload-create", "remote-trash"]);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
  strictEqual(dispatchCount, 0);
});

test("S09A live gate blocks a destructive single-operation plan", async () => {
  const { result, dispatchCount } = await exercise(1, ["remote-trash"]);
  strictEqual(result.status, "failed");
  strictEqual(result.classification, "assertion-mismatch");
  strictEqual(dispatchCount, 0);
});

test("S09A live gate blocks missing categorical plan proof", async () => {
  const { result, dispatchCount } = await exercise(1, undefined);
  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-observation-field");
  strictEqual(dispatchCount, 0);
});

test("S09A live gate executes a reviewed single-upload plan exactly once", async () => {
  const { result, dispatchCount } = await exercise(1, ["upload-create"]);
  strictEqual(result.status, "completed");
  strictEqual(dispatchCount, 1);
});
