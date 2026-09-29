import {
  assertNeverScenarioStep, validateScenarioDefinition,
  type ScenarioAssertionStep, type ScenarioCheckpointStep, type ScenarioDefinition,
  type ScenarioExpectedOutcome, type ScenarioFixtureContent, type ScenarioObservationStep,
  type ScenarioStep,
} from "./scenario-contract";
import { VirtualSynchronizationWorld, type VirtualProductionDevice } from "../virtual-world/virtual-world";
import { virtualDrivePath, type InMemoryGoogleDriveCore } from "../virtual-world/in-memory-google-drive";
import { virtualVaultPath } from "../virtual-world/in-memory-local-vault";

export type ScenarioExecutionStatus = "completed" | "failed" | "blocked" | "unsupported";
export interface ScenarioStepExecution {
  readonly index: number; readonly stepId: string; readonly kind: ScenarioStep["kind"];
  readonly status: ScenarioExecutionStatus; readonly classification?: string;
  readonly reason?: string; readonly matchedExpectation: boolean;
}
export interface ScenarioExecutionResult {
  readonly scenarioId: string; readonly status: ScenarioExecutionStatus;
  readonly steps: readonly ScenarioStepExecution[]; readonly captures: Readonly<Record<string, unknown>>;
  readonly classification?: string; readonly reason?: string;
}
export type ScenarioCapabilityResult =
  | { readonly status: "completed"; readonly value?: unknown }
  | { readonly status: "failed" | "blocked" | "unsupported"; readonly classification: string; readonly reason?: string };
export interface ScenarioRunnerHookContext {
  readonly world: VirtualSynchronizationWorld;
  readCapture(ref: string): unknown | undefined;
  device(name: string): Promise<VirtualProductionDevice>;
}
export interface ScenarioRunnerHooks {
  observe?(step: ScenarioObservationStep, context: ScenarioRunnerHookContext): Promise<ScenarioCapabilityResult>;
  assert?(step: ScenarioAssertionStep, context: ScenarioRunnerHookContext): Promise<ScenarioCapabilityResult>;
  checkpoint?(step: ScenarioCheckpointStep, context: ScenarioRunnerHookContext): Promise<ScenarioCapabilityResult>;
}

type StepOutcome = ScenarioCapabilityResult;
type DriveSignal = Parameters<InMemoryGoogleDriveCore["queueBoundaryFault"]>[0]["signal"];

const source = (bytes: Uint8Array) => ({
  sizeBytes: bytes.byteLength,
  async *openChunks(): AsyncIterable<Uint8Array> { yield Uint8Array.from(bytes); },
});
const bytes = (content: ScenarioFixtureContent): Uint8Array =>
  content.encoding === "utf8" ? new TextEncoder().encode(content.value) : Uint8Array.from(content.value);
const fail = (status: Exclude<ScenarioExecutionStatus, "completed">, classification: string, reason?: string): StepOutcome =>
  ({ status, classification, ...(reason === undefined ? {} : { reason }) });
const signalReason = (signal: DriveSignal): string | undefined => "detail" in signal ? signal.detail : undefined;
const expectedMatches = (expected: ScenarioExpectedOutcome | undefined, actual: StepOutcome): boolean =>
  (!expected || expected.status === "success")
    ? actual.status === "completed"
    : actual.status === expected.status && "classification" in actual && actual.classification === expected.classification;

export class DeterministicScenarioRunner {
  constructor(private readonly hooks: ScenarioRunnerHooks = {}) {}

  async run(scenario: ScenarioDefinition): Promise<ScenarioExecutionResult> {
    const validated = validateScenarioDefinition(scenario);
    if (!validated.ok) return {
      scenarioId: scenario.id ?? "<invalid>", status: "unsupported", steps: [], captures: {},
      classification: "invalid-scenario", reason: validated.issues.join("; "),
    };
    if (!scenario.executionModes.includes("deterministic")) return {
      scenarioId: scenario.id, status: "unsupported", steps: [], captures: {},
      classification: "execution-mode-not-applicable",
    };

    const names = new Set(["device-a", "device-b"]);
    for (const step of scenario.steps) if ("device" in step && typeof step.device === "string") names.add(step.device);
    const world = await VirtualSynchronizationWorld.create([...names]);
    const devices = new Map<string, VirtualProductionDevice>();
    const captures = new Map<string, unknown>();
    const steps: ScenarioStepExecution[] = [];
    const context: ScenarioRunnerHookContext = {
      world,
      readCapture: ref => captures.get(ref),
      device: async name => {
        const current = devices.get(name);
        if (current) return current;
        const created = await world.reconstructDevice(name);
        devices.set(name, created);
        return created;
      },
    };
    const finish = async (status: ScenarioExecutionStatus, classification?: string, reason?: string): Promise<ScenarioExecutionResult> => {
      for (const device of devices.values()) await device.dispose();
      return {
        scenarioId: scenario.id, status, steps, captures: Object.fromEntries(captures),
        ...(classification === undefined ? {} : { classification }),
        ...(reason === undefined ? {} : { reason }),
      };
    };

    for (const [index, step] of scenario.steps.entries()) {
      const actual = await this.execute(step, context, devices, captures);
      const matchedExpectation = expectedMatches(step.expect, actual);
      steps.push({
        index, stepId: step.id, kind: step.kind, status: actual.status, matchedExpectation,
        ...("classification" in actual ? { classification: actual.classification } : {}),
        ...("reason" in actual && actual.reason !== undefined ? { reason: actual.reason } : {}),
      });
      if (!matchedExpectation) {
        if (actual.status === "completed") return finish(
          "failed", "expected-outcome-not-observed",
          `step ${step.id} completed but expected ${step.expect?.status}`,
        );
        return finish(actual.status, actual.classification, actual.reason);
      }
    }
    return finish("completed");
  }

  private async execute(
    step: ScenarioStep, context: ScenarioRunnerHookContext,
    devices: Map<string, VirtualProductionDevice>, captures: Map<string, unknown>,
  ): Promise<StepOutcome> {
    try {
      switch (step.kind) {
        case "fixture": return await this.fixture(step, context.world);
        case "production": return await this.production(step, context, captures);
        case "external-state": return await this.external(step, context);
        case "checkpoint":
          if (this.hooks.checkpoint) return await this.hooks.checkpoint(step, context);
          if (step.operation !== "restart-device" || step.checkpointRef) return fail("blocked", "checkpoint-capability-unavailable");
          if (devices.has(step.device)) await devices.get(step.device)!.dispose();
          devices.delete(step.device); await context.device(step.device);
          return { status: "completed" };
        case "observe": {
          if (!this.hooks.observe) return fail("blocked", "observation-capability-unavailable");
          const result = await this.hooks.observe(step, context);
          if (result.status === "completed") captures.set(step.captureAs, result.value);
          return result;
        }
        case "assert":
          return this.hooks.assert ? await this.hooks.assert(step, context) : fail("blocked", "assertion-capability-unavailable");
        default: return assertNeverScenarioStep(step);
      }
    } catch (error) {
      return fail("failed", "step-exception", error instanceof Error ? error.message : String(error));
    }
  }

  private async fixture(
    step: Extract<ScenarioStep, { readonly kind: "fixture" }>,
    world: VirtualSynchronizationWorld,
  ): Promise<StepOutcome> {
    if (step.operation === "put-local-file") {
      await world.deviceBacking(step.device).local.replaceFile(virtualVaultPath(step.path), source(bytes(step.content)));
      return { status: "completed" };
    }
    if (step.operation === "move-local") {
      await world.deviceBacking(step.device).local.move(virtualVaultPath(step.fromPath), virtualVaultPath(step.toPath));
      return { status: "completed" };
    }
    if (step.operation === "remove-local") {
      const local = world.deviceBacking(step.device).local;
      const path = virtualVaultPath(step.path);
      if ((await local.observe(path)).status !== "absent") await local.trash(path);
      return { status: "completed" };
    }

    const path = virtualDrivePath(step.path);
    const existing = world.drive.inspectObjectsAtPath(world.managedRemote.rootId, path);
    if (existing.length > 1) return fail("failed", "remote-path-ambiguous");
    if (step.operation === "remove-remote") {
      if (existing[0]) world.drive.removeExternally(existing[0].remoteObjectId);
      return { status: "completed" };
    }
    const content = source(bytes(step.content));
    const result = !existing[0]
      ? await world.drive.create(world.managedRemote.rootId, { path, entityKind: "file", content })
      : existing[0].entityKind === "file"
        ? await world.drive.update({ remoteObjectId: existing[0].remoteObjectId, path, content })
        : undefined;
    if (!result) return fail("failed", "remote-path-is-folder");
    return result.ok ? { status: "completed" } : fail("failed", result.signal.kind, signalReason(result.signal));
  }

  private async production(
    step: Extract<ScenarioStep, { readonly kind: "production" }>,
    context: ScenarioRunnerHookContext, captures: Map<string, unknown>,
  ): Promise<StepOutcome> {
    const device = await context.device(step.device);
    if (step.operation === "execute-reviewed-plan") {
      const plan = captures.get(step.inputRef);
      if (!plan || typeof plan !== "object" || !("planId" in plan)) return fail("blocked", "missing-required-result", step.inputRef);
      const result = await device.controller.requestPreviewAction({
        kind: "execute-plan", planId: (plan as { readonly planId: never }).planId,
      });
      if (step.captureAs) captures.set(step.captureAs, result);
      return result.status === "accepted" ? { status: "completed", value: result } : fail("failed", "production-request-rejected", result.reason);
    }
    if (step.inputRef) return fail("unsupported", "production-input-reference-unsupported");

    const plan = step.operation === "reconcile"
      ? await device.controller.previewVerifyReconcile()
      : await device.controller.previewManual();
    if (!plan) return fail("blocked", "missing-production-plan");
    if (step.operation === "preview") {
      if (step.captureAs) captures.set(step.captureAs, plan);
      return { status: "completed", value: plan };
    }
    const result = await device.controller.requestPreviewAction({ kind: "execute-plan", planId: plan.planId });
    if (step.captureAs) captures.set(step.captureAs, result);
    return result.status === "accepted" ? { status: "completed", value: result } : fail("failed", "production-request-rejected", result.reason);
  }

  private async external(
    step: Extract<ScenarioStep, { readonly kind: "external-state" }>,
    context: ScenarioRunnerHookContext,
  ): Promise<StepOutcome> {
    if (step.transition === "set-device-connectivity") return fail("blocked", "device-connectivity-control-unavailable");
    if (step.transition === "set-remote-listing-completeness") {
      context.world.drive.scriptNextListing({ completeness: step.completeness === "complete"
        ? { status: "complete" } : { status: "partial", reason: step.reason ?? "scenario-partial-listing" } });
      return { status: "completed" };
    }
    if (step.transition === "set-remote-change-completeness") {
      context.world.drive.scriptNextChangePage({ completeness: step.completeness === "complete"
        ? { status: "complete" } : { status: "partial", reason: step.reason ?? "scenario-partial-change-page" } });
      return { status: "completed" };
    }
    if (step.transition === "request-cancellation") {
      const result = await (await context.device(step.device)).controller.request({ kind: "cancel-active-sync" });
      return result.status === "accepted" ? { status: "completed" } : fail("failed", "production-request-rejected", result.reason);
    }
    if (step.transition !== "inject-remote-mutation-fault") {
      return fail("unsupported", "external-state-transition-unsupported");
    }
    context.world.drive.queueBoundaryFault({
      boundary: step.operation,
      signal: { kind: "transient-failure", detail: step.classification },
      mutationEffect: step.effect,
    });
    return { status: "completed" };
  }
}
