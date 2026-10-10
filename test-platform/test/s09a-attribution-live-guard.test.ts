import { strictEqual } from "node:assert/strict";
import { bvpOpaquePathKey } from "../src/live-device/device-command-agent";
import { test } from "node:test";
import { s09aRequestAttributionScenario } from "../scenarios/live/s09a-request-attribution";
import { assertScenarioObservation } from "../src/scenario/scenario-evidence";
import { DeterministicScenarioRunner, type ScenarioStepExecutor } from "../src/scenario/scenario-runner";

const verifiedCanary = "path-sha256:788c8a656d7aab99f9283b50a9ade906fb04a66e6daf50ca79fae6788970940e";
interface Preview {
  operationCount: number;
  operationKinds?: readonly string[];
  nonNoopOperationCount?: number;
  uploadCreatePathKeys?: readonly string[];
  executionDisposition?: string;
  globalExecutionGate?: string;
  recoveryCheckpointRequired?: boolean;
}
const expectedPlan: Preview = {
  operationCount: 25,
  operationKinds: ["noop", "upload-create"],
  nonNoopOperationCount: 1,
  uploadCreatePathKeys: [verifiedCanary],
  executionDisposition: "safe-auto-eligible",
  globalExecutionGate: "none",
  recoveryCheckpointRequired: false,
};

async function exercise(plan: Preview) {
  let dispatchCount = 0;
  const executor: ScenarioStepExecutor = {
    executionMode: "live",
    deviceIdentities: ["isolated-windows"],
    async execute(step, context) {
      if (step.kind === "assert") return assertScenarioObservation(step, context);
      if (step.kind === "observe" && step.subject === "device-state") {
        return { status: "completed", value: { kind: "idle-ready" } };
      }
      if (step.kind === "production" && step.operation === "preview") {
        return { status: "completed", value: { planId: "reviewed-plan", ...plan } };
      }
      if (step.kind === "production" && step.operation === "execute-reviewed-plan") {
        const reviewed = context.readCapture(step.inputRef) as { planId?: string } | undefined;
        strictEqual(reviewed?.planId, "reviewed-plan");
        dispatchCount++;
        return { status: "completed", value: { receipt: { terminal: "complete" } } };
      }
      return { status: "failed", classification: "unexpected-dispatch" };
    },
  };
  const result = await new DeterministicScenarioRunner({}, executor).run(s09aRequestAttributionScenario);
  return { result, dispatchCount };
}

test("S09A blocks no effective upload", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, nonNoopOperationCount: 0, uploadCreatePathKeys: [] });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks multiple effective operations despite many harmless noops", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, nonNoopOperationCount: 2, operationCount: 26, uploadCreatePathKeys: [verifiedCanary, verifiedCanary] });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks a destructive operation", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, operationKinds: ["noop","trash-remote"] });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks an upload of any other path", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, uploadCreatePathKeys: ["path-sha256:" + "0".repeat(64)] });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks absent non-noop count instead of assuming safety", async () => {
  const { nonNoopOperationCount: omitted, ...rest } = expectedPlan;
  const { result, dispatchCount } = await exercise(rest);
  strictEqual(result.status, "blocked");
  strictEqual(result.classification, "missing-observation-field");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks a plan requiring destructive approval", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, globalExecutionGate: "destructive-approval-required" });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A blocks recovery-required plan", async () => {
  const { result, dispatchCount } = await exercise({ ...expectedPlan, recoveryCheckpointRequired: true });
  strictEqual(result.status, "failed");
  strictEqual(dispatchCount, 0);
});
test("S09A executes one exact approved canary upload with no-op companion entries", async () => {
  const { result, dispatchCount } = await exercise(expectedPlan);
  strictEqual(result.status, "completed");
  strictEqual(dispatchCount, 1);
});

test("S09A canary path key matches the earlier verified physical fixture", async () => {
  strictEqual(await bvpOpaquePathKey("BVP-VALIDATION/bvp-s09a-request-attribution-fa6eef85-live02/s09a-attribution-canary.md"), verifiedCanary);
});
